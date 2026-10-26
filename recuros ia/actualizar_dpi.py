from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / 'app/app/src/main/java/com/example/ruwajay/data/repository/VerificationRepository.kt'
text = path.read_text(encoding='utf-8')
text = text.replace('import com.example.ruwajay.data.model.VerificationRequest', 'import com.example.ruwajay.data.model.VerificationRequest\nimport com.example.ruwajay.data.model.DpiDates')
start = text.index('        try {', text.index('    fun uploadDpiPhoto('))
end = text.index('\n    /**', start)
text = text[:start] + '''        val mime = (contentResolver.getType(uri) ?: "image/jpeg").lowercase()
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
''' + text[end:]
start = text.index('        val user = auth.currentUser', text.index('    fun submitVerificationRequest('))
end = text.index('    /**\n     * Escucha en tiempo real todas', start)
text = text[:start] + '''        val user = auth.currentUser
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

''' + text[end:]
path.write_text(text, encoding='utf-8')
print('Subida al servidor configurado, fechas civiles validadas y actualizacion atomica de DPI.')
