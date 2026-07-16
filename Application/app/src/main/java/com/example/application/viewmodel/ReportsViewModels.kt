package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.dto.ReportFilterState
import com.example.application.data.repository.AdminReportsData
import com.example.application.data.repository.ReportRepository
import com.example.application.data.repository.ResidentReportsData
import com.example.application.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AdminReportsUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val filter: ReportFilterState = ReportFilterState(),
    val data: AdminReportsData? = null,
    val error: String? = null,
    val exportMessage: String? = null
)

data class ResidentReportsUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val filter: ReportFilterState = ReportFilterState(),
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

    fun updateMonth(value: String) = updateFilter(_state.value.filter.copy(month = value.filter(Char::isDigit).take(2)))
    fun updateYear(value: String) = updateFilter(_state.value.filter.copy(year = value.filter(Char::isDigit).take(4)))
    fun updateStatus(value: String) = updateFilter(_state.value.filter.copy(status = value))
    fun resetFilters() = updateFilter(ReportFilterState(month = "", year = "", status = ""))

    private fun updateFilter(filter: ReportFilterState) {
        _state.update { it.copy(filter = filter, exportMessage = null) }
        load(refresh = true)
    }

    fun load(refresh: Boolean = false) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.data == null, isRefreshing = refresh && it.data != null, error = null) }
            when (val result = repository.getAdminReports(_state.value.filter, refresh)) {
                is NetworkResult.Success -> _state.update {
                    it.copy(isLoading = false, isRefreshing = false, data = result.data, error = null)
                }
                is NetworkResult.Error -> _state.update {
                    it.copy(isLoading = false, isRefreshing = false, error = repository.messageFor(result.error))
                }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun noteCsvExport() {
        _state.update { it.copy(exportMessage = "CSV export is available from the website. Android export needs a backend download endpoint or Storage Access Framework flow.") }
    }
}

@HiltViewModel
class ResidentReportsViewModel @Inject constructor(
    private val repository: ReportRepository
) : ViewModel() {
    private val _state = MutableStateFlow(ResidentReportsUiState())
    val state: StateFlow<ResidentReportsUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun updateMonth(value: String) = updateFilter(_state.value.filter.copy(month = value.filter(Char::isDigit).take(2)))
    fun updateYear(value: String) = updateFilter(_state.value.filter.copy(year = value.filter(Char::isDigit).take(4)))
    fun updateStatus(value: String) = updateFilter(_state.value.filter.copy(status = value))
    fun resetFilters() = updateFilter(ReportFilterState(month = "", year = "", status = ""))

    private fun updateFilter(filter: ReportFilterState) {
        _state.update { it.copy(filter = filter, exportMessage = null) }
        load(refresh = true)
    }

    fun load(refresh: Boolean = false) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.data == null, isRefreshing = refresh && it.data != null, error = null) }
            when (val result = repository.getResidentReports(_state.value.filter, refresh)) {
                is NetworkResult.Success -> _state.update {
                    it.copy(isLoading = false, isRefreshing = false, data = result.data, error = null)
                }
                is NetworkResult.Error -> _state.update {
                    it.copy(isLoading = false, isRefreshing = false, error = repository.messageFor(result.error))
                }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun noteCsvExport() {
        _state.update { it.copy(exportMessage = "No backend PDF/CSV export route is confirmed. Reports shown here use real backend JSON data only.") }
    }
}
