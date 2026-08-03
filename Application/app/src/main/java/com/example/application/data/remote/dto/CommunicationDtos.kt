package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ComplaintSaveRequest(
    val title: String,
    val description: String,
    @SerializedName("images") val images: List<String> = emptyList(),
    @SerializedName("image_url") val imageUrl: String? = images.firstOrNull(),
    @SerializedName("imageUrl") val imageUrlCamel: String? = images.firstOrNull()
)

data class ComplaintUpdateRequest(
    val status: String,
    val reply: String?
)

data class NoticeSaveRequest(
    val title: String,
    val description: String,
    val poll: NoticePollSaveRequest? = null
)

data class NoticePollSaveRequest(
    val enabled: Boolean,
    val question: String,
    @SerializedName("poll_type") val pollType: String = "yes_no",
    val options: List<String> = listOf("Yes", "No"),
    @SerializedName("start_at") val startAt: String,
    @SerializedName("end_at") val endAt: String,
    val anonymous: Boolean = false,
    @SerializedName("allow_vote_change") val allowVoteChange: Boolean = false,
    @SerializedName("show_results_before_end") val showResultsBeforeEnd: Boolean = false,
    val mandatory: Boolean = false
)

data class NoticeVoteRequest(
    @SerializedName("option_ids") val optionIds: List<Int>
)

data class NoticeStatsDto(
    @SerializedName("total_notices") val totalNotices: Int?,
    @SerializedName("notices_with_polls") val noticesWithPolls: Int?,
    @SerializedName("active_polls") val activePolls: Int?,
    @SerializedName("closed_polls") val closedPolls: Int?,
    @SerializedName("total_votes") val totalVotes: Int?,
    @SerializedName("participation_percent") val participationPercent: Int?
)

data class AdminNotificationsResponse(
    val notifications: List<NotificationDto>?,
    val unreadCount: Int?
)

data class MarkReadResponse(
    val message: String?,
    val unreadCount: Int?
)

data class NotificationDto(
    val id: String?,
    val title: String?,
    val message: String?,
    val type: String?,
    val path: String?,
    @SerializedName("is_read") val isRead: Boolean? = null,
    @SerializedName("created_at") val createdAt: String?
)
