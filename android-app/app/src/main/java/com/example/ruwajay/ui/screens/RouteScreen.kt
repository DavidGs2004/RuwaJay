package com.example.ruwajay.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.data.repository.rememberProperties
import com.example.ruwajay.ui.components.OsmMapView
import com.example.ruwajay.ui.components.OsmMarker
import com.example.ruwajay.ui.components.TrafficSegment
import com.example.ruwajay.ui.theme.*
import org.osmdroid.util.GeoPoint
import kotlin.math.*

// ─────────────────────────────────────────────────────────────────────────────
// RouteScreen — Premium Navigation Screen matching RuwaJay Web
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun RouteScreen(propertyId: String = "", onNavigateBack: () -> Unit = {}) {
    val context = LocalContext.current
    val properties = rememberProperties()
    val demoProperty = properties.find { it.id == propertyId } ?: properties.firstOrNull()

    if (demoProperty == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = BrandForest)
        }
        return
    }

    var mode by remember { mutableStateOf("driving") }
    var isSimulating by remember { mutableStateOf(false) }

    val originLat = 14.6349
    val originLng = -90.5069
    val destLat = demoProperty.location.mapCoordinates?.lat ?: 0.0
    val destLng = demoProperty.location.mapCoordinates?.lng ?: 0.0

    val origin = remember { GeoPoint(originLat, originLng) }
    val destination = remember { GeoPoint(destLat, destLng) }

    // Distance (Haversine)
    val rawDistKm = remember(originLat, originLng, destLat, destLng) {
        val R = 6371.0
        val dLat = Math.toRadians(destLat - originLat)
        val dLng = Math.toRadians(destLng - originLng)
        val a = sin(dLat / 2).pow(2) + cos(Math.toRadians(originLat)) * cos(Math.toRadians(destLat)) * sin(dLng / 2).pow(2)
        R * 2 * atan2(sqrt(a), sqrt(1 - a))
    }

    val drivingTimeMins = maxOf(5, (rawDistKm * 2.5 + 4).roundToInt())
    val walkingTimeMins = maxOf(10, (rawDistKm * 14).roundToInt())
    val distText = if (rawDistKm < 1) "${(rawDistKm * 1000).roundToInt()} m" else "%.1f km".format(rawDistKm)
    val timeText = if (mode == "driving") "$drivingTimeMins min" else "$walkingTimeMins min"

    // Waze-style traffic color segments
    val trafficSegments = remember(origin, destination) {
        val points = mutableListOf<GeoPoint>()
        for (i in 0..12) {
            val f = i / 12.0
            points.add(GeoPoint(originLat + (destLat - originLat) * f, originLng + (destLng - originLng) * f))
        }
        listOf(
            TrafficSegment(points.subList(0, 6), Color(0xFF10B981)),   // 🟢 Fluido
            TrafficSegment(points.subList(5, 9), Color(0xFFF59E0B)),   // 🟡 Moderado
            TrafficSegment(points.subList(8, points.size), Color(0xFFEF4444)) // 🔴 Denso
        )
    }

    // Colors matching web
    val wazeCyan = Color(0xFF05C3DD)
    val wazeDark = Color(0xFF0F172A)
    val forestGreen = Color(0xFF0B5D3B)
    val terracota = Color(0xFFD84420)
    val gold = Color(0xFFD4962A)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandCrema.copy(alpha = 0.35f))
            .verticalScroll(rememberScrollState())
    ) {

        // ── TOP NAV BAR ──────────────────────────────────────────────────────
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
                Text("Volver a la propiedad", fontWeight = FontWeight.Bold, color = BrandCafe, fontSize = 14.sp)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                // "Mapa Oficial RuwaJay" badge
                Surface(
                    color = forestGreen.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(50.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, forestGreen.copy(alpha = 0.2f))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Star, null, tint = gold, modifier = Modifier.size(13.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Mapa Oficial RuwaJay", color = forestGreen, fontSize = 10.sp, fontWeight = FontWeight.Black)
                    }
                }
                // "Visita Habilitada" badge
                Surface(
                    color = Color(0xFF168A55).copy(alpha = 0.1f),
                    shape = RoundedCornerShape(50.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF168A55), modifier = Modifier.size(13.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Visita Habilitada", color = Color(0xFF168A55), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // ── HERO BANNER (matches web gradient from-forest via-[#0e7048] to-jade) ──
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.horizontalGradient(
                        listOf(Color(0xFF0B5D3B), Color(0xFF0E7048), Color(0xFF168A55))
                    )
                )
                .padding(20.dp)
        ) {
            Column {
                // "Trazado de Ruta" chip
                Surface(
                    color = Color.White.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(50.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Explore, null, tint = gold, modifier = Modifier.size(13.dp))
                        Spacer(modifier = Modifier.width(5.dp))
                        Text(
                            "Trazado de Ruta y Navegación en Vivo",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    demoProperty.title,
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 22.sp,
                    lineHeight = 28.sp
                )
                Spacer(modifier = Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.Top) {
                    Icon(Icons.Default.LocationOn, null, tint = gold, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        "${demoProperty.location.address}, ${demoProperty.location.zone}, ${demoProperty.location.city}",
                        color = Color.White.copy(alpha = 0.92f),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        lineHeight = 20.sp
                    )
                }
            }

            // Decorative Navigation icon (same as web)
            Icon(
                Icons.Default.Navigation,
                null,
                tint = Color.White.copy(alpha = 0.08f),
                modifier = Modifier
                    .size(180.dp)
                    .align(Alignment.CenterEnd)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // ── MAP (matches web h-[480px] with HUD overlays) ─────────────────────
        Surface(
            shape = RoundedCornerShape(28.dp),
            shadowElevation = 12.dp,
            modifier = Modifier
                .fillMaxWidth()
                .height(480.dp)
                .padding(horizontal = 16.dp)
        ) {
            Box(modifier = Modifier.fillMaxSize()) {

                OsmMapView(
                    center = destination,
                    zoom = 13.5,
                    userPosition = origin,
                    markers = listOf(
                        OsmMarker(
                            id = "destination",
                            position = destination,
                            title = demoProperty.title,
                            snippet = demoProperty.location.address,
                            isDestination = true
                        )
                    ),
                    trafficSegments = trafficSegments,
                    showTopBadges = false
                )

                // ── TOP HUD: Next Maneuver (matches web glassmorphism green bar) ──
                Box(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = 12.dp, start = 12.dp, end = 12.dp)
                        .fillMaxWidth()
                        .background(
                            color = Color(0xFF0B5D3B).copy(alpha = 0.96f),
                            shape = RoundedCornerShape(20.dp)
                        )
                        .padding(horizontal = 14.dp, vertical = 12.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        // Maneuver icon box (terracota)
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .background(terracota, RoundedCornerShape(14.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.Navigation,
                                null,
                                tint = Color.White,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Próxima maniobra · 250m",
                                color = gold,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 0.5.sp
                            )
                            Text(
                                if (isSimulating) "Simulando recorrido en vivo..."
                                else "Avanza hacia ${demoProperty.location.zone}",
                                color = Color.White,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.ExtraBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        // GPS active badge
                        if (isSimulating) {
                            Surface(
                                color = Color(0xFF10B981).copy(alpha = 0.25f),
                                shape = RoundedCornerShape(50.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.GpsFixed, null, tint = Color(0xFF10B981), modifier = Modifier.size(10.dp))
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text("Vivo", color = Color(0xFF10B981), fontSize = 9.sp, fontWeight = FontWeight.Black)
                                }
                            }
                        }
                    }
                }

                // ── BOTTOM HUD: Route metrics + Sim button ──
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 12.dp, start = 12.dp, end = 12.dp)
                        .fillMaxWidth()
                        .background(
                            color = wazeDark.copy(alpha = 0.95f),
                            shape = RoundedCornerShape(20.dp)
                        )
                        .padding(horizontal = 14.dp, vertical = 12.dp)
                ) {
                    Row(
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.Bottom) {
                                Text(timeText, color = wazeCyan, fontSize = 28.sp, fontWeight = FontWeight.Black)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(distText, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            }
                            Text(
                                "🟢 Tráfico Fluido (82%)",
                                color = Color(0xFF10B981),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold
                            )
                        }
                        Button(
                            onClick = { isSimulating = !isSimulating },
                            colors = ButtonDefaults.buttonColors(containerColor = wazeCyan),
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                        ) {
                            Icon(
                                if (isSimulating) Icons.Default.Pause else Icons.Default.PlayArrow,
                                null,
                                tint = wazeDark,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                if (isSimulating) "Pausar" else "Simular GPS",
                                color = wazeDark,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Black
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // ─────────────────────────────────────────────────────────────────────
        // ── ROUTE SUMMARY CARD (matches web md:col-span-2 section) ──
        // ─────────────────────────────────────────────────────────────────────
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = Color.White,
            shadowElevation = 4.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {

                // Header + mode toggle
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Navigation, null, tint = forestGreen, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Resumen de Ruta RuwaJay", fontWeight = FontWeight.Black, color = BrandCafe, fontSize = 16.sp)
                        }
                        Text(
                            "Trayectoria calculada en tiempo real",
                            color = BrandTextMuted,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Transport mode selector (matches web grid w-full grid-cols-2)
                Surface(
                    color = BrandCrema,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(modifier = Modifier.padding(4.dp)) {
                        ModeTab(
                            icon = Icons.Default.DirectionsCar,
                            label = "Automóvil",
                            isActive = mode == "driving",
                            activeColor = wazeDark,
                            modifier = Modifier.weight(1f)
                        ) { mode = "driving" }
                        ModeTab(
                            icon = Icons.Default.DirectionsWalk,
                            label = "Caminando",
                            isActive = mode == "walking",
                            activeColor = wazeDark,
                            modifier = Modifier.weight(1f)
                        ) { mode = "walking" }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // ── Punto A / Punto B (matches web Origin vs Destination card) ──
                Surface(
                    color = BrandCrema.copy(alpha = 0.5f),
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorderLight),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        // Punto A — User location
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(forestGreen, RoundedCornerShape(12.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.MyLocation, null, tint = gold, modifier = Modifier.size(20.dp))
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    "PUNTO A · DÓNDE ESTÁS TÚ",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Black,
                                    color = forestGreen,
                                    letterSpacing = 0.8.sp
                                )
                                Text("Tu ubicación de referencia (GPS)", fontWeight = FontWeight.ExtraBold, color = BrandCafe, fontSize = 13.sp)
                                Text(
                                    "Coordenadas: %.4f, %.4f".format(originLat, originLng),
                                    color = BrandTextMuted,
                                    fontSize = 11.sp
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        HorizontalDivider(color = BrandBorderLight)
                        Spacer(modifier = Modifier.height(8.dp))

                        // Punto B — Destination
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(terracota, RoundedCornerShape(12.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Home, null, tint = Color.White, modifier = Modifier.size(20.dp))
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    "PUNTO B · HACIA DÓNDE VAS",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Black,
                                    color = terracota,
                                    letterSpacing = 0.8.sp
                                )
                                Text(
                                    demoProperty.title,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = BrandCafe,
                                    fontSize = 13.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    demoProperty.location.address,
                                    color = BrandTextMuted,
                                    fontSize = 11.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // ── Metric widgets (matches web rounded-2xl border bg-forest/5) ──
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    RouteMetricWidget(
                        icon = Icons.Default.Schedule,
                        value = timeText,
                        label = "Tiempo Estimado de Viaje",
                        borderColor = forestGreen,
                        bgColor = forestGreen.copy(alpha = 0.05f),
                        iconTint = forestGreen,
                        modifier = Modifier.weight(1f)
                    )
                    RouteMetricWidget(
                        icon = Icons.Default.LocationOn,
                        value = distText,
                        label = "Distancia Vial Directa",
                        borderColor = terracota,
                        bgColor = terracota.copy(alpha = 0.05f),
                        iconTint = terracota,
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(18.dp))

                // ── Step-by-step route guidance ──
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Shield, null, tint = Color(0xFF168A55), modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            "Pauta de Llegada y Puntos de Referencia",
                            fontWeight = FontWeight.ExtraBold,
                            color = BrandCafe,
                            fontSize = 13.sp
                        )
                    }
                    Surface(
                        color = forestGreen.copy(alpha = 0.1f),
                        shape = RoundedCornerShape(50.dp)
                    ) {
                        Text(
                            "Sector Seguro",
                            color = forestGreen,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Step 1
                NavigationStep(
                    number = 1,
                    title = "Punto de partida configurado",
                    desc = "Inicia tu trayecto guiándote por la línea trazada en el mapa superior.",
                    numberColor = forestGreen,
                    containerColor = BrandCrema.copy(alpha = 0.7f),
                    borderColor = BrandBorderLight
                )
                Spacer(modifier = Modifier.height(8.dp))

                // Step 2
                NavigationStep(
                    number = 2,
                    title = "Vía principal del sector",
                    desc = "Avanza siguiendo los puntos de control intermedios y el semáforo de tráfico en vivo.",
                    numberColor = gold,
                    containerColor = BrandCrema.copy(alpha = 0.7f),
                    borderColor = BrandBorderLight
                )
                Spacer(modifier = Modifier.height(8.dp))

                // Step 3
                NavigationStep(
                    number = 3,
                    title = "Llegada a la propiedad",
                    desc = "${demoProperty.location.address}, ${demoProperty.location.city}. Presenta tu código de visita al llegar.",
                    numberColor = terracota,
                    containerColor = terracota.copy(alpha = 0.08f),
                    borderColor = terracota.copy(alpha = 0.2f)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // ─────────────────────────────────────────────────────────────────────
        // ── ACTION SIDEBAR (matches web "Coordinar con el Anfitrión" card) ──
        // ─────────────────────────────────────────────────────────────────────
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = Color.White,
            shadowElevation = 4.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Star, null, tint = gold, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Coordinar con el Anfitrión", fontWeight = FontWeight.Black, color = BrandCafe, fontSize = 15.sp)
                }
                Spacer(modifier = Modifier.height(14.dp))

                // WhatsApp button
                Button(
                    onClick = {
                        val phone = "50200000000"
                        val msg = "Hola, voy en camino a la visita de \"${demoProperty.title}\" guiándome con el mapa oficial de RuwaJay. Mi tiempo estimado de llegada es de aproximadamente $timeText ($distText)."
                        val uri = android.net.Uri.parse("https://wa.me/$phone?text=${java.net.URLEncoder.encode(msg, "UTF-8")}")
                        val intent = Intent(Intent.ACTION_VIEW, uri)
                        context.startActivity(intent)
                    },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366)),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(Icons.Default.Message, null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Avisar por WhatsApp: Voy en camino", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Black)
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Share route button
                OutlinedButton(
                    onClick = {
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_SUBJECT, "Ruta Oficial RuwaJay: ${demoProperty.title}")
                            putExtra(Intent.EXTRA_TEXT, "Voy en camino a la visita de ${demoProperty.title} en ${demoProperty.location.address}. Trazado oficial en RuwaJay.")
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "Compartir ruta"))
                    },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = BrandCafe)
                ) {
                    Icon(Icons.Default.Share, null, tint = forestGreen, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Compartir ruta de seguridad", fontWeight = FontWeight.Bold, color = BrandCafe, fontSize = 13.sp)
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Copy GPS coordinates
                var coordsCopied by remember { mutableStateOf(false) }
                OutlinedButton(
                    onClick = {
                        val coords = "%.6f, %.6f".format(destLat, destLng)
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        clipboard.setPrimaryClip(ClipData.newPlainText("GPS", coords))
                        coordsCopied = true
                    },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = BrandCafe)
                ) {
                    Icon(
                        if (coordsCopied) Icons.Default.Check else Icons.Default.ContentCopy,
                        null,
                        tint = if (coordsCopied) Color(0xFF168A55) else terracota,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        if (coordsCopied) "¡Coordenadas copiadas!" else "Copiar Coordenadas GPS RuwaJay",
                        fontWeight = FontWeight.Bold,
                        color = BrandCafe,
                        fontSize = 13.sp
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // ── Safety Notice (matches web bg-[#FFF5E8] rounded-3xl) ──────────
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color(0xFFFFF5E8),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE8D9C8)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.Top) {
                Icon(Icons.Default.Shield, null, tint = terracota, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text("Visita 100% Segura RuwaJay:", fontWeight = FontWeight.Black, color = BrandCafe, fontSize = 12.sp)
                    Text(
                        "Recuerda que no requieres realizar pagos por adelantado para visitar. Verifica el estado físico del inmueble y el contrato antes de transferir.",
                        color = BrandTextSecondary,
                        fontSize = 11.sp,
                        lineHeight = 17.sp,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

// ─── Reusable composables ─────────────────────────────────────────────────────

@Composable
private fun ModeTab(
    icon: ImageVector,
    label: String,
    isActive: Boolean,
    activeColor: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        color = if (isActive) activeColor else Color.Transparent,
        shape = RoundedCornerShape(10.dp),
        modifier = modifier.clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.padding(vertical = 10.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                icon,
                null,
                tint = if (isActive) Color(0xFF05C3DD) else BrandCafe,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(5.dp))
            Text(
                label,
                color = if (isActive) Color.White else BrandCafe,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun RouteMetricWidget(
    icon: ImageVector,
    value: String,
    label: String,
    borderColor: Color,
    bgColor: Color,
    iconTint: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        color = bgColor,
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, borderColor.copy(alpha = 0.15f)),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, null, tint = iconTint, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.height(6.dp))
            Text(value, fontWeight = FontWeight.Black, fontSize = 22.sp, color = BrandCafe)
            Text(label, fontSize = 10.sp, color = BrandTextMuted, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun NavigationStep(
    number: Int,
    title: String,
    desc: String,
    numberColor: Color,
    containerColor: Color,
    borderColor: Color
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(containerColor, RoundedCornerShape(16.dp))
            .border(1.dp, borderColor, RoundedCornerShape(16.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.Top
    ) {
        Surface(
            color = numberColor,
            shape = CircleShape,
            modifier = Modifier.size(26.dp)
        ) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                Text(number.toString(), color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Black)
            }
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(title, color = BrandCafe, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(2.dp))
            Text(desc, color = BrandTextSecondary, fontSize = 11.sp, lineHeight = 16.sp)
        }
    }
}
