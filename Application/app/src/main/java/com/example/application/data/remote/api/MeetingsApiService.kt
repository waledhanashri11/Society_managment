package com.example.application.data.remote.api

import com.example.application.data.remote.dto.*
import com.google.gson.JsonElement
import retrofit2.Response
import retrofit2.http.*

interface MeetingsApiService {
    @GET("api/meetings") suspend fun getMeetings(@Query("meeting_type") type: String? = null, @Query("status") status: String? = null, @Query("priority") priority: String? = null, @Query("date") date: String? = null, @Query("title") title: String? = null): Response<List<MeetingDto>>
    @GET("api/meetings/{id}") suspend fun getMeeting(@Path("id") id: String): Response<MeetingDetailsDto>
    @POST("api/meetings") suspend fun createMeeting(@Body request: MeetingSaveRequest): Response<JsonElement>
    @PUT("api/meetings/{id}") suspend fun updateMeeting(@Path("id") id: String, @Body request: MeetingSaveRequest): Response<JsonElement>
    @DELETE("api/meetings/{id}") suspend fun deleteMeeting(@Path("id") id: String): Response<JsonElement>
    @POST("api/meetings/{id}/duplicate") suspend fun duplicateMeeting(@Path("id") id: String): Response<JsonElement>
    @PUT("api/meetings/{id}/agenda") suspend fun saveAgenda(@Path("id") id: String, @Body request: MeetingAgendaSaveRequest): Response<JsonElement>
    @GET("api/meetings/{id}/attendance") suspend fun getAttendance(@Path("id") id: String): Response<List<MeetingAttendanceDto>>
    @POST("api/meetings/{id}/attendance") suspend fun saveAttendance(@Path("id") id: String, @Body request: MeetingAttendanceSaveRequest): Response<JsonElement>
    @POST("api/meetings/{id}/attendance/mark-all-present") suspend fun markAllPresent(@Path("id") id: String): Response<JsonElement>
    @POST("api/meetings/{id}/attendance/self") suspend fun selfAttendance(@Path("id") id: String): Response<JsonElement>
    @POST("api/meetings/{id}/report") suspend fun saveReport(@Path("id") id: String, @Body request: MeetingReportSaveRequest): Response<JsonElement>
    @POST("api/meetings/actions") suspend fun createAction(@Body request: MeetingActionSaveRequest): Response<JsonElement>
    @PUT("api/meetings/actions/{id}") suspend fun updateAction(@Path("id") id: String, @Body request: MeetingActionSaveRequest): Response<JsonElement>
    @PUT("api/meetings/actions/{id}/status") suspend fun updateActionStatus(@Path("id") id: String, @Body request: MeetingActionStatusRequest): Response<JsonElement>
    @DELETE("api/meetings/actions/{id}") suspend fun deleteAction(@Path("id") id: String): Response<JsonElement>
    @POST("api/meetings/votes") suspend fun createVote(@Body request: MeetingVoteSaveRequest): Response<JsonElement>
    @POST("api/meetings/{id}/votes/cast") suspend fun castVote(@Path("id") id: String, @Body request: MeetingVoteCastRequest): Response<JsonElement>
    @GET("api/meetings/fines/list") suspend fun getFines(): Response<List<MeetingFineDto>>
    @POST("api/meetings/fines/{id}/pay") suspend fun payFine(@Path("id") id: String): Response<JsonElement>
    @PUT("api/meetings/fines/{id}/waive") suspend fun waiveFine(@Path("id") id: String, @Body request: MeetingFineWaiveRequest): Response<JsonElement>
    @GET("api/meetings/{id}/comments") suspend fun getComments(@Path("id") id: String): Response<List<MeetingCommentDto>>
    @POST("api/meetings/{id}/comments") suspend fun addComment(@Path("id") id: String, @Body request: MeetingCommentSaveRequest): Response<JsonElement>
}
