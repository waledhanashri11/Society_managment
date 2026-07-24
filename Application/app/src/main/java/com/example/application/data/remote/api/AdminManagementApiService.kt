package com.example.application.data.remote.api

import com.example.application.data.remote.dto.FlatDto
import com.example.application.data.remote.dto.FlatSaveRequest
import com.example.application.data.remote.dto.FlatTypeDto
import com.example.application.data.remote.dto.FlatTypeSaveRequest
import com.example.application.data.remote.dto.MessageResponse
import com.example.application.data.remote.dto.StaffDto
import com.example.application.data.remote.dto.StaffSaveRequest
import com.example.application.data.remote.dto.UserSaveRequest
import com.example.application.data.remote.dto.UserStatusRequest
import com.example.application.data.remote.dto.UserSummaryDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

interface AdminManagementApiService {
    @GET("api/users")
    suspend fun getUsers(): Response<List<UserSummaryDto>>

    @GET("api/users/{id}")
    suspend fun getUser(@Path("id") id: String): Response<UserSummaryDto>

    @POST("api/users")
    suspend fun createUser(@Body request: UserSaveRequest): Response<UserSummaryDto>

    @PUT("api/users/{id}")
    suspend fun updateUser(@Path("id") id: String, @Body request: UserSaveRequest): Response<MessageResponse>

    @PUT("api/users/{id}/status")
    suspend fun updateUserStatus(@Path("id") id: String, @Body request: UserStatusRequest): Response<MessageResponse>

    @DELETE("api/users/{id}")
    suspend fun deleteUser(@Path("id") id: String): Response<MessageResponse>

    @GET("api/flats")
    suspend fun getFlats(): Response<List<FlatDto>>

    @GET("api/flats/available")
    suspend fun getAvailableFlats(): Response<List<FlatDto>>

    @GET("api/flats/{id}")
    suspend fun getFlat(@Path("id") id: String): Response<FlatDto>

    @POST("api/flats")
    suspend fun createFlat(@Body request: FlatSaveRequest): Response<FlatDto>

    @PUT("api/flats/{id}")
    suspend fun updateFlat(@Path("id") id: String, @Body request: FlatSaveRequest): Response<MessageResponse>

    @DELETE("api/flats/{id}")
    suspend fun deleteFlat(@Path("id") id: String): Response<MessageResponse>

    @GET("api/flat-types")
    suspend fun getFlatTypes(): Response<List<FlatTypeDto>>

    @POST("api/flat-types")
    suspend fun createFlatType(@Body request: FlatTypeSaveRequest): Response<FlatTypeDto>

    @PUT("api/flat-types/{id}")
    suspend fun updateFlatType(@Path("id") id: String, @Body request: FlatTypeSaveRequest): Response<MessageResponse>

    @PUT("api/flat-types/{id}/status")
    suspend fun updateFlatTypeStatus(@Path("id") id: String, @Body request: Map<String, String>): Response<MessageResponse>

    @DELETE("api/flat-types/{id}")
    suspend fun deleteFlatType(@Path("id") id: String): Response<MessageResponse>

    @GET("api/staff")
    suspend fun getStaff(): Response<List<StaffDto>>

    @GET("api/staff/{id}")
    suspend fun getStaffMember(@Path("id") id: String): Response<StaffDto>

    @POST("api/staff")
    suspend fun createStaff(@Body request: StaffSaveRequest): Response<StaffDto>

    @PUT("api/staff/{id}")
    suspend fun updateStaff(@Path("id") id: String, @Body request: StaffSaveRequest): Response<MessageResponse>

    @DELETE("api/staff/{id}")
    suspend fun deleteStaff(@Path("id") id: String): Response<MessageResponse>
}
