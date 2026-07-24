@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package com.example.application.ui.screens.resident

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.FilterChip
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.example.application.ui.components.ErrorMessageCard
import com.example.application.util.LocaleHelper
import com.example.application.viewmodel.ProfileViewModel
import com.example.application.viewmodel.SessionViewModel

@Composable
fun ResidentProfileScreen(
    onBack: () -> Unit,
    onChangePassword: () -> Unit,
    onLogoutComplete: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel(),
    sessionViewModel: SessionViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val profile = state.profile
    var localPhotoUri by rememberSaveable { mutableStateOf<String?>(null) }
    val displayPhoto = localPhotoUri ?: profile?.profileImage
    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        localPhotoUri = uri?.toString()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "My Profile",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = if (state.isLoading) "Loading latest profile..." else "Resident account details",
            modifier = Modifier.padding(top = 4.dp, bottom = 16.dp),
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Box(
                modifier = Modifier
                    .size(104.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                if (!displayPhoto.isNullOrBlank()) {
                    AsyncImage(
                        model = displayPhoto,
                        contentDescription = "Resident profile photo",
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(CircleShape)
                    )
                } else {
                    Text(
                        text = profile?.name?.trim()?.firstOrNull()?.uppercaseChar()?.toString() ?: "R",
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }
        }
        TextButton(onClick = { photoPicker.launch("image/*") }, modifier = Modifier.fillMaxWidth()) {
            Text("Change Profile Photo")
        }

        state.errorMessage?.let {
            ErrorMessageCard(it)
            Spacer(Modifier.height(12.dp))
        }
        state.updateMessage?.let {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                Text(it, modifier = Modifier.padding(14.dp), color = MaterialTheme.colorScheme.onPrimaryContainer)
            }
            Spacer(Modifier.height(12.dp))
        }

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(18.dp)) {
                ProfileRow("Name", profile?.name ?: "-")
                ProfileRow("Email", profile?.email ?: "-")
                ProfileRow("Role", profile?.role ?: "resident")
                ProfileRow("Status", profile?.status ?: "-")
                ProfileRow("Phone", profile?.phone ?: "-")
                ProfileRow("Flat", profile?.flatNo?.let { "Wing ${profile.wing ?: "A"} - Flat $it" } ?: "Not assigned")
                ProfileRow("Floor", profile?.floorNo ?: "-")
                ProfileRow("Flat Status", profile?.flatStatus ?: "-")
                ProfileRow("Society", profile?.societyName ?: "-")
            }
        }

        Spacer(Modifier.height(16.dp))

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(18.dp)) {
                Text("Update Phone Number", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = state.phone,
                    onValueChange = viewModel::updatePhoneInput,
                    label = { Text("Phone") },
                    isError = state.phoneError != null,
                    supportingText = state.phoneError?.let { { Text(it) } },
                    enabled = !state.isUpdating,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(12.dp))
                Button(onClick = viewModel::savePhone, enabled = !state.isUpdating, modifier = Modifier.fillMaxWidth()) {
                    Text(if (state.isUpdating) "Saving..." else "Save Phone")
                }
                TextButton(onClick = onChangePassword, modifier = Modifier.fillMaxWidth()) {
                    Text("Change Password")
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        LanguageSettingsCard()

        Spacer(Modifier.height(12.dp))
        OutlinedButton(
            onClick = { sessionViewModel.logout(onLogoutComplete) },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
        ) {
            Text("Logout")
        }
        Spacer(Modifier.height(8.dp))
        TextButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
            Text("Back to Dashboard")
        }
    }
}

@Composable
private fun LanguageSettingsCard() {
    val context = LocalContext.current
    var selected by rememberSaveable { mutableStateOf(LocaleHelper.selectedLanguage(context)) }
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Language", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text("Choose app language. The app will refresh after selection.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(
                    LocaleHelper.ENGLISH to "English",
                    LocaleHelper.HINDI to "हिन्दी",
                    LocaleHelper.MARATHI to "मराठी"
                ).forEach { (code, label) ->
                    FilterChip(
                        selected = selected == code,
                        onClick = {
                            selected = code
                            LocaleHelper.saveLanguage(context, code)
                            (context as? Activity)?.recreate()
                        },
                        label = { Text(label) }
                    )
                }
            }
        }
    }
}

@Composable
private fun ProfileRow(label: String, value: String) {
    Column(modifier = Modifier.padding(vertical = 6.dp)) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyLarge)
    }
}
