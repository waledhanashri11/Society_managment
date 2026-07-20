package com.example.application.ui.screens.advanced

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

@Composable
fun AdminAdvancedFeaturesScreen(onBack: () -> Unit, viewModel: AdvancedFeaturesViewModel = hiltViewModel()) {
    AdvancedFeaturesScaffold("Administration tools", onBack, viewModel, admin = true)
}

@Composable
fun ResidentAdvancedFeaturesScreen(onBack: () -> Unit, viewModel: AdvancedFeaturesViewModel = hiltViewModel()) {
    AdvancedFeaturesScaffold("My society services", onBack, viewModel, admin = false)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AdvancedFeaturesScaffold(title: String, onBack: () -> Unit, vm: AdvancedFeaturesViewModel, admin: Boolean) {
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
            if (admin) AdminTools(vm) else ResidentTools(vm)
            if (state.loading) Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) { CircularProgressIndicator() }
            if (state.content.isNotBlank()) ResultCard(state.title, state.content)
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun AdminTools(vm: AdvancedFeaturesViewModel) {
    var flatId by remember { mutableStateOf("") }
    var residentId by remember { mutableStateOf("") }
    var recordId by remember { mutableStateOf("") }
    var reason by remember { mutableStateOf("") }
    var categoryIds by remember { mutableStateOf("") }
    var flatIds by remember { mutableStateOf("") }
    var nocType by remember { mutableStateOf("") }
    var societyName by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }

    ToolSection("Society settings") {
        Field(societyName, { societyName = it }, "Society name")
        Field(address, { address = it }, "Address")
        Field(email, { email = it }, "Admin email")
        Field(phone, { phone = it }, "Phone")
        ActionRow("Load", vm::loadSettings, "Save") { vm.saveSettings(mapOf("societyName" to societyName, "address" to address, "email" to email, "phone" to phone, "autoReminder" to true, "paymentAlerts" to true, "complaintAlerts" to true, "visitorAlerts" to true)) }
    }
    ToolSection("Flat ownership and history") {
        Field(flatId, { flatId = it }, "Flat ID")
        Field(residentId, { residentId = it }, "New resident ID (blank to unassign)")
        Field(reason, { reason = it }, "Transfer reason")
        ActionRow("Current resident", { vm.currentResident(flatId) }, "Transfer flat", { vm.transferFlat(flatId, residentId, reason) })
        ActionRow("Ownership history", { vm.flatHistory(flatId) }, "Transfer history", { vm.flatTransfers(flatId) })
        WideAction("Maintenance history") { vm.flatMaintenance(flatId) }
    }
    ToolSection("Payment verification") {
        Field(recordId, { recordId = it }, "Payment ID")
        Field(reason, { reason = it }, "Rejection reason")
        ActionRow("Pending payments", vm::pendingPayments, "Payment history", vm::paymentHistory)
        ActionRow("Approve", { vm.approvePayment(recordId) }, "Reject", { vm.rejectPayment(recordId, reason) })
        WideAction("Download receipt") { vm.downloadReceipt(recordId) }
    }
    ToolSection("Notifications") {
        ActionRow("Refresh notifications", vm::adminNotifications, "Mark all read", vm::readAllAdminNotifications)
    }
    ToolSection("NOC management") {
        Field(recordId, { recordId = it }, "NOC request ID")
        Field(nocType, { nocType = it }, "New NOC type")
        ActionRow("Summary", vm::nocSummary, "Types", vm::nocTypes)
        ActionRow("Request details", { vm.nocDetails(recordId) }, "Create share link", { vm.shareNoc(recordId) })
        WideAction("Create NOC type") { vm.createNocType(nocType, "Created from Android") }
    }
    ToolSection("Maintenance category assignments") {
        Field(flatId, { flatId = it }, "Flat ID")
        Field(flatIds, { flatIds = it }, "Flat IDs, comma separated")
        Field(categoryIds, { categoryIds = it }, "Category IDs, comma separated")
        ActionRow("All assignments", vm::residentCategories, "View flat", { vm.flatCategories(flatId) })
        ActionRow("Save for flat", { vm.saveFlatCategories(flatId, categoryIds) }, "Bulk assign", { vm.bulkCategories(flatIds, categoryIds) })
    }
    ToolSection("Reports") { WideAction("Complaint report", vm::complaintReport) }
}

@Composable
private fun ResidentTools(vm: AdvancedFeaturesViewModel) {
    var id by remember { mutableStateOf("") }
    ToolSection("My updates") {
        ActionRow("Visitors", vm::visitors, "Parcels", vm::parcels)
        WideAction("Recent activity", vm::activities)
    }
    ToolSection("Complaints") {
        Field(id, { id = it }, "Complaint ID")
        ActionRow("Confirm resolved", { vm.confirmComplaint(id) }, "Reopen", { vm.reopenComplaint(id) })
    }
    ToolSection("Notifications") {
        Field(id, { id = it }, "Notification ID")
        WideAction("Mark notification read") { vm.readResidentNotification(id) }
    }
    ToolSection("NOC information") {
        Field(id, { id = it }, "NOC request ID")
        ActionRow("Summary", vm::nocSummary, "Available types", vm::nocTypes)
        WideAction("Request details") { vm.nocDetails(id) }
    }
    ToolSection("Payments and reports") {
        ActionRow("Payment history", vm::paymentHistory, "Complaint report", vm::complaintReport)
        Field(id, { id = it }, "Payment ID")
        WideAction("Download receipt") { vm.downloadReceipt(id) }
    }
}

@Composable private fun ToolSection(title: String, content: @Composable () -> Unit) = Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) { Text(title, style = MaterialTheme.typography.titleMedium); content() } }
@Composable private fun Field(value: String, onChange: (String) -> Unit, label: String) = OutlinedTextField(value, onChange, Modifier.fillMaxWidth(), label = { Text(label) }, singleLine = true)
@Composable private fun ActionRow(first: String, firstAction: () -> Unit, second: String, secondAction: () -> Unit) = Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) { OutlinedButton(firstAction, Modifier.weight(1f)) { Text(first) }; Button(secondAction, Modifier.weight(1f)) { Text(second) } }
@Composable private fun WideAction(label: String, action: () -> Unit) = Button(action, Modifier.fillMaxWidth()) { Text(label) }
@Composable private fun ResultCard(title: String, content: String) = Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { Text(title, style = MaterialTheme.typography.titleMedium); Text(content, style = MaterialTheme.typography.bodySmall) } }
