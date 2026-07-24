package com.example.application.ui.screens.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.viewmodel.ChangePasswordViewModel
import com.example.application.viewmodel.ForgotPasswordViewModel
import com.example.application.viewmodel.RegistrationViewModel
import com.example.application.viewmodel.ResetPasswordViewModel

@Composable
fun RegisterScreen(
    onBackToLogin: () -> Unit,
    viewModel: RegistrationViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    AuthScaffold(title = "Create Resident Account") {
        state.errorMessage?.let { ErrorMessageCard(it); Spacer(Modifier.height(12.dp)) }
        state.successMessage?.let {
            SuccessCard(it)
            Spacer(Modifier.height(12.dp))
            Button(onClick = onBackToLogin, modifier = Modifier.fillMaxWidth()) { Text("Back to Login") }
            return@AuthScaffold
        }

        OutlinedTextField(value = state.name, onValueChange = viewModel::updateName, label = { Text("Full Name") }, isError = state.nameError != null, supportingText = state.nameError?.let { { Text(it) } }, modifier = Modifier.fillMaxWidth(), enabled = !state.isSubmitting)
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(value = state.email, onValueChange = viewModel::updateEmail, label = { Text("Email") }, isError = state.emailError != null, supportingText = state.emailError?.let { { Text(it) } }, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), enabled = !state.isSubmitting)
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(value = state.phone, onValueChange = viewModel::updatePhone, label = { Text("Phone (optional)") }, isError = state.phoneError != null, supportingText = state.phoneError?.let { { Text(it) } }, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), enabled = !state.isSubmitting)
        Spacer(Modifier.height(10.dp))
        PasswordField(value = state.password, onValueChange = viewModel::updatePassword, label = "Password", error = state.passwordError, enabled = !state.isSubmitting)
        Spacer(Modifier.height(10.dp))
        PasswordField(value = state.confirmPassword, onValueChange = viewModel::updateConfirmPassword, label = "Confirm Password", error = state.confirmPasswordError, enabled = !state.isSubmitting)
        Spacer(Modifier.height(10.dp))

        var expanded by remember { mutableStateOf(false) }
        val selectedFlat = state.availableFlats.firstOrNull { it.id == state.flatId }
        OutlinedTextField(
            value = selectedFlat?.let { "Wing ${it.wing ?: "A"} - Flat ${it.flatNo ?: "-"} - Floor ${it.floorNo ?: "-"}" } ?: "",
            onValueChange = {},
            readOnly = true,
            label = { Text(if (state.flatsLoading) "Loading available flats..." else "Assigned Flat") },
            isError = state.flatError != null,
            supportingText = state.flatError?.let { { Text(it) } },
            modifier = Modifier.fillMaxWidth(),
            enabled = !state.isSubmitting && !state.flatsLoading
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            TextButton(onClick = { expanded = true }, enabled = !state.isSubmitting && state.availableFlats.isNotEmpty()) { Text("Select Flat (optional)") }
            TextButton(onClick = viewModel::loadAvailableFlats, enabled = !state.isSubmitting) { Text("Refresh Flats") }
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            state.availableFlats.forEach { flat ->
                DropdownMenuItem(
                    text = { Text("Wing ${flat.wing ?: "A"} - Flat ${flat.flatNo ?: "-"} - Floor ${flat.floorNo ?: "-"}") },
                    onClick = {
                        viewModel.updateFlatId(flat.id.orEmpty())
                        expanded = false
                    }
                )
            }
        }
        if (!state.flatsLoading && state.availableFlats.isEmpty()) {
            Text(
                "No flats are available right now. You can register and ask the admin to assign a flat later.",
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(Modifier.height(16.dp))
        Button(
            onClick = viewModel::submit,
            enabled = !state.isSubmitting && !state.flatsLoading,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (state.isSubmitting) "Submitting..." else "Register")
        }
        TextButton(onClick = onBackToLogin, modifier = Modifier.fillMaxWidth()) { Text("Already have an account? Login") }
    }
}

@Composable
fun ForgotPasswordScreen(
    onBackToLogin: () -> Unit,
    viewModel: ForgotPasswordViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    AuthScaffold(title = "Forgot Password") {
        state.errorMessage?.let { ErrorMessageCard(it); Spacer(Modifier.height(12.dp)) }
        state.message?.let { SuccessCard(it); Spacer(Modifier.height(12.dp)) }
        OutlinedTextField(value = state.email, onValueChange = viewModel::updateEmail, label = { Text("Email") }, isError = state.emailError != null, supportingText = state.emailError?.let { { Text(it) } }, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), enabled = !state.isLoading)
        Spacer(Modifier.height(16.dp))
        Button(onClick = viewModel::submit, enabled = !state.isLoading, modifier = Modifier.fillMaxWidth()) { Text(if (state.isLoading) "Sending..." else "Send Reset Link") }
        TextButton(onClick = onBackToLogin, modifier = Modifier.fillMaxWidth()) { Text("Back to Login") }
    }
}

@Composable
fun ResetPasswordScreen(
    token: String,
    onResetComplete: () -> Unit,
    viewModel: ResetPasswordViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LaunchedEffect(token) { viewModel.setToken(token) }
    AuthScaffold(title = "Reset Password") {
        state.tokenError?.let { ErrorMessageCard(it); Spacer(Modifier.height(12.dp)) }
        state.errorMessage?.let { ErrorMessageCard(it); Spacer(Modifier.height(12.dp)) }
        state.message?.let { SuccessCard(it); Spacer(Modifier.height(12.dp)) }
        if (state.resetComplete) {
            Button(onClick = onResetComplete, modifier = Modifier.fillMaxWidth()) { Text("Back to Login") }
            return@AuthScaffold
        }
        PasswordField(value = state.newPassword, onValueChange = viewModel::updatePassword, label = "New Password", error = state.passwordError, enabled = !state.isLoading)
        Spacer(Modifier.height(10.dp))
        PasswordField(value = state.confirmPassword, onValueChange = viewModel::updateConfirm, label = "Confirm Password", error = state.confirmPasswordError, enabled = !state.isLoading)
        Spacer(Modifier.height(16.dp))
        Button(onClick = viewModel::submit, enabled = !state.isLoading, modifier = Modifier.fillMaxWidth()) { Text(if (state.isLoading) "Resetting..." else "Reset Password") }
    }
}

@Composable
fun ChangePasswordScreen(
    onBack: () -> Unit,
    viewModel: ChangePasswordViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    AuthScaffold(title = "Change Password") {
        state.errorMessage?.let { ErrorMessageCard(it); Spacer(Modifier.height(12.dp)) }
        state.message?.let { SuccessCard(it); Spacer(Modifier.height(12.dp)) }
        PasswordField(value = state.currentPassword, onValueChange = viewModel::updateCurrent, label = "Current Password", error = state.currentPasswordError, enabled = !state.isLoading)
        Spacer(Modifier.height(10.dp))
        PasswordField(value = state.newPassword, onValueChange = viewModel::updateNew, label = "New Password", error = state.newPasswordError, enabled = !state.isLoading)
        Spacer(Modifier.height(10.dp))
        PasswordField(value = state.confirmPassword, onValueChange = viewModel::updateConfirm, label = "Confirm Password", error = state.confirmPasswordError, enabled = !state.isLoading)
        Spacer(Modifier.height(16.dp))
        Button(onClick = viewModel::submit, enabled = !state.isLoading, modifier = Modifier.fillMaxWidth()) { Text(if (state.isLoading) "Saving..." else "Change Password") }
        TextButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Back") }
    }
}

@Composable
private fun AuthScaffold(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(22.dp)) {
                Text(title, style = MaterialTheme.typography.headlineSmall)
                Spacer(Modifier.height(18.dp))
                content()
            }
        }
    }
}

@Composable
private fun PasswordField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    error: String?,
    enabled: Boolean
) {
    var visible by remember { mutableStateOf(false) }
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        isError = error != null,
        supportingText = error?.let { { Text(it) } },
        enabled = enabled,
        visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        trailingIcon = {
            TextButton(onClick = { visible = !visible }) { Text(if (visible) "Hide" else "Show") }
        },
        modifier = Modifier.fillMaxWidth()
    )
}

@Composable
private fun SuccessCard(message: String) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
        Text(message, modifier = Modifier.padding(14.dp), color = MaterialTheme.colorScheme.onPrimaryContainer)
    }
}

@Composable
private fun ErrorMessageCard(message: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
    ) {
        Text(
            text = message,
            modifier = Modifier.padding(14.dp),
            color = MaterialTheme.colorScheme.onErrorContainer
        )
    }
}
