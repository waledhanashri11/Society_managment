package com.example.application.ui.screens.meetings

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.data.remote.dto.*
import com.example.application.ui.components.BasicAppTextField
import com.example.application.ui.components.EmptyState
import com.example.application.ui.components.KeyValue
import com.example.application.ui.components.RetryState
import com.example.application.ui.components.SectionCard
import com.example.application.viewmodel.MeetingsViewModel
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
        if (!editor && !attendance && !report && !poll && state.selected != null) MeetingDetailsDialog(state.selected!!, true, onDismiss = { selected = null }, onAttend = {}, onVote = { }, onCreatePoll = { poll = true })
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
    if (selectedId != null && detail != null) MeetingDetailsDialog(detail, false, onDismiss = { selectedId = null }, onAttend = { viewModel.markSelfPresent(selectedId!!) }, onVote = { choice -> viewModel.castVote(selectedId!!, choice) }, onCreatePoll = {})
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
private fun MeetingDetailsDialog(detail: MeetingDetailsDto, admin: Boolean, onDismiss: () -> Unit, onAttend: () -> Unit, onVote: (String) -> Unit, onCreatePoll: () -> Unit) {
    AlertDialog(onDismissRequest = onDismiss, title = { Text(detail.title ?: "Meeting") }, text = {
        Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            KeyValue("Type", detail.meetingType ?: "-"); KeyValue("Date", detail.meetingDate?.take(10) ?: "-"); KeyValue("Time", "${detail.startTime ?: "-"} - ${detail.endTime ?: "-"}"); KeyValue("Venue", detail.venue ?: "-"); KeyValue("Priority", detail.priority ?: "Normal"); KeyValue("Status", detail.status ?: "-")
            Text(detail.description ?: "No description provided.")
            Text("Agenda", fontWeight = FontWeight.Bold); detail.agendas.orEmpty().forEachIndexed { index, item -> Text("${index + 1}. ${item.itemText ?: ""}") }
            detail.report?.let { report -> Text("Minutes", fontWeight = FontWeight.Bold); Text(report.summary ?: "No summary"); Text(report.discussion ?: ""); Text(report.decisionsTaken ?: "") }
            detail.documents.orEmpty().forEach { Text("Attachment: ${it.fileName ?: it.fileUrl ?: "file"}") }
            if (!admin) { detail.myAttendance?.let { Text("Your attendance: $it", color = MaterialTheme.colorScheme.primary) }; detail.vote?.let { vote -> Text("Poll: ${vote.question}", fontWeight = FontWeight.Bold); if (vote.hasVoted == true) Text("You voted ${vote.myChoice}") else Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { listOf("YES", "NO", "ABSTAIN").forEach { TextButton(onClick = { onVote(it) }) { Text(it) } } } } }
        }
    }, confirmButton = { if (!admin && detail.myAttendance == null) Button(onClick = onAttend) { Text("Mark attendance") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Close") } })
}

@Composable
private fun MeetingEditorDialog(existing: MeetingDto?, submitting: Boolean, onDismiss: () -> Unit, onSave: (MeetingSaveRequest) -> Unit) {
    var title by remember { mutableStateOf(existing?.title.orEmpty()) }; var type by remember { mutableStateOf(existing?.meetingType ?: "Committee Meeting") }; var date by remember { mutableStateOf(existing?.meetingDate?.take(10).orEmpty()) }; var start by remember { mutableStateOf(existing?.startTime.orEmpty()) }; var end by remember { mutableStateOf(existing?.endTime.orEmpty()) }; var venue by remember { mutableStateOf(existing?.venue.orEmpty()) }; var description by remember { mutableStateOf(existing?.description.orEmpty()) }; var priority by remember { mutableStateOf(existing?.priority ?: "Normal") }
    AlertDialog(onDismissRequest = onDismiss, title = { Text(if (existing == null) "Create meeting" else "Edit meeting") }, text = { Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) { BasicAppTextField(title, { title = it }, "Title"); BasicAppTextField(type, { type = it }, "Meeting type"); BasicAppTextField(date, { date = it }, "Date YYYY-MM-DD"); BasicAppTextField(start, { start = it }, "Start time HH:MM"); BasicAppTextField(end, { end = it }, "End time HH:MM"); BasicAppTextField(venue, { venue = it }, "Venue"); BasicAppTextField(priority, { priority = it }, "Priority"); BasicAppTextField(description, { description = it }, "Description") } }, confirmButton = { Button(enabled = !submitting && title.isNotBlank() && date.isNotBlank() && start.isNotBlank() && end.isNotBlank() && venue.isNotBlank(), onClick = { onSave(MeetingSaveRequest(title, type, date, start, end, venue, description.ifBlank { null }, priority)) }) { Text(if (submitting) "Saving…" else "Save") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}

@Composable private fun AttendanceDialog(rows: List<MeetingAttendanceDto>, submitting: Boolean, onDismiss: () -> Unit, onSave: (List<MeetingAttendanceDto>) -> Unit) { var values by remember(rows) { mutableStateOf(rows) }; AlertDialog(onDismissRequest = onDismiss, title = { Text("Attendance") }, text = { Column(Modifier.heightIn(max = 450.dp).verticalScroll(rememberScrollState())) { values.forEachIndexed { index, row -> Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Column { Text(row.residentName ?: "Resident", fontWeight = FontWeight.Bold); Text("Flat ${row.flatNo ?: "-"}") }; TextButton(onClick = { values = values.toMutableList().also { it[index] = row.copy(status = nextStatus(row.status)) } }) { Text(row.status ?: "Absent") } } } } }, confirmButton = { Button(enabled = !submitting, onClick = { onSave(values); onDismiss() }) { Text("Save") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Close") } }) }
private fun nextStatus(status: String?): String = when (status) { "Absent" -> "Present"; "Present" -> "Late"; "Late" -> "Excused"; else -> "Absent" }

@Composable private fun ReportDialog(existing: MeetingReportDto?, submitting: Boolean, onDismiss: () -> Unit, onSave: (String, String, String, String) -> Unit) { var summary by remember { mutableStateOf(existing?.summary.orEmpty()) }; var discussion by remember { mutableStateOf(existing?.discussion.orEmpty()) }; var decisions by remember { mutableStateOf(existing?.decisionsTaken.orEmpty()) }; var remarks by remember { mutableStateOf(existing?.remarks.orEmpty()) }; AlertDialog(onDismissRequest = onDismiss, title = { Text("Minutes of Meeting") }, text = { Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) { BasicAppTextField(summary, { summary = it }, "Summary"); BasicAppTextField(discussion, { discussion = it }, "Discussion"); BasicAppTextField(decisions, { decisions = it }, "Key decisions"); BasicAppTextField(remarks, { remarks = it }, "Remarks") } }, confirmButton = { Button(enabled = !submitting, onClick = { onSave(summary, discussion, decisions, remarks) }) { Text("Save minutes") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }) }

@Composable private fun PollDialog(existing: MeetingVoteDto?, submitting: Boolean, onDismiss: () -> Unit, onSave: (String) -> Unit) { var question by remember { mutableStateOf(existing?.question.orEmpty()) }; AlertDialog(onDismissRequest = onDismiss, title = { Text("Meeting poll") }, text = { BasicAppTextField(question, { question = it }, "Question") }, confirmButton = { Button(enabled = question.isNotBlank() && !submitting, onClick = { onSave(question) }) { Text("Save poll") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }) }
