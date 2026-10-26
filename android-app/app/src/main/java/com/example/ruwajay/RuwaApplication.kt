package com.example.ruwajay

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache
import coil.memory.MemoryCache

class RuwaApplication : Application(), ImageLoaderFactory {
    override fun onCreate() {
        super.onCreate()
        RuwaMessagingService.ensureNotificationChannel(this)
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
