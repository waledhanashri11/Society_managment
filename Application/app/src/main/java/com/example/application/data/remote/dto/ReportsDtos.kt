package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ReportSummaryDto(
    val flat: ReportFlatDto?,
    val totalBills: Int?,
    val totalPaidAmount: String?,
    val totalPendingAmount: String?,
    val totalPenaltyAmount: String?,
    val currentMonthStatus: String?
)

data class ReportFlatDto(
    @SerializedName("flat_no") val flatNo: String?,
    val wing: String?,
    @SerializedName("floor_no") val floorNo: String?
)

data class SocietyReportSummaryDto(
    val totalSocietyCollection: String?,
    val totalSocietyExpenses: String?,
    val netBalance: String?,
    val collectionRate: Int?,
    val paidBillsCount: Int?,
    val pendingBillsCount: Int?,
    val overdueBillsCount: Int?
)

data class ResidentMaintenanceReportDto(
    val id: String?,
    val title: String?,
    val month: String?,
    val year: String?,
    val amount: String?,
    @SerializedName("penalty_amount") val penaltyAmount: String?,
    @SerializedName("total_amount") val totalAmount: String?,
    @SerializedName("paid_amount") val paidAmount: String?,
    @SerializedName("remaining_amount") val remainingAmount: String?,
    @SerializedName("due_date") val dueDate: String?,
    @SerializedName("payment_date") val paymentDate: String?,
    val status: String?,
    @SerializedName("flat_no") val flatNo: String?,
    val wing: String?,
    @SerializedName("floor_no") val floorNo: String?
)

data class ResidentExpenseReportDto(
    val id: String?,
    @SerializedName("expense_number") val expenseNumber: String?,
    @SerializedName("expense_title") val expenseTitle: String?,
    val category: String?,
    val amount: String?,
    val date: String?,
    val description: String?
)

data class MembersMaintenanceReportDto(
    val id: String?,
    val name: String?,
    @SerializedName("flat_no") val flatNo: String?,
    val wing: String?,
    @SerializedName("floor_no") val floorNo: String?,
    @SerializedName("total_bills") val totalBills: Int?,
    @SerializedName("paid_amount") val paidAmount: String?,
    @SerializedName("pending_amount") val pendingAmount: String?,
    @SerializedName("penalty_amount") val penaltyAmount: String?,
    @SerializedName("maintenance_status") val maintenanceStatus: String?
)

data class AdminReportRowDto(
    val month: String?,
    val year: String?,
    val amount: String?,
    @SerializedName("total_bills") val totalBills: String?,
    @SerializedName("paid_bills") val paidBills: String?,
    @SerializedName("pending_bills") val pendingBills: String?,
    @SerializedName("overdue_bills") val overdueBills: String?,
    @SerializedName("total_collection") val totalCollection: String?,
    @SerializedName("pending_collection") val pendingCollection: String?,
    @SerializedName("paid_collection") val paidCollection: String?,
    @SerializedName("resident_name") val residentName: String?,
    @SerializedName("flat_no") val flatNo: String?,
    val status: String?,
    @SerializedName("payment_status") val paymentStatus: String?,
    @SerializedName("total_amount") val totalAmount: String?,
    @SerializedName("paid_amount") val paidAmount: String?,
    @SerializedName("remaining_amount") val remainingAmount: String?,
    @SerializedName("due_date") val dueDate: String?,
    @SerializedName("payment_date") val paymentDate: String?
)

data class ReportFilterState(
    val month: String = "",
    val year: String = java.time.LocalDate.now().year.toString(),
    val status: String = ""
) {
    val activeCount: Int
        get() = listOf(month, year, status).count { it.isNotBlank() }
}

data class FinancialSummaryDto(
    val periodStart: String?, val periodEndExclusive: String?,
    val bankOpening: String?, val cashOpening: String?, val totalOpening: String?,
    val bankIncome: String?, val cashIncome: String?, val totalIncome: String?,
    val bankExpenses: String?, val cashExpenses: String?, val totalExpenses: String?,
    val bankClosing: String?, val cashClosing: String?, val totalClosing: String?,
    val netAmount: String?
)

data class FinancialMonthDto(
    val month: Int?, val year: Int?,
    val bankOpening: String?, val cashOpening: String?, val totalOpening: String?,
    val bankIncome: String?, val cashIncome: String?, val totalIncome: String?,
    val bankExpenses: String?, val cashExpenses: String?, val totalExpenses: String?,
    val bankClosing: String?, val cashClosing: String?, val totalClosing: String?, val netAmount: String?
)

data class FinancialCollectionDto(
    val billsGenerated: Int?, val paid: Int?, val pending: Int?, val verificationPending: Int?,
    val rejected: Int?, val overdue: Int?, val writtenOff: Int?, val paidAmount: String?,
    val pendingAmount: String?, val billedAmount: String?, val writeOffAmount: String?, val collectionRate: String?
)

data class FinancialBreakdownDto(val category: String?, val accountType: String?, val amount: String?)

data class FinancialTransactionDto(
    val transactionDate: String?, val transactionType: String?, val description: String?,
    val amount: String?, val paymentMethod: String?, val referenceNumber: String?,
    val approvalStatus: String?, val approvedBy: String?, val runningBalance: String?
)

data class FlatPaymentReportDto(
    val flatNo: String?, val residentName: String?, val month: Int?, val year: Int?,
    val billAmount: String?, val paidAmount: String?, val pendingAmount: String?, val status: String?,
    val paymentDate: String?, val paymentMethod: String?, val receiptNumber: String?, val verificationStatus: String?
)

data class FinancialReportDto(
    val available: Boolean?, val reason: String?, val financialYear: String?,
    val summary: FinancialSummaryDto?, val months: List<FinancialMonthDto>?,
    val collection: FinancialCollectionDto?, val income: List<FinancialBreakdownDto>?,
    val expenses: List<FinancialBreakdownDto>?,
    val bankTransactions: List<FinancialTransactionDto>?, val cashTransactions: List<FinancialTransactionDto>?,
    val flatPayments: List<FlatPaymentReportDto>?
)
