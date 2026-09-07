package com.example.application.data.remote.api

import com.example.application.data.remote.dto.AdminProfileDto
import com.example.application.data.remote.dto.AdminProfileUpdateRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PUT

interface AdminProfileApiService {
    @GET("api/settings")
    suspend fun getProfile(): Response<AdminProfileDto>

    @PUT("api/settings")
    suspend fun updateProfile(@Body request: AdminProfileUpdateRequest): Response<AdminProfileDto>
}
