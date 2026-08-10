package com.example.application.ui.screens.resident

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.os.Build
import android.provider.MediaStore
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.layout.size
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
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
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
import com.example.application.ui.components.EmptyState
import com.example.application.ui.components.RetryState
import com.example.application.ui.components.SkeletonListItem
import com.example.application.viewmodel.ResidentMaintenanceViewModel
import com.example.application.viewmodel.ResidentMembersViewModel
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
        if (state.isLoading && paymentBills.isEmpty()) {
            items(5) { SkeletonListItem() }
        } else if (paymentBills.isEmpty()) {
            if (state.error != null) {
                item { RetryState(message = state.error ?: "Unable to load payment history.", onRetry = { viewModel.load(refresh = true) }) }
            } else {
                item {
                    EmptyState(
                        title = "No payment records",
                        message = "Paid bills will appear here after admin approval."
                    )
                }
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
    viewModel: ResidentMembersViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val members = state.members

    ResidentSimpleScaffold(
        title = "Society Members",
        subtitle = "Read-only resident directory",
        onBack = onBack,
        isRefreshing = state.refreshing,
        onRefresh = { viewModel.load(refresh = true) }
    ) {
        if (state.loading && members.isEmpty()) {
            items(5) { SkeletonListItem() }
        } else if (members.isEmpty()) {
            if (state.error != null) {
                item { RetryState(message = state.error ?: "Unable to load members.", onRetry = { viewModel.load(refresh = true) }) }
            } else {
                item {
                    EmptyState(
                        title = "No members found",
                        message = "No approved residents were returned by the directory."
                    )
                }
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
                },
                actions = {
                    IconButton(onClick = onRefresh, enabled = !isRefreshing) {
                        if (isRefreshing) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        } else {
                            Icon(Icons.Filled.Refresh, contentDescription = "Refresh")
                        }
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
                        Icon(Icons.Filled.ReceiptLong, contentDescription = "Receipt")
                        Spacer(Modifier.width(6.dp))
                        Text("Receipt")
                    }
                    OutlinedButton(onClick = { saveResidentReceiptPdf(context, bill) }, shape = RoundedCornerShape(12.dp)) {
                        Icon(Icons.Filled.Download, contentDescription = "Download")
                        Spacer(Modifier.width(6.dp))
                        Text("Download")
                    }
                    OutlinedButton(onClick = { shareResidentReceiptPdf(context, bill) }, shape = RoundedCornerShape(12.dp)) {
                        Icon(Icons.Filled.Share, contentDescription = "Share")
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
    val amountStr = DashboardFormatters.money((bill.paidAmount ?: bill.totalAmount ?: bill.amount).toMoneyDecimal())
    
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {},
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Visual Paper Document Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    border = BorderStroke(1.dp, Color(0xFFCBD5E1)),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Header Logo & Title
                        Surface(
                            shape = CircleShape,
                            color = Color(0xFF16A34A).copy(alpha = 0.12f),
                            modifier = Modifier.size(54.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Filled.ReceiptLong, contentDescription = null, tint = Color(0xFF16A34A), modifier = Modifier.size(30.dp))
                            }
                        }
                        
                        Text(
                            text = "SOCIETY MANAGEMENT SYSTEM",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color(0xFF0F172A)
                        )
                        Text(
                            text = "OFFICIAL PAYMENT RECEIPT",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF16A34A)
                        )
                        
                        HorizontalDivider(color = Color(0xFFE2E8F0))
                        
                        // Receipt Ref & Date
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("RECEIPT NO.", style = MaterialTheme.typography.labelSmall, color = Color(0xFF64748B), fontWeight = FontWeight.Bold)
                                Text(bill.receiptNumber ?: "REC-2026-${bill.id?.takeLast(4) ?: "01"}", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("PAYMENT DATE", style = MaterialTheme.typography.labelSmall, color = Color(0xFF64748B), fontWeight = FontWeight.Bold)
                                Text(DashboardFormatters.date(bill.paymentDate ?: bill.verifiedAt), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                            }
                        }
                        
                        // Amount Highlight Box
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFFF0FDF4),
                            border = BorderStroke(1.dp, Color(0xFFBBF7D0)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(14.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text("TOTAL AMOUNT RECEIVED", style = MaterialTheme.typography.labelSmall, color = Color(0xFF15803D), fontWeight = FontWeight.Bold)
                                Text(amountStr, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold, color = Color(0xFF15803D))
                            }
                        }

                        // Write-Off Section (If Write-Off Applied)
                        val wAmt = (bill.writeOffAmount ?: bill.maintenanceWriteOffAmount).toMoneyDecimal()
                        if (wAmt > java.math.BigDecimal.ZERO || bill.isWrittenOff == true) {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFFEDE9FE),
                                border = BorderStroke(1.dp, Color(0xFFDDD6FE)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(14.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text("WRITE-OFF / WAIVER APPLIED 🏷️", style = MaterialTheme.typography.labelSmall, color = Color(0xFF6D28D9), fontWeight = FontWeight.Bold)
                                    Text(DashboardFormatters.money(wAmt), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold, color = Color(0xFF6D28D9))
                                    Text("Reason: ${bill.writeOffReason ?: bill.writeOffType ?: "Admin Adjustment"}", style = MaterialTheme.typography.bodySmall, color = Color(0xFF5B21B6), fontWeight = FontWeight.Medium)
                                }
                            }
                        }
                        
                        // Payment Details Breakdown
                        Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            InfoRow("Resident Name", bill.residentName ?: "My Account")
                            InfoRow("Flat / Unit", bill.flatNo ?: "-")
                            InfoRow("Billing Month", "${bill.month ?: "-"}/${bill.year ?: "-"}")
                            InfoRow("Maintenance Title", bill.title ?: "Maintenance Bill")
                            InfoRow("Transaction Ref", bill.transactionId ?: "-")
                            if (wAmt > java.math.BigDecimal.ZERO || bill.isWrittenOff == true) {
                                InfoRow("Write-Off Amount", DashboardFormatters.money(wAmt))
                            }
                            InfoRow("Verification Status", "APPROVED & VERIFIED ✅")
                        }
                        
                        HorizontalDivider(color = Color(0xFFE2E8F0))
                        
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Payment Status: APPROVED", style = MaterialTheme.typography.labelSmall, color = Color(0xFF16A34A), fontWeight = FontWeight.Bold)
                                Text("Computer Generated Receipt", style = MaterialTheme.typography.labelSmall, color = Color(0xFF64748B))
                            }
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFFDCFCE7),
                                border = BorderStroke(1.dp, Color(0xFF86EFAC))
                            ) {
                                Text(
                                    text = "PAID",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF15803D),
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
                
                // Action Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Button(
                        onClick = { saveResidentReceiptPdf(context, bill) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0B5FFF))
                    ) {
                        Icon(Icons.Filled.Download, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Download PDF", fontWeight = FontWeight.Bold)
                    }
                    OutlinedButton(
                        onClick = { shareResidentReceiptPdf(context, bill) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Filled.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Share", fontWeight = FontWeight.Bold)
                    }
                }
                
                TextButton(onClick = onDismiss) {
                    Text("Close Preview", color = Color(0xFF64748B))
                }
            }
        }
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
    val wAmtPdf = (bill.writeOffAmount ?: bill.maintenanceWriteOffAmount).toMoneyDecimal()
    if (wAmtPdf > java.math.BigDecimal.ZERO || bill.isWrittenOff == true) {
        line("Write-Off Amount", DashboardFormatters.money(wAmtPdf))
        line("Write-Off Reason", bill.writeOffReason ?: bill.writeOffType ?: "Admin Waiver")
    }
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
