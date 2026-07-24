package com.example.application.ui.screens.resident

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.os.Build
import android.provider.MediaStore
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.core.content.FileProvider
import com.example.application.data.remote.dto.MaintenanceBillDto
import com.example.application.data.remote.dto.MembersMaintenanceReportDto
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.ResidentMaintenanceViewModel
import com.example.application.viewmodel.ResidentReportsViewModel
import java.math.BigDecimal

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResidentPaymentHistoryScreen(
    onBack: () -> Unit,
    viewModel: ResidentMaintenanceViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val bills = state.data?.bills.orEmpty()
    val paymentBills = bills
        .filter { !it.latestPaymentStatus.isNullOrBlank() || !it.paymentDate.isNullOrBlank() || !it.transactionId.isNullOrBlank() || (it.paymentStatus ?: it.status).equals("Paid", ignoreCase = true) }
        .sortedByDescending { it.paidAt ?: it.paymentDate ?: it.verifiedAt ?: it.dueDate.orEmpty() }
    var receiptBill by remember { mutableStateOf<MaintenanceBillDto?>(null) }

    ResidentSimpleScaffold(
        title = "Payment History",
        subtitle = "Your paid maintenance records",
        onBack = onBack,
        isRefreshing = state.isRefreshing,
        onRefresh = { viewModel.load(refresh = true) }
    ) {
        if (state.error != null && bills.isEmpty()) {
            item { ErrorCard(state.error ?: "Unable to load payment history.", { viewModel.load(refresh = true) }) }
        }
        if (paymentBills.isEmpty()) {
            item {
                EmptyResidentCard(
                    icon = Icons.Filled.Payments,
                    title = if (state.isLoading) "Preparing payment history" else "No payment records",
                    message = if (state.isLoading) "Your screen is ready. Latest records are refreshing silently." else "Paid bills will appear here after admin approval."
                )
            }
        } else {
            item {
                SummaryStrip(
                    label = "Total Paid",
                    value = DashboardFormatters.money(
                        paymentBills.filter { it.isApprovedPayment() }.fold(0.toBigDecimal()) { sum, bill ->
                            sum + (bill.paidAmount ?: bill.totalAmount ?: bill.amount).toMoneyDecimal()
                        }
                    ),
                    note = "${paymentBills.count { it.isApprovedPayment() }} approved payment${if (paymentBills.count { it.isApprovedPayment() } == 1) "" else "s"}"
                )
            }
            items(paymentBills, key = { it.id ?: "${it.title}-${it.month}-${it.year}" }) { bill ->
                PaymentHistoryCard(bill, onViewReceipt = { receiptBill = bill })
            }
        }
        item { Spacer(Modifier.height(12.dp)) }
    }

    receiptBill?.let { bill ->
        ResidentReceiptDialog(
            bill = bill,
            onDismiss = { receiptBill = null }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResidentMembersScreen(
    onBack: () -> Unit,
    viewModel: ResidentReportsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val members = state.data?.membersMaintenance.orEmpty()

    ResidentSimpleScaffold(
        title = "Society Members",
        subtitle = "Read-only resident directory",
        onBack = onBack,
        isRefreshing = state.isRefreshing,
        onRefresh = { viewModel.load(refresh = true) }
    ) {
        if (state.error != null && members.isEmpty()) {
            item { ErrorCard(state.error ?: "Unable to load members.", { viewModel.load(refresh = true) }) }
        }
        if (members.isEmpty()) {
            item {
                EmptyResidentCard(
                    icon = Icons.Filled.Groups,
                    title = if (state.isLoading) "Preparing members list" else "No members found",
                    message = if (state.isLoading) "The screen is ready. Latest members are refreshing silently." else "Member details will appear when the backend returns them."
                )
            }
        } else {
            items(members, key = { it.id ?: "${it.flatNo}-${it.name}" }) { member ->
                MemberDirectoryCard(member)
            }
        }
        item { Spacer(Modifier.height(12.dp)) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ResidentSimpleScaffold(
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
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                title = {
                    Column {
                        Text(title, fontWeight = FontWeight.Bold)
                        Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            )
        }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = onRefresh,
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                content = content
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PaymentHistoryCard(bill: MaintenanceBillDto, onViewReceipt: () -> Unit) {
    val context = LocalContext.current
    val approved = bill.isApprovedPayment()
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(bill.title ?: "Maintenance Payment", fontWeight = FontWeight.Bold)
                    Text("${bill.month ?: "-"} ${bill.year ?: ""}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text(DashboardFormatters.money((bill.paidAmount ?: bill.totalAmount ?: bill.amount).toMoneyDecimal()), fontWeight = FontWeight.Bold)
            }
            InfoRow("Payment date", DashboardFormatters.date(bill.paymentDate))
            InfoRow("Status", residentPaymentStatus(bill))
            InfoRow("Penalty", DashboardFormatters.money((bill.penaltyAmount ?: bill.lateFee).toMoneyDecimal()))
            InfoRow("Reference ID", bill.transactionId ?: "-")
            bill.rejectionReason?.takeIf { it.isNotBlank() }?.let { InfoRow("Reject reason", it) }
            if (approved) {
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(onClick = onViewReceipt, shape = RoundedCornerShape(12.dp)) {
                        Icon(Icons.Filled.ReceiptLong, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text("Receipt")
                    }
                    OutlinedButton(onClick = { saveResidentReceiptPdf(context, bill) }, shape = RoundedCornerShape(12.dp)) {
                        Icon(Icons.Filled.Download, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text("Download")
                    }
                    OutlinedButton(onClick = { shareResidentReceiptPdf(context, bill) }, shape = RoundedCornerShape(12.dp)) {
                        Icon(Icons.Filled.Share, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text("Share")
                    }
                }
            } else {
                Text(
                    if (bill.isRejectedPayment()) "Payment rejected. You can submit a new screenshot from Maintenance." else "Receipt will be available after admin approval.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
private fun ResidentReceiptDialog(bill: MaintenanceBillDto, onDismiss: () -> Unit) {
    val context = LocalContext.current
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Generated Receipt") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                InfoRow("Receipt No.", bill.receiptNumber ?: "-")
                InfoRow("Resident", bill.residentName ?: "My account")
                InfoRow("Flat", bill.flatNo ?: "-")
                InfoRow("Maintenance", bill.title ?: "Maintenance")
                InfoRow("Billing", "${bill.month ?: "-"}/${bill.year ?: "-"}")
                InfoRow("Amount", DashboardFormatters.money((bill.paidAmount ?: bill.totalAmount ?: bill.amount).toMoneyDecimal()))
                InfoRow("Transaction", bill.transactionId ?: "-")
                InfoRow("Approved", DashboardFormatters.date(bill.verifiedAt))
                Text("This is a digitally generated receipt.", style = MaterialTheme.typography.bodySmall)
            }
        },
        confirmButton = { Button(onClick = { saveResidentReceiptPdf(context, bill) }) { Text("Download") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Close") } }
    )
}

@Composable
private fun MemberDirectoryCard(member: MembersMaintenanceReportDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(modifier = Modifier.clip(CircleShape), shape = CircleShape, color = Color(0xFFEAF3FF)) {
                Text(
                    text = member.name?.firstOrNull()?.uppercaseChar()?.toString() ?: "R",
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                    color = Color(0xFF0B5FFF),
                    fontWeight = FontWeight.Bold
                )
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(member.name ?: "Resident", fontWeight = FontWeight.Bold)
                Text("Flat ${member.flatNo ?: "-"}${member.wing?.let { ", Wing $it" } ?: ""}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("Status: ${DashboardFormatters.statusLabel(member.maintenanceStatus)}", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun SummaryStrip(label: String, value: String, note: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0B5FFF))
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(label, color = Color.White.copy(alpha = 0.82f))
            Text(value, style = MaterialTheme.typography.headlineSmall, color = Color.White, fontWeight = FontWeight.Bold)
            Text(note, color = Color.White.copy(alpha = 0.78f))
        }
    }
}

@Composable
private fun EmptyResidentCard(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, message: String) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(22.dp)) {
        Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Icon(icon, contentDescription = null, tint = Color(0xFF0B5FFF), modifier = Modifier.background(Color(0xFFEAF3FF), CircleShape).padding(12.dp))
            Text(title, fontWeight = FontWeight.Bold)
            Text(message, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ErrorCard(message: String, onRetry: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(message, color = MaterialTheme.colorScheme.onErrorContainer)
            Surface(onClick = onRetry, shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.error) {
                Text("Retry", Modifier.padding(horizontal = 16.dp, vertical = 9.dp), color = MaterialTheme.colorScheme.onError)
            }
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
        Text(value, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
    }
}

private fun MaintenanceBillDto.isApprovedPayment(): Boolean {
    val status = (latestPaymentStatus ?: paymentStatus ?: status).orEmpty().trim().replace(" ", "_").uppercase()
    return status == "PAID" || status == "APPROVED"
}

private fun MaintenanceBillDto.isRejectedPayment(): Boolean {
    val status = (latestPaymentStatus ?: paymentStatus ?: status).orEmpty().trim().replace(" ", "_").uppercase()
    return status == "REJECTED"
}

private fun residentPaymentStatus(bill: MaintenanceBillDto): String {
    val status = (bill.latestPaymentStatus ?: bill.paymentStatus ?: bill.status).orEmpty().trim().replace(" ", "_").uppercase()
    return when (status) {
        "PENDING", "UNPAID" -> "Pending"
        "PENDING_VERIFICATION", "PAYMENT_PROOF_SUBMITTED" -> "Payment proof submitted"
        "UNDER_REVIEW" -> "Under admin review"
        "PAID", "APPROVED" -> "Approved / Paid"
        "REJECTED" -> "Rejected"
        else -> DashboardFormatters.statusLabel(bill.latestPaymentStatus ?: bill.paymentStatus ?: bill.status)
    }
}

private fun createResidentReceiptPdfFile(context: Context, bill: MaintenanceBillDto): java.io.File {
    val file = java.io.File(context.cacheDir, "receipt-${bill.receiptNumber ?: bill.id ?: System.currentTimeMillis()}.pdf")
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
    line("Receipt Number", bill.receiptNumber ?: "-")
    line("Payment ID", bill.paymentId ?: "-")
    line("Resident Name", bill.residentName ?: "Resident")
    line("Flat Number", bill.flatNo ?: "-")
    line("Maintenance Title", bill.title ?: "Maintenance")
    line("Billing Month/Year", "${bill.month ?: "-"}/${bill.year ?: "-"}")
    line("Base Amount", DashboardFormatters.money(bill.amount.toMoneyDecimal()))
    line("Late Fee / Penalty", DashboardFormatters.money((bill.penaltyAmount ?: bill.lateFee).toMoneyDecimal()))
    line("Total Paid", DashboardFormatters.money((bill.paidAmount ?: bill.totalAmount ?: bill.amount).toMoneyDecimal()))
    line("Payment Date", DashboardFormatters.date(bill.paymentDate ?: bill.paidAt))
    line("Transaction Reference", bill.transactionId ?: "-")
    line("Approval Date", DashboardFormatters.date(bill.verifiedAt))
    line("Payment Method", bill.paymentMethod ?: "-")
    line("Payment Status", residentPaymentStatus(bill))
    y += 28f
    paint.textSize = 12f
    canvas.drawText("This is a digitally generated receipt and does not require a physical signature.", 48f, y, paint)
    document.finishPage(page)
    file.outputStream().use { document.writeTo(it) }
    document.close()
    return file
}

internal fun saveResidentReceiptPdf(context: Context, bill: MaintenanceBillDto) {
    runCatching {
        val source = createResidentReceiptPdfFile(context, bill)
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
        Toast.makeText(context, "Receipt saved to Downloads.", Toast.LENGTH_LONG).show()
    }.onFailure {
        Toast.makeText(context, "Unable to save receipt.", Toast.LENGTH_LONG).show()
    }
}

internal fun shareResidentReceiptPdf(context: Context, bill: MaintenanceBillDto) {
    runCatching {
        val file = createResidentReceiptPdfFile(context, bill)
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

private fun String?.toMoneyDecimal(): BigDecimal {
    return this?.toBigDecimalOrNull() ?: BigDecimal.ZERO
}
