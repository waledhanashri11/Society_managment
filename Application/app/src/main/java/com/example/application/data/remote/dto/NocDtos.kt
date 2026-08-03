package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class NocRequestDto(
    val id: String?,
    @SerializedName(value = "resident_id", alternate = ["residentId"]) val residentId: String?,
    @SerializedName(value = "flat_id", alternate = ["flatId"]) val flatId: String?,
    @SerializedName(value = "noc_type", alternate = ["nocType"]) val nocType: String?,
    val purpose: String?,
    val description: String?,
    @SerializedName(value = "documents", alternate = ["document_url", "documentUrl"]) val documentUrl: String?,
    val status: String?,
    @SerializedName(value = "admin_remarks", alternate = ["admin_comments", "adminComments"]) val adminComments: String?,
    @SerializedName(value = "request_number", alternate = ["noc_number", "nocNumber"]) val nocNumber: String?,
    @SerializedName(value = "requested_at", alternate = ["created_at", "createdAt"]) val createdAt: String?,
    @SerializedName(value = "approved_at", alternate = ["approvedAt"]) val approvedAt: String?,
    @SerializedName(value = "resident_name", alternate = ["residentName"]) val residentName: String?,
    @SerializedName(value = "flat_no", alternate = ["flatNo"]) val flatNo: String?,
    val wing: String?
)

data class CreateNocRequest(
    @SerializedName("noc_type") val nocType: String,
    val purpose: String,
    val remarks: String?,
    val documents: List<String> = emptyList()
)

data class ReviewNocRequest(
    val remarks: String?
)

data class UploadNocInfoRequest(
    val documents: List<String> = emptyList(),
    val remarks: String?
)

data class NocTypeDto(
    val id: String?,
    val name: String?,
    val description: String?,
    val active: Boolean?
)

data class NocReportsDto(
    val summary: NocReportSummaryDto? = null,
    @SerializedName("by_type") val byType: List<NocReportGroupDto> = emptyList(),
    @SerializedName("by_month") val byMonth: List<NocReportGroupDto> = emptyList()
)

data class NocReportSummaryDto(
    val total: Int? = 0,
    val pending: Int? = 0,
    @SerializedName("under_review") val underReview: Int? = 0,
    val approved: Int? = 0,
    val rejected: Int? = 0,
    val completed: Int? = 0,
    val expired: Int? = 0
)

data class NocReportGroupDto(
    @SerializedName("noc_type") val nocType: String? = null,
    val month: String? = null,
    val count: Int? = 0
)

data class PublicNocCertificateDto(
    val society: PublicNocSocietyDto?,
    val certificate: PublicNocCertificateDetailsDto?
)

data class PublicNocSocietyDto(val name: String?)

data class PublicNocCertificateDetailsDto(
    @SerializedName("request_number") val requestNumber: String?,
    @SerializedName("noc_type") val nocType: String?,
    val purpose: String?,
    @SerializedName("issue_date") val issueDate: String?,
    @SerializedName("expiry_date") val expiryDate: String?,
    @SerializedName("verification_number") val verificationNumber: String?,
    @SerializedName("resident_name") val residentName: String?,
    @SerializedName("flat_no") val flatNo: String?,
    val wing: String?
)
