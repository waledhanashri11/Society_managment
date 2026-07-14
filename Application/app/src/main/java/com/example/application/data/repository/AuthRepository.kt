package com.example.application.data.repository

import com.example.application.data.local.datastore.SessionPreferences
import com.example.application.data.local.datastore.UserSession
import com.example.application.data.remote.api.AuthApiService
import com.example.application.data.remote.dto.ErrorResponse
import com.example.application.data.remote.dto.ForgotPasswordRequest
import com.example.application.data.remote.dto.ChangePasswordRequest
import com.example.application.data.remote.dto.LoginRequest
import com.example.application.data.remote.dto.MessageResponse
import com.example.application.data.remote.dto.RegisterRequest
import com.example.application.data.remote.dto.RegisterResponse
import com.example.application.data.remote.dto.ResetPasswordRequest
import com.example.application.data.remote.dto.UserDto
import com.example.application.util.AppError
import com.example.application.util.JwtUtils
import com.example.application.util.NetworkResult
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.inject.Inject
import javax.inject.Singleton
import retrofit2.HttpException

@Singleton
class AuthRepository @Inject constructor(
    private val authApiService: AuthApiService,
    private val sessionPreferences: SessionPreferences,
    private val gson: Gson
) {
    suspend fun login(email: String, password: String): NetworkResult<UserSession> {
        return try {
            val response = authApiService.login(LoginRequest(email = email, password = password))

            if (response.isSuccessful) {
                val body = response.body()
                val token = body?.token
                val user = body?.user

                if (token.isNullOrBlank() || user == null) {
                    return NetworkResult.Error(AppError.Unknown("Unable to read the server response."))
                }

                val session = user.toSession(token)
                val normalizedRole = session.role.lowercase()

                if (normalizedRole != ROLE_ADMIN && normalizedRole != ROLE_RESIDENT) {
                    sessionPreferences.clearSession()
                    return NetworkResult.Error(
                        AppError.Forbidden("This account does not have access to the mobile application.")
                    )
                }

                sessionPreferences.saveSession(session)
                NetworkResult.Success(session)
            } else {
                NetworkResult.Error(mapHttpError(response.code(), parseErrorMessage(response.errorBody()?.string())))
            }
        } catch (error: UnknownHostException) {
            NetworkResult.Error(AppError.NoInternet)
        } catch (error: SocketTimeoutException) {
            NetworkResult.Error(AppError.Timeout)
        } catch (error: IOException) {
            NetworkResult.Error(AppError.NoInternet)
        } catch (error: HttpException) {
            NetworkResult.Error(mapHttpError(error.code(), null))
        } catch (error: JsonSyntaxException) {
            NetworkResult.Error(AppError.Unknown("Unable to read the server response."))
        } catch (error: Exception) {
            NetworkResult.Error(AppError.Unknown("Login failed. Please try again."))
        }
    }

    suspend fun register(request: RegisterRequest): NetworkResult<RegisterResponse> {
        return safeApiCall {
            authApiService.register(request)
        }
    }

    suspend fun forgotPassword(email: String): NetworkResult<MessageResponse> {
        return safeApiCall {
            authApiService.forgotPassword(ForgotPasswordRequest(email))
        }
    }

    suspend fun resetPassword(token: String, newPassword: String): NetworkResult<MessageResponse> {
        return safeApiCall {
            authApiService.resetPassword(ResetPasswordRequest(token = token, newPassword = newPassword))
        }
    }

    suspend fun changePassword(
        currentPassword: String,
        newPassword: String
    ): NetworkResult<MessageResponse> {
        return safeApiCall {
            authApiService.changePassword(
                ChangePasswordRequest(
                    currentPassword = currentPassword,
                    newPassword = newPassword
                )
            )
        }
    }

    suspend fun getSavedSessionForStartup(): UserSession? {
        val session = sessionPreferences.readSession() ?: return null

        if (JwtUtils.isExpired(session.token)) {
            sessionPreferences.clearSession()
            return null
        }

        val role = session.role.lowercase()
        if (role != ROLE_ADMIN && role != ROLE_RESIDENT) {
            sessionPreferences.clearSession()
            return null
        }

        return session
    }

    suspend fun logout() {
        sessionPreferences.clearSession()
    }

    private fun UserDto.toSession(token: String): UserSession {
        return UserSession(
            token = token,
            userId = id.orEmpty(),
            name = name.orEmpty(),
            email = email.orEmpty(),
            phone = phone,
            role = role.orEmpty(),
            status = status ?: "approved"
        )
    }

    private suspend fun <T> safeApiCall(
        call: suspend () -> retrofit2.Response<T>
    ): NetworkResult<T> {
        return try {
            val response = call()
            if (response.isSuccessful) {
                val body = response.body()
                if (body == null) {
                    NetworkResult.Error(AppError.Unknown("Unable to read the server response."))
                } else {
                    NetworkResult.Success(body)
                }
            } else {
                NetworkResult.Error(mapHttpError(response.code(), parseErrorMessage(response.errorBody()?.string())))
            }
        } catch (error: UnknownHostException) {
            NetworkResult.Error(AppError.NoInternet)
        } catch (error: SocketTimeoutException) {
            NetworkResult.Error(AppError.Timeout)
        } catch (error: IOException) {
            NetworkResult.Error(AppError.NoInternet)
        } catch (error: HttpException) {
            NetworkResult.Error(mapHttpError(error.code(), null))
        } catch (error: JsonSyntaxException) {
            NetworkResult.Error(AppError.Unknown("Unable to read the server response."))
        } catch (error: Exception) {
            NetworkResult.Error(AppError.Unknown("Request failed. Please try again."))
        }
    }

    fun userMessageFor(error: AppError): String {
        return when (error) {
            AppError.NoInternet -> "No internet connection. Check your network and try again."
            AppError.Timeout -> "The request timed out. Please try again."
            AppError.Unauthorized -> "Your session has expired. Please log in again."
            is AppError.Forbidden -> error.message ?: "You do not have permission to perform this action."
            is AppError.Validation -> error.message
            is AppError.Server -> error.message ?: "The server is temporarily unavailable."
            is AppError.Unknown -> error.message ?: "Something went wrong. Please try again."
        }
    }

    private fun parseErrorMessage(errorBody: String?): String? {
        if (errorBody.isNullOrBlank()) return null

        return try {
            gson.fromJson(errorBody, ErrorResponse::class.java)?.message
        } catch (_: Exception) {
            null
        }
    }

    fun mapHttpError(code: Int, serverMessage: String?): AppError {
        val safeMessage = sanitizeServerMessage(serverMessage)
        return when (code) {
            400 -> AppError.Validation(safeMessage ?: "Invalid email or password.")
            401 -> AppError.Unauthorized
            403 -> AppError.Forbidden(
                safeMessage ?: "Your account cannot access the application. Please contact the administrator."
            )
            404 -> AppError.Unknown("Login service was not found.")
            408 -> AppError.Timeout
            429 -> AppError.Server("Too many login attempts. Please try again later.")
            500 -> AppError.Server("Server error. Please try again later.")
            502, 503 -> AppError.Server("The server is temporarily unavailable.")
            else -> AppError.Unknown("Login failed. Please try again.")
        }
    }

    private fun sanitizeServerMessage(message: String?): String? {
        if (message.isNullOrBlank()) return null
        val lower = message.lowercase()
        val unsafe = listOf("sql", "stack", "exception", "syntax", "database")
        return if (unsafe.any { lower.contains(it) }) null else message
    }

    companion object {
        const val ROLE_ADMIN = "admin"
        const val ROLE_RESIDENT = "resident"
    }
}
