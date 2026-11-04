package com.example.ruwajay.data.repository

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import org.osmdroid.util.GeoPoint
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.*

data class RoadRoute(
    val points: List<GeoPoint>,
    val distanceMeters: Double,
    val durationSeconds: Double,
    val instructions: List<String>,
    val trafficAware: Boolean = false
)

suspend fun fetchRoadRoute(origin: GeoPoint, destination: GeoPoint, walking: Boolean): RoadRoute = withContext(Dispatchers.IO) {
    val token = com.example.ruwajay.BuildConfig.MAPBOX_ACCESS_TOKEN
    val urlsToTry = mutableListOf<String>()

    if (token.isNotBlank()) {
        val profile = if (walking) "mapbox/walking" else "mapbox/driving-traffic"
        urlsToTry += "https://api.mapbox.com/directions/v5/$profile/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true&language=es&access_token=${java.net.URLEncoder.encode(token, "UTF-8")}"
    }

    val osrmPrimary = if (walking) "https://routing.openstreetmap.de/routed-foot/route/v1/driving" else "https://router.project-osrm.org/route/v1/driving"
    val osrmSecondary = if (walking) "https://routing.openstreetmap.de/routed-foot/route/v1/foot" else "https://routing.openstreetmap.de/routed-car/route/v1/driving"

    urlsToTry += "$osrmPrimary/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true"
    urlsToTry += "$osrmSecondary/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true"

    for (urlStr in urlsToTry) {
        try {
            val connection = URL(urlStr).openConnection() as HttpURLConnection
            connection.connectTimeout = 10000
            connection.readTimeout = 12000
            connection.setRequestProperty("User-Agent", "RuwaJay-GT-App/3.0 (info@ruwajay.com)")
            connection.setRequestProperty("Accept", "application/json")

            try {
                if (connection.responseCode in 200..299) {
                    val body = connection.inputStream.bufferedReader().use { it.readText() }
                    val json = JSONObject(body)
                    val code = json.optString("code")
                    if (code == "Ok" || code == "SUCCESS" || json.has("routes")) {
                        val routes = json.optJSONArray("routes")
                        if (routes != null && routes.length() > 0) {
                            val route = routes.getJSONObject(0)
                            val coords = route.getJSONObject("geometry").getJSONArray("coordinates")
                            val points = (0 until coords.length()).map {
                                val p = coords.getJSONArray(it)
                                GeoPoint(p.getDouble(1), p.getDouble(0))
                            }
                            val steps = route.optJSONArray("legs")?.optJSONObject(0)?.optJSONArray("steps")
                            val instructions = mutableListOf<String>()
                            if (steps != null) {
                                for (i in 0 until steps.length()) {
                                    val step = steps.getJSONObject(i)
                                    val maneuver = step.optJSONObject("maneuver")
                                    val instruction = maneuver?.optString("instruction")
                                    if (!instruction.isNullOrBlank()) {
                                        instructions += instruction
                                    }
                                }
                            }
                            if (instructions.isEmpty()) {
                                instructions += "Sigue la ruta marcada en el mapa hasta tu destino."
                            }
                            val dist = route.optDouble("distance", 0.0)
                            val dur = route.optDouble("duration", 0.0)
                            return@withContext RoadRoute(points, dist, dur, instructions, token.isNotBlank() && !walking)
                        }
                    }
                }
            } finally {
                connection.disconnect()
            }
        } catch (_: Exception) {
            // Continúa intentando con el siguiente endpoint de respaldo
        }
    }

    // Respaldo en línea recta si no hay conexión OSRM/Mapbox disponible
    val distMeters = calculateHaversineDistanceMeters(origin, destination)
    val durSeconds = if (walking) (distMeters / 1.2) else (distMeters / 11.0) // ~4 km/h a pie, ~40 km/h en auto
    RoadRoute(
        points = listOf(origin, destination),
        distanceMeters = distMeters,
        durationSeconds = durSeconds,
        instructions = listOf("Dirígete hacia el inmueble en la ubicación indicada."),
        trafficAware = false
    )
}

private fun calculateHaversineDistanceMeters(p1: GeoPoint, p2: GeoPoint): Double {
    val earthRadius = 6371000.0
    val dLat = Math.toRadians(p2.latitude - p1.latitude)
    val dLon = Math.toRadians(p2.longitude - p1.longitude)
    val a = sin(dLat / 2).pow(2) + cos(Math.toRadians(p1.latitude)) * cos(Math.toRadians(p2.latitude)) * sin(dLon / 2).pow(2)
    val c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return earthRadius * c
}
