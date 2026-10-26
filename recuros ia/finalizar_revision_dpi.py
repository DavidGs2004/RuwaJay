from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / 'app/app/src/main/java/com/example/ruwajay/data/repository/VerificationRepository.kt'
text = path.read_text(encoding='utf-8')
start = text.index('        val targetDocId', text.index('    fun approveVerificationRequest('))
end = text.index('    /**\n     * Escucha en tiempo real la lista de todos', start)
text = text[:start] + '''        reviewVerification(request, true, "", adminName, adminUid, onResult)
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

''' + text[end:]
path.write_text(text, encoding='utf-8')

path = root / 'app/app/src/main/java/com/example/ruwajay/ui/screens/ProfileScreen.kt'
text = path.read_text(encoding='utf-8')
text = text.replace('''                                adminNoticeMessage = "¡Solicitud de ${req.userName} aprobada con éxito!"
                            }''', '''                                adminNoticeMessage = "¡Solicitud de ${req.userName} aprobada con éxito!"
                            } else adminNoticeMessage = res.exceptionOrNull()?.localizedMessage ?: "No se pudo aprobar el DPI."''')
text = text.replace('''                                adminNoticeMessage = "Solicitud rechazada y notificada al usuario."
                            }''', '''                                adminNoticeMessage = "Solicitud rechazada y notificada al usuario."
                            } else adminNoticeMessage = res.exceptionOrNull()?.localizedMessage ?: "No se pudo rechazar el DPI."''')
text = text.replace('Text("Fecha de Verificación: ${(dpiData?.get("verifiedAt") as? String).orEmpty()}"', 'Text("Fecha de verificación anterior: ${((userData?.get("dpiData") as? Map<*, *>)?.get("verifiedAt") as? String).orEmpty()}"')
# El error de envío queda visible junto al botón, incluso al final del formulario.
start = text.index('private fun DpiVerificationFormModal')
position = text.index('        confirmButton = {\n            Button(', start)
text = text[:position] + text[position:].replace('''        confirmButton = {
            Button(''', '''        confirmButton = {
            Column {
            formError?.let { Text(it, color = Color.Red, fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp)) }
            Button(''', 1)
position = text.index('        dismissButton = {', position)
text = text[:position] + '        },\n' + text[position:]
# El cierre anterior de confirmButton pasa a cerrar Column.
before = text[:position]
closing = before.rfind('        },\n')
text = text[:closing] + '            }\n' + text[closing + len('        },\n'):]
path.write_text(text, encoding='utf-8')

path = root / 'web/tests/public-browser/public-access.spec.js'
text = path.read_text(encoding='utf-8').replace("name: 'Continuar con Google'", "name: 'Iniciar sesión con Google'")
path.write_text(text, encoding='utf-8')
print('Revision de DPI atomica, deteccion de cambios concurrentes y errores visibles.')
