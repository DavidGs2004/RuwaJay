package com.example.ruwajay.ui.theme

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * Estado global del tema (equivalente a ThemeContext.jsx + html.dark en la web).
 * Los colores de marca se leen desde este estado, por lo que cualquier pantalla
 * que use BrandX se recompone automáticamente al cambiar entre claro y oscuro.
 */
object RuwaThemeState {
    var isDark by mutableStateOf(false)
}

private inline fun themed(light: Long, dark: Long): Color =
    if (RuwaThemeState.isDark) Color(dark) else Color(light)

// Primary Palette — identical to web index.css (@theme) and html.dark overrides
val BrandForest: Color get() = themed(0xFF0B5D3B, 0xFF10B981)
val BrandForestLight: Color get() = themed(0xFF0E7048, 0xFF34D399)
val BrandForestDark: Color get() = themed(0xFF084A2F, 0xFF059669)
val BrandJade: Color get() = themed(0xFF168A55, 0xFF10B981)
val BrandJadeLight: Color get() = themed(0xFF1EA364, 0xFF34D399)
val BrandTerracota: Color get() = themed(0xFFD84420, 0xFFFB7185)
val BrandTerracotaLight: Color get() = themed(0xFFE65A38, 0xFFFDA4AF)
val BrandTerracotaDark: Color get() = themed(0xFFB8381A, 0xFFE11D48)
val BrandOrange: Color get() = themed(0xFFF07824, 0xFFFB923C)
val BrandGold: Color get() = themed(0xFFD4962A, 0xFFFBBF24)
val BrandGoldLight: Color get() = themed(0xFFE6B04A, 0xFFFCD34D)
val BrandGoldMuted: Color get() = themed(0xFFC8A95E, 0xFFD97706)
val BrandCafe: Color get() = themed(0xFF3B2118, 0xFFF1F5F9)
val BrandCafeLight: Color get() = themed(0xFF5C3D30, 0xFFCBD5E1)
val BrandCrema: Color get() = themed(0xFFFBF3E8, 0xFF0B111A)
val BrandCremaDark: Color get() = themed(0xFFF0E2CF, 0xFF121A26)
val BrandCremaWarm: Color get() = themed(0xFFF7EAD8, 0xFF182232)
val BrandAzulRuta: Color get() = themed(0xFF2477C9, 0xFF3A8FD9)
val BrandAzulRutaLight: Color get() = themed(0xFF3A8FD9, 0xFF60A5FA)

// Surface & Neutrals
val BrandSurface: Color get() = themed(0xFFFBF3E8, 0xFF0B111A)
val BrandSurfaceBackground: Color get() = BrandSurface
val BrandSurfaceCard: Color get() = themed(0xFFFFFFFF, 0xFF131D2D)
val BrandSurfaceElevated: Color get() = themed(0xFFFFFCF7, 0xFF19263A)
val BrandSurfaceSoft: Color get() = themed(0xFFFAF5EE, 0xFF0E1624)
val BrandTextPrimary: Color get() = themed(0xFF2D1810, 0xFFF8FAFC)
val BrandTextSecondary: Color get() = themed(0xFF6B5549, 0xFF94A3B8)
val BrandTextMuted: Color get() = themed(0xFF9E8C82, 0xFF64748B)
val BrandBorder: Color get() = themed(0xFFE8D9C8, 0xFF23334D)
val BrandBorderLight: Color get() = themed(0xFFF2E8DB, 0xFF1A2639)
val BrandHeaderInk: Color get() = themed(0xFF222222, 0xFFF8FAFC)
val BrandHeaderMuted: Color get() = themed(0xFF717171, 0xFF94A3B8)
val BrandWhatsApp = Color(0xFF25D366)
val BrandAirbnbRed = Color(0xFFE00B41)

// Footer (shared light & dark: soft café gradient)
val BrandFooterTop = Color(0xFF5A4134)
val BrandFooterBottom = Color(0xFF4A352A)

// Signature Brand Gradients
val BrandGradientAccent: Brush get() = Brush.horizontalGradient(listOf(BrandForest, BrandGold, BrandTerracota))
val BrandGradientHero: Brush get() = Brush.verticalGradient(
    listOf(BrandForestDark.copy(alpha = 0.85f), BrandForest.copy(alpha = 0.65f), Color.Transparent)
)
val BrandGradientSunset: Brush get() = Brush.horizontalGradient(listOf(BrandOrange, BrandGold))
val BrandGradientForest: Brush get() = Brush.horizontalGradient(listOf(BrandForestDark, BrandForest))
val BrandGradientIndicator: Brush get() = Brush.horizontalGradient(listOf(BrandTerracota, BrandOrange))
val BrandGradientFooter: Brush get() = Brush.verticalGradient(listOf(BrandFooterTop, BrandFooterBottom))