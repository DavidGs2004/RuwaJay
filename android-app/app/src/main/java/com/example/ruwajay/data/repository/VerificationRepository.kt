package com.example.ruwajay.data.repository

import android.content.ContentResolver
import android.net.Uri
import com.example.ruwajay.data.model.VerificationRequest
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.SetOptions
import com.google.firebase.storage.FirebaseStorage
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

object VerificationRepository {
    private val firestore = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()
    private val storage = FirebaseStorage.getInstance()

    /**
     * Sube la fotografía del DPI a Firebase Storage y retorna la URL pública de descarga.
     */
    fun uploadDpiPhoto(
        uri: Uri,
        contentResolver: ContentResolver,
        userId: String,
        onResult: (Result<String>) -> Unit
    ) {
        try {
            val fileName = "dpi_${UUID.randomUUID()}.jpg"
            val storageRef = storage.reference.child("verification/$userId/$fileName")
            val stream = contentResolver.openInputStream(uri)
                ?: return onResult(Result.failure(Exception("No se pudo leer la fotografía seleccionada.")))

            val metadata = com.google.firebase.storage.StorageMetadata.Builder()
                .setContentType(contentResolver.getType(uri) ?: "image/jpeg")
                .build()

            storageRef.putStream(stream, metadata)
                .addOnSuccessListener {
                    storageRef.downloadUrl
                        .addOnSuccessListener { downloadUrl ->
                            onResult(Result.success(downloadUrl.toString()))
                        }
                        .addOnFailureListener { err ->
                            onResult(Result.failure(err))
                        }
                }
                .addOnFailureListener { err ->
                    onResult(Result.failure(err))
                }
        } catch (e: Exception) {
            onResult(Result.failure(e))
        }
    }

    /**
     * Envía la solicitud completa de verificación con DPI a Firestore.
     */
    fun submitVerificationRequest(
        cui: String,
        department: String,
        municipality: String,
        birthDate: String,
        expirationDate: String,
        legalAddress: String,
        emergencyName: String,
        emergencyPhone: String,
        emergencyRelation: String,
        photoUri: Uri?,
        contentResolver: ContentResolver,
        onResult: (Result<Unit>) -> Unit
    ) {
        val user = auth.currentUser
        if (user == null) {
            onResult(Result.failure(Exception("Debes iniciar sesión para solicitar la verificación.")))
            return
        }

        val cleanCui = cui.replace(" ", "").trim()
        if (cleanCui.length != 13 || !cleanCui.all { it.isDigit() }) {
            onResult(Result.failure(Exception("El CUI debe tener exactamente 13 dígitos numéricos.")))
            return
        }

        if (photoUri == null) {
            onResult(Result.failure(Exception("Debes adjuntar la fotografía de tu documento DPI.")))
            return
        }

        // 1. Subir fotografía
        uploadDpiPhoto(photoUri, contentResolver, user.uid) { uploadResult ->
            uploadResult.onSuccess { photoUrl ->
                // Obtener datos del perfil de usuario actual
                firestore.collection("users").document(user.uid).get()
                    .addOnSuccessListener { userDoc ->
                        val effectiveName = userDoc.getString("name") ?: user.displayName ?: "Usuario"
                        val effectiveAvatar = userDoc.getString("avatarImage")
                            ?: userDoc.getString("avatar")
                            ?: userDoc.getString("photoURL")
                            ?: user.photoUrl?.toString().orEmpty()
                        val effectiveEmail = userDoc.getString("email") ?: user.email.orEmpty()
                        val effectivePhone = userDoc.getString("phone").orEmpty()

                        val requestPayload = hashMapOf<String, Any?>(
                            "userId" to user.uid,
                            "userName" to effectiveName,
                            "userEmail" to effectiveEmail,
                            "userPhone" to effectivePhone,
                            "userAvatar" to effectiveAvatar,
                            "cui" to cleanCui,
                            "department" to department.trim(),
                            "municipality" to municipality.trim(),
                            "birthDate" to birthDate.trim(),
                            "expirationDate" to expirationDate.trim(),
                            "legalAddress" to legalAddress.trim(),
                            "emergencyName" to emergencyName.trim(),
                            "emergencyPhone" to emergencyPhone.trim(),
                            "emergencyRelation" to emergencyRelation.trim(),
                            "documentPhoto" to photoUrl,
                            "status" to "pendiente",
                            "rejectionReason" to null,
                            "createdAt" to FieldValue.serverTimestamp()
                        )

                        // 2. Guardar en verification_requests/{uid}
                        firestore.collection("verification_requests").document(user.uid)
                            .set(requestPayload, SetOptions.merge())
                            .addOnSuccessListener {
                                // 3. Actualizar estado en users/{uid}
                                val userStatusUpdate = mapOf(
                                    "verificationStatus" to "pendiente",
                                    "verificationRejectionReason" to null,
                                    "verificationRequestedAt" to FieldValue.serverTimestamp()
                                )
                                firestore.collection("users").document(user.uid)
                                    .set(userStatusUpdate, SetOptions.merge())
                                    .addOnSuccessListener {
                                        onResult(Result.success(Unit))
                                    }
                                    .addOnFailureListener { err ->
                                        onResult(Result.failure(err))
                                    }
                            }
                            .addOnFailureListener { err ->
                                onResult(Result.failure(err))
                            }
                    }
                    .addOnFailureListener { err ->
                        onResult(Result.failure(err))
                    }
            }.onFailure { err ->
                onResult(Result.failure(err))
            }
        }
    }

    /**
     * Limpia los datos de DPI y resetea el estado para empezar desde 0 tras un rechazo.
     */
    fun resetVerificationData(userId: String, onResult: (Result<Unit>) -> Unit) {
        firestore.collection("verification_requests").document(userId).delete()
            .addOnCompleteListener {
                val updates = mapOf(
                    "dpiData" to null,
                    "verified" to false,
                    "verificationStatus" to null,
                    "verificationRejectionReason" to null
                )
                firestore.collection("users").document(userId).set(updates, SetOptions.merge())
                    .addOnSuccessListener { onResult(Result.success(Unit)) }
                    .addOnFailureListener { onResult(Result.failure(it)) }
            }
    }

    /**
     * Escucha en tiempo real todas las solicitudes de verificación para el Administrador.
     */
    fun subscribeVerificationRequests(
        onUpdate: (List<VerificationRequest>) -> Unit
    ): ListenerRegistration {
        return firestore.collection("verification_requests")
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) return@addSnapshotListener
                val list = snapshot.documents.mapNotNull { doc ->
                    try {
                        val createdDate = (doc.get("createdAt") as? com.google.firebase.Timestamp)?.toDate()
                        val reviewedDate = (doc.get("reviewedAt") as? com.google.firebase.Timestamp)?.toDate()
                        val sdf = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())

                        VerificationRequest(
                            id = doc.id,
                            userId = doc.getString("userId") ?: doc.id,
                            userName = doc.getString("userName").orEmpty(),
                            userEmail = doc.getString("userEmail").orEmpty(),
                            userPhone = doc.getString("userPhone").orEmpty(),
                            userAvatar = doc.getString("userAvatar").orEmpty(),
                            cui = doc.getString("cui").orEmpty(),
                            department = doc.getString("department").orEmpty(),
                            municipality = doc.getString("municipality").orEmpty(),
                            birthDate = doc.getString("birthDate").orEmpty(),
                            expirationDate = doc.getString("expirationDate").orEmpty(),
                            legalAddress = doc.getString("legalAddress").orEmpty(),
                            emergencyName = doc.getString("emergencyName").orEmpty(),
                            emergencyPhone = doc.getString("emergencyPhone").orEmpty(),
                            emergencyRelation = doc.getString("emergencyRelation") ?: "Familiar",
                            documentPhoto = doc.getString("documentPhoto").orEmpty(),
                            status = doc.getString("status") ?: "pendiente",
                            rejectionReason = doc.getString("rejectionReason"),
                            createdAt = createdDate?.let { sdf.format(it) },
                            reviewedAt = reviewedDate?.let { sdf.format(it) },
                            reviewedBy = doc.getString("reviewedBy"),
                            reviewerName = doc.getString("reviewerName")
                        )
                    } catch (_: Exception) {
                        null
                    }
                }.sortedWith { a, b ->
                    if (a.status == "pendiente" && b.status != "pendiente") -1
                    else if (a.status != "pendiente" && b.status == "pendiente") 1
                    else 0
                }
                onUpdate(list)
            }
    }

    /**
     * Aprueba la solicitud de verificación como casero (rol owner + notificacion en tiempo real).
     */
    fun approveVerificationRequest(
        request: VerificationRequest,
        adminName: String,
        adminUid: String,
        onResult: (Result<Unit>) -> Unit
    ) {
        val targetDocId = request.id.ifBlank { request.userId }
        val targetUserId = request.userId.ifBlank { request.id }
        val dateFormatted = SimpleDateFormat("dd 'de' MMMM, yyyy", Locale("es", "GT")).format(Date())

        val requestUpdates = mapOf(
            "status" to "aprobada",
            "reviewedAt" to FieldValue.serverTimestamp(),
            "reviewedBy" to adminUid,
            "reviewerName" to adminName,
            "rejectionReason" to null
        )

        firestore.collection("verification_requests").document(targetDocId)
            .set(requestUpdates, SetOptions.merge())
            .addOnSuccessListener {
                val userUpdates = mapOf(
                    "role" to "owner",
                    "verified" to true,
                    "verificationStatus" to "aprobada",
                    "verificationRejectionReason" to null,
                    "dpiData" to mapOf(
                        "cui" to request.cui,
                        "department" to request.department,
                        "municipality" to request.municipality,
                        "birthDate" to request.birthDate,
                        "expirationDate" to request.expirationDate,
                        "legalAddress" to request.legalAddress,
                        "emergencyName" to request.emergencyName,
                        "emergencyPhone" to request.emergencyPhone,
                        "emergencyRelation" to request.emergencyRelation,
                        "documentPhoto" to request.documentPhoto,
                        "verifiedAt" to dateFormatted
                    )
                )

                firestore.collection("users").document(targetUserId)
                    .set(userUpdates, SetOptions.merge())
                    .addOnSuccessListener {
                        // Crear notificación en tiempo real
                        val notification = mapOf(
                            "title" to "🎉 ¡Solicitud de Casero Aprobada!",
                            "body" to "Tu verificación de identidad con DPI ha sido revisada y aprobada con éxito. Ya tienes el permiso para publicar y anunciar tus viviendas en RuwaJay.",
                            "path" to "/publicar",
                            "type" to "verification_approved",
                            "createdAt" to FieldValue.serverTimestamp(),
                            "readAt" to null
                        )
                        firestore.collection("users").document(targetUserId)
                            .collection("notifications").add(notification)
                            .addOnCompleteListener {
                                onResult(Result.success(Unit))
                            }
                    }
                    .addOnFailureListener { onResult(Result.failure(it)) }
            }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    /**
     * Rechaza la solicitud de verificación como casero con motivo y limpia los datos.
     */
    fun rejectVerificationRequest(
        request: VerificationRequest,
        reason: String,
        adminName: String,
        adminUid: String,
        onResult: (Result<Unit>) -> Unit
    ) {
        val targetDocId = request.id.ifBlank { request.userId }
        val targetUserId = request.userId.ifBlank { request.id }
        val cleanReason = reason.trim().ifBlank {
            "Los datos o la fotografía del documento no cumplen con los requisitos de verificación."
        }

        val requestUpdates = mapOf(
            "status" to "rechazada",
            "rejectionReason" to cleanReason,
            "reviewedAt" to FieldValue.serverTimestamp(),
            "reviewedBy" to adminUid,
            "reviewerName" to adminName
        )

        firestore.collection("verification_requests").document(targetDocId)
            .set(requestUpdates, SetOptions.merge())
            .addOnSuccessListener {
                val userUpdates = mapOf(
                    "verified" to false,
                    "verificationStatus" to "rechazada",
                    "verificationRejectionReason" to cleanReason,
                    "dpiData" to null
                )

                firestore.collection("users").document(targetUserId)
                    .set(userUpdates, SetOptions.merge())
                    .addOnSuccessListener {
                        // Crear notificación en tiempo real
                        val notification = mapOf(
                            "title" to "⚠️ Solicitud de Casero Rechazada",
                            "body" to "Tu solicitud de verificación como casero no fue aprobada: \"$cleanReason\". Tus datos anteriores han sido limpiados; por favor completa el formulario nuevamente desde cero.",
                            "path" to "/perfil",
                            "type" to "verification_rejected",
                            "rejectionReason" to cleanReason,
                            "createdAt" to FieldValue.serverTimestamp(),
                            "readAt" to null
                        )
                        firestore.collection("users").document(targetUserId)
                            .collection("notifications").add(notification)
                            .addOnCompleteListener {
                                onResult(Result.success(Unit))
                            }
                    }
                    .addOnFailureListener { onResult(Result.failure(it)) }
            }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    /**
     * Escucha en tiempo real la lista de todos los usuarios para la gestión de administradores.
     */
    fun subscribeAllUsers(
        onUpdate: (List<Map<String, Any?>>) -> Unit
    ): ListenerRegistration {
        return firestore.collection("users")
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) return@addSnapshotListener
                val users = snapshot.documents.map { doc ->
                    val data = doc.data?.toMutableMap() ?: mutableMapOf()
                    data["id"] = doc.id
                    data
                }
                onUpdate(users)
            }
    }

    /**
     * Actualiza el estado de la cuenta (activo, inactivo, suspendido) de un usuario.
     */
    fun updateUserAccountStatus(
        userId: String,
        status: String,
        onResult: (Result<Unit>) -> Unit
    ) {
        val isSuspended = status == "suspended"
        val isActive = status == "active"
        val updates = mapOf(
            "accountStatus" to status,
            "status" to status,
            "suspended" to isSuspended,
            "suspensionReason" to if (isSuspended) "Incumplimiento de normas" else null,
            "suspendedAt" to if (isSuspended) FieldValue.serverTimestamp() else null,
            "reactivatedAt" to if (isActive) FieldValue.serverTimestamp() else null,
            "updatedAt" to FieldValue.serverTimestamp()
        )

        firestore.collection("users").document(userId)
            .set(updates, SetOptions.merge())
            .addOnSuccessListener { onResult(Result.success(Unit)) }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }

    /**
     * Actualiza el rol de un usuario (seeker, owner, admin).
     */
    fun updateUserRole(
        userId: String,
        role: String,
        onResult: (Result<Unit>) -> Unit
    ) {
        firestore.collection("users").document(userId)
            .update("role", role)
            .addOnSuccessListener { onResult(Result.success(Unit)) }
            .addOnFailureListener { onResult(Result.failure(it)) }
    }
}
