package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.local.datastore.SessionPreferences
import com.example.application.data.remote.dto.AdminProfileDto
import com.example.application.data.remote.dto.AdminProfileUpdateRequest
import com.example.application.data.repository.AdminProfileRepository
import com.example.application.data.repository.AuthRepository
import com.example.application.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class AdminProfileViewModel @Inject constructor(
    private val repository: AdminProfileRepository,
    private val authRepository: AuthRepository,
    private val sessionPreferences: SessionPreferences
) : ViewModel() {
    private val _state = MutableStateFlow(AdminProfileUiState())
    val state: StateFlow<AdminProfileUiState> = _state.asStateFlow()

    init { load() }

    fun load() = viewModelScope.launch {
        _state.update { it.copy(loading = true, loadError = null, message = null, error = null) }
        when (val result = repository.getProfile()) {
            is NetworkResult.Success -> {
                val session = sessionPreferences.readSession()
                _state.update { it.copy(loading = false, profile = result.data, role = session?.role ?: "admin") }
            }
            is NetworkResult.Error -> _state.update { it.copy(loading = false, loadError = repository.message(result.error)) }
            NetworkResult.Loading -> Unit
        }
    }

    fun save(societyName: String, address: String, phone: String, profilePicture: String) {
        val current = _state.value.profile ?: return
        if (societyName.isBlank() || address.isBlank() || phone.isBlank()) {
            _state.update { it.copy(error = "Society name, address, and phone are required.") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(saving = true, error = null, message = null) }
            val request = AdminProfileUpdateRequest(
                societyName.trim(), address.trim(), phone.trim(), profilePicture,
                current.adminName.orEmpty(), current.email.orEmpty()
            )
            when (val result = repository.updateProfile(request)) {
                is NetworkResult.Success -> _state.update {
                    it.copy(saving = false, editing = false, profile = result.data.copy(
                        societyName = result.data.societyName ?: request.societyName,
                        address = result.data.address ?: request.address,
                        phone = result.data.phone ?: request.phone,
                        profilePicture = result.data.profilePicture ?: request.profilePicture,
                        society = result.data.society ?: current.society
                    ), message = "Profile updated successfully")
                }
                is NetworkResult.Error -> _state.update { it.copy(saving = false, error = repository.message(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun changePassword(current: String, new: String, confirm: String) {
        val validation = when {
            current.isBlank() || new.isBlank() || confirm.isBlank() -> "Please fill all password fields."
            new.length < 6 -> "New password must be at least 6 characters."
            new != confirm -> "New password and confirm password do not match."
            else -> null
        }
        if (validation != null) return _state.update { it.copy(error = validation) }
        viewModelScope.launch {
            _state.update { it.copy(changingPassword = true, error = null, message = null) }
            when (val result = authRepository.changePassword(current, new)) {
                is NetworkResult.Success -> _state.update { it.copy(changingPassword = false, passwordOpen = false, message = "Password changed successfully.", passwordResetKey = it.passwordResetKey + 1) }
                is NetworkResult.Error -> _state.update { it.copy(changingPassword = false, error = authRepository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun setEditing(value: Boolean) = _state.update { it.copy(editing = value, error = null) }
    fun setPasswordOpen(value: Boolean) = _state.update { it.copy(passwordOpen = value, error = null) }
    fun consumeFeedback() = _state.update { it.copy(message = null, error = null) }
}

data class AdminProfileUiState(
    val loading: Boolean = true,
    val saving: Boolean = false,
    val changingPassword: Boolean = false,
    val editing: Boolean = false,
    val passwordOpen: Boolean = false,
    val profile: AdminProfileDto? = null,
    val role: String = "admin",
    val loadError: String? = null,
    val error: String? = null,
    val message: String? = null,
    val passwordResetKey: Int = 0
)
