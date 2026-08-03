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
import com.example.application.data.remote.dto.MaintenanceWaiverDto
import com.example.application.data.remote.dto.ReportFilterState
import com.example.application.data.remote.dto.ReportSummaryDto
import com.example.application.data.remote.dto.ResidentExpenseReportDto
import com.example.application.data.remote.dto.ResidentMaintenanceReportDto
import com.example.application.data.remote.dto.SocietyReportSummaryDto
import com.example.application.data.remote.dto.currentFinancialYear
import com.example.application.data.remote.dto.FinancialReportDto
import com.example.application.data.remote.dto.AccountLedgerDto
import com.example.application.data.remote.dto.FlatPaymentReportDto
import com.example.application.data.remote.dto.ResidentAccountReportDto
import com.example.application.data.remote.dto.ResidentTransparencyReportDto
import com.example.application.data.remote.dto.OpeningBalanceRequest
import com.example.application.data.remote.dto.MonthlyMaintenanceRowDto
import com.example.application.data.remote.dto.MonthlyCollectionSummaryDto
import com.example.application.data.remote.dto.MonthlyDashboardSummaryDto
import com.example.application.data.remote.dto.CollectionHistoryDto
import com.example.application.data.remote.dto.PaymentModeReportDto
import com.example.application.data.remote.dto.ResidentLedgerResponse
import com.example.application.data.remote.dto.MonthlyReceiptDto
import com.example.application.data.remote.dto.LedgerWriteOffRequest
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
    private val communicationApi: CommunicationApiService
) {
    private var adminCache: AdminReportsData? = null
    private var adminCacheKey: String? = null
    private var residentCache: ResidentReportsData? = null
    private var residentCacheKey: String? = null

    suspend fun getAdminReports(filter: ReportFilterState, refresh: Boolean = false): NetworkResult<AdminReportsData> {
        val key = filter.cacheKey()
        adminCache?.takeIf { !refresh && adminCacheKey == key }?.let { return NetworkResult.Success(it) }

        val financialYear = filter.financialYear.ifBlank { currentFinancialYear() }
        val qMonth = filter.month.takeIf { it.isNotBlank() && !it.equals("All", true) }
        val qYear = filter.year.takeIf { it.isNotBlank() && !it.equals("All", true) }
        val qWing = filter.wing.takeIf { it.isNotBlank() && !it.equals("All", true) }
        val qFloor = filter.floor.takeIf { it.isNotBlank() && !it.equals("All", true) }
        val qFlat = filter.flatNo.takeIf { it.isNotBlank() }
        val qResident = filter.resident.takeIf { it.isNotBlank() }
        val qStatus = filter.status.takeIf { it.isNotBlank() && !it.equals("All", true) }
        val qSearch = filter.search.takeIf { it.isNotBlank() }

        val financial = safeWrapped { reportsApi.getFinancialReport(financialYear) }
        val monthlyReport = safeMonthlyReport { reportsApi.getMonthlyMaintenanceReport(
            qMonth, qYear, qWing, qFloor, qFlat, qResident, qStatus, qSearch
        ) }
        val monthlyDashboard = safeWrapped { reportsApi.getMonthlyDashboardSummary(qMonth, qYear) }
        val history12Month = safeWrappedList { reportsApi.get12MonthHistory() }
        val paymentModes = safeWrapped { reportsApi.getPaymentModes(qMonth, qYear) }
        val bankLedger = safeWrapped { reportsApi.getBankLedger(financialYear) }
        val cashLedger = safeWrapped { reportsApi.getCashLedger(financialYear) }
        val flatCollection = safeWrappedList { reportsApi.getFlatCollectionReport(
            financialYear, qMonth, qWing, qFlat, qStatus
        ) }
        val bills = safeWrappedList { maintenanceApi.getBills() }
        val expenses = safeWrappedList { maintenanceApi.getExpenses() }
        val complaints = safeList { communicationApi.getAllComplaints() }
        val overview = safeWrappedList { reportsApi.getAdminMaintenanceReport() }
        val monthlyCollection = safeWrappedList { reportsApi.getAdminMaintenanceReport("monthly-collection") }
        val pendingBills = safeWrappedList { reportsApi.getAdminMaintenanceReport("pending-bills") }
        val paidBills = safeWrappedList { reportsApi.getAdminMaintenanceReport("paid-bills") }
        val writeOffs = safeWrappedList { maintenanceApi.getWriteOffHistory(financialYear = financialYear) }

        val data = AdminReportsData(
            bills = (bills as? NetworkResult.Success)?.data.orEmpty(),
            expenses = (expenses as? NetworkResult.Success)?.data.orEmpty(),
            complaints = (complaints as? NetworkResult.Success)?.data.orEmpty(),
            overview = (overview as? NetworkResult.Success)?.data.orEmpty(),
            monthlyCollection = (monthlyCollection as? NetworkResult.Success)?.data.orEmpty(),
            pendingBills = (pendingBills as? NetworkResult.Success)?.data.orEmpty(),
            paidBills = (paidBills as? NetworkResult.Success)?.data.orEmpty(),
            financial = (financial as? NetworkResult.Success)?.data,
            bankLedger = (bankLedger as? NetworkResult.Success)?.data,
            cashLedger = (cashLedger as? NetworkResult.Success)?.data,
            flatCollection = (flatCollection as? NetworkResult.Success)?.data.orEmpty(),
            waivers = (writeOffs as? NetworkResult.Success)?.data.orEmpty(),
            monthlyReport = (monthlyReport as? NetworkResult.Success)?.data?.rows.orEmpty(),
            monthlySummary = (monthlyReport as? NetworkResult.Success)?.data?.summary,
            monthlyDashboard = (monthlyDashboard as? NetworkResult.Success)?.data,
            history12Month = (history12Month as? NetworkResult.Success)?.data.orEmpty(),
            paymentModes = (paymentModes as? NetworkResult.Success)?.data,
            warnings = listOfNotNull(
                if (financial is NetworkResult.Error) "Financial accounting summary unavailable: ${messageFor(financial.error)}" else null,
                if (monthlyReport is NetworkResult.Error) "Monthly maintenance report unavailable: ${messageFor(monthlyReport.error)}" else null,
                if (monthlyDashboard is NetworkResult.Error) "Monthly dashboard summary unavailable." else null,
                if (history12Month is NetworkResult.Error) "12-month collection history unavailable." else null,
                if (paymentModes is NetworkResult.Error) "Payment mode report unavailable." else null,
                if (expenses is NetworkResult.Error) messageFor(expenses.error) else null,
                if (complaints is NetworkResult.Error) "Complaint report unavailable." else null,
                if (monthlyCollection is NetworkResult.Error) "Monthly collection report unavailable." else null,
                if (bankLedger is NetworkResult.Error) "Bank ledger unavailable: ${messageFor(bankLedger.error)}" else null,
                if (cashLedger is NetworkResult.Error) "Cash ledger unavailable: ${messageFor(cashLedger.error)}" else null,
                if (flatCollection is NetworkResult.Error) "Flat collection unavailable: ${messageFor(flatCollection.error)}" else null,
                if (writeOffs is NetworkResult.Error) "Write-offs audit log unavailable: ${messageFor(writeOffs.error)}" else null
            )
        ).filtered(filter)

        adminCache = data
        adminCacheKey = key
        return NetworkResult.Success(data)
    }

    suspend fun getResidentReports(filter: ReportFilterState, refresh: Boolean = false): NetworkResult<ResidentReportsData> {
        val key = filter.cacheKey()
        residentCache?.takeIf { !refresh && residentCacheKey == key }?.let { return NetworkResult.Success(it) }

        val financialYear = filter.financialYear.ifBlank { currentFinancialYear() }
        val qMonth = filter.month.takeIf { it.isNotBlank() && !it.equals("All", true) }
        val qYear = filter.year.takeIf { it.isNotBlank() && !it.equals("All", true) }
        val qWing = filter.wing.takeIf { it.isNotBlank() && !it.equals("All", true) }
        val qStatus = filter.status.takeIf { it.isNotBlank() && !it.equals("All", true) }
        val qSearch = filter.search.takeIf { it.isNotBlank() }

        val financial = safeWrapped { reportsApi.getFinancialReport(financialYear) }
        val bankLedger = safeWrapped { reportsApi.getBankLedger(financialYear) }
        val cashLedger = safeWrapped { reportsApi.getCashLedger(financialYear) }
        val flatCollection = safeWrappedList { reportsApi.getFlatCollectionReport(financialYear, qMonth, qWing, null, qStatus) }
        val monthlyReport = safeMonthlyReport { reportsApi.getMonthlyMaintenanceReport(qMonth, qYear, qWing, null, null, null, qStatus, qSearch) }

        val account = (safeDirect { reportsApi.getResidentAccountSummary(financialYear) } as? NetworkResult.Success)?.data
        val transparency = (safeDirect { reportsApi.getResidentSocietyTransparency(financialYear) } as? NetworkResult.Success)?.data
        val mySummary = safeDirect { reportsApi.getResidentReportSummary() }
        val myMaintenance = safeList { reportsApi.getResidentMaintenanceReport(qMonth, qYear, qStatus) }
        val societySummary = safeDirect { reportsApi.getSocietyReportSummary(qMonth, qYear) }
        val expenses = safeList { reportsApi.getResidentExpenseReport(qMonth, qYear) }
        val members = safeList { reportsApi.getMembersMaintenanceReport(qMonth, qYear, qStatus) }
        val allMaintenance = safeList { reportsApi.getAllMaintenanceReport(qMonth, qYear, qStatus) }
        val complaints = safeList { communicationApi.getMyComplaints() }

        val finData = (financial as? NetworkResult.Success)?.data ?: FinancialReportDto(
            available = true, reason = null, financialYear = financialYear,
            summary = transparency?.summary,
            months = null, collection = null, income = null, expenses = null,
            bankTransactions = null, cashTransactions = null,
            flatPayments = transparency?.flatPayments
        )

        val data = ResidentReportsData(
            summary = (mySummary as? NetworkResult.Success)?.data,
            myMaintenance = (myMaintenance as? NetworkResult.Success)?.data.orEmpty(),
            societySummary = (societySummary as? NetworkResult.Success)?.data,
            expenses = (expenses as? NetworkResult.Success)?.data.orEmpty(),
            membersMaintenance = (members as? NetworkResult.Success)?.data.orEmpty(),
            allMaintenance = (allMaintenance as? NetworkResult.Success)?.data.orEmpty(),
            complaints = (complaints as? NetworkResult.Success)?.data.orEmpty(),
            financial = finData,
            bankLedger = (bankLedger as? NetworkResult.Success)?.data,
            cashLedger = (cashLedger as? NetworkResult.Success)?.data,
            flatCollection = (flatCollection as? NetworkResult.Success)?.data.orEmpty(),
            monthlyReport = (monthlyReport as? NetworkResult.Success)?.data?.rows.orEmpty(),
            accountReport = account,
            transparencyReport = transparency,
            warnings = listOfNotNull(
                if (account == null) "Account summary unavailable." else null,
                if (transparency == null) "Society transparency details unavailable." else null,
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

    suspend fun getAdminMonthly(year: Int, month: Int): NetworkResult<FinancialReportDto> =
        safeDirect { reportsApi.getAdminMonthly(year, month) }

    suspend fun saveOpeningBalance(financialYear: String, bank: String, cash: String): NetworkResult<String> {
        return when (val result = safeWrapped { reportsApi.saveOpeningBalance(OpeningBalanceRequest(financialYear, bank, cash)) }) {
            is NetworkResult.Success -> { clear(); NetworkResult.Success("Opening balance saved") }
            is NetworkResult.Error -> result
            NetworkResult.Loading -> NetworkResult.Loading
        }
    }

    suspend fun getResidentLedger(residentId: String, month: String? = null, year: String? = null): NetworkResult<ResidentLedgerResponse> =
        safeDirect { reportsApi.getResidentLedger(residentId, month, year) }

    suspend fun getMonthlyReceipt(paymentId: String): NetworkResult<MonthlyReceiptDto> =
        safeWrapped { reportsApi.getMonthlyReceipt(paymentId) }

    suspend fun approveMonthlyPayment(paymentId: String): NetworkResult<String> =
        actionCall { maintenanceApi.approvePayment(paymentId) }

    suspend fun rejectMonthlyPayment(paymentId: String, reason: String): NetworkResult<String> =
        actionCall { maintenanceApi.rejectPayment(paymentId, mapOf("rejection_reason" to reason)) }

    suspend fun applyMonthlyWriteOff(
        billId: String,
        type: String,
        amount: Double,
        reason: String,
        remarks: String?
    ): NetworkResult<String> {
        return actionCall {
            maintenanceApi.createWriteOff(
                LedgerWriteOffRequest(
                    billId = billId,
                    writeoffType = type,
                    amount = amount,
                    reason = reason,
                    remarks = remarks?.takeIf { it.isNotBlank() }
                )
            )
        }
    }

    private fun AdminReportsData.filtered(filter: ReportFilterState): AdminReportsData {
        val q = filter.search.trim().lowercase()
        if (q.isBlank()) return this
        return copy(
            bills = bills.filter {
                (it.residentName ?: "").lowercase().contains(q) ||
                (it.flatNo ?: "").lowercase().contains(q) ||
                (it.status ?: "").lowercase().contains(q)
            },
            expenses = expenses.filter {
                (it.expenseNumber ?: "").lowercase().contains(q) ||
                (it.category ?: "").lowercase().contains(q) ||
                (it.vendor ?: "").lowercase().contains(q) ||
                (it.description ?: "").lowercase().contains(q) ||
                (it.amount ?: "").lowercase().contains(q)
            },
            complaints = complaints.filter {
                (it.title ?: "").lowercase().contains(q) ||
                (it.description ?: "").lowercase().contains(q) ||
                (it.status ?: "").lowercase().contains(q)
            },
            waivers = waivers.filter {
                (it.residentName ?: "").lowercase().contains(q) ||
                (it.flatNo ?: "").lowercase().contains(q) ||
                (it.wing ?: "").lowercase().contains(q) ||
                (it.reason ?: "").lowercase().contains(q)
            },
            flatCollection = flatCollection.filter {
                (it.residentName ?: "").lowercase().contains(q) ||
                (it.flatNo ?: "").lowercase().contains(q) ||
                (it.wing ?: "").lowercase().contains(q) ||
                (it.status ?: "").lowercase().contains(q)
            },
            monthlyReport = monthlyReport.filter {
                (it.residentName ?: "").lowercase().contains(q) ||
                (it.flatNo ?: "").lowercase().contains(q) ||
                (it.wing ?: "").lowercase().contains(q) ||
                (it.calculatedStatus ?: it.billStatus ?: "").lowercase().contains(q)
            }
        )
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

    private suspend fun safeMonthlyReport(call: suspend () -> Response<com.example.application.data.remote.dto.MonthlyMaintenanceReportResponse>): NetworkResult<MonthlyReportBundle> {
        return try {
            val response = call()
            val body = response.body()
            if (response.isSuccessful && body?.success != false) NetworkResult.Success(MonthlyReportBundle(body?.data.orEmpty(), body?.summary))
            else NetworkResult.Error(mapHttpError(response.code(), body?.message ?: parseErrorMessage(response.errorBody()?.string())))
        } catch (error: Exception) { NetworkResult.Error(mapException(error)) }
    }

    private suspend fun <T> safeWrapped(call: suspend () -> Response<ApiResponse<T>>): NetworkResult<T> {
        return try {
            val response = call()
            val body = response.body()
            val data = body?.data
            if (response.isSuccessful && body?.success != false && data != null) NetworkResult.Success(data)
            else NetworkResult.Error(mapHttpError(response.code(), parseErrorMessage(response.errorBody()?.string()) ?: body?.message))
        } catch (error: Exception) { NetworkResult.Error(mapException(error)) }
    }

    private suspend fun <T> actionCall(call: suspend () -> Response<ApiResponse<T>>): NetworkResult<String> {
        return try {
            val response = call()
            val body = response.body()
            if (response.isSuccessful && body?.success != false) {
                clear()
                NetworkResult.Success(body?.message ?: "Saved successfully")
            } else {
                NetworkResult.Error(mapHttpError(response.code(), body?.message ?: parseErrorMessage(response.errorBody()?.string())))
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
        return try { com.google.gson.Gson().fromJson(errorBody, ErrorResponse::class.java)?.message } catch (_: Exception) { null }
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
    val warnings: List<String>,
    val financial: FinancialReportDto?,
    val bankLedger: AccountLedgerDto?,
    val cashLedger: AccountLedgerDto?,
    val flatCollection: List<FlatPaymentReportDto>,
    val waivers: List<MaintenanceWaiverDto>,
    val monthlyReport: List<MonthlyMaintenanceRowDto>,
    val monthlySummary: MonthlyCollectionSummaryDto?,
    val monthlyDashboard: MonthlyDashboardSummaryDto?,
    val history12Month: List<CollectionHistoryDto>,
    val paymentModes: PaymentModeReportDto?
)

data class MonthlyReportBundle(val rows: List<MonthlyMaintenanceRowDto>, val summary: MonthlyCollectionSummaryDto?)

data class ResidentReportsData(
    val summary: ReportSummaryDto?,
    val myMaintenance: List<ResidentMaintenanceReportDto>,
    val societySummary: SocietyReportSummaryDto?,
    val expenses: List<ResidentExpenseReportDto>,
    val membersMaintenance: List<MembersMaintenanceReportDto>,
    val allMaintenance: List<ResidentMaintenanceReportDto>,
    val complaints: List<ComplaintDto>,
    val warnings: List<String>,
    val financial: FinancialReportDto?,
    val bankLedger: AccountLedgerDto? = null,
    val cashLedger: AccountLedgerDto? = null,
    val flatCollection: List<FlatPaymentReportDto> = emptyList(),
    val monthlyReport: List<MonthlyMaintenanceRowDto> = emptyList(),
    val accountReport: ResidentAccountReportDto?,
    val transparencyReport: ResidentTransparencyReportDto?
)

private fun ReportFilterState.cacheKey(): String = "$financialYear|$month|$year|$status|$wing|$flatNo|$search"
