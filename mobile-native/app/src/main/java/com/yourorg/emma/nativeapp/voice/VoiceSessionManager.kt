package com.yourorg.emma.nativeapp.voice

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.speech.SpeechRecognizer
import android.util.Base64
import android.util.Log
import com.yourorg.emma.nativeapp.BuildConfig
import com.yourorg.emma.nativeapp.intelligence.UnifiedIntelligence
import com.yourorg.emma.nativeapp.network.OpenAiResponsesClient
import com.yourorg.emma.nativeapp.network.EmmaApiClient
import com.yourorg.emma.nativeapp.settings.AiPreferences
import com.yourorg.emma.nativeapp.settings.SettingsPreferences
import com.yourorg.emma.nativeapp.settings.SettingsPreferencesState
import com.yourorg.emma.nativeapp.vault.MemoryAttachmentInput
import com.yourorg.emma.nativeapp.vault.VaultRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.util.concurrent.TimeUnit
import java.util.UUID
import kotlin.coroutines.resume

class VoiceSessionManager(
    private val context: Context,
    private val baseUrl: String = BuildConfig.EMMA_BASE_URL,
    private val wsPath: String = BuildConfig.EMMA_WS_PATH,
    private val client: OkHttpClient = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build(),
    private val vaultRepository: VaultRepository = VaultRepository(context.applicationContext)
) {
    companion object {
        private const val TAG = "VoiceSessionManager"
        private const val OPENAI_MODEL = "gpt-4o-mini"
        private const val MAX_LOCAL_HISTORY = 12
        private const val GREETING_MESSAGE =
            "Hello! I'm Emma, your personal memory companion. I'm here to treasure and explore your most precious moments together."
        private val FALLBACK_MESSAGES = setOf(
            "I'm here with you and want to understand completely. Could you say that another way while I double-check my notes?",
            "I'm still here with you. Could you share that once more?"
        )
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val _state = MutableStateFlow(VoiceSessionState())
    val state: StateFlow<VoiceSessionState> = _state.asStateFlow()

    private val appContext = context.applicationContext
    private val apiClient = EmmaApiClient(baseUrl)
    private val aiPreferences = AiPreferences(appContext)
    private val settingsPreferences = SettingsPreferences(appContext)
    private val audioPlayer = VoiceAudioPlayer(appContext)
    private val localTtsPlayer = LocalTtsPlayer(appContext) { ready ->
        _state.update { it.copy(canUseOfflineTts = ready) }
    }
    private val localSpeechRecognizer = LocalSpeechRecognizer(
        appContext,
        onPartial = {},
        onFinal = { handleLocalTranscript(it) },
        onError = { handleSpeechError(it) }
    )
    private val toolExecutor = AndroidToolExecutor(vaultRepository)
    private var pendingMediaAttachments: List<MemoryAttachmentInput> = emptyList()
    private val unifiedIntelligence = UnifiedIntelligence(
        toolExecutor,
        attachmentsProvider = { pendingMediaAttachments },
        onAttachmentsConsumed = { clearPendingAttachments() }
    )
    private val openAiClient = OpenAiResponsesClient()
    private val openAiSessionId = UUID.randomUUID().toString()
    private val toolDefinitions = OpenAiToolDefinitions.definitions
    private val localHistory = ArrayDeque<OpenAiMessage>()
    private val historyLock = Any()
    private val pendingToolPayloads = ArrayDeque<VoicePayload>()
    private val normalizedFallbacks = FALLBACK_MESSAGES.map { normalizeText(it) }.toSet()
    private val baseSystemPrompt = listOf(
        "You are Emma, a gentle memory companion built to support families living with dementia.",
        "Always introduce yourself as Emma and speak with warmth and patience.",
        "Rely on validation therapy techniques: acknowledge feelings and avoid correcting memories.",
        "Use the available tools to recall people and memories or to capture new stories when helpful.",
        "Explain any tool usage briefly so the user understands what's happening.",
        "Keep data private and never invent vault contents."
    ).joinToString(" ")
    private val offlineResponder = OfflineEmmaResponder(vaultRepository, settingsPreferences)
    private val connectivityManager =
        appContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    private val defaultApiKey = BuildConfig.OPENAI_API_KEY.trim().takeIf { it.isNotBlank() }
    private var apiEnabled = defaultApiKey != null
    private var hasApiKey = defaultApiKey != null
    private var currentApiKey: String? = defaultApiKey
    private var aiPreferencesJob: kotlinx.coroutines.Job? = null
    private var settingsJob: kotlinx.coroutines.Job? = null
    private var settingsState: SettingsPreferencesState = SettingsPreferencesState()
    private var networkCallbackRegistered = false
    private var webSocket: WebSocket? = null
    private var userInitiatedDisconnect = false
    private var lastAssistantText: String = ""
    private var reconnectAttempts = 0
    private var reconnectJob: kotlinx.coroutines.Job? = null
    private var requestCounter = 0
    private var pendingResponseId: Int? = null
    private var localFallbackInFlight = false
    private var suppressNextServerAudio = false
    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            updateOfflineState()
            if (userInitiatedDisconnect) return
            if (!apiEnabled || !hasApiKey) return
            if (state.value.lastConnectedAt != null && webSocket == null && !state.value.isConnecting) {
                connect()
            }
        }

        override fun onLost(network: Network) {
            updateOfflineState()
        }

        override fun onUnavailable() {
            updateOfflineState()
        }
    }

    init {
        Log.d(TAG, "init")
        updateLocalSttAvailability()
        _state.update { it.copy(apiEnabled = apiEnabled) }
        observeAiPreferences()
        observeSettingsPreferences()
        updateOfflineState()
        registerNetworkCallback()
    }

    fun connect() {
        if (webSocket != null || state.value.isConnecting) return
        if (!apiEnabled) {
            setOffline(true)
            Log.w(TAG, "connect blocked: api disabled")
            updateError("API is off. Enable it in Settings to connect.")
            return
        }
        if (!hasApiKey) {
            setOffline(true)
            Log.w(TAG, "connect blocked: api key missing")
            updateError("Add your OpenAI API key in Settings to go online.")
            return
        }
        if (!isNetworkAvailable()) {
            updateOfflineState()
            Log.w(TAG, "connect blocked: no network")
            updateError("Offline mode enabled")
            return
        }
        if (state.value.isOffline) {
            setOffline(false)
        }
        userInitiatedDisconnect = false
        reconnectJob?.cancel()
        reconnectJob = null
        Log.d(TAG, "connecting websocket")
        _state.update { it.copy(isConnecting = true, lastError = null) }
        scope.launch {
            val request = Request.Builder()
                .url(buildWebSocketUrl())
                .build()
            webSocket = client.newWebSocket(request, socketListener)
        }
    }

    fun disconnect() {
        userInitiatedDisconnect = true
        Log.d(TAG, "disconnect")
        localSpeechRecognizer.cancel()
        localTtsPlayer.stop()
        audioPlayer.stop()
        webSocket?.close(1000, "client requested")
        webSocket = null
        synchronized(pendingToolPayloads) {
            pendingToolPayloads.clear()
        }
        clearPendingAttachments()
        _state.update {
            it.copy(
                isConnected = false,
                isConnecting = false,
                isRecording = false,
                assistantState = "idle"
            )
        }
    }

    fun shutdown() {
        disconnect()
        localSpeechRecognizer.destroy()
        localTtsPlayer.shutdown()
        unregisterNetworkCallback()
        aiPreferencesJob?.cancel()
        settingsJob?.cancel()
    }

    fun sendUserText(text: String, attachments: List<MemoryAttachmentInput> = emptyList()) {
        val trimmed = text.trim()
        val hasAttachments = attachments.isNotEmpty()
        if (trimmed.isBlank() && !hasAttachments) return
        val attachmentContinuation = hasAttachments && trimmed.isBlank() && hasAttachmentContext()
        val displayText = trimmed
        val wireText = if (trimmed.isBlank() && hasAttachments) {
            buildAttachmentWireText(attachments.size, attachmentContinuation)
        } else {
            trimmed
        }
        val attachmentSystemMessage = if (hasAttachments) {
            buildAttachmentSystemMessage(attachments, trimmed, attachmentContinuation)
        } else {
            null
        }
        if (!hasAttachments && pendingMediaAttachments.isNotEmpty() &&
            shouldSaveAttachmentsAfterDetails(trimmed, lastAssistantText)
        ) {
            appendTranscript(VoiceSender.User, displayText)
            recordHistory("user", trimmed)
            launchAttachmentSave(trimmed, pendingMediaAttachments)
            return
        }
        if (hasAttachments && shouldSaveAttachmentsNow(trimmed)) {
            appendTranscript(VoiceSender.User, displayText, attachments = attachments)
            attachmentSystemMessage?.let { recordHistory("system", it) }
            recordHistory("user", wireText)
            addPendingAttachments(attachments)
            launchAttachmentSave(trimmed, attachments)
            return
        }
        if (!state.value.isConnected) {
            if (state.value.isOffline) {
                Log.d(TAG, "sendUserText offline fallback")
                if (hasAttachments) {
                    addPendingAttachments(attachments)
                }
                appendTranscript(VoiceSender.User, displayText, attachments = attachments)
                attachmentSystemMessage?.let { recordHistory("system", it) }
                recordHistory("user", wireText)
                respondOffline(
                    wireText,
                    attachmentsOnly = hasAttachments && trimmed.isBlank(),
                    attachmentContinuation = attachmentContinuation
                )
                return
            }
            Log.w(TAG, "sendUserText blocked: not connected")
            updateError("Connect to Emma before sending a message")
            return
        }
        if (hasAttachments) {
            addPendingAttachments(attachments)
        }
        val carryoverSystemMessage = if (!hasAttachments && pendingMediaAttachments.isNotEmpty()) {
            buildAttachmentCarryoverSystemMessage(pendingMediaAttachments.size)
        } else {
            null
        }
        appendTranscript(VoiceSender.User, displayText, attachments = attachments)
        attachmentSystemMessage?.let { recordHistory("system", it) }
        carryoverSystemMessage?.let { recordHistory("system", it) }
        recordHistory("user", wireText)
        pendingResponseId = nextRequestId()
        scope.launch {
            val apiKey = currentApiKey
                ?: aiPreferences.state.first().openAiApiKey?.trim()?.takeIf { it.isNotBlank() }
            if (!apiKey.isNullOrBlank()) {
                currentApiKey = apiKey
                Log.d(TAG, "sending set_api_key")
                sendJson(
                    JSONObject().apply {
                        put("type", "set_api_key")
                        put("apiKey", apiKey)
                    }
                )
            }
            if (!attachmentSystemMessage.isNullOrBlank()) {
                Log.d(TAG, "sending system_message")
                sendSystemMessage(attachmentSystemMessage)
            }
            if (!carryoverSystemMessage.isNullOrBlank()) {
                Log.d(TAG, "sending system_message (carryover)")
                sendSystemMessage(carryoverSystemMessage)
            }
            Log.d(TAG, "sending user_text")
            sendJson(
                JSONObject().apply {
                    put("type", "user_text")
                    put("text", wireText)
                }
            )
        }
    }

    private fun sendSystemMessage(content: String) {
        sendJson(
            JSONObject().apply {
                put("type", "system_message")
                put("content", content)
            }
        )
    }

    private fun buildAttachmentWireText(count: Int, continuation: Boolean): String {
        return if (continuation) {
            if (count == 1) "Here is the photo you asked for." else "Here are the photos you asked for."
        } else {
            if (count == 1) "A photo was shared." else "Photos were shared."
        }
    }

    private fun buildAttachmentSystemMessage(
        attachments: List<MemoryAttachmentInput>,
        userText: String,
        continuation: Boolean
    ): String {
        val count = attachments.size
        val plural = if (count == 1) "photo" else "photos"
        return if (userText.isBlank()) {
            if (continuation) {
                "The user just shared $count $plural after a prior request. " +
                    "Continue the current thread and use the attached $plural without restarting. " +
                    "Do not say you can't access or view photos, do not ask to re-upload, and do not claim to see the contents. " +
                    "Ask for details to save or continue the memory."
            } else {
                "The user just shared $count $plural with no text. " +
                    "Acknowledge receipt and ask a gentle opener about the $plural. " +
                    "Do not say you can't access or view photos, do not ask to re-upload, and do not claim to see the contents."
            }
        } else {
            "The user shared $count $plural along with this message: \"$userText\". " +
                "Follow the user's request and use the attachments as needed. " +
                "Do not say you can't access or view photos, do not ask to re-upload, and do not claim to see the contents."
        }
    }

    private fun buildPhotoOpener(count: Int): String {
        val plural = if (count == 1) "photo" else "photos"
        val pronoun = if (count == 1) "it" else "them"
        return "Thanks for sharing the $plural. Would you like to tell me about $pronoun?"
    }

    private fun buildPhotoContinuation(count: Int): String {
        val plural = if (count == 1) "photo" else "photos"
        val pronoun = if (count == 1) "it" else "them"
        return "Thanks for sharing the $plural. Would you like me to save $pronoun as a memory?"
    }

    private fun shouldSaveAttachmentsAfterDetails(text: String, assistantText: String): Boolean {
        if (text.isBlank()) return false
        val trimmed = text.trim()
        if (isNegativeConfirmation(trimmed)) return false
        if (isConfirmationOnly(trimmed)) {
            return assistantAskedToSave(assistantText)
        }
        val lowered = trimmed.lowercase()
        val looksLikeQuestion = lowered.endsWith("?") ||
            listOf("show", "find", "list", "who", "what", "when", "where", "why", "how").any {
                lowered.startsWith("$it ")
            }
        if (looksLikeQuestion) return false
        val prompt = assistantText.lowercase()
        val detailHints = listOf(
            "details",
            "title",
            "emotions",
            "location",
            "people",
            "save",
            "memory",
            "photo",
            "picture",
            "upload",
            "share",
            "attach"
        )
        return detailHints.any { prompt.contains(it) }
    }

    private fun shouldSaveAttachmentsNow(text: String): Boolean {
        if (text.isBlank()) return false
        val lowered = text.lowercase()
        val savePhrases = listOf(
            "save",
            "add to memory",
            "add this memory",
            "store",
            "keep",
            "remember",
            "capture",
            "log this"
        )
        val photoHints = listOf("photo", "photos", "picture", "pictures", "image", "images", "memory")
        val hasSave = savePhrases.any { lowered.contains(it) }
        val hasObject = photoHints.any { lowered.contains(it) } || lowered.contains("this") || lowered.contains("these")
        return hasSave && hasObject
    }

    private fun buildAttachmentCarryoverSystemMessage(count: Int): String {
        val plural = if (count == 1) "photo" else "photos"
        return "Reminder: the user already shared $count $plural earlier in this conversation. " +
            "Use the $plural as attachments if saving a memory and do not ask the user to re-upload them."
    }

    private fun buildAttachmentSaveContent(text: String?, count: Int, fallbackContext: String? = null): String {
        val fallback = fallbackContext?.takeIf { it.isNotBlank() }
            ?: if (count == 1) "Shared photo." else "Shared photos."
        val base = text?.trim().orEmpty()
        if (base.isBlank()) return fallback
        val cleaned = stripLeadingConfirmation(base)
        if (cleaned.isBlank()) return fallback
        if (isConfirmationOnly(cleaned) || isNegativeConfirmation(cleaned)) return fallback
        val commandRegex = Regex(
            "^(please\\s+)?(can you\\s+|could you\\s+|would you\\s+)?(save|add|attach|upload|share|keep|store|remember|capture|log)\\s+(this|these)?\\s*(photo|photos|picture|pictures|image|images|memory)?\\s*(of|from|with)?\\s*",
            RegexOption.IGNORE_CASE
        )
        val stripped = cleaned.replace(commandRegex, "").trim()
        return stripped.ifBlank { fallback }
    }

    private fun launchAttachmentSave(userText: String, attachments: List<MemoryAttachmentInput>) {
        _state.update { it.copy(assistantState = "thinking") }
        scope.launch {
            val fallbackContext = findPreviousAttachmentContext(userText)
            val content = buildAttachmentSaveContent(userText, attachments.size, fallbackContext)
            val params = JSONObject().apply {
                put("content", content)
                put("attachments", buildAttachmentArray(attachments))
            }
            val result = runCatching { toolExecutor.execute("create_memory_capsule", params) }
                .getOrElse { error ->
                    JSONObject().apply { put("error", error.message ?: "Unable to save memory") }
                }
            val errorMessage = result.optString("error", "").trim()
            if (errorMessage.isNotBlank()) {
                appendTranscript(VoiceSender.System, errorMessage)
            } else {
                clearPendingAttachments()
                val payload = buildToolPayload("create_memory_capsule", result)
                val summary = buildToolSummary(listOf(ToolOutcome("create_memory_capsule", result)))
                val response = summary ?: "Saved that memory for you."
                lastAssistantText = response
                appendTranscript(VoiceSender.Emma, response, payload)
                recordHistory("assistant", response)
            }
            _state.update { it.copy(assistantState = "ready") }
        }
    }

    private fun hasAttachmentContext(): Boolean {
        val assistantText = lastAssistantText.lowercase()
        val userText = lastUserMessage()?.lowercase().orEmpty()
        val hints = listOf("photo", "photos", "picture", "image", "upload", "share", "attach", "send", "memory", "save")
        return hints.any { assistantText.contains(it) } || hints.any { userText.contains(it) }
    }

    private fun sanitizePhotoResponse(text: String): String? {
        if (pendingMediaAttachments.isEmpty()) return null
        val lowered = text.lowercase()
        val photoWords = listOf("photo", "photos", "picture", "image")
        if (!photoWords.any { lowered.contains(it) }) return null
        val denyPhrases = listOf(
            "don't have access",
            "do not have access",
            "can't access",
            "cannot access",
            "can't view",
            "cannot view",
            "can't see",
            "cannot see",
            "unable to view",
            "unable to access"
        )
        val requestPhrases = listOf(
            "share the photo",
            "share the photos",
            "send the photo",
            "send the photos",
            "upload the photo",
            "upload the photos",
            "provide the photo",
            "provide the photos",
            "submit the photo",
            "submit the photos",
            "re-upload",
            "attach the photo",
            "attach the photos"
        )
        if (!denyPhrases.any { lowered.contains(it) } && !requestPhrases.any { lowered.contains(it) }) {
            return null
        }
        val count = pendingMediaAttachments.size
        val plural = if (count == 1) "photo" else "photos"
        val pronoun = if (count == 1) "it" else "them"
        return if (hasAttachmentContext()) {
            "Thanks for sharing the $plural. Would you like me to save $pronoun with the memory we were discussing? " +
                "You can add details like people, place, or how it felt."
        } else {
            "Thanks for sharing the $plural. Tell me anything you'd like to include about $pronoun, and I can save it."
        }
    }

    private fun addPendingAttachments(attachments: List<MemoryAttachmentInput>) {
        if (attachments.isEmpty()) return
        pendingMediaAttachments = pendingMediaAttachments + attachments
    }

    private fun assistantAskedToSave(assistantText: String): Boolean {
        val lowered = assistantText.lowercase()
        val phrases = listOf(
            "would you like me to save",
            "do you want me to save",
            "should i save",
            "want me to save",
            "save it as a memory",
            "save this memory",
            "save it with the memory",
            "ready to save",
            "shall i save"
        )
        return phrases.any { lowered.contains(it) }
    }

    private val confirmationReplies = setOf(
        "yes",
        "yeah",
        "yep",
        "yup",
        "sure",
        "ok",
        "okay",
        "alright",
        "of course",
        "please",
        "please do",
        "go ahead",
        "sounds good",
        "that works",
        "sure thing",
        "do it",
        "save it",
        "save them",
        "please save"
    )

    private val negativeReplies = setOf(
        "no",
        "nope",
        "nah",
        "not now",
        "not yet",
        "maybe later",
        "later",
        "dont",
        "do not",
        "stop",
        "cancel",
        "never mind",
        "nevermind",
        "no thanks"
    )

    private val attachmentWireReplies = setOf(
        "a photo was shared",
        "photos were shared",
        "here is the photo you asked for",
        "here are the photos you asked for"
    )

    private fun normalizeReply(text: String): String {
        return text.lowercase()
            .replace("[^a-z0-9\\s]".toRegex(), "")
            .replace("\\s+".toRegex(), " ")
            .trim()
    }

    private fun isConfirmationOnly(text: String): Boolean {
        val normalized = normalizeReply(text)
        return normalized in confirmationReplies
    }

    private fun isNegativeConfirmation(text: String): Boolean {
        val normalized = normalizeReply(text)
        return normalized in negativeReplies
    }

    private fun isAttachmentWireText(text: String): Boolean {
        val normalized = normalizeReply(text)
        return normalized in attachmentWireReplies
    }

    private fun stripLeadingConfirmation(text: String): String {
        val trimmed = text.trim()
        if (trimmed.isBlank()) return ""
        val pattern = Regex(
            "^(yes|yeah|yep|yup|sure|ok|okay|alright|of course|please|please do|go ahead|sounds good|that works|sure thing|do it)[,\\s]+",
            RegexOption.IGNORE_CASE
        )
        val stripped = trimmed.replace(pattern, "").trim()
        return if (stripped.isBlank()) "" else stripped
    }

    private fun findPreviousAttachmentContext(currentText: String): String? {
        val normalizedCurrent = normalizeReply(currentText)
        var skippedCurrent = false

        fun candidateFrom(text: String): String? {
            val trimmed = text.trim()
            if (trimmed.isBlank()) return null
            val normalized = normalizeReply(trimmed)
            if (!skippedCurrent && normalized == normalizedCurrent) {
                skippedCurrent = true
                return null
            }
            if (isConfirmationOnly(trimmed) || isNegativeConfirmation(trimmed)) return null
            if (isAttachmentWireText(trimmed)) return null
            return trimmed
        }

        val history = synchronized(historyLock) { localHistory.toList() }
        for (message in history.asReversed()) {
            if (message.role != "user") continue
            val candidate = candidateFrom(message.content)
            if (candidate != null) return candidate
        }
        for (message in state.value.transcript.asReversed()) {
            if (message.sender != VoiceSender.User) continue
            val candidate = candidateFrom(message.text)
            if (candidate != null) return candidate
        }
        return null
    }

    private fun clearPendingAttachments() {
        pendingMediaAttachments = emptyList()
    }

    private fun maybeInjectAttachments(toolName: String, params: JSONObject): Boolean {
        val attachments = pendingMediaAttachments
        if (attachments.isEmpty()) return false
        val attachmentJson = buildAttachmentArray(attachments)
        when (toolName) {
            "create_memory_capsule",
            "create_memory_from_voice",
            "update_memory_capsule" -> {
                val merged = mergeAttachmentArrays(params.optJSONArray("attachments"), attachmentJson)
                params.put("attachments", merged)
                return true
            }
            "attach_memory_media" -> {
                val merged = mergeAttachmentArrays(params.optJSONArray("media"), attachmentJson)
                params.put("media", merged)
                return true
            }
        }
        return false
    }

    private fun buildAttachmentArray(attachments: List<MemoryAttachmentInput>): JSONArray {
        val array = JSONArray()
        attachments.forEach { attachment ->
            val encoded = Base64.encodeToString(attachment.bytes, Base64.NO_WRAP)
            array.put(
                JSONObject().apply {
                    put("name", attachment.name)
                    put("type", attachment.mime)
                    put("data", encoded)
                }
            )
        }
        return array
    }

    private fun mergeAttachmentArrays(existing: JSONArray?, additions: JSONArray): JSONArray {
        val merged = JSONArray()
        if (existing != null) {
            for (i in 0 until existing.length()) {
                merged.put(existing.get(i))
            }
        }
        for (i in 0 until additions.length()) {
            merged.put(additions.get(i))
        }
        return merged
    }

    fun startRecording() {
        if (state.value.isRecording) return
        if (!state.value.hasMicPermission) {
            updateError("Microphone permission required")
            return
        }
        if (!SpeechRecognizer.isRecognitionAvailable(appContext)) {
            _state.update { it.copy(canUseOfflineStt = false) }
            updateError("Speech recognition unavailable")
            return
        }
        if (state.value.isOffline && !state.value.canUseOfflineStt) {
            updateError("Offline speech recognition unavailable")
            return
        }
        runCatching {
            localSpeechRecognizer.start()
            _state.update { it.copy(isRecording = true, assistantState = "listening") }
        }.onFailure { updateError("Unable to start speech recognition: ${it.message}") }
    }

    fun stopRecording() {
        localSpeechRecognizer.stop()
        _state.update { it.copy(isRecording = false) }
    }

    fun updateMicPermission(granted: Boolean) {
        _state.update {
            val resetRecording = it.isRecording && !granted
            it.copy(
                hasMicPermission = granted,
                isRecording = if (resetRecording) false else it.isRecording
            )
        }
        if (!granted) {
            localSpeechRecognizer.cancel()
        }
    }

    fun setVoicePlaybackEnabled(enabled: Boolean) {
        _state.update { it.copy(voicePlaybackEnabled = enabled) }
        if (!enabled) {
            audioPlayer.stop()
            localTtsPlayer.stop()
        }
    }

    suspend fun runConnectivityProbe(): VoiceConnectivityResult = withContext(Dispatchers.IO) {
        if (!apiEnabled) {
            val result = VoiceConnectivityResult(
                apiOk = false,
                wsOk = false,
                apiError = "API disabled",
                wsError = "API disabled"
            )
            _state.update { it.copy(lastConnectivity = result, lastError = result.apiError) }
            return@withContext result
        }
        if (!hasApiKey) {
            val result = VoiceConnectivityResult(
                apiOk = false,
                wsOk = false,
                apiError = "API key missing",
                wsError = "API key missing"
            )
            _state.update { it.copy(lastConnectivity = result, lastError = result.apiError) }
            return@withContext result
        }
        val apiResult = apiClient.fetchEphemeralToken()
        val apiOk = apiResult.isSuccess
        val apiError = apiResult.exceptionOrNull()?.message

        val wsOutcome = suspendCancellableCoroutine<Boolean> { continuation ->
            val listener = object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    continuation.resume(true)
                    webSocket.close(1000, "probe_ok")
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    continuation.resume(false)
                }
            }
            val socket = client.newWebSocket(
                Request.Builder().url(buildWebSocketUrl()).build(),
                listener
            )
            continuation.invokeOnCancellation { socket.cancel() }
        }

        val result = VoiceConnectivityResult(
            apiOk = apiOk,
            wsOk = wsOutcome,
            apiError = apiError,
            wsError = if (wsOutcome) null else "WebSocket handshake failed"
        )
        _state.update {
            it.copy(
                lastConnectivity = result,
                lastError = if (result.ok) null else result.apiError ?: result.wsError
            )
        }
        result
    }

    private fun sendStartSession() {
        Log.d(TAG, "sending start_session")
        sendJson(JSONObject().apply { put("type", "start_session") })
    }

    private fun sendJson(json: JSONObject) {
        val type = json.optString("type", "unknown")
        val sent = webSocket?.send(json.toString()) ?: false
        if (!sent) {
            Log.w(TAG, "send failed type=$type")
        }
    }

    private fun sendApiKeyIfAvailable() {
        val apiKey = currentApiKey
        if (apiKey.isNullOrBlank()) return
        Log.d(TAG, "sending set_api_key (connect)")
        sendJson(
            JSONObject().apply {
                put("type", "set_api_key")
                put("apiKey", apiKey)
            }
        )
    }

    private val socketListener = object : WebSocketListener() {
        override fun onOpen(webSocket: WebSocket, response: Response) {
            val connectedAt = System.currentTimeMillis()
            reconnectAttempts = 0
            Log.d(TAG, "websocket open")
            sendApiKeyIfAvailable()
            sendStartSession()
            _state.update {
                it.copy(
                    isConnecting = false,
                    isConnected = true,
                    assistantState = "listening",
                    lastError = null,
                    lastConnectedAt = connectedAt,
                    lastOnlineAt = connectedAt,
                    isOffline = false
                )
            }
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            Log.d(TAG, "websocket message received")
            handleIncoming(text)
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            this@VoiceSessionManager.webSocket = null
            Log.w(TAG, "websocket closed code=$code reason=$reason")
            _state.update {
                it.copy(
                    isConnected = false,
                    isConnecting = false,
                    assistantState = "idle",
                    isRecording = false
                )
            }
            if (!userInitiatedDisconnect) {
                setOffline(true)
                scheduleReconnect()
            }
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            this@VoiceSessionManager.webSocket = null
            Log.e(TAG, "websocket failure: ${t.message}", t)
            _state.update {
                it.copy(
                    lastError = t.message ?: "Connection failed",
                    isConnected = false,
                    isConnecting = false,
                    isRecording = false
                )
            }
            setOffline(true)
            scheduleReconnect()
        }
    }

    private fun handleLocalTranscript(text: String) {
        if (text.isBlank()) {
            _state.update { it.copy(isRecording = false) }
            return
        }
        sendUserText(text)
        _state.update { it.copy(isRecording = false) }
    }

    private fun handleSpeechError(errorCode: Int) {
        _state.update { it.copy(isRecording = false) }
        val message = speechErrorMessage(errorCode)
        if (message.isNotBlank()) {
            updateError(message)
        }
        if (errorCode == SpeechRecognizer.ERROR_CLIENT ||
            errorCode == SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED ||
            errorCode == SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE
        ) {
            _state.update { it.copy(canUseOfflineStt = false) }
        } else if (state.value.isOffline &&
            (errorCode == SpeechRecognizer.ERROR_NETWORK ||
                errorCode == SpeechRecognizer.ERROR_NETWORK_TIMEOUT ||
                errorCode == SpeechRecognizer.ERROR_SERVER)
        ) {
            _state.update { it.copy(canUseOfflineStt = false) }
        }
    }

    private fun speakLocal(text: String) {
        val trimmed = text.trim()
        if (trimmed.isBlank()) return
        if (!state.value.voicePlaybackEnabled) return
        if (!state.value.canUseOfflineTts) return
        localTtsPlayer.speak(trimmed)
    }

    private suspend fun maybeDelayForDementia() {
        if (settingsState.dementiaMode) {
            delay(2500)
        }
    }

    private fun speakLocalFallback() {
        if (!state.value.voicePlaybackEnabled) return
        if (lastAssistantText.isBlank()) return
        speakLocal(lastAssistantText)
    }

    private fun speechErrorMessage(errorCode: Int): String {
        return when (errorCode) {
            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
            SpeechRecognizer.ERROR_CLIENT -> "Speech recognition unavailable"
            SpeechRecognizer.ERROR_NETWORK -> "Speech recognition network error"
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Speech recognition timeout"
            SpeechRecognizer.ERROR_NO_MATCH -> "Didn't catch that"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Speech recognizer busy"
            SpeechRecognizer.ERROR_SERVER -> "Speech recognition server error"
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech detected"
            SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED -> "Language not supported"
            SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "Language unavailable"
            else -> "Speech recognition error"
        }
    }

    private fun updateLocalSttAvailability() {
        val available = SpeechRecognizer.isRecognitionAvailable(appContext)
        _state.update { it.copy(canUseOfflineStt = available) }
    }

    private fun observeAiPreferences() {
        aiPreferencesJob?.cancel()
        aiPreferencesJob = scope.launch {
            aiPreferences.state.collect { prefs ->
                val enabled = prefs.apiEnabled
                val keyValue = prefs.openAiApiKey?.trim()?.takeIf { it.isNotBlank() }
                val keyPresent = keyValue != null
                currentApiKey = keyValue
                apiEnabled = enabled
                hasApiKey = keyPresent
                Log.d(TAG, "ai prefs updated enabled=$enabled hasKey=$keyPresent")
                _state.update { it.copy(apiEnabled = enabled) }
                if (!enabled || !keyPresent) {
                    if (webSocket != null || state.value.isConnecting) {
                        disconnect()
                    }
                }
                updateOfflineState()
            }
        }
    }

    private fun observeSettingsPreferences() {
        settingsJob?.cancel()
        settingsJob = scope.launch {
            settingsPreferences.state.collect { prefs ->
                settingsState = prefs
                unifiedIntelligence.updateSettings(prefs)
            }
        }
    }

    private fun updateOfflineState() {
        val shouldBeOffline = !apiEnabled || !hasApiKey || !isNetworkAvailable()
        setOffline(shouldBeOffline)
    }

    private fun setOffline(isOffline: Boolean) {
        _state.update { current ->
            if (current.isOffline == isOffline) {
                current
            } else {
                Log.d(TAG, "offline state changed: $isOffline")
                current.copy(
                    isOffline = isOffline,
                    lastOnlineAt = if (isOffline) System.currentTimeMillis() else current.lastOnlineAt
                )
            }
        }
    }

    private fun isNetworkAvailable(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun registerNetworkCallback() {
        if (networkCallbackRegistered) return
        runCatching {
            connectivityManager.registerDefaultNetworkCallback(networkCallback)
            networkCallbackRegistered = true
        }
    }

    private fun unregisterNetworkCallback() {
        if (!networkCallbackRegistered) return
        runCatching { connectivityManager.unregisterNetworkCallback(networkCallback) }
        networkCallbackRegistered = false
    }

    private fun scheduleReconnect() {
        if (userInitiatedDisconnect) return
        if (reconnectJob?.isActive == true) return
        if (!apiEnabled || !hasApiKey) return
        if (!isNetworkAvailable()) return
        reconnectAttempts += 1
        Log.w(TAG, "scheduling reconnect attempt=$reconnectAttempts")
        val delayMs = computeReconnectDelay(reconnectAttempts)
        reconnectJob = scope.launch {
            delay(delayMs)
            if (webSocket == null && !state.value.isConnecting) {
                connect()
            }
        }
    }

    private fun computeReconnectDelay(attempts: Int): Long {
        val step = (attempts - 1).coerceIn(0, 5)
        val delayMs = 1000L * (1L shl step)
        return delayMs.coerceAtMost(20_000L)
    }

    private fun handleIncoming(raw: String) {
        try {
            val json = JSONObject(raw)
            val type = json.optString("type")
            Log.d(TAG, "incoming type=$type")
            when (type) {
                "emma_ready" -> {
                    appendTranscript(VoiceSender.System, json.optString("message", "Emma ready"))
                    _state.update { it.copy(assistantState = "ready") }
                }
                "state_change" -> {
                    val newState = json.optString("state", "idle")
                    _state.update { it.copy(assistantState = newState) }
                }
                "emma_transcription" -> {
                    val text = json.optString("transcript", "").trim()
                    if (text.isBlank()) return
                    if (isGreetingMessage(text)) {
                        suppressNextServerAudio = true
                        Log.d(TAG, "suppressing greeting message")
                        return
                    }
                    if (isFallbackMessage(text)) {
                        handleServerFallback(text)
                        return
                    }
                    val sanitized = sanitizePhotoResponse(text)
                    val finalText = sanitized ?: text
                    if (sanitized != null) {
                        suppressNextServerAudio = true
                    }
                    lastAssistantText = finalText
                    val payload = consumePendingToolPayload()
                    appendTranscript(VoiceSender.Emma, finalText, payload)
                    if (!isGreetingMessage(finalText)) {
                        recordHistory("assistant", finalText)
                        pendingResponseId = null
                    }
                }
                "emma_audio" -> {
                    if (suppressNextServerAudio) {
                        suppressNextServerAudio = false
                        return
                    }
                    if (!state.value.voicePlaybackEnabled) {
                        Log.d(TAG, "voice playback disabled; dropping server audio")
                        return
                    }
                    val audio = json.optString("audio", "")
                    localTtsPlayer.stop()
                    audioPlayer.playBase64Mp3(audio) {
                        speakLocalFallback()
                    }
                }
                "tool_request" -> {
                    Log.d(TAG, "tool_request: ${json.optString("tool_name")}")
                    handleToolRequest(json)
                }
                "session_ended" -> {
                    appendTranscript(VoiceSender.System, json.optString("message", "Session ended"))
                    disconnect()
                }
                "error" -> {
                    val errorMsg = json.optString("message", "Unknown error")
                    Log.e(TAG, "server error: $errorMsg")
                    _state.update { it.copy(lastError = errorMsg) }
                    appendTranscript(VoiceSender.System, errorMsg)
                }
                else -> {
                    Log.w(TAG, "unhandled message type=$type")
                }
            }
        } catch (_: Exception) {
            // Ignore malformed payloads
        }
    }

    private fun handleServerFallback(fallbackText: String) {
        Log.w(TAG, "server fallback detected")
        if (pendingResponseId == null) {
            lastAssistantText = fallbackText
            appendTranscript(VoiceSender.Emma, fallbackText)
            recordHistory("assistant", fallbackText)
            return
        }
        suppressNextServerAudio = true
        pendingResponseId = null
        if (localFallbackInFlight) return
        localFallbackInFlight = true
        _state.update { it.copy(assistantState = "thinking") }
        scope.launch {
            try {
                val response = if (apiEnabled && hasApiKey) {
                    runCatching { requestLocalAssistantReply() }
                        .onFailure { error ->
                            Log.e(TAG, "local OpenAI fallback failed: ${error.message}", error)
                        }
                        .getOrNull()
                } else {
                    null
                }
                val text = response?.text?.trim().orEmpty()
                val toolSummary = response?.toolResults?.let { buildToolSummary(it) }.orEmpty()
                val toolPayload = response?.toolResults?.let { buildToolPayloadFromOutcomes(it) }
                when {
                    text.isNotBlank() -> {
                        maybeDelayForDementia()
                        lastAssistantText = text
                        appendTranscript(VoiceSender.Emma, text, toolPayload)
                        recordHistory("assistant", text)
                    }
                    toolPayload != null -> {
                        maybeDelayForDementia()
                        appendTranscript(VoiceSender.Emma, "Here's what I found.", toolPayload)
                    }
                    toolSummary.isNotBlank() -> {
                        appendTranscript(VoiceSender.System, toolSummary)
                    }
                    else -> {
                        val unifiedHandled = respondWithUnifiedFallback()
                        if (!unifiedHandled) {
                            appendTranscript(VoiceSender.System, "Online response failed. Please try again.")
                        }
                    }
                }
            } finally {
                _state.update { it.copy(assistantState = "ready") }
                localFallbackInFlight = false
            }
        }
    }

    private suspend fun respondWithUnifiedFallback(): Boolean {
        val lastUser = lastUserMessage() ?: return false
        val snapshot = VaultSnapshotBuilder.build(vaultRepository)
        val unified = runCatching { unifiedIntelligence.analyzeAndRespond(lastUser, snapshot) }
            .getOrNull()
            ?: return false
        maybeDelayForDementia()
        lastAssistantText = unified.text
        appendTranscript(VoiceSender.Emma, unified.text, unified.payload)
        recordHistory("assistant", unified.text)
        if (unified.shouldSpeak) {
            speakLocal(unified.text)
        }
        return true
    }

    private fun lastUserMessage(): String? {
        val historyMessage = synchronized(historyLock) {
            localHistory.lastOrNull { it.role == "user" }?.content
        }
        if (!historyMessage.isNullOrBlank()) return historyMessage
        return state.value.transcript.lastOrNull { it.sender == VoiceSender.User }?.text
    }

    private fun handleToolRequest(json: JSONObject) {
        val callId = json.optString("call_id", "")
        val toolName = json.optString("tool_name", "")
        if (callId.isBlank() || toolName.isBlank()) {
            appendTranscript(VoiceSender.System, "Tool request missing call details")
            return
        }
        val params = json.optJSONObject("parameters") ?: JSONObject()
        scope.launch {
            val usedAttachments = maybeInjectAttachments(toolName, params)
            val result = runCatching { toolExecutor.execute(toolName, params) }
                .getOrElse { error ->
                    JSONObject().apply { put("error", error.message ?: "Tool execution failed") }
                }
            val errorMessage = result.optString("error", "").trim()
            if (usedAttachments && errorMessage.isBlank()) {
                clearPendingAttachments()
            }
            sendJson(
                JSONObject().apply {
                    put("type", "tool_result")
                    put("call_id", callId)
                    put("result", result)
                }
            )
            if (errorMessage.isNotBlank()) {
                appendTranscript(VoiceSender.System, errorMessage)
            } else {
                val payload = buildToolPayload(toolName, result)
                if (payload != null) {
                    queueToolPayload(payload)
                } else {
                    appendTranscript(VoiceSender.System, "Tool completed: $toolName")
                }
            }
        }
    }

    private fun respondOffline(
        text: String,
        attachmentsOnly: Boolean = false,
        attachmentContinuation: Boolean = false
    ) {
        if (text.isBlank()) return
        _state.update { it.copy(assistantState = "thinking") }
        scope.launch {
            if (attachmentsOnly && pendingMediaAttachments.isNotEmpty()) {
                val opener = if (attachmentContinuation) {
                    buildPhotoContinuation(pendingMediaAttachments.size)
                } else {
                    buildPhotoOpener(pendingMediaAttachments.size)
                }
                maybeDelayForDementia()
                lastAssistantText = opener
                appendTranscript(VoiceSender.Emma, opener)
                speakLocal(opener)
                _state.update { it.copy(assistantState = "ready") }
                return@launch
            }
            val snapshot = VaultSnapshotBuilder.build(vaultRepository)
            val unified = runCatching { unifiedIntelligence.analyzeAndRespond(text, snapshot) }
                .getOrNull()
            if (unified != null) {
                maybeDelayForDementia()
                lastAssistantText = unified.text
                appendTranscript(VoiceSender.Emma, unified.text, unified.payload)
                if (unified.shouldSpeak) {
                    speakLocal(unified.text)
                }
                val proactive = unifiedIntelligence.runProactiveIntelligence(snapshot)
                if (proactive != null) {
                    maybeDelayForDementia()
                    appendTranscript(VoiceSender.Emma, proactive.text, proactive.payload)
                    if (proactive.shouldSpeak) {
                        speakLocal(proactive.text)
                    }
                }
            } else {
                val response = offlineResponder.respondTo(text)
                maybeDelayForDementia()
                lastAssistantText = response.text
                appendTranscript(VoiceSender.Emma, response.text)
                if (response.shouldSpeak) {
                    speakLocal(response.text)
                }
            }
            _state.update { it.copy(assistantState = "ready") }
        }
    }

    private fun recordHistory(role: String, text: String) {
        if (text.isBlank()) return
        val normalizedRole = role.lowercase()
        if (normalizedRole != "user" && normalizedRole != "assistant" && normalizedRole != "system") {
            return
        }
        synchronized(historyLock) {
            localHistory.addLast(OpenAiMessage(normalizedRole, text))
            while (localHistory.size > MAX_LOCAL_HISTORY) {
                localHistory.removeFirst()
            }
        }
    }

    private fun nextRequestId(): Int {
        requestCounter += 1
        return requestCounter
    }

    private fun normalizeText(text: String): String {
        return text.trim().lowercase().replace("\\s+".toRegex(), " ")
    }

    private fun isFallbackMessage(text: String): Boolean {
        return normalizedFallbacks.contains(normalizeText(text))
    }

    private fun isGreetingMessage(text: String): Boolean {
        return normalizeText(text) == normalizeText(GREETING_MESSAGE)
    }

    private suspend fun requestLocalAssistantReply(): LocalAssistantResult {
        val toolOutcomes = mutableListOf<ToolOutcome>()
        val apiKey = currentApiKey
            ?: aiPreferences.state.first().openAiApiKey?.trim()?.takeIf { it.isNotBlank() }
        if (apiKey.isNullOrBlank()) return LocalAssistantResult(null, toolOutcomes)
        currentApiKey = apiKey

        val payload = JSONObject().apply {
            put("model", OPENAI_MODEL)
            put("input", buildOpenAiInput())
            put("tools", toolDefinitions)
            put("parallel_tool_calls", false)
            put("metadata", JSONObject().apply { put("session_id", openAiSessionId) })
        }

        val initialResponse = runCatching { openAiClient.post(apiKey, "/v1/responses", payload) }
            .onFailure { error ->
                Log.e(TAG, "local OpenAI initial request failed: ${error.message}", error)
            }
            .getOrNull() ?: return LocalAssistantResult(null, toolOutcomes)
        var response = initialResponse
        logLocalResponseSummary(response, "initial")
        var iterations = 0
        while (iterations < 6) {
            val responseId = response.optString("id", "")
            if (responseId.isBlank()) break
            val toolCalls = extractToolCalls(response)
            if (toolCalls.length() == 0) {
                Log.d(TAG, "local OpenAI no tool calls detected")
                break
            }
            Log.d(TAG, "local OpenAI toolCalls=${toolCalls.length()}")
            val requiresSubmit = response.optJSONObject("required_action")
                ?.optString("type") == "submit_tool_outputs"
            val outputs = JSONArray()
            for (i in 0 until toolCalls.length()) {
                val call = toolCalls.optJSONObject(i) ?: continue
                val callId = call.optString("id", "").trim()
                val function = call.optJSONObject("function") ?: JSONObject()
                val toolName = function.optString("name", "").trim()
                if (callId.isBlank() || toolName.isBlank()) continue
                val args = parseToolArguments(function)
                Log.d(TAG, "local tool call: $toolName")
                val usedAttachments = maybeInjectAttachments(toolName, args)
                val result = runCatching { toolExecutor.execute(toolName, args) }
                    .getOrElse { error ->
                        JSONObject().apply { put("error", error.message ?: "Tool execution failed") }
                    }
                val errorMessage = result.optString("error", "").trim()
                if (usedAttachments && errorMessage.isBlank()) {
                    clearPendingAttachments()
                }
                toolOutcomes.add(ToolOutcome(toolName, result))
                outputs.put(
                    JSONObject().apply {
                        put("tool_call_id", callId)
                        put("output", result.toString())
                    }
                )
            }
            if (outputs.length() == 0) break
            if (!requiresSubmit) {
                Log.d(TAG, "local OpenAI follow-up for output tool calls")
                response = requestFollowUpWithToolResults(apiKey, toolOutcomes)
                logLocalResponseSummary(response, "follow_up")
                break
            }
            val submitResponse = runCatching {
                openAiClient.post(
                    apiKey,
                    "/v1/responses/$responseId/submit_tool_outputs",
                    JSONObject().apply { put("tool_outputs", outputs) }
                )
            }.onFailure { error ->
                Log.e(TAG, "local OpenAI submit_tool_outputs failed: ${error.message}", error)
            }.getOrNull()
            if (submitResponse == null) {
                response = requestFollowUpWithToolResults(apiKey, toolOutcomes)
                logLocalResponseSummary(response, "follow_up")
                break
            }
            response = submitResponse
            logLocalResponseSummary(response, "tool_outputs")
            iterations += 1
        }

        val text = extractResponseText(response)
        return LocalAssistantResult(text.takeIf { it.isNotBlank() }, toolOutcomes)
    }

    private fun extractToolCalls(response: JSONObject): JSONArray {
        val calls = JSONArray()
        val requiredAction = response.optJSONObject("required_action")
        if (requiredAction?.optString("type") == "submit_tool_outputs") {
            val toolCalls = requiredAction.optJSONObject("submit_tool_outputs")
                ?.optJSONArray("tool_calls")
            if (toolCalls != null) {
                for (i in 0 until toolCalls.length()) {
                    val call = toolCalls.optJSONObject(i) ?: continue
                    calls.put(call)
                }
                return calls
            }
        }
        val output = response.optJSONArray("output") ?: return calls
        for (i in 0 until output.length()) {
            val item = output.optJSONObject(i) ?: continue
            val normalized = normalizeToolCall(item)
            if (normalized != null) {
                calls.put(normalized)
            }
        }
        return calls
    }

    private fun buildOpenAiInput(): JSONArray {
        val input = JSONArray()
        input.put(buildOpenAiMessage("system", buildSystemPrompt()))
        val historySnapshot = synchronized(historyLock) { localHistory.toList() }
        historySnapshot.forEach { entry ->
            input.put(buildOpenAiMessage(entry.role, entry.content))
        }
        return input
    }

    private fun buildSystemPrompt(): String {
        val snapshot = VaultSnapshotBuilder.build(vaultRepository)
        val peopleNames = snapshot.people.mapNotNull { person ->
            person.name.trim().takeIf { it.isNotBlank() }
        }.take(12)
        val vaultSummary = buildString {
            append("Vault context: ")
            append(snapshot.memories.size)
            append(" memories, ")
            append(snapshot.people.size)
            append(" people")
            if (peopleNames.isNotEmpty()) {
                append(" (")
                append(peopleNames.joinToString(", "))
                append(")")
            }
            append(".")
        }
        val dementiaNote = if (settingsState.dementiaMode) {
            "Dementia care mode is enabled: validate feelings and avoid corrections."
        } else {
            ""
        }
        return listOf(baseSystemPrompt, vaultSummary, dementiaNote)
            .filter { it.isNotBlank() }
            .joinToString(" ")
    }

    private fun buildOpenAiMessage(role: String, text: String): JSONObject {
        val contentType = if (role == "assistant") "output_text" else "input_text"
        return JSONObject().apply {
            put("role", role)
            put(
                "content",
                JSONArray().apply {
                    put(
                        JSONObject().apply {
                            put("type", contentType)
                            put("text", text)
                        }
                    )
                }
            )
        }
    }

    private fun extractResponseText(response: JSONObject): String {
        val outputText = response.optString("output_text", "").trim()
        if (outputText.isNotBlank()) return outputText
        val output = response.optJSONArray("output") ?: return ""
        val parts = mutableListOf<String>()
        for (i in 0 until output.length()) {
            val item = output.optJSONObject(i) ?: continue
            if (item.optString("type") != "message") continue
            val content = item.optJSONArray("content") ?: continue
            for (j in 0 until content.length()) {
                val chunk = content.optJSONObject(j) ?: continue
                val type = chunk.optString("type")
                if (type == "text" || type == "output_text") {
                    val text = chunk.optString("text", "").trim()
                    if (text.isNotBlank()) {
                        parts.add(text)
                    }
                }
            }
        }
        return parts.joinToString(" ").trim()
    }

    private fun buildToolSummary(toolResults: List<ToolOutcome>): String? {
        if (toolResults.isEmpty()) return null
        val errorMessage = toolResults.firstNotNullOfOrNull { outcome ->
            outcome.result.optString("error", "").trim().takeIf { it.isNotBlank() }
        }
        if (!errorMessage.isNullOrBlank()) {
            return errorMessage
        }
        val memoryTool = toolResults.firstOrNull { outcome ->
            outcome.name == "create_memory_capsule" || outcome.name == "create_memory_from_voice"
        }
        if (memoryTool != null && memoryTool.result.optBoolean("success", false)) {
            val title = memoryTool.result.optString("title", "").trim().ifBlank { "New memory" }
            return "Saved memory: \"$title\"."
        }
        val personTool = toolResults.firstOrNull { outcome ->
            outcome.name == "create_person_profile" || outcome.name == "update_person"
        }
        if (personTool != null && personTool.result.optBoolean("success", false)) {
            val name = personTool.result.optString("personName", "").trim().ifBlank { "that person" }
            return when (personTool.name) {
                "create_person_profile" -> "Added $name to your people."
                else -> "Updated $name."
            }
        }
        val updateMemory = toolResults.firstOrNull { outcome ->
            outcome.name == "update_memory_capsule"
        }
        if (updateMemory != null && updateMemory.result.optBoolean("success", false)) {
            return "Updated your memory."
        }
        val attachMedia = toolResults.firstOrNull { outcome ->
            outcome.name == "attach_memory_media"
        }
        if (attachMedia != null && attachMedia.result.optBoolean("success", false)) {
            return "Added media to your memory."
        }
        return null
    }

    private fun buildToolPayloadFromOutcomes(toolResults: List<ToolOutcome>): VoicePayload? {
        val payloads = toolResults.mapNotNull { outcome ->
            buildToolPayload(outcome.name, outcome.result)
        }
        return mergeToolPayloads(payloads)
    }

    private fun buildToolPayload(toolName: String, result: JSONObject): VoicePayload? {
        val snapshot = VaultSnapshotBuilder.build(vaultRepository)
        return when (toolName) {
            "get_memories" -> {
                val ids = extractMemoryIds(result.optJSONArray("memories"))
                val memories = if (ids.isNotEmpty()) {
                    snapshot.memories.filter { ids.contains(it.id) }
                } else {
                    parseMemoryResults(result.optJSONArray("memories"))
                }
                memories.takeIf { it.isNotEmpty() }?.let { VoicePayload(memoryResults = it) }
            }
            "summarize_memory" -> {
                val memoryId = result.optString("memoryId", "").trim()
                val memory = snapshot.memories.firstOrNull { it.id == memoryId }
                memory?.let { VoicePayload(memoryCards = listOf(it)) }
            }
            "create_memory_from_voice",
            "create_memory_capsule",
            "update_memory_capsule",
            "attach_memory_media" -> {
                val memoryId = result.optString("memoryId", "").trim()
                val memory = snapshot.memories.firstOrNull { it.id == memoryId }
                memory?.let { VoicePayload(memoryCards = listOf(it)) }
            }
            "get_people" -> {
                val people = parsePeopleResults(result.optJSONArray("people"), snapshot.people)
                people.takeIf { it.isNotEmpty() }?.let { VoicePayload(peopleResults = it) }
            }
            "create_person_profile",
            "update_person" -> {
                val personId = result.optString("personId", "").trim()
                val personName = result.optString("personName", "").trim()
                val person = snapshot.people.firstOrNull { it.id == personId }
                    ?: snapshot.people.firstOrNull { it.name.equals(personName, ignoreCase = true) }
                    ?: personName.takeIf { it.isNotBlank() }?.let {
                        com.yourorg.emma.nativeapp.vault.PersonRecord(
                            id = personId.ifBlank { "person-${System.currentTimeMillis()}" },
                            name = it,
                            relation = "other",
                            created = Instant.now().toString(),
                            updated = Instant.now().toString()
                        )
                    }
                person?.let { VoicePayload(peopleResults = listOf(it)) }
            }
            else -> null
        }
    }

    private fun parsePeopleResults(
        array: JSONArray?,
        people: List<com.yourorg.emma.nativeapp.vault.PersonRecord>
    ): List<com.yourorg.emma.nativeapp.vault.PersonRecord> {
        if (array == null) return emptyList()
        val byId = people.associateBy { it.id }
        val byName = people.associateBy { it.name.trim().lowercase() }
        val results = mutableListOf<com.yourorg.emma.nativeapp.vault.PersonRecord>()
        for (i in 0 until array.length()) {
            val item = array.optJSONObject(i) ?: continue
            val id = item.optString("id", "").trim()
            val name = item.optString("name", "").trim()
            val resolved = byId[id] ?: byName[name.lowercase()]
            if (resolved != null) {
                results.add(resolved)
            } else if (name.isNotBlank()) {
                results.add(
                    com.yourorg.emma.nativeapp.vault.PersonRecord(
                        id = id.ifBlank { "person-${System.currentTimeMillis()}" },
                        name = name,
                        relation = item.optString("relationship", "other"),
                        created = Instant.now().toString(),
                        updated = Instant.now().toString()
                    )
                )
            }
        }
        return results
    }

    private fun extractMemoryIds(array: JSONArray?): Set<String> {
        if (array == null) return emptySet()
        val ids = mutableSetOf<String>()
        for (i in 0 until array.length()) {
            val item = array.optJSONObject(i) ?: continue
            val id = item.optString("id", "").trim()
            if (id.isNotBlank()) ids.add(id)
        }
        return ids
    }

    private fun parseMemoryResults(array: JSONArray?): List<com.yourorg.emma.nativeapp.vault.MemoryRecord> {
        if (array == null) return emptyList()
        val results = mutableListOf<com.yourorg.emma.nativeapp.vault.MemoryRecord>()
        for (i in 0 until array.length()) {
            val item = array.optJSONObject(i) ?: continue
            val id = item.optString("id", "").trim().ifBlank { "memory-${System.currentTimeMillis()}" }
            val title = item.optString("title", "").trim()
            val content = item.optString("content", "").trim()
            val created = item.optString("createdAt", "").trim().ifBlank { Instant.now().toString() }
            results.add(
                com.yourorg.emma.nativeapp.vault.MemoryRecord(
                    id = id,
                    title = title,
                    body = content,
                    content = content,
                    created = created
                )
            )
        }
        return results
    }

    private fun queueToolPayload(payload: VoicePayload?) {
        if (payload == null) return
        synchronized(pendingToolPayloads) {
            pendingToolPayloads.addLast(payload)
        }
    }

    private fun consumePendingToolPayload(): VoicePayload? {
        synchronized(pendingToolPayloads) {
            if (pendingToolPayloads.isEmpty()) return null
            val payloads = pendingToolPayloads.toList()
            pendingToolPayloads.clear()
            return mergeToolPayloads(payloads)
        }
    }

    private fun mergeToolPayloads(payloads: List<VoicePayload>): VoicePayload? {
        if (payloads.isEmpty()) return null
        val suggestions = payloads.flatMap { it.suggestions }.distinct()
        val memoryResults = payloads.flatMap { it.memoryResults }
        val memoryCards = payloads.flatMap { it.memoryCards }
        val peopleResults = payloads.flatMap { it.peopleResults }
        val personMemories = payloads.flatMap { it.personMemories }
        val clarificationOptions = payloads.flatMap { it.clarificationOptions }.distinct()
        var memoryDraft: MemoryDraft? = null
        var proactiveType: String? = null
        for (index in payloads.indices.reversed()) {
            val payload = payloads[index]
            if (memoryDraft == null && payload.memoryDraft != null) {
                memoryDraft = payload.memoryDraft
            }
            if (proactiveType == null && payload.proactiveType != null) {
                proactiveType = payload.proactiveType
            }
            if (memoryDraft != null && proactiveType != null) {
                break
            }
        }
        return VoicePayload(
            suggestions = suggestions,
            memoryResults = memoryResults,
            memoryCards = memoryCards,
            peopleResults = peopleResults,
            personMemories = personMemories,
            memoryDraft = memoryDraft,
            clarificationOptions = clarificationOptions,
            proactiveType = proactiveType
        )
    }

    private suspend fun requestFollowUpWithToolResults(
        apiKey: String,
        toolResults: List<ToolOutcome>
    ): JSONObject {
        val toolContext = buildToolResultContext(toolResults)
        val input = buildOpenAiInput().apply {
            put(
                buildOpenAiMessage(
                    "system",
                    "Tool results (JSON): $toolContext. Use these results to respond. Do not call tools again."
                )
            )
        }
        val payload = JSONObject().apply {
            put("model", OPENAI_MODEL)
            put("input", input)
            put("metadata", JSONObject().apply { put("session_id", openAiSessionId) })
        }
        return openAiClient.post(apiKey, "/v1/responses", payload)
    }

    private fun buildToolResultContext(toolResults: List<ToolOutcome>): String {
        val payload = JSONArray()
        toolResults.forEach { outcome ->
            payload.put(
                JSONObject().apply {
                    put("tool", outcome.name)
                    put("result", outcome.result)
                }
            )
        }
        return payload.toString()
    }

    private fun logLocalResponseSummary(response: JSONObject, stage: String) {
        val responseId = response.optString("id", "")
        val requiredType = response.optJSONObject("required_action")?.optString("type", "").orEmpty()
        val output = response.optJSONArray("output")
        val outputTypes = mutableListOf<String>()
        if (output != null) {
            for (i in 0 until output.length()) {
                val item = output.optJSONObject(i) ?: continue
                val type = item.optString("type", "").trim()
                if (type.isNotBlank()) {
                    outputTypes.add(type)
                }
            }
        }
        val outputTextLen = response.optString("output_text", "").trim().length
        Log.d(
            TAG,
            "local OpenAI $stage id=$responseId required=$requiredType outputTypes=$outputTypes outputTextLen=$outputTextLen"
        )
    }

    private fun safeParseArguments(argString: String): JSONObject {
        if (argString.isBlank()) return JSONObject()
        return runCatching { JSONObject(argString) }.getOrElse { JSONObject() }
    }

    private fun parseToolArguments(function: JSONObject): JSONObject {
        val raw = function.opt("arguments") ?: return JSONObject()
        return when (raw) {
            is JSONObject -> raw
            is String -> safeParseArguments(raw)
            else -> JSONObject()
        }
    }

    private fun normalizeToolCall(item: JSONObject): JSONObject? {
        val type = item.optString("type", "").trim()
        if (type != "tool_call" && type != "function_call") return null
        val callId = item.optString("id", "").trim()
            .ifBlank { item.optString("call_id", "").trim() }
        if (callId.isBlank()) {
            Log.w(TAG, "tool call missing id type=$type")
            return null
        }
        val function = item.optJSONObject("function") ?: JSONObject().apply {
            val name = item.optString("name", "").trim()
            if (name.isNotBlank()) {
                put("name", name)
            }
            if (item.has("arguments")) {
                put("arguments", item.opt("arguments"))
            }
        }
        if (function.optString("name", "").isBlank()) {
            Log.w(TAG, "tool call missing name id=$callId type=$type")
            return null
        }
        return JSONObject().apply {
            put("id", callId)
            put("function", function)
        }
    }

    private fun appendTranscript(
        sender: VoiceSender,
        text: String,
        payload: VoicePayload? = null,
        attachments: List<MemoryAttachmentInput> = emptyList()
    ) {
        if (text.isBlank() && attachments.isEmpty()) return
        _state.update { current ->
            val updated = (current.transcript + VoiceTranscript(
                sender = sender,
                text = text,
                payload = payload,
                attachments = attachments
            ))
                .takeLast(100)
            current.copy(transcript = updated)
        }
    }

    private fun buildWebSocketUrl(): String {
        val sanitizedBase = baseUrl.trimEnd('/')
        val scheme = when {
            sanitizedBase.startsWith("https://") -> "wss://"
            sanitizedBase.startsWith("http://") -> "ws://"
            else -> "wss://"
        }
        val host = sanitizedBase.removePrefix("https://").removePrefix("http://")
        val normalizedPath = if (wsPath.startsWith("/")) wsPath else "/$wsPath"
        return "$scheme$host$normalizedPath"
    }

    private fun updateError(message: String) {
        _state.update { it.copy(lastError = message) }
    }

    private data class OpenAiMessage(
        val role: String,
        val content: String
    )

    private data class ToolOutcome(
        val name: String,
        val result: JSONObject
    )

    private data class LocalAssistantResult(
        val text: String?,
        val toolResults: List<ToolOutcome>
    )
}
