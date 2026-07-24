package com.example.application.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.api.AdvancedApiService
import com.google.gson.GsonBuilder
import com.google.gson.JsonElement
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.Response

data class AdvancedUiState(
    val loading: Boolean = false,
    val title: String = "",
    val content: String = "",
    val error: String? = null,
    val success: String? = null
)

@HiltViewModel
class AdvancedFeaturesViewModel @Inject constructor(
    private val api: AdvancedApiService,
    @ApplicationContext private val context: Context
) : ViewModel() {
    private val gson = GsonBuilder().setPrettyPrinting().create()
    private val _state = MutableStateFlow(AdvancedUiState())
    val state: StateFlow<AdvancedUiState> = _state.asStateFlow()

    fun clearMessage() { _state.value = _state.value.copy(error = null, success = null) }

    fun loadSettings() = request("Society settings") { api.getAdminSettings() }
    fun saveSettings(values: Map<String, Any?>) {
        viewModelScope.launch {
            _state.value = AdvancedUiState(loading = true, title = "Society settings")
            try {
                val current = api.getAdminSettings()
                val merged = mutableMapOf<String, Any?>()
                if (current.isSuccessful) {
                    current.body()?.asJsonObject?.entrySet()?.forEach { entry ->
                        val value = entry.value
                        merged[entry.key] = when {
                            value.isJsonNull -> null
                            value.isJsonPrimitive && value.asJsonPrimitive.isBoolean -> value.asBoolean
                            value.isJsonPrimitive && value.asJsonPrimitive.isNumber -> value.asNumber
                            value.isJsonPrimitive -> value.asString
                            else -> value
                        }
                    }
                }
                values.forEach { (key, value) ->
                    val shouldApply = when (value) {
                        is String -> value.isNotBlank() || key == "paymentQrImage"
                        null -> false
                        else -> true
                    }
                    if (shouldApply) merged[key] = value
                }
                val response = api.saveAdminSettings(merged)
                if (response.isSuccessful) {
                    _state.value = AdvancedUiState(title = "Society settings", content = response.body()?.let(gson::toJson).orEmpty(), success = "Settings saved")
                } else {
                    val raw = response.errorBody()?.string().orEmpty()
                    val message = runCatching { gson.fromJson(raw, JsonElement::class.java).asJsonObject.get("message")?.asString }.getOrNull()
                    _state.value = AdvancedUiState(title = "Society settings", error = message ?: "Request failed (${response.code()})")
                }
            } catch (error: Exception) {
                _state.value = AdvancedUiState(title = "Society settings", error = error.message ?: "Unable to connect to the server")
            }
        }
    }
    fun currentResident(id: String) = requireId(id) { request("Current resident") { api.getCurrentResident(it) } }
    fun flatHistory(id: String) = requireId(id) { request("Flat history") { api.getFlatHistory(it) } }
    fun flatTransfers(id: String) = requireId(id) { request("Transfer history") { api.getFlatTransfers(it) } }
    fun flatMaintenance(id: String) = requireId(id) { request("Maintenance history") { api.getFlatMaintenanceHistory(it) } }
    fun transferFlat(flatId: String, residentId: String, reason: String) = requireId(flatId) { id ->
        request("Flat transfer", "Flat transferred") {
            api.transferFlat(mapOf("flatId" to id.toIntOrNull(), "residentId" to residentId.toIntOrNull(), "reason" to reason))
        }
    }

    fun pendingPayments() = request("Pending payment verification") { api.getPendingPayments() }
    fun paymentHistory() = request("Payment history") { api.getPaymentHistory() }
    fun downloadReceipt(id: String) = requireId(id) { paymentId ->
        viewModelScope.launch {
            _state.value = AdvancedUiState(loading = true, title = "Payment receipt")
            try {
                val response = api.getPaymentReceipt(paymentId)
                if (response.isSuccessful && response.body() != null) {
                    val directory = context.getExternalFilesDir("receipts") ?: context.filesDir
                    val file = File(directory, "payment-receipt-$paymentId.html")
                    response.body()!!.byteStream().use { input -> file.outputStream().use { input.copyTo(it) } }
                    _state.value = AdvancedUiState(title = "Payment receipt", content = file.absolutePath, success = "Receipt downloaded")
                } else _state.value = AdvancedUiState(title = "Payment receipt", error = "Unable to download receipt (${response.code()})")
            } catch (error: Exception) {
                _state.value = AdvancedUiState(title = "Payment receipt", error = error.message ?: "Unable to download receipt")
            }
        }
    }
    fun approvePayment(id: String) = requireId(id) { request("Payment", "Payment approved") { api.approvePayment(it) } }
    fun rejectPayment(id: String, reason: String) = requireId(id) { request("Payment", "Payment rejected") { api.rejectPayment(it, mapOf("rejectionReason" to reason.ifBlank { "Rejected by admin" })) } }

    fun confirmComplaint(id: String) = requireId(id) { request("Complaint", "Resolution confirmed") { api.confirmComplaintResolved(it) } }
    fun reopenComplaint(id: String) = requireId(id) { request("Complaint", "Complaint reopened") { api.reopenComplaint(it) } }

    fun adminNotifications() = request("Admin notifications") { api.getAdminNotifications() }
    fun readAllAdminNotifications() = request("Admin notifications", "Notifications marked as read") { api.markAdminNotificationsRead() }
    fun readResidentNotification(id: String) = requireId(id) { request("Notification", "Notification marked as read") { api.markResidentNotificationRead(it) } }

    fun nocSummary() = request("NOC summary") { api.getNocSummary() }
    fun nocTypes() = request("NOC types") { api.getNocTypes() }
    fun createNocType(name: String, description: String) {
        if (name.isBlank()) return showError("Enter a NOC type name")
        request("NOC types", "NOC type created") { api.createNocType(mapOf("name" to name.trim(), "description" to description.trim())) }
    }
    fun nocDetails(id: String) = requireId(id) { request("NOC details") { api.getNocDetails(it) } }
    fun shareNoc(id: String) = requireId(id) { request("NOC share link", "Share link generated") { api.createNocShareLink(it) } }

    fun visitors() = request("Visitors") { api.getVisitors() }
    fun parcels() = request("Parcels") { api.getParcels() }
    fun activities() = request("Recent activity") { api.getActivities() }
    fun complaintReport() = request("Complaint report") { api.getComplaintReport() }

    fun residentCategories() = request("Resident category assignments") { api.getResidentCategories() }
    fun flatCategories(flatId: String) = requireId(flatId) { request("Flat categories") { api.getFlatCategories(it) } }
    fun saveFlatCategories(flatId: String, categoryIds: String) = requireId(flatId) { id ->
        val ids = parseIds(categoryIds)
        request("Flat categories", "Categories assigned") { api.saveFlatCategories(id, mapOf("categoryIds" to ids)) }
    }
    fun bulkCategories(flatIds: String, categoryIds: String) {
        val flats = parseIds(flatIds)
        if (flats.isEmpty()) return showError("Enter at least one flat ID")
        request("Category assignments", "Categories assigned to selected flats") {
            api.bulkAssignCategories(mapOf("targets" to flats, "categoryIds" to parseIds(categoryIds)))
        }
    }

    private fun parseIds(value: String) = value.split(',').mapNotNull { it.trim().toIntOrNull() }.distinct()

    private fun requireId(value: String, block: (String) -> Unit) {
        if (value.trim().toIntOrNull() == null) showError("Enter a valid numeric ID") else block(value.trim())
    }

    private fun showError(message: String) { _state.value = _state.value.copy(error = message, success = null) }

    private fun request(title: String, success: String? = null, call: suspend () -> Response<JsonElement>) {
        viewModelScope.launch {
            _state.value = AdvancedUiState(loading = true, title = title)
            try {
                val response = call()
                if (response.isSuccessful) {
                    val body = response.body()
                    _state.value = AdvancedUiState(title = title, content = body?.let(gson::toJson).orEmpty(), success = success)
                } else {
                    val raw = response.errorBody()?.string().orEmpty()
                    val message = runCatching { gson.fromJson(raw, JsonElement::class.java).asJsonObject.get("message")?.asString }.getOrNull()
                    _state.value = AdvancedUiState(title = title, error = message ?: "Request failed (${response.code()})")
                }
            } catch (error: Exception) {
                _state.value = AdvancedUiState(title = title, error = error.message ?: "Unable to connect to the server")
            }
        }
    }
}
