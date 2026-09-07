package com.example.application.ui.screens.maintenance

import android.content.ActivityNotFoundException
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.FileOpen
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.R
import com.example.application.data.remote.dto.ExcelImportPreviewRowDto
import com.example.application.util.ExcelFileManager
import com.example.application.viewmodel.ExcelTransactionEvent
import com.example.application.viewmodel.ExcelTransactionsViewModel
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExcelTransactionsScreen(
    onBack: () -> Unit,
    viewModel: ExcelTransactionsViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val state by viewModel.state.collectAsStateWithLifecycle()
    val event by viewModel.event.collectAsStateWithLifecycle()
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            runCatching { context.contentResolver.takePersistableUriPermission(uri, android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION) }
            ExcelFileManager.inspect(context, uri).fold(viewModel::setFile) {
                Toast.makeText(context, it.message ?: "Invalid workbook", Toast.LENGTH_LONG).show()
            }
        }
    }

    LaunchedEffect(event) {
        val download = event as? ExcelTransactionEvent.Download ?: return@LaunchedEffect
        runCatching { ExcelFileManager.save(context, download.body, download.fileName) }
            .onSuccess { file ->
                Toast.makeText(context, "Saved ${file.name} in Downloads/SocietyHub", Toast.LENGTH_LONG).show()
                runCatching { ExcelFileManager.open(context, file) }.onFailure {
                    if (it !is ActivityNotFoundException) Toast.makeText(context, it.message, Toast.LENGTH_LONG).show()
                }
            }
            .onFailure { Toast.makeText(context, it.message ?: "Download failed", Toast.LENGTH_LONG).show() }
        viewModel.clearEvent()
    }

    if (state.confirmDialog) {
        AlertDialog(
            onDismissRequest = { viewModel.showConfirm(false) },
            title = { Text(stringResource(R.string.excel_confirm_title)) },
            text = { Text(stringResource(R.string.excel_confirm_message, state.preview?.validRows ?: 0)) },
            confirmButton = { Button(onClick = viewModel::confirm) { Text(stringResource(R.string.excel_confirm)) } },
            dismissButton = { TextButton(onClick = { viewModel.showConfirm(false) }) { Text(stringResource(R.string.cancel)) } }
        )
    }

    Scaffold(topBar = {
        TopAppBar(
            title = { Column { Text(stringResource(R.string.excel_transactions), fontWeight = FontWeight.Bold); Text(stringResource(R.string.excel_subtitle), style = MaterialTheme.typography.bodySmall) } },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, stringResource(R.string.back)) } }
        )
    }) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            state.message?.let { item { NoticeCard(it, false, viewModel::clearNotice) } }
            state.error?.let { item { NoticeCard(it, true, viewModel::clearNotice) } }

            item {
                SectionCard(stringResource(R.string.excel_downloads)) {
                    Text(stringResource(R.string.excel_download_help), style = MaterialTheme.typography.bodyMedium)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = viewModel::downloadTemplate, enabled = !state.busy, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Default.Download, null); Text(stringResource(R.string.excel_template), modifier = Modifier.padding(start = 6.dp))
                        }
                        Button(onClick = viewModel::export, enabled = !state.busy, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Default.Download, null); Text(stringResource(R.string.excel_export), modifier = Modifier.padding(start = 6.dp))
                        }
                    }
                }
            }

            item {
                SectionCard(stringResource(R.string.excel_filters)) {
                    val f = state.filters
                    OutlinedTextField(f.from, { viewModel.setFilters(f.copy(from = it)) }, label = { Text(stringResource(R.string.excel_from_date)) }, placeholder = { Text("YYYY-MM-DD") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(f.to, { viewModel.setFilters(f.copy(to = it)) }, label = { Text(stringResource(R.string.excel_to_date)) }, placeholder = { Text("YYYY-MM-DD") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(f.wing, { viewModel.setFilters(f.copy(wing = it)) }, label = { Text(stringResource(R.string.excel_wing)) }, modifier = Modifier.weight(1f), singleLine = true)
                        OutlinedTextField(f.flat, { viewModel.setFilters(f.copy(flat = it)) }, label = { Text(stringResource(R.string.excel_flat)) }, modifier = Modifier.weight(1f), singleLine = true)
                    }
                    OutlinedTextField(f.status, { viewModel.setFilters(f.copy(status = it)) }, label = { Text(stringResource(R.string.excel_status)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    TextButton(onClick = viewModel::clearFilters) { Text(stringResource(R.string.excel_clear_filters)) }
                }
            }

            item {
                SectionCard(stringResource(R.string.excel_import)) {
                    OutlinedButton(onClick = { picker.launch(arrayOf(ExcelFileManager.XLSX_MIME, ExcelFileManager.XLS_MIME)) }, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Default.FileOpen, null); Text(stringResource(R.string.excel_select_file), modifier = Modifier.padding(start = 8.dp))
                    }
                    state.selectedFile?.let { selected ->
                        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)) {
                            Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text(selected.name, fontWeight = FontWeight.SemiBold)
                                    Text(fileSize(selected.size), style = MaterialTheme.typography.bodySmall)
                                }
                                IconButton(onClick = { viewModel.setFile(null) }) { Icon(Icons.Default.Close, stringResource(R.string.excel_remove_file)) }
                            }
                        }
                        Button(
                            onClick = { viewModel.preview(ExcelFileManager.multipart(context, selected)) },
                            enabled = !state.busy,
                            modifier = Modifier.fillMaxWidth()
                        ) { Icon(Icons.Default.UploadFile, null); Text(stringResource(R.string.excel_upload_preview), modifier = Modifier.padding(start = 8.dp)) }
                    }
                }
            }

            if (state.busy) item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) { CircularProgressIndicator() } }

            state.preview?.let { preview ->
                item {
                    SectionCard(stringResource(R.string.excel_validation_summary)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            SummaryValue(stringResource(R.string.excel_total), preview.totalRows, MaterialTheme.colorScheme.primary)
                            SummaryValue(stringResource(R.string.excel_valid), preview.validRows, Color(0xFF15803D))
                            SummaryValue(stringResource(R.string.excel_invalid), preview.invalidRows, MaterialTheme.colorScheme.error)
                            SummaryValue(stringResource(R.string.excel_warnings), preview.warningRows, Color(0xFFB45309))
                        }
                        preview.totalValidAmount?.let { Text("Valid amount: ₹$it", fontWeight = FontWeight.SemiBold) }
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("All", "Valid", "Invalid", "Warning").forEach { value ->
                            FilterChip(selected = state.previewFilter == value, onClick = { viewModel.setPreviewFilter(value) }, label = { Text(value) })
                        }
                    }
                }
                val rows = preview.rows.filter { state.previewFilter == "All" || it.result().equals(state.previewFilter, true) }
                items(rows, key = { "${it.rowNumber}-${it.memberName}-${it.transactionDate}" }) { PreviewRow(it) }
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (preview.invalidRows > 0) OutlinedButton(onClick = viewModel::downloadErrors, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.excel_error_report)) }
                        Button(
                            onClick = { viewModel.showConfirm(true) },
                            enabled = !state.busy && preview.validRows > 0 && preview.batchId.isNotBlank() && state.confirmation == null,
                            modifier = Modifier.fillMaxWidth()
                        ) { Text(if (state.confirmation == null) stringResource(R.string.excel_confirm_import) else stringResource(R.string.excel_import_completed)) }
                    }
                }
            }
            item {
                SectionCard(stringResource(R.string.excel_import_history)) {
                    if (state.history.isEmpty()) {
                        Text(stringResource(R.string.excel_no_import_history), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        state.history.take(10).forEach { batch ->
                            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                                Column(Modifier.fillMaxWidth().padding(10.dp)) {
                                    Text(batch.fileName ?: "Import #${batch.id}", fontWeight = FontWeight.SemiBold)
                                    Text("${batch.status.orEmpty()} · ${batch.imported}/${batch.totalRows} imported · ${batch.failed} failed", style = MaterialTheme.typography.bodySmall)
                                    batch.createdAt?.let { Text(it.take(16).replace('T', ' '), style = MaterialTheme.typography.labelSmall) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable private fun SectionCard(title: String, content: @Composable ColumnScope.() -> Unit) = Card(shape = RoundedCornerShape(16.dp)) {
    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) { Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold); content() }
}

@Composable private fun NoticeCard(message: String, error: Boolean, dismiss: () -> Unit) = Card(colors = CardDefaults.cardColors(containerColor = if (error) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.primaryContainer)) {
    Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) { Text(message, Modifier.weight(1f)); IconButton(onClick = dismiss) { Icon(Icons.Default.Close, null) } }
}

@Composable private fun SummaryValue(label: String, value: Int, color: Color) = Column(horizontalAlignment = Alignment.CenterHorizontally) { Text(value.toString(), color = color, fontWeight = FontWeight.Bold); Text(label, style = MaterialTheme.typography.labelSmall) }

@Composable private fun PreviewRow(row: ExcelImportPreviewRowDto) {
    val result = row.result()
    val color = when { result.equals("Valid", true) -> Color(0xFF15803D); result.equals("Warning", true) -> Color(0xFFB45309); else -> MaterialTheme.colorScheme.error }
    val icon = when { result.equals("Valid", true) -> Icons.Default.CheckCircle; result.equals("Warning", true) -> Icons.Default.Warning; else -> Icons.Default.Error }
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) { Icon(icon, null, tint = color); Text(" Row ${row.rowNumber} · $result", color = color, fontWeight = FontWeight.Bold) }
            Text(row.memberName ?: "Unknown member", fontWeight = FontWeight.SemiBold)
            Text(listOfNotNull(row.wing?.let { "Wing $it" }, row.flatNumber?.let { "Flat $it" }, row.transactionDate, row.paymentMode).joinToString(" · "), style = MaterialTheme.typography.bodySmall)
            row.amount?.let { Text("₹$it · ${row.status.orEmpty()} · ${row.importAction.orEmpty()}") }
            row.validationMessage?.takeIf(String::isNotBlank)?.let { Text(it, color = color, style = MaterialTheme.typography.bodySmall) }
        }
    }
}

private fun ExcelImportPreviewRowDto.result() = validationResult?.ifBlank { null } ?: "Invalid"
private fun fileSize(bytes: Long): String = if (bytes < 0) "Size unavailable" else String.format(Locale.US, "%.1f MB", bytes / 1024.0 / 1024.0)
