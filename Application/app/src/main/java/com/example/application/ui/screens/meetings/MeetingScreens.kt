@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package com.example.application.ui.screens.meetings

import android.content.Context
import android.content.Intent
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.util.Base64
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.HowToVote
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.core.content.FileProvider
import com.example.application.BuildConfig
import com.example.application.data.remote.dto.*
import com.example.application.ui.components.BasicAppTextField
import com.example.application.ui.components.EmptyState
import com.example.application.ui.components.KeyValue
import com.example.application.ui.components.RetryState
import com.example.application.ui.components.SectionCard
import com.example.application.viewmodel.MeetingsViewModel
import java.io.File
import java.time.LocalDate

@Composable
fun AdminMeetingsScreen(onBack: () -> Unit, viewModel: MeetingsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var selected by remember { mutableStateOf<MeetingDto?>(null) }
    var editor by remember { mutableStateOf(false) }
    var attendance by remember { mutableStateOf(false) }
    var report by remember { mutableStateOf(false) }
    var poll by remember { mutableStateOf(false) }
    MeetingScaffold("Meetings", onBack, { viewModel.load(true) }) {
        MeetingFilters(state.query, state.filter, viewModel::setQuery, viewModel::setFilter)
        if (state.error != null && state.meetings.isEmpty()) RetryState(state.error ?: "Unable to load meetings", { viewModel.load(true) })
        else if (state.meetings.isEmpty() && !state.loading) EmptyState("No meetings", "Schedule a meeting to get started.")
        else LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
            item { Button(onClick = { selected = null; editor = true }, modifier = Modifier.fillMaxWidth(), enabled = !state.submitting) { Icon(Icons.Filled.Add, null); Spacer(Modifier.width(6.dp)); Text("Create meeting") } }
            items(filteredMeetings(state.meetings, state.query, state.filter), key = { it.id ?: it.title.orEmpty() }) { meeting ->
                MeetingCard(meeting, true,
                    onDetails = { selected = meeting; viewModel.open(meeting.id ?: "") },
                    onEdit = { selected = meeting; editor = true },
                    onDelete = { meeting.id?.let(viewModel::deleteMeeting) },
                    onAttendance = { meeting.id?.let { viewModel.loadAttendance(it); selected = meeting; attendance = true } },
                    onReport = { selected = meeting; report = true; viewModel.open(meeting.id ?: "") },
                    onPoll = { selected = meeting; poll = true; viewModel.open(meeting.id ?: "") })
            }
        }
    }
    if (editor) MeetingEditorDialog(selected, state.submitting, onDismiss = { editor = false }) { request ->
        if (selected?.id == null) viewModel.createMeeting(request) else viewModel.updateMeeting(selected?.id ?: "", request)
        editor = false
    }
    selected?.let { meeting ->
        if (!editor && !attendance && !report && !poll && state.selected != null) MeetingDetailsDialog(
            detail = state.selected!!,
            admin = true,
            submitting = state.submitting,
            onDismiss = { selected = null },
            onAttend = {},
            onVote = { },
            onCreatePoll = { poll = true },
            onSaveAction = { id, request -> if (id == null) viewModel.createAction(request) else viewModel.updateAction(id, request) },
            onDeleteAction = viewModel::deleteAction,
            onUpdateActionStatus = viewModel::updateActionStatus
        )
        if (attendance) AttendanceDialog(state.attendance, state.submitting, { attendance = false }) { viewModel.saveAttendance(meeting.id ?: "", it) }
        if (report) ReportDialog(state.selected?.report, state.submitting, { report = false }) { summary, discussion, decisions, remarks -> viewModel.saveReport(meeting.id ?: "", summary, discussion, decisions, remarks); report = false }
        if (poll) PollDialog(state.selected?.vote, state.submitting, { poll = false }) { question -> viewModel.createVote(meeting.id ?: "", question); poll = false }
    }
}

@Composable
fun ResidentMeetingsScreen(onBack: () -> Unit, viewModel: MeetingsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var selectedId by remember { mutableStateOf<String?>(null) }
    val detail = state.selected
    MeetingScaffold("Meetings", onBack, { viewModel.load(true) }) {
        MeetingFilters(state.query, state.filter, viewModel::setQuery, viewModel::setFilter)
        if (state.error != null && state.meetings.isEmpty()) RetryState(state.error ?: "Unable to load meetings", { viewModel.load(true) })
        else if (state.meetings.isEmpty() && !state.loading) EmptyState("No meetings", "Upcoming society meetings will appear here.")
        else LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
            items(filteredMeetings(state.meetings, state.query, state.filter), key = { it.id ?: it.title.orEmpty() }) { meeting ->
                MeetingCard(meeting, false, onDetails = { selectedId = meeting.id; meeting.id?.let(viewModel::open) }, onEdit = {}, onDelete = {}, onAttendance = {}, onReport = {}, onPoll = {})
            }
        }
    }
    if (selectedId != null && detail != null) MeetingDetailsDialog(
        detail = detail,
        admin = false,
        submitting = state.submitting,
        onDismiss = { selectedId = null },
        onAttend = { viewModel.markSelfPresent(selectedId!!) },
        onVote = { choice -> viewModel.castVote(selectedId!!, choice) },
        onCreatePoll = {},
        onSaveAction = { _, _ -> },
        onDeleteAction = {},
        onUpdateActionStatus = viewModel::updateActionStatus
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MeetingScaffold(title: String, onBack: () -> Unit, onRefresh: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    Scaffold(topBar = { TopAppBar(title = { Text(title) }, navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, null) } }, actions = { IconButton(onClick = onRefresh) { Icon(Icons.Filled.Refresh, null) } }) }) { padding ->
        Column(Modifier.padding(padding).padding(horizontal = 16.dp).fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp), content = content)
    }
}

@Composable
private fun MeetingFilters(query: String, filter: String, onQuery: (String) -> Unit, onFilter: (String) -> Unit) {
    BasicAppTextField(query, onQuery, "Search title, venue or type")
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
        listOf("All", "Upcoming", "Today", "Completed", "Cancelled").forEach { value -> FilterChip(selected = filter == value, onClick = { onFilter(value) }, label = { Text(value) }) }
    }
}

private fun filteredMeetings(items: List<MeetingDto>, query: String, filter: String): List<MeetingDto> {
    val today = LocalDate.now().toString()
    return items.filter { meeting ->
        val q = query.trim().lowercase()
        val textMatch = q.isBlank() || listOf(meeting.title, meeting.venue, meeting.meetingType).any { it?.lowercase()?.contains(q) == true }
        val date = meeting.meetingDate?.take(10)
        val filterMatch = when (filter) { "Today" -> date == today; "Completed" -> meeting.status.equals("Completed", true); "Cancelled" -> meeting.status.equals("Cancelled", true); "Upcoming" -> meeting.status.equals("Scheduled", true) && (date ?: "") >= today; else -> true }
        textMatch && filterMatch
    }
}

@Composable
private fun MeetingCard(meeting: MeetingDto, admin: Boolean, onDetails: () -> Unit, onEdit: () -> Unit, onDelete: () -> Unit, onAttendance: () -> Unit, onReport: () -> Unit, onPoll: () -> Unit) {
    Card(Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.large) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(meeting.title ?: "Meeting", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium); StatusChip(meeting.status ?: "Scheduled") }
            Text(meeting.meetingType ?: "Meeting", color = MaterialTheme.colorScheme.primary)
            KeyValue("Date", meeting.meetingDate?.take(10) ?: "-"); KeyValue("Time", "${meeting.startTime ?: "-"} - ${meeting.endTime ?: "-"}"); KeyValue("Venue", meeting.venue ?: "-")
            if (meeting.totalCount != null) KeyValue("Attendance", "${meeting.presentCount ?: 0}/${meeting.totalCount}")
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) { OutlinedButton(onClick = onDetails) { Icon(Icons.Filled.Visibility, null); Spacer(Modifier.width(4.dp)); Text("Details") }; if (admin) { TextButton(onClick = onEdit) { Icon(Icons.Filled.Edit, null); Text("Edit") }; TextButton(onClick = onDelete) { Icon(Icons.Filled.Delete, null); Text("Delete") } } }
            if (admin) Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) { TextButton(onClick = onAttendance) { Icon(Icons.Filled.CheckCircle, null); Text("Attendance") }; TextButton(onClick = onReport) { Text("Minutes") }; TextButton(onClick = onPoll) { Icon(Icons.Filled.HowToVote, null); Text("Poll") } }
        }
    }
}

@Composable private fun StatusChip(status: String) { AssistChip(onClick = {}, label = { Text(status) }, leadingIcon = { Icon(Icons.Filled.CalendarMonth, null) }) }

@Composable
private fun MeetingDetailsDialog(
    detail: MeetingDetailsDto,
    admin: Boolean,
    submitting: Boolean,
    onDismiss: () -> Unit,
    onAttend: () -> Unit,
    onVote: (String) -> Unit,
    onCreatePoll: () -> Unit,
    onSaveAction: (String?, MeetingActionSaveRequest) -> Unit,
    onDeleteAction: (String) -> Unit,
    onUpdateActionStatus: (String, String, String?) -> Unit
) {
    val context = LocalContext.current
    var createAction by remember(detail.id) { mutableStateOf(false) }
    var editAction by remember(detail.id) { mutableStateOf<MeetingActionDto?>(null) }
    var deleteAction by remember(detail.id) { mutableStateOf<MeetingActionDto?>(null) }
    var statusAction by remember(detail.id) { mutableStateOf<MeetingActionDto?>(null) }
    AlertDialog(onDismissRequest = onDismiss, title = { Text(detail.title ?: "Meeting") }, text = {
        Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            KeyValue("Type", detail.meetingType ?: "-"); KeyValue("Date", detail.meetingDate?.take(10) ?: "-"); KeyValue("Time", "${detail.startTime ?: "-"} - ${detail.endTime ?: "-"}"); KeyValue("Venue", detail.venue ?: "-"); KeyValue("Priority", detail.priority ?: "Normal"); KeyValue("Status", detail.status ?: "-")
            Text(detail.description ?: "No description provided.")
            Text("Agenda", fontWeight = FontWeight.Bold); detail.agendas.orEmpty().forEachIndexed { index, item -> Text("${index + 1}. ${item.itemText ?: ""}") }
            detail.report?.let { report ->
                Text("Minutes", fontWeight = FontWeight.Bold); Text(report.summary ?: "No summary"); Text(report.discussion ?: ""); Text(report.decisionsTaken ?: "")
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { openMinutesPdf(context, detail) }) { Text("View Minutes") }
                    OutlinedButton(onClick = { saveMinutesPdf(context, detail) }) { Text("Download PDF") }
                    OutlinedButton(onClick = { shareMinutesPdf(context, detail) }) { Text("Share PDF") }
                    OutlinedButton(onClick = { printMinutes(context, detail) }) { Text("Print Minutes") }
                }
            }
            Text("Action Items", fontWeight = FontWeight.Bold)
            if (detail.actions.orEmpty().isEmpty()) Text("No action items yet.")
            detail.actions.orEmpty().forEach { action ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(action.actionText ?: "Action", fontWeight = FontWeight.Bold)
                        Text("${action.status ?: "Pending"} • ${action.priority ?: "Normal"} • Due ${action.dueDate?.take(10) ?: "-"}")
                        Text("Assigned to: ${action.assigneeName ?: action.assignedTo ?: "Unassigned"}")
                        action.notes?.takeIf { it.isNotBlank() }?.let { Text("Notes: $it") }
                        action.completionDetails?.takeIf { it.isNotBlank() }?.let { Text("Completion: $it") }
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf("Pending", "In Progress", "Completed", "Cancelled").forEach { status ->
                                FilterChip(selected = action.status == status, onClick = { statusAction = action.copy(status = status) }, label = { Text(status) })
                            }
                            if (admin) {
                                TextButton(onClick = { editAction = action }) { Text("Edit") }
                                TextButton(onClick = { deleteAction = action }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
                            }
                        }
                    }
                }
            }
            if (admin) OutlinedButton(onClick = { createAction = true }, enabled = !submitting, modifier = Modifier.fillMaxWidth()) { Text("Add Action Item") }
            if (detail.documents.orEmpty().isNotEmpty()) {
                Text("Documents & Attachments", fontWeight = FontWeight.Bold)
                detail.documents.orEmpty().forEach { doc -> OutlinedButton(onClick = { openMeetingDocument(context, doc) }, modifier = Modifier.fillMaxWidth()) { Text(doc.fileName ?: doc.fileUrl ?: doc.filePath ?: "Open attachment") } }
            }
            if (!admin) { detail.myAttendance?.let { Text("Your attendance: $it", color = MaterialTheme.colorScheme.primary) }; detail.vote?.let { vote -> Text("Poll: ${vote.question}", fontWeight = FontWeight.Bold); if (vote.hasVoted == true) Text("You voted ${vote.myChoice}") else Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { listOf("YES", "NO", "ABSTAIN").forEach { TextButton(onClick = { onVote(it) }) { Text(it) } } } } }
        }
    }, confirmButton = { if (!admin && detail.myAttendance == null) Button(onClick = onAttend) { Text("Mark attendance") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Close") } })
    if (createAction || editAction != null) ActionEditorDialog(detail.id.orEmpty(), editAction, submitting, { createAction = false; editAction = null }) { actionId, request -> onSaveAction(actionId, request); createAction = false; editAction = null }
    deleteAction?.let { action -> AlertDialog(onDismissRequest = { deleteAction = null }, title = { Text("Delete Action Item?") }, text = { Text("This action item will be removed permanently.") }, confirmButton = { TextButton(onClick = { action.id?.let(onDeleteAction); deleteAction = null }) { Text("Delete", color = MaterialTheme.colorScheme.error) } }, dismissButton = { TextButton(onClick = { deleteAction = null }) { Text("Cancel") } }) }
    statusAction?.let { action ->
        var completion by remember(action.id, action.status) { mutableStateOf(action.completionDetails.orEmpty()) }
        AlertDialog(onDismissRequest = { statusAction = null }, title = { Text("Update Action Status") }, text = { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) { Text("Set status to ${action.status}?"); if (action.status == "Completed") BasicAppTextField(completion, { completion = it }, "Completion details") } }, confirmButton = { Button(onClick = { action.id?.let { onUpdateActionStatus(it, action.status ?: "Pending", completion.ifBlank { null }) }; statusAction = null }) { Text("Update") } }, dismissButton = { TextButton(onClick = { statusAction = null }) { Text("Cancel") } })
    }
}

@Composable
private fun MeetingDetailsDialog(detail: MeetingDetailsDto, admin: Boolean, onDismiss: () -> Unit, onAttend: () -> Unit, onVote: (String) -> Unit, onCreatePoll: () -> Unit) {
    val context = LocalContext.current
    AlertDialog(onDismissRequest = onDismiss, title = { Text(detail.title ?: "Meeting") }, text = {
        Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            KeyValue("Type", detail.meetingType ?: "-"); KeyValue("Date", detail.meetingDate?.take(10) ?: "-"); KeyValue("Time", "${detail.startTime ?: "-"} - ${detail.endTime ?: "-"}"); KeyValue("Venue", detail.venue ?: "-"); KeyValue("Priority", detail.priority ?: "Normal"); KeyValue("Status", detail.status ?: "-")
            Text(detail.description ?: "No description provided.")
            Text("Agenda", fontWeight = FontWeight.Bold); detail.agendas.orEmpty().forEachIndexed { index, item -> Text("${index + 1}. ${item.itemText ?: ""}") }
            detail.report?.let { report -> Text("Minutes", fontWeight = FontWeight.Bold); Text(report.summary ?: "No summary"); Text(report.discussion ?: ""); Text(report.decisionsTaken ?: "") }
            if (detail.actions.orEmpty().isNotEmpty()) {
                Text("Action Items", fontWeight = FontWeight.Bold)
                detail.actions.orEmpty().forEach { action ->
                    Text("${action.actionText ?: "Action"} • ${action.status ?: "Pending"} • ${action.priority ?: "Normal"}")
                    action.assigneeName?.let { Text("Assigned to: $it") }
                }
            }
            if (detail.documents.orEmpty().isNotEmpty()) {
                Text("Documents & Attachments", fontWeight = FontWeight.Bold)
                detail.documents.orEmpty().forEach { doc ->
                    OutlinedButton(onClick = { openMeetingDocument(context, doc) }, modifier = Modifier.fillMaxWidth()) {
                        Text(doc.fileName ?: doc.fileUrl ?: doc.filePath ?: "Open attachment")
                    }
                }
            }
            if (!admin) { detail.myAttendance?.let { Text("Your attendance: $it", color = MaterialTheme.colorScheme.primary) }; detail.vote?.let { vote -> Text("Poll: ${vote.question}", fontWeight = FontWeight.Bold); if (vote.hasVoted == true) Text("You voted ${vote.myChoice}") else Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { listOf("YES", "NO", "ABSTAIN").forEach { TextButton(onClick = { onVote(it) }) { Text(it) } } } } }
        }
    }, confirmButton = { if (!admin && detail.myAttendance == null) Button(onClick = onAttend) { Text("Mark attendance") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Close") } })
}

@Composable
private fun MeetingEditorDialog(existing: MeetingDto?, submitting: Boolean, onDismiss: () -> Unit, onSave: (MeetingSaveRequest) -> Unit) {
    var title by remember { mutableStateOf(existing?.title.orEmpty()) }
    var type by remember { mutableStateOf(existing?.meetingType ?: "Committee Meeting") }
    var date by remember { mutableStateOf(existing?.meetingDate?.take(10).orEmpty()) }
    var start by remember { mutableStateOf(existing?.startTime.orEmpty()) }
    var end by remember { mutableStateOf(existing?.endTime.orEmpty()) }
    var venue by remember { mutableStateOf(existing?.venue.orEmpty()) }
    var description by remember { mutableStateOf(existing?.description.orEmpty()) }
    var priority by remember { mutableStateOf(existing?.priority ?: "Normal") }
    var notifyResidents by remember { mutableStateOf(false) }
    var attachments by remember { mutableStateOf<List<MeetingDocumentUploadDto>>(emptyList()) }
    val context = LocalContext.current
    val documentPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        val loaded = uris.take(5).mapNotNull { uri -> runCatching { uri.toMeetingUpload(context) }.getOrNull() }
        if (loaded.isNotEmpty()) attachments = (attachments + loaded).take(5)
        if (uris.isNotEmpty() && loaded.isEmpty()) Toast.makeText(context, "Unable to read selected document", Toast.LENGTH_LONG).show()
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (existing == null) "Create meeting" else "Edit meeting") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                BasicAppTextField(title, { title = it }, "Title")
                BasicAppTextField(type, { type = it }, "Meeting type")
                BasicAppTextField(date, { date = it }, "Date YYYY-MM-DD")
                BasicAppTextField(start, { start = it }, "Start time HH:MM")
                BasicAppTextField(end, { end = it }, "End time HH:MM")
                BasicAppTextField(venue, { venue = it }, "Venue")
                BasicAppTextField(priority, { priority = it }, "Priority")
                BasicAppTextField(description, { description = it }, "Description")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    FilterChip(selected = notifyResidents, onClick = { notifyResidents = !notifyResidents }, label = { Text("Notify residents") })
                    OutlinedButton(onClick = { documentPicker.launch(arrayOf("application/pdf", "image/*", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) }) {
                        Text("Attach files")
                    }
                }
                attachments.forEach { doc ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(doc.name, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                        TextButton(onClick = { attachments = attachments.filterNot { it == doc } }) { Text("Remove") }
                    }
                }
                if (attachments.isNotEmpty()) Text("Files will be uploaded to the Railway backend with this meeting.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        confirmButton = {
            Button(
                enabled = !submitting && title.isNotBlank() && date.isNotBlank() && start.isNotBlank() && end.isNotBlank() && venue.isNotBlank(),
                onClick = { onSave(MeetingSaveRequest(title, type, date, start, end, venue, description.ifBlank { null }, priority, notifyResidents, attachments)) }
            ) { Text(if (submitting) "Saving…" else "Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
private fun ActionEditorDialog(meetingId: String, existing: MeetingActionDto?, submitting: Boolean, onDismiss: () -> Unit, onSave: (String?, MeetingActionSaveRequest) -> Unit) {
    var text by remember(existing?.id) { mutableStateOf(existing?.actionText.orEmpty()) }
    var assignee by remember(existing?.id) { mutableStateOf(existing?.assignedTo.orEmpty()) }
    var dueDate by remember(existing?.id) { mutableStateOf(existing?.dueDate?.take(10).orEmpty()) }
    var priority by remember(existing?.id) { mutableStateOf(existing?.priority ?: "Normal") }
    var status by remember(existing?.id) { mutableStateOf(existing?.status ?: "Pending") }
    var notes by remember(existing?.id) { mutableStateOf(existing?.notes.orEmpty()) }
    var completion by remember(existing?.id) { mutableStateOf(existing?.completionDetails.orEmpty()) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (existing == null) "Add Action Item" else "Edit Action Item") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                BasicAppTextField(text, { text = it }, "Action item")
                BasicAppTextField(assignee, { assignee = it }, "Assignee resident ID")
                BasicAppTextField(dueDate, { dueDate = it }, "Due date YYYY-MM-DD")
                BasicAppTextField(notes, { notes = it }, "Notes")
                BasicAppTextField(completion, { completion = it }, "Completion details")
                Text("Priority", fontWeight = FontWeight.Bold)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Low", "Normal", "High", "Urgent").forEach { value -> FilterChip(selected = priority == value, onClick = { priority = value }, label = { Text(value) }) }
                }
                Text("Status", fontWeight = FontWeight.Bold)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Pending", "In Progress", "Completed", "Cancelled").forEach { value -> FilterChip(selected = status == value, onClick = { status = value }, label = { Text(value) }) }
                }
            }
        },
        confirmButton = {
            Button(enabled = !submitting && text.isNotBlank(), onClick = {
                onSave(existing?.id, MeetingActionSaveRequest(meetingId, text, assignee.ifBlank { null }, dueDate.ifBlank { null }, priority, status, notes.ifBlank { null }, completion.ifBlank { null }))
            }) { Text(if (submitting) "Saving..." else "Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable private fun AttendanceDialog(rows: List<MeetingAttendanceDto>, submitting: Boolean, onDismiss: () -> Unit, onSave: (List<MeetingAttendanceDto>) -> Unit) { var values by remember(rows) { mutableStateOf(rows) }; AlertDialog(onDismissRequest = onDismiss, title = { Text("Attendance") }, text = { Column(Modifier.heightIn(max = 450.dp).verticalScroll(rememberScrollState())) { values.forEachIndexed { index, row -> Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Column { Text(row.residentName ?: "Resident", fontWeight = FontWeight.Bold); Text("Flat ${row.flatNo ?: "-"}") }; TextButton(onClick = { values = values.toMutableList().also { it[index] = row.copy(status = nextStatus(row.status)) } }) { Text(row.status ?: "Absent") } } } } }, confirmButton = { Button(enabled = !submitting, onClick = { onSave(values); onDismiss() }) { Text("Save") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Close") } }) }
private fun nextStatus(status: String?): String = when (status) { "Absent" -> "Present"; "Present" -> "Late"; "Late" -> "Excused"; else -> "Absent" }

@Composable private fun ReportDialog(existing: MeetingReportDto?, submitting: Boolean, onDismiss: () -> Unit, onSave: (String, String, String, String) -> Unit) { var summary by remember { mutableStateOf(existing?.summary.orEmpty()) }; var discussion by remember { mutableStateOf(existing?.discussion.orEmpty()) }; var decisions by remember { mutableStateOf(existing?.decisionsTaken.orEmpty()) }; var remarks by remember { mutableStateOf(existing?.remarks.orEmpty()) }; AlertDialog(onDismissRequest = onDismiss, title = { Text("Minutes of Meeting") }, text = { Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) { BasicAppTextField(summary, { summary = it }, "Summary"); BasicAppTextField(discussion, { discussion = it }, "Discussion"); BasicAppTextField(decisions, { decisions = it }, "Key decisions"); BasicAppTextField(remarks, { remarks = it }, "Remarks") } }, confirmButton = { Button(enabled = !submitting, onClick = { onSave(summary, discussion, decisions, remarks) }) { Text("Save minutes") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }) }

@Composable private fun PollDialog(existing: MeetingVoteDto?, submitting: Boolean, onDismiss: () -> Unit, onSave: (String) -> Unit) { var question by remember { mutableStateOf(existing?.question.orEmpty()) }; AlertDialog(onDismissRequest = onDismiss, title = { Text("Meeting poll") }, text = { BasicAppTextField(question, { question = it }, "Question") }, confirmButton = { Button(enabled = question.isNotBlank() && !submitting, onClick = { onSave(question) }) { Text("Save poll") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }) }

private fun openMinutesPdf(context: Context, detail: MeetingDetailsDto) {
    val file = createMinutesPdf(context, detail) ?: return
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val intent = Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/pdf").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    runCatching { context.startActivity(Intent.createChooser(intent, "View Minutes")) }
        .onFailure { Toast.makeText(context, "No PDF viewer found.", Toast.LENGTH_LONG).show() }
}

private fun saveMinutesPdf(context: Context, detail: MeetingDetailsDto) {
    val file = createMinutesPdf(context, detail)
    Toast.makeText(context, if (file != null) "Minutes PDF saved." else "Unable to save minutes PDF.", Toast.LENGTH_LONG).show()
}

private fun shareMinutesPdf(context: Context, detail: MeetingDetailsDto) {
    val file = createMinutesPdf(context, detail) ?: return
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val intent = Intent(Intent.ACTION_SEND).setType("application/pdf").putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    runCatching { context.startActivity(Intent.createChooser(intent, "Share Minutes")) }
        .onFailure { Toast.makeText(context, "Unable to share minutes.", Toast.LENGTH_LONG).show() }
}

private fun printMinutes(context: Context, detail: MeetingDetailsDto) {
    openMinutesPdf(context, detail)
    Toast.makeText(context, "Open the PDF viewer print option to print minutes.", Toast.LENGTH_LONG).show()
}

private fun createMinutesPdf(context: Context, detail: MeetingDetailsDto): File? = runCatching {
    val file = File(context.cacheDir, "meeting-minutes-${detail.id ?: System.currentTimeMillis()}.pdf")
    val document = PdfDocument()
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 12f }
    val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 18f; isFakeBoldText = true }
    val page = document.startPage(PdfDocument.PageInfo.Builder(595, 842, 1).create())
    val canvas = page.canvas
    var y = 42f
    fun line(text: String, bold: Boolean = false) {
        val p = if (bold) titlePaint else paint
        text.chunked(78).forEach { part ->
            if (y > 800f) return@forEach
            canvas.drawText(part, 36f, y, p)
            y += if (bold) 24f else 18f
        }
    }
    line("Society Management System", true)
    line("Meeting Minutes", true)
    line("Title: ${detail.title ?: "-"}")
    line("Date/Time: ${detail.meetingDate?.take(10) ?: "-"} ${detail.startTime ?: "-"} - ${detail.endTime ?: "-"}")
    line("Venue: ${detail.venue ?: "-"}")
    line("Type: ${detail.meetingType ?: "-"} | Status: ${detail.status ?: "-"}")
    y += 8f
    line("Agenda", true)
    detail.agendas.orEmpty().forEachIndexed { index, item -> line("${index + 1}. ${item.itemText ?: ""}") }
    y += 8f
    line("Discussion Summary", true)
    line(detail.report?.summary ?: "No summary recorded.")
    line(detail.report?.discussion ?: "")
    y += 8f
    line("Decisions", true)
    line(detail.report?.decisionsTaken ?: "No decisions recorded.")
    y += 8f
    line("Action Items", true)
    detail.actions.orEmpty().forEach { action -> line("- ${action.actionText ?: "Action"} | ${action.status ?: "Pending"} | Due ${action.dueDate?.take(10) ?: "-"} | ${action.assigneeName ?: "Unassigned"}") }
    y += 12f
    line("Prepared By: ____________________", false)
    line("Secretary / Admin Signature: ____________________", false)
    line("Chairperson Signature: ____________________", false)
    document.finishPage(page)
    file.outputStream().use { document.writeTo(it) }
    document.close()
    file
}.getOrNull()

private fun Uri.toMeetingUpload(context: Context): MeetingDocumentUploadDto {
    val mimeType = context.contentResolver.getType(this) ?: "application/octet-stream"
    val name = lastPathSegment?.substringAfterLast('/')?.takeIf { it.isNotBlank() } ?: "meeting-document-${System.currentTimeMillis()}"
    val bytes = context.contentResolver.openInputStream(this)?.use { it.readBytes() } ?: error("Unable to read selected document")
    val encoded = Base64.encodeToString(bytes, Base64.NO_WRAP)
    return MeetingDocumentUploadDto(name = name, data = "data:$mimeType;base64,$encoded")
}

private fun openMeetingDocument(context: android.content.Context, doc: MeetingDocumentDto) {
    val url = fullMeetingMediaUrl(doc.fileUrl ?: doc.filePath) ?: return
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    runCatching { context.startActivity(intent) }
}

private fun fullMeetingMediaUrl(path: String?): String? {
    if (path.isNullOrBlank()) return null
    if (path.startsWith("http", ignoreCase = true)) return path
    return BuildConfig.BASE_URL.trimEnd('/') + "/" + path.trimStart('/')
}
