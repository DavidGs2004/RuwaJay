package com.example.ruwajay.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore

class AuthRepository(
    private val auth: FirebaseAuth = FirebaseAuth.getInstance(),
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    fun signIn(email: String, password: String, onResult: (Result<Unit>) -> Unit) {
        auth.signInWithEmailAndPassword(email.trim(), password)
            .addOnCompleteListener { task ->
                if (task.isSuccessful) onResult(Result.success(Unit))
                else onResult(Result.failure(task.exception ?: Exception("No se pudo iniciar sesión.")))
            }
    }

    fun register(
        name: String,
        email: String,
        password: String,
        onResult: (Result<Unit>) -> Unit
    ) {
        auth.createUserWithEmailAndPassword(email.trim(), password)
            .addOnCompleteListener { task ->
                if (!task.isSuccessful) {
                    onResult(Result.failure(task.exception ?: Exception("No se pudo crear la cuenta.")))
                    return@addOnCompleteListener
                }

                val user = auth.currentUser
                if (user == null) {
                    onResult(Result.failure(Exception("No se pudo recuperar el usuario creado.")))
                    return@addOnCompleteListener
                }

                val profile = mapOf(
                    "id" to user.uid,
                    "name" to name.trim(),
                    "email" to (user.email ?: email.trim()),
                    "role" to "seeker",
                    "createdAt" to System.currentTimeMillis()
                )

                firestore.collection("users").document(user.uid).set(profile)
                    .addOnSuccessListener { onResult(Result.success(Unit)) }
                    .addOnFailureListener { error -> onResult(Result.failure(error)) }
            }
    }

    fun sendPasswordReset(email: String, onResult: (Result<Unit>) -> Unit) {
        auth.sendPasswordResetEmail(email.trim())
            .addOnCompleteListener { task ->
                if (task.isSuccessful) onResult(Result.success(Unit))
                else onResult(Result.failure(task.exception ?: Exception("No se pudo enviar el correo.")))
            }
    }
}
