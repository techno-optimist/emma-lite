package com.yourorg.emma.nativeapp.voice

import android.content.Context
import android.media.MediaPlayer
import android.util.Base64
import java.io.File

class VoiceAudioPlayer(private val context: Context) {
    private var mediaPlayer: MediaPlayer? = null

    fun playBase64Mp3(encoded: String, onError: (() -> Unit)? = null) {
        if (encoded.isBlank()) {
            onError?.invoke()
            return
        }
        val data = try {
            Base64.decode(encoded, Base64.DEFAULT)
        } catch (_: IllegalArgumentException) {
            onError?.invoke()
            return
        }

        val cacheDir = File(context.cacheDir, "voice").apply { if (!exists()) mkdirs() }
        val file = File(cacheDir, "emma_voice_${System.currentTimeMillis()}.mp3")
        runCatching { file.writeBytes(data) }.onFailure {
            onError?.invoke()
            return
        }

        mediaPlayer?.release()
        mediaPlayer = MediaPlayer().apply {
            try {
                setDataSource(file.absolutePath)
                setOnCompletionListener {
                    file.delete()
                    releaseInternal()
                }
                setOnErrorListener { _, _, _ ->
                    file.delete()
                    releaseInternal()
                    onError?.invoke()
                    true
                }
                prepare()
                start()
            } catch (_: Exception) {
                file.delete()
                releaseInternal()
                onError?.invoke()
            }
        }
    }

    fun stop() {
        try {
            mediaPlayer?.stop()
        } catch (_: IllegalStateException) {
        } finally {
            releaseInternal()
        }
    }

    private fun releaseInternal() {
        mediaPlayer?.release()
        mediaPlayer = null
    }
}
