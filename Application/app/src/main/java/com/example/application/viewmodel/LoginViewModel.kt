package com.example.application.viewmodel

import android.util.Patterns
import android.content.Context
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.NoCredentialException
import com.example.application.auth.GoogleAuthManager
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.local.datastore.UserSession
import com.example.application.data.repository.AuthRepository
import com.example.application.data.repository.GoogleLoginOutcome
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
    private val authRepository: AuthRepository,
    private val googleAuthManager: GoogleAuthManager
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
        if (current.isLoading || current.isGoogleLoading) return

        val normalizedEmail = current.email.trim()
        val emailError = validateIdentifier(normalizedEmail)
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

    fun googleLogin(context: Context) {
        val current = _uiState.value
        if (current.isLoading || current.isGoogleLoading) return
        viewModelScope.launch {
            _uiState.update { it.copy(isGoogleLoading = true, errorMessage = null) }
            try {
                val idToken = googleAuthManager.getIdToken(context)
                when (val result = authRepository.googleLogin(idToken)) {
                    is NetworkResult.Success -> when (val outcome = result.data) {
                        is GoogleLoginOutcome.Authenticated -> _uiState.update {
                            it.copy(isGoogleLoading = false, loggedInSession = outcome.session)
                        }
                        is GoogleLoginOutcome.RegistrationRequired -> _uiState.update {
                            it.copy(isGoogleLoading = false, googleRegistrationRequired = true)
                        }
                    }
                    is NetworkResult.Error -> _uiState.update { it.copy(isGoogleLoading=false, errorMessage=result.error.toUserMessage()) }
                    NetworkResult.Loading -> Unit
                }
            } catch (_: GetCredentialCancellationException) {
                _uiState.update { it.copy(isGoogleLoading=false, errorMessage="Google sign-in was cancelled.") }
            } catch (_: NoCredentialException) {
                _uiState.update { it.copy(isGoogleLoading=false, errorMessage="No Google account is available. Add an account or check Google Play services.") }
            } catch (error: Exception) {
                val safeMessage = error.message?.takeIf { it.startsWith("Google login is not configured") }
                    ?: "Google sign-in could not be completed. Please try again."
                _uiState.update { it.copy(isGoogleLoading=false, errorMessage=safeMessage) }
            }
        }
    }

    fun consumeLoginSuccess() {
        _uiState.update { it.copy(loggedInSession = null) }
    }

    fun consumeGoogleRegistrationRequest() {
        _uiState.update { it.copy(googleRegistrationRequired = false) }
    }

    fun prepareManualRegistration() {
        authRepository.clearPendingGoogleRegistration()
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    private fun validateIdentifier(identifier: String): String? {
        val normalizedPhone = identifier.filter(Char::isDigit)
        val isEmail = Patterns.EMAIL_ADDRESS.matcher(identifier).matches()
        val isPhone = normalizedPhone.length in 10..15
        return when {
            identifier.isBlank() -> "Email or mobile number is required."
            !isEmail && !isPhone -> "Enter a valid email or mobile number."
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
    val isGoogleLoading: Boolean = false,
    val errorMessage: String? = null,
    val googleRegistrationRequired: Boolean = false,
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
