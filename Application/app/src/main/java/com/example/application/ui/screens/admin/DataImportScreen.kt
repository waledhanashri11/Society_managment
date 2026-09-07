package com.example.application.ui.screens.admin

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.util.ExcelFileManager
import com.example.application.util.ResidentImportFileManager
import com.example.application.viewmodel.ResidentImportEvent
import com.example.application.viewmodel.ResidentImportViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DataImportScreen(
    onBack: () -> Unit,
    onMaintenanceTransactions: () -> Unit,
    viewModel: ResidentImportViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val state by viewModel.state.collectAsStateWithLifecycle()
    val event by viewModel.event.collectAsStateWithLifecycle()
    var showResidentFlow by remember { mutableStateOf(false) }
    var showResidentHistory by remember { mutableStateOf(false) }
    val residentPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) ResidentImportFileManager.inspect(context, uri)
            .onSuccess { viewModel.select(it); showResidentFlow = true }
            .onFailure { Toast.makeText(context, it.message ?: "Invalid file", Toast.LENGTH_LONG).show() }
    }

    LaunchedEffect(event) {
        val download = event as? ResidentImportEvent.Download ?: return@LaunchedEffect
        runCatching { ExcelFileManager.save(context, download.body, download.name) }
            .onSuccess { Toast.makeText(context, "Saved ${it.name}", Toast.LENGTH_LONG).show() }
            .onFailure { Toast.makeText(context, it.message ?: "Download failed", Toast.LENGTH_LONG).show() }
        viewModel.clearEvent()
    }

    if (state.confirm) AlertDialog(
        onDismissRequest = { viewModel.showConfirm(false) },
        title = { Text("Confirm resident import") },
        text = { Text("Import ${state.preview?.validRows ?: 0} valid rows? Existing residents will not be overwritten.") },
        confirmButton = { Button(onClick = viewModel::confirm) { Text("Confirm") } },
        dismissButton = { TextButton(onClick = { viewModel.showConfirm(false) }) { Text("Cancel") } }
    )

    Scaffold(topBar = {
        TopAppBar(
            title = { Column { Text("Data Import", fontWeight = FontWeight.Bold); Text("Secure admin imports", style = MaterialTheme.typography.bodySmall) } },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back") } }
        )
    }) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item {
                ImportModuleCard(
                    title = "Import Residents",
                    description = "Validate resident and flat details, preview errors, then confirm the valid records.",
                    busy = state.busy,
                    onImport = { residentPicker.launch(arrayOf(ResidentImportFileManager.XLSX, ResidentImportFileManager.XLS, ResidentImportFileManager.CSV, "text/csv")) },
                    onTemplate = viewModel::template,
                    onHistory = { showResidentHistory = !showResidentHistory; if (showResidentHistory) viewModel.history() }
                )
            }
            if (showResidentFlow) item {
                ResidentImportPanel(
                    state = state,
                    onPreview = { state.selected?.let { viewModel.preview(ResidentImportFileManager.multipart(context, it)) } },
                    onConfirm = { viewModel.showConfirm(true) },
                    onErrors = viewModel::errors,
                    onClose = { if (!state.busy) showResidentFlow = false }
                )
            }
            if (showResidentHistory) {
                item { Text("Resident Import History", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
                if (state.history.isEmpty()) item { Text("No resident imports found.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                items(state.history, key = { it.id }) { batch ->
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                        Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text(batch.fileName ?: "Resident import", fontWeight = FontWeight.SemiBold)
                            Text("${batch.status.orEmpty()} · ${batch.imported}/${batch.totalRows} imported · ${batch.skipped} skipped · ${batch.failed} failed", style = MaterialTheme.typography.bodySmall)
                            Text("By ${batch.uploadedBy ?: "Admin"} · ${batch.createdAt?.take(16)?.replace('T', ' ') ?: ""}", style = MaterialTheme.typography.labelSmall)
                            if (batch.invalidRows + batch.duplicateRows > 0) TextButton(onClick = { viewModel.downloadErrors(batch.id) }) { Text("Download error report") }
                        }
                    }
                }
            }
            item {
                ImportModuleCard(
                    title = "Import Maintenance Transactions",
                    description = "Validate payment transactions, preview row errors, confirm imports, and review history.",
                    busy = false,
                    onImport = onMaintenanceTransactions,
                    onTemplate = onMaintenanceTransactions,
                    onHistory = onMaintenanceTransactions
                )
            }
            state.error?.let { item { Text(it, color = MaterialTheme.colorScheme.error) } }
        }
    }
}

@Composable
private fun ImportModuleCard(title:String, description:String, busy:Boolean, onImport:()->Unit, onTemplate:()->Unit, onHistory:()->Unit) {
    Card(shape = RoundedCornerShape(18.dp), elevation = CardDefaults.cardElevation(2.dp)) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(description, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Button(onClick = onImport, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.UploadFile, null); Spacer(Modifier.width(8.dp)); Text("Import Excel") }
            OutlinedButton(onClick = onTemplate, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.Download, null); Spacer(Modifier.width(8.dp)); Text("Download Template") }
            TextButton(onClick = onHistory, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.History, null); Spacer(Modifier.width(8.dp)); Text("Import History") }
        }
    }
}

@Composable
private fun ResidentImportPanel(state:com.example.application.viewmodel.ResidentImportState,onPreview:()->Unit,onConfirm:()->Unit,onErrors:()->Unit,onClose:()->Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)) {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(state.selected?.name ?: "Resident file", fontWeight = FontWeight.Bold)
            if (state.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            state.preview?.let { p ->
                Text("Total ${p.totalRows} · Valid ${p.validRows} · Invalid ${p.invalidRows} · Duplicates ${p.duplicateRows}", fontWeight = FontWeight.SemiBold)
                p.rows.take(20).forEach { row ->
                    Text("Row ${row.rowNumber}: ${row.validationResult}${row.validationMessage?.let { " · $it" }.orEmpty()}", style = MaterialTheme.typography.bodySmall, color = if (row.validationResult == "VALID") Color(0xFF15803D) else MaterialTheme.colorScheme.error)
                }
                if (p.invalidRows + p.duplicateRows > 0) OutlinedButton(onClick = onErrors) { Text("Download error report") }
            }
            state.result?.let { Text("Successfully imported ${it.successfullyImported} · Skipped ${it.skipped} · Failed ${it.failed}", fontWeight = FontWeight.Bold) }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (state.preview == null) Button(onClick = onPreview, enabled = !state.busy) { Text("Preview") }
                else if (state.result == null) Button(onClick = onConfirm, enabled = !state.busy && state.preview.validRows > 0) { Text("Import valid rows") }
                TextButton(onClick = onClose, enabled = !state.busy) { Text("Close") }
            }
        }
    }
}
