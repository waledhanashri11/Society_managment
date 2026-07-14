package com.example.application.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Apartment
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Engineering
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Report
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
private val ResidentPrimary = Color(0xFF048846)
private val ResidentContainer = Color(0xFFE7F8EE)

fun rolePrimary(role: AppRoleTheme): Color = if (role == AppRoleTheme.Admin) AdminPrimary else ResidentPrimary
fun roleContainer(role: AppRoleTheme): Color = if (role == AppRoleTheme.Admin) AdminContainer else ResidentContainer

fun iconForNavLabel(label: String): ImageVector {
    val normalized = label.lowercase()
    return when {
        "dashboard" in normalized || "home" in normalized -> Icons.Filled.Dashboard
        "resident" in normalized || "member" in normalized -> Icons.Filled.Groups
        "flat" in normalized || "tower" in normalized || "society" in normalized -> Icons.Filled.Apartment
        "maintenance" in normalized || "payment" in normalized || "collection" in normalized || "paid" in normalized || "pending" in normalized -> Icons.Filled.Payments
        "complaint" in normalized || "report" in normalized -> Icons.Filled.Report
        "notice" in normalized || "event" in normalized -> Icons.Filled.Campaign
        "staff" in normalized || "worker" in normalized -> Icons.Filled.Engineering
        "profile" in normalized || "account" in normalized -> Icons.Filled.Person
        "setting" in normalized -> Icons.Filled.Settings
        "more" in normalized -> Icons.Filled.MoreHoriz
        else -> Icons.Filled.Assignment
    }
}

fun iconForAction(label: String): ImageVector {
    val normalized = label.lowercase()
    return when {
        "back" in normalized -> Icons.Filled.ArrowBack
        "logout" in normalized -> Icons.Filled.Logout
        "profile" in normalized -> Icons.Filled.Person
        "alert" in normalized || "notification" in normalized -> Icons.Filled.Notifications
        "search" in normalized -> Icons.Filled.Search
        "lock" in normalized || "password" in normalized -> Icons.Filled.Lock
        "menu" in normalized -> Icons.Filled.Menu
        "hide" in normalized -> Icons.Filled.VisibilityOff
        "show" in normalized -> Icons.Filled.Visibility
        else -> Icons.Filled.MoreHoriz
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
                    Icon(
                        imageVector = navigationIcon ?: iconForAction(navigationText ?: "Menu"),
                        contentDescription = navigationText ?: "Navigation",
                        tint = rolePrimary(role)
                    )
                }
            }
        },
        actions = {
            if (onActionClick != null) {
                if (actionIcon != null || actionText != null) {
                    IconButton(onClick = onActionClick) {
                        Icon(
                            imageVector = actionIcon ?: iconForAction(actionText ?: "Action"),
                            contentDescription = actionText ?: "Action",
                            tint = rolePrimary(role)
                        )
                    }
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
                icon = {
                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(if (selected == item) roleContainer(role) else Color.Transparent)
                            .padding(horizontal = 10.dp, vertical = 5.dp)
                    ) {
                        Icon(
                            imageVector = iconForNavLabel(item),
                            contentDescription = item,
                            modifier = Modifier.size(20.dp),
                            tint = if (selected == item) rolePrimary(role) else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                label = { Text(item, style = MaterialTheme.typography.labelSmall) }
            )
        }
    }
}

@Composable
fun StatCard(
    title: String,
    value: String,
    subtitle: String,
    role: AppRoleTheme,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Surface(color = roleContainer(role), shape = CircleShape) {
                Icon(
                    imageVector = iconForNavLabel(title),
                    contentDescription = title,
                    modifier = Modifier.padding(8.dp).size(20.dp),
                    tint = rolePrimary(role)
                )
            }
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(title, style = MaterialTheme.typography.labelLarge)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun DashboardCard(
    title: String,
    subtitle: String? = null,
    role: AppRoleTheme,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    subtitle?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(roleContainer(role))
                        .padding(8.dp)
                ) {
                    Icon(
                        imageVector = iconForNavLabel(title),
                        contentDescription = title,
                        modifier = Modifier.size(20.dp),
                        tint = rolePrimary(role)
                    )
                }
            }
            content()
        }
    }
}

@Composable
fun StatusChip(
    text: String,
    role: AppRoleTheme = AppRoleTheme.Admin,
    selected: Boolean = true,
    onClick: (() -> Unit)? = null
) {
    FilterChip(
        selected = selected,
        onClick = { onClick?.invoke() },
        label = { Text(text.ifBlank { "All" }) }
    )
}

@Composable
fun SearchField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        singleLine = true,
        label = { Text(placeholder) },
        leadingIcon = {
            Icon(Icons.Filled.Search, contentDescription = "Search")
        }
    )
}

@Composable
fun LoadingSkeleton(
    lines: Int = 4,
    modifier: Modifier = Modifier
) {
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        repeat(lines) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(if (it == 0) 80.dp else 54.dp)
                    .clip(MaterialTheme.shapes.large)
                    .background(
                        Brush.horizontalGradient(
                            listOf(
                                MaterialTheme.colorScheme.surfaceVariant,
                                MaterialTheme.colorScheme.surface,
                                MaterialTheme.colorScheme.surfaceVariant
                            )
                        )
                    )
            )
        }
    }
}

@Composable
fun ErrorState(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    RetryState(message = message, onRetry = onRetry, modifier = modifier)
}

@Composable
fun PrimaryButton(
    text: String,
    role: AppRoleTheme,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    icon: ImageVector? = null
) {
    Button(onClick = onClick, modifier = modifier.fillMaxWidth(), enabled = enabled) {
        icon?.let {
            Icon(it, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
        }
        Text(text)
    }
}

@Composable
fun FormTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    error: String? = null,
    leadingIcon: ImageVector? = null,
    trailingIcon: (@Composable () -> Unit)? = null
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = { Text(label) },
        enabled = enabled,
        singleLine = true,
        isError = error != null,
        supportingText = { error?.let { Text(it) } },
        leadingIcon = leadingIcon?.let {
            { Icon(it, contentDescription = null) }
        },
        trailingIcon = trailingIcon
    )
}

@Composable
fun AppFab(
    role: AppRoleTheme,
    onClick: () -> Unit,
    text: String = "+",
    icon: ImageVector = Icons.Filled.Add
) {
    FloatingActionButton(
        onClick = onClick,
        containerColor = rolePrimary(role),
        contentColor = Color.White
    ) {
        if (text == "+") {
            Icon(icon, contentDescription = "Add")
        } else {
            Text(text, style = MaterialTheme.typography.titleLarge)
        }
    }
}

@Composable
fun BuildingIllustration(
    role: AppRoleTheme,
    modifier: Modifier = Modifier
) {
    val primary = rolePrimary(role)
    val soft = roleContainer(role)
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(140.dp),
        contentAlignment = Alignment.BottomCenter
    ) {
        Surface(
            modifier = Modifier
                .width(150.dp)
                .height(116.dp),
            shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp, bottomStart = 8.dp, bottomEnd = 8.dp),
            color = soft
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                repeat(4) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        repeat(4) {
                            Box(
                                modifier = Modifier
                                    .size(18.dp, 10.dp)
                                    .clip(RoundedCornerShape(3.dp))
                                    .background(primary.copy(alpha = 0.35f))
                            )
                        }
                    }
                }
            }
        }
        Surface(
            modifier = Modifier
                .width(48.dp)
                .height(72.dp),
            shape = RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp),
            color = primary
        ) {}
    }
}

@Composable
fun DashboardSkeleton() {
    LoadingSkeleton(lines = 7, modifier = Modifier.padding(20.dp))
}

@Composable
fun DashboardError(message: String, onRetry: () -> Unit) {
    ErrorState(message = message, onRetry = onRetry, modifier = Modifier.fillMaxWidth())
}

@Composable
fun SectionCard(
    title: String,
    subtitle: String? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    DashboardCard(
        title = title,
        subtitle = subtitle,
        role = AppRoleTheme.Admin,
        content = content
    )
}

@Composable
fun KeyValue(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
        Text(value, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
    }
}

@Composable
fun QuickAction(label: String, onClick: () -> Unit) {
    Button(onClick = onClick) {
        Icon(iconForNavLabel(label), contentDescription = null, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(label)
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
            Card(modifier = Modifier.width(156.dp)) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(title, style = MaterialTheme.typography.labelLarge)
                    subtitle?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
        }
    }
}

@Composable
fun AppLoadingIndicator(
    modifier: Modifier = Modifier
) {
    CircularProgressIndicator(modifier = modifier)
}

@Composable
fun ErrorMessageCard(
    message: String,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer,
            contentColor = MaterialTheme.colorScheme.onErrorContainer
        )
    ) {
        Text(
            text = message,
            modifier = Modifier.padding(16.dp),
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
fun PrimaryAppButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    Button(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        enabled = enabled
    ) {
        Text(text = text)
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
        label = { Text(text = label) },
        enabled = enabled,
        singleLine = true
    )
}

@Composable
fun EmptyState(
    title: String,
    message: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium
        )
        Text(
            text = message,
            modifier = Modifier.padding(top = 6.dp),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
fun RetryState(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        ErrorMessageCard(message = message)
        PrimaryAppButton(
            text = "Retry",
            onClick = onRetry,
            modifier = Modifier.padding(top = 12.dp)
        )
    }
}
