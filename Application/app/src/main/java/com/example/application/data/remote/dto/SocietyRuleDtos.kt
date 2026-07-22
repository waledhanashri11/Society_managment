package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class SocietyRuleDto(
    val id: String?,
    val title: String?,
    val description: String?,
    val category: String?,
    val priority: String?,
    val status: String?,
    @SerializedName("created_by") val createdBy: String?,
    @SerializedName("created_by_name") val createdByName: String?,
    @SerializedName("published_at") val publishedAt: String?,
    @SerializedName("archived_at") val archivedAt: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("updated_at") val updatedAt: String?,
    @SerializedName("read_at") val readAt: String?,
    @SerializedName("acknowledged_at") val acknowledgedAt: String?,
    @SerializedName("acknowledgement_text") val acknowledgementText: String?,
    @SerializedName("is_read") val isRead: Boolean?,
    @SerializedName("is_acknowledged") val isAcknowledged: Boolean?,
    @SerializedName("total_residents") val totalResidents: Int?,
    @SerializedName("acknowledged_count") val acknowledgedCount: Int?,
    @SerializedName("pending_count") val pendingCount: Int?
)

data class SocietyRuleSaveRequest(
    val title: String,
    val description: String,
    val category: String,
    val priority: String,
    val status: String = "draft"
)

data class SocietyRuleActionResponse(
    val id: String?,
    val message: String?,
    val count: Int?
)

data class SocietyRuleAcknowledgementReportDto(
    val rule: SocietyRuleReportRuleDto?,
    val summary: SocietyRuleReportSummaryDto?,
    val residents: List<SocietyRuleResidentAcknowledgementDto>?
)

data class SocietyRuleReportRuleDto(
    val id: String?,
    val title: String?
)

data class SocietyRuleReportSummaryDto(
    @SerializedName("total_residents") val totalResidents: Int?,
    @SerializedName("acknowledged_count") val acknowledgedCount: Int?,
    @SerializedName("pending_count") val pendingCount: Int?
)

data class SocietyRuleResidentAcknowledgementDto(
    @SerializedName("resident_id") val residentId: String?,
    @SerializedName("resident_name") val residentName: String?,
    val email: String?,
    val phone: String?,
    @SerializedName("flat_no") val flatNo: String?,
    val wing: String?,
    @SerializedName("read_at") val readAt: String?,
    @SerializedName("acknowledged_at") val acknowledgedAt: String?,
    @SerializedName("acknowledgement_text") val acknowledgementText: String?,
    @SerializedName("is_read") val isRead: Boolean?,
    @SerializedName("is_acknowledged") val isAcknowledged: Boolean?
)
