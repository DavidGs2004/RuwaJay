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
        const val CHANNEL_ID = "ruwajay_messages"
        const val CHANNEL_NAME = "Mensajes y Notificaciones"

        fun ensureNotificationChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= 26) {
                val manager = context.getSystemService(NOTIFICATION_SERVICE) as NotificationManager
                val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val audioAttributes = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build()

                // Si ya existía un canal previo con importancia baja/default, lo recreamos con IMPORTANCE_HIGH
                val existingChannel = manager.getNotificationChannel(CHANNEL_ID)
                if (existingChannel != null && existingChannel.importance < NotificationManager.IMPORTANCE_HIGH) {
                    try { manager.deleteNotificationChannel(CHANNEL_ID) } catch (_: Exception) {}
                }

                val channel = NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Notificaciones con sonido para nuevos mensajes y visitas"
                    enableLights(true)
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 250, 150, 250)
                    lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                    setSound(defaultSoundUri, audioAttributes)
                }
                manager.createNotificationChannel(channel)
            }
        }
    }

    override fun onNewToken(token: String) {
        NotificationRepository.register()
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        ensureNotificationChannel(this)

        val title = message.notification?.title
            ?: message.data["title"]
            ?: "RuwaJay"
        val body = message.notification?.body
            ?: message.data["body"]
            ?: "Tienes un nuevo mensaje"
        val path = message.data["path"] ?: "/perfil"
        val eventId = message.data["eventId"] ?: message.messageId ?: "ruwajay_${System.currentTimeMillis()}"

        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra("path", path)
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        val pending = PendingIntent.getActivity(
            this,
            eventId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(pending)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setSound(soundUri)
            .setVibrate(longArrayOf(0, 300, 150, 300))
            .build()

        try {
            manager.notify(eventId.hashCode(), notification)
            com.example.ruwajay.util.SoundManager.playSystemNotificationSound(applicationContext)
        } catch (_: SecurityException) {}
    }
}

