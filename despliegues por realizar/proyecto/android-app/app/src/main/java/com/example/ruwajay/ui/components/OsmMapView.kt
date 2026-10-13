package com.example.ruwajay.ui.components

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.OnlineTileSourceBase
import org.osmdroid.util.GeoPoint
import org.osmdroid.util.MapTileIndex
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline
import java.io.File

// ─── Tile Sources ─────────────────────────────────────────────────────────────

private val OsmStreetTileSource = object : OnlineTileSourceBase(
    "OSM_Standard", 0, 19, 256, ".png",
    arrayOf(
        "https://tile.openstreetmap.org/",
        "https://a.tile.openstreetmap.org/",
        "https://b.tile.openstreetmap.org/"
    )
) {
    override fun getTileURLString(pMapTileIndex: Long): String {
        val zoom = MapTileIndex.getZoom(pMapTileIndex)
        val x = MapTileIndex.getX(pMapTileIndex)
        val y = MapTileIndex.getY(pMapTileIndex)
        return "https://tile.openstreetmap.org/$zoom/$x/$y.png"
    }
}

private val EsriSatelliteTileSource = object : OnlineTileSourceBase(
    "EsriSatellite", 0, 19, 256, ".jpg",
    arrayOf("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/")
) {
    override fun getTileURLString(pMapTileIndex: Long): String {
        val zoom = MapTileIndex.getZoom(pMapTileIndex)
        val y = MapTileIndex.getY(pMapTileIndex)
        val x = MapTileIndex.getX(pMapTileIndex)
        return "$baseUrl$zoom/$y/$x"
    }
}

private val EsriStreetTileSource = object : OnlineTileSourceBase(
    "EsriWorldStreetMap", 0, 19, 256, ".png",
    arrayOf("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/")
) {
    override fun getTileURLString(pMapTileIndex: Long): String {
        val zoom = MapTileIndex.getZoom(pMapTileIndex)
        val y = MapTileIndex.getY(pMapTileIndex)
        val x = MapTileIndex.getX(pMapTileIndex)
        return "$baseUrl$zoom/$y/$x"
    }
}

// ─── Data classes ──────────────────────────────────────────────────────────────

data class TrafficSegment(
    val points: List<GeoPoint>,
    val color: Color
)

data class OsmMarker(
    val id: String,
    val position: GeoPoint,
    val title: String,
    val snippet: String = "",
    val type: String = "casa",
    val price: Double? = null,
    val isSelected: Boolean = false,
    val isDestination: Boolean = false
)

enum class MapTheme { STREETS, ESRI_STREET, SATELLITE }

// ─── Marker bitmaps (drawn with Canvas – no PNG assets needed) ─────────────

/** Green glowing origin beacon (for navigation) */
private fun createOriginBitmap(): Bitmap {
    val size = 72
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)
    val cx = size / 2f; val cy = size / 2f

    canvas.drawCircle(cx, cy, 34f, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.argb(70, 16, 185, 129); style = Paint.Style.FILL
    })
    canvas.drawCircle(cx, cy, 24f, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.argb(110, 11, 93, 59); style = Paint.Style.FILL
    })
    canvas.drawCircle(cx, cy, 16f, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.rgb(11, 93, 59); style = Paint.Style.FILL
    })
    canvas.drawCircle(cx, cy, 16f, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.rgb(255, 245, 232); style = Paint.Style.STROKE; strokeWidth = 3f
    })
    canvas.drawCircle(cx, cy, 6f, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.rgb(212, 150, 42); style = Paint.Style.FILL
    })
    return bmp
}

/** Blue dot user location (for explore/search mode, matches web userLocationIcon) */
private fun createUserLocationBitmap(): Bitmap {
    val size = 80
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)
    val cx = size / 2f; val cy = size / 2f
    
    // Outer ping (simulated with opacity)
    canvas.drawCircle(cx, cy, 32f, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.argb(76, 30, 64, 175) // azul-ruta opacity 30%
        style = Paint.Style.FILL
    })
    
    // Inner dot
    canvas.drawCircle(cx, cy, 16f, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.rgb(30, 64, 175) // bg-azul-ruta
        style = Paint.Style.FILL
        setShadowLayer(8f, 0f, 4f, android.graphics.Color.argb(100, 0, 0, 0))
    })
    
    // Inner dot border
    canvas.drawCircle(cx, cy, 16f, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = 4f
    })
    return bmp
}

/** Property marker matching web map CustomIcon */
private fun createPropertyBitmap(isCasa: Boolean, isSelected: Boolean): Bitmap {
    val size = 110 
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)
    
    val bg = if (isSelected) android.graphics.Color.rgb(229, 75, 34) // #E54B22
             else if (isCasa) android.graphics.Color.rgb(11, 93, 59) // #0B5D3B
             else android.graphics.Color.rgb(22, 138, 85) // #168A55

    // Draw drop shadow
    val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.argb(76, 0, 0, 0)
        maskFilter = android.graphics.BlurMaskFilter(8f, android.graphics.BlurMaskFilter.Blur.NORMAL)
    }
    
    val path = Path()
    val scale = size / 44f
    path.moveTo(22f * scale, 2f * scale)
    path.cubicTo(12.6f * scale, 2f * scale, 5f * scale, 9.6f * scale, 5f * scale, 19f * scale)
    path.cubicTo(5f * scale, 29.5f * scale, 22f * scale, 42f * scale, 22f * scale, 42f * scale)
    path.cubicTo(22f * scale, 42f * scale, 39f * scale, 29.5f * scale, 39f * scale, 19f * scale)
    path.cubicTo(39f * scale, 9.6f * scale, 31.4f * scale, 2f * scale, 22f * scale, 2f * scale)
    path.close()
    
    canvas.save()
    canvas.translate(0f, 6f)
    canvas.drawPath(path, shadowPaint)
    canvas.restore()
    
    val paintBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = bg; style = Paint.Style.FILL }
    canvas.drawPath(path, paintBg)
    
    val paintWhite = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.rgb(255, 245, 232); style = Paint.Style.FILL }
    canvas.drawCircle(22f * scale, 18f * scale, 10f * scale, paintWhite)
    
    val paintIcon = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.rgb(59, 33, 24); style = Paint.Style.FILL }
    if (isCasa) {
        val iconPath = Path()
        iconPath.moveTo(22f * scale, 11f * scale)
        iconPath.lineTo(15f * scale, 17f * scale)
        iconPath.lineTo(15f * scale, 23f * scale)
        iconPath.lineTo(29f * scale, 23f * scale)
        iconPath.lineTo(29f * scale, 17f * scale)
        iconPath.close()
        canvas.drawPath(iconPath, paintIcon)
    } else {
        canvas.drawRoundRect(RectF(17f * scale, 12f * scale, 27f * scale, 24f * scale), 2f * scale, 2f * scale, paintIcon)
    }
    
    return bmp
}

/** Terracota destination pin with house icon (matches web createDestinationIcon) */
private fun createDestinationBitmap(): Bitmap {
    val w = 80; val h = 96
    val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)
    val cx = w / 2f

    // Pin body
    canvas.drawRoundRect(RectF(cx - 26f, 4f, cx + 26f, 60f), 14f, 14f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = android.graphics.Color.rgb(216, 68, 32); style = Paint.Style.FILL
            setShadowLayer(10f, 0f, 6f, android.graphics.Color.argb(90, 0, 0, 0))
        })
    // White border
    canvas.drawRoundRect(RectF(cx - 26f, 4f, cx + 26f, 60f), 14f, 14f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = android.graphics.Color.rgb(255, 245, 232); style = Paint.Style.STROKE; strokeWidth = 3f
        })
    // House roof
    canvas.drawPath(Path().apply {
        moveTo(cx, 14f); lineTo(cx - 14f, 30f); lineTo(cx + 14f, 30f); close()
    }, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.WHITE; style = Paint.Style.FILL
    })
    // House body
    canvas.drawRect(cx - 10f, 29f, cx + 10f, 50f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = android.graphics.Color.WHITE; style = Paint.Style.FILL
        })
    // Door
    canvas.drawRect(cx - 5f, 38f, cx + 5f, 50f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = android.graphics.Color.rgb(216, 68, 32); style = Paint.Style.FILL
        })
    // Pointer
    canvas.drawPath(Path().apply {
        moveTo(cx - 12f, 58f); lineTo(cx + 12f, 58f); lineTo(cx, 76f); close()
    }, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.rgb(185, 50, 18); style = Paint.Style.FILL
    })
    return bmp
}

// ─── OsmMapView ────────────────────────────────────────────────────────────────

@Composable
fun OsmMapView(
    modifier: Modifier = Modifier,
    center: GeoPoint = GeoPoint(14.6349, -90.5069),
    zoom: Double = 13.0,
    userPosition: GeoPoint? = null,
    radarRadius: Double? = null, // in kilometers
    radarActive: Boolean = false,
    markers: List<OsmMarker> = emptyList(),
    trafficSegments: List<TrafficSegment> = emptyList(),
    enableUserLocation: Boolean = true,
    isNavigationMode: Boolean = false, // If true, uses navigation origin icon instead of blue dot
    showControls: Boolean = true,
    showTopBadges: Boolean = true,
    onMarkerClick: (String) -> Unit = {}
) {
    val context = LocalContext.current
    var currentTheme by remember { mutableStateOf(MapTheme.STREETS) }

    remember {
        Configuration.getInstance().apply {
            load(context, context.getSharedPreferences("osmdroid", Context.MODE_PRIVATE))
            userAgentValue = "RuwaJay-GT-App/3.0 (info@ruwajay.com)"
            val basePath = File(context.filesDir, "osmdroid"); basePath.mkdirs(); osmdroidBasePath = basePath
            val tileCache = File(context.cacheDir, "osmdroid_tiles_v5"); tileCache.mkdirs(); osmdroidTileCache = tileCache
        }
    }

    val originBitmap = remember { createOriginBitmap() }
    val userLocBitmap = remember { createUserLocationBitmap() }
    val destBitmap = remember { createDestinationBitmap() }
    
    // Cache for property bitmaps so we don't recreate them every frame
    val propertyBitmaps = remember { mutableMapOf<String, Bitmap>() }

    val getPropertyBitmap = { isCasa: Boolean, isSelected: Boolean ->
        val key = "${isCasa}_${isSelected}"
        propertyBitmaps.getOrPut(key) {
            createPropertyBitmap(isCasa, isSelected)
        }
    }

    val mapView = remember {
        MapView(context).apply {
            setTileSource(OsmStreetTileSource)
            setMultiTouchControls(true)
            controller.setZoom(zoom)
            controller.setCenter(center)
            zoomController.setVisibility(
                org.osmdroid.views.CustomZoomButtonsController.Visibility.NEVER
            )
        }
    }

    // Switch tile source
    LaunchedEffect(currentTheme) {
        when (currentTheme) {
            MapTheme.SATELLITE -> mapView.setTileSource(EsriSatelliteTileSource)
            MapTheme.ESRI_STREET -> mapView.setTileSource(EsriStreetTileSource)
            MapTheme.STREETS -> mapView.setTileSource(OsmStreetTileSource)
        }
        mapView.invalidate()
    }

    LaunchedEffect(center, zoom) {
        mapView.controller.animateTo(center)
        mapView.controller.setZoom(zoom)
    }

    DisposableEffect(mapView, markers, trafficSegments, userPosition) {
        mapView.onResume()
        mapView.overlays.clear()

        // Traffic polylines
        trafficSegments.forEach { seg ->
            if (seg.points.size >= 2) {
                mapView.overlays.add(Polyline(mapView).apply {
                    setPoints(seg.points)
                    outlinePaint.color = seg.color.toArgb()
                    outlinePaint.strokeWidth = 16f
                    outlinePaint.strokeCap = android.graphics.Paint.Cap.ROUND
                    outlinePaint.strokeJoin = android.graphics.Paint.Join.ROUND
                    outlinePaint.alpha = 210
                })
            }
        }

        // Radar circle around user
        if (radarRadius != null && userPosition != null) {
            val circle = org.osmdroid.views.overlay.Polygon(mapView)
            val points = org.osmdroid.views.overlay.Polygon.pointsAsCircle(userPosition, radarRadius * 1000.0)
            circle.points = points
            circle.fillPaint.color = android.graphics.Color.argb(25, 22, 138, 85) // 0.1 opacity
            circle.outlinePaint.color = android.graphics.Color.rgb(22, 138, 85)
            circle.outlinePaint.strokeWidth = 4f
            if (radarActive) {
                circle.outlinePaint.pathEffect = android.graphics.DashPathEffect(floatArrayOf(15f, 15f), 0f)
            }
            mapView.overlays.add(circle)
        }

        // User (origin) beacon
        if (enableUserLocation && userPosition != null) {
            mapView.overlays.add(Marker(mapView).apply {
                position = userPosition
                title = "Tu Ubicación Actual"
                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                icon = android.graphics.drawable.BitmapDrawable(
                    context.resources, 
                    if (isNavigationMode) originBitmap else userLocBitmap
                )
            })
        }

        // Destination / property markers
        markers.forEach { m ->
            mapView.overlays.add(Marker(mapView).apply {
                position = m.position
                title = m.title
                snippet = m.snippet
                if (m.isDestination) {
                    setAnchor(Marker.ANCHOR_CENTER, 0.82f)
                    icon = android.graphics.drawable.BitmapDrawable(context.resources, destBitmap)
                } else {
                    setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                    val isCasa = m.type.lowercase() == "casa"
                    icon = android.graphics.drawable.BitmapDrawable(
                        context.resources,
                        getPropertyBitmap(isCasa, m.isSelected)
                    )
                }
                setOnMarkerClickListener { mk, _ ->
                    onMarkerClick(m.id); mk.showInfoWindow(); true
                }
            })
        }

        mapView.invalidate()
        onDispose { mapView.onPause() }
    }

    // ─── UI ──────────────────────────────────────────────────────────────────

    Box(modifier = modifier.fillMaxSize()) {

        AndroidView(factory = { mapView }, modifier = Modifier.fillMaxSize())

        if (showTopBadges) {
            // ── Top-left: Map theme toggle (calles / esri / satélite) ──
            Surface(
                color = Color(0xFF0F172A).copy(alpha = 0.92f),
                shape = RoundedCornerShape(12.dp),
                shadowElevation = 4.dp,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    ThemeChip(label = "🗺", isActive = currentTheme == MapTheme.STREETS) {
                        currentTheme = MapTheme.STREETS
                    }
                    ThemeChip(label = "🏙", isActive = currentTheme == MapTheme.ESRI_STREET) {
                        currentTheme = MapTheme.ESRI_STREET
                    }
                    ThemeChip(label = "🛰", isActive = currentTheme == MapTheme.SATELLITE) {
                        currentTheme = MapTheme.SATELLITE
                    }
                }
            }

            // ── Top-right: GPS badge ──
            Surface(
                color = Color(0xFF0B5D3B).copy(alpha = 0.94f),
                shape = RoundedCornerShape(10.dp),
                shadowElevation = 4.dp,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(8.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.GpsFixed, null, tint = Color(0xFFD4962A), modifier = Modifier.size(12.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("GPS en Vivo", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        if (showControls) {
            // ── Right side: Zoom + Focus controls ──
            Column(
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(end = 8.dp),
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                // Zoom +/-
                Surface(
                    color = Color.White.copy(alpha = 0.96f),
                    shape = RoundedCornerShape(12.dp),
                    shadowElevation = 6.dp,
                    modifier = Modifier.width(40.dp)
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(vertical = 2.dp)
                    ) {
                        MapControlBtn(icon = Icons.Default.Add, desc = "Acercar", tint = Color(0xFF3B2118)) {
                            mapView.controller.zoomIn()
                        }
                        HorizontalDivider(
                            color = Color.Black.copy(alpha = 0.08f),
                            modifier = Modifier.width(24.dp)
                        )
                        MapControlBtn(icon = Icons.Default.Remove, desc = "Alejar", tint = Color(0xFF3B2118)) {
                            mapView.controller.zoomOut()
                        }
                    }
                }

                // Location controls
                Surface(
                    color = Color.White.copy(alpha = 0.96f),
                    shape = RoundedCornerShape(12.dp),
                    shadowElevation = 6.dp,
                    modifier = Modifier.width(40.dp)
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(vertical = 2.dp)
                    ) {
                        MapControlBtn(icon = Icons.Default.MyLocation, desc = "Mi ubicación", tint = Color(0xFF0B5D3B)) {
                            userPosition?.let {
                                mapView.controller.animateTo(it)
                                mapView.controller.setZoom(15.0)
                            }
                        }
                        HorizontalDivider(
                            color = Color.Black.copy(alpha = 0.08f),
                            modifier = Modifier.width(24.dp)
                        )
                        MapControlBtn(icon = Icons.Default.LocationOn, desc = "Ver destino", tint = Color(0xFFD84420)) {
                            mapView.controller.animateTo(center)
                            mapView.controller.setZoom(zoom)
                        }
                        HorizontalDivider(
                            color = Color.Black.copy(alpha = 0.08f),
                            modifier = Modifier.width(24.dp)
                        )
                        MapControlBtn(icon = Icons.Default.Explore, desc = "Ver ruta", tint = Color(0xFF3B2118)) {
                            if (userPosition != null) {
                                val midLat = (userPosition.latitude + center.latitude) / 2
                                val midLng = (userPosition.longitude + center.longitude) / 2
                                mapView.controller.animateTo(GeoPoint(midLat, midLng))
                                mapView.controller.setZoom(12.0)
                            } else {
                                mapView.controller.animateTo(center)
                                mapView.controller.setZoom(zoom)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─── Small reusable composables ───────────────────────────────────────────────

@Composable
private fun ThemeChip(label: String, isActive: Boolean, onClick: () -> Unit) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .size(28.dp)
            .background(
                if (isActive) Color(0xFF0B5D3B) else Color.Transparent,
                RoundedCornerShape(6.dp)
            )
            .clickable(onClick = onClick)
    ) {
        Text(label, fontSize = 13.sp)
    }
}

@Composable
private fun MapControlBtn(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    desc: String,
    tint: Color,
    onClick: () -> Unit
) {
    IconButton(onClick = onClick, modifier = Modifier.size(40.dp)) {
        Icon(icon, contentDescription = desc, tint = tint, modifier = Modifier.size(18.dp))
    }
}

