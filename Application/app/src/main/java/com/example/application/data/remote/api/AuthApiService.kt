package com.example.application.data.remote.api

import com.example.application.data.remote.dto.LoginRequest
import com.example.application.data.remote.dto.LoginResponse
import com.example.application.data.remote.dto.MessageResponse
import com.example.application.data.remote.dto.ForgotPasswordRequest
import com.example.application.data.remote.dto.RegisterRequest
import com.example.application.data.remote.dto.RegisterResponse
import com.example.application.data.remote.dto.ResetPasswordRequest
import com.example.application.data.remote.dto.ChangePasswordRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.PUT
import retrofit2.http.POST

interface AuthApiService {
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<RegisterResponse>

    @POST("api/auth/forgot-password")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): Response<MessageResponse>

    @POST("api/auth/reset-password")
    suspend fun resetPassword(@Body request: ResetPasswordRequest): Response<MessageResponse>

    @PUT("api/auth/change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): Response<MessageResponse>
}
