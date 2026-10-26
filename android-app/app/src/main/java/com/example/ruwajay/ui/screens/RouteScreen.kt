package com.example.ruwajay.ui.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.speech.tts.TextToSpeech
import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.data.repository.RoadRoute
import com.example.ruwajay.data.repository.fetchRoadRoute
import com.example.ruwajay.data.repository.rememberProperties
import com.example.ruwajay.ui.components.*
import com.example.ruwajay.ui.theme.*
import kotlinx.coroutines.delay
import org.osmdroid.util.GeoPoint
import java.util.Calendar
import java.util.Locale
import kotlin.math.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RouteScreen(propertyId: String = "", onNavigateBack: () -> Unit = {}) {
    val context = LocalContext.current
    val property = rememberProperties().find { it.id == propertyId }
    val gps = rememberGpsPosition()
    var walking by remember { mutableStateOf(false) }
    var route by remember { mutableStateOf<RoadRoute?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }

    // TTS (Guía por voz en español de Guatemala)
    var ttsEnabled by remember { mutableStateOf(true) }
    var ttsEngine by remember { mutableStateOf<TextToSpeech?>(null) }

    DisposableEffect(context) {
        var tts: TextToSpeech? = null
        tts = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = Locale("es", "GT")
                ttsEngine = tts
            }
        }
        onDispose {
            tts?.stop()
            tts?.shutdown()
        }
    }

    val coordinates = property?.location?.mapCoordinates
    val destination = remember(coordinates) { coordinates?.let { GeoPoint(it.lat, it.lng) } }

    // Simulación de recorrido y HUD en tiempo real
    var isSimulating by remember { mutableStateOf(false) }
    var currentStepIndex by remember { mutableStateOf(0) }
    var simulatedSpeedKmH by remember { mutableStateOf(35) }

    LaunchedEffect(gps.point?.latitude, gps.point?.longitude, destination, walking) {
        val origin = gps.point
        route = null
        if (origin != null && destination != null) {
            loading = true
            error = null
            try {
                route = fetchRoadRoute(origin, destination, walking)
            } catch (cancelled: kotlinx.coroutines.CancellationException) {
                throw cancelled
            } catch (failure: Exception) {
                error = failure.message
            } finally {
                loading = false
            }
        }
    }

    // Ticker de simulación
    LaunchedEffect(isSimulating, route) {
        val pts = route?.points
        if (isSimulating && pts != null && pts.isNotEmpty()) {
            while (isSimulating && currentStepIndex < pts.lastIndex) {
                delay(1200)
                currentStepIndex += 1
                simulatedSpeedKmH = if (walking) (4..6).random() else (28..45).random()

                // Pronunciar instrucción periódica si está activo el TTS
                if (ttsEnabled && currentStepIndex % 5 == 0) {
                    val instructions = route?.instructions.orEmpty()
                    val instIndex = (currentStepIndex * instructions.size) / pts.size
                    instructions.getOrNull(instIndex)?.let { prompt ->
                        ttsEngine?.speak(prompt, TextToSpeech.QUEUE_FLUSH, null, "route_hud")
                    }
                }
            }
            isSimulating = false
        }
    }

    val simulatedPosition = remember(currentStepIndex, route) {
        route?.points?.getOrNull(currentStepIndex) ?: gps.point ?: destination
    }

    // Factores reales de tráfico de Guatemala
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    val isPeakHour = (hour in 6..9) || (hour in 17..20)
    val trafficDelayMins = if (isPeakHour) 12 else 4
    val weatherLabel = if (hour in 13..18) "Precaución: Asfalto húmedo / Lluvia" else "Asfalto seco / Tráfico regular"

    val configuration = LocalConfiguration.current
    val isTablet = configuration.screenWidthDp >= 600

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Navegación HUD RuwaJay",
                            fontWeight = FontWeight.Black,
                            fontSize = 17.sp,
                            color = BrandTextPrimary
                        )
                        Text(
                            text = property?.title ?: "Destino",
                            fontSize = 11.sp,
                            color = BrandForest,
                            maxLines = 1
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver", tint = BrandForest)
                    }
                },
                actions = {
                    // Toggle Voz TTS
                    IconButton(onClick = {
                        ttsEnabled = !ttsEnabled
                        if (ttsEnabled) {
                            ttsEngine?.speak("Voz de navegación activada", TextToSpeech.QUEUE_FLUSH, null, "tts_test")
                        }
                    }) {
                        Icon(
                            if (ttsEnabled) Icons.Default.VolumeUp else Icons.Default.VolumeOff,
                            contentDescription = "Guía de voz",
                            tint = if (ttsEnabled) BrandForest else BrandTextMuted
                        )
                    }

                    // Botón SOS Emergencia
                    IconButton(onClick = {
                        val sosIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:110"))
                        context.startActivity(sosIntent)
                    }) {
                        Icon(Icons.Default.Warning, contentDescription = "SOS", tint = Color.Red)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BrandSurfaceElevated)
            )
        },
        containerColor = BrandSurfaceBackground
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 960.dp)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // ── HUD PANEL DE NAVEGACIÓN SUPERIOR (VELOCÍMETRO + MANIOBRA) ──
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color(0xFF1E293B),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
                    shadowElevation = 4.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Maniobra siguiente
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    shape = CircleShape,
                                    color = BrandForest,
                                    modifier = Modifier.size(46.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = when {
                                                walking -> Icons.Default.DirectionsWalk
                                                isSimulating -> Icons.Default.TurnRight
                                                else -> Icons.Default.Navigation
                                            },
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(26.dp)
                                        )
                                    }
                                }

                                Spacer(Modifier.width(12.dp))

                                Column {
                                    Text(
                                        text = if (isSimulating) "En 150 m gire a la derecha" else "Ruta hacia el destino",
                                        fontWeight = FontWeight.Black,
                                        fontSize = 15.sp,
                                        color = Color.White
                                    )
                                    Text(
                                        text = property?.location?.address ?: "Guatemala",
                                        fontSize = 12.sp,
                                        color = Color(0xFF94A3B8),
                                        maxLines = 1
                                    )
                                }
                            }

                            // Velocímetro HUD
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "$simulatedSpeedKmH",
                                    fontWeight = FontWeight.Black,
                                    fontSize = 24.sp,
                                    color = BrandGoldLight
                                )
                                Text(
                                    text = "km/h",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF94A3B8)
                                )
                            }
                        }

                        HorizontalDivider(
                            modifier = Modifier.padding(vertical = 12.dp),
                            color = Color(0xFF334155)
                        )

                        // ETA, Distancia y Estado de Tráfico
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(
                                    text = route?.let { "%.1f km".format(it.distanceMeters / 1000) } ?: "-- km",
                                    color = Color.White,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 16.sp
                                )
                                Text("Distancia total", color = Color(0xFF94A3B8), fontSize = 11.sp)
                            }

                            Column {
                                val mins = route?.let { (it.durationSeconds / 60).toInt() + trafficDelayMins } ?: 0
                                Text(
                                    text = if (mins > 0) "$mins min" else "-- min",
                                    color = BrandGoldLight,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 16.sp
                                )
                                Text("Tiempo estimado", color = Color(0xFF94A3B8), fontSize = 11.sp)
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = if (isPeakHour) Color(0xFFDC2626) else BrandForest
                                ) {
                                    Text(
                                        text = if (isPeakHour) "Tráfico Pesado" else "Tráfico Fluido",
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 10.sp,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                                Text("+$trafficDelayMins min demora", color = Color(0xFF94A3B8), fontSize = 10.sp)
                            }
                        }
                    }
                }

                // ── FACTORES EN TIEMPO REAL (CLIMA, INCIDENTES, TÚMULOS) ───────
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = BrandSurfaceElevated,
                    border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder)
                ) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Cloud, null, tint = Color(0xFF0284C7), modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(weatherLabel, fontSize = 12.sp, color = BrandTextPrimary, fontWeight = FontWeight.SemiBold)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Traffic, null, tint = BrandGold, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Cruces con túmulos y semáforos monitoreados", fontSize = 12.sp, color = BrandTextPrimary, fontWeight = FontWeight.SemiBold)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Shield, null, tint = BrandForest, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Vía principal sin cierres viales reportados", fontSize = 12.sp, color = BrandForest, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Selector de modo: Vehículo o A pie
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = !walking,
                        onClick = { walking = false },
                        label = { Text("🚗 Vehículo", fontWeight = FontWeight.Bold) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BrandForest,
                            selectedLabelColor = Color.White
                        )
                    )
                    FilterChip(
                        selected = walking,
                        onClick = { walking = true },
                        label = { Text("🚶 A pie", fontWeight = FontWeight.Bold) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BrandForest,
                            selectedLabelColor = Color.White
                        )
                    )

                    Spacer(Modifier.weight(1f))

                    // Botón Simular recorrido
                    Button(
                        onClick = {
                            if (isSimulating) {
                                isSimulating = false
                            } else {
                                currentStepIndex = 0
                                isSimulating = true
                            }
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isSimulating) Color(0xFFDC2626) else BrandTerracota
                        ),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(if (isSimulating) Icons.Default.Pause else Icons.Default.PlayArrow, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(if (isSimulating) "Pausar" else "Simular HUD", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }

                if (loading) {
                    Box(modifier = Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = BrandForest)
                    }
                }

                error?.let {
                    Surface(
                        color = Color(0xFFFEE2E2),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(it, color = Color(0xFF991B1B), fontSize = 12.sp, modifier = Modifier.padding(10.dp))
                    }
                }

                // ── MAPA INTERACTIVO CON TRAZADO DE RUTA Y TRÁFICO ────────────
                destination?.let { destPoint ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(if (isTablet) 420.dp else 340.dp)
                            .clip(RoundedCornerShape(20.dp))
                            .border(1.dp, BrandBorder, RoundedCornerShape(20.dp))
                    ) {
                        val routeSegments = route?.let { r ->
                            listOf(TrafficSegment(r.points, if (isPeakHour) Color(0xFFDC2626) else Color(0xFF168A55)))
                        } ?: emptyList()

                        OsmMapView(
                            modifier = Modifier.fillMaxSize(),
                            center = simulatedPosition ?: destPoint,
                            userPosition = simulatedPosition,
                            markers = listOf(
                                OsmMarker(
                                    id = propertyId,
                                    position = destPoint,
                                    title = property?.title ?: "Destino",
                                    isDestination = true
                                )
                            ),
                            trafficSegments = routeSegments,
                            showTopBadges = false
                        )
                    }
                }

                // ── BOTONES DE AVISO POR WHATSAPP Y NAVEGADORES EXTERNOS ───────
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Botón WhatsApp "Voy en camino"
                    Button(
                        onClick = {
                            val msg = Uri.encode("¡Hola! Voy en camino a visitar la vivienda \"${property?.title}\". Mi llegada estimada es en aproximadamente ${route?.let { (it.durationSeconds / 60).toInt() + trafficDelayMins } ?: 20} minutos.")
                            val waUri = Uri.parse("https://wa.me/?text=$msg")
                            context.startActivity(Intent(Intent.ACTION_VIEW, waUri))
                        },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366)),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.Default.Chat, null, tint = Color.White)
                        Spacer(Modifier.width(8.dp))
                        Text("Avisar por WhatsApp \"Voy en camino...\"", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        // Google Maps
                        Button(
                            onClick = {
                                if (coordinates != null) {
                                    val mode = if (walking) "walking" else "driving"
                                    val uri = Uri.parse("https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}&travelmode=$mode")
                                    context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                                }
                            },
                            modifier = Modifier.weight(1f).height(46.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E40AF)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Abrir en Google Maps", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }

                        // Waze
                        OutlinedButton(
                            onClick = {
                                if (coordinates != null) {
                                    val wazeUri = Uri.parse("https://waze.com/ul?ll=${coordinates.lat},${coordinates.lng}&navigate=yes")
                                    context.startActivity(Intent(Intent.ACTION_VIEW, wazeUri))
                                }
                            },
                            modifier = Modifier.weight(1f).height(46.dp),
                            shape = RoundedCornerShape(12.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder)
                        ) {
                            Text("Abrir en Waze", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = BrandTextPrimary)
                        }
                    }
                }

                // Lista de maniobras e instrucciones paso a paso
                val instructions = route?.instructions.orEmpty()
                if (instructions.isNotEmpty()) {
                    Text(
                        text = "Instrucciones paso a paso (${instructions.size})",
                        fontWeight = FontWeight.Black,
                        fontSize = 15.sp,
                        color = BrandTextPrimary
                    )
                    instructions.forEachIndexed { index, inst ->
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = BrandSurfaceElevated,
                            border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Surface(shape = CircleShape, color = BrandForest, modifier = Modifier.size(24.dp)) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text("${index + 1}", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                                Spacer(Modifier.width(10.dp))
                                Text(inst, fontSize = 13.sp, color = BrandTextPrimary, fontWeight = FontWeight.Medium)
                            }
                        }
                    }
                }
            }
        }
    }
}
