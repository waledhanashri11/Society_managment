package com.example.application.ui.screens.admin

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.FlowRowScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.data.remote.dto.FlatDto
import com.example.application.data.remote.dto.StaffDto
import com.example.application.data.remote.dto.UserSummaryDto
import com.example.application.ui.components.BasicAppTextField
import com.example.application.ui.components.EmptyState
import com.example.application.ui.components.PrimaryAppButton
import com.example.application.ui.components.RetryState
import com.example.application.ui.screens.dashboard.DashboardSkeleton
import com.example.application.ui.screens.dashboard.KeyValue
import com.example.application.ui.screens.dashboard.SectionCard
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.FlatDetailsViewModel
import com.example.application.viewmodel.FlatFormViewModel
import com.example.application.viewmodel.FlatsViewModel
import com.example.application.viewmodel.ResidentDetailsViewModel
import com.example.application.viewmodel.ResidentFormViewModel
import com.example.application.viewmodel.ResidentsViewModel
import com.example.application.viewmodel.StaffDetailsViewModel
import com.example.application.viewmodel.StaffFormViewModel
import com.example.application.viewmodel.StaffViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResidentsListScreen(
    onBack: () -> Unit,
    onAdd: () -> Unit,
    onOpen: (String) -> Unit,
    onEdit: (String) -> Unit,
    viewModel: ResidentsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val filtered by remember(state.items, state.query, state.filter) {
        derivedStateOf {
            state.items
                .filter { it.matchesResidentQuery(state.query) }
                .filter {
                    when (state.filter) {
                        "pending" -> it.status == "pending"
                        "approved" -> it.status == "approved" || it.status.isNullOrBlank()
                        "rejected" -> it.status == "rejected"
                        "assigned" -> !it.flatId.isNullOrBlank()
                        "unassigned" -> it.flatId.isNullOrBlank()
                        else -> true
                    }
                }
        }
    }
    var confirmDelete by remember { mutableStateOf<UserSummaryDto?>(null) }
    var confirmStatus by remember { mutableStateOf<Pair<UserSummaryDto, String>?>(null) }

    ManagementListScaffold(
        title = "Residents",
        subtitle = "Admin-only resident accounts and flat assignments",
        onBack = onBack,
        onAdd = onAdd,
        isRefreshing = state.isRefreshing,
        onRefresh = { viewModel.load(refresh = true) },
        query = state.query,
        onQuery = viewModel::setQuery,
        filter = state.filter,
        onFilter = viewModel::setFilter,
        filters = listOf("all" to "All", "pending" to "Pending", "approved" to "Approved", "rejected" to "Rejected", "assigned" to "Assigned", "unassigned" to "Unassigned"),
        loading = state.isLoading,
        error = state.error,
        message = state.message,
        onRetry = { viewModel.load(refresh = true) },
        empty = filtered.isEmpty()
    ) {
        items(filtered, key = { it.id ?: it.email.orEmpty() }) { resident ->
            ResidentCard(
                resident = resident,
                busy = state.actionId == resident.id,
                onOpen = { resident.id?.let(onOpen) },
                onEdit = { resident.id?.let(onEdit) },
                onApprove = { confirmStatus = resident to "approved" },
                onReject = { confirmStatus = resident to "rejected" },
                onDelete = { confirmDelete = resident }
            )
        }
    }

    confirmStatus?.let { (resident, status) ->
        ConfirmDialog(
            title = if (status == "approved") "Approve resident?" else "Reject resident?",
            message = "${resident.name ?: "This resident"} will be marked as $status.",
            confirmText = if (status == "approved") "Approve" else "Reject",
            destructive = status == "rejected",
            onDismiss = { confirmStatus = null },
            onConfirm = {
                resident.id?.let { viewModel.updateStatus(it, status) }
                confirmStatus = null
            }
        )
    }
    confirmDelete?.let { resident ->
        ConfirmDialog(
            title = "Delete resident?",
            message = "This will delete the account and release the assigned flat if the backend allows it.",
            confirmText = "Delete",
            destructive = true,
            onDismiss = { confirmDelete = null },
            onConfirm = {
                resident.id?.let { viewModel.delete(it) }
                confirmDelete = null
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResidentDetailsScreen(
    onBack: () -> Unit,
    onEdit: (String) -> Unit,
    onDeleted: () -> Unit,
    viewModel: ResidentDetailsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val resident = state.item
    var confirmDelete by remember { mutableStateOf(false) }
    var confirmStatus by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(state.message) {
        if (state.message?.contains("deleted", ignoreCase = true) == true) onDeleted()
    }

    ManagementDetailScaffold("Resident Details", onBack, state.isLoading, state.error, { viewModel.load() }) {
        resident?.let {
            SectionCard("Resident") {
                KeyValue("Name", it.name ?: "-")
                KeyValue("Email", it.email ?: "-")
                KeyValue("Phone", it.phone ?: "-")
                KeyValue("Status", it.status ?: "approved")
                KeyValue("Created", DashboardFormatters.date(it.createdAt))
            }
            SectionCard("Flat") {
                KeyValue("Flat", it.flatNo ?: "Not assigned")
                KeyValue("Wing", it.wing ?: "-")
                KeyValue("Floor", it.floorNo ?: "-")
                KeyValue("Flat status", it.flatStatus ?: "-")
            }
            ManagementActions {
                Button(onClick = { it.id?.let(onEdit) }) { Text("Edit / Assign Flat") }
                if (it.status != "approved") Button(onClick = { confirmStatus = "approved" }) { Text("Approve") }
                if (it.status != "rejected") Button(onClick = { confirmStatus = "rejected" }) { Text("Reject") }
                Button(onClick = { confirmDelete = true }) { Text("Delete") }
            }
        }
    }
    confirmStatus?.let { status ->
        ConfirmDialog("Update status?", "Set this resident to $status.", status.replaceFirstChar { it.uppercase() }, status == "rejected", { confirmStatus = null }) {
            viewModel.updateStatus(status)
            confirmStatus = null
        }
    }
    if (confirmDelete) {
        ConfirmDialog("Delete resident?", "This action cannot be undone if the backend accepts it.", "Delete", true, { confirmDelete = false }) {
            viewModel.delete()
            confirmDelete = false
        }
    }
}

@Composable
fun ResidentFormScreen(
    title: String,
    onBack: () -> Unit,
    viewModel: ResidentFormViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(state.done) { if (state.done) onBack() }
    ManagementFormScaffold(title, onBack, state.isLoading, state.error) {
        BasicAppTextField(state.name, viewModel::updateName, "Full name")
        BasicAppTextField(state.email, viewModel::updateEmail, "Email", enabled = true)
        BasicAppTextField(state.phone, viewModel::updatePhone, "Phone")
        if (state.id == null) {
            OutlinedTextField(
                value = state.password,
                onValueChange = viewModel::updatePassword,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Temporary password") },
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true
            )
        }
        SelectTextChips("Status", listOf("approved", "pending", "rejected"), state.status, viewModel::updateStatus)
        SelectChips(
            label = "Assigned flat",
            options = state.flats.mapNotNull { flat -> flat.id?.let { it to "Wing ${flat.wing ?: "A"} - Flat ${flat.flatNo ?: "-"}" } },
            selected = state.flatId,
            onSelected = viewModel::updateFlat
        )
        PrimaryAppButton(if (state.id == null) "Add Resident" else "Save Resident", viewModel::submit, enabled = !state.isSubmitting)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FlatsListScreen(
    onBack: () -> Unit,
    onAdd: () -> Unit,
    onOpen: (String) -> Unit,
    onEdit: (String) -> Unit,
    viewModel: FlatsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val filtered by remember(state.items, state.query, state.filter) {
        derivedStateOf {
            state.items.filter { it.matchesFlatQuery(state.query) }.filter {
                when (state.filter) {
                    "occupied" -> !it.ownerId.isNullOrBlank() || it.status.equals("Occupied", true)
                    "available" -> it.ownerId.isNullOrBlank() && !it.status.equals("Occupied", true)
                    else -> true
                }
            }
        }
    }
    var confirmDelete by remember { mutableStateOf<FlatDto?>(null) }
    ManagementListScaffold(
        "Flats", "Society flats and resident assignments", onBack, onAdd,
        state.isRefreshing, { viewModel.load(refresh = true) },
        state.query, viewModel::setQuery, state.filter, viewModel::setFilter,
        listOf("all" to "All", "occupied" to "Occupied", "available" to "Available"),
        state.isLoading, state.error, state.message, { viewModel.load(refresh = true) }, filtered.isEmpty()
    ) {
        items(filtered, key = { it.id ?: it.flatNo.orEmpty() }) { flat ->
            FlatCard(flat, state.actionId == flat.id, { flat.id?.let(onOpen) }, { flat.id?.let(onEdit) }, { confirmDelete = flat })
        }
    }
    confirmDelete?.let { flat ->
        ConfirmDialog("Delete flat?", "Assigned resident will be unassigned if backend allows deletion.", "Delete", true, { confirmDelete = null }) {
            flat.id?.let { viewModel.delete(it) }
            confirmDelete = null
        }
    }
}

@Composable
fun FlatDetailsScreen(
    onBack: () -> Unit,
    onEdit: (String) -> Unit,
    onDeleted: () -> Unit,
    viewModel: FlatDetailsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val flat = state.item
    var confirmDelete by remember { mutableStateOf(false) }
    LaunchedEffect(state.message) { if (state.message?.contains("deleted", true) == true) onDeleted() }
    ManagementDetailScaffold("Flat Details", onBack, state.isLoading, state.error, { viewModel.load() }) {
        flat?.let {
            SectionCard("Flat") {
                KeyValue("Flat number", it.flatNo ?: "-")
                KeyValue("Wing", it.wing ?: "A")
                KeyValue("Floor", it.floorNo ?: "-")
                KeyValue("Maintenance", DashboardFormatters.money((it.maintenanceCharge ?: 0.0).toBigDecimal()))
                KeyValue("Status", it.status ?: "-")
            }
            SectionCard("Assignment") {
                KeyValue("Resident", it.assignedResidentName ?: it.ownerName ?: "Unassigned")
                KeyValue("Email", it.ownerEmail ?: "-")
            }
            ManagementActions {
                Button(onClick = { it.id?.let(onEdit) }) { Text("Edit / Assign Resident") }
                Button(onClick = { confirmDelete = true }) { Text("Delete") }
            }
        }
    }
    if (confirmDelete) {
        ConfirmDialog("Delete flat?", "This action cannot be undone if the backend accepts it.", "Delete", true, { confirmDelete = false }) {
            viewModel.delete()
            confirmDelete = false
        }
    }
}

@Composable
fun FlatFormScreen(
    title: String,
    onBack: () -> Unit,
    viewModel: FlatFormViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(state.done) { if (state.done) onBack() }
    ManagementFormScaffold(title, onBack, state.isLoading, state.error) {
        BasicAppTextField(state.flatNo, viewModel::updateFlatNo, "Flat number")
        BasicAppTextField(state.wing, viewModel::updateWing, "Wing / Block")
        BasicAppTextField(state.floorNo, viewModel::updateFloor, "Floor number")
        BasicAppTextField(state.maintenanceCharge, viewModel::updateMaintenance, "Maintenance charge")
        SelectChips(
            label = "Assigned resident",
            options = listOf("" to "Unassigned") + state.residents.mapNotNull { user -> user.id?.let { it to "${user.name ?: "Resident"} (${user.email ?: "-"})" } },
            selected = state.ownerId,
            onSelected = viewModel::updateOwner
        )
        PrimaryAppButton(if (state.id == null) "Add Flat" else "Save Flat", viewModel::submit, enabled = !state.isSubmitting)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffListScreen(
    onBack: () -> Unit,
    onAdd: () -> Unit,
    onOpen: (String) -> Unit,
    onEdit: (String) -> Unit,
    viewModel: StaffViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val filtered by remember(state.items, state.query) {
        derivedStateOf { state.items.filter { it.matchesStaffQuery(state.query) } }
    }
    var confirmDelete by remember { mutableStateOf<StaffDto?>(null) }
    ManagementListScaffold(
        "Staff", "Society staff, contact and salary records", onBack, onAdd,
        state.isRefreshing, { viewModel.load(refresh = true) },
        state.query, viewModel::setQuery, state.filter, viewModel::setFilter,
        listOf("all" to "All"), state.isLoading, state.error, state.message, { viewModel.load(refresh = true) }, filtered.isEmpty()
    ) {
        items(filtered, key = { it.id ?: it.name.orEmpty() }) { staff ->
            StaffCard(staff, state.actionId == staff.id, { staff.id?.let(onOpen) }, { staff.id?.let(onEdit) }, { confirmDelete = staff })
        }
    }
    confirmDelete?.let { staff ->
        ConfirmDialog("Delete staff?", "This staff record will be deleted if the backend allows it.", "Delete", true, { confirmDelete = null }) {
            staff.id?.let { viewModel.delete(it) }
            confirmDelete = null
        }
    }
}

@Composable
fun StaffDetailsScreen(
    onBack: () -> Unit,
    onEdit: (String) -> Unit,
    onDeleted: () -> Unit,
    viewModel: StaffDetailsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val staff = state.item
    var confirmDelete by remember { mutableStateOf(false) }
    LaunchedEffect(state.message) { if (state.message?.contains("deleted", true) == true) onDeleted() }
    ManagementDetailScaffold("Staff Details", onBack, state.isLoading, state.error, { viewModel.load() }) {
        staff?.let {
            SectionCard("Staff member") {
                KeyValue("Name", it.name ?: "-")
                KeyValue("Role", it.role ?: "-")
                KeyValue("Phone", it.phone ?: "-")
                KeyValue("Salary", DashboardFormatters.money((it.salary?.toBigDecimalOrNull() ?: 0.toBigDecimal())))
                KeyValue("Created", DashboardFormatters.date(it.createdAt))
            }
            ManagementActions {
                Button(onClick = { it.id?.let(onEdit) }) { Text("Edit") }
                Button(onClick = { confirmDelete = true }) { Text("Delete") }
            }
        }
    }
    if (confirmDelete) {
        ConfirmDialog("Delete staff?", "This action cannot be undone if the backend accepts it.", "Delete", true, { confirmDelete = false }) {
            viewModel.delete()
            confirmDelete = false
        }
    }
}

@Composable
fun StaffFormScreen(
    title: String,
    onBack: () -> Unit,
    viewModel: StaffFormViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(state.done) { if (state.done) onBack() }
    ManagementFormScaffold(title, onBack, state.isLoading, state.error) {
        BasicAppTextField(state.name, viewModel::updateName, "Name")
        BasicAppTextField(state.role, viewModel::updateRole, "Role / designation")
        BasicAppTextField(state.phone, viewModel::updatePhone, "Phone")
        BasicAppTextField(state.salary, viewModel::updateSalary, "Salary")
        PrimaryAppButton(if (state.id == null) "Add Staff" else "Save Staff", viewModel::submit, enabled = !state.isSubmitting)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ManagementListScaffold(
    title: String,
    subtitle: String,
    onBack: () -> Unit,
    onAdd: () -> Unit,
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    query: String,
    onQuery: (String) -> Unit,
    filter: String,
    onFilter: (String) -> Unit,
    filters: List<Pair<String, String>>,
    loading: Boolean,
    error: String?,
    message: String?,
    onRetry: () -> Unit,
    empty: Boolean,
    content: androidx.compose.foundation.lazy.LazyListScope.() -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
                actions = { TextButton(onClick = onAdd) { Text("Add") } }
            )
        }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = onRefresh,
            modifier = Modifier.fillMaxSize().padding(padding)
        ) {
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item {
                    Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedTextField(
                        value = query,
                        onValueChange = onQuery,
                        modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                        label = { Text("Search") },
                        singleLine = true
                    )
                    SelectChips("Filter", filters, filter, onFilter)
                    message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
                    error?.let { RetryState(it, onRetry) }
                }
                if (loading) {
                    item { DashboardSkeleton() }
                } else if (empty && error == null) {
                    item { EmptyState("No records found", "Try refresh or clear filters.") }
                } else {
                    content()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ManagementDetailScaffold(
    title: String,
    onBack: () -> Unit,
    loading: Boolean,
    error: String?,
    onRetry: () -> Unit,
    content: @Composable ColumnScope.() -> Unit
) {
    Scaffold(topBar = { TopAppBar(title = { Text(title) }, navigationIcon = { TextButton(onClick = onBack) { Text("Back") } }) }) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            when {
                loading -> item { DashboardSkeleton() }
                error != null -> item { RetryState(error, onRetry) }
                else -> item { Column(verticalArrangement = Arrangement.spacedBy(12.dp), content = content) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ManagementFormScaffold(
    title: String,
    onBack: () -> Unit,
    loading: Boolean,
    error: String?,
    content: @Composable ColumnScope.() -> Unit
) {
    Scaffold(topBar = { TopAppBar(title = { Text(title) }, navigationIcon = { TextButton(onClick = onBack) { Text("Back") } }) }) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            when {
                loading -> item { DashboardSkeleton() }
                else -> item {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        error?.let { RetryState(it, onRetry = {}) }
                        content()
                    }
                }
            }
        }
    }
}

@Composable
private fun ResidentCard(resident: UserSummaryDto, busy: Boolean, onOpen: () -> Unit, onEdit: () -> Unit, onApprove: () -> Unit, onReject: () -> Unit, onDelete: () -> Unit) {
    ManagementCard(onOpen) {
        Text(resident.name ?: "Resident", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text(resident.email ?: "-", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text("Flat: ${resident.flatNo ?: "Not assigned"} • Status: ${resident.status ?: "approved"}")
        ManagementActions {
            TextButton(onClick = onOpen, enabled = !busy) { Text("View") }
            TextButton(onClick = onEdit, enabled = !busy) { Text("Edit") }
            if (resident.status != "approved") TextButton(onClick = onApprove, enabled = !busy) { Text("Approve") }
            if (resident.status != "rejected") TextButton(onClick = onReject, enabled = !busy) { Text("Reject") }
            TextButton(onClick = onDelete, enabled = !busy) { Text("Delete") }
        }
    }
}

@Composable
private fun FlatCard(flat: FlatDto, busy: Boolean, onOpen: () -> Unit, onEdit: () -> Unit, onDelete: () -> Unit) {
    ManagementCard(onOpen) {
        Text("Flat ${flat.flatNo ?: "-"}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text("Wing ${flat.wing ?: "A"} • Floor ${flat.floorNo ?: "-"}")
        Text("Resident: ${flat.assignedResidentName ?: flat.ownerName ?: "Unassigned"}")
        Text("Status: ${flat.status ?: if (flat.ownerId.isNullOrBlank()) "Available" else "Occupied"}")
        ManagementActions {
            TextButton(onClick = onOpen, enabled = !busy) { Text("View") }
            TextButton(onClick = onEdit, enabled = !busy) { Text("Edit") }
            TextButton(onClick = onDelete, enabled = !busy) { Text("Delete") }
        }
    }
}

@Composable
private fun StaffCard(staff: StaffDto, busy: Boolean, onOpen: () -> Unit, onEdit: () -> Unit, onDelete: () -> Unit) {
    ManagementCard(onOpen) {
        Text(staff.name ?: "Staff", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text(staff.role ?: "-", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text("Phone: ${staff.phone ?: "-"} • Salary: ${staff.salary ?: "0"}")
        ManagementActions {
            TextButton(onClick = onOpen, enabled = !busy) { Text("View") }
            TextButton(onClick = onEdit, enabled = !busy) { Text("Edit") }
            TextButton(onClick = onDelete, enabled = !busy) { Text("Delete") }
        }
    }
}

@Composable
private fun ManagementCard(onClick: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp), content = content)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ManagementActions(content: @Composable FlowRowScope.() -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), content = content)
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SelectTextChips(label: String, options: List<String>, selected: String, onSelected: (String) -> Unit) {
    SelectChips(label, options.map { it to it.replaceFirstChar { char -> char.uppercase() } }, selected, onSelected)
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SelectChips(label: String, options: List<Pair<String, String>>, selected: String, onSelected: (String) -> Unit) {
    Column {
        Text(label, style = MaterialTheme.typography.labelLarge)
        Spacer(Modifier.height(6.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { (value, text) ->
                FilterChip(selected = selected == value, onClick = { onSelected(value) }, label = { Text(text) })
            }
        }
    }
}

@Composable
private fun ConfirmDialog(
    title: String,
    message: String,
    confirmText: String,
    destructive: Boolean,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { Text(message) },
        confirmButton = { TextButton(onClick = onConfirm) { Text(confirmText, color = if (destructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

private fun UserSummaryDto.matchesResidentQuery(query: String): Boolean {
    if (query.isBlank()) return true
    val q = query.trim().lowercase()
    return listOf(name, email, phone, flatNo, wing).any { it?.lowercase()?.contains(q) == true }
}

private fun FlatDto.matchesFlatQuery(query: String): Boolean {
    if (query.isBlank()) return true
    val q = query.trim().lowercase()
    return listOf(flatNo, wing, floorNo, assignedResidentName, ownerName, ownerEmail).any { it?.lowercase()?.contains(q) == true }
}

private fun StaffDto.matchesStaffQuery(query: String): Boolean {
    if (query.isBlank()) return true
    val q = query.trim().lowercase()
    return listOf(name, role, phone).any { it?.lowercase()?.contains(q) == true }
}
