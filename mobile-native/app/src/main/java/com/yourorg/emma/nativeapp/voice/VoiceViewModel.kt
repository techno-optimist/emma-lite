package com.yourorg.emma.nativeapp.voice

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.yourorg.emma.nativeapp.vault.MemoryAttachmentInput
import kotlinx.coroutines.flow.StateFlow

class VoiceViewModel(
    private val manager: VoiceSessionManager
) : ViewModel() {
    val state: StateFlow<VoiceSessionState> = manager.state

    fun connect() = manager.connect()

    fun disconnect() = manager.disconnect()

    fun sendText(text: String, attachments: List<MemoryAttachmentInput> = emptyList()) {
        manager.sendUserText(text, attachments)
    }

    fun updateMicPermission(granted: Boolean) = manager.updateMicPermission(granted)

    fun setVoicePlaybackEnabled(enabled: Boolean) = manager.setVoicePlaybackEnabled(enabled)

    suspend fun runConnectivityProbe(): VoiceConnectivityResult = manager.runConnectivityProbe()

    fun toggleRecording() {
        if (state.value.isRecording) {
            manager.stopRecording()
        } else {
            manager.startRecording()
        }
    }

    override fun onCleared() {
        manager.shutdown()
        super.onCleared()
    }

    class Factory(
        private val appContext: Context,
        private val vaultRepository: com.yourorg.emma.nativeapp.vault.VaultRepository
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(VoiceViewModel::class.java)) {
                return VoiceViewModel(
                    VoiceSessionManager(
                        appContext.applicationContext,
                        vaultRepository = vaultRepository
                    )
                ) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
