package com.example.application.ui.screens.resident

import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.provider.MediaStore
import android.util.Base64
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import androidx.compose.foundation.Image
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.example.application.BuildConfig
import com.example.application.R
import com.example.application.data.remote.dto.MaintenanceBillDto
import com.example.application.data.remote.dto.PaymentSettingsDto
import com.example.application.util.DashboardFormatters
import com.example.application.viewmodel.ResidentMaintenanceViewModel
import java.math.BigDecimal
import java.math.RoundingMode
import java.io.File

private val Ink = Color(0xFF071338)
private val Muted = Color(0xFF59647A)
private val PaymentBlue = Color(0xFF0B64E8)
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

    LaunchedEffect(bill?.id, bill?.remainingAmount, bill?.totalAmount) {
        if (bill != null) amount = bill.expectedPayableAmount().toPlainString()
    }

    val proofPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        validationError = null
        proofUri = uri
    }
    val cameraLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { captured ->
        if (captured) proofUri = cameraUri
    }

    Scaffold(
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
        if (bill == null) {
            BillMissingState(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                isLoading = state.isLoading,
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
            item { PaymentNoticeCard() }
            item {
                UpiPaymentCard(
                    paymentSettings = paymentSettings,
                    onDownload = { saveQrToGallery(context) },
                    onCopy = { copyText(context, "UPI ID", paymentSettings.displayUpiId()) }
                )
            }
            item {
                UploadPaymentCard(
                    proofUri = proofUri,
                    transactionId = transactionId,
                    amount = amount,
                    note = note,
                    validationError = validationError,
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
                                Toast.makeText(context, "Payment proof submitted for admin verification.", Toast.LENGTH_LONG).show()
                                onBack()
                            }
                        }
                    }
                )
            }
            item {
                Button(
                    onClick = onViewPaymentHistory,
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Filled.ReceiptLong, contentDescription = null)
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
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text(bill.displayTitle(), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Due Date", color = Muted, style = MaterialTheme.typography.bodyMedium)
                    Text(DashboardFormatters.date(bill.dueDate ?: bill.maintenanceDueDate), color = Ink, fontWeight = FontWeight.SemiBold)
                }
                Box(modifier = Modifier.height(56.dp).padding(horizontal = 12.dp).border(0.5.dp, Color(0xFFD8DEE8)))
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Total Amount", color = Muted, style = MaterialTheme.typography.bodyMedium)
                    Text(DashboardFormatters.money(bill.expectedPayableAmount()), color = PaymentBlue, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun PaymentNoticeCard() {
    Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), color = Color(0xFFFFF5D9)) {
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
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Pay Using UPI", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Ink)
            Text("Scan QR code using any UPI app", color = Muted)
            Row(modifier = Modifier.fillMaxWidth()) {
                Box(
                    modifier = Modifier
                        .weight(0.42f)
                        .height(156.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .border(1.dp, Color(0xFFE3E8F1), RoundedCornerShape(10.dp))
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
                    } else {
                        Image(
                            painter = painterResource(R.drawable.my_payment_qr),
                            contentDescription = "Society QR code",
                            modifier = Modifier.fillMaxSize().padding(10.dp),
                            contentScale = ContentScale.Fit
                        )
                    }
                }
                Column(
                    modifier = Modifier
                        .weight(0.58f)
                        .height(156.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .border(1.dp, Color(0xFFE3E8F1), RoundedCornerShape(10.dp))
                        .padding(14.dp),
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Society UPI ID", color = Muted)
                        Text(upiId, color = Ink, fontWeight = FontWeight.Bold)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        TextButton(onClick = onCopy) {
                            Icon(Icons.Filled.ContentCopy, contentDescription = null)
                            Text("Copy")
                        }
                        TextButton(onClick = onDownload) {
                            Icon(Icons.Filled.Download, contentDescription = null)
                            Text("QR")
                        }
                    }
                }
            }
            Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp), color = Color(0xFFEFF6FF)) {
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
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Upload Payment Screenshot", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Ink)
            Text("After successful payment, upload the screenshot for admin verification.", color = Muted)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(if (proofUri == null) 150.dp else 210.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .border(1.dp, Color(0xFF9AB8F3), RoundedCornerShape(12.dp))
                    .clickable(onClick = onUploadClick),
                contentAlignment = Alignment.Center
            ) {
                if (proofUri == null) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Filled.UploadFile, contentDescription = null, tint = PaymentBlue, modifier = Modifier.size(42.dp))
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
            OutlinedTextField(value = transactionId, onValueChange = onTransactionChange, modifier = Modifier.fillMaxWidth(), label = { Text("UPI transaction ID / UTR number") }, singleLine = true)
            OutlinedTextField(value = amount, onValueChange = {}, modifier = Modifier.fillMaxWidth(), label = { Text("Amount") }, enabled = false, singleLine = true)
            OutlinedTextField(value = note, onValueChange = onNoteChange, modifier = Modifier.fillMaxWidth(), label = { Text("Remarks optional") })
            validationError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp), color = Color(0xFFEAF8EF)) {
                Row(modifier = Modifier.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Security, contentDescription = null, tint = SuccessGreen)
                    Text("Your payment will be verified by the admin. You will receive a notification once it's confirmed.", color = Ink)
                }
            }
            Button(onClick = onSubmit, modifier = Modifier.fillMaxWidth().height(52.dp), enabled = !isSubmitting, shape = RoundedCornerShape(10.dp)) {
                Icon(Icons.Filled.Payments, contentDescription = null)
                Spacer(Modifier.size(8.dp))
                Text(if (isSubmitting) "Submitting..." else "Submit Payment for Verification", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun BillMissingState(modifier: Modifier, isLoading: Boolean, onRetry: () -> Unit) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (!isLoading) {
                    Text("Bill not found", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("The selected maintenance bill could not be loaded. Try refreshing.")
                    Button(onClick = onRetry) { Text("Retry") }
                }
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
    return "data:$mime;base64,${Base64.encodeToString(bytes, Base64.NO_WRAP)}"
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

private fun saveQrToGallery(context: Context) {
    runCatching {
        val resolver = context.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, "my_payment_qr.png")
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/Society Management")
            put(MediaStore.Images.Media.IS_PENDING, 1)
        }
        val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: error("Unable to create image file")
        resolver.openOutputStream(uri)?.use { output ->
            context.resources.openRawResource(R.drawable.my_payment_qr).use { input -> input.copyTo(output) }
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
    return (remainingAmount ?: totalAmount ?: amount).toMoneyDecimal()
}

private fun String?.toMoneyDecimal(): BigDecimal {
    return this?.toBigDecimalOrNull() ?: BigDecimal.ZERO
}

private fun PaymentSettingsDto?.displayUpiId(): String {
    return this?.paymentUpiId?.ifBlank { null } ?: "8999823244@upi"
}

private fun fullMediaUrl(path: String?): String? {
    if (path.isNullOrBlank()) return null
    if (path.startsWith("http", ignoreCase = true) || path.startsWith("content:", ignoreCase = true) || path.startsWith("data:", ignoreCase = true)) return path
    return BuildConfig.BASE_URL.trimEnd('/') + "/" + path.trimStart('/')
}
