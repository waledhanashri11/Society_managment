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
import com.example.application.data.remote.dto.MaintenancePaymentVerificationDto
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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Close
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Edit
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
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import com.example.application.util.NetworkResult
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.asImageBitmap
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
import com.example.application.data.remote.dto.netPayableAmount
import com.example.application.ui.components.AppBottomNavigation
import com.example.application.ui.components.AppRoleTheme
import com.example.application.ui.components.NotificationDropdown
import com.example.application.ui.theme.SocietyBlue40
import com.example.application.ui.screens.resident.saveResidentReceiptPdf
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.AdminMaintenanceViewModel
import com.example.application.viewmodel.ResidentMaintenanceViewModel
import androidx.compose.ui.graphics.Brush
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.TrendingUp
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import kotlin.math.max
import androidx.compose.foundation.BorderStroke
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AdminMaintenanceScreen(
    onBack: () -> Unit,
    onPaymentVerification: () -> Unit = {},
    initialTab: String = "Bills",
    viewModel: AdminMaintenanceViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val data = state.data
    var dialog by remember { mutableStateOf<MaintenanceDialog?>(null) }
    var selectedMonthFilter by remember { mutableStateOf(0) }
    var selectedYearFilter by remember { mutableStateOf(0) }
    var statusFilter by remember { mutableStateOf("All") }

    val availableYears = remember(data?.bills) {
        data?.bills.orEmpty().mapNotNull { it.year?.toIntOrNull() }.distinct().sortedDescending()
    }

    val filteredBills = remember(data?.bills, selectedMonthFilter, selectedYearFilter, statusFilter) {
        data?.bills.orEmpty().filter { bill ->
            val billM = bill.month?.toIntOrNull() ?: monthNameToNumber(bill.month) ?: 0
            val billY = bill.year?.toIntOrNull() ?: 0
            val monthMatch = selectedMonthFilter == 0 || billM == selectedMonthFilter
            val yearMatch = selectedYearFilter == 0 || billY == selectedYearFilter
            val statusStr = (bill.paymentStatus ?: bill.status ?: "Unpaid").trim()
            val statusMatch = when (statusFilter.lowercase()) {
                "all" -> true
                "pending", "unpaid" -> !(bill.paymentStatus ?: bill.status).isSettledBillStatus()
                "paid" -> (bill.paymentStatus ?: bill.status).isSettledBillStatus()
                "overdue" -> bill.isOverdueBill()
                else -> statusStr.equals(statusFilter, ignoreCase = true)
            }
            monthMatch && yearMatch && statusMatch
        }
    }

    val activeTab = when (state.activeTab) {
        "Overview", "Payments", "Verification" -> "Bills"
        else -> state.activeTab
    }

    Scaffold(
        topBar = {
            AdminMaintenanceHeader(
                title = "Maintenance Management",
                subtitle = "Manage bills, expenses & reports",
                onMenuClick = onBack,
                onSearchToggle = { /* handled via tab query */ },
                onFilterToggle = { viewModel.setTab("Settings") }
            )
        },
        bottomBar = {
            AdminMaintenanceBottomBar(
                selectedTab = activeTab,
                onTabSelected = viewModel::setTab
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
                .background(MaterialTheme.colorScheme.background)
        ) {
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, top = 14.dp, end = 16.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                state.message?.let {
                    item { AdminInlineMessage(it, MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.surfaceVariant) }
                }
                state.error?.let {
                    item { RetryState(it, { viewModel.load(refresh = true) }) }
                }

                if (state.isLoading && data == null) {
                    item { DashboardSkeleton() }
                } else if (data == null) {
                    item { EmptyState("Maintenance unavailable", "Pull down or tap retry.") }
                } else {
                    item {
                        AdminMaintenanceStatsRow(
                            data = data,
                            selectedMonth = if (selectedMonthFilter != 0) selectedMonthFilter else LocalDate.now().monthValue,
                            selectedYear = if (selectedYearFilter != 0) selectedYearFilter else LocalDate.now().year
                        )
                    }

                    if (activeTab == "Bills" || activeTab == "Overview") {
                        item {
                            MaintenanceMonthYearFilterBar(
                                selectedMonth = selectedMonthFilter,
                                onMonthSelected = { selectedMonthFilter = it },
                                selectedYear = selectedYearFilter,
                                onYearSelected = { selectedYearFilter = it },
                                statusFilter = statusFilter,
                                onStatusSelected = { statusFilter = it },
                                availableYears = availableYears
                            )
                        }
                    }

                    when (activeTab) {
                        "Settings" -> settingsTab(data.settings, viewModel, { dialog = it })
                        "Expenses" -> expensesTab(data.expenses, viewModel, { dialog = it })
                        "Reports" -> reportsTab(data)
                        else -> billsTab(filteredBills, viewModel) { dialog = it }
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
        viewModel.setFilter("All")
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
            indicator = {},
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, top = 14.dp, end = 16.dp, bottom = 18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                state.message?.let {
                    item { AdminInlineMessage(it, MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.surfaceVariant) }
                }
                state.error?.let {
                    item { RetryState(it, { viewModel.load(refresh = true) }) }
                }
                when {
                    state.isLoading && data == null -> item { DashboardSkeleton() }
                    data == null -> item { EmptyState("Payment verification unavailable", "Pull down or tap refresh.") }
                    else -> item { PaymentVerificationSection(data.verifications, viewModel) }
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
    var disputeBill by remember { mutableStateOf<MaintenanceBillDto?>(null) }
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
        PullToRefreshBox(isRefreshing = state.isRefreshing, onRefresh = { viewModel.load(refresh = true) }, indicator = {}, modifier = Modifier.fillMaxSize().padding(padding)) {
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, top = 14.dp, end = 16.dp, bottom = 18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
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
                                onDownloadReceipt = {
                                    when {
                                        !bill.paymentId.isNullOrBlank() -> viewModel.fetchPaymentReceipt(bill.paymentId) { saveReceiptPdf(context, it) }
                                        bill.writeOffAmount.toMoneyDecimal() > BigDecimal.ZERO && !bill.id.isNullOrBlank() -> viewModel.fetchWriteOffReceipt(bill.id) { saveWriteOffReceiptPdf(context, it) }
                                        else -> saveResidentReceiptPdf(context, bill)
                                    }
                                },
                                onViewStatus = onPaymentHistory,
                                onDispute = { disputeBill = bill }
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
    disputeBill?.let { bill ->
        var subject by remember(bill.id) { mutableStateOf("") }
        var description by remember(bill.id) { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { disputeBill = null },
            title = { Text("Raise Maintenance Dispute") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(bill.displayTitle(), fontWeight = FontWeight.Bold)
                    OutlinedTextField(
                        value = subject,
                        onValueChange = { subject = it },
                        label = { Text("Subject") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        label = { Text("Description") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        bill.id?.let { viewModel.createDispute(it, subject.trim(), description.trim()) }
                        disputeBill = null
                    },
                    enabled = subject.isNotBlank() && description.isNotBlank() && !state.submitting
                ) { Text(if (state.submitting) "Submitting..." else "Submit Dispute") }
            },
            dismissButton = { TextButton(onClick = { disputeBill = null }) { Text("Cancel") } }
        )
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
            Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = MaterialTheme.colorScheme.primary)
        }
        Text(
            "Maintenance",
            modifier = Modifier.weight(1f).padding(start = 8.dp),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        IconButton(onClick = onPaymentHistory) {
            Icon(Icons.Filled.Download, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
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
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("Maintenance Overview", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
            ) {
                ResidentMetricItem(
                    label = "Total Outstanding",
                    value = DashboardFormatters.money(totalOutstanding),
                    tint = MaterialTheme.colorScheme.error,
                    bg = MaterialTheme.colorScheme.errorContainer,
                    modifier = Modifier.width(105.dp)
                )
                ResidentMetricItem(
                    label = "Next Due Date",
                    value = nextDueDate,
                    tint = MaterialTheme.colorScheme.primary,
                    bg = MaterialTheme.colorScheme.primaryContainer,
                    modifier = Modifier.width(105.dp)
                )
                ResidentMetricItem(
                    label = "Pending Bills Count",
                    value = pendingCount.toString(),
                    tint = MaterialTheme.colorScheme.tertiary,
                    bg = MaterialTheme.colorScheme.tertiaryContainer,
                    modifier = Modifier.width(105.dp)
                )
                ResidentMetricItem(
                    label = "Paid This Month",
                    value = DashboardFormatters.money(paidThisMonth),
                    tint = MaterialTheme.colorScheme.primary,
                    bg = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.width(105.dp)
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
        Text(label, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurface)
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, color = tint)
    }
}

@Composable
private fun ResidentMaintenanceBillCard(
    bill: MaintenanceBillDto,
    onPay: () -> Unit,
    onDownloadReceipt: () -> Unit,
    onViewStatus: () -> Unit,
    onDispute: () -> Unit
) {
    val status = bill.paymentStatus ?: bill.latestPaymentStatus ?: bill.status
    val writeOffAmt = (bill.writeOffAmount ?: bill.maintenanceWriteOffAmount).toMoneyDecimal()
    val settledByWriteOff = status.normalizePaymentStatus() in setOf("WRITTEN_OFF", "SETTLED") || bill.isWrittenOff == true || (writeOffAmt > java.math.BigDecimal.ZERO && (bill.remainingDue ?: bill.remainingAmount ?: bill.totalAmount).toMoneyDecimal() <= java.math.BigDecimal.ZERO)
    val canPay = status.isResidentPayableStatus() && !settledByWriteOff
    val paid = status.isApprovedStatus()
    val finished = paid || settledByWriteOff
    val verifying = status.isVerificationPendingStatus()
    val overdue = isBillOverdue(bill) && canPay
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
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
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.Payments, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(30.dp))
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(bill.displayTitle(), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Text("Due ${DashboardFormatters.date(bill.dueDate ?: bill.maintenanceDueDate)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (writeOffAmt > java.math.BigDecimal.ZERO || settledByWriteOff) {
                    Text(
                        text = "Approved write-off benefit: -${DashboardFormatters.money(writeOffAmt)}",
                        color = Color(0xFF6D28D9),
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold
                    )
                }
                if (overdue) Text("Overdue", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.SemiBold)
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(DashboardFormatters.money(bill.netPayableAmount()), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                StatusBadge(
                    status = when {
                        settledByWriteOff -> "WRITTEN OFF"
                        writeOffAmt > java.math.BigDecimal.ZERO -> "PARTIALLY WRITTEN OFF"
                        paid -> "Paid"
                        verifying -> "Verification Pending"
                        else -> "Pending"
                    }
                )
                when {
                    canPay -> Button(onClick = onPay, shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Filled.Payments, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Pay Now")
                    }
                    paid || settledByWriteOff -> OutlinedButton(onClick = onDownloadReceipt, shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Filled.Download, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Receipt")
                    }
                    verifying -> OutlinedButton(onClick = onViewStatus, shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Filled.OpenInNew, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Status")
                    }
                }
                if (!finished && !verifying) {
                    TextButton(onClick = onDispute) {
                        Text("Raise dispute")
                    }
                }
            }
        }
    }
}

@Composable
private fun ResidentStatusBadge(text: String, fg: Color = Color.Unspecified, bg: Color = Color.Unspecified) {
    StatusBadge(status = text)
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AdminMaintenanceHeader(
    title: String,
    subtitle: String,
    onMenuClick: () -> Unit,
    onSearchToggle: () -> Unit,
    onFilterToggle: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    listOf(Color(0xFF0B6BFF), Color(0xFF083B92))
                )
            )
            .padding(horizontal = 16.dp, vertical = 18.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                IconButton(onClick = onMenuClick) {
                    Icon(
                        imageVector = Icons.Filled.Menu,
                        contentDescription = "Menu",
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                }
                Column {
                    Text(
                        text = title,
                        color = Color.White,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = subtitle,
                        color = Color.White.copy(alpha = 0.82f),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                IconButton(onClick = onSearchToggle) {
                    Icon(
                        imageVector = Icons.Filled.Search,
                        contentDescription = "Search",
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                }
                NotificationDropdown(tint = Color.White, onViewAll = {})
                IconButton(onClick = onFilterToggle) {
                    Icon(
                        imageVector = Icons.Filled.FilterList,
                        contentDescription = "Filter",
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun AdminMaintenanceStatsRow(
    data: com.example.application.data.repository.AdminMaintenanceData,
    selectedMonth: Int,
    selectedYear: Int
) {
    val bills = data.bills
    val payments = data.payments
    val summary = data.adminSummary

    val totalOutstanding = summary?.totalOutstanding.toMoneyDecimal().takeIf { it > BigDecimal.ZERO }
        ?: bills.filter { !(it.paymentStatus ?: it.status).isSettledBillStatus() }
            .fold(BigDecimal.ZERO) { sum, bill -> sum + bill.expectedPayableAmount() }

    val collectedThisMonth = summary?.currentMonthCollection.toMoneyDecimal().takeIf { it > BigDecimal.ZERO }
        ?: payments.filter { it.paymentStatus.isApprovedStatus() }
            .fold(BigDecimal.ZERO) { sum, payment -> sum + payment.amount.toMoneyDecimal() }

    val pendingVerificationCount = summary?.verificationPending ?: data.verifications.count { it.verificationStatus.isPaymentVerificationPending() }
    val overdueCount = summary?.overdueBills ?: bills.count { it.isOverdueBill() }
    val pendingBillsCount = summary?.pendingBills ?: bills.count { !(it.paymentStatus ?: it.status).isSettledBillStatus() }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatsTileCard(
            label = "Total Outstanding",
            value = DashboardFormatters.money(totalOutstanding),
            subtext = "From $pendingBillsCount Residents",
            icon = Icons.Filled.Wallet,
            accentColor = Color(0xFF0B5FFF),
            containerColor = Color(0xFFF0F5FF),
            borderColor = Color(0xFFD6E4FF)
        )
        StatsTileCard(
            label = "Collected This Month",
            value = DashboardFormatters.money(collectedThisMonth),
            subtext = "${monthName(selectedMonth)} $selectedYear",
            icon = Icons.Filled.CheckCircle,
            accentColor = Color(0xFF1B8F4D),
            containerColor = Color(0xFFF6FFED),
            borderColor = Color(0xFFD9F7BE)
        )
        StatsTileCard(
            label = "Pending Verification",
            value = pendingVerificationCount.toString(),
            subtext = "Payments",
            icon = Icons.Filled.Payments,
            accentColor = Color(0xFFFF8A00),
            containerColor = Color(0xFFFFF7E6),
            borderColor = Color(0xFFFFE7BA)
        )
        StatsTileCard(
            label = "Overdue Bills",
            value = overdueCount.toString(),
            subtext = "Bills",
            icon = Icons.Filled.ReceiptLong,
            accentColor = Color(0xFF9C3ED7),
            containerColor = Color(0xFFFFF0F6),
            borderColor = Color(0xFFFFD6E7)
        )
    }
}

@Composable
private fun StatsTileCard(
    label: String,
    value: String,
    subtext: String,
    icon: ImageVector,
    accentColor: Color,
    containerColor: Color,
    borderColor: Color
) {
    Card(
        modifier = Modifier.width(200.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = BorderStroke(1.dp, borderColor)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(containerColor),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = label, tint = accentColor, modifier = Modifier.size(22.dp))
            }
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(label, style = MaterialTheme.typography.bodySmall, color = Color(0xFF64748B), maxLines = 1)
                Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                Text(subtext, style = MaterialTheme.typography.labelSmall, color = Color(0xFF94A3B8))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MaintenanceMonthYearFilterBar(
    selectedMonth: Int,
    onMonthSelected: (Int) -> Unit,
    selectedYear: Int,
    onYearSelected: (Int) -> Unit,
    statusFilter: String,
    onStatusSelected: (String) -> Unit,
    availableYears: List<Int>
) {
    val monthNames = listOf(
        "All Months", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    )

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.FilterList,
                        contentDescription = null,
                        tint = SocietyBlue40,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = "Month & Date Billing Navigation",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF0F172A)
                    )
                }

                if (selectedMonth != 0 || selectedYear != 0 || statusFilter != "All") {
                    TextButton(
                        onClick = {
                            onMonthSelected(0)
                            onYearSelected(0)
                            onStatusSelected("All")
                        },
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(
                            "Clear Filters",
                            style = MaterialTheme.typography.labelMedium,
                            color = SocietyBlue40
                        )
                    }
                }
            }

            // Month Chips (Horizontal Scroll Navbar)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                monthNames.forEachIndexed { index, monthLabel ->
                    FilterChip(
                        selected = selectedMonth == index,
                        onClick = { onMonthSelected(index) },
                        label = { Text(monthLabel) }
                    )
                }
            }

            // Year and Status Chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                val currentYear = LocalDate.now().year
                val defaultYearsList = listOf(currentYear, currentYear - 1, currentYear - 2)
                val years = listOf(0) + (availableYears.ifEmpty { defaultYearsList }).distinct().sortedDescending()

                years.forEach { yr ->
                    val label = if (yr == 0) "All Years" else "$yr"
                    FilterChip(
                        selected = selectedYear == yr,
                        onClick = { onYearSelected(yr) },
                        label = { Text(label) }
                    )
                }

                Spacer(Modifier.width(8.dp))

                val statuses = listOf("All", "Pending", "Paid", "Overdue")
                statuses.forEach { st ->
                    FilterChip(
                        selected = statusFilter.equals(st, ignoreCase = true),
                        onClick = { onStatusSelected(st) },
                        label = { Text(st) }
                    )
                }
            }
        }
    }
}

@Composable
private fun AdminMaintenanceStyledTabs(selected: String, onSelected: (String) -> Unit) {
    val tabs = listOf(
        "Overview" to Icons.Filled.Home,
        "Bills" to Icons.Filled.ReceiptLong,
        "Settings" to Icons.Filled.Settings,
        "Expenses" to Icons.Filled.Wallet,
        "Payments" to Icons.Filled.CheckCircle,
        "Reports" to Icons.Filled.TrendingUp
    )
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        tabs.forEach { (tabLabel, icon) ->
            val mappedTabKey = if (tabLabel == "Payments") "Verification" else tabLabel
            val active = selected == mappedTabKey || selected == tabLabel
            Surface(
                onClick = { onSelected(mappedTabKey) },
                shape = RoundedCornerShape(12.dp),
                color = if (active) SocietyBlue40 else Color.White,
                border = BorderStroke(1.dp, if (active) SocietyBlue40 else Color(0xFFE2E8F0)),
                shadowElevation = if (active) 2.dp else 0.dp
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        icon,
                        contentDescription = tabLabel,
                        tint = if (active) Color.White else Color(0xFF64748B),
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        tabLabel,
                        color = if (active) Color.White else Color(0xFF334155),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = if (active) FontWeight.Bold else FontWeight.Medium
                    )
                }
            }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.billsTab(
    bills: List<MaintenanceBillDto>,
    viewModel: AdminMaintenanceViewModel,
    openDialog: (MaintenanceDialog) -> Unit
) {
    item {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Monthly Maintenance Bills",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF0F172A)
                    )
                    Text(
                        text = "Total ${bills.size} bill(s) generated",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF64748B)
                    )
                }
                Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { openDialog(MaintenanceDialog.Generate) },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SocietyBlue40),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                    ) {
                        Icon(Icons.Filled.Add, contentDescription = "Generate Bills", modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Generate Bills", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                    }
                    OutlinedButton(
                        onClick = { openDialog(MaintenanceDialog.ManualBill) },
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                    ) {
                        Text("Specific Resident", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }

    if (bills.isEmpty()) {
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(
                    modifier = Modifier
                        .padding(32.dp)
                        .fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(Icons.Filled.ReceiptLong, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(8.dp))
                    Text("No bills generated yet", style = MaterialTheme.typography.titleSmall, color = Color(0xFF475467))
                    Text("Tap 'Generate Bills' above to create bills for all flats.", style = MaterialTheme.typography.bodySmall, color = Color(0xFF94A3B8))
                }
            }
        }
    } else {
        items(bills, key = { it.id ?: it.hashCode().toString() }) { bill ->
            AdminBillCard(bill = bill, openDialog = openDialog)
        }
    }
}

@Composable
private fun AdminBillCard(
    bill: MaintenanceBillDto,
    openDialog: (MaintenanceDialog) -> Unit
) {
    val remaining = (bill.remainingDue ?: bill.currentDue ?: bill.remainingAmount ?: bill.totalAmount).toMoneyDecimal()
    val paid = bill.paidAmount.toMoneyDecimal()
    val penalty = (bill.penaltyAmount ?: bill.lateFee).toMoneyDecimal()
    val writeOff = (bill.writeOffAmount ?: bill.maintenanceWriteOffAmount).toMoneyDecimal()
    val statusStr = (bill.paymentStatus ?: bill.status ?: "Unpaid").trim()
    val statusColor = when (statusStr.lowercase()) {
        "paid" -> Color(0xFF1B8F4D)
        "partial", "partially_paid" -> Color(0xFF0B56D9)
        "overdue" -> Color(0xFFD14343)
        "written_off", "written off" -> Color(0xFF6B7280)
        else -> Color(0xFFC06A00)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            // Header Row: Resident Name & Flat + Status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = bill.residentName ?: "Flat ${bill.flatNo ?: "—"}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF0F172A)
                    )
                    Text(
                        text = "Flat ${bill.flatNo ?: "—"} • ${monthName(bill.month?.toIntOrNull() ?: 1)} ${bill.year ?: ""}",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF64748B)
                    )
                }
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = statusColor.copy(alpha = 0.12f)
                ) {
                    Text(
                        text = statusStr,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = statusColor
                    )
                }
            }

            HorizontalDivider(color = Color(0xFFF1F5F9))

            // Amount Breakdown Grid Row 1
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("Base Amount", style = MaterialTheme.typography.labelSmall, color = Color(0xFF94A3B8))
                    Text(DashboardFormatters.money(bill.amount.toMoneyDecimal()), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                }
                Column {
                    Text("Penalty", style = MaterialTheme.typography.labelSmall, color = Color(0xFF94A3B8))
                    Text(DashboardFormatters.money(penalty), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = if (penalty > BigDecimal.ZERO) Color(0xFFD14343) else Color(0xFF1E293B))
                }
                Column {
                    Text("Total Due", style = MaterialTheme.typography.labelSmall, color = Color(0xFF94A3B8))
                    Text(DashboardFormatters.money(bill.totalAmount.toMoneyDecimal()), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                }
            }

            // Amount Breakdown Grid Row 2
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("Paid", style = MaterialTheme.typography.labelSmall, color = Color(0xFF94A3B8))
                    Text(DashboardFormatters.money(paid), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = Color(0xFF1B8F4D))
                }
                Column {
                    Text("Write Off", style = MaterialTheme.typography.labelSmall, color = Color(0xFF94A3B8))
                    Text(DashboardFormatters.money(writeOff), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = Color(0xFF0B56D9))
                }
                Column {
                    Text("Remaining", style = MaterialTheme.typography.labelSmall, color = Color(0xFF94A3B8))
                    Text(DashboardFormatters.money(remaining), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = if (remaining > BigDecimal.ZERO) Color(0xFFD14343) else Color(0xFF1B8F4D))
                }
            }

            HorizontalDivider(color = Color(0xFFF1F5F9))

            // Action Buttons Row (Edit, Write Off, Delete)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedButton(
                    onClick = { openDialog(MaintenanceDialog.EditBill(bill)) },
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                    modifier = Modifier.height(34.dp)
                ) {
                    Text("Edit", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold)
                }

                Spacer(Modifier.width(8.dp))

                OutlinedButton(
                    onClick = { openDialog(MaintenanceDialog.WriteOff(bill)) },
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                    modifier = Modifier.height(34.dp)
                ) {
                    Text("Write Off", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, color = Color(0xFF0B56D9))
                }

                Spacer(Modifier.width(8.dp))

                OutlinedButton(
                    onClick = { openDialog(MaintenanceDialog.DeleteBill(bill)) },
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFD14343)),
                    border = BorderStroke(1.dp, Color(0xFFFCA5A5)),
                    modifier = Modifier.height(34.dp)
                ) {
                    Text("Delete", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, color = Color(0xFFD14343))
                }
            }
        }
    }
}

@Composable
private fun AdminMaintenanceBottomBar(
    selectedTab: String,
    onTabSelected: (String) -> Unit
) {
    val items = listOf(
        "Bills" to Icons.Filled.ReceiptLong,
        "Expenses" to Icons.Filled.Wallet,
        "Reports" to Icons.Filled.TrendingUp,
        "Settings" to Icons.Filled.Settings
    )

    NavigationBar(
        containerColor = Color.White,
        tonalElevation = 8.dp
    ) {
        items.forEach { (tabKey, icon) ->
            val active = selectedTab == tabKey
            NavigationBarItem(
                selected = active,
                onClick = { onTabSelected(tabKey) },
                icon = {
                    Icon(
                        imageVector = icon,
                        contentDescription = tabKey
                    )
                },
                label = {
                    Text(
                        text = tabKey,
                        fontWeight = if (active) FontWeight.Bold else FontWeight.Normal
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = SocietyBlue40,
                    selectedTextColor = SocietyBlue40,
                    indicatorColor = Color(0xFFEFF6FF),
                    unselectedIconColor = Color(0xFF64748B),
                    unselectedTextColor = Color(0xFF64748B)
                )
            )
        }
    }
}

@Composable
private fun AdminBillRowCard(
    bill: MaintenanceBillDto,
    onViewDetails: () -> Unit,
    onMarkPaid: () -> Unit,
    onReminder: () -> Unit,
    onWaive: () -> Unit,
    onWriteOff: () -> Unit,
    onDelete: () -> Unit
) {
    val status = bill.paymentStatus ?: bill.status ?: "Pending"
    val paid = status.isApprovedStatus()
    val settledByWriteOff = status.normalizePaymentStatus() in setOf("WRITTEN_OFF", "SETTLED")
    val verifying = status.isVerificationPendingStatus()
    val overdue = isBillOverdue(bill) && !paid && !settledByWriteOff

    var showMenu by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Column(modifier = Modifier.widthIn(min = 100.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = "${monthName(bill.month)} ${bill.year.orEmpty()}".trim(),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = bill.title ?: "Monthly",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Column(modifier = Modifier.widthIn(min = 120.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = "Flat ${bill.flatNo ?: "-"}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = bill.residentName ?: "Resident",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1
                )
            }

            Column(modifier = Modifier.widthIn(min = 100.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = DashboardFormatters.date(bill.dueDate ?: bill.maintenanceDueDate),
                    style = MaterialTheme.typography.bodySmall,
                    color = if (overdue) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = if (overdue) FontWeight.Bold else FontWeight.Normal
                )
                if (overdue) {
                    Text("Overdue", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                }
            }

            Text(
                text = DashboardFormatters.money(bill.expectedPayableAmount()),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.widthIn(min = 90.dp)
            )

            val displayStatus = when {
                status.contains("partially", ignoreCase = true) -> "Partially Paid"
                status.contains("clarification", ignoreCase = true) -> "Clarification Required"
                status.contains("waived", ignoreCase = true) -> "Waived"
                settledByWriteOff -> "Written Off"
                paid -> "Paid"
                verifying -> "Verification Pending"
                overdue -> "Overdue"
                status.equals("cancelled", ignoreCase = true) -> "Cancelled"
                else -> "Unpaid"
            }
            Box(modifier = Modifier.widthIn(min = 110.dp)) {
                StatusBadge(status = displayStatus)
            }

            Row(horizontalArrangement = Arrangement.spacedBy(2.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onViewDetails, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Filled.Visibility, contentDescription = "View Details", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                }
                Box {
                    IconButton(onClick = { showMenu = true }, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Filled.MoreVert, contentDescription = "More actions", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                    }
                    androidx.compose.material3.DropdownMenu(
                        expanded = showMenu,
                        onDismissRequest = { showMenu = false }
                    ) {
                        androidx.compose.material3.DropdownMenuItem(
                            text = { Text("Mark Paid") },
                            onClick = { showMenu = false; onMarkPaid() }
                        )
                        androidx.compose.material3.DropdownMenuItem(
                            text = { Text("Send Reminder") },
                            onClick = { showMenu = false; onReminder() }
                        )
                        androidx.compose.material3.DropdownMenuItem(
                            text = { Text("Apply Waiver") },
                            onClick = { showMenu = false; onWaive() }
                        )
                        androidx.compose.material3.DropdownMenuItem(
                            text = { Text("Write Off") },
                            onClick = { showMenu = false; onWriteOff() }
                        )
                        androidx.compose.material3.DropdownMenuItem(
                            text = { Text("Cancel Bill", color = MaterialTheme.colorScheme.error) },
                            onClick = { showMenu = false; onDelete() }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AdminStatusBadge(statusText: String, fg: Color = Color.Unspecified, bg: Color = Color.Unspecified) {
    StatusBadge(status = statusText)
}

@Composable
private fun RecentPaymentsVerificationCard(
    verifications: List<MaintenancePaymentVerificationDto>,
    onViewAll: () -> Unit,
    viewModel: AdminMaintenanceViewModel
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Recent Payments (Pending Verification)",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF0F172A)
                )
                TextButton(onClick = onViewAll) {
                    Text("View All", color = SocietyBlue40, fontWeight = FontWeight.Bold)
                }
            }

            verifications.forEachIndexed { index, item ->
                RecentPaymentRowItem(
                    verification = item,
                    onApprove = { item.submissionId?.let { id -> viewModel.updatePayment(id, "APPROVED") } },
                    onReject = { item.submissionId?.let { id -> viewModel.updatePayment(id, "REJECTED", "Rejected by admin") } }
                )
                if (index < verifications.size - 1) {
                    HorizontalDivider(color = Color(0xFFF1F5F9))
                }
            }
        }
    }
}

@Composable
private fun RecentPaymentRowItem(
    verification: MaintenancePaymentVerificationDto,
    onApprove: () -> Unit,
    onReject: () -> Unit
) {
    val name = verification.residentName ?: "Resident"
    val initials = name.split(" ").mapNotNull { it.firstOrNull()?.uppercaseChar() }.take(2).joinToString("").ifEmpty { "R" }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.widthIn(min = 140.dp)
        ) {
            Surface(
                modifier = Modifier.size(40.dp),
                shape = CircleShape,
                color = MaterialTheme.colorScheme.surfaceVariant
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(initials, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge)
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Text("Flat ${verification.flatNumber ?: "-"}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Text(
            text = DashboardFormatters.money(verification.amount.toMoneyDecimal()),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.widthIn(min = 90.dp)
        )

        Column(modifier = Modifier.widthIn(min = 100.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text = DashboardFormatters.date(verification.paymentDate ?: verification.submittedAt),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = verification.paymentMethod ?: "UPI",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onApprove, modifier = Modifier.size(34.dp)) {
                Icon(Icons.Filled.Check, contentDescription = "Approve", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
            }
            IconButton(onClick = onReject, modifier = Modifier.size(34.dp)) {
                Icon(Icons.Filled.Close, contentDescription = "Reject", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(20.dp))
            }
        }
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
                KeyValue("${payment.residentName ?: "Resident"} \u2022 Flat ${payment.flatNo ?: "-"}", DashboardFormatters.money(payment.amount.toMoneyDecimal()))
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
                KeyValue("Flat ${bill.flatNo ?: "-"} \u2022 ${bill.residentName ?: "Resident"}", DashboardFormatters.money(bill.expectedPayableAmount()))
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
            Text("Flat ${payment.flatNo ?: "-"} \u2022 ${DashboardFormatters.money(payment.amount.toMoneyDecimal())}")
            Text("Method: ${payment.paymentMethod ?: "-"} \u2022 Txn: ${payment.transactionId ?: "-"}")
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
    verifications: List<MaintenancePaymentVerificationDto>,
    viewModel: AdminMaintenanceViewModel
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val submitting = state.submitting
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var selectedPaymentIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var screenshotPayment by remember { mutableStateOf<MaintenancePaymentVerificationDto?>(null) }
    var detailsPayment by remember { mutableStateOf<MaintenancePaymentVerificationDto?>(null) }
    var confirmApprovePayment by remember { mutableStateOf<MaintenancePaymentVerificationDto?>(null) }
    var confirmRejectPayment by remember { mutableStateOf<MaintenancePaymentVerificationDto?>(null) }
    var confirmClarifyPayment by remember { mutableStateOf<MaintenancePaymentVerificationDto?>(null) }
    var bulkReject by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var statusFilter by remember { mutableStateOf("All") }

    val sortedVerifications = remember(verifications) {
        verifications.sortedWith(
            compareByDescending<MaintenancePaymentVerificationDto> { it.verificationStatus.isPaymentVerificationPending() }
                .thenByDescending { it.submittedAt ?: "" }
        )
    }

    val filteredVerifications = remember(sortedVerifications, searchQuery, statusFilter) {
        sortedVerifications.filter { payment ->
            val statusMatches = when (statusFilter) {
                "Pending" -> payment.verificationStatus.isPaymentVerificationPending()
                "Approved" -> payment.verificationStatus.normalizePaymentStatus() == "APPROVED"
                "Rejected" -> payment.verificationStatus.isPaymentVerificationRejected()
                "Clarification" -> payment.verificationStatus.normalizePaymentStatus() == "NEEDS_CLARIFICATION"
                else -> true
            }
            val query = searchQuery.trim().lowercase()
            val searchMatches = query.isBlank() ||
                payment.residentName?.lowercase()?.contains(query) == true ||
                payment.flatNumber?.lowercase()?.contains(query) == true ||
                payment.title?.lowercase()?.contains(query) == true ||
                payment.transactionReference?.lowercase()?.contains(query) == true ||
                payment.utrNumber?.lowercase()?.contains(query) == true
            statusMatches && searchMatches
        }
    }

    val pendingVerifications = sortedVerifications.filter { it.verificationStatus.isPaymentVerificationPending() }
    val selectedPending = pendingVerifications.filter { it.submissionId in selectedPaymentIds }

    val todayStr = remember {
        java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())
    }
    val pendingCount = remember(verifications) {
        verifications.count { it.verificationStatus.isPaymentVerificationPending() }
    }
    val approvedTodayCount = remember(verifications) {
        verifications.count {
            it.verificationStatus.normalizePaymentStatus() == "APPROVED" &&
            it.verifiedAt?.startsWith(todayStr) == true
        }
    }
    val rejectedTodayCount = remember(verifications) {
        verifications.count {
            it.verificationStatus.isPaymentVerificationRejected() &&
            it.rejectedAt?.startsWith(todayStr) == true
        }
    }
    val totalSubmittedAmount = remember(verifications) {
        verifications.fold(BigDecimal.ZERO) { sum, item ->
            sum + (item.submittedAmount?.toBigDecimalOrNull() ?: BigDecimal.ZERO)
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        VerificationSummarySection(verifications = verifications)

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search resident, flat, title, or UTR") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    trailingIcon = if (searchQuery.isNotEmpty()) {
                        {
                            IconButton(onClick = { searchQuery = "" }) {
                                Icon(Icons.Default.Close, contentDescription = "Clear")
                            }
                        }
                    } else null,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )

                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("All", "Pending", "Approved", "Rejected", "Clarification").forEach { label ->
                        FilterChip(
                            selected = statusFilter == label,
                            onClick = { statusFilter = label },
                            label = { Text(label) }
                        )
                    }
                }

                if (pendingVerifications.isNotEmpty()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextButton(
                            onClick = {
                                selectedPaymentIds = if (selectedPending.size == pendingVerifications.size) emptySet() else pendingVerifications.mapNotNull { it.submissionId }.toSet()
                            }
                        ) {
                            Text(if (selectedPending.size == pendingVerifications.size) "Clear Selection" else "Select All Pending")
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (selectedPending.isNotEmpty()) {
                                Button(
                                    onClick = {
                                        selectedPending.forEach { payment ->
                                            payment.submissionId?.let { viewModel.updatePayment(it, "Paid") }
                                        }
                                        selectedPaymentIds = emptySet()
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))
                                ) {
                                    Text("Approve (${selectedPending.size})")
                                }
                                Button(
                                    onClick = { bulkReject = true },
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                                ) {
                                    Text("Reject")
                                }
                            }
                        }
                    }
                }
            }
        }

        if (filteredVerifications.isEmpty()) {
            EmptyState("No $statusFilter payments", "Try another status or search term.")
        } else {
            filteredVerifications.forEach { payment ->
                PaymentVerificationCard(
                    verification = payment,
                    selected = payment.submissionId in selectedPaymentIds,
                    onSelectToggle = {
                        payment.submissionId?.let { id ->
                            selectedPaymentIds = if (id in selectedPaymentIds) selectedPaymentIds - id else selectedPaymentIds + id
                        }
                    },
                    onOpenScreenshot = { screenshotPayment = payment },
                    onViewDetails = { detailsPayment = payment }
                )
            }
        }
    }

    detailsPayment?.let { payment ->
        PaymentDetailsDialog(
            payment = payment,
            submitting = submitting,
            onDismiss = { detailsPayment = null },
            onApprove = { confirmApprovePayment = payment },
            onReject = { confirmRejectPayment = payment },
            onClarify = { confirmClarifyPayment = payment },
            onReconsider = {
                payment.submissionId?.let { id ->
                    viewModel.updatePayment(id, "Pending Verification", "Reconsidering payment verification")
                }
                detailsPayment = null
            }
        )
    }

    confirmApprovePayment?.let { payment ->
        AlertDialog(
            onDismissRequest = { confirmApprovePayment = null },
            title = { Text("Approve Payment") },
            text = { Text("Are you sure you want to approve this payment of \u20B9${payment.submittedAmount ?: "0"} by ${payment.residentName ?: "Resident"}?") },
            confirmButton = {
                Button(
                    onClick = {
                        payment.submissionId?.let { id ->
                            viewModel.updatePayment(id, "Paid")
                        }
                        confirmApprovePayment = null
                        detailsPayment = null
                    },
                    enabled = !submitting,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))
                ) {
                    Text("Approve")
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmApprovePayment = null }) { Text("Cancel") }
            }
        )
    }

    confirmRejectPayment?.let { payment ->
        var reason by remember(payment.submissionId) { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { confirmRejectPayment = null },
            title = { Text("Reject Payment") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Please enter a required reason for rejection. Resident will be notified to submit corrected proof.")
                    OutlinedTextField(
                        value = reason,
                        onValueChange = { reason = it },
                        placeholder = { Text("Reason for rejection") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        payment.submissionId?.let { id ->
                            viewModel.updatePayment(id, "Rejected", reason.ifBlank { "Payment proof rejected by admin" })
                        }
                        confirmRejectPayment = null
                        detailsPayment = null
                    },
                    enabled = reason.isNotBlank() && !submitting,
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Reject")
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmRejectPayment = null }) { Text("Cancel") }
            }
        )
    }

    confirmClarifyPayment?.let { payment ->
        var note by remember(payment.submissionId) { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { confirmClarifyPayment = null },
            title = { Text("Request Clarification") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Please enter a clear message detailing what needs to be corrected.")
                    OutlinedTextField(
                        value = note,
                        onValueChange = { note = it },
                        placeholder = { Text("Message for resident") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        payment.submissionId?.let { id ->
                            viewModel.updatePayment(id, "Needs Clarification", note.ifBlank { "Please provide clearer payment details." })
                        }
                        confirmClarifyPayment = null
                        detailsPayment = null
                    },
                    enabled = note.isNotBlank() && !submitting
                ) {
                    Text("Send Request")
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmClarifyPayment = null }) { Text("Cancel") }
            }
        )
    }

    screenshotPayment?.let { payment ->
        val proofImage = payment.proofImage()
        AlertDialog(
            onDismissRequest = { screenshotPayment = null },
            title = { Text("Payment Screenshot") },
            text = {
                if (!proofImage.isNullOrBlank()) {
                    PaymentProofImage(
                        image = proofImage,
                        contentDescription = "Payment screenshot",
                        modifier = Modifier.fillMaxWidth().height(480.dp).clip(RoundedCornerShape(14.dp)),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    Text("No image available")
                }
            },
            confirmButton = {
                Row {
                    if (!proofImage.isNullOrBlank()) {
                        TextButton(onClick = {
                            scope.launch {
                                val saved = savePaymentProof(context, proofImage, payment.submissionId)
                                Toast.makeText(context, if (saved) "Payment proof saved to Downloads" else "Unable to download payment proof", Toast.LENGTH_LONG).show()
                            }
                        }) {
                            Icon(Icons.Filled.Download, null)
                            Text("Download", modifier = Modifier.padding(start = 6.dp))
                        }
                    }
                    TextButton(onClick = { screenshotPayment = null }) { Text("Close") }
                }
            }
        )
    }

    if (bulkReject) {
        var reason by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { bulkReject = false },
            title = { Text("Reject Selected Payments") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Enter rejection reason for all selected payments.")
                    OutlinedTextField(
                        value = reason,
                        onValueChange = { reason = it },
                        placeholder = { Text("Rejection reason") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        selectedPending.forEach { payment ->
                            payment.submissionId?.let { viewModel.updatePayment(it, "Rejected", reason) }
                        }
                        selectedPaymentIds = emptySet()
                        bulkReject = false
                    },
                    enabled = reason.isNotBlank() && !submitting
                ) {
                    Text("Reject All")
                }
            },
            dismissButton = { TextButton(onClick = { bulkReject = false }) { Text("Cancel") } }
        )
    }
}

private suspend fun savePaymentProof(context: Context, image: String, paymentId: String?): Boolean = withContext(Dispatchers.IO) {
    runCatching {
        val (bytes, mime) = if (image.startsWith("data:", ignoreCase = true)) {
            val header = image.substringBefore(',')
            Base64.decode(image.substringAfter(','), Base64.DEFAULT) to header.substringAfter("data:").substringBefore(';').ifBlank { "image/jpeg" }
        } else {
            java.net.URL(image).openConnection().run {
                connectTimeout = 15_000
                readTimeout = 20_000
                getInputStream().use { it.readBytes() } to (contentType?.substringBefore(';') ?: "image/jpeg")
            }
        }
        val extension = when (mime.lowercase()) { "image/png" -> "png"; "image/webp" -> "webp"; else -> "jpg" }
        val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, "payment-proof-${paymentId ?: System.currentTimeMillis()}.$extension")
            put(MediaStore.Downloads.MIME_TYPE, mime)
            put(MediaStore.Downloads.RELATIVE_PATH, android.os.Environment.DIRECTORY_DOWNLOADS)
        }
        val uri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: error("Cannot create download")
        context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) } ?: error("Cannot write download")
    }.isSuccess
}

@Composable
private fun VerificationSummarySection(
    verifications: List<MaintenancePaymentVerificationDto>
) {
    val totalPending = verifications.count { it.verificationStatus.isPaymentVerificationPending() }
    val totalApproved = verifications.count { it.verificationStatus.normalizePaymentStatus() == "APPROVED" }
    val totalRejected = verifications.count { it.verificationStatus.isPaymentVerificationRejected() }
    val pendingAmount = verifications
        .filter { it.verificationStatus.isPaymentVerificationPending() }
        .fold(BigDecimal.ZERO) { sum, item -> sum + (item.submittedAmount?.toBigDecimalOrNull() ?: BigDecimal.ZERO) }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SummaryCard("Pending Review", totalPending.toString(), MaterialTheme.colorScheme.secondaryContainer)
            SummaryCard("Total Rejected", totalRejected.toString(), MaterialTheme.colorScheme.errorContainer)
        }
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SummaryCard("Total Approved", totalApproved.toString(), MaterialTheme.colorScheme.primaryContainer)
            SummaryCard("Pending Amount", "\u20B9${DashboardFormatters.money(pendingAmount).removePrefix("₹")}", MaterialTheme.colorScheme.surfaceVariant)
        }
    }
}

@Composable
private fun SummaryCard(title: String, value: String, containerColor: Color) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = containerColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(title, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.height(4.dp))
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun PaymentDetailsDialog(
    payment: MaintenancePaymentVerificationDto,
    submitting: Boolean,
    onDismiss: () -> Unit,
    onApprove: () -> Unit,
    onReject: () -> Unit,
    onClarify: () -> Unit,
    onReconsider: () -> Unit
) {
    androidx.compose.ui.window.Dialog(
        onDismissRequest = onDismiss,
        properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .fillMaxHeight(0.9f)
                .clip(RoundedCornerShape(24.dp)),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 6.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Payment Verification Details",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    SectionHeader("Resident Information")
                    DetailRow("Name", payment.residentName ?: "Unknown")
                    DetailRow("Phone", payment.residentPhone ?: "--")
                    DetailRow("Email", payment.residentEmail ?: "--")
                    DetailRow("Flat / Wing", "Flat ${payment.flatNumber ?: "--"} ${payment.wing?.let { "\u2022 Wing $it" } ?: ""}")

                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

                    SectionHeader("Bill Information")
                    DetailRow("Title / Month", "${payment.title ?: "Maintenance"} \u2022 ${monthName(payment.billingMonth?.toString())} ${payment.billingYear ?: ""}")
                    val maintAmt = payment.billAmount?.toDoubleOrNull() ?: 0.0
                    val penAmt = payment.penaltyAmount?.toDoubleOrNull() ?: 0.0
                    val totAmt = maintAmt + penAmt
                    DetailRow("Bill Amount", "\u20B9${payment.billAmount ?: "0"}")
                    DetailRow("Penalty / Late Fee", "\u20B9${payment.penaltyAmount ?: "0"}")
                    DetailRow("Total Payable", "\u20B9${totAmt.toInt()}")
                    DetailRow("Due Date", payment.dueDate?.take(10) ?: "--")
                    DetailRow("Verification Status", payment.verificationStatus ?: "Pending")

                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

                    SectionHeader("Submitted Payment Information")
                    DetailRow("Paid Amount", "\u20B9${payment.submittedAmount ?: "0"}")
                    DetailRow("Transaction ID / UTR", payment.transactionReference ?: "--")
                    DetailRow("Payment Date", payment.paymentDate?.take(10) ?: "--")
                    DetailRow("Submission Date", payment.submittedAt?.take(16)?.replace("T", " ") ?: "--")
                    DetailRow("Resident Note", payment.residentNote ?: "--")

                    val proofImage = payment.proofImage()
                    if (!proofImage.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Payment Proof Screenshot",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(220.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(12.dp))
                        ) {
                            PaymentProofImage(
                                image = proofImage,
                                contentDescription = "Screenshot",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Fit
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                val isPending = payment.verificationStatus.isPaymentVerificationPending()
                val isRejected = payment.verificationStatus.isPaymentVerificationRejected()

                if (isPending) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = onApprove,
                            modifier = Modifier.weight(1f),
                            enabled = !submitting,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))
                        ) {
                            Text(if (submitting) "Approving..." else "Approve", fontWeight = FontWeight.Bold)
                        }

                        OutlinedButton(
                            onClick = onReject,
                            modifier = Modifier.weight(1f),
                            enabled = !submitting,
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                        ) {
                            Text("Reject")
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    TextButton(
                        onClick = onClarify,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !submitting
                    ) {
                        Text("Request Clarification")
                    }
                } else if (isRejected) {
                    Button(
                        onClick = onReconsider,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !submitting,
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
                    ) {
                        Text(if (submitting) "Reconsidering..." else "Reconsider", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.primary
    )
    Spacer(modifier = Modifier.height(6.dp))
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun PaymentVerificationCard(
    verification: MaintenancePaymentVerificationDto,
    selected: Boolean,
    onSelectToggle: () -> Unit,
    onOpenScreenshot: () -> Unit,
    onViewDetails: () -> Unit
) {
    val isPending = verification.verificationStatus.isPaymentVerificationPending()
    val proofImage = verification.proofImage()

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onViewDetails() },
        colors = CardDefaults.cardColors(containerColor = if (selected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f) else MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(verification.residentName ?: "Unknown", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        text = "Flat ${verification.flatNumber ?: "--"} ${verification.wing?.let { "\u2022 Wing $it" } ?: ""}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (isPending) {
                    Checkbox(checked = selected, onCheckedChange = { onSelectToggle() }, modifier = Modifier.size(24.dp))
                }
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                InfoItem("Bill Month/Title", "${verification.title ?: "Maintenance"} \u2022 ${monthName(verification.billingMonth?.toString())} ${verification.billingYear ?: ""}")
                InfoItem("Bill ID", "BILL-${verification.billId ?: "--"}")
            }

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                InfoItem("Submitted Amount", "\u20B9${verification.submittedAmount ?: "0"}")
                InfoItem("Expected Amount", "\u20B9${verification.billAmount ?: "0"}")
            }

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                InfoItem("Ref/UTR", verification.transactionReference ?: "--")
                InfoItem("Payment Date", verification.paymentDate?.take(10) ?: "--")
            }

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                InfoItem("Submission Date", verification.submittedAt?.take(10) ?: "--")
                Box(modifier = Modifier.weight(1f))
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    StatusBadge(verification.verificationStatus ?: "Unknown")
                }

                if (!proofImage.isNullOrBlank()) {
                    PaymentProofImage(
                        image = proofImage,
                        contentDescription = "Thumbnail",
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(8.dp))
                            .clickable { onOpenScreenshot() },
                        contentScale = ContentScale.Crop,
                        isThumbnail = true
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = onViewDetails,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondaryContainer, contentColor = MaterialTheme.colorScheme.onSecondaryContainer)
                ) { Text("View Details") }
                if (!proofImage.isNullOrBlank()) {
                    OutlinedButton(onClick = onOpenScreenshot, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Filled.OpenInNew, null, modifier = Modifier.size(17.dp))
                        Text("Screenshot Proof", modifier = Modifier.padding(start = 5.dp))
                    }
                }
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
    val totalExpenseAmt = expenses.sumOf { it.amount?.toDoubleOrNull() ?: 0.0 }
    val bankExpenseAmt = expenses.filter { it.paymentMethod?.uppercase()?.contains("CASH") != true }.sumOf { it.amount?.toDoubleOrNull() ?: 0.0 }
    val cashExpenseAmt = expenses.filter { it.paymentMethod?.uppercase()?.contains("CASH") == true }.sumOf { it.amount?.toDoubleOrNull() ?: 0.0 }

    item {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Total Expenses: ${DashboardFormatters.money(totalExpenseAmt.toBigDecimal())}", fontWeight = FontWeight.Bold)
                    Text("${expenses.size} Records", style = MaterialTheme.typography.bodySmall)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Bank: ${DashboardFormatters.money(bankExpenseAmt.toBigDecimal())}", style = MaterialTheme.typography.bodySmall)
                    Text("Cash: ${DashboardFormatters.money(cashExpenseAmt.toBigDecimal())}", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }

    item { Button(onClick = { openDialog(MaintenanceDialog.Expense) }, modifier = Modifier.fillMaxWidth()) { Text("Record Expense") } }

    if (expenses.isEmpty()) item { EmptyState("No expenses recorded", "Tap Record Expense above to add society maintenance expenses.") }
    else items(expenses, key = { it.id ?: it.expenseNumber.orEmpty() }) { expense ->
        ManagementCard {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(expense.expenseNumber ?: "Expense", fontWeight = FontWeight.Bold)
                    Text("${expense.category ?: "-"} • Vendor: ${expense.vendor ?: "-"}", style = MaterialTheme.typography.bodyMedium)
                    Text("${DashboardFormatters.date(expense.expenseDate)} • Method: ${expense.paymentMethod ?: "Bank Transfer"}", style = MaterialTheme.typography.bodySmall)
                    expense.description?.takeIf { it.isNotBlank() }?.let { desc ->
                        Text("Note: $desc", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(DashboardFormatters.money(expense.amount.toMoneyDecimal()), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error)
                    TextButton(onClick = { expense.id?.let(viewModel::deleteExpense) }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
                }
            }
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
            Text("${DashboardFormatters.money(category.amount.toMoneyDecimal())} \u2022 ${category.calculationType ?: "FIXED"} \u2022 ${if (category.active == false) "Inactive" else "Active"}")
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
            Text("${dispute.residentName ?: "Resident"} \u2022 Flat ${dispute.flatNo ?: "-"}")
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
    onEdit: () -> Unit = {},
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
                        "${bill.residentName ?: "My Bill"} \u2022 Flat ${bill.flatNo ?: "-"}",
                        color = Color(0xFF475467),
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        "Month ${bill.month ?: "-"} / ${bill.year ?: "-"} \u2022 Due ${DashboardFormatters.date(bill.dueDate ?: bill.maintenanceDueDate)}",
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
                    OutlinedButton(onClick = onEdit, shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Filled.Edit, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Edit")
                    }
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
            KeyValue("Resident", "${payment.residentName ?: "-"} \u2022 Flat ${payment.flatNo ?: "-"}")
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
                TextButton(onClick = { openDialog(MaintenanceDialog.ApplyWaiver(bill)) }) { Text("Waive Penalty") }
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
            KeyValue("Resident", "${waiver.residentName ?: "-"} \u2022 Flat ${waiver.flatNo ?: "-"}")
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
    data class EditBill(val bill: MaintenanceBillDto) : MaintenanceDialog
    data class DeleteBill(val bill: MaintenanceBillDto) : MaintenanceDialog
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

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun MaintenanceDialogHost(dialog: MaintenanceDialog?, onDismiss: () -> Unit, viewModel: AdminMaintenanceViewModel) {
    val viewState by viewModel.state.collectAsStateWithLifecycle()
    when (dialog) {
        MaintenanceDialog.Generate -> SimpleFormDialog("Generate Billing Cycle", onDismiss) {
            val nextCycle = viewState.data?.nextBillingCycle
            val billingCycles = viewState.data?.billingCycles.orEmpty()
            val settings = viewState.data?.settings

            val monthNames = listOf(
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            )

            val nextMonth = nextCycle?.nextMonth ?: LocalDate.now().monthValue
            val nextYear = nextCycle?.nextYear ?: LocalDate.now().year
            val nextMonthName = monthNames.getOrNull(nextMonth - 1) ?: "Unknown"
            val graceDays = nextCycle?.gracePeriodDays ?: settings?.graceDays?.toIntOrNull() ?: 10
            val suggestedDueDate = nextCycle?.suggestedDueDate ?: ""
            val penaltyStartDate = nextCycle?.suggestedPenaltyStartDate ?: ""
            val isFirstCycle = nextCycle?.isFirstCycle == true

            val lastGenMonth = nextCycle?.lastGeneratedMonth
            val lastGenYear = nextCycle?.lastGeneratedYear

            // Current / last cycle info
            if (lastGenMonth != null && lastGenYear != null) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFFEFF6FF),
                    border = BorderStroke(1.dp, Color(0xFFBFDBFE)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = "Last Generated Cycle",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFF1D4ED8),
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "${monthNames.getOrNull(lastGenMonth - 1)} $lastGenYear",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF1E40AF),
                            fontWeight = FontWeight.Bold
                        )
                        if (billingCycles.isNotEmpty()) {
                            val totalGenerated = billingCycles.firstOrNull()?.generatedBillCount ?: 0
                            Text(
                                text = "$totalGenerated bills generated • ${billingCycles.size} cycles total",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF3B82F6)
                            )
                        }
                    }
                }
            } else if (isFirstCycle) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFFF0FDF4),
                    border = BorderStroke(1.dp, Color(0xFFBBF7D0)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Info, contentDescription = null, tint = Color(0xFF16A34A), modifier = Modifier.size(18.dp))
                        Text(
                            text = "First billing cycle — no previous cycles found.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF166534)
                        )
                    }
                }
            }

            // Next cycle to generate — locked, read-only
            Text(
                text = "Next Billing Cycle",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = "The system enforces strict sequential billing. Only the next eligible month can be generated.",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF64748B)
            )

            var customDueDate by remember { mutableStateOf(suggestedDueDate) }
            var customGraceDays by remember { mutableStateOf(graceDays.toString()) }

            LaunchedEffect(suggestedDueDate) {
                if (customDueDate.isBlank()) customDueDate = suggestedDueDate
            }

            OutlinedTextField(
                value = "$nextMonthName $nextYear",
                onValueChange = {},
                readOnly = true,
                enabled = false,
                label = { Text("Billing period (locked)") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = customDueDate,
                    onValueChange = { customDueDate = it },
                    label = { Text("Due date") },
                    placeholder = { Text("YYYY-MM-DD") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                    supportingText = { Text("Format: YYYY-MM-DD", style = MaterialTheme.typography.labelSmall) }
                )
                OutlinedTextField(
                    value = customGraceDays,
                    onValueChange = { if (it.length <= 2 && it.all { c -> c.isDigit() }) customGraceDays = it },
                    label = { Text("Grace days") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                    supportingText = { Text("Days after due", style = MaterialTheme.typography.labelSmall) }
                )
            }

            if (customDueDate.isNotBlank() && customGraceDays.isNotBlank()) {
                val graceDaysInt = customGraceDays.toIntOrNull() ?: graceDays
                val computedPenaltyDate = try {
                    val due = java.time.LocalDate.parse(customDueDate)
                    due.plusDays(graceDaysInt.toLong()).toString()
                } catch (e: Exception) { "" }
                if (computedPenaltyDate.isNotBlank()) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFFFFBEB),
                        border = BorderStroke(1.dp, Color(0xFFFDE68A)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Warning, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(18.dp))
                            Text(
                                text = "Penalty applies from: $computedPenaltyDate",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color(0xFF92400E),
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }

            Button(
                onClick = {
                    viewModel.generateBillingCycle(
                        month = nextMonth,
                        year = nextYear,
                        dueDate = customDueDate.ifBlank { suggestedDueDate }
                    )
                    onDismiss()
                },
                enabled = !viewState.submitting && nextMonth in 1..12 && nextYear >= 2000,
                modifier = Modifier.fillMaxWidth(),
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF1D4ED8)
                )
            ) {
                if (viewState.submitting) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                }
                Text(if (viewState.submitting) "Generating…" else "Generate $nextMonthName $nextYear Bills")
            }
        }

        MaintenanceDialog.ManualBill -> SimpleFormDialog("Create Manual Bill", onDismiss) {
            val today = LocalDate.now()
            val settings = viewState.data?.settings
            val dueDay = settings?.dueDay?.toIntOrNull()?.coerceIn(1, today.lengthOfMonth()) ?: 10
            val residents = viewState.residents.filter { !it.id.isNullOrBlank() && !it.flatId.isNullOrBlank() }
            var title by remember { mutableStateOf(settings?.title ?: "Monthly Maintenance") }
            var amount by remember { mutableStateOf(settings?.fixedAmount.orEmpty()) }
            var selectedResident by remember { mutableStateOf<com.example.application.data.remote.dto.UserSummaryDto?>(null) }
            var residentExpanded by remember { mutableStateOf(false) }
            val due = today.withDayOfMonth(dueDay).toString()
            BasicAppTextField(title, { title = it }, "Title")
            OutlinedTextField(value = "${monthName(today.monthValue)} ${today.year}", onValueChange = {}, readOnly = true, label = { Text("System billing cycle") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = due, onValueChange = {}, readOnly = true, label = { Text("Due date from settings") }, modifier = Modifier.fillMaxWidth())
            BasicAppTextField(amount, { amount = it }, "Amount")
            ExposedDropdownMenuBox(expanded = residentExpanded, onExpandedChange = { residentExpanded = !residentExpanded }) {
                OutlinedTextField(
                    value = selectedResident?.let { "${it.name ?: "Resident"} • ${it.wing.orEmpty()}-${it.flatNo ?: "Flat"}" }.orEmpty(),
                    onValueChange = {}, readOnly = true, label = { Text("Select resident") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(residentExpanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor()
                )
                ExposedDropdownMenu(expanded = residentExpanded, onDismissRequest = { residentExpanded = false }) {
                    residents.forEach { resident ->
                        DropdownMenuItem(text = { Text("${resident.name ?: "Resident"} • ${resident.wing.orEmpty()}-${resident.flatNo ?: "Flat"}") }, onClick = { selectedResident = resident; residentExpanded = false })
                    }
                }
            }
            if (residents.isEmpty()) Text("No approved resident with an assigned flat is available.", color = MaterialTheme.colorScheme.error)
            Button(
                onClick = {
                    val resident = selectedResident ?: return@Button
                    viewModel.createManualBill(title, today.monthValue, today.year, due, amount, resident.id, resident.flatId)
                    onDismiss()
                },
                enabled = selectedResident != null && amount.toDoubleOrNull()?.let { it > 0 } == true && !viewState.submitting,
                modifier = Modifier.fillMaxWidth()
            ) { Text("Create Bill for Resident") }
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

            val maintAmountTotal = bill.amount.toMoneyDecimal()
            val penaltyAmountTotal = (bill.penaltyAmount ?: bill.lateFee).toMoneyDecimal()
            val maintWriteOffSoFar = bill.maintenanceWriteOffAmount.toMoneyDecimal()
            val penaltyWriteOffSoFar = bill.penaltyWriteOffAmount.toMoneyDecimal()

            val maxMaintWriteOff = (maintAmountTotal - maintWriteOffSoFar).coerceAtLeast(BigDecimal.ZERO).coerceAtMost(currentDue)
            val maxPenaltyWriteOff = (penaltyAmountTotal - penaltyWriteOffSoFar).coerceAtLeast(BigDecimal.ZERO).coerceAtMost(currentDue)

            val scope = rememberCoroutineScope()
            val context = LocalContext.current
            var submitting by remember { mutableStateOf(false) }
            var errorText by remember { mutableStateOf<String?>(null) }

            var scopeLabel by remember { mutableStateOf("Full Due") }
            val scopeType = when (scopeLabel) {
                "Full Due" -> "FULL"
                "Maintenance Only" -> "MAINTENANCE"
                "Penalty Only" -> "PENALTY"
                "Custom Split" -> "BOTH"
                else -> "FULL"
            }

            var maintWriteOffInput by remember { mutableStateOf("") }
            var penaltyWriteOffInput by remember { mutableStateOf("") }
            var reason by remember { mutableStateOf(reasons.first()) }
            var remarks by remember { mutableStateOf("") }

            val writeOffMaint = when (scopeType) {
                "FULL" -> maxMaintWriteOff
                "MAINTENANCE" -> maintWriteOffInput.toMoneyDecimal().coerceAtMost(maxMaintWriteOff)
                "BOTH" -> maintWriteOffInput.toMoneyDecimal().coerceAtMost(maxMaintWriteOff)
                else -> BigDecimal.ZERO
            }

            val writeOffPenalty = when (scopeType) {
                "FULL" -> (currentDue - writeOffMaint).coerceAtLeast(BigDecimal.ZERO).coerceAtMost(maxPenaltyWriteOff)
                "PENALTY" -> penaltyWriteOffInput.toMoneyDecimal().coerceAtMost(maxPenaltyWriteOff)
                "BOTH" -> penaltyWriteOffInput.toMoneyDecimal().coerceAtMost(maxPenaltyWriteOff)
                else -> BigDecimal.ZERO
            }

            val totalWriteOff = (writeOffMaint + writeOffPenalty).coerceAtMost(currentDue)
            val finalDue = (currentDue - totalWriteOff).coerceAtLeast(BigDecimal.ZERO)

            val validationError = when {
                totalWriteOff <= BigDecimal.ZERO && scopeType != "FULL" -> "Write-off amount must be greater than zero"
                totalWriteOff > currentDue -> "Total write-off exceeds the current due amount"
                scopeType == "MAINTENANCE" && maintWriteOffInput.toMoneyDecimal() > maxMaintWriteOff -> "Maintenance write-off exceeds remaining maintenance balance of ${DashboardFormatters.money(maxMaintWriteOff)}"
                scopeType == "PENALTY" && penaltyWriteOffInput.toMoneyDecimal() > maxPenaltyWriteOff -> "Penalty write-off exceeds remaining penalty balance of ${DashboardFormatters.money(maxPenaltyWriteOff)}"
                scopeType == "BOTH" && maintWriteOffInput.toMoneyDecimal() > maxMaintWriteOff -> "Maintenance write-off exceeds remaining maintenance balance of ${DashboardFormatters.money(maxMaintWriteOff)}"
                scopeType == "BOTH" && penaltyWriteOffInput.toMoneyDecimal() > maxPenaltyWriteOff -> "Penalty write-off exceeds remaining penalty balance of ${DashboardFormatters.money(maxPenaltyWriteOff)}"
                else -> null
            }

            Text("This keeps the bill record and creates an admin audit entry.", color = Color(0xFF475467))
            KeyValue("Resident", bill.residentName ?: "-")
            KeyValue("Flat", bill.flatNo ?: "-")
            KeyValue("Original Amount", DashboardFormatters.money(originalAmount))
            KeyValue("Penalty Balance", DashboardFormatters.money(maxPenaltyWriteOff))
            KeyValue("Paid", DashboardFormatters.money(bill.paidAmount.toMoneyDecimal()))
            KeyValue("Current Due", DashboardFormatters.money(currentDue))

            Text("Write-off type", fontWeight = FontWeight.SemiBold)
            WriteOffChoiceChips(listOf("Full Due", "Maintenance Only", "Penalty Only", "Custom Split"), scopeLabel) { scopeLabel = it }

            if (scopeType == "MAINTENANCE" || scopeType == "BOTH") {
                BasicAppTextField(maintWriteOffInput, { maintWriteOffInput = it }, "Maintenance amount (Max ${DashboardFormatters.money(maxMaintWriteOff)})")
            }

            if (scopeType == "PENALTY" || scopeType == "BOTH") {
                BasicAppTextField(penaltyWriteOffInput, { penaltyWriteOffInput = it }, "Penalty amount (Max ${DashboardFormatters.money(maxPenaltyWriteOff)})")
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
                    KeyValue("Write-off", DashboardFormatters.money(totalWriteOff))
                    KeyValue("Final Due", DashboardFormatters.money(finalDue))
                    Text("Resident side will only show updated due/status, not admin reason or remarks.", color = Color(0xFF475467))
                }
            }

            if (errorText != null) {
                Text(errorText!!, color = Color.Red, style = MaterialTheme.typography.bodySmall)
            }
            if (validationError != null) {
                Text(validationError, color = Color(0xFFD9381E), style = MaterialTheme.typography.bodySmall)
            }

            Button(
                onClick = {
                    bill.id?.let { billId ->
                        scope.launch {
                            submitting = true
                            errorText = null
                            val res = viewModel.createWriteOffDirect(
                                id = billId,
                                type = scopeType,
                                amount = if (scopeType == "FULL") null else totalWriteOff.toPlainString(),
                                maintenanceAmount = if (scopeType == "MAINTENANCE" || scopeType == "BOTH") writeOffMaint.toPlainString() else null,
                                penaltyAmount = if (scopeType == "PENALTY" || scopeType == "BOTH") writeOffPenalty.toPlainString() else null,
                                reason = reason,
                                remarks = remarks
                            )
                            submitting = false
                            when (res) {
                                is NetworkResult.Success -> {
                                    Toast.makeText(context, "Write-off completed successfully", Toast.LENGTH_LONG).show()
                                    viewModel.load(refresh = true)
                                    onDismiss()
                                }
                                is NetworkResult.Error -> {
                                    errorText = viewModel.userMessageFor(res.error)
                                }
                                NetworkResult.Loading -> Unit
                            }
                        }
                    }
                },
                enabled = !submitting && bill.id != null && currentDue > BigDecimal.ZERO && totalWriteOff > BigDecimal.ZERO && validationError == null,
                modifier = Modifier.fillMaxWidth()
            ) { Text(if (submitting) "Applying..." else "Apply Write-off") }
        }
        is MaintenanceDialog.EditBill -> SimpleFormDialog("Edit Maintenance Bill", onDismiss) {
            val bill = dialog.bill
            var amount by remember { mutableStateOf(bill.amount ?: "") }
            var reason by remember { mutableStateOf("") }
            Text("Edit base maintenance amount for Flat ${bill.flatNo ?: "-"}", style = MaterialTheme.typography.bodySmall, color = Color(0xFF64748B))
            KeyValue("Resident", bill.residentName ?: "-")
            KeyValue("Current Base Amount", DashboardFormatters.money(bill.amount.toMoneyDecimal()))
            OutlinedTextField(
                value = amount,
                onValueChange = { amount = it },
                label = { Text("Maintenance Base Amount (₹)") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
            )
            OutlinedTextField(
                value = reason,
                onValueChange = { reason = it },
                label = { Text("Reason for Override (Optional)") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2
            )
            Button(
                onClick = {
                    bill.id?.let { id -> viewModel.editBill(id, amount, reason) }
                    onDismiss()
                },
                enabled = amount.isNotBlank() && amount.toDoubleOrNull() != null,
                modifier = Modifier.fillMaxWidth()
            ) { Text("Save Changes") }
        }
        is MaintenanceDialog.DeleteBill -> SimpleFormDialog("Delete Maintenance Bill", onDismiss) {
            val bill = dialog.bill
            Text(
                "Are you sure you want to delete the bill for Flat ${bill.flatNo ?: "-"} (${bill.residentName ?: "Resident"}) for ${monthName(bill.month?.toIntOrNull() ?: 1)} ${bill.year ?: ""}? This action cannot be undone.",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF0F172A)
            )
            Spacer(Modifier.height(8.dp))
            Button(
                onClick = {
                    bill.id?.let { id -> viewModel.deleteBill(id) }
                    onDismiss()
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
            ) { Text("Delete Bill Permanently") }
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
            val categories = listOf("Repairs", "Water", "Electricity", "Lift", "Security", "Cleaning", "Event", "Other")
            val methods = listOf("Bank Transfer", "Cash")

            var selectedCategory by remember { mutableStateOf("Repairs") }
            var customCategory by remember { mutableStateOf("") }
            var vendor by remember { mutableStateOf("") }
            var amount by remember { mutableStateOf("") }
            var date by remember { mutableStateOf(LocalDate.now().toString()) }
            var selectedMethod by remember { mutableStateOf("Bank Transfer") }
            var description by remember { mutableStateOf("") }
            var formError by remember { mutableStateOf<String?>(null) }

            formError?.let { err ->
                Text(err, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            Text("Category *", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                categories.forEach { cat ->
                    FilterChip(
                        selected = selectedCategory == cat,
                        onClick = { selectedCategory = cat; formError = null },
                        label = { Text(cat) }
                    )
                }
            }

            if (selectedCategory == "Other") {
                BasicAppTextField(customCategory, { customCategory = it; formError = null }, "Custom Category Name *")
            }

            BasicAppTextField(vendor, { vendor = it; formError = null }, "Vendor / Payee Name *")
            BasicAppTextField(amount, { amount = it; formError = null }, "Amount (₹) *")
            BasicAppTextField(date, { date = it; formError = null }, "Expense Date (YYYY-MM-DD) *")

            Text("Payment Method *", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                methods.forEach { m ->
                    FilterChip(
                        selected = selectedMethod == m,
                        onClick = { selectedMethod = m; formError = null },
                        label = { Text(m) }
                    )
                }
            }

            BasicAppTextField(description, { description = it }, "Description / Remarks (Optional)")

            Button(
                onClick = {
                    val catVal = if (selectedCategory == "Other") customCategory.trim() else selectedCategory
                    val parsedAmt = amount.toDoubleOrNull()
                    when {
                        catVal.isBlank() -> formError = "Please specify a category name."
                        vendor.isBlank() -> formError = "Vendor / Payee name is required."
                        parsedAmt == null || parsedAmt <= 0 -> formError = "Please enter a valid positive expense amount."
                        date.isBlank() || !date.matches(Regex("\\d{4}-\\d{2}-\\d{2}")) -> formError = "Expense date must be in YYYY-MM-DD format."
                        else -> {
                            viewModel.createExpense(
                                category = catVal,
                                vendor = vendor.trim(),
                                amount = amount.trim(),
                                date = date.trim(),
                                method = selectedMethod,
                                description = description.trim().ifBlank { null }
                            )
                            onDismiss()
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Record Expense")
            }
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
            "${bill.flatNo ?: "Flat"}  \u2022  ${bill.month ?: "-"}/${bill.year ?: "-"}  \u2022  ${DashboardFormatters.money(expectedAmount.toMoneyDecimal())}",
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
    return netPayableAmount()
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
    val backendMime = mime.lowercase().takeIf { it in setOf("image/jpeg", "image/jpg", "image/png", "image/webp") }
    if (backendMime != null) return "data:$backendMime;base64,${Base64.encodeToString(bytes, Base64.NO_WRAP)}"
    val bitmap = android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null
    val output = java.io.ByteArrayOutputStream()
    bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 90, output)
    val jpgBytes = output.toByteArray()
    if (jpgBytes.isEmpty() || jpgBytes.size > 5 * 1024 * 1024) return null
    return "data:image/jpeg;base64,${Base64.encodeToString(jpgBytes, Base64.NO_WRAP)}"
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
    var url = path
    val baseHost = BuildConfig.BASE_URL.replace("http://", "").replace("https://", "").trimEnd('/')
    if (url.contains("localhost:5000", ignoreCase = true)) {
        url = url.replace("localhost:5000", baseHost, ignoreCase = true)
    }
    if (url.contains("10.0.2.2:5000", ignoreCase = true)) {
        url = url.replace("10.0.2.2:5000", baseHost, ignoreCase = true)
    }
    if (
        url.startsWith("http", ignoreCase = true) ||
        url.startsWith("content:", ignoreCase = true) ||
        url.startsWith("data:image/", ignoreCase = true)
    ) return url
    return BuildConfig.BASE_URL.trimEnd('/') + "/" + url.trimStart('/')
}

@Composable
private fun PaymentProofImage(
    image: String?,
    contentDescription: String,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop,
    isThumbnail: Boolean = false
) {
    val dataBitmap = remember(image) { decodePaymentDataImage(image) }
    val resolvedUrl = remember(image) { fullMediaUrl(image) }
    var isLoading by remember(resolvedUrl) { mutableStateOf(!resolvedUrl.isNullOrBlank() && dataBitmap == null) }
    var loadFailed by remember(resolvedUrl) { mutableStateOf(false) }
    var retryAttempt by remember(resolvedUrl) { mutableStateOf(0) }
    val requestUrl = remember(resolvedUrl, retryAttempt) {
        resolvedUrl?.let { url ->
            val separator = if ('?' in url) '&' else '?'
            "$url${separator}proofRetry=$retryAttempt"
        }
    }

    if (dataBitmap != null) {
        Image(
            bitmap = dataBitmap.asImageBitmap(),
            contentDescription = contentDescription,
            modifier = modifier,
            contentScale = contentScale
        )
    } else {
        Box(modifier = modifier, contentAlignment = Alignment.Center) {
            AsyncImage(
                model = requestUrl,
                contentDescription = contentDescription,
                modifier = Modifier.fillMaxSize(),
                contentScale = contentScale,
                onLoading = {
                    isLoading = true
                    loadFailed = false
                },
                onSuccess = {
                    isLoading = false
                    loadFailed = false
                },
                onError = {
                    isLoading = false
                    loadFailed = true
                }
            )

            if (isThumbnail) {
                when {
                    resolvedUrl.isNullOrBlank() -> Icon(Icons.Filled.Warning, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                    isLoading -> com.example.application.ui.components.SkeletonCircle(size = 16.dp)
                    loadFailed -> Icon(Icons.Filled.Warning, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
                }
            } else {
                when {
                    resolvedUrl.isNullOrBlank() -> Text("No payment proof uploaded", textAlign = TextAlign.Center)
                    isLoading -> com.example.application.ui.components.SkeletonBox(height = 120.dp)
                    loadFailed -> Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.padding(12.dp)
                    ) {
                        Icon(Icons.Filled.Warning, contentDescription = null, tint = Color(0xFFE58A00))
                        Text(
                            "Unable to load proof image",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            textAlign = TextAlign.Center
                        )
                        TextButton(onClick = { retryAttempt += 1; loadFailed = false; isLoading = true }) {
                            Text("Retry")
                        }
                        Text(
                            resolvedUrl,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            maxLines = 2
                        )
                    }
                }
            }
        }
    }
}

private fun decodePaymentDataImage(image: String?): android.graphics.Bitmap? {
    if (image.isNullOrBlank() || !image.startsWith("data:image/", ignoreCase = true)) return null
    val encoded = image.substringAfter("base64,", missingDelimiterValue = "")
    if (encoded.isBlank()) return null
    return runCatching {
        val bytes = Base64.decode(encoded, Base64.DEFAULT)
        android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    }.getOrNull()
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

private fun String?.isPaymentVerificationPending(): Boolean {
    val normalized = normalizePaymentStatus()
    return normalized in setOf("PENDING", "PENDING_REVIEW", "PENDING_VERIFICATION", "PAYMENT_PROOF_SUBMITTED", "UNDER_REVIEW", "NEEDS_CLARIFICATION")
}

private fun String?.isPaymentVerificationRejected(): Boolean {
    val normalized = normalizePaymentStatus()
    return normalized in setOf("REJECTED", "DECLINED")
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

private fun MaintenancePaymentVerificationDto.proofImage(): String? {
    return listOfNotNull(
        screenshotUrl?.takeIf { it.isNotBlank() },
        screenshot?.takeIf { it.isNotBlank() },
        screenshotPath?.takeIf { it.isNotBlank() },
        // Older backend responses only expose has_screenshot and submissionId.
        // Build the protected screenshot endpoint as a final fallback.
        submissionId?.takeIf { !it.isNullOrBlank() && hasScreenshot == 1 }?.let {
            "${BuildConfig.BASE_URL.trimEnd('/')}/api/maintenance/payments/$it/screenshot"
        }
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

private fun monthNameToNumber(name: String?): Int? {
    if (name.isNullOrBlank()) return null
    return when (name.trim().lowercase()) {
        "january", "jan" -> 1
        "february", "feb" -> 2
        "march", "mar" -> 3
        "april", "apr" -> 4
        "may" -> 5
        "june", "jun" -> 6
        "july", "jul" -> 7
        "august", "aug" -> 8
        "september", "sep", "sept" -> 9
        "october", "oct" -> 10
        "november", "nov" -> 11
        "december", "dec" -> 12
        else -> name.toIntOrNull()
    }
}

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
    Column(
        modifier = modifier.fillMaxWidth().padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        com.example.application.ui.components.SkeletonList(count = 3)
        OutlinedButton(onClick = onRetry, shape = RoundedCornerShape(12.dp)) {
            Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(6.dp))
            Text("Tap to refresh")
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
private fun AdminStatusPill(text: String, fg: Color = Color.Unspecified, bg: Color = Color.Unspecified) {
    StatusBadge(status = text)
}

@Composable
private fun AdminAmountRow(label: String, value: String, strong: Boolean = false, valueColor: Color = Color.Unspecified) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(
            label,
            color = if (strong) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = if (strong) FontWeight.SemiBold else FontWeight.Normal
        )
        Text(
            value,
            color = if (valueColor == Color.Unspecified || valueColor == Color(0xFF101828)) MaterialTheme.colorScheme.onSurface else valueColor,
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

private fun shareVerificationCsv(context: Context, payments: List<MaintenancePaymentVerificationDto>, fileName: String) {
    val header = listOf("Payment ID", "Bill ID", "Resident", "Flat", "Wing", "Title", "Amount", "Status", "Method", "UTR", "Payment Date", "Submitted At")
    val rows = payments.map { payment ->
        listOf(
            payment.submissionId.orEmpty(), payment.billId.orEmpty(), payment.residentName.orEmpty(),
            payment.flatNumber.orEmpty(), payment.wing.orEmpty(), payment.title.orEmpty(), payment.submittedAmount.orEmpty(),
            friendlyPaymentStatus(payment.verificationStatus), payment.paymentMethod.orEmpty(),
            (payment.transactionReference ?: payment.utrNumber).orEmpty(), payment.paymentDate.orEmpty(), payment.submittedAt.orEmpty()
        )
    }
    val csv = (listOf(header) + rows).joinToString("\n") { row -> row.joinToString(",") { it.csvCell() } }
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/csv"
        putExtra(Intent.EXTRA_SUBJECT, fileName)
        putExtra(Intent.EXTRA_TEXT, csv)
    }
    runCatching { context.startActivity(Intent.createChooser(intent, "Export payment report")) }
        .onFailure { Toast.makeText(context, "Unable to export payment report.", Toast.LENGTH_LONG).show() }
}

private fun shareVerificationPdf(context: Context, payments: List<MaintenancePaymentVerificationDto>) {
    runCatching {
        val document = PdfDocument()
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.BLACK; textSize = 10f }
        var pageNumber = 1
        var page = document.startPage(PdfDocument.PageInfo.Builder(842, 595, pageNumber).create())
        var canvas = page.canvas
        var y = 42f
        fun heading() {
            paint.textSize = 18f; paint.isFakeBoldText = true
            canvas.drawText("Maintenance Payment Report", 35f, y, paint)
            y += 28f; paint.textSize = 10f; paint.isFakeBoldText = false
            canvas.drawText("Resident / Flat / Amount / Status / UTR / Date", 35f, y, paint); y += 22f
        }
        heading()
        payments.forEach { payment ->
            if (y > 555f) {
                document.finishPage(page)
                pageNumber += 1
                page = document.startPage(PdfDocument.PageInfo.Builder(842, 595, pageNumber).create())
                canvas = page.canvas; y = 42f; heading()
            }
            val row = "${payment.residentName ?: "-"} | ${payment.wing ?: ""}-${payment.flatNumber ?: "-"} | ₹${payment.submittedAmount ?: "0"} | ${friendlyPaymentStatus(payment.verificationStatus)} | ${payment.transactionReference ?: payment.utrNumber ?: "-"} | ${payment.paymentDate?.take(10) ?: "-"}"
            canvas.drawText(row.take(135), 35f, y, paint); y += 18f
        }
        document.finishPage(page)
        val file = java.io.File(context.cacheDir, "payment-report-${System.currentTimeMillis()}.pdf")
        file.outputStream().use(document::writeTo); document.close()
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"; putExtra(Intent.EXTRA_STREAM, uri); addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }, "Print or share payment report"))
    }.onFailure { Toast.makeText(context, "Unable to create payment PDF.", Toast.LENGTH_LONG).show() }
}

private fun saveWriteOffReceiptPdf(context: Context, receipt: com.example.application.data.remote.dto.WriteOffReceiptDto) {
    val document = PdfDocument()
    val page = document.startPage(PdfDocument.PageInfo.Builder(595, 842, 1).create())
    val canvas = page.canvas
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 16f; color = android.graphics.Color.BLACK }
    var y = 60f
    fun line(value: String, bold: Boolean = false) {
        paint.isFakeBoldText = bold
        canvas.drawText(value, 48f, y, paint)
        y += 30f
    }
    line("Society Management System", true)
    line("Official Maintenance Write-off Receipt", true)
    y += 10f
    line("Bill: ${receipt.billNumber ?: receipt.billId ?: "-"}")
    line("Resident: ${receipt.residentName ?: "-"}")
    line("Flat: ${receipt.flatNo ?: "-"}")
    line("Billing: ${receipt.month ?: "-"} / ${receipt.year ?: "-"}")
    line("Base amount: ${DashboardFormatters.money(receipt.baseMaintenanceCharge.toMoneyDecimal())}")
    line("Late fee: ${DashboardFormatters.money(receipt.lateFee.toMoneyDecimal())}")
    line("Total amount: ${DashboardFormatters.money(receipt.totalAmount.toMoneyDecimal())}")
    line("Written off: ${DashboardFormatters.money(receipt.writeOffAmount.toMoneyDecimal())}", true)
    line("Remaining: ${DashboardFormatters.money(receipt.remainingAmount.toMoneyDecimal())}")
    line("Reason: ${receipt.reason ?: "Approved write-off"}")
    line("Approved by: ${receipt.approvedBy ?: "Admin"}")
    line("Approval date: ${DashboardFormatters.date(receipt.approvalDate)}")
    document.finishPage(page)
    try {
        val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, "write-off-receipt-${receipt.billId ?: System.currentTimeMillis()}.pdf")
            put(MediaStore.Downloads.MIME_TYPE, "application/pdf")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) put(MediaStore.Downloads.RELATIVE_PATH, "Download")
        }
        val uri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: error("Unable to create receipt")
        context.contentResolver.openOutputStream(uri)?.use { document.writeTo(it) } ?: error("Unable to write receipt")
        Toast.makeText(context, "Official write-off receipt downloaded", Toast.LENGTH_SHORT).show()
    } catch (_: Exception) {
        Toast.makeText(context, "Unable to download write-off receipt", Toast.LENGTH_SHORT).show()
    } finally {
        document.close()
    }
}

private fun String?.toMoneyDecimal(): BigDecimal {
    return this?.toBigDecimalOrNull() ?: BigDecimal.ZERO
}





@Composable
fun InfoItem(label: String, value: String) {
    Column {
        Text(text = label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(text = value, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
    }
}

@Composable
fun StatusBadge(status: String) {
    val normalized = status.uppercase().replace(" ", "_").replace("-", "_")
    val (bgColor, textColor) = when {
        normalized in setOf("PAID", "APPROVED", "SETTLED") ->
            MaterialTheme.colorScheme.primaryContainer to MaterialTheme.colorScheme.onPrimaryContainer
        normalized in setOf("PENDING", "PENDING_REVIEW", "PENDING_VERIFICATION", "UNPAID", "UNDER_REVIEW") ->
            MaterialTheme.colorScheme.secondaryContainer to MaterialTheme.colorScheme.onSecondaryContainer
        normalized in setOf("REJECTED", "OVERDUE", "CANCELLED") ->
            MaterialTheme.colorScheme.errorContainer to MaterialTheme.colorScheme.onErrorContainer
        normalized in setOf("NEEDS_CLARIFICATION", "CLARIFICATION_REQUIRED", "PARTIALLY_PAID", "PARTIAL", "PARTIAL_WRITE_OFF", "WAIVED", "WRITTEN_OFF") ->
            MaterialTheme.colorScheme.tertiaryContainer to MaterialTheme.colorScheme.onTertiaryContainer
        else ->
            MaterialTheme.colorScheme.surfaceVariant to MaterialTheme.colorScheme.onSurfaceVariant
    }
    Surface(
        color = bgColor,
        shape = MaterialTheme.shapes.small,
        modifier = Modifier.padding(2.dp)
    ) {
        Text(
            text = status.replace("_", " "),
            color = textColor,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}
