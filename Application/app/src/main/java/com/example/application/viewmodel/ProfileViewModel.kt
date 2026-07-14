package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.dto.ProfileDto
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
class ProfileViewModel @Inject constructor(
    private val residentRepository: ResidentRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = it.profile == null, errorMessage = null) }
            when (val result = residentRepository.getProfile()) {
                is NetworkResult.Success -> _uiState.update {
                    it.copy(isLoading = false, profile = result.data, phone = result.data.phone.orEmpty())
                }
                is NetworkResult.Error -> _uiState.update {
                    it.copy(isLoading = false, errorMessage = residentRepository.userMessageFor(result.error))
                }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun updatePhoneInput(value: String) = _uiState.update {
        it.copy(phone = value, phoneError = null, updateMessage = null, errorMessage = null)
    }

    fun savePhone() {
        val phone = _uiState.value.phone.trim()
        val phoneError = if (phone.isNotBlank() && !Regex("^[0-9+\\-\\s()]{7,20}$").matches(phone)) {
            "Enter a valid phone number."
        } else null
        if (phoneError != null) {
            _uiState.update { it.copy(phone = phone, phoneError = phoneError) }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(phone = phone, isUpdating = true, errorMessage = null, updateMessage = null) }
            when (val result = residentRepository.updatePhone(phone.ifBlank { null })) {
                is NetworkResult.Success -> _uiState.update {
                    val merged = it.profile?.copy(phone = result.data.phone ?: phone) ?: result.data
                    it.copy(
                        isUpdating = false,
                        profile = merged,
                        updateMessage = "Profile updated successfully."
                    )
                }
                is NetworkResult.Error -> _uiState.update {
                    it.copy(isUpdating = false, errorMessage = residentRepository.userMessageFor(result.error))
                }
                NetworkResult.Loading -> Unit
            }
        }
    }
}

data class ProfileUiState(
    val isLoading: Boolean = false,
    val isUpdating: Boolean = false,
    val profile: ProfileDto? = null,
    val phone: String = "",
    val phoneError: String? = null,
    val errorMessage: String? = null,
    val updateMessage: String? = null
)
