package com.example.ruwajay.ui.components

import android.content.Context
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.XYTileSource
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline

private val CartoVoyagerTileSource = XYTileSource(
    "CartoVoyager",
    1, 20, 256, ".png",
    arrayOf(
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/",
        "https://d.basemaps.cartocdn.com/rastertiles/voyager/"
    )
)

data class TrafficSegment(
    val points: List<GeoPoint>,
    val color: androidx.compose.ui.graphics.Color
)

data class OsmMarker(
    val id: String,
    val position: GeoPoint,
    val title: String,
    val snippet: String = ""
)

@Composable
fun OsmMapView(
    modifier: Modifier = Modifier,
    center: GeoPoint = GeoPoint(14.6349, -90.5069), // Guatemala City
    zoom: Double = 13.0,
    markers: List<OsmMarker> = emptyList(),
    trafficSegments: List<TrafficSegment> = emptyList(),
    onMarkerClick: (String) -> Unit = {}
) {
    val context = LocalContext.current

    // Initialize osmdroid configuration
    remember {
        Configuration.getInstance().apply {
            userAgentValue = "RuwaJayApp/1.0 (com.example.ruwajay; ruwajay.app@gmail.com)"
            userAgentHttpHeader = "User-Agent"
            load(context, context.getSharedPreferences("osmdroid", Context.MODE_PRIVATE))
        }
    }

    val mapView = remember {
        MapView(context).apply {
            setTileSource(CartoVoyagerTileSource)
            setMultiTouchControls(true)
            controller.setZoom(zoom)
            controller.setCenter(center)
        }
    }

    // Handle lifecycle, markers and traffic route polylines
    DisposableEffect(mapView, markers, trafficSegments) {
        mapView.onResume()
        mapView.overlays.clear()

        // Draw Waze Traffic Polylines
        trafficSegments.forEach { segment ->
            if (segment.points.size >= 2) {
                val polyline = Polyline(mapView).apply {
                    setPoints(segment.points)
                    outlinePaint.color = segment.color.toArgb()
                    outlinePaint.strokeWidth = 14f
                    outlinePaint.strokeCap = android.graphics.Paint.Cap.ROUND
                }
                mapView.overlays.add(polyline)
            }
        }

        // Draw Markers
        markers.forEach { osmMarker ->
            val marker = Marker(mapView).apply {
                position = osmMarker.position
                title = osmMarker.title
                snippet = osmMarker.snippet
                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                setOnMarkerClickListener { m, _ ->
                    onMarkerClick(osmMarker.id)
                    m.showInfoWindow()
                    true
                }
            }
            mapView.overlays.add(marker)
        }
        mapView.invalidate()

        onDispose {
            mapView.onPause()
        }
    }

    AndroidView(
        factory = { mapView },
        modifier = modifier.fillMaxSize(),
        update = {
            it.controller.setCenter(center)
        }
    )
}
