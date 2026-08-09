package com.example.application.ui.screens.resident

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.ui.components.RetryState
import com.example.application.ui.screens.resident.components.ResidentBottomNavigation
import com.example.application.ui.screens.resident.components.ResidentComplaintTrackerCard
import com.example.application.ui.screens.resident.components.ResidentDashboardSkeleton
import com.example.application.ui.screens.resident.components.ResidentHeader
import com.example.application.ui.screens.resident.components.ResidentHeroCard
import com.example.application.ui.screens.resident.components.ResidentLatestNoticesCard
import com.example.application.ui.screens.resident.components.ResidentQuickAccessSection
import com.example.application.ui.screens.resident.components.ResidentSummaryCards
import com.example.application.ui.screens.resident.components.ResidentUpcomingMaintenanceCard
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.ResidentDashboardViewModel
import com.example.application.viewmodel.SessionViewModel

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

    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        viewModel.load(refresh = true)
    }

    val currentBillId = data?.currentBill?.id
    val payNowRoute = if (!currentBillId.isNullOrBlank()) "ResidentPayment:$currentBillId" else "Maintenance"

    Scaffold(
        bottomBar = {
            ResidentBottomNavigation(
                selectedRoute = "Home",
                onSelectRoute = { route ->
                    when (route) {
                        "Home" -> { /* Already on Home */ }
                        "Maintenance" -> onQuickAction("Maintenance")
                        "Pay" -> onQuickAction(payNowRoute)
                        "Notices" -> onQuickAction("Notices")
                        "More" -> onQuickAction("More")
                    }
                }
            )
        }
    ) { paddingValues ->
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            color = MaterialTheme.colorScheme.background
        ) {
            PullToRefreshBox(
                isRefreshing = state.isRefreshing,
                onRefresh = { viewModel.load(refresh = true) },
                modifier = Modifier.fillMaxSize()
            ) {
                when {
                    state.isLoading && data == null -> ResidentDashboardSkeleton()
                    data == null -> Column(modifier = Modifier.padding(20.dp)) {
                        RetryState(
                            message = state.errorMessage ?: "Dashboard data is currently unavailable.",
                            onRetry = { viewModel.load(refresh = true) }
                        )
                    }
                    else -> LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // 1. Personal Header
                        item {
                            ResidentHeader(
                                residentName = data.profile.name,
                                onProfileClick = onProfileClick,
                                onNotificationClick = { onQuickAction("Notifications") }
                            )
                        }

                        // 2. Main Maintenance / Total Amount Due Hero Card
                        item {
                            ResidentHeroCard(
                                amountText = DashboardFormatters.money(data.totalDue),
                                dueDateText = DashboardFormatters.date(data.currentBill?.dueDate ?: data.currentBill?.maintenanceDueDate),
                                onPayNowClick = { onQuickAction(payNowRoute) }
                            )
                        }

                        // 3. 4 Summary Cards (Total Due, Paid, Complaints, Approved)
                        item {
                            ResidentSummaryCards(
                                totalDueText = DashboardFormatters.money(data.totalDue),
                                pendingBillsCount = data.pendingBillCount,
                                totalPaidText = DashboardFormatters.money(data.totalPaid),
                                paidBillsCount = data.paidBillCount,
                                openComplaintsCount = data.openComplaints,
                                approvedComplaintsCount = data.resolvedComplaints,
                                onTotalDueClick = { onQuickAction("Maintenance") },
                                onPaidClick = { onQuickAction("Payment History") },
                                onComplaintsClick = { onQuickAction("My Complaints") },
                                onApprovedClick = { onQuickAction("My Complaints") }
                            )
                        }

                        // 4. Upcoming Maintenance Card
                        item {
                            ResidentUpcomingMaintenanceCard(
                                bill = data.currentBill,
                                onViewDetailsClick = { onQuickAction("Maintenance") }
                            )
                        }

                        // 5. Latest Society Notices
                        item {
                            ResidentLatestNoticesCard(
                                notices = data.latestNotices,
                                onViewAllClick = { onQuickAction("Notices") }
                            )
                        }

                        // 6. Complaint Activity Tracker
                        item {
                            ResidentComplaintTrackerCard(
                                openCount = data.openComplaints,
                                inProgressCount = data.inProgressComplaints,
                                resolvedCount = data.resolvedComplaints,
                                onTrackAllClick = { onQuickAction("My Complaints") }
                            )
                        }

                        // 7. Quick Access Section
                        item {
                            ResidentQuickAccessSection(
                                onQuickAction = { destination ->
                                    if (destination == "PROFILE_SCREEN") {
                                        onProfileClick()
                                    } else {
                                        onQuickAction(destination)
                                    }
                                }
                            )
                        }

                        if (state.errorMessage != null && !state.isRefreshing) {
                            item {
                                RetryState(
                                    message = state.errorMessage!!,
                                    onRetry = { viewModel.load(refresh = true) }
                                )
                            }
                        }

                        item { Spacer(Modifier.height(12.dp)) }
                    }
                }
            }
        }
    }
}
