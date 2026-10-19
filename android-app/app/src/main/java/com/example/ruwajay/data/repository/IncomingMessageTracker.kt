package com.example.ruwajay.data.repository

data class IncomingMessage(
    val roomId: String,
    val messageId: String,
    val timestamp: Long,
    val senderId: String,
    val readAt: Long,
    val body: String,
    val title: String
) {
    val eventId: String get() = if (messageId.isNotBlank()) "message_$messageId" else "message_${roomId}_$timestamp"
}

/** Establishes a baseline first, so opening the app never replays its history. */
class IncomingMessageTracker(private val uid: String) {
    private var previous: Map<String, Long>? = null

    fun update(messages: List<IncomingMessage>): List<IncomingMessage> {
        val baseline = previous
        val incoming = if (baseline == null) emptyList() else messages.filter {
            it.senderId.isNotBlank() && it.senderId != uid && it.timestamp > it.readAt &&
                it.timestamp > (baseline[it.roomId] ?: 0L)
        }
        previous = messages.associate { it.roomId to it.timestamp }
        return incoming
    }
}
