@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package com.example.application.ui.screens.admin

import android.content.Context
import android.content.Intent
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import com.example.application.ui.components.LanguageSelectorCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.core.content.FileProvider
import com.example.application.data.remote.dto.FlatDto
import com.example.application.data.remote.dto.MaintenanceCategoryDto
import com.example.application.data.remote.dto.UserSummaryDto
import com.example.application.ui.components.BasicAppTextField
import com.example.application.ui.components.EmptyState
import com.example.application.ui.components.ErrorMessageCard
import com.example.application.ui.components.KeyValue
import com.example.application.ui.components.SectionCard
import com.example.application.util.ThemePreference
import com.example.application.viewmodel.AdminParityViewModel
import com.google.gson.JsonElement
import com.google.gson.JsonObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AdminParityShell(title: String, subtitle: String, onBack: () -> Unit, onRefresh: () -> Unit, content: @Composable (PaddingValues) -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Column { Text(title, fontWeight = FontWeight.Bold); Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) } },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, null) } },
                actions = { IconButton(onClick = onRefresh) { Icon(Icons.Filled.Refresh, null) } }
            )
        },
        content = content
    )
}

@Composable
fun AdminSettingsScreen(onBack: () -> Unit, viewModel: AdminParityViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    LaunchedEffect(Unit) { viewModel.loadSettings() }

    var societyName by remember(state.settings) { mutableStateOf(state.settings.text("societyName")) }
    var address by remember(state.settings) { mutableStateOf(state.settings.text("address")) }
    var phone by remember(state.settings) { mutableStateOf(state.settings.text("phone")) }
    var upi by remember(state.settings) { mutableStateOf(state.settings.text("paymentUpiId")) }
    var paymentNote by remember(state.settings) { mutableStateOf(state.settings.text("paymentNote")) }
    var qrImage by remember(state.settings) { mutableStateOf(state.settings.text("paymentQrImage")) }
    var autoReminder by remember(state.settings) { mutableStateOf(state.settings.bool("autoReminder", true)) }
    var paymentAlerts by remember(state.settings) { mutableStateOf(state.settings.bool("paymentAlerts", true)) }
    var complaintAlerts by remember(state.settings) { mutableStateOf(state.settings.bool("complaintAlerts", true)) }
    var visitorAlerts by remember(state.settings) { mutableStateOf(state.settings.bool("visitorAlerts", false)) }
    var categoryFlatId by remember { mutableStateOf("") }
    val selectedCategories = remember { mutableStateListOf<Int>() }
    val qrPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { qrImageFromUri(context, it)?.let { encoded -> qrImage = encoded } }
    }

    AdminParityShell("Admin Settings", "Society details, QR, alerts and flat category assignment", onBack, { viewModel.loadSettings() }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            state.error?.let { item { ErrorMessageCard(it) } }
            state.message?.let { item { Text(it, color = MaterialTheme.colorScheme.primary) } }
            item {
                SectionCard("Society details") {
                    BasicAppTextField(societyName, { societyName = it }, "Society name")
                    BasicAppTextField(address, { address = it }, "Address")
                    BasicAppTextField(phone, { phone = it }, "Phone")
                    BasicAppTextField(upi, { upi = it }, "Payment UPI ID")
                    BasicAppTextField(paymentNote, { paymentNote = it }, "Payment instructions")
                    if (qrImage.isNotBlank()) {
                        AsyncImage(
                            model = qrImage,
                            contentDescription = "Payment QR preview",
                            modifier = Modifier.fillMaxWidth().height(220.dp)
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = { qrPicker.launch("image/*") }) { Text(if (qrImage.isBlank()) "Choose QR image" else "Replace QR image") }
                        if (qrImage.isNotBlank()) TextButton(onClick = { qrImage = "" }) { Text("Remove") }
                    }
                    Button(
                        onClick = {
                            viewModel.saveSettings(
                                mapOf(
                                    "societyName" to societyName,
                                    "address" to address,
                                    "phone" to phone,
                                    "paymentUpiId" to upi,
                                    "paymentNote" to paymentNote,
                                    "paymentQrImage" to qrImage,
                                    "autoReminder" to autoReminder,
                                    "paymentAlerts" to paymentAlerts,
                                    "complaintAlerts" to complaintAlerts,
                                    "visitorAlerts" to visitorAlerts
                                )
                            )
                        },
                        enabled = !state.submitting,
                        modifier = Modifier.fillMaxWidth()
                    ) { Icon(Icons.Filled.Save, null); Text("Save Settings", modifier = Modifier.padding(start = 8.dp)) }
                }
            }
            item {
                SectionCard("Appearance and alerts") {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(selected = ThemePreference.darkTheme, onClick = { ThemePreference.toggle(context) }, label = { Text(if (ThemePreference.darkTheme) "Dark theme on" else "Light theme on") })
                        FilterChip(selected = autoReminder, onClick = { autoReminder = !autoReminder }, label = { Text("Auto reminders") })
                        FilterChip(selected = paymentAlerts, onClick = { paymentAlerts = !paymentAlerts }, label = { Text("Payment alerts") })
                        FilterChip(selected = complaintAlerts, onClick = { complaintAlerts = !complaintAlerts }, label = { Text("Complaint alerts") })
                        FilterChip(selected = visitorAlerts, onClick = { visitorAlerts = !visitorAlerts }, label = { Text("Visitor alerts") })
                    }
                }
            }
            item {
                LanguageSelectorCard()
            }
            item {
                SectionCard("Maintenance categories per flat", "Select a flat and assign active maintenance categories.") {
                    BasicAppTextField(categoryFlatId, { categoryFlatId = it }, "Flat ID")
                    CategoryChips(state.categories, selectedCategories)
                    Button(onClick = { viewModel.saveFlatCategories(categoryFlatId, selectedCategories.toList()) }, enabled = !state.submitting, modifier = Modifier.fillMaxWidth()) {
                        Text("Save flat category assignment")
                    }
                }
            }
            item {
                SectionCard("Occupied flats category summary") {
                    if (state.residentCategories.isEmpty()) Text("No occupied flats/category rows found.")
                    state.residentCategories.take(20).forEach { row ->
                        JsonCard(row, preferred = listOf("flat_no", "resident_name", "assigned_category_ids", "categories"))
                    }
                }
            }
        }
    }
}

private fun qrImageFromUri(context: Context, uri: android.net.Uri): String? = runCatching {
    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return null
    val mime = context.contentResolver.getType(uri) ?: "image/png"
    "data:$mime;base64,${Base64.encodeToString(bytes, Base64.NO_WRAP)}"
}.getOrNull()

@Composable
private fun CategoryChips(categories: List<MaintenanceCategoryDto>, selected: MutableList<Int>) {
    if (categories.isEmpty()) {
        Text("No categories found. Create categories from Maintenance first.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        return
    }
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        categories.filter { it.active != false }.forEach { category ->
            val id = category.id?.toIntOrNull()
            FilterChip(
                selected = id != null && selected.contains(id),
                onClick = {
                    if (id != null) {
                        if (selected.contains(id)) selected.remove(id) else selected.add(id)
                    }
                },
                label = { Text("${category.name ?: "Category"} · ₹${category.amount ?: "0"}") }
            )
        }
    }
}

@Composable
fun AdminWriteOffHistoryScreen(onBack: () -> Unit, viewModel: AdminParityViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var query by remember { mutableStateOf("") }
    val context = LocalContext.current
    var editing by remember { mutableStateOf<JsonObject?>(null) }
    var reversing by remember { mutableStateOf<JsonObject?>(null) }
    LaunchedEffect(Unit) { viewModel.loadWriteOffs() }
    val rows = state.writeOffs.filter { query.isBlank() || it.toString().contains(query, ignoreCase = true) }
    AdminParityShell("Write-off History", "Filter, audit and reverse maintenance write-offs", onBack, { viewModel.loadWriteOffs() }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                BasicAppTextField(query, { query = it }, "Search resident, flat, reason")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                    OutlinedButton(onClick = { shareCsv(context, "write-off-history.csv", rows.toCsv()) }) { Icon(Icons.Filled.Download, null); Text("History CSV") }
                    OutlinedButton(onClick = { shareCsv(context, "write-off-report.csv", state.writeOffReport.toCsv()) }, enabled = state.writeOffReport.isNotEmpty()) { Text("Report CSV") }
                }
            }
            if (state.writeOffDashboard.entrySet().isNotEmpty()) item {
                SectionCard("Write-off Summary") {
                    JsonCard(state.writeOffDashboard, preferred = listOf("total_writeoffs", "total_writeoff_amount", "partial_writeoffs", "today_writeoffs", "today_writeoff_amount", "monthly_writeoffs", "yearly_writeoffs"))
                }
            }
            state.error?.let { item { ErrorMessageCard(it) } }
            if (rows.isEmpty()) item { EmptyState("No write-offs", "Write-off activity will appear here.") }
            items(rows, key = { it.text("id").ifBlank { it.hashCode().toString() } }) { row ->
                val residentName = row.text("resident_name").ifBlank { row.text("user_name").ifBlank { row.text("name").ifBlank { "Resident" } } }
                val flatNo = row.text("flat_no").ifBlank { row.text("flat_number").ifBlank { row.text("flat").ifBlank { "N/A" } } }
                val cardTitle = if (flatNo != "N/A" && flatNo.isNotBlank()) "$residentName (Flat $flatNo)" else residentName
                SectionCard(cardTitle) {
                    JsonCard(row, preferred = listOf("resident_name", "flat_no", "bill_number", "write_off_amount", "amount", "reason", "created_at", "admin_name", "status"))
                    row.text("id").takeIf { it.isNotBlank() }?.let {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            TextButton(onClick = { shareWriteOffReceiptPdf(context, row) }) { Text("Receipt PDF") }
                            TextButton(onClick = { editing = row }, enabled = !state.submitting) { Text("Edit") }
                            TextButton(onClick = { reversing = row }, enabled = !state.submitting) { Text("Reverse") }
                        }
                    }
                }
            }
        }
    }
    editing?.let { row ->
        var amount by remember(row) { mutableStateOf(row.text("amount").ifBlank { row.text("write_off_amount") }) }
        var reason by remember(row) { mutableStateOf(row.text("reason")) }
        AlertDialog(
            onDismissRequest = { editing = null }, title = { Text("Edit Write-off") },
            text = { Column(verticalArrangement = Arrangement.spacedBy(10.dp)) { BasicAppTextField(amount, { amount = it.filter { ch -> ch.isDigit() || ch == '.' } }, "Amount"); BasicAppTextField(reason, { reason = it }, "Reason") } },
            confirmButton = { Button(onClick = { viewModel.editWriteOff(row.text("id"), amount, reason); editing = null }, enabled = !state.submitting && amount.toBigDecimalOrNull()?.signum() == 1 && reason.isNotBlank()) { Text("Update") } },
            dismissButton = { TextButton(onClick = { editing = null }) { Text("Cancel") } }
        )
    }
    reversing?.let { row ->
        AlertDialog(
            onDismissRequest = { reversing = null }, title = { Text("Reverse Write-off?") },
            text = { Text("This restores ${row.text("amount").ifBlank { row.text("write_off_amount") }} to the resident's unpaid bill and removes the write-off record.") },
            confirmButton = { Button(onClick = { viewModel.reverseWriteOff(row.text("id")); reversing = null }, enabled = !state.submitting) { Text("Reverse") } },
            dismissButton = { TextButton(onClick = { reversing = null }) { Text("Cancel") } }
        )
    }
}

@Composable
fun AdminFlatTransferHistoryScreen(onBack: () -> Unit, viewModel: AdminParityViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var selectedFlatId by remember { mutableStateOf("") }
    var selectedResidentId by remember { mutableStateOf("") }
    var reason by remember { mutableStateOf("") }
    LaunchedEffect(Unit) { viewModel.loadFlatTransferData() }
    AdminParityShell("Flat Transfer & History", "Current resident, transfer audit and assignment history", onBack, { viewModel.loadFlatTransferData(selectedFlatId) }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            state.error?.let { item { ErrorMessageCard(it) } }
            state.message?.let { item { Text(it, color = MaterialTheme.colorScheme.primary) } }
            item {
                SectionCard("Select flat") {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        state.flats.forEach { flat ->
                            FilterChip(selected = selectedFlatId == flat.id, onClick = { selectedFlatId = flat.id.orEmpty(); viewModel.loadFlatDetails(selectedFlatId) }, label = { Text(flat.label()) })
                        }
                    }
                }
            }
            item {
                SectionCard("Transfer flat") {
                    Text("Current resident", fontWeight = FontWeight.Bold)
                    state.currentResident?.let { JsonCard(it, preferred = listOf("name", "email", "phone", "start_date")) } ?: Text("Select a flat to view current resident.")
                    Spacer(Modifier.height(6.dp))
                    Text("Target resident", fontWeight = FontWeight.Bold)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(selected = selectedResidentId == "unassigned", onClick = { selectedResidentId = "unassigned" }, label = { Text("Release / Vacant") })
                        state.residents.forEach { resident ->
                            FilterChip(selected = selectedResidentId == resident.id, onClick = { selectedResidentId = resident.id.orEmpty() }, label = { Text(resident.name ?: "Resident") })
                        }
                    }
                    BasicAppTextField(reason, { reason = it }, "Transfer reason")
                    Button(onClick = { viewModel.transferFlat(selectedFlatId, selectedResidentId, reason) }, enabled = !state.submitting && selectedFlatId.isNotBlank(), modifier = Modifier.fillMaxWidth()) {
                        Text("Confirm Transfer")
                    }
                }
            }
            item {
                SectionCard("Transfer history") {
                    if (state.transferHistory.isEmpty()) Text("No transfer audit logs found.")
                    state.transferHistory.forEach { JsonCard(it, preferred = listOf("old_resident_name", "new_resident_name", "transfer_date", "transfer_reason", "admin_name")) }
                }
            }
            item {
                SectionCard("Assignment history") {
                    if (state.flatHistory.isEmpty()) Text("No assignment history found.")
                    state.flatHistory.forEach { JsonCard(it, preferred = listOf("resident_name", "resident_email", "start_date", "end_date", "is_active")) }
                }
            }
        }
    }
}

@Composable
private fun JsonCard(row: JsonObject, preferred: List<String>) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            val keys = (preferred + row.entrySet().map { it.key }).distinct().filter { row.has(it) }
            keys.take(10).forEach { key -> KeyValue(key.cleanLabel(), row.text(key).ifBlank { "-" }) }
        }
    }
}

private fun JsonObject.text(key: String): String {
    val value = get(key) ?: return ""
    return value.display()
}

private fun JsonObject.bool(key: String, fallback: Boolean): Boolean {
    val value = get(key) ?: return fallback
    return runCatching { value.asBoolean }.getOrDefault(fallback)
}

private fun JsonElement.display(): String = when {
    isJsonNull -> ""
    isJsonPrimitive -> asJsonPrimitive.asString
    isJsonArray -> asJsonArray.joinToString(", ") { it.display() }
    isJsonObject -> asJsonObject.entrySet().joinToString(", ") { "${it.key.cleanLabel()}: ${it.value.display()}" }
    else -> toString()
}

private fun String.cleanLabel(): String = replace("_", " ").replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }

private fun JsonObject.prettyText(): String = entrySet().joinToString("\n") { "${it.key.cleanLabel()}: ${it.value.display()}" }

private fun List<JsonObject>.toCsv(): String {
    val rows = this
    val keys = flatMap { it.entrySet().map { entry -> entry.key } }.distinct()
    if (keys.isEmpty()) return ""
    fun esc(value: String) = if (value.contains(",") || value.contains("\"") || value.contains("\n")) "\"${value.replace("\"", "\"\"")}\"" else value
    return buildString {
        appendLine(keys.joinToString(",") { esc(it) })
        rows.forEach { row -> appendLine(keys.joinToString(",") { key -> esc(row.text(key)) }) }
    }
}

private fun shareCsv(context: Context, filename: String, csv: String) {
    shareText(context, filename, csv.ifBlank { "No data available" })
}

private fun shareText(context: Context, title: String, body: String) {
    val intent = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_SUBJECT, title).putExtra(Intent.EXTRA_TEXT, body)
    runCatching { context.startActivity(Intent.createChooser(intent, title)) }
}

private fun shareWriteOffReceiptPdf(context: Context, row: JsonObject) {
    runCatching {
        val document = PdfDocument()
        val page = document.startPage(PdfDocument.PageInfo.Builder(595, 842, 1).create())
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 13f; color = android.graphics.Color.BLACK }
        var y = 58f
        fun line(text: String, heading: Boolean = false) {
            paint.textSize = if (heading) 19f else 13f
            paint.isFakeBoldText = heading
            page.canvas.drawText(text.take(88), 48f, y, paint)
            y += if (heading) 32f else 23f
        }
        line("Official Maintenance Write-off Receipt", true)
        line("Write-off ID: ${row.text("id")}")
        line("Bill: ${row.text("bill_number").ifBlank { row.text("bill_id") }}")
        line("Resident: ${row.text("resident_name")}")
        line("Flat: ${row.text("flat_no")}")
        line("Amount: ${row.text("amount").ifBlank { row.text("write_off_amount") }}")
        line("Type: ${row.text("type").ifBlank { row.text("writeoff_type") }}")
        line("Reason: ${row.text("reason")}")
        line("Approved by: ${row.text("admin_name")}")
        line("Date: ${row.text("created_at")}")
        line("This is a digitally generated receipt and does not require a signature.")
        document.finishPage(page)
        val file = java.io.File(context.cacheDir, "write-off-receipt-${row.text("id").ifBlank { System.currentTimeMillis().toString() }}.pdf")
        file.outputStream().use(document::writeTo)
        document.close()
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val view = Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/pdf").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        val share = Intent(Intent.ACTION_SEND).setType("application/pdf").putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        val chooser = Intent.createChooser(view, "Open, print or save receipt")
        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(share))
        context.startActivity(chooser)
    }
}

private fun FlatDto.label(): String = "Wing ${wing ?: "A"}-${flatNo ?: id ?: "-"}"
