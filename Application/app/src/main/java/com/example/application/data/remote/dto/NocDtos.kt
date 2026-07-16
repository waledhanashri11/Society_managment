package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class NocRequestDto(
    val id: String?,
    @SerializedName(value = "resident_id", alternate = ["residentId"]) val residentId: String?,
    @SerializedName(value = "flat_id", alternate = ["flatId"]) val flatId: String?,
    @SerializedName(value = "noc_type", alternate = ["nocType"]) val nocType: String?,
    val purpose: String?,
    val description: String?,
    @SerializedName(value = "document_url", alternate = ["documentUrl"]) val documentUrl: String?,
    val status: String?,
    @SerializedName(value = "admin_comments", alternate = ["adminComments"]) val adminComments: String?,
    @SerializedName(value = "noc_number", alternate = ["nocNumber"]) val nocNumber: String?,
    @SerializedName(value = "created_at", alternate = ["createdAt"]) val createdAt: String?,
    @SerializedName(value = "approved_at", alternate = ["approvedAt"]) val approvedAt: String?,
    @SerializedName(value = "resident_name", alternate = ["residentName"]) val residentName: String?,
    @SerializedName(value = "flat_no", alternate = ["flatNo"]) val flatNo: String?,
    val wing: String?
)

data class CreateNocRequest(
    val nocType: String,
    val purpose: String,
    val description: String?,
    val documentData: String?
)

data class ReviewNocRequest(
    val status: String,
    val adminComments: String?
)
