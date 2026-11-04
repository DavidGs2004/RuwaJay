package com.example.ruwajay.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.SetOptions

/** Datos públicos mínimos de un contacto: foto, nombre y estado en línea. */
data class PublicProfile(val name: String = "", val avatar: String = "", val isOnline: Boolean = false)

/**
 * Perfil público en /public_profiles/{uid}. Las reglas de Firestore solo permiten leer
 * /users/{uid} al propio usuario, por lo que la foto y la presencia de los contactos se
 * publican aquí (sin datos sensibles).
 */
object PublicProfileRepository {
    private val avatarKeys = listOf("avatarImage", "avatar", "photoURL", "photoUrl", "avatarUrl", "profileImage")

    fun extractAvatar(data: Map<String, Any?>?): String =
        avatarKeys.firstNotNullOfOrNull { key -> (data?.get(key) as? String)?.trim()?.takeIf { it.isNotBlank() && it != "null" } }.orEmpty()

    /** Publica la presencia y sincroniza nombre/foto desde el perfil privado propio. */
    fun publishPresence(isOnline: Boolean) {
        val user = FirebaseAuth.getInstance().currentUser ?: return
        val db = FirebaseFirestore.getInstance()
        val userRef = db.collection("users").document(user.uid)
        val publicRef = db.collection("public_profiles").document(user.uid)

        val presencePayload = mapOf("isOnline" to isOnline, "lastSeen" to FieldValue.serverTimestamp())
        userRef.set(presencePayload, SetOptions.merge())

        if (!isOnline) {
            publicRef.set(presencePayload, SetOptions.merge())
            return
        }
        db.collection("users").document(user.uid).get()
            .addOnCompleteListener { task ->
                val data = if (task.isSuccessful) task.result?.data else null
                val name = ((data?.get("name") as? String) ?: user.displayName ?: "Usuario").take(120)
                // Solo URLs (no imágenes base64 enormes) para respetar el límite de las reglas.
                val avatar = (extractAvatar(data).ifBlank { user.photoUrl?.toString().orEmpty() })
                    .takeIf { it.length <= 2048 && !it.startsWith("data:") }.orEmpty()
                publicRef.set(
                    mapOf(
                        "name" to name,
                        "avatarImage" to avatar,
                        "isOnline" to true,
                        "lastSeen" to FieldValue.serverTimestamp()
                    ),
                    SetOptions.merge()
                )
            }
    }

    fun observe(uid: String, onChange: (PublicProfile) -> Unit): ListenerRegistration =
        FirebaseFirestore.getInstance().collection("public_profiles").document(uid)
            .addSnapshotListener { doc, _ ->
                if (doc == null || !doc.exists()) return@addSnapshotListener
                onChange(
                    PublicProfile(
                        name = doc.getString("name").orEmpty(),
                        avatar = extractAvatar(doc.data),
                        isOnline = doc.getBoolean("isOnline") == true
                    )
                )
            }
}

