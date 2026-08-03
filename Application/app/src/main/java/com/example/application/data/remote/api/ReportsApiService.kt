package com.example.application.data.remote.api

import com.example.application.data.remote.dto.AdminReportRowDto
import com.example.application.data.remote.dto.ApiResponse
import com.example.application.data.remote.dto.MembersMaintenanceReportDto
import com.example.application.data.remote.dto.ReportSummaryDto
import com.example.application.data.remote.dto.ResidentExpenseReportDto
import com.example.application.data.remote.dto.ResidentMaintenanceReportDto
import com.example.application.data.remote.dto.SocietyReportSummaryDto
import com.example.application.data.remote.dto.FinancialReportDto
import com.example.application.data.remote.dto.MonthlyMaintenanceReportResponse
import com.example.application.data.remote.dto.MonthlyDashboardSummaryDto
import com.example.application.data.remote.dto.CollectionHistoryDto
import com.example.application.data.remote.dto.PaymentModeReportDto
import com.example.application.data.remote.dto.ResidentLedgerResponse
import com.example.application.data.remote.dto.MonthlyReceiptDto
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Body
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface ReportsApiService {
    @GET("api/reports/maintenance/monthly-report")
    suspend fun getMonthlyMaintenanceReport(
        @Query("month") month: String? = null, @Query("year") year: String? = null,
        @Query("wing") wing: String? = null, @Query("floor") floor: String? = null,
        @Query("flat") flat: String? = null, @Query("resident") resident: String? = null,
        @Query("payment_status") paymentStatus: String? = null, @Query("search") search: String? = null
    ): Response<MonthlyMaintenanceReportResponse>

    @GET("api/reports/maintenance/dashboard-summary")
    suspend fun getMonthlyDashboardSummary(@Query("month") month: String? = null, @Query("year") year: String? = null): Response<ApiResponse<MonthlyDashboardSummaryDto>>

    @GET("api/reports/maintenance/12-month-history")
    suspend fun get12MonthHistory(): Response<ApiResponse<List<CollectionHistoryDto>>>

    @GET("api/reports/maintenance/payment-modes")
    suspend fun getPaymentModes(@Query("month") month: String? = null, @Query("year") year: String? = null): Response<ApiResponse<PaymentModeReportDto>>

    @GET("api/reports/maintenance/resident-ledger")
    suspend fun getResidentLedger(@Query("resident_id") residentId: String, @Query("month") month: String? = null, @Query("year") year: String? = null): Response<ResidentLedgerResponse>

    @GET("api/reports/maintenance/receipts/{id}")
    suspend fun getMonthlyReceipt(@Path("id") paymentId: String): Response<ApiResponse<MonthlyReceiptDto>>
    @GET("api/maintenance/reports/financial")
    suspend fun getFinancialReport(@Query("financialYear") financialYear: String): Response<ApiResponse<FinancialReportDto>>

    @GET("api/maintenance/reports/bank-ledger")
    suspend fun getBankLedger(@Query("financialYear") financialYear: String): Response<ApiResponse<com.example.application.data.remote.dto.AccountLedgerDto>>

    @GET("api/maintenance/reports/cash-ledger")
    suspend fun getCashLedger(@Query("financialYear") financialYear: String): Response<ApiResponse<com.example.application.data.remote.dto.AccountLedgerDto>>

    @GET("api/maintenance/reports/flat-collection")
    suspend fun getFlatCollectionReport(
        @Query("financialYear") financialYear: String,
        @Query("month") month: String? = null,
        @Query("wing") wing: String? = null,
        @Query("flatNo") flatNo: String? = null,
        @Query("status") status: String? = null
    ): Response<ApiResponse<List<com.example.application.data.remote.dto.FlatPaymentReportDto>>>

    @PUT("api/maintenance/reports/opening-balance")
    suspend fun saveOpeningBalance(@Body request: com.example.application.data.remote.dto.OpeningBalanceRequest): Response<ApiResponse<com.example.application.data.remote.dto.OpeningBalanceDto>>

    @GET("api/resident/reports/account-summary")
    suspend fun getResidentAccountSummary(@Query("financialYear") financialYear: String): Response<com.example.application.data.remote.dto.ResidentAccountReportDto>

    @GET("api/resident/reports/society-transparency")
    suspend fun getResidentSocietyTransparency(@Query("financialYear") financialYear: String): Response<com.example.application.data.remote.dto.ResidentTransparencyReportDto>
    @GET("api/reports/admin/annual")
    suspend fun getAdminAnnual(@Query("financialYear") financialYear: String): Response<FinancialReportDto>

    @GET("api/reports/admin/monthly")
    suspend fun getAdminMonthly(@Query("year") year: Int, @Query("month") month: Int): Response<FinancialReportDto>

    @GET("api/reports/resident/transparency")
    suspend fun getResidentTransparency(@Query("financialYear") financialYear: String): Response<FinancialReportDto>

    @GET("api/maintenance/reports")
    suspend fun getAdminMaintenanceReport(
        @Query("type") type: String? = null
    ): Response<ApiResponse<List<AdminReportRowDto>>>

    @GET("api/resident/reports/my-summary")
    suspend fun getResidentReportSummary(): Response<ReportSummaryDto>

    @GET("api/resident/reports/my-maintenance")
    suspend fun getResidentMaintenanceReport(
        @Query("month") month: String? = null,
        @Query("year") year: String? = null,
        @Query("status") status: String? = null
    ): Response<List<ResidentMaintenanceReportDto>>

    @GET("api/resident/reports/society-summary")
    suspend fun getSocietyReportSummary(
        @Query("month") month: String? = null,
        @Query("year") year: String? = null
    ): Response<SocietyReportSummaryDto>

    @GET("api/resident/reports/expenses")
    suspend fun getResidentExpenseReport(
        @Query("month") month: String? = null,
        @Query("year") year: String? = null
    ): Response<List<ResidentExpenseReportDto>>

    @GET("api/resident/reports/members-maintenance")
    suspend fun getMembersMaintenanceReport(
        @Query("month") month: String? = null,
        @Query("year") year: String? = null,
        @Query("status") status: String? = null
    ): Response<List<MembersMaintenanceReportDto>>

    @GET("api/resident/reports/all-maintenance")
    suspend fun getAllMaintenanceReport(
        @Query("month") month: String? = null,
        @Query("year") year: String? = null,
        @Query("status") status: String? = null
    ): Response<List<ResidentMaintenanceReportDto>>
}
