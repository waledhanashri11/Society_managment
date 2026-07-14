package com.example.application.ui.screens.communication

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.data.remote.dto.ComplaintDto
import com.example.application.data.remote.dto.NoticeDto
import com.example.application.data.remote.dto.NotificationDto
import com.example.application.ui.components.BasicAppTextField
import com.example.application.ui.components.EmptyState
import com.example.application.ui.components.RetryState
import com.example.application.ui.screens.dashboard.DashboardSkeleton
import com.example.application.ui.screens.dashboard.KeyValue
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.AdminComplaintsViewModel
import com.example.application.viewmodel.NoticesViewModel
import com.example.application.viewmodel.NotificationsViewModel
import com.example.application.viewmodel.ResidentComplaintsViewModel

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
fun ResidentComplaintsScreen(onBack: () -> Unit, viewModel: ResidentComplaintsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showCreate by remember { mutableStateOf(false) }
    val items by remember(state.items, state.query, state.filter) {
        derivedStateOf { state.items.filter { it.matchesComplaint(state.query) }.filter { state.filter == "All" || it.status == state.filter } }
    }
    ListShell("My Complaints", onBack, state.isRefreshing, { viewModel.load(true) }, state.isLoading, state.error, { viewModel.load(true) }, action = { TextButton(onClick = { showCreate = true }) { Text("Raise") } }) {
        item {
            SearchAndStatus(state.query, viewModel::setQuery, state.filter, viewModel::setFilter)
            state.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        }
        if (items.isEmpty()) item { EmptyState("No complaints", "Raise your first complaint.") }
        else items(items, key = { it.id ?: it.title.orEmpty() }) { complaint -> ComplaintCard(complaint, admin = false) }
    }
    if (showCreate) {
        SimpleDialog("Raise Complaint", { showCreate = false }) {
            var title by remember { mutableStateOf("") }
            var description by remember { mutableStateOf("") }
            BasicAppTextField(title, { title = it }, "Title")
            BasicAppTextField(description, { description = it }, "Description")
            Button(onClick = { viewModel.createComplaint(title, description); showCreate = false }, modifier = Modifier.fillMaxWidth(), enabled = title.isNotBlank() && description.isNotBlank()) { Text("Submit Complaint") }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoticesScreen(onBack: () -> Unit, admin: Boolean, viewModel: NoticesViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showCreate by remember { mutableStateOf(false) }
    val notices by remember(state.items, state.query) { derivedStateOf { state.items.filter { it.matchesNotice(state.query) } } }
    ListShell(if (admin) "Notices" else "Society Notices", onBack, state.isRefreshing, { viewModel.load(true) }, state.isLoading, state.error, { viewModel.load(true) }, action = { if (admin) TextButton(onClick = { showCreate = true }) { Text("Add") } }) {
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
    ListShell("Notifications", onBack, state.isRefreshing, { viewModel.load(true) }, state.isLoading, state.error, { viewModel.load(true) }, action = { TextButton(onClick = viewModel::markAllRead) { Text("Read all") } }) {
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
    Scaffold(topBar = { TopAppBar(title = { Text(title) }, navigationIcon = { TextButton(onClick = onBack) { Text("Back") } }, actions = { action() }) }) { padding ->
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
        KeyValue("Status", (complaint.status ?: "pending").replace("_", " "))
        complaint.userName?.let { KeyValue("Resident", it) }
        complaint.reply?.takeIf { it.isNotBlank() }?.let { KeyValue("Reply", it) }
        KeyValue("Created", DashboardFormatters.date(complaint.createdAt))
        if (admin) Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = onReply) { Text("Reply / Status") }
            TextButton(onClick = onDelete) { Text("Delete") }
        }
    }
}

@Composable
private fun NoticeCard(notice: NoticeDto, admin: Boolean, onDelete: () -> Unit) {
    ManagementCard {
        Text(notice.title ?: "Notice", fontWeight = FontWeight.Bold)
        Text(notice.description ?: "-", color = MaterialTheme.colorScheme.onSurfaceVariant)
        KeyValue("Created", DashboardFormatters.date(notice.createdAt))
        if (admin) TextButton(onClick = onDelete) { Text("Delete") }
    }
}

@Composable
private fun NotificationCard(item: NotificationDto) {
    ManagementCard {
        Text(item.title ?: "Notification", fontWeight = FontWeight.Bold)
        Text(item.message ?: "-", color = MaterialTheme.colorScheme.onSurfaceVariant)
        KeyValue("Type", item.type ?: "-")
        KeyValue("Created", DashboardFormatters.date(item.createdAt))
    }
}

@Composable
private fun ManagementCard(content: @Composable ColumnScope.() -> Unit) {
    Card(modifier = Modifier.fillMaxWidth(), elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp), content = content)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SearchAndStatus(query: String, onQuery: (String) -> Unit, filter: String, onFilter: (String) -> Unit) {
    OutlinedTextField(query, onQuery, modifier = Modifier.fillMaxWidth(), label = { Text("Search") }, singleLine = true)
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

private fun NoticeDto.matchesNotice(query: String): Boolean {
    if (query.isBlank()) return true
    val q = query.lowercase()
    return listOf(title, description).any { it?.lowercase()?.contains(q) == true }
}
