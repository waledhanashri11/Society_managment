package com.example.application.data.repository

import com.example.application.data.remote.api.CommunicationApiService
import com.example.application.data.remote.api.MaintenanceApiService
import com.example.application.data.remote.api.ReportsApiService
import com.example.application.data.remote.dto.AdminReportRowDto
import com.example.application.data.remote.dto.ApiResponse
import com.example.application.data.remote.dto.ComplaintDto
import com.example.application.data.remote.dto.ErrorResponse
import com.example.application.data.remote.dto.ExpenseDto
import com.example.application.data.remote.dto.MaintenanceBillDto
import com.example.application.data.remote.dto.MembersMaintenanceReportDto
import com.example.application.data.remote.dto.ReportFilterState
import com.example.application.data.remote.dto.ReportSummaryDto
import com.example.application.data.remote.dto.ResidentExpenseReportDto
import com.example.application.data.remote.dto.ResidentMaintenanceReportDto
import com.example.application.data.remote.dto.SocietyReportSummaryDto
import com.example.application.util.AppError
import com.example.application.util.NetworkResult
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.inject.Inject
import javax.inject.Singleton
import retrofit2.Response

@Singleton
class ReportRepository @Inject constructor(
    private val reportsApi: ReportsApiService,
    private val maintenanceApi: MaintenanceApiService,
    private val communicationApi: CommunicationApiService,
    private val gson: Gson
) {
    private var adminCache: AdminReportsData? = null
    private var residentCache: ResidentReportsData? = null
    private var adminCacheKey: String = ""
    private var residentCacheKey: String = ""

    suspend fun getAdminReports(filter: ReportFilterState, refresh: Boolean = false): NetworkResult<AdminReportsData> {
        val key = filter.cacheKey()
        adminCache?.takeIf { !refresh && adminCacheKey == key }?.let { return NetworkResult.Success(it) }

        val bills = safeWrappedList { maintenanceApi.getBills() }
        val expenses = safeWrappedList { maintenanceApi.getExpenses() }
        val complaints = safeList { communicationApi.getAllComplaints() }
        val overview = safeWrappedList { reportsApi.getAdminMaintenanceReport() }
        val monthlyCollection = safeWrappedList { reportsApi.getAdminMaintenanceReport("monthly-collection") }
        val pendingBills = safeWrappedList { reportsApi.getAdminMaintenanceReport("pending-bills") }
        val paidBills = safeWrappedList { reportsApi.getAdminMaintenanceReport("paid-bills") }

        if (bills is NetworkResult.Error && overview is NetworkResult.Error) return bills

        val data = AdminReportsData(
            bills = (bills as? NetworkResult.Success)?.data.orEmpty(),
            expenses = (expenses as? NetworkResult.Success)?.data.orEmpty(),
            complaints = (complaints as? NetworkResult.Success)?.data.orEmpty(),
            overview = (overview as? NetworkResult.Success)?.data.orEmpty(),
            monthlyCollection = (monthlyCollection as? NetworkResult.Success)?.data.orEmpty(),
            pendingBills = (pendingBills as? NetworkResult.Success)?.data.orEmpty(),
            paidBills = (paidBills as? NetworkResult.Success)?.data.orEmpty(),
            warnings = listOfNotNull(
                if (expenses is NetworkResult.Error) messageFor(expenses.error) else null,
                if (complaints is NetworkResult.Error) "Complaint report unavailable." else null,
                if (monthlyCollection is NetworkResult.Error) "Monthly collection report unavailable." else null
            )
        ).filtered(filter)

        adminCache = data
        adminCacheKey = key
        return NetworkResult.Success(data)
    }

    suspend fun getResidentReports(filter: ReportFilterState, refresh: Boolean = false): NetworkResult<ResidentReportsData> {
        val key = filter.cacheKey()
        residentCache?.takeIf { !refresh && residentCacheKey == key }?.let { return NetworkResult.Success(it) }

        val month = filter.month.takeIf { it.isNotBlank() }
        val year = filter.year.takeIf { it.isNotBlank() }
        val status = filter.status.takeIf { it.isNotBlank() }

        val mySummary = safeDirect { reportsApi.getResidentReportSummary() }
        val myMaintenance = safeList { reportsApi.getResidentMaintenanceReport(month, year, status) }
        val societySummary = safeDirect { reportsApi.getSocietyReportSummary(month, year) }
        val expenses = safeList { reportsApi.getResidentExpenseReport(month, year) }
        val members = safeList { reportsApi.getMembersMaintenanceReport(month, year, status) }
        val allMaintenance = safeList { reportsApi.getAllMaintenanceReport(month, year, status) }
        val complaints = safeList { communicationApi.getMyComplaints() }

        if (mySummary is NetworkResult.Error && myMaintenance is NetworkResult.Error) return mySummary

        val data = ResidentReportsData(
            summary = (mySummary as? NetworkResult.Success)?.data,
            myMaintenance = (myMaintenance as? NetworkResult.Success)?.data.orEmpty(),
            societySummary = (societySummary as? NetworkResult.Success)?.data,
            expenses = (expenses as? NetworkResult.Success)?.data.orEmpty(),
            membersMaintenance = (members as? NetworkResult.Success)?.data.orEmpty(),
            allMaintenance = (allMaintenance as? NetworkResult.Success)?.data.orEmpty(),
            complaints = (complaints as? NetworkResult.Success)?.data.orEmpty(),
            warnings = listOfNotNull(
                if (societySummary is NetworkResult.Error) "Society summary unavailable." else null,
                if (expenses is NetworkResult.Error) "Expense report unavailable." else null,
                if (members is NetworkResult.Error) "Members payment status unavailable." else null
            )
        )

        residentCache = data
        residentCacheKey = key
        return NetworkResult.Success(data)
    }

    fun clear() {
        adminCache = null
        residentCache = null
        adminCacheKey = ""
        residentCacheKey = ""
    }

    private fun AdminReportsData.filtered(filter: ReportFilterState): AdminReportsData {
        return copy(
            bills = bills.filter { it.matches(filter, it.dueDate ?: it.paymentDate, it.month, it.year, it.paymentStatus ?: it.status) },
            expenses = expenses.filter { it.matches(filter) },
            complaints = complaints.filter { it.matches(filter) }
        )
    }

    private fun MaintenanceBillDto.matches(filter: ReportFilterState, date: String?, month: String?, year: String?, status: String?): Boolean {
        if (filter.status.isNotBlank() && !status.equals(filter.status, ignoreCase = true)) return false
        if (filter.month.isBlank() && filter.year.isBlank()) return true
        val datePart = date.orEmpty().take(10)
        if (filter.year.isNotBlank()) {
            val rowYear = if (datePart.length >= 4) datePart.take(4) else year.orEmpty()
            if (rowYear != filter.year) return false
        }
        if (filter.month.isNotBlank()) {
            val rowMonth = if (datePart.length >= 7) datePart.substring(5, 7).trimStart('0') else month.orEmpty().trimStart('0')
            if (rowMonth != filter.month.trimStart('0')) return false
        }
        return true
    }

    private fun ExpenseDto.matches(filter: ReportFilterState): Boolean {
        val date = expenseDate.orEmpty().take(10)
        if (filter.year.isNotBlank() && date.length >= 4 && date.take(4) != filter.year) return false
        if (filter.month.isNotBlank() && date.length >= 7 && date.substring(5, 7).trimStart('0') != filter.month.trimStart('0')) return false
        return true
    }

    private fun ComplaintDto.matches(filter: ReportFilterState): Boolean {
        val date = createdAt.orEmpty().take(10)
        if (filter.year.isNotBlank() && date.length >= 4 && date.take(4) != filter.year) return false
        if (filter.month.isNotBlank() && date.length >= 7 && date.substring(5, 7).trimStart('0') != filter.month.trimStart('0')) return false
        return true
    }

    private suspend fun <T> safeWrappedList(call: suspend () -> Response<ApiResponse<List<T>>>): NetworkResult<List<T>> {
        return try {
            val response = call()
            if (response.isSuccessful && response.body()?.success != false) {
                NetworkResult.Success(response.body()?.data.orEmpty())
            } else {
                NetworkResult.Error(mapHttpError(response.code(), parseErrorMessage(response.errorBody()?.string()) ?: response.body()?.message))
            }
        } catch (error: Exception) {
            NetworkResult.Error(mapException(error))
        }
    }

    private suspend fun <T> safeList(call: suspend () -> Response<List<T>>): NetworkResult<List<T>> {
        return try {
            val response = call()
            if (response.isSuccessful) NetworkResult.Success(response.body().orEmpty())
            else NetworkResult.Error(mapHttpError(response.code(), parseErrorMessage(response.errorBody()?.string())))
        } catch (error: Exception) {
            NetworkResult.Error(mapException(error))
        }
    }

    private suspend fun <T> safeDirect(call: suspend () -> Response<T>): NetworkResult<T> {
        return try {
            val response = call()
            val body = response.body()
            if (response.isSuccessful && body != null) NetworkResult.Success(body)
            else NetworkResult.Error(mapHttpError(response.code(), parseErrorMessage(response.errorBody()?.string())))
        } catch (error: Exception) {
            NetworkResult.Error(mapException(error))
        }
    }

    private fun mapException(error: Exception): AppError {
        return when (error) {
            is UnknownHostException -> AppError.NoInternet
            is SocketTimeoutException -> AppError.Timeout
            is IOException -> AppError.NoInternet
            is JsonSyntaxException -> AppError.Unknown("Unable to read report response.")
            else -> AppError.Unknown("Report request failed. Please try again.")
        }
    }

    private fun parseErrorMessage(errorBody: String?): String? {
        if (errorBody.isNullOrBlank()) return null
        return try { gson.fromJson(errorBody, ErrorResponse::class.java)?.message } catch (_: Exception) { null }
    }

    private fun mapHttpError(code: Int, serverMessage: String?): AppError {
        val safe = serverMessage?.takeUnless {
            val lower = it.lowercase()
            listOf("sql", "stack", "exception", "database").any(lower::contains)
        }
        return when (code) {
            400, 409, 422 -> AppError.Validation(safe ?: "Please check the selected filters.")
            401 -> AppError.Unauthorized
            403 -> AppError.Forbidden(safe ?: "You do not have permission to view this report.")
            404 -> AppError.Unknown(safe ?: "This report is not available yet.")
            408 -> AppError.Timeout
            429 -> AppError.Server("Too many requests. Please wait and try again.")
            500 -> AppError.Server("Server error while loading reports.")
            502, 503 -> AppError.Server("Railway server unavailable.")
            else -> AppError.Unknown("Report request failed.")
        }
    }

    fun messageFor(error: AppError): String = when (error) {
        AppError.NoInternet -> "No internet connection."
        AppError.Timeout -> "The report request timed out."
        AppError.Unauthorized -> "Session expired. Please login again."
        is AppError.Forbidden -> error.message ?: "You do not have permission."
        is AppError.Validation -> error.message
        is AppError.Server -> error.message ?: "Server error."
        is AppError.Unknown -> error.message ?: "Something went wrong."
    }
}

data class AdminReportsData(
    val bills: List<MaintenanceBillDto>,
    val expenses: List<ExpenseDto>,
    val complaints: List<ComplaintDto>,
    val overview: List<AdminReportRowDto>,
    val monthlyCollection: List<AdminReportRowDto>,
    val pendingBills: List<AdminReportRowDto>,
    val paidBills: List<AdminReportRowDto>,
    val warnings: List<String>
)

data class ResidentReportsData(
    val summary: ReportSummaryDto?,
    val myMaintenance: List<ResidentMaintenanceReportDto>,
    val societySummary: SocietyReportSummaryDto?,
    val expenses: List<ResidentExpenseReportDto>,
    val membersMaintenance: List<MembersMaintenanceReportDto>,
    val allMaintenance: List<ResidentMaintenanceReportDto>,
    val complaints: List<ComplaintDto>,
    val warnings: List<String>
)

private fun ReportFilterState.cacheKey(): String = "$month|$year|$status"

