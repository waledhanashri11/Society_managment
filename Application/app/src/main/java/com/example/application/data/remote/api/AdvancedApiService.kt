package com.example.application.data.remote.api

import com.google.gson.JsonElement
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

/** Endpoints implemented by the backend that do not belong to the original CRUD services. */
interface AdvancedApiService {
    @GET("api/settings") suspend fun getAdminSettings(): Response<JsonElement>
    @PUT("api/settings") suspend fun saveAdminSettings(@Body body: Map<String, @JvmSuppressWildcards Any?>): Response<JsonElement>

    @GET("api/flats/{id}/current-resident") suspend fun getCurrentResident(@Path("id") id: String): Response<JsonElement>
    @GET("api/flats/{id}/history") suspend fun getFlatHistory(@Path("id") id: String): Response<JsonElement>
    @GET("api/flats/{id}/transfers") suspend fun getFlatTransfers(@Path("id") id: String): Response<JsonElement>
    @GET("api/flats/{id}/maintenance-history") suspend fun getFlatMaintenanceHistory(@Path("id") id: String): Response<JsonElement>
    @POST("api/flats/transfer") suspend fun transferFlat(@Body body: Map<String, @JvmSuppressWildcards Any?>): Response<JsonElement>

    @GET("api/maintenance/payments/pending-verification") suspend fun getPendingPayments(): Response<JsonElement>
    @GET("api/maintenance/payments/history") suspend fun getPaymentHistory(): Response<JsonElement>
    @GET("api/maintenance/payments/{id}/receipt") suspend fun getPaymentReceipt(@Path("id") id: String): Response<ResponseBody>
    @PUT("api/maintenance/payments/{id}/approve") suspend fun approvePayment(@Path("id") id: String): Response<JsonElement>
    @PUT("api/maintenance/payments/{id}/reject") suspend fun rejectPayment(@Path("id") id: String, @Body body: Map<String, String>): Response<JsonElement>

    @PUT("api/complaints/{id}/confirm-resolved") suspend fun confirmComplaintResolved(@Path("id") id: String): Response<JsonElement>
    @PUT("api/complaints/{id}/reopen") suspend fun reopenComplaint(@Path("id") id: String): Response<JsonElement>

    @GET("api/notifications/admin") suspend fun getAdminNotifications(): Response<JsonElement>
    @PUT("api/notifications/admin/read") suspend fun markAdminNotificationsRead(): Response<JsonElement>
    @PUT("api/notifications/{id}/read") suspend fun markResidentNotificationRead(@Path("id") id: String): Response<JsonElement>

    @GET("api/noc/summary") suspend fun getNocSummary(): Response<JsonElement>
    @GET("api/noc/types") suspend fun getNocTypes(): Response<JsonElement>
    @POST("api/noc/types") suspend fun createNocType(@Body body: Map<String, String>): Response<JsonElement>
    @GET("api/noc/{id}") suspend fun getNocDetails(@Path("id") id: String): Response<JsonElement>
    @POST("api/noc/{id}/share") suspend fun createNocShareLink(@Path("id") id: String): Response<JsonElement>

    @GET("api/resident/visitors") suspend fun getVisitors(): Response<JsonElement>
    @GET("api/resident/parcels") suspend fun getParcels(): Response<JsonElement>
    @GET("api/resident/activities") suspend fun getActivities(): Response<JsonElement>
    @GET("api/resident/reports/complaints") suspend fun getComplaintReport(): Response<JsonElement>

    @GET("api/maintenance/resident-categories") suspend fun getResidentCategories(): Response<JsonElement>
    @GET("api/maintenance/flats/{flatId}/categories") suspend fun getFlatCategories(@Path("flatId") flatId: String): Response<JsonElement>
    @PUT("api/maintenance/flats/{flatId}/categories") suspend fun saveFlatCategories(@Path("flatId") flatId: String, @Body body: Map<String, List<Int>>): Response<JsonElement>
    @POST("api/maintenance/resident-categories/bulk") suspend fun bulkAssignCategories(@Body body: Map<String, @JvmSuppressWildcards Any>): Response<JsonElement>
}
