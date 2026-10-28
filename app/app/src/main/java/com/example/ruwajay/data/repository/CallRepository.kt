package com.example.ruwajay.data.repository

import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.receiveAsFlow

object CallRequestBus {
    // Channel conserva la solicitud aunque la capa global de llamada todavia
    // se este componiendo; SharedFlow sin replay podia descartarla silenciosamente.
    private val requests = Channel<Map<String, Any>>(Channel.BUFFERED)
    val events = requests.receiveAsFlow()

    fun start(data: Map<String, Any>): Boolean = requests.trySend(data).isSuccess

    private val incomingPushes = Channel<String>(Channel.BUFFERED)
    val incomingPushEvents = incomingPushes.receiveAsFlow()

    fun notifyIncomingPush(callId: String): Boolean = incomingPushes.trySend(callId).isSuccess
}

data class CallSession(
    val id: String = "",
    val callerId: String = "",
    val callerName: String = "Contacto",
    val callerAvatar: String = "",
    val callerEmail: String = "",
    val receiverId: String = "",
    val receiverName: String = "Contacto",
    val receiverAvatar: String = "",
    val receiverEmail: String = "",
    val propertyTitle: String = "Propiedad RuwaJay",
    val propertyImage: String = "",
    val roomId: String? = null,
    val status: String = "idle",
    val offer: Map<String, Any>? = null,
    val answer: Map<String, Any>? = null,
    val callerCandidates: List<Map<String, Any>> = emptyList(),
    val receiverCandidates: List<Map<String, Any>> = emptyList(),
    val callerMuted: Boolean = false,
    val receiverMuted: Boolean = false,
    val isCaller: Boolean = false
)

class CallRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {

    fun observeIncomingCalls(
        userId: String,
        userEmail: String,
        onIncoming: (CallSession) -> Unit
    ): ListenerRegistration {
        return firestore.collection("active_calls")
            .whereEqualTo("receiverId", userId)
            .whereEqualTo("status", "calling")
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) return@addSnapshotListener

                for (doc in snapshot.documents) {
                    val data = doc.data ?: continue
                    val callerId = data["callerId"] as? String ?: ""
                    if (callerId == userId) continue // Ignorar llamadas generadas por nosotros mismos

                    val receiverId = data["receiverId"] as? String ?: ""
                    val receiverEmail = (data["receiverEmail"] as? String ?: "").lowercase().trim()
                    val receiverIds = (data["receiverIds"] as? List<*>)?.mapNotNull { it?.toString() } ?: emptyList()
                    val receiverEmails = (data["receiverEmails"] as? List<*>)?.mapNotNull { it?.toString()?.lowercase()?.trim() } ?: emptyList()
                    val participants = (data["participants"] as? List<*>)?.mapNotNull { it?.toString() } ?: emptyList()

                    val matchesId = receiverId == userId || receiverIds.contains(userId) || participants.contains(userId)
                    val matchesEmail = userEmail.isNotBlank() && (receiverEmail == userEmail.lowercase().trim() || receiverEmails.contains(userEmail.lowercase().trim()))

                    if (matchesId || matchesEmail) {
                        val session = parseCallSession(doc.id, data, isCaller = false)
                        onIncoming(session)
                        break
                    }
                }
            }
    }

    fun observeCall(callId: String, currentUserId: String, onUpdate: (CallSession) -> Unit): ListenerRegistration {
        return firestore.collection("active_calls").document(callId)
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null || !snapshot.exists()) return@addSnapshotListener
                val data = snapshot.data ?: return@addSnapshotListener
                onUpdate(parseCallSession(snapshot.id, data, isCaller = data["callerId"] == currentUserId))
            }
    }

    fun startCall(data: Map<String, Any>, onResult: (Result<String>) -> Unit) {
        val docRef = firestore.collection("active_calls").document()
        val fullData = data + mapOf(
            "status" to "calling",
            "createdAt" to FieldValue.serverTimestamp()
        )
        docRef.set(fullData)
            .addOnSuccessListener { onResult(Result.success(docRef.id)) }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    fun publishOffer(callId: String, offerSdp: String, onResult: (Result<Unit>) -> Unit) {
        firestore.collection("active_calls").document(callId)
            .set(mapOf("offer" to mapOf("sdp" to offerSdp, "type" to "offer")), SetOptions.merge())
            .addOnSuccessListener { onResult(Result.success(Unit)) }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    fun answerCall(callId: String, answerSdp: String, onResult: (Result<Unit>) -> Unit) {
        val updates = mapOf(
            "status" to "connected",
            "answer" to mapOf("sdp" to answerSdp, "type" to "answer"),
            "connectedAt" to FieldValue.serverTimestamp()
        )
        firestore.collection("active_calls").document(callId)
            .set(updates, SetOptions.merge())
            .addOnSuccessListener { onResult(Result.success(Unit)) }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    fun addIceCandidate(callId: String, candidateMap: Map<String, Any>, isCaller: Boolean) {
        val field = if (isCaller) "callerCandidates" else "receiverCandidates"
        firestore.collection("active_calls").document(callId)
            .update(field, FieldValue.arrayUnion(candidateMap))
            .addOnFailureListener {
                firestore.collection("active_calls").document(callId)
                    .set(mapOf(field to FieldValue.arrayUnion(candidateMap)), SetOptions.merge())
            }
    }

    fun updateMuteState(callId: String, isCaller: Boolean, isMuted: Boolean) {
        val field = if (isCaller) "callerMuted" else "receiverMuted"
        firestore.collection("active_calls").document(callId)
            .set(mapOf(field to isMuted), SetOptions.merge())
    }

    fun endCall(callId: String, reason: String = "ended") {
        firestore.collection("active_calls").document(callId)
            .set(mapOf(
                "status" to reason,
                "endedAt" to FieldValue.serverTimestamp()
            ), SetOptions.merge())
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseCallSession(id: String, data: Map<String, Any>, isCaller: Boolean): CallSession {
        return CallSession(
            id = id,
            callerId = data["callerId"] as? String ?: "",
            callerName = data["callerName"] as? String ?: "Contacto",
            callerAvatar = data["callerAvatar"] as? String ?: "",
            callerEmail = data["callerEmail"] as? String ?: "",
            receiverId = data["receiverId"] as? String ?: "",
            receiverName = data["receiverName"] as? String ?: "Contacto",
            receiverAvatar = data["receiverAvatar"] as? String ?: "",
            receiverEmail = data["receiverEmail"] as? String ?: "",
            propertyTitle = data["propertyTitle"] as? String ?: "Propiedad RuwaJay",
            propertyImage = data["propertyImage"] as? String ?: "",
            roomId = data["roomId"] as? String,
            status = data["status"] as? String ?: "idle",
            offer = data["offer"] as? Map<String, Any>,
            answer = data["answer"] as? Map<String, Any>,
            callerCandidates = (data["callerCandidates"] as? List<*>)?.filterIsInstance<Map<String, Any>>() ?: emptyList(),
            receiverCandidates = (data["receiverCandidates"] as? List<*>)?.filterIsInstance<Map<String, Any>>() ?: emptyList(),
            callerMuted = data["callerMuted"] as? Boolean ?: false,
            receiverMuted = data["receiverMuted"] as? Boolean ?: false,
            isCaller = isCaller
        )
    }
}
