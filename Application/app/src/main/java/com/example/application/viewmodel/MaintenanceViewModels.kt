package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.dto.CategorySaveRequest
import com.example.application.data.remote.dto.CreateDisputeRequest
import com.example.application.data.remote.dto.ExpenseCreateRequest
import com.example.application.data.remote.dto.LateFeeRuleRequest
import com.example.application.data.remote.dto.MaintenanceCreateRequest
import com.example.application.data.remote.dto.MaintenanceSettingsRequest
import com.example.application.data.remote.dto.ManualPayRequest
import com.example.application.data.remote.dto.MarkPaidRequest
import com.example.application.data.remote.dto.SubmitPaymentRequest
import com.example.application.data.remote.dto.UpdatePaymentRequest
import com.example.application.data.repository.AdminMaintenanceData
import com.example.application.data.repository.MaintenanceRepository
import com.example.application.data.repository.ResidentMaintenanceData
import com.example.application.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.LocalDate
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AdminMaintenanceUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val data: AdminMaintenanceData? = null,
    val query: String = "",
    val filter: String = "All",
    val error: String? = null,
    val message: String? = null,
    val activeTab: String = "Overview",
    val submitting: Boolean = false
)

data class ResidentMaintenanceUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val data: ResidentMaintenanceData? = null,
    val query: String = "",
    val filter: String = "All",
    val error: String? = null,
    val message: String? = null,
    val submitting: Boolean = false
)

@HiltViewModel
class AdminMaintenanceViewModel @Inject constructor(
    private val repository: MaintenanceRepository
) : ViewModel() {
    private val _state = MutableStateFlow(AdminMaintenanceUiState())
    val state: StateFlow<AdminMaintenanceUiState> = _state.asStateFlow()

    init { loadInitial() }

    private fun loadInitial() {
        _state.update {
            it.copy(
                isLoading = false,
                isRefreshing = false,
                data = repository.getAdminSnapshot(),
                error = null,
                message = null
            )
        }
        load(refresh = true)
    }

    fun load(refresh: Boolean = false) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.data == null, isRefreshing = refresh, error = null, message = null) }
            when (val result = repository.getAdminData(refresh)) {
                is NetworkResult.Success -> _state.update { it.copy(isLoading = false, isRefreshing = false, data = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, isRefreshing = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun setTab(tab: String) = _state.update { it.copy(activeTab = tab) }
    fun setQuery(query: String) = _state.update { it.copy(query = query) }
    fun setFilter(filter: String) = _state.update { it.copy(filter = filter) }

    fun generateBills(month: Int, year: Int) = action { repository.generateBills(month, year) }
    fun createManualBill(title: String, month: Int, year: Int, dueDate: String, amount: String, residentId: String?, flatId: String?) =
        action { repository.createMaintenance(MaintenanceCreateRequest(title, month, year, dueDate, amount, residentId, flatId)) }
    fun deleteBill(id: String) = action { repository.deleteMaintenance(id) }
    fun cancelBill(id: String, reason: String) = action { repository.cancelBill(id, reason) }
    fun markPaid(id: String, amount: String, paymentDate: String) =
        action { repository.manualPay(id, ManualPayRequest(amount, paymentDate)) }
    fun sendReminder(id: String) = action { repository.sendReminder(id) }
    fun applyPenalty() = action { repository.applyPenalty() }
    fun applyPenaltyToBill(id: String, amount: String, reason: String?) = action { repository.applyPenaltyToBill(id, amount, reason) }
    fun waiveLateFee(id: String) = action { repository.waiveLateFee(id) }
    fun applyWaiver(id: String, amount: String, reason: String, type: String, reference: String?, date: String?, note: String?) =
        action { repository.applyWaiver(id, amount, reason, type, reference, date, note) }
    fun updatePayment(id: String, status: String, reason: String? = null) = action {
        val normalizedStatus = when (status.trim().uppercase()) {
            "APPROVED", "APPROVE", "PAID" -> "Paid"
            "REJECTED", "REJECT" -> "Rejected"
            else -> status
        }
        repository.updatePayment(
            id,
            UpdatePaymentRequest(
                paymentStatus = normalizedStatus,
                remarks = reason ?: if (normalizedStatus == "Paid") "Approved by admin" else "Rejected by admin",
                rejectionReason = reason
            )
        )
    }
    fun saveSettings(title: String, amount: String, dueDay: String, feeType: String, feeValue: String, graceDays: String) =
        action { repository.saveSettings(MaintenanceSettingsRequest(title, amount, dueDay, feeType, feeValue, graceDays)) }
    fun saveLateFeeRule(grace: String, type: String, amount: String, max: String) =
        action { repository.saveLateFeeRule(LateFeeRuleRequest(grace, type, amount, max)) }
    fun saveCategory(id: String?, name: String, amount: String, calculationType: String, active: Boolean) =
        action {
            val request = CategorySaveRequest(name, amount, calculationType, active)
            if (id == null) repository.createCategory(request) else repository.updateCategory(id, request)
        }
    fun deleteCategory(id: String) = action { repository.deleteCategory(id) }
    fun createExpense(category: String, vendor: String, amount: String, date: String, method: String, description: String?) =
        action { repository.createExpense(ExpenseCreateRequest(category, vendor, amount, date, description, method)) }
    fun deleteExpense(id: String) = action { repository.deleteExpense(id) }

    private fun action(block: suspend () -> NetworkResult<String>) {
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null, message = null) }
            when (val result = block()) {
                is NetworkResult.Success -> {
                    _state.update { it.copy(submitting = false, message = result.data) }
                    load(refresh = true)
                }
                is NetworkResult.Error -> _state.update { it.copy(submitting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
}

@HiltViewModel
class ResidentMaintenanceViewModel @Inject constructor(
    private val repository: MaintenanceRepository
) : ViewModel() {
    private val _state = MutableStateFlow(ResidentMaintenanceUiState())
    val state: StateFlow<ResidentMaintenanceUiState> = _state.asStateFlow()

    init { loadInitial() }

    private fun loadInitial() {
        _state.update {
            it.copy(
                isLoading = false,
                isRefreshing = false,
                data = repository.getResidentSnapshot(),
                error = null,
                message = null
            )
        }
        load(refresh = true)
    }

    fun load(refresh: Boolean = false) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.data == null, isRefreshing = refresh, error = null, message = null) }
            when (val result = repository.getResidentData(refresh)) {
                is NetworkResult.Success -> _state.update { it.copy(isLoading = false, isRefreshing = false, data = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, isRefreshing = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun setQuery(query: String) = _state.update { it.copy(query = query) }
    fun setFilter(filter: String) = _state.update { it.copy(filter = filter) }

    fun submitPayment(
        billId: String,
        method: String,
        transactionId: String,
        amount: String,
        screenshotUrl: String?,
        paymentDate: String?,
        note: String?
    ) = action {
        repository.submitPayment(
            SubmitPaymentRequest(
                billId = billId,
                paymentMethod = method,
                transactionId = transactionId,
                amount = amount,
                screenshotUrl = screenshotUrl?.ifBlank { null },
                paymentDate = paymentDate?.ifBlank { null },
                note = note?.ifBlank { null }
            )
        )
    }

    fun createDispute(billId: String, subject: String, description: String) =
        action { repository.createDispute(CreateDisputeRequest(billId, subject, description)) }

    private fun action(block: suspend () -> NetworkResult<String>) {
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null, message = null) }
            when (val result = block()) {
                is NetworkResult.Success -> {
                    _state.update { it.copy(submitting = false, message = result.data) }
                    load(refresh = true)
                }
                is NetworkResult.Error -> _state.update { it.copy(submitting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
}

fun defaultDueDate(): String = LocalDate.now().plusDays(10).toString()
