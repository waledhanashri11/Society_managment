package com.example.application.data.repository

import com.example.application.data.remote.api.AdminManagementApiService
import com.example.application.data.remote.dto.ErrorResponse
import com.example.application.data.remote.dto.FlatDto
import com.example.application.data.remote.dto.FlatSaveRequest
import com.example.application.data.remote.dto.FlatTypeDto
import com.example.application.data.remote.dto.FlatTypeSaveRequest
import com.example.application.data.remote.dto.StaffDto
import com.example.application.data.remote.dto.StaffSaveRequest
import com.example.application.data.remote.dto.UserSaveRequest
import com.example.application.data.remote.dto.UserStatusRequest
import com.example.application.data.remote.dto.UserSummaryDto
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
class AdminManagementRepository @Inject constructor(
    private val api: AdminManagementApiService,
    private val gson: Gson
) {
    private var cachedUsers: List<UserSummaryDto>? = null
    private var cachedFlats: List<FlatDto>? = null
    private var cachedFlatTypes: List<FlatTypeDto>? = null
    private var cachedStaff: List<StaffDto>? = null

    suspend fun getResidents(refresh: Boolean = false): NetworkResult<List<UserSummaryDto>> {
        cachedUsers?.takeIf { !refresh }?.let { users ->
            return NetworkResult.Success(users.filter { it.role == "resident" })
        }
        return when (val result = safeApiCall { api.getUsers() }) {
            is NetworkResult.Success -> {
                cachedUsers = result.data
                NetworkResult.Success(result.data.filter { it.role == "resident" })
            }
            is NetworkResult.Error -> result
            NetworkResult.Loading -> NetworkResult.Loading
        }
    }

    suspend fun getResident(id: String): NetworkResult<UserSummaryDto> = safeApiCall { api.getUser(id) }

    suspend fun saveResident(id: String?, request: UserSaveRequest): NetworkResult<String> {
        val result = if (id == null) {
            safeApiCall { api.createUser(request) }
        } else {
            safeApiCall { api.updateUser(id, request.copy(password = request.password?.takeIf { it.isNotBlank() })) }
        }
        return messageResult(result, if (id == null) "Resident created successfully" else "Resident updated successfully").also {
            if (it is NetworkResult.Success) clearPeopleCache()
        }
    }

    suspend fun updateResidentStatus(id: String, status: String): NetworkResult<String> {
        val result = safeApiCall { api.updateUserStatus(id, UserStatusRequest(status)) }
        return messageResult(result, "Resident $status successfully").also {
            if (it is NetworkResult.Success) clearPeopleCache()
        }
    }

    suspend fun deleteResident(id: String): NetworkResult<String> {
        val result = safeApiCall { api.deleteUser(id) }
        return messageResult(result, "Resident deleted successfully").also {
            if (it is NetworkResult.Success) clearPeopleCache()
        }
    }

    suspend fun getFlats(refresh: Boolean = false): NetworkResult<List<FlatDto>> {
        cachedFlats?.takeIf { !refresh }?.let { return NetworkResult.Success(it) }
        return when (val result = safeApiCall { api.getFlats() }) {
            is NetworkResult.Success -> {
                cachedFlats = result.data
                NetworkResult.Success(result.data)
            }
            is NetworkResult.Error -> result
            NetworkResult.Loading -> NetworkResult.Loading
        }
    }

    suspend fun getAvailableFlats(): NetworkResult<List<FlatDto>> = safeApiCall { api.getAvailableFlats() }

    suspend fun getFlat(id: String): NetworkResult<FlatDto> = safeApiCall { api.getFlat(id) }

    suspend fun saveFlat(id: String?, request: FlatSaveRequest): NetworkResult<String> {
        val result = if (id == null) safeApiCall { api.createFlat(request) } else safeApiCall { api.updateFlat(id, request) }
        return messageResult(result, if (id == null) "Flat created successfully" else "Flat updated successfully").also {
            if (it is NetworkResult.Success) clearFlatCache()
        }
    }

    suspend fun deleteFlat(id: String): NetworkResult<String> {
        val result = safeApiCall { api.deleteFlat(id) }
        return messageResult(result, "Flat deleted successfully").also {
            if (it is NetworkResult.Success) clearFlatCache()
        }
    }

    suspend fun getFlatTypes(refresh: Boolean = false): NetworkResult<List<FlatTypeDto>> {
        cachedFlatTypes?.takeIf { !refresh }?.let { return NetworkResult.Success(it) }
        return when (val result = safeApiCall { api.getFlatTypes() }) {
            is NetworkResult.Success -> {
                cachedFlatTypes = result.data
                NetworkResult.Success(result.data)
            }
            is NetworkResult.Error -> result
            NetworkResult.Loading -> NetworkResult.Loading
        }
    }

    suspend fun saveFlatType(id: String?, request: FlatTypeSaveRequest): NetworkResult<String> {
        val result = if (id == null) safeApiCall { api.createFlatType(request) } else safeApiCall { api.updateFlatType(id, request) }
        return messageResult(result, if (id == null) "Flat type created successfully" else "Flat type updated successfully").also {
            if (it is NetworkResult.Success) clearFlatCache()
        }
    }

    suspend fun updateFlatTypeStatus(id: String, status: String): NetworkResult<String> {
        val result = safeApiCall { api.updateFlatTypeStatus(id, mapOf("status" to status)) }
        return messageResult(result, "Flat type status updated successfully").also {
            if (it is NetworkResult.Success) clearFlatCache()
        }
    }

    suspend fun deleteFlatType(id: String): NetworkResult<String> {
        val result = safeApiCall { api.deleteFlatType(id) }
        return messageResult(result, "Flat type deleted successfully").also {
            if (it is NetworkResult.Success) clearFlatCache()
        }
    }

    suspend fun getStaff(refresh: Boolean = false): NetworkResult<List<StaffDto>> {
        cachedStaff?.takeIf { !refresh }?.let { return NetworkResult.Success(it) }
        return when (val result = safeApiCall { api.getStaff() }) {
            is NetworkResult.Success -> {
                cachedStaff = result.data
                NetworkResult.Success(result.data)
            }
            is NetworkResult.Error -> result
            NetworkResult.Loading -> NetworkResult.Loading
        }
    }

    suspend fun getStaffMember(id: String): NetworkResult<StaffDto> = safeApiCall { api.getStaffMember(id) }

    suspend fun saveStaff(id: String?, request: StaffSaveRequest): NetworkResult<String> {
        val result = if (id == null) safeApiCall { api.createStaff(request) } else safeApiCall { api.updateStaff(id, request) }
        return messageResult(result, if (id == null) "Staff member created successfully" else "Staff member updated successfully").also {
            if (it is NetworkResult.Success) cachedStaff = null
        }
    }

    suspend fun deleteStaff(id: String): NetworkResult<String> {
        val result = safeApiCall { api.deleteStaff(id) }
        return messageResult(result, "Staff member deleted successfully").also {
            if (it is NetworkResult.Success) cachedStaff = null
        }
    }

    fun userMessageFor(error: AppError): String {
        return when (error) {
            AppError.NoInternet -> "No internet connection. Check your network and try again."
            AppError.Timeout -> "The request timed out. Please try again."
            AppError.Unauthorized -> "Your session expired. Please login again."
            is AppError.Forbidden -> error.message ?: "You do not have admin permission for this action."
            is AppError.Validation -> error.message
            is AppError.Server -> error.message ?: "Server error. Please try again later."
            is AppError.Unknown -> error.message ?: "Something went wrong. Please try again."
        }
    }

    private fun clearPeopleCache() {
        cachedUsers = null
        cachedFlats = null
    }

    private fun clearFlatCache() {
        cachedFlats = null
        cachedUsers = null
        cachedFlatTypes = null
    }

    private fun messageResult(result: NetworkResult<*>, fallback: String): NetworkResult<String> {
        return when (result) {
            is NetworkResult.Success -> NetworkResult.Success(fallback)
            is NetworkResult.Error -> result
            NetworkResult.Loading -> NetworkResult.Loading
        }
    }

    private suspend fun <T> safeApiCall(call: suspend () -> Response<T>): NetworkResult<T> {
        return try {
            val response = call()
            if (response.isSuccessful) {
                response.body()?.let { NetworkResult.Success(it) }
                    ?: NetworkResult.Error(AppError.Unknown("Unable to read the server response."))
            } else {
                NetworkResult.Error(mapHttpError(response.code(), parseErrorMessage(response.errorBody()?.string())))
            }
        } catch (_: UnknownHostException) {
            NetworkResult.Error(AppError.NoInternet)
        } catch (_: SocketTimeoutException) {
            NetworkResult.Error(AppError.Timeout)
        } catch (_: IOException) {
            NetworkResult.Error(AppError.NoInternet)
        } catch (error: HttpException) {
            NetworkResult.Error(mapHttpError(error.code(), null))
        } catch (_: JsonSyntaxException) {
            NetworkResult.Error(AppError.Unknown("Unable to read the server response."))
        } catch (_: Exception) {
            NetworkResult.Error(AppError.Unknown("Request failed. Please try again."))
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
        val safe = sanitizeServerMessage(serverMessage)
        return when (code) {
            400, 422 -> AppError.Validation(safe ?: "Please check the form details.")
            401 -> AppError.Unauthorized
            403 -> AppError.Forbidden(safe ?: "Only admins can use this screen.")
            404 -> AppError.Unknown(safe ?: "Record not found.")
            408 -> AppError.Timeout
            409 -> AppError.Validation(safe ?: "This record conflicts with existing data.")
            429 -> AppError.Server("Too many requests. Please try again later.")
            500 -> AppError.Server("Server error. Please try again later.")
            502, 503 -> AppError.Server("Railway server is temporarily unavailable.")
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
