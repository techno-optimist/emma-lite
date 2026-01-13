package com.yourorg.emma.nativeapp.voice

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlin.math.max

class AudioRecorder(
    private val sampleRate: Int = 16_000,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
) {
    private var audioRecord: AudioRecord? = null
    @Volatile
    private var isRecording: Boolean = false

    fun start(onData: (ByteArray) -> Unit) {
        if (isRecording) return
        val minBuffer = AudioRecord.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        val bufferSize = max(minBuffer, sampleRate / 5)
        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            sampleRate,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufferSize
        )
        audioRecord?.startRecording()
        isRecording = true

        scope.launch {
            val buffer = ByteArray(bufferSize)
            while (isRecording && audioRecord?.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
                val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                if (read > 0) {
                    onData(buffer.copyOf(read))
                }
            }
        }
    }

    fun stop() {
        isRecording = false
        try {
            audioRecord?.stop()
        } catch (_: IllegalStateException) {
        }
        audioRecord?.release()
        audioRecord = null
    }
}
