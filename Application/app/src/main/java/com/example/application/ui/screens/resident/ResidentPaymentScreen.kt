package com.example.application.ui.screens.resident

import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.MediaStore
import android.util.Base64
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Smartphone
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.example.application.BuildConfig
import com.example.application.data.remote.dto.MaintenanceBillDto
import com.example.application.data.remote.dto.PaymentSettingsDto
import com.example.application.util.DashboardFormatters
import com.example.application.ui.components.RetryState
import com.example.application.ui.theme.SocietyBlue40
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import com.example.application.viewmodel.ResidentMaintenanceViewModel
import java.math.BigDecimal
import java.math.RoundingMode
import java.io.File

import androidx.compose.foundation.layout.imePadding

private val Ink = Color(0xFF071338)
private val Muted = Color(0xFF59647A)
private val PaymentBlue = SocietyBlue40
private val SuccessGreen = Color(0xFF0E9F5A)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResidentPaymentScreen(
    billId: String,
    onBack: () -> Unit,
    onViewPaymentHistory: () -> Unit,
    viewModel: ResidentMaintenanceViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val state by viewModel.state.collectAsStateWithLifecycle()
    val data = state.data
    val bill = data?.bills?.firstOrNull { it.id == billId }
    val paymentSettings = data?.paymentSettings

    var amount by remember { mutableStateOf("0") }
    var transactionId by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var validationError by remember { mutableStateOf<String?>(null) }
    var proofUri by remember { mutableStateOf<Uri?>(null) }
    var cameraUri by remember { mutableStateOf<Uri?>(null) }

    LaunchedEffect(bill?.id, bill?.remainingDue, bill?.currentDue, bill?.remainingAmount, bill?.totalAmount) {
        if (bill != null) amount = bill.expectedPayableAmount().toPlainString()
    }
    LaunchedEffect(state.message) {
        if (!state.message.isNullOrBlank()) {
            Toast.makeText(context, "Your payment has been submitted and sent to the admin for approval. It will be marked as paid after verification.", Toast.LENGTH_LONG).show()
        }
    }

    val proofPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        validationError = null
        proofUri = uri
    }
    val cameraLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { captured ->
        if (captured) proofUri = cameraUri
    }

    Scaffold(
        modifier = Modifier.fillMaxSize().imePadding(),
        topBar = {
            TopAppBar(
                title = { Text("Pay Maintenance", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Back") }
                },
                actions = {
                    Row(
                        modifier = Modifier.padding(end = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Filled.Security, contentDescription = null, tint = SuccessGreen, modifier = Modifier.size(20.dp))
                        Text("Secure Payment", color = SuccessGreen, style = MaterialTheme.typography.labelLarge)
                    }
                }
            )
        }
    ) { padding ->
        if (state.isLoading && bill == null) {
            Column(modifier = Modifier.padding(padding).padding(16.dp)) {
                com.example.application.ui.components.SkeletonSummaryCard(modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(16.dp))
                repeat(4) {
                    com.example.application.ui.components.SkeletonRow(height = 64.dp, modifier = Modifier.fillMaxWidth())
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
            return@Scaffold
        }
        if (bill == null) {
            RetryState(
                message = "The selected maintenance bill could not be loaded. Try refreshing.",
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                onRetry = { viewModel.load(refresh = true) }
            )
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFF7F9FC))
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item { PaymentSummaryCard(bill) }
            state.message?.let { item { PaymentSubmittedCard() } }
            if (bill.hasActivePaymentSubmission()) {
                item { ExistingPaymentStatusCard(bill) }
            } else {
                item { PaymentNoticeCard() }
                item {
                    UpiPaymentCard(
                        paymentSettings = paymentSettings,
                        onDownload = { saveQrToGallery(context, paymentSettings?.paymentQrImage) },
                        onCopy = {
                            val upiId = paymentSettings.displayUpiId()
                            if (upiId.isBlank()) Toast.makeText(context, "No UPI ID configured by admin.", Toast.LENGTH_LONG).show()
                            else copyText(context, "UPI ID", upiId)
                        }
                    )
                }
                item {
                    UploadPaymentCard(
                        proofUri = proofUri,
                        transactionId = transactionId,
                        amount = amount,
                        note = note,
                        validationError = validationError ?: state.error,
                        isSubmitting = state.submitting,
                        onUploadClick = { proofPicker.launch("image/*") },
                        onCameraClick = {
                            createPaymentCameraUri(context)?.let { uri ->
                                cameraUri = uri
                                cameraLauncher.launch(uri)
                            }
                        },
                        onTransactionChange = { transactionId = it },
                        onNoteChange = { note = it },
                        onSubmit = {
                            validationError = validatePaymentProof(context, bill, bill.expectedPayableAmount(), amount, transactionId, proofUri)
                            if (validationError == null) {
                                val screenshotData = proofUri?.let { uri -> uriToBase64DataUrl(context, uri) }
                                if (screenshotData == null) {
                                    validationError = "Unable to read selected screenshot. Please choose another image."
                                } else {
                                    viewModel.submitPayment(
                                        billId = bill.id.orEmpty(),
                                        method = "UPI",
                                        transactionId = transactionId.trim(),
                                        amount = amount.trim(),
                                        screenshotUrl = screenshotData,
                                        paymentDate = null,
                                        note = note.trim()
                                    )
                                }
                            }
                        }
                    )
                }
            }
            item {
                Button(
                    onClick = onViewPaymentHistory,
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Icon(Icons.Filled.ReceiptLong, contentDescription = "Receipt")
                    Spacer(Modifier.size(10.dp))
                    Text("View Payment History", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun PaymentSummaryCard(bill: MaintenanceBillDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(bill.displayTitle(), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
                bill.flatType?.let { ft ->
                    Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFEFF6FF)) {
                        Text(ft, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), color = SocietyBlue40, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                    }
                }
            }

            HorizontalDivider(color = Color(0xFFF1F5F9))

            // Breakdown Rows
            val base = bill.baseAmount?.toDoubleOrNull() ?: bill.amount?.toDoubleOrNull() ?: 0.0
            val prev = bill.previousDue?.toDoubleOrNull() ?: bill.originalAmount?.toDoubleOrNull()?.let { (it - base).coerceAtLeast(0.0) } ?: 0.0
            val penalty = bill.penaltyAmount?.toDoubleOrNull() ?: bill.lateFee?.toDoubleOrNull() ?: 0.0
            val other = bill.otherCharges?.toDoubleOrNull() ?: 0.0
            val advanceAdj = bill.advanceAdjusted?.toDoubleOrNull() ?: 0.0
            val total = bill.expectedPayableAmount()

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Base Maintenance", color = Muted, style = MaterialTheme.typography.bodyMedium)
                Text(DashboardFormatters.money(base), color = Ink, fontWeight = FontWeight.Medium)
            }

            if (prev > 0) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Previous Dues", color = Color(0xFFD97706), style = MaterialTheme.typography.bodyMedium)
                    Text("+${DashboardFormatters.money(prev)}", color = Color(0xFFD97706), fontWeight = FontWeight.Medium)
                }
            }

            if (penalty > 0) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Penalty / Late Fee", color = Color(0xFFDC2626), style = MaterialTheme.typography.bodyMedium)
                    Text("+${DashboardFormatters.money(penalty)}", color = Color(0xFFDC2626), fontWeight = FontWeight.Medium)
                }
            }

            if (other > 0) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Other Charges", color = Ink, style = MaterialTheme.typography.bodyMedium)
                    Text("+${DashboardFormatters.money(other)}", color = Ink, fontWeight = FontWeight.Medium)
                }
            }

            if (advanceAdj > 0) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Advance Adjusted", color = Color(0xFF16A34A), style = MaterialTheme.typography.bodyMedium)
                    Text("-${DashboardFormatters.money(advanceAdj)}", color = Color(0xFF16A34A), fontWeight = FontWeight.Bold)
                }
            }

            HorizontalDivider(color = Color(0xFFF1F5F9))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text("Due Date", color = Muted, style = MaterialTheme.typography.labelMedium)
                    Text(DashboardFormatters.date(bill.dueDate ?: bill.maintenanceDueDate), color = Ink, fontWeight = FontWeight.SemiBold)
                }
                Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text("Total Payable", color = Muted, style = MaterialTheme.typography.labelMedium)
                    Text(DashboardFormatters.money(total), color = PaymentBlue, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                }
            }

            bill.advanceBalance?.toDoubleOrNull()?.takeIf { it > 0 }?.let { advBal ->
                Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp), color = Color(0xFFF0FDF4)) {
                    Row(modifier = Modifier.padding(10.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Advance Credit Balance", color = Color(0xFF166534), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                        Text(DashboardFormatters.money(advBal), color = Color(0xFF166534), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun PaymentNoticeCard() {
    Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), color = Color(0xFFFFF5D9)) {
        Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(50), color = Color(0xFFFFE6A3)) {
                Text("i", modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), color = Color(0xFF8A6500), fontWeight = FontWeight.Bold)
            }
            Text("Please make the payment using UPI and upload the screenshot for verification.", color = Ink)
        }
    }
}

@Composable
private fun UpiPaymentCard(paymentSettings: PaymentSettingsDto?, onDownload: () -> Unit, onCopy: () -> Unit) {
    val upiId = paymentSettings.displayUpiId()
    val qrImage = paymentSettings?.paymentQrImage?.ifBlank { null }
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Pay Using UPI", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Ink)
            Text("Scan QR code using any UPI app", color = Muted)
            Row(modifier = Modifier.fillMaxWidth()) {
                Box(
                    modifier = Modifier
                        .weight(0.42f)
                        .height(156.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .border(1.dp, Color(0xFFE3E8F1), RoundedCornerShape(16.dp))
                        .background(Color.White),
                    contentAlignment = Alignment.Center
                ) {
                    if (qrImage != null) {
                        AsyncImage(
                            model = fullMediaUrl(qrImage),
                            contentDescription = "Society QR code",
                            modifier = Modifier.fillMaxSize().padding(10.dp),
                            contentScale = ContentScale.Fit
                        )
                    } else Text("No QR configured", color = Muted, fontWeight = FontWeight.Bold)
                }
                Column(
                    modifier = Modifier
                        .weight(0.58f)
                        .height(156.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .border(1.dp, Color(0xFFE3E8F1), RoundedCornerShape(16.dp))
                        .padding(14.dp),
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Society UPI ID", color = Muted)
                        Text(upiId, color = Ink, fontWeight = FontWeight.Bold)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        TextButton(onClick = onCopy) {
                            Icon(Icons.Filled.ContentCopy, contentDescription = "Copy")
                            Text("Copy")
                        }
                        TextButton(onClick = onDownload) {
                            Icon(Icons.Filled.Download, contentDescription = "Download")
                            Text("QR")
                        }
                    }
                }
            }
            Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), color = Color(0xFFEFF6FF)) {
                Row(modifier = Modifier.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Smartphone, contentDescription = null, tint = PaymentBlue)
                    Text("Open any UPI app and scan this QR code to pay. Google Pay, PhonePe, Paytm, BHIM, etc.", color = Muted)
                }
            }
        }
    }
}

@Composable
private fun UploadPaymentCard(
    proofUri: Uri?,
    transactionId: String,
    amount: String,
    note: String,
    validationError: String?,
    isSubmitting: Boolean,
    onUploadClick: () -> Unit,
    onCameraClick: () -> Unit,
    onTransactionChange: (String) -> Unit,
    onNoteChange: (String) -> Unit,
    onSubmit: () -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Upload Payment Screenshot", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Ink)
            Text("After successful payment, upload the screenshot for admin verification.", color = Muted)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(if (proofUri == null) 150.dp else 210.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .border(1.dp, Color(0xFF9AB8F3), RoundedCornerShape(16.dp))
                    .clickable(onClick = onUploadClick),
                contentAlignment = Alignment.Center
            ) {
                if (proofUri == null) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Filled.UploadFile, contentDescription = "Upload", tint = PaymentBlue, modifier = Modifier.size(42.dp))
                        Text("Tap to upload screenshot", color = PaymentBlue, fontWeight = FontWeight.Bold)
                        Text("JPG, PNG up to 5MB", color = Muted)
                    }
                } else {
                    AsyncImage(model = proofUri, contentDescription = "Selected payment screenshot", modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                }
            }
            TextButton(onClick = onCameraClick, modifier = Modifier.fillMaxWidth()) {
                Text("Take picture with camera")
            }
            OutlinedTextField(value = transactionId, onValueChange = onTransactionChange, modifier = Modifier.fillMaxWidth(), label = { Text("UPI transaction ID / UTR number") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text))
            OutlinedTextField(value = amount, onValueChange = {}, modifier = Modifier.fillMaxWidth(), label = { Text("Amount") }, enabled = false, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
            OutlinedTextField(value = note, onValueChange = onNoteChange, modifier = Modifier.fillMaxWidth(), label = { Text("Remarks optional") })
            validationError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), color = Color(0xFFEAF8EF)) {
                Row(modifier = Modifier.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Security, contentDescription = null, tint = SuccessGreen)
                    Text("Your payment will be verified by the admin. You will receive a notification once it's confirmed.", color = Ink)
                }
            }
            Button(onClick = onSubmit, modifier = Modifier.fillMaxWidth().height(52.dp), enabled = !isSubmitting, shape = RoundedCornerShape(16.dp)) {
                Icon(Icons.Filled.Payments, contentDescription = "Payment")
                Spacer(Modifier.size(8.dp))
                Text(if (isSubmitting) "Submitting..." else "Submit Payment for Verification", fontWeight = FontWeight.Bold)
            }
        }
    }
}



private fun validatePaymentProof(context: Context, bill: MaintenanceBillDto, expectedAmount: BigDecimal, amount: String, txn: String, proofUri: Uri?): String? {
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

@Composable
private fun PaymentSubmittedCard() {
    Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), color = Color(0xFFFFF5D9)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Verification Pending", color = Color(0xFFE58A00), fontWeight = FontWeight.Bold)
            Text("Your payment has been submitted and sent to the admin for approval. It will be marked as paid after verification.", color = Ink)
        }
    }
}

@Composable
private fun ExistingPaymentStatusCard(bill: MaintenanceBillDto) {
    Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), color = Color(0xFFFFF5D9)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Verification Pending", color = Color(0xFFE58A00), fontWeight = FontWeight.Bold)
            Text("Your payment proof is already submitted. Admin approval is required before this bill is marked paid.", color = Ink)
            bill.transactionId?.takeIf { it.isNotBlank() }?.let { Text("UTR / Reference: $it", color = Muted) }
            bill.paymentDate?.takeIf { it.isNotBlank() }?.let { Text("Submitted date: ${DashboardFormatters.date(it)}", color = Muted) }
            bill.screenshotUrl?.takeIf { it.isNotBlank() }?.let {
                AsyncImage(
                    model = fullMediaUrl(it),
                    contentDescription = "Uploaded payment screenshot",
                    modifier = Modifier.fillMaxWidth().height(180.dp).clip(RoundedCornerShape(16.dp)),
                    contentScale = ContentScale.Crop
                )
            }
        }
    }
}

private fun createPaymentCameraUri(context: Context): Uri? = runCatching {
    val file = File.createTempFile("payment-camera-", ".jpg", context.cacheDir)
    FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
}.getOrNull()

private fun copyText(context: Context, label: String, value: String) {
    if (value.isBlank()) return
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText(label, value))
    Toast.makeText(context, "$label copied", Toast.LENGTH_SHORT).show()
}

private fun saveQrToGallery(context: Context, qrImage: String?) {
    if (qrImage.isNullOrBlank()) {
        Toast.makeText(context, "No QR code configured by admin.", Toast.LENGTH_LONG).show()
        return
    }
    val resolved = fullMediaUrl(qrImage).orEmpty()
    if (resolved.startsWith("http", ignoreCase = true)) {
        runCatching {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(resolved)))
        }.onFailure {
            Toast.makeText(context, "Unable to open QR image.", Toast.LENGTH_LONG).show()
        }
        return
    }
    if (!resolved.startsWith("data:image/", ignoreCase = true)) {
        Toast.makeText(context, "QR image is not downloadable on this device.", Toast.LENGTH_LONG).show()
        return
    }
    runCatching {
        val base64 = resolved.substringAfter("base64,", missingDelimiterValue = "")
        if (base64.isBlank()) error("Invalid QR image")
        val bytes = Base64.decode(base64, Base64.DEFAULT)
        val resolver = context.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, "my_payment_qr.png")
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/Society Management")
            put(MediaStore.Images.Media.IS_PENDING, 1)
        }
        val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: error("Unable to create image file")
        resolver.openOutputStream(uri)?.use { output ->
            output.write(bytes)
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

private fun MaintenanceBillDto.displayTitle(): String {
    val monthLabel = listOfNotNull(month?.takeIf { it.isNotBlank() }, year?.takeIf { it.isNotBlank() }).joinToString(" ")
    return if (monthLabel.isBlank()) title ?: "Maintenance" else "${title ?: "Maintenance"} - $monthLabel"
}

private fun MaintenanceBillDto.expectedPayableAmount(): BigDecimal {
    return (remainingDue ?: currentDue ?: remainingAmount ?: totalAmount ?: amount).toMoneyDecimal()
}

private fun String?.toMoneyDecimal(): BigDecimal {
    return this?.toBigDecimalOrNull() ?: BigDecimal.ZERO
}

private fun PaymentSettingsDto?.displayUpiId(): String {
    return this?.paymentUpiId?.trim().orEmpty()
}

private fun MaintenanceBillDto.hasActivePaymentSubmission(): Boolean {
    val normalized = (latestPaymentStatus ?: paymentStatus ?: status).orEmpty().trim().replace("_", " ").lowercase()
    return normalized in setOf("pending verification", "under review", "payment proof submitted", "needs clarification")
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
    if (url.startsWith("http", ignoreCase = true) || url.startsWith("content:", ignoreCase = true) || url.startsWith("data:", ignoreCase = true)) return url
    return BuildConfig.BASE_URL.trimEnd('/') + "/" + url.trimStart('/')
}
