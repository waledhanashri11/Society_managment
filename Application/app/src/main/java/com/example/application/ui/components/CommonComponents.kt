package com.example.application.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.material.icons.filled.ArrowBack
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
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarDefaults
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.example.application.ui.theme.SocietyBlue40
import com.example.application.ui.theme.SocietyDarkBlue
import com.example.application.ui.theme.SocietyError
import com.example.application.ui.theme.SocietyLightBlue
import com.example.application.ui.theme.SocietySurfaceLight
import com.example.application.ui.theme.SocietyTextPrimary
import com.example.application.ui.theme.SocietyTextSecondary

enum class AppRoleTheme {
    Admin,
    Resident
}

private val AdminPrimary = SocietyBlue40
private val AdminContainer = SocietyLightBlue
private val ResidentPrimary = SocietyBlue40
private val ResidentContainer = SocietyLightBlue

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

// Subdued pulse animation modifier for skeleton loading placeholders
@Composable
fun Modifier.shimmerPulse(): Modifier {
    val transition = rememberInfiniteTransition(label = "pulse")
    val alpha by transition.animateFloat(
        initialValue = 0.35f,
        targetValue = 0.85f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 800),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )
    return this.alpha(alpha)
}

// Primitive Skeleton Components
@Composable
fun SkeletonBox(
    modifier: Modifier = Modifier,
    height: Dp = 20.dp,
    width: Dp? = null,
    cornerRadius: Dp = 8.dp,
    color: Color = MaterialTheme.colorScheme.surfaceVariant
) {
    Box(
        modifier = (if (width != null) modifier.width(width) else modifier.fillMaxWidth())
            .height(height)
            .clip(RoundedCornerShape(cornerRadius))
            .shimmerPulse()
            .background(color)
    )
}

@Composable
fun SkeletonCircle(
    size: Dp = 48.dp,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.surfaceVariant
) {
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .shimmerPulse()
            .background(color)
    )
}

@Composable
fun SkeletonText(
    widthFraction: Float = 0.7f,
    height: Dp = 16.dp,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth(widthFraction)
            .height(height)
            .clip(RoundedCornerShape(8.dp))
            .shimmerPulse()
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f))
    )
}

@Composable
fun SkeletonRow(
    height: Dp = 64.dp,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .height(height),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            SkeletonCircle(size = 40.dp)
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                SkeletonText(widthFraction = 0.6f, height = 14.dp)
                SkeletonText(widthFraction = 0.4f, height = 10.dp)
            }
        }
    }
}

@Composable
fun SkeletonCard(
    height: Dp = 110.dp,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .height(height),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                SkeletonText(widthFraction = 0.4f, height = 16.dp)
                SkeletonBox(width = 60.dp, height = 24.dp, cornerRadius = 12.dp)
            }
            SkeletonText(widthFraction = 0.8f, height = 14.dp)
            SkeletonText(widthFraction = 0.5f, height = 12.dp)
        }
    }
}

@Composable
fun SkeletonAvatar(size: Dp = 72.dp) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        SkeletonCircle(size = size)
        Spacer(modifier = Modifier.height(8.dp))
        SkeletonText(widthFraction = 0.5f, height = 16.dp)
    }
}

@Composable
fun SkeletonListItem(modifier: Modifier = Modifier) {
    SkeletonRow(height = 72.dp, modifier = modifier)
}

@Composable
fun SkeletonSummaryCard(modifier: Modifier = Modifier) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .height(120.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                SkeletonText(widthFraction = 0.5f, height = 14.dp)
                SkeletonText(widthFraction = 0.8f, height = 24.dp)
                SkeletonText(widthFraction = 0.6f, height = 12.dp)
            }
            SkeletonCircle(size = 50.dp)
        }
    }
}

@Composable
fun SkeletonTableRow(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(44.dp)
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        SkeletonBox(modifier = Modifier.weight(1f), height = 16.dp)
        SkeletonBox(modifier = Modifier.weight(1f), height = 16.dp)
        SkeletonBox(modifier = Modifier.weight(1f), height = 16.dp)
    }
}

@Composable
fun SkeletonList(count: Int = 5, modifier: Modifier = Modifier) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        repeat(count) {
            SkeletonListItem()
        }
    }
}

@Composable
fun SkeletonTable(rows: Int = 5, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SkeletonBox(modifier = Modifier.weight(1f), height = 18.dp)
                SkeletonBox(modifier = Modifier.weight(1f), height = 18.dp)
                SkeletonBox(modifier = Modifier.weight(1f), height = 18.dp)
                SkeletonBox(modifier = Modifier.weight(1f), height = 18.dp)
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            repeat(rows) {
                SkeletonTableRow()
            }
        }
    }
}

@Composable
fun SkeletonCardGrid(count: Int = 4, modifier: Modifier = Modifier) {
    Row(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        repeat(count) {
            SkeletonCard(height = 95.dp, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
fun SkeletonForm(fields: Int = 4, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        repeat(fields) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                SkeletonText(widthFraction = 0.3f, height = 14.dp)
                SkeletonBox(height = 48.dp, cornerRadius = 12.dp)
            }
        }
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
    onBack: (() -> Unit)? = null,
    actionText: String? = null,
    actionIcon: ImageVector? = null,
    onActionClick: (() -> Unit)? = null
) {
    val effectiveNavClick = onBack ?: onNavigationClick
    val effectiveNavIcon = when {
        onBack != null -> Icons.Filled.ArrowBack
        navigationIcon != null -> navigationIcon
        navigationText != null -> iconForLabel(navigationText)
        else -> null
    }

    TopAppBar(
        title = {
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                subtitle?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        },
        navigationIcon = {
            if (effectiveNavClick != null && effectiveNavIcon != null) {
                IconButton(onClick = effectiveNavClick) {
                    Icon(
                        imageVector = effectiveNavIcon,
                        contentDescription = navigationText ?: "Back",
                        tint = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        },
        actions = {
            if (onActionClick != null) {
                IconButton(onClick = onActionClick) {
                    Icon(
                        imageVector = actionIcon ?: iconForLabel(actionText ?: "Action"),
                        contentDescription = actionText,
                        tint = MaterialTheme.colorScheme.primary
                    )
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
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = NavigationBarDefaults.Elevation
    ) {
        items.forEach { item ->
            val isSelected = item.equals(selected, ignoreCase = true)
            NavigationBarItem(
                selected = isSelected,
                onClick = { onSelected(item) },
                icon = { Icon(iconForLabel(item), contentDescription = localizedLabel(item)) },
                label = {
                    Text(
                        text = localizedLabel(item),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                },
                alwaysShowLabel = true,
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = MaterialTheme.colorScheme.primary,
                    selectedTextColor = MaterialTheme.colorScheme.primary,
                    indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                )
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
            .clip(RoundedCornerShape(24.dp))
            .background(Brush.linearGradient(listOf(MaterialTheme.colorScheme.primaryContainer, MaterialTheme.colorScheme.surface))),
        contentAlignment = Alignment.Center
    ) {
        Icon(Icons.Filled.Apartment, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(72.dp))
    }
}

@Composable
fun ErrorMessageCard(message: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Filled.Info,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )
            Text(
                text = message,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
fun AppLoadingIndicator(modifier: Modifier = Modifier) {
    DashboardSkeleton()
}

@Composable
fun PrimaryAppButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    Button(
        onClick = onClick,
        modifier = modifier.fillMaxWidth().height(48.dp),
        enabled = enabled,
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary
        )
    ) {
        Icon(iconForLabel(text), contentDescription = null, modifier = Modifier.size(19.dp))
        Text(text, modifier = Modifier.padding(start = 8.dp), fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun BasicAppTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    keyboardOptions: androidx.compose.foundation.text.KeyboardOptions = androidx.compose.foundation.text.KeyboardOptions.Default
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        leadingIcon = { Icon(iconForLabel(label), contentDescription = null, tint = MaterialTheme.colorScheme.primary) },
        label = { Text(label) },
        enabled = enabled,
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        keyboardOptions = keyboardOptions
    )
}

@Composable
fun EmptyState(title: String, message: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth().padding(vertical = 20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(66.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Filled.MoreHoriz, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(34.dp))
        }
        Text(title, modifier = Modifier.padding(top = 8.dp), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
        Text(message, modifier = Modifier.padding(top = 6.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun RetryState(message: String, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxWidth().padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        SkeletonList(count = 3)
        OutlinedButton(
            onClick = onRetry,
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(6.dp))
            Text("Tap to refresh")
        }
    }
}

@Composable
fun DashboardSkeleton() {
    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        SkeletonSummaryCard()
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SkeletonCard(height = 90.dp, modifier = Modifier.weight(1f))
            SkeletonCard(height = 90.dp, modifier = Modifier.weight(1f))
        }
        repeat(3) {
            SkeletonRow(height = 76.dp)
        }
    }
}

@Composable
fun DashboardError(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        DashboardSkeleton()
        OutlinedButton(onClick = onRetry, shape = RoundedCornerShape(12.dp)) {
            Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(6.dp))
            Text("Tap to refresh dashboard")
        }
    }
}

@Composable
fun SectionCard(
    title: String,
    subtitle: String? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            subtitle?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            content()
        }
    }
}

@Composable
fun KeyValue(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, modifier = Modifier.weight(1f), fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
    }
}

@Composable
fun QuickAction(label: String, onClick: () -> Unit) {
    Surface(onClick = onClick, shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.primaryContainer) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(iconForLabel(label), contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
            Text(label, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
        }
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
            Card(
                modifier = Modifier.width(156.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Text(title, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface)
                    subtitle?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
        }
    }
}

// Unified Status Badge Component
@Composable
fun StatusBadge(
    status: String,
    modifier: Modifier = Modifier
) {
    val isDark = androidx.compose.foundation.isSystemInDarkTheme()
    val upper = status.uppercase()
    val (bgColor, textColor) = when {
        upper in listOf("APPROVED", "PAID", "COMPLETED", "RESOLVED") ->
            if (isDark) Color(0xFF064E3B) to Color(0xFF6EE7B7) else Color(0xFFDCFCE7) to Color(0xFF15803D)
        upper in listOf("PENDING", "UNDER_REVIEW", "IN_PROGRESS", "VERIFICATION_PENDING", "PARTIALLY_PAID", "ADVANCE_PAID") || "PENDING" in upper || "VERIFICATION" in upper ->
            if (isDark) Color(0xFF78350F) to Color(0xFFFDE68A) else Color(0xFFFEF3C7) to Color(0xFFB45309)
        upper in listOf("WRITTEN_OFF", "WRITTEN OFF", "PARTIALLY_WRITTEN_OFF", "PARTIALLY WRITTEN OFF", "WRITE_OFF", "WRITE OFF") || "WRITE" in upper ->
            if (isDark) Color(0xFF4C1D95) to Color(0xFFDDD6FE) else Color(0xFFEDE9FE) to Color(0xFF6D28D9)
        upper in listOf("REJECTED", "OVERDUE", "CANCELLED") || "OVERDUE" in upper ->
            if (isDark) Color(0xFF7F1D1D) to Color(0xFFFCA5A5) else Color(0xFFFEE2E2) to Color(0xFF991B1B)
        else ->
            MaterialTheme.colorScheme.surfaceVariant to MaterialTheme.colorScheme.onSurfaceVariant
    }
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        color = bgColor
    ) {
        Text(
            text = status.replace("_", " "),
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = textColor,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

// Reusable Horizontal Filter Chip Row Component
@Composable
fun FilterChipRow(
    filters: List<String>,
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()
    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(scrollState),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        filters.forEach { filter ->
            val isSelected = filter.equals(selected, ignoreCase = true)
            Surface(
                onClick = { onSelect(filter) },
                shape = RoundedCornerShape(20.dp),
                color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                border = if (isSelected) null else BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
            ) {
                Text(
                    text = filter,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                    color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

