package com.yourorg.emma.nativeapp.voice

data class VoiceTranscript(
    val sender: VoiceSender,
    val text: String,
    val timestamp: Long = System.currentTimeMillis()
)

enum class VoiceSender { User, Emma, System }

data class VoiceSessionState(
    val isConnected: Boolean = false,
    val isConnecting: Boolean = false,
    val apiEnabled: Boolean = false,
    val isOffline: Boolean = false,
    val canUseOfflineStt: Boolean = true,
    val canUseOfflineTts: Boolean = false,
    val voicePlaybackEnabled: Boolean = false,
    val assistantState: String = "idle",
    val transcript: List<VoiceTranscript> = emptyList(),
    val isRecording: Boolean = false,
    val lastError: String? = null,
    val hasMicPermission: Boolean = false,
    val lastConnectedAt: Long? = null,
    val lastOnlineAt: Long? = null,
    val lastConnectivity: VoiceConnectivityResult? = null
)

data class VoiceConnectivityResult(
    val apiOk: Boolean,
    val wsOk: Boolean,
    val apiError: String? = null,
    val wsError: String? = null,
    val timestamp: Long = System.currentTimeMillis()
) {
    val ok: Boolean get() = apiOk && wsOk
}
