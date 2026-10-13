package com.example.ruwajay.ui.theme

import androidx.compose.ui.graphics.Color

// Primary Palette — identical to web index.css
val BrandForest = Color(0xFF0B5D3B)
val BrandForestLight = Color(0xFF0E7048)
val BrandForestDark = Color(0xFF084A2F)
val BrandJade = Color(0xFF168A55)
val BrandJadeLight = Color(0xFF1EA364)
val BrandTerracota = Color(0xFFD84420)
val BrandTerracotaLight = Color(0xFFE65A38)
val BrandTerracotaDark = Color(0xFFB8381A)
val BrandOrange = Color(0xFFF07824)
val BrandGold = Color(0xFFD4962A)
val BrandGoldLight = Color(0xFFE6B04A)
val BrandGoldMuted = Color(0xFFC8A95E)
val BrandCafe = Color(0xFF3B2118)
val BrandCafeLight = Color(0xFF5C3D30)
val BrandCrema = Color(0xFFFBF3E8)
val BrandCremaDark = Color(0xFFF0E2CF)
val BrandCremaWarm = Color(0xFFF7EAD8)
val BrandAzulRuta = Color(0xFF2477C9)
val BrandAzulRutaLight = Color(0xFF3A8FD9)

// Surface & Neutrals
val BrandSurface = Color(0xFFFBF3E8)
val BrandSurfaceCard = Color(0xFFFFFFFF)
val BrandSurfaceElevated = Color(0xFFFFFCF7)
val BrandTextPrimary = Color(0xFF2D1810)
val BrandTextSecondary = Color(0xFF6B5549)
val BrandTextMuted = Color(0xFF9E8C82)
val BrandBorder = Color(0xFFE8D9C8)
val BrandBorderLight = Color(0xFFF2E8DB)

// Signature Brand Gradients
val BrandGradientAccent = androidx.compose.ui.graphics.Brush.horizontalGradient(
    listOf(BrandForest, BrandGold, BrandTerracota)
)
val BrandGradientHero = androidx.compose.ui.graphics.Brush.verticalGradient(
    listOf(BrandForestDark.copy(alpha = 0.85f), BrandForest.copy(alpha = 0.65f), androidx.compose.ui.graphics.Color.Transparent)
)
val BrandGradientSunset = androidx.compose.ui.graphics.Brush.horizontalGradient(
    listOf(BrandOrange, BrandGold)
)
val BrandGradientForest = androidx.compose.ui.graphics.Brush.horizontalGradient(
    listOf(BrandForestDark, BrandForest)
)