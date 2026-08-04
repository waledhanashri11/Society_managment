package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ApiListResponse<T>(
    val success: Boolean?,
    val message: String?,
    val data: List<T>?
)

data class UserSummaryDto(
    val id: String?,
    val name: String?,
    val email: String?,
    val phone: String?,
    val role: String?,
    val status: String?,
    @SerializedName("flat_id") val flatId: String?,
    @SerializedName("flat_no") val flatNo: String?,
    val wing: String?,
    @SerializedName("floor_no") val floorNo: String?,
    @SerializedName("flat_status") val flatStatus: String?,
    @SerializedName("created_at") val createdAt: String?
)

data class MaintenanceBillDto(
    val id: String? = null,
    val title: String? = null,
    val month: String? = null,
    val year: String? = null,
    val amount: String? = null,
    @SerializedName("penalty_amount") val penaltyAmount: String? = null,
    @SerializedName("late_fee") val lateFee: String? = null,
    @SerializedName("total_amount") val totalAmount: String? = null,
    @SerializedName("paid_amount") val paidAmount: String? = null,
    @SerializedName("write_off_amount") val writeOffAmount: String? = null,
    @SerializedName("maintenance_write_off_amount") val maintenanceWriteOffAmount: String? = null,
    @SerializedName("penalty_write_off_amount") val penaltyWriteOffAmount: String? = null,
    @SerializedName("original_amount") val originalAmount: String? = null,
    @SerializedName("remaining_due") val remainingDue: String? = null,
    @SerializedName("current_due") val currentDue: String? = null,
    @SerializedName("remaining_amount") val remainingAmount: String? = null,
    val status: String? = null,
    @SerializedName("payment_status") val paymentStatus: String? = null,
    @SerializedName("payment_date") val paymentDate: String? = null,
    @SerializedName("due_date") val dueDate: String? = null,
    @SerializedName("maintenance_due_date") val maintenanceDueDate: String? = null,
    @SerializedName("resident_name") val residentName: String? = null,
    @SerializedName("flat_no") val flatNo: String? = null,
    @SerializedName("floor_no") val floorNo: String? = null,
    @SerializedName("payment_id") val paymentId: String? = null,
    @SerializedName("transaction_id") val transactionId: String? = null,
    @SerializedName("payment_method") val paymentMethod: String? = null,
    @SerializedName("latest_payment_status") val latestPaymentStatus: String? = null,
    @SerializedName(value = "screenshot_url", alternate = ["screenshot", "payment_proof"]) val screenshotUrl: String? = null,
    @SerializedName("receipt_number") val receiptNumber: String? = null,
    @SerializedName("verified_at") val verifiedAt: String? = null,
    @SerializedName("rejection_reason") val rejectionReason: String? = null,
    @SerializedName("resident_note") val residentNote: String? = null,
    @SerializedName("paid_at") val paidAt: String? = null,
    @SerializedName("base_amount") val baseAmount: String? = null,
    @SerializedName("previous_due") val previousDue: String? = null,
    @SerializedName("other_charges") val otherCharges: String? = null,
    @SerializedName("advance_adjusted") val advanceAdjusted: String? = null,
    @SerializedName("advance_balance") val advanceBalance: String? = null,
    @SerializedName("flat_type") val flatType: String? = null,
    @SerializedName("flat_type_rate") val flatTypeRate: String? = null,
    @SerializedName("clarification_note") val clarificationNote: String? = null,
    @SerializedName(value = "write_off_reason", alternate = ["writeOffReason", "writeoff_reason"]) val writeOffReason: String? = null,
    @SerializedName(value = "write_off_type", alternate = ["writeOffType", "writeoff_type"]) val writeOffType: String? = null,
    @SerializedName(value = "write_off_remarks", alternate = ["writeOffRemarks"]) val writeOffRemarks: String? = null,
    @SerializedName(value = "is_written_off", alternate = ["isWrittenOff"]) val isWrittenOff: Boolean? = null,
    @SerializedName(value = "gross_amount", alternate = ["grossAmount"]) val grossAmount: String? = null,
    @SerializedName(value = "total_approved_write_off", alternate = ["totalApprovedWriteOff"]) val totalApprovedWriteOff: String? = null,
    @SerializedName(value = "net_bill_amount", alternate = ["netBillAmount"]) val netBillAmount: String? = null,
    @SerializedName(value = "approved_paid_amount", alternate = ["approvedPaidAmount"]) val approvedPaidAmount: String? = null,
    @SerializedName(value = "pending_verification_amount", alternate = ["pendingVerificationAmount"]) val pendingVerificationAmount: String? = null,
    @SerializedName(value = "pending_write_off_amount", alternate = ["pendingWriteOffAmount"]) val pendingWriteOffAmount: String? = null,
    @SerializedName(value = "bill_status", alternate = ["billStatus"]) val billStatus: String? = null
)

data class ComplaintDto(
    val id: String?,
    val title: String?,
    val description: String?,
    val status: String?,
    val reply: String?,
    @SerializedName("user_name") val userName: String?,
    @SerializedName("resident_name") val residentName: String?,
    @SerializedName(value = "image_url", alternate = ["imageUrl", "attachment_url", "attachmentUrl", "photo_url", "photoUrl"])
    val imageUrl: String?,
    @SerializedName(value = "complaint_image_urls", alternate = ["complaintImageUrls", "image_urls", "imageUrls", "images"])
    val complaintImageUrls: List<String>? = null,
    @SerializedName(value = "complaint_images", alternate = ["complaintImages"])
    val complaintImages: List<String>? = null,
    @SerializedName(value = "complaint_image_data", alternate = ["complaintImageData"])
    val complaintImageData: List<String>? = null,
    @SerializedName("created_at") val createdAt: String?
)

data class NoticeDto(
    val id: String?,
    val title: String?,
    val description: String?,
    val priority: String?,
    val status: String? = null,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("has_poll") val hasPoll: Boolean? = null,
    @SerializedName("poll_status") val pollStatus: String? = null,
    val poll: NoticePollDto? = null
)

data class NoticePollDto(
    val id: String?,
    val question: String?,
    @SerializedName("poll_type") val pollType: String?,
    @SerializedName("start_at") val startAt: String?,
    @SerializedName("end_at") val endAt: String?,
    val status: String?,
    @SerializedName("allow_vote_change") val allowVoteChange: Boolean? = null,
    val anonymous: Boolean? = null,
    @SerializedName("show_results_before_end") val showResultsBeforeEnd: Boolean? = null,
    val mandatory: Boolean? = null,
    @SerializedName("my_vote_option_ids") val myVoteOptionIds: List<Int>? = null,
    val options: List<NoticePollOptionDto>? = null,
    val results: NoticePollResultsDto? = null
)

data class NoticePollOptionDto(
    val id: Int?,
    @SerializedName("option_text") val optionText: String?
)

data class NoticePollResultsDto(
    @SerializedName("votes_cast") val votesCast: Int?,
    @SerializedName("total_eligible") val totalEligible: Int?,
    @SerializedName("participation_percent") val participationPercent: Int?,
    @SerializedName("winning_option") val winningOption: String?,
    val options: List<NoticePollResultOptionDto>? = null
)

data class NoticePollResultOptionDto(
    val id: Int?,
    @SerializedName("option_text") val optionText: String?,
    val votes: Int?,
    val percent: Int?
)

data class PaymentDto(
    val id: String?,
    val amount: String?,
    @SerializedName("payment_status") val paymentStatus: String?,
    @SerializedName("paid_at") val paidAt: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("resident_name") val residentName: String?,
    @SerializedName("flat_no") val flatNo: String?,
    @SerializedName("transaction_id") val transactionId: String?
)

fun String?.toMoneyDecimal(): java.math.BigDecimal {
    return try {
        this?.toBigDecimalOrNull() ?: java.math.BigDecimal.ZERO
    } catch (_: Exception) {
        java.math.BigDecimal.ZERO
    }
}

fun MaintenanceBillDto.maintenanceChargeAmount(): java.math.BigDecimal {
    return (baseAmount ?: amount ?: originalAmount ?: totalAmount).toMoneyDecimal()
}

fun MaintenanceBillDto.penaltyChargeAmount(): java.math.BigDecimal {
    return (penaltyAmount ?: lateFee).toMoneyDecimal()
}

fun MaintenanceBillDto.grossBillAmount(): java.math.BigDecimal {
    return grossAmount?.toMoneyDecimal() ?: (maintenanceChargeAmount() + penaltyChargeAmount())
}

fun MaintenanceBillDto.maintenanceWriteOffAmountValue(): java.math.BigDecimal {
    return maintenanceWriteOffAmount.toMoneyDecimal()
}

fun MaintenanceBillDto.penaltyWriteOffAmountValue(): java.math.BigDecimal {
    return penaltyWriteOffAmount.toMoneyDecimal()
}

fun MaintenanceBillDto.totalWriteOffAmountValue(): java.math.BigDecimal {
    totalApprovedWriteOff?.let { return it.toMoneyDecimal() }
    val m = maintenanceWriteOffAmountValue()
    val p = penaltyWriteOffAmountValue()
    return if (m > java.math.BigDecimal.ZERO || p > java.math.BigDecimal.ZERO) m + p else writeOffAmount.toMoneyDecimal()
}

fun MaintenanceBillDto.netBillAmountValue(): java.math.BigDecimal {
    return netBillAmount?.toMoneyDecimal()
        ?: (grossBillAmount() - totalWriteOffAmountValue()).coerceAtLeast(java.math.BigDecimal.ZERO)
}

fun MaintenanceBillDto.approvedPaidAmountValue(): java.math.BigDecimal {
    return (approvedPaidAmount ?: paidAmount).toMoneyDecimal()
}

fun MaintenanceBillDto.netPayableAmount(): java.math.BigDecimal {
    return (remainingAmount ?: remainingDue ?: currentDue)?.toMoneyDecimal()
        ?: (netBillAmountValue() - approvedPaidAmountValue()).coerceAtLeast(java.math.BigDecimal.ZERO)
}
