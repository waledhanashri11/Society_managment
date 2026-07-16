package com.example.application.data.repository

import com.example.application.data.remote.api.MaintenanceApiService
import com.example.application.data.remote.dto.ApiResponse
import com.example.application.data.remote.dto.CategorySaveRequest
import com.example.application.data.remote.dto.CreateDisputeRequest
import com.example.application.data.remote.dto.ErrorResponse
import com.example.application.data.remote.dto.ExpenseCreateRequest
import com.example.application.data.remote.dto.GenerateBillsRequest
import com.example.application.data.remote.dto.LateFeeRuleRequest
import com.example.application.data.remote.dto.MaintenanceCreateRequest
import com.example.application.data.remote.dto.MaintenanceSettingsRequest
import com.example.application.data.remote.dto.MaintenanceUpdateRequest
import com.example.application.data.remote.dto.ManualPayRequest
import com.example.application.data.remote.dto.MarkPaidRequest
import com.example.application.data.remote.dto.SubmitPaymentRequest
import com.example.application.data.remote.dto.UpdatePaymentRequest
import com.example.application.util.AppError
import com.example.application.util.NetworkResult
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import retrofit2.Response

@Singleton
class MaintenanceRepository @Inject constructor(
    private val api: MaintenanceApiService,
    private val gson: Gson
) {
    private var adminCache: AdminMaintenanceData? = null
    private var residentCache: ResidentMaintenanceData? = null

    fun getAdminSnapshot(): AdminMaintenanceData {
        return adminCache ?: AdminMaintenanceData(
            dashboard = null,
            bills = emptyList(),
            payments = emptyList(),
            categories = emptyList(),
            expenses = emptyList(),
            settings = null,
            lateFeeRule = null,
            disputes = emptyList(),
            warnings = listOf("Refreshing latest maintenance data")
        )
    }

    fun getResidentSnapshot(): ResidentMaintenanceData {
        return residentCache ?: ResidentMaintenanceData(
            bills = emptyList(),
            paymentSettings = null
        )
    }

    suspend fun getAdminData(refresh: Boolean = false): NetworkResult<AdminMaintenanceData> = coroutineScope {
        adminCache?.takeIf { !refresh }?.let { return@coroutineScope NetworkResult.Success(it) }

        val dashboardCall = async { safeApiCall { api.getDashboard() } }
        val billsCall = async { safeApiCall { api.getBills() } }
        val paymentsCall = async { safeApiCall { api.getPayments() } }
        val categoriesCall = async { safeApiCall { api.getCategories() } }
        val expensesCall = async { safeApiCall { api.getExpenses() } }
        val settingsCall = async { safeApiCall { api.getSettings() } }
        val lateFeeCall = async { safeApiCall { api.getLateFeeRule() } }
        val disputesCall = async { safeApiCall { api.getDisputes() } }

        val dashboard = dashboardCall.await()
        val bills = billsCall.await()
        val payments = paymentsCall.await()
        val categories = categoriesCall.await()
        val expenses = expensesCall.await()
        val settings = settingsCall.await()
        val lateFee = lateFeeCall.await()
        val disputes = disputesCall.await()

        if (dashboard is NetworkResult.Error && bills is NetworkResult.Error) return@coroutineScope dashboard
        val data = AdminMaintenanceData(
            dashboard = (dashboard as? NetworkResult.Success)?.data,
            bills = (bills as? NetworkResult.Success)?.data.orEmpty(),
            payments = (payments as? NetworkResult.Success)?.data.orEmpty(),
            categories = (categories as? NetworkResult.Success)?.data.orEmpty(),
            expenses = (expenses as? NetworkResult.Success)?.data.orEmpty(),
            settings = (settings as? NetworkResult.Success)?.data,
            lateFeeRule = (lateFee as? NetworkResult.Success)?.data,
            disputes = (disputes as? NetworkResult.Success)?.data.orEmpty(),
            warnings = listOfNotNull(
                if (dashboard is NetworkResult.Error) userMessageFor(dashboard.error) else null,
                if (bills is NetworkResult.Error) userMessageFor(bills.error) else null,
                if (payments is NetworkResult.Error) "Payments unavailable" else null,
                if (expenses is NetworkResult.Error) "Expenses unavailable" else null,
                if (disputes is NetworkResult.Error) "Disputes unavailable" else null
            )
        )
        adminCache = data
        NetworkResult.Success(data)
    }

    suspend fun getResidentData(refresh: Boolean = false): NetworkResult<ResidentMaintenanceData> = coroutineScope {
        residentCache?.takeIf { !refresh }?.let { return@coroutineScope NetworkResult.Success(it) }
        val billsCall = async { safeApiCall { api.getMyMaintenance() } }
        val settingsCall = async { runCatching { api.getPaymentSettings() }.getOrNull()?.takeIf { it.isSuccessful }?.body() }
        val bills = billsCall.await()
        val paymentSettings = settingsCall.await()
        if (bills is NetworkResult.Error) return@coroutineScope bills
        val data = ResidentMaintenanceData(
            bills = (bills as? NetworkResult.Success)?.data.orEmpty(),
            paymentSettings = paymentSettings
        )
        residentCache = data
        NetworkResult.Success(data)
    }

    suspend fun generateBills(month: Int, year: Int) = messageCall { api.generateBills(GenerateBillsRequest(month, year)) }
    suspend fun createMaintenance(request: MaintenanceCreateRequest) = messageCall { api.createMaintenance(request) }
    suspend fun updateMaintenance(id: String, request: MaintenanceUpdateRequest) = messageCall { api.updateMaintenance(id, request) }
    suspend fun deleteMaintenance(id: String) = messageCall { api.deleteMaintenance(id) }
    suspend fun markPaid(id: String, request: MarkPaidRequest) = messageCall { api.markBillPaid(id, request) }
    suspend fun manualPay(id: String, request: ManualPayRequest) = messageCall { api.payBill(id, request) }
    suspend fun sendReminder(id: String) = messageCall { api.sendReminder(id) }
    suspend fun applyPenalty() = messageCall { api.applyPenalty() }
    suspend fun waiveLateFee(id: String) = messageCall { api.waiveLateFee(id) }
    suspend fun submitPayment(request: SubmitPaymentRequest) = messageCall { api.submitPayment(request) }
    suspend fun updatePayment(id: String, request: UpdatePaymentRequest) = messageCall { api.updatePayment(id, request) }
    suspend fun saveSettings(request: MaintenanceSettingsRequest) = messageCall { api.saveSettings(request) }
    suspend fun saveLateFeeRule(request: LateFeeRuleRequest) = messageCall { api.saveLateFeeRule(request) }
    suspend fun createCategory(request: CategorySaveRequest) = messageCall { api.createCategory(request) }
    suspend fun updateCategory(id: String, request: CategorySaveRequest) = messageCall { api.updateCategory(id, request) }
    suspend fun deleteCategory(id: String) = messageCall { api.deleteCategory(id) }
    suspend fun createExpense(request: ExpenseCreateRequest) = messageCall { api.createExpense(request) }
    suspend fun deleteExpense(id: String) = messageCall { api.deleteExpense(id) }
    suspend fun createDispute(request: CreateDisputeRequest) = messageCall { api.createDispute(request) }

    private suspend fun <T> messageCall(call: suspend () -> Response<ApiResponse<T>>): NetworkResult<String> {
        return try {
            val response = call()
            if (response.isSuccessful && response.body()?.success != false) {
                clearCaches()
                NetworkResult.Success(response.body()?.message ?: "Saved successfully")
            } else {
                NetworkResult.Error(mapHttpError(response.code(), parseErrorMessage(response.errorBody()?.string()) ?: response.body()?.message))
            }
        } catch (_: UnknownHostException) {
            NetworkResult.Error(AppError.NoInternet)
        } catch (_: SocketTimeoutException) {
            NetworkResult.Error(AppError.Timeout)
        } catch (_: IOException) {
            NetworkResult.Error(AppError.NoInternet)
        } catch (_: Exception) {
            NetworkResult.Error(AppError.Unknown("Request failed. Please try again."))
        }
    }

    private fun clearCaches() {
        adminCache = null
        residentCache = null
    }

    private suspend fun <T> safeApiCall(call: suspend () -> Response<ApiResponse<T>>): NetworkResult<T> {
        return try {
            val response = call()
            if (response.isSuccessful) {
                val body = response.body()
                if (body?.success == false) NetworkResult.Error(AppError.Validation(body.message ?: "Request failed."))
                else body?.data?.let { NetworkResult.Success(it) }
                    ?: NetworkResult.Error(AppError.Unknown("No data returned by server."))
            } else {
                NetworkResult.Error(mapHttpError(response.code(), parseErrorMessage(response.errorBody()?.string())))
            }
        } catch (_: UnknownHostException) {
            NetworkResult.Error(AppError.NoInternet)
        } catch (_: SocketTimeoutException) {
            NetworkResult.Error(AppError.Timeout)
        } catch (_: IOException) {
            NetworkResult.Error(AppError.NoInternet)
        } catch (_: JsonSyntaxException) {
            NetworkResult.Error(AppError.Unknown("Unable to read server response."))
        } catch (_: Exception) {
            NetworkResult.Error(AppError.Unknown("Request failed. Please try again."))
        }
    }

    fun userMessageFor(error: AppError): String = when (error) {
        AppError.NoInternet -> "No internet connection."
        AppError.Timeout -> "The request timed out."
        AppError.Unauthorized -> "Session expired. Please login again."
        is AppError.Forbidden -> error.message ?: "You do not have permission."
        is AppError.Validation -> error.message
        is AppError.Server -> error.message ?: "Server error."
        is AppError.Unknown -> error.message ?: "Something went wrong."
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
            400, 409, 422 -> AppError.Validation(safe ?: "Please check the details.")
            401 -> AppError.Unauthorized
            403 -> AppError.Forbidden(safe)
            404 -> AppError.Unknown(safe ?: "Record not found.")
            408 -> AppError.Timeout
            429 -> AppError.Server("Too many requests.")
            500 -> AppError.Server("Server error.")
            502, 503 -> AppError.Server("Railway server unavailable.")
            else -> AppError.Unknown("Request failed.")
        }
    }
}

data class AdminMaintenanceData(
    val dashboard: com.example.application.data.remote.dto.MaintenanceDashboardDto?,
    val bills: List<com.example.application.data.remote.dto.MaintenanceBillDto>,
    val payments: List<com.example.application.data.remote.dto.MaintenancePaymentDto>,
    val categories: List<com.example.application.data.remote.dto.MaintenanceCategoryDto>,
    val expenses: List<com.example.application.data.remote.dto.ExpenseDto>,
    val settings: com.example.application.data.remote.dto.MaintenanceSettingsDto?,
    val lateFeeRule: com.example.application.data.remote.dto.LateFeeRuleDto?,
    val disputes: List<com.example.application.data.remote.dto.MaintenanceDisputeDto>,
    val warnings: List<String>
)

data class ResidentMaintenanceData(
    val bills: List<com.example.application.data.remote.dto.MaintenanceBillDto>,
    val paymentSettings: com.example.application.data.remote.dto.PaymentSettingsDto?
)
