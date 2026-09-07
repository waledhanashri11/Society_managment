package com.example.application.data.remote.api

import com.example.application.data.remote.dto.ApiResponse
import com.example.application.data.remote.dto.ExcelImportBatchDto
import com.example.application.data.remote.dto.ExcelImportConfirmDto
import com.example.application.data.remote.dto.ExcelImportConfirmRequest
import com.example.application.data.remote.dto.ExcelImportPreviewDto
import okhttp3.MultipartBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Streaming

interface ExcelTransactionsApiService {
    @Streaming
    @GET("api/maintenance/transactions/export")
    suspend fun exportTransactions(
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("member") member: String? = null,
        @Query("wing") wing: String? = null,
        @Query("flat") flat: String? = null,
        @Query("status") status: String? = null,
        @Query("paymentMode") paymentMode: String? = null
    ): Response<ResponseBody>

    @Streaming
    @GET("api/maintenance/transactions/template")
    suspend fun downloadTemplate(): Response<ResponseBody>

    @Multipart
    @POST("api/maintenance/transactions/import/preview")
    suspend fun previewImport(@Part file: MultipartBody.Part): Response<ApiResponse<ExcelImportPreviewDto>>

    @POST("api/maintenance/transactions/import/confirm")
    suspend fun confirmImport(@Body request: ExcelImportConfirmRequest): Response<ApiResponse<ExcelImportConfirmDto>>

    @GET("api/maintenance/transactions/imports")
    suspend fun getImportHistory(): Response<ApiResponse<List<ExcelImportBatchDto>>>

    @Streaming
    @GET("api/maintenance/transactions/imports/{batchId}/errors")
    suspend fun downloadErrors(@Path("batchId") batchId: String): Response<ResponseBody>
}
