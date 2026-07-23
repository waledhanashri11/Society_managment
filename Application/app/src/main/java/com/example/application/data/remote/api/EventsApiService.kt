package com.example.application.data.remote.api

import com.example.application.data.remote.dto.EventDto
import com.example.application.data.remote.dto.EventSaveRequest
import com.example.application.data.remote.dto.EventStatusRequest
import com.google.gson.JsonElement
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface EventsApiService {
    @GET("api/events")
    suspend fun getEvents(
        @Query("status") status: String? = null,
        @Query("audience") audience: String? = null,
        @Query("title") title: String? = null
    ): Response<List<EventDto>>

    @GET("api/events/{id}")
    suspend fun getEvent(@Path("id") id: String): Response<EventDto>

    @POST("api/events")
    suspend fun createEvent(@Body request: EventSaveRequest): Response<JsonElement>

    @PUT("api/events/{id}")
    suspend fun updateEvent(@Path("id") id: String, @Body request: EventSaveRequest): Response<JsonElement>

    @PUT("api/events/{id}/status")
    suspend fun updateStatus(@Path("id") id: String, @Body request: EventStatusRequest): Response<JsonElement>

    @DELETE("api/events/{id}")
    suspend fun deleteEvent(@Path("id") id: String): Response<JsonElement>
}
