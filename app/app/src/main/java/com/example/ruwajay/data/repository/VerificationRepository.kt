package com.example.ruwajay.data.repository

import android.content.ContentResolver
import android.net.Uri
import com.example.ruwajay.data.model.VerificationRequest
import com.example.ruwajay.data.model.DpiDates
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
        val mime = (contentResolver.getType(uri) ?: "image/jpeg").lowercase()
        if (mime !in setOf("image/jpeg", "image/png", "image/webp")) {
            onResult(Result.failure(Exception("Selecciona una fotografía JPG, PNG o WebP.")))
            return
        }
        if (RuwaBackend.isConfigured) {
            RuwaBackend.upload("verification", uri, contentResolver, expectedUid = userId)
                .addOnSuccessListener { onResult(Result.success(it)) }
                .addOnFailureListener { onResult(Result.failure(it)) }
            return
        }
        try {
            val storageRef = storage.reference.child("verification/$userId/dpi_${UUID.randomUUID()}.jpg")
            val stream = contentResolver.openInputStream(uri)
                ?: return onResult(Result.failure(Exception("No se pudo leer la fotografía seleccionada.")))
            val metadata = com.google.firebase.storage.StorageMetadata.Builder().setContentType(mime).build()
            val upload = try { storageRef.putStream(stream, metadata) } catch (error: Exception) {
                stream.close()
                throw error
            }
            upload.addOnCompleteListener { runCatching { stream.close() } }
                .addOnSuccessListener {
                    storageRef.downloadUrl.addOnSuccessListener { onResult(Result.success(it.toString())) }
                        .addOnFailureListener { onResult(Result.failure(it)) }
                }.addOnFailureListener { onResult(Result.failure(it)) }
        } catch (error: Exception) {
            onResult(Result.failure(error))
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
            ?: return onResult(Result.failure(Exception("Debes iniciar sesión para solicitar la verificación.")))
        val cleanCui = cui.filter { it != ' ' }
        if (!Regex("[0-9]{13}").matches(cleanCui)) {
            onResult(Result.failure(Exception("El CUI debe tener exactamente 13 dígitos numéricos.")))
            return
        }
        val dateError = DpiDates.validationError(birthDate, expirationDate)
        if (dateError != null) {
            onResult(Result.failure(Exception(dateError)))
            return
        }
        if (listOf(department, municipality, legalAddress, emergencyName, emergencyPhone, emergencyRelation).any { it.isBlank() }) {
            onResult(Result.failure(Exception("Completa todos los campos del formulario.")))
            return
        }
        val userRef = firestore.collection("users").document(user.uid)
        val requestRef = firestore.collection("verification_requests").document(user.uid)
        userRef.get().addOnSuccessListener { profile ->
            requestRef.get().addOnSuccessListener { previous ->
                fun saveRequest(photoUrl: String) {
                    if (auth.currentUser?.uid != user.uid) {
                        onResult(Result.failure(Exception("La sesión cambió. Vuelve a iniciar sesión.")))
                        return
                    }
                    val payload = hashMapOf<String, Any?>(
                        "userId" to user.uid,
                        "userName" to (profile.getString("name") ?: user.displayName ?: "Usuario"),
                        "userEmail" to (profile.getString("email") ?: user.email.orEmpty()),
                        "userPhone" to profile.getString("phone").orEmpty(),
                        "userAvatar" to (profile.getString("avatarImage") ?: profile.getString("avatar") ?: user.photoUrl?.toString().orEmpty()),
                        "cui" to cleanCui,
                        "department" to department.trim(), "municipality" to municipality.trim(),
                        "birthDate" to DpiDates.normalize(birthDate),
                        "expirationDate" to DpiDates.normalize(expirationDate),
                        "legalAddress" to legalAddress.trim(), "emergencyName" to emergencyName.trim(),
                        "emergencyPhone" to emergencyPhone.trim(), "emergencyRelation" to emergencyRelation.trim(),
                        "documentPhoto" to photoUrl, "status" to "pendiente",
                        "rejectionReason" to null, "createdAt" to FieldValue.serverTimestamp()
                    )
                    // Solicitud y estado cambian juntos; no se borra el DPI aprobado anterior.
                    val batch = firestore.batch()
                    batch.set(requestRef, payload)
                    batch.set(userRef, mapOf(
                        "verificationStatus" to "pendiente", "verificationRejectionReason" to null,
                        "verificationRequestedAt" to FieldValue.serverTimestamp()
                    ), SetOptions.merge())
                    batch.commit().addOnSuccessListener { onResult(Result.success(Unit)) }
                        .addOnFailureListener { onResult(Result.failure(it)) }
                }
                if (photoUri != null) {
                    uploadDpiPhoto(photoUri, contentResolver, user.uid) { result ->
                        result.onSuccess { saveRequest(it) }.onFailure { onResult(Result.failure(it)) }
                    }
                } else {
                    val approvedDpi = profile.get("dpiData") as? Map<*, *>
                    val photo = previous.getString("documentPhoto")?.takeIf { it.isNotBlank() }
                        ?: (approvedDpi?.get("documentPhoto") as? String)?.takeIf { it.isNotBlank() }
                    if (photo == null) onResult(Result.failure(Exception("Debes adjuntar la fotografía de tu DPI.")))
                    else saveRequest(photo)
                }
            }.addOnFailureListener { onResult(Result.failure(it)) }
        }.addOnFailureListener { onResult(Result.failure(it)) }
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
        reviewVerification(request, true, "", adminName, adminUid, onResult)
    }

    fun rejectVerificationRequest(
        request: VerificationRequest,
        reason: String,
        adminName: String,
        adminUid: String,
        onResult: (Result<Unit>) -> Unit
    ) = reviewVerification(request, false, reason.trim().ifBlank { "Revisa los datos y la nitidez del documento." }, adminName, adminUid, onResult)

    private fun reviewVerification(
        request: VerificationRequest, approved: Boolean, reason: String,
        adminName: String, adminUid: String, onResult: (Result<Unit>) -> Unit
    ) {
        val targetUserId = request.userId.ifBlank { request.id }
        val requestRef = firestore.collection("verification_requests").document(request.id.ifBlank { targetUserId })
        val userRef = firestore.collection("users").document(targetUserId)
        val expected = mapOf(
            "cui" to request.cui, "department" to request.department, "municipality" to request.municipality,
            "birthDate" to request.birthDate, "expirationDate" to request.expirationDate,
            "legalAddress" to request.legalAddress, "emergencyName" to request.emergencyName,
            "emergencyPhone" to request.emergencyPhone, "emergencyRelation" to request.emergencyRelation,
            "documentPhoto" to request.documentPhoto
        )
        firestore.runTransaction { transaction ->
            val latest = transaction.get(requestRef)
            if (latest.getString("status") != "pendiente" || latest.getString("userId") != targetUserId ||
                expected.any { (key, value) -> latest.getString(key).orEmpty() != value }) {
                throw IllegalStateException("La solicitud cambió. Revisa los datos actualizados antes de decidir.")
            }
            if (approved) {
                DpiDates.validationError(request.birthDate, request.expirationDate)?.let { throw IllegalStateException(it) }
            }
            val status = if (approved) "aprobada" else "rechazada"
            transaction.set(requestRef, mapOf(
                "status" to status, "reviewedAt" to FieldValue.serverTimestamp(),
                "reviewedBy" to adminUid, "reviewerName" to adminName,
                "rejectionReason" to if (approved) null else reason
            ), SetOptions.merge())
            val updates = hashMapOf<String, Any?>(
                "verified" to approved, "verificationStatus" to status,
                "verificationRejectionReason" to if (approved) null else reason
            )
            if (approved) {
                updates["role"] = "owner"
                updates["dpiData"] = expected + mapOf(
                    "birthDate" to DpiDates.normalize(request.birthDate),
                    "expirationDate" to DpiDates.normalize(request.expirationDate),
                    "verifiedAt" to SimpleDateFormat("dd/MM/yyyy", Locale.US).apply {
                        timeZone = java.util.TimeZone.getTimeZone("America/Guatemala")
                    }.format(Date())
                )
            }
            transaction.set(userRef, updates, SetOptions.merge())
            transaction.set(userRef.collection("notifications").document(), mapOf(
                "title" to if (approved) "Verificación DPI aprobada" else "Verificación DPI rechazada",
                "body" to if (approved) "Ya puedes publicar viviendas." else "Revisa tu solicitud: $reason",
                "path" to if (approved) "/publicar" else "/perfil",
                "type" to if (approved) "verification_approved" else "verification_rejected",
                "createdAt" to FieldValue.serverTimestamp(), "readAt" to null
            ))
        }.addOnSuccessListener { onResult(Result.success(Unit)) }
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
