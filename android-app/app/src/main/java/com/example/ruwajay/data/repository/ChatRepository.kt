package com.example.ruwajay.data.repository

import android.content.ContentResolver
import android.net.Uri
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.storage.FirebaseStorage

class ChatRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance(),
    private val storage: FirebaseStorage = FirebaseStorage.getInstance(),
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
) {
    fun observeMessages(roomId: String, onChange: (List<Map<String, Any>>) -> Unit) =
        firestore.collection("conversations").document(roomId).collection("messages")
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, _ ->
                onChange(snapshot?.documents?.map { it.data.orEmpty() } ?: emptyList())
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
        val user = auth.currentUser
        val message = payload + mapOf(
            "senderId" to (user?.uid ?: "anonymous"),
            "createdAt" to System.currentTimeMillis()
        )
        firestore.collection("conversations").document(roomId).collection("messages").add(message)
            .addOnSuccessListener { onResult(Result.success(Unit)) }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }
}
