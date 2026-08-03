@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package com.example.application.ui.screens.resident

import android.app.Activity
import android.content.Context
import android.net.Uri
import java.io.File
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import androidx.compose.ui.res.stringResource
import com.example.application.R
import com.example.application.ui.components.ErrorMessageCard
import com.example.application.ui.components.LanguageSelectorCard
import com.example.application.util.LocaleHelper
import com.example.application.viewmodel.ProfileViewModel
import com.example.application.viewmodel.SessionViewModel

@OptIn(ExperimentalMaterial3Api::class)
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
    val context = LocalContext.current
    val photoPreferences = remember { context.getSharedPreferences("resident_profile_preferences", Context.MODE_PRIVATE) }
    val photoKey = "profile_photo_${profile?.email.orEmpty().lowercase()}"
    var localPhotoUri by rememberSaveable(photoKey) { mutableStateOf(photoPreferences.getString(photoKey, null)) }
    val displayPhoto = localPhotoUri ?: profile?.profileImage
    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri ?: return@rememberLauncherForActivityResult
        runCatching {
            val extension = context.contentResolver.getType(uri)?.substringAfter('/')?.takeIf { it.length <= 5 } ?: "jpg"
            val directory = File(context.filesDir, "profile-photos").apply { mkdirs() }
            val target = File(directory, "resident-${profile?.email.orEmpty().hashCode()}.$extension")
            context.contentResolver.openInputStream(uri)?.use { input -> target.outputStream().use(input::copyTo) } ?: error("Unable to read photo")
            Uri.fromFile(target).toString()
        }.onSuccess { savedUri ->
            localPhotoUri = savedUri
            photoPreferences.edit().putString(photoKey, savedUri).apply()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.my_profile)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.back)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.Top
        ) {
            Text(
                text = stringResource(R.string.resident_account_details),
                modifier = Modifier.padding(bottom = 16.dp),
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                if (state.isLoading && profile == null) {
                    com.example.application.ui.components.SkeletonAvatar(size = 104.dp)
                } else {
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
            }
            TextButton(onClick = { photoPicker.launch("image/*") }, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.change_profile_photo))
            }
            if (!localPhotoUri.isNullOrBlank()) {
                TextButton(onClick = {
                    localPhotoUri?.let { runCatching { Uri.parse(it).path?.let(::File)?.delete() } }
                    localPhotoUri = null
                    photoPreferences.edit().remove(photoKey).apply()
                }, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.remove_profile_photo)) }
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
                    if (state.isLoading && profile == null) {
                        repeat(6) {
                            com.example.application.ui.components.SkeletonTableRow()
                        }
                    } else {
                        ProfileRow(stringResource(R.string.full_name), profile?.name ?: "-")
                        ProfileRow(stringResource(R.string.email), profile?.email ?: "-")
                        ProfileRow(stringResource(R.string.login_role), profile?.role ?: "resident")
                        ProfileRow(stringResource(R.string.rules_status), profile?.status ?: "-")
                        ProfileRow(stringResource(R.string.phone), profile?.phone ?: "-")
                        ProfileRow(stringResource(R.string.flats), profile?.flatNo?.let { "Wing ${profile.wing ?: "A"} - Flat $it" } ?: "Not assigned")
                        ProfileRow(stringResource(R.string.society_management), profile?.societyName ?: "-")
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text(stringResource(R.string.update_phone_number), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = state.phone,
                        onValueChange = viewModel::updatePhoneInput,
                        label = { Text(stringResource(R.string.phone)) },
                        isError = state.phoneError != null,
                        supportingText = state.phoneError?.let { { Text(it) } },
                        enabled = !state.isUpdating,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = viewModel::savePhone, enabled = !state.isUpdating, modifier = Modifier.fillMaxWidth()) {
                        Text(if (state.isUpdating) stringResource(R.string.saving) else stringResource(R.string.save))
                    }
                    TextButton(onClick = onChangePassword, modifier = Modifier.fillMaxWidth()) {
                        Text(stringResource(R.string.change_password))
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            LanguageSelectorCard()

            Spacer(Modifier.height(12.dp))
            OutlinedButton(
                onClick = { sessionViewModel.logout(onLogoutComplete) },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
            ) {
                Text(stringResource(R.string.logout))
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
