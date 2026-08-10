package com.example.application.data.remote.api

import com.example.application.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface SuperAdminApiService {
    @GET("api/super-admin/dashboard") suspend fun dashboard(): Response<PlatformSummaryDto>
    @GET("api/super-admin/societies") suspend fun societies(): Response<List<ManagedSocietyDto>>
    @GET("api/super-admin/societies/{id}") suspend fun society(@Path("id") id: String): Response<ManagedSocietyDto>
    @POST("api/super-admin/societies") suspend fun createSociety(@Body request: CreateSocietyRequest): Response<CreateSocietyResponse>
    @PATCH("api/super-admin/societies/{id}/status") suspend fun setStatus(@Path("id") id: String, @Body request: SocietyStatusRequest): Response<MessageResponse>
}
