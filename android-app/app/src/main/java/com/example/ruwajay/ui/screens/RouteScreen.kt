package com.example.ruwajay.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.data.repository.rememberProperties
import com.example.ruwajay.ui.theme.*
import com.example.ruwajay.ui.components.OsmMapView
import com.example.ruwajay.ui.components.OsmMarker
import org.osmdroid.util.GeoPoint
import kotlin.math.*

@Composable
fun RouteScreen(propertyId: String = "", onNavigateBack: () -> Unit = {}) {
    val context = LocalContext.current
    val demoProperty = rememberProperties().find { it.id == propertyId }
        ?: rememberProperties().first()

    var mode by remember { mutableStateOf("driving") }

    // User position fallback (Guatemala City center)
    val originLat = 14.6349
    val originLng = -90.5069
    val destLat = demoProperty.location.coordinates.lat
    val destLng = demoProperty.location.coordinates.lng

    // Haversine distance
    val rawDistKm = remember(originLat, originLng, destLat, destLng) {
        val R = 6371.0
        val dLat = Math.toRadians(destLat - originLat)
        val dLng = Math.toRadians(destLng - originLng)
        val a = sin(dLat / 2).pow(2) + cos(Math.toRadians(originLat)) * cos(Math.toRadians(destLat)) * sin(dLng / 2).pow(2)
        R * 2 * atan2(sqrt(a), sqrt(1 - a))
    }

    val drivingTimeMins = maxOf(5, (rawDistKm * 2.5 + 4).roundToInt())
    val walkingTimeMins = maxOf(10, (rawDistKm * 14).roundToInt())
    val distText = if (rawDistKm < 1) "${(rawDistKm * 1000).roundToInt()} m" else String.format("%.1f km", rawDistKm)
    val timeText = if (mode == "driving") "$drivingTimeMins min" else "$walkingTimeMins min"

    val wazeUrl = "https://waze.com/ul?ll=$destLat,$destLng&navigate=yes"
    val googleMapsUrl = "https://www.google.com/maps/dir/?api=1&origin=$originLat,$originLng&destination=$destLat,$destLng&travelmode=${if (mode == "driving") "driving" else "walking"}"

    // Map configuration
    val destination = GeoPoint(destLat, destLng)
    val origin = GeoPoint(originLat, originLng)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandCrema.copy(alpha = 0.3f))
            .verticalScroll(rememberScrollState())
    ) {
        // ── Header ──
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier.clickable { onNavigateBack() },
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.ArrowBack, null, tint = BrandCafe, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Volver", fontWeight = FontWeight.Bold, color = BrandCafe, fontSize = 14.sp)
            }
            Surface(
                color = BrandJade.copy(alpha = 0.1f),
                shape = RoundedCornerShape(50.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.CheckCircle, null, tint = BrandJade, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Visita Confirmada", color = BrandJade, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // ── Banner ──
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.horizontalGradient(listOf(BrandForest, BrandJade)),
                    shape = RoundedCornerShape(0.dp)
                )
                .padding(20.dp)
        ) {
            Column {
                Surface(
                    color = Color.White.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(50.dp)
                ) {
                    Text(
                        "🔓 Dirección exacta desbloqueada",
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    demoProperty.title,
                    color = Color.White,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 22.sp,
                    lineHeight = 28.sp
                )
                Spacer(modifier = Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.Top) {
                    Icon(Icons.Default.LocationOn, null, tint = BrandTerracota, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        "${demoProperty.location.address}, ${demoProperty.location.zone}, ${demoProperty.location.city}",
                        color = Color.White.copy(alpha = 0.9f),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // ── OpenStreetMap ──
        Surface(
            shape = RoundedCornerShape(20.dp),
            shadowElevation = 4.dp,
            modifier = Modifier
                .fillMaxWidth()
                .height(280.dp)
                .padding(horizontal = 16.dp)
        ) {
            OsmMapView(
                center = destination,
                zoom = 14.0,
                markers = listOf(
                    OsmMarker(
                        id = "destination",
                        position = destination,
                        title = demoProperty.title,
                        snippet = demoProperty.location.address
                    ),
                    OsmMarker(
                        id = "origin",
                        position = origin,
                        title = "Tu ubicación",
                        snippet = "Punto de origen"
                    )
                )
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // ── Route Summary Card ──
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color.White,
            shadowElevation = 2.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Navigation, null, tint = Color(0xFF2563EB), modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Resumen del recorrido", fontWeight = FontWeight.ExtraBold, color = BrandCafe, fontSize = 16.sp)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Transport Mode Selector
                Surface(
                    color = BrandCrema,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(modifier = Modifier.padding(4.dp)) {
                        val azulRuta = Color(0xFF2563EB)
                        Surface(
                            color = if (mode == "driving") azulRuta else Color.Transparent,
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f).clickable { mode = "driving" }
                        ) {
                            Row(
                                modifier = Modifier.padding(vertical = 10.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.DirectionsCar,
                                    null,
                                    tint = if (mode == "driving") Color.White else BrandCafe,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    "Automóvil",
                                    color = if (mode == "driving") Color.White else BrandCafe,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                        Surface(
                            color = if (mode == "walking") azulRuta else Color.Transparent,
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f).clickable { mode = "walking" }
                        ) {
                            Row(
                                modifier = Modifier.padding(vertical = 10.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.DirectionsWalk,
                                    null,
                                    tint = if (mode == "walking") Color.White else BrandCafe,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    "Caminando",
                                    color = if (mode == "walking") Color.White else BrandCafe,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Stats
                val azulRuta = Color(0xFF2563EB)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    RouteStatCard(
                        icon = Icons.Default.Schedule,
                        value = timeText,
                        label = "Tiempo estimado",
                        color = azulRuta,
                        modifier = Modifier.weight(1f)
                    )
                    RouteStatCard(
                        icon = Icons.Default.LocationOn,
                        value = distText,
                        label = "Distancia total",
                        color = azulRuta,
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Turn-by-turn mockup
                Text(
                    "INDICACIONES PRINCIPALES",
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    color = BrandCafe,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                TurnStep(1, "Inicia tu recorrido desde tu posición actual hacia la avenida principal.", azulRuta)
                TurnStep(2, "Sigue recto hasta la entrada de ${demoProperty.location.zone}.", azulRuta)
                TurnStep(3, "Destino final: ${demoProperty.location.address}, ${demoProperty.location.city}", BrandTerracota)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // ── Action Buttons ──
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color.White,
            shadowElevation = 2.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Abrir en tu app preferida", fontWeight = FontWeight.ExtraBold, color = BrandCafe, fontSize = 15.sp)
                Spacer(modifier = Modifier.height(12.dp))

                // Waze
                Button(
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(wazeUrl)))
                    },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF33CCFF))
                ) {
                    Icon(Icons.Default.OpenInNew, null, tint = BrandCafe)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Abrir en Waze", fontWeight = FontWeight.Bold, color = BrandCafe)
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Google Maps
                Button(
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(googleMapsUrl)))
                    },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4285F4))
                ) {
                    Icon(Icons.Default.OpenInNew, null, tint = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Abrir en Google Maps", fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Share
                OutlinedButton(
                    onClick = {
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_SUBJECT, "Ruta a ${demoProperty.title}")
                            putExtra(Intent.EXTRA_TEXT, "Voy en camino a la propiedad: ${demoProperty.location.address}.\n$googleMapsUrl")
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "Compartir ruta"))
                    },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Share, null, tint = BrandForest, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Compartir recorrido de confianza", fontWeight = FontWeight.Bold, color = BrandCafe, fontSize = 13.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // ── Safety Card ──
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = BrandCrema.copy(alpha = 0.8f),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
                Icon(Icons.Default.Shield, null, tint = BrandTerracota, modifier = Modifier.size(22.dp))
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text("Recomendación de seguridad:", fontWeight = FontWeight.Bold, color = BrandCafe, fontSize = 12.sp)
                    Text(
                        "Revisa la propiedad en persona antes de realizar cualquier tipo de depósito. RuwaJay no requiere pagos por adelantado para visitar.",
                        color = BrandTextSecondary,
                        fontSize = 11.sp,
                        lineHeight = 16.sp
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun RouteStatCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    value: String,
    label: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        color = color.copy(alpha = 0.05f),
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, color.copy(alpha = 0.1f)),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, null, tint = color, modifier = Modifier.size(22.dp))
            Spacer(modifier = Modifier.height(4.dp))
            Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = BrandCafe)
            Text(label, fontSize = 10.sp, color = BrandTextMuted, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun TurnStep(number: Int, instruction: String, color: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .background(BrandCrema.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.Top
    ) {
        Surface(
            color = color,
            shape = CircleShape,
            modifier = Modifier.size(24.dp)
        ) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                Text(number.toString(), color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
        Spacer(modifier = Modifier.width(10.dp))
        Text(instruction, color = BrandCafe, fontSize = 13.sp, fontWeight = FontWeight.Medium, lineHeight = 18.sp)
    }
}

