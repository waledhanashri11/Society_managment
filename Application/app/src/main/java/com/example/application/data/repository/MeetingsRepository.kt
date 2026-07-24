package com.example.application.data.repository

import com.example.application.data.remote.api.MeetingsApiService
import com.example.application.data.remote.dto.*
import com.example.application.util.AppError
import com.example.application.util.NetworkResult
import com.google.gson.Gson
import com.google.gson.JsonElement
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.inject.Inject
import javax.inject.Singleton
import retrofit2.Response

@Singleton
class MeetingsRepository @Inject constructor(private val api: MeetingsApiService, private val gson: Gson) {
    private var cache: List<MeetingDto>? = null
    private val detailsCache = mutableMapOf<String, MeetingDetailsDto>()

    suspend fun getMeetings(refresh: Boolean = false): NetworkResult<List<MeetingDto>> {
        cache?.takeIf { !refresh }?.let { return NetworkResult.Success(it) }
        return safe { api.getMeetings() }.also { if (it is NetworkResult.Success) cache = it.data }
    }
    suspend fun getMeeting(id: String, refresh: Boolean = false): NetworkResult<MeetingDetailsDto> {
        detailsCache[id]?.takeIf { !refresh }?.let { return NetworkResult.Success(it) }
        return safe { api.getMeeting(id) }.also { if (it is NetworkResult.Success) detailsCache[id] = it.data }
    }
    suspend fun create(request: MeetingSaveRequest) = message { api.createMeeting(request) }
    suspend fun update(id: String, request: MeetingSaveRequest) = message { api.updateMeeting(id, request) }
    suspend fun delete(id: String) = message { api.deleteMeeting(id) }
    suspend fun agenda(id: String, request: MeetingAgendaSaveRequest) = message { api.saveAgenda(id, request) }
    suspend fun attendance(id: String) = safe { api.getAttendance(id) }
    suspend fun saveAttendance(id: String, request: MeetingAttendanceSaveRequest) = message { api.saveAttendance(id, request) }
    suspend fun report(id: String, request: MeetingReportSaveRequest) = message { api.saveReport(id, request) }
    suspend fun action(request: MeetingActionSaveRequest) = message { api.createAction(request) }
    suspend fun updateAction(id: String, request: MeetingActionSaveRequest) = message { api.updateAction(id, request) }
    suspend fun updateActionStatus(id: String, request: MeetingActionStatusRequest) = message { api.updateActionStatus(id, request) }
    suspend fun deleteAction(id: String) = message { api.deleteAction(id) }
    suspend fun vote(request: MeetingVoteSaveRequest) = message { api.createVote(request) }
    suspend fun castVote(id: String, choice: String) = message { api.castVote(id, MeetingVoteCastRequest(choice)) }
    fun clearCache() { cache = null; detailsCache.clear() }
    fun userMessageFor(error: AppError): String = when (error) {
        AppError.NoInternet -> "No internet connection. Cached meetings may be available."
        AppError.Timeout -> "The request timed out."
        AppError.Unauthorized -> "Session expired. Please login again."
        is AppError.Forbidden -> error.message ?: "You do not have permission."
        is AppError.Validation -> error.message
        is AppError.Server -> error.message ?: "Server error."
        is AppError.Unknown -> error.message ?: "Something went wrong."
    }
    private suspend fun <T> safe(call: suspend () -> Response<T>): NetworkResult<T> = try {
        val response = call()
        if (response.isSuccessful) response.body()?.let { NetworkResult.Success(it) } ?: NetworkResult.Error(AppError.Unknown("Empty server response."))
        else NetworkResult.Error(mapError(response.code(), response.errorBody()?.string()))
    } catch (_: UnknownHostException) { NetworkResult.Error(AppError.NoInternet) }
    catch (_: SocketTimeoutException) { NetworkResult.Error(AppError.Timeout) }
    catch (_: IOException) { NetworkResult.Error(AppError.NoInternet) }
    catch (_: Exception) { NetworkResult.Error(AppError.Unknown("Request failed. Please try again.")) }
    private suspend fun message(call: suspend () -> Response<JsonElement>): NetworkResult<String> = when (val result = safe(call)) {
        is NetworkResult.Success -> {
            clearCache()
            val message = result.data.takeIf { it.isJsonObject }?.asJsonObject?.get("message")?.asString ?: "Saved successfully"
            NetworkResult.Success(message)
        }
        is NetworkResult.Error -> result
        NetworkResult.Loading -> NetworkResult.Loading
    }
    private fun mapError(code: Int, body: String?): AppError = when (code) {
        400, 409, 422 -> AppError.Validation(parseMessage(body) ?: "Please check the details.")
        401 -> AppError.Unauthorized
        403 -> AppError.Forbidden(parseMessage(body))
        404 -> AppError.Unknown(parseMessage(body) ?: "Meeting not found.")
        408 -> AppError.Timeout
        500 -> AppError.Server(parseMessage(body) ?: "Meeting service unavailable.")
        502, 503 -> AppError.Server(parseMessage(body) ?: "Railway meeting service unavailable.")
        else -> AppError.Unknown(parseMessage(body) ?: "Request failed.")
    }
    private fun parseMessage(body: String?): String? = runCatching { gson.fromJson(body, ErrorResponse::class.java)?.message }.getOrNull()
}
