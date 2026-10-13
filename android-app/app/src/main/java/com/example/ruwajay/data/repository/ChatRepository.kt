package com.example.ruwajay.data.repository

import android.content.ContentResolver
import android.net.Uri
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.Query

class ChatRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance(),
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
) {
    fun observeConversations(userId: String, onError: (Exception) -> Unit = {}, onChange: (List<Map<String, Any>>) -> Unit) =
        firestore.collection("conversations").whereArrayContains("participants", userId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { onError(error); return@addSnapshotListener }
                onChange(snapshot?.documents?.filter { it.getString("migratedTo") == null && it.getBoolean("archived") != true }?.map { it.data.orEmpty() + ("id" to it.id) }
                    ?.sortedByDescending { (it["lastMessageTimestamp"] as? com.google.firebase.Timestamp)?.toDate()?.time ?: 0L } ?: emptyList())
            }

    fun getOrCreateConversation(propertyId: String, ownerId: String, propertyTitle: String, seekerId: String? = null,
        onResult: (Result<String>) -> Unit) {
        val user = auth.currentUser ?: return onResult(Result.failure(Exception("Debes iniciar sesion.")))
        RuwaBackend.invoke("openConversation", mapOf("propertyId" to propertyId, "ownerId" to ownerId, "seekerId" to (seekerId ?: user.uid)))
            .addOnSuccessListener { result ->
                val id = result["id"] as? String
                if (id != null) onResult(Result.success(id)) else onResult(Result.failure(Exception("Respuesta de chat invalida.")))
            }.addOnFailureListener { onResult(Result.failure(it)) }
    }
    fun observeMessages(roomId: String, onError: (Exception) -> Unit = {}, onChange: (List<Map<String, Any>>) -> Unit) =
        firestore.collection("conversations").document(roomId).collection("messages")
            .orderBy("createdAt", Query.Direction.ASCENDING).addSnapshotListener { snapshot, error ->
                if (error != null) { onError(error); return@addSnapshotListener }
                onChange(snapshot?.documents?.map { it.data.orEmpty() + ("id" to it.id) } ?: emptyList())
            }
    fun markAsRead(roomId: String, onError: (Exception) -> Unit = {}) {
        val uid = auth.currentUser?.uid ?: return
        firestore.collection("conversations").document(roomId).update("readAt.$uid", FieldValue.serverTimestamp())
            .addOnFailureListener { onError(it) }
    }
    fun sendText(roomId: String, text: String, onResult: (Result<Unit>) -> Unit) {
        if (text.isBlank() || text.length > 4000) return onResult(Result.failure(Exception("Mensaje invalido.")))
        addMessage(roomId, mapOf("type" to "text", "text" to text.trim()), onResult)
    }
    fun sendLocation(roomId: String, latitude: Double, longitude: Double, onResult: (Result<Unit>) -> Unit) {
        addMessage(roomId, mapOf("type" to "location", "text" to "Ubicacion", "latitude" to latitude, "longitude" to longitude), onResult)
    }
    fun uploadMedia(roomId: String, uri: Uri, contentResolver: ContentResolver, type: String, onResult: (Result<Unit>) -> Unit) {
        val uid = auth.currentUser?.uid ?: return onResult(Result.failure(Exception("Debes iniciar sesion.")))
        val mime = contentResolver.getType(uri) ?: if (type == "audio") "audio/mp4" else "image/jpeg"
        RuwaBackend.upload("chat",uri,contentResolver,roomId=roomId,mime=mime,expectedUid=uid)
            .addOnSuccessListener { url ->
                addMessage(roomId, mapOf("type" to type,"mediaUrl" to url,"text" to if(type=="audio") "Audio" else "Foto"), onResult,uid)
            }.addOnFailureListener { onResult(Result.failure(it)) }
    }

    private fun addMessage(roomId: String, payload: Map<String, Any>, onResult: (Result<Unit>) -> Unit, expectedUid: String? = null) {
        RuwaBackend.invoke("sendMessage",payload + ("roomId" to roomId),expectedUid)
            .addOnSuccessListener { onResult(Result.success(Unit)) }.addOnFailureListener { onResult(Result.failure(it)) }
    }
}
