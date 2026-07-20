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
