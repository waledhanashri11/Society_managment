package com.example.application.data.remote.api

import com.example.application.data.remote.dto.SocietyRuleAcknowledgementReportDto
import com.example.application.data.remote.dto.SocietyRuleActionResponse
import com.example.application.data.remote.dto.SocietyRuleDto
import com.example.application.data.remote.dto.SocietyRuleSaveRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface SocietyRulesApiService {
    @GET("api/rules")
    suspend fun getRules(
        @Query("search") search: String? = null,
        @Query("category") category: String? = null,
        @Query("priority") priority: String? = null,
        @Query("status") status: String? = null
    ): Response<List<SocietyRuleDto>>

    @GET("api/rules/categories")
    suspend fun getCategories(): Response<List<String>>

    @GET("api/rules/{id}")
    suspend fun getRule(@Path("id") id: String): Response<SocietyRuleDto>

    @POST("api/rules")
    suspend fun createRule(@Body request: SocietyRuleSaveRequest): Response<SocietyRuleActionResponse>

    @PUT("api/rules/{id}")
    suspend fun updateRule(
        @Path("id") id: String,
        @Body request: SocietyRuleSaveRequest
    ): Response<SocietyRuleActionResponse>

    @PUT("api/rules/{id}/publish")
    suspend fun publishRule(@Path("id") id: String): Response<SocietyRuleActionResponse>

    @PUT("api/rules/{id}/unpublish")
    suspend fun unpublishRule(@Path("id") id: String): Response<SocietyRuleActionResponse>

    @PUT("api/rules/{id}/archive")
    suspend fun archiveRule(@Path("id") id: String): Response<SocietyRuleActionResponse>

    @PUT("api/rules/{id}/read")
    suspend fun markRuleRead(@Path("id") id: String): Response<SocietyRuleActionResponse>

    @POST("api/rules/{id}/acknowledge")
    suspend fun acknowledgeRule(@Path("id") id: String): Response<SocietyRuleActionResponse>

    @GET("api/rules/{id}/acknowledgements")
    suspend fun getAcknowledgementReport(@Path("id") id: String): Response<SocietyRuleAcknowledgementReportDto>

    @POST("api/rules/{id}/reminders")
    suspend fun sendReminders(@Path("id") id: String): Response<SocietyRuleActionResponse>
}
