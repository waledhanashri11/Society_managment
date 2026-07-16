package com.example.application.data.remote.api

import com.example.application.data.remote.dto.AdminNotificationsResponse
import com.example.application.data.remote.dto.ComplaintDto
import com.example.application.data.remote.dto.ComplaintSaveRequest
import com.example.application.data.remote.dto.ComplaintUpdateRequest
import com.example.application.data.remote.dto.MarkReadResponse
import com.example.application.data.remote.dto.MessageResponse
import com.example.application.data.remote.dto.NoticeDto
import com.example.application.data.remote.dto.NoticeSaveRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

interface CommunicationApiService {
    @GET("api/complaints")
    suspend fun getAllComplaints(): Response<List<ComplaintDto>>

    @GET("api/complaints/user/my-complaints")
    suspend fun getMyComplaints(): Response<List<ComplaintDto>>

    @GET("api/complaints/{id}")
    suspend fun getComplaint(@Path("id") id: String): Response<ComplaintDto>

    @POST("api/complaints")
    suspend fun createComplaint(@Body request: ComplaintSaveRequest): Response<ComplaintDto>

    @PUT("api/complaints/{id}")
    suspend fun updateComplaint(@Path("id") id: String, @Body request: ComplaintUpdateRequest): Response<MessageResponse>

    @DELETE("api/complaints/{id}")
    suspend fun deleteComplaint(@Path("id") id: String): Response<MessageResponse>

    @GET("api/notices")
    suspend fun getNotices(): Response<List<NoticeDto>>

    @GET("api/notices/latest")
    suspend fun getLatestNotices(): Response<List<NoticeDto>>

    @GET("api/notices/{id}")
    suspend fun getNotice(@Path("id") id: String): Response<NoticeDto>

    @POST("api/notices")
    suspend fun createNotice(@Body request: NoticeSaveRequest): Response<NoticeDto>

    @DELETE("api/notices/{id}")
    suspend fun deleteNotice(@Path("id") id: String): Response<MessageResponse>

    @GET("api/notifications")
    suspend fun getNotifications(): Response<AdminNotificationsResponse>

    @PUT("api/notifications/read")
    suspend fun markNotificationsRead(): Response<MarkReadResponse>
}
