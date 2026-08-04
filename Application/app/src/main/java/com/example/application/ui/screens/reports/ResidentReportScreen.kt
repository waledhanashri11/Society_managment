package com.example.application.ui.screens.reports

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
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import com.example.application.data.remote.dto.FinancialTransactionDto
import com.example.application.data.remote.dto.MonthlyMaintenanceRowDto
import com.example.application.data.remote.dto.ResidentExpenseReportDto
import com.example.application.ui.components.DashboardSkeleton
import com.example.application.ui.components.ErrorMessageCard
import com.example.application.ui.components.StatusBadge
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.ResidentReportsViewModel

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
fun ResidentReportsScreen(
    onBack: () -> Unit,
    viewModel: ResidentReportsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val fyList = listOf("2026-2027", "2025-2026", "2024-2025")
    var activeTab by remember { mutableStateOf("summary") }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Society Financial & Maintenance Reports", fontWeight = FontWeight.Bold)
                        Text("FY: ${state.filter.financialYear}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
            modifier = Modifier.fillMaxSize().padding(padding)
        ) {
            if (state.isLoading && state.data == null) {
                DashboardSkeleton()
            } else {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Year / Month filter bar
                    val availableYears = remember(state.data) {
                        val fromMonthly = state.data?.monthlyReport?.mapNotNull { it.year }?.distinct().orEmpty()
                        val fromMaint = state.data?.myMaintenance?.mapNotNull { it.year }?.distinct().orEmpty()
                        val combined = (fromMonthly + fromMaint).distinct().sortedDescending()
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

                    // Exact 6 Tabs matching Website ResidentReports.jsx
                    ScrollableTabRow(
                        selectedTabIndex = listOf("summary", "monthlyReport", "expenses", "bankLedger", "cashLedger", "myAccount").indexOf(activeTab).coerceAtLeast(0),
                        edgePadding = 16.dp,
                        containerColor = MaterialTheme.colorScheme.surface,
                        contentColor = MaterialTheme.colorScheme.primary
                    ) {
                        Tab(selected = activeTab == "summary", onClick = { activeTab = "summary" }, text = { Text("Financial Accounting Summary") })
                        Tab(selected = activeTab == "monthlyReport", onClick = { activeTab = "monthlyReport" }, text = { Text("Monthly Maintenance Report") })
                        Tab(selected = activeTab == "expenses", onClick = { activeTab = "expenses" }, text = { Text("Expense Report") })
                        Tab(selected = activeTab == "bankLedger", onClick = { activeTab = "bankLedger" }, text = { Text("Bank Account Ledger") })
                        Tab(selected = activeTab == "cashLedger", onClick = { activeTab = "cashLedger" }, text = { Text("Cash Account Ledger") })
                        Tab(selected = activeTab == "myAccount", onClick = { activeTab = "myAccount" }, text = { Text("My Personal Account Statement") })
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
                                item { ResidentFinancialSummarySection(state) }
                                item { ResidentMonthWiseFinancialBreakdownTable(state) }
                            }
                            "monthlyReport" -> {
                                item { ResidentMonthlyReportTable(items = state.data?.monthlyReport.orEmpty()) }
                            }
                            "expenses" -> {
                                item { ResidentExpensesTable(items = state.data?.expenses.orEmpty(), fy = state.filter.financialYear) }
                            }
                            "bankLedger" -> {
                                item {
                                    val bankLedger = state.data?.bankLedger
                                    ResidentLedgerTable(
                                        title = "Verified Bank Account Transactions Ledger",
                                        subtitle = "Read-only transparent audit log of verified bank transactions",
                                        transactions = bankLedger?.ledger ?: state.data?.financial?.bankTransactions.orEmpty()
                                    )
                                }
                            }
                            "cashLedger" -> {
                                item {
                                    val cashLedger = state.data?.cashLedger
                                    ResidentLedgerTable(
                                        title = "Cash Account Transaction Ledger",
                                        subtitle = "All recorded cash income and expense transactions",
                                        transactions = cashLedger?.ledger ?: state.data?.financial?.cashTransactions.orEmpty()
                                    )
                                }
                            }
                            "myAccount" -> {
                                item { ResidentPersonalAccountSection(state) }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ResidentFinancialSummarySection(state: com.example.application.viewmodel.ResidentReportsUiState) {
    val summary = state.data?.financial?.summary
    val bankOp = (summary?.bankOpening ?: "0").toDoubleOrNull() ?: 0.0
    val cashOp = (summary?.cashOpening ?: "0").toDoubleOrNull() ?: 0.0

    val bankInc = (summary?.bankIncome ?: "0").toDoubleOrNull() ?: 0.0
    val cashInc = (summary?.cashIncome ?: "0").toDoubleOrNull() ?: 0.0
    val totalInc = bankInc + cashInc

    val bankExp = (summary?.bankExpenses ?: "0").toDoubleOrNull() ?: 0.0
    val cashExp = (summary?.cashExpenses ?: "0").toDoubleOrNull() ?: 0.0
    val totalExp = bankExp + cashExp

    val bankCl = (summary?.bankClosing ?: (bankOp + bankInc - bankExp).toString()).toDoubleOrNull() ?: 0.0
    val cashCl = (summary?.cashClosing ?: (cashOp + cashInc - cashExp).toString()).toDoubleOrNull() ?: 0.0
    val totalCl = bankCl + cashCl
    val netSurplus = totalInc - totalExp

    val isDark = isSystemInDarkTheme()
    val greenColor = if (isDark) Color(0xFF4ADE80) else Color(0xFF16A34A)
    val redColor = if (isDark) Color(0xFFF87171) else Color(0xFFDC2626)

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Society Financial Overview", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            AccountStatCard(title = "TOTAL CLOSING BALANCE", amount = totalCl.toString(), color = MaterialTheme.colorScheme.primary, modifier = Modifier.weight(1f))
            AccountStatCard(title = "BANK CLOSING BALANCE", amount = bankCl.toString(), color = MaterialTheme.colorScheme.primary, modifier = Modifier.weight(1f))
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            AccountStatCard(title = "CASH CLOSING BALANCE", amount = cashCl.toString(), color = greenColor, modifier = Modifier.weight(1f))
            AccountStatCard(title = "TOTAL EXPENSES", amount = totalExp.toString(), color = redColor, modifier = Modifier.weight(1f))
        }

        AccountStatCard(title = "NET SURPLUS / DEFICIT", amount = netSurplus.toString(), color = if (netSurplus >= 0) greenColor else redColor, modifier = Modifier.fillMaxWidth())
    }
}

@Composable
private fun ResidentMonthWiseFinancialBreakdownTable(state: com.example.application.viewmodel.ResidentReportsUiState) {
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

        val headers = listOf("MONTH", "OPENING", "BANK INCOME", "CASH INCOME", "TOTAL INCOME", "BANK EXPENSE", "CASH EXPENSE", "TOTAL EXPENSES", "NET SURPLUS", "CLOSING")
        val widths = listOf(110.dp, 100.dp, 100.dp, 100.dp, 110.dp, 100.dp, 100.dp, 110.dp, 110.dp, 110.dp)

        ResidentTableContainer(headers = headers, widths = widths, items = months) { m ->
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
private fun ResidentMonthlyReportFilters(
    viewModel: ResidentReportsViewModel,
    state: com.example.application.viewmodel.ResidentReportsUiState
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Filled.FilterList, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Text("Report Multi-Filters", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                }
                TextButton(onClick = { viewModel.resetFilters() }) {
                    Icon(Icons.Filled.RestartAlt, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Reset Filters")
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = state.filter.search,
                    onValueChange = viewModel::updateSearch,
                    modifier = Modifier.weight(1.5f),
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                    label = { Text("Search flat, wing, resident...") },
                    singleLine = true
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("All", "PAID", "PENDING").forEach { st ->
                    FilterChip(
                        selected = state.filter.status.equals(st, ignoreCase = true),
                        onClick = { viewModel.updateStatus(st) },
                        label = { Text(if (st == "All") "All Statuses" else st) }
                    )
                }
            }
        }
    }
}

@Composable
private fun ResidentMonthlyReportTable(
    items: List<MonthlyMaintenanceRowDto>,
    onSelectReceipt: (MonthlyMaintenanceRowDto) -> Unit = {}
) {
    val isDark = isSystemInDarkTheme()
    val greenColor = if (isDark) Color(0xFF4ADE80) else Color(0xFF16A34A)
    val redColor = if (isDark) Color(0xFFF87171) else Color(0xFFDC2626)
    val orangeColor = if (isDark) Color(0xFFFB923C) else Color(0xFFDD6B20)

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Monthly Maintenance Collection Table (${items.size} Records)", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)

        val headers = listOf("RESIDENT", "MONTH", "MAINTENANCE", "PENALTY", "DISCOUNT", "TOTAL PAYABLE", "PAID AMOUNT", "OUTSTANDING", "STATUS", "RECEIPT")
        val widths = listOf(140.dp, 100.dp, 100.dp, 90.dp, 90.dp, 110.dp, 110.dp, 110.dp, 110.dp, 90.dp)

        ResidentTableContainer(headers = headers, widths = widths, items = items) { row ->
            Column(modifier = Modifier.width(140.dp)) {
                Text(row.residentName ?: (if (row.wing != null) "Wing ${row.wing} - ${row.flatNo}" else (row.flatNo ?: "—")), fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurface)
                Text("Wing ${row.wing ?: "A"} - ${row.flatNo ?: "-"}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text("${formatMonthName(row.month)} ${row.year ?: ""}", modifier = Modifier.width(100.dp), color = MaterialTheme.colorScheme.onSurface)
            Text(DashboardFormatters.money(row.maintenanceAmount), modifier = Modifier.width(100.dp), color = MaterialTheme.colorScheme.onSurface)
            Text(DashboardFormatters.money(row.penalty), modifier = Modifier.width(90.dp), color = orangeColor)
            Text(DashboardFormatters.money(row.discountAmount), modifier = Modifier.width(90.dp), color = greenColor)
            Text(DashboardFormatters.money(row.totalPayable), modifier = Modifier.width(110.dp), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Text(DashboardFormatters.money(row.paidAmount), modifier = Modifier.width(110.dp), color = greenColor, fontWeight = FontWeight.Bold)
            Text(DashboardFormatters.money(row.outstandingAmount), modifier = Modifier.width(110.dp), color = redColor, fontWeight = FontWeight.Bold)
            val st = row.calculatedStatus ?: row.billStatus ?: "PENDING"
            StatusBadge(status = st, modifier = Modifier.width(110.dp))
            Box(modifier = Modifier.width(90.dp), contentAlignment = Alignment.Center) {
                if (st.equals("PAID", ignoreCase = true) || st.equals("PARTIALLY_PAID", ignoreCase = true)) {
                    IconButton(onClick = { onSelectReceipt(row) }, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Filled.ReceiptLong, contentDescription = "View Receipt", tint = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
    }
}

@Composable
private fun ResidentExpensesTable(items: List<ResidentExpenseReportDto>, fy: String) {
    val isDark = isSystemInDarkTheme()
    val redColor = if (isDark) Color(0xFFF87171) else Color(0xFFDC2626)

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Society Maintenance Expenses Report", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)

        val headers = listOf("EXPENSE #", "DATE", "CATEGORY", "VENDOR", "ACCOUNT / MODE", "AMOUNT", "STATUS", "DESCRIPTION")
        val widths = listOf(100.dp, 100.dp, 120.dp, 130.dp, 120.dp, 110.dp, 90.dp, 180.dp)

        ResidentTableContainer(headers = headers, widths = widths, items = items) { exp ->
            Text(exp.expenseNumber ?: (if (exp.id != null) "EXP-${exp.id}" else "—"), modifier = Modifier.width(100.dp), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Text(DashboardFormatters.date(exp.date), modifier = Modifier.width(100.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(exp.category ?: "General", modifier = Modifier.width(120.dp), color = MaterialTheme.colorScheme.onSurface)
            Text(exp.expenseTitle ?: "-", modifier = Modifier.width(130.dp), maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurface)
            Text("BANK", modifier = Modifier.width(120.dp), color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
            Text(DashboardFormatters.money(exp.amount), modifier = Modifier.width(110.dp), color = redColor, fontWeight = FontWeight.Bold)
            StatusBadge(status = "Paid", modifier = Modifier.width(90.dp))
            Text(exp.description ?: "—", modifier = Modifier.width(180.dp), maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@Composable
private fun ResidentLedgerTable(
    title: String,
    subtitle: String,
    transactions: List<FinancialTransactionDto>,
    searchQuery: String = "",
    onSearchChange: ((String) -> Unit)? = null
) {
    val isDark = isSystemInDarkTheme()
    val greenColor = if (isDark) Color(0xFF4ADE80) else Color(0xFF16A34A)
    val redColor = if (isDark) Color(0xFFF87171) else Color(0xFFDC2626)

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Column {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Text(subtitle, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        if (onSearchChange != null) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = onSearchChange,
                modifier = Modifier.fillMaxWidth(),
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = "Search Ledger") },
                label = { Text("Search Txn Description / Type / Amount") },
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )
        }

        val headers = listOf("DATE", "TYPE", "DESCRIPTION / REFERENCE", "AMOUNT", "RUNNING BALANCE")
        val widths = listOf(110.dp, 90.dp, 220.dp, 110.dp, 140.dp)

        ResidentTableContainer(headers = headers, widths = widths, items = transactions) { tx ->
            val isIncome = (tx.transactionType ?: "INCOME").equals("INCOME", ignoreCase = true)
            Text(DashboardFormatters.date(tx.transactionDate ?: tx.date), modifier = Modifier.width(110.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(tx.transactionType ?: "INCOME", modifier = Modifier.width(90.dp), color = if (isIncome) greenColor else redColor, fontWeight = FontWeight.Bold)
            Text(tx.description ?: tx.referenceNumber ?: "Transaction", modifier = Modifier.width(220.dp), maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurface)
            Text("${if (isIncome) "+ " else "- "}${DashboardFormatters.money(tx.amount ?: tx.income ?: tx.expense)}", modifier = Modifier.width(110.dp), color = if (isIncome) greenColor else redColor, fontWeight = FontWeight.Bold)
            Text(DashboardFormatters.money(tx.runningBalance), modifier = Modifier.width(140.dp), fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@Composable
private fun ResidentPersonalAccountSection(
    state: com.example.application.viewmodel.ResidentReportsUiState,
) {
    val account = state.data?.accountReport
    val summary = account?.summary
    val resident = account?.resident
    val myBills = account?.bills.orEmpty()

    val isDark = isSystemInDarkTheme()
    val greenColor = if (isDark) Color(0xFF4ADE80) else Color(0xFF16A34A)
    val redColor = if (isDark) Color(0xFFF87171) else Color(0xFFDC2626)
    val purpleColor = if (isDark) Color(0xFFC084FC) else Color(0xFF9333EA)
    val orangeColor = if (isDark) Color(0xFFFB923C) else Color(0xFFDD6B20)

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        resident?.let {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
            ) {
                Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text(it.name ?: "Resident", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                        Text("Wing ${it.wing ?: "A"} - Flat ${it.flatNo ?: "-"}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.primaryContainer) {
                        Text("Personal Statement", modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            AccountStatCard(title = "Opening Outstanding", amount = summary?.openingOutstanding ?: "0", modifier = Modifier.weight(1f))
            AccountStatCard(title = "Total Approved Paid", amount = summary?.approvedPayments ?: "0", color = greenColor, modifier = Modifier.weight(1f))
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            AccountStatCard(title = "Waivers / Write-offs", amount = summary?.approvedWriteOffs ?: "0", color = purpleColor, modifier = Modifier.weight(1f))
            AccountStatCard(title = "Closing Outstanding", amount = summary?.closingOutstanding ?: "0", color = redColor, modifier = Modifier.weight(1f))
        }

        // My personal billing history — only my bills
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                "Personal Monthly Billing & Payment History (${myBills.size} records)",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            if (myBills.isEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                        Text("No billing records found for this account.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            } else {
                val headers = listOf("MONTH", "YEAR", "BILL AMOUNT", "PAID", "PENDING", "WRITE-OFF", "DUE DATE", "STATUS")
                val widths = listOf(110.dp, 70.dp, 110.dp, 100.dp, 100.dp, 100.dp, 110.dp, 110.dp)
                ResidentTableContainer(headers = headers, widths = widths, items = myBills) { bill ->
                    Text(bill.month ?: "—", modifier = Modifier.width(110.dp), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Text(bill.year ?: "—", modifier = Modifier.width(70.dp), color = MaterialTheme.colorScheme.onSurface)
                    Text(DashboardFormatters.money(bill.billAmount), modifier = Modifier.width(110.dp), color = MaterialTheme.colorScheme.onSurface)
                    Text(DashboardFormatters.money(bill.paidAmount), modifier = Modifier.width(100.dp), color = greenColor, fontWeight = FontWeight.SemiBold)
                    Text(DashboardFormatters.money(bill.pendingAmount), modifier = Modifier.width(100.dp), color = redColor, fontWeight = FontWeight.SemiBold)
                    Text(DashboardFormatters.money(bill.writeOffAmount), modifier = Modifier.width(100.dp), color = purpleColor)
                    Text(DashboardFormatters.date(bill.dueDate), modifier = Modifier.width(110.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    StatusBadge(status = bill.status ?: "PENDING", modifier = Modifier.width(110.dp))
                }
            }
        }
    }
}

@Composable
private fun ReceiptDialog(
    item: MonthlyMaintenanceRowDto,
    onDismiss: () -> Unit,
    context: android.content.Context
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Filled.ReceiptLong, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Text("Maintenance Payment Receipt", fontWeight = FontWeight.Bold)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Receipt ID:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("RCPT-${item.latestPaymentId ?: "1042"}", fontWeight = FontWeight.Bold)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Billing Month:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("${formatMonthName(item.month)} ${item.year ?: ""}", fontWeight = FontWeight.Bold)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Resident / Flat:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("${item.residentName ?: "Resident"} (Flat ${item.flatNo ?: "-"})", fontWeight = FontWeight.Bold)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Paid Amount:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(DashboardFormatters.money(item.paidAmount ?: item.totalPayable), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Status:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            StatusBadge(status = item.calculatedStatus ?: item.billStatus ?: "PAID")
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val sendIntent: android.content.Intent = android.content.Intent().apply {
                        action = android.content.Intent.ACTION_SEND
                        putExtra(android.content.Intent.EXTRA_TEXT, "Maintenance Payment Receipt\nReceipt ID: RCPT-${item.latestPaymentId ?: "N/A"}\nMonth: ${formatMonthName(item.month)} ${item.year ?: ""}\nAmount Paid: ${DashboardFormatters.money(item.paidAmount ?: item.totalPayable)}\nStatus: PAID")
                        type = "text/plain"
                    }
                    val shareIntent = android.content.Intent.createChooser(sendIntent, "Share Receipt")
                    context.startActivity(shareIntent)
                    onDismiss()
                }
            ) {
                Icon(Icons.Filled.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Share / Print Receipt")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Close") }
        }
    )
}

@Composable
private fun AccountStatCard(
    title: String,
    amount: String,
    color: Color = MaterialTheme.colorScheme.primary,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(DashboardFormatters.money(amount), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = color)
        }
    }
}

@Composable
private fun <T> ResidentTableContainer(
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
