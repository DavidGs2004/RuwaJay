package com.example.ruwajay.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FieldValue
import com.google.firebase.messaging.FirebaseMessaging
import java.security.MessageDigest

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
    fun signOut(onResult: () -> Unit) {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return onResult()
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            val token = if (task.isSuccessful) task.result else null
            if (token == null) { FirebaseAuth.getInstance().signOut();onResult();return@addOnCompleteListener }
            val id = MessageDigest.getInstance("SHA-256").digest(token.toByteArray()).joinToString("") { "%02x".format(it) }
            FirebaseFirestore.getInstance().collection("users").document(uid).collection("devices").document(id).delete()
                .addOnCompleteListener { FirebaseMessaging.getInstance().deleteToken();FirebaseAuth.getInstance().signOut();onResult() }
        }
    }
}
