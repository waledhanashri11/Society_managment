package com.example.application.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Apartment
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Engineering
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Report
import androidx.compose.material.icons.filled.Search
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
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

enum class AppRoleTheme {
    Admin,
    Resident
}

private val AdminPrimary = Color(0xFF2446D8)
private val AdminContainer = Color(0xFFEAF0FF)
private val ResidentPrimary = Color(0xFF5E3FD1)
private val ResidentContainer = Color(0xFFF1ECFF)

fun rolePrimary(role: AppRoleTheme): Color = if (role == AppRoleTheme.Admin) AdminPrimary else ResidentPrimary
fun roleContainer(role: AppRoleTheme): Color = if (role == AppRoleTheme.Admin) AdminContainer else ResidentContainer

private fun iconForLabel(label: String): ImageVector {
    val normalized = label.lowercase()
    return when {
        "home" in normalized || "dashboard" in normalized -> Icons.Filled.Home
        "resident" in normalized || "member" in normalized -> Icons.Filled.Groups
        "flat" in normalized || "tower" in normalized -> Icons.Filled.Apartment
        "maintenance" in normalized || "payment" in normalized || "dues" in normalized -> Icons.Filled.Payments
        "complaint" in normalized || "report" in normalized -> Icons.Filled.Report
        "notice" in normalized || "event" in normalized -> Icons.Filled.Campaign
        "staff" in normalized -> Icons.Filled.Engineering
        "profile" in normalized || "account" in normalized -> Icons.Filled.Person
        "search" in normalized -> Icons.Filled.Search
        "lock" in normalized || "password" in normalized -> Icons.Filled.Lock
        "show" in normalized -> Icons.Filled.Visibility
        "hide" in normalized -> Icons.Filled.VisibilityOff
        "menu" in normalized -> Icons.Filled.Menu
        "more" in normalized -> Icons.Filled.MoreHoriz
        else -> Icons.Filled.Dashboard
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppTopBar(
    title: String,
    subtitle: String? = null,
    role: AppRoleTheme = AppRoleTheme.Admin,
    navigationText: String? = null,
    navigationIcon: ImageVector? = null,
    onNavigationClick: (() -> Unit)? = null,
    actionText: String? = null,
    actionIcon: ImageVector? = null,
    onActionClick: (() -> Unit)? = null
) {
    TopAppBar(
        title = {
            Column {
                Text(title, fontWeight = FontWeight.Bold)
                subtitle?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        },
        navigationIcon = {
            if (onNavigationClick != null) {
                IconButton(onClick = onNavigationClick) {
                    Icon(navigationIcon ?: iconForLabel(navigationText ?: "Menu"), contentDescription = navigationText, tint = rolePrimary(role))
                }
            }
        },
        actions = {
            if (onActionClick != null) {
                IconButton(onClick = onActionClick) {
                    Icon(actionIcon ?: iconForLabel(actionText ?: "Action"), contentDescription = actionText, tint = rolePrimary(role))
                }
            }
        }
    )
}

@Composable
fun AppBottomNavigation(
    role: AppRoleTheme,
    selected: String,
    items: List<String>,
    onSelected: (String) -> Unit
) {
    NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
        items.forEach { item ->
            NavigationBarItem(
                selected = selected == item,
                onClick = { onSelected(item) },
                icon = { Icon(iconForLabel(item), contentDescription = item, tint = if (selected == item) rolePrimary(role) else MaterialTheme.colorScheme.onSurfaceVariant) },
                label = { Text(item, style = MaterialTheme.typography.labelSmall) }
            )
        }
    }
}

@Composable
fun BuildingIllustration(role: AppRoleTheme, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(150.dp)
            .clip(RoundedCornerShape(28.dp))
            .background(Brush.linearGradient(listOf(roleContainer(role), Color.White))),
        contentAlignment = Alignment.Center
    ) {
        Icon(Icons.Filled.Apartment, contentDescription = null, tint = rolePrimary(role), modifier = Modifier.size(72.dp))
    }
}

@Composable
fun ErrorMessageCard(message: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
    ) {
        Text(message, modifier = Modifier.padding(16.dp), color = MaterialTheme.colorScheme.onErrorContainer)
    }
}

@Composable
fun AppLoadingIndicator(modifier: Modifier = Modifier) {
    CircularProgressIndicator(modifier = modifier)
}

@Composable
fun PrimaryAppButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    Button(onClick = onClick, modifier = modifier.fillMaxWidth(), enabled = enabled) {
        Text(text)
    }
}

@Composable
fun BasicAppTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = { Text(label) },
        enabled = enabled,
        singleLine = true
    )
}

@Composable
fun EmptyState(title: String, message: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text(message, modifier = Modifier.padding(top = 6.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun RetryState(message: String, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        ErrorMessageCard(message)
        PrimaryAppButton(text = "Retry", onClick = onRetry)
    }
}

@Composable
fun DashboardSkeleton() {
    Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        repeat(4) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(82.dp)
                    .clip(RoundedCornerShape(22.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f))
            )
        }
    }
}

@Composable
fun DashboardError(message: String, onRetry: () -> Unit) {
    RetryState(message = message, onRetry = onRetry)
}

@Composable
fun SectionCard(
    title: String,
    subtitle: String? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(22.dp)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            subtitle?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            content()
        }
    }
}

@Composable
fun KeyValue(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, modifier = Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun QuickAction(label: String, onClick: () -> Unit) {
    Surface(onClick = onClick, shape = RoundedCornerShape(16.dp), color = ResidentContainer) {
        Text(label, modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp), color = ResidentPrimary)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MetricGrid(items: List<Triple<String, String, String?>>) {
    FlowRow(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items.forEach { (title, value, subtitle) ->
            Card(modifier = Modifier.width(156.dp), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(title, style = MaterialTheme.typography.labelLarge)
                    subtitle?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
        }
    }
}
