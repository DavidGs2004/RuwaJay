package com.example.ruwajay.data.repository

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import android.content.ContentResolver
import android.net.Uri
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import com.example.ruwajay.data.model.Coordinates
import com.example.ruwajay.data.model.Location
import com.example.ruwajay.data.model.Property
import com.example.ruwajay.data.model.PropertyFeatures
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage

@Composable
fun rememberProperties(
    firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
): List<Property> {
    var properties by remember { mutableStateOf(MockDataRepository.properties) }

    DisposableEffect(firestore) {
        val listener = firestore.collection("properties")
            .whereEqualTo("status", "disponible")
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null || snapshot.isEmpty) return@addSnapshotListener
                val remoteProperties = snapshot.documents.mapNotNull(::propertyFromDocument)
                if (remoteProperties.isNotEmpty()) properties = remoteProperties
            }

        onDispose { listener.remove() }
    }

    return properties
}

fun publishProperty(
    title: String,
    description: String,
    price: Int,
    deposit: Int,
    type: String,
    department: String,
    municipality: String,
    zone: String,
    approximateAddress: String,
    exactAddress: String,
    bedrooms: Int,
    bathrooms: Int,
    imageUris: List<Uri> = emptyList(),
    contentResolver: ContentResolver? = null,
    onResult: (Result<Unit>) -> Unit,
    firestore: FirebaseFirestore = FirebaseFirestore.getInstance(),
    auth: FirebaseAuth = FirebaseAuth.getInstance(),
    storage: FirebaseStorage = FirebaseStorage.getInstance()
) {
    val user = auth.currentUser
    if (user == null) {
        onResult(Result.failure(Exception("Debes iniciar sesión para publicar una propiedad.")))
        return
    }

    val property = mapOf(
        "ownerId" to user.uid,
        "title" to title.trim(),
        "description" to description.trim(),
        "price" to price,
        "deposit" to deposit,
        "currency" to "GTQ",
        "type" to type,
        "status" to "disponible",
        "amenities" to emptyList<String>(),
        "rules" to emptyList<String>(),
        "requirements" to emptyList<String>(),
        "features" to mapOf(
            "bedrooms" to bedrooms,
            "bathrooms" to bathrooms,
            "area" to 0
        ),
        "location" to mapOf(
            "department" to department.trim(),
            "municipality" to municipality.trim(),
            "zone" to zone.trim(),
            "approximateAddress" to approximateAddress.trim(),
            "exactAddress" to exactAddress.trim(),
            "address" to exactAddress.trim(),
            "city" to municipality.trim(),
            "mapCoordinates" to null
        ),
        "createdAt" to System.currentTimeMillis()
    )

    val propertyReference = firestore.collection("properties").document()
    uploadPropertyImages(imageUris, contentResolver, propertyReference.id, user.uid, storage)
        .addOnSuccessListener { imageUrls ->
            propertyReference.set(property + ("images" to imageUrls))
                .addOnSuccessListener { onResult(Result.success(Unit)) }
                .addOnFailureListener { error -> onResult(Result.failure(error)) }
        }
        .addOnFailureListener { error -> onResult(Result.failure(error)) }
}

private fun uploadPropertyImages(
    imageUris: List<Uri>,
    contentResolver: ContentResolver?,
    propertyId: String,
    userId: String,
    storage: FirebaseStorage
): Task<List<String>> {
    if (imageUris.isEmpty()) return Tasks.forResult(emptyList())

    val uploadTasks: List<Task<String>> = imageUris.mapIndexed { index, uri ->
        val stream = contentResolver?.openInputStream(uri)
            ?: return@mapIndexed Tasks.forException<String>(Exception("No se pudo leer una imagen."))
        val reference = storage.reference.child("properties/$propertyId/$userId/$index.jpg")
        reference.putStream(stream)
            .continueWithTask { reference.downloadUrl }
            .continueWith { it.result.toString() }
    }

    return Tasks.whenAllSuccess(uploadTasks)
}

private fun propertyFromDocument(document: com.google.firebase.firestore.DocumentSnapshot): Property? {
    return try {
        val features = document.get("features") as? Map<*, *> ?: emptyMap<String, Any>()
        val location = document.get("location") as? Map<*, *> ?: emptyMap<String, Any>()
        val coordinates = (location["mapCoordinates"] as? Map<*, *>)?.let {
            Coordinates(
                lat = it.number("lat"),
                lng = it.number("lng")
            )
        }

        Property(
            id = document.id,
            title = document.string("title"),
            price = document.number("price").toInt(),
            currency = document.stringOr("currency", "GTQ"),
            type = document.stringOr("type", "casa"),
            status = document.stringOr("status", "disponible"),
            description = document.stringOr("description", ""),
            features = PropertyFeatures(
                bedrooms = features.number("bedrooms").toInt(),
                bathrooms = features.number("bathrooms").toInt(),
                area = features.number("area").toInt()
            ),
            location = Location(
                address = location.stringOr("exactAddress", location.stringOr("address", "Guatemala")),
                zone = location.stringOr("zone", "Centro"),
                city = location.stringOr("municipality", location.stringOr("city", "Ciudad de Guatemala")),
                department = location.stringOr("department", "Guatemala"),
                municipality = location.stringOr("municipality", "Guatemala"),
                approximateAddress = location.stringOr("approximateAddress", ""),
                exactAddress = location.stringOr("exactAddress", ""),
                mapCoordinates = coordinates
            ),
            ownerId = document.stringOr("ownerId", ""),
            images = document.stringList("images"),
            amenities = document.stringList("amenities"),
            rules = document.stringList("rules"),
            requirements = document.stringList("requirements"),
            deposit = document.number("deposit").toInt().takeIf { it > 0 }
        )
    } catch (_: Exception) {
        null
    }
}

private fun com.google.firebase.firestore.DocumentSnapshot.string(key: String): String {
    return getString(key)?.trim().orEmpty()
}

private fun com.google.firebase.firestore.DocumentSnapshot.number(key: String): Double {
    return (get(key) as? Number)?.toDouble() ?: 0.0
}

private fun com.google.firebase.firestore.DocumentSnapshot.stringOr(key: String, fallback: String): String {
    return string(key).ifBlank { fallback }
}

private fun com.google.firebase.firestore.DocumentSnapshot.stringList(key: String): List<String> {
    return (get(key) as? List<*>)?.filterIsInstance<String>() ?: emptyList()
}

private fun Map<*, *>.number(key: String): Double {
    return (this[key] as? Number)?.toDouble() ?: 0.0
}

private fun Map<*, *>.stringOr(key: String, fallback: String): String {
    return (this[key] as? String)?.trim()?.ifBlank { fallback } ?: fallback
}
