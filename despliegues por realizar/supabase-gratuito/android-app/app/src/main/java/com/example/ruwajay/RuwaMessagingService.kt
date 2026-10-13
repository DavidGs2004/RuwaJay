package com.example.ruwajay

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.example.ruwajay.data.repository.NotificationRepository

class RuwaMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) { NotificationRepository.register() }
    override fun onMessageReceived(message: RemoteMessage) {
        val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(NotificationChannel("ruwajay_messages","Mensajes y visitas",NotificationManager.IMPORTANCE_DEFAULT))
        val eventId = message.data["eventId"] ?: message.messageId ?: "ruwajay"
        val intent = Intent(this,MainActivity::class.java).putExtra("path",message.data["path"] ?: "/perfil")
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val pending = PendingIntent.getActivity(this,eventId.hashCode(),intent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(this,"ruwajay_messages")
            .setSmallIcon(R.drawable.ic_launcher_foreground).setContentTitle(message.notification?.title ?: "RuwaJay")
            .setContentText(message.notification?.body ?: "Nuevo aviso").setContentIntent(pending).setAutoCancel(true).build()
        try { manager.notify(eventId.hashCode(),notification) } catch (_:SecurityException) {}
    }
}
