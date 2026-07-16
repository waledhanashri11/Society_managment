package com.example.application.data.remote.interceptor

import com.example.application.data.local.datastore.SessionPreferences
import javax.inject.Inject
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

class AuthHeaderInterceptor @Inject constructor(
    private val sessionPreferences: SessionPreferences
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val isLoginRequest = originalRequest.url.encodedPath.endsWith("/api/auth/login")

        val builder = originalRequest.newBuilder()

        if (!isLoginRequest) {
            val token = sessionPreferences.getCachedToken()
                ?: runBlocking { sessionPreferences.readSession()?.token }
            if (!token.isNullOrBlank()) {
                builder.header("Authorization", "Bearer $token")
            }
        }

        return chain.proceed(builder.build())
    }
}
