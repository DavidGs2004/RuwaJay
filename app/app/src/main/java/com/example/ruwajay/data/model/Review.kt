package com.example.ruwajay.data.model

data class Review(
    val id: String,
    val propertyId: String,
    val userName: String,
    val userAvatar: String? = null,
    val rating: Double,
    val date: String,
    val verifiedTenant: Boolean,
    val comment: String,
    val tags: List<String> = emptyList(),
    val isNew: Boolean = false
)
