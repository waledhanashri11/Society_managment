package com.example.application.data.remote.api

import com.example.application.data.remote.dto.ApiResponse
import com.example.application.data.remote.dto.BillDetailsDto
import com.example.application.data.remote.dto.CategorySaveRequest
import com.example.application.data.remote.dto.CreateDisputeRequest
import com.example.application.data.remote.dto.ExpenseCreateRequest
import com.example.application.data.remote.dto.ExpenseDto
import com.example.application.data.remote.dto.GenerateBillsRequest
import com.example.application.data.remote.dto.GenerateBillsResultDto
import com.example.application.data.remote.dto.LateFeeRuleDto
import com.example.application.data.remote.dto.LateFeeRuleRequest
import com.example.application.data.remote.dto.MaintenanceBillDto
import com.example.application.data.remote.dto.MaintenanceCategoryDto
import com.example.application.data.remote.dto.MaintenanceCreateRequest
import com.example.application.data.remote.dto.MaintenanceDashboardDto
import com.example.application.data.remote.dto.MaintenanceDisputeDto
import com.example.application.data.remote.dto.MaintenancePaymentDto
import com.example.application.data.remote.dto.MaintenanceSettingsDto
import com.example.application.data.remote.dto.MaintenanceSettingsRequest
import com.example.application.data.remote.dto.MaintenanceUpdateRequest
import com.example.application.data.remote.dto.ManualPayRequest
import com.example.application.data.remote.dto.MarkPaidRequest
import com.example.application.data.remote.dto.PaymentSettingsDto
import com.example.application.data.remote.dto.SubmitPaymentRequest
import com.example.application.data.remote.dto.UpdatePaymentRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface MaintenanceApiService {
    @GET("api/maintenance/dashboard")
    suspend fun getDashboard(): Response<ApiResponse<MaintenanceDashboardDto>>

    @GET("api/maintenance/bills")
    suspend fun getBills(): Response<ApiResponse<List<MaintenanceBillDto>>>

    @GET("api/maintenance/bills/{id}")
    suspend fun getBillDetails(@Path("id") id: String): Response<ApiResponse<BillDetailsDto>>

    @POST("api/maintenance")
    suspend fun createMaintenance(@Body request: MaintenanceCreateRequest): Response<ApiResponse<Map<String, String>>>

    @PUT("api/maintenance/{id}")
    suspend fun updateMaintenance(@Path("id") id: String, @Body request: MaintenanceUpdateRequest): Response<ApiResponse<Unit>>

    @DELETE("api/maintenance/{id}")
    suspend fun deleteMaintenance(@Path("id") id: String): Response<ApiResponse<Unit>>

    @POST("api/maintenance/generate")
    suspend fun generateBills(@Body request: GenerateBillsRequest): Response<ApiResponse<GenerateBillsResultDto>>

    @PUT("api/maintenance/bills/{id}/mark-paid")
    suspend fun markBillPaid(@Path("id") id: String, @Body request: MarkPaidRequest): Response<ApiResponse<Unit>>

    @PUT("api/maintenance/{id}/pay")
    suspend fun payBill(@Path("id") id: String, @Body request: ManualPayRequest): Response<ApiResponse<Unit>>

    @POST("api/maintenance/bills/{id}/reminder")
    suspend fun sendReminder(@Path("id") id: String): Response<ApiResponse<Unit>>

    @POST("api/maintenance/apply-penalty")
    suspend fun applyPenalty(): Response<ApiResponse<Unit>>

    @PUT("api/maintenance/bills/{id}/waive-late-fee")
    suspend fun waiveLateFee(@Path("id") id: String): Response<ApiResponse<Unit>>

    @GET("api/maintenance/payments")
    suspend fun getPayments(): Response<ApiResponse<List<MaintenancePaymentDto>>>

    @POST("api/maintenance/payments")
    suspend fun submitPayment(@Body request: SubmitPaymentRequest): Response<ApiResponse<Unit>>

    @PUT("api/maintenance/payments/{id}")
    suspend fun updatePayment(@Path("id") id: String, @Body request: UpdatePaymentRequest): Response<ApiResponse<Unit>>

    @GET("api/maintenance/user/my-maintenance")
    suspend fun getMyMaintenance(): Response<ApiResponse<List<MaintenanceBillDto>>>

    @GET("api/maintenance/settings")
    suspend fun getSettings(): Response<ApiResponse<MaintenanceSettingsDto>>

    @POST("api/maintenance/settings")
    suspend fun saveSettings(@Body request: MaintenanceSettingsRequest): Response<ApiResponse<Unit>>

    @GET("api/settings/payment")
    suspend fun getPaymentSettings(): Response<PaymentSettingsDto>

    @GET("api/maintenance/categories")
    suspend fun getCategories(): Response<ApiResponse<List<MaintenanceCategoryDto>>>

    @POST("api/maintenance/categories")
    suspend fun createCategory(@Body request: CategorySaveRequest): Response<ApiResponse<Map<String, String>>>

    @PUT("api/maintenance/categories/{id}")
    suspend fun updateCategory(@Path("id") id: String, @Body request: CategorySaveRequest): Response<ApiResponse<Unit>>

    @DELETE("api/maintenance/categories/{id}")
    suspend fun deleteCategory(@Path("id") id: String): Response<ApiResponse<Unit>>

    @GET("api/maintenance/expenses")
    suspend fun getExpenses(
        @Query("search") search: String? = null,
        @Query("category") category: String? = null,
        @Query("status") status: String? = null
    ): Response<ApiResponse<List<ExpenseDto>>>

    @POST("api/maintenance/expenses")
    suspend fun createExpense(@Body request: ExpenseCreateRequest): Response<ApiResponse<Map<String, String>>>

    @DELETE("api/maintenance/expenses/{id}")
    suspend fun deleteExpense(@Path("id") id: String): Response<ApiResponse<Unit>>

    @GET("api/maintenance/late-fee-rule")
    suspend fun getLateFeeRule(): Response<ApiResponse<LateFeeRuleDto>>

    @PUT("api/maintenance/late-fee-rule")
    suspend fun saveLateFeeRule(@Body request: LateFeeRuleRequest): Response<ApiResponse<Map<String, String>>>

    @POST("api/maintenance/disputes")
    suspend fun createDispute(@Body request: CreateDisputeRequest): Response<ApiResponse<Map<String, String>>>

    @GET("api/maintenance/disputes")
    suspend fun getDisputes(): Response<ApiResponse<List<MaintenanceDisputeDto>>>
}
