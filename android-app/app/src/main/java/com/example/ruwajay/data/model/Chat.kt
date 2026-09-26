package com.example.ruwajay.data.model

data class Conversation(
    val id: String,
    val propertyId: String,
    val ownerId: String,
    val participantName: String,
    val participantOnline: Boolean,
    val participantPhone: String,
    val participantRole: String,
    val unreadCount: Int,
    val lastMessage: String,
    val lastMessageTimestamp: String,
    val messages: List<Message>
)

data class Message(
    val id: String,
    val senderId: String,
    val isUser: Boolean,
    val senderName: String,
    val text: String,
    val timestamp: String,
    val status: String, // "read", "delivered", "sent"
    val image: String? = null,
    val isVoice: Boolean = false
)
