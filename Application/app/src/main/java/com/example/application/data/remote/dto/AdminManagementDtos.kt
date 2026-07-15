package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class UserSaveRequest(
    val name: String,
    val email: String,
    val phone: String?,
    val password: String? = null,
    val role: String = "resident",
    val status: String = "approved",
    @SerializedName("flat_id") val flatId: String?
)

data class UserStatusRequest(
    val status: String
)

data class FlatSaveRequest(
    @SerializedName("flat_no") val flatNo: String,
    val wing: String?,
    @SerializedName("floor_no") val floorNo: String,
    @SerializedName("owner_id") val ownerId: String?,
    @SerializedName("maintenance_charge") val maintenanceCharge: String
)

data class StaffDto(
    val id: String?,
    val name: String?,
    val role: String?,
    val phone: String?,
    val salary: String?,
    @SerializedName("created_at") val createdAt: String?
)

data class StaffSaveRequest(
    val name: String,
    val role: String,
    val phone: String?,
    val salary: String
)
