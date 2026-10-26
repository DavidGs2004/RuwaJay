package com.example.ruwajay.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Tipografía oficial de RuwaJay (Nunito Sans / SansSerif refinada).
 * Adaptada responsive para teléfonos y tablets.
 */
val NunitoSans = FontFamily.SansSerif

private fun style(weight: FontWeight, size: Int, line: Int) = TextStyle(
    fontFamily = NunitoSans,
    fontWeight = weight,
    fontSize = size.sp,
    lineHeight = line.sp,
    letterSpacing = 0.sp
)

private val base = Typography()

val Typography = Typography(
    displayLarge = base.displayLarge.copy(fontFamily = NunitoSans),
    displayMedium = base.displayMedium.copy(fontFamily = NunitoSans),
    displaySmall = base.displaySmall.copy(fontFamily = NunitoSans),
    headlineLarge = style(FontWeight.ExtraBold, 30, 36),
    headlineMedium = style(FontWeight.ExtraBold, 22, 28),
    headlineSmall = style(FontWeight.ExtraBold, 18, 24),
    titleLarge = style(FontWeight.Bold, 18, 24),
    titleMedium = style(FontWeight.Bold, 15, 21),
    titleSmall = style(FontWeight.Bold, 13, 19),
    bodyLarge = style(FontWeight.Normal, 15, 22),
    bodyMedium = style(FontWeight.Normal, 13, 19),
    bodySmall = style(FontWeight.Normal, 11, 15),
    labelLarge = style(FontWeight.Bold, 13, 19),
    labelMedium = style(FontWeight.Bold, 11, 15),
    labelSmall = style(FontWeight.Bold, 10, 14),
)