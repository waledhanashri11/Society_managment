package com.example.application.util

import android.content.Context
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat

object LocaleHelper {
    private const val PREFS = "app_language_preferences"
    private const val KEY_LANGUAGE = "selected_language"
    const val ENGLISH = "en"
    const val HINDI = "hi"
    const val MARATHI = "mr"
    private val supportedLanguages = setOf(ENGLISH, HINDI, MARATHI)

    fun selectedLanguage(context: Context): String {
        val saved = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_LANGUAGE, ENGLISH) ?: ENGLISH
        return if (saved in supportedLanguages) saved else ENGLISH
    }

    fun saveLanguage(context: Context, language: String) {
        val safeLanguage = if (language in supportedLanguages) language else ENGLISH
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_LANGUAGE, safeLanguage).apply()
    }

    fun applySavedLanguage(context: Context) {
        applyLanguage(selectedLanguage(context))
    }

    fun setLanguage(context: Context, language: String) {
        val safeLanguage = if (language in supportedLanguages) language else ENGLISH
        saveLanguage(context, safeLanguage)
        applyLanguage(safeLanguage)
    }

    fun applyLanguage(language: String) {
        val safeLanguage = if (language in supportedLanguages) language else ENGLISH
        AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(safeLanguage))
    }
}
