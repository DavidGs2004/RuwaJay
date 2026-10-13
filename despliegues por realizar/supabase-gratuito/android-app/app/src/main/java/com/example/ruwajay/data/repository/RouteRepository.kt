package com.example.ruwajay.data.repository

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import org.osmdroid.util.GeoPoint
import java.net.HttpURLConnection
import java.net.URL

data class RoadRoute(val points: List<GeoPoint>, val distanceMeters: Double, val durationSeconds: Double, val instructions: List<String>, val trafficAware: Boolean = false)

suspend fun fetchRoadRoute(origin: GeoPoint, destination: GeoPoint, walking: Boolean): RoadRoute = withContext(Dispatchers.IO) {
    val service = if (walking) "https://routing.openstreetmap.de/routed-foot/route/v1/driving" else "https://router.project-osrm.org/route/v1/driving"
    val osrmUrl = "$service/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true"
    val token = com.example.ruwajay.BuildConfig.MAPBOX_ACCESS_TOKEN
    val profile = if(walking) "mapbox/walking" else "mapbox/driving-traffic"
    val url = if(token.isBlank()) osrmUrl else "https://api.mapbox.com/directions/v5/$profile/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true&language=es&access_token=${java.net.URLEncoder.encode(token,"UTF-8") }"
    val connection = URL(url).openConnection() as HttpURLConnection
    try {
        connection.connectTimeout = 15000; connection.readTimeout = 20000
        if (connection.responseCode !in 200..299) throw Exception("No se pudo calcular la ruta.")
        val json = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
        if (json.optString("code") != "Ok") throw Exception("No existe una ruta disponible.")
        val route = json.getJSONArray("routes").getJSONObject(0)
        val coords = route.getJSONObject("geometry").getJSONArray("coordinates")
        val points = (0 until coords.length()).map { coords.getJSONArray(it).let { p -> GeoPoint(p.getDouble(1), p.getDouble(0)) } }
        val steps = route.getJSONArray("legs").getJSONObject(0).getJSONArray("steps")
        val instructions = (0 until steps.length()).map { i ->
            val step = steps.getJSONObject(i); val maneuver = step.getJSONObject("maneuver")
            val direction = when (maneuver.optString("modifier")) { "left", "sharp left", "slight left" -> "Gira a la izquierda"; "right", "sharp right", "slight right" -> "Gira a la derecha"; else -> "Continua" }
            maneuver.optString("instruction").ifBlank { when (maneuver.optString("type")) { "arrive" -> "Llegada al destino"; "depart" -> "Inicia el recorrido"; "roundabout" -> "Toma la salida ${maneuver.optInt("exit", 1)} de la rotonda"; else -> "$direction ${step.optString("name")}" } }
        }
        RoadRoute(points, route.getDouble("distance"), route.getDouble("duration"), instructions, token.isNotBlank()&&!walking)
    } finally { connection.disconnect() }
}
