package com.example.application.data.remote.api

import com.example.application.data.remote.dto.AdminReportRowDto
import com.example.application.data.remote.dto.ApiResponse
import com.example.application.data.remote.dto.MembersMaintenanceReportDto
import com.example.application.data.remote.dto.ReportSummaryDto
import com.example.application.data.remote.dto.ResidentExpenseReportDto
import com.example.application.data.remote.dto.ResidentMaintenanceReportDto
import com.example.application.data.remote.dto.SocietyReportSummaryDto
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

interface ReportsApiService {
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

