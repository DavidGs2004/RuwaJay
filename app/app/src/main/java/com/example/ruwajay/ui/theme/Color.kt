package com.example.ruwajay.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

// Paleta permanente en modo claro.
// Paleta de marca compartida con la web.
val BrandForest: Color get() = Color(0xFF0B5D3B)
val BrandForestLight: Color get() = Color(0xFF0E7048)
val BrandForestDark: Color get() = Color(0xFF084A2F)
val BrandJade: Color get() = Color(0xFF168A55)
val BrandJadeLight: Color get() = Color(0xFF1EA364)
val BrandTerracota: Color get() = Color(0xFFD84420)
val BrandTerracotaLight: Color get() = Color(0xFFE65A38)
val BrandTerracotaDark: Color get() = Color(0xFFB8381A)
val BrandOrange: Color get() = Color(0xFFF07824)
val BrandGold: Color get() = Color(0xFFD4962A)
val BrandGoldLight: Color get() = Color(0xFFE6B04A)
val BrandGoldMuted: Color get() = Color(0xFFC8A95E)
val BrandCafe: Color get() = Color(0xFF3B2118)
val BrandCafeLight: Color get() = Color(0xFF5C3D30)
val BrandCrema: Color get() = Color(0xFFFBF3E8)
val BrandCremaDark: Color get() = Color(0xFFF0E2CF)
val BrandCremaWarm: Color get() = Color(0xFFF7EAD8)
val BrandAzulRuta: Color get() = Color(0xFF2477C9)
val BrandAzulRutaLight: Color get() = Color(0xFF3A8FD9)

// Surface & Neutrals
val BrandSurface: Color get() = Color(0xFFFBF3E8)
val BrandSurfaceBackground: Color get() = BrandSurface
val BrandSurfaceCard: Color get() = Color(0xFFFFFFFF)
val BrandSurfaceElevated: Color get() = Color(0xFFFFFCF7)
val BrandSurfaceSoft: Color get() = Color(0xFFFAF5EE)
val BrandTextPrimary: Color get() = Color(0xFF2D1810)
val BrandTextSecondary: Color get() = Color(0xFF6B5549)
val BrandTextMuted: Color get() = Color(0xFF756358)
val BrandBorder: Color get() = Color(0xFFE8D9C8)
val BrandBorderLight: Color get() = Color(0xFFF2E8DB)
val BrandHeaderInk: Color get() = Color(0xFF222222)
val BrandHeaderMuted: Color get() = Color(0xFF717171)
val BrandWhatsApp = Color(0xFF25D366)
val BrandAirbnbRed = Color(0xFFE00B41)

// Pie de página: gradiente café.
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
