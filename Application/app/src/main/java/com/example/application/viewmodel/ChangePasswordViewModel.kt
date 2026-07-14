package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
class ChangePasswordViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(ChangePasswordUiState())
    val uiState: StateFlow<ChangePasswordUiState> = _uiState.asStateFlow()

    fun updateCurrent(value: String) = _uiState.update { it.copy(currentPassword = value, currentPasswordError = null, message = null, errorMessage = null) }
    fun updateNew(value: String) = _uiState.update { it.copy(newPassword = value, newPasswordError = null, message = null, errorMessage = null) }
    fun updateConfirm(value: String) = _uiState.update { it.copy(confirmPassword = value, confirmPasswordError = null, message = null, errorMessage = null) }

    fun submit() {
        val state = _uiState.value
        val currentError = if (state.currentPassword.isEmpty()) "Current password is required." else null
        val newError = when {
            state.newPassword.isEmpty() -> "New password is required."
            state.newPassword.length < 6 -> "New password must be at least 6 characters."
            else -> null
        }
        val confirmError = when {
            state.confirmPassword.isEmpty() -> "Confirm password is required."
            state.newPassword != state.confirmPassword -> "New password and confirm password do not match."
            else -> null
        }
        if (currentError != null || newError != null || confirmError != null) {
            _uiState.update {
                it.copy(currentPasswordError = currentError, newPasswordError = newError, confirmPasswordError = confirmError)
            }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null, message = null) }
            when (val result = authRepository.changePassword(state.currentPassword, state.newPassword)) {
                is NetworkResult.Success -> _uiState.update {
                    it.copy(
                        isLoading = false,
                        currentPassword = "",
                        newPassword = "",
                        confirmPassword = "",
                        message = result.data.message ?: "Password changed successfully."
                    )
                }
                is NetworkResult.Error -> _uiState.update {
                    it.copy(isLoading = false, errorMessage = authRepository.userMessageFor(result.error))
                }
                NetworkResult.Loading -> Unit
            }
        }
    }
}

data class ChangePasswordUiState(
    val currentPassword: String = "",
    val newPassword: String = "",
    val confirmPassword: String = "",
    val currentPasswordError: String? = null,
    val newPasswordError: String? = null,
    val confirmPasswordError: String? = null,
    val isLoading: Boolean = false,
    val message: String? = null,
    val errorMessage: String? = null
)
