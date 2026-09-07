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

data class ResidentImportRowDto(
    val rowNumber: Int = 0,
    val flatNumber: String? = null,
    val residentName: String? = null,
    val email: String? = null,
    val mobileNumber: String? = null,
    val flatType: String? = null,
    val ownershipType: String? = null,
    val occupancyStatus: String? = null,
    val validationResult: String? = null,
    val validationMessage: String? = null
)

data class ResidentImportPreviewDto(
    val batchId: String = "",
    val totalRows: Int = 0,
    val validRows: Int = 0,
    val invalidRows: Int = 0,
    val duplicateRows: Int = 0,
    val rows: List<ResidentImportRowDto> = emptyList()
)

data class ResidentImportConfirmRequest(val batchId: String)
data class ResidentImportResultDto(
    val batchId: String = "",
    val successfullyImported: Int = 0,
    val skipped: Int = 0,
    val failed: Int = 0
)

data class FlatSaveRequest(
    @SerializedName("flat_no") val flatNo: String,
    val wing: String?,
    @SerializedName("floor_no") val floorNo: String,
    @SerializedName("owner_id") val ownerId: String?,
    @SerializedName("maintenance_charge") val maintenanceCharge: String,
    @SerializedName("flat_type_id") val flatTypeId: String? = null
)

data class FlatTypeDto(
    val id: String?,
    val name: String?,
    @SerializedName("default_maintenance_amount") val defaultMaintenanceAmount: String?,
    val description: String?,
    val status: String?,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("updated_at") val updatedAt: String? = null
)

data class FlatTypeSaveRequest(
    val name: String,
    @SerializedName("default_maintenance_amount") val defaultMaintenanceAmount: String,
    val description: String?,
    val status: String = "Active"
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
