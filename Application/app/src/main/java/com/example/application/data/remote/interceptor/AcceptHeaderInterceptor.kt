package com.example.application.data.remote.interceptor

import javax.inject.Inject
import okhttp3.Interceptor
import okhttp3.Response

class AcceptHeaderInterceptor @Inject constructor() : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
            .newBuilder()
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .build()

        return chain.proceed(request)
    }
}
