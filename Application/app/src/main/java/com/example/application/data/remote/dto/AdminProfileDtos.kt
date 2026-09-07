package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class AdminProfileDto(
    val adminName: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val societyName: String? = null,
    val address: String? = null,
    val profilePicture: String? = null,
    val society: AdminSocietyProfileDto? = null
)

data class AdminSocietyProfileDto(
    val id: String? = null,
    val name: String? = null,
    val code: String? = null,
    @SerializedName("logo_url") val logoUrl: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val pincode: String? = null,
    @SerializedName("contact_email") val contactEmail: String? = null,
    @SerializedName("contact_phone") val contactPhone: String? = null,
    @SerializedName("registration_number") val registrationNumber: String? = null,
    val status: String? = null
)

data class AdminProfileUpdateRequest(
    val societyName: String,
    val address: String,
    val phone: String,
    val profilePicture: String,
    val adminName: String,
    val email: String
)
