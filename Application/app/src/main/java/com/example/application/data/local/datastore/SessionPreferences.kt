package com.example.application.data.local.datastore

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.sessionDataStore by preferencesDataStore(name = "session_preferences")

@Singleton
class SessionPreferences @Inject constructor(
    @param:ApplicationContext private val context: Context
) {
    @Volatile
    private var cachedSession: UserSession? = null

    val jwtToken: Flow<String?> = readString(Keys.JWT_TOKEN)
    val userRole: Flow<String?> = readString(Keys.USER_ROLE)
    val userId: Flow<String?> = readString(Keys.USER_ID)
    val userName: Flow<String?> = readString(Keys.USER_NAME)
    val userEmail: Flow<String?> = readString(Keys.USER_EMAIL)
    val userPhone: Flow<String?> = readString(Keys.USER_PHONE)
    val userStatus: Flow<String?> = readString(Keys.USER_STATUS)
    val hasToken: Flow<Boolean> = jwtToken.map { token -> !token.isNullOrBlank() }

    suspend fun saveJwtToken(token: String) {
        saveString(Keys.JWT_TOKEN, token)
    }

    suspend fun saveUserRole(role: String) {
        saveString(Keys.USER_ROLE, role)
    }

    suspend fun saveUserId(userId: String) {
        saveString(Keys.USER_ID, userId)
    }

    suspend fun saveUserName(name: String) {
        saveString(Keys.USER_NAME, name)
    }

    suspend fun saveUserEmail(email: String) {
        saveString(Keys.USER_EMAIL, email)
    }

    suspend fun saveUserPhone(phone: String) {
        saveString(Keys.USER_PHONE, phone)
    }

    suspend fun saveUserStatus(status: String) {
        saveString(Keys.USER_STATUS, status)
    }

    suspend fun saveSession(session: UserSession) {
        cachedSession = session
        context.sessionDataStore.edit { preferences ->
            preferences[Keys.JWT_TOKEN] = session.token
            preferences[Keys.USER_ID] = session.userId
            preferences[Keys.USER_NAME] = session.name
            preferences[Keys.USER_EMAIL] = session.email
            preferences[Keys.USER_ROLE] = session.role
            preferences[Keys.USER_STATUS] = session.status
            session.phone?.let { preferences[Keys.USER_PHONE] = it }
        }
    }

    suspend fun readSession(): UserSession? {
        val preferences = context.sessionDataStore.data.first()
        val token = preferences[Keys.JWT_TOKEN].orEmpty()
        val role = preferences[Keys.USER_ROLE].orEmpty()

        if (token.isBlank() || role.isBlank()) return null

        val session = UserSession(
            token = token,
            userId = preferences[Keys.USER_ID].orEmpty(),
            name = preferences[Keys.USER_NAME].orEmpty(),
            email = preferences[Keys.USER_EMAIL].orEmpty(),
            phone = preferences[Keys.USER_PHONE],
            role = role,
            status = preferences[Keys.USER_STATUS].orEmpty()
        )
        cachedSession = session
        return session
    }

    suspend fun clearSession() {
        cachedSession = null
        context.sessionDataStore.edit { preferences ->
            preferences.clear()
        }
    }

    fun getCachedToken(): String? = cachedSession?.token

    fun getCachedSession(): UserSession? = cachedSession

    private fun readString(key: Preferences.Key<String>): Flow<String?> {
        return context.sessionDataStore.data.map { preferences -> preferences[key] }
    }

    private suspend fun saveString(key: Preferences.Key<String>, value: String) {
        context.sessionDataStore.edit { preferences ->
            preferences[key] = value
        }
    }

    private object Keys {
        val JWT_TOKEN = stringPreferencesKey("jwt_token")
        val USER_ROLE = stringPreferencesKey("user_role")
        val USER_ID = stringPreferencesKey("user_id")
        val USER_NAME = stringPreferencesKey("user_name")
        val USER_EMAIL = stringPreferencesKey("user_email")
        val USER_PHONE = stringPreferencesKey("user_phone")
        val USER_STATUS = stringPreferencesKey("user_status")
    }
}

data class UserSession(
    val token: String,
    val userId: String,
    val name: String,
    val email: String,
    val phone: String?,
    val role: String,
    val status: String
)
