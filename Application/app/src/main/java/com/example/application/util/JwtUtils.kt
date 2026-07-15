package com.example.application.util

import android.util.Base64
import org.json.JSONObject

object JwtUtils {
    fun isExpired(token: String): Boolean {
        val expirySeconds = getExpirySeconds(token) ?: return false
        val nowSeconds = System.currentTimeMillis() / 1000L
        return expirySeconds <= nowSeconds
    }

    private fun getExpirySeconds(token: String): Long? {
        return try {
            val payload = token.split(".").getOrNull(1) ?: return null
            val decoded = Base64.decode(payload, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
            JSONObject(String(decoded)).optLong("exp").takeIf { it > 0L }
        } catch (_: Exception) {
            null
        }
    }
}
