package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.dto.AdminNotificationsResponse
import com.example.application.data.remote.dto.ComplaintDto
import com.example.application.data.remote.dto.NoticeDto
import com.example.application.data.repository.CommunicationRepository
import com.example.application.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class CommunicationListState<T>(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val items: List<T> = emptyList(),
    val query: String = "",
    val filter: String = "All",
    val error: String? = null,
    val message: String? = null,
    val submitting: Boolean = false
)

data class NotificationState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val data: AdminNotificationsResponse? = null,
    val error: String? = null,
    val message: String? = null,
    val submitting: Boolean = false
)

@HiltViewModel
class AdminComplaintsViewModel @Inject constructor(private val repository: CommunicationRepository) : ViewModel() {
    private val _state = MutableStateFlow(CommunicationListState<ComplaintDto>())
    val state: StateFlow<CommunicationListState<ComplaintDto>> = _state.asStateFlow()
    init { load() }
    fun load(refresh: Boolean = false) = loadList(refresh) { repository.getAdminComplaints(refresh) }
    fun setQuery(value: String) = _state.update { it.copy(query = value) }
    fun setFilter(value: String) = _state.update { it.copy(filter = value) }
    fun updateComplaint(id: String, status: String, reply: String?) = action { repository.updateComplaint(id, status, reply) }
    fun deleteComplaint(id: String) = action { repository.deleteComplaint(id) }
    private fun loadList(refresh: Boolean, call: suspend () -> NetworkResult<List<ComplaintDto>>) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.items.isEmpty(), isRefreshing = refresh, error = null, message = null) }
            when (val result = call()) {
                is NetworkResult.Success -> _state.update { it.copy(isLoading = false, isRefreshing = false, items = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, isRefreshing = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
    private fun action(call: suspend () -> NetworkResult<String>) {
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null, message = null) }
            when (val result = call()) {
                is NetworkResult.Success -> { _state.update { it.copy(submitting = false, message = result.data) }; load(true) }
                is NetworkResult.Error -> _state.update { it.copy(submitting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
}

@HiltViewModel
class ResidentComplaintsViewModel @Inject constructor(private val repository: CommunicationRepository) : ViewModel() {
    private val _state = MutableStateFlow(CommunicationListState<ComplaintDto>())
    val state: StateFlow<CommunicationListState<ComplaintDto>> = _state.asStateFlow()
    init { load() }
    fun load(refresh: Boolean = false) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.items.isEmpty(), isRefreshing = refresh, error = null, message = null) }
            when (val result = repository.getResidentComplaints(refresh)) {
                is NetworkResult.Success -> _state.update { it.copy(isLoading = false, isRefreshing = false, items = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, isRefreshing = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
    fun setQuery(value: String) = _state.update { it.copy(query = value) }
    fun setFilter(value: String) = _state.update { it.copy(filter = value) }
    fun createComplaint(title: String, description: String, imageUrls: List<String> = emptyList()) {
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null, message = null) }
            when (val result = repository.createComplaint(title, description, imageUrls)) {
                is NetworkResult.Success -> { _state.update { it.copy(submitting = false, message = "Complaint submitted successfully") }; load(true) }
                is NetworkResult.Error -> _state.update { it.copy(submitting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
}

@HiltViewModel
class NoticesViewModel @Inject constructor(private val repository: CommunicationRepository) : ViewModel() {
    private val _state = MutableStateFlow(CommunicationListState<NoticeDto>())
    val state: StateFlow<CommunicationListState<NoticeDto>> = _state.asStateFlow()
    init { load() }
    fun load(refresh: Boolean = false) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.items.isEmpty(), isRefreshing = refresh, error = null, message = null) }
            when (val result = repository.getNotices(refresh)) {
                is NetworkResult.Success -> _state.update { it.copy(isLoading = false, isRefreshing = false, items = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, isRefreshing = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
    fun setQuery(value: String) = _state.update { it.copy(query = value) }
    fun createNotice(title: String, description: String) = action { repository.createNotice(title, description) }
    fun deleteNotice(id: String) = action { repository.deleteNotice(id) }
    private fun action(call: suspend () -> NetworkResult<String>) {
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null, message = null) }
            when (val result = call()) {
                is NetworkResult.Success -> { _state.update { it.copy(submitting = false, message = result.data) }; load(true) }
                is NetworkResult.Error -> _state.update { it.copy(submitting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
}

@HiltViewModel
class NotificationsViewModel @Inject constructor(private val repository: CommunicationRepository) : ViewModel() {
    private val _state = MutableStateFlow(NotificationState())
    val state: StateFlow<NotificationState> = _state.asStateFlow()
    init { load() }
    fun load(refresh: Boolean = false) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.data == null, isRefreshing = refresh, error = null, message = null) }
            when (val result = repository.getNotifications(refresh)) {
                is NetworkResult.Success -> _state.update { it.copy(isLoading = false, isRefreshing = false, data = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, isRefreshing = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
    fun markAllRead() {
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null) }
            when (val result = repository.markNotificationsRead()) {
                is NetworkResult.Success -> { _state.update { it.copy(submitting = false, message = result.data) }; load(true) }
                is NetworkResult.Error -> _state.update { it.copy(submitting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
}
