package com.example.ruwajay.ui.components

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import org.osmdroid.util.GeoPoint

val GUATEMALA_CENTER = GeoPoint(14.6349, -90.5069)

fun isInsideGuatemala(point: GeoPoint?): Boolean {
    if (point == null) return false
    return point.latitude in 13.5..18.0 && point.longitude in -92.5..-88.0
}

data class GpsPosition(val point: GeoPoint?, val error: String?, val request: () -> Unit)

@Composable
fun rememberGpsPosition(): GpsPosition {
    val context = LocalContext.current
    val manager = remember { context.getSystemService(Context.LOCATION_SERVICE) as LocationManager }
    fun granted() = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    var permission by remember { mutableStateOf(granted()) }
    var point by remember { mutableStateOf<GeoPoint?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        permission = granted()
        error = if (permission) null else "Permiso de ubicación denegado."
    }
    val request = { launcher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)) }

    // Solicitar permiso automáticamente en el primer inicio si aún no está otorgado
    LaunchedEffect(Unit) {
        if (!permission) {
            request()
        }
    }

    DisposableEffect(permission) {
        val listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                point = GeoPoint(location.latitude, location.longitude)
                error = null
            }
            override fun onProviderDisabled(provider: String) { error = "Activa la ubicación del dispositivo." }
        }
        if (permission) {
            try {
                val providers = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER).filter { manager.isProviderEnabled(it) }
                if (providers.isEmpty()) error = "Activa la ubicación del dispositivo."
                
                // Obtener inmediatamente la última ubicación conocida
                for (p in providers) {
                    val last = manager.getLastKnownLocation(p)
                    if (last != null) {
                        point = GeoPoint(last.latitude, last.longitude)
                        break
                    }
                }
                providers.forEach { manager.requestLocationUpdates(it, 2000L, 5f, listener) }
            } catch (_: SecurityException) { error = "Permiso de ubicación requerido." }
        }
        onDispose { manager.removeUpdates(listener) }
    }
    return GpsPosition(point, error, request)
}
