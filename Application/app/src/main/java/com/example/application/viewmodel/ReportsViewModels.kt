package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.dto.ReportFilterState
import com.example.application.data.repository.AdminReportsData
import com.example.application.data.repository.ReportRepository
import com.example.application.data.repository.ResidentReportsData
import com.example.application.data.remote.dto.FinancialReportDto
import com.example.application.data.remote.dto.MonthlyReceiptDto
import com.example.application.data.remote.dto.ResidentLedgerResponse
import com.example.application.util.AppError
import com.example.application.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Returns the current calendar year as a string, e.g. "2026". */
private fun currentCalendarYear(): String = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR).toString()

data class AdminReportsUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val filter: ReportFilterState = ReportFilterState(year = currentCalendarYear()),
    val data: AdminReportsData? = null,
    val error: String? = null,
    val exportMessage: String? = null,
    val monthly: FinancialReportDto? = null,
    val monthlyLoading: Boolean = false,
    val lastLoadedAt: Long? = null,
    val monthlyActionLoading: Boolean = false,
    val residentLedger: ResidentLedgerResponse? = null,
    val monthlyReceipt: MonthlyReceiptDto? = null,
    val actionMessage: String? = null,
    val balanceSaving: Boolean = false
)

data class ResidentReportsUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val filter: ReportFilterState = ReportFilterState(year = currentCalendarYear()),
    val data: ResidentReportsData? = null,
    val error: String? = null,
    val exportMessage: String? = null
)

@HiltViewModel
class AdminReportsViewModel @Inject constructor(
    private val repository: ReportRepository
) : ViewModel() {
    private val _state = MutableStateFlow(AdminReportsUiState())
    val state: StateFlow<AdminReportsUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun updateFinancialYear(value: String) = updateFilter(_state.value.filter.copy(financialYear = value))
    fun updateMonth(value: String) = updateFilter(_state.value.filter.copy(month = value))
    fun updateYear(value: String) = updateFilter(_state.value.filter.copy(year = value))
    fun updateWing(value: String) = updateFilter(_state.value.filter.copy(wing = value))
    fun updateFloor(value: String) = updateFilter(_state.value.filter.copy(floor = value))
    fun updateFlatNo(value: String) = updateFilter(_state.value.filter.copy(flatNo = value))
    fun updateResident(value: String) = updateFilter(_state.value.filter.copy(resident = value))
    fun updateStatus(value: String) = updateFilter(_state.value.filter.copy(status = value))
    fun updateSearch(value: String) = updateFilter(_state.value.filter.copy(search = value))
    fun resetFilters() {
        val fy = _state.value.filter.financialYear
        updateFilter(ReportFilterState(financialYear = fy, year = currentCalendarYear(), month = "All"))
    }

    private var filterDebounceJob: Job? = null
    private var loadJob: Job? = null
    private val CACHE_TTL_MS = 60_000L // 60 seconds — skip refresh if data is fresh

    private fun updateFilter(filter: ReportFilterState) {
        _state.update { it.copy(filter = filter, exportMessage = null) }
        filterDebounceJob?.cancel()
        filterDebounceJob = viewModelScope.launch {
            delay(500) // wait 500ms before firing — avoids a network storm on rapid filter changes
            loadJob?.cancel()
            loadJob = null
            load(refresh = true)
        }
    }

    fun load(refresh: Boolean = false) {
        val now = System.currentTimeMillis()
        val isFresh = _state.value.data != null &&
                _state.value.lastLoadedAt != null &&
                (now - _state.value.lastLoadedAt!!) < CACHE_TTL_MS
        if (!refresh && isFresh) return // skip if data is less than 60s old
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _state.update { it.copy(isLoading = it.data == null, isRefreshing = refresh && it.data != null, error = null) }
            when (val result = repository.getAdminReports(_state.value.filter, refresh)) {
                is NetworkResult.Success -> _state.update {
                    it.copy(isLoading = false, isRefreshing = false, data = result.data, error = null, lastLoadedAt = System.currentTimeMillis())
                }
                is NetworkResult.Error -> _state.update {
                    val errMessage = repository.messageFor(result.error)
                    val isTimeout = result.error is AppError.Timeout ||
                            errMessage.contains("time out", ignoreCase = true) ||
                            errMessage.contains("timed out", ignoreCase = true)
                    val safeError = if (isTimeout || (it.data != null && refresh)) null else errMessage
                    it.copy(isLoading = false, isRefreshing = false, error = safeError)
                }
                NetworkResult.Loading -> Unit
            }
            loadJob = null
        }
    }

    fun noteCsvExport() {
        _state.update { it.copy(exportMessage = "CSV export is available from the website. Android export needs a backend download endpoint or Storage Access Framework flow.") }
    }

    fun loadMonthly(year: Int, month: Int) {
        viewModelScope.launch {
            _state.update { it.copy(monthlyLoading = true, error = null) }
            when (val result = repository.getAdminMonthly(year, month)) {
                is NetworkResult.Success -> _state.update { it.copy(monthlyLoading = false, monthly = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(monthlyLoading = false, error = repository.messageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun clearMonthly() = _state.update { it.copy(monthly = null) }

    fun prepareBalanceEdit() {
        _state.update { it.copy(error = null, actionMessage = null) }
    }

    fun saveOpeningBalance(financialYear: String, bank: String, cash: String) = viewModelScope.launch {
        val bankValue = bank.toDoubleOrNull()
        val cashValue = cash.toDoubleOrNull()
        if (bankValue == null || cashValue == null || bankValue < 0 || cashValue < 0) {
            _state.update { it.copy(error = "Enter valid non-negative bank and cash balances.") }
            return@launch
        }
        _state.update { it.copy(balanceSaving = true, error = null, actionMessage = null) }
        when (val result = repository.saveOpeningBalance(financialYear, bank, cash)) {
            is NetworkResult.Success -> {
                _state.update { it.copy(balanceSaving = false, actionMessage = result.data) }
                load(refresh = true)
            }
            is NetworkResult.Error -> _state.update { it.copy(balanceSaving = false, error = repository.messageFor(result.error)) }
            NetworkResult.Loading -> Unit
        }
    }

    fun approvePayment(paymentId: String) = monthlyAction {
        repository.approveMonthlyPayment(paymentId)
    }

    fun rejectPayment(paymentId: String, reason: String) = monthlyAction {
        repository.rejectMonthlyPayment(paymentId, reason.ifBlank { "Payment verification rejected by admin" })
    }

    fun applyWriteOff(billId: String, type: String, amount: String, reason: String, remarks: String?) {
        val parsed = amount.toDoubleOrNull()
        if (parsed == null || parsed <= 0.0 || reason.isBlank()) {
            _state.update { it.copy(error = "Enter a positive amount and a reason for the write-off.") }
            return
        }
        monthlyAction { repository.applyMonthlyWriteOff(billId, type, parsed, reason.trim(), remarks) }
    }

    fun loadResidentLedger(residentId: String) = viewModelScope.launch {
        _state.update { it.copy(monthlyActionLoading = true, error = null, residentLedger = null) }
        when (val result = repository.getResidentLedger(residentId, _state.value.filter.month.takeIf { it.isNotBlank() }, _state.value.filter.year.takeIf { it.isNotBlank() })) {
            is NetworkResult.Success -> _state.update { it.copy(monthlyActionLoading = false, residentLedger = result.data) }
            is NetworkResult.Error -> _state.update { it.copy(monthlyActionLoading = false, error = repository.messageFor(result.error)) }
            NetworkResult.Loading -> Unit
        }
    }

    fun loadMonthlyReceipt(paymentId: String) = viewModelScope.launch {
        _state.update { it.copy(monthlyActionLoading = true, error = null, monthlyReceipt = null) }
        when (val result = repository.getMonthlyReceipt(paymentId)) {
            is NetworkResult.Success -> _state.update { it.copy(monthlyActionLoading = false, monthlyReceipt = result.data) }
            is NetworkResult.Error -> _state.update { it.copy(monthlyActionLoading = false, error = repository.messageFor(result.error)) }
            NetworkResult.Loading -> Unit
        }
    }

    fun clearMonthlyDetails() = _state.update { it.copy(residentLedger = null, monthlyReceipt = null) }

    private fun monthlyAction(call: suspend () -> NetworkResult<String>) = viewModelScope.launch {
        _state.update { it.copy(monthlyActionLoading = true, error = null, actionMessage = null) }
        when (val result = call()) {
            is NetworkResult.Success -> {
                _state.update { it.copy(monthlyActionLoading = false, actionMessage = result.data) }
                load(refresh = true)
            }
            is NetworkResult.Error -> _state.update { it.copy(monthlyActionLoading = false, error = repository.messageFor(result.error)) }
            NetworkResult.Loading -> Unit
        }
    }
}

@HiltViewModel
class ResidentReportsViewModel @Inject constructor(
    private val repository: ReportRepository
) : ViewModel() {
    private var loadJob: Job? = null
    private var filterDebounceJob: Job? = null
    private val _state = MutableStateFlow(ResidentReportsUiState())
    val state: StateFlow<ResidentReportsUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun updateFinancialYear(value: String) = updateFilter(_state.value.filter.copy(financialYear = value))
    fun updateMonth(value: String) = updateFilter(_state.value.filter.copy(month = value))
    fun updateYear(value: String) = updateFilter(_state.value.filter.copy(year = value))
    fun updateStatus(value: String) = updateFilter(_state.value.filter.copy(status = value))
    fun updateSearch(value: String) = updateFilter(_state.value.filter.copy(search = value))
    fun resetFilters() {
        val fy = _state.value.filter.financialYear
        updateFilter(ReportFilterState(financialYear = fy, year = currentCalendarYear(), month = "All"))
    }

    private fun updateFilter(filter: ReportFilterState) {
        _state.update { it.copy(filter = filter, exportMessage = null) }
        filterDebounceJob?.cancel()
        filterDebounceJob = viewModelScope.launch {
            delay(500)
            loadJob?.cancel()
            loadJob = null
            load(refresh = true)
        }
    }

    fun load(refresh: Boolean = false) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _state.update { it.copy(isLoading = it.data == null, isRefreshing = refresh && it.data != null, error = null) }
            when (val result = repository.getResidentReports(_state.value.filter, refresh)) {
                is NetworkResult.Success -> _state.update {
                    it.copy(isLoading = false, isRefreshing = false, data = result.data, error = null)
                }
                is NetworkResult.Error -> _state.update {
                    val errMessage = repository.messageFor(result.error)
                    val isTimeout = result.error is AppError.Timeout ||
                            errMessage.contains("time out", ignoreCase = true) ||
                            errMessage.contains("timed out", ignoreCase = true)
                    val safeError = if (isTimeout || (it.data != null && refresh)) null else errMessage
                    it.copy(isLoading = false, isRefreshing = false, error = safeError)
                }
                NetworkResult.Loading -> Unit
            }
            loadJob = null
        }
    }

    fun noteCsvExport() {
        _state.update { it.copy(exportMessage = "No backend PDF/CSV export route is confirmed. Reports shown here use real backend JSON data only.") }
    }
}
