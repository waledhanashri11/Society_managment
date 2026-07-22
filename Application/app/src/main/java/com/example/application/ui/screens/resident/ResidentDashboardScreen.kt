package com.example.application.ui.screens.resident

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Report
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material.icons.filled.TaskAlt
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.material3.TopAppBar
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
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.ResidentDashboardViewModel
import com.example.application.viewmodel.SessionViewModel
import java.math.BigDecimal
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResidentDashboardScreen(
    onProfileClick: () -> Unit,
    onLogoutComplete: () -> Unit,
    onQuickAction: (String) -> Unit,
    viewModel: ResidentDashboardViewModel = hiltViewModel(),
    sessionViewModel: SessionViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val data = state.data
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ResidentDrawer(
                residentName = data?.profile?.name,
                flat = data?.profile?.flatNo,
                onItemClick = { item ->
                    scope.launch { drawerState.close() }
                    when (item) {
                        "Payment History" -> onQuickAction("Payment History")
                        "Reports" -> onQuickAction("Reports")
                        "NOC Requests" -> onQuickAction("NOC Requests")
                        "Society Members" -> onQuickAction("Members")
                    }
                }
            )
        }
    ) {
        Scaffold(
            topBar = {
                ResidentDashboardTopBar(
                    title = "Society Management System",
                    subtitle = "Resident workspace",
                    residentName = data?.profile?.name,
                    onMenuClick = { scope.launch { drawerState.open() } },
                    onProfileClick = onProfileClick,
                    onNotificationClick = { onQuickAction("Notifications") }
                )
            },
            bottomBar = {
                ResidentBottomNavigation(
                    selected = "Home",
                    items = listOf("Home", "Maintenance", "Complaints", "Notices", "Profile"),
                    onSelected = { item ->
                        when (item) {
                            "Maintenance" -> onQuickAction("Maintenance")
                            "Complaints" -> onQuickAction("My Complaints")
                            "Notices" -> onQuickAction("Notices")
                            "Profile" -> onProfileClick()
                        }
                    }
                )
            }
        ) { padding ->
            PullToRefreshBox(
                isRefreshing = state.isRefreshing,
                onRefresh = { viewModel.load(refresh = true) },
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                when {
                    state.isLoading && data == null -> DashboardSkeleton()
                    data == null -> Column(modifier = Modifier.padding(20.dp)) {
                        DashboardError(
                            message = state.errorMessage ?: "Dashboard data is unavailable.",
                            onRetry = { viewModel.load(refresh = true) }
                        )
                    }
                    else -> LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(20.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        item {
                            ResidentHeroCard(
                                residentName = data.profile.name ?: "Resident",
                                flat = data.profile.flatNo ?: "Not assigned",
                                amount = DashboardFormatters.money(data.totalDue),
                                dueDate = DashboardFormatters.date(data.currentBill?.dueDate ?: data.currentBill?.maintenanceDueDate),
                                billId = data.currentBill?.id,
                                onPayNow = { billId ->
                                    if (!billId.isNullOrBlank()) onQuickAction("ResidentPayment:$billId")
                                    else onQuickAction("Maintenance")
                                }
                            )
                        }
                        item {
                            ResidentQuickActions(onQuickAction = onQuickAction)
                        }
                        item {
                            MetricGrid(
                                listOf(
                                    Triple("Outstanding", DashboardFormatters.money(data.totalDue), "${data.pendingBillCount} pending bills"),
                                    Triple("Total Paid", DashboardFormatters.money(data.totalPaid), "${data.paidBillCount} paid bills"),
                                    Triple("Complaints", data.totalComplaints.toString(), "${data.openComplaints} open"),
                                    Triple("Resolved", data.resolvedComplaints.toString(), "complaints resolved")
                                )
                            )
                        }
                        item {
                            SectionCard("Upcoming Due") {
                                val bill = data.currentBill
                                if (bill == null) {
                                    Text("No pending maintenance bill right now.")
                                } else {
                                    KeyValue("Title", bill.title ?: "Maintenance Bill")
                                    KeyValue("Amount", DashboardFormatters.money((bill.remainingAmount ?: bill.totalAmount).toMoneyDecimal()))
                                    KeyValue("Status", DashboardFormatters.statusLabel(bill.paymentStatus ?: bill.status))
                                    KeyValue("Due date", DashboardFormatters.date(bill.dueDate ?: bill.maintenanceDueDate))
                                }
                            }
                        }
                        item {
                            SectionCard("Latest Notices") {
                                if (data.latestNotices.isEmpty()) Text("No notices available.")
                                data.latestNotices.forEach {
                                    KeyValue(it.title ?: "Notice", DashboardFormatters.date(it.createdAt))
                                }
                            }
                        }
                        item {
                            SectionCard("Complaint Summary") {
                                KeyValue("Open", data.openComplaints.toString())
                                KeyValue("In progress", data.inProgressComplaints.toString())
                                KeyValue("Resolved", data.resolvedComplaints.toString())
                            }
                        }
                        if (data.warnings.isNotEmpty()) {
                            item {
                                SectionCard("Unavailable sections") {
                                    data.warnings.forEach { Text("• $it") }
                                }
                            }
                        }
                        state.errorMessage?.let {
                            item { DashboardError(it) { viewModel.load(refresh = true) } }
                        }
                        item { Spacer(Modifier.height(16.dp)) }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ResidentDashboardTopBar(
    title: String,
    subtitle: String,
    residentName: String?,
    onMenuClick: () -> Unit,
    onProfileClick: () -> Unit,
    onNotificationClick: () -> Unit
) {
    TopAppBar(
        navigationIcon = {
            IconButton(onClick = onMenuClick) {
                Icon(
                    imageVector = Icons.Filled.Menu,
                    contentDescription = "Open menu",
                    tint = Color(0xFF0B5FFF)
                )
            }
        },
        title = {
            Column {
                Text(title, fontWeight = FontWeight.Bold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        actions = {
            IconButton(onClick = onNotificationClick) {
                Icon(
                    imageVector = Icons.Filled.Notifications,
                    contentDescription = "Notifications",
                    tint = Color(0xFF0B5FFF)
                )
            }
            IconButton(onClick = onProfileClick) {
                Surface(
                    modifier = Modifier.size(38.dp),
                    shape = CircleShape,
                    color = Color(0xFFEAF3FF)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(CircleShape),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = residentName?.trim()?.firstOrNull()?.uppercaseChar()?.toString() ?: "R",
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0B5FFF)
                        )
                    }
                }
            }
        }
    )
}

@Composable
private fun ResidentHeroCard(
    residentName: String,
    flat: String,
    amount: String,
    dueDate: String,
    billId: String?,
    onPayNow: (String?) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Column(
            modifier = Modifier
                .background(
                    Brush.linearGradient(
                        colors = listOf(Color(0xFF0B6BFF), Color(0xFF083B92))
                    )
                )
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text("Welcome back", color = Color.White.copy(alpha = 0.82f))
            Text(residentName, style = MaterialTheme.typography.titleLarge, color = Color.White, fontWeight = FontWeight.Bold)
            Text("Flat: $flat", color = Color.White.copy(alpha = 0.82f))
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.weight(1f)) {
                        Text("Total Due", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(amount, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        Text("Due Date: $dueDate", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Surface(
                        onClick = { onPayNow(billId) },
                        color = Color(0xFF0B5FFF),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Filled.Payments, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                            Text("Pay Now", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ResidentQuickActions(onQuickAction: (String) -> Unit) {
    SectionCard("Quick Actions") {
        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            ResidentAction("Maintenance", Icons.Filled.Payments) { onQuickAction("Maintenance") }
            ResidentAction("Complaints", Icons.Filled.ReportProblem) { onQuickAction("My Complaints") }
            ResidentAction("Notices", Icons.Filled.Campaign) { onQuickAction("Notices") }
            ResidentAction("Rules", Icons.Filled.TaskAlt) { onQuickAction("Society Rules") }
            ResidentAction("NOC", Icons.Filled.Description) { onQuickAction("NOC Requests") }
        }
    }
}

@Composable
private fun ResidentAction(label: String, icon: ImageVector, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Surface(
            onClick = onClick,
            modifier = Modifier.size(54.dp),
            shape = RoundedCornerShape(16.dp),
            color = Color(0xFFEAF3FF)
        ) {
            Row(
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(icon, contentDescription = label, tint = Color(0xFF0B5FFF))
            }
        }
        Text(label, style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun ResidentDrawer(
    residentName: String?,
    flat: String?,
    onItemClick: (String) -> Unit
) {
    ModalDrawerSheet {
        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Surface(modifier = Modifier.size(58.dp), shape = CircleShape, color = Color(0xFF0B5FFF)) {
                Row(modifier = Modifier.fillMaxSize(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                    Text(residentName?.trim()?.firstOrNull()?.uppercaseChar()?.toString() ?: "R", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
            Text(residentName ?: "Resident", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text("Flat: ${flat ?: "-"}", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        listOf(
            DrawerItem("Payment History", Icons.Filled.Payments),
            DrawerItem("Reports", Icons.Filled.Report),
            DrawerItem("NOC Requests", Icons.Filled.Description),
            DrawerItem("Society Members", Icons.Filled.Groups)
        ).forEach { item ->
            NavigationDrawerItem(
                label = { Text(item.label) },
                selected = false,
                icon = { Icon(item.icon, contentDescription = item.label) },
                onClick = { onItemClick(item.label) },
                modifier = Modifier.padding(horizontal = 12.dp)
            )
        }
    }
}

private data class DrawerItem(val label: String, val icon: ImageVector)

@Composable
private fun ResidentBottomNavigation(
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
                    Icon(
                        imageVector = navIcon(item),
                        contentDescription = item,
                        modifier = Modifier.size(21.dp),
                        tint = if (selected == item) Color(0xFF0B5FFF) else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                },
                label = { Text(item, style = MaterialTheme.typography.labelSmall) }
            )
        }
    }
}

private fun navIcon(label: String): ImageVector {
    return when (label) {
        "Home" -> Icons.Filled.Home
        "Maintenance" -> Icons.Filled.Payments
        "Complaints" -> Icons.Filled.ReportProblem
        "Notices" -> Icons.Filled.Campaign
        "Profile" -> Icons.Filled.Person
        else -> Icons.Filled.TaskAlt
    }
}

@Composable
private fun DashboardSkeleton() {
    Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        repeat(5) { index ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(if (index == 0) 180.dp else 82.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f))
            )
        }
    }
}

@Composable
private fun DashboardError(message: String, onRetry: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(message, color = MaterialTheme.colorScheme.onErrorContainer)
            Surface(
                onClick = onRetry,
                color = MaterialTheme.colorScheme.error,
                shape = RoundedCornerShape(14.dp)
            ) {
                Text("Retry", modifier = Modifier.padding(horizontal = 16.dp, vertical = 9.dp), color = MaterialTheme.colorScheme.onError)
            }
        }
    }
}

@Composable
private fun SectionCard(
    title: String,
    subtitle: String? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            subtitle?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            content()
        }
    }
}

@Composable
private fun KeyValue(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, modifier = Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MetricGrid(items: List<Triple<String, String, String?>>) {
    FlowRow(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        maxItemsInEachRow = 2
    ) {
        items.forEach { (label, value, note) ->
            Card(modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(label, style = MaterialTheme.typography.labelLarge)
                    note?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

private fun String?.toMoneyDecimal(): BigDecimal = this?.toBigDecimalOrNull() ?: BigDecimal.ZERO
