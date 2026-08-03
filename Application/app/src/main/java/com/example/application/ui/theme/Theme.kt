package com.example.application.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary = SocietyBlue80,
    onPrimary = SocietyDarkBlue,
    primaryContainer = SocietyDarkBlueContainer,
    onPrimaryContainer = SocietyBlue80,
    secondary = SocietyGreen80,
    onSecondary = SocietySurfaceDark,
    secondaryContainer = SocietyGreen40,
    onSecondaryContainer = SocietyGreen80,
    tertiary = SocietyGold80,
    onTertiary = SocietySurfaceDark,
    tertiaryContainer = SocietyGold40,
    onTertiaryContainer = SocietyGold80,
    error = SocietyError,
    onError = SocietySurfaceDark,
    errorContainer = Color(0xFF7F1D1D),
    onErrorContainer = Color(0xFFFCA5A5),
    background = SocietyBackgroundDark,
    onBackground = SocietyTextPrimaryDark,
    surface = SocietySurfaceDark,
    onSurface = SocietyTextPrimaryDark,
    surfaceVariant = SocietyOutlineDark,
    onSurfaceVariant = SocietyTextSecondaryDark,
    outline = SocietyOutlineDark,
    outlineVariant = SocietySurfaceDark,
    inverseSurface = SocietySurfaceLight,
    inverseOnSurface = SocietyTextPrimary
)

private val LightColorScheme = lightColorScheme(
    primary = SocietyBlue40,
    onPrimary = SocietySurfaceLight,
    primaryContainer = SocietyLightBlue,
    onPrimaryContainer = SocietyDarkBlue,
    secondary = SocietyGreen40,
    onSecondary = SocietySurfaceLight,
    secondaryContainer = Color(0xFFDCFCE7),
    onSecondaryContainer = SocietyGreen40,
    tertiary = SocietyGold40,
    onTertiary = SocietySurfaceLight,
    tertiaryContainer = Color(0xFFFEF3C7),
    onTertiaryContainer = SocietyGold40,
    error = SocietyError,
    onError = SocietySurfaceLight,
    errorContainer = Color(0xFFFEE2E2),
    onErrorContainer = Color(0xFF991B1B),
    background = SocietyBackgroundLight,
    onBackground = SocietyTextPrimary,
    surface = SocietySurfaceLight,
    onSurface = SocietyTextPrimary,
    onSurfaceVariant = SocietyTextSecondary,
    surfaceVariant = SocietyLightBlue,
    outline = SocietyOutlineLight,
    outlineVariant = Color(0xFFE2E8F0),
    inverseSurface = SocietySurfaceDark,
    inverseOnSurface = SocietyTextPrimaryDark,
    inversePrimary = SocietyBlue80
)

@Composable
fun ApplicationTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }

        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AppTypography,
        shapes = AppShapes,
        content = content
    )
}
