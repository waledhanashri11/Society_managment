package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.dto.EventDto
import com.example.application.data.remote.dto.EventSaveRequest
import com.example.application.data.repository.EventsRepository
import com.example.application.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class EventsUiState(
    val loading: Boolean = false,
    val refreshing: Boolean = false,
    val submitting: Boolean = false,
    val events: List<EventDto> = emptyList(),
    val selected: EventDto? = null,
    val query: String = "",
    val filter: String = "All",
    val error: String? = null,
    val message: String? = null
)

@HiltViewModel
class EventsViewModel @Inject constructor(
    private val repository: EventsRepository
) : ViewModel() {
    private val _state = MutableStateFlow(EventsUiState(loading = true))
    val state: StateFlow<EventsUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load(refresh: Boolean = false) = viewModelScope.launch {
        _state.update { it.copy(loading = it.events.isEmpty(), refreshing = refresh, error = null) }
        when (val result = repository.getEvents(refresh)) {
            is NetworkResult.Success -> _state.update {
                it.copy(loading = false, refreshing = false, events = result.data)
            }
            is NetworkResult.Error -> _state.update {
                it.copy(loading = false, refreshing = false, error = repository.userMessageFor(result.error))
            }
            NetworkResult.Loading -> Unit
        }
    }

    fun setQuery(value: String) = _state.update { it.copy(query = value) }
    fun setFilter(value: String) = _state.update { it.copy(filter = value) }

    fun open(id: String) = viewModelScope.launch {
        _state.update { it.copy(error = null) }
        when (val result = repository.getEvent(id, true)) {
            is NetworkResult.Success -> _state.update { it.copy(selected = result.data) }
            is NetworkResult.Error -> _state.update { it.copy(error = repository.userMessageFor(result.error)) }
            NetworkResult.Loading -> Unit
        }
    }

    fun clearSelected() = _state.update { it.copy(selected = null) }

    fun create(request: EventSaveRequest) = action { repository.create(request) }
    fun update(id: String, request: EventSaveRequest) = action { repository.update(id, request) }
    fun publish(id: String) = action { repository.updateStatus(id, "Published") }
    fun cancel(id: String) = action { repository.updateStatus(id, "Cancelled") }
    fun complete(id: String) = action { repository.updateStatus(id, "Completed") }
    fun delete(id: String) = action { repository.delete(id) }

    private fun action(block: suspend () -> NetworkResult<String>) = viewModelScope.launch {
        val currentId = _state.value.selected?.id
        _state.update { it.copy(submitting = true, error = null, message = null) }
        when (val result = block()) {
            is NetworkResult.Success -> {
                _state.update { it.copy(submitting = false, message = result.data) }
                load(true)
                currentId?.let { open(it) }
            }
            is NetworkResult.Error -> _state.update {
                it.copy(submitting = false, error = repository.userMessageFor(result.error))
            }
            NetworkResult.Loading -> Unit
        }
    }
}
