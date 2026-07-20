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
    val description: String
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
