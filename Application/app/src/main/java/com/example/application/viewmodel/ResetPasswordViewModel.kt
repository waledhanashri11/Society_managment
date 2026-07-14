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
class ResetPasswordViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(ResetPasswordUiState())
    val uiState: StateFlow<ResetPasswordUiState> = _uiState.asStateFlow()

    fun setToken(token: String) = _uiState.update { it.copy(token = token, tokenError = null) }
    fun updatePassword(value: String) = _uiState.update { it.copy(newPassword = value, passwordError = null, errorMessage = null) }
    fun updateConfirm(value: String) = _uiState.update { it.copy(confirmPassword = value, confirmPasswordError = null, errorMessage = null) }

    fun submit() {
        val state = _uiState.value
        val tokenError = if (state.token.isBlank()) "Reset token is missing." else null
        val passwordError = when {
            state.newPassword.isEmpty() -> "New password is required."
            state.newPassword.length < 6 -> "New password must be at least 6 characters."
            else -> null
        }
        val confirmError = when {
            state.confirmPassword.isEmpty() -> "Confirm password is required."
            state.newPassword != state.confirmPassword -> "New password and confirm password do not match."
            else -> null
        }
        if (tokenError != null || passwordError != null || confirmError != null) {
            _uiState.update {
                it.copy(tokenError = tokenError, passwordError = passwordError, confirmPasswordError = confirmError)
            }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null, message = null) }
            when (val result = authRepository.resetPassword(state.token, state.newPassword)) {
                is NetworkResult.Success -> _uiState.update {
                    it.copy(
                        isLoading = false,
                        resetComplete = true,
                        newPassword = "",
                        confirmPassword = "",
                        message = result.data.message ?: "Password reset successfully. Please log in with your new password."
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

data class ResetPasswordUiState(
    val token: String = "",
    val newPassword: String = "",
    val confirmPassword: String = "",
    val tokenError: String? = null,
    val passwordError: String? = null,
    val confirmPasswordError: String? = null,
    val isLoading: Boolean = false,
    val message: String? = null,
    val errorMessage: String? = null,
    val resetComplete: Boolean = false
)
