package com.example.ruwajay.data.model

import java.text.ParsePosition
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** Fechas civiles del DPI: se guardan como texto ISO, nunca como instantes. */
object DpiDates {
    private fun formatter(pattern: String) = SimpleDateFormat(pattern, Locale.US).apply {
        isLenient = false
        timeZone = TimeZone.getTimeZone("UTC")
    }

    fun normalize(value: String): String? {
        val text = value.trim()
        val pattern = when {
            Regex("\\d{4}-\\d{2}-\\d{2}").matches(text) -> "yyyy-MM-dd"
            Regex("\\d{2}/\\d{2}/\\d{4}").matches(text) -> "dd/MM/yyyy"
            else -> return null
        }
        val position = ParsePosition(0)
        val date = formatter(pattern).parse(text, position) ?: return null
        if (position.index != text.length) return null
        return formatter("yyyy-MM-dd").format(date)
    }

    fun display(value: String): String {
        val iso = normalize(value) ?: return value
        return "${iso.substring(8, 10)}/${iso.substring(5, 7)}/${iso.substring(0, 4)}"
    }

    fun today(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("America/Guatemala")
    }.format(Date())

    fun validationError(birth: String, expiration: String, today: String = today()): String? {
        val born = normalize(birth) ?: return "Ingresa una fecha de nacimiento válida (DD/MM/AAAA)."
        val expires = normalize(expiration) ?: return "Ingresa una fecha de vencimiento válida (DD/MM/AAAA)."
        if (born < "1900-01-01" || born >= today) return "La fecha de nacimiento debe ser anterior a hoy y posterior a 1899."
        if (expires < today) return "El DPI está vencido. Adjunta un documento vigente."
        if (expires <= born) return "El vencimiento debe ser posterior al nacimiento."
        return null
    }
}

data class VerificationRequest(
    val id: String = "",
    val userId: String = "",
    val userName: String = "",
    val userEmail: String = "",
    val userPhone: String = "",
    val userAvatar: String = "",
    val cui: String = "",
    val department: String = "",
    val municipality: String = "",
    val birthDate: String = "",
    val expirationDate: String = "",
    val legalAddress: String = "",
    val emergencyName: String = "",
    val emergencyPhone: String = "",
    val emergencyRelation: String = "Familiar",
    val documentPhoto: String = "",
    val status: String = "pendiente", // "pendiente", "aprobada", "rechazada"
    val rejectionReason: String? = null,
    val createdAt: String? = null,
    val reviewedAt: String? = null,
    val reviewedBy: String? = null,
    val reviewerName: String? = null
)
