package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.dto.MembersMaintenanceReportDto
import com.example.application.data.repository.ResidentRepository
import com.example.application.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ResidentMembersState(
    val loading: Boolean = false,
    val refreshing: Boolean = false,
    val members: List<MembersMaintenanceReportDto> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class ResidentMembersViewModel @Inject constructor(private val repository: ResidentRepository) : ViewModel() {
    private val _state = MutableStateFlow(ResidentMembersState())
    val state = _state.asStateFlow()
    init { load() }
    fun load(refresh: Boolean = false) = viewModelScope.launch {
        _state.update { it.copy(loading = it.members.isEmpty(), refreshing = refresh, error = null) }
        when (val result = repository.getMembers()) {
            is NetworkResult.Success -> _state.update { it.copy(loading = false, refreshing = false, members = result.data) }
            is NetworkResult.Error -> _state.update { it.copy(loading = false, refreshing = false, error = repository.userMessageFor(result.error)) }
            NetworkResult.Loading -> Unit
        }
    }
}
