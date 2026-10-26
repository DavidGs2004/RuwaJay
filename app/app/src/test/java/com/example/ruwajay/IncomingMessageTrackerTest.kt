package com.example.ruwajay

import com.example.ruwajay.data.repository.IncomingMessage
import com.example.ruwajay.data.repository.IncomingMessageTracker
import org.junit.Assert.*
import org.junit.Test

class IncomingMessageTrackerTest {
    private fun message(time: Long, sender: String = "other", read: Long = 0, room: String = "room") =
        IncomingMessage(room, "id$time", time, sender, read, "Hola", "Casa")

    @Test fun historyIsSilentButFirstMessageInAnEmptyInboxAlerts() {
        val tracker = IncomingMessageTracker("me")
        assertTrue(tracker.update(listOf(message(100))).isEmpty())
        assertEquals(listOf(message(200)), tracker.update(listOf(message(200))))
        val empty = IncomingMessageTracker("me")
        assertTrue(empty.update(emptyList()).isEmpty())
        assertEquals(1, empty.update(listOf(message(100))).size)
    }

    @Test fun ownMessagesReadReceiptsAndRepeatedSnapshotsAreSilent() {
        val tracker = IncomingMessageTracker("me")
        tracker.update(listOf(message(100)))
        assertTrue(tracker.update(listOf(message(100))).isEmpty())
        assertTrue(tracker.update(listOf(message(200, sender = "me"))).isEmpty())
        assertTrue(tracker.update(listOf(message(300, read = 300))).isEmpty())
        assertEquals(1, tracker.update(listOf(message(400))).size)
        assertTrue(tracker.update(listOf(message(400))).isEmpty())
    }

    @Test fun newRoomsAlertAndFcmSharesTheSameEventId() {
        val tracker = IncomingMessageTracker("me")
        tracker.update(listOf(message(100)))
        val next = message(200, room = "new-room")
        assertEquals(listOf(next), tracker.update(listOf(message(100), next)))
        assertEquals("message_id200", next.eventId)
    }
}
