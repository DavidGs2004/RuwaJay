package com.example.ruwajay.ui.components

import android.content.Context
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileLayerPolicy
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker

@Composable
fun OsmMapView(
    modifier: Modifier = Modifier,
    center: GeoPoint = GeoPoint(14.6349, -90.5069), // Guatemala City
    zoom: Double = 13.0,
    markers: List<OsmMarker> = emptyList(),
    onMarkerClick: (String) -> Unit = {}
) {
    val context = LocalContext.current
    
    // Configure osmdroid user agent (required)
    Configuration.getInstance().userAgentValue = context.packageName

    val mapView = remember {
        MapView(context).apply {
            setTileSource(TileSourceFactory.MAPNIK)
            setMultiTouchControls(true)
            controller.setZoom(zoom)
            controller.setCenter(center)
        }
    }

    // Update markers when list changes
    DisposableEffect(markers) {
        mapView.overlays.clear()
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
        onDispose { }
    }

    AndroidView(
        factory = { mapView },
        modifier = modifier.fillMaxSize(),
        update = {
            it.controller.setCenter(center)
        }
    )
}

data class OsmMarker(
    val id: String,
    val position: GeoPoint,
    val title: String,
    val snippet: String = ""
)
