package com.example.application.ui.screens.noc

import android.net.Uri
import android.content.Intent
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.data.remote.dto.NocRequestDto
import com.example.application.ui.components.AppRoleTheme
import com.example.application.ui.components.AppTopBar
import com.example.application.ui.components.DashboardSkeleton
import com.example.application.ui.components.EmptyState
import com.example.application.ui.components.KeyValue
import com.example.application.ui.components.RetryState
import com.example.application.viewmodel.AdminNocViewModel
import com.example.application.viewmodel.ResidentNocViewModel
import java.io.ByteArrayOutputStream

private val NocTypes = listOf("Address Proof", "Vehicle NOC", "Tenant NOC", "Sale/Transfer NOC", "Other")
private val NocStatuses = listOf("All", "Pending", "Under Review", "Approved", "Rejected", "Cancelled")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResidentNocScreen(
    onBack: () -> Unit,
    viewModel: ResidentNocViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showCreate by remember { mutableStateOf(false) }
    val context = LocalContext.current

    LaunchedEffect(state.certificateUri) {
        state.certificateUri?.let { uri ->
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri)).apply {
                type = "text/html"
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            })
        }
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "NOC Requests",
                subtitle = "Apply and track society NOC",
                role = AppRoleTheme.Resident,
                navigationIcon = Icons.Filled.ArrowBack,
                navigationText = "Back",
                onNavigationClick = onBack,
                actionIcon = Icons.Filled.Description,
                actionText = "New",
                onActionClick = { showCreate = true }
            )
        }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.isRefreshing,
            onRefresh = { viewModel.load(refresh = true) },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                state.isLoading && state.items.isEmpty() -> DashboardSkeleton()
                state.error != null && state.items.isEmpty() -> Column(Modifier.padding(20.dp)) {
                    RetryState(message = state.error.orEmpty(), onRetry = { viewModel.load(refresh = true) })
                }
                state.items.isEmpty() -> Column(Modifier.padding(20.dp)) {
                    EmptyState("No NOC requests yet", "Tap the document icon to create your first request.")
                }
                else -> NocList(
                    items = state.items,
                    modifier = Modifier.fillMaxSize(),
                    onCancel = { viewModel.cancel(it) },
                    onDownload = { id, number -> viewModel.downloadCertificate(id, number) }
                )
            }
        }
    }

    if (showCreate) {
        CreateNocDialog(
            submitting = state.submitting,
            onDismiss = { showCreate = false },
            onSubmit = { type, purpose, remarks, documentData ->
                viewModel.createNoc(type, purpose, remarks, documentData)
                showCreate = false
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminNocScreen(
    onBack: () -> Unit,
    viewModel: AdminNocViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var reviewTarget by remember { mutableStateOf<NocRequestDto?>(null) }
    var reviewStatus by remember { mutableStateOf("Approved") }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "NOC Approvals",
                subtitle = "Review resident certificate requests",
                role = AppRoleTheme.Admin,
                navigationIcon = Icons.Filled.ArrowBack,
                navigationText = "Back",
                onNavigationClick = onBack
            )
        }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.isRefreshing,
            onRefresh = { viewModel.load(refresh = true) },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        NocStatuses.forEach { status ->
                            FilterChip(
                                selected = state.filter == status,
                                onClick = { viewModel.setFilter(status) },
                                label = { Text(status) }
                            )
                        }
                    }
                }
                if (state.isLoading && state.items.isEmpty()) {
                    item { DashboardSkeleton() }
                } else if (state.error != null && state.items.isEmpty()) {
                    item { RetryState(message = state.error.orEmpty(), onRetry = { viewModel.load(refresh = true) }) }
                } else if (state.items.isEmpty()) {
                    item { EmptyState("No NOC requests", "Requests will appear here when residents submit them.") }
                } else {
                    items(state.items, key = { it.id ?: it.hashCode() }) { item ->
                        NocCard(
                            item = item,
                            admin = true,
                            onApprove = {
                                reviewTarget = item
                                reviewStatus = "Approved"
                            },
                            onReject = {
                                reviewTarget = item
                                reviewStatus = "Rejected"
                            }
                        )
                    }
                }
                state.message?.let { item { Text(it, color = MaterialTheme.colorScheme.primary) } }
                state.error?.let { item { Text(it, color = MaterialTheme.colorScheme.error) } }
            }
        }
    }

    reviewTarget?.let { item ->
        ReviewNocDialog(
            status = reviewStatus,
            submitting = state.submitting,
            onDismiss = { reviewTarget = null },
            onSubmit = { comments ->
                viewModel.review(item.id.orEmpty(), reviewStatus, comments)
                reviewTarget = null
            }
        )
    }
}

@Composable
private fun NocList(
    items: List<NocRequestDto>,
    modifier: Modifier = Modifier,
    onCancel: (String) -> Unit,
    onDownload: (String, String?) -> Unit
) {
    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(items, key = { it.id ?: it.hashCode() }) { item ->
            NocCard(item = item, admin = false, onCancel = { onCancel(item.id.orEmpty()) }, onDownload = { onDownload(item.id.orEmpty(), item.nocNumber) })
        }
    }
}

@Composable
private fun NocCard(
    item: NocRequestDto,
    admin: Boolean,
    onCancel: (() -> Unit)? = null,
    onApprove: (() -> Unit)? = null,
    onReject: (() -> Unit)? = null,
    onDownload: (() -> Unit)? = null
) {
    val status = item.status ?: "Pending"
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(item.nocType ?: "NOC Request", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                StatusChip(status)
            }
            KeyValue("Purpose", item.purpose ?: "-")
            if (admin) {
                KeyValue("Resident", item.residentName ?: "-")
                KeyValue("Flat", listOfNotNull(item.wing, item.flatNo).joinToString("-").ifBlank { "-" })
            }
            item.description?.takeIf { it.isNotBlank() }?.let { KeyValue("Description", it) }
            KeyValue("Created", shortDate(item.createdAt))
            item.nocNumber?.let { KeyValue("NOC number", it) }
            item.adminComments?.takeIf { it.isNotBlank() }?.let { KeyValue("Admin note", it) }
            if (!admin && status in listOf("Draft", "Pending", "Under Review")) {
                OutlinedButton(onClick = { onCancel?.invoke() }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Filled.Cancel, contentDescription = null)
                    Text("Cancel Request", modifier = Modifier.padding(start = 8.dp))
                }
            }
            if (!admin && status == "Approved") {
                Button(onClick = { onDownload?.invoke() }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Filled.Description, contentDescription = null)
                    Text("Download NOC Certificate", modifier = Modifier.padding(start = 8.dp))
                }
            }
            if (admin && status !in listOf("Approved", "Rejected", "Cancelled")) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Button(onClick = { onApprove?.invoke() }, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Filled.Done, contentDescription = null)
                        Text("Approve", modifier = Modifier.padding(start = 6.dp))
                    }
                    OutlinedButton(onClick = { onReject?.invoke() }, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Filled.Cancel, contentDescription = null)
                        Text("Reject", modifier = Modifier.padding(start = 6.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun CreateNocDialog(
    submitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (String, String, String, List<String>) -> Unit
) {
    val context = LocalContext.current
    var selectedType by remember { mutableStateOf(NocTypes.first()) }
    var purpose by remember { mutableStateOf("") }
    var remarks by remember { mutableStateOf("") }
    var menuExpanded by remember { mutableStateOf(false) }
    var documentNames by remember { mutableStateOf<List<String>>(emptyList()) }
    var documentData by remember { mutableStateOf<List<String>>(emptyList()) }
    var localError by remember { mutableStateOf<String?>(null) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
        runCatching {
            if (uris.size > 3) error("Please select up to 3 documents.")
            val resolver = context.contentResolver
            val encoded = uris.map { uri ->
                val bytes = resolver.openInputStream(uri)?.use { input ->
                    val output = ByteArrayOutputStream()
                    input.copyTo(output)
                    output.toByteArray()
                } ?: ByteArray(0)
                if (bytes.size > 5 * 1024 * 1024) error("Each document must be smaller than 5 MB.")
                val mime = resolver.getType(uri) ?: "application/octet-stream"
                "data:$mime;base64,${Base64.encodeToString(bytes, Base64.NO_WRAP)}"
            }
            documentNames = uris.map { it.lastPathSegment ?: "Selected document" }
            documentData = encoded
            localError = null
        }.onFailure { localError = it.message ?: "Unable to read selected documents." }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Apply for NOC") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("NOC Type", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                Box {
                    OutlinedTextField(
                        value = selectedType,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Select NOC type") },
                        modifier = Modifier.fillMaxWidth().clickable { menuExpanded = !menuExpanded }
                    )
                    DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                        NocTypes.forEach { type ->
                            DropdownMenuItem(text = { Text(type) }, onClick = { selectedType = type; menuExpanded = false })
                        }
                    }
                }
                OutlinedTextField(value = purpose, onValueChange = { purpose = it }, label = { Text("Purpose") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
                OutlinedTextField(
                    value = remarks,
                    onValueChange = { remarks = it },
                    label = { Text("Remarks") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3
                )
                OutlinedButton(onClick = { picker.launch("*/*") }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Filled.UploadFile, contentDescription = null)
                    Text(if (documentNames.isEmpty()) "Required documents" else "${documentNames.size} document(s) selected", modifier = Modifier.padding(start = 8.dp))
                }
                if (documentNames.isNotEmpty()) Text(documentNames.joinToString("\n"), style = MaterialTheme.typography.bodySmall)
                localError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            }
        },
        confirmButton = {
            Button(
                onClick = { onSubmit(selectedType, purpose, remarks, documentData) },
                enabled = !submitting && purpose.isNotBlank() && documentData.isNotEmpty()
            ) { Text(if (submitting) "Submitting..." else "Submit Request") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
private fun ReviewNocDialog(
    status: String,
    submitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (String?) -> Unit
) {
    var comments by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("$status NOC") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Add a short admin note for the resident.")
                OutlinedTextField(
                    value = comments,
                    onValueChange = { comments = it },
                    label = { Text("Admin comments") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3
                )
            }
        },
        confirmButton = {
            Button(onClick = { onSubmit(comments.takeIf { it.isNotBlank() }) }, enabled = !submitting) {
                Text(if (submitting) "Saving..." else status)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
private fun StatusChip(status: String) {
    val color = when (status) {
        "Approved" -> Color(0xFF1B8F4D)
        "Rejected", "Cancelled" -> Color(0xFFD14343)
        "Under Review" -> Color(0xFF8A5A00)
        else -> Color(0xFF0B5FFF)
    }
    AssistChip(onClick = {}, label = { Text(status, color = color) })
}

private fun shortDate(value: String?): String {
    if (value.isNullOrBlank()) return "-"
    return value.take(10)
}
