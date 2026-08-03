const fs = require('fs');

const file = 'app/src/main/java/com/example/application/ui/screens/maintenance/MaintenanceScreens.kt';
let code = fs.readFileSync(file, 'utf8');

// Replace PaymentVerificationSection
const sectionRegex = /@Composable\s+private fun PaymentVerificationSection\([\s\S]*?(?=@Composable\s+private fun PaymentVerificationCard)/;
const newSection = `@Composable
private fun PaymentVerificationSection(
    verifications: List<MaintenancePaymentVerificationDto>,
    query: String,
    viewModel: AdminMaintenanceViewModel
) {
    val context = LocalContext.current
    var selectedPaymentIds by remember { mutableStateOf(setOf<String>()) }
    var screenshotPayment by remember { mutableStateOf<MaintenancePaymentVerificationDto?>(null) }
    var rejectPayment by remember { mutableStateOf<MaintenancePaymentVerificationDto?>(null) }
    var clarificationPayment by remember { mutableStateOf<MaintenancePaymentVerificationDto?>(null) }
    var bulkReject by remember { mutableStateOf(false) }

    val visibleVerifications = remember(verifications, query) {
        verifications.filter { v ->
            val q = query.lowercase()
            q.isBlank() || listOf(v.residentName, v.flatNumber, v.transactionReference, v.billingMonth?.toString(), v.billingYear?.toString())
                .any { it?.lowercase()?.contains(q) == true }
        }
    }
    
    val pendingVerifications = visibleVerifications.filter { 
        val status = it.verificationStatus?.trim()?.replace("-", "_")?.replace(" ", "_")?.uppercase()
        status == "PENDING_REVIEW" || status == "NEEDS_CLARIFICATION" || status == "PENDING"
    }
    val selectedPending = pendingVerifications.filter { it.submissionId in selectedPaymentIds }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("Payment Verification", "Review resident payment submissions") {
            SearchAndFilter(query, viewModel::setQuery, "Filter", {}) 
            
            if (pendingVerifications.isNotEmpty()) {
                MaintenanceActions {
                    TextButton(onClick = {
                        selectedPaymentIds = if (selectedPending.size == pendingVerifications.size) emptySet() else pendingVerifications.mapNotNull { it.submissionId }.toSet()
                    }) { Text(if (selectedPending.size == pendingVerifications.size) "Clear Selection" else "Select Pending") }
                    Button(
                        onClick = {
                            selectedPending.forEach { v -> v.submissionId?.let { viewModel.updatePayment(it, "Paid") } }
                            selectedPaymentIds = emptySet()
                        },
                        enabled = selectedPending.isNotEmpty()
                    ) { Text("Approve Selected (\${selectedPending.size})") }
                    Button(onClick = { bulkReject = true }, enabled = selectedPending.isNotEmpty()) { Text("Reject Selected") }
                }
            }
        }
        
        if (verifications.isEmpty()) {
            EmptyState("No matching records found", "There are no payment submissions in the database.")
        } else if (visibleVerifications.isEmpty()) {
            EmptyState("No matching records found", "No payments match your search query.")
        } else {
            visibleVerifications.forEach { v ->
                PaymentVerificationCard(
                    verification = v,
                    selected = v.submissionId in selectedPaymentIds,
                    onSelectToggle = {
                        v.submissionId?.let { id ->
                            selectedPaymentIds = if (id in selectedPaymentIds) selectedPaymentIds - id else selectedPaymentIds + id
                        }
                    },
                    onOpenScreenshot = { screenshotPayment = v },
                    onApprove = { v.submissionId?.let { viewModel.updatePayment(it, "Paid") } },
                    onReject = { rejectPayment = v },
                    onClarify = { clarificationPayment = v }
                )
            }
        }
    }

    screenshotPayment?.let { v ->
        Dialog(onDismissRequest = { screenshotPayment = null }) {
            Card {
                Column {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Payment Proof", modifier = Modifier.padding(16.dp), style = MaterialTheme.typography.titleMedium)
                        IconButton(onClick = { screenshotPayment = null }) { Icon(Icons.Default.Close, "Close") }
                    }
                    if (!v.screenshotUrl.isNullOrBlank()) {
                        AsyncImage(
                            model = fullMediaUrl(v.screenshotUrl),
                            contentDescription = "Proof",
                            modifier = Modifier.fillMaxWidth().height(400.dp),
                            contentScale = ContentScale.Fit
                        )
                    } else {
                        Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                            Text("No image available")
                        }
                    }
                }
            }
        }
    }

    rejectPayment?.let { v ->
        PaymentRejectDialog(onDismiss = { rejectPayment = null }, onConfirm = { reason ->
            v.submissionId?.let { viewModel.rejectPayment(it, reason) }
            rejectPayment = null
        })
    }

    clarificationPayment?.let { v ->
        PaymentClarificationDialog(onDismiss = { clarificationPayment = null }, onConfirm = { reason ->
            v.submissionId?.let { viewModel.requestClarification(it, reason) }
            clarificationPayment = null
        })
    }
}

`;

// Replace PaymentVerificationCard
const cardRegex = /@Composable\s+private fun PaymentVerificationCard\([\s\S]*?(?=@Composable\s+private fun PaymentRejectDialog)/;
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
                    Text("\${verification.residentName ?: "Unknown"} • Flat \${verification.flatNumber ?: "--"}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text("\${verification.title ?: "Maintenance"} • \${monthName(verification.billingMonth?.toString())} \${verification.billingYear ?: ""}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (isPending) {
                    Checkbox(checked = selected, onCheckedChange = { onSelectToggle() }, modifier = Modifier.size(24.dp))
                }
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                InfoItem("Maint Amount", "₹\${verification.billAmount ?: "0"}")
                InfoItem("Penalty", "₹\${verification.penaltyAmount ?: "0"}")
                InfoItem("Total Bill", "₹\${totAmt.toInt()}")
            }
            
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
            
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                InfoItem("Submitted", "₹\${verification.submittedAmount ?: "0"}")
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

fs.writeFileSync(file, code);
console.log("Updated MaintenanceScreens.kt successfully!");
