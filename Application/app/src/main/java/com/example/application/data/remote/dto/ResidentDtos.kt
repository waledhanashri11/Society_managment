package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class FlatDto(
    val id: String?,
    @SerializedName("flat_no") val flatNo: String?,
    val wing: String?,
    @SerializedName("floor_no") val floorNo: String?,
    @SerializedName("maintenance_charge") val maintenanceCharge: Double?,
    @SerializedName("flat_type_id") val flatTypeId: String? = null,
    @SerializedName("flat_type_name") val flatTypeName: String? = null,
    val status: String?,
    @SerializedName(value = "owner_id", alternate = ["current_resident_id"]) val ownerId: String? = null,
    @SerializedName("owner_name") val ownerName: String? = null,
    @SerializedName("assigned_resident_name") val assignedResidentName: String? = null,
    @SerializedName("owner_email") val ownerEmail: String? = null
)

data class ResidentDashboardResponse(
    val user: ProfileDto?,
    val summary: ResidentDashboardSummaryDto?,
    @SerializedName(value = "currentBill", alternate = ["current_bill"])
    val currentBill: MaintenanceBillDto?,
    @SerializedName("latest_notices") val latestNotices: List<NoticeDto>?,
    @SerializedName("recent_complaints") val recentComplaints: List<ComplaintDto>?
)

data class ResidentDashboardSummaryDto(
    @SerializedName("total_bills") val totalBills: Int?,
    @SerializedName("pending_bills") val pendingBills: Int?,
    @SerializedName("paid_bills") val paidBills: Int?,
    @SerializedName("pending_amount") val pendingAmount: String?,
    @SerializedName("paid_amount") val paidAmount: String?,
    @SerializedName("total_complaints") val totalComplaints: Int?,
    @SerializedName("open_complaints") val openComplaints: Int?,
    @SerializedName("in_progress_complaints") val inProgressComplaints: Int?,
    @SerializedName("resolved_complaints") val resolvedComplaints: Int?
)

data class ProfileDto(
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
    @SerializedName("society_name") val societyName: String?,
    @SerializedName("profile_image") val profileImage: String? = null
)

data class ProfileUpdateRequest(
    val phone: String?
)

data class ProfileUpdateResponse(
    val message: String?,
    val user: UserDto?
)
