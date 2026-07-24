package com.example.application.data.remote.api

import com.example.application.data.remote.dto.ApiResponse
import com.example.application.data.remote.dto.CreateNocRequest
import com.example.application.data.remote.dto.NocRequestDto
import com.example.application.data.remote.dto.ReviewNocRequest
import retrofit2.Response
import retrofit2.http.Streaming
import okhttp3.ResponseBody
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface NocApiService {
    @GET("api/noc")
    suspend fun getMyNocs(): Response<List<NocRequestDto>>

    @POST("api/noc/request")
    suspend fun createNoc(@Body request: CreateNocRequest): Response<ApiResponse<Map<String, String>>>

    @PUT("api/noc/{id}/cancel")
    suspend fun cancelNoc(@Path("id") id: String): Response<ApiResponse<Unit>>

    @GET("api/noc")
    suspend fun getAllNocs(@Query("status") status: String? = null): Response<List<NocRequestDto>>

    @PUT("api/noc/{id}/review")
    suspend fun markUnderReview(@Path("id") id: String, @Body request: ReviewNocRequest): Response<ApiResponse<Unit>>

    @PUT("api/noc/{id}/approve")
    suspend fun approveNoc(@Path("id") id: String, @Body request: ReviewNocRequest): Response<ApiResponse<Unit>>

    @PUT("api/noc/{id}/reject")
    suspend fun rejectNoc(@Path("id") id: String, @Body request: Map<String, String?>): Response<ApiResponse<Unit>>

    @Streaming
    @GET("api/noc/{id}/pdf")
    suspend fun downloadCertificate(@Path("id") id: String): Response<ResponseBody>
}
