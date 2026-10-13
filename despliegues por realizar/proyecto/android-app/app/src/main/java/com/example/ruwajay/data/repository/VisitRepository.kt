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
        com.google.firebase.functions.FirebaseFunctions.getInstance("us-central1").getHttpsCallable("createVisit")
            .call(mapOf("propertyId" to propertyId,"date" to visitDate,"time" to visitTime,"notes" to notes))
            .addOnSuccessListener { response ->
                val id = (response.getData() as? Map<*, *>)?.get("id") as? String
                if (id != null) onResult(Result.success(id)) else onResult(Result.failure(Exception("Respuesta invalida.")))
            }.addOnFailureListener { onResult(Result.failure(it)) }
    }
    fun updateVisitStatus(visitId: String, newStatus: String, onResult: (Result<Unit>) -> Unit) {
        com.google.firebase.functions.FirebaseFunctions.getInstance("us-central1").getHttpsCallable("changeVisitStatus")
            .call(mapOf("visitId" to visitId,"status" to newStatus))
            .addOnSuccessListener { onResult(Result.success(Unit)) }.addOnFailureListener { onResult(Result.failure(it)) }
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
