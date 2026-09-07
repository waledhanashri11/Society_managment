package com.example.application.ui.screens.admin

import android.content.Context
import android.net.Uri
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.example.application.data.remote.dto.AdminProfileDto
import com.example.application.viewmodel.AdminProfileViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminProfileScreen(onBack: () -> Unit, viewModel: AdminProfileViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val profile = state.profile
    val snackbar = remember { SnackbarHostState() }
    val context = LocalContext.current
    var societyName by remember(profile) { mutableStateOf(profile?.societyName.orEmpty()) }
    var address by remember(profile) { mutableStateOf(profile?.address.orEmpty()) }
    var phone by remember(profile) { mutableStateOf(profile?.phone.orEmpty()) }
    var photo by remember(profile) { mutableStateOf(profile?.profilePicture.orEmpty()) }
    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { imageDataUri(context, it) }?.let { photo = it }
    }

    LaunchedEffect(state.message, state.error) {
        val feedback = state.message ?: state.error
        if (feedback != null) {
            snackbar.showSnackbar(feedback)
            viewModel.consumeFeedback()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                title = { Text("My Profile", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } },
                actions = { IconButton(onClick = viewModel::load, enabled = !state.loading) { Icon(Icons.Filled.Refresh, "Refresh profile") } }
            )
        }
    ) { padding ->
        when {
            state.loading && profile == null -> ProfileSkeleton(Modifier.padding(padding))
            state.loadError != null && profile == null -> LoadError(state.loadError.orEmpty(), viewModel::load, Modifier.padding(padding))
            profile != null -> LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                item { ProfileHeader(profile, state.role, photo) }
                item {
                    Card(shape = RoundedCornerShape(18.dp), elevation = CardDefaults.cardElevation(2.dp)) {
                        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text("Profile information", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                                if (!state.editing) TextButton(onClick = { viewModel.setEditing(true) }) { Icon(Icons.Filled.Edit, null); Text(" Edit Profile") }
                            }
                            InfoRow(Icons.Filled.Badge, "Full Name", profile.adminName)
                            InfoRow(Icons.Filled.Email, "Email", profile.email)
                            InfoRow(Icons.Filled.Badge, "Role", state.role.replaceFirstChar { it.uppercase() })
                            if (state.editing) {
                                OutlinedTextField(societyName, { societyName = it }, label = { Text("Society Name") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                                OutlinedTextField(address, { address = it }, label = { Text("Address") }, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(phone, { phone = it }, label = { Text("Phone") }, modifier = Modifier.fillMaxWidth(), singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone))
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedButton(onClick = { photoPicker.launch("image/*") }, enabled = !state.saving) { Icon(Icons.Filled.Upload, null); Text(" Photo") }
                                    if (photo.isNotBlank()) TextButton(onClick = { photo = "" }, enabled = !state.saving) { Text("Remove photo") }
                                }
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    OutlinedButton(onClick = { viewModel.setEditing(false) }, enabled = !state.saving, modifier = Modifier.weight(1f)) { Text("Cancel") }
                                    Button(onClick = { viewModel.save(societyName, address, phone, photo) }, enabled = !state.saving, modifier = Modifier.weight(1f)) {
                                        if (state.saving) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) else Icon(Icons.Filled.Save, null)
                                        Text(if (state.saving) " Saving" else " Save")
                                    }
                                }
                            } else {
                                InfoRow(Icons.Filled.Business, "Society Name", profile.societyName)
                                InfoRow(Icons.Filled.Phone, "Phone", profile.phone)
                                InfoRow(Icons.Filled.Home, "Address", profile.address)
                                profile.society?.code?.takeIf { it.isNotBlank() }?.let { InfoRow(Icons.Filled.Business, "Society Code", it) }
                                profile.society?.registrationNumber?.takeIf { it.isNotBlank() }?.let { InfoRow(Icons.Filled.Badge, "Registration Number", it) }
                            }
                        }
                    }
                }
                item { PasswordCard(state.passwordOpen, state.changingPassword, state.passwordResetKey, { viewModel.setPasswordOpen(it) }, viewModel::changePassword) }
            }
        }
    }
}

@Composable private fun ProfileHeader(profile: AdminProfileDto, role: String, photo: String) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary), shape = RoundedCornerShape(22.dp)) {
        Column(Modifier.fillMaxWidth().padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(7.dp)) {
            if (photo.isNotBlank()) AsyncImage(photo, "Admin profile photo", Modifier.size(92.dp).clip(CircleShape), contentScale = ContentScale.Crop)
            else Box(Modifier.size(92.dp).clip(CircleShape).background(Color.White.copy(alpha = .2f)), contentAlignment = Alignment.Center) {
                Text(initials(profile.adminName), style = MaterialTheme.typography.headlineMedium, color = Color.White, fontWeight = FontWeight.Bold)
            }
            Text(profile.adminName.orEmpty().ifBlank { "Admin" }, style = MaterialTheme.typography.headlineSmall, color = Color.White, fontWeight = FontWeight.Bold)
            Text(profile.email.orEmpty(), color = Color.White.copy(alpha = .9f))
            Text(role.replaceFirstChar { it.uppercase() }, color = Color.White.copy(alpha = .82f), fontWeight = FontWeight.SemiBold)
            profile.societyName?.takeIf { it.isNotBlank() }?.let { Text(it, color = Color.White.copy(alpha = .9f)) }
        }
    }
}

@Composable private fun InfoRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String?) {
    if (value.isNullOrBlank()) return
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = MaterialTheme.colorScheme.primary)
        Column { Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant); Text(value) }
    }
}

@Composable private fun PasswordCard(open: Boolean, loading: Boolean, resetKey: Int, onOpen: (Boolean) -> Unit, submit: (String, String, String) -> Unit) {
    var current by remember(resetKey) { mutableStateOf("") }; var new by remember(resetKey) { mutableStateOf("") }; var confirm by remember(resetKey) { mutableStateOf("") }; var visible by remember { mutableStateOf(false) }
    Card(shape = RoundedCornerShape(18.dp)) { Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Text("Security", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold); TextButton(onClick = { onOpen(!open) }) { Icon(Icons.Filled.Lock, null); Text(if (open) " Close" else " Change Password") } }
        if (open) {
            fun transformation() = if (visible) VisualTransformation.None else PasswordVisualTransformation()
            OutlinedTextField(current, { current = it }, label = { Text("Current Password") }, visualTransformation = transformation(), trailingIcon = { IconButton(onClick = { visible = !visible }) { Icon(if (visible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility, null) } }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            OutlinedTextField(new, { new = it }, label = { Text("New Password") }, supportingText = { Text("At least 6 characters") }, visualTransformation = transformation(), modifier = Modifier.fillMaxWidth(), singleLine = true)
            OutlinedTextField(confirm, { confirm = it }, label = { Text("Confirm New Password") }, visualTransformation = transformation(), modifier = Modifier.fillMaxWidth(), singleLine = true)
            Button(onClick = { submit(current, new, confirm) }, enabled = !loading, modifier = Modifier.fillMaxWidth()) { if (loading) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp); Text(if (loading) " Updating..." else "Update Password") }
        }
    } }
}

@Composable private fun ProfileSkeleton(modifier: Modifier = Modifier) { LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) { items(3) { Box(Modifier.fillMaxWidth().height(if (it == 0) 220.dp else 150.dp).clip(RoundedCornerShape(18.dp)).background(MaterialTheme.colorScheme.surfaceVariant)) } } }
@Composable private fun LoadError(message: String, retry: () -> Unit, modifier: Modifier = Modifier) { Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) { Text("Unable to load profile", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold); Text(message, color = MaterialTheme.colorScheme.onSurfaceVariant); Button(onClick = retry) { Text("Retry") } } } }

private fun initials(name: String?): String = name.orEmpty().trim().split(Regex("\\s+")).filter { it.isNotBlank() }.take(2).mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("").ifBlank { "A" }
private fun imageDataUri(context: Context, uri: Uri): String? = runCatching { val type = context.contentResolver.getType(uri) ?: "image/jpeg"; val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return null; if (bytes.size > 2 * 1024 * 1024) return null; "data:$type;base64,${Base64.encodeToString(bytes, Base64.NO_WRAP)}" }.getOrNull()
