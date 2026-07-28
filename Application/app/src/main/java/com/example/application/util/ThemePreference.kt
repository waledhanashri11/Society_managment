package com.example.application.util

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

object ThemePreference {
    private const val PREFS_NAME = "app_theme_preferences"
    private const val KEY_DARK_THEME = "dark_theme"

    var darkTheme by mutableStateOf(false)
        private set

    fun initialize(context: Context) {
        darkTheme = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getBoolean(KEY_DARK_THEME, false)
    }

    fun setDarkTheme(context: Context, enabled: Boolean) {
        darkTheme = enabled
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_DARK_THEME, enabled)
            .apply()
    }

    fun toggle(context: Context) {
        setDarkTheme(context, !darkTheme)
    }
}
