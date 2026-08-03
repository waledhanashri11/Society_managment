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
    val id: String?,
    val title: String?,
    val month: String?,
    val year: String?,
    val amount: String?,
    @SerializedName("penalty_amount") val penaltyAmount: String?,
    @SerializedName("late_fee") val lateFee: String?,
    @SerializedName("total_amount") val totalAmount: String?,
    @SerializedName("paid_amount") val paidAmount: String?,
    @SerializedName("write_off_amount") val writeOffAmount: String?,
    @SerializedName("maintenance_write_off_amount") val maintenanceWriteOffAmount: String?,
    @SerializedName("penalty_write_off_amount") val penaltyWriteOffAmount: String?,
    @SerializedName("original_amount") val originalAmount: String?,
    @SerializedName("remaining_due") val remainingDue: String?,
    @SerializedName("current_due") val currentDue: String?,
    @SerializedName("remaining_amount") val remainingAmount: String?,
    val status: String?,
    @SerializedName("payment_status") val paymentStatus: String?,
    @SerializedName("payment_date") val paymentDate: String?,
    @SerializedName("due_date") val dueDate: String?,
    @SerializedName("maintenance_due_date") val maintenanceDueDate: String?,
    @SerializedName("resident_name") val residentName: String?,
    @SerializedName("flat_no") val flatNo: String?,
    @SerializedName("floor_no") val floorNo: String?,
    @SerializedName("payment_id") val paymentId: String?,
    @SerializedName("transaction_id") val transactionId: String?,
    @SerializedName("payment_method") val paymentMethod: String?,
    @SerializedName("latest_payment_status") val latestPaymentStatus: String?,
    @SerializedName(value = "screenshot_url", alternate = ["screenshot", "payment_proof"]) val screenshotUrl: String?,
    @SerializedName("receipt_number") val receiptNumber: String?,
    @SerializedName("verified_at") val verifiedAt: String?,
    @SerializedName("rejection_reason") val rejectionReason: String?,
    @SerializedName("resident_note") val residentNote: String?,
    @SerializedName("paid_at") val paidAt: String?,
    @SerializedName("base_amount") val baseAmount: String? = null,
    @SerializedName("previous_due") val previousDue: String? = null,
    @SerializedName("other_charges") val otherCharges: String? = null,
    @SerializedName("advance_adjusted") val advanceAdjusted: String? = null,
    @SerializedName("advance_balance") val advanceBalance: String? = null,
    @SerializedName("flat_type") val flatType: String? = null,
    @SerializedName("flat_type_rate") val flatTypeRate: String? = null,
    @SerializedName("clarification_note") val clarificationNote: String? = null
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
