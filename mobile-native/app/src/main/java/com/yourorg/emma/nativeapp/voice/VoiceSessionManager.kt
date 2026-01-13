package com.yourorg.emma.nativeapp.voice

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.speech.SpeechRecognizer
import android.util.Log
import com.yourorg.emma.nativeapp.BuildConfig
import com.yourorg.emma.nativeapp.network.OpenAiResponsesClient
import com.yourorg.emma.nativeapp.network.EmmaApiClient
import com.yourorg.emma.nativeapp.settings.AiPreferences
import com.yourorg.emma.nativeapp.settings.SettingsPreferences
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
    private val openAiClient = OpenAiResponsesClient()
    private val openAiSessionId = UUID.randomUUID().toString()
    private val toolDefinitions = OpenAiToolDefinitions.definitions
    private val localHistory = ArrayDeque<OpenAiMessage>()
    private val historyLock = Any()
    private val normalizedFallbacks = FALLBACK_MESSAGES.map { normalizeText(it) }.toSet()
    private val systemPrompt = listOf(
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
    private var apiEnabled = false
    private var hasApiKey = false
    private var currentApiKey: String? = null
    private var aiPreferencesJob: kotlinx.coroutines.Job? = null
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
        observeAiPreferences()
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
    }

    fun sendUserText(text: String) {
        if (text.isBlank()) return
        if (!state.value.isConnected) {
            if (state.value.isOffline) {
                Log.d(TAG, "sendUserText offline fallback")
                appendTranscript(VoiceSender.User, text)
                respondOffline(text)
                return
            }
            Log.w(TAG, "sendUserText blocked: not connected")
            updateError("Connect to Emma before sending a message")
            return
        }
        appendTranscript(VoiceSender.User, text)
        recordHistory("user", text)
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
            Log.d(TAG, "sending user_text")
            sendJson(
                JSONObject().apply {
                    put("type", "user_text")
                    put("text", text)
                }
            )
        }
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
                    lastAssistantText = text
                    appendTranscript(VoiceSender.Emma, text)
                    if (!isGreetingMessage(text)) {
                        recordHistory("assistant", text)
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
        if (!apiEnabled || !hasApiKey) {
            appendTranscript(VoiceSender.System, "Online response unavailable. Check your API settings.")
            return
        }
        if (localFallbackInFlight) return
        localFallbackInFlight = true
        _state.update { it.copy(assistantState = "thinking") }
        scope.launch {
            val response = runCatching { requestLocalAssistantReply() }
                .onFailure { error ->
                    Log.e(TAG, "local OpenAI fallback failed: ${error.message}", error)
                }
                .getOrNull()
            val text = response?.text?.trim().orEmpty()
            val toolSummary = response?.toolResults?.let { buildToolSummary(it) }.orEmpty()
            if (text.isNotBlank()) {
                lastAssistantText = text
                appendTranscript(VoiceSender.Emma, text)
                recordHistory("assistant", text)
            } else if (toolSummary.isNotBlank()) {
                appendTranscript(VoiceSender.System, toolSummary)
            } else {
                appendTranscript(VoiceSender.System, "Online response failed. Please try again.")
            }
            _state.update { it.copy(assistantState = "ready") }
            localFallbackInFlight = false
        }
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
            val result = runCatching { toolExecutor.execute(toolName, params) }
                .getOrElse { error ->
                    JSONObject().apply { put("error", error.message ?: "Tool execution failed") }
                }
            sendJson(
                JSONObject().apply {
                    put("type", "tool_result")
                    put("call_id", callId)
                    put("result", result)
                }
            )
            val errorMessage = result.optString("error", "").trim()
            if (errorMessage.isNotBlank()) {
                appendTranscript(VoiceSender.System, errorMessage)
            } else {
                appendTranscript(VoiceSender.System, "Tool completed: $toolName")
            }
        }
    }

    private fun respondOffline(text: String) {
        if (text.isBlank()) return
        _state.update { it.copy(assistantState = "thinking") }
        scope.launch {
            val response = offlineResponder.respondTo(text)
            lastAssistantText = response.text
            appendTranscript(VoiceSender.Emma, response.text)
            if (response.shouldSpeak) {
                speakLocal(response.text)
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
                val result = runCatching { toolExecutor.execute(toolName, args) }
                    .getOrElse { error ->
                        JSONObject().apply { put("error", error.message ?: "Tool execution failed") }
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
        input.put(buildOpenAiMessage("system", systemPrompt))
        val historySnapshot = synchronized(historyLock) { localHistory.toList() }
        historySnapshot.forEach { entry ->
            input.put(buildOpenAiMessage(entry.role, entry.content))
        }
        return input
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

    private fun appendTranscript(sender: VoiceSender, text: String) {
        if (text.isBlank()) return
        _state.update { current ->
            val updated = (current.transcript + VoiceTranscript(sender = sender, text = text))
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
