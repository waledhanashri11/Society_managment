package com.example.application.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarData
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * SocietyHub shared confirmation dialog.
 * Use for all high-impact, irreversible, or financially significant actions.
 *
 * - isDestructive = true  → red confirm button (Delete, Reject, Cancel Bill)
 * - isDestructive = false → primary confirm button (Generate, Approve, Save)
 */
@Composable
fun SocietyHubConfirmDialog(
    title: String,
    message: String,
    icon: ImageVector? = null,
    iconTint: Color? = null,
    confirmText: String = "Confirm",
    cancelText: String = "Cancel",
    isDestructive: Boolean = false,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = icon?.let {
            {
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .background(
                            color = (iconTint ?: if (isDestructive) MaterialTheme.colorScheme.errorContainer
                                     else MaterialTheme.colorScheme.primaryContainer),
                            shape = CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = it,
                        contentDescription = null,
                        modifier = Modifier.size(28.dp),
                        tint = iconTint?.copy(alpha = 1f)
                            ?: if (isDestructive) MaterialTheme.colorScheme.onErrorContainer
                            else MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }
        },
        title = {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isDestructive) MaterialTheme.colorScheme.error
                                     else MaterialTheme.colorScheme.primary
                )
            ) {
                Text(confirmText, fontWeight = FontWeight.SemiBold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(cancelText)
            }
        },
        shape = RoundedCornerShape(24.dp)
    )
}

/**
 * Pre-built logout confirmation dialog for SocietyHub.
 */
@Composable
fun SocietyHubLogoutDialog(
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    SocietyHubConfirmDialog(
        title = "Logout?",
        message = "Are you sure you want to logout from SocietyHub?",
        icon = Icons.Filled.Logout,
        isDestructive = false,
        confirmText = "Logout",
        cancelText = "Cancel",
        onConfirm = onConfirm,
        onDismiss = onDismiss
    )
}

/**
 * Pre-built delete confirmation dialog for SocietyHub.
 */
@Composable
fun SocietyHubDeleteDialog(
    itemName: String = "",
    message: String = "This action cannot be undone.",
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    SocietyHubConfirmDialog(
        title = if (itemName.isNotBlank()) "Delete $itemName?" else "Delete?",
        message = message,
        icon = Icons.Filled.Delete,
        isDestructive = true,
        confirmText = "Delete",
        cancelText = "Cancel",
        onConfirm = onConfirm,
        onDismiss = onDismiss
    )
}

/**
 * Styled success Snackbar for SocietyHub.
 * Use via SnackbarHostState.showSnackbar().
 */
@Composable
fun SocietyHubSuccessSnackbar(snackbarData: SnackbarData) {
    Snackbar(
        snackbarData = snackbarData,
        containerColor = Color(0xFF1B5E20),
        contentColor = Color.White,
        shape = RoundedCornerShape(14.dp)
    )
}

/**
 * Inline success feedback card. Use after important form submissions
 * that leave the user on the same screen (e.g., Payment Submitted → Verification Pending).
 */
@Composable
fun SocietyHubSuccessCard(
    title: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = Color(0xFFE8F5E9),
        tonalElevation = 0.dp
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(Color(0xFF2E7D32), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Filled.CheckCircle,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(24.dp)
                )
            }
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1B5E20)
                )
                if (!subtitle.isNullOrBlank()) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF2E7D32)
                    )
                }
            }
        }
    }
}

/**
 * Inline info banner for contextual information (e.g., "Verification Pending").
 */
@Composable
fun SocietyHubInfoCard(
    message: String,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFFEFF6FF)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Filled.Info,
                contentDescription = null,
                tint = Color(0xFF1D4ED8),
                modifier = Modifier.size(18.dp)
            )
            Text(
                text = message,
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF1E40AF)
            )
        }
    }
}

/**
 * Inline warning banner for important alerts.
 */
@Composable
fun SocietyHubWarningCard(
    message: String,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFFFFFBEB)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Filled.Warning,
                contentDescription = null,
                tint = Color(0xFFD97706),
                modifier = Modifier.size(18.dp)
            )
            Text(
                text = message,
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF92400E)
            )
        }
    }
}
