package com.example.ruwajay.data.repository

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import com.example.ruwajay.data.model.SystemUpdate
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query

@Composable
fun rememberSystemUpdates(includeInactive: Boolean = false): List<SystemUpdate> {
    val updates = remember { mutableStateOf<List<SystemUpdate>>(emptyList()) }
    val firestore = FirebaseFirestore.getInstance()

    DisposableEffect(includeInactive) {
        val query = firestore.collection("system_updates")
            .orderBy("createdAt", Query.Direction.DESCENDING)

        val listener = query.addSnapshotListener { snapshot, error ->
            if (error != null || snapshot == null) {
                // Si la colección aún no tiene docs en Firebase, se provee el comunicado inicial por defecto
                if (updates.value.isEmpty()) {
                    updates.value = listOf(
                        SystemUpdate(
                            id = "default-1",
                            title = "Bienvenido a RuwaJay v2.0 - Plataforma Inmobiliaria de Guatemala",
                            content = "Sistema integral de alquileres con citas programadas, chat verificado entre inquilinos y propietarios, comparador inteligente de presupuestos y panel maestro de administración.",
                            category = "novedad",
                            priority = "destacada",
                            createdBy = "Administrador RuwaJay",
                            createdAt = System.currentTimeMillis(),
                            active = true
                        )
                    )
                }
                return@addSnapshotListener
            }

            val list = snapshot.documents.mapNotNull { doc ->
                val title = doc.getString("title") ?: return@mapNotNull null
                val content = doc.getString("content") ?: ""
                val category = doc.getString("category") ?: "novedad"
                val priority = doc.getString("priority") ?: "normal"
                val createdBy = doc.getString("createdBy") ?: "Administrador RuwaJay"
                val createdAt = doc.getLong("createdAt") ?: (doc.getTimestamp("createdAt")?.seconds?.times(1000) ?: System.currentTimeMillis())
                val active = doc.getBoolean("active") ?: true

                SystemUpdate(
                    id = doc.id,
                    title = title,
                    content = content,
                    category = category,
                    priority = priority,
                    createdBy = createdBy,
                    createdAt = createdAt,
                    active = active
                )
            }

            if (list.isEmpty()) {
                updates.value = listOf(
                    SystemUpdate(
                        id = "default-1",
                        title = "Bienvenido a RuwaJay v2.0 - Plataforma Inmobiliaria de Guatemala",
                        content = "Sistema integral de alquileres con citas programadas, chat verificado entre inquilinos y propietarios, comparador inteligente de presupuestos y panel maestro de administración.",
                        category = "novedad",
                        priority = "destacada",
                        createdBy = "Administrador RuwaJay",
                        createdAt = System.currentTimeMillis(),
                        active = true
                    )
                )
            } else {
                updates.value = if (includeInactive) list else list.filter { it.active }
            }
        }

        onDispose { listener.remove() }
    }

    return updates.value
}

fun publishSystemUpdate(
    title: String,
    content: String,
    category: String = "novedad",
    priority: String = "normal",
    adminName: String = "Administrador RuwaJay",
    onResult: (Result<Unit>) -> Unit
) {
    val firestore = FirebaseFirestore.getInstance()
    val data = mapOf(
        "title" to title.trim(),
        "content" to content.trim(),
        "category" to category,
        "priority" to priority,
        "createdBy" to adminName,
        "createdAt" to System.currentTimeMillis(),
        "active" to true
    )

    firestore.collection("system_updates")
        .add(data)
        .addOnSuccessListener { onResult(Result.success(Unit)) }
        .addOnFailureListener { error -> onResult(Result.failure(error)) }
}

fun toggleSystemUpdateStatus(
    updateId: String,
    newActiveState: Boolean,
    onResult: (Result<Unit>) -> Unit
) {
    val firestore = FirebaseFirestore.getInstance()
    firestore.collection("system_updates").document(updateId)
        .update("active", newActiveState)
        .addOnSuccessListener { onResult(Result.success(Unit)) }
        .addOnFailureListener { error -> onResult(Result.failure(error)) }
}

fun deleteSystemUpdate(
    updateId: String,
    onResult: (Result<Unit>) -> Unit
) {
    val firestore = FirebaseFirestore.getInstance()
    firestore.collection("system_updates").document(updateId)
        .delete()
        .addOnSuccessListener { onResult(Result.success(Unit)) }
        .addOnFailureListener { error -> onResult(Result.failure(error)) }
}
