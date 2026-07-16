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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
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
import com.example.application.data.remote.dto.PaymentSettingsDto
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.AdminMaintenanceViewModel
import com.example.application.viewmodel.ResidentMaintenanceViewModel
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter

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
        MaintenanceTopBar(
            title = "Maintenance",
            subtitle = "Bills, payments, expenses and late fees",
            navigationText = "Back",
            onNavigationClick = onBack,
            actionText = "Apply Penalty",
            onActionClick = { viewModel.applyPenalty() }
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
                        "Payments" -> item { PaymentVerificationSection(data.payments, state.query, state.filter, viewModel) }
                        "Expenses" -> expensesTab(data.expenses, viewModel, { dialog = it })
                        "Settings" -> settingsTab(data.settings, viewModel, { dialog = it })
                        "Categories" -> categoriesTab(data.categories, viewModel, { dialog = it })
                        "Late Fee" -> lateFeeTab(data.lateFeeRule, viewModel, { dialog = it })
                        "Disputes" -> disputesTab(data.disputes)
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
    Scaffold(topBar = {
        MaintenanceTopBar(
            title = "My Maintenance",
            subtitle = "Bills, payments and disputes",
            navigationText = "Back",
            onNavigationClick = onBack
        )
    }) { padding ->
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
                    val pending = data.bills.filter { !(it.paymentStatus ?: it.status).isApprovedStatus() }
                    val paid = data.bills.filter { (it.paymentStatus ?: it.status).isApprovedStatus() }
                    item {
                        MetricGrid(
                            listOf(
                                Triple("Outstanding", DashboardFormatters.money(pending.fold(0.toBigDecimal()) { sum, bill -> sum + (bill.remainingAmount ?: bill.totalAmount).toMoneyDecimal() }), "${pending.size} bills"),
                                Triple("Paid", DashboardFormatters.money(paid.fold(0.toBigDecimal()) { sum, bill -> sum + (bill.paidAmount ?: bill.totalAmount).toMoneyDecimal() }), "${paid.size} bills"),
                                Triple("Under Review", data.bills.count { (it.paymentStatus ?: it.status).isVerificationPendingStatus() }.toString(), "payment proofs"),
                                Triple("Total Bills", data.bills.size.toString(), "all time")
                            )
                        )
                    }
                    item {
                        SectionCard("Payment Instructions") {
                            KeyValue("Society", data.paymentSettings?.societyName ?: "Society Payment")
                            KeyValue("UPI ID", data.paymentSettings?.paymentUpiId ?: "Not configured")
                            Text(data.paymentSettings?.paymentNote ?: "Complete payment and submit transaction details for admin approval.")
                            PaymentQrBox(data.paymentSettings)
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
    ResidentDialogHost(dialog, paymentSettings = data?.paymentSettings, onDismiss = { dialog = null }, viewModel = viewModel)
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
    val visiblePayments = remember(payments, query, filter) {
        payments.filter { payment ->
            val status = payment.paymentStatus.orEmpty()
            val filterOk = filter == "All" ||
                status.equals(filter, true) ||
                (filter == "Pending" && status.normalizePaymentStatus() in setOf("PAYMENT_PROOF_SUBMITTED", "UNDER_REVIEW", "PENDING_VERIFICATION"))
            val q = query.trim().lowercase()
            val queryOk = q.isBlank() || listOf(payment.residentName, payment.flatNo, payment.transactionId, payment.month, payment.year)
                .any { it?.lowercase()?.contains(q) == true }
            filterOk && queryOk
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("Payment Verification", "Review resident UPI proofs before marking bills paid") {
            SearchAndFilter(query, viewModel::setQuery, filter, viewModel::setFilter)
            Text("Tip: filter by Pending, Approved/Paid, Rejected, month, flat or resident name.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (visiblePayments.isEmpty()) {
            EmptyState("No payment proofs found", "Submitted resident payment screenshots will appear here.")
        } else {
            visiblePayments.forEach { payment ->
                PaymentVerificationCard(
                    payment = payment,
                    onOpenScreenshot = { screenshotPayment = payment },
                    onApprove = { payment.id?.let { viewModel.updatePayment(it, "APPROVED") } },
                    onReject = { rejectPayment = payment },
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
                    model = fullMediaUrl(payment.screenshotUrl ?: payment.screenshot),
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
                        payment.id?.let { viewModel.updatePayment(it, "REJECTED", reason.ifBlank { "Payment proof rejected by admin" }) }
                        rejectPayment = null
                    },
                    enabled = reason.isNotBlank()
                ) { Text("Reject") }
            },
            dismissButton = { TextButton(onClick = { rejectPayment = null }) { Text("Cancel") } }
        )
    }
}

@Composable
private fun PaymentVerificationCard(
    payment: MaintenancePaymentDto,
    onOpenScreenshot: () -> Unit,
    onApprove: () -> Unit,
    onReject: () -> Unit,
    onViewReceipt: () -> Unit,
    onDownloadReceipt: () -> Unit,
    onShareReceipt: () -> Unit
) {
    val status = friendlyPaymentStatus(payment.paymentStatus)
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                AsyncImage(
                    model = fullMediaUrl(payment.screenshotUrl ?: payment.screenshot),
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
                if (!(payment.paymentStatus).isApprovedStatus()) Button(onClick = onApprove) { Text("Approve") }
                if (!(payment.paymentStatus).isApprovedStatus()) TextButton(onClick = onReject) { Text("Reject") }
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
    onDelete: () -> Unit = {}
) {
    val status = bill.paymentStatus ?: bill.status ?: "Pending"
    val canSubmitPayment = !admin && status.isResidentPayableStatus()
    val isVerificationPending = !admin && status.isVerificationPendingStatus()
    ManagementCard {
        Text(bill.title ?: "Maintenance Bill", fontWeight = FontWeight.Bold)
        Text("${bill.residentName ?: "My Bill"} • Flat ${bill.flatNo ?: "-"}")
        Text("Month ${bill.month ?: "-"} / ${bill.year ?: "-"} • Due ${DashboardFormatters.date(bill.dueDate ?: bill.maintenanceDueDate)}")
        KeyValue("Base amount", DashboardFormatters.money(bill.amount.toMoneyDecimal()))
        KeyValue("Late fee", DashboardFormatters.money((bill.lateFee ?: bill.penaltyAmount).toMoneyDecimal()))
        KeyValue("Total", DashboardFormatters.money(bill.totalAmount.toMoneyDecimal()))
        KeyValue("Paid", DashboardFormatters.money(bill.paidAmount.toMoneyDecimal()))
        KeyValue("Remaining", DashboardFormatters.money((bill.remainingAmount ?: bill.totalAmount).toMoneyDecimal()))
        Text("Status: $status")
        if (isVerificationPending) {
            Text(
                "Your payment proof has been submitted and is waiting for admin verification.",
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.bodySmall
            )
        }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (admin && !status.isApprovedStatus()) Button(onClick = onPay) { Text("Mark Paid") }
            if (canSubmitPayment) Button(onClick = onPay) { Text("Pay Now") }
            if (!admin && !status.isApprovedStatus() && !isVerificationPending) TextButton(onClick = onDispute) { Text("Dispute") }
            if (admin && !status.isApprovedStatus()) TextButton(onClick = onReminder) { Text("Reminder") }
            if (admin && !status.isApprovedStatus()) TextButton(onClick = onWaive) { Text("Waive Late Fee") }
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
private fun PaymentQrBox(paymentSettings: PaymentSettingsDto?) {
    val qrImage = paymentSettings?.paymentQrImage
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
        if (!qrImage.isNullOrBlank()) {
            AsyncImage(
                model = qrImage,
                contentDescription = "Payment QR code",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit
            )
        } else {
            Image(
                painter = painterResource(R.drawable.society_payment_qr),
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
            val upiId = paymentSettings?.paymentUpiId?.ifBlank { null } ?: "89998232442@ypi"
            val expectedAmount = (bill.remainingAmount ?: bill.totalAmount ?: bill.amount ?: "0").toMoneyDecimal()
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
    val remaining = (bill.remainingAmount ?: bill.totalAmount).toMoneyDecimal()
    val base = bill.amount.toMoneyDecimal()
    val late = (bill.lateFee ?: bill.penaltyAmount).toMoneyDecimal()
    return (remaining - base - late).takeIf { it > BigDecimal.ZERO } ?: BigDecimal.ZERO
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
            put(MediaStore.Images.Media.DISPLAY_NAME, "society_payment_qr.png")
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/Society Management")
            put(MediaStore.Images.Media.IS_PENDING, 1)
        }
        val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: error("Unable to create image file")
        resolver.openOutputStream(uri)?.use { output ->
            context.resources.openRawResource(R.drawable.society_payment_qr).use { input -> input.copyTo(output) }
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
        val file = java.io.File(context.cacheDir, "society_payment_qr.png")
        context.resources.openRawResource(R.drawable.society_payment_qr).use { input ->
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

private fun String?.normalizePaymentStatus(): String {
    return orEmpty()
        .trim()
        .replace("-", "_")
        .replace(" ", "_")
        .uppercase()
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
    FlowRow(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        maxItemsInEachRow = 2
    ) {
        items.forEach { (label, value, note) ->
            Card(modifier = Modifier.weight(1f)) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(label, style = MaterialTheme.typography.labelLarge)
                    note?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

private fun String?.toMoneyDecimal(): BigDecimal {
    return this?.toBigDecimalOrNull() ?: BigDecimal.ZERO
}



