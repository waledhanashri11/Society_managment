const fs = require('fs');
const file = 'Application/app/src/main/java/com/example/application/ui/screens/maintenance/MaintenanceScreens.kt';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /PaymentVerificationSection\(data\.payments, state\.query, state\.filter, viewModel\)/g,
  'PaymentVerificationSection(data.verifications, state.query, state.verificationFilter, state.billFilter, viewModel)'
);

const patch = `private fun PaymentVerificationSection(
    verifications: List<MaintenancePaymentVerificationDto>,
    query: String,
    verificationFilter: String,
    billFilter: String,
    viewModel: AdminMaintenanceViewModel
) {
    val context = LocalContext.current
    var selectedPaymentIds by remember { mutableStateOf(setOf<String>()) }
    var screenshotPayment by remember { mutableStateOf<MaintenancePaymentVerificationDto?>(null) }
    var rejectPayment by remember { mutableStateOf<MaintenancePaymentVerificationDto?>(null) }
    var clarificationPayment by remember { mutableStateOf<MaintenancePaymentVerificationDto?>(null) }
    var bulkReject by remember { mutableStateOf(false) }

    val visibleVerifications = remember(verifications, query, verificationFilter, billFilter) {
        verifications.filter { v ->
            val vStatus = v.verificationStatus?.trim()?.replace("-", "_")?.replace(" ", "_")?.uppercase() ?: "NO_SUBMISSION"
            val bStatus = v.billStatus?.trim()?.replace("-", "_")?.replace(" ", "_")?.uppercase() ?: "PENDING"
            
            val vFilterOk = verificationFilter == "All" ||
                (verificationFilter == "Pending Review" && vStatus == "PENDING_REVIEW") ||
                (verificationFilter == "Needs Clarification" && vStatus == "NEEDS_CLARIFICATION") ||
                (verificationFilter == "Approved" && vStatus == "APPROVED") ||
                (verificationFilter == "Rejected" && vStatus == "REJECTED") ||
                (verificationFilter == "No Submission" && vStatus == "NO_SUBMISSION")
                
            val bFilterOk = billFilter == "All Bills" ||
                (billFilter == "Pending" && bStatus == "PENDING") ||
                (billFilter == "Partially Paid" && bStatus == "PARTIALLY_PAID") ||
                (billFilter == "Paid" && bStatus == "PAID") ||
                (billFilter == "Overdue" && bStatus == "OVERDUE") ||
                (billFilter == "Written Off" && bStatus == "WRITTEN_OFF")
                
            val q = query.lowercase()
            val queryOk = q.isBlank() || listOf(v.residentName, v.flatNumber, v.transactionReference, v.billingMonth?.toString(), v.billingYear?.toString())
                .any { it?.lowercase()?.contains(q) == true }
                
            vFilterOk && bFilterOk && queryOk
        }
    }
    
    val pendingVerifications = visibleVerifications.filter { 
        val status = it.verificationStatus?.trim()?.replace("-", "_")?.replace(" ", "_")?.uppercase()
        status == "PENDING_REVIEW" || status == "NEEDS_CLARIFICATION" 
    }
    val selectedPending = pendingVerifications.filter { it.submissionId in selectedPaymentIds }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("Payment Verification", "Review resident UPI proofs before marking bills paid") {
            Text("Verification Status:", style = MaterialTheme.typography.labelMedium)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Pending Review", "Needs Clarification", "Approved", "Rejected", "No Submission", "All").forEach { label ->
                    FilterChip(selected = verificationFilter == label, onClick = { viewModel.setVerificationFilter(label) }, label = { Text(label) })
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text("Bill Status:", style = MaterialTheme.typography.labelMedium)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("All Bills", "Pending", "Partially Paid", "Paid", "Overdue", "Written Off").forEach { label ->
                    FilterChip(selected = billFilter == label, onClick = { viewModel.setBillFilter(label) }, label = { Text(label) })
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
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
        
        if (visibleVerifications.isEmpty()) {
            EmptyState("No matching records found", "Try adjusting the verification or bill filters.")
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
        AlertDialog(
            onDismissRequest = { screenshotPayment = null },
            title = { Text("Payment Screenshot") },
            text = {
                PaymentProofImage(
                    image = v.screenshotUrl,
                    contentDescription = "Payment screenshot",
                    modifier = Modifier.fillMaxWidth().height(520.dp).clip(RoundedCornerShape(14.dp)),
                    contentScale = ContentScale.Fit
                )
            },
            confirmButton = { TextButton(onClick = { screenshotPayment = null }) { Text("Close") } }
        )
    }

    rejectPayment?.let { v ->
        var reason by remember(v.submissionId) { mutableStateOf("") }
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
                        v.submissionId?.let { viewModel.updatePayment(it, "Rejected", reason.ifBlank { "Payment proof rejected by admin" }) }
                        rejectPayment = null
                    },
                    enabled = reason.isNotBlank()
                ) { Text("Reject") }
            },
            dismissButton = { TextButton(onClick = { rejectPayment = null }) { Text("Cancel") } }
        )
    }

    clarificationPayment?.let { v ->
        var note by remember(v.submissionId) { mutableStateOf("") }
        AlertDialog(
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
                        v.submissionId?.let { viewModel.updatePayment(it, "Needs Clarification", note.ifBlank { "Please provide clearer payment details." }) }
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
        AlertDialog(
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
                    selectedPending.forEach { v ->
                        v.submissionId?.let { viewModel.updatePayment(it, "Rejected", reason.ifBlank { "Payment proof rejected by admin" }) }
                    }
                    selectedPaymentIds = emptySet()
                    bulkReject = false
                }, enabled = reason.isNotBlank()) { Text("Reject Selected") }
            },
            dismissButton = { TextButton(onClick = { bulkReject = false }) { Text("Cancel") } }
        )
    }
}

@Composable
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
    val isPending = status == "PENDING_REVIEW" || status == "NEEDS_CLARIFICATION"
    
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
                InfoItem("Bill Amount", "₹\${verification.billAmount ?: "0"}")
                InfoItem("Due Date", verification.dueDate?.take(10) ?: "--")
                StatusBadge(verification.billStatus ?: "Pending")
            }
            
            if (status == "NO_SUBMISSION") {
                Text("No payment proof submitted.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error)
            } else {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    InfoItem("Submitted", "₹\${verification.submittedAmount ?: "0"}")
                    InfoItem("Ref/UTR", verification.transactionReference ?: "--")
                    InfoItem("Date", verification.paymentDate?.take(10) ?: "--")
                }
                
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    StatusBadge(verification.verificationStatus ?: "Unknown")
                    Spacer(modifier = Modifier.weight(1f))
                    if (!verification.screenshotUrl.isNullOrBlank()) {
                        TextButton(onClick = onOpenScreenshot) {
                            Icon(Icons.Outlined.Image, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("View Proof")
                        }
                    } else {
                        Text("Proof Image Unavailable", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                    }
                }
                
                if (!verification.adminNote.isNullOrBlank()) {
                    Text("Admin Note: \${verification.adminNote}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                }
                if (!verification.residentNote.isNullOrBlank()) {
                    Text("Resident Note: \${verification.residentNote}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            if (isPending) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = onApprove, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)) {
                        Text("Approve")
                    }
                    OutlinedButton(onClick = onClarify, modifier = Modifier.weight(1f)) {
                        Text("Clarify")
                    }
                    OutlinedButton(onClick = onReject, modifier = Modifier.weight(1f), colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)) {
                        Text("Reject")
                    }
                }
            }
        }
    }
}
`;

const startIndex = content.indexOf('private fun PaymentVerificationSection(');
const lastEnd = content.indexOf('private fun ReceiptPreview(');
let endIndex = -1;
if (lastEnd !== -1) {
    const substr = content.substring(0, lastEnd);
    endIndex = substr.lastIndexOf('@Composable');
}

if (startIndex !== -1 && endIndex !== -1) {
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);
    fs.writeFileSync(file, before + patch + '\n' + after);
    console.log('Replaced correctly!');
} else {
    console.log('Failed to find indices. Start: ' + startIndex + ' End: ' + endIndex);
}
