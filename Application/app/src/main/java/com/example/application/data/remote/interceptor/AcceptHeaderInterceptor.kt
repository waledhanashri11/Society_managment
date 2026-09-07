package com.example.application.data.remote.interceptor

import javax.inject.Inject
import okhttp3.Interceptor
import okhttp3.Response

class AcceptHeaderInterceptor @Inject constructor() : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val builder = originalRequest.newBuilder()

        builder.header("Accept", "application/json")
        if (originalRequest.header("Content-Type") == null && originalRequest.body != null) {
            builder.header("Content-Type", "application/json")
        }

        return chain.proceed(builder.build())
    }
}
