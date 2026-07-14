package com.example.application.data.repository

import com.example.application.data.local.datastore.SessionPreferences
import com.example.application.data.remote.api.FlatApiService
import com.example.application.data.remote.api.ResidentApiService
import com.example.application.data.remote.dto.ErrorResponse
import com.example.application.data.remote.dto.FlatDto
import com.example.application.data.remote.dto.ProfileDto
import com.example.application.data.remote.dto.ProfileUpdateRequest
import com.example.application.util.AppError
import com.example.application.util.NetworkResult
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.inject.Inject
import javax.inject.Singleton
import retrofit2.HttpException
import retrofit2.Response

@Singleton
class ResidentRepository @Inject constructor(
    private val flatApiService: FlatApiService,
    private val residentApiService: ResidentApiService,
    private val sessionPreferences: SessionPreferences,
    private val gson: Gson
) {
    suspend fun getAvailableFlats(): NetworkResult<List<FlatDto>> {
        return safeApiCall { flatApiService.getAvailableFlats() }
    }

    suspend fun getProfile(): NetworkResult<ProfileDto> {
        val result = safeApiCall { residentApiService.getDashboard() }
        return when (result) {
            is NetworkResult.Success -> {
                val profile = result.data.user
                if (profile == null) {
                    NetworkResult.Error(AppError.Unknown("Unable to read profile details."))
                } else {
                    updateSessionFromProfile(profile)
                    NetworkResult.Success(profile)
                }
            }
            is NetworkResult.Error -> result
            NetworkResult.Loading -> NetworkResult.Loading
        }
    }

    suspend fun updatePhone(phone: String?): NetworkResult<ProfileDto> {
        val result = safeApiCall {
            residentApiService.updateProfile(ProfileUpdateRequest(phone = phone))
        }
        return when (result) {
            is NetworkResult.Success -> {
                val user = result.data.user
                if (user == null) {
                    NetworkResult.Error(AppError.Unknown("Unable to read updated profile."))
                } else {
                    sessionPreferences.saveUserPhone(user.phone.orEmpty())
                    NetworkResult.Success(
                        ProfileDto(
                            id = user.id,
                            name = user.name,
                            email = user.email,
                            phone = user.phone,
                            role = user.role,
                            status = user.status,
                            flatId = user.flatId,
                            flatNo = null,
                            wing = null,
                            floorNo = null,
                            flatStatus = null,
                            societyName = null
                        )
                    )
                }
            }
            is NetworkResult.Error -> result
            NetworkResult.Loading -> NetworkResult.Loading
        }
    }

    private suspend fun updateSessionFromProfile(profile: ProfileDto) {
        profile.phone?.let { sessionPreferences.saveUserPhone(it) }
        profile.name?.let { sessionPreferences.saveUserName(it) }
        profile.email?.let { sessionPreferences.saveUserEmail(it) }
        profile.role?.let { sessionPreferences.saveUserRole(it) }
        profile.status?.let { sessionPreferences.saveUserStatus(it) }
    }

    private suspend fun <T> safeApiCall(call: suspend () -> Response<T>): NetworkResult<T> {
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

    private fun mapHttpError(code: Int, serverMessage: String?): AppError {
        val safeMessage = sanitizeServerMessage(serverMessage)
        return when (code) {
            400 -> AppError.Validation(safeMessage ?: "Invalid input. Please check the form.")
            401 -> AppError.Unauthorized
            403 -> AppError.Forbidden(safeMessage ?: "You do not have permission to perform this action.")
            404 -> AppError.Unknown(safeMessage ?: "Requested data was not found.")
            408 -> AppError.Timeout
            429 -> AppError.Server("Too many requests. Please try again later.")
            500 -> AppError.Server("Server error. Please try again later.")
            502, 503 -> AppError.Server("The server is temporarily unavailable.")
            else -> AppError.Unknown("Request failed. Please try again.")
        }
    }

    private fun sanitizeServerMessage(message: String?): String? {
        if (message.isNullOrBlank()) return null
        val lower = message.lowercase()
        val unsafe = listOf("sql", "stack", "exception", "syntax", "database")
        return if (unsafe.any { lower.contains(it) }) null else message
    }
}
