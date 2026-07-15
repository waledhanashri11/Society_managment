package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ComplaintSaveRequest(
    val title: String,
    val description: String
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
    @SerializedName("created_at") val createdAt: String?
)
