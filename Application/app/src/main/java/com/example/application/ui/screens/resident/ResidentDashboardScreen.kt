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
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material.icons.filled.SensorDoor
import androidx.compose.material.icons.filled.TaskAlt
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.R
import com.example.application.data.remote.dto.MaintenanceBillDto
import com.example.application.data.remote.dto.netPayableAmount
import com.example.application.ui.components.DashboardSkeleton
import com.example.application.ui.components.MetricGrid
import com.example.application.ui.components.SectionCard
import com.example.application.ui.components.KeyValue
import com.example.application.ui.components.RetryState
import com.example.application.ui.components.LanguageSelector
import com.example.application.ui.components.NotificationDropdown
import com.example.application.ui.components.localizedLabel
import com.example.application.ui.components.localizedPaymentStatus
import com.example.application.util.DashboardFormatters
import com.example.application.ui.theme.SocietyBlue40
import com.example.application.viewmodel.ResidentDashboardViewModel
import com.example.application.viewmodel.SessionViewModel
import java.math.BigDecimal


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

    Scaffold(
        topBar = {
            ResidentDashboardTopBar(
                title = stringResource(R.string.society_management_system),
                subtitle = stringResource(R.string.resident_workspace),
                residentName = data?.profile?.name,
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
            indicator = {},
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                state.isLoading && data == null -> DashboardSkeleton()
                data == null -> Column(modifier = Modifier.padding(20.dp)) {
                    RetryState(
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
                            canPay = data.currentBill?.canResidentSubmitPayment() == true,
                            statusText = data.currentBill?.residentFriendlyStatus() ?: "No pending bill",
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
                                Triple(stringResource(R.string.total_due), DashboardFormatters.money(data.totalDue), pluralStringResource(R.plurals.pending_bills, data.pendingBillCount, data.pendingBillCount)),
                                Triple(stringResource(R.string.status_paid), DashboardFormatters.money(data.totalPaid), "${data.paidBillCount} ${stringResource(R.string.status_paid).lowercase()}"),
                                Triple(stringResource(R.string.complaints), data.totalComplaints.toString(), data.openComplaints.toString()),
                                Triple(stringResource(R.string.status_approved), data.resolvedComplaints.toString(), stringResource(R.string.complaints))
                            )
                        )
                    }
                    item {
                        SectionCard(stringResource(R.string.upcoming_due)) {
                            val bill = data.currentBill
                            if (bill == null) {
                                Text(stringResource(R.string.no_pending_bills), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            } else {
                                KeyValue(stringResource(R.string.rules_title), bill.title ?: stringResource(R.string.maintenance))
                                KeyValue(stringResource(R.string.submitted_amount), DashboardFormatters.money(bill.netPayableAmount()))
                                KeyValue(stringResource(R.string.rules_status), bill.residentFriendlyStatus())
                                KeyValue(stringResource(R.string.meeting_date), DashboardFormatters.date(bill.dueDate ?: bill.maintenanceDueDate))
                            }
                        }
                    }
                    item {
                        SectionCard(stringResource(R.string.latest_notices)) {
                            if (data.latestNotices.isEmpty()) Text(stringResource(R.string.notice_no_notices), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            data.latestNotices.forEach {
                                KeyValue(it.title ?: stringResource(R.string.notices), DashboardFormatters.date(it.createdAt))
                            }
                        }
                    }
                    item {
                        SectionCard(stringResource(R.string.complaint_summary)) {
                            KeyValue(stringResource(R.string.open_label), data.openComplaints.toString())
                            KeyValue(stringResource(R.string.in_progress_label), data.inProgressComplaints.toString())
                            KeyValue(stringResource(R.string.resolved_label), data.resolvedComplaints.toString())
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
                        item { RetryState(it, onRetry = { viewModel.load(refresh = true) }) }
                    }
                    item { Spacer(Modifier.height(16.dp)) }
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
    onProfileClick: () -> Unit,
    onNotificationClick: () -> Unit
) {
    TopAppBar(
        navigationIcon = {},  // No drawer icon
        title = {
            Column {
                Text(title, fontWeight = FontWeight.Bold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        actions = {
            NotificationDropdown(tint = MaterialTheme.colorScheme.primary, onViewAll = onNotificationClick)
            IconButton(onClick = onProfileClick) {
                Surface(
                    modifier = Modifier.size(38.dp),
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primaryContainer
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
                            color = MaterialTheme.colorScheme.onPrimaryContainer
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
    canPay: Boolean,
    statusText: String,
    onPayNow: (String?) -> Unit
) {
    val currentHour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
    val greetingRes = when (currentHour) {
        in 4..11 -> R.string.greeting_good_morning
        in 12..16 -> R.string.greeting_good_afternoon
        else -> R.string.greeting_good_evening
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Column(
            modifier = Modifier
                .background(
                    Brush.linearGradient(
                        colors = listOf(Color(0xFF1E40AF), Color(0xFF1E3A8A), Color(0xFF0F172A))
                    )
                )
                .padding(22.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = "${stringResource(greetingRes)},",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = 0.85f)
                    )
                    Text(
                        text = residentName,
                        style = MaterialTheme.typography.headlineSmall,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color.White.copy(alpha = 0.18f)
                ) {
                    Text(
                        text = stringResource(R.string.flat_label, flat),
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.weight(1f)) {
                        Text(
                            text = stringResource(R.string.total_due),
                            style = MaterialTheme.typography.labelMedium,
                            color = Color(0xFF64748B)
                        )
                        Text(
                            text = amount,
                            style = MaterialTheme.typography.headlineMedium,
                            color = Color(0xFF0F172A),
                            fontWeight = FontWeight.ExtraBold
                        )
                        Text(
                            text = stringResource(R.string.due_date, dueDate),
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF64748B)
                        )
                    }
                    Surface(
                        onClick = { if (canPay) onPayNow(billId) else onPayNow(null) },
                        color = if (canPay) Color(0xFF2563EB) else Color(0xFFF1F5F9),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 18.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Payments,
                                contentDescription = "Payment",
                                tint = if (canPay) Color.White else Color(0xFF475569),
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                text = if (canPay) stringResource(R.string.pay_now) else stringResource(R.string.view),
                                color = if (canPay) Color.White else Color(0xFF475569),
                                fontWeight = FontWeight.Bold
                            )
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
    SectionCard(stringResource(R.string.quick_actions)) {
        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            ResidentAction("Maintenance", Icons.Filled.Payments, Color(0xFF2563EB)) { onQuickAction("Maintenance") }
            ResidentAction("Complaints", Icons.Filled.ReportProblem, Color(0xFFD97706)) { onQuickAction("My Complaints") }
            ResidentAction("Notices", Icons.Filled.Campaign, Color(0xFF0D9488)) { onQuickAction("Notices") }
            ResidentAction("Meetings", Icons.Filled.Event, Color(0xFF7C3AED)) { onQuickAction("Meeting Management") }
            ResidentAction("Rules", Icons.Filled.TaskAlt, Color(0xFF059669)) { onQuickAction("Society Rules") }
            ResidentAction("Payment History", Icons.Filled.Description, Color(0xFF6366F1)) { onQuickAction("Payment History") }
            ResidentAction("Reports", Icons.Filled.GridView, Color(0xFF0284C7)) { onQuickAction("Reports") }
            ResidentAction("NOC", Icons.Filled.SensorDoor, Color(0xFFDB2777)) { onQuickAction("NOC Requests") }
            ResidentAction("Members", Icons.Filled.Groups, Color(0xFF4F46E5)) { onQuickAction("Members") }
            ResidentAction("Notifications", Icons.Filled.Notifications, Color(0xFFEA580C)) { onQuickAction("Notifications") }
        }
    }
}

@Composable
private fun ResidentAction(label: String, icon: ImageVector, accentColor: Color, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Surface(
            onClick = onClick,
            modifier = Modifier.size(54.dp),
            shape = RoundedCornerShape(16.dp),
            color = accentColor.copy(alpha = 0.12f)
        ) {
            Row(
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(icon, contentDescription = label, tint = accentColor, modifier = Modifier.size(24.dp))
            }
        }
        Text(
            text = localizedLabel(label),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}



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
                        tint = if (selected == item) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                },
                label = { Text(localizedLabel(item), style = MaterialTheme.typography.labelSmall, color = if (selected == item) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant) }
            )
        }
    }
}

private fun navIcon(label: String): ImageVector {
    return when (label) {
        "Home", "Dashboard" -> Icons.Filled.Home
        "Maintenance" -> Icons.Filled.Payments
        "Complaints" -> Icons.Filled.ReportProblem
        "Notices" -> Icons.Filled.Campaign
        "Rules" -> Icons.Filled.TaskAlt
        "Meetings" -> Icons.Filled.Event
        "Profile" -> Icons.Filled.Person
        else -> Icons.Filled.Home
    }
}

private fun String?.toMoneyDecimal(): BigDecimal =
    this?.toBigDecimalOrNull() ?: BigDecimal.ZERO

private fun MaintenanceBillDto.residentFriendlyStatus(): String {
    val status = (this.latestPaymentStatus ?: this.paymentStatus ?: this.status).orEmpty().trim().replace("_", " ")
    return when (status.lowercase()) {
        "pending verification", "under review", "payment proof submitted", "needs clarification" -> "Verification Pending"
        "approved", "paid" -> "Paid"
        "rejected" -> "Rejected"
        "partially paid" -> "Partially Paid"
        "written off", "write off", "partial write off" -> if ((this.remainingAmount ?: this.totalAmount).toMoneyDecimal() <= BigDecimal.ZERO) "Paid" else "Unpaid"
        "overdue" -> "Unpaid / Overdue"
        "pending", "unpaid", "" -> "Unpaid"
        else -> DashboardFormatters.statusLabel(status)
    }
}

private fun MaintenanceBillDto.canResidentSubmitPayment(): Boolean {
    val status = (this.latestPaymentStatus ?: this.paymentStatus ?: this.status).orEmpty().trim().replace("_", " ").lowercase()
    val isSettled = (this.remainingAmount ?: this.totalAmount).toMoneyDecimal() <= BigDecimal.ZERO
    return !isSettled && status !in setOf("pending verification", "under review", "payment proof submitted", "needs clarification", "approved", "paid")
}
