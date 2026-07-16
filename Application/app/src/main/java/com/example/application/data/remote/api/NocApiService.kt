package com.example.application.data.remote.api

import com.example.application.data.remote.dto.ApiResponse
import com.example.application.data.remote.dto.CreateNocRequest
import com.example.application.data.remote.dto.NocRequestDto
import com.example.application.data.remote.dto.ReviewNocRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface NocApiService {
    @GET("api/noc/my")
    suspend fun getMyNocs(): Response<ApiResponse<List<NocRequestDto>>>

    @POST("api/noc")
    suspend fun createNoc(@Body request: CreateNocRequest): Response<ApiResponse<Map<String, String>>>

    @PATCH("api/noc/{id}/cancel")
    suspend fun cancelNoc(@Path("id") id: String): Response<ApiResponse<Unit>>

    @GET("api/noc/admin")
    suspend fun getAllNocs(@Query("status") status: String? = null): Response<ApiResponse<List<NocRequestDto>>>

    @PATCH("api/noc/admin/{id}/review")
    suspend fun reviewNoc(@Path("id") id: String, @Body request: ReviewNocRequest): Response<ApiResponse<Map<String, String>>>
}
