package com.example.application.ui.screens.reports

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.data.remote.dto.FinancialMonthDto
import com.example.application.data.remote.dto.FinancialTransactionDto
import com.example.application.data.remote.dto.FlatPaymentReportDto
import com.example.application.data.remote.dto.MaintenanceWaiverDto
import com.example.application.data.remote.dto.MonthlyMaintenanceRowDto
import com.example.application.ui.components.DashboardSkeleton
import com.example.application.ui.components.ErrorMessageCard
import com.example.application.ui.components.StatusBadge
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.AdminReportsViewModel

private val MONTH_NAMES = listOf(
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
)

private fun formatMonthName(month: Any?): String {
    if (month == null) return "—"
    if (month is Number) return MONTH_NAMES.getOrNull(month.toInt() - 1) ?: month.toString()
    val str = month.toString().trim()
    val num = str.toIntOrNull()
    if (num != null) return MONTH_NAMES.getOrNull(num - 1) ?: str
    return str
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminReportsScreen(
    onBack: () -> Unit,
    viewModel: AdminReportsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val fyList = listOf("2026-2027", "2025-2026", "2024-2025")
    var activeTab by remember { mutableStateOf("summary") }

    // Dialog States
    var showOpeningModal by remember { mutableStateOf(false) }
    var openingBank by remember { mutableStateOf("") }
    var openingCash by remember { mutableStateOf("") }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Financial & Maintenance Reports", fontWeight = FontWeight.Bold)
                        Text("Financial Year: ${state.filter.financialYear}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Back") } },
                actions = {
                    IconButton(onClick = { viewModel.load(refresh = true) }) { Icon(Icons.Filled.Refresh, contentDescription = "Refresh") }
                }
            )
        }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.isRefreshing,
            onRefresh = { viewModel.load(refresh = true) },
            indicator = {},
            modifier = Modifier.fillMaxSize().padding(padding)
        ) {
            if (state.isLoading && state.data == null) {
                DashboardSkeleton()
            } else {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Year / Month filter bar
                    val availableYears = remember(state.data) {
                        val fromMonthly = state.data?.monthlyReport?.mapNotNull { it.year }?.distinct().orEmpty()
                        val fromBills = state.data?.bills?.mapNotNull { it.year }?.distinct().orEmpty()
                        val combined = (fromMonthly + fromBills).distinct().sortedDescending()
                        val cur = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)
                        if (combined.isEmpty()) (0..3).map { (cur - it).toString() } else combined
                    }
                    YearMonthFilterBar(
                        selectedYear = state.filter.year,
                        selectedMonth = state.filter.month,
                        availableYears = availableYears,
                        onYearSelected = { viewModel.updateYear(it) },
                        onMonthSelected = { viewModel.updateMonth(it) },
                        onReset = { viewModel.resetFilters() }
                    )
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    // Navigation Tabs (Summary, Monthly Report, Expenses, Bank Ledger, Cash Ledger)
                    ScrollableTabRow(
                        selectedTabIndex = listOf("summary", "monthlyReport", "expenses", "bankLedger", "cashLedger").indexOf(activeTab).coerceAtLeast(0),
                        edgePadding = 16.dp,
                        containerColor = MaterialTheme.colorScheme.surface,
                        contentColor = MaterialTheme.colorScheme.primary
                    ) {
                        Tab(selected = activeTab == "summary", onClick = { activeTab = "summary" }, text = { Text("Financial Accounting Summary") })
                        Tab(selected = activeTab == "monthlyReport", onClick = { activeTab = "monthlyReport" }, text = { Text("Monthly Maintenance Report") })
                        Tab(selected = activeTab == "expenses", onClick = { activeTab = "expenses" }, text = { Text("Expense Report") })
                        Tab(selected = activeTab == "bankLedger", onClick = { activeTab = "bankLedger" }, text = { Text("Bank Account Ledger") })
                        Tab(selected = activeTab == "cashLedger", onClick = { activeTab = "cashLedger" }, text = { Text("Cash Account Ledger") })
                    }

                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        state.error?.let { item { ErrorMessageCard(it) } }

                        when (activeTab) {
                            "summary" -> {
                                item { AdminFinancialSummarySection(state) }
                                item { MonthWiseFinancialBreakdownTable(state = state) }
                            }
                            "monthlyReport" -> {
                                item { AdminMonthlyReportTable(items = state.data?.monthlyReport.orEmpty(), viewModel = viewModel) }
                            }
                            "expenses" -> {
                                item { AdminExpensesTable(items = state.data?.expenses.orEmpty(), fy = state.filter.financialYear) }
                            }
                            "bankLedger" -> {
                                item {
                                    val bankLedger = state.data?.bankLedger
                                    ReportLedgerSection(
                                        title = "Bank Account Transaction Ledger",
                                        opening = bankLedger?.openingBalance ?: state.data?.financial?.summary?.bankOpening ?: "0",
                                        closing = bankLedger?.closingBalance ?: state.data?.financial?.summary?.bankClosing ?: "0",
                                        transactions = bankLedger?.ledger ?: state.data?.financial?.bankTransactions.orEmpty()
                                    )
                                }
                            }
                            "cashLedger" -> {
                                item {
                                    val cashLedger = state.data?.cashLedger
                                    ReportLedgerSection(
                                        title = "Cash Account Transaction Ledger",
                                        opening = cashLedger?.openingBalance ?: state.data?.financial?.summary?.cashOpening ?: "0",
                                        closing = cashLedger?.closingBalance ?: state.data?.financial?.summary?.cashClosing ?: "0",
                                        transactions = cashLedger?.ledger ?: state.data?.financial?.cashTransactions.orEmpty()
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showOpeningModal) {
        AlertDialog(
            onDismissRequest = { showOpeningModal = false },
            title = { Text("Configure Opening Balance") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Set initial bank and cash opening balances for FY ${state.filter.financialYear}.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedTextField(value = openingBank, onValueChange = { openingBank = it }, label = { Text("Bank Opening Balance (₹)") }, singleLine = true)
                    OutlinedTextField(value = openingCash, onValueChange = { openingCash = it }, label = { Text("Cash Opening Balance (₹)") }, singleLine = true)
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.saveOpeningBalance(state.filter.financialYear, openingBank.ifBlank { "0" }, openingCash.ifBlank { "0" })
                        showOpeningModal = false
                        Toast.makeText(context, "Opening balance configuration submitted", Toast.LENGTH_SHORT).show()
                    }
                ) { Text("Save Opening") }
            },
            dismissButton = { TextButton(onClick = { showOpeningModal = false }) { Text("Cancel") } }
        )
    }
}

/** Reusable Year + Month filter bar with dropdowns and a Reset button. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun YearMonthFilterBar(
    selectedYear: String,
    selectedMonth: String,
    availableYears: List<String>,
    onYearSelected: (String) -> Unit,
    onMonthSelected: (String) -> Unit,
    onReset: () -> Unit
) {
    val monthItems = listOf("All Months") + listOf(
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    )

    // Convert stored month number ("8") ↔ display label ("August")
    val monthToLabel: (String) -> String = { m ->
        val idx = m.toIntOrNull()
        if (idx != null && idx in 1..12) monthItems[idx] else "All Months"
    }
    val labelToMonth: (String) -> String = { label ->
        val idx = monthItems.indexOf(label)
        if (idx > 0) idx.toString() else "All"
    }

    val displayYear = selectedYear.ifBlank { "All Years" }.let {
        if (it == "All") "All Years" else it
    }
    val displayMonth = monthToLabel(selectedMonth)

    var yearExpanded by remember { mutableStateOf(false) }
    var monthExpanded by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Year Dropdown
        ExposedDropdownMenuBox(
            expanded = yearExpanded,
            onExpandedChange = { yearExpanded = !yearExpanded },
            modifier = Modifier.weight(1f)
        ) {
            OutlinedTextField(
                value = displayYear,
                onValueChange = {},
                readOnly = true,
                label = { Text("Year") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = yearExpanded) },
                colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors(),
                modifier = Modifier
                    .menuAnchor()
                    .fillMaxWidth(),
                singleLine = true
            )
            ExposedDropdownMenu(
                expanded = yearExpanded,
                onDismissRequest = { yearExpanded = false }
            ) {
                availableYears.forEach { yr ->
                    DropdownMenuItem(
                        text = { Text(yr) },
                        onClick = { onYearSelected(yr); yearExpanded = false }
                    )
                }
            }
        }

        // Month Dropdown
        ExposedDropdownMenuBox(
            expanded = monthExpanded,
            onExpandedChange = { monthExpanded = !monthExpanded },
            modifier = Modifier.weight(1f)
        ) {
            OutlinedTextField(
                value = displayMonth,
                onValueChange = {},
                readOnly = true,
                label = { Text("Month") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = monthExpanded) },
                colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors(),
                modifier = Modifier
                    .menuAnchor()
                    .fillMaxWidth(),
                singleLine = true
            )
            ExposedDropdownMenu(
                expanded = monthExpanded,
                onDismissRequest = { monthExpanded = false }
            ) {
                monthItems.forEach { label ->
                    DropdownMenuItem(
                        text = { Text(label) },
                        onClick = { onMonthSelected(labelToMonth(label)); monthExpanded = false }
                    )
                }
            }
        }

        // Reset
        OutlinedButton(
            onClick = onReset,
            modifier = Modifier.height(56.dp)
        ) {
            Icon(Icons.Filled.RestartAlt, contentDescription = "Reset", modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun AdminFinancialSummarySection(state: com.example.application.viewmodel.AdminReportsUiState) {
    val summary = state.data?.financial?.summary
    val bankOp = (summary?.bankOpening ?: "0").toDoubleOrNull() ?: 0.0
    val cashOp = (summary?.cashOpening ?: "0").toDoubleOrNull() ?: 0.0
    val totalOp = bankOp + cashOp

    val bankInc = (summary?.bankIncome ?: "0").toDoubleOrNull() ?: 0.0
    val cashInc = (summary?.cashIncome ?: "0").toDoubleOrNull() ?: 0.0
    val totalInc = bankInc + cashInc

    val bankExp = (summary?.bankExpenses ?: "0").toDoubleOrNull() ?: 0.0
    val cashExp = (summary?.cashExpenses ?: "0").toDoubleOrNull() ?: 0.0
    val totalExp = bankExp + cashExp

    val bankCl = (summary?.bankClosing ?: (bankOp + bankInc - bankExp).toString()).toDoubleOrNull() ?: 0.0
    val cashCl = (summary?.cashClosing ?: (cashOp + cashInc - cashExp).toString()).toDoubleOrNull() ?: 0.0
    val totalCl = bankCl + cashCl

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Financial Accounting Summary", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SummaryCard(
                title = "Total Opening Balance",
                mainValue = DashboardFormatters.money(totalOp.toString()),
                subLeft = "Bank: ${DashboardFormatters.money(bankOp.toString())}",
                subRight = "Cash: ${DashboardFormatters.money(cashOp.toString())}",
                badgeColor = Color(0xFFE0F2FE),
                modifier = Modifier.weight(1f)
            )
            SummaryCard(
                title = "Total Income",
                mainValue = DashboardFormatters.money(totalInc.toString()),
                subLeft = "Bank: ${DashboardFormatters.money(bankInc.toString())}",
                subRight = "Cash: ${DashboardFormatters.money(cashInc.toString())}",
                badgeColor = Color(0xFFDCFCE7),
                modifier = Modifier.weight(1f)
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SummaryCard(
                title = "Total Expenses",
                mainValue = DashboardFormatters.money(totalExp.toString()),
                subLeft = "Bank: ${DashboardFormatters.money(bankExp.toString())}",
                subRight = "Cash: ${DashboardFormatters.money(cashExp.toString())}",
                badgeColor = Color(0xFFFEE2E2),
                modifier = Modifier.weight(1f)
            )
            SummaryCard(
                title = "Total Closing Balance",
                mainValue = DashboardFormatters.money(totalCl.toString()),
                subLeft = "Bank: ${DashboardFormatters.money(bankCl.toString())}",
                subRight = "Cash: ${DashboardFormatters.money(cashCl.toString())}",
                badgeColor = Color(0xFFFEF3C7),
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun MonthWiseFinancialBreakdownTable(state: com.example.application.viewmodel.AdminReportsUiState) {
    val months = state.data?.financial?.months ?: state.data?.financial?.monthlyBreakdown.orEmpty()
    val isDark = isSystemInDarkTheme()
    val greenColor = if (isDark) Color(0xFF4ADE80) else Color(0xFF16A34A)
    val redColor = if (isDark) Color(0xFFF87171) else Color(0xFFDC2626)

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            "Month-Wise Financial Accounting Breakdown (FY ${state.filter.financialYear})",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        val headers = listOf("Month", "Opening", "Bank Income", "Cash Income", "Total Income", "Bank Expense", "Cash Expense", "Total Expenses", "Net Surplus", "Closing")
        val widths = listOf(110.dp, 100.dp, 100.dp, 100.dp, 110.dp, 100.dp, 100.dp, 110.dp, 110.dp, 110.dp)

        ReportTableContainer(headers = headers, widths = widths, items = months) { m ->
            val monthName = formatMonthName(m.month ?: m.monthNum)
            val bankInc = (m.bankIncome ?: "0").toDoubleOrNull() ?: 0.0
            val cashInc = (m.cashIncome ?: "0").toDoubleOrNull() ?: 0.0
            val totalInc = (m.totalIncome ?: (bankInc + cashInc).toString()).toDoubleOrNull() ?: 0.0

            val bankExp = (m.bankExpenses ?: "0").toDoubleOrNull() ?: 0.0
            val cashExp = (m.cashExpenses ?: "0").toDoubleOrNull() ?: 0.0
            val totalExp = (m.totalExpenses ?: (bankExp + cashExp).toString()).toDoubleOrNull() ?: 0.0

            val net = (m.netAmount ?: (totalInc - totalExp).toString()).toDoubleOrNull() ?: 0.0

            Text(monthName, modifier = Modifier.width(110.dp), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            Text(DashboardFormatters.money(m.totalOpening), modifier = Modifier.width(100.dp), color = MaterialTheme.colorScheme.onSurface)
            Text(DashboardFormatters.money(bankInc.toString()), modifier = Modifier.width(100.dp), color = greenColor)
            Text(DashboardFormatters.money(cashInc.toString()), modifier = Modifier.width(100.dp), color = greenColor)
            Text(DashboardFormatters.money(totalInc.toString()), modifier = Modifier.width(110.dp), color = greenColor, fontWeight = FontWeight.Bold)
            Text(DashboardFormatters.money(bankExp.toString()), modifier = Modifier.width(100.dp), color = redColor)
            Text(DashboardFormatters.money(cashExp.toString()), modifier = Modifier.width(100.dp), color = redColor)
            Text(DashboardFormatters.money(totalExp.toString()), modifier = Modifier.width(110.dp), color = redColor, fontWeight = FontWeight.Bold)
            Text(DashboardFormatters.money(net.toString()), modifier = Modifier.width(110.dp), color = if (net >= 0) greenColor else redColor, fontWeight = FontWeight.Bold)
            Text(DashboardFormatters.money(m.totalClosing), modifier = Modifier.width(110.dp), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@Composable
private fun SummaryCard(
    title: String,
    mainValue: String,
    subLeft: String,
    subRight: String,
    badgeColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(title, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(mainValue, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(subLeft, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(subRight, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun AdminReportSearchBar(
    viewModel: AdminReportsViewModel,
    state: com.example.application.viewmodel.AdminReportsUiState
) {
    OutlinedTextField(
        value = state.filter.search,
        onValueChange = viewModel::updateSearch,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        placeholder = { Text("Search by resident, flat, category, vendor, status...", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) },
        leadingIcon = { Icon(Icons.Filled.Search, contentDescription = "Search Reports", tint = MaterialTheme.colorScheme.primary) },
        trailingIcon = {
            if (state.filter.search.isNotBlank()) {
                IconButton(onClick = { viewModel.updateSearch("") }) {
                    Icon(Icons.Filled.Close, contentDescription = "Clear Search")
                }
            }
        },
        singleLine = true,
        shape = RoundedCornerShape(14.dp)
    )
}

@Composable
private fun AdminMonthlyReportTable(
    items: List<MonthlyMaintenanceRowDto>,
    viewModel: AdminReportsViewModel
) {
    val headers = listOf("Resident", "Month", "Maintenance", "Penalty", "Discount", "Write-Off", "Total Payable", "Paid Amount", "Outstanding", "Status", "Actions")
    val widths = listOf(140.dp, 100.dp, 100.dp, 90.dp, 90.dp, 90.dp, 110.dp, 110.dp, 110.dp, 120.dp, 100.dp)
    val isDark = isSystemInDarkTheme()
    val greenColor = if (isDark) Color(0xFF4ADE80) else Color(0xFF16A34A)
    val redColor = if (isDark) Color(0xFFF87171) else Color(0xFFDC2626)
    val orangeColor = if (isDark) Color(0xFFFB923C) else Color(0xFFDD6B20)
    val purpleColor = if (isDark) Color(0xFFC084FC) else Color(0xFF9333EA)

    ReportTableContainer(headers = headers, widths = widths, items = items) { item ->
        Column(modifier = Modifier.width(140.dp)) {
            Text(item.residentName ?: (if (item.wing != null) "Wing ${item.wing} - ${item.flatNo}" else (item.flatNo ?: "Unassigned")), fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurface)
            if (item.wing != null) Text("Wing ${item.wing} - ${item.flatNo ?: ""}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text("${formatMonthName(item.month)} ${item.year ?: ""}", modifier = Modifier.width(100.dp), color = MaterialTheme.colorScheme.onSurface)
        Text(DashboardFormatters.money(item.maintenanceAmount), modifier = Modifier.width(100.dp), color = MaterialTheme.colorScheme.onSurface)
        Text(DashboardFormatters.money(item.penalty), modifier = Modifier.width(90.dp), color = orangeColor)
        Text(DashboardFormatters.money(item.discountAmount), modifier = Modifier.width(90.dp), color = greenColor)
        Text(DashboardFormatters.money(item.writeOffAmount), modifier = Modifier.width(90.dp), color = purpleColor)
        Text(DashboardFormatters.money(item.totalPayable), modifier = Modifier.width(110.dp), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
        Text(DashboardFormatters.money(item.paidAmount), modifier = Modifier.width(110.dp), color = greenColor, fontWeight = FontWeight.Bold)
        Text(DashboardFormatters.money(item.outstandingAmount), modifier = Modifier.width(110.dp), color = redColor, fontWeight = FontWeight.Bold)
        StatusBadge(status = item.calculatedStatus ?: item.billStatus ?: "PENDING", modifier = Modifier.width(120.dp))
        Row(modifier = Modifier.width(100.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            if (item.calculatedStatus == "VERIFICATION_PENDING" && item.latestPaymentId != null) {
                IconButton(onClick = { viewModel.approvePayment(item.latestPaymentId) }, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Filled.CheckCircle, contentDescription = "Approve", tint = greenColor)
                }
            }
        }
    }
}

@Composable
private fun ReportLedgerSection(
    title: String,
    opening: String,
    closing: String,
    transactions: List<FinancialTransactionDto>
) {
    val isDark = isSystemInDarkTheme()
    val greenColor = if (isDark) Color(0xFF4ADE80) else Color(0xFF16A34A)
    val redColor = if (isDark) Color(0xFFF87171) else Color(0xFFDC2626)

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Text("Closing: ${DashboardFormatters.money(closing)}", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
        }

        val headers = listOf("Date", "Description", "Type", "Amount (₹)", "Running Balance (₹)")
        val widths = listOf(110.dp, 200.dp, 90.dp, 110.dp, 140.dp)

        ReportTableContainer(headers = headers, widths = widths, items = transactions) { tx ->
            Text(DashboardFormatters.date(tx.transactionDate ?: tx.date), modifier = Modifier.width(110.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(tx.description ?: "Transaction", modifier = Modifier.width(200.dp), maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurface)
            Text(tx.transactionType ?: "INCOME", modifier = Modifier.width(90.dp), color = if (tx.transactionType == "EXPENSE") redColor else greenColor, fontWeight = FontWeight.Bold)
            Text(DashboardFormatters.money(tx.amount ?: tx.income ?: tx.expense), modifier = Modifier.width(110.dp), color = MaterialTheme.colorScheme.onSurface)
            Text(DashboardFormatters.money(tx.runningBalance), modifier = Modifier.width(140.dp), fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@Composable
private fun AdminExpensesTable(items: List<com.example.application.data.remote.dto.ExpenseDto>, fy: String) {
    val isDark = isSystemInDarkTheme()
    val greenColor = if (isDark) Color(0xFF4ADE80) else Color(0xFF16A34A)
    val redColor = if (isDark) Color(0xFFF87171) else Color(0xFFDC2626)

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Column {
            Text("Expense Audit Log", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Text("Itemized breakdown of all approved society expenditure for FY $fy", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        val headers = listOf("EXPENSE NO", "DATE", "CATEGORY", "VENDOR", "PAYMENT METHOD", "AMOUNT", "STATUS", "DESCRIPTION")
        val widths = listOf(110.dp, 100.dp, 120.dp, 140.dp, 120.dp, 110.dp, 90.dp, 180.dp)
        ReportTableContainer(headers = headers, widths = widths, items = items) { exp ->
            Text(exp.expenseNumber ?: "—", modifier = Modifier.width(110.dp), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Text(exp.expenseDate ?: "—", modifier = Modifier.width(100.dp), color = MaterialTheme.colorScheme.onSurface)
            Text(exp.category ?: "—", modifier = Modifier.width(120.dp), color = MaterialTheme.colorScheme.onSurface)
            Text(exp.vendor ?: "—", modifier = Modifier.width(140.dp), maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurface)
            val methodStr = exp.paymentMethod ?: exp.accountType ?: "CASH"
            val method = methodStr.uppercase()
            Text(methodStr, modifier = Modifier.width(120.dp), color = if (method == "CASH") greenColor else MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
            Text(DashboardFormatters.money(exp.amount), modifier = Modifier.width(110.dp), color = redColor, fontWeight = FontWeight.Bold)
            StatusBadge(status = exp.status ?: "Paid", modifier = Modifier.width(90.dp))
            Text(exp.description ?: "—", modifier = Modifier.width(180.dp), maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@Composable
private fun FlatCollectionTable(items: List<FlatPaymentReportDto>, fy: String) {
    val isDark = isSystemInDarkTheme()
    val greenColor = if (isDark) Color(0xFF4ADE80) else Color(0xFF16A34A)
    val redColor = if (isDark) Color(0xFFF87171) else Color(0xFFDC2626)

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Column {
            Text("Flat Collection Report", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Text("Month-wise flat maintenance billing, payments and outstanding balances for FY $fy", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        val headers = listOf("WING", "FLAT", "RESIDENT", "MONTH / YEAR", "BILL AMOUNT", "PAID", "PENDING", "STATUS")
        val widths = listOf(55.dp, 75.dp, 150.dp, 110.dp, 110.dp, 110.dp, 110.dp, 100.dp)
        ReportTableContainer(headers = headers, widths = widths, items = items) { row ->
            Text(row.wing ?: "—", modifier = Modifier.width(55.dp), color = MaterialTheme.colorScheme.onSurface)
            Text(row.flatNo ?: "—", modifier = Modifier.width(75.dp), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Text(row.residentName ?: "—", modifier = Modifier.width(150.dp), maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurface)
            Text("${formatMonthName(row.month)} ${row.year ?: ""}".trim(), modifier = Modifier.width(110.dp), color = MaterialTheme.colorScheme.onSurface)
            Text(DashboardFormatters.money(row.billAmount), modifier = Modifier.width(110.dp), fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
            Text(DashboardFormatters.money(row.paidAmount), modifier = Modifier.width(110.dp), color = greenColor, fontWeight = FontWeight.Bold)
            Text(DashboardFormatters.money(row.pendingAmount), modifier = Modifier.width(110.dp), color = redColor, fontWeight = FontWeight.Bold)
            StatusBadge(status = row.status ?: "Pending", modifier = Modifier.width(100.dp))
        }
    }
}

@Composable
private fun WriteOffsHistoryTable(items: List<MaintenanceWaiverDto>, fy: String) {
    val isDark = isSystemInDarkTheme()
    val greenColor = if (isDark) Color(0xFF4ADE80) else Color(0xFF15803D)
    val redColor = if (isDark) Color(0xFFF87171) else Color(0xFFB91C1C)

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Column {
            Text("Write-offs History", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Text("Complete audit trail of all maintenance write-offs, waivers and billing adjustments for FY $fy", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        val headers = listOf("RESIDENT / FLAT", "BILLING PERIOD", "ORIGINAL BILL", "WRITTEN OFF", "AMOUNT COLLECTED", "TYPE", "APPROVED BY", "REASON")
        val widths = listOf(160.dp, 110.dp, 110.dp, 110.dp, 120.dp, 110.dp, 120.dp, 180.dp)
        ReportTableContainer(headers = headers, widths = widths, items = items) { w ->
            Column(modifier = Modifier.width(160.dp)) {
                Text(w.residentName ?: "—", fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurface)
                Text("Flat ${w.flatNo ?: "—"} · Wing ${w.wing ?: "—"}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text("${formatMonthName(w.month)} ${w.year ?: ""}".trim(), modifier = Modifier.width(110.dp), color = MaterialTheme.colorScheme.onSurface)
            Text(DashboardFormatters.money(w.billTotal), modifier = Modifier.width(110.dp), fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
            Text(DashboardFormatters.money(w.waiverAmount), modifier = Modifier.width(110.dp), color = redColor, fontWeight = FontWeight.Bold)
            Text(DashboardFormatters.money(w.billPaid), modifier = Modifier.width(120.dp), color = greenColor, fontWeight = FontWeight.Bold)
            StatusBadge(status = w.type ?: w.waiverType ?: "—", modifier = Modifier.width(110.dp))
            Text(w.adminName ?: "—", modifier = Modifier.width(120.dp), maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurface)
            Text(w.reason ?: "—", modifier = Modifier.width(180.dp), maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun <T> ReportTableContainer(
    headers: List<String>,
    widths: List<Dp>,
    items: List<T>,
    rowContent: @Composable (T) -> Unit
) {
    val scrollState = rememberScrollState()
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().horizontalScroll(scrollState)) {
            Row(
                modifier = Modifier.background(MaterialTheme.colorScheme.surfaceVariant).padding(vertical = 12.dp, horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                headers.forEachIndexed { idx, h ->
                    Text(h, modifier = Modifier.width(widths.getOrElse(idx) { 100.dp }), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            if (items.isEmpty()) {
                Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                    Text("No report entries found", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                items.forEachIndexed { idx, item ->
                    Row(
                        modifier = Modifier.background(if (idx % 2 == 0) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)).padding(vertical = 12.dp, horizontal = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        rowContent(item)
                    }
                    if (idx < items.size - 1) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                }
            }
        }
    }
}
