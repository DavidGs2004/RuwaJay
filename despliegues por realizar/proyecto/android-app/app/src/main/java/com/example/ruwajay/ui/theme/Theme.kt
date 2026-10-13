package com.example.ruwajay.ui.theme

import android.app.Activity
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
    primary = BrandForestLight,
    secondary = BrandJade,
    tertiary = BrandTerracota,
    background = BrandCafe,
    surface = BrandCafe,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = BrandCrema,
    onSurface = BrandCrema
)

private val LightColorScheme = lightColorScheme(
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

@Composable
fun RuwaJayTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // Deshabilitar dynamic color por defecto para mantener la paleta RuwaJay
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
        typography = Typography,
        content = content
    )
}