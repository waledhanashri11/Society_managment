package com.example.application.data.repository

import com.example.application.data.remote.api.EventsApiService
import com.example.application.data.remote.dto.ErrorResponse
import com.example.application.data.remote.dto.EventDto
import com.example.application.data.remote.dto.EventSaveRequest
import com.example.application.data.remote.dto.EventStatusRequest
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
class EventsRepository @Inject constructor(
    private val api: EventsApiService,
    private val gson: Gson
) {
    private var cache: List<EventDto>? = null
    private val detailCache = mutableMapOf<String, EventDto>()

    suspend fun getEvents(refresh: Boolean = false): NetworkResult<List<EventDto>> {
        cache?.takeIf { !refresh }?.let { return NetworkResult.Success(it) }
        return safe { api.getEvents() }.also { if (it is NetworkResult.Success) cache = it.data }
    }

    suspend fun getEvent(id: String, refresh: Boolean = false): NetworkResult<EventDto> {
        detailCache[id]?.takeIf { !refresh }?.let { return NetworkResult.Success(it) }
        return safe { api.getEvent(id) }.also { if (it is NetworkResult.Success) detailCache[id] = it.data }
    }

    suspend fun create(request: EventSaveRequest): NetworkResult<String> = message { api.createEvent(request) }
    suspend fun update(id: String, request: EventSaveRequest): NetworkResult<String> = message { api.updateEvent(id, request) }
    suspend fun updateStatus(id: String, status: String): NetworkResult<String> = message { api.updateStatus(id, EventStatusRequest(status)) }
    suspend fun delete(id: String): NetworkResult<String> = message { api.deleteEvent(id) }

    fun clearCache() {
        cache = null
        detailCache.clear()
    }

    fun userMessageFor(error: AppError): String = when (error) {
        AppError.NoInternet -> "No internet connection. Cached events may be available."
        AppError.Timeout -> "The request timed out."
        AppError.Unauthorized -> "Session expired. Please login again."
        is AppError.Forbidden -> error.message ?: "You do not have permission."
        is AppError.Validation -> error.message
        is AppError.Server -> error.message ?: "Event service unavailable."
        is AppError.Unknown -> error.message ?: "Something went wrong."
    }

    private suspend fun <T> safe(call: suspend () -> Response<T>): NetworkResult<T> = try {
        val response = call()
        if (response.isSuccessful) {
            response.body()?.let { NetworkResult.Success(it) } ?: NetworkResult.Error(AppError.Unknown("Empty server response."))
        } else {
            NetworkResult.Error(mapError(response.code(), response.errorBody()?.string()))
        }
    } catch (_: UnknownHostException) {
        NetworkResult.Error(AppError.NoInternet)
    } catch (_: SocketTimeoutException) {
        NetworkResult.Error(AppError.Timeout)
    } catch (_: IOException) {
        NetworkResult.Error(AppError.NoInternet)
    } catch (_: Exception) {
        NetworkResult.Error(AppError.Unknown("Request failed. Please try again."))
    }

    private suspend fun message(call: suspend () -> Response<JsonElement>): NetworkResult<String> = when (val result = safe(call)) {
        is NetworkResult.Success -> {
            clearCache()
            NetworkResult.Success("Saved successfully")
        }
        is NetworkResult.Error -> result
        NetworkResult.Loading -> NetworkResult.Loading
    }

    private fun mapError(code: Int, body: String?): AppError = when (code) {
        400, 409, 422 -> AppError.Validation(parseMessage(body) ?: "Please check the event details.")
        401 -> AppError.Unauthorized
        403 -> AppError.Forbidden(parseMessage(body))
        404 -> AppError.Unknown(parseMessage(body) ?: "Event not found.")
        408 -> AppError.Timeout
        500, 502, 503 -> AppError.Server("Event service unavailable.")
        else -> AppError.Unknown(parseMessage(body) ?: "Request failed.")
    }

    private fun parseMessage(body: String?): String? = runCatching {
        gson.fromJson(body, ErrorResponse::class.java)?.message
    }.getOrNull()
}
