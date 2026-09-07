package com.example.application.auth

import android.content.Context
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import com.example.application.BuildConfig
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GoogleAuthManager @Inject constructor(@ApplicationContext private val appContext: Context) {
    suspend fun getIdToken(activityContext: Context): String {
        require(BuildConfig.GOOGLE_WEB_CLIENT_ID.isNotBlank()) {
            "Google login is not configured. Add GOOGLE_WEB_CLIENT_ID and rebuild the app."
        }
        val option = GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_WEB_CLIENT_ID).build()
        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
        val credential = CredentialManager.create(activityContext).getCredential(activityContext, request).credential
        if (credential !is CustomCredential || credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            error("Google did not return a valid sign-in credential.")
        }
        return GoogleIdTokenCredential.createFrom(credential.data).idToken
            .takeIf(String::isNotBlank) ?: error("Google did not return an ID token.")
    }

    suspend fun clearSession() {
        runCatching { CredentialManager.create(appContext).clearCredentialState(ClearCredentialStateRequest()) }
    }
}
