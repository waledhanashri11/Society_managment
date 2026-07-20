package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.dto.CreateNocRequest
import com.example.application.data.remote.dto.NocRequestDto
import com.example.application.data.repository.NocRepository
import com.example.application.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class NocUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val items: List<NocRequestDto> = emptyList(),
    val filter: String = "All",
    val error: String? = null,
    val message: String? = null,
    val submitting: Boolean = false,
    val certificateUri: String? = null
)

@HiltViewModel
class ResidentNocViewModel @Inject constructor(
    private val repository: NocRepository
) : ViewModel() {
    private val _state = MutableStateFlow(NocUiState())
    val state: StateFlow<NocUiState> = _state.asStateFlow()

    init { load() }

    fun load(refresh: Boolean = false) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.items.isEmpty(), isRefreshing = refresh, error = null, message = null) }
            when (val result = repository.getMyNocs(refresh)) {
                is NetworkResult.Success -> _state.update { it.copy(isLoading = false, isRefreshing = false, items = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, isRefreshing = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun createNoc(nocType: String, purpose: String, remarks: String, documentData: List<String>) {
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null, message = null) }
            val request = CreateNocRequest(
                nocType = nocType,
                purpose = purpose,
                remarks = remarks.takeIf { it.isNotBlank() },
                documents = documentData
            )
            when (val result = repository.createNoc(request)) {
                is NetworkResult.Success -> {
                    _state.update { it.copy(submitting = false, message = result.data) }
                    load(refresh = true)
                }
                is NetworkResult.Error -> _state.update { it.copy(submitting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun cancel(id: String) {
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null, message = null) }
            when (val result = repository.cancelNoc(id)) {
                is NetworkResult.Success -> {
                    _state.update { it.copy(submitting = false, message = result.data) }
                    load(refresh = true)
                }
                is NetworkResult.Error -> _state.update { it.copy(submitting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun downloadCertificate(id: String, requestNumber: String?) {
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null, message = null) }
            when (val result = repository.downloadCertificate(id, requestNumber)) {
                is NetworkResult.Success -> _state.update { it.copy(submitting = false, certificateUri = result.data, message = "Certificate downloaded.") }
                is NetworkResult.Error -> _state.update { it.copy(submitting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
}

@HiltViewModel
class AdminNocViewModel @Inject constructor(
    private val repository: NocRepository
) : ViewModel() {
    private val _state = MutableStateFlow(NocUiState())
    val state: StateFlow<NocUiState> = _state.asStateFlow()

    init { load() }

    fun setFilter(value: String) {
        _state.update { it.copy(filter = value) }
        load(refresh = true, status = value)
    }

    fun load(refresh: Boolean = false, status: String = _state.value.filter) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.items.isEmpty(), isRefreshing = refresh, error = null, message = null) }
            when (val result = repository.getAllNocs(status.takeIf { it != "All" }, refresh)) {
                is NetworkResult.Success -> _state.update { it.copy(isLoading = false, isRefreshing = false, items = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, isRefreshing = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun review(id: String, status: String, comments: String?) {
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null, message = null) }
            when (val result = repository.reviewNoc(id, status, comments)) {
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
