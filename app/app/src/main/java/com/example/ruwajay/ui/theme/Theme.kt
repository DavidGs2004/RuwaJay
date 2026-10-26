package com.example.ruwajay.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

@Composable
fun RuwaJayTheme(content: @Composable () -> Unit) {
    val colorScheme = lightColorScheme(
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
