package com.example.application.viewmodel

import android.util.Patterns
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
class ForgotPasswordViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(ForgotPasswordUiState())
    val uiState: StateFlow<ForgotPasswordUiState> = _uiState.asStateFlow()

    fun updateEmail(value: String) = _uiState.update { it.copy(email = value, emailError = null, message = null, errorMessage = null) }

    fun submit() {
        val email = _uiState.value.email.trim()
        val emailError = when {
            email.isBlank() -> "Email is required."
            !Patterns.EMAIL_ADDRESS.matcher(email).matches() -> "Enter a valid email address."
            else -> null
        }
        if (emailError != null) {
            _uiState.update { it.copy(email = email, emailError = emailError) }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(email = email, isLoading = true, errorMessage = null, message = null) }
            when (val result = authRepository.forgotPassword(email)) {
                is NetworkResult.Success -> _uiState.update {
                    it.copy(
                        isLoading = false,
                        message = result.data.message ?: "If this email exists, password reset instructions have been sent."
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

data class ForgotPasswordUiState(
    val email: String = "",
    val emailError: String? = null,
    val isLoading: Boolean = false,
    val message: String? = null,
    val errorMessage: String? = null
)
