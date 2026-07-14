package com.example.application.ui.screens.reports

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
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
import com.example.application.util.toMoneyDecimal
import com.example.application.viewmodel.AdminReportsViewModel
import com.example.application.viewmodel.ResidentReportsViewModel
import java.math.BigDecimal

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminReportsScreen(
    onBack: () -> Unit,
    viewModel: AdminReportsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    ReportScaffold(
        title = "Admin Reports",
        subtitle = "Financial, expense and complaint reports",
        onBack = onBack,
        isRefreshing = state.isRefreshing,
        onRefresh = { viewModel.load(refresh = true) }
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
            else -> adminReportsContent(state.data!!, viewModel::noteCsvExport)
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
    ReportScaffold(
        title = "Resident Reports",
        subtitle = "Read-only society reports",
        onBack = onBack,
        isRefreshing = state.isRefreshing,
        onRefresh = { viewModel.load(refresh = true) }
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
            else -> residentReportsContent(state.data!!, viewModel::noteCsvExport)
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.adminReportsContent(
    data: AdminReportsData,
    onExportInfo: () -> Unit
) {
    val paid = data.bills.filter { (it.paymentStatus ?: it.status).equals("Paid", true) }
    val pending = data.bills.filterNot { (it.paymentStatus ?: it.status).equals("Paid", true) }
    val totalCollection = paid.sumOf { (it.paidAmount ?: it.totalAmount ?: it.amount).toMoneyDecimal() }
    val pendingAmount = pending.sumOf { (it.remainingAmount ?: it.totalAmount ?: it.amount).toMoneyDecimal() }
    val totalExpenses = data.expenses.sumOf { it.amount.toMoneyDecimal() }

    item {
        SummaryGrid(
            cards = listOf(
                "Collected" to DashboardFormatters.money(totalCollection),
                "Pending" to DashboardFormatters.money(pendingAmount),
                "Expenses" to DashboardFormatters.money(totalExpenses),
                "Net Balance" to DashboardFormatters.money(totalCollection - totalExpenses),
                "Bills" to data.bills.size.toString(),
                "Complaints" to data.complaints.size.toString()
            )
        )
    }
    item { ExportCard(onExportInfo) }
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
    onExportInfo: () -> Unit
) {
    val summary = data.societySummary
    item {
        SummaryGrid(
            cards = listOf(
                "Society Collection" to DashboardFormatters.money(summary?.totalSocietyCollection.toMoneyDecimal()),
                "My Pending" to DashboardFormatters.money(data.summary?.totalPendingAmount.toMoneyDecimal()),
                "Society Expenses" to DashboardFormatters.money(summary?.totalSocietyExpenses.toMoneyDecimal()),
                "Net Balance" to DashboardFormatters.money(summary?.netBalance.toMoneyDecimal()),
                "Collection Rate" to DashboardFormatters.percent(summary?.collectionRate ?: 0),
                "My Bills" to (data.summary?.totalBills ?: data.myMaintenance.size).toString()
            )
        )
    }
    item { ExportCard(onExportInfo) }
    data.warnings.forEach { item { InfoCard(it) } }
    item { SectionTitle("My Annual Maintenance") }
    if (data.myMaintenance.isEmpty()) item { EmptyState("No maintenance data", "No bills match these filters.", modifier = Modifier.padding(16.dp)) }
    else items(data.myMaintenance.take(30), key = { "my-${it.id}-${it.status}" }) { bill -> ResidentBillCard(bill) }

    item { SectionTitle("Members Payment Status") }
    if (data.membersMaintenance.isEmpty()) item { EmptyState("No member status", "No member payment status is available.", modifier = Modifier.padding(16.dp)) }
    else items(data.membersMaintenance.take(40), key = { "member-${it.id}-${it.maintenanceStatus}" }) { item -> MemberStatusCard(item) }

    item { SectionTitle("Society Expenses") }
    if (data.expenses.isEmpty()) item { EmptyState("No expenses", "No expenses match these filters.", modifier = Modifier.padding(16.dp)) }
    else items(data.expenses.take(20), key = { "resident-expense-${it.id}-${it.date}" }) { expense -> ResidentExpenseCard(expense) }

    item { SectionTitle("My Complaint Summary") }
    if (data.complaints.isEmpty()) item { EmptyState("No complaints", "You have not created complaints yet.", modifier = Modifier.padding(16.dp)) }
    else items(data.complaints.take(20), key = { "my-complaint-${it.id}-${it.status}" }) { complaint -> ComplaintReportCard(complaint) }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReportScaffold(
    title: String,
    subtitle: String,
    onBack: () -> Unit,
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    content: androidx.compose.foundation.lazy.LazyListScope.() -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(title, fontWeight = FontWeight.Bold)
                        Text(subtitle, style = MaterialTheme.typography.bodySmall)
                    }
                },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
                actions = { TextButton(onClick = onRefresh) { Text(if (isRefreshing) "Refreshing" else "Refresh") } }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
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
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(value = filter.month, onValueChange = onMonth, label = { Text("Month") }, modifier = Modifier.weight(1f), singleLine = true)
                OutlinedTextField(value = filter.year, onValueChange = onYear, label = { Text("Year") }, modifier = Modifier.weight(1f), singleLine = true)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                listOf("", "Paid", "Pending", "Partial", "Overdue").forEach { status ->
                    FilterChip(
                        selected = filter.status == status,
                        onClick = { onStatus(status) },
                        label = { Text(if (status.isBlank()) "All" else status) }
                    )
                }
            }
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                AssistChip(onClick = {}, label = { Text("${filter.activeCount} filters") })
                OutlinedButton(onClick = onReset) { Text("Reset filters") }
            }
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
    Card(modifier = modifier) {
        Column(Modifier.padding(14.dp)) {
            Text(title, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }
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
        Text("Loading report data...")
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
    Card {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Exports", fontWeight = FontWeight.Bold)
            Text("No backend PDF/CSV download endpoint is confirmed. The website currently creates CSV/PDF in the browser from loaded data.")
            Button(onClick = onClick, modifier = Modifier.fillMaxWidth()) { Text("Export status") }
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
    Card {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(title, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                AssistChip(onClick = {}, label = { Text(DashboardFormatters.statusLabel(status)) })
            }
            Divider()
            content()
        }
    }
}

@Composable
private fun KeyValue(label: String, value: String) {
    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
        Text(value, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
    }
}

private fun List<MaintenanceBillDto>.totalOf(selector: (MaintenanceBillDto) -> String?): BigDecimal =
    fold(BigDecimal.ZERO) { sum, item -> sum + selector(item).toMoneyDecimal() }
