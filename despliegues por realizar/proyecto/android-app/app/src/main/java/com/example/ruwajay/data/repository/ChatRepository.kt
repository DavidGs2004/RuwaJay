package com.example.ruwajay.data.repository

import android.content.ContentResolver
import android.net.Uri
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.Query
import com.google.firebase.functions.FirebaseFunctions
import com.google.firebase.storage.FirebaseStorage

class ChatRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance(),
    private val storage: FirebaseStorage = FirebaseStorage.getInstance(),
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
        FirebaseFunctions.getInstance("us-central1").getHttpsCallable("openConversation")
            .call(mapOf("propertyId" to propertyId, "ownerId" to ownerId, "seekerId" to (seekerId ?: user.uid)))
            .addOnSuccessListener { result ->
                val id = (result.getData() as? Map<*, *>)?.get("id") as? String
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
        val reference = storage.reference.child("chat/$roomId/$uid/${java.util.UUID.randomUUID()}")
        val mime = contentResolver.getType(uri) ?: if (type == "audio") "audio/mp4" else "image/jpeg"
        val metadata = com.google.firebase.storage.StorageMetadata.Builder().setContentType(mime).build()
        reference.putFile(uri, metadata).continueWithTask { task ->
            if (!task.isSuccessful) throw task.exception ?: Exception("No se pudo subir el archivo.")
            reference.downloadUrl
        }.addOnSuccessListener { url ->
            addMessage(roomId, mapOf("type" to type, "mediaUrl" to url.toString(), "text" to if (type == "audio") "Audio" else "Foto"), onResult)
        }.addOnFailureListener { onResult(Result.failure(it)) }
    }
    private fun addMessage(roomId: String, payload: Map<String, Any>, onResult: (Result<Unit>) -> Unit) {
        val user = auth.currentUser ?: return onResult(Result.failure(Exception("Debes iniciar sesion.")))
        val room = firestore.collection("conversations").document(roomId)
        val ref = room.collection("messages").document()
        firestore.collection("users").document(user.uid).get().addOnSuccessListener { profile ->
            val batch = firestore.batch()
            batch.set(ref, payload + mapOf("senderId" to user.uid,
                "senderName" to (profile.getString("name") ?: user.displayName ?: "Usuario"),
                "createdAt" to FieldValue.serverTimestamp(), "status" to "sent"))
            batch.update(room, mapOf("lastMessage" to (payload["text"] ?: "Archivo"),
                "lastMessageTimestamp" to FieldValue.serverTimestamp(), "lastSenderId" to user.uid,"lastMessageId" to ref.id))
            batch.commit().addOnSuccessListener { onResult(Result.success(Unit)) }.addOnFailureListener { onResult(Result.failure(it)) }
        }.addOnFailureListener { onResult(Result.failure(it)) }
    }
}
