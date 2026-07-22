package com.example.application.ui.screens.rules

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Publish
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.R
import com.example.application.data.remote.dto.SocietyRuleAcknowledgementReportDto
import com.example.application.data.remote.dto.SocietyRuleDto
import com.example.application.ui.components.EmptyState
import com.example.application.ui.components.RetryState
import com.example.application.ui.screens.dashboard.DashboardSkeleton
import com.example.application.ui.screens.dashboard.KeyValue
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.AdminSocietyRulesViewModel
import com.example.application.viewmodel.ResidentSocietyRulesViewModel
import com.example.application.viewmodel.SocietyRulesState

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AdminSocietyRulesScreen(
    onBack: () -> Unit,
    viewModel: AdminSocietyRulesViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var editRule by remember { mutableStateOf<SocietyRuleDto?>(null) }
    var showCreate by remember { mutableStateOf(false) }
    var reportRule by remember { mutableStateOf<SocietyRuleDto?>(null) }
    val rules by remember(state.items, state.query, state.category, state.priority, state.status) {
        derivedStateOf { state.items.filteredRules(state) }
    }

    RulesShell(
        title = stringResource(R.string.rules_admin_title),
        onBack = onBack,
        refreshing = state.isRefreshing,
        onRefresh = { viewModel.load(true) },
        loading = state.isLoading,
        error = state.error,
        onRetry = { viewModel.load(true) },
        action = {
            IconButton(onClick = { showCreate = true }) {
                Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.rules_create))
            }
        }
    ) {
        item {
            RuleFilters(
                state = state,
                admin = true,
                onQuery = viewModel::setQuery,
                onCategory = viewModel::setCategory,
                onPriority = viewModel::setPriority,
                onStatus = viewModel::setStatus
            )
            StatusText(state.message, state.error)
        }
        if (rules.isEmpty()) {
            item { EmptyState(stringResource(R.string.rules_empty_title), stringResource(R.string.rules_empty_admin)) }
        } else {
            items(rules, key = { it.id ?: it.title.orEmpty() }) { rule ->
                RuleCard(rule = rule, admin = true, onOpen = { viewModel.selectRule(rule) }) {
                    AdminRuleActions(
                        rule = rule,
                        onEdit = { editRule = rule },
                        onPublish = { rule.id?.let(viewModel::publishRule) },
                        onUnpublish = { rule.id?.let(viewModel::unpublishRule) },
                        onArchive = { rule.id?.let(viewModel::archiveRule) },
                        onReport = {
                            reportRule = rule
                            rule.id?.let { viewModel.loadReport(it, true) }
                        },
                        onReminder = { rule.id?.let(viewModel::sendReminders) }
                    )
                }
            }
        }
    }

    val formRule = editRule ?: if (showCreate) SocietyRuleDto(null, null, null, "General", "normal", "draft", null, null, null, null, null, null, null, null, null, false, false, null, null, null) else null
    formRule?.let { rule ->
        RuleFormDialog(
            rule = if (showCreate) null else rule,
            submitting = state.submitting,
            onDismiss = {
                showCreate = false
                editRule = null
            },
            onSave = { title, description, category, priority, publishNow ->
                viewModel.saveRule(rule.id, title, description, category, priority, publishNow)
                showCreate = false
                editRule = null
            }
        )
    }

    state.selectedRule?.let { rule ->
        RuleDetailsDialog(
            rule = rule,
            admin = true,
            submitting = state.submitting,
            onDismiss = { viewModel.selectRule(null) },
            onAcknowledge = {}
        )
    }

    reportRule?.let { rule ->
        AcknowledgementReportDialog(
            rule = rule,
            report = state.report,
            submitting = state.submitting,
            onDismiss = { reportRule = null },
            onReminder = { rule.id?.let(viewModel::sendReminders) }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ResidentSocietyRulesScreen(
    onBack: () -> Unit,
    viewModel: ResidentSocietyRulesViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val rules by remember(state.items, state.query, state.category, state.priority) {
        derivedStateOf { state.items.filteredRules(state.copy(status = "published")) }
    }

    RulesShell(
        title = stringResource(R.string.rules_resident_title),
        onBack = onBack,
        refreshing = state.isRefreshing,
        onRefresh = { viewModel.load(true) },
        loading = state.isLoading,
        error = state.error,
        onRetry = { viewModel.load(true) }
    ) {
        item {
            RuleFilters(
                state = state,
                admin = false,
                onQuery = viewModel::setQuery,
                onCategory = viewModel::setCategory,
                onPriority = viewModel::setPriority,
                onStatus = {}
            )
            StatusText(state.message, state.error)
        }
        if (rules.isEmpty()) {
            item { EmptyState(stringResource(R.string.rules_empty_title), stringResource(R.string.rules_empty_resident)) }
        } else {
            items(rules, key = { it.id ?: it.title.orEmpty() }) { rule ->
                RuleCard(rule = rule, admin = false, onOpen = { viewModel.selectRule(rule) }) {}
            }
        }
    }

    state.selectedRule?.let { rule ->
        RuleDetailsDialog(
            rule = rule,
            admin = false,
            submitting = state.submitting,
            onDismiss = { viewModel.selectRule(null) },
            onAcknowledge = { rule.id?.let(viewModel::acknowledge) }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RulesShell(
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
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title, fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = stringResource(R.string.back)) } },
                actions = { action() }
            )
        }
    ) { padding ->
        PullToRefreshBox(isRefreshing = refreshing, onRefresh = onRefresh, modifier = Modifier.fillMaxSize().padding(padding)) {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                when {
                    loading -> item { DashboardSkeleton() }
                    error != null -> item { RetryState(error, onRetry) }
                    else -> content()
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun RuleFilters(
    state: SocietyRulesState,
    admin: Boolean,
    onQuery: (String) -> Unit,
    onCategory: (String) -> Unit,
    onPriority: (String) -> Unit,
    onStatus: (String) -> Unit
) {
    OutlinedTextField(
        value = state.query,
        onValueChange = onQuery,
        modifier = Modifier.fillMaxWidth(),
        leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
        label = { Text(stringResource(R.string.rules_search)) },
        singleLine = true
    )
    ChipRow(listOf("All", "General", "Security", "Maintenance", "Parking", "Events"), state.category, onCategory)
    ChipRow(listOf("All", "low", "normal", "high", "urgent"), state.priority, onPriority)
    if (admin) ChipRow(listOf("All", "draft", "published", "archived"), state.status, onStatus)
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ChipRow(values: List<String>, selected: String, onSelected: (String) -> Unit) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.padding(top = 8.dp)
    ) {
        values.forEach { value ->
            FilterChip(
                selected = selected.equals(value, ignoreCase = true),
                onClick = { onSelected(value) },
                label = { Text(value.ruleLabel()) }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RuleCard(
    rule: SocietyRuleDto,
    admin: Boolean,
    onOpen: () -> Unit,
    actions: @Composable ColumnScope.() -> Unit
) {
    Card(
        onClick = onOpen,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AssistChip(onClick = {}, label = { Text((rule.category ?: "General").ruleLabel()) })
                AssistChip(onClick = {}, label = { Text((rule.priority ?: "normal").ruleLabel()) })
                AssistChip(onClick = {}, label = { Text((rule.status ?: "published").ruleLabel()) })
            }
            Text(rule.title ?: stringResource(R.string.rules_rule), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(
                rule.description?.lineSequence()?.firstOrNull().orEmpty().ifBlank { "-" },
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 3
            )
            KeyValue(stringResource(R.string.rules_published), DashboardFormatters.date(rule.publishedAt ?: rule.createdAt))
            if (admin) {
                KeyValue(stringResource(R.string.rules_acknowledged), "${rule.acknowledgedCount ?: 0}/${rule.totalResidents ?: 0}")
            } else {
                KeyValue(
                    stringResource(R.string.rules_ack_status),
                    if (rule.isAcknowledged == true) stringResource(R.string.rules_acknowledged_done) else stringResource(R.string.rules_pending)
                )
                rule.acknowledgedAt?.let { KeyValue(stringResource(R.string.rules_ack_date), DashboardFormatters.date(it)) }
            }
            actions()
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AdminRuleActions(
    rule: SocietyRuleDto,
    onEdit: () -> Unit,
    onPublish: () -> Unit,
    onUnpublish: () -> Unit,
    onArchive: () -> Unit,
    onReport: () -> Unit,
    onReminder: () -> Unit
) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        TextButton(onClick = onEdit, enabled = rule.status != "archived") {
            Icon(Icons.Filled.Edit, contentDescription = null)
            Spacer(Modifier.width(4.dp))
            Text(stringResource(R.string.rules_edit))
        }
        if (rule.status == "published") {
            TextButton(onClick = onUnpublish) {
                Icon(Icons.Filled.Visibility, contentDescription = null)
                Spacer(Modifier.width(4.dp))
                Text(stringResource(R.string.rules_unpublish))
            }
        } else if (rule.status != "archived") {
            TextButton(onClick = onPublish) {
                Icon(Icons.Filled.Publish, contentDescription = null)
                Spacer(Modifier.width(4.dp))
                Text(stringResource(R.string.rules_publish))
            }
        }
        TextButton(onClick = onReport) {
            Icon(Icons.Filled.CheckCircle, contentDescription = null)
            Spacer(Modifier.width(4.dp))
            Text(stringResource(R.string.rules_report))
        }
        TextButton(onClick = onReminder, enabled = rule.status == "published" && (rule.pendingCount ?: 0) > 0) {
            Icon(Icons.Filled.Notifications, contentDescription = null)
            Spacer(Modifier.width(4.dp))
            Text(stringResource(R.string.rules_remind))
        }
        TextButton(onClick = onArchive, enabled = rule.status != "archived") {
            Icon(Icons.Filled.Archive, contentDescription = null)
            Spacer(Modifier.width(4.dp))
            Text(stringResource(R.string.rules_archive))
        }
    }
}

@Composable
private fun RuleFormDialog(
    rule: SocietyRuleDto?,
    submitting: Boolean,
    onDismiss: () -> Unit,
    onSave: (String, String, String, String, Boolean) -> Unit
) {
    var title by remember(rule?.id) { mutableStateOf(rule?.title.orEmpty()) }
    var description by remember(rule?.id) { mutableStateOf(rule?.description.orEmpty()) }
    var category by remember(rule?.id) { mutableStateOf(rule?.category ?: "General") }
    var priority by remember(rule?.id) { mutableStateOf(rule?.priority ?: "normal") }
    var publishNow by remember(rule?.id) { mutableStateOf(rule?.status == "published") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (rule == null) stringResource(R.string.rules_create) else stringResource(R.string.rules_edit)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(title, { title = it }, modifier = Modifier.fillMaxWidth(), label = { Text(stringResource(R.string.rules_title)) }, singleLine = true)
                OutlinedTextField(description, { description = it }, modifier = Modifier.fillMaxWidth(), label = { Text(stringResource(R.string.rules_description)) }, minLines = 4)
                OutlinedTextField(category, { category = it }, modifier = Modifier.fillMaxWidth(), label = { Text(stringResource(R.string.rules_category)) }, singleLine = true)
                ChipRow(listOf("low", "normal", "high", "urgent"), priority, { priority = it })
                FilterChip(selected = publishNow, onClick = { publishNow = !publishNow }, label = { Text(stringResource(R.string.rules_publish_now)) })
            }
        },
        confirmButton = {
            Button(
                enabled = title.isNotBlank() && description.isNotBlank() && !submitting,
                onClick = { onSave(title.trim(), description.trim(), category.trim().ifBlank { "General" }, priority, publishNow) }
            ) { Text(if (submitting) stringResource(R.string.saving) else stringResource(R.string.save)) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.close)) } }
    )
}

@Composable
private fun RuleDetailsDialog(
    rule: SocietyRuleDto,
    admin: Boolean,
    submitting: Boolean,
    onDismiss: () -> Unit,
    onAcknowledge: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(rule.title ?: stringResource(R.string.rules_rule)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AssistChip(onClick = {}, label = { Text((rule.category ?: "General").ruleLabel()) })
                    AssistChip(onClick = {}, label = { Text((rule.priority ?: "normal").ruleLabel()) })
                }
                Text(rule.description ?: "-", style = MaterialTheme.typography.bodyLarge)
                Divider()
                KeyValue(stringResource(R.string.rules_status), (rule.status ?: "published").ruleLabel())
                KeyValue(stringResource(R.string.rules_published), DashboardFormatters.date(rule.publishedAt ?: rule.createdAt))
                if (!admin) {
                    KeyValue(stringResource(R.string.rules_read_status), if (rule.isRead == true) stringResource(R.string.rules_read) else stringResource(R.string.rules_unread))
                    KeyValue(stringResource(R.string.rules_ack_status), if (rule.isAcknowledged == true) stringResource(R.string.rules_acknowledged_done) else stringResource(R.string.rules_pending))
                    rule.acknowledgedAt?.let { KeyValue(stringResource(R.string.rules_ack_date), DashboardFormatters.date(it)) }
                }
            }
        },
        confirmButton = {
            if (!admin) {
                Button(onClick = onAcknowledge, enabled = rule.isAcknowledged != true && !submitting) {
                    Text(if (rule.isAcknowledged == true) stringResource(R.string.rules_acknowledged_done) else stringResource(R.string.rules_ack_button))
                }
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.close)) } }
    )
}

@Composable
private fun AcknowledgementReportDialog(
    rule: SocietyRuleDto,
    report: SocietyRuleAcknowledgementReportDto?,
    submitting: Boolean,
    onDismiss: () -> Unit,
    onReminder: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.rules_report)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(rule.title ?: stringResource(R.string.rules_rule), fontWeight = FontWeight.Bold)
                val summary = report?.summary
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    ReportStat(stringResource(R.string.rules_total), summary?.totalResidents ?: 0, Modifier.weight(1f))
                    ReportStat(stringResource(R.string.rules_done), summary?.acknowledgedCount ?: 0, Modifier.weight(1f))
                    ReportStat(stringResource(R.string.rules_pending), summary?.pendingCount ?: 0, Modifier.weight(1f))
                }
                Divider()
                LazyColumn(modifier = Modifier.height(300.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(report?.residents.orEmpty(), key = { it.residentId ?: it.residentName.orEmpty() }) { resident ->
                        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f))) {
                            Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(resident.residentName ?: "Resident", fontWeight = FontWeight.SemiBold)
                                Text("${resident.wing.orEmpty()}-${resident.flatNo.orEmpty()}  •  ${resident.email.orEmpty()}", style = MaterialTheme.typography.bodySmall)
                                Text(
                                    if (resident.isAcknowledged == true) "${stringResource(R.string.rules_acknowledged_done)}: ${DashboardFormatters.date(resident.acknowledgedAt)}"
                                    else stringResource(R.string.rules_pending),
                                    color = if (resident.isAcknowledged == true) Color(0xFF1B7F3A) else MaterialTheme.colorScheme.error
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = onReminder, enabled = !submitting && ((report?.summary?.pendingCount ?: rule.pendingCount ?: 0) > 0)) {
                Text(stringResource(R.string.rules_send_reminders))
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.close)) } }
    )
}

@Composable
private fun ReportStat(label: String, value: Int, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(12.dp))
            .padding(10.dp)
    ) {
        Text(value.toString(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun StatusText(message: String?, error: String?) {
    message?.let { Text(it, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(top = 8.dp)) }
    error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp)) }
}

private fun List<SocietyRuleDto>.filteredRules(state: SocietyRulesState): List<SocietyRuleDto> {
    val q = state.query.trim().lowercase()
    return filter { rule ->
        (q.isBlank() || listOf(rule.title, rule.description, rule.category, rule.priority, rule.status).any { it?.lowercase()?.contains(q) == true }) &&
            (state.category == "All" || rule.category.equals(state.category, ignoreCase = true)) &&
            (state.priority == "All" || rule.priority.equals(state.priority, ignoreCase = true)) &&
            (state.status == "All" || rule.status.equals(state.status, ignoreCase = true))
    }
}

private fun String.ruleLabel(): String {
    return replace("_", " ").replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
}
