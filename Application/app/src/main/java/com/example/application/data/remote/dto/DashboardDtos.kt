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
    @SerializedName("paid_at") val paidAt: String?
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
    @SerializedName("created_at") val createdAt: String?
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
