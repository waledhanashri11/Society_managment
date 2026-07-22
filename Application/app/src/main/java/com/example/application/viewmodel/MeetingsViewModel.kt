package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.dto.*
import com.example.application.data.repository.MeetingsRepository
import com.example.application.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class MeetingsUiState(
    val loading: Boolean = false, val refreshing: Boolean = false, val submitting: Boolean = false,
    val meetings: List<MeetingDto> = emptyList(), val selected: MeetingDetailsDto? = null,
    val attendance: List<MeetingAttendanceDto> = emptyList(), val query: String = "", val filter: String = "All",
    val error: String? = null, val message: String? = null
)

@HiltViewModel
class MeetingsViewModel @Inject constructor(private val repository: MeetingsRepository) : ViewModel() {
    private val _state = MutableStateFlow(MeetingsUiState())
    val state: StateFlow<MeetingsUiState> = _state.asStateFlow()
    init { load() }
    fun load(refresh: Boolean = false) = viewModelScope.launch {
        _state.update { it.copy(loading = it.meetings.isEmpty(), refreshing = refresh, error = null) }
        when (val result = repository.getMeetings(refresh)) {
            is NetworkResult.Success -> _state.update { it.copy(loading = false, refreshing = false, meetings = result.data) }
            is NetworkResult.Error -> _state.update { it.copy(loading = false, refreshing = false, error = repository.userMessageFor(result.error)) }
            NetworkResult.Loading -> Unit
        }
    }
    fun setQuery(value: String) = _state.update { it.copy(query = value) }
    fun setFilter(value: String) = _state.update { it.copy(filter = value) }
    fun open(id: String) = viewModelScope.launch {
        _state.update { it.copy(submitting = false, error = null) }
        when (val result = repository.getMeeting(id, true)) {
            is NetworkResult.Success -> _state.update { it.copy(selected = result.data) }
            is NetworkResult.Error -> _state.update { it.copy(error = repository.userMessageFor(result.error)) }
            NetworkResult.Loading -> Unit
        }
    }
    fun loadAttendance(id: String) = viewModelScope.launch {
        when (val result = repository.attendance(id)) {
            is NetworkResult.Success -> _state.update { it.copy(attendance = result.data) }
            is NetworkResult.Error -> _state.update { it.copy(error = repository.userMessageFor(result.error)) }
            NetworkResult.Loading -> Unit
        }
    }
    fun markSelfPresent(id: String) = action { repository.saveAttendance(id, MeetingAttendanceSaveRequest(status = "Present")) }
    fun saveAttendance(id: String, rows: List<MeetingAttendanceDto>) = action {
        repository.saveAttendance(id, MeetingAttendanceSaveRequest(rows.mapNotNull { row -> row.residentId?.let { MeetingAttendanceSaveItem(it, row.status ?: "Absent") } }))
    }
    fun saveAgenda(id: String, items: List<String>) = action { repository.agenda(id, MeetingAgendaSaveRequest(items.mapIndexed { index, text -> MeetingAgendaSaveItem(text, index) })) }
    fun saveReport(id: String, summary: String, discussion: String, decisions: String, remarks: String) = action { repository.report(id, MeetingReportSaveRequest(summary, discussion, decisions, remarks)) }
    fun createVote(id: String, question: String) = action { repository.vote(MeetingVoteSaveRequest(id, question)) }
    fun castVote(id: String, choice: String) = action { repository.castVote(id, choice) }
    fun createMeeting(request: MeetingSaveRequest) = action { repository.create(request) }
    fun updateMeeting(id: String, request: MeetingSaveRequest) = action { repository.update(id, request) }
    fun deleteMeeting(id: String) = action { repository.delete(id) }
    private fun action(block: suspend () -> NetworkResult<String>) = viewModelScope.launch {
        _state.update { it.copy(submitting = true, error = null, message = null) }
        when (val result = block()) {
            is NetworkResult.Success -> { _state.update { it.copy(submitting = false, message = result.data) }; load(true) }
            is NetworkResult.Error -> _state.update { it.copy(submitting = false, error = repository.userMessageFor(result.error)) }
            NetworkResult.Loading -> Unit
        }
    }
}
