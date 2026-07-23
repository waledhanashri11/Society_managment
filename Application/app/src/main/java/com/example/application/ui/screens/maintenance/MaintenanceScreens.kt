package com.example.application.ui.screens.maintenance

import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.util.Base64
import android.widget.Toast
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.Wallet
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.example.application.BuildConfig
import com.example.application.R
import com.example.application.data.remote.dto.ExpenseDto
import com.example.application.data.remote.dto.MaintenanceBillDto
import com.example.application.data.remote.dto.MaintenanceCategoryDto
import com.example.application.data.remote.dto.MaintenancePaymentDto
import com.example.application.data.remote.dto.MaintenanceWaiverDto
import com.example.application.data.remote.dto.PaymentSettingsDto
import com.example.application.ui.components.AppBottomNavigation
import com.example.application.ui.components.AppRoleTheme
import com.example.application.ui.screens.resident.saveResidentReceiptPdf
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.AdminMaintenanceViewModel
import com.example.application.viewmodel.ResidentMaintenanceViewModel
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import kotlin.math.max

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AdminMaintenanceScreen(
    onBack: () -> Unit,
    onPaymentVerification: () -> Unit = {},
    initialTab: String = "Overview",
    viewModel: AdminMaintenanceViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val data = state.data
    var dialog by remember { mutableStateOf<MaintenanceDialog?>(null) }
    var selectedMonth by remember { mutableStateOf(LocalDate.now().monthValue) }
    var selectedYear by remember { mutableStateOf(LocalDate.now().year) }
    LaunchedEffect(initialTab) {
        viewModel.setTab(if (initialTab == "Payments") "Verification" else initialTab)
    }
    val bills by remember(data?.bills, state.query, state.filter) {
        derivedStateOf {
            data?.bills.orEmpty()
                .filter { it.matchesBill(state.query) }
                .filter { state.filter == "All" || (it.paymentStatus ?: it.status) == state.filter }
        }
    }

    Scaffold(topBar = {
        MaintenanceTopBar(
            title = "Maintenance",
            subtitle = "Bills, dues, write-offs and settings",
            navigationText = "Back",
            onNavigationClick = onBack,
            actionText = "Apply Penalty",
            onActionClick = { viewModel.applyPenalty() }
        )
    }) { padding ->
        PullToRefreshBox(
            isRefreshing = state.isRefreshing,
            onRefresh = { viewModel.load(refresh = true) },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF7F9FC))
        ) {
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, top = 14.dp, end = 16.dp, bottom = 18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                item {
                    AdminMaintenanceTabs(
                        selected = state.activeTab,
                        onSelected = viewModel::setTab
                    )
                    state.message?.let {
                        AdminInlineMessage(it, Color(0xFF0B56D9), Color(0xFFEAF2FF), Modifier.padding(top = 10.dp))
                    }
                    state.error?.let { RetryState(it, { viewModel.load(refresh = true) }, Modifier.padding(top = 10.dp)) }
                }
                if (state.isLoading && data == null) {
                    item { DashboardSkeleton() }
                } else if (data == null) {
                    item { EmptyState("Maintenance unavailable", "Pull down or tap retry.") }
                } else {
                    item {
                        AdminMaintenanceHomeSummary(
                            data = data,
                            selectedMonth = selectedMonth,
                            selectedYear = selectedYear,
                            onPreviousMonth = {
                                if (selectedMonth == 1) {
                                    selectedMonth = 12
                                    selectedYear -= 1
                                } else selectedMonth -= 1
                            },
                            onNextMonth = {
                                if (selectedMonth == 12) {
                                    selectedMonth = 1
                                    selectedYear += 1
                                } else selectedMonth += 1
                            },
                            onGenerateBills = { dialog = MaintenanceDialog.Generate },
                            onRecordPayment = { viewModel.setTab("Bills") },
                            onVerifyPayments = onPaymentVerification,
                            onDefaulters = { viewModel.setTab("Defaulters") },
                            onWriteOff = { viewModel.setTab("Write-Offs") },
                            onReports = { viewModel.setTab("Reports") }
                        )
                    }
                    when (state.activeTab) {
                        "Defaulters" -> defaultersTab(data.bills, viewModel, { dialog = it })
                        "Write-Offs" -> waiversTab(data.waivers, viewModel, { dialog = it })
                        "Categories" -> categoriesTab(data.categories, viewModel, { dialog = it })
                        "Expenses" -> expensesTab(data.expenses, viewModel, { dialog = it })
                        "Late Fee" -> lateFeeTab(data.lateFeeRule, viewModel, { dialog = it })
                        "Settings" -> settingsTab(data.settings, viewModel, { dialog = it })
                        "Disputes" -> disputesTab(data.disputes)
                        "Reports" -> reportsTab(data)
                        else -> billsTab(bills, state.query, state.filter, viewModel, { dialog = it })
                    }
                    if (data.warnings.isNotEmpty()) {
                        item { SectionCard("Warnings") { data.warnings.forEach { Text("â€¢ $it") } } }
                    }
                }
            }
        }
    }
    MaintenanceDialogHost(dialog, onDismiss = { dialog = null }, viewModel = viewModel)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminPaymentVerificationScreen(
    onBack: () -> Unit,
    viewModel: AdminMaintenanceViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val data = state.data
    LaunchedEffect(Unit) {
        viewModel.setTab("Verification")
        viewModel.setFilter("Pending")
    }
    Scaffold(topBar = {
        MaintenanceTopBar(
            title = "Payment Verification",
            subtitle = "Review resident payment proofs",
            navigationText = "Back",
            onNavigationClick = onBack,
            actionText = "Refresh",
            onActionClick = { viewModel.load(refresh = true) }
        )
    }) { padding ->
        PullToRefreshBox(
            isRefreshing = state.isRefreshing,
            onRefresh = { viewModel.load(refresh = true) },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF7F9FC))
        ) {
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, top = 14.dp, end = 16.dp, bottom = 18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                state.message?.let {
                    item { AdminInlineMessage(it, Color(0xFF0B56D9), Color(0xFFEAF2FF)) }
                }
                state.error?.let {
                    item { RetryState(it, { viewModel.load(refresh = true) }) }
                }
                when {
                    state.isLoading && data == null -> item { DashboardSkeleton() }
                    data == null -> item { EmptyState("Payment verification unavailable", "Pull down or tap refresh.") }
                    else -> item { PaymentVerificationSection(data.payments, state.query, state.filter, viewModel) }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ResidentMaintenanceScreen(
    onBack: () -> Unit,
    onPayBill: (String) -> Unit = {},
    onPaymentHistory: () -> Unit = {},
    onHome: () -> Unit = {},
    onNotices: () -> Unit = {},
    onProfile: () -> Unit = {},
    viewModel: ResidentMaintenanceViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val data = state.data
    val context = LocalContext.current
    Scaffold(topBar = {
        ResidentMaintenanceTopBar(onBack = onBack, onPaymentHistory = onPaymentHistory)
    }, bottomBar = {
        ResidentMaintenanceBottomBar(
            onHome = onHome,
            onNotices = onNotices,
            onPayments = {},
            onProfile = onProfile
        )
    }) { padding ->
        PullToRefreshBox(isRefreshing = state.isRefreshing, onRefresh = { viewModel.load(refresh = true) }, modifier = Modifier.fillMaxSize().padding(padding)) {
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, top = 14.dp, end = 16.dp, bottom = 18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFFF7F9FC))
            ) {
                item {
                    state.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
                    state.error?.let { RetryState(it, { viewModel.load(refresh = true) }) }
                }
                if (state.isLoading && data == null) {
                    item { DashboardSkeleton() }
                } else if (data == null) {
                    item { EmptyState("No maintenance data", "Your bills will appear here.") }
                } else {
                    val pending = data.bills.filter { !(it.paymentStatus ?: it.status).isApprovedStatus() }
                    val paid = data.bills.filter { (it.paymentStatus ?: it.status).isApprovedStatus() }
                    val firstPayable = data.bills.firstOrNull { (it.paymentStatus ?: it.status).isResidentPayableStatus() }
                    item {
                        ResidentMaintenanceOverviewCard(
                            totalOutstanding = pending.fold(BigDecimal.ZERO) { sum, bill -> sum + bill.expectedPayableAmount() },
                            nextDueDate = data.bills.nextDueDateLabel(),
                            pendingCount = pending.size,
                            paidThisMonth = paidThisMonthAmount(paid)
                        )
                    }
                    item { ResidentMaintenanceTrendCard(data.bills) }
                    item {
                        Text("Current Bills", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    }
                    if (data.bills.isEmpty()) {
                        item { ResidentMaintenanceEmptyCard() }
                    } else {
                        items(data.bills, key = { it.id ?: "${it.month}-${it.year}" }) { bill ->
                            ResidentMaintenanceBillCard(
                                bill = bill,
                                onPay = { bill.id?.let(onPayBill) },
                                onDownloadReceipt = { saveResidentReceiptPdf(context, bill) },
                                onViewStatus = onPaymentHistory
                            )
                        }
                    }
                    item { ResidentMaintenanceEmptyCard() }
                    item {
                        ResidentUpiCard(paymentSettings = data.paymentSettings)
                    }
                    item {
                        Button(
                            onClick = { firstPayable?.id?.let(onPayBill) },
                            enabled = firstPayable?.id != null,
                            modifier = Modifier.fillMaxWidth().height(54.dp),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Filled.OpenInNew, contentDescription = null)
                            Spacer(Modifier.width(10.dp))
                            Text("Continue to Payment")
                        }
                    }
                    item {
                        OutlinedButton(
                            onClick = onPaymentHistory,
                            modifier = Modifier.fillMaxWidth().height(54.dp),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Filled.Download, contentDescription = null)
                            Spacer(Modifier.width(10.dp))
                            Text("View Payment History")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ResidentMaintenanceTopBar(onBack: () -> Unit, onPaymentHistory: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 8.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = Color(0xFF0B56D9))
        }
        Text(
            "Maintenance",
            modifier = Modifier.weight(1f).padding(start = 8.dp),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF101828)
        )
        IconButton(onClick = onPaymentHistory) {
            Icon(Icons.Filled.Download, contentDescription = null, tint = Color(0xFF0B56D9))
        }
    }
}

@Composable
private fun ResidentMaintenanceOverviewCard(
    totalOutstanding: BigDecimal,
    nextDueDate: String,
    pendingCount: Int,
    paidThisMonth: BigDecimal
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("Maintenance Overview", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                ResidentMetricItem(
                    label = "Total Outstanding",
                    value = DashboardFormatters.money(totalOutstanding),
                    tint = Color(0xFFE31B23),
                    bg = Color(0xFFFFE4E6),
                    modifier = Modifier.weight(1f)
                )
                ResidentMetricItem(
                    label = "Next Due Date",
                    value = nextDueDate,
                    tint = Color(0xFF0B56D9),
                    bg = Color(0xFFE8F0FF),
                    modifier = Modifier.weight(1f)
                )
                ResidentMetricItem(
                    label = "Pending Bills Count",
                    value = pendingCount.toString(),
                    tint = Color(0xFF6D28D9),
                    bg = Color(0xFFF0E7FF),
                    modifier = Modifier.weight(1f)
                )
                ResidentMetricItem(
                    label = "Paid This Month",
                    value = DashboardFormatters.money(paidThisMonth),
                    tint = Color(0xFF087A2E),
                    bg = Color(0xFFE0F7E8),
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun ResidentMaintenanceTrendCard(bills: List<MaintenanceBillDto>) {
    val points = remember(bills) {
        bills
            .sortedWith(compareBy<MaintenanceBillDto>({ it.year?.toIntOrNull() ?: 0 }, { maintenanceMonthIndex(it.month) }))
            .takeLast(6)
            .map { bill ->
                val label = bill.month?.take(3)?.replaceFirstChar { it.uppercase() } ?: "-"
                label to bill.expectedPayableAmount().toFloat()
            }
    }
    if (points.isEmpty()) return

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Monthly maintenance trend", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text("Compare your last ${points.size} bill${if (points.size == 1) "" else "s"} at a glance", color = Color(0xFF667085), style = MaterialTheme.typography.bodySmall)
            val maximum = max(points.maxOfOrNull { it.second } ?: 0f, 1f)
            Canvas(modifier = Modifier.fillMaxWidth().height(150.dp).padding(top = 12.dp)) {
                val left = 8.dp.toPx()
                val right = size.width - 8.dp.toPx()
                val top = 8.dp.toPx()
                val bottom = size.height - 12.dp.toPx()
                val graphHeight = bottom - top
                val step = if (points.size > 1) (right - left) / (points.size - 1) else 0f
                val path = Path()

                repeat(3) { index ->
                    val y = top + graphHeight * index / 2f
                    drawLine(Color(0xFFE4E7EC), start = androidx.compose.ui.geometry.Offset(left, y), end = androidx.compose.ui.geometry.Offset(right, y), strokeWidth = 1.dp.toPx())
                }
                points.forEachIndexed { index, point ->
                    val x = if (points.size == 1) size.width / 2f else left + step * index
                    val y = bottom - (point.second / maximum) * graphHeight
                    if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
                }
                drawPath(path, color = Color(0xFF0B56D9), style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round))
                points.forEachIndexed { index, point ->
                    val x = if (points.size == 1) size.width / 2f else left + step * index
                    val y = bottom - (point.second / maximum) * graphHeight
                    drawCircle(Color.White, radius = 6.dp.toPx(), center = androidx.compose.ui.geometry.Offset(x, y))
                    drawCircle(Color(0xFF0B56D9), radius = 4.dp.toPx(), center = androidx.compose.ui.geometry.Offset(x, y))
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                points.forEach { (label, _) ->
                    Text(label, style = MaterialTheme.typography.labelSmall, color = Color(0xFF667085))
                }
            }
            Text(
                "Latest: ${DashboardFormatters.money(points.last().second.toBigDecimal())}",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF0B56D9)
            )
        }
    }
}

private fun maintenanceMonthIndex(month: String?): Int {
    val normalized = month?.trim()?.lowercase().orEmpty()
    if (normalized.isEmpty()) return 0
    return normalized.toIntOrNull()?.coerceIn(1, 12)
        ?: listOf("january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december")
            .indexOfFirst { it.startsWith(normalized.take(3)) }
            .takeIf { it >= 0 }
            ?.plus(1)
        ?: 0
}

@Composable
private fun ResidentMetricItem(
    label: String,
    value: String,
    tint: Color,
    bg: Color,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(7.dp)
    ) {
        Box(
            modifier = Modifier
                .size(50.dp)
                .clip(CircleShape)
                .background(bg),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Filled.Payments, contentDescription = null, tint = tint)
        }
        Text(label, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center, color = Color(0xFF101828))
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, color = tint)
    }
}

@Composable
private fun ResidentMaintenanceBillCard(
    bill: MaintenanceBillDto,
    onPay: () -> Unit,
    onDownloadReceipt: () -> Unit,
    onViewStatus: () -> Unit
) {
    val status = bill.paymentStatus ?: bill.latestPaymentStatus ?: bill.status
    val canPay = status.isResidentPayableStatus()
    val paid = status.isApprovedStatus()
    val settledByWriteOff = status.normalizePaymentStatus() in setOf("WRITTEN_OFF", "SETTLED")
    val finished = paid || settledByWriteOff
    val verifying = status.isVerificationPendingStatus()
    val overdue = isBillOverdue(bill) && canPay
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(62.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFEAF2FF)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.Payments, contentDescription = null, tint = Color(0xFF0B56D9), modifier = Modifier.size(30.dp))
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(bill.displayTitle(), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color(0xFF101828))
                Text("Due ${DashboardFormatters.date(bill.dueDate ?: bill.maintenanceDueDate)}", color = Color(0xFF667085))
                if (overdue) Text("Overdue", color = Color(0xFFE31B23), fontWeight = FontWeight.SemiBold)
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(DashboardFormatters.money((bill.remainingDue ?: bill.currentDue ?: bill.remainingAmount ?: bill.totalAmount ?: bill.amount).toMoneyDecimal()), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                ResidentStatusBadge(
                    text = when {
                        settledByWriteOff -> "Settled"
                        paid -> "Paid"
                        verifying -> "Verification Pending"
                        else -> "Pending"
                    },
                    fg = when {
                        finished -> Color(0xFF087A2E)
                        verifying -> Color(0xFF174EA6)
                        else -> Color(0xFFE86D00)
                    },
                    bg = when {
                        finished -> Color(0xFFDDF8E7)
                        verifying -> Color(0xFFE6F0FF)
                        else -> Color(0xFFFFE8C7)
                    }
                )
                when {
                    canPay -> Button(onClick = onPay, shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Filled.Payments, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Pay Now")
                    }
                    paid -> OutlinedButton(onClick = onDownloadReceipt, shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Filled.Download, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Download receipt")
                    }
                    verifying -> OutlinedButton(onClick = onViewStatus, shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Filled.OpenInNew, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Status")
                    }
                }
            }
        }
    }
}

@Composable
private fun ResidentStatusBadge(text: String, fg: Color, bg: Color) {
    Text(
        text,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(bg)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        color = fg,
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.SemiBold
    )
}

@Composable
private fun ResidentMaintenanceEmptyCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Row(
            modifier = Modifier.padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(76.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFEAF2FF)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.Download, contentDescription = null, tint = Color(0xFF0B56D9), modifier = Modifier.size(34.dp))
            }
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("No maintenance dues found.", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("You're all caught up! Thank you.", color = Color(0xFF667085))
            }
        }
    }
}

@Composable
private fun ResidentUpiCard(paymentSettings: PaymentSettingsDto?) {
    val context = LocalContext.current
    val upiId = paymentSettings?.paymentUpiId?.ifBlank { null } ?: "8999823244@upi"
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Pay Using UPI", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Society UPI ID", color = Color(0xFF101828))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(upiId, color = Color(0xFF0B56D9), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        IconButton(onClick = { copyText(context, "UPI ID", upiId) }) {
                            Icon(Icons.Filled.ContentCopy, contentDescription = "Copy UPI ID", tint = Color(0xFF0B56D9))
                        }
                    }
                    Text("Secure. Fast. Easy.\nPay directly using any UPI app.", color = Color(0xFF667085), style = MaterialTheme.typography.bodySmall)
                }
                Box(
                    modifier = Modifier
                        .size(116.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .border(1.dp, Color(0xFFE4E7EC), RoundedCornerShape(12.dp))
                        .background(Color.White)
                        .padding(8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    val qrImage = paymentSettings?.paymentQrImage?.ifBlank { null }
                    if (qrImage != null) {
                        AsyncImage(
                            model = fullMediaUrl(qrImage),
                            contentDescription = "Society payment QR code",
                            modifier = Modifier.fillMaxSize(),
                            error = painterResource(R.drawable.my_payment_qr),
                            placeholder = painterResource(R.drawable.my_payment_qr),
                            contentScale = ContentScale.Fit
                        )
                    } else {
                        Image(
                            painter = painterResource(R.drawable.my_payment_qr),
                            contentDescription = "Society payment QR code",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Fit
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ResidentMaintenanceBottomBar(
    onHome: () -> Unit,
    onNotices: () -> Unit,
    onPayments: () -> Unit,
    onProfile: () -> Unit
) {
    AppBottomNavigation(
        role = AppRoleTheme.Resident,
        selected = "Payments",
        items = listOf("Home", "Notices", "Payments", "Profile")
    ) { item ->
        when (item) {
            "Home" -> onHome()
            "Notices" -> onNotices()
            "Payments" -> onPayments()
            "Profile" -> onProfile()
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.billsTab(
    bills: List<MaintenanceBillDto>,
    query: String,
    filter: String,
    viewModel: AdminMaintenanceViewModel,
    openDialog: (MaintenanceDialog) -> Unit
) {
    item {
        SearchAndFilter(query, viewModel::setQuery, filter, viewModel::setFilter)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Button(
                onClick = { openDialog(MaintenanceDialog.Generate) },
                modifier = Modifier
                    .weight(1f)
                    .height(54.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0B56D9))
            ) {
                Icon(Icons.Filled.ReceiptLong, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Generate Monthly Bills")
            }
            Button(
                onClick = { openDialog(MaintenanceDialog.ManualBill) },
                modifier = Modifier
                    .weight(1f)
                    .height(54.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0B56D9))
            ) {
                Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Create Manual Bill")
            }
        }
        Text(
            "Bills",
            modifier = Modifier.padding(top = 18.dp),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF101828)
        )
    }
    if (bills.isEmpty()) item { EmptyState("No bills found", "Generate bills or change filters.") }
    else items(bills, key = { it.id ?: "${it.month}-${it.year}" }) { bill ->
        BillCard(
            bill = bill,
            admin = true,
            onPay = { openDialog(MaintenanceDialog.MarkPaid(bill)) },
            onDispute = {},
            onReminder = { bill.id?.let(viewModel::sendReminder) },
            onWaive = { openDialog(MaintenanceDialog.ApplyWaiver(bill)) },
            onWriteOff = { openDialog(MaintenanceDialog.WriteOff(bill)) },
            onDelete = { openDialog(MaintenanceDialog.CancelBill(bill)) }
        )
    }
}

@Composable
private fun AdminMaintenanceHomeSummary(
    data: com.example.application.data.repository.AdminMaintenanceData,
    selectedMonth: Int,
    selectedYear: Int,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit,
    onGenerateBills: () -> Unit,
    onRecordPayment: () -> Unit,
    onVerifyPayments: () -> Unit,
    onDefaulters: () -> Unit,
    onWriteOff: () -> Unit,
    onReports: () -> Unit
) {
    val bills = data.bills
    val payments = data.payments
    val totalBilled = bills.fold(BigDecimal.ZERO) { sum, bill -> sum + (bill.totalAmount ?: bill.amount).toMoneyDecimal() }
    val totalCollected = data.dashboard?.summary?.collected.toMoneyDecimal().takeIf { it > BigDecimal.ZERO }
        ?: payments.filter { it.paymentStatus.isApprovedStatus() }.fold(BigDecimal.ZERO) { sum, payment -> sum + payment.amount.toMoneyDecimal() }
    val pendingAmount = bills.filter { !(it.paymentStatus ?: it.status).isSettledBillStatus() }.fold(BigDecimal.ZERO) { sum, bill -> sum + bill.expectedPayableAmount() }
    val overdueAmount = data.dashboard?.summary?.overdue.toMoneyDecimal().takeIf { it > BigDecimal.ZERO }
        ?: bills.filter { it.isOverdueBill() }.fold(BigDecimal.ZERO) { sum, bill -> sum + bill.expectedPayableAmount() }
    val verificationPending = payments.count { it.paymentStatus.isVerificationPendingStatus() }
    val writtenOffAmount = data.waivers.fold(BigDecimal.ZERO) { sum, waiver -> sum + waiver.waiverAmount.toMoneyDecimal() }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("Billing Period", "Use this month/year before generating or reviewing bills") {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                OutlinedButton(onClick = onPreviousMonth) { Text("Previous") }
                Text("${monthName(selectedMonth)} $selectedYear", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                OutlinedButton(onClick = onNextMonth) { Text("Next") }
            }
        }
        MetricGrid(
            listOf(
                Triple("Total Billed", DashboardFormatters.money(totalBilled), "${bills.size} bills"),
                Triple("Collected", DashboardFormatters.money(totalCollected), "approved payments"),
                Triple("Pending", DashboardFormatters.money(pendingAmount), "outstanding"),
                Triple("Overdue", DashboardFormatters.money(overdueAmount), "needs follow-up"),
                Triple("Verification", verificationPending.toString(), "payment proofs"),
                Triple("Written Off", DashboardFormatters.money(writtenOffAmount), "not collected income")
            )
        )
        SectionCard("Quick Actions", "Common admin maintenance tasks") {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                MaintenanceQuickAction("Generate Bills", Icons.Filled.ReceiptLong, onGenerateBills)
                MaintenanceQuickAction("Record Payment", Icons.Filled.Payments, onRecordPayment)
                MaintenanceQuickAction("Open Payment Verification", Icons.Filled.CheckCircle, onVerifyPayments)
                MaintenanceQuickAction("View Defaulters", Icons.Filled.Warning, onDefaulters)
                MaintenanceQuickAction("Write Off", Icons.Filled.Delete, onWriteOff)
                MaintenanceQuickAction("Reports", Icons.Filled.Download, onReports)
            }
        }
    }
}

@Composable
private fun MaintenanceQuickAction(label: String, icon: ImageVector, onClick: () -> Unit) {
    OutlinedButton(onClick = onClick, modifier = Modifier.height(52.dp), shape = RoundedCornerShape(14.dp)) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(label)
    }
}

@Composable
private fun AdminMaintenanceOverviewSection(
    data: com.example.application.data.repository.AdminMaintenanceData,
    viewModel: AdminMaintenanceViewModel
) {
    val summary = data.adminSummary
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("Overview", "Live totals from backend maintenance and payment records") {
            MetricGrid(
                listOf(
                    Triple("Generated", DashboardFormatters.money(summary?.totalGenerated.toMoneyDecimal()), "all bills"),
                    Triple("Collected", DashboardFormatters.money(summary?.totalCollected.toMoneyDecimal()), "${summary?.collectionPercentage ?: 0}% collection"),
                    Triple("Outstanding", DashboardFormatters.money(summary?.totalOutstanding.toMoneyDecimal()), "${summary?.pendingBills ?: 0} pending"),
                    Triple("Overdue", (summary?.overdueBills ?: 0).toString(), "residents to follow up"),
                    Triple("Verification", (summary?.verificationPending ?: 0).toString(), "pending reviews"),
                    Triple("Waived", DashboardFormatters.money(summary?.totalWaivedAmount.toMoneyDecimal()), "approved waivers"),
                    Triple("Penalty", DashboardFormatters.money(summary?.totalPenaltyCollected.toMoneyDecimal()), "late fees"),
                    Triple("This Month", DashboardFormatters.money(summary?.currentMonthCollection.toMoneyDecimal()), "collection")
                )
            )
        }
        SectionCard("Pending Payment Verifications") {
            val pending = data.payments.filter { it.paymentStatus.normalizePaymentStatus() == "PENDING_VERIFICATION" }.take(3)
            if (pending.isEmpty()) Text("No pending payment submissions.")
            pending.forEach { payment ->
                KeyValue("${payment.residentName ?: "Resident"} • Flat ${payment.flatNo ?: "-"}", DashboardFormatters.money(payment.amount.toMoneyDecimal()))
            }
        }
        SectionCard("Top Outstanding Flats") {
            val outstanding = summary?.topOutstandingFlats.orEmpty().take(5).ifEmpty {
                data.bills.filter { !(it.paymentStatus ?: it.status).isApprovedStatus() }
                    .sortedByDescending { it.expectedPayableAmount() }
                    .take(5)
            }
            if (outstanding.isEmpty()) Text("No outstanding dues.")
            outstanding.forEach { bill ->
                KeyValue("Flat ${bill.flatNo ?: "-"} • ${bill.residentName ?: "Resident"}", DashboardFormatters.money(bill.expectedPayableAmount()))
            }
        }
        SectionCard("Quick Actions") {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(onClick = { viewModel.applyPenalty() }, modifier = Modifier.weight(1f)) { Text("Recalculate Penalties") }
                OutlinedButton(onClick = { viewModel.load(refresh = true) }, modifier = Modifier.weight(1f)) { Text("Refresh") }
            }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.paymentsTab(payments: List<MaintenancePaymentDto>, viewModel: AdminMaintenanceViewModel, openDialog: (MaintenanceDialog) -> Unit) {
    if (payments.isEmpty()) item { EmptyState("No payment submissions", "Resident payments will appear here.") }
    else items(payments, key = { it.id ?: it.transactionId.orEmpty() }) { payment ->
        ManagementCard {
            Text(payment.residentName ?: "Resident", fontWeight = FontWeight.Bold)
            Text("Flat ${payment.flatNo ?: "-"} â€¢ ${DashboardFormatters.money(payment.amount.toMoneyDecimal())}")
            Text("Method: ${payment.paymentMethod ?: "-"} â€¢ Txn: ${payment.transactionId ?: "-"}")
            Text("Status: ${payment.paymentStatus ?: "-"}")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = { payment.id?.let { viewModel.updatePayment(it, "Paid") } }) { Text("Approve") }
                TextButton(onClick = { payment.id?.let { viewModel.updatePayment(it, "Rejected") } }) { Text("Reject") }
            }
        }
    }
}

@Composable
private fun PaymentVerificationSection(
    payments: List<MaintenancePaymentDto>,
    query: String,
    filter: String,
    viewModel: AdminMaintenanceViewModel
) {
    val context = LocalContext.current
    var screenshotPayment by remember { mutableStateOf<MaintenancePaymentDto?>(null) }
    var receiptPayment by remember { mutableStateOf<MaintenancePaymentDto?>(null) }
    var rejectPayment by remember { mutableStateOf<MaintenancePaymentDto?>(null) }
    var clarificationPayment by remember { mutableStateOf<MaintenancePaymentDto?>(null) }
    var bulkReject by remember { mutableStateOf(false) }
    var selectedPaymentIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    val visiblePayments = remember(payments, query, filter) {
        payments.filter { payment ->
            val status = payment.paymentStatus.orEmpty()
            val normalizedStatus = status.normalizePaymentStatus()
            val filterOk = filter == "All" ||
                status.equals(filter, true) ||
                (filter == "Pending" && normalizedStatus in setOf("PENDING", "PAYMENT_PROOF_SUBMITTED", "UNDER_REVIEW", "PENDING_VERIFICATION", "NEEDS_CLARIFICATION")) ||
                (filter == "Paid" && normalizedStatus in setOf("PAID", "APPROVED")) ||
                (filter == "Rejected" && normalizedStatus == "REJECTED") ||
                filter in setOf("Partial", "Overdue")
            val q = query.trim().lowercase()
            val queryOk = q.isBlank() || listOf(payment.residentName, payment.flatNo, payment.transactionId, payment.month, payment.year)
                .any { it?.lowercase()?.contains(q) == true }
            filterOk && queryOk
        }
    }
    val pendingPayments = visiblePayments.filter { it.id != null && it.paymentStatus.isVerificationPendingStatus() }
    val selectedPending = pendingPayments.filter { it.id in selectedPaymentIds }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("Payment Verification", "Review resident UPI proofs before marking bills paid") {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Pending Review" to "Pending", "Needs Clarification" to "Needs Clarification", "Approved" to "Paid", "Rejected" to "Rejected", "All" to "All").forEach { (label, value) ->
                    FilterChip(selected = filter == value, onClick = { viewModel.setFilter(value) }, label = { Text(label) })
                }
            }
            SearchAndFilter(query, viewModel::setQuery, filter, viewModel::setFilter)
            Text("Tip: filter by Pending, Approved/Paid, Rejected, month, flat or resident name.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (pendingPayments.isNotEmpty()) {
                MaintenanceActions {
                    TextButton(onClick = {
                        selectedPaymentIds = if (selectedPending.size == pendingPayments.size) emptySet() else pendingPayments.mapNotNull { it.id }.toSet()
                    }) { Text(if (selectedPending.size == pendingPayments.size) "Clear Selection" else "Select Pending") }
                    Button(
                        onClick = {
                            selectedPending.forEach { payment -> payment.id?.let { viewModel.updatePayment(it, "Paid") } }
                            selectedPaymentIds = emptySet()
                        },
                        enabled = selectedPending.isNotEmpty()
                    ) { Text("Approve Selected (${selectedPending.size})") }
                    Button(onClick = { bulkReject = true }, enabled = selectedPending.isNotEmpty()) { Text("Reject Selected") }
                    OutlinedButton(onClick = { sharePaymentsCsv(context, visiblePayments) }) { Text("Export CSV") }
                }
            } else {
                OutlinedButton(onClick = { sharePaymentsCsv(context, visiblePayments) }) { Text("Export CSV") }
            }
        }
        if (visiblePayments.isEmpty()) {
            EmptyState("No payment proofs found", "Submitted resident payment screenshots will appear here.")
        } else {
            visiblePayments.forEach { payment ->
                PaymentVerificationCard(
                    payment = payment,
                    selected = payment.id in selectedPaymentIds,
                    onSelectToggle = {
                        payment.id?.let { id ->
                            selectedPaymentIds = if (id in selectedPaymentIds) selectedPaymentIds - id else selectedPaymentIds + id
                        }
                    },
                    onOpenScreenshot = { screenshotPayment = payment },
                    onApprove = { payment.id?.let { viewModel.updatePayment(it, "Paid") } },
                    onReject = { rejectPayment = payment },
                    onClarify = { clarificationPayment = payment },
                    onViewReceipt = { receiptPayment = payment },
                    onDownloadReceipt = { saveReceiptPdf(context, payment) },
                    onShareReceipt = { shareReceiptPdf(context, payment) }
                )
            }
        }
    }

    screenshotPayment?.let { payment ->
        AlertDialog(
            onDismissRequest = { screenshotPayment = null },
            title = { Text("Payment Screenshot") },
            text = {
                AsyncImage(
                    model = fullMediaUrl(payment.proofImage()),
                    contentDescription = "Payment screenshot",
                    modifier = Modifier.fillMaxWidth().height(520.dp).clip(RoundedCornerShape(14.dp)),
                    contentScale = ContentScale.Fit
                )
            },
            confirmButton = { TextButton(onClick = { screenshotPayment = null }) { Text("Close") } }
        )
    }

    receiptPayment?.let { payment ->
        AlertDialog(
            onDismissRequest = { receiptPayment = null },
            title = { Text("Payment Receipt") },
            text = { ReceiptPreview(payment) },
            confirmButton = {
                TextButton(onClick = { saveReceiptPdf(context, payment) }) { Text("Download PDF") }
            },
            dismissButton = { TextButton(onClick = { receiptPayment = null }) { Text("Close") } }
        )
    }

    rejectPayment?.let { payment ->
        var reason by remember(payment.id) { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { rejectPayment = null },
            title = { Text("Reject Payment") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Enter a clear reason. Resident can resubmit after rejection.")
                    BasicAppTextField(reason, { reason = it }, "Rejection reason")
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        payment.id?.let { viewModel.updatePayment(it, "Rejected", reason.ifBlank { "Payment proof rejected by admin" }) }
                        rejectPayment = null
                    },
                    enabled = reason.isNotBlank()
                ) { Text("Reject") }
            },
            dismissButton = { TextButton(onClick = { rejectPayment = null }) { Text("Cancel") } }
        )
    }

    clarificationPayment?.let { payment ->
        var note by remember(payment.id) { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { clarificationPayment = null },
            title = { Text("Ask for Clarification") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Use this when the proof may be valid but more information is needed.")
                    BasicAppTextField(note, { note = it }, "Clarification note")
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        payment.id?.let { viewModel.updatePayment(it, "Needs Clarification", note.ifBlank { "Please provide clearer payment details." }) }
                        clarificationPayment = null
                    },
                    enabled = note.isNotBlank()
                ) { Text("Send") }
            },
            dismissButton = { TextButton(onClick = { clarificationPayment = null }) { Text("Cancel") } }
        )
    }

    if (bulkReject) {
        var reason by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { bulkReject = false },
            title = { Text("Reject Selected Payments") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("${selectedPending.size} selected payment proofs will be rejected.")
                    BasicAppTextField(reason, { reason = it }, "Rejection reason")
                }
            },
            confirmButton = {
                Button(onClick = {
                    selectedPending.forEach { payment ->
                        payment.id?.let { viewModel.updatePayment(it, "Rejected", reason.ifBlank { "Payment proof rejected by admin" }) }
                    }
                    selectedPaymentIds = emptySet()
                    bulkReject = false
                }, enabled = reason.isNotBlank()) { Text("Reject Selected") }
            },
            dismissButton = { TextButton(onClick = { bulkReject = false }) { Text("Cancel") } }
        )
    }
}

@Composable
private fun PaymentVerificationCard(
    payment: MaintenancePaymentDto,
    selected: Boolean,
    onSelectToggle: () -> Unit,
    onOpenScreenshot: () -> Unit,
    onApprove: () -> Unit,
    onReject: () -> Unit,
    onClarify: () -> Unit,
    onViewReceipt: () -> Unit,
    onDownloadReceipt: () -> Unit,
    onShareReceipt: () -> Unit
) {
    val status = friendlyPaymentStatus(payment.paymentStatus)
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            if (payment.paymentStatus.isVerificationPendingStatus()) {
                FilterChip(selected = selected, onClick = onSelectToggle, label = { Text(if (selected) "Selected" else "Select for bulk action") })
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                AsyncImage(
                    model = fullMediaUrl(payment.proofImage()),
                    contentDescription = "Payment screenshot thumbnail",
                    modifier = Modifier.height(92.dp).weight(0.36f).clip(RoundedCornerShape(14.dp)).clickable { onOpenScreenshot() },
                    contentScale = ContentScale.Crop
                )
                Column(modifier = Modifier.weight(0.64f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(payment.residentName ?: "Resident", fontWeight = FontWeight.Bold)
                    Text("Flat ${payment.flatNo ?: "-"} • ${payment.month ?: "-"}/${payment.year ?: "-"}")
                    Text(DashboardFormatters.money(payment.amount.toMoneyDecimal()), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Status: $status", color = MaterialTheme.colorScheme.primary)
                }
            }
            KeyValue("Submitted", DashboardFormatters.date(payment.createdAt ?: payment.paidAt))
            KeyValue("Transaction Ref", payment.transactionId ?: "-")
            KeyValue("Payment method", payment.paymentMethod ?: "-")
            payment.residentNote?.takeIf { it.isNotBlank() }?.let { KeyValue("Resident note", it) }
            payment.rejectionReason?.takeIf { it.isNotBlank() }?.let { KeyValue("Reject reason", it) }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = onOpenScreenshot) { Text("Open Screenshot") }
                if ((payment.paymentStatus).isVerificationPendingStatus()) Button(onClick = onApprove) { Text("Approve") }
                if ((payment.paymentStatus).isVerificationPendingStatus()) TextButton(onClick = onReject) { Text("Reject") }
                if ((payment.paymentStatus).isVerificationPendingStatus()) TextButton(onClick = onClarify) { Text("Ask Clarification") }
                if ((payment.paymentStatus).isApprovedStatus()) TextButton(onClick = onViewReceipt) { Text("View Receipt") }
                if ((payment.paymentStatus).isApprovedStatus()) TextButton(onClick = onDownloadReceipt) { Text("Download PDF") }
                if ((payment.paymentStatus).isApprovedStatus()) TextButton(onClick = onShareReceipt) { Text("Share") }
            }
        }
    }
}

@Composable
private fun ReceiptPreview(payment: MaintenancePaymentDto) {
    Column(modifier = Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Society Management System", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        KeyValue("Receipt No.", payment.receiptNumber ?: "Generated after approval")
        KeyValue("Payment ID", payment.id ?: "-")
        KeyValue("Resident", payment.residentName ?: "-")
        KeyValue("Flat", payment.flatNo ?: "-")
        KeyValue("Maintenance", payment.title ?: "Maintenance")
        KeyValue("Billing", "${payment.month ?: "-"}/${payment.year ?: "-"}")
        KeyValue("Base amount", DashboardFormatters.money(payment.baseAmount.toMoneyDecimal()))
        KeyValue("Late fee", DashboardFormatters.money(payment.penaltyAmount.toMoneyDecimal()))
        KeyValue("Total paid", DashboardFormatters.money(payment.amount.toMoneyDecimal()))
        KeyValue("Payment date", DashboardFormatters.date(payment.paidAt))
        KeyValue("Transaction ref", payment.transactionId ?: "-")
        KeyValue("Approval date", DashboardFormatters.date(payment.verifiedAt))
        KeyValue("Method", payment.paymentMethod ?: "-")
        KeyValue("Status", friendlyPaymentStatus(payment.paymentStatus))
        Text("This is a digitally generated receipt and does not require a signature.", style = MaterialTheme.typography.bodySmall)
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.expensesTab(expenses: List<ExpenseDto>, viewModel: AdminMaintenanceViewModel, openDialog: (MaintenanceDialog) -> Unit) {
    item { Button(onClick = { openDialog(MaintenanceDialog.Expense) }, modifier = Modifier.fillMaxWidth()) { Text("Record Expense") } }
    if (expenses.isEmpty()) item { EmptyState("No expenses", "Record society maintenance expenses here.") }
    else items(expenses, key = { it.id ?: it.expenseNumber.orEmpty() }) { expense ->
        ManagementCard {
            Text(expense.expenseNumber ?: "Expense", fontWeight = FontWeight.Bold)
            Text("${expense.category ?: "-"} â€¢ ${expense.vendor ?: "-"}")
            Text("${DashboardFormatters.money(expense.amount.toMoneyDecimal())} â€¢ ${DashboardFormatters.date(expense.expenseDate)}")
            TextButton(onClick = { expense.id?.let(viewModel::deleteExpense) }) { Text("Delete") }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.settingsTab(settings: com.example.application.data.remote.dto.MaintenanceSettingsDto?, viewModel: AdminMaintenanceViewModel, openDialog: (MaintenanceDialog) -> Unit) {
    item {
        SectionCard("Maintenance Settings") {
            KeyValue("Title", settings?.title ?: "Not configured")
            KeyValue("Fixed Amount", DashboardFormatters.money(settings?.fixedAmount.toMoneyDecimal()))
            KeyValue("Due Day", settings?.dueDay ?: "-")
            KeyValue("Late Fee", "${settings?.lateFeeValue ?: "0"} (${settings?.lateFeeType ?: "fixed"})")
            Button(onClick = { openDialog(MaintenanceDialog.Settings) }, modifier = Modifier.fillMaxWidth()) { Text("Edit Settings") }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.categoriesTab(categories: List<MaintenanceCategoryDto>, viewModel: AdminMaintenanceViewModel, openDialog: (MaintenanceDialog) -> Unit) {
    item { Button(onClick = { openDialog(MaintenanceDialog.Category(null)) }, modifier = Modifier.fillMaxWidth()) { Text("Add Category") } }
    if (categories.isEmpty()) item { EmptyState("No categories", "Add category items if needed.") }
    else items(categories, key = { it.id ?: it.name.orEmpty() }) { category ->
        ManagementCard {
            Text(category.name ?: "Category", fontWeight = FontWeight.Bold)
            Text("${DashboardFormatters.money(category.amount.toMoneyDecimal())} â€¢ ${category.calculationType ?: "FIXED"} â€¢ ${if (category.active == false) "Inactive" else "Active"}")
            Row {
                TextButton(onClick = { openDialog(MaintenanceDialog.Category(category)) }) { Text("Edit") }
                TextButton(onClick = { category.id?.let(viewModel::deleteCategory) }) { Text("Delete") }
            }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.lateFeeTab(rule: com.example.application.data.remote.dto.LateFeeRuleDto?, viewModel: AdminMaintenanceViewModel, openDialog: (MaintenanceDialog) -> Unit) {
    item {
        SectionCard("Late Fee Rule") {
            KeyValue("Grace period", rule?.gracePeriod ?: "-")
            KeyValue("Penalty type", rule?.penaltyType ?: "-")
            KeyValue("Penalty amount", DashboardFormatters.money(rule?.penaltyAmount.toMoneyDecimal()))
            KeyValue("Maximum late fee", DashboardFormatters.money(rule?.maximumLateFee.toMoneyDecimal()))
            Button(onClick = { openDialog(MaintenanceDialog.LateFee) }, modifier = Modifier.fillMaxWidth()) { Text("Edit Late Fee Rule") }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.disputesTab(disputes: List<com.example.application.data.remote.dto.MaintenanceDisputeDto>) {
    if (disputes.isEmpty()) item { EmptyState("No disputes", "Resident disputes will appear here.") }
    else items(disputes, key = { it.id ?: it.subject.orEmpty() }) { dispute ->
        ManagementCard {
            Text(dispute.subject ?: "Dispute", fontWeight = FontWeight.Bold)
            Text("${dispute.residentName ?: "Resident"} â€¢ Flat ${dispute.flatNo ?: "-"}")
            Text(dispute.description ?: "-")
            Text("Status: ${dispute.status ?: "open"}")
        }
    }
}

@Composable
private fun BillCard(
    bill: MaintenanceBillDto,
    admin: Boolean,
    onPay: () -> Unit,
    onDispute: () -> Unit,
    onReminder: () -> Unit = {},
    onWaive: () -> Unit = {},
    onWriteOff: () -> Unit = {},
    onDelete: () -> Unit = {}
) {
    val context = LocalContext.current
    val status = bill.paymentStatus ?: bill.status ?: "Pending"
    val canSubmitPayment = !admin && status.isResidentPayableStatus()
    val isVerificationPending = !admin && status.isVerificationPendingStatus()
    val paid = status.isApprovedStatus()
    val settledByWriteOff = status.normalizePaymentStatus() in setOf("WRITTEN_OFF", "SETTLED")
    val finished = paid || settledByWriteOff
    val verifying = status.isVerificationPendingStatus()
    val statusColors = when {
        status.normalizePaymentStatus() in setOf("WRITTEN_OFF", "SETTLED") && admin -> Triple("Written Off", Color(0xFF475467), Color(0xFFE5E7EB))
        status.normalizePaymentStatus() == "PARTIAL_WRITE_OFF" && admin -> Triple("Partial Write-off", Color(0xFF0B56D9), Color(0xFFE6F0FF))
        status.normalizePaymentStatus() in setOf("WRITTEN_OFF", "SETTLED") && !admin -> Triple("Settled", Color(0xFF087A2E), Color(0xFFDDF8E7))
        paid -> Triple("Paid", Color(0xFF087A2E), Color(0xFFDDF8E7))
        verifying -> Triple("Under Review", Color(0xFF174EA6), Color(0xFFE6F0FF))
        status.equals("Overdue", true) || isBillOverdue(bill) -> Triple("Overdue", Color(0xFFE31B23), Color(0xFFFFE4E6))
        else -> Triple(status.ifBlank { "Pending" }, Color(0xFFE86D00), Color(0xFFFFE8C7))
    }
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(
                        bill.title ?: "Maintenance Bill",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF101828)
                    )
                    Text(
                        "${bill.residentName ?: "My Bill"} • Flat ${bill.flatNo ?: "-"}",
                        color = Color(0xFF475467),
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        "Month ${bill.month ?: "-"} / ${bill.year ?: "-"} • Due ${DashboardFormatters.date(bill.dueDate ?: bill.maintenanceDueDate)}",
                        color = Color(0xFF667085),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                AdminStatusPill(statusColors.first, statusColors.second, statusColors.third)
            }

            Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                AdminAmountRow("Base amount", DashboardFormatters.money(bill.amount.toMoneyDecimal()))
                AdminAmountRow("Late fee", DashboardFormatters.money((bill.lateFee ?: bill.penaltyAmount).toMoneyDecimal()))
                AdminAmountRow("Total", DashboardFormatters.money(bill.totalAmount.toMoneyDecimal()), strong = true)
                AdminAmountRow("Paid", DashboardFormatters.money(bill.paidAmount.toMoneyDecimal()), valueColor = if (finished) Color(0xFF087A2E) else Color(0xFF101828))
                if (admin && bill.writeOffAmount.toMoneyDecimal() > BigDecimal.ZERO) {
                    AdminAmountRow("Write-off", DashboardFormatters.money(bill.writeOffAmount.toMoneyDecimal()), valueColor = Color(0xFF0B56D9))
                }
                AdminAmountRow(
                    "Remaining",
                    DashboardFormatters.money((bill.remainingDue ?: bill.currentDue ?: bill.remainingAmount ?: bill.totalAmount).toMoneyDecimal()),
                    strong = true,
                    valueColor = if (finished) Color(0xFF087A2E) else Color(0xFFE31B23)
                )
            }

            if (isVerificationPending) {
                AdminInlineMessage(
                    "Payment proof is waiting for admin verification.",
                    Color(0xFF174EA6),
                    Color(0xFFE6F0FF)
                )
            }

            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (admin && !finished) {
                    OutlinedButton(onClick = onPay, shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Filled.CheckCircle, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Mark Paid")
                    }
                    OutlinedButton(onClick = onReminder, shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Filled.Notifications, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Reminder")
                    }
                    OutlinedButton(onClick = onWaive, shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Filled.Payments, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Waive Late Fee")
                    }
                    OutlinedButton(onClick = onWriteOff, shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Filled.Wallet, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Write-off")
                    }
                }
                if (canSubmitPayment) Button(onClick = onPay, shape = RoundedCornerShape(10.dp)) {
                    Icon(Icons.Filled.Payments, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Pay Now")
                }
                if (!admin && !paid && !isVerificationPending) TextButton(onClick = onDispute) { Text("Dispute") }
                if (admin && finished) {
                    OutlinedButton(onClick = { saveAdminBillReceiptPdf(context, bill) }, shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Filled.Download, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Receipt")
                    }
                }
                if (admin) {
                    OutlinedButton(onClick = onDelete, shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Filled.Delete, contentDescription = "Delete", tint = Color(0xFFE31B23), modifier = Modifier.size(18.dp))
                    }
                }
            }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.transactionsTab(payments: List<MaintenancePaymentDto>) {
    if (payments.isEmpty()) item { EmptyState("No transactions", "Approved and submitted payments will appear here.") }
    else items(payments, key = { it.id ?: it.transactionId.orEmpty() }) { payment ->
        ManagementCard {
            Text(payment.receiptNumber ?: payment.transactionId ?: "Transaction", fontWeight = FontWeight.Bold)
            KeyValue("Resident", "${payment.residentName ?: "-"} • Flat ${payment.flatNo ?: "-"}")
            KeyValue("Amount", DashboardFormatters.money(payment.amount.toMoneyDecimal()))
            KeyValue("Method", payment.paymentMethod ?: "-")
            KeyValue("Status", friendlyPaymentStatus(payment.paymentStatus))
            KeyValue("Payment date", DashboardFormatters.date(payment.paidAt ?: payment.createdAt))
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.penaltiesTab(
    bills: List<MaintenanceBillDto>,
    rule: com.example.application.data.remote.dto.LateFeeRuleDto?,
    viewModel: AdminMaintenanceViewModel,
    openDialog: (MaintenanceDialog) -> Unit
) {
    lateFeeTab(rule, viewModel, openDialog)
    item {
        SectionCard("Penalty Actions", "Apply or waive bill-level penalties with audit history") {
            Button(onClick = { viewModel.applyPenalty() }, modifier = Modifier.fillMaxWidth()) { Text("Recalculate All Penalties") }
        }
    }
    val penaltyBills = bills.filter { (it.penaltyAmount ?: it.lateFee).toMoneyDecimal() > BigDecimal.ZERO }
    if (penaltyBills.isEmpty()) item { EmptyState("No penalty bills", "Bills with penalties will appear here.") }
    else items(penaltyBills.take(20), key = { it.id ?: it.flatNo.orEmpty() }) { bill ->
        ManagementCard {
            Text(bill.displayTitle(), fontWeight = FontWeight.Bold)
            KeyValue("Flat", bill.flatNo ?: "-")
            KeyValue("Penalty", DashboardFormatters.money((bill.penaltyAmount ?: bill.lateFee).toMoneyDecimal()))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = { openDialog(MaintenanceDialog.ApplyPenalty(bill)) }) { Text("Add Penalty") }
                TextButton(onClick = { bill.id?.let(viewModel::waiveLateFee) }) { Text("Waive Penalty") }
            }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.defaultersTab(
    bills: List<MaintenanceBillDto>,
    viewModel: AdminMaintenanceViewModel,
    openDialog: (MaintenanceDialog) -> Unit
) {
    val defaulters = bills
        .filter { !(it.paymentStatus ?: it.status).isSettledBillStatus() && (it.isOverdueBill() || it.expectedPayableAmount() > BigDecimal.ZERO) }
        .sortedWith(compareBy<MaintenanceBillDto> { !it.isOverdueBill() }.thenBy { it.dueDate ?: it.maintenanceDueDate ?: "" })
    item {
        SectionCard("Defaulters", "Residents with overdue or unpaid outstanding maintenance") {
            MetricGrid(
                listOf(
                    Triple("Pending", DashboardFormatters.money(defaulters.fold(BigDecimal.ZERO) { sum, bill -> sum + bill.expectedPayableAmount() }), "${defaulters.size} bills"),
                    Triple("Overdue", DashboardFormatters.money(defaulters.filter { it.isOverdueBill() }.fold(BigDecimal.ZERO) { sum, bill -> sum + bill.expectedPayableAmount() }), "${defaulters.count { it.isOverdueBill() }} overdue")
                )
            )
        }
    }
    if (defaulters.isEmpty()) item { EmptyState("No defaulters", "All residents are clear for the selected data.") }
    else items(defaulters, key = { it.id ?: "${it.flatNo}-${it.month}-${it.year}" }) { bill ->
        ManagementCard {
            Text(bill.residentName ?: "Resident", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
            KeyValue("Flat", bill.flatNo ?: "-")
            KeyValue("Billing", "${monthName(bill.month)} ${bill.year.orEmpty()}")
            KeyValue("Outstanding", DashboardFormatters.money(bill.expectedPayableAmount()))
            KeyValue("Due date", DashboardFormatters.date(bill.dueDate ?: bill.maintenanceDueDate))
            KeyValue("Status", friendlyPaymentStatus(bill.paymentStatus ?: bill.status))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = { bill.id?.let(viewModel::sendReminder) }) { Text("Send Reminder") }
                TextButton(onClick = { openDialog(MaintenanceDialog.MarkPaid(bill)) }) { Text("Record Payment") }
                TextButton(onClick = { openDialog(MaintenanceDialog.WriteOff(bill)) }) { Text("Write Off") }
            }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.waiversTab(
    waivers: List<MaintenanceWaiverDto>,
    viewModel: AdminMaintenanceViewModel,
    openDialog: (MaintenanceDialog) -> Unit
) {
    item {
        SectionCard("Write-Offs & Waivers", "Write-offs are adjustments, not collected income") {
            val full = waivers.count { it.waiverType?.contains("total", true) == true || it.waiverType?.contains("full", true) == true }
            val penalty = waivers.count { it.waiverType?.contains("penalty", true) == true || it.reason?.contains("penalty", true) == true }
            MetricGrid(
                listOf(
                    Triple("Written Off", DashboardFormatters.money(waivers.fold(BigDecimal.ZERO) { sum, item -> sum + item.waiverAmount.toMoneyDecimal() }), "${waivers.size} records"),
                    Triple("Full Write-Offs", full.toString(), "full settlements"),
                    Triple("Partial", (waivers.size - full).coerceAtLeast(0).toString(), "partial adjustments"),
                    Triple("Penalty", penalty.toString(), "penalty waivers")
                )
            )
            Button(onClick = { openDialog(MaintenanceDialog.ApplyWaiver(null)) }, modifier = Modifier.fillMaxWidth()) { Text("Apply Waiver / Adjustment") }
        }
    }
    if (waivers.isEmpty()) item { EmptyState("No waivers", "Approved waivers and write-offs will appear here.") }
    else items(waivers, key = { it.id ?: "${it.billId}-${it.createdAt}" }) { waiver ->
        ManagementCard {
            Text(waiver.waiverType ?: "Waiver", fontWeight = FontWeight.Bold)
            KeyValue("Bill", waiver.billNumber ?: waiver.billId ?: "-")
            KeyValue("Resident", "${waiver.residentName ?: "-"} • Flat ${waiver.flatNo ?: "-"}")
            KeyValue("Amount", DashboardFormatters.money(waiver.waiverAmount.toMoneyDecimal()))
            KeyValue("Reason", waiver.reason ?: "-")
            KeyValue("Date", DashboardFormatters.date(waiver.createdAt))
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.reportsTab(data: com.example.application.data.repository.AdminMaintenanceData) {
    item {
        SectionCard("Reports", "Use filters on bill and transaction tabs for drill-down, then export from backend reports when needed") {
            val billed = data.bills.fold(BigDecimal.ZERO) { sum, bill -> sum + (bill.totalAmount ?: bill.amount).toMoneyDecimal() }
            val collected = data.payments.filter { it.paymentStatus.isApprovedStatus() }.fold(BigDecimal.ZERO) { sum, payment -> sum + payment.amount.toMoneyDecimal() }
            val outstanding = data.bills.filter { !(it.paymentStatus ?: it.status).isSettledBillStatus() }.fold(BigDecimal.ZERO) { sum, bill -> sum + bill.expectedPayableAmount() }
            val writtenOff = data.waivers.fold(BigDecimal.ZERO) { sum, waiver -> sum + waiver.waiverAmount.toMoneyDecimal() }
            val penalties = data.bills.fold(BigDecimal.ZERO) { sum, bill -> sum + (bill.penaltyAmount ?: bill.lateFee).toMoneyDecimal() }
            val pendingVerification = data.payments.filter { it.paymentStatus.isVerificationPendingStatus() }.fold(BigDecimal.ZERO) { sum, payment -> sum + payment.amount.toMoneyDecimal() }
            KeyValue("Total billed", DashboardFormatters.money(billed))
            KeyValue("Total collected", DashboardFormatters.money(collected))
            KeyValue("Total outstanding", DashboardFormatters.money(outstanding))
            KeyValue("Total overdue", DashboardFormatters.money(data.bills.filter { it.isOverdueBill() }.fold(BigDecimal.ZERO) { sum, bill -> sum + bill.expectedPayableAmount() }))
            KeyValue("Total written off", DashboardFormatters.money(writtenOff))
            KeyValue("Total penalties", DashboardFormatters.money(penalties))
            KeyValue("Verification pending", DashboardFormatters.money(pendingVerification))
            Text("Written-off amounts are excluded from collected income.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
    item {
        SectionCard("Payment Method Breakdown") {
            val methods = data.adminSummary?.paymentMethodBreakdown.orEmpty()
            if (methods.isEmpty()) Text("No transaction breakdown available.")
            methods.forEach { row ->
                KeyValue("${row.method ?: "Unknown"} (${row.count ?: "0"})", DashboardFormatters.money(row.amount.toMoneyDecimal()))
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SearchAndFilter(query: String, onQuery: (String) -> Unit, filter: String, onFilter: (String) -> Unit) {
    OutlinedTextField(
        query,
        onQuery,
        modifier = Modifier.fillMaxWidth(),
        label = { Text("Search bills") },
        leadingIcon = { Icon(Icons.Filled.FilterList, contentDescription = null, tint = Color(0xFF667085)) },
        singleLine = true,
        shape = RoundedCornerShape(12.dp)
    )
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 10.dp)) {
        listOf("All", "Pending", "Paid", "Partial", "Overdue", "Under Review", "Rejected").forEach {
            FilterChip(selected = filter == it, onClick = { onFilter(it) }, label = { Text(it) })
        }
    }
}

@Composable
private fun ManagementCard(content: @Composable ColumnScope.() -> Unit) {
    Card(modifier = Modifier.fillMaxWidth(), elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp), content = content)
    }
}

private sealed interface MaintenanceDialog {
    data object Generate : MaintenanceDialog
    data object ManualBill : MaintenanceDialog
    data class MarkPaid(val bill: MaintenanceBillDto) : MaintenanceDialog
    data class ApplyPenalty(val bill: MaintenanceBillDto) : MaintenanceDialog
    data class ApplyWaiver(val bill: MaintenanceBillDto?) : MaintenanceDialog
    data class WriteOff(val bill: MaintenanceBillDto) : MaintenanceDialog
    data class CancelBill(val bill: MaintenanceBillDto) : MaintenanceDialog
    data object Settings : MaintenanceDialog
    data object LateFee : MaintenanceDialog
    data class Category(val category: MaintenanceCategoryDto?) : MaintenanceDialog
    data object Expense : MaintenanceDialog
}

private sealed interface ResidentDialog {
    data class Payment(val bill: MaintenanceBillDto) : ResidentDialog
    data class Dispute(val bill: MaintenanceBillDto) : ResidentDialog
}

@Composable
private fun MaintenanceDialogHost(dialog: MaintenanceDialog?, onDismiss: () -> Unit, viewModel: AdminMaintenanceViewModel) {
    val viewState by viewModel.state.collectAsStateWithLifecycle()
    when (dialog) {
        MaintenanceDialog.Generate -> SimpleFormDialog("Generate Bills", onDismiss) {
            val settings = viewState.data?.settings
            var month by remember { mutableStateOf("${LocalDate.now().monthValue}") }
            var year by remember { mutableStateOf("${LocalDate.now().year}") }
            var amount by remember(settings?.fixedAmount) { mutableStateOf(settings?.fixedAmount.orEmpty()) }
            var dueDate by remember(settings?.dueDay, month, year) {
                val day = settings?.dueDay?.toIntOrNull()?.coerceIn(1, 28) ?: 10
                mutableStateOf("${year.padStart(4, '0')}-${month.padStart(2, '0')}-$day".replace("-$day", "-${day.toString().padStart(2, '0')}"))
            }
            var title by remember(settings?.title) { mutableStateOf(settings?.title ?: "Monthly Maintenance") }
            var notes by remember { mutableStateOf("") }
            var penaltyType by remember { mutableStateOf("") }
            var penaltyValue by remember { mutableStateOf("") }
            var penaltyGraceDays by remember { mutableStateOf("") }
            var residentId by remember { mutableStateOf("") }
            var flatId by remember { mutableStateOf("") }
            var wing by remember { mutableStateOf("") }
            var building by remember { mutableStateOf("") }
            var floor by remember { mutableStateOf("") }
            var flatTypeId by remember { mutableStateOf("") }
            if (settings == null || settings.fixedAmount.toMoneyDecimal() <= BigDecimal.ZERO) {
                SectionCard("Maintenance rule required", "Set a fixed maintenance amount before generating monthly bills.") {
                    Text("Backend skips residents when it cannot calculate a valid bill amount. Configure Maintenance Settings first, then generate bills.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Button(onClick = { viewModel.setTab("Settings"); onDismiss() }, modifier = Modifier.fillMaxWidth()) { Text("Open Settings") }
                }
                return@SimpleFormDialog
            }
            SectionCard("Default billing rule") {
                KeyValue("Title", settings.title ?: "Monthly Maintenance")
                KeyValue("Fixed charge", DashboardFormatters.money(settings.fixedAmount.toMoneyDecimal()))
                KeyValue("Due day", settings.dueDay ?: "10")
                KeyValue("Late fee", "${settings.lateFeeValue ?: "0"} (${settings.lateFeeType ?: "fixed"})")
            }
            BasicAppTextField(month, { month = it }, "Month number")
            BasicAppTextField(year, { year = it }, "Year")
            BasicAppTextField(title, { title = it }, "Bill title")
            BasicAppTextField(amount, { amount = it }, "Amount")
            BasicAppTextField(dueDate, { dueDate = it }, "Due date YYYY-MM-DD")
            BasicAppTextField(penaltyType, { penaltyType = it }, "Penalty type optional")
            BasicAppTextField(penaltyValue, { penaltyValue = it }, "Penalty value optional")
            BasicAppTextField(penaltyGraceDays, { penaltyGraceDays = it }, "Penalty grace days optional")
            BasicAppTextField(residentId, { residentId = it }, "Resident ID optional")
            BasicAppTextField(flatId, { flatId = it }, "Flat ID optional")
            BasicAppTextField(wing, { wing = it }, "Wing optional")
            BasicAppTextField(building, { building = it }, "Building optional")
            BasicAppTextField(floor, { floor = it }, "Floor optional")
            BasicAppTextField(flatTypeId, { flatTypeId = it }, "Flat type ID optional")
            BasicAppTextField(notes, { notes = it }, "Notes optional")
            Button(
                onClick = {
                    viewModel.generateBills(
                        month.toIntOrNull() ?: 0,
                        year.toIntOrNull() ?: 0,
                        amount.ifBlank { null }, dueDate, title, notes.ifBlank { null },
                        residentId = residentId.ifBlank { null }, flatId = flatId.ifBlank { null },
                        wing = wing.ifBlank { null }, building = building.ifBlank { null }, floor = floor.ifBlank { null }, flatTypeId = flatTypeId.ifBlank { null },
                        penaltyType = penaltyType.ifBlank { null }, penaltyValue = penaltyValue.ifBlank { null }, penaltyGraceDays = penaltyGraceDays.ifBlank { null }
                    )
                    onDismiss()
                },
                enabled = !viewState.submitting &&
                    month.toIntOrNull()?.let { it in 1..12 } == true &&
                    year.toIntOrNull()?.let { it >= 2000 } == true &&
                    amount.toMoneyDecimal() > BigDecimal.ZERO &&
                    dueDate.matches(Regex("\\d{4}-\\d{2}-\\d{2}")),
                modifier = Modifier.fillMaxWidth()
            ) { Text(if (viewState.submitting) "Generating…" else "Generate") }
        }
        MaintenanceDialog.ManualBill -> SimpleFormDialog("Create Manual Bill", onDismiss) {
            var title by remember { mutableStateOf("Monthly Maintenance") }
            var month by remember { mutableStateOf("${LocalDate.now().monthValue}") }
            var year by remember { mutableStateOf("${LocalDate.now().year}") }
            var due by remember { mutableStateOf(LocalDate.now().plusDays(10).toString()) }
            var amount by remember { mutableStateOf("") }
            var residentId by remember { mutableStateOf("") }
            var flatId by remember { mutableStateOf("") }
            BasicAppTextField(title, { title = it }, "Title")
            BasicAppTextField(month, { month = it }, "Month")
            BasicAppTextField(year, { year = it }, "Year")
            BasicAppTextField(due, { due = it }, "Due date YYYY-MM-DD")
            BasicAppTextField(amount, { amount = it }, "Amount")
            BasicAppTextField(residentId, { residentId = it }, "Resident ID")
            BasicAppTextField(flatId, { flatId = it }, "Flat ID")
            Button(onClick = { viewModel.createManualBill(title, month.toIntOrNull() ?: 0, year.toIntOrNull() ?: 0, due, amount, residentId.ifBlank { null }, flatId.ifBlank { null }); onDismiss() }, modifier = Modifier.fillMaxWidth()) { Text("Create") }
        }
        is MaintenanceDialog.MarkPaid -> SimpleFormDialog("Mark Paid", onDismiss) {
            var amount by remember { mutableStateOf(dialog.bill.expectedPayableAmount().toPlainString()) }
            var paymentDate by remember { mutableStateOf(LocalDate.now().toString()) }
            BasicAppTextField(amount, { amount = it }, "Paid amount")
            BasicAppTextField(paymentDate, { paymentDate = it }, "Payment date YYYY-MM-DD")
            Button(onClick = { dialog.bill.id?.let { viewModel.markPaid(it, amount, paymentDate) }; onDismiss() }, modifier = Modifier.fillMaxWidth()) { Text("Save Payment") }
        }
        is MaintenanceDialog.ApplyPenalty -> SimpleFormDialog("Apply Penalty", onDismiss) {
            var amount by remember { mutableStateOf("") }
            var reason by remember { mutableStateOf("") }
            BasicAppTextField(amount, { amount = it }, "Penalty amount")
            BasicAppTextField(reason, { reason = it }, "Reason")
            Button(
                onClick = {
                    dialog.bill.id?.let { viewModel.applyPenaltyToBill(it, amount, reason.ifBlank { null }) }
                    onDismiss()
                },
                enabled = amount.toMoneyDecimal() > BigDecimal.ZERO,
                modifier = Modifier.fillMaxWidth()
            ) { Text("Apply Penalty") }
        }
        is MaintenanceDialog.ApplyWaiver -> SimpleFormDialog("Apply Waiver", onDismiss) {
            var billId by remember { mutableStateOf(dialog.bill?.id.orEmpty()) }
            var amount by remember { mutableStateOf("") }
            var reason by remember { mutableStateOf("") }
            var type by remember { mutableStateOf("Partial waiver") }
            var reference by remember { mutableStateOf("") }
            BasicAppTextField(billId, { billId = it }, "Bill ID")
            BasicAppTextField(amount, { amount = it }, "Waiver amount")
            BasicAppTextField(type, { type = it }, "Waiver type")
            BasicAppTextField(reason, { reason = it }, "Mandatory reason")
            BasicAppTextField(reference, { reference = it }, "Approval reference")
            Button(
                onClick = {
                    viewModel.applyWaiver(billId, amount, reason, type, reference.ifBlank { null }, LocalDate.now().toString(), null)
                    onDismiss()
                },
                enabled = billId.isNotBlank() && reason.isNotBlank() && amount.toMoneyDecimal() > BigDecimal.ZERO,
                modifier = Modifier.fillMaxWidth()
            ) { Text("Apply Waiver") }
        }
        is MaintenanceDialog.WriteOff -> SimpleFormDialog("Maintenance Write-off", onDismiss) {
            val bill = dialog.bill
            val reasons = listOf("Billing Error", "Society Decision", "Financial Assistance", "Management Approval", "Other")
            val currentDue = (bill.remainingDue ?: bill.currentDue ?: bill.remainingAmount ?: bill.totalAmount).toMoneyDecimal()
            val originalAmount = (bill.originalAmount ?: bill.amount).toMoneyDecimal()
            var type by remember { mutableStateOf("PARTIAL") }
            var amount by remember { mutableStateOf("") }
            var reason by remember { mutableStateOf(reasons.first()) }
            var remarks by remember { mutableStateOf("") }
            val writeOffAmount = if (type == "TOTAL") currentDue else amount.toMoneyDecimal()
            val finalDue = (currentDue - writeOffAmount).coerceAtLeast(BigDecimal.ZERO)

            Text("This keeps the bill record and creates an admin audit entry.", color = Color(0xFF475467))
            KeyValue("Resident", bill.residentName ?: "-")
            KeyValue("Flat", bill.flatNo ?: "-")
            KeyValue("Original Amount", DashboardFormatters.money(originalAmount))
            KeyValue("Penalty", DashboardFormatters.money((bill.penaltyAmount ?: bill.lateFee).toMoneyDecimal()))
            KeyValue("Paid", DashboardFormatters.money(bill.paidAmount.toMoneyDecimal()))
            KeyValue("Current Due", DashboardFormatters.money(currentDue))

            Text("Write-off type", fontWeight = FontWeight.SemiBold)
            WriteOffChoiceChips(listOf("PARTIAL", "TOTAL"), type) { type = it }

            if (type == "PARTIAL") {
                BasicAppTextField(amount, { amount = it }, "Write-off amount")
            }

            Text("Reason", fontWeight = FontWeight.SemiBold)
            WriteOffChoiceChips(reasons, reason) { reason = it }
            BasicAppTextField(remarks, { remarks = it }, "Admin remarks optional")

            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                color = Color(0xFFE6F0FF)
            ) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Preview", fontWeight = FontWeight.Bold, color = Color(0xFF174EA6))
                    KeyValue("Write-off", DashboardFormatters.money(writeOffAmount))
                    KeyValue("Final Due", DashboardFormatters.money(finalDue))
                    Text("Resident side will only show updated due/status, not admin reason or remarks.", color = Color(0xFF475467))
                }
            }

            Button(
                onClick = {
                    bill.id?.let {
                        viewModel.createWriteOff(it, type, if (type == "TOTAL") null else amount, reason, remarks)
                    }
                    onDismiss()
                },
                enabled = bill.id != null && currentDue > BigDecimal.ZERO && writeOffAmount > BigDecimal.ZERO && writeOffAmount <= currentDue,
                modifier = Modifier.fillMaxWidth()
            ) { Text(if (type == "TOTAL") "Write-off Full Due" else "Apply Write-off") }
        }
        is MaintenanceDialog.CancelBill -> SimpleFormDialog("Cancel Bill", onDismiss) {
            var reason by remember { mutableStateOf("") }
            Text("This only cancels unpaid bills and keeps the record for audit.")
            BasicAppTextField(reason, { reason = it }, "Cancellation reason")
            Button(
                onClick = {
                    dialog.bill.id?.let { viewModel.cancelBill(it, reason) }
                    onDismiss()
                },
                enabled = reason.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
            ) { Text("Cancel Bill") }
        }
        MaintenanceDialog.Settings -> SimpleFormDialog("Maintenance Settings", onDismiss) {
            var title by remember { mutableStateOf("Monthly Maintenance") }
            var amount by remember { mutableStateOf("") }
            var due by remember { mutableStateOf("10") }
            var feeType by remember { mutableStateOf("fixed") }
            var feeValue by remember { mutableStateOf("") }
            var grace by remember { mutableStateOf("2") }
            BasicAppTextField(title, { title = it }, "Title")
            BasicAppTextField(amount, { amount = it }, "Fixed amount")
            BasicAppTextField(due, { due = it }, "Due day")
            BasicAppTextField(feeType, { feeType = it }, "Late fee type: fixed/percentage")
            BasicAppTextField(feeValue, { feeValue = it }, "Late fee value")
            BasicAppTextField(grace, { grace = it }, "Grace days")
            Button(onClick = { viewModel.saveSettings(title, amount, due, feeType, feeValue, grace); onDismiss() }, modifier = Modifier.fillMaxWidth()) { Text("Save") }
        }
        MaintenanceDialog.LateFee -> SimpleFormDialog("Late Fee Rule", onDismiss) {
            var grace by remember { mutableStateOf("0") }
            var type by remember { mutableStateOf("DAILY") }
            var amount by remember { mutableStateOf("0") }
            var max by remember { mutableStateOf("0") }
            BasicAppTextField(grace, { grace = it }, "Grace period")
            BasicAppTextField(type, { type = it }, "Penalty type")
            BasicAppTextField(amount, { amount = it }, "Penalty amount")
            BasicAppTextField(max, { max = it }, "Maximum late fee")
            Button(onClick = { viewModel.saveLateFeeRule(grace, type, amount, max); onDismiss() }, modifier = Modifier.fillMaxWidth()) { Text("Save Rule") }
        }
        is MaintenanceDialog.Category -> SimpleFormDialog(if (dialog.category == null) "Add Category" else "Edit Category", onDismiss) {
            var name by remember { mutableStateOf(dialog.category?.name.orEmpty()) }
            var amount by remember { mutableStateOf(dialog.category?.amount.orEmpty()) }
            var type by remember { mutableStateOf(dialog.category?.calculationType ?: "FIXED") }
            BasicAppTextField(name, { name = it }, "Name")
            BasicAppTextField(amount, { amount = it }, "Amount")
            BasicAppTextField(type, { type = it }, "Calculation type")
            Button(onClick = { viewModel.saveCategory(dialog.category?.id, name, amount, type, true); onDismiss() }, modifier = Modifier.fillMaxWidth()) { Text("Save") }
        }
        MaintenanceDialog.Expense -> SimpleFormDialog("Record Expense", onDismiss) {
            var category by remember { mutableStateOf("Repairs") }
            var vendor by remember { mutableStateOf("") }
            var amount by remember { mutableStateOf("") }
            var date by remember { mutableStateOf(LocalDate.now().toString()) }
            var method by remember { mutableStateOf("Bank Transfer") }
            var description by remember { mutableStateOf("") }
            BasicAppTextField(category, { category = it }, "Category")
            BasicAppTextField(vendor, { vendor = it }, "Vendor")
            BasicAppTextField(amount, { amount = it }, "Amount")
            BasicAppTextField(date, { date = it }, "Date YYYY-MM-DD")
            BasicAppTextField(method, { method = it }, "Payment method")
            BasicAppTextField(description, { description = it }, "Description")
            Button(onClick = { viewModel.createExpense(category, vendor, amount, date, method, description.ifBlank { null }); onDismiss() }, modifier = Modifier.fillMaxWidth()) { Text("Record") }
        }
        null -> Unit
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MaintenanceActions(content: @Composable androidx.compose.foundation.layout.FlowRowScope.() -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), content = content)
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun WriteOffChoiceChips(options: List<String>, selected: String, onSelect: (String) -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        options.forEach { option ->
            FilterChip(
                selected = selected == option,
                onClick = { onSelect(option) },
                label = { Text(option) }
            )
        }
    }
}

@Composable
private fun PaymentQrBox(paymentSettings: PaymentSettingsDto?) {
    val qrImage = paymentSettings?.paymentQrImage?.ifBlank { null }
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(260.dp)
            .clip(RoundedCornerShape(18.dp))
            .border(
                width = 1.dp,
                color = MaterialTheme.colorScheme.outlineVariant,
                shape = RoundedCornerShape(18.dp)
            )
            .background(MaterialTheme.colorScheme.surfaceVariant),
        contentAlignment = Alignment.Center
    ) {
        if (qrImage != null) {
            AsyncImage(
                model = fullMediaUrl(qrImage),
                contentDescription = "Society payment QR code",
                modifier = Modifier.fillMaxSize().padding(14.dp),
                error = painterResource(R.drawable.my_payment_qr),
                placeholder = painterResource(R.drawable.my_payment_qr),
                contentScale = ContentScale.Fit
            )
        } else {
            Image(
                painter = painterResource(R.drawable.my_payment_qr),
                contentDescription = "Society payment QR code",
                modifier = Modifier
                    .fillMaxSize()
                    .padding(14.dp),
                contentScale = ContentScale.Fit
            )
        }
    }
}

@Composable
private fun ResidentDialogHost(
    dialog: ResidentDialog?,
    paymentSettings: PaymentSettingsDto?,
    onDismiss: () -> Unit,
    viewModel: ResidentMaintenanceViewModel
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    when (dialog) {
        is ResidentDialog.Payment -> SimpleFormDialog("Maintenance Payment", onDismiss) {
            val bill = dialog.bill
            val societyName = paymentSettings?.societyName?.ifBlank { null } ?: "Society Management System"
            val accountName = paymentSettings?.paymentAccountHolderName?.ifBlank { null } ?: "PRIYANKA S DHAWALE"
            val upiId = paymentSettings?.paymentUpiId?.ifBlank { null } ?: "8999823244@upi"
            val expectedAmount = bill.expectedPayableAmount()
            var showProofForm by remember { mutableStateOf(false) }
            var method by remember { mutableStateOf("UPI") }
            var amount by remember { mutableStateOf(expectedAmount.toPlainString()) }
            var txn by remember { mutableStateOf("") }
            var paymentDate by remember { mutableStateOf(LocalDate.now().toString()) }
            var paymentTime by remember { mutableStateOf(LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))) }
            var note by remember { mutableStateOf("") }
            var proofUri by remember { mutableStateOf<Uri?>(null) }
            var validationError by remember { mutableStateOf<String?>(null) }
            val proofPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
                validationError = null
                proofUri = uri
            }

            PaymentFlowHeader(bill = bill, expectedAmount = expectedAmount.toPlainString())
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    PaymentQrBox(paymentSettings)
                    Text(societyName, fontWeight = FontWeight.Bold)
                    Button(onClick = { saveQrToGallery(context) }, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Filled.Download, contentDescription = null)
                        Text("Download QR Code", modifier = Modifier.padding(start = 8.dp))
                    }
                }
            }
            HowToPayCard()
            WarningCard()
            PaymentDetailsCard(
                societyName = societyName,
                bill = bill,
                expectedAmount = expectedAmount.toPlainString(),
                accountName = accountName,
                upiId = upiId
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = { copyText(context, "UPI ID", upiId) }) {
                    Icon(Icons.Filled.ContentCopy, contentDescription = null)
                    Text("Copy UPI")
                }
                TextButton(onClick = { shareQr(context) }) {
                    Icon(Icons.Filled.Share, contentDescription = null)
                    Text("Share QR")
                }
                TextButton(onClick = { openUpiApp(context, upiId, accountName, expectedAmount.toPlainString(), bill.title ?: "Maintenance Payment") }) {
                    Icon(Icons.Filled.OpenInNew, contentDescription = null)
                    Text("Open UPI App")
                }
            }

            if (!showProofForm) {
                Button(onClick = { showProofForm = true }, modifier = Modifier.fillMaxWidth()) { Text("I Have Paid") }
            } else {
                Text("Payment Submission", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                BasicAppTextField(amount, { amount = it }, "Amount paid")
                BasicAppTextField(method, { method = it }, "Payment method")
                BasicAppTextField(paymentDate, { paymentDate = it }, "Payment date")
                BasicAppTextField(txn, { txn = it }, "UPI transaction ID / UTR number")
                BasicAppTextField(paymentTime, { paymentTime = it }, "Payment time")
                Button(onClick = { proofPicker.launch("image/*") }, modifier = Modifier.fillMaxWidth()) {
                    Text(if (proofUri == null) "Upload payment screenshot" else "Screenshot selected - change")
                }
                proofUri?.let { uri ->
                    AsyncImage(
                        model = uri,
                        contentDescription = "Selected payment screenshot",
                        modifier = Modifier.fillMaxWidth().height(140.dp).clip(RoundedCornerShape(14.dp)),
                        contentScale = ContentScale.Crop
                    )
                }
                validationError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                BasicAppTextField(note, { note = it }, "Optional note")
                Button(
                    onClick = {
                        validationError = validatePaymentProof(context, bill, expectedAmount, amount, txn, proofUri)
                        if (validationError == null) {
                            val screenshotData = proofUri?.let { uri -> uriToBase64DataUrl(context, uri) }
                            if (screenshotData == null) {
                                validationError = "Unable to read selected screenshot. Please choose another image."
                                return@Button
                            }
                            bill.id?.let {
                                viewModel.submitPayment(
                                    billId = it,
                                    method = method.trim(),
                                    transactionId = txn.trim(),
                                    amount = amount.trim(),
                                    screenshotUrl = screenshotData,
                                    paymentDate = "${paymentDate.trim()} ${paymentTime.trim()}",
                                    note = note.trim()
                                )
                            }
                            Toast.makeText(context, "Payment proof submitted for admin verification.", Toast.LENGTH_LONG).show()
                            onDismiss()
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !state.submitting
                ) { Text(if (state.submitting) "Submitting..." else "Submit Proof for Verification") }
            }
        }
        is ResidentDialog.Dispute -> SimpleFormDialog("Raise Dispute", onDismiss) {
            var subject by remember { mutableStateOf("Issue with maintenance bill") }
            var description by remember { mutableStateOf("") }
            BasicAppTextField(subject, { subject = it }, "Subject")
            BasicAppTextField(description, { description = it }, "Description")
            Button(onClick = { dialog.bill.id?.let { viewModel.createDispute(it, subject, description) }; onDismiss() }, modifier = Modifier.fillMaxWidth()) { Text("Submit Dispute") }
        }
        null -> Unit
    }
}

@Composable
private fun PaymentFlowHeader(bill: MaintenanceBillDto, expectedAmount: String) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text("Pay via UPI", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(
            "${bill.flatNo ?: "Flat"}  •  ${bill.month ?: "-"}/${bill.year ?: "-"}  •  ${DashboardFormatters.money(expectedAmount.toMoneyDecimal())}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun HowToPayCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f))
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Text("HOW TO PAY", fontWeight = FontWeight.Bold)
            Text("1. Download the QR code or scan it using any UPI app such as PhonePe, Google Pay, Paytm, or BHIM.")
            Text("2. Enter the exact maintenance amount shown in this bill.")
            Text("3. Complete the UPI payment.")
            Text("4. Copy the UTR / Transaction ID from the successful payment.")
            Text("5. Upload the payment screenshot and submit for admin verification.")
        }
    }
}

@Composable
private fun WarningCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = androidx.compose.ui.graphics.Color(0xFFFFF7DB))
    ) {
        Text(
            "Warning: Please pay the exact amount mentioned in your maintenance bill and upload a clear payment screenshot after completing the transaction.",
            modifier = Modifier.padding(12.dp),
            style = MaterialTheme.typography.bodySmall,
            color = androidx.compose.ui.graphics.Color(0xFF6B4A00)
        )
    }
}

@Composable
private fun PaymentDetailsCard(
    societyName: String,
    bill: MaintenanceBillDto,
    expectedAmount: String,
    accountName: String,
    upiId: String
) {
    SectionCard("Payment Details") {
        KeyValue("Society", societyName)
        KeyValue("Resident", bill.residentName ?: "My account")
        KeyValue("Flat", bill.flatNo ?: "-")
        KeyValue("Maintenance", bill.title ?: "Maintenance Bill")
        KeyValue("Billing month", "${bill.month ?: "-"}/${bill.year ?: "-"}")
        KeyValue("Base amount", DashboardFormatters.money(bill.amount.toMoneyDecimal()))
        KeyValue("Previous pending", DashboardFormatters.money(previousPendingAmount(bill)))
        KeyValue("Late fee", DashboardFormatters.money((bill.lateFee ?: bill.penaltyAmount).toMoneyDecimal()))
        KeyValue("Total payable", DashboardFormatters.money(expectedAmount.toMoneyDecimal()))
        KeyValue("Due date", DashboardFormatters.date(bill.dueDate ?: bill.maintenanceDueDate))
        KeyValue("Payment status", friendlyPaymentStatus(bill.paymentStatus ?: bill.status))
        KeyValue("Bill ID", bill.id ?: "-")
        KeyValue("Account holder", accountName)
        KeyValue("UPI ID", upiId)
    }
}

private fun previousPendingAmount(bill: MaintenanceBillDto): BigDecimal {
    val remaining = bill.expectedPayableAmount()
    val base = bill.amount.toMoneyDecimal()
    val late = (bill.lateFee ?: bill.penaltyAmount).toMoneyDecimal()
    return (remaining - base - late).takeIf { it > BigDecimal.ZERO } ?: BigDecimal.ZERO
}

private fun MaintenanceBillDto.expectedPayableAmount(): BigDecimal {
    return (remainingDue ?: currentDue ?: remainingAmount ?: totalAmount ?: amount).toMoneyDecimal()
}

private fun friendlyPaymentStatus(status: String?): String {
    return when (status?.uppercase()) {
        "UNPAID", "PENDING", "OVERDUE" -> "Unpaid"
        "PAYMENT_PROOF_SUBMITTED" -> "Payment proof submitted"
        "UNDER_REVIEW", "PENDING VERIFICATION" -> "Under admin review"
        "APPROVED", "PAID" -> "Approved / Paid"
        "REJECTED" -> "Rejected - submit again"
        else -> status ?: "-"
    }
}

private fun validatePaymentProof(
    context: Context,
    bill: MaintenanceBillDto,
    expectedAmount: BigDecimal,
    amount: String,
    txn: String,
    proofUri: Uri?
): String? {
    val paid = amount.toMoneyDecimal()
    if (bill.id.isNullOrBlank()) return "Bill ID is missing. Please refresh and try again."
    if (paid <= BigDecimal.ZERO) return "Amount paid must be greater than zero."
    if (paid.setScale(2, RoundingMode.HALF_UP) != expectedAmount.setScale(2, RoundingMode.HALF_UP)) return "Amount paid must match total payable amount."
    if (txn.isBlank()) return "Transaction ID / UTR number is required."
    if (proofUri == null) return "Payment screenshot is required."
    val mime = context.contentResolver.getType(proofUri).orEmpty()
    if (!mime.startsWith("image/")) return "Please upload a valid image screenshot."
    val size = context.contentResolver.openAssetFileDescriptor(proofUri, "r")?.use { it.length } ?: -1L
    if (size > 5L * 1024L * 1024L) return "Screenshot must be smaller than 5 MB."
    return null
}

private fun uriToBase64DataUrl(context: Context, uri: Uri): String? {
    val mime = context.contentResolver.getType(uri)?.takeIf { it.startsWith("image/") } ?: "image/jpeg"
    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return null
    if (bytes.isEmpty() || bytes.size > 5 * 1024 * 1024) return null
    return "data:$mime;base64,${Base64.encodeToString(bytes, Base64.NO_WRAP)}"
}

private fun copyText(context: Context, label: String, value: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText(label, value))
    Toast.makeText(context, "$label copied", Toast.LENGTH_SHORT).show()
}

private fun saveQrToGallery(context: Context) {
    runCatching {
        val resolver = context.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, "my_payment_qr.png")
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/Society Management")
            put(MediaStore.Images.Media.IS_PENDING, 1)
        }
        val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: error("Unable to create image file")
        resolver.openOutputStream(uri)?.use { output ->
            context.resources.openRawResource(R.drawable.my_payment_qr).use { input -> input.copyTo(output) }
        } ?: error("Unable to write QR image")
        values.clear()
        values.put(MediaStore.Images.Media.IS_PENDING, 0)
        resolver.update(uri, values, null, null)
    }.onSuccess {
        Toast.makeText(context, "QR code downloaded successfully.", Toast.LENGTH_LONG).show()
    }.onFailure {
        Toast.makeText(context, "QR download failed. Please try again.", Toast.LENGTH_LONG).show()
    }
}

private fun shareQr(context: Context) {
    runCatching {
        val file = java.io.File(context.cacheDir, "my_payment_qr.png")
        context.resources.openRawResource(R.drawable.my_payment_qr).use { input ->
            file.outputStream().use { output -> input.copyTo(output) }
        }
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "image/png"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Share Society Payment QR"))
    }.onFailure {
        Toast.makeText(context, "Unable to share QR right now.", Toast.LENGTH_LONG).show()
    }
}

private fun openUpiApp(context: Context, upiId: String, accountName: String, amount: String, note: String) {
    val uri = Uri.Builder()
        .scheme("upi")
        .authority("pay")
        .appendQueryParameter("pa", upiId)
        .appendQueryParameter("pn", accountName)
        .appendQueryParameter("am", amount)
        .appendQueryParameter("cu", "INR")
        .appendQueryParameter("tn", note)
        .build()
    val intent = Intent(Intent.ACTION_VIEW, uri)
    if (intent.resolveActivity(context.packageManager) != null) context.startActivity(intent)
    else Toast.makeText(context, "No UPI app found. Please scan the QR manually.", Toast.LENGTH_LONG).show()
}

private fun fullMediaUrl(path: String?): String? {
    if (path.isNullOrBlank()) return null
    if (path.startsWith("http", ignoreCase = true) || path.startsWith("content:", ignoreCase = true)) return path
    return BuildConfig.BASE_URL.trimEnd('/') + "/" + path.trimStart('/')
}

private fun createReceiptPdfFile(context: Context, payment: MaintenancePaymentDto): java.io.File {
    val file = java.io.File(context.cacheDir, "receipt-${payment.receiptNumber ?: payment.id ?: System.currentTimeMillis()}.pdf")
    val document = PdfDocument()
    val page = document.startPage(PdfDocument.PageInfo.Builder(595, 842, 1).create())
    val canvas = page.canvas
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 13f }
    var y = 48f
    fun line(label: String, value: String) {
        paint.isFakeBoldText = true
        canvas.drawText(label, 48f, y, paint)
        paint.isFakeBoldText = false
        canvas.drawText(value, 230f, y, paint)
        y += 26f
    }
    paint.textSize = 22f
    paint.isFakeBoldText = true
    canvas.drawText("Society Management System", 48f, y, paint)
    y += 34f
    paint.textSize = 16f
    canvas.drawText("Maintenance Payment Receipt", 48f, y, paint)
    y += 38f
    paint.textSize = 13f
    paint.isFakeBoldText = false
    line("Receipt Number", payment.receiptNumber ?: "-")
    line("Payment ID", payment.id ?: "-")
    line("Resident Name", payment.residentName ?: "-")
    line("Flat Number", payment.flatNo ?: "-")
    line("Maintenance Title", payment.title ?: "Maintenance")
    line("Billing Month/Year", "${payment.month ?: "-"}/${payment.year ?: "-"}")
    line("Base Amount", DashboardFormatters.money(payment.baseAmount.toMoneyDecimal()))
    line("Late Fee / Penalty", DashboardFormatters.money(payment.penaltyAmount.toMoneyDecimal()))
    line("Total Paid", DashboardFormatters.money(payment.amount.toMoneyDecimal()))
    line("Payment Date", DashboardFormatters.date(payment.paidAt))
    line("Transaction Reference", payment.transactionId ?: "-")
    line("Approval Date", DashboardFormatters.date(payment.verifiedAt))
    line("Payment Method", payment.paymentMethod ?: "-")
    line("Payment Status", friendlyPaymentStatus(payment.paymentStatus))
    line("Reviewed By", payment.verifiedByName ?: "Admin")
    y += 28f
    paint.textSize = 12f
    canvas.drawText("This is a digitally generated receipt and does not require a physical signature.", 48f, y, paint)
    document.finishPage(page)
    file.outputStream().use { document.writeTo(it) }
    document.close()
    return file
}

private fun saveReceiptPdf(context: Context, payment: MaintenancePaymentDto) {
    runCatching {
        val source = createReceiptPdfFile(context, payment)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, source.name)
                put(MediaStore.Downloads.MIME_TYPE, "application/pdf")
                put(MediaStore.Downloads.RELATIVE_PATH, "Download/Society Management")
            }
            val uri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: error("Unable to create receipt file")
            context.contentResolver.openOutputStream(uri)?.use { output ->
                source.inputStream().use { input -> input.copyTo(output) }
            } ?: error("Unable to save receipt")
        }
    }.onSuccess {
        Toast.makeText(context, "Receipt PDF saved to Downloads.", Toast.LENGTH_LONG).show()
    }.onFailure {
        Toast.makeText(context, "Unable to save receipt PDF.", Toast.LENGTH_LONG).show()
    }
}

private fun shareReceiptPdf(context: Context, payment: MaintenancePaymentDto) {
    runCatching {
        val file = createReceiptPdfFile(context, payment)
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Share Receipt"))
    }.onFailure {
        Toast.makeText(context, "Unable to share receipt.", Toast.LENGTH_LONG).show()
    }
}

private fun sharePaymentsCsv(context: Context, payments: List<MaintenancePaymentDto>) {
    val header = listOf("Payment ID", "Resident", "Flat", "Amount", "Status", "Transaction", "Paid At", "Verified At")
    val rows = payments.map { payment ->
        listOf(
            payment.id.orEmpty(),
            payment.residentName.orEmpty(),
            payment.flatNo.orEmpty(),
            payment.amount.orEmpty(),
            friendlyPaymentStatus(payment.paymentStatus),
            payment.transactionId.orEmpty(),
            payment.paidAt.orEmpty(),
            payment.verifiedAt.orEmpty()
        )
    }
    val csv = (listOf(header) + rows).joinToString("\n") { row -> row.joinToString(",") { it.csvCell() } }
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/csv"
        putExtra(Intent.EXTRA_SUBJECT, "Maintenance payment verification export")
        putExtra(Intent.EXTRA_TEXT, csv)
    }
    runCatching { context.startActivity(Intent.createChooser(intent, "Export Payments CSV")) }
        .onFailure { Toast.makeText(context, "Unable to share CSV right now.", Toast.LENGTH_LONG).show() }
}

private fun String.csvCell(): String {
    val escaped = replace("\"", "\"\"")
    return "\"$escaped\""
}

private fun String?.isResidentPayableStatus(): Boolean {
    val normalized = normalizePaymentStatus()
    return normalized in setOf("PENDING", "PARTIAL", "OVERDUE", "UNPAID", "REJECTED")
}

private fun String?.isVerificationPendingStatus(): Boolean {
    val normalized = normalizePaymentStatus()
    return normalized in setOf("PENDING_VERIFICATION", "PAYMENT_PROOF_SUBMITTED", "UNDER_REVIEW")
}

private fun String?.isApprovedStatus(): Boolean {
    val normalized = normalizePaymentStatus()
    return normalized in setOf("PAID", "APPROVED")
}

private fun String?.isSettledBillStatus(): Boolean {
    val normalized = normalizePaymentStatus()
    return normalized in setOf("PAID", "APPROVED", "WRITTEN_OFF", "WRITE_OFF", "SETTLED", "CANCELLED")
}

private fun MaintenanceBillDto.isOverdueBill(): Boolean {
    if ((paymentStatus ?: status).isSettledBillStatus()) return false
    val due = (dueDate ?: maintenanceDueDate).toLocalDateOrNull() ?: return status.normalizePaymentStatus() == "OVERDUE"
    return due < LocalDate.now() || status.normalizePaymentStatus() == "OVERDUE"
}

private fun MaintenancePaymentDto.proofImage(): String? {
    return listOfNotNull(
        screenshotUrl?.takeIf { it.isNotBlank() },
        screenshot?.takeIf { it.isNotBlank() },
        screenshotPath?.takeIf { it.isNotBlank() }
    ).firstOrNull()
}

private fun String?.normalizePaymentStatus(): String {
    return orEmpty()
        .trim()
        .replace("-", "_")
        .replace(" ", "_")
        .uppercase()
}

private fun MaintenanceBillDto.displayTitle(): String {
    val billTitle = title?.takeIf { it.isNotBlank() } ?: "Maintenance"
    val monthLabel = monthName(month)
    return if (monthLabel.isNotBlank() && !billTitle.contains(monthLabel, ignoreCase = true)) {
        "$billTitle - $monthLabel ${year.orEmpty()}".trim()
    } else {
        billTitle
    }
}

private fun List<MaintenanceBillDto>.nextDueDateLabel(): String {
    return filter { !(it.paymentStatus ?: it.status).isApprovedStatus() }
        .mapNotNull { (it.dueDate ?: it.maintenanceDueDate).toLocalDateOrNull() }
        .minOrNull()
        ?.let { DashboardFormatters.date(it.toString()) }
        ?: "No dues"
}

private fun paidThisMonthAmount(bills: List<MaintenanceBillDto>): BigDecimal {
    val now = LocalDate.now()
    return bills
        .filter {
            val paidDate = (it.paidAt ?: it.paymentDate ?: it.verifiedAt).toLocalDateOrNull()
            paidDate == null || (paidDate.monthValue == now.monthValue && paidDate.year == now.year)
        }
        .fold(BigDecimal.ZERO) { sum, bill -> sum + (bill.paidAmount ?: bill.totalAmount ?: bill.amount).toMoneyDecimal() }
}

private fun isBillOverdue(bill: MaintenanceBillDto): Boolean {
    val due = (bill.dueDate ?: bill.maintenanceDueDate).toLocalDateOrNull() ?: return false
    return due.isBefore(LocalDate.now())
}

private fun monthName(value: String?): String {
    val clean = value?.trim().orEmpty()
    val numeric = clean.toIntOrNull()
    if (numeric != null) {
        return listOf(
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ).getOrNull(numeric - 1).orEmpty()
    }
    return clean.take(3).replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
}

private fun monthName(value: Int): String = monthName(value.toString())

private fun String?.toLocalDateOrNull(): LocalDate? {
    val date = orEmpty().take(10)
    return runCatching { LocalDate.parse(date) }.getOrNull()
}

@Composable
private fun SimpleFormDialog(title: String, onDismiss: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                content = content
            )
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Close") } }
    )
}

private fun MaintenanceBillDto.matchesBill(query: String): Boolean {
    if (query.isBlank()) return true
    val q = query.lowercase()
    return listOf(title, residentName, flatNo, month, year, paymentStatus, status).any { it?.lowercase()?.contains(q) == true }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MaintenanceTopBar(
    title: String,
    subtitle: String? = null,
    navigationText: String = "Back",
    onNavigationClick: (() -> Unit)? = null,
    actionText: String? = null,
    onActionClick: (() -> Unit)? = null
) {
    TopAppBar(
        title = {
            Column {
                Text(title, fontWeight = FontWeight.Bold)
                subtitle?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        },
        navigationIcon = {
            if (onNavigationClick != null) {
                IconButton(onClick = onNavigationClick) {
                    Icon(Icons.Filled.ArrowBack, contentDescription = navigationText)
                }
            }
        },
        actions = {
            if (actionText != null && onActionClick != null) {
                IconButton(onClick = onActionClick) {
                    Icon(Icons.Filled.Payments, contentDescription = actionText)
                }
            }
        }
    )
}

@Composable
private fun BasicAppTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = { Text(label) },
        singleLine = true
    )
}

@Composable
private fun EmptyState(
    title: String,
    message: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text(message, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun RetryState(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(message, color = MaterialTheme.colorScheme.onErrorContainer)
            Button(onClick = onRetry) { Text("Retry") }
        }
    }
}

@Composable
private fun DashboardSkeleton() {
    Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        repeat(5) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(if (it == 0) 90.dp else 72.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f))
            )
        }
    }
}

@Composable
private fun KeyValue(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
        Text(value, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AdminMaintenanceTabs(selected: String, onSelected: (String) -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf("Bills", "Defaulters", "Write-Offs", "Categories", "Expenses", "Late Fee", "Settings", "Disputes", "Reports").forEach { tab ->
            FilterChip(
                selected = selected == tab,
                onClick = { onSelected(tab) },
                label = { Text(tab) }
            )
        }
    }
}

@Composable
private fun AdminInlineMessage(message: String, fg: Color, bg: Color, modifier: Modifier = Modifier) {
    Surface(modifier = modifier.fillMaxWidth(), color = bg, shape = RoundedCornerShape(12.dp)) {
        Text(
            message,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            color = fg,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun AdminStatusPill(text: String, fg: Color, bg: Color) {
    Text(
        text,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(bg)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        color = fg,
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.SemiBold
    )
}

@Composable
private fun AdminAmountRow(label: String, value: String, strong: Boolean = false, valueColor: Color = Color(0xFF101828)) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(
            label,
            color = if (strong) Color(0xFF101828) else Color(0xFF667085),
            fontWeight = if (strong) FontWeight.SemiBold else FontWeight.Normal
        )
        Text(
            value,
            color = valueColor,
            fontWeight = if (strong) FontWeight.Bold else FontWeight.SemiBold
        )
    }
}

@Composable
private fun SectionCard(
    title: String,
    subtitle: String? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            subtitle?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            content()
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MetricGrid(items: List<Triple<String, String, String?>>) {
    val visualItems = items.map { item ->
        when (item.first) {
            "Collected" -> AdminMetricVisual(item, Icons.Filled.Wallet, Color(0xFF087A2E), Color(0xFFEAF8EE), Color(0xFFC8EBD2))
            "Pending" -> AdminMetricVisual(item, Icons.Filled.Payments, Color(0xFFE86D00), Color(0xFFFFF4DF), Color(0xFFFFDCA8))
            "Overdue" -> AdminMetricVisual(item, Icons.Filled.Warning, Color(0xFFE31B23), Color(0xFFFFECEF), Color(0xFFFFCCD3))
            else -> AdminMetricVisual(item, Icons.Filled.ReceiptLong, Color(0xFF0B56D9), Color(0xFFEAF2FF), Color(0xFFCFE0FF))
        }
    }
    FlowRow(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        maxItemsInEachRow = 2
    ) {
        visualItems.forEach { item ->
            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = item.container),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
            ) {
                Column(
                    Modifier
                        .border(1.dp, item.border, RoundedCornerShape(18.dp))
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(7.dp)
                ) {
                    Surface(modifier = Modifier.size(46.dp), shape = CircleShape, color = Color.White.copy(alpha = 0.72f)) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(item.icon, contentDescription = null, tint = item.tint, modifier = Modifier.size(24.dp))
                        }
                    }
                    Text(item.data.second, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color(0xFF101828))
                    Text(item.data.first, style = MaterialTheme.typography.labelLarge, color = item.tint, fontWeight = FontWeight.SemiBold)
                    item.data.third?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, color = item.tint)
                    }
                }
            }
        }
    }
}

private data class AdminMetricVisual(
    val data: Triple<String, String, String?>,
    val icon: ImageVector,
    val tint: Color,
    val container: Color,
    val border: Color
)

private fun saveAdminBillReceiptPdf(context: Context, bill: MaintenanceBillDto) {
    val resolver = context.contentResolver
    val fileName = "maintenance-bill-receipt-${bill.id ?: System.currentTimeMillis()}.pdf"
    val document = PdfDocument()
    val page = document.startPage(PdfDocument.PageInfo.Builder(595, 842, 1).create())
    val canvas = page.canvas
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textSize = 16f
        color = android.graphics.Color.BLACK
    }
    var y = 60f
    fun line(text: String, bold: Boolean = false) {
        paint.isFakeBoldText = bold
        canvas.drawText(text, 48f, y, paint)
        y += 30f
    }
    line("Society Management System", true)
    line("Maintenance Bill Receipt", true)
    y += 10f
    line("Bill ID: ${bill.id ?: "-"}")
    line("Resident: ${bill.residentName ?: "-"}")
    line("Flat: ${bill.flatNo ?: "-"}")
    line("Maintenance: ${bill.title ?: "Maintenance"}")
    line("Billing: ${bill.month ?: "-"} / ${bill.year ?: "-"}")
    line("Due date: ${DashboardFormatters.date(bill.dueDate ?: bill.maintenanceDueDate)}")
    y += 10f
    line("Base amount: ${DashboardFormatters.money(bill.amount.toMoneyDecimal())}")
    line("Late fee: ${DashboardFormatters.money((bill.lateFee ?: bill.penaltyAmount).toMoneyDecimal())}")
    line("Total: ${DashboardFormatters.money(bill.totalAmount.toMoneyDecimal())}", true)
    line("Paid: ${DashboardFormatters.money(bill.paidAmount.toMoneyDecimal())}")
    line("Remaining: ${DashboardFormatters.money(bill.expectedPayableAmount())}")
    line("Status: ${bill.paymentStatus ?: bill.status ?: "-"}")
    y += 20f
    paint.textSize = 12f
    line("This is a digitally generated receipt and does not require a signature.")
    document.finishPage(page)
    try {
        val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, fileName)
            put(MediaStore.Downloads.MIME_TYPE, "application/pdf")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Downloads.RELATIVE_PATH, "Download")
            }
        }
        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
        if (uri != null) {
            resolver.openOutputStream(uri)?.use { document.writeTo(it) }
            Toast.makeText(context, "Receipt downloaded", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(context, "Unable to download receipt", Toast.LENGTH_SHORT).show()
        }
    } catch (_: Exception) {
        Toast.makeText(context, "Unable to download receipt", Toast.LENGTH_SHORT).show()
    } finally {
        document.close()
    }
}

private fun String?.toMoneyDecimal(): BigDecimal {
    return this?.toBigDecimalOrNull() ?: BigDecimal.ZERO
}



