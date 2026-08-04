package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ApiResponse<T>(
    val success: Boolean?,
    val message: String?,
    val data: T?
)

data class BillDetailsDto(
    val bill: MaintenanceBillDto?,
    val payments: List<MaintenancePaymentDto>?
)

data class MaintenanceDashboardDto(
    val summary: MaintenanceSummaryDto?,
    val trend: List<MaintenanceTrendDto>?,
    val expenseDistribution: List<ExpenseDistributionDto>?,
    val overdueFlats: List<OverdueFlatDto>?
)

data class MaintenanceSummaryDto(
    val collected: String?,
    val pending: String?,
    val overdue: String?,
    val collectionPercentage: Int?,
    val residents: Int?,
    val monthIncome: String?,
    val monthExpense: String?,
    val outstanding: String?
)

data class AdminMaintenanceSummaryDto(
    @SerializedName("total_generated") val totalGenerated: String?,
    @SerializedName("total_collected") val totalCollected: String?,
    @SerializedName("total_outstanding") val totalOutstanding: String?,
    @SerializedName("collection_percentage") val collectionPercentage: Int?,
    @SerializedName("pending_bills") val pendingBills: Int?,
    @SerializedName("overdue_bills") val overdueBills: Int?,
    @SerializedName("verification_pending") val verificationPending: Int?,
    @SerializedName("approved_payments") val approvedPayments: Int?,
    @SerializedName("rejected_payments") val rejectedPayments: Int?,
    @SerializedName("total_penalty_collected") val totalPenaltyCollected: String?,
    @SerializedName("total_waived_amount") val totalWaivedAmount: String?,
    @SerializedName("current_month_collection") val currentMonthCollection: String?,
    @SerializedName("previous_month_collection") val previousMonthCollection: String?,
    @SerializedName("recent_payments") val recentPayments: List<MaintenancePaymentDto>?,
    @SerializedName("top_outstanding_flats") val topOutstandingFlats: List<MaintenanceBillDto>?,
    @SerializedName("overdue_residents") val overdueResidents: List<MaintenanceBillDto>?,
    @SerializedName("monthly_collection_trend") val monthlyCollectionTrend: List<MaintenanceTrendDto>?,
    @SerializedName("payment_method_breakdown") val paymentMethodBreakdown: List<PaymentMethodBreakdownDto>?
)

data class PaymentMethodBreakdownDto(
    val method: String?,
    val count: String?,
    val amount: String?
)

data class MaintenanceTrendDto(
    val month: String?,
    val collected: String?,
    val pending: String?
)

data class ExpenseDistributionDto(
    val name: String?,
    val value: String?
)

data class OverdueFlatDto(
    val flat: String?,
    val resident: String?,
    val amount: String?
)

data class MaintenanceSettingsDto(
    val id: String?,
    val title: String?,
    @SerializedName("fixed_amount") val fixedAmount: String?,
    @SerializedName("due_day") val dueDay: String?,
    @SerializedName("late_fee_type") val lateFeeType: String?,
    @SerializedName("late_fee_value") val lateFeeValue: String?,
    @SerializedName("grace_days") val graceDays: String?
)

data class MaintenanceSettingsRequest(
    val title: String,
    @SerializedName("fixed_amount") val fixedAmount: String,
    @SerializedName("due_day") val dueDay: String,
    @SerializedName("late_fee_type") val lateFeeType: String,
    @SerializedName("late_fee_value") val lateFeeValue: String,
    @SerializedName("grace_days") val graceDays: String
)

data class GenerateBillsRequest(
    val month: Int,
    val year: Int,
    val amount: String? = null,
    val dueDate: String? = null,
    val title: String? = null,
    val notes: String? = null,
    val residentId: String? = null,
    val residentIds: List<String>? = null,
    val flatId: String? = null,
    val flatIds: List<String>? = null,
    val wing: String? = null,
    val building: String? = null,
    val floor: String? = null,
    val flatTypeId: String? = null,
    val penaltyType: String? = null,
    val penaltyValue: String? = null,
    val penaltyGraceDays: String? = null
)

data class GenerateBillsResultDto(
    @SerializedName(value = "generatedCount", alternate = ["billsGenerated"])
    val generatedCount: Int?,
    val skippedCount: Int? = null,
    val duplicateCount: Int? = null,
    val failedCount: Int? = null,
    val failureReasons: List<GenerateBillFailureDto>? = null
)

data class GenerateBillFailureDto(
    val residentId: String? = null,
    val flatId: String? = null,
    val reason: String? = null
)

data class MaintenanceCreateRequest(
    val title: String,
    val month: Int,
    val year: Int,
    val dueDate: String,
    val amount: String,
    val residentId: String?,
    val flatId: String?
)

data class MaintenanceUpdateRequest(
    val title: String? = null,
    val month: Int? = null,
    val year: Int? = null,
    val dueDate: String? = null,
    val amount: String? = null,
    val status: String? = null,
    @SerializedName("custom_reason") val customReason: String? = null
)

data class MarkPaidRequest(
    val paymentMethod: String = "Manual",
    val transactionId: String,
    val remarks: String,
    val paidAmount: String
)

data class ManualPayRequest(
    val paidAmount: String,
    val paymentDate: String
)

data class SubmitPaymentRequest(
    val billId: String,
    val paymentMethod: String,
    val transactionId: String,
    val amount: String,
    val screenshotUrl: String?,
    @SerializedName("screenshot") val screenshot: String? = screenshotUrl,
    val paymentDate: String? = null,
    val note: String? = null
)

data class UpdatePaymentRequest(
    val paymentStatus: String,
    val remarks: String?,
    val rejectionReason: String? = null
)

data class MaintenancePaymentDto(
    val id: String?,
    @SerializedName("bill_id") val billId: String?,
    @SerializedName("payment_method") val paymentMethod: String?,
    @SerializedName(value = "transaction_id", alternate = ["utr_number", "utrNumber"]) val transactionId: String?,
    val amount: String?,
    @SerializedName("payment_status") val paymentStatus: String?,
    @SerializedName("paid_at") val paidAt: String?,
    @SerializedName(value = "screenshot_url", alternate = ["screenshot", "payment_proof", "screenshot_path", "payment_screenshot", "proofUrl"]) val screenshotUrl: String?,
    @SerializedName(value = "screenshot_path", alternate = ["payment_proof", "payment_screenshot"]) val screenshotPath: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("resident_name") val residentName: String?,
    @SerializedName("flat_no") val flatNo: String?,
    @SerializedName("wing") val wing: String? = null,
    @SerializedName("total_amount") val totalAmount: String?,
    @SerializedName("base_amount") val baseAmount: String?,
    @SerializedName("penalty_amount") val penaltyAmount: String?,
    @SerializedName("title") val title: String?,
    @SerializedName("month") val month: String?,
    @SerializedName("year") val year: String?,
    @SerializedName("due_date") val dueDate: String?,
    @SerializedName("resident_note") val residentNote: String?,
    @SerializedName("remarks") val remarks: String?,
    @SerializedName("rejection_reason") val rejectionReason: String?,
    @SerializedName("receipt_number") val receiptNumber: String?,
    @SerializedName("verified_at") val verifiedAt: String?,
    @SerializedName("rejected_at") val rejectedAt: String? = null,
    @SerializedName("verified_by_name") val verifiedByName: String?,
    @SerializedName("screenshot") val screenshot: String?,
    @SerializedName(value = "write_off_amount", alternate = ["writeOffAmount", "writeoff_amount"]) val writeOffAmount: String? = null,
    @SerializedName(value = "write_off_reason", alternate = ["writeOffReason", "writeoff_reason", "reason"]) val writeOffReason: String? = null,
    @SerializedName(value = "write_off_type", alternate = ["writeOffType", "writeoff_type"]) val writeOffType: String? = null,
    @SerializedName(value = "write_off_remarks", alternate = ["writeOffRemarks"]) val writeOffRemarks: String? = null
)

data class MaintenanceCategoryDto(
    val id: String?,
    val name: String?,
    val amount: String?,
    @SerializedName("calculation_type") val calculationType: String?,
    val active: Boolean?
)

data class CategorySaveRequest(
    val name: String,
    val amount: String,
    val calculationType: String,
    val active: Boolean
)

data class ExpenseDto(
    val id: String?,
    @SerializedName("expense_number") val expenseNumber: String?,
    val category: String?,
    val vendor: String?,
    val amount: String?,
    @SerializedName("expense_date") val expenseDate: String?,
    @SerializedName("invoice_url") val invoiceUrl: String?,
    val description: String?,
    @SerializedName("payment_method") val paymentMethod: String?,
    @SerializedName("account_type") val accountType: String? = null,
    val status: String?,
    @SerializedName("created_by") val createdBy: String?
)

data class ExpenseCreateRequest(
    val category: String,
    val vendor: String,
    val amount: String,
    val expenseDate: String,
    val description: String?,
    val paymentMethod: String,
    val status: String = "Paid",
    val invoiceUrl: String? = null
)

data class LateFeeRuleDto(
    val id: String?,
    @SerializedName("grace_period") val gracePeriod: String?,
    @SerializedName("penalty_type") val penaltyType: String?,
    @SerializedName("penalty_amount") val penaltyAmount: String?,
    @SerializedName("maximum_late_fee") val maximumLateFee: String?,
    val active: Boolean?
)

data class LateFeeRuleRequest(
    val gracePeriod: String,
    val penaltyType: String,
    val penaltyAmount: String,
    val maximumLateFee: String,
    val active: Boolean = true
)

data class MaintenanceDisputeDto(
    val id: String?,
    @SerializedName("bill_id") val billId: String?,
    @SerializedName("resident_id") val residentId: String?,
    val subject: String?,
    val description: String?,
    val status: String?,
    @SerializedName("admin_reply") val adminReply: String?,
    @SerializedName("resident_name") val residentName: String?,
    @SerializedName("flat_no") val flatNo: String?,
    @SerializedName("bill_number") val billNumber: String?,
    @SerializedName("created_at") val createdAt: String?
)

data class MaintenanceWaiverDto(
    val id: String? = null,
    @SerializedName("bill_id") val billId: String? = null,
    @SerializedName("resident_id") val residentId: String? = null,
    @SerializedName("flat_id") val flatId: String? = null,
    @SerializedName(value = "type", alternate = ["waiver_type", "writeoff_type", "writeoffType"]) val type: String? = null,
    @SerializedName(value = "waiver_type") val waiverType: String? = null,
    @SerializedName("original_amount") val originalAmount: String? = null,
    @SerializedName(value = "amount", alternate = ["waiver_amount", "writeoff_amount", "writeOffAmount", "write_off_amount"]) val waiverAmount: String? = null,
    @SerializedName(value = "final_payable_amount", alternate = ["final_due", "finalDue"]) val finalPayableAmount: String? = null,
    val reason: String? = null,
    @SerializedName("approval_reference") val approvalReference: String? = null,
    @SerializedName("approval_date") val approvalDate: String? = null,
    @SerializedName("admin_note") val adminNote: String? = null,
    @SerializedName(value = "admin_name", alternate = ["approved_by_name", "admin_name_ref"]) val adminName: String? = null,
    @SerializedName(value = "resident_name", alternate = ["resident", "user_name"]) val residentName: String? = null,
    @SerializedName(value = "flat_no", alternate = ["flatNo", "flat_number"]) val flatNo: String? = null,
    val wing: String? = null,
    val month: Any? = null,
    val year: Any? = null,
    @SerializedName(value = "bill_title", alternate = ["title"]) val billTitle: String? = null,
    @SerializedName(value = "bill_amount", alternate = ["amount"]) val billAmount: String? = null,
    @SerializedName(value = "bill_penalty", alternate = ["penalty_amount", "penalty"]) val billPenalty: String? = null,
    @SerializedName(value = "bill_total", alternate = ["total_amount"]) val billTotal: String? = null,
    @SerializedName(value = "bill_remaining", alternate = ["remaining_amount"]) val billRemaining: String? = null,
    @SerializedName(value = "bill_paid", alternate = ["paid_amount"]) val billPaid: String? = null,
    @SerializedName(value = "bill_number", alternate = ["billNumber"]) val billNumber: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class ApplyWaiverRequest(
    @SerializedName("waiverAmount") val waiverAmount: String,
    val reason: String,
    @SerializedName("waiverType") val waiverType: String = "Partial waiver",
    @SerializedName("approvalReference") val approvalReference: String? = null,
    @SerializedName("approvalDate") val approvalDate: String? = null,
    @SerializedName("adminNote") val adminNote: String? = null
)

data class WriteOffRequest(
    val writeoffType: String,
    val amount: String?,
    val reason: String,
    val remarks: String? = null,
    val maintenanceAmount: String? = null,
    val penaltyAmount: String? = null
)

data class LedgerWriteOffRequest(
    @SerializedName("bill_id") val billId: String,
    @SerializedName("writeoff_type") val writeoffType: String,
    val amount: Double,
    @SerializedName("maintenance_amount") val maintenanceAmount: Double? = null,
    @SerializedName("penalty_amount") val penaltyAmount: Double? = null,
    val reason: String,
    val remarks: String? = null
)

data class DetailedWriteOffRequest(
    val type: String,
    val amount: Double?,
    @SerializedName("maintenance_amount") val maintenanceAmount: Double? = null,
    @SerializedName("penalty_amount") val penaltyAmount: Double? = null,
    val reason: String,
    val remarks: String? = null
)


data class WriteOffResultDto(
    val id: String?,
    val billId: String?,
    val writeoffType: String?,
    val amount: String?,
    val previousDue: String?,
    val finalDue: String?,
    val status: String?
)

data class WriteOffReceiptDto(
    val id: String?,
    @SerializedName("bill_id") val billId: String?,
    @SerializedName("bill_number") val billNumber: String?,
    @SerializedName("resident_name") val residentName: String?,
    @SerializedName("flat_no") val flatNo: String?,
    @SerializedName("wing") val wing: String? = null,
    val month: String?,
    val year: String?,
    @SerializedName("base_maintenance_charge") val baseMaintenanceCharge: String?,
    @SerializedName("late_fee") val lateFee: String?,
    @SerializedName("total_amount") val totalAmount: String?,
    @SerializedName("write_off_amount") val writeOffAmount: String?,
    @SerializedName("remaining_amount") val remainingAmount: String?,
    val reason: String?,
    @SerializedName("approved_by") val approvedBy: String?,
    @SerializedName("approval_date") val approvalDate: String?
)

data class ApplyPenaltyRequest(
    val amount: String,
    val reason: String? = null
)

data class CreateDisputeRequest(
    val billId: String,
    val subject: String,
    val description: String
)

data class PaymentSettingsDto(
    @SerializedName(value = "society_name", alternate = ["societyName"])
    val societyName: String?,
    @SerializedName(value = "payment_qr_image", alternate = ["paymentQrImage"])
    val paymentQrImage: String?,
    @SerializedName(value = "payment_upi_id", alternate = ["paymentUpiId"])
    val paymentUpiId: String?,
    @SerializedName(value = "payment_account_holder_name", alternate = ["paymentAccountHolderName"])
    val paymentAccountHolderName: String?,
    @SerializedName(value = "payment_note", alternate = ["paymentNote"])
    val paymentNote: String?
)


data class MaintenancePaymentVerificationDto(
    @SerializedName(value = "id", alternate = ["submissionId", "submission_id"]) val submissionId: String?,
    @SerializedName(value = "bill_id", alternate = ["billId"]) val billId: String?,
    val title: String?,
    @SerializedName(value = "month", alternate = ["billingMonth", "billing_month"]) val month: Int?,
    @SerializedName(value = "year", alternate = ["billingYear", "billing_year"]) val year: Int?,
    @SerializedName(value = "total_amount", alternate = ["billAmount"]) val billAmount: String?,
    @SerializedName(value = "due_date", alternate = ["dueDate"]) val dueDate: String?,
    @SerializedName(value = "amount", alternate = ["submittedAmount", "submitted_amount", "paidAmount", "paid_amount"]) val amount: String?,
    @SerializedName(value = "payment_method", alternate = ["paymentMethod"]) val paymentMethod: String?,
    @SerializedName(value = "transaction_id", alternate = ["transactionReference", "transaction_reference"]) val transactionReference: String?,
    @SerializedName(value = "utr_number", alternate = ["utrNumber"]) val utrNumber: String?,
    @SerializedName(value = "payment_status", alternate = ["verificationStatus", "verification_status"]) val verificationStatus: String?,
    @SerializedName(value = "paid_at", alternate = ["paymentDate", "payment_date"]) val paymentDate: String?,
    @SerializedName(value = "created_at", alternate = ["submittedAt", "submitted_at"]) val submittedAt: String?,
    @SerializedName(value = "remarks", alternate = ["adminNote", "admin_note"]) val remarks: String?,
    @SerializedName(value = "resident_note", alternate = ["residentNote"]) val residentNote: String?,
    @SerializedName(value = "resident_id", alternate = ["residentId"]) val residentId: String?,
    @SerializedName(value = "resident_name", alternate = ["residentName"]) val residentName: String?,
    @SerializedName(value = "flat_no", alternate = ["flatNumber", "flat_number"]) val flatNumber: String?,
    @SerializedName(value = "bill_number", alternate = ["billNumber"]) val billNumber: String?,
    @SerializedName(value = "has_screenshot", alternate = ["hasScreenshot"]) val hasScreenshot: Int?,
    @SerializedName(value = "screenshot_url", alternate = ["screenshotUrl", "proofUrl"]) val screenshotUrl: String?,
    @SerializedName(value = "screenshot", alternate = ["payment_proof", "payment_screenshot"]) val screenshot: String?,
    @SerializedName(value = "screenshot_path", alternate = ["proofPath", "payment_proof_path", "payment_screenshot_path"]) val screenshotPath: String?,
    @SerializedName("wing") val wing: String?,
    @SerializedName("resident_phone") val residentPhone: String?,
    @SerializedName("resident_email") val residentEmail: String?,
    @SerializedName("verified_at") val verifiedAt: String?,
    @SerializedName("rejected_at") val rejectedAt: String?
) {
    // Compatibility accessors used by existing UI code
    val billingMonth: Int? get() = month
    val billingYear: Int? get() = year
    val submittedAmount: String? get() = amount
    val adminNote: String? get() = remarks
    val penaltyAmount: String? get() = null
}
