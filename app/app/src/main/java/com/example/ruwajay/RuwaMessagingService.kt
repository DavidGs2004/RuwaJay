package com.example.ruwajay

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.example.ruwajay.data.repository.NotificationRepository

class RuwaMessagingService : FirebaseMessagingService() {
    companion object {
        const val CHANNEL_ID = "ruwajay_messages_v2"
        const val CHANNEL_NAME = "Mensajes y Notificaciones"

        const val CHANNEL_CALLS_ID = "ruwajay_calls"
        const val CHANNEL_CALLS_NAME = "Llamadas Entrantes"

        fun ensureNotificationChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= 26) {
                val manager = context.getSystemService(NOTIFICATION_SERVICE) as NotificationManager
                
                // Canal 1: Mensajes y Alertas
                val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val audioAttributes = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build()

                val channel = NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Notificaciones con sonido para nuevos mensajes y visitas"
                    enableLights(true)
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 300, 150, 300)
                    lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                    setSound(defaultSoundUri, audioAttributes)
                }
                manager.createNotificationChannel(channel)

                // Canal 2: Llamadas Entrantes (Timbre continuo y prioridad de llamada)
                val ringtoneSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                val callAudioAttributes = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build()

                val callChannel = NotificationChannel(
                    CHANNEL_CALLS_ID,
                    CHANNEL_CALLS_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Timbre y alertas para llamadas entrantes en tiempo real"
                    enableLights(true)
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 1000, 1000, 1000, 1000)
                    lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                    setSound(ringtoneSoundUri, callAudioAttributes)
                }
                manager.createNotificationChannel(callChannel)
            }
        }
    }

    override fun onNewToken(token: String) {
        NotificationRepository.register()
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val uid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: return
        val recipientId = message.data["recipientId"]
        if (!recipientId.isNullOrBlank() && recipientId != uid) return
        val type = message.data["type"] ?: "message"
        val callId = message.data["callId"]
        val isCall = type == "call" || !callId.isNullOrBlank()

        val title = message.notification?.title
            ?: message.data["senderName"]
            ?: message.data["title"]
            ?: if (isCall) "Llamada entrante" else "Nuevo mensaje"
        val body = message.notification?.body
            ?: message.data["body"]
            ?: if (isCall) "Te están llamando en RuwaJay" else "Tienes un nuevo mensaje"
        val path = message.data["path"] ?: "/perfil"
        val eventId = message.data["eventId"] ?: message.messageId ?: "ruwajay_${System.currentTimeMillis()}"

        if (isCall) {
            RuwaNotifications.showCall(this, title, body, path, eventId, callId ?: "")
        } else {
            RuwaNotifications.show(this, title, body, path, eventId)
        }
    }
}

/** Shared by FCM and the foreground Firestore listeners. */
object RuwaNotifications {
    private val delivered = LinkedHashSet<String>()

    @Synchronized
    fun show(context: Context, title: String, body: String, path: String, eventId: String): Boolean {
        RuwaMessagingService.ensureNotificationChannel(context)
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (!androidx.core.app.NotificationManagerCompat.from(context).areNotificationsEnabled()) return false
        if (Build.VERSION.SDK_INT >= 26 && manager.getNotificationChannel(RuwaMessagingService.CHANNEL_ID)?.importance == NotificationManager.IMPORTANCE_NONE) return false
        if (eventId in delivered) return true

        val uri = android.net.Uri.parse(path)
        val conversationId = uri.getQueryParameter("conversation")
            ?: if (path.startsWith("/chat/")) path.removePrefix("/chat/")
            else if (path.startsWith("chat/")) path.removePrefix("chat/")
            else null

        val intent = Intent(context, MainActivity::class.java).apply {
            putExtra("path", path)
            if (conversationId != null) {
                putExtra("conversationId", conversationId)
            }
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        val pending = PendingIntent.getActivity(
            context,
            eventId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val logoBitmap = try {
            android.graphics.BitmapFactory.decodeResource(context.resources, R.drawable.ic_logo)
        } catch (_: Exception) { null }

        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val builder = NotificationCompat.Builder(context, RuwaMessagingService.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(0xFF0B5D3B.toInt()) // Verde Artesanal RuwaJay
            .setContentTitle(title)
            .setContentText(body)
            .setSubText("RuwaJay")
            .setStyle(NotificationCompat.BigTextStyle().bigText(body).setSummaryText("RuwaJay"))
            .setContentIntent(pending)
            .setAutoCancel(true)
            .setOnlyAlertOnce(false)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setSound(soundUri)
            .setVibrate(longArrayOf(0, 300, 150, 300))

        if (logoBitmap != null) {
            builder.setLargeIcon(logoBitmap)
        }

        val notification = builder.build()

        try {
            manager.notify(eventId.hashCode(), notification)
            delivered.add(eventId)
            if (delivered.size > 200) delivered.remove(delivered.first())

            return true
        } catch (_: SecurityException) { return false }
    }

    @Synchronized
    fun showCall(context: Context, title: String, body: String, path: String, eventId: String, callId: String): Boolean {
        RuwaMessagingService.ensureNotificationChannel(context)
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (!androidx.core.app.NotificationManagerCompat.from(context).areNotificationsEnabled()) return false
        if (Build.VERSION.SDK_INT >= 26 && manager.getNotificationChannel(RuwaMessagingService.CHANNEL_CALLS_ID)?.importance == NotificationManager.IMPORTANCE_NONE) return false
        if (eventId in delivered) return true

        val uri = android.net.Uri.parse(path)
        val conversationId = uri.getQueryParameter("conversation")
            ?: if (path.startsWith("/chat/")) path.removePrefix("/chat/")
            else if (path.startsWith("chat/")) path.removePrefix("chat/")
            else null

        val intent = Intent(context, MainActivity::class.java).apply {
            putExtra("path", path)
            putExtra("action", "incoming_call")
            putExtra("callId", callId)
            if (conversationId != null) {
                putExtra("conversationId", conversationId)
            }
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }

        val pending = PendingIntent.getActivity(
            context,
            eventId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val logoBitmap = try {
            android.graphics.BitmapFactory.decodeResource(context.resources, R.drawable.ic_logo)
        } catch (_: Exception) { null }

        val ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        val builder = NotificationCompat.Builder(context, RuwaMessagingService.CHANNEL_CALLS_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(0xFF0B5D3B.toInt())
            .setContentTitle(title)
            .setContentText(body)
            .setSubText("Llamada RuwaJay")
            .setStyle(NotificationCompat.BigTextStyle().bigText(body).setSummaryText("Llamada en curso"))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setTimeoutAfter(45_000L)
            .setAutoCancel(true)
            .setContentIntent(pending)
            .setFullScreenIntent(pending, true)
            .setSound(ringtoneUri)
            .setVibrate(longArrayOf(0, 1000, 1000, 1000, 1000))
            .addAction(
                R.drawable.ic_notification,
                "Atender Llamada",
                pending
            )

        if (logoBitmap != null) {
            builder.setLargeIcon(logoBitmap)
        }

        try {
            manager.notify(eventId.hashCode(), builder.build())
            delivered.add(eventId)
            if (delivered.size > 200) delivered.remove(delivered.first())

            return true
        } catch (_: SecurityException) { return false }
    }

    fun cancel(context: Context, eventId: String) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancel(eventId.hashCode())
    }
}
