package com.example.application.ui.screens.reports

import android.content.Context
import android.content.Intent
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
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
import androidx.compose.material3.AlertDialog
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
import androidx.compose.material3.HorizontalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.foundation.rememberScrollState
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
import androidx.core.content.FileProvider
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
import com.example.application.data.remote.dto.FinancialReportDto
import java.math.BigDecimal
import java.io.File
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminReportsScreen(
    onBack: () -> Unit,
    viewModel: AdminReportsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var tab by remember { mutableStateOf(0) }
    var selectedYear by remember { mutableStateOf<String?>(null) }
    var selectedMonth by remember { mutableStateOf<Pair<Int, Int>?>(null) }
    var search by remember { mutableStateOf("") }
    var statusFilter by remember { mutableStateOf("All") }
    var pendingCsv by remember { mutableStateOf<String?>(null) }
    val csvLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        runCatching { context.contentResolver.openOutputStream(uri)?.use { it.write(pendingCsv.orEmpty().toByteArray()) } }
            .onSuccess { Toast.makeText(context, "Report CSV saved", Toast.LENGTH_SHORT).show() }
            .onFailure { Toast.makeText(context, "CSV export failed", Toast.LENGTH_LONG).show() }
    }
    val data = state.data
    val years = remember(data) { data?.financialYears().orEmpty() }
    val activeYear = selectedYear ?: years.firstOrNull()
    val periodData = remember(data, activeYear, search, statusFilter) { data?.forFinancialYear(activeYear)?.filtered(search, statusFilter) }
    val previousYear = activeYear?.let { fy -> fy.substringBefore('-').toIntOrNull()?.minus(1)?.let { "$it-${it + 1}" } }
    val previousData = remember(data, previousYear) { data?.forFinancialYear(previousYear) }
    Scaffold(topBar = {
        TopAppBar(title = { Column { Text("Reports", fontWeight = FontWeight.Bold); Text("Admin", style = MaterialTheme.typography.labelSmall) } }, navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } }, actions = {
            IconButton(onClick = { viewModel.load(refresh = true) }) { Icon(Icons.Filled.Refresh, "Refresh") }
        })
    }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            item {
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Color(0xFFEAF1FF)).padding(4.dp)) {
                    listOf("Monthly", "Annual").forEachIndexed { index, label ->
                        FilterChip(selected = tab == index, onClick = { tab = index }, label = { Text(label) }, modifier = Modifier.weight(1f))
                    }
                }
            }
            state.error?.let { item { RetryState(it, onRetry = { viewModel.load(true) }) } }
            if (state.isLoading && data == null) item { AppLoadingIndicator() }
            else if (periodData == null || activeYear == null) item { EmptyState("No report data", "No financial records are available yet.") }
            else {
                item {
                    Text("Financial year", style = MaterialTheme.typography.labelMedium, color = ReportBlue)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 6.dp)) {
                        years.forEach { year -> FilterChip(selected = year == activeYear, onClick = { selectedYear = year }, label = { Text(year) }) }
                    }
                }
                item {
                    OutlinedTextField(value = search, onValueChange = { search = it }, modifier = Modifier.fillMaxWidth(), singleLine = true, label = { Text("Search bills, residents or flats") }, leadingIcon = { Icon(Icons.Filled.FilterList, null) })
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 6.dp)) { listOf("All", "Paid", "Pending", "Overdue", "Rejected", "Written-off").forEach { FilterChip(selected = statusFilter == it, onClick = { statusFilter = it }, label = { Text(it) }) } }
                    Text("Last refreshed: ${state.lastLoadedAt?.let { java.text.SimpleDateFormat("dd MMM yyyy, hh:mm a", java.util.Locale.getDefault()).format(java.util.Date(it)) } ?: "—"}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
                }
                data?.financial?.let { financial -> item { ScreenshotSummaryDashboard(financial) } }
                if (tab == 1) item { AnnualReportDashboard(periodData, previousData, onExport = { pendingCsv = periodData.toCsv(activeYear) + data?.financial.toFinancialCsv(); csvLauncher.launch("annual-report-$activeYear.csv") }, onPdf = { shareReportPdf(context, "Annual Report $activeYear", periodData.toCsv(activeYear) + data?.financial.toFinancialCsv()) }) }
                item { Text("Monthly reports", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ReportBlue) }
                val months = periodData.months()
                if (months.isEmpty()) item { EmptyState("No monthly data", "No bills or expenses were recorded in this financial year.") }
                else items(months, key = { "month-${it.first}-${it.second}" }) { month ->
                    MonthlyReportRow(periodData.forMonth(month.first, month.second), month.first, month.second, onClick = { selectedMonth = month; viewModel.loadMonthly(month.first, month.second) })
                }
                if (periodData.bills.isNotEmpty()) {
                    item { Text("Bill details", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ReportBlue) }
                    items(periodData.bills.take(50), key = { "detail-bill-${it.id}-${it.reportDate()}" }) { bill -> BillCard(bill) }
                }
                if (periodData.expenses.isNotEmpty()) {
                    item { Text("Expense details", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ReportBlue) }
                    items(periodData.expenses.take(50), key = { "detail-expense-${it.id}-${it.expenseDate}" }) { expense -> AdminExpenseCard(expense) }
                }
            }
        }
    }
    selectedMonth?.let { month -> state.monthly?.let { MonthlyFinancialDialog(it, month.first, month.second, onDismiss = { selectedMonth = null; viewModel.clearMonthly() }) } }
}

@Composable
private fun ScreenshotSummaryDashboard(report: FinancialReportDto) {
    val s = report.summary ?: return InfoCard(report.reason ?: "Financial report unavailable")
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ScreenshotBalanceCard("Opening Balance", s.totalOpening, s.bankOpening, s.cashOpening, ReportBlue, Modifier.weight(1f))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                ScreenshotAmountCard("Total Income", s.totalIncome, ReportGreen)
                ScreenshotAmountCard("Total Expenses", s.totalExpenses, Color(0xFFFF2538))
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ScreenshotBalanceCard("Closing Balance", s.totalClosing, s.bankClosing, s.cashClosing, Color(0xFF6D35E8), Modifier.weight(1f))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                val rate = report.collection?.collectionRate?.let { "$it%" } ?: "Unavailable"
                ScreenshotTextCard("Collection Rate", rate, ReportGreen)
                ScreenshotAmountCard("Pending Amount", report.collection?.pendingAmount, Color(0xFFFF5B15))
            }
        }
    }
}

@Composable private fun ScreenshotBalanceCard(title:String,total:String?,bank:String?,cash:String?,color:Color,modifier:Modifier){ Card(modifier=modifier,colors=CardDefaults.cardColors(containerColor=color.copy(alpha=.045f)),shape=RoundedCornerShape(14.dp)){Column(Modifier.padding(14.dp),verticalArrangement=Arrangement.spacedBy(6.dp)){Text(title,style=MaterialTheme.typography.labelMedium,color=Color(0xFF15204F));Text(DashboardFormatters.money(total.toMoneyDecimal()),fontWeight=FontWeight.Bold,color=Color(0xFF101C5C));Text("Bank: ${DashboardFormatters.money(bank.toMoneyDecimal())}",style=MaterialTheme.typography.labelSmall);Text("Cash: ${DashboardFormatters.money(cash.toMoneyDecimal())}",style=MaterialTheme.typography.labelSmall)}}}
@Composable
private fun ScreenshotAmountCard(title: String, amountText: String?, color: Color) {
    Card(
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = .05f)),
        shape = RoundedCornerShape(14.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            Text(title, style = MaterialTheme.typography.labelMedium, color = Color(0xFF15204F))
            Text(
                DashboardFormatters.money(amountText.toMoneyDecimal()),
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
private fun ScreenshotTextCard(title: String, displayText: String, color: Color) {
    Card(
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = .05f)),
        shape = RoundedCornerShape(14.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            Text(title, style = MaterialTheme.typography.labelMedium)
            Text(displayText, fontWeight = FontWeight.Bold, color = color)
        }
    }
}

@Composable
private fun MonthlyFinancialDialog(report: FinancialReportDto, year: Int, month: Int, onDismiss: () -> Unit) {
    val s = report.summary ?: return
    var section by remember { mutableStateOf("Monthly") }
    AlertDialog(onDismissRequest=onDismiss,confirmButton={TextButton(onClick=onDismiss){Text("Close")}},title={Text(YearMonth.of(year,month).format(DateTimeFormatter.ofPattern("MMMM yyyy")),fontWeight=FontWeight.Bold,color=Color(0xFF111B55))},text={
        LazyColumn(verticalArrangement=Arrangement.spacedBy(10.dp)){
            item { Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),horizontalArrangement=Arrangement.spacedBy(6.dp)){listOf("Monthly","Bank","Cash","Collection").forEach{label->FilterChip(selected=section==label,onClick={section=label},label={Text(label)})}} }
            if(section=="Monthly") {
                item{ScreenshotBalanceCard("Opening Balance",s.totalOpening,s.bankOpening,s.cashOpening,ReportBlue,Modifier.fillMaxWidth())}
                item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)){Box(Modifier.weight(1f)){ScreenshotAmountCard("Total Income",s.totalIncome,ReportGreen)};Box(Modifier.weight(1f)){ScreenshotAmountCard("Total Expenses",s.totalExpenses,Color(0xFFFF2538))}}}
                item{ScreenshotTextCard(if(s.netAmount.toMoneyDecimal().signum()>=0)"Net Surplus" else "Net Deficit",DashboardFormatters.money(s.netAmount.toMoneyDecimal()),ReportBlue)}
                if(!report.income.isNullOrEmpty()) item{ReportBreakdownBlock("Income Breakdown",report.income,ReportGreen)}
                if(!report.expenses.isNullOrEmpty()) item{ReportBreakdownBlock("Expense Breakdown",report.expenses,Color(0xFFFF2538))}
                item{ScreenshotBalanceCard("Closing Balance",s.totalClosing,s.bankClosing,s.cashClosing,Color(0xFF6D35E8),Modifier.fillMaxWidth())}
            } else if(section=="Bank" || section=="Cash") {
                val bank=section=="Bank"; val rows=if(bank)report.bankTransactions.orEmpty() else report.cashTransactions.orEmpty()
                item{AccountDetailSummary(section,s,bank)}
                if(rows.isEmpty()) item{EmptyState("No transactions","No approved ${section.lowercase()} transactions exist for this month.")}
                else items(rows){transaction->TransactionReportRow(transaction)}
            } else {
                item{CollectionSummaryBlock(report.collection)}
                if(report.flatPayments.isNullOrEmpty()) item{EmptyState("No bills","No maintenance bills exist for this month.")}
                else items(report.flatPayments){payment->FlatPaymentRow(payment)}
            }
        }
    })
}

@Composable private fun ReportBreakdownBlock(title:String,rows:List<com.example.application.data.remote.dto.FinancialBreakdownDto>,color:Color){Card{Column(Modifier.padding(12.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){Text(title,fontWeight=FontWeight.Bold,color=ReportBlue);rows.groupBy{it.category?:"Other"}.forEach{(category,items)->KeyValue(category,DashboardFormatters.money(items.sumOf{it.amount.toMoneyDecimal()}))}}}}

@Composable private fun AccountDetailSummary(title:String,s:com.example.application.data.remote.dto.FinancialSummaryDto,bank:Boolean){Card(colors=CardDefaults.cardColors(containerColor=if(bank)Color(0xFFF4F8FF) else Color(0xFFFFF8EF))){Column(Modifier.padding(14.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){Text("$title Account",fontWeight=FontWeight.Bold,color=ReportBlue);KeyValue("Opening Balance",DashboardFormatters.money((if(bank)s.bankOpening else s.cashOpening).toMoneyDecimal()));KeyValue("Total Income",DashboardFormatters.money((if(bank)s.bankIncome else s.cashIncome).toMoneyDecimal()));KeyValue("Total Expenses",DashboardFormatters.money((if(bank)s.bankExpenses else s.cashExpenses).toMoneyDecimal()));HorizontalDivider();KeyValue("Closing Balance",DashboardFormatters.money((if(bank)s.bankClosing else s.cashClosing).toMoneyDecimal()))}}}

@Composable private fun TransactionReportRow(row:com.example.application.data.remote.dto.FinancialTransactionDto){val income=row.transactionType=="INCOME";Card{Column(Modifier.padding(12.dp),verticalArrangement=Arrangement.spacedBy(4.dp)){Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){Text(row.description?:"Transaction",fontWeight=FontWeight.SemiBold);Text((if(income)"+ " else "− ")+DashboardFormatters.money(row.amount.toMoneyDecimal()),color=if(income)ReportGreen else Color(0xFFFF2538),fontWeight=FontWeight.Bold)};Text(DashboardFormatters.date(row.transactionDate),style=MaterialTheme.typography.labelSmall);if(!row.paymentMethod.isNullOrBlank())Text(row.paymentMethod,style=MaterialTheme.typography.labelSmall);if(!row.referenceNumber.isNullOrBlank())Text("Reference: ${row.referenceNumber}",style=MaterialTheme.typography.labelSmall);KeyValue("Running balance",DashboardFormatters.money(row.runningBalance.toMoneyDecimal()))}}}

@Composable private fun CollectionSummaryBlock(c:com.example.application.data.remote.dto.FinancialCollectionDto?){if(c==null)return;Card{Column(Modifier.padding(12.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){Text("Collection Summary",fontWeight=FontWeight.Bold,color=ReportBlue);Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(6.dp)){TransparencyMetric("Bills",(c.billsGenerated?:0).toString(),ReportBlue);TransparencyMetric("Paid",(c.paid?:0).toString(),ReportGreen);TransparencyMetric("Pending",(c.pending?:0).toString(),ReportAmber)};Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(6.dp)){TransparencyMetric("Verify",(c.verificationPending?:0).toString(),ReportBlue);TransparencyMetric("Rejected",(c.rejected?:0).toString(),Color(0xFFFF2538));TransparencyMetric("Write-off",(c.writtenOff?:0).toString(),Color(0xFF6D35E8))};KeyValue("Paid amount",DashboardFormatters.money(c.paidAmount.toMoneyDecimal()));KeyValue("Pending amount",DashboardFormatters.money(c.pendingAmount.toMoneyDecimal()));c.collectionRate?.let{KeyValue("Collection rate","$it%")}}}}

@Composable private fun FlatPaymentRow(p:com.example.application.data.remote.dto.FlatPaymentReportDto){Card{Column(Modifier.padding(12.dp),verticalArrangement=Arrangement.spacedBy(5.dp)){Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){Text("Flat ${p.flatNo?:"--"}",fontWeight=FontWeight.Bold);ReportStatusPill(p.verificationStatus?:p.status)};if(!p.residentName.isNullOrBlank())Text(p.residentName,style=MaterialTheme.typography.labelSmall);KeyValue("Bill amount",DashboardFormatters.money(p.billAmount.toMoneyDecimal()));KeyValue("Paid amount",DashboardFormatters.money(p.paidAmount.toMoneyDecimal()));KeyValue("Pending amount",DashboardFormatters.money(p.pendingAmount.toMoneyDecimal()));if(!p.paymentMethod.isNullOrBlank())KeyValue("Payment mode",p.paymentMethod);if(!p.receiptNumber.isNullOrBlank())KeyValue("Receipt",p.receiptNumber)}}}

private data class AdminPeriodReport(
    val bills: List<MaintenanceBillDto>,
    val expenses: List<ExpenseDto>,
    val complaints: List<ComplaintDto>
) {
    val collected: BigDecimal get() = bills.filter { it.operationalReportStatus() == "Paid" }.sumOf { (it.paidAmount ?: "0").toMoneyDecimal() }
    val expensesTotal: BigDecimal get() = expenses.sumOf { it.amount.toMoneyDecimal() }
    val billed: BigDecimal get() = bills.sumOf { (it.totalAmount ?: it.amount ?: "0").toMoneyDecimal() }
    val pending: BigDecimal get() = bills.filter { it.operationalReportStatus() != "Paid" }.sumOf { (it.remainingAmount ?: it.totalAmount ?: it.amount ?: "0").toMoneyDecimal() }
    val net: BigDecimal get() = collected - expensesTotal
}

private fun AdminReportsData.financialYears(): List<String> {
    val dates = bills.mapNotNull { it.reportDate() } + expenses.mapNotNull { it.expenseDate?.take(10) }
    return dates.mapNotNull { runCatching { LocalDate.parse(it) }.getOrNull() }
        .map { if (it.monthValue >= 4) "${it.year}-${it.year + 1}" else "${it.year - 1}-${it.year}" }.distinct().sortedDescending()
}

private fun AdminReportsData.forFinancialYear(year: String?): AdminPeriodReport {
    if (year.isNullOrBlank()) return AdminPeriodReport(bills, expenses, complaints)
    val start = year.substringBefore('-').toIntOrNull() ?: return AdminPeriodReport(emptyList(), emptyList(), emptyList())
    fun inYear(value: String?): Boolean { val d = value?.take(10)?.let { runCatching { LocalDate.parse(it) }.getOrNull() } ?: return false; return d >= LocalDate.of(start, 4, 1) && d <= LocalDate.of(start + 1, 3, 31) }
    return AdminPeriodReport(bills.filter { inYear(it.reportDate()) }, expenses.filter { inYear(it.expenseDate) }, complaints.filter { inYear(it.createdAt) })
}

private fun AdminPeriodReport.months(): List<Pair<Int, Int>> = (bills.mapNotNull { it.reportDate()?.take(7) } + expenses.mapNotNull { it.expenseDate?.take(7) })
    .mapNotNull { it.split('-').let { p -> if (p.size == 2) p[0].toIntOrNull()?.let { y -> p[1].toIntOrNull()?.let { m -> y to m } } else null } }.distinct()
    .sortedWith(compareByDescending<Pair<Int, Int>> { it.first }.thenByDescending { it.second })

private fun AdminPeriodReport.forMonth(year: Int, month: Int) = AdminPeriodReport(bills.filter { it.reportDate()?.take(7) == "%04d-%02d".format(year, month) }, expenses.filter { it.expenseDate?.take(7) == "%04d-%02d".format(year, month) }, complaints.filter { it.createdAt?.take(7) == "%04d-%02d".format(year, month) })
private fun AdminPeriodReport.filtered(query: String, status: String): AdminPeriodReport {
    val q = query.trim().lowercase()
    fun match(b: MaintenanceBillDto): Boolean {
        val text = listOf(b.title, b.residentName, b.flatNo, b.month, b.year).joinToString(" ").lowercase()
        val statusMatch = when (status) { "Written-off" -> b.writeOffAmount.toMoneyDecimal() > BigDecimal.ZERO; "Rejected" -> b.paymentStatus.equals("rejected", true) || b.latestPaymentStatus.equals("rejected", true); else -> status == "All" || b.operationalReportStatus().equals(status, true) }
        return (q.isBlank() || text.contains(q)) && statusMatch
    }
    return copy(bills = bills.filter(::match), expenses = expenses.filter { q.isBlank() || listOf(it.vendor, it.category, it.description, it.expenseNumber).joinToString(" ").lowercase().contains(q) })
}

private fun MaintenanceBillDto.reportDate(): String? = paymentDate ?: dueDate ?: year?.let { y -> month?.toIntOrNull()?.let { m -> "%04d-%02d-01".format(y.toIntOrNull() ?: return@let null, m) } }
private fun MaintenanceBillDto.operationalReportStatus(): String { val remaining = (remainingAmount ?: totalAmount ?: amount ?: "0").toMoneyDecimal(); if (remaining <= BigDecimal.ZERO) return "Paid"; val due = dueDate?.take(10)?.let { runCatching { LocalDate.parse(it) }.getOrNull() }; return if (due != null && due.isBefore(LocalDate.now())) "Overdue" else "Pending" }

@Composable private fun AnnualReportDashboard(report: AdminPeriodReport, previous: AdminPeriodReport?, onExport: () -> Unit, onPdf: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFF))) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Text("Annual summary", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = ReportBlue); Row { TextButton(onClick = onExport) { Icon(Icons.Filled.Download, null); Text("CSV") }; TextButton(onClick = onPdf) { Text("PDF") } } }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) { ReportMetric("Collected", report.collected, ReportGreen, Modifier.weight(1f)); ReportMetric("Expenses", report.expensesTotal, Color(0xFFE5484D), Modifier.weight(1f)); ReportMetric("Net", report.net, ReportBlue, Modifier.weight(1f)) }
        Text("${report.bills.size} bills · ${report.expenses.size} expenses · ${report.complaints.size} complaints", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        CollectionStatusGrid(report)
        ExpenseBreakdown(report)
        MonthlyTrend(report)
        previous?.let { ComparisonCard(report, it) }
    } }
}

@Composable private fun CollectionStatusGrid(report: AdminPeriodReport) { val statuses = listOf("Bills generated" to report.bills.size.toString(), "Paid" to report.bills.count { it.operationalReportStatus() == "Paid" }.toString(), "Pending" to report.bills.count { it.operationalReportStatus() == "Pending" }.toString(), "Overdue" to report.bills.count { it.operationalReportStatus() == "Overdue" }.toString(), "Verification pending" to report.bills.count { it.paymentStatus.equals("pending", true) || it.latestPaymentStatus.equals("pending", true) }.toString(), "Rejected" to report.bills.count { it.paymentStatus.equals("rejected", true) || it.latestPaymentStatus.equals("rejected", true) }.toString(), "Written-off" to report.bills.count { it.writeOffAmount.toMoneyDecimal() > BigDecimal.ZERO }.toString()); Column(verticalArrangement = Arrangement.spacedBy(6.dp)) { Text("Collection summary", fontWeight = FontWeight.Bold, color = ReportBlue); statuses.chunked(4).forEach { row -> Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) { row.forEach { (label, value) -> Column(Modifier.weight(1f).border(1.dp, Color(0xFFDCE6FA), RoundedCornerShape(8.dp)).padding(8.dp)) { Text(value, fontWeight = FontWeight.Bold, color = ReportBlue); Text(label, style = MaterialTheme.typography.labelSmall) } } } } } }

@Composable private fun ExpenseBreakdown(report: AdminPeriodReport) { if (report.expenses.isEmpty()) return; val groups = report.expenses.groupBy { it.category.orEmpty().ifBlank { "Uncategorised" } }.mapValues { it.value.sumOf { e -> e.amount.toMoneyDecimal() } }.toList().sortedByDescending { it.second }; val max = groups.maxOfOrNull { it.second } ?: BigDecimal.ONE; Column(verticalArrangement = Arrangement.spacedBy(6.dp)) { Text("Expense breakdown", fontWeight = FontWeight.Bold, color = ReportBlue); groups.take(6).forEach { (name, amount) -> Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(name, style = MaterialTheme.typography.bodySmall); Text(DashboardFormatters.money(amount), fontWeight = FontWeight.SemiBold) }; LinearProgressIndicator(progress = { amount.divide(max, 3, java.math.RoundingMode.HALF_UP).toFloat() }, modifier = Modifier.fillMaxWidth().height(7.dp), color = Color(0xFFE58B2A), trackColor = Color(0xFFFFEBC8)) } } }

@Composable private fun MonthlyTrend(report: AdminPeriodReport) { val months = report.months().sortedWith(compareBy<Pair<Int, Int>> { it.first }.thenBy { it.second }); if (months.isEmpty()) return; val values = months.map { report.forMonth(it.first, it.second).net }; val max = values.map { it.abs() }.maxOrNull()?.takeIf { it > BigDecimal.ZERO } ?: BigDecimal.ONE; Column(verticalArrangement = Arrangement.spacedBy(6.dp)) { Text("Monthly net trend", fontWeight = FontWeight.Bold, color = ReportBlue); months.takeLast(12).forEach { month -> val value = report.forMonth(month.first, month.second).net; Row(verticalAlignment = Alignment.CenterVertically) { Text(YearMonth.of(month.first, month.second).format(DateTimeFormatter.ofPattern("MMM")), modifier = Modifier.width(38.dp), style = MaterialTheme.typography.labelSmall); Box(Modifier.height(18.dp).fillMaxWidth(value.abs().divide(max, 3, java.math.RoundingMode.HALF_UP).toFloat().coerceAtLeast(.04f)), contentAlignment = Alignment.CenterStart) { Box(Modifier.fillMaxSize().background(if (value.signum() >= 0) ReportGreen else Color(0xFFE5484D), RoundedCornerShape(4.dp))) }; Spacer(Modifier.width(8.dp)); Text(DashboardFormatters.money(value), style = MaterialTheme.typography.labelSmall) } } } }

@Composable
private fun ComparisonCard(current: AdminPeriodReport, previous: AdminPeriodReport) {
    fun percentage(now: BigDecimal, old: BigDecimal): String {
        if (old.signum() == 0) return "--"
        val change = now
            .subtract(old)
            .divide(old, 2, java.math.RoundingMode.HALF_UP)
            .multiply(BigDecimal(100))
            .setScale(0, java.math.RoundingMode.HALF_UP)
        return "$change%"
    }

    Text(
        text = "Year-on-year comparison",
        fontWeight = FontWeight.Bold,
        color = ReportBlue
    )
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text("Income ${percentage(current.collected, previous.collected)}")
        Text("Expenses ${percentage(current.expensesTotal, previous.expensesTotal)}")
        Text("Net ${percentage(current.net, previous.net)}")
    }
}

@Composable private fun ReportMetric(label: String, value: BigDecimal, color: Color, modifier: Modifier = Modifier) { Column(modifier.background(color.copy(alpha = .08f), RoundedCornerShape(10.dp)).padding(10.dp)) { Text(label, style = MaterialTheme.typography.labelSmall); Text(DashboardFormatters.money(value), color = color, fontWeight = FontWeight.Bold) } }

@Composable private fun MonthlyReportRow(report: AdminPeriodReport, year: Int, month: Int, onClick: () -> Unit) { Card(onClick = onClick) { Row(Modifier.fillMaxWidth().padding(14.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Column { Text(YearMonth.of(year, month).format(DateTimeFormatter.ofPattern("MMMM yyyy")), fontWeight = FontWeight.SemiBold); Text("${report.bills.size} bills · ${report.expenses.size} expenses", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }; Column(horizontalAlignment = Alignment.End) { Text("Net ${DashboardFormatters.money(report.net)}", color = if (report.net.signum() >= 0) ReportGreen else Color(0xFFE5484D), fontWeight = FontWeight.Bold); Text("Income ${DashboardFormatters.money(report.collected)}", style = MaterialTheme.typography.labelSmall) } } } }

@Composable private fun MonthlyReportDetailsDialog(report: AdminPeriodReport, year: Int, month: Int, onDismiss: () -> Unit) { AlertDialog(onDismissRequest = onDismiss, confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } }, title = { Text(YearMonth.of(year, month).format(DateTimeFormatter.ofPattern("MMMM yyyy")), color = ReportBlue, fontWeight = FontWeight.Bold) }, text = { Column(verticalArrangement = Arrangement.spacedBy(10.dp)) { Text("${YearMonth.of(year, month).atDay(1)} – ${YearMonth.of(year, month).atEndOfMonth()}", style = MaterialTheme.typography.bodySmall); ReportMetric("Income", report.collected, ReportGreen); ReportMetric("Expenses", report.expensesTotal, Color(0xFFE5484D)); ReportMetric("Net surplus / deficit", report.net, ReportBlue); HorizontalDivider(); Text("Collection: ${report.bills.count { it.operationalReportStatus() == "Paid" }} paid · ${report.bills.count { it.operationalReportStatus() == "Pending" }} pending · ${report.bills.count { it.operationalReportStatus() == "Overdue" }} overdue"); if (report.expenses.isNotEmpty()) Text("Expense categories: ${report.expenses.groupBy { it.category.orEmpty().ifBlank { "Uncategorised" } }.entries.joinToString { "${it.key} (${it.value.size})" }}") } }) }

private fun AdminPeriodReport.toCsv(year: String): String = buildString { appendLine("Admin report,$year"); appendLine("Income,$collected"); appendLine("Expenses,$expensesTotal"); appendLine("Net,$net"); appendLine(); appendLine("Bills,Status,Total,Paid,Remaining"); bills.forEach { appendLine("${it.title.orEmpty()},${it.operationalReportStatus()},${it.totalAmount ?: it.amount ?: ""},${it.paidAmount ?: ""},${it.remainingAmount ?: ""}") }; appendLine(); appendLine("Expenses,Category,Amount,Date"); expenses.forEach { appendLine("${it.vendor ?: it.expenseNumber.orEmpty()},${it.category.orEmpty()},${it.amount.orEmpty()},${it.expenseDate.orEmpty()}") } }

private fun FinancialReportDto?.toFinancialCsv(): String {
    val s = this?.summary ?: return ""
    return buildString {
        appendLine(); appendLine("Bank and cash account summary")
        appendLine("Metric,Bank,Cash,Total")
        appendLine("Opening,${s.bankOpening.orEmpty()},${s.cashOpening.orEmpty()},${s.totalOpening.orEmpty()}")
        appendLine("Approved income,${s.bankIncome.orEmpty()},${s.cashIncome.orEmpty()},${s.totalIncome.orEmpty()}")
        appendLine("Approved expenses,${s.bankExpenses.orEmpty()},${s.cashExpenses.orEmpty()},${s.totalExpenses.orEmpty()}")
        appendLine("Closing,${s.bankClosing.orEmpty()},${s.cashClosing.orEmpty()},${s.totalClosing.orEmpty()}")
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
    val data = state.data
    val startYear = if (LocalDate.now().monthValue >= 4) LocalDate.now().year else LocalDate.now().year - 1
    val financialYear = "$startYear-${startYear + 1}"
    Scaffold(topBar = {
        TopAppBar(title = { Column { Text("Society Reports", fontWeight = FontWeight.Bold); Text("Transparency · Trust · Together", style = MaterialTheme.typography.labelSmall) } }, navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } }, actions = { IconButton(onClick = { viewModel.load(true) }) { Icon(Icons.Filled.Refresh, "Refresh") } })
    }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Column { Text("Financial year", color = ReportBlue, style = MaterialTheme.typography.labelMedium); Text("01 Apr $startYear – 31 Mar ${startYear + 1}", fontWeight = FontWeight.Bold) }; TextButton(onClick = { data?.let { shareReportPdf(context, "Society Report $financialYear", buildResidentReportCsv(it, state.filter)) } }) { Text("PDF") } } }
            state.error?.let { item { RetryState(it, onRetry = { viewModel.load(true) }) } }
            if (state.isLoading && data == null) item { AppLoadingIndicator() }
            else if (data == null) item { EmptyState("No report data", "Society report data is not available yet.") }
            else {
                data.financial?.let { item { FinancialAccountsCard(it) } }
                item { ResidentSocietyReportContent(data) }
            }
        }
    }
}

@Composable
private fun FinancialAccountsCard(report: FinancialReportDto) {
    if (report.available != true || report.summary == null) {
        InfoCard(report.reason ?: "Bank and cash accounting is unavailable for this period.")
        return
    }
    val s = report.summary
    Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFFF7FAFF))) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Bank & cash account summary", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ReportBlue)
            KeyValue("Opening balance", DashboardFormatters.money(s.totalOpening.toMoneyDecimal()))
            KeyValue("Bank opening", DashboardFormatters.money(s.bankOpening.toMoneyDecimal()))
            KeyValue("Cash opening", DashboardFormatters.money(s.cashOpening.toMoneyDecimal()))
            HorizontalDivider()
            KeyValue("Approved income", DashboardFormatters.money(s.totalIncome.toMoneyDecimal()))
            KeyValue("Bank income", DashboardFormatters.money(s.bankIncome.toMoneyDecimal()))
            KeyValue("Cash income", DashboardFormatters.money(s.cashIncome.toMoneyDecimal()))
            KeyValue("Approved expenses", DashboardFormatters.money(s.totalExpenses.toMoneyDecimal()))
            KeyValue("Bank expenses", DashboardFormatters.money(s.bankExpenses.toMoneyDecimal()))
            KeyValue("Cash expenses", DashboardFormatters.money(s.cashExpenses.toMoneyDecimal()))
            HorizontalDivider()
            KeyValue("Closing balance", DashboardFormatters.money(s.totalClosing.toMoneyDecimal()))
            KeyValue("Bank closing", DashboardFormatters.money(s.bankClosing.toMoneyDecimal()))
            KeyValue("Cash closing", DashboardFormatters.money(s.cashClosing.toMoneyDecimal()))
        }
    }
}

@Composable
private fun ResidentSocietyReportContent(data: ResidentReportsData) {
    val summary = data.societySummary
    val income = summary?.totalSocietyCollection.toMoneyDecimal() ?: data.allMaintenance.sumOf { it.paidAmount.toMoneyDecimal() }
    val expenses = summary?.totalSocietyExpenses.toMoneyDecimal() ?: data.expenses.sumOf { it.amount.toMoneyDecimal() }
    val net = summary?.netBalance.toMoneyDecimal() ?: income - expenses
    val paid = summary?.paidBillsCount ?: data.allMaintenance.count { it.remainingAmount.toMoneyDecimal() <= BigDecimal.ZERO }
    val pending = summary?.pendingBillsCount ?: data.allMaintenance.count { it.remainingAmount.toMoneyDecimal() > BigDecimal.ZERO }
    val overdue = summary?.overdueBillsCount ?: 0
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        ResidentReportSectionCard("1. Society financial summary") {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                TransparencyMetric("Income", DashboardFormatters.money(income), ReportGreen)
                TransparencyMetric("Expenses", DashboardFormatters.money(expenses), Color(0xFFE5484D))
                TransparencyMetric("Net balance", DashboardFormatters.money(net), ReportBlue)
            }
            Text(
                "${data.allMaintenance.size} maintenance records · ${data.expenses.size} expense records",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        ResidentReportSectionCard("2. Collection status") {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                TransparencyMetric("Paid", paid.toString(), ReportGreen)
                TransparencyMetric("Pending", pending.toString(), ReportAmber)
                TransparencyMetric("Overdue", overdue.toString(), Color(0xFFE5484D))
                TransparencyMetric("Bills", data.allMaintenance.size.toString(), ReportBlue)
            }
        }

        if (data.allMaintenance.isNotEmpty()) {
            ResidentReportSectionCard("3. Payment status") {
                data.allMaintenance.take(8).forEach { bill ->
                    val settled = bill.remainingAmount.toMoneyDecimal() <= BigDecimal.ZERO
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("Flat ${bill.flatNo ?: "--"}", fontWeight = FontWeight.SemiBold)
                            Text(bill.title ?: "Maintenance", style = MaterialTheme.typography.labelSmall)
                        }
                        Text(
                            text = if (settled) "Paid" else "Pending",
                            color = if (settled) ReportGreen else ReportAmber,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        if (data.expenses.isNotEmpty()) {
            val groupedExpenses = data.expenses
                .groupBy { it.category.orEmpty().ifBlank { "Other" } }
                .mapValues { entry -> entry.value.sumOf { expense -> expense.amount.toMoneyDecimal() } }
            ResidentReportSectionCard("4. Expense summary") {
                groupedExpenses.forEach { (category, amount) ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 5.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(category)
                        Text(DashboardFormatters.money(amount), fontWeight = FontWeight.SemiBold)
                    }
                }
                Text(
                    "Total expenses ${DashboardFormatters.money(expenses)}",
                    color = Color(0xFFE5484D),
                    fontWeight = FontWeight.Bold
                )
            }
        }

        if (data.complaints.isNotEmpty()) {
            val resolvedCount = data.complaints.count { complaint ->
                complaint.status.equals("resolved", ignoreCase = true)
            }
            ResidentReportSectionCard("5. Complaints summary") {
                Text("Total complaints: ${data.complaints.size}")
                Text("Resolved: $resolvedCount", color = ReportGreen)
                Text("Open / in progress: ${data.complaints.size - resolvedCount}", color = ReportAmber)
            }
        }
        Text("Society-wide values come from approved backend report records. Private resident contact details and payment proofs are hidden.", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun ResidentReportSectionCard(
    title: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFF))
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = ReportBlue
            )
            content()
        }
    }
}

@Composable
private fun RowScope.TransparencyMetric(label: String, value: String, color: Color) {
    Column(
        modifier = Modifier
            .weight(1f)
            .background(color.copy(alpha = .08f), RoundedCornerShape(8.dp))
            .padding(8.dp)
    ) {
        Text(value, color = color, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
        Text(label, style = MaterialTheme.typography.labelSmall)
    }
}

/* Legacy resident report implementation retained below for shared chart/helper functions. */
/*
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
            Row {
                TextButton(onClick = {
                    val csv = state.data?.let { buildResidentReportCsv(it, state.filter) }.orEmpty()
                    if (csv.isBlank()) Toast.makeText(context, "No report data available", Toast.LENGTH_SHORT).show()
                    else { pendingCsv = csv; csvLauncher.launch("resident_report.csv") }
                }) { Text("CSV") }
                TextButton(onClick = {
                    val csv = state.data?.let { buildResidentReportCsv(it, state.filter) }.orEmpty()
                    if (csv.isBlank()) Toast.makeText(context, "No report data available", Toast.LENGTH_SHORT).show()
                    else shareReportPdf(context, "Resident Reports", csv)
                }) { Text("PDF") }
            }
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
*/

private fun androidx.compose.foundation.lazy.LazyListScope.adminReportsContent(
    data: AdminReportsData,
    onExportCsv: () -> Unit,
    onExportPdf: () -> Unit
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
    item { ExportCard(onExportCsv, onExportPdf) }
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
private fun ExportCard(onCsv: () -> Unit, onPdf: () -> Unit) {
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
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = onCsv,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ReportBlue)
                ) {
                    Icon(Icons.Filled.Download, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("CSV")
                }
                OutlinedButton(onClick = onPdf, shape = RoundedCornerShape(12.dp)) {
                    Icon(Icons.Filled.Download, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("PDF")
                }
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
    ReportItemCard(title = listOfNotNull(item.wing, item.flatNo).joinToString("-").ifBlank { "Flat" }, status = item.maintenanceStatus) {
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
    return rows.joinToString("\n") { row -> row.joinToString(",") { csvEscape(it) } } + data.financial.toFinancialCsv()
}

private fun csvEscape(value: String): String {
    val normalized = value.replace("\r\n", "\n").replace("\r", "\n")
    val escaped = normalized.replace("\"", "\"\"")
    return if (escaped.any { it == ',' || it == '"' || it == '\n' }) "\"$escaped\"" else escaped
}

private fun shareReportPdf(context: Context, title: String, csvContent: String) {
    val file = createReportPdf(context, title, csvContent)
    if (file == null) {
        Toast.makeText(context, "PDF export failed", Toast.LENGTH_LONG).show()
        return
    }
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val viewIntent = Intent(Intent.ACTION_VIEW)
        .setDataAndType(uri, "application/pdf")
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    val shareIntent = Intent(Intent.ACTION_SEND)
        .setType("application/pdf")
        .putExtra(Intent.EXTRA_STREAM, uri)
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    val chooser = Intent.createChooser(viewIntent, "Open report PDF")
    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(shareIntent))
    runCatching { context.startActivity(chooser) }
        .onFailure { Toast.makeText(context, "Report PDF saved: ${file.name}", Toast.LENGTH_LONG).show() }
}

private fun createReportPdf(context: Context, title: String, csvContent: String): File? = runCatching {
    val file = File(context.cacheDir, "${title.lowercase().replace(" ", "-")}-${System.currentTimeMillis()}.pdf")
    val document = PdfDocument()
    val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create()
    val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 18f; isFakeBoldText = true }
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 10.5f }
    var pageNumber = 1
    var page = document.startPage(pageInfo)
    var canvas = page.canvas
    var y = 40f
    fun finishCurrentPage() {
        canvas.drawText("Page $pageNumber", 520f, 820f, paint)
        document.finishPage(page)
    }
    fun newPage() {
        finishCurrentPage()
        pageNumber += 1
        page = document.startPage(pageInfo)
        canvas = page.canvas
        y = 40f
    }
    canvas.drawText(title, 36f, y, titlePaint)
    y += 28f
    canvas.drawText("Society Management System · Generated ${java.text.SimpleDateFormat("dd MMM yyyy, hh:mm a", java.util.Locale.getDefault()).format(java.util.Date())}", 36f, y, paint)
    y += 24f
    csvContent.lines().forEach { rawLine ->
        val printable = rawLine.replace(",", "  |  ").ifBlank { " " }
        printable.chunked(92).forEach { part ->
            if (y > 805f) newPage()
            canvas.drawText(part, 36f, y, paint)
            y += 15f
        }
    }
    finishCurrentPage()
    file.outputStream().use { document.writeTo(it) }
    document.close()
    file
}.getOrNull()

private fun String?.toMoneyDecimal(): BigDecimal {
    return try {
        this?.toBigDecimalOrNull() ?: BigDecimal.ZERO
    } catch (_: Exception) {
        BigDecimal.ZERO
    }
}
