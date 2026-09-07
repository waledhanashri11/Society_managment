package com.example.application.data.repository

import com.example.application.data.local.datastore.SessionPreferences
import com.example.application.data.remote.api.AdminProfileApiService
import com.example.application.data.remote.dto.AdminProfileDto
import com.example.application.data.remote.dto.AdminProfileUpdateRequest
import com.example.application.data.remote.dto.ErrorResponse
import com.example.application.util.AppError
import com.example.application.util.NetworkResult
import com.google.gson.Gson
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AdminProfileRepository @Inject constructor(
    private val api: AdminProfileApiService,
    private val sessionPreferences: SessionPreferences,
    private val gson: Gson
) {
    suspend fun getProfile(): NetworkResult<AdminProfileDto> = call { api.getProfile() }

    suspend fun updateProfile(request: AdminProfileUpdateRequest): NetworkResult<AdminProfileDto> {
        val result = call { api.updateProfile(request) }
        if (result is NetworkResult.Success) {
            result.data.adminName?.takeIf { it.isNotBlank() }?.let { sessionPreferences.saveUserName(it) }
            result.data.email?.takeIf { it.isNotBlank() }?.let { sessionPreferences.saveUserEmail(it) }
            request.societyName.takeIf { it.isNotBlank() }?.let { sessionPreferences.saveSocietyName(it) }
        }
        return result
    }

    private suspend fun call(block: suspend () -> retrofit2.Response<AdminProfileDto>): NetworkResult<AdminProfileDto> = try {
        val response = block()
        val body = response.body()
        if (response.isSuccessful && body != null) NetworkResult.Success(body)
        else {
            val message = runCatching {
                gson.fromJson(response.errorBody()?.string(), ErrorResponse::class.java)?.message
            }.getOrNull()
            NetworkResult.Error(
                when (response.code()) {
                    401 -> AppError.Unauthorized
                    403 -> AppError.Forbidden(message)
                    400, 409 -> AppError.Validation(message ?: "Unable to update profile.")
                    else -> AppError.Server(message ?: "Unable to load profile.")
                }
            )
        }
    } catch (_: IOException) {
        NetworkResult.Error(AppError.Server("Unable to reach the server. Please try again."))
    } catch (_: Exception) {
        NetworkResult.Error(AppError.Unknown("Something went wrong. Please try again."))
    }

    fun message(error: AppError): String = when (error) {
        AppError.NoInternet -> "No internet connection."
        AppError.Timeout -> "The request timed out. Please try again."
        AppError.Unauthorized -> "Your session has expired. Please log in again."
        is AppError.Forbidden -> error.message ?: "You do not have permission to view this profile."
        is AppError.Validation -> error.message
        is AppError.Server -> error.message ?: "The server is temporarily unavailable."
        is AppError.Unknown -> error.message ?: "Something went wrong."
    }
}
