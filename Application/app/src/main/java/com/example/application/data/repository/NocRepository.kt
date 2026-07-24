package com.example.application.data.repository

import com.example.application.data.remote.api.NocApiService
import com.example.application.data.remote.dto.ApiResponse
import com.example.application.data.remote.dto.CreateNocRequest
import com.example.application.data.remote.dto.ErrorResponse
import com.example.application.data.remote.dto.NocRequestDto
import com.example.application.data.remote.dto.ReviewNocRequest
import com.example.application.util.AppError
import com.example.application.util.NetworkResult
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.inject.Inject
import javax.inject.Singleton
import android.content.ContentValues
import android.content.Context
import android.os.Environment
import android.provider.MediaStore
import dagger.hilt.android.qualifiers.ApplicationContext
import retrofit2.Response

@Singleton
class NocRepository @Inject constructor(
    private val api: NocApiService,
    private val gson: Gson,
    @ApplicationContext private val context: Context
) {
    private var residentCache: List<NocRequestDto>? = null
    private var adminCache: List<NocRequestDto>? = null

    suspend fun getMyNocs(refresh: Boolean = false): NetworkResult<List<NocRequestDto>> {
        residentCache?.takeIf { !refresh }?.let { return NetworkResult.Success(it) }
        return listApiCall { api.getMyNocs() }.also { if (it is NetworkResult.Success) residentCache = it.data }
    }

    suspend fun createNoc(request: CreateNocRequest): NetworkResult<String> {
        return messageCall { api.createNoc(request) }.also { if (it is NetworkResult.Success) residentCache = null }
    }

    suspend fun cancelNoc(id: String): NetworkResult<String> {
        return messageCall { api.cancelNoc(id) }.also { if (it is NetworkResult.Success) residentCache = null }
    }

    suspend fun getAllNocs(status: String? = null, refresh: Boolean = false): NetworkResult<List<NocRequestDto>> {
        adminCache?.takeIf { !refresh && status.isNullOrBlank() }?.let { return NetworkResult.Success(it) }
        return listApiCall { api.getAllNocs(status?.takeUnless { it == "All" }) }
            .also { if (it is NetworkResult.Success && status.isNullOrBlank()) adminCache = it.data }
    }

    suspend fun reviewNoc(id: String, status: String, comments: String?): NetworkResult<String> {
        val call: suspend () -> Response<ApiResponse<Unit>> = when (status) {
            "Approved" -> { { api.approveNoc(id, ReviewNocRequest(comments)) } }
            "Rejected" -> { { api.rejectNoc(id, mapOf("reason" to comments, "remarks" to comments)) } }
            else -> { { api.markUnderReview(id, ReviewNocRequest(comments)) } }
        }
        return messageCall(call)
            .also {
                if (it is NetworkResult.Success) {
                    residentCache = null
                    adminCache = null
                }
            }
    }

    suspend fun downloadCertificate(id: String, requestNumber: String?): NetworkResult<String> {
        return try {
            val response = api.downloadCertificate(id)
            if (!response.isSuccessful || response.body() == null) {
                NetworkResult.Error(mapHttpError(response.code(), parseErrorMessage(response.errorBody()?.string())))
            } else {
                val name = "${requestNumber?.takeIf { it.isNotBlank() } ?: "NOC-$id"}.html"
                val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, name)
                    put(MediaStore.Downloads.MIME_TYPE, "text/html")
                    put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    put(MediaStore.Downloads.IS_PENDING, 1)
                }
                val uri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    ?: return NetworkResult.Error(AppError.Unknown("Unable to create the download file."))
                try {
                    context.contentResolver.openOutputStream(uri)?.use { output -> response.body()!!.byteStream().use { it.copyTo(output) } }
                        ?: error("Unable to open the download file.")
                    context.contentResolver.update(uri, ContentValues().apply { put(MediaStore.Downloads.IS_PENDING, 0) }, null, null)
                    NetworkResult.Success(uri.toString())
                } catch (error: Exception) {
                    context.contentResolver.delete(uri, null, null)
                    throw error
                }
            }
        } catch (_: IOException) {
            NetworkResult.Error(AppError.NoInternet)
        } catch (_: Exception) {
            NetworkResult.Error(AppError.Unknown("Unable to download the NOC certificate."))
        }
    }

    private suspend fun listApiCall(call: suspend () -> Response<List<NocRequestDto>>): NetworkResult<List<NocRequestDto>> {
        return try {
            val response = call()
            if (response.isSuccessful) NetworkResult.Success(response.body().orEmpty())
            else NetworkResult.Error(mapHttpError(response.code(), parseErrorMessage(response.errorBody()?.string())))
        } catch (_: UnknownHostException) { NetworkResult.Error(AppError.NoInternet)
        } catch (_: SocketTimeoutException) { NetworkResult.Error(AppError.Timeout)
        } catch (_: IOException) { NetworkResult.Error(AppError.NoInternet)
        } catch (_: Exception) { NetworkResult.Error(AppError.Unknown("Request failed. Please try again.")) }
    }

    private suspend fun <T> messageCall(call: suspend () -> Response<ApiResponse<T>>): NetworkResult<String> {
        return try {
            val response = call()
            if (response.isSuccessful && response.body()?.success != false) {
                NetworkResult.Success(response.body()?.message ?: "Saved successfully")
            } else {
                NetworkResult.Error(mapHttpError(response.code(), parseErrorMessage(response.errorBody()?.string()) ?: response.body()?.message))
            }
        } catch (_: UnknownHostException) {
            NetworkResult.Error(AppError.NoInternet)
        } catch (_: SocketTimeoutException) {
            NetworkResult.Error(AppError.Timeout)
        } catch (_: IOException) {
            NetworkResult.Error(AppError.NoInternet)
        } catch (_: JsonSyntaxException) {
            NetworkResult.Error(AppError.Unknown("Unable to read server response."))
        } catch (_: Exception) {
            NetworkResult.Error(AppError.Unknown("Request failed. Please try again."))
        }
    }

    private suspend fun <T> safeApiCall(call: suspend () -> Response<ApiResponse<T>>): NetworkResult<T> {
        return try {
            val response = call()
            if (response.isSuccessful) {
                val body = response.body()
                if (body?.success == false) {
                    NetworkResult.Error(AppError.Validation(body.message ?: "Request failed."))
                } else {
                    body?.data?.let { NetworkResult.Success(it) }
                        ?: NetworkResult.Error(AppError.Unknown("No data returned by server."))
                }
            } else {
                NetworkResult.Error(mapHttpError(response.code(), parseErrorMessage(response.errorBody()?.string())))
            }
        } catch (_: UnknownHostException) {
            NetworkResult.Error(AppError.NoInternet)
        } catch (_: SocketTimeoutException) {
            NetworkResult.Error(AppError.Timeout)
        } catch (_: IOException) {
            NetworkResult.Error(AppError.NoInternet)
        } catch (_: JsonSyntaxException) {
            NetworkResult.Error(AppError.Unknown("Unable to read server response."))
        } catch (_: Exception) {
            NetworkResult.Error(AppError.Unknown("Request failed. Please try again."))
        }
    }

    fun userMessageFor(error: AppError): String = when (error) {
        AppError.NoInternet -> "No internet connection."
        AppError.Timeout -> "The request timed out."
        AppError.Unauthorized -> "Session expired. Please login again."
        is AppError.Forbidden -> error.message ?: "You do not have permission."
        is AppError.Validation -> error.message
        is AppError.Server -> error.message ?: "Server error."
        is AppError.Unknown -> error.message ?: "Something went wrong."
    }

    private fun parseErrorMessage(errorBody: String?): String? {
        if (errorBody.isNullOrBlank()) return null
        return try { gson.fromJson(errorBody, ErrorResponse::class.java)?.message } catch (_: Exception) { null }
    }

    private fun mapHttpError(code: Int, serverMessage: String?): AppError {
        val safe = serverMessage?.takeUnless {
            val lower = it.lowercase()
            listOf("sql", "stack", "exception", "database").any(lower::contains)
        }
        return when (code) {
            400, 409, 422 -> AppError.Validation(safe ?: "Please check the details.")
            401 -> AppError.Unauthorized
            403 -> AppError.Forbidden(safe)
            404 -> AppError.Unknown(safe ?: "Record not found.")
            408 -> AppError.Timeout
            429 -> AppError.Server("Too many requests.")
            500 -> AppError.Server("Server error.")
            502, 503 -> AppError.Server("Railway server unavailable.")
            else -> AppError.Unknown("Request failed.")
        }
    }
}
