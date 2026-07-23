package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class EventDto(
    val id: String?,
    val title: String?,
    val description: String?,
    @SerializedName("event_date") val eventDate: String?,
    @SerializedName("start_time") val startTime: String?,
    @SerializedName("end_time") val endTime: String?,
    val venue: String?,
    val organizer: String?,
    @SerializedName("image_path") val imagePath: String?,
    @SerializedName("image_url") val imageUrl: String?,
    val status: String?,
    val audience: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("updated_at") val updatedAt: String?
)

data class EventSaveRequest(
    val title: String,
    val description: String? = null,
    @SerializedName("event_date") val eventDate: String,
    @SerializedName("start_time") val startTime: String,
    @SerializedName("end_time") val endTime: String,
    val venue: String,
    val organizer: String? = null,
    val image: String? = null,
    val status: String = "Draft",
    val audience: String = "All"
)

data class EventStatusRequest(val status: String)
