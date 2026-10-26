package com.example.ruwajay.data.model

fun persistedImageUrls(value: Any?): List<String> {
    val values = when(value) {
        is List<*> -> value
        is Map<*, *> -> value.values.flatMap { it as? List<*> ?: emptyList<Any>() }
        else -> emptyList<Any>()
    }
    return values.filterIsInstance<String>().filter { it.startsWith("https://") }.distinct()
}
fun persistedCoordinates(value: Any?): Coordinates? {
    val map = value as? Map<*, *> ?: return null
    val lat = ((map["lat"] ?: map["latitude"]) as? Number)?.toDouble() ?: return null
    val lng = ((map["lng"] ?: map["longitude"] ?: map["lon"]) as? Number)?.toDouble() ?: return null
    return if(lat.isFinite() && lng.isFinite() && lat in -90.0..90.0 && lng in -180.0..180.0) Coordinates(lat,lng) else null
}
