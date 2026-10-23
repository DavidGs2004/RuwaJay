package com.example.ruwajay.data.repository

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import android.content.ContentResolver
import android.net.Uri
import com.example.ruwajay.BuildConfig
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.TaskCompletionSource
import com.google.android.gms.tasks.Tasks
import com.example.ruwajay.data.model.Coordinates
import com.example.ruwajay.data.model.Location
import com.example.ruwajay.data.model.Property
import com.example.ruwajay.data.model.PropertyFeatures
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

@Composable
fun rememberProperties(
    firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
): List<Property> {
    var properties by remember { mutableStateOf<List<Property>>(emptyList()) }

    DisposableEffect(firestore) {
        val listener = firestore.collection("properties")
            .addSnapshotListener { snapshot, error ->
                if (error == null && snapshot != null) {
                    val firestoreProps = snapshot.documents
                        .sortedByDescending { documentTimestamp(it) }
                        .mapNotNull { propertyFromDocument(it) }
                    
                    properties = firestoreProps
                }
            }

        onDispose { listener.remove() }
    }

    return properties
}

fun publishProperty(
    title: String,
    description: String,
    price: Double,
    deposit: Double,
    type: String,
    department: String,
    municipality: String,
    zone: String,
    approximateAddress: String,
    exactAddress: String,
    bedrooms: Int,
    bathrooms: Int,
    area: Double = 0.0,
    parking: Int = 0,
    maintenanceFee: Double = 0.0,
    amenities: List<String> = emptyList(), rules: List<String> = emptyList(), requirements: List<String> = emptyList(),
    furnished: Boolean = false, petsAllowed: Boolean = false,
    propertyId: String? = null, retainedImages: List<String> = emptyList(),
    coordinates: Coordinates? = null,
    imageUris: List<Uri> = emptyList(),
    contentResolver: ContentResolver? = null,
    onResult: (Result<Unit>) -> Unit,
    firestore: FirebaseFirestore = FirebaseFirestore.getInstance(),
    auth: FirebaseAuth = FirebaseAuth.getInstance()
) {
    val user = auth.currentUser
    if (user == null) {
        onResult(Result.failure(Exception("Debes iniciar sesión para publicar una propiedad.")))
        return
    }

    if (coordinates == null || price <= 0) { onResult(Result.failure(Exception("Selecciona una ubicacion real y un precio valido."))); return }
    val property = mapOf(
        "ownerId" to user.uid,
        "title" to title.trim(),
        "description" to description.trim(),
        "price" to price,
        "deposit" to deposit,
        "currency" to "Q",
        "type" to type,
        "status" to "disponible",
        "amenities" to amenities,
        "parking" to parking, "maintenanceFee" to maintenanceFee, "furnished" to furnished, "petsAllowed" to petsAllowed,
        "rules" to rules,
        "requirements" to requirements,
        "features" to mapOf(
            "bedrooms" to bedrooms,
            "bathrooms" to bathrooms,
            "area" to area
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
        "schemaVersion" to 2,
        "ownerName" to (user.displayName ?: "Propietario"),
        "ownerEmail" to (user.email ?: ""),
        "verified" to false,
        "createdAt" to FieldValue.serverTimestamp()
    )

    if (retainedImages.size + imageUris.size > 8) { onResult(Result.failure(Exception("Puedes conservar y subir hasta ocho fotografías en total."))); return }
    val propertyReference = if (propertyId == null) firestore.collection("properties").document() else firestore.collection("properties").document(propertyId)
    val upload = if (imageUris.isEmpty() && retainedImages.isNotEmpty()) Tasks.forResult(emptyList<String>()) else uploadPropertyImages(imageUris, contentResolver, propertyReference.id, user.uid)
    upload
        .addOnSuccessListener { uploadedUrls ->
            val imageUrls = (retainedImages + uploadedUrls).distinct().take(8)
            RuwaBackend.invoke("saveProperty",mapOf("property" to ((property - "createdAt") + mapOf("id" to propertyReference.id,"images" to imageUrls,"thumbnail" to imageUrls.first()))),user.uid)
                .addOnSuccessListener { onResult(Result.success(Unit)) }
                .addOnFailureListener { onResult(Result.failure(it)) }
        }
        .addOnFailureListener { error -> onResult(Result.failure(error)) }
}

private fun uploadPropertyImages(
    imageUris: List<Uri>,
    contentResolver: ContentResolver?,
    propertyId: String,
    userId: String
): Task<List<String>> {
    if (imageUris.isEmpty()) return Tasks.forException(Exception("Sube al menos una fotografia."))
    if (imageUris.size > 8 || contentResolver == null) return Tasks.forException(Exception("Sube entre 1 y 8 fotografias."))
    val tasks = imageUris.map { uri ->
        val rawMime = contentResolver.getType(uri) ?: "image/jpeg"
        val mime = rawMime.lowercase().split(";")[0].trim().let {
            if (it == "image/jpg" || it == "image/heic" || it.isBlank()) "image/jpeg" else it
        }
        val safeMime = if (mime in listOf("image/jpeg","image/png","image/webp")) mime else "image/jpeg"
        RuwaBackend.upload("property",uri,contentResolver,propertyId=propertyId,mime=safeMime,expectedUid=userId)
    }
    return Tasks.whenAllSuccess<String>(tasks)
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

        val coordinates = com.example.ruwajay.data.model.persistedCoordinates(rawCoords)
        val normalizedImages = com.example.ruwajay.data.model.persistedImageUrls(document.get("images"))
        val rawImages = normalizedImages.ifEmpty {
            val singleImg = document.string("image").ifBlank { document.string("imageUrl") }
            if (singleImg.isNotBlank()) listOf(singleImg) else emptyList()
        }
        val images = rawImages

        val title = document.stringOr("title", document.stringOr("titulo", document.stringOr("name", "Propiedad sin título")))
        val price = document.number("price").let { if (it > 0) it else document.number("precio") }
        val bedrooms = features.number("bedrooms").let { if (it > 0) it else features.number("habitaciones") }.toInt()
        val bathrooms = features.number("bathrooms").let { if (it > 0) it else features.number("banos") }.toInt()
        val area = features.number("area")

        val addressStr = location.stringOr("exactAddress", location.stringOr("address", location.stringOr("direccion", "")))
        val zoneStr = location.stringOr("zone", location.stringOr("zona", ""))
        val cityStr = location.stringOr("municipality", location.stringOr("city", location.stringOr("ciudad", "")))
        val deptStr = location.stringOr("department", location.stringOr("departamento", ""))

        Property(
            id = document.id,
            title = title,
            price = price,
            currency = document.stringOr("currency", "Q"),
            type = document.stringOr("type", "casa"),
            status = document.stringOr("status", "disponible"),
            description = document.stringOr("description", document.stringOr("descripcion", "")),
            features = PropertyFeatures(
                bedrooms = bedrooms,
                bathrooms = bathrooms,
                area = area, parking = document.number("parking").toInt()
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
            ownerId = document.string("ownerId"),
            ownerName = document.string("ownerName"), ownerPhone = document.string("ownerPhone"), ownerPhoto = document.string("ownerPhoto"),
            ownerEmail = document.string("ownerEmail"), verified = document.getBoolean("verified") ?: false,
            furnished = document.getBoolean("furnished") ?: false, patio = document.getBoolean("patio") ?: false, petsAllowed = document.getBoolean("petsAllowed") ?: false,
            images = images,
            amenities = document.stringList("amenities"),
            rules = document.stringList("rules"),
            requirements = document.stringList("requirements"),
            maintenanceFee = document.number("maintenanceFee"),
            deposit = (document.get("deposit") as? Number)?.toDouble()
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
    RuwaBackend.invoke("updatePropertyStatus",mapOf("propertyId" to propertyId,"status" to newStatus))
        .addOnSuccessListener { onResult() }
        .addOnFailureListener { error -> android.util.Log.e("RuwaJay", "Operacion no guardada", error) }
}

fun deleteProperty(
    propertyId: String,
    onResult: () -> Unit = {}
) {
    FirebaseFirestore.getInstance().collection("properties").document(propertyId)
        .delete()
        .addOnSuccessListener { onResult() }
        .addOnFailureListener { error -> android.util.Log.e("RuwaJay", "Operacion no guardada", error) }
}

fun updateUserRole(
    userId: String,
    newRole: String,
    onResult: () -> Unit = {}
) {
    FirebaseFirestore.getInstance().collection("users").document(userId)
        .update("role", newRole)
        .addOnSuccessListener { onResult() }
        .addOnFailureListener { error -> android.util.Log.e("RuwaJay", "Operacion no guardada", error) }
}

fun toggleUserSuspension(
    userId: String,
    suspended: Boolean,
    onResult: () -> Unit = {}
) {
    FirebaseFirestore.getInstance().collection("users").document(userId)
        .update("suspended", suspended)
        .addOnSuccessListener { onResult() }
        .addOnFailureListener { error -> android.util.Log.e("RuwaJay", "Operacion no guardada", error) }
}


