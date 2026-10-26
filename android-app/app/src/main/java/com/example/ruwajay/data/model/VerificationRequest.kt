package com.example.ruwajay.data.model

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
