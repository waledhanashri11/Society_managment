package com.example.application.ui.screens.superadmin

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import com.example.application.data.remote.dto.CreateSocietyRequest
import com.example.application.data.remote.dto.ManagedSocietyDto
import com.example.application.data.remote.dto.SocietyAdminInput
import com.example.application.data.remote.dto.UpdateAdminRequest
import com.example.application.data.remote.dto.UpdateSocietyRequest
import com.example.application.viewmodel.SessionViewModel
import com.example.application.viewmodel.SuperAdminViewModel
import com.example.application.ui.components.LocalizedText as Text

@Composable
fun SuperAdminDashboardScreen(
    onSocieties: () -> Unit,
    onSociety: (String) -> Unit,
    onProfile: () -> Unit,
    onLogoutComplete: () -> Unit,
    viewModel: SuperAdminViewModel = hiltViewModel(),
    sessionViewModel: SessionViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { viewModel.load() }
    Scaffold(topBar = {
        PlatformTopBar(
            "SocietyHub",
            "Super Admin Portal",
            refreshing = state.loading || state.refreshing,
            onRefresh = viewModel::load,
            onProfile = onProfile,
            onLogout = { sessionViewModel.logout(onLogoutComplete) }
        )
    }) { padding ->
        ContentState(state.loading, state.error, { viewModel.load(force = true) }, Modifier.padding(padding), "Loading platform data…") {
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                item {
                    Text("Platform Overview", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text("Manage societies and monitor platform growth.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                state.summary?.let { summary ->
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                MetricCard("Societies", summary.totalSocieties, Icons.Filled.Apartment, Modifier.weight(1f))
                                MetricCard("Active", summary.activeSocieties, Icons.Filled.CheckCircle, Modifier.weight(1f))
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                MetricCard("Residents", summary.totalResidents, Icons.Filled.People, Modifier.weight(1f))
                                MetricCard("Flats", summary.totalFlats, Icons.Filled.HomeWork, Modifier.weight(1f))
                            }
                        }
                    }
                }
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Societies", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        TextButton(onClick = onSocieties) { Text("View all") }
                    }
                }
                items(state.societies.take(5), key = { it.id }) { SocietyCard(it) { onSociety(it.id) } }
            }
        }
    }
}

@Composable
fun SocietyListScreen(
    onBack: () -> Unit,
    onAdd: () -> Unit,
    onSociety: (String) -> Unit,
    viewModel: SuperAdminViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(Unit) { viewModel.load() }
    Scaffold(
        topBar = { SimpleTopBar("Societies", onBack) },
        floatingActionButton = { ExtendedFloatingActionButton(onClick = onAdd, icon = { Icon(Icons.Filled.Add, null) }, text = { Text("Add Society") }) }
    ) { padding ->
        ContentState(state.loading, state.error, { viewModel.load() }, Modifier.padding(padding)) {
            if (state.societies.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("No societies have been created yet.") }
            else LazyColumn(contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 96.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(state.societies, key = { it.id }) { SocietyCard(it) { onSociety(it.id) } }
            }
        }
    }
}

@Composable
private fun SocietyCard(society: ManagedSocietyDto, onClick: () -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClick = onClick), shape = RoundedCornerShape(18.dp)) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column(Modifier.weight(1f)) {
                    Text(society.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(society.code, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                }
                StatusBadge(society.status)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                Text("${society.residentCount} residents")
                Text("${society.flatCount} flats")
            }
            Text("View Details  →", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SocietyDetailsScreen(
    societyId: String,
    onBack: () -> Unit,
    onEdit: (String) -> Unit,
    viewModel: SuperAdminViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(societyId) { viewModel.loadSociety(societyId) }
    Scaffold(topBar = {
        TopAppBar(
            title = { Text("Society Details", fontWeight = FontWeight.Bold) },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } },
            actions = {
                IconButton(onClick = { onEdit(societyId) }) { Icon(Icons.Filled.Edit, "Edit Society") }
            }
        )
    }) { padding ->
        ContentState(state.loading, state.error, { viewModel.loadSociety(societyId) }, Modifier.padding(padding)) {
            state.selected?.let { society ->
                LazyColumn(contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    item {
                        Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp)) {
                            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(society.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                    StatusBadge(society.status)
                                }
                                Detail("Code", society.code)
                                Detail("Registration", society.registrationNumber)
                                Detail("Address", listOfNotNull(society.address, society.city, society.state, society.pincode).joinToString(", "))
                                Detail("Contact", society.contactEmail ?: society.contactPhone)
                            }
                        }
                    }
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            MetricCard("Residents", society.residentCount, Icons.Filled.People, Modifier.weight(1f))
                            MetricCard("Flats", society.flatCount, Icons.Filled.HomeWork, Modifier.weight(1f))
                        }
                    }
                    item {
                        Card(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Society Administrator", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Detail("Name", society.adminName)
                                Detail("Email", society.adminEmail)
                                Detail("Mobile", society.adminPhone)
                            }
                        }
                    }
                    item {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedButton(
                                onClick = { onEdit(societyId) },
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Filled.Edit, null)
                                Spacer(Modifier.width(6.dp))
                                Text("Edit Society")
                            }
                            Button(
                                onClick = { viewModel.setStatus(society.id, if (society.status == "active") "inactive" else "active") },
                                enabled = !state.submitting,
                                modifier = Modifier.weight(1f),
                                colors = if (society.status == "active") ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error) else ButtonDefaults.buttonColors()
                            ) { Text(if (society.status == "active") "Deactivate" else "Activate") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CreateSocietyScreen(onBack: () -> Unit, onCreated: (String) -> Unit, viewModel: SuperAdminViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var name by remember { mutableStateOf("") }; var code by remember { mutableStateOf("") }
    var registration by remember { mutableStateOf("") }; var address by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }; var region by remember { mutableStateOf("") }; var pincode by remember { mutableStateOf("") }
    var contactEmail by remember { mutableStateOf("") }; var contactPhone by remember { mutableStateOf("") }
    var adminName by remember { mutableStateOf("") }; var adminEmail by remember { mutableStateOf("") }; var adminPhone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }; var validation by remember { mutableStateOf<String?>(null) }
    Scaffold(topBar = { SimpleTopBar("Create Society", onBack) }) { padding ->
        LazyColumn(Modifier.padding(padding), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { Text("Society Profile", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
            item { Field(name, { name = it }, "Society Name") }; item { Field(code, { code = it.uppercase() }, "Society Code") }
            item { Field(registration, { registration = it }, "Registration Number") }; item { Field(address, { address = it }, "Address") }
            item { Field(city, { city = it }, "City") }; item { Field(region, { region = it }, "State") }; item { Field(pincode, { pincode = it }, "Pincode") }
            item { Field(contactEmail, { contactEmail = it }, "Contact Email") }; item { Field(contactPhone, { contactPhone = it }, "Contact Phone") }
            item { Spacer(Modifier.height(6.dp)); Text("Society Administrator", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
            item { Field(adminName, { adminName = it }, "Admin Name") }; item { Field(adminEmail, { adminEmail = it }, "Admin Email") }
            item { Field(adminPhone, { adminPhone = it }, "Admin Mobile") }; item { Field(password, { password = it }, "Initial Password", true) }
            item { (validation ?: state.error)?.let { Text(it, color = MaterialTheme.colorScheme.error) } }
            item {
                Button(onClick = {
                    validation = when { name.isBlank() || code.length < 2 -> "Society name and code are required."; adminName.isBlank() || !adminEmail.contains("@") -> "Valid administrator details are required."; password.length < 10 -> "Initial password must contain at least 10 characters."; else -> null }
                    if (validation == null) viewModel.create(CreateSocietyRequest(name, code, address.blankToNull(), city.blankToNull(), region.blankToNull(), pincode.blankToNull(), registration.blankToNull(), contactPhone.blankToNull(), contactEmail.blankToNull(), SocietyAdminInput(adminName, adminEmail, adminPhone.blankToNull(), password)), onCreated)
                }, enabled = !state.submitting, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(if (state.submitting) "Creating…" else "Create Society") }
            }
        }
    }
}

@Composable
fun EditSocietyScreen(
    societyId: String,
    onBack: () -> Unit,
    viewModel: SuperAdminViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(societyId) { viewModel.loadSociety(societyId) }

    val society = state.selected

    var name by remember(society) { mutableStateOf(society?.name.orEmpty()) }
    var code by remember(society) { mutableStateOf(society?.code.orEmpty()) }
    var registration by remember(society) { mutableStateOf(society?.registrationNumber.orEmpty()) }
    var address by remember(society) { mutableStateOf(society?.address.orEmpty()) }
    var city by remember(society) { mutableStateOf(society?.city.orEmpty()) }
    var region by remember(society) { mutableStateOf(society?.state.orEmpty()) }
    var pincode by remember(society) { mutableStateOf(society?.pincode.orEmpty()) }
    var contactEmail by remember(society) { mutableStateOf(society?.contactEmail.orEmpty()) }
    var contactPhone by remember(society) { mutableStateOf(society?.contactPhone.orEmpty()) }

    var adminName by remember(society) { mutableStateOf(society?.adminName.orEmpty()) }
    var adminEmail by remember(society) { mutableStateOf(society?.adminEmail.orEmpty()) }
    var adminPhone by remember(society) { mutableStateOf(society?.adminPhone.orEmpty()) }
    var adminPassword by remember { mutableStateOf("") }

    var validation by remember { mutableStateOf<String?>(null) }

    Scaffold(topBar = { SimpleTopBar("Edit Society", onBack) }) { padding ->
        ContentState(state.loading, state.error, { viewModel.loadSociety(societyId) }, Modifier.padding(padding)) {
            LazyColumn(contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item { Text("Society Details", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
                item { Field(name, { name = it }, "Society Name") }
                item { Field(code, { code = it.uppercase() }, "Society Code") }
                item { Field(registration, { registration = it }, "Registration Number") }
                item { Field(address, { address = it }, "Address") }
                item { Field(city, { city = it }, "City") }
                item { Field(region, { region = it }, "State") }
                item { Field(pincode, { pincode = it }, "Pincode") }
                item { Field(contactEmail, { contactEmail = it }, "Contact Email") }
                item { Field(contactPhone, { contactPhone = it }, "Contact Phone") }
                item {
                    Button(
                        onClick = {
                            validation = when {
                                name.isBlank() || code.length < 2 -> "Society name and code are required."
                                contactEmail.isNotBlank() && !contactEmail.contains("@") -> "Enter a valid contact email."
                                else -> null
                            }
                            if (validation == null) {
                                viewModel.updateSociety(
                                    societyId,
                                    UpdateSocietyRequest(name, code, address.blankToNull(), city.blankToNull(), region.blankToNull(), pincode.blankToNull(), registration.blankToNull(), contactPhone.blankToNull(), contactEmail.blankToNull()),
                                    onDone = onBack
                                )
                            }
                        },
                        enabled = !state.submitting,
                        modifier = Modifier.fillMaxWidth().height(48.dp)
                    ) { Text(if (state.submitting) "Saving…" else "Update Society Details") }
                }

                item { Spacer(Modifier.height(8.dp)); Divider(); Spacer(Modifier.height(4.dp)); Text("Administrator Settings", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
                item { Field(adminName, { adminName = it }, "Admin Name") }
                item { Field(adminEmail, { adminEmail = it }, "Admin Email") }
                item { Field(adminPhone, { adminPhone = it }, "Admin Phone") }
                item { Field(adminPassword, { adminPassword = it }, "New Admin Password (Optional)", password = true) }
                item {
                    Button(
                        onClick = {
                            validation = when {
                                adminName.isBlank() || !adminEmail.contains("@") -> "Valid administrator name and email are required."
                                adminPassword.isNotBlank() && adminPassword.length < 10 -> "Password must contain at least 10 characters."
                                else -> null
                            }
                            if (validation == null) {
                                viewModel.updateAdmin(
                                    societyId,
                                    UpdateAdminRequest(adminName, adminEmail, adminPhone.blankToNull(), adminPassword.blankToNull()),
                                    onDone = onBack
                                )
                            }
                        },
                        enabled = !state.submitting,
                        modifier = Modifier.fillMaxWidth().height(48.dp)
                    ) { Text(if (state.submitting) "Saving…" else "Update Administrator") }
                }

                item { (validation ?: state.error)?.let { Text(it, color = MaterialTheme.colorScheme.error) } }
            }
        }
    }
}

@Composable
fun SuperAdminProfileScreen(
    onBack: () -> Unit,
    onChangePassword: () -> Unit,
    onLogoutComplete: () -> Unit,
    sessionViewModel: SessionViewModel = hiltViewModel()
) {
    val session by sessionViewModel.session.collectAsStateWithLifecycle()
    Scaffold(topBar = { SimpleTopBar("Super Admin Profile", onBack) }) { padding ->
        LazyColumn(Modifier.padding(padding).fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item {
                Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp)) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Icon(Icons.Filled.AccountCircle, null, modifier = Modifier.size(60.dp), tint = MaterialTheme.colorScheme.primary)
                            Column {
                                Text(session?.name ?: "Super Administrator", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                                Text(session?.role?.uppercase() ?: "SUPER_ADMIN", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                            }
                        }
                        Divider()
                        Detail("Email", session?.email)
                        Detail("Phone", session?.phone ?: "N/A")
                        Detail("Status", session?.status?.uppercase() ?: "ACTIVE")
                    }
                }
            }
            item {
                OutlinedButton(onClick = onChangePassword, modifier = Modifier.fillMaxWidth().height(48.dp)) {
                    Icon(Icons.Filled.Lock, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Change Password")
                }
            }
            item {
                Button(
                    onClick = { sessionViewModel.logout(onLogoutComplete) },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Icon(Icons.Filled.Logout, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Logout")
                }
            }
        }
    }
}

private fun String.blankToNull() = takeIf { it.isNotBlank() }

@Composable private fun Field(value: String, onValue: (String) -> Unit, label: String, password: Boolean = false) = OutlinedTextField(value, onValue, Modifier.fillMaxWidth(), label = { Text(label) }, singleLine = true, visualTransformation = if (password) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None)
@Composable private fun Detail(label: String, value: String?) { if (!value.isNullOrBlank()) { Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant); Text(value) } }
@Composable private fun StatusBadge(status: String) { val active = status == "active"; Surface(color = if (active) Color(0xFFDCFCE7) else Color(0xFFFEE2E2), shape = RoundedCornerShape(50)) { Text(if (active) "Active" else "Inactive", color = if (active) Color(0xFF166534) else Color(0xFF991B1B), modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp), fontWeight = FontWeight.SemiBold) } }
@Composable private fun MetricCard(label: String, value: Int, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier) { Card(modifier) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { Icon(icon, null, tint = MaterialTheme.colorScheme.primary); Text(value.toString(), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold); Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant) } } }

@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun SimpleTopBar(title: String, onBack: () -> Unit) = TopAppBar(title = { Text(title, fontWeight = FontWeight.Bold) }, navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } })
@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun PlatformTopBar(title: String, subtitle: String, refreshing: Boolean, onRefresh: () -> Unit, onProfile: () -> Unit, onLogout: () -> Unit) = TopAppBar(
    title = { Column { Text(title, fontWeight = FontWeight.Bold); Text(subtitle, style = MaterialTheme.typography.labelMedium) } },
    actions = {
        IconButton(onClick = onRefresh, enabled = !refreshing) {
            if (refreshing) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
            else Icon(Icons.Filled.Refresh, "Refresh")
        }
        IconButton(onClick = onProfile) { Icon(Icons.Filled.Person, "Profile") }
        IconButton(onClick = onLogout) { Icon(Icons.Filled.Logout, "Logout") }
    }
)

@Composable private fun ContentState(loading: Boolean, error: String?, retry: () -> Unit, modifier: Modifier = Modifier, loadingMessage: String = "Loading…", content: @Composable () -> Unit) {
    Box(modifier.fillMaxSize()) {
        when {
            loading -> Column(Modifier.align(Alignment.Center).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                CircularProgressIndicator()
                Text(loadingMessage, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("The free server may take up to a minute to wake up.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            error != null -> Column(Modifier.align(Alignment.Center).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(Icons.Filled.CloudOff, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(42.dp))
                Text("Unable to refresh", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(error, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Button(onClick = retry) { Icon(Icons.Filled.Refresh, null); Spacer(Modifier.width(8.dp)); Text("Retry") }
            }
            else -> content()
        }
    }
}
