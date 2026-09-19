package com.example.ruwajay.data.model

data class Property(
    val id: String,
    val title: String,
    val price: Int,
    val currency: String = "GTQ",
    val type: String,
    val status: String,
    val description: String,
    val features: PropertyFeatures,
    val location: Location,
    val ownerId: String,
    val images: List<String>,
    val amenities: List<String>,
    val rules: List<String>,
    val requirements: List<String>,
    val deposit: Int? = null
)

data class PropertyFeatures(
    val bedrooms: Int,
    val bathrooms: Int,
    val area: Int
)

data class Location(
    val address: String,
    val zone: String,
    val city: String,
    val department: String? = null,
    val municipality: String? = null,
    val approximateAddress: String? = null,
    val exactAddress: String? = null,
    val mapCoordinates: Coordinates? = null
)

data class Coordinates(
    val lat: Double,
    val lng: Double
)
