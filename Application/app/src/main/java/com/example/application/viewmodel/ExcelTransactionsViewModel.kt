package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.dto.ExcelImportConfirmDto
import com.example.application.data.remote.dto.ExcelImportBatchDto
import com.example.application.data.remote.dto.ExcelImportPreviewDto
import com.example.application.data.remote.dto.ExcelTransactionFilters
import com.example.application.data.repository.ExcelTransactionsRepository
import com.example.application.util.ExcelFileManager
import com.example.application.util.ExcelExportFilterPolicy
import com.example.application.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import okhttp3.MultipartBody
import okhttp3.ResponseBody

data class ExcelTransactionsUiState(
    val filters: ExcelTransactionFilters = ExcelTransactionFilters(),
    val selectedFile: ExcelFileManager.SelectedFile? = null,
    val preview: ExcelImportPreviewDto? = null,
    val previewFilter: String = "All",
    val confirmation: ExcelImportConfirmDto? = null,
    val history: List<ExcelImportBatchDto> = emptyList(),
    val busy: Boolean = false,
    val error: String? = null,
    val message: String? = null,
    val confirmDialog: Boolean = false
)

sealed interface ExcelTransactionEvent {
    data class Download(val body: ResponseBody, val fileName: String) : ExcelTransactionEvent
}

@HiltViewModel
class ExcelTransactionsViewModel @Inject constructor(
    private val repository: ExcelTransactionsRepository
) : ViewModel() {
    private val _state = MutableStateFlow(ExcelTransactionsUiState())
    val state: StateFlow<ExcelTransactionsUiState> = _state.asStateFlow()
    private val _event = MutableStateFlow<ExcelTransactionEvent?>(null)
    val event: StateFlow<ExcelTransactionEvent?> = _event.asStateFlow()

    init { refreshHistory() }

    fun setFile(file: ExcelFileManager.SelectedFile?) = _state.update { it.copy(selectedFile = file, preview = null, confirmation = null, error = null) }
    fun setFilters(filters: ExcelTransactionFilters) = _state.update { it.copy(filters = filters) }
    fun clearFilters() = _state.update { it.copy(filters = ExcelTransactionFilters()) }
    fun setPreviewFilter(value: String) = _state.update { it.copy(previewFilter = value) }
    fun showConfirm(value: Boolean) = _state.update { it.copy(confirmDialog = value) }
    fun clearEvent() { _event.value = null }
    fun clearNotice() = _state.update { it.copy(error = null, message = null) }

    fun downloadTemplate() = binary("SocietyHub_Transaction_Template.xlsx") { repository.template() }

    fun export() {
        ExcelExportFilterPolicy.validate(_state.value.filters)?.let { error ->
            _state.update { it.copy(error = error, message = null) }
            return
        }
        binary("SocietyHub_Transactions_${java.time.LocalDate.now()}.xlsx") {
            repository.export(_state.value.filters)
        }
    }

    fun downloadErrors() {
        val batchId = _state.value.preview?.batchId?.takeIf(String::isNotBlank) ?: return
        binary("SocietyHub_Transaction_Import_Errors_${java.time.LocalDate.now()}.xlsx") { repository.errorReport(batchId) }
    }

    fun preview(part: MultipartBody.Part) = viewModelScope.launch {
        if (_state.value.busy) return@launch
        _state.update { it.copy(busy = true, error = null, message = null) }
        when (val result = repository.preview(part)) {
            is NetworkResult.Success -> _state.update { it.copy(busy = false, preview = result.data, confirmation = null, message = "Workbook validation completed.") }
            is NetworkResult.Error -> _state.update { it.copy(busy = false, error = message(result)) }
            NetworkResult.Loading -> Unit
        }
    }

    fun confirm() = viewModelScope.launch {
        val batchId = _state.value.preview?.batchId?.takeIf(String::isNotBlank) ?: return@launch
        if (_state.value.busy || _state.value.confirmation != null) return@launch
        _state.update { it.copy(busy = true, confirmDialog = false, error = null) }
        when (val result = repository.confirm(batchId)) {
            is NetworkResult.Success -> {
                _state.update { it.copy(busy = false, confirmation = result.data, message = result.data.message ?: "Excel transactions imported successfully.") }
                refreshHistory()
            }
            is NetworkResult.Error -> _state.update { it.copy(busy = false, error = message(result)) }
            NetworkResult.Loading -> Unit
        }
    }

    fun refreshHistory() = viewModelScope.launch {
        when (val result = repository.history()) {
            is NetworkResult.Success -> _state.update { it.copy(history = result.data) }
            is NetworkResult.Error -> Unit
            NetworkResult.Loading -> Unit
        }
    }

    private fun binary(fileName: String, block: suspend () -> NetworkResult<ResponseBody>) = viewModelScope.launch {
        if (_state.value.busy) return@launch
        _state.update { it.copy(busy = true, error = null, message = null) }
        when (val result = block()) {
            is NetworkResult.Success -> { _state.update { it.copy(busy = false) }; _event.value = ExcelTransactionEvent.Download(result.data, fileName) }
            is NetworkResult.Error -> _state.update { it.copy(busy = false, error = message(result)) }
            NetworkResult.Loading -> Unit
        }
    }

    private fun message(result: NetworkResult.Error): String = when (val error = result.error) {
        is com.example.application.util.AppError.Server -> error.message ?: "Server request failed."
        is com.example.application.util.AppError.Forbidden -> error.message ?: "Administrator access is required."
        is com.example.application.util.AppError.Validation -> error.message
        is com.example.application.util.AppError.Unknown -> error.message ?: "Unexpected error."
        com.example.application.util.AppError.NoInternet -> "No internet connection."
        com.example.application.util.AppError.Timeout -> "The request timed out."
        com.example.application.util.AppError.Unauthorized -> "Your session has expired."
    }
}
