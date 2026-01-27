@file:OptIn(ExperimentalLayoutApi::class)

package com.yourorg.emma.nativeapp.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.provider.OpenableColumns
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.changedToUp
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.StopCircle
import androidx.compose.material.icons.filled.VolumeOff
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.yourorg.emma.nativeapp.ui.orb.EmorbSurfaceInline
import com.yourorg.emma.nativeapp.ui.theme.LocalEmmaPalette
import com.yourorg.emma.nativeapp.ui.util.decodeMediaMap
import com.yourorg.emma.nativeapp.ui.util.decodeMediaThumbnail
import com.yourorg.emma.nativeapp.ui.util.toImageBitmap
import com.yourorg.emma.nativeapp.vault.VaultState
import com.yourorg.emma.nativeapp.vault.VaultStatus
import com.yourorg.emma.nativeapp.vault.MediaRecord
import com.yourorg.emma.nativeapp.vault.MemoryRecord
import com.yourorg.emma.nativeapp.vault.MemoryAttachmentInput
import com.yourorg.emma.nativeapp.vault.PersonRecord
import com.yourorg.emma.nativeapp.voice.MemoryDraft
import com.yourorg.emma.nativeapp.voice.VaultSnapshotBuilder
import com.yourorg.emma.nativeapp.voice.VoiceSender
import com.yourorg.emma.nativeapp.voice.VoiceSessionState
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private data class ChatTokens(
    val containerBrush: Brush,
    val containerBorder: Color,
    val containerBorderActive: Color,
    val surface: Color,
    val surfaceStrong: Color,
    val border: Color,
    val textStrong: Color,
    val textMuted: Color,
    val userBubble: Brush,
    val userText: Color,
    val userMeta: Color,
    val emmaBubble: Color,
    val emmaText: Color,
    val emmaMeta: Color,
    val inputBackground: Color,
    val inputBorder: Color,
    val success: Color,
    val error: Color
)

private data class QuickPrompt(
    val text: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector
)

private data class PendingChatMessage(
    val text: String,
    val attachments: List<MemoryAttachmentInput>
)

data class PersonCardUi(
    val id: String,
    val name: String,
    val relationship: String,
    val avatar: ImageBitmap? = null
)

data class MemoryCardUi(
    val id: String,
    val dateLabel: String,
    val preview: String,
    val media: List<ImageBitmap> = emptyList(),
    val navigationQuery: String
)

data class MemoryCapsuleUi(
    val title: String,
    val story: String,
    val details: List<Pair<String, String>>,
    val media: List<ImageBitmap> = emptyList()
)

data class MemoryResultUi(
    val id: String,
    val title: String,
    val snippet: String,
    val peopleLabel: String,
    val mediaPreview: ImageBitmap? = null,
    val navigationQuery: String
)
@Composable
fun ChatScreen(
    vaultState: VaultState,
    voiceState: VoiceSessionState,
    onConnect: () -> Unit,
    onDisconnect: () -> Unit,
    onSend: (String, List<MemoryAttachmentInput>) -> Unit,
    onOpenMemory: (String) -> Unit,
    onOpenPerson: (String) -> Unit,
    onAddPerson: () -> Unit,
    onToggleRecording: () -> Unit,
    onMicPermissionResult: (Boolean) -> Unit,
    onSetVoicePlayback: (Boolean) -> Unit,
    onClose: () -> Unit
) {
    val context = LocalContext.current
    val palette = LocalEmmaPalette.current
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current
    val tokens = rememberChatTokens()
    val configuration = LocalConfiguration.current
    val isCompact = configuration.screenWidthDp < 360

    var input by remember { mutableStateOf("") }
    var pendingVoiceAction by remember { mutableStateOf(false) }
    var pendingSendMessage by remember { mutableStateOf<PendingChatMessage?>(null) }
    var pendingAttachments by remember { mutableStateOf<List<MemoryAttachmentInput>>(emptyList()) }
    val voicePlaybackEnabled = voiceState.voicePlaybackEnabled
    var inputBounds by remember { mutableStateOf<Rect?>(null) }
    val listState = rememberLazyListState()
    val vaultSnapshot = remember(vaultState.payload) {
        VaultSnapshotBuilder.buildFromPayload(vaultState.payload)
    }
    val mediaRecords = remember(vaultState.payload?.content?.media) {
        vaultState.payload?.content?.media.orEmpty().decodeMediaMap()
    }
    val peopleLookup = remember(vaultSnapshot.people) {
        vaultSnapshot.people.associateBy { it.id }.mapValues { it.value.name }
    }
    val messages = voiceState.transcript.filterNot { transcript ->
        transcript.sender == VoiceSender.System && isEphemeralSystemMessage(transcript.text)
    }
    val showQuickPrompts = messages.isEmpty()
    val showTyping = voiceState.assistantState.equals("thinking", ignoreCase = true)
    val connectionLabel = when {
        !voiceState.apiEnabled -> "API Off"
        voiceState.isConnecting -> "Connecting"
        voiceState.isOffline -> "Offline"
        voiceState.isConnected -> "Online"
        else -> "Idle"
    }
    val connectionTone = when {
        !voiceState.apiEnabled -> tokens.textMuted
        voiceState.isOffline -> tokens.error
        voiceState.isConnecting -> tokens.textMuted
        voiceState.isConnected -> tokens.success
        else -> tokens.textMuted
    }
    val voiceLabel = when {
        !voiceState.hasMicPermission -> "Mic Needed"
        !voiceState.canUseOfflineStt -> "Voice Unavailable"
        else -> "Voice Ready"
    }
    val voiceTone = when {
        !voiceState.hasMicPermission || !voiceState.canUseOfflineStt -> tokens.error
        else -> tokens.success
    }

    LaunchedEffect(Unit) {
        val granted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
        onMicPermissionResult(granted)
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        onMicPermissionResult(granted)
        if (granted) {
            if (pendingVoiceAction) {
                pendingVoiceAction = false
                if (voiceState.isOffline) {
                    onToggleRecording()
                } else if (!voiceState.isConnected && !voiceState.isConnecting) {
                    onConnect()
                } else if (voiceState.isConnected) {
                    onToggleRecording()
                }
            }
        } else {
            pendingVoiceAction = false
            Toast.makeText(context, "Microphone permission is required to record", Toast.LENGTH_SHORT).show()
        }
    }

    val photoPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.PickMultipleVisualMedia()
    ) { uris ->
        if (uris.isNullOrEmpty()) return@rememberLauncherForActivityResult
        val loaded = uris.mapNotNull { uri ->
            val type = context.contentResolver.getType(uri) ?: "image/*"
            val name = context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
                ?.use { cursor ->
                    val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (idx >= 0 && cursor.moveToFirst()) cursor.getString(idx) else null
                }
                ?.takeIf { it.isNotBlank() }
                ?: "photo_${System.currentTimeMillis()}.jpg"
            val bytes = context.contentResolver.openInputStream(uri)?.use { stream -> stream.readBytes() }
            if (bytes != null) {
                MemoryAttachmentInput(name = name, mime = type, bytes = bytes)
            } else {
                Toast.makeText(context, "Unable to load selected photo", Toast.LENGTH_SHORT).show()
                null
            }
        }
        if (loaded.isNotEmpty()) {
            pendingAttachments = pendingAttachments + loaded
        }
    }

    val totalItems = messages.size +
        (if (showQuickPrompts) 1 else 0) +
        (if (showTyping) 1 else 0)
    LaunchedEffect(totalItems) {
        if (totalItems > 0) {
            listState.animateScrollToItem(totalItems - 1)
        }
    }
    LaunchedEffect(voiceState.isConnected, pendingSendMessage) {
        val queued = pendingSendMessage
        if (voiceState.isConnected && queued != null) {
            pendingSendMessage = null
            onSend(queued.text, queued.attachments)
            focusManager.clearFocus()
            keyboardController?.hide()
        }
    }

    fun sendMessage(text: String, clearInput: Boolean = true) {
        val trimmed = text.trim()
        val attachments = pendingAttachments
        if (trimmed.isEmpty() && attachments.isEmpty()) return
        if (voiceState.isOffline) {
            onSend(trimmed, attachments)
        } else if (voiceState.isConnected) {
            onSend(trimmed, attachments)
        } else {
            pendingSendMessage = PendingChatMessage(trimmed, attachments)
            if (!voiceState.isConnecting) {
                onConnect()
            }
        }
        if (clearInput) {
            input = ""
        }
        if (attachments.isNotEmpty()) {
            pendingAttachments = emptyList()
        }
        focusManager.clearFocus()
        keyboardController?.hide()
    }

    fun handleSuggestion(suggestion: String) {
        val trimmed = suggestion.trim()
        if (trimmed.isEmpty()) return
        if (isAddPersonSuggestion(trimmed)) {
            onAddPerson()
            return
        }
        sendMessage(trimmed, clearInput = false)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(palette.background)
            .pointerInput(inputBounds) {
                awaitPointerEventScope {
                    while (true) {
                        val event = awaitPointerEvent(PointerEventPass.Final)
                        val change = event.changes.firstOrNull() ?: continue
                        if (change.changedToUp()) {
                            val bounds = inputBounds
                            if (bounds == null || !bounds.contains(change.position)) {
                                focusManager.clearFocus()
                                keyboardController?.hide()
                            }
                        }
                    }
                }
            }
    ) {
        ChatContainer(
            tokens = tokens,
            voiceActive = voiceState.isRecording,
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding()
                .padding(horizontal = 12.dp, vertical = 20.dp)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                ChatHeader(
                    tokens = tokens,
                    voicePlaybackEnabled = voicePlaybackEnabled,
                    connectionLabel = connectionLabel,
                    connectionTone = connectionTone,
                    voiceLabel = voiceLabel,
                    voiceTone = voiceTone,
                    isCompact = isCompact,
                    onVoiceToggle = { onSetVoicePlayback(!voicePlaybackEnabled) },
                    onClose = onClose
                )
                Divider(color = tokens.border)
                ChatMessagesList(
                    tokens = tokens,
                    messages = messages,
                    listState = listState,
                    showQuickPrompts = showQuickPrompts,
                    showTyping = showTyping,
                    onPromptSelected = { prompt -> sendMessage(prompt, clearInput = false) },
                    onSuggestionSelected = { suggestion -> handleSuggestion(suggestion) },
                    onOpenMemory = onOpenMemory,
                    onOpenPerson = onOpenPerson,
                    mediaRecords = mediaRecords,
                    peopleLookup = peopleLookup,
                    modifier = Modifier.weight(1f)
                )
                ChatInputBar(
                    tokens = tokens,
                    input = input,
                    attachments = pendingAttachments,
                    enabled = vaultState.status == VaultStatus.Ready,
                    isConnecting = voiceState.isConnecting,
                    isRecording = voiceState.isRecording,
                    hasMicPermission = voiceState.hasMicPermission,
                    onInputChange = { input = it },
                    onSend = {
                        sendMessage(input)
                    },
                    onAddAttachment = {
                        photoPicker.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                        )
                    },
                    onRemoveAttachment = { index ->
                        pendingAttachments = pendingAttachments.filterIndexed { i, _ -> i != index }
                    },
                    onVoiceClick = {
                        if (vaultState.status != VaultStatus.Ready || voiceState.isConnecting) {
                            return@ChatInputBar
                        }
                        if (!voiceState.hasMicPermission) {
                            pendingVoiceAction = true
                            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                            return@ChatInputBar
                        }
                        if (voiceState.isOffline) {
                            if (!voiceState.canUseOfflineStt) {
                                Toast.makeText(
                                    context,
                                    "Offline speech isn't available. Use text instead.",
                                    Toast.LENGTH_SHORT
                                ).show()
                                return@ChatInputBar
                            }
                            onToggleRecording()
                            return@ChatInputBar
                        }
                        if (!voiceState.isConnected) {
                            onConnect()
                            return@ChatInputBar
                        }
                        onToggleRecording()
                    },
                    isCompact = isCompact,
                    onInputBounds = { inputBounds = it }
                )
            }
        }
    }
}

@Composable
private fun rememberChatTokens(): ChatTokens {
    val palette = LocalEmmaPalette.current
    val colors = MaterialTheme.colorScheme
    val isLight = colors.onSurface.luminance() < 0.5f
    val neutral = if (isLight) colors.onSurface else Color.White
    val containerBrush = Brush.linearGradient(
        listOf(
            palette.primary.copy(alpha = 0.15f),
            palette.secondary.copy(alpha = 0.1f)
        )
    )
    val surface = neutral.copy(alpha = if (isLight) 0.08f else 0.05f)
    val surfaceStrong = neutral.copy(alpha = if (isLight) 0.12f else 0.1f)
    val border = neutral.copy(alpha = if (isLight) 0.18f else 0.2f)
    val emmaBubble = palette.surface.copy(alpha = if (isLight) 0.95f else 0.88f)
    val userBubble = Brush.linearGradient(listOf(palette.primary, palette.secondary))
    val textStrong = colors.onSurface.copy(alpha = 0.92f)
    val textMuted = colors.onSurface.copy(alpha = 0.72f)
    val success = Color(0xFF10B981)
    val error = colors.error

    return ChatTokens(
        containerBrush = containerBrush,
        containerBorder = palette.primary.copy(alpha = 0.3f),
        containerBorderActive = success.copy(alpha = 0.3f),
        surface = surface,
        surfaceStrong = surfaceStrong,
        border = border,
        textStrong = textStrong,
        textMuted = textMuted,
        userBubble = userBubble,
        userText = colors.onSurface,
        userMeta = colors.onSurface.copy(alpha = 0.7f),
        emmaBubble = emmaBubble,
        emmaText = textStrong,
        emmaMeta = colors.onSurface.copy(alpha = 0.65f),
        inputBackground = if (isLight) Color(0xE6FFFFFF) else Color(0xD90A0A14),
        inputBorder = palette.primary.copy(alpha = 0.35f),
        success = success,
        error = error
    )
}
@Composable
private fun ChatContainer(
    tokens: ChatTokens,
    voiceActive: Boolean,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    val shape = RoundedCornerShape(16.dp)
    val borderColor = if (voiceActive) tokens.containerBorderActive else tokens.containerBorder
    Box(
        modifier = modifier
            .shadow(24.dp, shape, clip = false)
            .clip(shape)
            .background(tokens.containerBrush)
            .border(2.dp, borderColor, shape)
            .padding(bottom = 8.dp)
    ) {
        Column(modifier = Modifier.fillMaxSize(), content = content)
    }
}

@Composable
private fun ChatHeader(
    tokens: ChatTokens,
    voicePlaybackEnabled: Boolean,
    connectionLabel: String,
    connectionTone: Color,
    voiceLabel: String,
    voiceTone: Color,
    isCompact: Boolean,
    onVoiceToggle: () -> Unit,
    onClose: () -> Unit
) {
    val orbSize = if (isCompact) 40.dp else 46.dp
    val titleSize = if (isCompact) 20.sp else 22.sp
    val subtitleSize = if (isCompact) 12.sp else 13.sp

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            InlineOrbBadge(size = orbSize)
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Emma",
                    fontSize = titleSize,
                    fontWeight = FontWeight.SemiBold,
                    color = tokens.textStrong,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "Your memory companion",
                    fontSize = subtitleSize,
                    color = tokens.textMuted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            IconButton(
                onClick = onClose,
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(tokens.surfaceStrong)
            ) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Close chat",
                    tint = tokens.textMuted
                )
            }
        }
        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ConnectionStatusPill(
                label = connectionLabel,
                tone = connectionTone,
                isCompact = isCompact
            )
            ConnectionStatusPill(
                label = voiceLabel,
                tone = voiceTone,
                isCompact = isCompact
            )
            VoiceTogglePill(
                tokens = tokens,
                enabled = voicePlaybackEnabled,
                onToggle = onVoiceToggle
            )
        }
    }
}

@Composable
private fun ConnectionStatusPill(
    label: String,
    tone: Color,
    isCompact: Boolean
) {
    val fontSize = if (isCompact) 11.sp else 12.sp
    val horizontalPadding = if (isCompact) 8.dp else 10.dp
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(tone.copy(alpha = 0.12f))
            .border(1.dp, tone.copy(alpha = 0.35f), RoundedCornerShape(999.dp))
            .padding(horizontal = horizontalPadding, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Box(
            modifier = Modifier
                .size(6.dp)
                .clip(CircleShape)
                .background(tone)
        )
        Text(
            text = label,
            fontSize = fontSize,
            fontWeight = FontWeight.SemiBold,
            color = tone
        )
    }
}

@Composable
private fun VoiceTogglePill(
    tokens: ChatTokens,
    enabled: Boolean,
    onToggle: () -> Unit
) {
    val background = if (enabled) {
        tokens.containerBorder.copy(alpha = 0.18f)
    } else {
        tokens.surfaceStrong
    }
    val border = if (enabled) {
        tokens.containerBorder.copy(alpha = 0.4f)
    } else {
        tokens.border
    }
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(background)
            .border(1.dp, border, RoundedCornerShape(999.dp))
            .clickable(onClick = onToggle)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = if (enabled) Icons.Default.VolumeUp else Icons.Default.VolumeOff,
            contentDescription = if (enabled) "Voice on" else "Voice off",
            tint = tokens.textStrong,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = if (enabled) "Voice On" else "Voice Off",
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = tokens.textStrong
        )
    }
}

@Composable
private fun ChatMessagesList(
    tokens: ChatTokens,
    messages: List<com.yourorg.emma.nativeapp.voice.VoiceTranscript>,
    listState: androidx.compose.foundation.lazy.LazyListState,
    showQuickPrompts: Boolean,
    showTyping: Boolean,
    onPromptSelected: (String) -> Unit,
    onSuggestionSelected: (String) -> Unit,
    onOpenMemory: (String) -> Unit,
    onOpenPerson: (String) -> Unit,
    mediaRecords: Map<String, MediaRecord>,
    peopleLookup: Map<String, String>,
    modifier: Modifier = Modifier
) {
    val prompts = listOf(
        QuickPrompt("Let's save some photos", Icons.Default.PhotoCamera),
        QuickPrompt("Let's save a new memory", Icons.Default.FavoriteBorder),
        QuickPrompt("Ask me about your memories", Icons.Default.Search)
    )
    LazyColumn(
        modifier = modifier.fillMaxWidth(),
        state = listState,
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (showQuickPrompts) {
            item {
                EmmaMessageContainer(tokens = tokens) {
                    QuickPromptsCard(tokens = tokens, prompts = prompts, onPromptSelected = onPromptSelected)
                }
            }
        }
        itemsIndexed(messages) { _, message ->
            when (message.sender) {
                VoiceSender.User -> UserMessageBubble(tokens = tokens, message = message)
                VoiceSender.Emma -> EmmaMessageBubble(
                    tokens = tokens,
                    message = message,
                    onSuggestionSelected = onSuggestionSelected,
                    onOpenMemory = onOpenMemory,
                    onOpenPerson = onOpenPerson,
                    mediaRecords = mediaRecords,
                    peopleLookup = peopleLookup
                )
                VoiceSender.System -> SystemMessageBubble(tokens = tokens, message = message)
            }
        }
        if (showTyping) {
            item { TypingIndicator(tokens = tokens) }
        }
    }
}

@Composable
private fun UserMessageBubble(
    tokens: ChatTokens,
    message: com.yourorg.emma.nativeapp.voice.VoiceTranscript
) {
    val hasText = message.text.isNotBlank()
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.End
    ) {
        Column(
            modifier = Modifier.widthIn(max = 320.dp),
            horizontalAlignment = Alignment.End
        ) {
            Surface(
                shape = RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp, bottomEnd = 18.dp, bottomStart = 4.dp),
                color = Color.Transparent,
                shadowElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier
                        .background(tokens.userBubble)
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    if (message.attachments.isNotEmpty()) {
                        AttachmentMessageRow(tokens = tokens, attachments = message.attachments)
                        if (hasText) {
                            Spacer(modifier = Modifier.height(8.dp))
                        }
                    }
                    if (hasText) {
                        Text(
                            text = message.text,
                            color = tokens.userText,
                            fontSize = 15.sp,
                            lineHeight = 20.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                    } else if (message.attachments.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(4.dp))
                    }
                    Text(
                        text = formatTime(message.timestamp),
                        color = tokens.userMeta,
                        fontSize = 11.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun AttachmentMessageRow(
    tokens: ChatTokens,
    attachments: List<MemoryAttachmentInput>
) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        attachments.forEach { attachment ->
            AttachmentMessageTile(tokens = tokens, attachment = attachment)
        }
    }
}

@Composable
private fun AttachmentMessageTile(
    tokens: ChatTokens,
    attachment: MemoryAttachmentInput
) {
    val preview = remember(attachment.bytes) { attachment.bytes.toImageBitmap() }
    Box(
        modifier = Modifier
            .size(72.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(tokens.surfaceStrong)
            .border(1.dp, tokens.border, RoundedCornerShape(12.dp)),
        contentAlignment = Alignment.Center
    ) {
        if (preview != null) {
            Image(
                bitmap = preview,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
        } else {
            Icon(
                imageVector = Icons.Default.PhotoCamera,
                contentDescription = null,
                tint = tokens.textMuted,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

@Composable
private fun EmmaMessageBubble(
    tokens: ChatTokens,
    message: com.yourorg.emma.nativeapp.voice.VoiceTranscript,
    onSuggestionSelected: (String) -> Unit,
    onOpenMemory: (String) -> Unit,
    onOpenPerson: (String) -> Unit,
    mediaRecords: Map<String, MediaRecord>,
    peopleLookup: Map<String, String>
) {
    val payload = message.payload
    EmmaMessageContainer(tokens = tokens) {
        Text(
            text = message.text,
            color = tokens.emmaText,
            fontSize = 15.sp,
            lineHeight = 20.sp
        )
        if (payload != null) {
            if (payload.memoryDraft != null) {
                Spacer(modifier = Modifier.height(12.dp))
                MemoryCapsuleMessage(
                    capsule = buildDraftCapsule(payload.memoryDraft),
                    onSave = { onSuggestionSelected("Save it") },
                    onMaybeLater = { onSuggestionSelected("Maybe later") }
                )
            }
            if (payload.memoryCards.isNotEmpty()) {
                payload.memoryCards.forEach { memory ->
                    Spacer(modifier = Modifier.height(12.dp))
                    val card = buildMemoryCardUi(memory, mediaRecords)
                    MemoryCardMessage(
                        memory = card,
                        onView = { onOpenMemory(card.navigationQuery) }
                    )
                }
            }
            if (payload.peopleResults.isNotEmpty()) {
                payload.peopleResults.forEach { person ->
                    Spacer(modifier = Modifier.height(12.dp))
                    val card = buildPersonCardUi(person, mediaRecords)
                    PersonCardMessage(
                        person = card,
                        onView = { onOpenPerson(card.name) }
                    )
                }
            }
            val memoryResults = (payload.memoryResults + payload.personMemories)
                .distinctBy { it.id }
            if (memoryResults.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                MemoryResultsGrid(
                    results = memoryResults.map { memory ->
                        buildMemoryResultUi(memory, peopleLookup, mediaRecords)
                    },
                    onOpenMemory = onOpenMemory
                )
            }
            val suggestions = (payload.clarificationOptions + payload.suggestions).distinct()
            if (suggestions.isNotEmpty() && payload.memoryDraft == null) {
                Spacer(modifier = Modifier.height(12.dp))
                SuggestionChips(
                    tokens = tokens,
                    suggestions = suggestions,
                    onSuggestionSelected = onSuggestionSelected
                )
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = formatTime(message.timestamp),
            color = tokens.emmaMeta,
            fontSize = 11.sp
        )
    }
}

@Composable
private fun EmmaMessageContainer(
    tokens: ChatTokens,
    content: @Composable ColumnScope.() -> Unit
) {
    Row(
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        OrbAvatar(tokens = tokens)
        Surface(
            modifier = Modifier.weight(1f),
            shape = RoundedCornerShape(topStart = 4.dp, topEnd = 18.dp, bottomEnd = 18.dp, bottomStart = 18.dp),
            color = tokens.emmaBubble,
            shadowElevation = 8.dp,
            border = BorderStroke(1.dp, tokens.border)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                content = content
            )
        }
    }
}

@Composable
private fun OrbAvatar(tokens: ChatTokens) {
    InlineOrbBadge(size = 32.dp)
}

@Composable
private fun InlineOrbBadge(
    size: Dp,
    backgroundColor: Color? = null
) {
    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
    ) {
        EmorbSurfaceInline(
            modifier = Modifier.fillMaxSize(),
            backgroundColor = backgroundColor
        )
    }
}

@Composable
private fun SystemMessageBubble(
    tokens: ChatTokens,
    message: com.yourorg.emma.nativeapp.voice.VoiceTranscript
) {
    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = tokens.surface,
            border = BorderStroke(1.dp, tokens.border)
        ) {
            Text(
                text = message.text,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                color = tokens.textMuted,
                fontSize = 14.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun TypingIndicator(tokens: ChatTokens) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            TypingDot(tokens = tokens, delayMillis = 0)
            TypingDot(tokens = tokens, delayMillis = 150)
            TypingDot(tokens = tokens, delayMillis = 300)
        }
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = "Emma is thinking...",
            color = tokens.textMuted,
            fontSize = 13.sp
        )
    }
}

@Composable
private fun TypingDot(tokens: ChatTokens, delayMillis: Int) {
    val transition = rememberInfiniteTransition(label = "typing")
    val scale by transition.animateFloat(
        initialValue = 0.8f,
        targetValue = 1.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 900, delayMillis = delayMillis),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )
    val alpha by transition.animateFloat(
        initialValue = 0.5f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 900, delayMillis = delayMillis),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )

    Box(
        modifier = Modifier
            .size(8.dp)
            .alpha(alpha)
            .background(tokens.containerBorder, CircleShape)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
    )
}
@Composable
private fun ChatInputBar(
    tokens: ChatTokens,
    input: String,
    attachments: List<MemoryAttachmentInput>,
    enabled: Boolean,
    isConnecting: Boolean,
    isRecording: Boolean,
    hasMicPermission: Boolean,
    onInputChange: (String) -> Unit,
    onSend: () -> Unit,
    onAddAttachment: () -> Unit,
    onRemoveAttachment: (Int) -> Unit,
    onVoiceClick: () -> Unit,
    isCompact: Boolean,
    onInputBounds: (Rect) -> Unit
) {
    val buttonSize = if (isCompact) 40.dp else 46.dp
    val sendButtonWidth = if (isCompact) 48.dp else 56.dp
    val inputPadding = if (isCompact) 6.dp else 8.dp
    val inputHeight = buttonSize
    val inputFontSize = if (isCompact) 14.sp else 16.sp
    val inputLineHeight = if (isCompact) 20.sp else 22.sp
    val palette = LocalEmmaPalette.current
    val primaryGradient = Brush.linearGradient(listOf(palette.primary, palette.secondary))

    Column(modifier = Modifier.fillMaxWidth()) {
        Divider(color = tokens.inputBorder.copy(alpha = 0.25f))
        if (attachments.isNotEmpty()) {
            AttachmentPreviewRow(
                tokens = tokens,
                attachments = attachments,
                onRemoveAttachment = onRemoveAttachment
            )
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(24.dp))
                    .background(tokens.inputBackground)
                    .border(1.dp, tokens.inputBorder, RoundedCornerShape(24.dp))
                    .padding(horizontal = 12.dp, vertical = inputPadding)
                    .onGloballyPositioned { coordinates ->
                        onInputBounds(coordinates.boundsInRoot())
                    },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                ChatActionButton(
                    size = buttonSize,
                    background = primaryGradient,
                    icon = Icons.Default.PhotoCamera,
                    contentDescription = "Attach photo",
                    enabled = enabled && !isConnecting,
                    onClick = onAddAttachment
                )
                ChatActionButton(
                    size = buttonSize,
                    background = if (isRecording) {
                        Brush.linearGradient(listOf(tokens.success, tokens.success.copy(alpha = 0.7f)))
                    } else {
                        primaryGradient
                    },
                    icon = if (isRecording) Icons.Default.StopCircle else Icons.Default.Mic,
                    contentDescription = if (isRecording) "Stop recording" else "Start voice input",
                    enabled = enabled && !isConnecting,
                    onClick = onVoiceClick
                )

                BasicTextField(
                    value = input,
                    onValueChange = onInputChange,
                    enabled = enabled,
                    textStyle = TextStyle(
                        color = tokens.textStrong,
                        fontSize = inputFontSize,
                        lineHeight = inputLineHeight
                    ),
                    cursorBrush = SolidColor(tokens.textStrong.copy(alpha = 0.85f)),
                    modifier = Modifier
                        .weight(1f)
                        .height(inputHeight),
                    singleLine = true,
                    decorationBox = { innerTextField ->
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.CenterStart
                        ) {
                            if (input.isEmpty()) {
                                Text(
                                    text = "Ask Emma anything...",
                                    color = tokens.textMuted.copy(alpha = 0.35f),
                                    fontSize = inputFontSize,
                                    lineHeight = inputLineHeight,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            innerTextField()
                        }
                    }
                )

                val canSend = enabled && (input.isNotBlank() || attachments.isNotEmpty())
                ChatActionButton(
                    size = buttonSize,
                    width = sendButtonWidth,
                    background = primaryGradient,
                    icon = Icons.Default.Send,
                    contentDescription = "Send message",
                    enabled = canSend,
                    onClick = onSend,
                    dimWhenDisabled = false
                )
            }
        }
    }
}

@Composable
private fun ChatActionButton(
    size: Dp,
    background: Brush,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    contentDescription: String,
    enabled: Boolean,
    onClick: () -> Unit,
    width: Dp = size,
    dimWhenDisabled: Boolean = true
) {
    val alpha = if (!dimWhenDisabled || enabled) 1f else 0.5f
    Box(
        modifier = Modifier
            .size(width, size)
            .clip(RoundedCornerShape(16.dp))
            .background(background)
            .alpha(alpha)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = Color.White,
            modifier = Modifier.size(20.dp)
        )
    }
}

@Composable
private fun AttachmentPreviewRow(
    tokens: ChatTokens,
    attachments: List<MemoryAttachmentInput>,
    onRemoveAttachment: (Int) -> Unit
) {
    LazyRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        itemsIndexed(attachments) { index, attachment ->
            AttachmentPreviewTile(
                tokens = tokens,
                attachment = attachment,
                onRemove = { onRemoveAttachment(index) }
            )
        }
    }
}

@Composable
private fun AttachmentPreviewTile(
    tokens: ChatTokens,
    attachment: MemoryAttachmentInput,
    onRemove: () -> Unit
) {
    val preview = remember(attachment.bytes) { attachment.bytes.toImageBitmap() }
    Box(
        modifier = Modifier
            .size(64.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(tokens.surfaceStrong)
            .border(1.dp, tokens.border, RoundedCornerShape(12.dp))
    ) {
        if (preview != null) {
            Image(
                bitmap = preview,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
        } else {
            Icon(
                imageVector = Icons.Default.PhotoCamera,
                contentDescription = null,
                tint = tokens.textMuted,
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(20.dp)
            )
        }
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(4.dp)
                .size(18.dp)
                .clip(CircleShape)
                .background(tokens.surfaceStrong)
                .clickable(onClick = onRemove),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Close,
                contentDescription = "Remove attachment",
                tint = tokens.textStrong,
                modifier = Modifier.size(12.dp)
            )
        }
    }
}

@Composable
private fun QuickPromptsCard(
    tokens: ChatTokens,
    prompts: List<QuickPrompt>,
    onPromptSelected: (String) -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "Here are some ways I can help you today:",
            color = tokens.textStrong,
            fontSize = 14.sp
        )
        Spacer(modifier = Modifier.height(12.dp))
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            prompts.forEach { prompt ->
                QuickPromptButton(prompt = prompt, onClick = { onPromptSelected(prompt.text) })
            }
        }
    }
}

@Composable
private fun QuickPromptButton(
    prompt: QuickPrompt,
    onClick: () -> Unit
) {
    val palette = LocalEmmaPalette.current
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(
                Brush.linearGradient(
                    listOf(
                        palette.primary.copy(alpha = 0.85f),
                        palette.secondary.copy(alpha = 0.85f)
                    )
                )
            )
            .border(1.dp, palette.primary.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 10.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(
                imageVector = prompt.icon,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(16.dp)
            )
            Text(
                text = prompt.text,
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
private fun SuggestionChips(
    tokens: ChatTokens,
    suggestions: List<String>,
    onSuggestionSelected: (String) -> Unit
) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        suggestions.forEach { suggestion ->
            SuggestionChip(
                tokens = tokens,
                label = suggestion,
                onClick = { onSuggestionSelected(suggestion) }
            )
        }
    }
}

@Composable
private fun SuggestionChip(
    tokens: ChatTokens,
    label: String,
    onClick: () -> Unit
) {
    val palette = LocalEmmaPalette.current
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(14.dp))
            .background(tokens.surfaceStrong)
            .border(1.dp, palette.primary.copy(alpha = 0.25f), RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Text(
            text = label,
            color = tokens.textStrong,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
    }
}
@Composable
fun PersonCardMessage(
    person: PersonCardUi,
    onView: (() -> Unit)? = null
) {
    val palette = LocalEmmaPalette.current
    val tokens = rememberChatTokens()
    val cardModifier = Modifier
        .fillMaxWidth()
        .let { base ->
            if (onView != null) {
                base.clickable(onClick = onView)
            } else {
                base
            }
        }
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = palette.primary.copy(alpha = 0.12f)),
        border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.3f)),
        modifier = cardModifier
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                PersonAvatar(person = person, size = 72.dp)
                Column {
                    Text(
                        text = person.name,
                        color = tokens.textStrong,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = person.relationship,
                        color = tokens.textMuted,
                        fontSize = 14.sp
                    )
                }
            }
            if (onView != null) {
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = "View this person",
                    color = palette.primary.copy(alpha = 0.8f),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
private fun PersonAvatar(person: PersonCardUi, size: Dp) {
    val palette = LocalEmmaPalette.current
    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .background(
                Brush.linearGradient(
                    listOf(palette.primary, palette.secondary)
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        val avatar = person.avatar
        if (avatar != null) {
            androidx.compose.foundation.Image(
                bitmap = avatar,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = androidx.compose.ui.layout.ContentScale.Crop
            )
        } else {
            val initials = person.name.split(" ").filter { it.isNotBlank() }.take(2)
                .joinToString(separator = "") { it.take(1).uppercase() }
            Text(
                text = initials.ifBlank { "?" },
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun MemoryCardMessage(
    memory: MemoryCardUi,
    onView: (() -> Unit)? = null
) {
    val palette = LocalEmmaPalette.current
    val tokens = rememberChatTokens()
    val cardModifier = Modifier
        .fillMaxWidth()
        .let { base ->
            if (onView != null) {
                base.clickable(onClick = onView)
            } else {
                base
            }
        }
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = tokens.surfaceStrong),
        border = BorderStroke(2.dp, tokens.border),
        modifier = cardModifier
    ) {
        Column {
            MemoryMediaGrid(media = memory.media)
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = memory.dateLabel,
                    color = palette.primary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = memory.preview,
                    color = tokens.textStrong,
                    fontSize = 14.sp,
                    lineHeight = 19.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(10.dp))
                if (onView != null) {
                    Text(
                        text = "View this memory",
                        color = palette.primary.copy(alpha = 0.8f),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

@Composable
private fun MemoryMediaGrid(media: List<ImageBitmap>) {
    val palette = LocalEmmaPalette.current
    when (media.size) {
        0 -> {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .background(palette.primary.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.FavoriteBorder,
                    contentDescription = null,
                    tint = palette.primary,
                    modifier = Modifier.size(32.dp)
                )
            }
        }
        1 -> {
            ImageTile(
                bitmap = media.first(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
            )
        }
        2 -> {
            Row(modifier = Modifier.fillMaxWidth()) {
                media.forEach { bitmap ->
                    ImageTile(
                        bitmap = bitmap,
                        modifier = Modifier
                            .weight(1f)
                            .height(160.dp)
                    )
                }
            }
        }
        else -> {
            Row(modifier = Modifier.fillMaxWidth()) {
                ImageTile(
                    bitmap = media.first(),
                    modifier = Modifier
                        .weight(2f)
                        .height(200.dp)
                )
                Column(modifier = Modifier.weight(1f)) {
                    media.drop(1).take(2).forEach { bitmap ->
                        ImageTile(
                            bitmap = bitmap,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(100.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ImageTile(bitmap: ImageBitmap, modifier: Modifier) {
    androidx.compose.foundation.Image(
        bitmap = bitmap,
        contentDescription = null,
        modifier = modifier,
        contentScale = androidx.compose.ui.layout.ContentScale.Crop
    )
}

@Composable
fun MemoryCapsuleMessage(
    capsule: MemoryCapsuleUi,
    onSave: (() -> Unit)? = null,
    onMaybeLater: (() -> Unit)? = null
) {
    val palette = LocalEmmaPalette.current
    val tokens = rememberChatTokens()
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = palette.primary.copy(alpha = 0.12f)),
        border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.3f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.FavoriteBorder,
                    contentDescription = null,
                    tint = palette.primary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Memory capsule",
                    color = tokens.textStrong,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = capsule.title,
                color = tokens.textStrong,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = capsule.story,
                color = tokens.textStrong,
                fontSize = 15.sp,
                lineHeight = 21.sp
            )
            capsule.details.forEach { detail ->
                Spacer(modifier = Modifier.height(8.dp))
                Row {
                    Text(
                        text = detail.first,
                        color = palette.primary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.width(90.dp)
                    )
                    Text(
                        text = detail.second,
                        color = tokens.textStrong,
                        fontSize = 13.sp
                    )
                }
            }
            if (capsule.media.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    capsule.media.forEach { bitmap ->
                        ImageTile(
                            bitmap = bitmap,
                            modifier = Modifier
                                .size(72.dp)
                                .clip(RoundedCornerShape(10.dp))
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                CapsuleButton(
                    label = "Save",
                    primary = true,
                    modifier = Modifier.weight(1f),
                    onClick = onSave
                )
                CapsuleButton(
                    label = "Maybe later",
                    primary = false,
                    modifier = Modifier.weight(1f),
                    onClick = onMaybeLater
                )
            }
        }
    }
}

@Composable
private fun CapsuleButton(
    label: String,
    primary: Boolean,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null
) {
    val palette = LocalEmmaPalette.current
    val colors = MaterialTheme.colorScheme
    val background = if (primary) {
        Brush.linearGradient(listOf(palette.primary, palette.secondary))
    } else {
        Brush.linearGradient(listOf(palette.primary.copy(alpha = 0.2f), palette.secondary.copy(alpha = 0.2f)))
    }
    val textColor = if (primary) colors.onPrimary else colors.onSurface
    val clickableModifier = if (onClick != null) {
        Modifier.clickable(onClick = onClick)
    } else {
        Modifier
    }
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(background)
            .then(clickableModifier)
            .padding(vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = textColor,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
fun MemoryResultsGrid(
    results: List<MemoryResultUi>,
    onOpenMemory: (String) -> Unit
) {
    val palette = LocalEmmaPalette.current
    val tokens = rememberChatTokens()
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = palette.primary.copy(alpha = 0.08f)),
        border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.25f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Memories",
                color = tokens.textStrong,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                results.forEach { result ->
                    MemoryResultCard(
                        result = result,
                        onClick = { onOpenMemory(result.navigationQuery) }
                    )
                }
            }
        }
    }
}

@Composable
private fun MemoryResultCard(
    result: MemoryResultUi,
    onClick: (() -> Unit)? = null
) {
    val palette = LocalEmmaPalette.current
    val tokens = rememberChatTokens()
    val cardModifier = Modifier
        .widthIn(min = 180.dp, max = 220.dp)
        .let { base ->
            if (onClick != null) {
                base.clickable(onClick = onClick)
            } else {
                base
            }
        }
    Card(
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = palette.primary.copy(alpha = 0.12f)),
        border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.2f)),
        modifier = cardModifier
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(tokens.surfaceStrong),
                contentAlignment = Alignment.Center
            ) {
                if (result.mediaPreview != null) {
                    ImageTile(
                        bitmap = result.mediaPreview,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.FavoriteBorder,
                        contentDescription = null,
                        tint = palette.primary,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = result.title,
                color = tokens.textStrong,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = result.snippet,
                color = tokens.textMuted,
                fontSize = 12.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = result.peopleLabel,
                color = palette.primary,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

private fun buildPersonCardUi(person: PersonRecord, mediaRecords: Map<String, MediaRecord>): PersonCardUi {
    val relationship = person.relation.takeIf { it.isNotBlank() && !it.equals("other", ignoreCase = true) }
        ?: "Someone special"
    val avatar = person.avatarId?.let { id ->
        decodeMediaThumbnail(mediaRecords[id], maxPx = 160)
    }
    return PersonCardUi(id = person.id, name = person.name, relationship = relationship, avatar = avatar)
}

private fun buildMemoryCardUi(memory: MemoryRecord, mediaRecords: Map<String, MediaRecord>): MemoryCardUi {
    val preview = buildMemoryPreview(memory)
    val media = resolveMemoryMedia(memory, mediaRecords, maxItems = 3, maxPx = 220)
    val navigationQuery = buildMemoryNavigationQuery(memory, preview)
    return MemoryCardUi(
        id = memory.id,
        dateLabel = formatMemoryDate(memory),
        preview = preview,
        media = media,
        navigationQuery = navigationQuery
    )
}

private fun buildMemoryResultUi(
    memory: MemoryRecord,
    peopleLookup: Map<String, String>,
    mediaRecords: Map<String, MediaRecord>
): MemoryResultUi {
    val snippet = buildMemoryPreview(memory)
    val preview = resolveMemoryMedia(memory, mediaRecords, maxItems = 1, maxPx = 160).firstOrNull()
    val navigationQuery = buildMemoryNavigationQuery(memory, snippet)
    return MemoryResultUi(
        id = memory.id,
        title = memory.title.ifBlank { "Untitled memory" },
        snippet = snippet,
        peopleLabel = buildPeopleLabel(memory, peopleLookup),
        mediaPreview = preview,
        navigationQuery = navigationQuery
    )
}

private fun resolveMemoryMedia(
    memory: MemoryRecord,
    mediaRecords: Map<String, MediaRecord>,
    maxItems: Int,
    maxPx: Int
): List<ImageBitmap> {
    if (memory.attachments.isEmpty()) return emptyList()
    return memory.attachments.asSequence()
        .mapNotNull { attachment ->
            val id = attachment.id.trim()
            if (id.isBlank()) null else decodeMediaThumbnail(mediaRecords[id], maxPx = maxPx)
        }
        .take(maxItems)
        .toList()
}

private fun buildDraftCapsule(draft: MemoryDraft): MemoryCapsuleUi {
    return MemoryCapsuleUi(
        title = draft.title.ifBlank { "New memory" },
        story = draft.content.ifBlank { draft.sourceText },
        details = buildDraftDetails(draft),
        media = emptyList()
    )
}

private fun buildDraftDetails(draft: MemoryDraft): List<Pair<String, String>> {
    val details = mutableListOf<Pair<String, String>>()
    if (draft.people.isNotEmpty()) {
        details.add("People" to draft.people.joinToString(", "))
    }
    if (draft.emotions.isNotEmpty()) {
        details.add("Emotion" to draft.emotions.joinToString(", "))
    }
    draft.location?.takeIf { it.isNotBlank() }?.let { details.add("Place" to it) }
    draft.dateLabel?.takeIf { it.isNotBlank() }?.let { details.add("When" to it) }
    draft.importance?.takeIf { it.isNotBlank() }?.let { details.add("Importance" to it) }
    return details
}

private fun buildPeopleLabel(memory: MemoryRecord, peopleLookup: Map<String, String>): String {
    val names = memory.people.mapNotNull { entry ->
        val trimmed = entry.trim()
        if (trimmed.isBlank()) return@mapNotNull null
        peopleLookup[trimmed] ?: trimmed
    }
    return if (names.isNotEmpty()) {
        "With " + names.take(3).joinToString(", ")
    } else {
        "No people tagged"
    }
}

private fun buildMemoryPreview(memory: MemoryRecord): String {
    val candidate = memory.summary
        ?: memory.metadata?.summary
        ?: memory.body.ifBlank { memory.content.orEmpty() }
    val trimmed = candidate.replace("\\s+".toRegex(), " ").trim()
    if (trimmed.isBlank()) return "Memory saved."
    return if (trimmed.length <= 140) trimmed else trimmed.take(140).trimEnd() + "..."
}

private fun buildMemoryNavigationQuery(memory: MemoryRecord, fallback: String): String {
    val title = memory.title.ifBlank { memory.metadata?.title.orEmpty() }.trim()
    if (title.isNotBlank()) return title
    val tag = memory.tags.firstOrNull { it.isNotBlank() }?.trim().orEmpty()
    if (tag.isNotBlank()) return tag
    val snippet = buildMemoryPreview(memory).trim()
    if (snippet.isNotBlank() && !snippet.equals("Memory saved.", ignoreCase = true)) {
        return snippet.take(48)
    }
    val safeFallback = fallback.trim()
    return if (safeFallback.isNotBlank() && !safeFallback.equals("Memory saved.", ignoreCase = true)) {
        safeFallback.take(48)
    } else {
        ""
    }
}

private val memoryDateFormatter: DateTimeFormatter =
    DateTimeFormatter.ofPattern("MMM d, yyyy").withZone(ZoneId.systemDefault())

private fun formatMemoryDate(memory: MemoryRecord): String {
    val raw = memory.updated ?: memory.created
    return runCatching { memoryDateFormatter.format(Instant.parse(raw)) }
        .getOrDefault("Recently")
}
private val timeFormatter: DateTimeFormatter =
    DateTimeFormatter.ofPattern("h:mm a").withZone(ZoneId.systemDefault())

private fun formatTime(timestamp: Long): String {
    return runCatching { timeFormatter.format(Instant.ofEpochMilli(timestamp)) }.getOrDefault("")
}

private fun isEphemeralSystemMessage(text: String): Boolean {
    return text.contains("Emma ready", ignoreCase = true) ||
        text.contains("ready to talk", ignoreCase = true)
}

private val addPersonSuggestionLabels = setOf(
    "add a new person",
    "add a person",
    "add person",
    "create a new person",
    "create a person"
)

private fun normalizeSuggestionLabel(label: String): String {
    return label.lowercase()
        .replace("[^a-z0-9\\s]".toRegex(), "")
        .replace("\\s+".toRegex(), " ")
        .trim()
}

private fun isAddPersonSuggestion(label: String): Boolean {
    return normalizeSuggestionLabel(label) in addPersonSuggestionLabels
}
