@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package com.example.application.ui.screens.events

import android.content.Context
import android.net.Uri
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Publish
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
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
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.example.application.BuildConfig
import com.example.application.data.remote.dto.EventDto
import com.example.application.data.remote.dto.EventSaveRequest
import com.example.application.ui.components.BasicAppTextField
import com.example.application.ui.components.EmptyState
import com.example.application.ui.components.KeyValue
import com.example.application.ui.components.RetryState
import com.example.application.viewmodel.EventsViewModel
import java.time.LocalDate

private val EventFilters = listOf("All", "Upcoming", "Completed", "Cancelled", "Draft", "Published")
private val EventStatuses = listOf("Draft", "Published", "Cancelled", "Completed")
private val EventAudiences = listOf("All", "Residents", "Admins")

@Composable
fun AdminEventsScreen(onBack: () -> Unit, viewModel: EventsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val filtered by remember(state.events, state.query, state.filter) {
        derivedStateOf { state.events.filteredEvents(state.query, state.filter, admin = true) }
    }
    var editor by remember { mutableStateOf<EventDto?>(null) }
    var createNew by remember { mutableStateOf(false) }
    var details by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf<EventDto?>(null) }

    EventsScaffold("Events", onBack, state.refreshing, { viewModel.load(true) }) {
        EventSearchAndFilters(state.query, viewModel::setQuery, state.filter, viewModel::setFilter, admin = true)
        state.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        if (state.error != null && state.events.isEmpty()) {
            RetryState(state.error ?: "Unable to load events", { viewModel.load(true) })
        } else if (state.loading) {
            Text("Loading events...")
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
                item {
                    Button(onClick = { createNew = true }, modifier = Modifier.fillMaxWidth(), enabled = !state.submitting) {
                        Icon(Icons.Filled.Add, null)
                        Spacer(Modifier.width(6.dp))
                        Text("Create Event")
                    }
                }
                if (filtered.isEmpty()) {
                    item { EmptyState("No events found", "Create an event or clear filters.") }
                }
                items(filtered, key = { it.id ?: it.title.orEmpty() }) { event ->
                    EventCard(
                        event = event,
                        admin = true,
                        onDetails = { event.id?.let { viewModel.open(it); details = true } },
                        onEdit = { editor = event },
                        onPublish = { event.id?.let(viewModel::publish) },
                        onCancel = { event.id?.let(viewModel::cancel) },
                        onDelete = { confirmDelete = event }
                    )
                }
            }
        }
    }

    if (createNew) {
        EventEditorDialog(null, state.submitting, onDismiss = { createNew = false }) {
            viewModel.create(it)
            createNew = false
        }
    }
    editor?.let { event ->
        EventEditorDialog(event, state.submitting, onDismiss = { editor = null }) {
            event.id?.let { id -> viewModel.update(id, it) }
            editor = null
        }
    }
    if (details && state.selected != null) {
        EventDetailsDialog(state.selected!!, admin = true, onDismiss = { details = false; viewModel.clearSelected() })
    }
    confirmDelete?.let { event ->
        AlertDialog(
            onDismissRequest = { confirmDelete = null },
            title = { Text("Delete Event?") },
            text = { Text("This event will be removed permanently.") },
            confirmButton = {
                TextButton(onClick = {
                    event.id?.let(viewModel::delete)
                    confirmDelete = null
                }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = null }) { Text("Cancel") } }
        )
    }
}

@Composable
fun ResidentEventsScreen(onBack: () -> Unit, viewModel: EventsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val filtered by remember(state.events, state.query, state.filter) {
        derivedStateOf { state.events.filteredEvents(state.query, state.filter, admin = false) }
    }
    var details by remember { mutableStateOf(false) }

    EventsScaffold("Events", onBack, state.refreshing, { viewModel.load(true) }) {
        EventSearchAndFilters(state.query, viewModel::setQuery, state.filter, viewModel::setFilter, admin = false)
        if (state.error != null && state.events.isEmpty()) {
            RetryState(state.error ?: "Unable to load events", { viewModel.load(true) })
        } else if (state.loading) {
            Text("Loading events...")
        } else if (filtered.isEmpty()) {
            EmptyState("No events", "Published society events will appear here.")
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
                items(filtered, key = { it.id ?: it.title.orEmpty() }) { event ->
                    EventCard(
                        event = event,
                        admin = false,
                        onDetails = { event.id?.let { viewModel.open(it); details = true } },
                        onEdit = {},
                        onPublish = {},
                        onCancel = {},
                        onDelete = {}
                    )
                }
            }
        }
    }

    if (details && state.selected != null) {
        EventDetailsDialog(state.selected!!, admin = false, onDismiss = { details = false; viewModel.clearSelected() })
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EventsScaffold(title: String, onBack: () -> Unit, refreshing: Boolean, onRefresh: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Back") } },
                actions = { IconButton(onClick = onRefresh) { Icon(Icons.Filled.Refresh, contentDescription = "Refresh") } }
            )
        }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = refreshing,
            onRefresh = onRefresh,
            modifier = Modifier.fillMaxSize().padding(padding)
        ) {
            Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), content = content)
        }
    }
}

@Composable
private fun EventSearchAndFilters(query: String, onQuery: (String) -> Unit, filter: String, onFilter: (String) -> Unit, admin: Boolean) {
    BasicAppTextField(query, onQuery, "Search title, venue, organizer")
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        EventFilters.filter { admin || it !in listOf("Draft", "Published") }.forEach { value ->
            FilterChip(selected = filter == value, onClick = { onFilter(value) }, label = { Text(value) })
        }
    }
}

@Composable
private fun EventCard(event: EventDto, admin: Boolean, onDetails: () -> Unit, onEdit: () -> Unit, onPublish: () -> Unit, onCancel: () -> Unit, onDelete: () -> Unit) {
    Card(Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.large) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            eventImageUrl(event)?.let {
                AsyncImage(
                    model = it,
                    contentDescription = event.title,
                    modifier = Modifier.fillMaxWidth().height(150.dp).clip(RoundedCornerShape(14.dp)),
                    contentScale = ContentScale.Crop
                )
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(event.title ?: "Event", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                AssistChip(onClick = {}, label = { Text(event.status ?: "Draft") }, leadingIcon = { Icon(Icons.Filled.CalendarMonth, null) })
            }
            Text(event.description ?: "No description provided.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            KeyValue("Date", event.eventDate?.take(10) ?: "-")
            KeyValue("Time", "${event.startTime ?: "-"} - ${event.endTime ?: "-"}")
            KeyValue("Venue", event.venue ?: "-")
            KeyValue("Organizer", event.organizer ?: "-")
            if (admin) KeyValue("Audience", event.audience ?: "All")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onDetails) { Text("Details") }
                if (admin) {
                    TextButton(onClick = onEdit) { Icon(Icons.Filled.Edit, null); Text("Edit") }
                    if (!event.status.equals("Published", true)) TextButton(onClick = onPublish) { Icon(Icons.Filled.Publish, null); Text("Publish") }
                    if (!event.status.equals("Cancelled", true)) TextButton(onClick = onCancel) { Icon(Icons.Filled.Cancel, null); Text("Cancel") }
                    TextButton(onClick = onDelete) { Icon(Icons.Filled.Delete, null); Text("Delete") }
                }
            }
        }
    }
}

@Composable
private fun EventDetailsDialog(event: EventDto, admin: Boolean, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(event.title ?: "Event Details") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                eventImageUrl(event)?.let {
                    AsyncImage(
                        model = it,
                        contentDescription = event.title,
                        modifier = Modifier.fillMaxWidth().height(220.dp).clip(RoundedCornerShape(14.dp)),
                        contentScale = ContentScale.Crop
                    )
                }
                Text(event.description ?: "No description provided.")
                KeyValue("Date", event.eventDate?.take(10) ?: "-")
                KeyValue("Time", "${event.startTime ?: "-"} - ${event.endTime ?: "-"}")
                KeyValue("Venue", event.venue ?: "-")
                KeyValue("Organizer", event.organizer ?: "-")
                KeyValue("Status", event.status ?: "-")
                if (admin) KeyValue("Audience", event.audience ?: "All")
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } }
    )
}

@Composable
private fun EventEditorDialog(existing: EventDto?, submitting: Boolean, onDismiss: () -> Unit, onSave: (EventSaveRequest) -> Unit) {
    val context = LocalContext.current
    var title by remember { mutableStateOf(existing?.title.orEmpty()) }
    var description by remember { mutableStateOf(existing?.description.orEmpty()) }
    var date by remember { mutableStateOf(existing?.eventDate?.take(10).orEmpty()) }
    var start by remember { mutableStateOf(existing?.startTime?.take(5).orEmpty()) }
    var end by remember { mutableStateOf(existing?.endTime?.take(5).orEmpty()) }
    var venue by remember { mutableStateOf(existing?.venue.orEmpty()) }
    var organizer by remember { mutableStateOf(existing?.organizer.orEmpty()) }
    var status by remember { mutableStateOf(existing?.status ?: "Draft") }
    var audience by remember { mutableStateOf(existing?.audience ?: "All") }
    var imageData by remember { mutableStateOf<String?>(null) }
    var imagePreview by remember { mutableStateOf(existing?.let(::eventImageUrl)) }
    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let {
            imageData = uriToBase64Image(context, it)
            imagePreview = it.toString()
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (existing == null) "Create Event" else "Edit Event") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                imagePreview?.let {
                    AsyncImage(
                        model = it,
                        contentDescription = "Event image",
                        modifier = Modifier.fillMaxWidth().height(150.dp).clip(RoundedCornerShape(14.dp)),
                        contentScale = ContentScale.Crop
                    )
                }
                OutlinedButton(onClick = { imagePicker.launch("image/*") }, modifier = Modifier.fillMaxWidth()) { Text("Select Event Image") }
                BasicAppTextField(title, { title = it }, "Title")
                BasicAppTextField(description, { description = it }, "Description")
                BasicAppTextField(date, { date = it }, "Date YYYY-MM-DD")
                BasicAppTextField(start, { start = it }, "Start time HH:MM")
                BasicAppTextField(end, { end = it }, "End time HH:MM")
                BasicAppTextField(venue, { venue = it }, "Venue")
                BasicAppTextField(organizer, { organizer = it }, "Organizer")
                Text("Status", fontWeight = FontWeight.Bold)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    EventStatuses.forEach { value -> FilterChip(selected = status == value, onClick = { status = value }, label = { Text(value) }) }
                }
                Text("Audience", fontWeight = FontWeight.Bold)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    EventAudiences.forEach { value -> FilterChip(selected = audience == value, onClick = { audience = value }, label = { Text(value) }) }
                }
            }
        },
        confirmButton = {
            Button(
                enabled = !submitting && title.isNotBlank() && date.isNotBlank() && start.isNotBlank() && end.isNotBlank() && venue.isNotBlank(),
                onClick = {
                    onSave(EventSaveRequest(title, description.ifBlank { null }, date, start, end, venue, organizer.ifBlank { null }, imageData, status, audience))
                }
            ) { Icon(Icons.Filled.CheckCircle, null); Spacer(Modifier.width(6.dp)); Text(if (submitting) "Saving..." else "Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

private fun List<EventDto>.filteredEvents(query: String, filter: String, admin: Boolean): List<EventDto> {
    val today = LocalDate.now().toString()
    val normalizedQuery = query.trim().lowercase()
    return filter { event ->
        val textMatch = normalizedQuery.isBlank() ||
            listOf(event.title, event.description, event.venue, event.organizer).any { it?.lowercase()?.contains(normalizedQuery) == true }
        val date = event.eventDate?.take(10)
        val status = event.status.orEmpty()
        val filterMatch = when (filter) {
            "Upcoming" -> status.equals("Published", true) && (date ?: "") >= today
            "Completed" -> status.equals("Completed", true) || (status.equals("Published", true) && (date ?: "") < today)
            "Cancelled" -> status.equals("Cancelled", true)
            "Draft" -> admin && status.equals("Draft", true)
            "Published" -> admin && status.equals("Published", true)
            else -> true
        }
        textMatch && filterMatch
    }
}

private fun eventImageUrl(event: EventDto): String? = fullEventMediaUrl(event.imageUrl ?: event.imagePath)

private fun fullEventMediaUrl(path: String?): String? {
    if (path.isNullOrBlank()) return null
    if (path.startsWith("http", ignoreCase = true) || path.startsWith("content:", ignoreCase = true)) return path
    return BuildConfig.BASE_URL.trimEnd('/') + "/" + path.trimStart('/')
}

private fun uriToBase64Image(context: Context, uri: Uri): String? = runCatching {
    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return null
    val mime = context.contentResolver.getType(uri) ?: "image/jpeg"
    "data:$mime;base64,${Base64.encodeToString(bytes, Base64.NO_WRAP)}"
}.getOrNull()
