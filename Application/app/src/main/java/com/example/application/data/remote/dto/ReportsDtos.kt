package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ReportSummaryDto(
    val flat: ReportFlatDto?,
    @SerializedName("total_bills") val totalBills: Int?,
    @SerializedName("total_paid_amount") val totalPaidAmount: String?,
    @SerializedName("total_pending_amount") val totalPendingAmount: String?,
    @SerializedName("total_penalty_amount") val totalPenaltyAmount: String?,
    @SerializedName("current_month_status") val currentMonthStatus: String?
)
data class ReportFlatDto(@SerializedName("flat_no") val flatNo: String?, val wing: String?, @SerializedName("floor_no") val floorNo: String?)
data class SocietyReportSummaryDto(
    @SerializedName("total_society_collection") val totalSocietyCollection: String?,
    @SerializedName("total_society_expenses") val totalSocietyExpenses: String?,
    @SerializedName("net_balance") val netBalance: String?,
    @SerializedName("collection_rate") val collectionRate: Int?,
    @SerializedName("paid_bills_count") val paidBillsCount: Int?,
    @SerializedName("pending_bills_count") val pendingBillsCount: Int?,
    @SerializedName("overdue_bills_count") val overdueBillsCount: Int?
)
data class ResidentMaintenanceReportDto(val id: String?, val title: String?, val month: String?, val year: String?, val amount: String?, @SerializedName("penalty_amount") val penaltyAmount: String?, @SerializedName("total_amount") val totalAmount: String?, @SerializedName("paid_amount") val paidAmount: String?, @SerializedName("remaining_amount") val remainingAmount: String?, @SerializedName("due_date") val dueDate: String?, @SerializedName("payment_date") val paymentDate: String?, val status: String?, @SerializedName("flat_no") val flatNo: String?, val wing: String?, @SerializedName("floor_no") val floorNo: String?)
data class ResidentExpenseReportDto(val id: String?, @SerializedName("expense_number") val expenseNumber: String?, @SerializedName("expense_title") val expenseTitle: String?, val category: String?, val amount: String?, val date: String?, val description: String?)
data class MembersMaintenanceReportDto(val id: String?, val name: String?, @SerializedName("flat_no") val flatNo: String?, val wing: String?, @SerializedName("floor_no") val floorNo: String?, @SerializedName("total_bills") val totalBills: Int?, @SerializedName("paid_amount") val paidAmount: String?, @SerializedName("pending_amount") val pendingAmount: String?, @SerializedName("penalty_amount") val penaltyAmount: String?, @SerializedName("maintenance_status") val maintenanceStatus: String?)
data class AdminReportRowDto(val month: String?, val year: String?, val amount: String?, @SerializedName("total_bills") val totalBills: String?, @SerializedName("paid_bills") val paidBills: String?, @SerializedName("pending_bills") val pendingBills: String?, @SerializedName("overdue_bills") val overdueBills: String?, @SerializedName("total_collection") val totalCollection: String?, @SerializedName("pending_collection") val pendingCollection: String?, @SerializedName("paid_collection") val paidCollection: String?, @SerializedName("resident_name") val residentName: String?, @SerializedName("flat_no") val flatNo: String?, val status: String?, @SerializedName("payment_status") val paymentStatus: String?, @SerializedName("total_amount") val totalAmount: String?, @SerializedName("paid_amount") val paidAmount: String?, @SerializedName("remaining_amount") val remainingAmount: String?, @SerializedName("due_date") val dueDate: String?, @SerializedName("payment_date") val paymentDate: String?)

fun currentFinancialYear(): String {
    val cal = java.util.Calendar.getInstance()
    val m = cal.get(java.util.Calendar.MONTH) + 1
    val y = cal.get(java.util.Calendar.YEAR)
    val start = if (m >= 4) y else y - 1
    return "$start-${start + 1}"
}

data class ReportFilterState(
    val financialYear: String = currentFinancialYear(),
    val month: String = "All",
    val year: String = "All",
    val wing: String = "All",
    val floor: String = "All",
    val flatNo: String = "",
    val resident: String = "",
    val status: String = "All",
    val search: String = ""
) {
    val activeCount: Int get() = listOf(month, year, wing, floor, flatNo, resident, status, search).count { it != "All" && it.isNotBlank() }
    fun cacheKey(): String = "$financialYear-$month-$year-$wing-$floor-$flatNo-$resident-$status-$search"
}

data class FinancialSummaryDto(
    @SerializedName(value = "periodStart", alternate = ["period_start"]) val periodStart: String? = null,
    @SerializedName(value = "periodEndExclusive", alternate = ["period_end_exclusive"]) val periodEndExclusive: String? = null,
    @SerializedName(value = "bankOpening", alternate = ["bank_opening"]) val bankOpening: String? = null,
    @SerializedName(value = "cashOpening", alternate = ["cash_opening"]) val cashOpening: String? = null,
    @SerializedName(value = "totalOpening", alternate = ["total_opening"]) val totalOpening: String? = null,
    @SerializedName(value = "bankIncome", alternate = ["bank_income"]) val bankIncome: String? = null,
    @SerializedName(value = "cashIncome", alternate = ["cash_income"]) val cashIncome: String? = null,
    @SerializedName(value = "totalIncome", alternate = ["total_income"]) val totalIncome: String? = null,
    @SerializedName(value = "bankExpenses", alternate = ["bank_expenses", "bankExpense", "bank_expense"]) val bankExpenses: String? = null,
    @SerializedName(value = "cashExpenses", alternate = ["cash_expenses", "cashExpense", "cash_expense"]) val cashExpenses: String? = null,
    @SerializedName(value = "totalExpenses", alternate = ["total_expenses", "totalExpense", "total_expense"]) val totalExpenses: String? = null,
    @SerializedName(value = "bankClosing", alternate = ["bank_closing"]) val bankClosing: String? = null,
    @SerializedName(value = "cashClosing", alternate = ["cash_closing"]) val cashClosing: String? = null,
    @SerializedName(value = "totalClosing", alternate = ["total_closing"]) val totalClosing: String? = null,
    @SerializedName(value = "netAmount", alternate = ["net_amount"]) val netAmount: String? = null,
    @SerializedName(value = "pendingMaintenance", alternate = ["pending_maintenance"]) val pendingMaintenance: String? = null,
    @SerializedName(value = "collectionPercentage", alternate = ["collection_percentage"]) val collectionPercentage: String? = null
)
data class FinancialMonthDto(
    val month: Any?, val year: Any?, val monthNum: Any? = null,
    @SerializedName(value = "bankOpening", alternate = ["bank_opening"]) val bankOpening: String?,
    @SerializedName(value = "cashOpening", alternate = ["cash_opening"]) val cashOpening: String?,
    @SerializedName(value = "totalOpening", alternate = ["total_opening"]) val totalOpening: String?,
    @SerializedName(value = "bankIncome", alternate = ["bank_income"]) val bankIncome: String?,
    @SerializedName(value = "cashIncome", alternate = ["cash_income"]) val cashIncome: String?,
    @SerializedName(value = "totalIncome", alternate = ["total_income"]) val totalIncome: String?,
    @SerializedName(value = "bankExpenses", alternate = ["bank_expenses", "bankExpense"]) val bankExpenses: String? = null,
    @SerializedName(value = "cashExpenses", alternate = ["cash_expenses", "cashExpense"]) val cashExpenses: String? = null,
    @SerializedName(value = "totalExpenses", alternate = ["total_expenses", "totalExpense"]) val totalExpenses: String? = null,
    @SerializedName(value = "bankClosing", alternate = ["bank_closing"]) val bankClosing: String?,
    @SerializedName(value = "cashClosing", alternate = ["cash_closing"]) val cashClosing: String?,
    @SerializedName(value = "totalClosing", alternate = ["total_closing"]) val totalClosing: String?,
    @SerializedName(value = "netAmount", alternate = ["net_amount"]) val netAmount: String? = null,
    @SerializedName(value = "netSurplus", alternate = ["net_surplus"]) val netSurplus: String? = null,
    @SerializedName(value = "netDeficit", alternate = ["net_deficit"]) val netDeficit: String? = null,
    @SerializedName(value = "pendingMaintenance", alternate = ["pending_maintenance"]) val pendingMaintenance: String? = null
)
data class FinancialCollectionDto(
    @SerializedName(value = "billsGenerated", alternate = ["bills_generated"]) val billsGenerated: Int?,
    val paid: Int?, val pending: Int?,
    @SerializedName(value = "verificationPending", alternate = ["verification_pending"]) val verificationPending: Int?,
    val rejected: Int?, val overdue: Int?,
    @SerializedName(value = "writtenOff", alternate = ["written_off"]) val writtenOff: Int?,
    @SerializedName(value = "paidAmount", alternate = ["paid_amount"]) val paidAmount: String?,
    @SerializedName(value = "pendingAmount", alternate = ["pending_amount"]) val pendingAmount: String?,
    @SerializedName(value = "billedAmount", alternate = ["billed_amount"]) val billedAmount: String?,
    @SerializedName(value = "writeOffAmount", alternate = ["write_off_amount"]) val writeOffAmount: String?,
    @SerializedName(value = "collectionRate", alternate = ["collection_rate"]) val collectionRate: String?
)
data class FinancialBreakdownDto(val category: String?, @SerializedName(value = "accountType", alternate = ["account_type"]) val accountType: String?, val amount: String?)
data class FinancialTransactionDto(
    val id: String? = null, val date: String? = null,
    @SerializedName(value = "transactionDate", alternate = ["transaction_date"]) val transactionDate: String? = null,
    @SerializedName(value = "transactionType", alternate = ["transaction_type"]) val transactionType: String?,
    val description: String?, val amount: String? = null, val income: String? = null, val expense: String? = null,
    @SerializedName(value = "paymentMethod", alternate = ["payment_method"]) val paymentMethod: String? = null,
    @SerializedName(value = "referenceNumber", alternate = ["reference_number"]) val referenceNumber: String? = null,
    val reference: String? = null,
    @SerializedName(value = "approvalStatus", alternate = ["approval_status"]) val approvalStatus: String? = null,
    @SerializedName(value = "approvedBy", alternate = ["approved_by"]) val approvedBy: String? = null,
    @SerializedName(value = "recordedBy", alternate = ["recorded_by"]) val recordedBy: String? = null,
    @SerializedName(value = "runningBalance", alternate = ["running_balance"]) val runningBalance: String?
)
data class FlatPaymentReportDto(
    @SerializedName(value = "billId", alternate = ["bill_id"]) val billId: String? = null,
    @SerializedName(value = "flatId", alternate = ["flat_id"]) val flatId: String? = null,
    @SerializedName(value = "flatNo", alternate = ["flat_no"]) val flatNo: String? = null,
    val wing: String? = null,
    @SerializedName(value = "residentName", alternate = ["resident_name"]) val residentName: String? = null,
    val month: Any? = null,
    @SerializedName(value = "monthNumber", alternate = ["month_number"]) val monthNumber: Any? = null,
    val year: Any? = null,
    @SerializedName(value = "openingOutstanding", alternate = ["opening_outstanding"]) val openingOutstanding: String? = null,
    @SerializedName(value = "billAmount", alternate = ["bill_amount"]) val billAmount: String? = null,
    @SerializedName(value = "penaltyAmount", alternate = ["penalty_amount", "penalty"]) val penaltyAmount: String? = null,
    @SerializedName(value = "writeOffAmount", alternate = ["write_off_amount", "writeoff_amount"]) val writeOffAmount: String? = null,
    @SerializedName(value = "paidAmount", alternate = ["paid_amount"]) val paidAmount: String? = null,
    @SerializedName(value = "pendingAmount", alternate = ["pending_amount"]) val pendingAmount: String? = null,
    @SerializedName(value = "closingOutstanding", alternate = ["closing_outstanding"]) val closingOutstanding: String? = null,
    val status: String? = null,
    @SerializedName(value = "paymentDate", alternate = ["payment_date"]) val paymentDate: String? = null,
    @SerializedName(value = "paymentMethod", alternate = ["payment_method"]) val paymentMethod: String? = null,
    @SerializedName(value = "receiptNumber", alternate = ["receipt_number"]) val receiptNumber: String? = null,
    @SerializedName(value = "verificationStatus", alternate = ["verification_status"]) val verificationStatus: String? = null
)
data class FinancialReportDto(val available: Boolean? = null, val reason: String? = null, val financialYear: String? = null, val month: Int? = null, val year: Int? = null, val summary: FinancialSummaryDto?, val months: List<FinancialMonthDto>? = null, val monthlyBreakdown: List<FinancialMonthDto>? = null, val collection: FinancialCollectionDto? = null, val income: List<FinancialBreakdownDto>? = null, val expenses: List<FinancialBreakdownDto>? = null, val bankTransactions: List<FinancialTransactionDto>? = null, val cashTransactions: List<FinancialTransactionDto>? = null, val flatPayments: List<FlatPaymentReportDto>? = null)

data class AccountLedgerDto(@SerializedName("opening_balance") val openingBalance: String?, @SerializedName("closing_balance") val closingBalance: String?, val ledger: List<FinancialTransactionDto>?)
data class OpeningBalanceRequest(@SerializedName("financial_year") val financialYear: String, @SerializedName("bank_opening") val bankOpening: String, @SerializedName("cash_opening") val cashOpening: String)
data class OpeningBalanceDto(@SerializedName("financial_year") val financialYear: String?, @SerializedName("bank_opening") val bankOpening: String?, @SerializedName("cash_opening") val cashOpening: String?)
data class ResidentIdentityDto(val name: String?, @SerializedName("flat_no") val flatNo: String?, val wing: String?)
data class ResidentAccountSummaryDto(
    @SerializedName("opening_outstanding") val openingOutstanding: String?,
    @SerializedName("bills_generated") val billsGenerated: String?,
    @SerializedName("total_penalty") val totalPenalty: String?,
    @SerializedName("approved_payments") val approvedPayments: String?,
    @SerializedName("approved_write_offs") val approvedWriteOffs: String?,
    @SerializedName("closing_outstanding") val closingOutstanding: String?,
    @SerializedName("verification_pending_count") val verificationPendingCount: Int?,
    @SerializedName("rejected_count") val rejectedCount: Int?
)
data class ResidentAccountBillDto(val id: String?, val month: String?, val year: String?, @SerializedName("bill_amount") val billAmount: String?, @SerializedName("paid_amount") val paidAmount: String?, @SerializedName("pending_amount") val pendingAmount: String?, @SerializedName("write_off_amount") val writeOffAmount: String?, val status: String?, @SerializedName("due_date") val dueDate: String?, @SerializedName("created_at") val createdAt: String?)
data class ResidentAccountPaymentDto(val id: String?, @SerializedName("bill_id") val billId: String?, val amount: String?, @SerializedName("payment_method") val paymentMethod: String?, @SerializedName("payment_status") val paymentStatus: String?, @SerializedName("paid_at") val paidAt: String?)
data class ResidentAccountReportDto(val resident: ResidentIdentityDto?, val summary: ResidentAccountSummaryDto?, val bills: List<ResidentAccountBillDto>?, val payments: List<ResidentAccountPaymentDto>?)
data class TransparencyExpenseDto(val id: String?, val category: String?, val description: String?, val vendor: String?, val amount: String?, @SerializedName("expense_date") val expenseDate: String?, @SerializedName("payment_account") val paymentAccount: String?, val status: String?, @SerializedName("approved_by") val approvedBy: String?)
data class ResidentTransparencyReportDto(@SerializedName("financial_year") val financialYear: String?, val summary: FinancialSummaryDto?, @SerializedName("approved_expenses") val approvedExpenses: List<TransparencyExpenseDto>?, @SerializedName("flat_payments") val flatPayments: List<FlatPaymentReportDto>?)

data class MonthlyMaintenanceReportResponse(
    val success: Boolean?, val count: Int?, val summary: MonthlyCollectionSummaryDto?,
    val data: List<MonthlyMaintenanceRowDto>?, val message: String? = null
)
data class MonthlyCollectionSummaryDto(
    @SerializedName("expected_collection") val expectedCollection: String?,
    @SerializedName("total_collection") val totalCollection: String?,
    @SerializedName("pending_collection") val pendingCollection: String?,
    @SerializedName("overdue_collection") val overdueCollection: String?,
    @SerializedName("advance_collection") val advanceCollection: String?,
    @SerializedName("collection_percentage") val collectionPercentage: String?
)
data class MonthlyMaintenanceRowDto(
    @SerializedName("bill_id") val billId: String?, @SerializedName("resident_id") val residentId: String?,
    @SerializedName("flat_id") val flatId: String?, val month: String?, val year: String?,
    @SerializedName("maintenance_amount") val maintenanceAmount: String?, val penalty: String?,
    @SerializedName("discount_amount") val discountAmount: String?, @SerializedName("write_off_amount") val writeOffAmount: String?,
    @SerializedName("paid_amount") val paidAmount: String?, @SerializedName("advance_amount") val advanceAmount: String?,
    @SerializedName("total_payable") val totalPayable: String?, @SerializedName("outstanding_amount") val outstandingAmount: String?,
    @SerializedName("due_date") val dueDate: String?, @SerializedName("bill_status") val billStatus: String?,
    @SerializedName("payment_date") val paymentDate: String?, @SerializedName("flat_no") val flatNo: String?,
    val wing: String?, @SerializedName("floor_no") val floorNo: String?,
    @SerializedName("resident_name") val residentName: String?, @SerializedName("latest_payment_id") val latestPaymentId: String?,
    @SerializedName("payment_mode") val paymentMode: String?, @SerializedName("transaction_id") val transactionId: String?,
    @SerializedName("payment_verification_status") val paymentVerificationStatus: String?,
    @SerializedName("screenshot_url") val screenshotUrl: String?, @SerializedName("rejection_reason") val rejectionReason: String?,
    @SerializedName("receipt_number") val receiptNumber: String?, @SerializedName("paid_at") val paidAt: String?,
    @SerializedName("calculated_status") val calculatedStatus: String?
)
data class MonthlyStatusCountsDto(val paidFlats: Int?, val pendingFlats: Int?, val verificationPendingFlats: Int?, val overdueFlats: Int?, val partialPaymentFlats: Int?, val writeOffCases: Int?)
data class MonthlyDashboardSummaryDto(
    val totalFlats: Int?, val occupiedFlats: Int?, val expectedMaintenance: String?, val totalCollection: String?,
    val pendingCollection: String?, val overdueCollection: String?, val advanceCollection: String?,
    val collectionPercentage: String?, val counts: MonthlyStatusCountsDto?
)
data class CollectionHistoryDto(val month: Int?, val year: Int?, val expectedCollection: String?, val collectedAmount: String?, val pendingAmount: String?)
data class PaymentModeBreakdownDto(@SerializedName("payment_mode") val paymentMode: String?, @SerializedName("total_amount") val totalAmount: String?, @SerializedName("total_transactions") val totalTransactions: Int?)
data class PaymentModeReportDto(val cashCollection: String?, val bankTransferCollection: String?, val upiCollection: String?, val chequeCollection: String?, val totalCollection: String?, val breakdown: List<PaymentModeBreakdownDto>?)
data class ResidentLedgerRowDto(
    val id: String?, @SerializedName("resident_id") val residentId: String?,
    @SerializedName("transaction_type") val transactionType: String?, val credit: String?, val debit: String?, val balance: String?,
    @SerializedName("reference_id") val referenceId: String?, val notes: String?, @SerializedName("created_at") val createdAt: String?,
    @SerializedName("resident_name") val residentName: String?, @SerializedName("flat_no") val flatNo: String?, val wing: String?
)
data class ResidentLedgerResponse(val success: Boolean?, val data: List<ResidentLedgerRowDto>?, val currentBalance: String?, val message: String? = null)
data class MonthlyReceiptDto(val societyName: String?, val receiptNumber: String?, val residentName: String?, val flatNumber: String?, val maintenanceMonthYear: String?, val amountPaid: String?, val paymentMode: String?, val transactionId: String?, val paymentDate: String?)
