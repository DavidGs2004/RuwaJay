package com.example.ruwajay.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.ruwajay.data.repository.rememberProperties
import com.example.ruwajay.data.repository.fetchRoadRoute
import com.example.ruwajay.data.repository.RoadRoute
import com.example.ruwajay.ui.components.*
import org.osmdroid.util.GeoPoint

@Composable
fun RouteScreen(propertyId: String = "", onNavigateBack: () -> Unit = {}) {
    val context = LocalContext.current
    val property = rememberProperties().find { it.id == propertyId }
    val gps = rememberGpsPosition()
    var walking by remember { mutableStateOf(false) }
    var route by remember { mutableStateOf<RoadRoute?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val coordinates = property?.location?.mapCoordinates
    val destination = remember(coordinates) { coordinates?.let { GeoPoint(it.lat,it.lng) } }
    LaunchedEffect(gps.point?.latitude, gps.point?.longitude, destination, walking) {
        val origin = gps.point
        route = null
        if (origin != null && destination != null) {
            loading = true; error = null
            try { route = fetchRoadRoute(origin, destination, walking) }
            catch (cancelled: kotlinx.coroutines.CancellationException) { throw cancelled }
            catch (failure: Exception) { error = failure.message }
            finally { loading = false }
        }
    }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        TextButton(onClick = onNavigateBack) { Text("Volver a la vivienda") }
        Text(property?.title ?: "Vivienda no encontrada", style = MaterialTheme.typography.titleLarge)
        if (coordinates == null) { Text("Esta vivienda no tiene una ubicacion confirmada."); return@Column }
        Button(onClick = gps.request) { Text(if (gps.point == null) "Usar mi ubicacion" else "Actualizar permisos de ubicacion") }
        gps.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        if (gps.point == null) Text("Esperando ubicacion real. Activa el GPS y permite el acceso.")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(selected = !walking, onClick = { walking = false }, label = { Text("Vehiculo") })
            FilterChip(selected = walking, onClick = { walking = true }, label = { Text("A pie") })
        }
        if (loading) CircularProgressIndicator()
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        route?.let { road -> Text("%.1f km - %d min estimados".format(road.distanceMeters/1000, (road.durationSeconds/60).toInt())) }
        Text(if(route?.trafficAware==true) "Estimacion con datos de trafico del proveedor." else "Las estimaciones no incluyen trafico en vivo.", style = MaterialTheme.typography.bodySmall)
        OsmMapView(modifier = Modifier.fillMaxWidth().height(360.dp), center = destination!!,
            userPosition = gps.point, showTopBadges = false,
            markers = listOf(OsmMarker(id = propertyId, position = destination, title = property?.title ?: "Destino", isDestination = true)),
            trafficSegments = route?.let { listOf(TrafficSegment(it.points, Color(0xFF168A55))) } ?: emptyList())
        Button(onClick = {
            val mode = if (walking) "walking" else "driving"
            val origin = gps.point?.let { "&origin=${it.latitude},${it.longitude}" } ?: ""
            val uri = Uri.parse("https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}&travelmode=$mode$origin")
            try { context.startActivity(Intent(Intent.ACTION_VIEW, uri)) } catch (_: Exception) { error = "No se pudo abrir la navegacion." }
        }) { Text("Iniciar navegacion en Google Maps") }
        OutlinedButton(onClick = {
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT,"Visita a ${property?.title}: https://ruwa-jay.web.app/ruta?property=$propertyId")
            }
            context.startActivity(Intent.createChooser(intent,"Compartir ruta"))
        }) { Text("Compartir destino") }
        route?.instructions?.forEachIndexed { index, instruction -> Text("${index + 1}. $instruction") }
    }
}
