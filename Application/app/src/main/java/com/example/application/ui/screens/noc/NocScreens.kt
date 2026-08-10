package com.example.application.ui.screens.noc

import android.net.Uri
import android.content.Intent
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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
import com.example.application.viewmodel.PublicNocViewModel
import com.example.application.viewmodel.ResidentNocViewModel
import java.io.ByteArrayOutputStream


private val NocTypes = listOf("Address Proof", "Vehicle NOC", "Tenant NOC", "Sale/Transfer NOC", "Sell", "Rent", "Renovation", "Passport", "Electricity", "Gift", "Other")
private val NocStatuses = listOf("All", "Pending", "Submitted", "Under Review", "Additional Information Required", "Approved", "Completed", "Rejected", "Cancelled")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PublicNocCertificateScreen(
    token: String,
    onBack: () -> Unit,
    viewModel: PublicNocViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(token) {
        if (token.isNotBlank()) viewModel.load(token)
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "Shared NOC Certificate",
                subtitle = "Verify public NOC by token",
                role = AppRoleTheme.Resident,
                navigationIcon = Icons.Filled.ArrowBack,
                navigationText = "Back",
                onNavigationClick = onBack
            )
        }
    ) { padding ->
        Column(
            Modifier.fillMaxSize().padding(padding).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedTextField(
                value = state.token,
                onValueChange = viewModel::setToken,
                label = { Text("Share token or /share/noc link") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Button(onClick = { viewModel.load() }, enabled = !state.loading, modifier = Modifier.fillMaxWidth()) {
                Text(if (state.loading) "Fetching Certificate..." else "View Certificate", fontWeight = FontWeight.Bold)
            }
            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            state.certificate?.let { certificate ->
                val details = certificate.certificate
                Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(22.dp)) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(certificate.society?.name ?: "Society Management System", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text("NOC Certificate", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                        KeyValue("Request number", details?.requestNumber ?: "-")
                        KeyValue("Verification number", details?.verificationNumber ?: "-")
                        KeyValue("Type", details?.nocType ?: "-")
                        KeyValue("Purpose", details?.purpose ?: "-")
                        KeyValue("Resident", details?.residentName ?: "-")
                        KeyValue("Flat", listOfNotNull(details?.wing, details?.flatNo).joinToString("-").ifBlank { "-" })
                        KeyValue("Issued", shortDate(details?.issueDate))
                        KeyValue("Expires", shortDate(details?.expiryDate))
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResidentNocScreen(
    onBack: () -> Unit,
    viewModel: ResidentNocViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showCreate by remember { mutableStateOf(false) }
    var uploadTarget by remember { mutableStateOf<NocRequestDto?>(null) }
    var previewTarget by remember { mutableStateOf<NocRequestDto?>(null) }
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }

    fun openCreateRequest() {
        viewModel.prepareCreate()
        showCreate = true
    }

    LaunchedEffect(state.error, state.message) {
        (state.error ?: state.message)?.let { snackbarHostState.showSnackbar(it) }
    }

    LaunchedEffect(state.message) {
        if (showCreate && state.message?.contains("submitted", ignoreCase = true) == true) {
            showCreate = false
        }
    }

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
                actionIcon = Icons.Filled.Add,
                actionText = "Request",
                onActionClick = ::openCreateRequest
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = ::openCreateRequest,
                icon = { Icon(Icons.Filled.Add, contentDescription = null) },
                text = { Text("Request NOC", fontWeight = FontWeight.Bold) }
            )
        }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.isRefreshing,
            onRefresh = { viewModel.load(refresh = true) },
            indicator = {},
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
                    EmptyState("No NOC requests yet", "Create your first request and track its approval here.")
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = ::openCreateRequest, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Filled.Add, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Request NOC")
                    }
                }
                else -> NocList(
                    items = state.items,
                    modifier = Modifier.fillMaxSize(),
                    onCancel = { viewModel.cancel(it) },
                    onDownload = { id, number -> viewModel.downloadCertificate(id, number) },
                    onUploadInfo = { uploadTarget = it },
                    onPreviewCertificate = { previewTarget = it }
                )
            }
        }
    }

    if (showCreate) {
        CreateNocDialog(
            submitting = state.submitting,
            serverError = state.error,
            onDismiss = { showCreate = false },
            onSubmit = { type, purpose, remarks, documentData ->
                viewModel.createNoc(type, purpose, remarks, documentData)
            }
        )
    }
    uploadTarget?.let { request ->
        NocUploadInfoDialog(
            submitting = state.submitting,
            onDismiss = { uploadTarget = null },
            onSubmit = { remarks, docs ->
                viewModel.uploadInfo(request.id.orEmpty(), remarks, docs)
                uploadTarget = null
            }
        )
    }
    previewTarget?.let { request ->
        NocCertificateDocumentPreviewDialog(
            item = request,
            onDismiss = { previewTarget = null },
            onDownload = {
                viewModel.downloadCertificate(request.id.orEmpty(), request.nocNumber)
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
            indicator = {},
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
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())) {
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
                            onReview = {
                                reviewTarget = item
                                reviewStatus = "Under Review"
                            },
                            onRequestInfo = {
                                reviewTarget = item
                                reviewStatus = "Additional Information Required"
                            },
                            onApprove = {
                                reviewTarget = item
                                reviewStatus = "Approved"
                            },
                            onReject = {
                                reviewTarget = item
                                reviewStatus = "Rejected"
                            },
                            onComplete = {
                                reviewTarget = item
                                reviewStatus = "Completed"
                            },
                            onShare = {
                                item.id?.let(viewModel::share)
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
    onDownload: (String, String?) -> Unit,
    onUploadInfo: (NocRequestDto) -> Unit,
    onPreviewCertificate: (NocRequestDto) -> Unit
) {
    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(start = 20.dp, top = 20.dp, end = 20.dp, bottom = 104.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(items, key = { it.id ?: it.hashCode() }) { item ->
            NocCard(
                item = item,
                admin = false,
                onCancel = { onCancel(item.id.orEmpty()) },
                onDownload = { onDownload(item.id.orEmpty(), item.nocNumber) },
                onUploadInfo = { onUploadInfo(item) },
                onPreviewCertificate = { onPreviewCertificate(item) }
            )
        }
    }
}

@Composable
private fun NocCard(
    item: NocRequestDto,
    admin: Boolean,
    onCancel: (() -> Unit)? = null,
    onReview: (() -> Unit)? = null,
    onRequestInfo: (() -> Unit)? = null,
    onApprove: (() -> Unit)? = null,
    onReject: (() -> Unit)? = null,
    onComplete: (() -> Unit)? = null,
    onShare: (() -> Unit)? = null,
    onDownload: (() -> Unit)? = null,
    onUploadInfo: (() -> Unit)? = null,
    onPreviewCertificate: (() -> Unit)? = null
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
            if (!admin && status in listOf("Draft", "Pending", "Submitted", "Under Review")) {
                OutlinedButton(onClick = { onCancel?.invoke() }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Filled.Cancel, contentDescription = null)
                    Text("Cancel Request", modifier = Modifier.padding(start = 8.dp))
                }
            }
            if (!admin && status == "Additional Information Required") {
                Button(onClick = { onUploadInfo?.invoke() }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Filled.UploadFile, contentDescription = null)
                    Text("Upload Requested Info", modifier = Modifier.padding(start = 8.dp))
                }
            }
            if (!admin && (status == "Approved" || status == "Completed")) {
                Button(
                    onClick = { onPreviewCertificate?.invoke() ?: onDownload?.invoke() },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0B5FFF))
                ) {
                    Icon(Icons.Filled.Description, contentDescription = null)
                    Text("View NOC Certificate", fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 8.dp))
                }
            }
            if (admin && status !in listOf("Approved", "Completed", "Rejected", "Cancelled")) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    OutlinedButton(onClick = { onReview?.invoke() }, modifier = Modifier.weight(1f)) {
                        Text("Review")
                    }
                    OutlinedButton(onClick = { onRequestInfo?.invoke() }, modifier = Modifier.weight(1f)) {
                        Text("Need Info")
                    }
                }
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
            if (admin && status == "Approved") {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    OutlinedButton(onClick = { onShare?.invoke() }, modifier = Modifier.weight(1f)) {
                        Text("Share Link")
                    }
                    Button(onClick = { onComplete?.invoke() }, modifier = Modifier.weight(1f)) {
                        Text("Complete")
                    }
                }
            }
        }
    }
}

@Composable
private fun CreateNocDialog(
    submitting: Boolean,
    serverError: String?,
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
            var totalBytes = 0L
            val encoded = uris.map { uri ->
                val size = resolver.query(uri, arrayOf(android.provider.OpenableColumns.SIZE), null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val idx = cursor.getColumnIndex(android.provider.OpenableColumns.SIZE)
                        if (idx != -1) cursor.getLong(idx) else 0L
                    } else 0L
                } ?: 0L
                if (size > 5 * 1024 * 1024) error("Each document must be smaller than 5 MB.")
                val bytes = resolver.openInputStream(uri)?.use { input ->
                    val output = ByteArrayOutputStream()
                    input.copyTo(output)
                    output.toByteArray()
                } ?: ByteArray(0)
                if (bytes.size > 5 * 1024 * 1024) error("Each document must be smaller than 5 MB.")
                totalBytes += bytes.size
                if (totalBytes > 6 * 1024 * 1024) error("The combined attachments must be smaller than 6 MB.")
                val mime = resolver.getType(uri) ?: "application/octet-stream"
                "data:$mime;base64,${Base64.encodeToString(bytes, Base64.NO_WRAP)}"
            }
            documentNames = uris.map { it.lastPathSegment ?: "Selected document" }
            documentData = encoded
            localError = null
        }.onFailure { localError = it.message ?: "Unable to read selected documents." }
    }

    AlertDialog(
        onDismissRequest = { if (!submitting) onDismiss() },
        title = { Text("Apply for NOC", fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text("NOC Type", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                Box {
                    OutlinedTextField(
                        value = selectedType,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Select NOC type") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp)
                    )
                    Box(
                        modifier = Modifier
                            .matchParentSize()
                            .clickable(enabled = !submitting) { menuExpanded = !menuExpanded }
                    )
                    DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                        NocTypes.forEach { type ->
                            DropdownMenuItem(
                                text = { Text(type) },
                                onClick = { selectedType = type; menuExpanded = false }
                            )
                        }
                    }
                }
                OutlinedTextField(
                    value = purpose,
                    onValueChange = { purpose = it },
                    label = { Text("Purpose *") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    maxLines = 4,
                    enabled = !submitting,
                    shape = RoundedCornerShape(14.dp)
                )
                OutlinedTextField(
                    value = remarks,
                    onValueChange = { remarks = it },
                    label = { Text("Additional Details / Remarks (Optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    maxLines = 4,
                    enabled = !submitting,
                    shape = RoundedCornerShape(14.dp)
                )
                OutlinedButton(
                    onClick = { picker.launch("*/*") },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !submitting,
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(Icons.Filled.UploadFile, contentDescription = null)
                    Text(
                        text = if (documentNames.isEmpty()) "Attach Documents (Optional)" else "${documentNames.size} document(s) selected",
                        modifier = Modifier.padding(start = 8.dp)
                    )
                }
                if (documentNames.isNotEmpty()) {
                    Text(documentNames.joinToString("\n"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                localError?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                serverError?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            Button(
                onClick = { onSubmit(selectedType, purpose, remarks, documentData) },
                enabled = !submitting && purpose.isNotBlank(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(if (submitting) "Submitting NOC Request..." else "Submit Request", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !submitting) { Text("Cancel") }
        }
    )
}

@Composable
private fun NocUploadInfoDialog(
    submitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (String, List<String>) -> Unit
) {
    val context = LocalContext.current
    var remarks by remember { mutableStateOf("") }
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
        title = { Text("Upload Requested Info") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = remarks,
                    onValueChange = { remarks = it },
                    label = { Text("Remarks") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3
                )
                OutlinedButton(onClick = { picker.launch("*/*") }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Filled.UploadFile, contentDescription = null)
                    Text(if (documentNames.isEmpty()) "Select documents" else "${documentNames.size} document(s) selected", modifier = Modifier.padding(start = 8.dp))
                }
                if (documentNames.isNotEmpty()) Text(documentNames.joinToString("\n"), style = MaterialTheme.typography.bodySmall)
                localError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            }
        },
        confirmButton = {
            Button(
                onClick = { onSubmit(remarks, documentData) },
                enabled = !submitting && (remarks.isNotBlank() || documentData.isNotEmpty())
            ) { Text(if (submitting) "Uploading..." else "Submit Info") }
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
            Button(
                onClick = { onSubmit(comments.takeIf { it.isNotBlank() }) },
                enabled = !submitting,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (status == "Rejected") MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                )
            ) {
                Text(if (submitting) "Saving..." else status)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}


@Composable
private fun StatusChip(status: String) {
    val color = when (status) {
        "Approved", "Completed" -> Color(0xFF1B8F4D)
        "Rejected", "Cancelled" -> Color(0xFFD14343)
        "Under Review", "Additional Information Required" -> Color(0xFF8A5A00)
        else -> Color(0xFF0B5FFF)
    }
    AssistChip(onClick = {}, label = { Text(status, color = color) })
}

private fun shortDate(value: String?): String {
    if (value.isNullOrBlank()) return "-"
    return value.take(10)
}

@Composable
fun NocCertificateDocumentPreviewDialog(
    item: NocRequestDto,
    onDismiss: () -> Unit,
    onDownload: () -> Unit,
    onShare: (() -> Unit)? = null
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {},
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Visual Document Card (Official Certificate Paper)
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    border = BorderStroke(1.dp, Color(0xFFCBD5E1)),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Header Emblem Banner
                        Surface(
                            shape = CircleShape,
                            color = Color(0xFF0B5FFF).copy(alpha = 0.12f),
                            modifier = Modifier.size(54.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Filled.VerifiedUser, contentDescription = null, tint = Color(0xFF0B5FFF), modifier = Modifier.size(32.dp))
                            }
                        }

                        Text(
                            text = "SOCIETY MANAGEMENT SYSTEM",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color(0xFF0F172A)
                        )
                        Text(
                            text = "OFFICIAL NO OBJECTION CERTIFICATE",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0B5FFF)
                        )

                        HorizontalDivider(color = Color(0xFFE2E8F0))

                        // Ref & Issue Date
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("CERTIFICATE NO.", style = MaterialTheme.typography.labelSmall, color = Color(0xFF64748B), fontWeight = FontWeight.Bold)
                                Text(item.nocNumber ?: "NOC-2026-REF", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("ISSUE DATE", style = MaterialTheme.typography.labelSmall, color = Color(0xFF64748B), fontWeight = FontWeight.Bold)
                                Text(shortDate(item.createdAt), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                            }
                        }

                        // Certificate Body Paper Container
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFFF8FAFC),
                            border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    text = "TO WHOM IT MAY CONCERN",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color(0xFF334155)
                                )
                                Text(
                                    text = "This is to certify that ${item.residentName ?: "the resident"} residing at Wing ${item.wing ?: "-"}, Flat No. ${item.flatNo ?: "-"} has clear record with no pending dues or charges against their flat.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFF475467)
                                )
                                Text(
                                    text = "The Management Committee has NO OBJECTION for the requested purpose: ${item.purpose ?: item.nocType ?: "General NOC"}.",
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFF0F172A)
                                )
                            }
                        }

                        // Details Table
                        Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            NocDocDetailRow("NOC Category", item.nocType ?: "Standard NOC")
                            NocDocDetailRow("Applicant", item.residentName ?: "Resident")
                            NocDocDetailRow("Flat / Unit", "Wing ${item.wing ?: "-"} - ${item.flatNo ?: "-"}")
                            NocDocDetailRow("Status", "VERIFIED & APPROVED")
                            item.adminComments?.takeIf { it.isNotBlank() }?.let {
                                NocDocDetailRow("Admin Note", it)
                            }
                        }

                        HorizontalDivider(color = Color(0xFFE2E8F0))

                        // Signature Stamp Section
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Digitally Verified", style = MaterialTheme.typography.labelSmall, color = Color(0xFF16A34A), fontWeight = FontWeight.Bold)
                                Text("Authorized Signatory", style = MaterialTheme.typography.labelSmall, color = Color(0xFF64748B))
                            }
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFFDCFCE7),
                                border = BorderStroke(1.dp, Color(0xFF86EFAC))
                            ) {
                                Text(
                                    text = "SEALED & ISSUED",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF15803D),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }

                // Download & Share buttons right below document
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Button(
                        onClick = onDownload,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0B5FFF))
                    ) {
                        Icon(Icons.Filled.Download, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Download PDF", fontWeight = FontWeight.Bold)
                    }
                    onShare?.let { shareFn ->
                        OutlinedButton(
                            onClick = shareFn,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Filled.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Share Link", fontWeight = FontWeight.Bold)
                        }
                    }
                }

                TextButton(onClick = onDismiss) {
                    Text("Close Preview", color = Color(0xFF64748B))
                }
            }
        }
    )
}

@Composable
private fun NocDocDetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = Color(0xFF64748B))
        Text(value, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
    }
}
