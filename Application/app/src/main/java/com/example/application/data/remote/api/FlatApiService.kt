package com.example.application.data.remote.api

import com.example.application.data.remote.dto.FlatDto
import retrofit2.Response
import retrofit2.http.GET

interface FlatApiService {
    @GET("api/flats/available")
    suspend fun getAvailableFlats(): Response<List<FlatDto>>
}
