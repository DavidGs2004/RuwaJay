package com.example.ruwajay.data.repository

import android.content.Context
import android.util.Log
import com.example.ruwajay.RuwaNotifications
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.MetadataChanges

/** Live alerts for incoming messages and system notices. Shows notifications whenever the user is not actively inside that specific chat room. */
fun observeForegroundNotifications(
    context: Context,
    uid: String,
    isViewingRoom: (String) -> Boolean
): () -> Unit {
    val db = FirebaseFirestore.getInstance()
    // Hora de inicio para ignorar cualquier mensaje o aviso anterior a que el usuario abriera la app
    val sessionStartTime = System.currentTimeMillis() - 3_000L
    val tracker = IncomingMessageTracker(uid, sessionStartTime)
    val messages = db.collection("conversations").whereArrayContains("participants", uid)
        .addSnapshotListener(MetadataChanges.INCLUDE) { snapshot, error ->
            if (error != null) { Log.w("RuwaNotifications", "No se pudieron observar mensajes", error); return@addSnapshotListener }
            if (snapshot == null || snapshot.metadata.isFromCache || FirebaseAuth.getInstance().currentUser?.uid != uid) return@addSnapshotListener
            val incoming = tracker.update(snapshot.documents.filter {
                it.getString("migratedTo") == null && it.getBoolean("archived") != true
            }.map {
                val readAt = (it.get("readAt") as? Map<*, *>)?.get(uid) as? Timestamp
                val senderName = it.getString("lastSenderName")
                    ?: (if (it.getString("ownerId") == uid) it.getString("seekerName") else it.getString("ownerName"))
                    ?: it.getString("participantName")
                    ?: it.getString("otherUserName")
                    ?: it.getString("propertyTitle")?.takeIf(String::isNotBlank)
                    ?: "Nuevo mensaje"
                IncomingMessage(
                    it.id,
                    it.getString("lastMessageId") ?: "",
                    it.getTimestamp("lastMessageTimestamp")?.toDate()?.time ?: 0L,
                    it.getString("lastSenderId") ?: "",
                    readAt?.toDate()?.time ?: 0L,
                    it.getString("lastMessage") ?: "Nuevo mensaje",
                    senderName
                )
            })
            incoming.forEach {
                if (!isViewingRoom(it.roomId)) {
                    RuwaNotifications.show(
                        context,
                        it.title,
                        it.body,
                        "/chat?conversation=${android.net.Uri.encode(it.roomId)}",
                        it.eventId
                    )
                }
            }
        }
    var seenNotices: Set<String>? = null
    val notices = db.collection("users").document(uid).collection("notifications")
        .addSnapshotListener(MetadataChanges.INCLUDE) { snapshot, error ->
            if (error != null) { Log.w("RuwaNotifications", "No se pudieron observar avisos", error); return@addSnapshotListener }
            if (snapshot == null || snapshot.metadata.isFromCache || FirebaseAuth.getInstance().currentUser?.uid != uid) return@addSnapshotListener
            val currentDocs = snapshot.documents
            val previous = seenNotices
            seenNotices = currentDocs.map { it.id }.toSet()
            if (previous != null) {
                currentDocs.filter {
                    val createdAt = (it.get("createdAt") as? Timestamp)?.toDate()?.time ?: 0L
                    it.id !in previous && it.get("readAt") == null && it.getString("type") != "call" && (createdAt == 0L || createdAt >= sessionStartTime)
                }.forEach {
                    RuwaNotifications.show(
                        context,
                        it.getString("title") ?: "RuwaJay",
                        it.getString("body") ?: "",
                        it.getString("path") ?: "/perfil",
                        it.id
                    )
                }
            }
        }
    return { messages.remove(); notices.remove() }
}
