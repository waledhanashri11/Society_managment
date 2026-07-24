package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.dto.SocietyRuleAcknowledgementReportDto
import com.example.application.data.remote.dto.SocietyRuleDto
import com.example.application.data.repository.SocietyRulesRepository
import com.example.application.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SocietyRulesState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val items: List<SocietyRuleDto> = emptyList(),
    val query: String = "",
    val category: String = "All",
    val priority: String = "All",
    val status: String = "All",
    val selectedRule: SocietyRuleDto? = null,
    val report: SocietyRuleAcknowledgementReportDto? = null,
    val error: String? = null,
    val message: String? = null,
    val submitting: Boolean = false
)

@HiltViewModel
class AdminSocietyRulesViewModel @Inject constructor(
    private val repository: SocietyRulesRepository
) : ViewModel() {
    private val _state = MutableStateFlow(SocietyRulesState())
    val state: StateFlow<SocietyRulesState> = _state.asStateFlow()

    init { load() }

    fun load(refresh: Boolean = false) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.items.isEmpty(), isRefreshing = refresh, error = null, message = null) }
            when (val result = repository.getAdminRules(refresh)) {
                is NetworkResult.Success -> _state.update { it.copy(isLoading = false, isRefreshing = false, items = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, isRefreshing = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun setQuery(value: String) = _state.update { it.copy(query = value) }
    fun setCategory(value: String) = _state.update { it.copy(category = value) }
    fun setPriority(value: String) = _state.update { it.copy(priority = value) }
    fun setStatus(value: String) = _state.update { it.copy(status = value) }
    fun selectRule(rule: SocietyRuleDto?) = _state.update { it.copy(selectedRule = rule, report = null, error = null, message = null) }

    fun saveRule(id: String?, title: String, description: String, category: String, priority: String, publishNow: Boolean) {
        action(reload = true) { repository.saveRule(id, title, description, category, priority, publishNow) }
    }

    fun publishRule(id: String) = action(reload = true) { repository.publishRule(id) }
    fun unpublishRule(id: String) = action(reload = true) { repository.unpublishRule(id) }
    fun archiveRule(id: String) = action(reload = true) { repository.archiveRule(id) }

    fun loadReport(id: String, refresh: Boolean = false) {
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null, message = null) }
            when (val result = repository.getAcknowledgementReport(id, refresh)) {
                is NetworkResult.Success -> _state.update { it.copy(submitting = false, report = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(submitting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun sendReminders(id: String) {
        action(reload = false) { repository.sendReminders(id) }
        loadReport(id, true)
    }

    private fun action(reload: Boolean, call: suspend () -> NetworkResult<String>) {
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null, message = null) }
            when (val result = call()) {
                is NetworkResult.Success -> {
                    _state.update { it.copy(submitting = false, message = result.data) }
                    if (reload) load(true)
                }
                is NetworkResult.Error -> _state.update { it.copy(submitting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
}

@HiltViewModel
class ResidentSocietyRulesViewModel @Inject constructor(
    private val repository: SocietyRulesRepository
) : ViewModel() {
    private val _state = MutableStateFlow(SocietyRulesState(status = "published"))
    val state: StateFlow<SocietyRulesState> = _state.asStateFlow()

    init { load() }

    fun load(refresh: Boolean = false) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.items.isEmpty(), isRefreshing = refresh, error = null, message = null) }
            when (val result = repository.getResidentRules(refresh)) {
                is NetworkResult.Success -> _state.update { it.copy(isLoading = false, isRefreshing = false, items = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, isRefreshing = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun setQuery(value: String) = _state.update { it.copy(query = value) }
    fun setCategory(value: String) = _state.update { it.copy(category = value) }
    fun setPriority(value: String) = _state.update { it.copy(priority = value) }
    fun selectRule(rule: SocietyRuleDto?) {
        _state.update { it.copy(selectedRule = rule, error = null, message = null) }
        rule?.id?.let { id ->
            if (rule.isRead != true) markRead(id)
        }
    }

    fun markRead(id: String) {
        viewModelScope.launch {
            when (val result = repository.markRuleRead(id)) {
                is NetworkResult.Success -> load(true)
                is NetworkResult.Error -> _state.update { it.copy(error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun acknowledge(id: String) {
        viewModelScope.launch {
            _state.update { it.copy(submitting = true, error = null, message = null) }
            when (val result = repository.acknowledgeRule(id)) {
                is NetworkResult.Success -> {
                    _state.update { it.copy(submitting = false, message = result.data, selectedRule = it.selectedRule?.copy(isAcknowledged = true, acknowledgedAt = "now")) }
                    load(true)
                }
                is NetworkResult.Error -> _state.update { it.copy(submitting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
}
