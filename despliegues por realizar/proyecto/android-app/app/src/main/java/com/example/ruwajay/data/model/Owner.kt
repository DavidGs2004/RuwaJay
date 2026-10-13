package com.example.ruwajay.data.model

data class Owner(
    val id: String,
    val name: String,
    val avatar: String? = null,
    val verified: Boolean,
    val rating: Double,
    val responseTime: String,
    val propertiesCount: Int,
    val memberSince: String,
    val online: Boolean
)
