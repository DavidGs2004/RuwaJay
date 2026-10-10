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
    fun observeUserVisits(onChange: (List<VisitRequest>) -> Unit): ListenerRegistration? {
        val user = auth.currentUser ?: run {
            onChange(emptyList())
            return null
        }

        return firestore.collection("visits")
            .whereIn("ownerId", listOf(user.uid))
            .addSnapshotListener { ownerSnap, _ ->
                val ownerList = ownerSnap?.documents?.mapNotNull { docToVisit(it.id, it.data) }.orEmpty()

                firestore.collection("visits")
                    .whereIn("tenantId", listOf(user.uid))
                    .addSnapshotListener { tenantSnap, _ ->
                        val tenantList = tenantSnap?.documents?.mapNotNull { docToVisit(it.id, it.data) }.orEmpty()
                        val combined = (ownerList + tenantList)
                            .distinctBy { it.id }
                            .sortedByDescending { it.createdAtIso }

                        onChange(combined)
                    }
            }
    }

    fun createVisit(
        propertyId: String,
        propertyTitle: String,
        propertyAddress: String,
        ownerId: String,
        ownerName: String,
        visitDate: String,
        visitTime: String,
        notes: String,
        onResult: (Result<String>) -> Unit
    ) {
        val user = auth.currentUser
        if (user == null) {
            onResult(Result.failure(Exception("Debes iniciar sesión para agendar una visita.")))
            return
        }

        val visitId = "visit_${System.currentTimeMillis()}"
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        val nowIso = isoFormat.format(Date())

        val visitData = mapOf(
            "id" to visitId,
            "propertyId" to propertyId,
            "propertyTitle" to propertyTitle,
            "propertyAddress" to propertyAddress,
            "ownerId" to if (ownerId.isNotBlank()) ownerId else "owner-1",
            "ownerName" to if (ownerName.isNotBlank()) ownerName else "Propietario",
            "tenantId" to user.uid,
            "tenantName" to (user.displayName ?: "Inquilino"),
            "tenantEmail" to (user.email ?: ""),
            "tenantPhone" to (user.phoneNumber ?: ""),
            "visitDate" to visitDate,
            "visitTime" to visitTime,
            "notes" to notes,
            "status" to "pendiente",
            "createdAtIso" to nowIso,
            "createdAt" to FieldValue.serverTimestamp()
        )

        firestore.collection("visits").document(visitId).set(visitData)
            .addOnSuccessListener {
                onResult(Result.success(visitId))
            }
            .addOnFailureListener {
                onResult(Result.failure(it))
            }
    }

    fun updateVisitStatus(visitId: String, newStatus: String, onResult: (Result<Unit>) -> Unit) {
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        val nowIso = isoFormat.format(Date())

        firestore.collection("visits").document(visitId).update(
            mapOf(
                "status" to newStatus,
                "updatedAtIso" to nowIso,
                "updatedAt" to FieldValue.serverTimestamp()
            )
        )
            .addOnSuccessListener { onResult(Result.success(Unit)) }
            .addOnFailureListener { onResult(Result.failure(it)) }
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
                visitDate = data["visitDate"] as? String ?: "",
                visitTime = data["visitTime"] as? String ?: "",
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
