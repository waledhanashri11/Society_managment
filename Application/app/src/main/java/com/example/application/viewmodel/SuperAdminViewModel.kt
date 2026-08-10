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
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

@HiltViewModel
class SuperAdminViewModel @Inject constructor(private val repository: SuperAdminRepository) : ViewModel() {
    private val _state = MutableStateFlow(SuperAdminUiState())
    val state = _state.asStateFlow()
    private var dashboardLoadJob: Job? = null

    fun load() {
        dashboardLoadJob?.cancel()
        dashboardLoadJob = viewModelScope.launch {
            val hasContent = _state.value.summary != null
            _state.update { it.copy(loading = !hasContent, refreshing = hasContent, error = null) }
            try {
                val (summary, societies) = withTimeout(LOAD_TIMEOUT_MS) {
                    coroutineScope {
                        val summaryRequest = async { repository.dashboard() }
                        val societiesRequest = async { repository.societies() }
                        summaryRequest.await() to societiesRequest.await()
                    }
                }
                _state.update {
                    it.copy(
                        loading = false,
                        refreshing = false,
                        summary = summary,
                        societies = societies,
                        error = null
                    )
                }
            } catch (_: TimeoutCancellationException) {
                _state.update {
                    it.copy(
                        loading = false,
                        refreshing = false,
                        error = "The server is taking too long to respond. Check your connection and tap Retry."
                    )
                }
            } catch (_: CancellationException) {
                // A newer refresh request replaced this one.
            } catch (error: Exception) {
                _state.update {
                    it.copy(
                        loading = false,
                        refreshing = false,
                        error = error.message ?: "Unable to load platform data. Please try again."
                    )
                }
            }
        }
    }

    fun loadSociety(id: String) = viewModelScope.launch {
        _state.update { it.copy(loading = true, error = null) }
        try {
            val society = withTimeout(LOAD_TIMEOUT_MS) { repository.society(id) }
            _state.update { it.copy(loading = false, selected = society) }
        } catch (_: TimeoutCancellationException) {
            _state.update { it.copy(loading = false, error = "The server is taking too long to respond. Tap Retry.") }
        } catch (error: Exception) {
            _state.update { it.copy(loading = false, error = error.message ?: "Unable to load society details.") }
        }
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

    companion object {
        private const val LOAD_TIMEOUT_MS = 75_000L
    }
}

data class SuperAdminUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val submitting: Boolean = false,
    val summary: PlatformSummaryDto? = null,
    val societies: List<ManagedSocietyDto> = emptyList(),
    val selected: ManagedSocietyDto? = null,
    val error: String? = null
)
