package com.example.ruwajay.data.repository

import android.content.ContentResolver
import android.net.Uri
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.firestore.FieldValue

class ChatRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance(),
    private val storage: FirebaseStorage = FirebaseStorage.getInstance(),
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
) {
    fun observeConversations(userId: String, onChange: (List<Map<String, Any>>) -> Unit) =
        firestore.collection("conversations")
            .whereArrayContains("participants", userId)
            .orderBy("lastMessageTimestamp", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, _ ->
                onChange(snapshot?.documents?.map { it.data.orEmpty() + ("id" to it.id) } ?: emptyList())
            }

    fun getOrCreateConversation(
        propertyId: String,
        ownerId: String,
        propertyTitle: String,
        onResult: (Result<String>) -> Unit
    ) {
        val currentUser = auth.currentUser
        if (currentUser == null) {
            onResult(Result.failure(Exception("Debes iniciar sesión para iniciar un chat.")))
            return
        }

        firestore.collection("conversations")
            .whereEqualTo("propertyId", propertyId)
            .whereArrayContains("participants", currentUser.uid)
            .get()
            .addOnSuccessListener { querySnapshot ->
                if (!querySnapshot.isEmpty) {
                    val existingDoc = querySnapshot.documents.first()
                    onResult(Result.success(existingDoc.id))
                } else {
                    val targetOwnerId = if (ownerId.isNotBlank()) ownerId else "owner-1"
                    val newConversation = mapOf(
                        "propertyId" to propertyId,
                        "ownerId" to targetOwnerId,
                        "propertyTitle" to propertyTitle,
                        "participants" to listOf(currentUser.uid, targetOwnerId),
                        "lastMessage" to "Consulta sobre $propertyTitle",
                        "lastMessageTimestamp" to FieldValue.serverTimestamp(),
                        "lastSenderId" to currentUser.uid
                    )

                    firestore.collection("conversations").add(newConversation)
                        .addOnSuccessListener { docRef ->
                            onResult(Result.success(docRef.id))
                        }
                        .addOnFailureListener { error ->
                            onResult(Result.failure(error))
                        }
                }
            }
            .addOnFailureListener { error ->
                onResult(Result.failure(error))
            }
    }

    fun observeMessages(roomId: String, onChange: (List<Map<String, Any>>) -> Unit) =
        firestore.collection("conversations").document(roomId).collection("messages")
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, _ ->
                onChange(snapshot?.documents?.map { it.data.orEmpty() + ("id" to it.id) } ?: emptyList())
            }

    fun sendText(roomId: String, text: String, onResult: (Result<Unit>) -> Unit) {
        addMessage(roomId, mapOf("type" to "text", "text" to text), onResult)
    }

    fun sendLocation(roomId: String, latitude: Double, longitude: Double, onResult: (Result<Unit>) -> Unit) {
        addMessage(roomId, mapOf("type" to "location", "latitude" to latitude, "longitude" to longitude), onResult)
    }

    fun uploadMedia(
        roomId: String,
        uri: Uri,
        contentResolver: ContentResolver,
        type: String,
        onResult: (Result<Unit>) -> Unit
    ) {
        val uid = auth.currentUser?.uid ?: "anonymous"
        val extension = if (type == "audio") "m4a" else "jpg"
        val reference = storage.reference.child("chat/$roomId/$uid/${System.currentTimeMillis()}.$extension")
        val stream = contentResolver.openInputStream(uri)
        if (stream == null) {
            onResult(Result.failure(Exception("No se pudo leer el archivo.")))
            return
        }
        reference.putStream(stream)
            .continueWithTask { reference.downloadUrl }
            .addOnSuccessListener { downloadUri ->
                addMessage(roomId, mapOf("type" to type, "mediaUrl" to downloadUri.toString()), onResult)
            }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    private fun addMessage(roomId: String, payload: Map<String, Any>, onResult: (Result<Unit>) -> Unit) {
        val user = auth.currentUser ?: return onResult(Result.failure(Exception("Debes iniciar sesión.")))
        
        val message = payload + mapOf(
            "senderId" to user.uid,
            "senderName" to (user.displayName ?: "Usuario"),
            "createdAt" to FieldValue.serverTimestamp()
        )
        
        firestore.collection("conversations").document(roomId).collection("messages").add(message)
            .addOnSuccessListener {
                // Update conversation metadata
                firestore.collection("conversations").document(roomId).update(
                    mapOf(
                        "lastMessage" to (payload["text"] as? String ?: "Archivo enviado"),
                        "lastMessageTimestamp" to FieldValue.serverTimestamp(),
                        "lastSenderId" to user.uid
                    )
                )
                onResult(Result.success(Unit)) 
            }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }
}
