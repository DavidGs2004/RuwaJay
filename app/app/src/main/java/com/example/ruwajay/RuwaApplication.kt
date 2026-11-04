package com.example.ruwajay

import android.app.Application
import android.util.Log
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache
import coil.memory.MemoryCache

class RuwaApplication : Application(), ImageLoaderFactory {
    override fun onCreate() {
        super.onCreate()

        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            Log.e("RuwaApplication", "Fatal uncaught exception on thread ${thread.name}", throwable)
            defaultHandler?.uncaughtException(thread, throwable)
        }

        try {
            RuwaMessagingService.ensureNotificationChannel(this)
        } catch (e: Throwable) {
            Log.e("RuwaApplication", "Error initializing notification channels", e)
        }
    }

    override fun newImageLoader(): ImageLoader {
        return ImageLoader.Builder(this)
            .memoryCache {
                MemoryCache.Builder(this)
                    .maxSizePercent(0.25)
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("image_cache"))
                    .maxSizeBytes(128L * 1024 * 1024) // 128 MB cache
                    .build()
            }
            .respectCacheHeaders(false)
            .allowHardware(true)
            .crossfade(false)
            .build()
    }
}
