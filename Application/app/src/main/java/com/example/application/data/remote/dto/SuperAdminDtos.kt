package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class PlatformSummaryDto(
    @SerializedName("total_societies") val totalSocieties: Int = 0,
    @SerializedName("active_societies") val activeSocieties: Int = 0,
    @SerializedName("inactive_societies") val inactiveSocieties: Int = 0,
    @SerializedName("total_residents") val totalResidents: Int = 0,
    @SerializedName("total_flats") val totalFlats: Int = 0
)

data class ManagedSocietyDto(
    val id: String,
    val name: String,
    val code: String,
    @SerializedName("logo_url") val logoUrl: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val pincode: String? = null,
    @SerializedName("registration_number") val registrationNumber: String? = null,
    @SerializedName("contact_phone") val contactPhone: String? = null,
    @SerializedName("contact_email") val contactEmail: String? = null,
    val status: String,
    @SerializedName("resident_count") val residentCount: Int = 0,
    @SerializedName("flat_count") val flatCount: Int = 0,
    @SerializedName("admin_name") val adminName: String? = null,
    @SerializedName("admin_email") val adminEmail: String? = null,
    @SerializedName("admin_phone") val adminPhone: String? = null
)

data class SocietyAdminInput(val name: String, val email: String, val phone: String?, val password: String)
data class CreateSocietyRequest(
    val name: String, val code: String, val address: String?, val city: String?, val state: String?,
    val pincode: String?, val registrationNumber: String?, val contactPhone: String?,
    val contactEmail: String?, val admin: SocietyAdminInput
)
data class CreateSocietyResponse(val id: String, val message: String?)
data class SocietyStatusRequest(val status: String)
