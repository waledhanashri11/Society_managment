package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.api.AdvancedApiService
import com.example.application.data.remote.api.MaintenanceApiService
import com.example.application.data.remote.dto.FlatDto
import com.example.application.data.remote.dto.MaintenanceCategoryDto
import com.example.application.data.remote.dto.UserSummaryDto
import com.example.application.data.repository.AdminManagementRepository
import com.example.application.util.NetworkResult
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AdminParityState(
    val loading: Boolean = false,
    val submitting: Boolean = false,
    val error: String? = null,
    val message: String? = null,
    val settings: JsonObject = JsonObject(),
    val writeOffs: List<JsonObject> = emptyList(),
    val writeOffDashboard: JsonObject = JsonObject(),
    val writeOffReport: List<JsonObject> = emptyList(),
    val flats: List<FlatDto> = emptyList(),
    val residents: List<UserSummaryDto> = emptyList(),
    val residentCategories: List<JsonObject> = emptyList(),
    val categories: List<MaintenanceCategoryDto> = emptyList(),
    val currentResident: JsonObject? = null,
    val flatHistory: List<JsonObject> = emptyList(),
    val transferHistory: List<JsonObject> = emptyList()
)

@HiltViewModel
class AdminParityViewModel @Inject constructor(
    private val advancedApi: AdvancedApiService,
    private val maintenanceApi: MaintenanceApiService,
    private val adminRepository: AdminManagementRepository
) : ViewModel() {
    private val _state = MutableStateFlow(AdminParityState())
    val state: StateFlow<AdminParityState> = _state.asStateFlow()

    fun loadSettings() = viewModelScope.launch {
        _state.update { it.copy(loading = true, error = null, message = null) }
        runCatching {
            val settings = advancedApi.getAdminSettings().body().asObject()
            val residentCategories = advancedApi.getResidentCategories().body().asRows()
            val categories = maintenanceApi.getCategories().body()?.data.orEmpty()
            _state.update {
                it.copy(
                    loading = false,
                    settings = settings,
                    residentCategories = residentCategories,
                    categories = categories
                )
            }
        }.onFailure { error -> _state.update { it.copy(loading = false, error = error.cleanMessage("Unable to load settings.")) } }
    }

    fun saveSettings(values: Map<String, Any?>) = viewModelScope.launch {
        _state.update { it.copy(submitting = true, error = null, message = null) }
        runCatching {
            val merged = mutableMapOf<String, Any?>()
            _state.value.settings.entrySet().forEach { (key, value) -> merged[key] = value.toSimpleValue() }
            merged.putAll(values)
            val saved = advancedApi.saveAdminSettings(merged).body().asObject()
            _state.update { it.copy(submitting = false, settings = saved, message = "Settings saved successfully") }
        }.onFailure { error -> _state.update { it.copy(submitting = false, error = error.cleanMessage("Unable to save settings.")) } }
    }

    fun saveFlatCategories(flatId: String, categoryIds: List<Int>) = viewModelScope.launch {
        if (flatId.isBlank()) return@launch showError("Select a flat first.")
        _state.update { it.copy(submitting = true, error = null, message = null) }
        runCatching {
            advancedApi.saveFlatCategories(flatId, mapOf("categoryIds" to categoryIds))
            _state.update { it.copy(submitting = false, message = "Category assignment saved") }
            loadSettings()
        }.onFailure { error -> _state.update { it.copy(submitting = false, error = error.cleanMessage("Unable to save categories.")) } }
    }

    fun loadWriteOffs() = viewModelScope.launch {
        _state.update { it.copy(loading = true, error = null, message = null) }
        runCatching {
            val history = advancedApi.getWriteOffHistory().body().asRows()
            val dashboard = advancedApi.getWriteOffDashboard().body().dataObject()
            val report = advancedApi.getWriteOffReport().body().asRows()
            _state.update { it.copy(loading = false, writeOffs = history, writeOffDashboard = dashboard, writeOffReport = report) }
        }.onFailure { error -> _state.update { it.copy(loading = false, error = error.cleanMessage("Unable to load write-off history.")) } }
    }

    fun reverseWriteOff(id: String) = viewModelScope.launch {
        if (id.isBlank()) return@launch showError("Write-off ID is missing.")
        _state.update { it.copy(submitting = true, error = null, message = null) }
        runCatching {
            advancedApi.reverseWriteOff(id)
            _state.update { it.copy(submitting = false, message = "Write-off reversed") }
            loadWriteOffs()
        }.onFailure { error -> _state.update { it.copy(submitting = false, error = error.cleanMessage("Unable to reverse write-off.")) } }
    }

    fun editWriteOff(id: String, amount: String, reason: String) = viewModelScope.launch {
        val parsed = amount.toBigDecimalOrNull()
        when {
            id.isBlank() -> return@launch showError("Write-off ID is missing.")
            parsed == null || parsed.signum() <= 0 -> return@launch showError("Enter a valid positive amount.")
            reason.isBlank() -> return@launch showError("A reason is required.")
        }
        _state.update { it.copy(submitting = true, error = null, message = null) }
        runCatching {
            val response = advancedApi.editWriteOff(id, mapOf("amount" to parsed!!.toPlainString(), "reason" to reason.trim()))
            if (!response.isSuccessful) error(response.errorBody()?.string() ?: "Unable to update write-off (${response.code()})")
            _state.update { it.copy(submitting = false, message = "Write-off updated successfully") }
            loadWriteOffs()
        }.onFailure { error -> _state.update { it.copy(submitting = false, error = error.cleanMessage("Unable to update write-off.")) } }
    }


    fun loadFlatTransferData(flatId: String? = null) = viewModelScope.launch {
        _state.update { it.copy(loading = true, error = null, message = null) }
        val flats = when (val result = adminRepository.getFlats(refresh = true)) {
            is NetworkResult.Success -> result.data
            is NetworkResult.Error -> emptyList()
            NetworkResult.Loading -> emptyList()
        }
        val residents = when (val result = adminRepository.getResidents(refresh = true)) {
            is NetworkResult.Success -> result.data
            is NetworkResult.Error -> emptyList()
            NetworkResult.Loading -> emptyList()
        }
        _state.update { it.copy(loading = false, flats = flats, residents = residents) }
        flatId?.takeIf { it.isNotBlank() }?.let { loadFlatDetails(it) }
    }

    fun loadFlatDetails(flatId: String) = viewModelScope.launch {
        if (flatId.isBlank()) return@launch
        _state.update { it.copy(submitting = true, error = null, message = null) }
        runCatching {
            val current = advancedApi.getCurrentResident(flatId).body().asObjectOrNull()
            val history = advancedApi.getFlatHistory(flatId).body().asRows()
            val transfers = advancedApi.getFlatTransfers(flatId).body().asRows()
            _state.update { it.copy(submitting = false, currentResident = current, flatHistory = history, transferHistory = transfers) }
        }.onFailure { error -> _state.update { it.copy(submitting = false, error = error.cleanMessage("Unable to load flat history.")) } }
    }

    fun transferFlat(flatId: String, residentId: String, reason: String) = viewModelScope.launch {
        if (flatId.isBlank()) return@launch showError("Select a flat first.")
        _state.update { it.copy(submitting = true, error = null, message = null) }
        runCatching {
            advancedApi.transferFlat(
                mapOf(
                    "flatId" to flatId.toIntOrNull(),
                    "residentId" to residentId.takeUnless { it == "unassigned" || it.isBlank() }?.toIntOrNull(),
                    "reason" to reason
                )
            )
            _state.update { it.copy(submitting = false, message = "Flat transfer completed") }
            loadFlatTransferData(flatId)
        }.onFailure { error -> _state.update { it.copy(submitting = false, error = error.cleanMessage("Unable to transfer flat.")) } }
    }

    private fun showError(message: String) {
        _state.update { it.copy(error = message) }
    }
}

private fun JsonElement?.asObject(): JsonObject = this?.asObjectOrNull() ?: JsonObject()
private fun JsonElement?.dataObject(): JsonObject {
    val root = asObjectOrNull() ?: return JsonObject()
    return root.get("data")?.asObjectOrNull() ?: root
}
private fun JsonElement?.asObjectOrNull(): JsonObject? = this?.takeIf { it.isJsonObject }?.asJsonObject

private fun JsonElement?.asRows(): List<JsonObject> {
    val element = this ?: return emptyList()
    if (element.isJsonArray) return element.asJsonArray.mapNotNull { it.asObjectOrNull() }
    val obj = element.asObjectOrNull() ?: return emptyList()
    listOf("data", "rows", "items", "history", "transfers", "writeOffs", "report").forEach { key ->
        val child = obj.get(key)
        if (child?.isJsonArray == true) return child.asJsonArray.mapNotNull { it.asObjectOrNull() }
        if (child?.isJsonObject == true) {
            val nested = child.asRows()
            if (nested.isNotEmpty()) return nested
        }
    }
    return listOf(obj)
}

private fun JsonElement.toSimpleValue(): Any? = when {
    isJsonNull -> null
    isJsonPrimitive && asJsonPrimitive.isBoolean -> asBoolean
    isJsonPrimitive && asJsonPrimitive.isNumber -> asNumber
    isJsonPrimitive -> asString
    else -> toString()
}

private fun Throwable.cleanMessage(fallback: String): String = message?.takeIf { it.isNotBlank() } ?: fallback
