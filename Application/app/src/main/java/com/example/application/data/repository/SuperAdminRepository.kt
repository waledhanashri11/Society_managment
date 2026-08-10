package com.example.application.data.repository

import com.example.application.data.remote.api.SuperAdminApiService
import com.example.application.data.remote.dto.*
import javax.inject.Inject
import javax.inject.Singleton
import retrofit2.Response

@Singleton
class SuperAdminRepository @Inject constructor(private val api: SuperAdminApiService) {
    suspend fun dashboard() = api.dashboard().bodyOrThrow()
    suspend fun societies() = api.societies().bodyOrThrow()
    suspend fun society(id: String) = api.society(id).bodyOrThrow()
    suspend fun create(request: CreateSocietyRequest) = api.createSociety(request).bodyOrThrow()
    suspend fun setStatus(id: String, status: String) = api.setStatus(id, SocietyStatusRequest(status)).bodyOrThrow()

    private fun <T> Response<T>.bodyOrThrow(): T {
        if (isSuccessful) return body() ?: error("The server returned an empty response")
        throw IllegalStateException(if (code() == 403) "Super Admin access is required" else "Request failed. Please try again.")
    }
}
