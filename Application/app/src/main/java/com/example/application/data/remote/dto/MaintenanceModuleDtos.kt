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
    val year: Int
)

data class GenerateBillsResultDto(
    val billsGenerated: Int?
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
    val title: String?,
    val month: Int?,
    val year: Int?,
    val dueDate: String?,
    val amount: String?,
    val status: String?
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
    @SerializedName("transaction_id") val transactionId: String?,
    val amount: String?,
    @SerializedName("payment_status") val paymentStatus: String?,
    @SerializedName("paid_at") val paidAt: String?,
    @SerializedName(value = "screenshot_url", alternate = ["screenshot", "payment_proof"]) val screenshotUrl: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("resident_name") val residentName: String?,
    @SerializedName("flat_no") val flatNo: String?,
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
    @SerializedName("verified_by_name") val verifiedByName: String?,
    @SerializedName("screenshot") val screenshot: String?
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
    val id: String?,
    @SerializedName("bill_id") val billId: String?,
    @SerializedName("resident_id") val residentId: String?,
    @SerializedName("flat_id") val flatId: String?,
    @SerializedName("waiver_type") val waiverType: String?,
    @SerializedName("original_amount") val originalAmount: String?,
    @SerializedName("waiver_amount") val waiverAmount: String?,
    @SerializedName("final_payable_amount") val finalPayableAmount: String?,
    val reason: String?,
    @SerializedName("approval_reference") val approvalReference: String?,
    @SerializedName("approval_date") val approvalDate: String?,
    @SerializedName("admin_note") val adminNote: String?,
    @SerializedName("resident_name") val residentName: String?,
    @SerializedName("flat_no") val flatNo: String?,
    @SerializedName("bill_number") val billNumber: String?,
    @SerializedName("created_at") val createdAt: String?
)

data class ApplyWaiverRequest(
    @SerializedName("waiverAmount") val waiverAmount: String,
    val reason: String,
    @SerializedName("waiverType") val waiverType: String = "Partial waiver",
    @SerializedName("approvalReference") val approvalReference: String? = null,
    @SerializedName("approvalDate") val approvalDate: String? = null,
    @SerializedName("adminNote") val adminNote: String? = null
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
