package com.yourorg.emma.nativeapp.voice

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import java.util.Locale

class LocalSpeechRecognizer(
    context: Context,
    private val onPartial: (String) -> Unit,
    private val onFinal: (String) -> Unit,
    private val onError: (Int) -> Unit
) {
    private val appContext = context.applicationContext
    private val mainHandler = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    private var isListening = false

    fun start() {
        mainHandler.post {
            if (isListening) return@post
            val speechRecognizer = getOrCreateRecognizer() ?: return@post
            isListening = true
            speechRecognizer.startListening(buildIntent())
        }
    }

    fun stop() {
        mainHandler.post {
            if (!isListening) return@post
            isListening = false
            recognizer?.stopListening()
        }
    }

    fun cancel() {
        mainHandler.post {
            isListening = false
            recognizer?.cancel()
        }
    }

    fun destroy() {
        mainHandler.post {
            isListening = false
            recognizer?.destroy()
            recognizer = null
        }
    }

    private fun getOrCreateRecognizer(): SpeechRecognizer? {
        if (!SpeechRecognizer.isRecognitionAvailable(appContext)) {
            onError(SpeechRecognizer.ERROR_CLIENT)
            return null
        }
        if (recognizer == null) {
            recognizer = SpeechRecognizer.createSpeechRecognizer(appContext).apply {
                setRecognitionListener(listener)
            }
        }
        return recognizer
    }

    private val listener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {}
        override fun onBeginningOfSpeech() {}
        override fun onRmsChanged(rmsdB: Float) {}
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() {}
        override fun onError(error: Int) {
            isListening = false
            onError(error)
        }

        override fun onResults(results: Bundle?) {
            isListening = false
            val transcript = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                ?.firstOrNull()
                .orEmpty()
            onFinal(transcript)
        }

        override fun onPartialResults(partialResults: Bundle?) {
            val partial = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                ?.firstOrNull()
                .orEmpty()
            if (partial.isNotBlank()) {
                onPartial(partial)
            }
        }

        override fun onEvent(eventType: Int, params: Bundle?) {}
    }

    private fun buildIntent(): Intent {
        return Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
        }
    }
}
