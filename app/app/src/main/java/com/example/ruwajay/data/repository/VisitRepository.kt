package com.example.ruwajay.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class VisitRequest(
    val id: String = "",
    val propertyId: String = "",
    val propertyTitle: String = "",
    val propertyAddress: String = "",
    val ownerId: String = "",
    val ownerName: String = "",
    val tenantId: String = "",
    val tenantName: String = "",
    val tenantPhone: String = "",
    val tenantEmail: String = "",
    val visitDate: String = "",
    val visitTime: String = "",
    val notes: String = "",
    val status: String = "pendiente", // pendiente, confirmada, cancelada
    val createdAtIso: String = "",
    val conversationId: String = ""
)

class VisitRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance(),
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
) {
    fun observeUserVisits(onError: (Exception) -> Unit = {}, onChange: (List<VisitRequest>) -> Unit): ListenerRegistration? {
        val user = auth.currentUser ?: run { onChange(emptyList()); return null }
        var owner = emptyList<VisitRequest>()
        var tenant = emptyList<VisitRequest>()
        fun emit() = onChange((owner + tenant).distinctBy { it.id }.sortedByDescending { it.createdAtIso })
        val a = firestore.collection("visits").whereEqualTo("ownerId", user.uid).addSnapshotListener { snap, error ->
            if (error != null) onError(error) else { owner = snap?.documents?.mapNotNull { docToVisit(it.id,it.data) }.orEmpty(); emit() }
        }
        val b = firestore.collection("visits").whereEqualTo("tenantId", user.uid).addSnapshotListener { snap, error ->
            if (error != null) onError(error) else { tenant = snap?.documents?.mapNotNull { docToVisit(it.id,it.data) }.orEmpty(); emit() }
        }
        return object : ListenerRegistration { override fun remove() { a.remove(); b.remove() } }
    }
    fun createVisit(propertyId: String, propertyTitle: String, propertyAddress: String, ownerId: String, ownerName: String,
        visitDate: String, visitTime: String, notes: String, onResult: (Result<String>) -> Unit) {
        val cleanDate = normalizeDate(visitDate)
        val cleanTime = normalizeTime(visitTime)
        val user = auth.currentUser
        if (user == null) {
            onResult(Result.failure(Exception("Debes iniciar sesión para agendar una visita.")))
            return
        }

        fallbackCreateVisitInFirestore(
            propertyId, propertyTitle, propertyAddress, ownerId, ownerName,
            cleanDate, cleanTime, notes, user
        ) { result ->
            onResult(result)
            if (result.isSuccess) {
                try {
                    RuwaBackend.invoke("createVisit", mapOf("propertyId" to propertyId, "date" to cleanDate, "time" to cleanTime, "notes" to notes))
                } catch (_: Exception) {}
            }
        }
    }

    private fun fallbackCreateVisitInFirestore(
        propertyId: String, propertyTitle: String, propertyAddress: String, ownerId: String, ownerName: String,
        cleanDate: String, cleanTime: String, notes: String, user: com.google.firebase.auth.FirebaseUser,
        onResult: (Result<String>) -> Unit
    ) {
        val docRef = firestore.collection("visits").document()
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        val visitData = hashMapOf(
            "propertyId" to propertyId,
            "propertyTitle" to propertyTitle,
            "propertyAddress" to propertyAddress,
            "ownerId" to ownerId,
            "ownerName" to ownerName.ifBlank { "Propietario" },
            "tenantId" to user.uid,
            "tenantName" to (user.displayName?.ifBlank { "Inquilino" } ?: "Inquilino"),
            "tenantPhone" to (user.phoneNumber ?: ""),
            "tenantEmail" to (user.email ?: ""),
            "date" to cleanDate,
            "visitDate" to cleanDate,
            "time" to cleanTime,
            "visitTime" to cleanTime,
            "notes" to notes,
            "status" to "pendiente",
            "createdAt" to FieldValue.serverTimestamp(),
            "createdAtIso" to isoFormat.format(Date())
        )
        docRef.set(visitData)
            .addOnSuccessListener { onResult(Result.success(docRef.id)) }
            .addOnFailureListener { err -> onResult(Result.failure(err)) }
    }

    private fun normalizeDate(input: String): String {
        val trimmed = input.trim()
        if (trimmed.matches(Regex("""^\d{4}-\d{2}-\d{2}$"""))) return trimmed
        val dmy = Regex("""^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$""").find(trimmed)
        if (dmy != null) {
            val (d, m, y) = dmy.destructured
            return String.format(Locale.US, "%04d-%02d-%02d", y.toInt(), m.toInt(), d.toInt())
        }
        return trimmed
    }

    private fun normalizeTime(input: String): String {
        val trimmed = input.trim()
        if (trimmed.matches(Regex("""^([01]\d|2[0-3]):[0-5]\d$"""))) return trimmed
        val ampmMatch = Regex("""^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$""").find(trimmed)
        if (ampmMatch != null) {
            val (hStr, mStr, period) = ampmMatch.destructured
            var h = hStr.toInt()
            val m = mStr.toInt()
            if (period.equals("PM", ignoreCase = true) && h < 12) h += 12
            if (period.equals("AM", ignoreCase = true) && h == 12) h = 0
            return String.format(Locale.US, "%02d:%02d", h, m)
        }
        val shortMatch = Regex("""^(\d{1}):(\d{2})$""").find(trimmed)
        if (shortMatch != null) {
            val (hStr, mStr) = shortMatch.destructured
            return String.format(Locale.US, "%02d:%02d", hStr.toInt(), mStr.toInt())
        }
        return trimmed
    }

    fun updateVisitStatus(visitId: String, newStatus: String, onResult: (Result<Unit>) -> Unit) {
        firestore.collection("visits").document(visitId)
            .update("status", newStatus, "updatedAt", FieldValue.serverTimestamp())
            .addOnSuccessListener {
                onResult(Result.success(Unit))
                try {
                    RuwaBackend.invoke("changeVisitStatus", mapOf("visitId" to visitId, "status" to newStatus))
                } catch (_: Exception) {}
            }
            .addOnFailureListener { err ->
                onResult(Result.failure(err))
            }
    }

    private fun docToVisit(id: String, data: Map<String, Any>?): VisitRequest? {
        if (data == null) return null
        return try {
            VisitRequest(
                id = id,
                propertyId = data["propertyId"] as? String ?: "",
                propertyTitle = data["propertyTitle"] as? String ?: "",
                propertyAddress = data["propertyAddress"] as? String ?: "",
                ownerId = data["ownerId"] as? String ?: "",
                ownerName = data["ownerName"] as? String ?: "",
                tenantId = data["tenantId"] as? String ?: "",
                tenantName = data["tenantName"] as? String ?: "",
                tenantPhone = data["tenantPhone"] as? String ?: "",
                tenantEmail = data["tenantEmail"] as? String ?: "",
                visitDate = data["date"] as? String ?: data["visitDate"] as? String ?: "",
                visitTime = data["time"] as? String ?: data["visitTime"] as? String ?: "",
                notes = data["notes"] as? String ?: "",
                status = data["status"] as? String ?: "pendiente",
                createdAtIso = data["createdAtIso"] as? String ?: "",
                conversationId = data["conversationId"] as? String ?: ""
            )
        } catch (_: Exception) {
            null
        }
    }
}
