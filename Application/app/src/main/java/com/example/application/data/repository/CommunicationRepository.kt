package com.example.application.data.repository

import com.example.application.data.local.datastore.SessionPreferences
import com.example.application.data.remote.api.CommunicationApiService
import com.example.application.data.remote.dto.AdminNotificationsResponse
import com.example.application.data.remote.dto.ComplaintDto
import com.example.application.data.remote.dto.ComplaintSaveRequest
import com.example.application.data.remote.dto.ComplaintUpdateRequest
import com.example.application.data.remote.dto.ErrorResponse
import com.example.application.data.remote.dto.NoticeDto
import com.example.application.data.remote.dto.NoticePollSaveRequest
import com.example.application.data.remote.dto.NoticeSaveRequest
import com.example.application.data.remote.dto.NoticeVoteRequest
import com.example.application.util.AppError
import com.example.application.util.NetworkResult
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.inject.Inject
import javax.inject.Singleton
import retrofit2.Response
import kotlinx.coroutines.delay

@Singleton
class CommunicationRepository @Inject constructor(
    private val api: CommunicationApiService,
    private val gson: Gson,
    private val sessionPreferences: SessionPreferences
) {
    private var adminComplaintsCache: List<ComplaintDto>? = null
    private var residentComplaintsCache: List<ComplaintDto>? = null
    private var noticesCache: List<NoticeDto>? = null
    private var notificationsCache: AdminNotificationsResponse? = null

    suspend fun getAdminComplaints(refresh: Boolean = false): NetworkResult<List<ComplaintDto>> {
        adminComplaintsCache?.takeIf { !refresh }?.let { return NetworkResult.Success(it) }
        return safeCall { api.getAllComplaints() }.also { if (it is NetworkResult.Success) adminComplaintsCache = it.data }
    }

    suspend fun getResidentComplaints(refresh: Boolean = false): NetworkResult<List<ComplaintDto>> {
        residentComplaintsCache?.takeIf { !refresh }?.let { return NetworkResult.Success(it) }
        return safeCall { api.getMyComplaints() }.also { if (it is NetworkResult.Success) residentComplaintsCache = it.data }
    }

    suspend fun getComplaint(id: String) = safeCall { api.getComplaint(id) }

    suspend fun createComplaint(title: String, description: String, images: List<String>): NetworkResult<String> {
        return messageCall { api.createComplaint(ComplaintSaveRequest(title, description, images.filter { it.isNotBlank() }.take(3))) }.also { if (it is NetworkResult.Success) residentComplaintsCache = null }
    }

    suspend fun updateComplaint(id: String, status: String, reply: String?): NetworkResult<String> {
        return messageCall { api.updateComplaint(id, ComplaintUpdateRequest(status, reply)) }.also { if (it is NetworkResult.Success) clearComplaintCache() }
    }

    suspend fun confirmResolved(id: String): NetworkResult<String> {
        return messageCall { api.confirmResolved(id) }.also { if (it is NetworkResult.Success) clearComplaintCache() }
    }

    suspend fun reopenComplaint(id: String, comment: String): NetworkResult<String> {
        return messageCall { api.reopenComplaint(id, mapOf("comment" to comment)) }.also { if (it is NetworkResult.Success) clearComplaintCache() }
    }

    suspend fun deleteComplaint(id: String): NetworkResult<String> {
        return messageCall { api.deleteComplaint(id) }.also { if (it is NetworkResult.Success) clearComplaintCache() }
    }

    suspend fun getNotices(refresh: Boolean = false): NetworkResult<List<NoticeDto>> {
        noticesCache?.takeIf { !refresh }?.let { return NetworkResult.Success(it) }
        return safeCall { api.getNotices() }.also { if (it is NetworkResult.Success) noticesCache = it.data }
    }

    suspend fun getNotice(id: String) = safeCall { api.getNotice(id) }
    suspend fun getNoticeStats() = safeCall { api.getNoticeStats() }

    suspend fun createNotice(title: String, description: String, poll: NoticePollSaveRequest? = null): NetworkResult<String> {
        return messageCall { api.createNotice(NoticeSaveRequest(title, description, poll)) }.also { if (it is NetworkResult.Success) noticesCache = null }
    }

    suspend fun updateNotice(id: String, title: String, description: String, poll: NoticePollSaveRequest?): NetworkResult<String> {
        return messageCall { api.updateNotice(id, NoticeSaveRequest(title, description, poll)) }
            .also { if (it is NetworkResult.Success) noticesCache = null }
    }

    suspend fun deleteNotice(id: String): NetworkResult<String> {
        return messageCall { api.deleteNotice(id) }.also { if (it is NetworkResult.Success) noticesCache = null }
    }

    suspend fun closePoll(id: String): NetworkResult<String> {
        return messageCall { api.closePoll(id) }.also { if (it is NetworkResult.Success) noticesCache = null }
    }

    suspend fun voteNotice(id: String, optionIds: List<Int>): NetworkResult<String> {
        return messageCall { api.voteNotice(id, NoticeVoteRequest(optionIds)) }.also { if (it is NetworkResult.Success) noticesCache = null }
    }

    suspend fun getNotifications(refresh: Boolean = false): NetworkResult<AdminNotificationsResponse> {
        notificationsCache?.takeIf { !refresh }?.let { return NetworkResult.Success(it) }
        return safeCall {
            if (sessionPreferences.readSession()?.role?.lowercase() in setOf("admin", "super_admin")) api.getAdminNotifications() else api.getNotifications()
        }.also { if (it is NetworkResult.Success) notificationsCache = it.data }
    }

    suspend fun markNotificationsRead(): NetworkResult<String> {
        return messageCall {
            if (sessionPreferences.readSession()?.role?.lowercase() in setOf("admin", "super_admin")) api.markAdminNotificationsRead() else api.markNotificationsRead()
        }.also { if (it is NetworkResult.Success) notificationsCache = null }
    }

    suspend fun publishNotice(id: String): NetworkResult<String> {
        return messageCall { api.publishNotice(id) }.also { if (it is NetworkResult.Success) noticesCache = null }
    }

    suspend fun markNotificationRead(id: String): NetworkResult<String> {
        return messageCall { api.markNotificationRead(id) }
            .also { if (it is NetworkResult.Success) notificationsCache = null }
    }

    private fun clearComplaintCache() {
        adminComplaintsCache = null
        residentComplaintsCache = null
        notificationsCache = null
    }

    private suspend fun <T> messageCall(call: suspend () -> Response<T>): NetworkResult<String> {
        return when (val result = safeCall(call)) {
            is NetworkResult.Success -> NetworkResult.Success("Saved successfully")
            is NetworkResult.Error -> result
            NetworkResult.Loading -> NetworkResult.Loading
        }
    }

    private suspend fun <T> safeCall(call: suspend () -> Response<T>): NetworkResult<T> {
        return try {
            var response = call()
            if (response.code() == 502 || response.code() == 503) {
                delay(900)
                response = call()
            }
            if (response.isSuccessful) {
                response.body()?.let { NetworkResult.Success(it) }
                    ?: NetworkResult.Error(AppError.Unknown("Unable to read server response."))
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
