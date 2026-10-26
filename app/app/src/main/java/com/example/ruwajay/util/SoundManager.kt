package com.example.ruwajay.util

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.media.RingtoneManager
import kotlin.concurrent.thread
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.sin

/**
 * Gestor de efectos de sonido para RuwaJay.
 * Genera y reproduce tonos limpios y agradables sin requerir archivos de audio externos:
 * - Sonido de mensaje enviado (pop/burbuja suave).
 * - Sonido de mensaje recibido en el chat (campanilla sutil).
 * - Tono de notificación estándar del sistema.
 */
object SoundManager {
    private const val SAMPLE_RATE = 44100

    private val sendToneData by lazy { generateSendTone() }
    private val receiveToneData by lazy { generateReceiveTone() }

    /**
     * Tono suave de envío (pop / burbuja moderna de 75 ms con frecuencia ascendente y decaimiento exponencial).
     */
    private fun generateSendTone(): ShortArray {
        val durationMs = 75
        val numSamples = (SAMPLE_RATE * durationMs) / 1000
        val buffer = ShortArray(numSamples)
        var phase = 0.0
        for (i in 0 until numSamples) {
            val t = i.toDouble() / numSamples
            val freq = 750.0 + 600.0 * t // Barrido de 750Hz a 1350Hz
            phase += 2.0 * PI * freq / SAMPLE_RATE
            val envelope = exp(-3.8 * t) * (1.0 - exp(-20.0 * t))
            val sample = (sin(phase) * envelope * Short.MAX_VALUE * 0.70).toInt()
            buffer[i] = sample.coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
        }
        return buffer
    }

    /**
     * Tono sutil de recepción en chat (campanilla armónica de 110 ms).
     */
    private fun generateReceiveTone(): ShortArray {
        val durationMs = 110
        val numSamples = (SAMPLE_RATE * durationMs) / 1000
        val buffer = ShortArray(numSamples)
        var phase1 = 0.0
        val half = numSamples / 2
        for (i in 0 until numSamples) {
            val freq = if (i < half) 880.0 else 1318.5 // La5 a Mi6
            val decay = if (i < half) {
                val subT = i.toDouble() / half
                exp(-4.0 * subT)
            } else {
                val subT = (i - half).toDouble() / (numSamples - half)
                exp(-3.5 * subT)
            }
            phase1 += 2.0 * PI * freq / SAMPLE_RATE
            val sample = (sin(phase1) * decay * Short.MAX_VALUE * 0.65).toInt()
            buffer[i] = sample.coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
        }
        return buffer
    }

    /**
     * Reproduce el sonido de envío de mensaje inmediatamente.
     */
    fun playSendSound(context: Context? = null) {
        thread(name = "ruwajay-send-sound", isDaemon = true) {
            try {
                playPcm(sendToneData)
            } catch (_: Exception) {}
        }
    }

    /**
     * Reproduce el sonido de mensaje recibido en pantalla activa.
     */
    fun playReceiveSound(context: Context? = null) {
        thread(name = "ruwajay-receive-sound", isDaemon = true) {
            try {
                playPcm(receiveToneData)
            } catch (_: Exception) {}
        }
    }

    private fun playPcm(pcm: ShortArray) {
        val minBufferSize = AudioTrack.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        val bufferSize = maxOf(minBufferSize, pcm.size * 2)
        val track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setBufferSizeInBytes(bufferSize)
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build()

        track.write(pcm, 0, pcm.size)
        track.play()
        Thread.sleep((pcm.size * 1000L / SAMPLE_RATE) + 40)
        track.stop()
        track.release()
    }

    /**
     * Reproduce el tono de notificación configurado por el usuario en el sistema.
     */
    fun playSystemNotificationSound(context: Context) {
        try {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val ringtone = RingtoneManager.getRingtone(context.applicationContext, uri)
            ringtone?.play()
        } catch (_: Exception) {}
    }
}
