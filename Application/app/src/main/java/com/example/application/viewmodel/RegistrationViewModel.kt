package com.example.application.viewmodel

import android.util.Patterns
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.dto.FlatDto
import com.example.application.data.remote.dto.RegisterRequest
import com.example.application.data.repository.AuthRepository
import com.example.application.data.repository.ResidentRepository
import com.example.application.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class RegistrationViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val residentRepository: ResidentRepository
) : ViewModel() {
    private val googleProfile = authRepository.getPendingGoogleProfile()
    private val _uiState = MutableStateFlow(
        RegistrationUiState(
            name = googleProfile?.name.orEmpty(),
            email = googleProfile?.email.orEmpty(),
            isGoogleRegistration = googleProfile != null
        )
    )
    val uiState: StateFlow<RegistrationUiState> = _uiState.asStateFlow()

    fun loadAvailableFlats() {
        val societyCode = _uiState.value.societyCode.trim().uppercase()
        if (societyCode.isBlank()) {
            _uiState.update { it.copy(societyCodeError = "Enter your society code first.") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(flatsLoading = true, errorMessage = null) }
            when (val result = residentRepository.getAvailableFlats(societyCode)) {
                is NetworkResult.Success -> _uiState.update {
                    it.copy(flatsLoading = false, availableFlats = result.data)
                }
                is NetworkResult.Error -> _uiState.update {
                    it.copy(
                        flatsLoading = false,
                        errorMessage = residentRepository.userMessageFor(result.error)
                    )
                }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun updateName(value: String) = _uiState.update { it.copy(name = value, nameError = null, errorMessage = null) }
    fun updateEmail(value: String) = _uiState.update { it.copy(email = value, emailError = null, errorMessage = null) }
    fun updatePhone(value: String) = _uiState.update { it.copy(phone = value, phoneError = null, errorMessage = null) }
    fun updatePassword(value: String) = _uiState.update { it.copy(password = value, passwordError = null, errorMessage = null) }
    fun updateConfirmPassword(value: String) = _uiState.update { it.copy(confirmPassword = value, confirmPasswordError = null, errorMessage = null) }
    fun updateSocietyCode(value: String) = _uiState.update {
        it.copy(
            societyCode = value.uppercase().filter(Char::isLetterOrDigit).take(24),
            societyCodeError = null,
            flatId = "",
            availableFlats = emptyList(),
            errorMessage = null
        )
    }
    fun updateFlatId(value: String) = _uiState.update { it.copy(flatId = value, flatError = null, errorMessage = null) }
    fun updateOwnershipType(value: String) = _uiState.update { it.copy(ownershipType = value, ownershipTypeError = null, errorMessage = null) }

    fun submit() {
        val state = _uiState.value
        if (state.isSubmitting) return

        val name = state.name.trim()
        val email = state.email.trim()
        val phone = state.phone.trim()
        val societyCode = state.societyCode.trim().uppercase()
        val societyCodeError = if (societyCode.isBlank()) "Society code is required." else null
        val nameError = if (name.isBlank()) "Full name is required." else null
        val emailError = when {
            email.isBlank() -> "Email is required."
            !Patterns.EMAIL_ADDRESS.matcher(email).matches() -> "Enter a valid email address."
            else -> null
        }
        val normalizedGooglePhone = normalizeIndianMobile(phone)
        val phoneError = when {
            state.isGoogleRegistration && !Regex("^[6-9][0-9]{9}$").matches(normalizedGooglePhone) -> "Enter a valid 10-digit Indian mobile number."
            phone.isNotBlank() && !Regex("^[0-9+\\-\\s()]{7,20}$").matches(phone) -> "Enter a valid phone number."
            else -> null
        }
        val passwordError = when {
            state.isGoogleRegistration -> null
            state.password.isEmpty() -> "Password is required."
            state.password.length < 6 -> "Password must be at least 6 characters."
            else -> null
        }
        val confirmError = when {
            state.isGoogleRegistration -> null
            state.confirmPassword.isEmpty() -> "Confirm password is required."
            state.password != state.confirmPassword -> "Password and confirm password do not match."
            else -> null
        }
        val flatError = if (state.isGoogleRegistration && state.flatId.isBlank()) "Please select your flat." else null
        val ownershipTypeError = if (state.isGoogleRegistration && state.ownershipType !in listOf("Owner", "Tenant")) {
            "Select Owner or Tenant."
        } else null

        if (listOf(societyCodeError, nameError, emailError, phoneError, passwordError, confirmError, flatError, ownershipTypeError).any { it != null }) {
            _uiState.update {
                it.copy(
                    name = name,
                    email = email,
                    phone = phone,
                    societyCode = societyCode,
                    societyCodeError = societyCodeError,
                    nameError = nameError,
                    emailError = emailError,
                    phoneError = phoneError,
                    passwordError = passwordError,
                    confirmPasswordError = confirmError,
                    flatError = flatError,
                    ownershipTypeError = ownershipTypeError
                )
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            val result = if (state.isGoogleRegistration) {
                authRepository.googleRegister(
                    societyCode = societyCode,
                    flatId = state.flatId,
                    phone = normalizedGooglePhone,
                    ownershipType = state.ownershipType
                )
            } else {
                authRepository.register(
                    RegisterRequest(
                        name = name,
                        email = email,
                        phone = phone.ifBlank { null },
                        password = state.password,
                        role = "resident",
                        societyCode = societyCode,
                        flatId = state.flatId.takeIf { it.isNotBlank() }
                    )
                )
            }

            when (result) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            successMessage = result.data.message
                                ?: "Registration submitted successfully. Your account is waiting for admin approval.",
                            password = "",
                            confirmPassword = ""
                        )
                    }
                }
                is NetworkResult.Error -> _uiState.update {
                    it.copy(isSubmitting = false, errorMessage = authRepository.userMessageFor(result.error))
                }
                NetworkResult.Loading -> Unit
            }
        }
    }

    private fun normalizeIndianMobile(value: String): String {
        val digits = value.filter(Char::isDigit)
        return if (digits.length == 12 && digits.startsWith("91")) digits.drop(2) else digits
    }
}

data class RegistrationUiState(
    val societyCode: String = "",
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val flatId: String = "",
    val ownershipType: String = "",
    val isGoogleRegistration: Boolean = false,
    val availableFlats: List<FlatDto> = emptyList(),
    val flatsLoading: Boolean = false,
    val isSubmitting: Boolean = false,
    val nameError: String? = null,
    val societyCodeError: String? = null,
    val emailError: String? = null,
    val phoneError: String? = null,
    val passwordError: String? = null,
    val confirmPasswordError: String? = null,
    val flatError: String? = null,
    val ownershipTypeError: String? = null,
    val errorMessage: String? = null,
    val successMessage: String? = null
)
