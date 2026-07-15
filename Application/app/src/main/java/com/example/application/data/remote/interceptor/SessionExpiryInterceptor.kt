package com.example.application.data.remote.interceptor

import com.example.application.data.local.datastore.SessionPreferences
import javax.inject.Inject
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

class SessionExpiryInterceptor @Inject constructor(
    private val sessionPreferences: SessionPreferences
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val response = chain.proceed(chain.request())
        val isLoginRequest = chain.request().url.encodedPath.endsWith("/api/auth/login")

        if (response.code == 401 && !isLoginRequest) {
            runBlocking {
                sessionPreferences.clearSession()
            }
        }

        return response
    }
}
