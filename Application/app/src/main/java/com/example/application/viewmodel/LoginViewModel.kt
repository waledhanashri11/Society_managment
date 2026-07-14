package com.example.application.viewmodel

import android.util.Patterns
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.local.datastore.UserSession
import com.example.application.data.repository.AuthRepository
import com.example.application.util.AppError
import com.example.application.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun onEmailChanged(value: String) {
        _uiState.update {
            it.copy(email = value, emailError = null, errorMessage = null)
        }
    }

    fun onPasswordChanged(value: String) {
        _uiState.update {
            it.copy(password = value, passwordError = null, errorMessage = null)
        }
    }

    fun login() {
        val current = _uiState.value
        if (current.isLoading) return

        val normalizedEmail = current.email.trim()
        val emailError = validateEmail(normalizedEmail)
        val passwordError = validatePassword(current.password)

        if (emailError != null || passwordError != null) {
            _uiState.update {
                it.copy(
                    email = normalizedEmail,
                    emailError = emailError,
                    passwordError = passwordError,
                    errorMessage = null
                )
            }
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(email = normalizedEmail, isLoading = true, errorMessage = null)
            }

            when (val result = authRepository.login(normalizedEmail, current.password)) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            loggedInSession = result.data,
                            errorMessage = null
                        )
                    }
                }

                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            loggedInSession = null,
                            errorMessage = result.error.toUserMessage()
                        )
                    }
                }

                NetworkResult.Loading -> Unit
            }
        }
    }

    fun consumeLoginSuccess() {
        _uiState.update { it.copy(loggedInSession = null) }
    }

    private fun validateEmail(email: String): String? {
        return when {
            email.isBlank() -> "Email is required."
            !Patterns.EMAIL_ADDRESS.matcher(email).matches() -> "Enter a valid email address."
            else -> null
        }
    }

    private fun validatePassword(password: String): String? {
        return if (password.isEmpty()) "Password is required." else null
    }
}

data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val emailError: String? = null,
    val passwordError: String? = null,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val loggedInSession: UserSession? = null
)

fun AppError.toUserMessage(): String {
    return when (this) {
        AppError.NoInternet -> "No internet connection. Check your network and try again."
        AppError.Timeout -> "The request timed out. Please try again."
        AppError.Unauthorized -> "Your session has expired. Please log in again."
        is AppError.Forbidden -> message ?: "Your account cannot access the application."
        is AppError.Validation -> message
        is AppError.Server -> message ?: "The server is temporarily unavailable."
        is AppError.Unknown -> message ?: "Login failed. Please try again."
    }
}
