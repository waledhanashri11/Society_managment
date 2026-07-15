package com.example.application.ui.screens.resident

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Person
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
import com.example.application.ui.components.DashboardError
import com.example.application.ui.components.DashboardSkeleton
import com.example.application.ui.components.KeyValue
import com.example.application.ui.components.MetricGrid
import com.example.application.ui.components.QuickAction
import com.example.application.ui.components.SectionCard
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.ResidentDashboardViewModel
import com.example.application.viewmodel.SessionViewModel
import java.math.BigDecimal

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
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

    Scaffold(
        topBar = {
            AppTopBar(
                title = "Society Management System",
                subtitle = data?.profile?.name?.let { "Hello, $it" } ?: "Resident workspace",
                role = AppRoleTheme.Resident,
                navigationText = "Menu",
                navigationIcon = Icons.Filled.Menu,
                onNavigationClick = { },
                actionText = "Profile",
                actionIcon = Icons.Filled.Person,
                onActionClick = onProfileClick
            )
        },
        bottomBar = {
            AppBottomNavigation(
                role = AppRoleTheme.Resident,
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
                data == null -> androidx.compose.foundation.layout.Column(modifier = Modifier.padding(20.dp)) {
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
                        Text("Welcome, ${data.profile.name ?: "Resident"}", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        Text(data.profile.societyName ?: "Society Management System", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        if (state.isFromCache) Text("Showing recently loaded data", color = MaterialTheme.colorScheme.tertiary)
                    }
                    item {
                        SectionCard("My Flat", "Your assigned residence") {
                            KeyValue("Flat", data.profile.flatNo ?: "Not assigned")
                            KeyValue("Wing", data.profile.wing ?: "-")
                            KeyValue("Floor", data.profile.floorNo ?: "-")
                            KeyValue("Account status", DashboardFormatters.statusLabel(data.profile.status))
                        }
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
                        SectionCard("Current Maintenance Bill") {
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
                    item {
                        SectionCard("Quick Actions") {
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                listOf("Maintenance", "Payment History", "Create Complaint", "Notices", "Notifications", "Profile", "Reports").forEach {
                                    QuickAction(label = it) {
                                        if (it == "Profile") onProfileClick() else onQuickAction(it)
                                    }
                                }
                            }
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

private fun String?.toMoneyDecimal(): BigDecimal = this?.toBigDecimalOrNull() ?: BigDecimal.ZERO
