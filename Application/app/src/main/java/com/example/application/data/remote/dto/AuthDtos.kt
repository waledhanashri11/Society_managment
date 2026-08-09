package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val name: String,
    val email: String,
    val phone: String?,
    val password: String,
    val role: String = "resident",
    @SerializedName("society_code") val societyCode: String,
    @SerializedName("flat_id") val flatId: String? = null
)

data class SocietyDto(
    val id: String?,
    val name: String?,
    val code: String?,
    @SerializedName("logo_url") val logoUrl: String?,
    val address: String?,
    @SerializedName("registration_number") val registrationNumber: String?
)

data class RegisterResponse(
    val token: String?,
    val message: String?,
    val user: UserDto?
)

data class ForgotPasswordRequest(
    val email: String
)

data class ResetPasswordRequest(
    val token: String,
    val newPassword: String
)

data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String
)

data class MessageResponse(
    val message: String?
)

data class LoginResponse(
    val token: String?,
    val user: UserDto?,
    val society: SocietyDto?
)

data class UserDto(
    val id: String?,
    val name: String?,
    val email: String?,
    val phone: String?,
    val role: String?,
    val status: String?,
    @SerializedName("flat_id") val flatId: String?,
    @SerializedName("society_id") val societyId: String?,
    val society: SocietyDto?
)

data class ErrorResponse(
    val message: String?
)
