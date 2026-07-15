package com.example.application.data.remote.api

import com.example.application.data.remote.dto.ProfileUpdateRequest
import com.example.application.data.remote.dto.ProfileUpdateResponse
import com.example.application.data.remote.dto.ResidentDashboardResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PUT

interface ResidentApiService {
    @GET("api/resident/dashboard")
    suspend fun getDashboard(): Response<ResidentDashboardResponse>

    @PUT("api/resident/profile")
    suspend fun updateProfile(@Body request: ProfileUpdateRequest): Response<ProfileUpdateResponse>
}
