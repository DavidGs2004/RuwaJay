package com.example.ruwajay.data.model

data class SystemUpdate(
    val id: String = "",
    val title: String = "",
    val content: String = "",
    val category: String = "novedad", // "novedad", "mantenimiento", "alerta", "mejora"
    val priority: String = "normal",  // "normal", "destacada", "urgente"
    val createdBy: String = "Administrador RuwaJay",
    val createdAt: Long = System.currentTimeMillis(),
    val active: Boolean = true
)
