package com.example.application.ui.screens.advanced

import android.content.Context
import android.net.Uri
import android.util.Base64
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.viewmodel.AdvancedFeaturesViewModel
import com.example.application.util.ThemePreference

@Composable
fun AdminAdvancedFeaturesScreen(onBack: () -> Unit, onOpen: (String) -> Unit = {}, viewModel: AdvancedFeaturesViewModel = hiltViewModel()) {
    AdvancedFeaturesScaffold("Administration tools", onBack, onOpen, viewModel, admin = true)
}

@Composable
fun ResidentAdvancedFeaturesScreen(onBack: () -> Unit, onOpen: (String) -> Unit = {}, viewModel: AdvancedFeaturesViewModel = hiltViewModel()) {
    AdvancedFeaturesScaffold("My society services", onBack, onOpen, viewModel, admin = false)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AdvancedFeaturesScaffold(title: String, onBack: () -> Unit, onOpen: (String) -> Unit, vm: AdvancedFeaturesViewModel, admin: Boolean) {
    val state by vm.state.collectAsStateWithLifecycle()
    val snackbars = remember { SnackbarHostState() }
    LaunchedEffect(state.error, state.success) {
        (state.error ?: state.success)?.let { snackbars.showSnackbar(it) }
        vm.clearMessage()
    }
    Scaffold(
        topBar = { TopAppBar(title = { Text(title) }, navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } }) },
        snackbarHost = { SnackbarHost(snackbars) }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            if (admin) AdminTools(vm, state, onOpen) else ResidentTools(vm, onOpen)
            if (state.loading) com.example.application.ui.components.SkeletonCard(height = 90.dp)
            if (state.content.isNotBlank() && state.title != "Society settings") ResultCard(state.title, state.content)
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun AdminTools(vm: AdvancedFeaturesViewModel, state: com.example.application.viewmodel.AdvancedUiState, onOpen: (String) -> Unit) {
    var societyName by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var paymentUpiId by remember { mutableStateOf("") }
    var paymentNote by remember { mutableStateOf("") }
    var paymentQrImage by remember { mutableStateOf("") }
    var paymentQrTouched by remember { mutableStateOf(false) }
    val context = androidx.compose.ui.platform.LocalContext.current
    val qrPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri ?: return@rememberLauncherForActivityResult
        runCatching { paymentQrImage = uri.asDataUrl(context); paymentQrTouched = true }
            .onSuccess { Toast.makeText(context, "QR image selected", Toast.LENGTH_SHORT).show() }
            .onFailure { Toast.makeText(context, "Unable to read QR image", Toast.LENGTH_LONG).show() }
    }
    LaunchedEffect(state.title, state.content) {
        if (state.title == "Society settings" && state.content.isNotBlank()) {
            runCatching {
                val json = org.json.JSONObject(state.content)
                societyName = json.optString("societyName", societyName)
                address = json.optString("address", address)
                email = json.optString("email", email)
                phone = json.optString("phone", phone)
                paymentUpiId = json.optString("paymentUpiId", paymentUpiId)
                paymentNote = json.optString("paymentNote", paymentNote)
                paymentQrImage = json.optString("paymentQrImage", paymentQrImage)
                paymentQrTouched = false
            }
        }
    }

    ToolSection("Society settings") {
        Field(societyName, { societyName = it }, "Society name")
        Field(address, { address = it }, "Address")
        Field(email, { email = it }, "Admin email")
        Field(phone, { phone = it }, "Phone")
        Field(paymentUpiId, { paymentUpiId = it }, "UPI ID / payment name")
        Field(paymentNote, { paymentNote = it }, "Payment note")
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { qrPicker.launch("image/*") }, modifier = Modifier.weight(1f)) { Text(if (paymentQrImage.isBlank()) "Upload QR" else "Change QR") }
            OutlinedButton(onClick = { paymentQrImage = ""; paymentQrTouched = true }, modifier = Modifier.weight(1f)) { Text("Remove QR") }
        }
        Text(
            if (paymentQrImage.isBlank()) "Resident Pay screen will use the QR currently saved on backend." else "New QR selected and ready to save.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        ActionRow("Load", vm::loadSettings, "Save") {
            val settingsPayload = mutableMapOf<String, Any?>(
                "societyName" to societyName,
                "address" to address,
                "email" to email,
                "phone" to phone,
                "paymentUpiId" to paymentUpiId,
                "paymentNote" to paymentNote,
                "autoReminder" to true,
                "paymentAlerts" to true,
                "complaintAlerts" to true,
                "visitorAlerts" to true
            )
            if (paymentQrTouched) settingsPayload["paymentQrImage"] = paymentQrImage
            vm.saveSettings(
                settingsPayload
            )
        }
    }
    ToolSection("Appearance") {
        Text(
            if (ThemePreference.darkTheme) "Dark theme is enabled." else "Light theme is enabled.",
            style = MaterialTheme.typography.bodyMedium
        )
        WideAction(if (ThemePreference.darkTheme) "Switch to Light Theme" else "Switch to Dark Theme") {
            ThemePreference.toggle(context)
        }
    }
    ToolSection("Management") {
        HubRow("Residents", "Flats", onOpen)
        HubRow("Flat transfers", "NOC management", onOpen)
        HubRow("Complaints", "Notifications", onOpen)
        HubRow("Maintenance", "Reports", onOpen)
        HubRow("Write-off history", "AGM report", onOpen)
        HubRow("Society rules", "Meetings", onOpen)
        WideAction("Events") { onOpen("Events") }
    }
}

@Composable
private fun ResidentTools(vm: AdvancedFeaturesViewModel, onOpen: (String) -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    ToolSection("Appearance") {
        Text(
            if (ThemePreference.darkTheme) "Dark theme is enabled." else "Light theme is enabled.",
            style = MaterialTheme.typography.bodyMedium
        )
        WideAction(if (ThemePreference.darkTheme) "Switch to Light Theme" else "Switch to Dark Theme") {
            ThemePreference.toggle(context)
        }
    }
    ToolSection("My updates") {
        ActionRow("Visitors", vm::visitors, "Parcels", vm::parcels)
        WideAction("Recent activity", vm::activities)
    }
    ToolSection("Society services") {
        HubRow("Maintenance", "Payment history", onOpen)
        HubRow("Complaints", "Notices", onOpen)
        HubRow("NOC requests", "Reports", onOpen)
        HubRow("Rules", "Meetings", onOpen)
        HubRow("Events", "Members", onOpen)
        WideAction("Notifications") { onOpen("Notifications") }
    }
}

@Composable
private fun ToolSection(title: String, content: @Composable () -> Unit) = Card(
    modifier = Modifier.fillMaxWidth(),
    shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
    colors = androidx.compose.material3.CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
) {
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
        content()
    }
}

@Composable private fun Field(value: String, onChange: (String) -> Unit, label: String) = OutlinedTextField(value, onChange, Modifier.fillMaxWidth(), label = { Text(label) }, singleLine = true, shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp))
@Composable private fun ActionRow(first: String, firstAction: () -> Unit, second: String, secondAction: () -> Unit) = Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) { OutlinedButton(firstAction, Modifier.weight(1f), shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)) { Text(first) }; Button(secondAction, Modifier.weight(1f), shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)) { Text(second) } }
@Composable private fun WideAction(label: String, action: () -> Unit) = Button(action, Modifier.fillMaxWidth(), shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)) { Text(label) }
@Composable private fun HubRow(first: String, second: String, onOpen: (String) -> Unit) = ActionRow(first, { onOpen(first) }, second, { onOpen(second) })

@Composable
private fun ResultCard(title: String, content: String) = Card(
    modifier = Modifier.fillMaxWidth(),
    shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
    colors = androidx.compose.material3.CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
) {
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
        friendlyResultLines(content).forEach { line -> Text(line, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}

private fun friendlyResultLines(content: String): List<String> = runCatching {
    fun label(key: String) = key.replace('_', ' ').replace(Regex("([a-z])([A-Z])"), "$1 $2").replaceFirstChar { it.uppercase() }
    fun objectLines(value: org.json.JSONObject, prefix: String = ""): List<String> = value.keys().asSequence().flatMap { key ->
        val child = value.opt(key)
        val heading = (prefix + label(key)).trim()
        when (child) {
            is org.json.JSONObject -> objectLines(child, "$heading · ").asSequence()
            is org.json.JSONArray -> sequenceOf("$heading: ${child.length()} records")
            null, org.json.JSONObject.NULL -> sequenceOf("$heading: —")
            else -> sequenceOf("$heading: $child")
        }
    }.toList()
    when (val root = org.json.JSONTokener(content).nextValue()) {
        is org.json.JSONArray -> {
            if (root.length() == 0) listOf("No records found.")
            else (0 until root.length()).flatMap { index ->
                when (val item = root.opt(index)) {
                    is org.json.JSONObject -> listOf("Record ${index + 1}") + objectLines(item)
                    else -> listOf(item?.toString().orEmpty())
                }
            }
        }
        is org.json.JSONObject -> objectLines(root)
        else -> listOf(root.toString())
    }
}.getOrElse { listOf(content) }

private fun Uri.asDataUrl(context: Context): String {
    val mimeType = context.contentResolver.getType(this) ?: "image/png"
    val bytes = context.contentResolver.openInputStream(this)?.use { it.readBytes() } ?: error("Unable to read selected file")
    return "data:$mimeType;base64,${Base64.encodeToString(bytes, Base64.NO_WRAP)}"
}
