const fs = require('fs');
const file = 'app/src/main/java/com/example/application/ui/screens/maintenance/MaintenanceScreens.kt';
let code = fs.readFileSync(file, 'utf8');

const sectionRegex = /@Composable\s+private fun PaymentVerificationSection\([\s\S]*?(?=@Composable\s+private fun PaymentVerificationCard)/;

const newSection = `@Composable
private fun PaymentVerificationSection(
    verifications: List<MaintenancePaymentVerificationDto>,
    viewModel: AdminMaintenanceViewModel
) {
    val context = LocalContext.current
    var selectedPaymentIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var screenshotPayment by remember { mutableStateOf<MaintenancePaymentVerificationDto?>(null) }
    var rejectPayment by remember { mutableStateOf<MaintenancePaymentVerificationDto?>(null) }
    var clarificationPayment by remember { mutableStateOf<MaintenancePaymentVerificationDto?>(null) }
    var bulkReject by remember { mutableStateOf(false) }

    val pendingVerifications = verifications.filter { 
        val status = it.verificationStatus?.trim()?.replace("-", "_")?.replace(" ", "_")?.uppercase()
        status in setOf("PENDING", "PENDING_REVIEW", "NEEDS_CLARIFICATION", "PAYMENT_PROOF_SUBMITTED", "PENDING_VERIFICATION") 
    }
    val selectedPending = pendingVerifications.filter { it.submissionId in selectedPaymentIds }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("Payment Verification", "Review resident UPI proofs before marking bills paid") {
            if (pendingVerifications.isNotEmpty()) {
                MaintenanceActions {
                    TextButton(onClick = {
                        selectedPaymentIds = if (selectedPending.size == pendingVerifications.size) emptySet() else pendingVerifications.mapNotNull { it.submissionId }.toSet()
                    }) { Text(if (selectedPending.size == pendingVerifications.size) "Clear Selection" else "Select Pending") }
                    Button(
                        onClick = {
                            selectedPending.forEach { payment -> payment.submissionId?.let { viewModel.updatePayment(it, "Paid") } }
                            selectedPaymentIds = emptySet()
                        },
                        enabled = selectedPending.isNotEmpty()
                    ) { Text("Approve Selected (\${selectedPending.size})") }
                    Button(onClick = { bulkReject = true }, enabled = selectedPending.isNotEmpty()) { Text("Reject Selected") }
                }
            }
        }
        if (verifications.isEmpty()) {
            EmptyState("No payment proofs found", "Submitted resident payment screenshots will appear here.")
        } else {
            verifications.forEach { payment ->
                PaymentVerificationCard(
                    verification = payment,
                    selected = payment.submissionId in selectedPaymentIds,
                    onSelectToggle = {
                        payment.submissionId?.let { id ->
                            selectedPaymentIds = if (id in selectedPaymentIds) selectedPaymentIds - id else selectedPaymentIds + id
                        }
                    },
                    onOpenScreenshot = { screenshotPayment = payment },
                    onApprove = { payment.submissionId?.let { viewModel.updatePayment(it, "Paid") } },
                    onReject = { rejectPayment = payment },
                    onClarify = { clarificationPayment = payment }
                )
            }
        }
    }

    screenshotPayment?.let { payment ->
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { screenshotPayment = null },
            title = { Text("Payment Screenshot") },
            text = {
                if (!payment.screenshotUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = fullMediaUrl(payment.screenshotUrl),
                        contentDescription = "Payment screenshot",
                        modifier = Modifier.fillMaxWidth().height(520.dp).clip(RoundedCornerShape(14.dp)),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    Text("No image available")
                }
            },
            confirmButton = { TextButton(onClick = { screenshotPayment = null }) { Text("Close") } }
        )
    }

    rejectPayment?.let { payment ->
        var reason by remember(payment.submissionId) { mutableStateOf("") }
        androidx.compose.material3.AlertDialog(
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
                        payment.submissionId?.let { viewModel.updatePayment(it, "Rejected", reason.ifBlank { "Payment proof rejected by admin" }) }
                        rejectPayment = null
                    },
                    enabled = reason.isNotBlank()
                ) { Text("Reject") }
            },
            dismissButton = { TextButton(onClick = { rejectPayment = null }) { Text("Cancel") } }
        )
    }

    clarificationPayment?.let { payment ->
        var note by remember(payment.submissionId) { mutableStateOf("") }
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { clarificationPayment = null },
            title = { Text("Ask for Clarification") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Use this when the proof may be valid but more information is needed.")
                    BasicAppTextField(note, { note = it }, "Clarification note")
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        payment.submissionId?.let { viewModel.updatePayment(it, "Needs Clarification", note.ifBlank { "Please provide clearer payment details." }) }
                        clarificationPayment = null
                    },
                    enabled = note.isNotBlank()
                ) { Text("Send") }
            },
            dismissButton = { TextButton(onClick = { clarificationPayment = null }) { Text("Cancel") } }
        )
    }

    if (bulkReject) {
        var reason by remember { mutableStateOf("") }
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { bulkReject = false },
            title = { Text("Reject Selected Payments") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("\${selectedPending.size} selected payment proofs will be rejected.")
                    BasicAppTextField(reason, { reason = it }, "Rejection reason")
                }
            },
            confirmButton = {
                Button(onClick = {
                    selectedPending.forEach { payment ->
                        payment.submissionId?.let { viewModel.updatePayment(it, "Rejected", reason.ifBlank { "Payment proof rejected by admin" }) }
                    }
                    selectedPaymentIds = emptySet()
                    bulkReject = false
                }, enabled = reason.isNotBlank()) { Text("Reject Selected") }
            },
            dismissButton = { TextButton(onClick = { bulkReject = false }) { Text("Cancel") } }
        )
    }
}

`;

const cardRegex = /@Composable\s+private fun PaymentVerificationCard\([\s\S]*?(?=@Composable\s+private fun ReceiptPreview)/;
const newCard = `@Composable
private fun PaymentVerificationCard(
    verification: MaintenancePaymentVerificationDto,
    selected: Boolean,
    onSelectToggle: () -> Unit,
    onOpenScreenshot: () -> Unit,
    onApprove: () -> Unit,
    onReject: () -> Unit,
    onClarify: () -> Unit
) {
    val status = verification.verificationStatus?.trim()?.replace("-", "_")?.replace(" ", "_")?.uppercase() ?: "NO_SUBMISSION"
    val isPending = status == "PENDING_REVIEW" || status == "NEEDS_CLARIFICATION" || status == "PENDING"
    
    val maintAmt = verification.billAmount?.toDoubleOrNull() ?: 0.0
    val penAmt = verification.penaltyAmount?.toDoubleOrNull() ?: 0.0
    val totAmt = maintAmt + penAmt
    
    Card(
        modifier = Modifier.fillMaxWidth().clickable { if (isPending) onSelectToggle() },
        colors = CardDefaults.cardColors(containerColor = if (selected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f) else MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("\${verification.residentName ?: "Unknown"} â€¢ Flat \${verification.flatNumber ?: "--"}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("\${verification.title ?: "Maintenance"} â€¢ \${monthName(verification.billingMonth?.toString())} \${verification.billingYear ?: ""}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (isPending) {
                    Checkbox(checked = selected, onCheckedChange = { onSelectToggle() }, modifier = Modifier.size(24.dp))
                }
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                InfoItem("Maint Amount", "â‚¹\${verification.billAmount ?: "0"}")
                InfoItem("Penalty", "â‚¹\${verification.penaltyAmount ?: "0"}")
                InfoItem("Total Bill", "â‚¹\${totAmt.toInt()}")
            }
            
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
            
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                InfoItem("Submitted", "â‚¹\${verification.submittedAmount ?: "0"}")
                InfoItem("Method", verification.paymentMethod ?: "--")
                InfoItem("Ref/UTR", verification.transactionReference ?: "--")
            }
            
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                InfoItem("Payment Date", verification.paymentDate?.take(10) ?: "--")
                InfoItem("Submit Date", verification.submittedAt?.take(10) ?: "--")
            }
            
            Row(verticalAlignment = Alignment.Top, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    StatusBadge(verification.verificationStatus ?: "Unknown")
                    Spacer(modifier = Modifier.height(8.dp))
                    if (!verification.adminNote.isNullOrBlank()) {
                        Text("Admin Note: \${verification.adminNote}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                    }
                    if (!verification.residentNote.isNullOrBlank()) {
                        Text("Resident Note: \${verification.residentNote}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    if (!verification.screenshotUrl.isNullOrBlank()) {
                        AsyncImage(
                            model = fullMediaUrl(verification.screenshotUrl),
                            contentDescription = "Thumbnail",
                            modifier = Modifier.size(60.dp).clickable { onOpenScreenshot() },
                            contentScale = ContentScale.Crop
                        )
                        TextButton(onClick = onOpenScreenshot) {
                            Text("View Proof", style = MaterialTheme.typography.bodySmall)
                        }
                    } else {
                        Text("No Proof", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                    }
                }
            }

            if (isPending) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = onApprove, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)) {
                        Text("Approve")
                    }
                    OutlinedButton(onClick = onReject, modifier = Modifier.weight(1f), colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)) {
                        Text("Reject")
                    }
                }
                TextButton(onClick = onClarify, modifier = Modifier.fillMaxWidth()) {
                    Text("Request Clarification")
                }
            }
        }
    }
}

`;

code = code.replace(sectionRegex, newSection);
code = code.replace(cardRegex, newCard);

const callRegex1 = /PaymentVerificationSection\(data\.payments,\s*state\.query,\s*state\.filter,\s*viewModel\)/g;
code = code.replace(callRegex1, "PaymentVerificationSection(data.verifications, viewModel)");

fs.writeFileSync(file, code);
console.log("Updated correctly!");
