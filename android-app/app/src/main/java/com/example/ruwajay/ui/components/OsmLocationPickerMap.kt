package com.example.ruwajay.ui.components

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.example.ruwajay.ui.theme.*
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import org.osmdroid.config.Configuration
import org.osmdroid.events.MapEventsReceiver
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.MapEventsOverlay
import org.osmdroid.views.overlay.Marker
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

private val EsriWorldStreetMapTileSource = object : org.osmdroid.tileprovider.tilesource.OnlineTileSourceBase(
    "EsriWorldStreetMap",
    0, 19, 256, ".png",
    arrayOf("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/")
) {
    override fun getTileURLString(pMapTileIndex: Long): String {
        val zoom = org.osmdroid.util.MapTileIndex.getZoom(pMapTileIndex)
        val y = org.osmdroid.util.MapTileIndex.getY(pMapTileIndex)
        val x = org.osmdroid.util.MapTileIndex.getX(pMapTileIndex)
        return "$baseUrl$zoom/$y/$x"
    }
}

data class GeocodedAddress(
    val fullAddress: String,
    val reference: String,
    val road: String = "",
    val zone: String = "",
    val municipality: String = "",
    val department: String = ""
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OsmLocationPickerMap(
    modifier: Modifier = Modifier,
    initialPoint: GeoPoint = GeoPoint(14.5975, -90.5106), // Default Guatemala City Zone 10
    onLocationSelected: (GeoPoint) -> Unit = {},
    onAddressResolved: (GeocodedAddress) -> Unit = {}
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val keyboardController = LocalSoftwareKeyboardController.current

    var selectedPoint by remember { mutableStateOf(initialPoint) }
    var searchQuery by remember { mutableStateOf("") }
    var isSearching by remember { mutableStateOf(false) }
    var searchResults by remember { mutableStateOf<List<Pair<String, GeoPoint>>>(emptyList()) }
    var showDropdown by remember { mutableStateOf(false) }

    var isLocatingGps by remember { mutableStateOf(false) }
    var gpsNotice by remember { mutableStateOf("") }
    var gpsError by remember { mutableStateOf("") }

    var detectedAddress by remember { mutableStateOf("Ubicación seleccionada en el mapa") }
    var isGeocoding by remember { mutableStateOf(false) }

    // Osmdroid Config
    remember {
        Configuration.getInstance().apply {
            load(context, context.getSharedPreferences("osmdroid", Context.MODE_PRIVATE))
            userAgentValue = "RuwaJay-GT-App/3.0 (info@ruwajay.com)"
            
            val basePath = File(context.filesDir, "osmdroid")
            basePath.mkdirs()
            osmdroidBasePath = basePath
            
            val tileCache = File(context.cacheDir, "osmdroid_tiles_v4")
            tileCache.mkdirs()
            osmdroidTileCache = tileCache
        }
    }

    val mapView = remember {
        MapView(context).apply {
            setTileSource(EsriWorldStreetMapTileSource)
            setMultiTouchControls(true)
            controller.setZoom(16.0)
            controller.setCenter(selectedPoint)
        }
    }

    // Function to perform Reverse Geocoding via Nominatim
    fun resolveAddress(point: GeoPoint) {
        coroutineScope.launch(Dispatchers.IO) {
            try {
                withContext(Dispatchers.Main) { isGeocoding = true }
                val urlStr = "https://nominatim.openstreetmap.org/reverse?format=json&lat=${point.latitude}&lon=${point.longitude}&zoom=18&addressdetails=1"
                val connection = (URL(urlStr).openConnection() as HttpURLConnection).apply {
                    setRequestProperty("User-Agent", "RuwaJay-Guatemala-RealEstateApp/2.4 (https://ruwajay.gt; ruwajay.app@gmail.com)")
                    setRequestProperty("Accept-Language", "es")
                    connectTimeout = 8000
                    readTimeout = 8000
                }

                if (connection.responseCode in 200..299) {
                    val body = connection.inputStream.bufferedReader().use { it.readText() }
                    val json = JSONObject(body)
                    val displayName = json.optString("display_name", "")
                    val addressObj = json.optJSONObject("address")

                    val road = addressObj?.optString("road", "") ?: addressObj?.optString("neighbourhood", "") ?: ""
                    val suburb = addressObj?.optString("suburb", "") ?: addressObj?.optString("city_district", "") ?: ""
                    val city = addressObj?.optString("city", "") ?: addressObj?.optString("town", "") ?: addressObj?.optString("municipality", "") ?: ""
                    val state = addressObj?.optString("state", "") ?: ""

                    val refText = listOf(road, suburb, city).filter { it.isNotBlank() }.joinToString(", ")
                        .ifBlank { displayName.split(",").take(3).joinToString(",") }

                    val resolved = GeocodedAddress(
                        fullAddress = displayName,
                        reference = refText,
                        road = road,
                        zone = suburb,
                        municipality = city,
                        department = state
                    )

                    withContext(Dispatchers.Main) {
                        detectedAddress = refText.ifBlank { "Punto en el mapa" }
                        onAddressResolved(resolved)
                    }
                }
            } catch (_: Exception) {
                withContext(Dispatchers.Main) {
                    detectedAddress = "Lat: ${String.format("%.4f", point.latitude)}, Lng: ${String.format("%.4f", point.longitude)}"
                }
            } finally {
                withContext(Dispatchers.Main) { isGeocoding = false }
            }
        }
    }

    // Function to update point
    fun updatePoint(newPoint: GeoPoint, moveCamera: Boolean = true) {
        selectedPoint = newPoint
        onLocationSelected(newPoint)
        resolveAddress(newPoint)
        if (moveCamera) {
            mapView.controller.animateTo(newPoint)
        }
    }

    // Function to search locations
    fun searchAddress(query: String) {
        if (query.isBlank()) return
        coroutineScope.launch(Dispatchers.IO) {
            try {
                withContext(Dispatchers.Main) {
                    isSearching = true
                    showDropdown = true
                }
                val qEncoded = URLEncoder.encode(if (query.contains("guatemala", ignoreCase = true)) query else "$query, Guatemala", "UTF-8")
                val urlStr = "https://nominatim.openstreetmap.org/search?format=json&q=$qEncoded&countrycodes=gt&limit=5"
                val connection = (URL(urlStr).openConnection() as HttpURLConnection).apply {
                    setRequestProperty("User-Agent", "RuwaJay-Guatemala-RealEstateApp/2.4 (https://ruwajay.gt; ruwajay.app@gmail.com)")
                    setRequestProperty("Accept-Language", "es")
                    connectTimeout = 8000
                    readTimeout = 8000
                }

                if (connection.responseCode in 200..299) {
                    val body = connection.inputStream.bufferedReader().use { it.readText() }
                    val array = JSONArray(body)
                    val items = mutableListOf<Pair<String, GeoPoint>>()
                    for (i in 0 until array.length()) {
                        val obj = array.getJSONObject(i)
                        val name = obj.optString("display_name", "")
                        val lat = obj.optDouble("lat", 0.0)
                        val lon = obj.optDouble("lon", 0.0)
                        if (lat != 0.0 && lon != 0.0) {
                            items.add(name to GeoPoint(lat, lon))
                        }
                    }
                    withContext(Dispatchers.Main) {
                        searchResults = items
                    }
                }
            } catch (_: Exception) {
                withContext(Dispatchers.Main) {
                    searchResults = emptyList()
                }
            } finally {
                withContext(Dispatchers.Main) { isSearching = false }
            }
        }
    }

    // Function to handle GPS location
    @SuppressLint("MissingPermission")
    fun locateCurrentGps() {
        val hasCoarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

        if (!hasCoarse && !hasFine) {
            gpsError = "Se requieren permisos de GPS para detectar tu ubicación."
            return
        }

        isLocatingGps = true
        gpsError = ""
        gpsNotice = ""

        try {
            val fusedClient = LocationServices.getFusedLocationProviderClient(context)
            fusedClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
                .addOnSuccessListener { loc ->
                    isLocatingGps = false
                    if (loc != null) {
                        val pt = GeoPoint(loc.latitude, loc.longitude)
                        gpsNotice = "GPS fijado (Precisión ±${loc.accuracy.toInt()}m)"
                        updatePoint(pt, moveCamera = true)
                    } else {
                        gpsError = "No se pudo obtener señal GPS. Intenta seleccionar en el mapa."
                    }
                }
                .addOnFailureListener {
                    isLocatingGps = false
                    gpsError = "Error al comunicarse con el sensor GPS."
                }
        } catch (_: Exception) {
            isLocatingGps = false
            gpsError = "No se pudo iniciar el servicio de GPS."
        }
    }

    // Redraw Map Overlays on selectedPoint change
    DisposableEffect(mapView, selectedPoint) {
        mapView.onResume()
        mapView.overlays.clear()

        // 1. Map Touch Event Overlay
        val mapEventsReceiver = object : MapEventsReceiver {
            override fun singleTapConfirmedHelper(p: GeoPoint?): Boolean {
                p?.let { updatePoint(it, moveCamera = false) }
                return true
            }

            override fun longPressHelper(p: GeoPoint?): Boolean {
                p?.let { updatePoint(it, moveCamera = true) }
                return true
            }
        }
        mapView.overlays.add(MapEventsOverlay(mapEventsReceiver))

        // 2. Interactive Red Pin Marker
        val marker = Marker(mapView).apply {
            position = selectedPoint
            title = "Ubicación de la Vivienda"
            snippet = detectedAddress
            isDraggable = true
            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
            setOnMarkerDragListener(object : Marker.OnMarkerDragListener {
                override fun onMarkerDrag(m: Marker?) {}
                override fun onMarkerDragStart(m: Marker?) {}
                override fun onMarkerDragEnd(m: Marker?) {
                    m?.position?.let { updatePoint(it, moveCamera = false) }
                }
            })
        }
        mapView.overlays.add(marker)
        mapView.invalidate()

        onDispose {
            mapView.onPause()
        }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        // ── BARRA SUPERIOR: Búsqueda y Botón GPS ──
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Buscar zona o dirección...", fontSize = 12.sp, color = BrandTextMuted) },
                leadingIcon = { Icon(Icons.Default.Search, null, tint = BrandCafe, modifier = Modifier.size(18.dp)) },
                trailingIcon = {
                    if (isSearching) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = BrandForest)
                    } else if (searchQuery.isNotBlank()) {
                        IconButton(onClick = { searchQuery = ""; showDropdown = false }) {
                            Icon(Icons.Default.Close, null, tint = BrandCafe, modifier = Modifier.size(16.dp))
                        }
                    }
                },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = {
                    keyboardController?.hide()
                    searchAddress(searchQuery)
                }),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedContainerColor = Color.White,
                    focusedContainerColor = Color.White,
                    focusedBorderColor = BrandForest,
                    unfocusedBorderColor = BrandBorderLight
                ),
                modifier = Modifier.weight(1f)
            )

            Button(
                onClick = { locateCurrentGps() },
                enabled = !isLocatingGps,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 12.dp)
            ) {
                if (isLocatingGps) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Default.MyLocation, null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("GPS", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }

        // ── NOTIFICACIONES DE GPS Y GEOLOCALIZACIÓN ──
        if (gpsNotice.isNotBlank()) {
            Surface(
                color = Color(0xFFECFDF5),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)
            ) {
                Row(modifier = Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF059669), modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(gpsNotice, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF065F46))
                }
            }
        }
        if (gpsError.isNotBlank()) {
            Surface(
                color = Color(0xFFFEF2F2),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)
            ) {
                Row(modifier = Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Error, null, tint = Color(0xFFDC2626), modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(gpsError, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF991B1B))
                }
            }
        }

        // ── RESULTADOS DE BÚSQUEDA DROPDOWN ──
        if (showDropdown && searchResults.isNotEmpty()) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                shadowElevation = 6.dp,
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp)
            ) {
                Column(modifier = Modifier.padding(6.dp)) {
                    Text("Resultados en Guatemala:", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = BrandTextMuted, modifier = Modifier.padding(4.dp))
                    searchResults.forEach { (name, point) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    showDropdown = false
                                    searchQuery = name.split(",").first()
                                    updatePoint(point, moveCamera = true)
                                }
                                .padding(vertical = 8.dp, horizontal = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.LocationOn, null, tint = BrandTerracota, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(name, fontSize = 12.sp, color = BrandCafe, maxLines = 2)
                        }
                        HorizontalDivider(color = BrandBorderLight)
                    }
                }
            }
        }

        // ── MAPA INTERACTIVO BOX ──
        Surface(
            shape = RoundedCornerShape(20.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorderLight),
            shadowElevation = 4.dp,
            modifier = Modifier
                .fillMaxWidth()
                .height(300.dp)
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                AndroidView(
                    factory = { mapView },
                    modifier = Modifier.fillMaxSize()
                )

                // Indicador flotante superior
                Surface(
                    color = BrandCafe.copy(alpha = 0.88f),
                    shape = RoundedCornerShape(50.dp),
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = 10.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.TouchApp, null, tint = BrandGold, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            "Toca o arrastra el pin rojo para marcar la ubicación",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                // Barra flotante inferior con la dirección resuelta
                Surface(
                    color = Color.White.copy(alpha = 0.95f),
                    shape = RoundedCornerShape(16.dp),
                    shadowElevation = 6.dp,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(10.dp)
                        .fillMaxWidth(0.95f)
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            color = BrandTerracota.copy(alpha = 0.1f),
                            shape = CircleShape,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                Icon(Icons.Default.Place, null, tint = BrandTerracota, modifier = Modifier.size(18.dp))
                            }
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    if (isGeocoding) "Identificando dirección..." else detectedAddress,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = BrandCafe,
                                    maxLines = 1
                                )
                            }
                            Text(
                                "Lat: ${String.format("%.5f", selectedPoint.latitude)} • Lng: ${String.format("%.5f", selectedPoint.longitude)}",
                                fontSize = 10.sp,
                                color = BrandTextMuted,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        if (isGeocoding) {
                            CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp, color = BrandForest)
                        } else {
                            Icon(Icons.Default.CheckCircle, null, tint = BrandJade, modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
        }
    }
}
