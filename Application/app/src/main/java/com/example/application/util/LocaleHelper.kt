package com.example.application.util

import android.content.Context
import android.content.ContextWrapper
import android.content.res.Configuration
import java.util.Locale

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

    fun wrap(context: Context): ContextWrapper {
        val language = selectedLanguage(context)
        val locale = Locale(language)
        Locale.setDefault(locale)
        val configuration = Configuration(context.resources.configuration)
        configuration.setLocale(locale)
        configuration.setLayoutDirection(locale)
        return ContextWrapper(context.createConfigurationContext(configuration))
    }
}
