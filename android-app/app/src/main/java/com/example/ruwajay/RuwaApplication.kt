package com.example.ruwajay

import android.app.Application

class RuwaApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        RuwaMessagingService.ensureNotificationChannel(this)
    }
}
