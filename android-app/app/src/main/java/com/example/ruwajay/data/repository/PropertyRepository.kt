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
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage

@Composable
fun rememberProperties(
    firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
): List<Property> {
    var properties by remember { mutableStateOf<List<Property>>(MockDataRepository.properties) }

    DisposableEffect(firestore) {
        val listener = firestore.collection("properties")
            .addSnapshotListener { snapshot, error ->
                if (error == null && snapshot != null) {
                    val firestoreProps = snapshot.documents
                        .sortedByDescending { documentTimestamp(it) }
                        .mapNotNull { propertyFromDocument(it) }

                    if (firestoreProps.isNotEmpty()) {
                        val mockList = MockDataRepository.properties.filter { mock ->
                            firestoreProps.none { it.id == mock.id }
                        }
                        properties = firestoreProps + mockList
                    } else {
                        properties = MockDataRepository.properties
                    }
                }
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
    coordinates: Coordinates? = null,
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
        "currency" to "Q",
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
            "mapCoordinates" to coordinates?.let { mapOf("lat" to it.lat, "lng" to it.lng) }
        ),
        "coordinates" to coordinates?.let { mapOf("lat" to it.lat, "lng" to it.lng) },
        "createdAt" to FieldValue.serverTimestamp()
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

private fun documentTimestamp(document: com.google.firebase.firestore.DocumentSnapshot): Long {
    val ts = document.get("createdAt") as? com.google.firebase.Timestamp
    return ts?.toDate()?.time ?: 0L
}

private fun propertyFromDocument(document: com.google.firebase.firestore.DocumentSnapshot): Property? {
    return try {
        val features = document.get("features") as? Map<*, *> ?: emptyMap<String, Any>()
        val location = document.get("location") as? Map<*, *> ?: emptyMap<String, Any>()

        val rawCoords = (location["mapCoordinates"] as? Map<*, *>)
            ?: (location["coordinates"] as? Map<*, *>)
            ?: (document.get("coordinates") as? Map<*, *>)
            ?: (document.get("mapCoordinates") as? Map<*, *>)

        val coordinates = rawCoords?.let { coordsMap ->
            val latVal = coordsMap.number("lat").let { if (it != 0.0) it else coordsMap.number("latitude") }
            val lngVal = coordsMap.number("lng").let { if (it != 0.0) it else coordsMap.number("longitude").let { if (it != 0.0) it else coordsMap.number("lon") } }
            if (latVal != 0.0 && lngVal != 0.0) Coordinates(latVal, lngVal) else null
        } ?: Coordinates(14.6349, -90.5069)

        val rawImages = document.stringList("images").ifEmpty {
            val singleImg = document.string("image").ifBlank { document.string("imageUrl") }
            if (singleImg.isNotBlank()) listOf(singleImg) else emptyList()
        }
        val images = if (rawImages.isNotEmpty()) rawImages else listOf(
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80"
        )

        val title = document.stringOr("title", document.stringOr("titulo", document.stringOr("name", "Propiedad sin título")))
        val price = document.number("price").let { if (it > 0) it else document.number("precio") }.toInt().let { if (it > 0) it else 3500 }
        val bedrooms = features.number("bedrooms").let { if (it > 0) it else features.number("habitaciones") }.toInt().coerceAtLeast(1)
        val bathrooms = features.number("bathrooms").let { if (it > 0) it else features.number("banos") }.toInt().coerceAtLeast(1)
        val area = features.number("area").toInt()

        val addressStr = location.stringOr("exactAddress", location.stringOr("address", location.stringOr("direccion", "Guatemala")))
        val zoneStr = location.stringOr("zone", location.stringOr("zona", "Zona 10"))
        val cityStr = location.stringOr("municipality", location.stringOr("city", location.stringOr("ciudad", "Ciudad de Guatemala")))
        val deptStr = location.stringOr("department", location.stringOr("departamento", "Guatemala"))

        Property(
            id = document.id,
            title = title,
            price = price,
            currency = document.stringOr("currency", "Q"),
            type = document.stringOr("type", "casa"),
            status = document.stringOr("status", "disponible"),
            description = document.stringOr("description", document.stringOr("descripcion", "Hermosa propiedad disponible en alquiler.")),
            features = PropertyFeatures(
                bedrooms = bedrooms,
                bathrooms = bathrooms,
                area = area
            ),
            location = Location(
                address = addressStr,
                zone = zoneStr,
                city = cityStr,
                department = deptStr,
                municipality = cityStr,
                approximateAddress = location.stringOr("approximateAddress", addressStr),
                exactAddress = addressStr,
                mapCoordinates = coordinates
            ),
            ownerId = document.stringOr("ownerId", "owner-1"),
            images = images,
            amenities = document.stringList("amenities").ifEmpty { listOf("Parqueo", "Seguridad 24/7") },
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

// ── ADMIN FUNCTIONS ──
fun updatePropertyStatus(
    propertyId: String,
    newStatus: String,
    onResult: () -> Unit = {}
) {
    FirebaseFirestore.getInstance().collection("properties").document(propertyId)
        .update("status", newStatus)
        .addOnSuccessListener { onResult() }
        .addOnFailureListener { }
}

fun deleteProperty(
    propertyId: String,
    onResult: () -> Unit = {}
) {
    FirebaseFirestore.getInstance().collection("properties").document(propertyId)
        .delete()
        .addOnSuccessListener { onResult() }
        .addOnFailureListener { }
}

fun updateUserRole(
    userId: String,
    newRole: String,
    onResult: () -> Unit = {}
) {
    FirebaseFirestore.getInstance().collection("users").document(userId)
        .update("role", newRole)
        .addOnSuccessListener { onResult() }
        .addOnFailureListener { }
}

fun toggleUserSuspension(
    userId: String,
    suspended: Boolean,
    onResult: () -> Unit = {}
) {
    FirebaseFirestore.getInstance().collection("users").document(userId)
        .update("suspended", suspended)
        .addOnSuccessListener { onResult() }
        .addOnFailureListener { }
}


