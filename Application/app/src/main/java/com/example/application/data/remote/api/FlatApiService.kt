package com.example.application.data.remote.api

import com.example.application.data.remote.dto.FlatDto
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

interface FlatApiService {
    @GET("api/flats/available")
    suspend fun getAvailableFlats(@Query("societyCode") societyCode: String): Response<List<FlatDto>>
}
