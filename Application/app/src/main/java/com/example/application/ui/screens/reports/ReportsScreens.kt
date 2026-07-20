package com.example.application.ui.screens.reports

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material.icons.filled.Report
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.data.remote.dto.ComplaintDto
import com.example.application.data.remote.dto.ExpenseDto
import com.example.application.data.remote.dto.MaintenanceBillDto
import com.example.application.data.remote.dto.MembersMaintenanceReportDto
import com.example.application.data.remote.dto.ReportFilterState
import com.example.application.data.remote.dto.ResidentExpenseReportDto
import com.example.application.data.remote.dto.ResidentMaintenanceReportDto
import com.example.application.data.repository.AdminReportsData
import com.example.application.data.repository.ResidentReportsData
import com.example.application.ui.components.AppLoadingIndicator
import com.example.application.ui.components.EmptyState
import com.example.application.ui.components.RetryState
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.AdminReportsViewModel
import com.example.application.viewmodel.ResidentReportsViewModel
import java.math.BigDecimal
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminReportsScreen(
    onBack: () -> Unit,
    viewModel: AdminReportsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var pendingCsv by remember { mutableStateOf<String?>(null) }
    val csvLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        val csv = pendingCsv.orEmpty()
        runCatching {
            context.contentResolver.openOutputStream(uri)?.use { output ->
                output.write(csv.toByteArray(Charsets.UTF_8))
            } ?: error("Unable to open selected file.")
        }.onSuccess {
            Toast.makeText(context, "Admin report CSV saved successfully", Toast.LENGTH_SHORT).show()
        }.onFailure {
            Toast.makeText(context, "CSV export failed: ${it.message}", Toast.LENGTH_LONG).show()
        }
    }
    ReportScaffold(
        title = "Admin Reports",
        subtitle = "Financial, expense and complaint reports",
        onBack = onBack,
        isRefreshing = state.isRefreshing,
        onRefresh = { viewModel.load(refresh = true) },
        action = {
            IconButton(onClick = {
                val csv = state.data?.let { buildAdminReportCsv(it, state.filter) }.orEmpty()
                if (csv.isBlank()) Toast.makeText(context, "No report data available", Toast.LENGTH_SHORT).show()
                else {
                    pendingCsv = csv
                    csvLauncher.launch("admin_report.csv")
                }
            }) { Icon(Icons.Filled.Download, contentDescription = "Download report") }
        },
        showRefresh = false
    ) {
        item {
            ReportFilters(
                filter = state.filter,
                onMonth = viewModel::updateMonth,
                onYear = viewModel::updateYear,
                onStatus = viewModel::updateStatus,
                onReset = viewModel::resetFilters
            )
        }

        state.error?.let { error ->
            item { RetryState(message = error, onRetry = { viewModel.load(refresh = true) }, modifier = Modifier.padding(16.dp)) }
        }

        state.exportMessage?.let { message ->
            item { InfoCard(message = message) }
        }

        when {
            state.isLoading -> item { LoadingReportSkeleton() }
            state.data == null -> item { EmptyState("No reports", "Report data is not available yet.", modifier = Modifier.padding(16.dp)) }
            else -> adminReportsContent(
                data = state.data!!,
                onExportCsv = {
                    val csv = buildAdminReportCsv(state.data!!, state.filter)
                    if (csv.isBlank()) Toast.makeText(context, "No report data available", Toast.LENGTH_SHORT).show()
                    else {
                        pendingCsv = csv
                        csvLauncher.launch("admin_report.csv")
                    }
                }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResidentReportsScreen(
    onBack: () -> Unit,
    viewModel: ResidentReportsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var pendingCsv by remember { mutableStateOf<String?>(null) }
    val csvLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        val csv = pendingCsv.orEmpty()
        runCatching {
            context.contentResolver.openOutputStream(uri)?.use { output ->
                output.write(csv.toByteArray(Charsets.UTF_8))
            } ?: error("Unable to open selected file.")
        }.onSuccess {
            Toast.makeText(context, "Report CSV saved successfully", Toast.LENGTH_SHORT).show()
        }.onFailure {
            Toast.makeText(context, "CSV export failed: ${it.message}", Toast.LENGTH_LONG).show()
        }
    }
    ReportScaffold(
        title = "Reports & Analytics",
        subtitle = "",
        onBack = onBack,
        isRefreshing = state.isRefreshing,
        showRefresh = false,
        onRefresh = { viewModel.load(refresh = true) },
        action = {
            IconButton(onClick = {
                val csv = state.data?.let { buildResidentReportCsv(it, state.filter) }.orEmpty()
                if (csv.isBlank()) Toast.makeText(context, "No report data available", Toast.LENGTH_SHORT).show()
                else { pendingCsv = csv; csvLauncher.launch("resident_report.csv") }
            }) { Icon(Icons.Filled.Download, contentDescription = "Download report") }
        }
    ) {
        state.error?.let { error ->
            item { RetryState(message = error, onRetry = { viewModel.load(refresh = true) }, modifier = Modifier.padding(16.dp)) }
        }

        when {
            state.isLoading && state.data == null -> item { LoadingReportSkeleton() }
            state.data == null -> item { EmptyState("No reports", "Report data is not available yet.", modifier = Modifier.padding(16.dp)) }
            else -> residentReportsContent(
                data = state.data!!,
                filter = state.filter
            )
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.adminReportsContent(
    data: AdminReportsData,
    onExportCsv: () -> Unit
) {
    val paid = data.bills.filter { (it.paymentStatus ?: it.status).equals("Paid", true) }
    val pending = data.bills.filterNot { (it.paymentStatus ?: it.status).equals("Paid", true) }
    val totalCollection = paid.sumOf { (it.paidAmount ?: it.totalAmount ?: it.amount).toMoneyDecimal() }
    val pendingAmount = pending.sumOf { (it.remainingAmount ?: it.totalAmount ?: it.amount).toMoneyDecimal() }
    val totalExpenses = data.expenses.sumOf { it.amount.toMoneyDecimal() }

    item {
        SummaryGrid(
            cards = listOf(
                "Collection" to DashboardFormatters.money(totalCollection + pendingAmount),
                "Paid" to DashboardFormatters.money(totalCollection),
                "Expenses" to DashboardFormatters.money(totalExpenses),
                "Net Balance" to DashboardFormatters.money(totalCollection - totalExpenses),
                "Complaints" to data.complaints.size.toString()
            )
        )
    }
    item { ExportCard(onExportCsv) }
    data.warnings.forEach { item { InfoCard(it) } }
    item { SectionTitle("Maintenance Report") }
    if (data.bills.isEmpty()) item { EmptyState("No maintenance data", "No bills match these filters.", modifier = Modifier.padding(16.dp)) }
    else items(data.bills.take(30), key = { "bill-${it.id}-${it.status}" }) { bill -> BillCard(bill) }

    item { SectionTitle("Expense Report") }
    if (data.expenses.isEmpty()) item { EmptyState("No expense data", "No expenses match these filters.", modifier = Modifier.padding(16.dp)) }
    else items(data.expenses.take(20), key = { "expense-${it.id}-${it.expenseDate}" }) { expense -> AdminExpenseCard(expense) }

    item { SectionTitle("Complaint Report") }
    if (data.complaints.isEmpty()) item { EmptyState("No complaints", "No complaints match these filters.", modifier = Modifier.padding(16.dp)) }
    else items(data.complaints.take(20), key = { "complaint-${it.id}-${it.status}" }) { complaint -> ComplaintReportCard(complaint) }
}

private fun androidx.compose.foundation.lazy.LazyListScope.residentReportsContent(
    data: ResidentReportsData,
    filter: ReportFilterState
) {
    val summary = data.societySummary
    val billed = data.myMaintenance.sumOf { (it.totalAmount ?: it.amount).toMoneyDecimal() }
    val paid = data.myMaintenance.sumOf { it.paidAmount.toMoneyDecimal() }
    val pending = data.myMaintenance.sumOf { it.remainingAmount.toMoneyDecimal() }
    item {
        ResidentMetricGrid(
            metrics = listOf(
                "Total Maintenance" to DashboardFormatters.money(billed),
                "Paid Amount" to DashboardFormatters.money(paid),
                "Pending Amount" to DashboardFormatters.money(pending),
                "Complaints" to data.complaints.size.toString()
            )
        )
    }
    item { MonthlyCollectionCard(data.myMaintenance) }
    item { PaymentOverviewCard(total = billed, paid = paid, pending = pending) }
    item { RecentComplaintsCard(data.complaints) }
    if (data.myMaintenance.isEmpty() && data.complaints.isEmpty()) {
        item { EmptyState("No report data", "Your maintenance and complaint activity will appear here.", modifier = Modifier.padding(16.dp)) }
    }
}

private val ReportBlue = Color(0xFF1769E0)
private val ReportGreen = Color(0xFF179653)
private val ReportAmber = Color(0xFFF59E0B)

@Composable
private fun ResidentMetricGrid(metrics: List<Pair<String, String>>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        metrics.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                row.forEachIndexed { index, (label, value) ->
                    Card(modifier = Modifier.weight(1f), colors = CardDefaults.cardColors(containerColor = when (index) {
                        0 -> Color(0xFFF1F6FF); 1 -> Color(0xFFF0FBF4); else -> Color.White
                    })) {
                        Column(Modifier.padding(14.dp)) {
                            Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = when (label) {
                                "Paid Amount" -> ReportGreen
                                "Pending Amount" -> ReportAmber
                                else -> MaterialTheme.colorScheme.onSurface
                            })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MonthlyCollectionCard(bills: List<ResidentMaintenanceReportDto>) {
    val months = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun")
    val values = months.mapIndexed { index, _ ->
        bills.filter { bill ->
            val month = bill.month?.trim().orEmpty()
            month == (index + 1).toString() || month.startsWith(months[index], true)
        }.sumOf { it.paidAmount.toMoneyDecimal() }
    }
    val max = values.maxOrNull()?.takeIf { it > BigDecimal.ZERO } ?: BigDecimal.ONE
    Card {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("Monthly Maintenance Collection", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Row(modifier = Modifier.fillMaxWidth().height(170.dp), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.Bottom) {
                values.forEachIndexed { index, value ->
                    val fraction = value.divide(max, 3, java.math.RoundingMode.HALF_UP).toFloat().coerceIn(0.04f, 1f)
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.weight(1f)) {
                        Text(DashboardFormatters.money(value), style = MaterialTheme.typography.labelSmall)
                        Box(Modifier.fillMaxWidth(0.55f).height((120 * fraction).dp).background(ReportBlue, RoundedCornerShape(6.dp)))
                        Text(months[index], style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
            Text("Collected (₹)", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun PaymentOverviewCard(total: BigDecimal, paid: BigDecimal, pending: BigDecimal) {
    val paidFraction = if (total > BigDecimal.ZERO) paid.divide(total, 3, java.math.RoundingMode.HALF_UP).toFloat().coerceIn(0f, 1f) else 0f
    val pendingFraction = if (total > BigDecimal.ZERO) pending.divide(total, 3, java.math.RoundingMode.HALF_UP).toFloat().coerceIn(0f, 1f) else 0f
    Card {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Payment Overview", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("Total ${DashboardFormatters.money(total)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
            PaymentProgressRow("Paid", paid, paidFraction, ReportGreen)
            PaymentProgressRow("Pending", pending, pendingFraction, ReportAmber)
            PaymentProgressRow("Overdue", BigDecimal.ZERO, 0f, Color(0xFFE5484D))
        }
    }
}

@Composable
private fun PaymentProgressRow(label: String, amount: BigDecimal, fraction: Float, color: Color) {
    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, fontWeight = FontWeight.SemiBold)
            Text(DashboardFormatters.money(amount), color = color, fontWeight = FontWeight.Bold)
        }
        LinearProgressIndicator(progress = { fraction }, modifier = Modifier.fillMaxWidth().height(8.dp), color = color, trackColor = color.copy(alpha = 0.14f))
    }
}

@Composable
private fun RecentComplaintsCard(complaints: List<ComplaintDto>) {
    Card {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Recent Complaints", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            complaints.take(3).forEach { complaint ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(complaint.title ?: "Complaint", fontWeight = FontWeight.SemiBold)
                        Text(DashboardFormatters.statusLabel(complaint.status), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    AssistChip(onClick = {}, label = { Text(DashboardFormatters.statusLabel(complaint.status)) })
                }
                if (complaint != complaints.take(3).last()) Divider()
            }
            if (complaints.isEmpty()) Text("No complaints submitted yet.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReportScaffold(
    title: String,
    subtitle: String,
    onBack: () -> Unit,
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    action: @Composable () -> Unit = {},
    showRefresh: Boolean = true,
    content: androidx.compose.foundation.lazy.LazyListScope.() -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(title, fontWeight = FontWeight.Bold)
                        if (subtitle.isNotBlank()) Text(subtitle, style = MaterialTheme.typography.bodySmall)
                    }
                },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Back") } },
                actions = {
                    action()
                    if (showRefresh) IconButton(onClick = onRefresh) { Icon(Icons.Filled.Refresh, contentDescription = if (isRefreshing) "Refreshing" else "Refresh") }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFF7F9FC))
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            content = content
        )
    }
}

@Composable
private fun ReportFilters(
    filter: ReportFilterState,
    onMonth: (String) -> Unit,
    onYear: (String) -> Unit,
    onStatus: (String) -> Unit,
    onReset: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF4F8FF)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            Modifier
                .border(1.dp, Color(0xFFCFE0FF), RoundedCornerShape(18.dp))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Icon(Icons.Filled.FilterList, contentDescription = null, tint = ReportBlue)
                Text("Filters", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color(0xFF101828))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                ReportFilterField(
                    label = "Month",
                    value = filter.month.ifBlank { "All" },
                    icon = Icons.Filled.CalendarMonth,
                    modifier = Modifier.weight(1f)
                )
                ReportFilterField(
                    label = "Year",
                    value = filter.year.ifBlank { "All" },
                    icon = Icons.Filled.CalendarMonth,
                    modifier = Modifier.weight(1f)
                )
            }
            OutlinedTextField(
                value = filter.month,
                onValueChange = onMonth,
                label = { Text("Month") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )
            OutlinedTextField(
                value = filter.year,
                onValueChange = onYear,
                label = { Text("Year") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                listOf("", "Paid", "Pending", "Partial", "Overdue").forEach { status ->
                    FilterChip(
                        selected = filter.status == status,
                        onClick = { onStatus(status) },
                        label = { Text(if (status.isBlank()) "All" else status) }
                    )
                }
            }
            Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                ReportFilterField(
                    label = "Status",
                    value = filter.status.ifBlank { "All" },
                    icon = Icons.Filled.FilterList,
                    modifier = Modifier.weight(1f)
                )
                TextButton(onClick = onReset) {
                    Icon(Icons.Filled.RestartAlt, contentDescription = null, tint = ReportBlue)
                    Spacer(Modifier.width(6.dp))
                    Text("Reset", color = ReportBlue, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun ReportFilterField(label: String, value: String, icon: ImageVector, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        color = Color.White,
        tonalElevation = 0.dp
    ) {
        Row(
            modifier = Modifier
                .border(1.dp, Color(0xFFCFE0FF), RoundedCornerShape(12.dp))
                .padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(icon, contentDescription = null, tint = ReportBlue, modifier = Modifier.size(20.dp))
            Text("$label: $value", color = Color(0xFF344054), style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun SummaryGrid(cards: List<Pair<String, String>>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        cards.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                row.forEach { (title, value) -> SummaryCard(title, value, Modifier.weight(1f)) }
                if (row.size == 1) Column(Modifier.weight(1f)) {}
            }
        }
    }
}

@Composable
private fun SummaryCard(title: String, value: String, modifier: Modifier = Modifier) {
    val visual = reportSummaryVisual(title)
    Card(
        modifier = modifier.height(110.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .border(1.dp, Color(0xFFE4E7EC), RoundedCornerShape(16.dp))
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Surface(modifier = Modifier.size(44.dp), shape = CircleShape, color = visual.container) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(visual.icon, contentDescription = null, tint = visual.tint, modifier = Modifier.size(25.dp))
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(title, style = MaterialTheme.typography.bodyMedium, color = Color(0xFF667085))
                Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = visual.tint)
            }
        }
    }
}

private data class ReportSummaryVisual(val icon: ImageVector, val tint: Color, val container: Color)

private fun reportSummaryVisual(title: String): ReportSummaryVisual {
    return when (title) {
        "Collection" -> ReportSummaryVisual(Icons.Filled.AccountBalanceWallet, ReportGreen, Color(0xFFE8F7EE))
        "Paid" -> ReportSummaryVisual(Icons.Filled.CheckCircle, ReportGreen, Color(0xFFE8F7EE))
        "Expenses" -> ReportSummaryVisual(Icons.Filled.ReceiptLong, Color(0xFFFF7A00), Color(0xFFFFF1E6))
        "Net Balance" -> ReportSummaryVisual(Icons.Filled.TrendingUp, ReportBlue, Color(0xFFEAF2FF))
        "Complaints" -> ReportSummaryVisual(Icons.Filled.Report, Color(0xFFE31B23), Color(0xFFFFECEF))
        else -> ReportSummaryVisual(Icons.Filled.ReceiptLong, ReportBlue, Color(0xFFEAF2FF))
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
}

@Composable
private fun LoadingReportSkeleton() {
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        AppLoadingIndicator()
        Text("Preparing latest report...", color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun InfoCard(message: String) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)) {
        Text(message, modifier = Modifier.padding(14.dp), color = MaterialTheme.colorScheme.onSecondaryContainer)
    }
}

@Composable
private fun ExportCard(onClick: () -> Unit) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF7FAFF)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color(0xFFCFE0FF), RoundedCornerShape(16.dp))
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Surface(modifier = Modifier.size(48.dp), shape = RoundedCornerShape(12.dp), color = Color.White) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.Download, contentDescription = null, tint = ReportBlue, modifier = Modifier.size(28.dp))
                }
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text("Exports", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, color = Color(0xFF101828))
                Text("Download filtered report data", color = Color(0xFF667085), style = MaterialTheme.typography.bodyMedium)
            }
            Button(
                onClick = onClick,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ReportBlue)
            ) {
                Icon(Icons.Filled.Download, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Export CSV")
            }
        }
    }
}

@Composable
private fun FinancialOverviewCard(data: ResidentReportsData, filter: ReportFilterState) {
    val billed = data.myMaintenance.sumOf { (it.totalAmount ?: it.amount).toMoneyDecimal() }
    val paid = data.myMaintenance.sumOf { it.paidAmount.toMoneyDecimal() }
    val remaining = data.myMaintenance.sumOf { it.remainingAmount.toMoneyDecimal() }
    val penalty = data.myMaintenance.sumOf { it.penaltyAmount.toMoneyDecimal() }
    val percent = if (billed > BigDecimal.ZERO) paid.multiply(100.toBigDecimal()).divide(billed, 0, java.math.RoundingMode.HALF_UP).toInt() else 0
    val period = listOf(
        filter.month.takeIf { it.isNotBlank() }?.let { "Month $it" },
        filter.year.takeIf { it.isNotBlank() }
    ).filterNotNull().joinToString(" / ").ifBlank { "All periods" }

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Financial Overview", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(period, color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.75f))
            KeyValue("Total maintenance billed", DashboardFormatters.money(billed))
            KeyValue("Total amount paid", DashboardFormatters.money(paid))
            KeyValue("Remaining amount", DashboardFormatters.money(remaining))
            KeyValue("Late fee / penalty", DashboardFormatters.money(penalty))
            KeyValue("Payment completion", "$percent%")
        }
    }
}

@Composable
private fun BillCard(bill: MaintenanceBillDto) {
    ReportItemCard(title = bill.title ?: "Maintenance Bill", status = bill.paymentStatus ?: bill.status) {
        KeyValue("Resident", bill.residentName ?: "-")
        KeyValue("Flat", bill.flatNo ?: "-")
        KeyValue("Amount", DashboardFormatters.money((bill.totalAmount ?: bill.amount).toMoneyDecimal()))
        KeyValue("Paid", DashboardFormatters.money(bill.paidAmount.toMoneyDecimal()))
        KeyValue("Remaining", DashboardFormatters.money(bill.remainingAmount.toMoneyDecimal()))
        KeyValue("Due", DashboardFormatters.date(bill.dueDate))
    }
}

@Composable
private fun ResidentBillCard(bill: ResidentMaintenanceReportDto) {
    ReportItemCard(title = bill.title ?: "Maintenance Bill", status = bill.status) {
        KeyValue("Month", "${bill.month ?: "-"} / ${bill.year ?: "-"}")
        KeyValue("Flat", listOfNotNull(bill.wing, bill.flatNo).joinToString("-").ifBlank { "-" })
        KeyValue("Amount", DashboardFormatters.money((bill.totalAmount ?: bill.amount).toMoneyDecimal()))
        KeyValue("Paid", DashboardFormatters.money(bill.paidAmount.toMoneyDecimal()))
        KeyValue("Remaining", DashboardFormatters.money(bill.remainingAmount.toMoneyDecimal()))
        KeyValue("Payment Date", DashboardFormatters.date(bill.paymentDate))
    }
}

@Composable
private fun AdminExpenseCard(expense: ExpenseDto) {
    ReportItemCard(title = expense.vendor ?: expense.expenseNumber ?: "Expense", status = expense.status) {
        KeyValue("Category", expense.category ?: "-")
        KeyValue("Amount", DashboardFormatters.money(expense.amount.toMoneyDecimal()))
        KeyValue("Date", DashboardFormatters.date(expense.expenseDate))
        KeyValue("Description", expense.description ?: "-")
    }
}

@Composable
private fun ResidentExpenseCard(expense: ResidentExpenseReportDto) {
    ReportItemCard(title = expense.expenseTitle ?: expense.expenseNumber ?: "Expense", status = expense.category) {
        KeyValue("Amount", DashboardFormatters.money(expense.amount.toMoneyDecimal()))
        KeyValue("Date", DashboardFormatters.date(expense.date))
        KeyValue("Description", expense.description ?: "-")
    }
}

@Composable
private fun MemberStatusCard(item: MembersMaintenanceReportDto) {
    ReportItemCard(title = item.name ?: "Resident", status = item.maintenanceStatus) {
        KeyValue("Flat", listOfNotNull(item.wing, item.flatNo).joinToString("-").ifBlank { "-" })
        KeyValue("Total Bills", (item.totalBills ?: 0).toString())
        KeyValue("Paid", DashboardFormatters.money(item.paidAmount.toMoneyDecimal()))
        KeyValue("Pending", DashboardFormatters.money(item.pendingAmount.toMoneyDecimal()))
        KeyValue("Penalty", DashboardFormatters.money(item.penaltyAmount.toMoneyDecimal()))
    }
}

@Composable
private fun ComplaintReportCard(complaint: ComplaintDto) {
    ReportItemCard(title = complaint.title ?: "Complaint", status = complaint.status) {
        KeyValue("Resident", complaint.residentName ?: complaint.userName ?: "Me")
        KeyValue("Date", DashboardFormatters.date(complaint.createdAt))
        KeyValue("Description", complaint.description ?: "-")
        if (!complaint.reply.isNullOrBlank()) KeyValue("Reply", complaint.reply)
    }
}

@Composable
private fun ReportItemCard(title: String, status: String?, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            Modifier
                .border(1.dp, Color(0xFFE4E7EC), RoundedCornerShape(16.dp))
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text(
                    title,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleMedium,
                    color = Color(0xFF101828),
                    modifier = Modifier.weight(1f)
                )
                ReportStatusPill(status)
            }
            Divider(color = Color(0xFFE4E7EC))
            content()
        }
    }
}

@Composable
private fun ReportStatusPill(status: String?) {
    val label = DashboardFormatters.statusLabel(status)
    val normalized = label.lowercase()
    val fg = when {
        "paid" in normalized || "resolved" in normalized || "closed" in normalized -> ReportGreen
        "pending" in normalized || "open" in normalized -> ReportAmber
        "overdue" in normalized || "reject" in normalized -> Color(0xFFE31B23)
        else -> ReportBlue
    }
    val bg = when (fg) {
        ReportGreen -> Color(0xFFDDF8E7)
        ReportAmber -> Color(0xFFFFE8C7)
        Color(0xFFE31B23) -> Color(0xFFFFE4E6)
        else -> Color(0xFFEAF2FF)
    }
    Text(
        label,
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
private fun KeyValue(label: String, value: String) {
    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
        Text(label, color = Color(0xFF667085), modifier = Modifier.weight(1f))
        Text(value, fontWeight = FontWeight.SemiBold, color = Color(0xFF101828), modifier = Modifier.weight(1f))
    }
}

private fun List<MaintenanceBillDto>.totalOf(selector: (MaintenanceBillDto) -> String?): BigDecimal =
    fold(BigDecimal.ZERO) { sum, item -> sum + selector(item).toMoneyDecimal() }

private fun buildAdminReportCsv(data: AdminReportsData, filter: ReportFilterState): String {
    if (data.bills.isEmpty() && data.expenses.isEmpty() && data.complaints.isEmpty()) return ""
    val rows = mutableListOf<List<String>>()
    rows += listOf("Admin report")
    rows += listOf("Month", filter.month.ifBlank { "All" }, "Year", filter.year.ifBlank { "All" }, "Status", filter.status.ifBlank { "All" })
    rows.add(emptyList())
    rows += listOf("Maintenance Report")
    rows += listOf("Title", "Resident", "Flat", "Amount", "Paid", "Remaining", "Due", "Status")
    data.bills.forEach { bill ->
        rows += listOf(
            bill.title ?: "Maintenance Bill",
            bill.residentName ?: "-",
            bill.flatNo ?: "-",
            DashboardFormatters.money((bill.totalAmount ?: bill.amount).toMoneyDecimal()),
            DashboardFormatters.money(bill.paidAmount.toMoneyDecimal()),
            DashboardFormatters.money(bill.remainingAmount.toMoneyDecimal()),
            DashboardFormatters.date(bill.dueDate),
            DashboardFormatters.statusLabel(bill.paymentStatus ?: bill.status)
        )
    }
    rows.add(emptyList())
    rows += listOf("Expense Report")
    rows += listOf("Vendor", "Category", "Amount", "Date", "Status", "Description")
    data.expenses.forEach { expense ->
        rows += listOf(
            expense.vendor ?: expense.expenseNumber ?: "Expense",
            expense.category ?: "-",
            DashboardFormatters.money(expense.amount.toMoneyDecimal()),
            DashboardFormatters.date(expense.expenseDate),
            expense.status ?: "-",
            expense.description ?: "-"
        )
    }
    rows.add(emptyList())
    rows += listOf("Complaint Report")
    rows += listOf("Title", "Resident", "Date", "Status", "Description", "Reply")
    data.complaints.forEach { complaint ->
        rows += listOf(
            complaint.title ?: "Complaint",
            complaint.residentName ?: complaint.userName ?: "-",
            DashboardFormatters.date(complaint.createdAt),
            DashboardFormatters.statusLabel(complaint.status),
            complaint.description ?: "-",
            complaint.reply ?: "-"
        )
    }
    return rows.joinToString("\n") { row -> row.joinToString(",") { csvEscape(it) } }
}

private fun buildResidentReportCsv(data: ResidentReportsData, filter: ReportFilterState): String {
    if (data.myMaintenance.isEmpty()) return ""
    val rows = mutableListOf<List<String>>()
    rows += listOf(
        "Resident name",
        "Flat number",
        "Maintenance title",
        "Billing month",
        "Due date",
        "Base amount",
        "Penalty",
        "Total amount",
        "Paid amount",
        "Remaining amount",
        "Payment status",
        "Payment date",
        "Transaction/reference ID"
    )
    data.myMaintenance.forEach { bill ->
        rows += listOf(
            "Logged-in resident",
            listOfNotNull(bill.wing, bill.flatNo).joinToString("-"),
            bill.title.orEmpty(),
            listOfNotNull(bill.month, bill.year).joinToString(" "),
            bill.dueDate.orEmpty(),
            bill.amount.orEmpty(),
            bill.penaltyAmount.orEmpty(),
            bill.totalAmount.orEmpty(),
            bill.paidAmount.orEmpty(),
            bill.remainingAmount.orEmpty(),
            bill.status.orEmpty(),
            bill.paymentDate.orEmpty(),
            "Not provided by current backend response"
        )
    }
    rows += listOf(listOf("Selected period", "", "", listOf(filter.month, filter.year).filter { it.isNotBlank() }.joinToString("/")))
    return rows.joinToString("\n") { row -> row.joinToString(",") { csvEscape(it) } }
}

private fun csvEscape(value: String): String {
    val normalized = value.replace("\r\n", "\n").replace("\r", "\n")
    val escaped = normalized.replace("\"", "\"\"")
    return if (escaped.any { it == ',' || it == '"' || it == '\n' }) "\"$escaped\"" else escaped
}

private fun String?.toMoneyDecimal(): BigDecimal {
    return try {
        this?.toBigDecimalOrNull() ?: BigDecimal.ZERO
    } catch (_: Exception) {
        BigDecimal.ZERO
    }
}
