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
import com.example.application.data.remote.dto.CreateSocietyRequest
import com.example.application.data.remote.dto.ManagedSocietyDto
import com.example.application.data.remote.dto.SocietyAdminInput
import com.example.application.viewmodel.SessionViewModel
import com.example.application.viewmodel.SuperAdminViewModel

@Composable
fun SuperAdminDashboardScreen(
    onSocieties: () -> Unit,
    onSociety: (String) -> Unit,
    onLogoutComplete: () -> Unit,
    viewModel: SuperAdminViewModel = hiltViewModel(),
    sessionViewModel: SessionViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(Unit) { viewModel.load() }
    Scaffold(topBar = {
        PlatformTopBar("SocietyHub", "Super Admin Portal", onLogout = { sessionViewModel.logout(onLogoutComplete) })
    }) { padding ->
        ContentState(state.loading, state.error, { viewModel.load() }, Modifier.padding(padding)) {
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

@Composable
fun SocietyDetailsScreen(societyId: String, onBack: () -> Unit, viewModel: SuperAdminViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(societyId) { viewModel.loadSociety(societyId) }
    Scaffold(topBar = { SimpleTopBar("Society Details", onBack) }) { padding ->
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
                        Button(
                            onClick = { viewModel.setStatus(society.id, if (society.status == "active") "inactive" else "active") },
                            enabled = !state.submitting,
                            modifier = Modifier.fillMaxWidth(),
                            colors = if (society.status == "active") ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error) else ButtonDefaults.buttonColors()
                        ) { Text(if (society.status == "active") "Deactivate Society" else "Activate Society") }
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

private fun String.blankToNull() = takeIf { it.isNotBlank() }

@Composable private fun Field(value: String, onValue: (String) -> Unit, label: String, password: Boolean = false) = OutlinedTextField(value, onValue, Modifier.fillMaxWidth(), label = { Text(label) }, singleLine = true, visualTransformation = if (password) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None)
@Composable private fun Detail(label: String, value: String?) { if (!value.isNullOrBlank()) { Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant); Text(value) } }
@Composable private fun StatusBadge(status: String) { val active = status == "active"; Surface(color = if (active) Color(0xFFDCFCE7) else Color(0xFFFEE2E2), shape = RoundedCornerShape(50)) { Text(if (active) "Active" else "Inactive", color = if (active) Color(0xFF166534) else Color(0xFF991B1B), modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp), fontWeight = FontWeight.SemiBold) } }
@Composable private fun MetricCard(label: String, value: Int, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier) { Card(modifier) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { Icon(icon, null, tint = MaterialTheme.colorScheme.primary); Text(value.toString(), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold); Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant) } } }

@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun SimpleTopBar(title: String, onBack: () -> Unit) = TopAppBar(title = { Text(title, fontWeight = FontWeight.Bold) }, navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } })
@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun PlatformTopBar(title: String, subtitle: String, onLogout: () -> Unit) = TopAppBar(title = { Column { Text(title, fontWeight = FontWeight.Bold); Text(subtitle, style = MaterialTheme.typography.labelMedium) } }, actions = { IconButton(onClick = onLogout) { Icon(Icons.Filled.Logout, "Logout") } })

@Composable private fun ContentState(loading: Boolean, error: String?, retry: () -> Unit, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Box(modifier.fillMaxSize()) { when { loading -> CircularProgressIndicator(Modifier.align(Alignment.Center)); error != null -> Column(Modifier.align(Alignment.Center).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) { Text(error); Button(onClick = retry) { Text("Retry") } }; else -> content() } }
}
