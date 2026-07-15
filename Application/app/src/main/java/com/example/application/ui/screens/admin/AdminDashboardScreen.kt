package com.example.application.ui.screens.admin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.ui.components.AppBottomNavigation
import com.example.application.ui.components.AppRoleTheme
import com.example.application.ui.components.AppTopBar
import com.example.application.ui.components.DashboardCard
import com.example.application.ui.components.DashboardError
import com.example.application.ui.components.DashboardSkeleton
import com.example.application.ui.components.KeyValue
import com.example.application.ui.components.QuickAction
import com.example.application.ui.components.StatCard
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.AdminDashboardViewModel
import com.example.application.viewmodel.SessionViewModel
import java.math.BigDecimal

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AdminDashboardScreen(
    onLogoutComplete: () -> Unit,
    onQuickAction: (String) -> Unit,
    viewModel: AdminDashboardViewModel = hiltViewModel(),
    sessionViewModel: SessionViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val data = state.data

    Scaffold(
        topBar = {
            AppTopBar(
                title = "Society Management System",
                subtitle = "Admin workspace",
                role = AppRoleTheme.Admin,
                navigationText = "Menu",
                navigationIcon = Icons.Filled.Menu,
                onNavigationClick = { },
                actionText = "Alerts",
                actionIcon = Icons.Filled.Notifications,
                onActionClick = { onQuickAction("Notifications") }
            )
        },
        bottomBar = {
            AppBottomNavigation(
                role = AppRoleTheme.Admin,
                selected = "Dashboard",
                items = listOf("Dashboard", "Residents", "Maintenance", "More"),
                onSelected = { item ->
                    when (item) {
                        "Residents" -> onQuickAction("Residents")
                        "Maintenance" -> onQuickAction("Maintenance")
                        "More" -> onQuickAction("Reports")
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
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    item {
                        Text("Hello, ${data.adminName}", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        Text("Here's what's happening today.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        if (state.isFromCache) Text("Showing recently loaded data", color = MaterialTheme.colorScheme.tertiary)
                        state.errorMessage?.let { DashboardError(it) { viewModel.load(refresh = true) } }
                    }
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                                StatCard("Residents", data.totalResidents.toString(), "${data.pendingRegistrations} pending", AppRoleTheme.Admin, Modifier.weight(1f))
                                StatCard("Flats", data.totalFlats.toString(), "${data.occupiedFlats} occupied", AppRoleTheme.Admin, Modifier.weight(1f))
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                                StatCard("Collected", DashboardFormatters.money(data.collected), "${data.paidBillCount} paid bills", AppRoleTheme.Admin, Modifier.weight(1f))
                                StatCard("Pending", DashboardFormatters.money(data.pending), "${data.pendingBillCount} bills", AppRoleTheme.Admin, Modifier.weight(1f))
                            }
                        }
                    }
                    item {
                        DashboardCard("Maintenance Collection", "Real totals from maintenance bills", AppRoleTheme.Admin) {
                            KeyValue("Total billed", DashboardFormatters.money(data.totalBilled))
                            KeyValue("Collected", DashboardFormatters.money(data.collected))
                            KeyValue("Pending", DashboardFormatters.money(data.pending))
                            KeyValue("Overdue bills", data.overdueBillCount.toString())
                        }
                    }
                    item {
                        DashboardCard("Complaints", "Current complaint status", AppRoleTheme.Admin) {
                            KeyValue("Open", data.openComplaints.toString())
                            KeyValue("In progress", data.inProgressComplaints.toString())
                            KeyValue("Resolved", data.resolvedComplaints.toString())
                        }
                    }
                    item {
                        DashboardCard("Latest Notices", "${data.totalNotices} latest notices loaded", AppRoleTheme.Admin) {
                            if (data.latestNotices.isEmpty()) {
                                Text("No notices available.")
                            } else {
                                data.latestNotices.forEach {
                                    KeyValue(it.title ?: "Notice", DashboardFormatters.date(it.createdAt))
                                }
                            }
                        }
                    }
                    item {
                        DashboardCard("Recent Complaints", role = AppRoleTheme.Admin) {
                            if (data.recentComplaints.isEmpty()) Text("No complaints found.")
                            data.recentComplaints.forEach {
                                KeyValue(it.title ?: "Complaint", DashboardFormatters.statusLabel(it.status))
                            }
                        }
                    }
                    if (data.recentPayments.isNotEmpty()) {
                        item {
                            DashboardCard("Recent Payments", role = AppRoleTheme.Admin) {
                                data.recentPayments.forEach {
                                    KeyValue("${it.residentName ?: "Resident"} • Flat ${it.flatNo ?: "-"}", DashboardFormatters.money(it.amount.toMoneyDecimal()))
                                }
                            }
                        }
                    }
                    item {
                        DashboardCard("Quick Actions", role = AppRoleTheme.Admin) {
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                listOf("Residents", "Flats", "Staff", "Generate Maintenance", "Complaints", "Add Notice", "Reports").forEach {
                                    QuickAction(label = it) { onQuickAction(it) }
                                }
                            }
                        }
                    }
                    if (data.warnings.isNotEmpty()) {
                        item {
                            DashboardCard("Unavailable sections", role = AppRoleTheme.Admin) {
                                data.warnings.forEach { Text("• $it") }
                            }
                        }
                    }
                    item { Spacer(Modifier.height(16.dp)) }
                }
            }
        }
    }
}

private fun String?.toMoneyDecimal(): BigDecimal = this?.toBigDecimalOrNull() ?: BigDecimal.ZERO
