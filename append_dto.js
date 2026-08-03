const fs = require('fs');
const file = 'Application/app/src/main/java/com/example/application/data/remote/dto/MaintenanceModuleDtos.kt';
let content = fs.readFileSync(file, 'utf8');
content += `

data class MaintenancePaymentVerificationDto(
    val billId: String?,
    val title: String?,
    val billingMonth: Int?,
    val billingYear: Int?,
    val billAmount: String?,
    val paidAmount: String?,
    val remainingAmount: String?,
    val billStatus: String?,
    val dueDate: String?,
    val submissionId: String?,
    val submittedAmount: String?,
    val transactionReference: String?,
    val paymentDate: String?,
    val verificationStatus: String?,
    val adminNote: String?,
    val residentNote: String?,
    val submittedAt: String?,
    val residentId: String?,
    val residentName: String?,
    val flatNumber: String?,
    val screenshotUrl: String?
)
`;
fs.writeFileSync(file, content);
console.log('Appended MaintenancePaymentVerificationDto to ' + file);
