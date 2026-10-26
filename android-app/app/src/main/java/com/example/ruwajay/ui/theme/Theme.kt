package com.example.ruwajay.ui.theme

import android.content.Context
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

/**
 * Persistencia del tema, equivalente a localStorage('ruwajay_theme') en la web.
 * Si el usuario nunca eligió un tema se sigue la preferencia del sistema
 * (igual que window.matchMedia('(prefers-color-scheme: dark)')).
 */
object ThemePreferences {
    private const val PREFS = "ruwajay_prefs"
    private const val KEY = "ruwajay_theme"

    fun saved(context: Context): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)

    fun setDark(context: Context, dark: Boolean) {
        RuwaThemeState.isDark = dark
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(KEY, if (dark) "dark" else "light").apply()
    }

    fun toggle(context: Context) = setDark(context, !RuwaThemeState.isDark)

    /** Llamar en onCreate antes de setContent para evitar parpadeo del tema. */
    fun init(context: Context) {
        val systemDark = (context.resources.configuration.uiMode and
            android.content.res.Configuration.UI_MODE_NIGHT_MASK) == android.content.res.Configuration.UI_MODE_NIGHT_YES
        RuwaThemeState.isDark = when (saved(context)) {
            "dark" -> true
            "light" -> false
            else -> systemDark
        }
    }
}

@Composable
fun RuwaJayTheme(content: @Composable () -> Unit) {
    val dark = RuwaThemeState.isDark

    val colorScheme = if (dark) darkColorScheme(
        primary = BrandForest,
        secondary = BrandJade,
        tertiary = BrandTerracota,
        background = BrandCrema,
        surface = BrandSurfaceCard,
        surfaceVariant = BrandCremaDark,
        outline = BrandBorder,
        outlineVariant = BrandBorderLight,
        onPrimary = Color.White,
        onSecondary = Color.White,
        onTertiary = Color.White,
        onBackground = BrandTextPrimary,
        onSurface = BrandTextPrimary,
        onSurfaceVariant = BrandTextSecondary
    ) else lightColorScheme(
        primary = BrandForest,
        secondary = BrandJade,
        tertiary = BrandTerracota,
        background = BrandCrema,
        surface = BrandSurfaceCard,
        surfaceVariant = BrandCremaDark,
        outline = BrandGoldMuted,
        outlineVariant = BrandBorderLight,
        onPrimary = Color.White,
        onSecondary = Color.White,
        onTertiary = Color.White,
        onBackground = BrandTextPrimary,
        onSurface = BrandTextPrimary,
        onSurfaceVariant = BrandTextSecondary
    )

    MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
}
