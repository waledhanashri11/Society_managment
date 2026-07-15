package com.example.application.ui.screens.maintenance

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.data.remote.dto.ExpenseDto
import com.example.application.data.remote.dto.MaintenanceBillDto
import com.example.application.data.remote.dto.MaintenanceCategoryDto
import com.example.application.data.remote.dto.MaintenancePaymentDto
import com.example.application.ui.components.BasicAppTextField
import com.example.application.ui.components.EmptyState
import com.example.application.ui.components.RetryState
import com.example.application.ui.screens.dashboard.DashboardSkeleton
import com.example.application.ui.screens.dashboard.KeyValue
import com.example.application.ui.screens.dashboard.MetricGrid
import com.example.application.ui.screens.dashboard.SectionCard
import com.example.application.util.DashboardFormatters
import com.example.application.util.toMoneyDecimal
import com.example.application.viewmodel.AdminMaintenanceViewModel
import com.example.application.viewmodel.ResidentMaintenanceViewModel
import com.example.application.viewmodel.defaultDueDate
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AdminMaintenanceScreen(
    onBack: () -> Unit,
    viewModel: AdminMaintenanceViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val data = state.data
    var dialog by remember { mutableStateOf<MaintenanceDialog?>(null) }
    val bills by remember(data?.bills, state.query, state.filter) {
        derivedStateOf {
            data?.bills.orEmpty()
                .filter { it.matchesBill(state.query) }
                .filter { state.filter == "All" || (it.paymentStatus ?: it.status) == state.filter }
        }
    }

    Scaffold(topBar = {
        TopAppBar(
            title = { Text("Maintenance") },
            navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
            actions = { TextButton(onClick = { viewModel.applyPenalty() }) { Text("Apply Penalty") } }
        )
    }) { padding ->
        PullToRefreshBox(
            isRefreshing = state.isRefreshing,
            onRefresh = { viewModel.load(refresh = true) },
            modifier = Modifier.fillMaxSize().padding(padding)
        ) {
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("Bills", "Payments", "Expenses", "Settings", "Categories", "Late Fee", "Disputes").forEach {
                            FilterChip(selected = state.activeTab == it, onClick = { viewModel.setTab(it) }, label = { Text(it) })
                        }
                    }
                    state.message?.let { Text(it, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(top = 8.dp)) }
                    state.error?.let { RetryState(it, { viewModel.load(refresh = true) }, Modifier.padding(top = 8.dp)) }
                }
                if (state.isLoading && data == null) {
                    item { DashboardSkeleton() }
                } else if (data == null) {
                    item { EmptyState("Maintenance unavailable", "Pull down or tap retry.") }
                } else {
                    item {
                        MetricGrid(
                            listOf(
                                Triple("Collected", DashboardFormatters.money(data.dashboard?.summary?.collected.toMoneyDecimal()), "${data.dashboard?.summary?.collectionPercentage ?: 0}% collection"),
                                Triple("Pending", DashboardFormatters.money(data.dashboard?.summary?.pending.toMoneyDecimal()), "${bills.count { (it.paymentStatus ?: it.status) != "Paid" }} unpaid"),
                                Triple("Overdue", DashboardFormatters.money(data.dashboard?.summary?.overdue.toMoneyDecimal()), "needs follow-up"),
                                Triple("Expenses", DashboardFormatters.money(data.dashboard?.summary?.monthExpense.toMoneyDecimal()), "this month")
                            )
                        )
                    }
                    when (state.activeTab) {
                        "Payments" -> paymentsTab(data.payments, viewModel, { dialog = it })
                        "Expenses" -> expensesTab(data.expenses, viewModel, { dialog = it })
                        "Settings" -> settingsTab(data.settings, viewModel, { dialog = it })
                        "Categories" -> categoriesTab(data.categories, viewModel, { dialog = it })
                        "Late Fee" -> lateFeeTab(data.lateFeeRule, viewModel, { dialog = it })
                        "Disputes" -> disputesTab(data.disputes)
                        else -> billsTab(bills, state.query, state.filter, viewModel, { dialog = it })
                    }
                    if (data.warnings.isNotEmpty()) {
                        item { SectionCard("Warnings") { data.warnings.forEach { Text("• $it") } } }
                    }
                }
            }
        }
    }
    MaintenanceDialogHost(dialog, onDismiss = { dialog = null }, viewModel = viewModel)
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ResidentMaintenanceScreen(
    onBack: () -> Unit,
    viewModel: ResidentMaintenanceViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val data = state.data
    var dialog by remember { mutableStateOf<ResidentDialog?>(null) }
    val bills by remember(data?.bills, state.query, state.filter) {
        derivedStateOf {
            data?.bills.orEmpty()
                .filter { it.matchesBill(state.query) }
                .filter { state.filter == "All" || (it.paymentStatus ?: it.status) == state.filter }
        }
    }
    Scaffold(topBar = { TopAppBar(title = { Text("My Maintenance") }, navigationIcon = { TextButton(onClick = onBack) { Text("Back") } }) }) { padding ->
        PullToRefreshBox(isRefreshing = state.isRefreshing, onRefresh = { viewModel.load(refresh = true) }, modifier = Modifier.fillMaxSize().padding(padding)) {
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item {
                    state.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
                    state.error?.let { RetryState(it, { viewModel.load(refresh = true) }) }
                }
                if (state.isLoading && data == null) {
                    item { DashboardSkeleton() }
                } else if (data == null) {
                    item { EmptyState("No maintenance data", "Your bills will appear here.") }
                } else {
                    val pending = data.bills.filter { (it.paymentStatus ?: it.status) != "Paid" }
                    val paid = data.bills.filter { (it.paymentStatus ?: it.status) == "Paid" }
                    item {
                        MetricGrid(
                            listOf(
                                Triple("Outstanding", DashboardFormatters.money(pending.fold(0.toBigDecimal()) { sum, bill -> sum + (bill.remainingAmount ?: bill.totalAmount).toMoneyDecimal() }), "${pending.size} bills"),
                                Triple("Paid", DashboardFormatters.money(paid.fold(0.toBigDecimal()) { sum, bill -> sum + (bill.paidAmount ?: bill.totalAmount).toMoneyDecimal() }), "${paid.size} bills"),
                                Triple("Under Review", data.bills.count { it.paymentStatus == "Under Review" }.toString(), "payment proofs"),
                                Triple("Total Bills", data.bills.size.toString(), "all time")
                            )
                        )
                    }
                    item {
                        SectionCard("Payment Instructions") {
                            KeyValue("Society", data.paymentSettings?.societyName ?: "Society Payment")
                            KeyValue("UPI ID", data.paymentSettings?.paymentUpiId ?: "Not configured")
                            Text(data.paymentSettings?.paymentNote ?: "Complete payment and submit transaction details for admin approval.")
                        }
                    }
                    item {
                        SearchAndFilter(state.query, viewModel::setQuery, state.filter, viewModel::setFilter)
                    }
                    if (bills.isEmpty()) {
                        item { EmptyState("No bills found", "Try changing the filter.") }
                    } else {
                        items(bills, key = { it.id ?: "${it.month}-${it.year}" }) { bill ->
                            BillCard(
                                bill = bill,
                                admin = false,
                                onPay = { dialog = ResidentDialog.Payment(bill) },
                                onDispute = { dialog = ResidentDialog.Dispute(bill) }
                            )
                        }
                    }
                }
            }
        }
    }
    ResidentDialogHost(dialog, onDismiss = { dialog = null }, viewModel = viewModel)
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
        Button(onClick = { openDialog(MaintenanceDialog.Generate) }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) { Text("Generate Monthly Bills") }
        Button(onClick = { openDialog(MaintenanceDialog.ManualBill) }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) { Text("Create Manual Bill") }
    }
    if (bills.isEmpty()) item { EmptyState("No bills found", "Generate bills or change filters.") }
    else items(bills, key = { it.id ?: "${it.month}-${it.year}" }) { bill ->
        BillCard(
            bill = bill,
            admin = true,
            onPay = { openDialog(MaintenanceDialog.MarkPaid(bill)) },
            onDispute = {},
            onReminder = { bill.id?.let(viewModel::sendReminder) },
            onWaive = { bill.id?.let(viewModel::waiveLateFee) },
            onDelete = { bill.id?.let(viewModel::deleteBill) }
        )
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.paymentsTab(payments: List<MaintenancePaymentDto>, viewModel: AdminMaintenanceViewModel, openDialog: (MaintenanceDialog) -> Unit) {
    if (payments.isEmpty()) item { EmptyState("No payment submissions", "Resident payments will appear here.") }
    else items(payments, key = { it.id ?: it.transactionId.orEmpty() }) { payment ->
        ManagementCard {
            Text(payment.residentName ?: "Resident", fontWeight = FontWeight.Bold)
            Text("Flat ${payment.flatNo ?: "-"} • ${DashboardFormatters.money(payment.amount.toMoneyDecimal())}")
            Text("Method: ${payment.paymentMethod ?: "-"} • Txn: ${payment.transactionId ?: "-"}")
            Text("Status: ${payment.paymentStatus ?: "-"}")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = { payment.id?.let { viewModel.updatePayment(it, "Paid") } }) { Text("Approve") }
                TextButton(onClick = { payment.id?.let { viewModel.updatePayment(it, "Rejected") } }) { Text("Reject") }
            }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.expensesTab(expenses: List<ExpenseDto>, viewModel: AdminMaintenanceViewModel, openDialog: (MaintenanceDialog) -> Unit) {
    item { Button(onClick = { openDialog(MaintenanceDialog.Expense) }, modifier = Modifier.fillMaxWidth()) { Text("Record Expense") } }
    if (expenses.isEmpty()) item { EmptyState("No expenses", "Record society maintenance expenses here.") }
    else items(expenses, key = { it.id ?: it.expenseNumber.orEmpty() }) { expense ->
        ManagementCard {
            Text(expense.expenseNumber ?: "Expense", fontWeight = FontWeight.Bold)
            Text("${expense.category ?: "-"} • ${expense.vendor ?: "-"}")
            Text("${DashboardFormatters.money(expense.amount.toMoneyDecimal())} • ${DashboardFormatters.date(expense.expenseDate)}")
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
            Text("${DashboardFormatters.money(category.amount.toMoneyDecimal())} • ${category.calculationType ?: "FIXED"} • ${if (category.active == false) "Inactive" else "Active"}")
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
            Text("${dispute.residentName ?: "Resident"} • Flat ${dispute.flatNo ?: "-"}")
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
    onDelete: () -> Unit = {}
) {
    val status = bill.paymentStatus ?: bill.status ?: "Pending"
    ManagementCard {
        Text(bill.title ?: "Maintenance Bill", fontWeight = FontWeight.Bold)
        Text("${bill.residentName ?: "My Bill"} • Flat ${bill.flatNo ?: "-"}")
        Text("Month ${bill.month ?: "-"} / ${bill.year ?: "-"} • Due ${DashboardFormatters.date(bill.dueDate ?: bill.maintenanceDueDate)}")
        KeyValue("Total", DashboardFormatters.money(bill.totalAmount.toMoneyDecimal()))
        KeyValue("Paid", DashboardFormatters.money(bill.paidAmount.toMoneyDecimal()))
        KeyValue("Remaining", DashboardFormatters.money((bill.remainingAmount ?: bill.totalAmount).toMoneyDecimal()))
        Text("Status: $status")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (status != "Paid") Button(onClick = onPay) { Text(if (admin) "Mark Paid" else "Pay") }
            if (!admin && status != "Paid") TextButton(onClick = onDispute) { Text("Dispute") }
            if (admin && status != "Paid") TextButton(onClick = onReminder) { Text("Reminder") }
            if (admin && status != "Paid") TextButton(onClick = onWaive) { Text("Waive Late Fee") }
            if (admin) TextButton(onClick = onDelete) { Text("Delete") }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SearchAndFilter(query: String, onQuery: (String) -> Unit, filter: String, onFilter: (String) -> Unit) {
    OutlinedTextField(query, onQuery, modifier = Modifier.fillMaxWidth(), label = { Text("Search bills") }, singleLine = true)
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
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
    when (dialog) {
        MaintenanceDialog.Generate -> SimpleFormDialog("Generate Bills", onDismiss) {
            var month by remember { mutableStateOf("${LocalDate.now().monthValue}") }
            var year by remember { mutableStateOf("${LocalDate.now().year}") }
            BasicAppTextField(month, { month = it }, "Month number")
            BasicAppTextField(year, { year = it }, "Year")
            Button(onClick = { viewModel.generateBills(month.toIntOrNull() ?: 0, year.toIntOrNull() ?: 0); onDismiss() }, modifier = Modifier.fillMaxWidth()) { Text("Generate") }
        }
        MaintenanceDialog.ManualBill -> SimpleFormDialog("Create Manual Bill", onDismiss) {
            var title by remember { mutableStateOf("Monthly Maintenance") }
            var month by remember { mutableStateOf("${LocalDate.now().monthValue}") }
            var year by remember { mutableStateOf("${LocalDate.now().year}") }
            var due by remember { mutableStateOf(defaultDueDate()) }
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
            var amount by remember { mutableStateOf((dialog.bill.remainingAmount ?: dialog.bill.totalAmount).orEmpty()) }
            var method by remember { mutableStateOf("Manual") }
            var txn by remember { mutableStateOf("ADMIN-${System.currentTimeMillis()}") }
            BasicAppTextField(amount, { amount = it }, "Paid amount")
            BasicAppTextField(method, { method = it }, "Payment method")
            BasicAppTextField(txn, { txn = it }, "Transaction ID")
            Button(onClick = { dialog.bill.id?.let { viewModel.markPaid(it, amount, method, txn, "Marked paid by admin") }; onDismiss() }, modifier = Modifier.fillMaxWidth()) { Text("Save Payment") }
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

@Composable
private fun ResidentDialogHost(dialog: ResidentDialog?, onDismiss: () -> Unit, viewModel: ResidentMaintenanceViewModel) {
    when (dialog) {
        is ResidentDialog.Payment -> SimpleFormDialog("Submit Payment", onDismiss) {
            var method by remember { mutableStateOf("UPI") }
            var amount by remember { mutableStateOf((dialog.bill.remainingAmount ?: dialog.bill.totalAmount).orEmpty()) }
            var txn by remember { mutableStateOf("") }
            var proof by remember { mutableStateOf("") }
            BasicAppTextField(method, { method = it }, "Payment method")
            BasicAppTextField(amount, { amount = it }, "Amount")
            BasicAppTextField(txn, { txn = it }, "Transaction ID")
            BasicAppTextField(proof, { proof = it }, "Screenshot URL optional")
            Button(onClick = { dialog.bill.id?.let { viewModel.submitPayment(it, method, txn, amount, proof) }; onDismiss() }, modifier = Modifier.fillMaxWidth()) { Text("Submit for Review") }
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
private fun SimpleFormDialog(title: String, onDismiss: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { Column(verticalArrangement = Arrangement.spacedBy(10.dp), content = content) },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Close") } }
    )
}

private fun MaintenanceBillDto.matchesBill(query: String): Boolean {
    if (query.isBlank()) return true
    val q = query.lowercase()
    return listOf(title, residentName, flatNo, month, year, paymentStatus, status).any { it?.lowercase()?.contains(q) == true }
}
