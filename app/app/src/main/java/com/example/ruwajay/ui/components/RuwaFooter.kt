package com.example.ruwajay.ui.components

import android.content.Intent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.R
import com.example.ruwajay.ui.theme.*

/**
 * Pie de página institucional oficial de RuwaJay.
 * Compacto, elegante y perfectamente distribuido para teléfonos y tablets.
 */
@Composable
fun RuwaFooter(
    onExploreClick: (() -> Unit)? = null,
    onPublishClick: (() -> Unit)? = null,
    onMapClick: (() -> Unit)? = null,
    onZoneClick: ((String) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(BrandGradientFooter)
    ) {
        // Banda de acento textil tricolor
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(3.dp)
                .background(BrandGradientAccent)
        )

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp, vertical = 16.dp)
        ) {
            // Cabecera: Marca y Botón Compartir Compacto alineados
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Image(
                        painter = painterResource(id = R.drawable.ic_logo),
                        contentDescription = null,
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Row {
                            Text("Ruwa", color = Color.White, fontWeight = FontWeight.Black, fontSize = 17.sp)
                            Text("Jay", color = BrandTerracotaLight, fontWeight = FontWeight.Black, fontSize = 17.sp)
                        }
                        Text(
                            "TU HOGAR, TU CAMINO",
                            color = BrandGoldLight,
                            fontWeight = FontWeight.Bold,
                            fontSize = 8.sp,
                            letterSpacing = 1.sp
                        )
                    }
                }

                // Botón Compartir compacto, horizontal e indeformable
                Surface(
                    shape = RoundedCornerShape(18.dp),
                    color = Color.White.copy(alpha = 0.12f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.16f)),
                    modifier = Modifier
                        .height(32.dp)
                        .clickable {
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, "Descubre viviendas en alquiler en Guatemala con RuwaJay: https://ruwajay.com")
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "Compartir RuwaJay"))
                        }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Share,
                            contentDescription = "Compartir",
                            tint = BrandGoldLight,
                            modifier = Modifier.size(13.dp)
                        )
                        Spacer(modifier = Modifier.width(5.dp))
                        Text(
                            text = "Compartir",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            softWrap = false
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Alquiler mensual transparente y seguro en Guatemala 🇬🇹",
                color = Color.White.copy(alpha = 0.65f),
                fontSize = 11.sp,
                lineHeight = 15.sp
            )

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = Color.White.copy(alpha = 0.10f), thickness = 1.dp)
            Spacer(modifier = Modifier.height(12.dp))

            // Secciones: Explora y Zonas Populares balanceadas en 2 columnas
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Columna Explora
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "EXPLORA",
                        color = BrandGoldLight,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 0.8.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    FooterLink(text = "Buscar vivienda") { onExploreClick?.invoke() }
                    FooterLink(text = "Mapa interactivo") { onMapClick?.invoke() }
                    FooterLink(text = "Publicar propiedad") { onPublishClick?.invoke() }
                }

                // Columna Zonas Populares
                Column(modifier = Modifier.weight(1.15f)) {
                    Text(
                        text = "ZONAS POPULARES",
                        color = BrandGoldLight,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 0.8.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    listOf(
                        "Zona 10, Guatemala",
                        "Zona 14, Guatemala",
                        "Mixco",
                        "Villa Nueva",
                        "Antigua Guatemala"
                    ).forEach { zone ->
                        Text(
                            text = zone,
                            color = Color.White.copy(alpha = 0.80f),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onZoneClick?.invoke(zone) }
                                .padding(vertical = 3.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = Color.White.copy(alpha = 0.10f), thickness = 1.dp)
            Spacer(modifier = Modifier.height(10.dp))

            // Pie: Copyright centrado
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "© 2026 RuwaJay · Todos los derechos reservados",
                    color = Color.White.copy(alpha = 0.42f),
                    fontSize = 10.5.sp,
                    fontWeight = FontWeight.Normal
                )
            }
        }
    }
}

@Composable
private fun FooterLink(text: String, onClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clickable(onClick = onClick)
            .padding(vertical = 3.dp)
    ) {
        Text(
            text = text,
            color = Color.White.copy(alpha = 0.85f),
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.width(3.dp))
        Icon(
            imageVector = Icons.AutoMirrored.Filled.ArrowForward,
            contentDescription = null,
            tint = BrandGoldLight,
            modifier = Modifier.size(10.dp)
        )
    }
}

