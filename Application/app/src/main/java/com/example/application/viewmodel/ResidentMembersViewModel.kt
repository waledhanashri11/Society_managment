package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.dto.MembersMaintenanceReportDto
import com.example.application.data.repository.ResidentRepository
import com.example.application.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

data class ResidentMembersState(
    val loading: Boolean = false,
    val refreshing: Boolean = false,
    val members: List<MembersMaintenanceReportDto> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class ResidentMembersViewModel @Inject constructor(private val repository: ResidentRepository) : ViewModel() {
    private val _state = MutableStateFlow(
        ResidentMembersState(members = repository.getMembersSnapshot())
    )
    val state = _state.asStateFlow()
    private var loadJob: Job? = null

    init { load() }

    fun load(refresh: Boolean = false) {
        if (loadJob?.isActive == true) return
        loadJob = viewModelScope.launch {
            _state.update {
                it.copy(
                    loading = it.members.isEmpty(),
                    refreshing = it.members.isNotEmpty(),
                    error = null
                )
            }
            try {
                when (val result = withTimeout(MEMBERS_TIMEOUT_MS) { repository.getMembers(refresh) }) {
                    is NetworkResult.Success -> _state.update {
                        it.copy(loading = false, refreshing = false, members = result.data, error = null)
                    }
                    is NetworkResult.Error -> _state.update {
                        it.copy(
                            loading = false,
                            refreshing = false,
                            error = repository.userMessageFor(result.error)
                        )
                    }
                    NetworkResult.Loading -> _state.update {
                        it.copy(
                            loading = false,
                            refreshing = false,
                            error = "Unable to load society members. Please try again."
                        )
                    }
                }
            } catch (_: TimeoutCancellationException) {
                _state.update {
                    it.copy(
                        loading = false,
                        refreshing = false,
                        error = "Unable to load society members. The server took too long to respond."
                    )
                }
            } catch (_: CancellationException) {
                // A user-requested refresh replaced the previous request.
            } catch (_: Exception) {
                _state.update {
                    it.copy(
                        loading = false,
                        refreshing = false,
                        error = "Unable to load society members. Please try again."
                    )
                }
            }
        }
    }

    companion object {
        private const val MEMBERS_TIMEOUT_MS = 60_000L
    }
}
