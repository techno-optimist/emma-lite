package com.yourorg.emma.nativeapp.voice

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import java.util.Locale

class LocalTtsPlayer(
    context: Context,
    private val onReady: (Boolean) -> Unit = {}
) : TextToSpeech.OnInitListener {
    private val appContext = context.applicationContext
    private val mainHandler = Handler(Looper.getMainLooper())
    private var tts: TextToSpeech? = null
    private var isReady = false
    private var pendingText: String? = null

    init {
        tts = TextToSpeech(appContext, this)
    }

    override fun onInit(status: Int) {
        if (status != TextToSpeech.SUCCESS) {
            isReady = false
            onReady(false)
            return
        }
        val languageStatus = tts?.setLanguage(Locale.getDefault()) ?: TextToSpeech.LANG_NOT_SUPPORTED
        isReady = languageStatus != TextToSpeech.LANG_MISSING_DATA &&
            languageStatus != TextToSpeech.LANG_NOT_SUPPORTED
        onReady(isReady)
        if (isReady) {
            pendingText?.let { text ->
                pendingText = null
                speak(text)
            }
        }
    }

    fun speak(text: String) {
        val trimmed = text.trim()
        if (trimmed.isBlank()) return
        if (!isReady) {
            pendingText = trimmed
            return
        }
        mainHandler.post {
            tts?.speak(trimmed, TextToSpeech.QUEUE_FLUSH, null, "emma_tts_${System.currentTimeMillis()}")
        }
    }

    fun stop() {
        mainHandler.post { runCatching { tts?.stop() } }
    }

    fun shutdown() {
        mainHandler.post {
            runCatching { tts?.shutdown() }
            tts = null
            isReady = false
            pendingText = null
        }
    }
}
