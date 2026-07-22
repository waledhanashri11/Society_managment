package com.example.application.data.repository

import com.example.application.data.remote.api.SocietyRulesApiService
import com.example.application.data.remote.dto.ErrorResponse
import com.example.application.data.remote.dto.SocietyRuleAcknowledgementReportDto
import com.example.application.data.remote.dto.SocietyRuleActionResponse
import com.example.application.data.remote.dto.SocietyRuleDto
import com.example.application.data.remote.dto.SocietyRuleSaveRequest
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

@Singleton
class SocietyRulesRepository @Inject constructor(
    private val api: SocietyRulesApiService,
    private val gson: Gson
) {
    private var adminRulesCache: List<SocietyRuleDto>? = null
    private var residentRulesCache: List<SocietyRuleDto>? = null
    private val reportCache = mutableMapOf<String, SocietyRuleAcknowledgementReportDto>()

    suspend fun getAdminRules(refresh: Boolean = false): NetworkResult<List<SocietyRuleDto>> {
        adminRulesCache?.takeIf { !refresh }?.let { return NetworkResult.Success(it) }
        return safeCall { api.getRules() }.also { if (it is NetworkResult.Success) adminRulesCache = it.data }
    }

    suspend fun getResidentRules(refresh: Boolean = false): NetworkResult<List<SocietyRuleDto>> {
        residentRulesCache?.takeIf { !refresh }?.let { return NetworkResult.Success(it) }
        return safeCall { api.getRules(status = "published") }.also { if (it is NetworkResult.Success) residentRulesCache = it.data }
    }

    suspend fun getRule(id: String): NetworkResult<SocietyRuleDto> = safeCall { api.getRule(id) }

    suspend fun getCategories(): NetworkResult<List<String>> = safeCall { api.getCategories() }

    suspend fun saveRule(
        id: String?,
        title: String,
        description: String,
        category: String,
        priority: String,
        publishNow: Boolean
    ): NetworkResult<String> {
        val request = SocietyRuleSaveRequest(
            title = title,
            description = description,
            category = category,
            priority = priority,
            status = if (publishNow) "published" else "draft"
        )
        val result = if (id.isNullOrBlank()) {
            messageCall { api.createRule(request) }
        } else {
            messageCall { api.updateRule(id, request) }
        }
        if (result is NetworkResult.Success) clearRulesCache()
        return result
    }

    suspend fun publishRule(id: String) = action { api.publishRule(id) }
    suspend fun unpublishRule(id: String) = action { api.unpublishRule(id) }
    suspend fun archiveRule(id: String) = action { api.archiveRule(id) }

    suspend fun markRuleRead(id: String): NetworkResult<String> {
        return messageCall { api.markRuleRead(id) }.also {
            if (it is NetworkResult.Success) residentRulesCache = null
        }
    }

    suspend fun acknowledgeRule(id: String): NetworkResult<String> {
        return messageCall { api.acknowledgeRule(id) }.also {
            if (it is NetworkResult.Success) residentRulesCache = null
        }
    }

    suspend fun getAcknowledgementReport(id: String, refresh: Boolean = false): NetworkResult<SocietyRuleAcknowledgementReportDto> {
        reportCache[id]?.takeIf { !refresh }?.let { return NetworkResult.Success(it) }
        return safeCall { api.getAcknowledgementReport(id) }.also {
            if (it is NetworkResult.Success) reportCache[id] = it.data
        }
    }

    suspend fun sendReminders(id: String): NetworkResult<String> {
        return messageCall { api.sendReminders(id) }.also {
            if (it is NetworkResult.Success) reportCache.remove(id)
        }
    }

    private suspend fun action(call: suspend () -> Response<SocietyRuleActionResponse>): NetworkResult<String> {
        return messageCall(call).also { if (it is NetworkResult.Success) clearRulesCache() }
    }

    private fun clearRulesCache() {
        adminRulesCache = null
        residentRulesCache = null
        reportCache.clear()
    }

    private suspend fun messageCall(call: suspend () -> Response<SocietyRuleActionResponse>): NetworkResult<String> {
        return when (val result = safeCall(call)) {
            is NetworkResult.Success -> NetworkResult.Success(result.data.message ?: "Saved successfully")
            is NetworkResult.Error -> result
            NetworkResult.Loading -> NetworkResult.Loading
        }
    }

    private suspend fun <T> safeCall(call: suspend () -> Response<T>): NetworkResult<T> {
        return try {
            val response = call()
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
