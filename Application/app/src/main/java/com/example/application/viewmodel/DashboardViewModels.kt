package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.repository.AdminDashboardData
import com.example.application.data.repository.DashboardLoadResult
import com.example.application.data.repository.DashboardRepository
import com.example.application.data.repository.ResidentDashboardData
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@HiltViewModel
class AdminDashboardViewModel @Inject constructor(
    private val dashboardRepository: DashboardRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(AdminDashboardUiState())
    val uiState: StateFlow<AdminDashboardUiState> = _uiState.asStateFlow()

    init {
        loadInitial()
    }

    private fun loadInitial() {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    isRefreshing = false,
                    isFromCache = true,
                    data = dashboardRepository.getAdminDashboardSnapshot(),
                    errorMessage = null
                )
            }
            load(refresh = true)
        }
    }

    fun load(refresh: Boolean = false) {
        if (_uiState.value.isRefreshing) return
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = it.data == null,
                    isRefreshing = refresh,
                    errorMessage = null
                )
            }
            when (val result = dashboardRepository.getAdminDashboard(refresh)) {
                is DashboardLoadResult.Success -> _uiState.update {
                    it.copy(
                        isLoading = false,
                        isRefreshing = false,
                        data = result.data,
                        isFromCache = result.fromCache,
                        errorMessage = null
                    )
                }
                is DashboardLoadResult.Error -> _uiState.update {
                    it.copy(isLoading = false, isRefreshing = false, errorMessage = result.message)
                }
            }
        }
    }
}

@HiltViewModel
class ResidentDashboardViewModel @Inject constructor(
    private val dashboardRepository: DashboardRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(ResidentDashboardUiState())
    val uiState: StateFlow<ResidentDashboardUiState> = _uiState.asStateFlow()

    init {
        loadInitial()
    }

    private fun loadInitial() {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    isRefreshing = false,
                    isFromCache = true,
                    data = dashboardRepository.getResidentDashboardSnapshot(),
                    errorMessage = null
                )
            }
            load(refresh = true)
        }
    }

    fun load(refresh: Boolean = false) {
        if (_uiState.value.isRefreshing) return
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = it.data == null,
                    isRefreshing = refresh,
                    errorMessage = null
                )
            }
            when (val result = dashboardRepository.getResidentDashboard(refresh)) {
                is DashboardLoadResult.Success -> _uiState.update {
                    it.copy(
                        isLoading = false,
                        isRefreshing = false,
                        data = result.data,
                        isFromCache = result.fromCache,
                        errorMessage = null
                    )
                }
                is DashboardLoadResult.Error -> _uiState.update {
                    it.copy(isLoading = false, isRefreshing = false, errorMessage = result.message)
                }
            }
        }
    }
}

data class AdminDashboardUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val isFromCache: Boolean = false,
    val data: AdminDashboardData? = null,
    val errorMessage: String? = null
)

data class ResidentDashboardUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val isFromCache: Boolean = false,
    val data: ResidentDashboardData? = null,
    val errorMessage: String? = null
)
