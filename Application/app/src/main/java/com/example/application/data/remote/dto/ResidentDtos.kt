package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class FlatDto(
    val id: String?,
    @SerializedName("flat_no") val flatNo: String?,
    val wing: String?,
    @SerializedName("floor_no") val floorNo: String?,
    @SerializedName("maintenance_charge") val maintenanceCharge: Double?,
    val status: String?,
    @SerializedName("owner_id") val ownerId: String? = null,
    @SerializedName("owner_name") val ownerName: String? = null,
    @SerializedName("assigned_resident_name") val assignedResidentName: String? = null,
    @SerializedName("owner_email") val ownerEmail: String? = null
)

data class ResidentDashboardResponse(
    val user: ProfileDto?,
    val summary: Map<String, Any>?,
    val currentBill: Map<String, Any>?
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
