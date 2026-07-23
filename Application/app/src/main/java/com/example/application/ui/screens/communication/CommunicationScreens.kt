package com.example.application.ui.screens.communication

import android.content.Context
import android.net.Uri
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.MarkEmailRead
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Report
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.example.application.BuildConfig
import com.example.application.data.remote.dto.ComplaintDto
import com.example.application.data.remote.dto.NoticeDto
import com.example.application.data.remote.dto.NotificationDto
import com.example.application.ui.components.BasicAppTextField
import com.example.application.ui.components.AppBottomNavigation
import com.example.application.ui.components.AppRoleTheme
import com.example.application.ui.components.EmptyState
import com.example.application.ui.components.RetryState
import com.example.application.ui.screens.dashboard.DashboardSkeleton
import com.example.application.ui.screens.dashboard.KeyValue
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.AdminComplaintsViewModel
import com.example.application.viewmodel.NoticesViewModel
import com.example.application.viewmodel.NotificationsViewModel
import com.example.application.viewmodel.ResidentComplaintsViewModel
import java.io.File
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AdminComplaintsScreen(onBack: () -> Unit, viewModel: AdminComplaintsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var dialog by remember { mutableStateOf<ComplaintDialog?>(null) }
    val items by remember(state.items, state.query, state.filter) {
        derivedStateOf { state.items.filter { it.matchesComplaint(state.query) }.filter { state.filter == "All" || it.status == state.filter } }
    }
    ListShell("Complaints", onBack, state.isRefreshing, { viewModel.load(true) }, state.isLoading, state.error, { viewModel.load(true) }) {
        item {
            SearchAndStatus(state.query, viewModel::setQuery, state.filter, viewModel::setFilter)
            state.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        }
        if (items.isEmpty()) item { EmptyState("No complaints", "Resident complaints will appear here.") }
        else items(items, key = { it.id ?: it.title.orEmpty() }) { complaint ->
            ComplaintCard(complaint, admin = true, onReply = { dialog = ComplaintDialog.Reply(complaint) }, onDelete = { complaint.id?.let(viewModel::deleteComplaint) })
        }
    }
    if (dialog is ComplaintDialog.Reply) {
        val complaint = (dialog as ComplaintDialog.Reply).complaint
        SimpleDialog("Reply to Complaint", { dialog = null }) {
            var status by remember { mutableStateOf(complaint.status ?: "pending") }
            var reply by remember { mutableStateOf(complaint.reply.orEmpty()) }
            SearchChips(listOf("pending", "in_progress", "resolved"), status) { status = it }
            BasicAppTextField(reply, { reply = it }, "Reply")
            Button(onClick = { complaint.id?.let { viewModel.updateComplaint(it, status, reply) }; dialog = null }, modifier = Modifier.fillMaxWidth()) { Text("Update Complaint") }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResidentComplaintsScreen(
    onBack: () -> Unit,
    onHome: () -> Unit = {},
    onNotices: () -> Unit = {},
    onPayments: () -> Unit = {},
    onReports: () -> Unit = {},
    onProfile: () -> Unit = {},
    viewModel: ResidentComplaintsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var showCreate by remember { mutableStateOf(false) }
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var imageUris by remember { mutableStateOf<List<Uri>>(emptyList()) }
    var cameraUri by remember { mutableStateOf<Uri?>(null) }
    var imageError by remember { mutableStateOf<String?>(null) }
    val items by remember(state.items, state.query, state.filter) {
        derivedStateOf {
            state.items
                .filter { it.matchesComplaint(state.query) }
                .filter { state.filter == "All" || it.status.normalizedComplaintStatus() == state.filter.normalizedComplaintStatus() }
        }
    }
    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
        imageError = null
        imageUris = (imageUris + uris).distinct().take(3)
    }
    val cameraLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { captured ->
        if (captured) cameraUri?.let { imageUris = (imageUris + it).distinct().take(3) }
    }
    Scaffold(
        topBar = {
            ResidentComplaintsHeader(
                onBack = onBack,
                onRaise = { showCreate = true }
            )
        },
        bottomBar = {
            ResidentComplaintsBottomBar(
                onHome = onHome,
                onNotices = onNotices,
                onPayments = onPayments,
                onReports = onReports,
                onProfile = onProfile
            )
        }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.isRefreshing,
            onRefresh = { viewModel.load(true) },
            modifier = Modifier.fillMaxSize().padding(padding)
        ) {
            LazyColumn(
                contentPadding = PaddingValues(start = 18.dp, top = 14.dp, end = 18.dp, bottom = 18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier.fillMaxSize().background(Color(0xFFF7F9FC))
            ) {
                item {
                    ResidentComplaintFilterChips(state.filter, viewModel::setFilter)
                    state.message?.let { Text(it, color = Color(0xFF0B56D9), modifier = Modifier.padding(top = 8.dp)) }
                }
                when {
                    state.isLoading -> item { DashboardSkeleton() }
                    state.error != null -> item {
                        val error = state.error ?: "Unable to load complaints."
                        RetryState(error, { viewModel.load(true) })
                    }
                    items.isEmpty() -> item { EmptyState("No complaints", "Raise your first complaint.") }
                    else -> items(items, key = { it.id ?: it.title.orEmpty() }) { complaint ->
                        ResidentComplaintCard(complaint)
                    }
                }
            }
        }
    }
    if (showCreate) {
        AlertDialog(
            onDismissRequest = { showCreate = false },
            text = {
                ResidentComplaintForm(
                    title = title,
                    onTitle = { title = it },
                    description = description,
                    onDescription = { description = it },
                    selectedImages = imageUris,
                    imageError = imageError,
                    submitting = state.submitting,
                    onPickImage = {
                        if (imageUris.size >= 3) imageError = "You can upload maximum 3 images." else imagePicker.launch("image/*")
                    },
                    onTakePhoto = {
                        if (imageUris.size >= 3) {
                            imageError = "You can upload maximum 3 images."
                        } else createCameraUri(context)?.let { uri ->
                            cameraUri = uri
                            cameraLauncher.launch(uri)
                        }
                    },
                    onRemoveImage = { uri -> imageUris = imageUris.filterNot { it == uri } },
                    onSubmit = {
                        val imageData = imageUris.mapNotNull { uri -> uriToBase64DataUrl(context, uri) }
                        if (imageData.size != imageUris.size) {
                            imageError = "Unable to read one selected picture. Please choose JPG/PNG images under 5 MB."
                        } else {
                            viewModel.createComplaint(title.trim(), description.trim(), imageData)
                            title = ""
                            description = ""
                            imageUris = emptyList()
                            imageError = null
                            showCreate = false
                        }
                    }
                )
            },
            confirmButton = {},
            dismissButton = { TextButton(onClick = { showCreate = false }) { Text("Close") } }
        )
    }
}

@Composable
private fun ResidentComplaintsHeader(onBack: () -> Unit, onRaise: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(horizontal = 12.dp, vertical = 18.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = Color(0xFF101828))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text("My Complaints", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Color(0xFF101828))
            Text("Track your society requests", color = Color(0xFF667085))
        }
        Button(
            onClick = onRaise,
            shape = RoundedCornerShape(10.dp),
            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp)
        ) {
            Icon(Icons.Filled.Add, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text("Raise Complaint", fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun ResidentComplaintFilterChips(selected: String, onSelected: (String) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        listOf("All", "Pending", "In Progress", "Resolved").forEach { label ->
            val isSelected = selected.normalizedComplaintStatus() == label.normalizedComplaintStatus()
            val colors = complaintChipColors(label, isSelected)
            Button(
                onClick = { onSelected(label) },
                modifier = Modifier.weight(1f).height(48.dp),
                shape = RoundedCornerShape(28.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = colors.first,
                    contentColor = colors.second,
                    disabledContainerColor = colors.first,
                    disabledContentColor = colors.second
                ),
                contentPadding = PaddingValues(horizontal = 6.dp)
            ) {
                Text(label)
            }
        }
    }
}

@Composable
private fun ResidentComplaintCard(complaint: ComplaintDto) {
    val status = complaint.status.normalizedComplaintStatus()
    val colors = complaintStatusColors(status)
    val images = complaint.complaintImagesForDisplay()
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(colors.iconBg),
                contentAlignment = Alignment.Center
            ) {
                Icon(complaintIcon(status), contentDescription = null, tint = colors.fg, modifier = Modifier.size(34.dp))
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.Top) {
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Text(complaint.title ?: "Complaint", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color(0xFF101828))
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(Icons.Filled.DateRange, contentDescription = null, tint = Color(0xFF667085), modifier = Modifier.size(18.dp))
                            Text("${DashboardFormatters.date(complaint.createdAt)}  •  ${complaintTime(complaint.createdAt)}", color = Color(0xFF667085))
                        }
                    }
                    ResidentComplaintStatusBadge(status)
                }
                Text(complaint.description ?: "-", color = Color(0xFF475467), style = MaterialTheme.typography.bodyLarge)
                if (images.isNotEmpty()) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        images.take(3).forEach { image ->
                            ComplaintProofImage(
                                image = image,
                                modifier = Modifier
                                    .size(96.dp)
                                    .clip(RoundedCornerShape(10.dp))
                            )
                        }
                    }
                }
                complaint.reply?.takeIf { it.isNotBlank() }?.let { reply ->
                    ResidentAdminReply(reply = reply, resolved = status == "resolved", createdAt = complaint.createdAt)
                }
            }
            Icon(Icons.Filled.MoreVert, contentDescription = null, tint = Color(0xFF667085), modifier = Modifier.align(Alignment.Bottom))
        }
    }
}

@Composable
private fun ResidentComplaintStatusBadge(status: String) {
    val colors = complaintStatusColors(status)
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(28.dp))
            .background(colors.bg)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Icon(
            imageVector = when (status) {
                "resolved" -> Icons.Filled.CheckCircle
                "in_progress" -> Icons.Filled.Schedule
                else -> Icons.Filled.Schedule
            },
            contentDescription = null,
            tint = colors.fg,
            modifier = Modifier.size(18.dp)
        )
        Text(status.complaintStatusLabel(), color = colors.fg, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun ResidentAdminReply(reply: String, resolved: Boolean, createdAt: String?) {
    val bg = if (resolved) Color(0xFFE8F7E8) else Color(0xFFEAF2FF)
    val fg = if (resolved) Color(0xFF176B2C) else Color(0xFF0B3F91)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(bg)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Text("Admin Reply  •  ${DashboardFormatters.date(createdAt)}  •  ${complaintTime(createdAt)}", color = fg, fontWeight = FontWeight.Bold)
        Text(reply, color = fg)
    }
}

@Composable
private fun ResidentComplaintForm(
    title: String,
    onTitle: (String) -> Unit,
    description: String,
    onDescription: (String) -> Unit,
    selectedImages: List<Uri>,
    imageError: String?,
    submitting: Boolean,
    onPickImage: () -> Unit,
    onTakePhoto: () -> Unit,
    onRemoveImage: (Uri) -> Unit,
    onSubmit: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
            .background(Color.White)
            .padding(horizontal = 22.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(Modifier.size(width = 48.dp, height = 5.dp).clip(RoundedCornerShape(4.dp)).background(Color(0xFFB8C0CC)))
        OutlinedTextField(
            value = title,
            onValueChange = onTitle,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Title") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp)
        )
        OutlinedTextField(
            value = description,
            onValueChange = onDescription,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Description") },
            minLines = 3,
            maxLines = 5,
            shape = RoundedCornerShape(14.dp)
        )
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedButton(onClick = onPickImage, modifier = Modifier.weight(1f).height(48.dp), shape = RoundedCornerShape(14.dp)) {
                Icon(Icons.Filled.Image, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Add Photo (${selectedImages.size}/3)")
            }
            OutlinedButton(onClick = onTakePhoto, modifier = Modifier.weight(1f).height(48.dp), shape = RoundedCornerShape(14.dp)) {
                Icon(Icons.Filled.PhotoCamera, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Take Photo")
            }
        }
        selectedImages.forEach { uri ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                AsyncImage(
                    model = uri,
                    contentDescription = "Selected complaint picture",
                    modifier = Modifier.weight(1f).height(92.dp).clip(RoundedCornerShape(12.dp)),
                    contentScale = ContentScale.Crop
                )
                TextButton(onClick = { onRemoveImage(uri) }) { Text("Remove") }
            }
        }
        imageError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        Button(
            onClick = onSubmit,
            enabled = title.isNotBlank() && description.isNotBlank() && !submitting,
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(14.dp)
        ) {
            Text(if (submitting) "Submitting..." else "Submit Complaint", style = MaterialTheme.typography.titleMedium)
        }
    }
}

@Composable
private fun ResidentComplaintsBottomBar(
    onHome: () -> Unit,
    onNotices: () -> Unit,
    onPayments: () -> Unit,
    onReports: () -> Unit,
    onProfile: () -> Unit
) {
    AppBottomNavigation(
        role = AppRoleTheme.Resident,
        selected = "Complaints",
        items = listOf("Home", "Notices", "Payments", "Reports", "Profile")
    ) { item ->
        when (item) {
            "Home" -> onHome()
            "Notices" -> onNotices()
            "Payments" -> onPayments()
            "Reports" -> onReports()
            "Profile" -> onProfile()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoticesScreen(onBack: () -> Unit, admin: Boolean, viewModel: NoticesViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showCreate by remember { mutableStateOf(false) }
    val notices by remember(state.items, state.query) { derivedStateOf { state.items.filter { it.matchesNotice(state.query) } } }
    ListShell(if (admin) "Notices" else "Society Notices", onBack, state.isRefreshing, { viewModel.load(true) }, state.isLoading, state.error, { viewModel.load(true) }, action = { if (admin) IconButton(onClick = { showCreate = true }) { Icon(Icons.Filled.Add, contentDescription = "Add notice") } }) {
        item {
            OutlinedTextField(state.query, viewModel::setQuery, modifier = Modifier.fillMaxWidth(), label = { Text("Search notices") }, singleLine = true)
            state.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        }
        if (notices.isEmpty()) item { EmptyState("No notices", "Published notices will appear here.") }
        else items(notices, key = { it.id ?: it.title.orEmpty() }) { notice ->
            NoticeCard(notice, admin = admin, onDelete = { notice.id?.let(viewModel::deleteNotice) })
        }
    }
    if (showCreate) {
        SimpleDialog("Create Notice", { showCreate = false }) {
            var title by remember { mutableStateOf("") }
            var description by remember { mutableStateOf("") }
            BasicAppTextField(title, { title = it }, "Title")
            BasicAppTextField(description, { description = it }, "Description")
            Button(onClick = { viewModel.createNotice(title, description); showCreate = false }, modifier = Modifier.fillMaxWidth(), enabled = title.isNotBlank() && description.isNotBlank()) { Text("Publish Notice") }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(onBack: () -> Unit, viewModel: NotificationsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val notifications = state.data?.notifications.orEmpty()
    ListShell("Notifications", onBack, state.isRefreshing, { viewModel.load(true) }, state.isLoading, state.error, { viewModel.load(true) }, action = { IconButton(onClick = viewModel::markAllRead) { Icon(Icons.Filled.MarkEmailRead, contentDescription = "Mark all read") } }) {
        item {
            Text("Unread: ${state.data?.unreadCount ?: 0}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            state.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        }
        if (notifications.isEmpty()) item { EmptyState("No notifications", "Admin alerts will appear here.") }
        else items(notifications, key = { it.id ?: it.title.orEmpty() }) { item -> NotificationCard(item) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ListShell(
    title: String,
    onBack: () -> Unit,
    refreshing: Boolean,
    onRefresh: () -> Unit,
    loading: Boolean,
    error: String?,
    onRetry: () -> Unit,
    action: @Composable () -> Unit = {},
    content: androidx.compose.foundation.lazy.LazyListScope.() -> Unit
) {
    Scaffold(topBar = { TopAppBar(title = { Text(title, fontWeight = FontWeight.Bold) }, navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Back") } }, actions = { action() }) }) { padding ->
        PullToRefreshBox(isRefreshing = refreshing, onRefresh = onRefresh, modifier = Modifier.fillMaxSize().padding(padding)) {
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                when {
                    loading -> item { DashboardSkeleton() }
                    error != null -> item { RetryState(error, onRetry) }
                    else -> content()
                }
            }
        }
    }
}

@Composable
private fun ComplaintCard(complaint: ComplaintDto, admin: Boolean, onReply: () -> Unit = {}, onDelete: () -> Unit = {}) {
    ManagementCard {
        Text(complaint.title ?: "Complaint", fontWeight = FontWeight.Bold)
        Text(complaint.description ?: "-", color = MaterialTheme.colorScheme.onSurfaceVariant)
        val complaintImages = complaint.complaintImagesForDisplay()
        if (complaintImages.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                complaintImages.take(3).forEach { image ->
                    ComplaintProofImage(
                        image = image,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .clickable { }
                    )
                }
            }
        }
        KeyValue("Status", (complaint.status ?: "pending").replace("_", " "))
        complaint.userName?.let { KeyValue("Resident", it) }
        complaint.reply?.takeIf { it.isNotBlank() }?.let { KeyValue("Reply", it) }
        KeyValue("Created", DashboardFormatters.date(complaint.createdAt))
        if (admin) Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = onReply) {
                Icon(Icons.Filled.EditNote, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("Reply / Status")
            }
            TextButton(onClick = onDelete) {
                Icon(Icons.Filled.Delete, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("Delete")
            }
        }
    }
}

@Composable
private fun NoticeCard(notice: NoticeDto, admin: Boolean, onDelete: () -> Unit) {
    ManagementCard {
        Text(notice.title ?: "Notice", fontWeight = FontWeight.Bold)
        Text(notice.description ?: "-", color = MaterialTheme.colorScheme.onSurfaceVariant)
        KeyValue("Created", DashboardFormatters.date(notice.createdAt))
        if (admin) TextButton(onClick = onDelete) {
            Icon(Icons.Filled.Delete, contentDescription = null)
            Spacer(Modifier.width(6.dp))
            Text("Delete")
        }
    }
}

@Composable
private fun NotificationCard(item: NotificationDto) {
    val type = item.type?.lowercase().orEmpty()
    val accent = when {
        "complaint" in type -> Color(0xFFE86D00)
        "payment" in type || "maintenance" in type -> Color(0xFF087A2E)
        "notice" in type -> Color(0xFF6D28D9)
        else -> Color(0xFF0B56D9)
    }
    val icon = when {
        "complaint" in type -> Icons.Filled.Report
        "payment" in type || "maintenance" in type -> Icons.Filled.Payments
        "notice" in type -> Icons.Filled.Campaign
        else -> Icons.Filled.Notifications
    }
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.Top
        ) {
            Box(
                modifier = Modifier.size(52.dp).clip(CircleShape).background(accent.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(28.dp))
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(item.title ?: "Notification", modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold, color = Color(0xFF101828))
                    if (item.isRead == false) Box(Modifier.size(9.dp).clip(CircleShape).background(accent))
                }
                Text(item.message ?: "-", color = Color(0xFF475467), style = MaterialTheme.typography.bodyMedium)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                    Text(
                        (item.type ?: "Update").replace("_", " "),
                        modifier = Modifier.clip(RoundedCornerShape(50)).background(accent.copy(alpha = 0.1f)).padding(horizontal = 9.dp, vertical = 4.dp),
                        color = accent,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(DashboardFormatters.date(item.createdAt), color = Color(0xFF667085), style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

@Composable
private fun ManagementCard(content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp), content = content)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SearchAndStatus(query: String, onQuery: (String) -> Unit, filter: String, onFilter: (String) -> Unit) {
    OutlinedTextField(
        query,
        onQuery,
        modifier = Modifier.fillMaxWidth(),
        leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
        label = { Text("Search") },
        singleLine = true
    )
    SearchChips(listOf("All", "pending", "in_progress", "resolved"), filter, onFilter)
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SearchChips(values: List<String>, selected: String, onSelected: (String) -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
        values.forEach { value -> FilterChip(selected = selected == value, onClick = { onSelected(value) }, label = { Text(value.replace("_", " ")) }) }
    }
}

@Composable
private fun SimpleDialog(title: String, onDismiss: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { Column(verticalArrangement = Arrangement.spacedBy(10.dp), content = content) },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Close") } }
    )
}

private sealed interface ComplaintDialog {
    data class Reply(val complaint: ComplaintDto) : ComplaintDialog
}

private fun ComplaintDto.matchesComplaint(query: String): Boolean {
    if (query.isBlank()) return true
    val q = query.lowercase()
    return listOf(title, description, status, userName, residentName).any { it?.lowercase()?.contains(q) == true }
}

private fun ComplaintDto.primaryComplaintImage(): String? {
    return complaintImagesForDisplay().firstOrNull()
}

private fun ComplaintDto.complaintImagesForDisplay(): List<String> {
    return (complaintImageUrls.orEmpty() + listOfNotNull(imageUrl) + complaintImages.orEmpty() + complaintImageData.orEmpty())
        .map { it.trim() }
        .filter { it.isNotBlank() }
        .distinct()
}

@Composable
private fun ComplaintProofImage(image: String, modifier: Modifier = Modifier) {
    val dataBitmap = remember(image) {
        decodeDataImage(image)
    }
    if (dataBitmap != null) {
        Image(
            bitmap = dataBitmap.asImageBitmap(),
            contentDescription = "Complaint picture",
            modifier = modifier,
            contentScale = ContentScale.Crop
        )
    } else {
        AsyncImage(
            model = fullMediaUrl(image),
            contentDescription = "Complaint picture",
            modifier = modifier,
            contentScale = ContentScale.Crop
        )
    }
}

private fun decodeDataImage(value: String): android.graphics.Bitmap? {
    val marker = ";base64,"
    if (!value.startsWith("data:image/", ignoreCase = true) || !value.contains(marker, ignoreCase = true)) return null
    val encoded = value.substringAfter(marker, missingDelimiterValue = "")
    if (encoded.isBlank()) return null
    return runCatching {
        val bytes = Base64.decode(encoded, Base64.DEFAULT)
        android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    }.getOrNull()
}

private data class ComplaintUiColors(
    val fg: Color,
    val bg: Color,
    val iconBg: Color
)

private fun complaintStatusColors(status: String): ComplaintUiColors {
    return when (status.normalizedComplaintStatus()) {
        "resolved" -> ComplaintUiColors(Color(0xFF1F7A2E), Color(0xFFE4F5E7), Color(0xFFE5F7E7))
        "in_progress" -> ComplaintUiColors(Color(0xFF0B56D9), Color(0xFFEAF2FF), Color(0xFFEAF2FF))
        else -> ComplaintUiColors(Color(0xFFC06A00), Color(0xFFFFF0D9), Color(0xFFFFF1D8))
    }
}

private fun complaintChipColors(label: String, selected: Boolean): Pair<Color, Color> {
    if (selected && label.equals("All", true)) return Color(0xFF145BEF) to Color.White
    if (selected) {
        val colors = complaintStatusColors(label)
        return colors.bg to colors.fg
    }
    return when (label.normalizedComplaintStatus()) {
        "pending" -> Color(0xFFFFF6E8) to Color(0xFFC06A00)
        "in_progress" -> Color(0xFFEAF2FF) to Color(0xFF0B56D9)
        "resolved" -> Color(0xFFEAF7EA) to Color(0xFF1F7A2E)
        else -> Color(0xFFEAF2FF) to Color(0xFF0B56D9)
    }
}

private fun complaintIcon(status: String): androidx.compose.ui.graphics.vector.ImageVector {
    return when (status.normalizedComplaintStatus()) {
        "resolved" -> Icons.Filled.CheckCircle
        "in_progress" -> Icons.Filled.Report
        else -> Icons.Filled.Schedule
    }
}

private fun String?.normalizedComplaintStatus(): String {
    val normalized = orEmpty().trim().replace("-", "_").replace(" ", "_").lowercase()
    return when (normalized) {
        "all" -> "All"
        "" -> "pending"
        "progress", "inprogress", "in_progress" -> "in_progress"
        "done", "closed", "resolve", "resolved" -> "resolved"
        else -> normalized
    }
}

private fun String.complaintStatusLabel(): String {
    return when (normalizedComplaintStatus()) {
        "in_progress" -> "In Progress"
        "resolved" -> "Resolved"
        else -> "Pending"
    }
}

private fun complaintTime(value: String?): String {
    val raw = value?.takeIf { it.isNotBlank() } ?: return "-"
    return runCatching {
        val clean = raw.replace("Z", "").take(19)
        LocalDateTime.parse(clean).format(DateTimeFormatter.ofPattern("hh:mm a"))
    }.getOrElse { "-" }
}

private fun NoticeDto.matchesNotice(query: String): Boolean {
    if (query.isBlank()) return true
    val q = query.lowercase()
    return listOf(title, description).any { it?.lowercase()?.contains(q) == true }
}

private fun uriToBase64DataUrl(context: Context, uri: Uri): String? {
    val mime = context.contentResolver.getType(uri)?.takeIf { it.startsWith("image/") } ?: "image/jpeg"
    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return null
    if (bytes.isEmpty() || bytes.size > 5 * 1024 * 1024) return null
    val backendMime = mime.lowercase().takeIf { it in setOf("image/jpeg", "image/jpg", "image/png", "image/webp") }
    if (backendMime != null) return "data:$backendMime;base64,${Base64.encodeToString(bytes, Base64.NO_WRAP)}"
    val bitmap = android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null
    val output = java.io.ByteArrayOutputStream()
    bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 90, output)
    val jpgBytes = output.toByteArray()
    if (jpgBytes.isEmpty() || jpgBytes.size > 5 * 1024 * 1024) return null
    return "data:image/jpeg;base64,${Base64.encodeToString(jpgBytes, Base64.NO_WRAP)}"
}

private fun createCameraUri(context: Context): Uri? = runCatching {
    val file = File.createTempFile("complaint-camera-", ".jpg", context.cacheDir)
    FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
}.getOrNull()

private fun fullMediaUrl(path: String): String {
    if (path.startsWith("http://", ignoreCase = true)) {
        return path.replace(Regex("^http://([^/]*railway\\.app)", RegexOption.IGNORE_CASE), "https://$1")
    }
    if (path.startsWith("https:", ignoreCase = true) || path.startsWith("content:", ignoreCase = true) || path.startsWith("data:", ignoreCase = true)) return path
    return BuildConfig.BASE_URL.trimEnd('/') + "/" + path.trimStart('/')
}
