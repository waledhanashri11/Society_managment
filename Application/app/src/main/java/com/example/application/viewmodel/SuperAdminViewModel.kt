package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.dto.*
import com.example.application.data.repository.SuperAdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class SuperAdminViewModel @Inject constructor(private val repository: SuperAdminRepository) : ViewModel() {
    private val _state = MutableStateFlow(SuperAdminUiState())
    val state = _state.asStateFlow()

    fun load() = viewModelScope.launch {
        _state.update { it.copy(loading = true, error = null) }
        runCatching { repository.dashboard() to repository.societies() }
            .onSuccess { (summary, societies) -> _state.value = SuperAdminUiState(summary = summary, societies = societies) }
            .onFailure { _state.update { state -> state.copy(loading = false, error = it.message) } }
    }

    fun loadSociety(id: String) = viewModelScope.launch {
        _state.update { it.copy(loading = true, error = null) }
        runCatching { repository.society(id) }
            .onSuccess { society -> _state.update { it.copy(loading = false, selected = society) } }
            .onFailure { error -> _state.update { it.copy(loading = false, error = error.message) } }
    }

    fun setStatus(id: String, status: String) = viewModelScope.launch {
        _state.update { it.copy(submitting = true, error = null) }
        runCatching { repository.setStatus(id, status); repository.society(id) }
            .onSuccess { society -> _state.update { it.copy(submitting = false, selected = society) } }
            .onFailure { error -> _state.update { it.copy(submitting = false, error = error.message) } }
    }

    fun create(request: CreateSocietyRequest, onCreated: (String) -> Unit) = viewModelScope.launch {
        _state.update { it.copy(submitting = true, error = null) }
        runCatching { repository.create(request) }
            .onSuccess { result -> _state.update { it.copy(submitting = false) }; onCreated(result.id) }
            .onFailure { error -> _state.update { it.copy(submitting = false, error = error.message) } }
    }
}

data class SuperAdminUiState(
    val loading: Boolean = true,
    val submitting: Boolean = false,
    val summary: PlatformSummaryDto? = null,
    val societies: List<ManagedSocietyDto> = emptyList(),
    val selected: ManagedSocietyDto? = null,
    val error: String? = null
)
