package com.example.application.ui.screens.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Security
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.data.repository.AdminDashboardData
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.AdminDashboardViewModel
import com.example.application.viewmodel.SessionViewModel
import kotlinx.coroutines.launch

private val NavyTop = Color(0xFF0B6BFF)
private val NavyBottom = Color(0xFF083B92)
private val AdminBlue = Color(0xFF0B5FFF)
private val TextNavy = Color(0xFF061C43)

@Composable
fun AdminDashboardScreen(
    onLogoutComplete: () -> Unit,
    onQuickAction: (String) -> Unit,
    viewModel: AdminDashboardViewModel = hiltViewModel(),
    sessionViewModel: SessionViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val data = state.data
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            AdminDrawer(
                adminName = data?.adminName ?: "Admin",
                onAction = { action ->
                    scope.launch { drawerState.close() }
                    if (action == "Logout") sessionViewModel.logout(onLogoutComplete) else onQuickAction(action)
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
            containerColor = Color(0xFFF7F9FD)
        ) { padding ->
            PullToRefreshBox(
                isRefreshing = state.isRefreshing,
                onRefresh = { viewModel.load(refresh = true) },
                modifier = Modifier.fillMaxSize().padding(padding)
            ) {
                LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 18.dp)) {
                    item {
                        AdminHeader(
                            adminName = data?.adminName ?: "Admin",
                            onMenu = { scope.launch { drawerState.open() } },
                            onNotifications = { onQuickAction("Notifications") }
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

@Composable
private fun AdminHeader(adminName: String, onMenu: () -> Unit, onNotifications: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(285.dp)
            .background(Brush.verticalGradient(listOf(NavyTop, NavyBottom)))
            .statusBarsPadding()
            .padding(horizontal = 22.dp, vertical = 18.dp)
    ) {
        IconButton(onClick = onMenu, modifier = Modifier.align(Alignment.TopStart)) {
            Icon(Icons.Filled.Menu, contentDescription = "Open admin menu", tint = Color.White, modifier = Modifier.size(34.dp))
        }
        Column(modifier = Modifier.align(Alignment.TopCenter).padding(top = 6.dp)) {
            Text("Society Management", color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("System", color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        }
        Box(modifier = Modifier.align(Alignment.TopEnd)) {
            IconButton(onClick = onNotifications) {
                Icon(Icons.Filled.Notifications, contentDescription = "Notifications", tint = Color.White, modifier = Modifier.size(30.dp))
            }
            Box(modifier = Modifier.align(Alignment.TopEnd).padding(top = 8.dp, end = 8.dp).size(9.dp).clip(CircleShape).background(Color(0xFFFF5252)))
        }
        Row(
            modifier = Modifier.align(Alignment.BottomStart).padding(bottom = 28.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(modifier = Modifier.size(76.dp), shape = CircleShape, color = Color.White.copy(alpha = 0.96f)) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.Security, contentDescription = "Admin profile", tint = AdminBlue, modifier = Modifier.size(42.dp))
                }
            }
            Column {
                Text(adminName.ifBlank { "Admin" }, color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text("Super Admin", color = Color.White.copy(alpha = 0.82f), style = MaterialTheme.typography.titleMedium)
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
        shape = RoundedCornerShape(topStart = 34.dp, topEnd = 34.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 24.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
            SectionHeader("Overview", "View All") { onQuickAction("Reports") }
            OverviewGrid(data, isLoading)
            TodayWorkCard(data = data, isLoading = isLoading, onQuickAction = onQuickAction)
            Text("Quick Access", color = TextNavy, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                maxItemsInEachRow = 3
            ) {
                adminQuickActions().forEach { action -> AdminQuickAccessTile(action) { onQuickAction(action.routeName) } }
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
        Text(title, color = TextNavy, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Row(modifier = Modifier.clickable(onClick = onAction), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(action, color = Color(0xFF006BFF), fontWeight = FontWeight.Bold)
            Icon(Icons.Filled.ArrowForward, contentDescription = action, tint = Color(0xFF006BFF), modifier = Modifier.size(20.dp))
        }
    }
}

@Composable
private fun OverviewGrid(data: AdminDashboardData?, isLoading: Boolean) {
    val cards = listOf(
        OverviewItem("Total Flats", data?.totalFlats?.toString().orEmpty(), Icons.Filled.Apartment, Color(0xFF2F80ED), Color(0xFFEAF3FF)),
        OverviewItem("Residents", data?.totalResidents?.toString().orEmpty(), Icons.Filled.Groups, Color(0xFF20B86B), Color(0xFFEAF8EF)),
        OverviewItem("Total Collections", data?.collected?.let(DashboardFormatters::money).orEmpty(), Icons.Filled.Assignment, Color(0xFF9C3ED7), Color(0xFFF6ECFF)),
        OverviewItem("Pending Dues", data?.pendingBillCount?.toString().orEmpty(), Icons.Filled.Notifications, Color(0xFFFF8A00), Color(0xFFFFF1E6))
    )
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        cards.forEach { OverviewCard(it, isLoading = isLoading && data == null, modifier = Modifier.weight(1f)) }
    }
}

@Composable
private fun OverviewCard(item: OverviewItem, isLoading: Boolean, modifier: Modifier = Modifier) {
    Card(modifier = modifier.height(118.dp), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = item.container)) {
        Column(modifier = Modifier.fillMaxSize().padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Icon(item.icon, contentDescription = item.label, tint = item.tint, modifier = Modifier.size(28.dp))
            Spacer(Modifier.height(8.dp))
            Text(if (isLoading) "..." else item.value.ifBlank { "0" }, color = TextNavy, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
            Text(item.label, color = TextNavy, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun TodayWorkCard(data: AdminDashboardData?, isLoading: Boolean, onQuickAction: (String) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF7FAFF)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier
                .border(1.dp, Color(0xFFE0E6F0), RoundedCornerShape(20.dp))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Today's Work", color = TextNavy, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            if (isLoading && data == null) {
                repeat(3) { ActivitySkeletonRow() }
            } else {
                DailyWorkRow(
                    title = "Verify payments",
                    value = "${data?.recentPayments?.count { !(it.paymentStatus).equals("Paid", true) && !(it.paymentStatus).equals("Approved", true) } ?: 0}",
                    note = "resident proofs",
                    icon = Icons.Filled.Payments,
                    tint = Color(0xFF1D72F3),
                    onClick = { onQuickAction("Dues & Payments") }
                )
                DailyWorkRow(
                    title = "Follow up dues",
                    value = "${data?.pendingBillCount ?: 0}",
                    note = "${data?.overdueBillCount ?: 0} overdue",
                    icon = Icons.Filled.Assignment,
                    tint = Color(0xFFFF8A00),
                    onClick = { onQuickAction("Maintenance") }
                )
                DailyWorkRow(
                    title = "Resolve complaints",
                    value = "${data?.openComplaints ?: 0}",
                    note = "${data?.inProgressComplaints ?: 0} in progress",
                    icon = Icons.Filled.WarningAmber,
                    tint = Color(0xFFFF5A4F),
                    onClick = { onQuickAction("Complaints") }
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
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .background(Color.White)
            .padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(modifier = Modifier.size(40.dp), shape = CircleShape, color = tint.copy(alpha = 0.12f)) {
            Box(contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(22.dp))
            }
        }
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, color = TextNavy, fontWeight = FontWeight.Bold)
            Text(note, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
        }
        Text(value, color = TextNavy, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun AdminQuickAccessTile(action: AdminAction, onClick: () -> Unit) {
    Card(modifier = Modifier.height(104.dp).fillMaxWidth(0.31f).clickable(onClick = onClick), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Color.White), elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)) {
        Column(modifier = Modifier.fillMaxSize().border(1.dp, Color(0xFFE0E6F0), RoundedCornerShape(16.dp)).padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Icon(action.icon, contentDescription = action.label, tint = action.tint, modifier = Modifier.size(31.dp))
            Spacer(Modifier.height(10.dp))
            Text(action.label, color = TextNavy, textAlign = TextAlign.Center, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
private fun RecentActivityCard(data: AdminDashboardData?, isLoading: Boolean, onViewAll: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = Color.White), elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)) {
        Column(modifier = Modifier.border(1.dp, Color(0xFFE0E6F0), RoundedCornerShape(20.dp)).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
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
        Text(item.title, modifier = Modifier.weight(1f), color = TextNavy, style = MaterialTheme.typography.bodyMedium)
        Text(item.time, color = Color(0xFF8B95A7), style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun ActivitySkeletonRow() { Box(modifier = Modifier.fillMaxWidth().height(38.dp).clip(RoundedCornerShape(14.dp)).background(Color(0xFFF1F4F8))) }

@Composable
private fun ErrorInline(message: String, onRetry: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Icon(Icons.Filled.WarningAmber, contentDescription = null, tint = MaterialTheme.colorScheme.error)
            Text(message, modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.onErrorContainer)
            Text("Retry", modifier = Modifier.clickable(onClick = onRetry), color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun SoftInfoCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFF6F8FC))) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { Text(title, fontWeight = FontWeight.Bold, color = TextNavy); content() }
    }
}

@Composable
private fun AdminBottomBar(selected: String, onSelected: (String) -> Unit) {
    NavigationBar(containerColor = Color.White) {
        listOf("Dashboard", "Residents", "Payments", "More").forEach { item ->
            NavigationBarItem(
                selected = selected == item,
                onClick = { onSelected(item) },
                icon = { Icon(imageVector = when (item) { "Dashboard" -> Icons.Filled.Dashboard; "Residents" -> Icons.Filled.Groups; "Payments" -> Icons.Filled.Payments; else -> Icons.Filled.MoreVert }, contentDescription = item, tint = if (selected == item) Color(0xFF006BFF) else Color(0xFF555B66)) },
                label = { Text(item, color = if (selected == item) Color(0xFF006BFF) else TextNavy) }
            )
        }
    }
}

@Composable
private fun AdminDrawer(adminName: String, onAction: (String) -> Unit) {
    ModalDrawerSheet {
        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Surface(modifier = Modifier.size(60.dp), shape = CircleShape, color = Color(0xFFEAF3FF)) { Box(contentAlignment = Alignment.Center) { Icon(Icons.Filled.Security, contentDescription = "Admin", tint = AdminBlue) } }
            Text(adminName, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
            Text("Super Admin", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        listOf(
            AdminAction("Residents", "Residents", Icons.Filled.Groups, AdminBlue),
            AdminAction("Flats", "Flats", Icons.Filled.Apartment, Color(0xFF20B86B)),
            AdminAction("Maintenance & Payments", "Maintenance & Payments", Icons.Filled.Payments, Color(0xFF9C3ED7)),
            AdminAction("Notices", "Notices", Icons.Filled.Campaign, Color(0xFF2F80ED)),
            AdminAction("Rules", "Society Rules", Icons.Filled.Assignment, Color(0xFF0B7F77)),
            AdminAction("Complaints", "Complaints", Icons.Filled.WarningAmber, Color(0xFFFFA000)),
            AdminAction("Reports", "Reports", Icons.Filled.TrendingUp, Color(0xFF9C3ED7)),
            AdminAction("NOC", "NOC Requests", Icons.Filled.Description, Color(0xFF16B6A4)),
            AdminAction("Logout", "Logout", Icons.Filled.Logout, Color(0xFFE53935))
        ).forEach { action ->
            NavigationDrawerItem(label = { Text(action.label) }, selected = false, icon = { Icon(action.icon, contentDescription = action.label, tint = action.tint) }, onClick = { onAction(action.routeName) }, modifier = Modifier.padding(horizontal = 12.dp))
        }
    }
}

private fun adminQuickActions(): List<AdminAction> = listOf(
    AdminAction("Residents", "Residents", Icons.Filled.Groups, Color(0xFF2F80ED)),
    AdminAction("Flats", "Flats", Icons.Filled.Apartment, Color(0xFF20B86B)),
    AdminAction("Add Resident", "Add Resident", Icons.Filled.PersonAdd, Color(0xFFFF8A00)),
    AdminAction("Maintenance\n& Payments", "Maintenance & Payments", Icons.Filled.Payments, Color(0xFF9C3ED7)),
    AdminAction("Payment Reviews", "Payment Reviews", Icons.Filled.Assignment, Color(0xFFFF5A4F)),
    AdminAction("Notices", "Notices", Icons.Filled.Campaign, Color(0xFF2F80ED)),
    AdminAction("Rules", "Society Rules", Icons.Filled.Assignment, Color(0xFF0B7F77)),
    AdminAction("Complaints", "Complaints", Icons.Filled.WarningAmber, Color(0xFFFFA000)),
    AdminAction("Reports", "Reports", Icons.Filled.TrendingUp, Color(0xFF9C3ED7)),
    AdminAction("NOC", "NOC Requests", Icons.Filled.Description, Color(0xFF16B6A4)),
    AdminAction("Staff", "Staff", Icons.Filled.Security, Color(0xFF2F80ED))
)

private fun buildRecentActivities(data: AdminDashboardData?): List<ActivityItem> {
    if (data == null) return emptyList()
    val items = mutableListOf<ActivityItem>()
    data.recentPayments.firstOrNull()?.let { items += ActivityItem("Maintenance payment received from Flat ${it.flatNo ?: "-"}", DashboardFormatters.date(it.createdAt ?: it.paidAt), Icons.Filled.Payments, Color(0xFF21B66F), Color(0xFFE6F8ED)) }
    if (data.totalResidents > 0) items += ActivityItem("Residents directory updated", "Today", Icons.Filled.Groups, Color(0xFF2F80ED), Color(0xFFEAF3FF))
    data.latestNotices.firstOrNull()?.let { items += ActivityItem("New notice published", DashboardFormatters.date(it.createdAt), Icons.Filled.Campaign, Color(0xFFFF8A00), Color(0xFFFFF1E6)) }
    data.recentComplaints.firstOrNull()?.let { items += ActivityItem(it.title ?: "New complaint submitted", DashboardFormatters.statusLabel(it.status), Icons.Filled.WarningAmber, Color(0xFFFF5A4F), Color(0xFFFFECEA)) }
    return items.take(4)
}

private data class OverviewItem(val label: String, val value: String, val icon: ImageVector, val tint: Color, val container: Color)
private data class AdminAction(val label: String, val routeName: String, val icon: ImageVector, val tint: Color)
private data class ActivityItem(val title: String, val time: String, val icon: ImageVector, val tint: Color, val container: Color)
