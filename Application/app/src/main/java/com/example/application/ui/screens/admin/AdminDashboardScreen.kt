package com.example.application.ui.screens.admin

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Apartment
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.data.repository.AdminDashboardData
import com.example.application.R
import com.example.application.ui.components.LanguageSelector
import com.example.application.ui.components.NotificationDropdown
import com.example.application.ui.components.SocietyIdentityHeader
import com.example.application.ui.components.localizedLabel
import com.example.application.ui.theme.SocietyBlue40
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.AdminDashboardViewModel
import com.example.application.viewmodel.SessionViewModel
import kotlinx.coroutines.launch

private val NavyTop = Color(0xFF0B6BFF)
private val NavyBottom = Color(0xFF083B92)
private val AdminBlue = SocietyBlue40

@Composable
fun AdminDashboardScreen(
    onLogoutComplete: () -> Unit,
    onQuickAction: (String) -> Unit,
    viewModel: AdminDashboardViewModel = hiltViewModel(),
    sessionViewModel: SessionViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val session by sessionViewModel.session.collectAsStateWithLifecycle()
    val data = state.data
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    var showLogoutDialog by remember { mutableStateOf(false) }

    if (showLogoutDialog) {
        com.example.application.ui.components.SocietyHubLogoutDialog(
            onConfirm = {
                showLogoutDialog = false
                sessionViewModel.logout(onLogoutComplete)
            },
            onDismiss = { showLogoutDialog = false }
        )
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            AdminDrawer(
                adminName = data?.adminName ?: "Admin",
                onAction = { action ->
                    scope.launch { drawerState.close() }
                    if (action == "Logout") showLogoutDialog = true else onQuickAction(action)
                }
            )
        }
    ) {
        Scaffold(
            bottomBar = {
                AdminBottomBar(
                    selected = "Dashboard",
                    onSelected = { item ->
                        when (item) {
                            "Residents" -> onQuickAction("Residents")
                            "Payments" -> onQuickAction("Dues & Payments")
                            "More" -> onQuickAction("Reports")
                        }
                    }
                )
            },
            containerColor = MaterialTheme.colorScheme.background
        ) { padding ->
            PullToRefreshBox(
                isRefreshing = state.isRefreshing,
                onRefresh = { viewModel.load(refresh = true) },
                indicator = {},
                modifier = Modifier.fillMaxSize().padding(padding)
            ) {
                if (state.isLoading && data == null) {
                    com.example.application.ui.components.DashboardSkeleton()
                } else {
                    LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 18.dp)) {
                        item {
                            AdminHeader(
                                adminName = data?.adminName ?: "Admin",
                                societyName = session?.societyName.orEmpty(),
                                societyLogoUrl = session?.societyLogoUrl,
                                onMenu = { scope.launch { drawerState.open() } },
                                onNotifications = { onQuickAction("Notifications") },
                                onLogout = { showLogoutDialog = true }
                            )
                        }
                        item {
                            AdminDashboardBody(
                                data = data,
                                isLoading = state.isLoading,
                                errorMessage = state.errorMessage,
                                onRetry = { viewModel.load(refresh = true) },
                                onQuickAction = onQuickAction
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AdminHeader(adminName: String, societyName: String, societyLogoUrl: String?, onMenu: () -> Unit, onNotifications: () -> Unit, onLogout: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(285.dp)
            .background(Brush.verticalGradient(listOf(NavyTop, NavyBottom)))
            .statusBarsPadding()
            .padding(horizontal = 22.dp, vertical = 18.dp)
    ) {
        SocietyIdentityHeader(
            societyName = societyName.ifBlank { stringResource(R.string.app_name) },
            societyLogoUrl = societyLogoUrl,
            portalLabel = "Admin Portal",
            modifier = Modifier.align(Alignment.TopStart).padding(top = 4.dp).fillMaxWidth(0.72f),
            foregroundColor = Color.White,
            mutedColor = Color.White.copy(alpha = 0.82f)
        )
        Row(
            modifier = Modifier.align(Alignment.TopEnd),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            NotificationDropdown(tint = Color.White, onViewAll = onNotifications)
            IconButton(onClick = onLogout) {
                Icon(Icons.Filled.Logout, contentDescription = stringResource(R.string.logout), tint = Color.White, modifier = Modifier.size(28.dp))
            }
        }
        Row(
            modifier = Modifier.align(Alignment.BottomStart).padding(bottom = 28.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(modifier = Modifier.size(76.dp), shape = CircleShape, color = Color.White.copy(alpha = 0.96f)) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.Security, contentDescription = stringResource(R.string.admin), tint = AdminBlue, modifier = Modifier.size(42.dp))
                }
            }
            Column {
                Text(adminName.ifBlank { "Admin" }, color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text("Admin Portal", color = Color.White.copy(alpha = 0.82f), style = MaterialTheme.typography.titleMedium)
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AdminDashboardBody(
    data: AdminDashboardData?,
    isLoading: Boolean,
    errorMessage: String?,
    onRetry: () -> Unit,
    onQuickAction: (String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 24.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
            SectionHeader(stringResource(R.string.overview), stringResource(R.string.view_all)) { onQuickAction("Reports") }
            OverviewGrid(data, isLoading)
            NeedsAttentionSection(data = data, isLoading = isLoading, onQuickAction = onQuickAction)
            Text(stringResource(R.string.quick_access), color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                maxItemsInEachRow = 3
            ) {
                adminQuickActions().forEach { action ->
                    AdminQuickAccessTile(
                        action = action,
                        modifier = Modifier.weight(1f),
                        onClick = { onQuickAction(action.routeName) }
                    )
                }
            }
            RecentActivityCard(data = data, isLoading = isLoading, onViewAll = { onQuickAction("Notifications") })
            errorMessage?.let { ErrorInline(message = it, onRetry = onRetry) }
            data?.warnings?.takeIf { it.isNotEmpty() }?.let { warnings ->
                SoftInfoCard("Unavailable sections") { warnings.forEach { Text("- $it", color = MaterialTheme.colorScheme.onSurfaceVariant) } }
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String, action: String, onAction: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(title, color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Row(modifier = Modifier.clickable(onClick = onAction), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(action, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
            Icon(Icons.Filled.ArrowForward, contentDescription = action, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
        }
    }
}

@Composable
private fun OverviewGrid(data: AdminDashboardData?, isLoading: Boolean) {
    val cards = listOf(
        OverviewItem("Total Flats", data?.totalFlats?.toString().orEmpty(), Icons.Filled.Apartment, SocietyBlue40, SocietyBlue40.copy(alpha = 0.12f)),
        OverviewItem("Residents", data?.totalResidents?.toString().orEmpty(), Icons.Filled.Groups, Color(0xFF20B86B), Color(0xFF20B86B).copy(alpha = 0.12f)),
        OverviewItem("Total Collections", data?.collected?.let(DashboardFormatters::money).orEmpty(), Icons.Filled.Assignment, Color(0xFF9C3ED7), Color(0xFF9C3ED7).copy(alpha = 0.12f)),
        OverviewItem("Pending Dues", data?.pendingBillCount?.toString().orEmpty(), Icons.Filled.Notifications, Color(0xFFFF8A00), Color(0xFFFF8A00).copy(alpha = 0.12f))
    )
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        cards.forEach { OverviewCard(it, isLoading = isLoading && data == null, modifier = Modifier.weight(1f)) }
    }
}

@Composable
private fun OverviewCard(item: OverviewItem, isLoading: Boolean, modifier: Modifier = Modifier) {
    Card(modifier = modifier.height(118.dp), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = item.container)) {
        Column(modifier = Modifier.fillMaxSize().padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Icon(item.icon, contentDescription = item.label, tint = item.tint, modifier = Modifier.size(28.dp))
            Spacer(Modifier.height(8.dp))
            if (isLoading) {
                com.example.application.ui.components.SkeletonText(widthFraction = 0.6f, height = 18.dp)
            } else {
                Text(item.value.ifBlank { "0" }, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
            }
            Text(item.label, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun NeedsAttentionSection(data: AdminDashboardData?, isLoading: Boolean, onQuickAction: (String) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Needs Attention",
                    color = MaterialTheme.colorScheme.onSurface,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFFDC2626).copy(alpha = 0.12f)
                ) {
                    Text(
                        text = "Priority",
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFDC2626)
                    )
                }
            }

            if (isLoading && data == null) {
                repeat(3) { ActivitySkeletonRow() }
            } else {
                DailyWorkRow(
                    title = "Payment Verifications",
                    value = "${data?.recentPayments?.count { !(it.paymentStatus).equals("Paid", true) && !(it.paymentStatus).equals("Approved", true) } ?: 0}",
                    note = "pending review",
                    icon = Icons.Filled.Payments,
                    tint = SocietyBlue40,
                    onClick = { onQuickAction("Dues & Payments") }
                )
                DailyWorkRow(
                    title = "Pending Complaints",
                    value = "${data?.recentComplaints?.count { !(it.status).equals("Resolved", true) } ?: 0}",
                    note = "requires resolution",
                    icon = Icons.Filled.WarningAmber,
                    tint = Color(0xFFFF5A4F),
                    onClick = { onQuickAction("Complaints") }
                )
                DailyWorkRow(
                    title = "Overdue Dues",
                    value = "${data?.pendingBillCount ?: 0}",
                    note = "${data?.overdueBillCount ?: 0} overdue",
                    icon = Icons.Filled.Assignment,
                    tint = Color(0xFFFF8A00),
                    onClick = { onQuickAction("Maintenance") }
                )
            }
        }
    }
}

@Composable
private fun DailyWorkRow(
    title: String,
    value: String,
    note: String,
    icon: ImageVector,
    tint: Color,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = tint.copy(alpha = 0.08f),
        border = BorderStroke(1.dp, tint.copy(alpha = 0.2f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(tint.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, contentDescription = title, tint = tint, modifier = Modifier.size(20.dp))
                }
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                    Text(note, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = tint
                ) {
                    Text(
                        text = value,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
                Text("→", color = tint, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun AdminQuickAccessTile(action: AdminAction, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Card(
        modifier = modifier.height(104.dp).clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize().border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp)).padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(action.icon, contentDescription = action.label, tint = action.tint, modifier = Modifier.size(31.dp))
            Spacer(Modifier.height(10.dp))
            Text(action.label, color = MaterialTheme.colorScheme.onSurface, textAlign = TextAlign.Center, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
private fun RecentActivityCard(data: AdminDashboardData?, isLoading: Boolean, onViewAll: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)) {
        Column(modifier = Modifier.border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp)).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            SectionHeader("Recent Activity", "View All", onViewAll)
            if (isLoading && data == null) repeat(4) { ActivitySkeletonRow() } else {
                val activities = buildRecentActivities(data)
                if (activities.isEmpty()) Text("No recent activity available.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                activities.forEach { ActivityRow(it) }
            }
        }
    }
}

@Composable
private fun ActivityRow(item: ActivityItem) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
        Surface(modifier = Modifier.size(36.dp), shape = CircleShape, color = item.container) { Box(contentAlignment = Alignment.Center) { Icon(item.icon, contentDescription = null, tint = item.tint, modifier = Modifier.size(20.dp)) } }
        Text(item.title, modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.bodyMedium)
        Text(item.time, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun ActivitySkeletonRow() { Box(modifier = Modifier.fillMaxWidth().height(38.dp).clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surfaceVariant)) }

@Composable
private fun ErrorInline(message: String, onRetry: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
    ) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Icon(Icons.Filled.Refresh, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
            Text(message, modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
            Text("Retry", modifier = Modifier.clickable(onClick = onRetry), color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun SoftInfoCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { Text(title, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface); content() }
    }
}

@Composable
private fun AdminBottomBar(selected: String, onSelected: (String) -> Unit) {
    NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
        listOf("Dashboard", "Residents", "Payments", "Reports").forEach { item ->
            NavigationBarItem(
                selected = selected == item,
                onClick = { onSelected(item) },
                icon = { Icon(imageVector = when (item) { "Dashboard" -> Icons.Filled.Dashboard; "Residents" -> Icons.Filled.Groups; "Payments" -> Icons.Filled.Payments; else -> Icons.Filled.TrendingUp }, contentDescription = item, tint = if (selected == item) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant) },
                label = { Text(localizedLabel(item), color = if (selected == item) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant) }
            )
        }
    }
}

@Composable
private fun AdminDrawer(adminName: String, onAction: (String) -> Unit) {
    ModalDrawerSheet {
        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Surface(modifier = Modifier.size(60.dp), shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) { Box(contentAlignment = Alignment.Center) { Icon(Icons.Filled.Security, contentDescription = stringResource(R.string.admin), tint = MaterialTheme.colorScheme.onPrimaryContainer) } }
            Text(adminName, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            Text(stringResource(R.string.super_admin), color = MaterialTheme.colorScheme.onSurfaceVariant)
            LanguageSelector(showTitle = false, showHint = false)
        }
        listOf(
            AdminAction("Residents", "Residents", Icons.Filled.Groups, AdminBlue),
            AdminAction("Flats", "Flats", Icons.Filled.Apartment, Color(0xFF20B86B)),
            AdminAction("Maintenance", "Maintenance", Icons.Filled.ReceiptLong, Color(0xFF9C3ED7)),
            AdminAction("Payment Verification", "Payment Reviews", Icons.Filled.Assignment, Color(0xFFFF5A4F)),
            AdminAction("Notices", "Notices", Icons.Filled.Campaign, Color(0xFF2F80ED)),
            AdminAction("Rules", "Society Rules", Icons.Filled.Assignment, Color(0xFF0B7F77)),
            AdminAction("Meetings", "Meeting Management", Icons.Filled.Event, Color(0xFF5B5BD6)),
            AdminAction("Complaints", "Complaints", Icons.Filled.WarningAmber, Color(0xFFFFA000)),
            AdminAction("Reports", "Reports", Icons.Filled.TrendingUp, Color(0xFF9C3ED7)),
            AdminAction("Settings", "Settings", Icons.Filled.Settings, Color(0xFF0B7F77)),
            AdminAction("Write-offs", "Write-off History", Icons.Filled.ReceiptLong, Color(0xFFD14343)),
            AdminAction("Flat Transfers", "Flat Transfers", Icons.Filled.Apartment, Color(0xFF20B86B)),
            AdminAction("NOC", "NOC Requests", Icons.Filled.Description, Color(0xFF16B6A4)),
            AdminAction("Logout", "Logout", Icons.Filled.Logout, Color(0xFFE53935))
        ).forEach { action ->
            NavigationDrawerItem(label = { Text(localizedLabel(action.label)) }, selected = false, icon = { Icon(action.icon, contentDescription = localizedLabel(action.label), tint = action.tint) }, onClick = { onAction(action.routeName) }, modifier = Modifier.padding(horizontal = 12.dp))
        }
    }
}

private fun adminQuickActions(): List<AdminAction> = listOf(
    AdminAction("Residents", "Residents", Icons.Filled.Groups, SocietyBlue40),
    AdminAction("Flats", "Flats", Icons.Filled.Apartment, Color(0xFF20B86B)),
    AdminAction("Maintenance", "Maintenance", Icons.Filled.ReceiptLong, Color(0xFF9C3ED7)),
    AdminAction("Payment Reviews", "Payment Reviews", Icons.Filled.Assignment, Color(0xFFFF5A4F)),
    AdminAction("Notices", "Notices", Icons.Filled.Campaign, SocietyBlue40),
    AdminAction("Rules", "Society Rules", Icons.Filled.Assignment, Color(0xFF0B7F77)),
    AdminAction("Meetings", "Meeting Management", Icons.Filled.Event, Color(0xFF5B5BD6)),
    AdminAction("Complaints", "Complaints", Icons.Filled.WarningAmber, Color(0xFFFFA000)),
    AdminAction("Reports", "Reports", Icons.Filled.TrendingUp, Color(0xFF9C3ED7)),
    AdminAction("Settings", "Settings", Icons.Filled.Settings, Color(0xFF0B7F77)),
    AdminAction("Write-offs", "Write-off History", Icons.Filled.ReceiptLong, Color(0xFFD14343)),
    AdminAction("Flat Transfers", "Flat Transfers", Icons.Filled.Apartment, Color(0xFF20B86B)),
    AdminAction("NOC", "NOC Requests", Icons.Filled.Description, Color(0xFF16B6A4)),
    AdminAction("Staff", "Staff", Icons.Filled.Security, SocietyBlue40)
)

private fun buildRecentActivities(data: AdminDashboardData?): List<ActivityItem> {
    if (data == null) return emptyList()
    val items = mutableListOf<ActivityItem>()
    data.recentPayments.firstOrNull()?.let { items += ActivityItem("Maintenance payment received from Flat ${it.flatNo ?: "-"}", DashboardFormatters.date(it.createdAt ?: it.paidAt), Icons.Filled.Payments, Color(0xFF21B66F), Color(0xFF21B66F).copy(alpha = 0.12f)) }
    if (data.totalResidents > 0) items += ActivityItem("Residents directory updated", "Today", Icons.Filled.Groups, SocietyBlue40, SocietyBlue40.copy(alpha = 0.12f))
    data.latestNotices.firstOrNull()?.let { items += ActivityItem("New notice published", DashboardFormatters.date(it.createdAt), Icons.Filled.Campaign, Color(0xFFFF8A00), Color(0xFFFF8A00).copy(alpha = 0.12f)) }
    data.recentComplaints.firstOrNull()?.let { items += ActivityItem(it.title ?: "New complaint submitted", DashboardFormatters.statusLabel(it.status), Icons.Filled.WarningAmber, Color(0xFFFF5A4F), Color(0xFFFF5A4F).copy(alpha = 0.12f)) }
    return items.take(4)
}

private data class OverviewItem(val label: String, val value: String, val icon: ImageVector, val tint: Color, val container: Color)
private data class AdminAction(val label: String, val routeName: String, val icon: ImageVector, val tint: Color)
private data class ActivityItem(val title: String, val time: String, val icon: ImageVector, val tint: Color, val container: Color)
