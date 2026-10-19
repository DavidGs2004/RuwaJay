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
        val sid = seekerId ?: user.uid
        val targetOwnerId = if (ownerId.isNotBlank()) ownerId else "owner-1"
        val cleanRoomId = listOf(sid, targetOwnerId, propertyId).sorted().joinToString("_").replace(Regex("[^a-zA-Z0-9_]"), "")
        val conversationData = mapOf(
            "propertyId" to propertyId,
            "ownerId" to targetOwnerId,
            "propertyTitle" to propertyTitle,
            "participants" to listOf(sid, targetOwnerId),
            "lastMessage" to "Consulta sobre $propertyTitle",
            "lastMessageTimestamp" to FieldValue.serverTimestamp(),
            "lastSenderId" to user.uid
        )
        firestore.collection("conversations").document(cleanRoomId).set(conversationData, com.google.firebase.firestore.SetOptions.merge())
            .addOnSuccessListener { onResult(Result.success(cleanRoomId)) }
            .addOnFailureListener {
                RuwaBackend.invoke("openConversation", mapOf("propertyId" to propertyId, "ownerId" to ownerId, "seekerId" to sid))
                    .addOnSuccessListener { result ->
                        val id = result["id"] as? String
                        if (id != null) onResult(Result.success(id)) else onResult(Result.failure(Exception("Respuesta de chat invalida.")))
                    }.addOnFailureListener { onResult(Result.failure(it)) }
            }
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
    fun sendText(roomId: String, text: String, replyTo: Map<String, Any>? = null, onResult: (Result<Unit>) -> Unit) {
        if (text.isBlank() || text.length > 4000) return onResult(Result.failure(Exception("Mensaje invalido.")))
        val payload = mutableMapOf<String, Any>("type" to "text", "text" to text.trim())
        if (replyTo != null) payload["replyTo"] = replyTo
        addMessage(roomId, payload, onResult)
    }
    fun sendLocation(roomId: String, latitude: Double, longitude: Double, onResult: (Result<Unit>) -> Unit) {
        addMessage(roomId, mapOf("type" to "location", "text" to "Ubicacion", "latitude" to latitude, "longitude" to longitude), onResult)
    }
    fun uploadMedia(roomId: String, uri: Uri, contentResolver: ContentResolver, type: String, caption: String? = null, replyTo: Map<String, Any>? = null, onResult: (Result<Unit>) -> Unit) {
        val uid = auth.currentUser?.uid ?: return onResult(Result.failure(Exception("Debes iniciar sesion.")))
        val mime = contentResolver.getType(uri) ?: if (type == "audio") "audio/mp4" else if (type == "video") "video/mp4" else "image/jpeg"
        RuwaBackend.upload("chat",uri,contentResolver,roomId=roomId,mime=mime,expectedUid=uid)
            .addOnSuccessListener { url ->
                val fallbackText = if (type == "audio") "Audio" else if (type == "video") "Video" else "Foto"
                val displayText = if (!caption.isNullOrBlank()) caption.trim() else fallbackText
                val payload = mutableMapOf<String, Any>("type" to type, "mediaUrl" to url, "text" to displayText)
                if (replyTo != null) payload["replyTo"] = replyTo
                addMessage(roomId, payload, onResult, uid)
            }.addOnFailureListener { onResult(Result.failure(it)) }
    }

    fun editMessage(roomId: String, messageId: String, newText: String, onResult: (Result<Unit>) -> Unit) {
        if (newText.isBlank() || newText.length > 4000) return onResult(Result.failure(Exception("Mensaje inválido.")))
        firestore.collection("conversations").document(roomId).collection("messages").document(messageId)
            .update(mapOf("text" to newText.trim(), "isEdited" to true, "editedAt" to FieldValue.serverTimestamp()))
            .addOnSuccessListener { onResult(Result.success(Unit)) }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    fun deleteMessage(roomId: String, messageId: String, onResult: (Result<Unit>) -> Unit) {
        firestore.collection("conversations").document(roomId).collection("messages").document(messageId)
            .update(mapOf("isDeleted" to true, "text" to "Este mensaje fue eliminado", "mediaUrl" to FieldValue.delete(), "image" to FieldValue.delete(), "deletedAt" to FieldValue.serverTimestamp()))
            .addOnSuccessListener { onResult(Result.success(Unit)) }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    fun toggleReaction(roomId: String, messageId: String, emoji: String, currentEmoji: String?, onResult: (Result<Unit>) -> Unit) {
        val uid = auth.currentUser?.uid ?: return onResult(Result.failure(Exception("Debes iniciar sesión.")))
        val updateValue = if (currentEmoji == emoji) FieldValue.delete() else emoji
        firestore.collection("conversations").document(roomId).collection("messages").document(messageId)
            .update("reactions.$uid", updateValue)
            .addOnSuccessListener { onResult(Result.success(Unit)) }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    fun clearChat(roomId: String, onResult: (Result<Unit>) -> Unit) {
        val uid = auth.currentUser?.uid ?: return onResult(Result.failure(Exception("Debes iniciar sesión.")))
        firestore.collection("conversations").document(roomId)
            .update("clearedAt.$uid", FieldValue.serverTimestamp())
            .addOnSuccessListener { onResult(Result.success(Unit)) }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    private fun addMessage(roomId: String, payload: Map<String, Any>, onResult: (Result<Unit>) -> Unit, expectedUid: String? = null) {
        val user = auth.currentUser ?: return onResult(Result.failure(Exception("Debes iniciar sesion.")))
        if (expectedUid != null && expectedUid != user.uid) {
            return onResult(Result.failure(Exception("La sesión cambió. Inténtalo con la cuenta actual.")))
        }
        if (RuwaBackend.isConfigured) {
            RuwaBackend.invoke("sendMessage", payload + ("roomId" to roomId), user.uid)
                .addOnSuccessListener { onResult(Result.success(Unit)) }
                .addOnFailureListener { onResult(Result.failure(it)) }
            return
        }
        val message = payload + mapOf(
            "senderId" to user.uid,
            "senderName" to (user.displayName ?: "Usuario"),
            "createdAt" to FieldValue.serverTimestamp()
        )
        val roomRef = firestore.collection("conversations").document(roomId)
        val messageRef = roomRef.collection("messages").document()
        val batch = firestore.batch()
        batch.set(messageRef, message)
        batch.update(roomRef,
                    mapOf(
                        "lastMessage" to (payload["text"] as? String ?: "Archivo enviado"),
                        "lastMessageTimestamp" to FieldValue.serverTimestamp(),
                        "lastSenderId" to user.uid,
                        "lastMessageId" to messageRef.id
                    )
        )
        batch.commit().addOnSuccessListener { onResult(Result.success(Unit)) }
            .addOnFailureListener {
                RuwaBackend.invoke("sendMessage", payload + ("roomId" to roomId), expectedUid)
                    .addOnSuccessListener { onResult(Result.success(Unit)) }
                    .addOnFailureListener { onResult(Result.failure(it)) }
            }
    }
}
