package com.example.ruwajay.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.Timestamp
import com.google.firebase.messaging.FirebaseMessaging
import java.security.MessageDigest

data class AppNotification(
    val id: String = "",
    val title: String = "",
    val body: String = "",
    val path: String = "",
    val type: String = "",
    val readAt: Any? = null,
    val createdAt: Any? = null
) {
    val isRead: Boolean get() = readAt != null
}

object NotificationRepository {
    fun register(onResult: (Result<Unit>) -> Unit = {}) {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            if (FirebaseAuth.getInstance().currentUser?.uid != uid) return@addOnSuccessListener
            val id = MessageDigest.getInstance("SHA-256").digest(token.toByteArray()).joinToString("") { "%02x".format(it) }
            FirebaseFirestore.getInstance().collection("users").document(uid).collection("devices").document(id)
                .set(mapOf("token" to token,"platform" to "android","updatedAt" to FieldValue.serverTimestamp()))
                .addOnSuccessListener { onResult(Result.success(Unit)) }.addOnFailureListener { onResult(Result.failure(it)) }
        }.addOnFailureListener { onResult(Result.failure(it)) }
    }

    fun observeNotifications(uid: String, onUpdate: (List<AppNotification>) -> Unit): ListenerRegistration {
        return FirebaseFirestore.getInstance().collection("users").document(uid).collection("notifications")
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) return@addSnapshotListener
                val list = snapshot.documents.map { doc ->
                    AppNotification(
                        id = doc.id,
                        title = doc.getString("title") ?: "Aviso",
                        body = doc.getString("body") ?: "",
                        path = doc.getString("path") ?: "/perfil",
                        type = doc.getString("type") ?: "message",
                        readAt = doc.get("readAt"),
                        createdAt = doc.get("createdAt")
                    )
                }.sortedByDescending {
                    (it.createdAt as? Timestamp)?.toDate()?.time ?: 0L
                }
                onUpdate(list)
            }
    }

    fun markAsRead(uid: String, notificationId: String) {
        FirebaseFirestore.getInstance().collection("users").document(uid).collection("notifications").document(notificationId)
            .update("readAt", FieldValue.serverTimestamp())
    }

    fun markAllAsRead(uid: String, notificationIds: List<String>) {
        if (notificationIds.isEmpty()) return
        val db = FirebaseFirestore.getInstance()
        val batch = db.batch()
        notificationIds.take(400).forEach { id ->
            val ref = db.collection("users").document(uid).collection("notifications").document(id)
            batch.update(ref, "readAt", FieldValue.serverTimestamp())
        }
        batch.commit()
    }

    fun signOut(onResult: () -> Unit) {
        val uid = FirebaseAuth.getInstance().currentUser?.uid
        if (uid != null) {
            try { PublicProfileRepository.publishPresence(false) } catch (_: Exception) {}

            try {
                FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                    try {
                        if (task.isSuccessful && task.result != null) {
                            val token = task.result
                            val id = MessageDigest.getInstance("SHA-256").digest(token.toByteArray()).joinToString("") { "%02x".format(it) }
                            FirebaseFirestore.getInstance().collection("users").document(uid).collection("devices").document(id).delete()
                        }
                    } catch (_: Exception) {}
                    try { FirebaseMessaging.getInstance().deleteToken() } catch (_: Exception) {}
                }
            } catch (_: Exception) {}
        }
        try {
            FirebaseAuth.getInstance().signOut()
        } catch (_: Exception) {}
        onResult()
    }
}
