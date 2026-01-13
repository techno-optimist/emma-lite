package com.yourorg.emma.nativeapp.ui

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.surfaceColorAtElevation
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.yourorg.emma.nativeapp.ui.components.EmmaAuroraBackground
import com.yourorg.emma.nativeapp.ui.components.LandingPromptBar
import com.yourorg.emma.nativeapp.ui.orb.EmorbSurface
import com.yourorg.emma.nativeapp.ui.orb.EmorbSurfaceInline
import com.yourorg.emma.nativeapp.ui.theme.LocalEmmaPalette
import kotlinx.coroutines.delay

private data class LandingAction(
    val id: String,
    val title: String,
    val subtitle: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val onClick: () -> Unit,
    val isPrimary: Boolean
)

private data class OnboardingQuestion(
    val id: String,
    val title: String,
    val subtitle: String,
    val options: List<String>
)

private data class IntroChatTokens(
    val containerBrush: Brush,
    val containerBorder: Color,
    val border: Color,
    val textMuted: Color,
    val emmaBubble: Color,
    val emmaText: Color,
    val emmaMeta: Color,
    val headerBackdrop: Color,
    val chatBackdrop: Color
)

private enum class OnboardingStage {
    Intro,
    Personalize
}

private val INTRO_DIALOG_ELEVATION = 6.dp

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun VaultLandingScreen(
    statusTitle: String = "No vault loaded",
    statusSubtitle: String = "Connect your .emma vault to continue.",
    statusIsLoading: Boolean = false,
    onOpenVault: () -> Unit = {},
    onCreateVault: () -> Unit = {},
    showOnboarding: Boolean = false,
    onSkipOnboarding: () -> Unit = {},
    showContinue: Boolean = false,
    onGoToChat: () -> Unit = {},
    onOrbClick: () -> Unit = {},
    recentVaultName: String? = null,
    recentVaultSubtitle: String? = null,
    resumeNeedsPermission: Boolean = false,
    onResumeVault: (() -> Unit)? = null,
    showAutosaveResume: Boolean = false,
    onResumeAutosave: (() -> Unit)? = null
) {
    val colors = MaterialTheme.colorScheme
    val questionSelections = remember { mutableStateMapOf<String, String>() }
    val profileResponses = remember { mutableStateMapOf<String, String>() }
    val suggestedPrompt by remember {
        derivedStateOf { buildSuggestedPrompt(questionSelections, profileResponses) }
    }

    val questions = listOf(
        OnboardingQuestion(
            id = "tone",
            title = "How should I respond?",
            subtitle = "Pick the voice you want Emma to use.",
            options = listOf("gentle", "direct", "storytelling", "structured", "coach")
        ),
        OnboardingQuestion(
            id = "detail",
            title = "How much detail feels right?",
            subtitle = "Choose how layered your summaries should be.",
            options = listOf("brief", "balanced", "in-depth")
        ),
        OnboardingQuestion(
            id = "focus",
            title = "Where should we start?",
            subtitle = "Select a focus for your first session.",
            options = listOf("memories", "people", "places", "habits")
        )
    )

    val promptSuggestions = buildList {
        suggestedPrompt?.let { add(it) }
        addAll(
            listOf(
                "Introduce yourself, Emma, and tell me how you can help.",
                "Capture a memory from today with a gentle summary.",
                "Add someone important and note why they matter.",
                "Summarize the last week in a few lines."
            )
        )
    }.distinct()

    val actions = buildLandingActions(
        onOpenVault = onOpenVault,
        onCreateVault = onCreateVault,
        showContinue = showContinue,
        onGoToChat = onGoToChat,
        onResumeVault = onResumeVault,
        recentVaultName = recentVaultName,
        recentVaultSubtitle = recentVaultSubtitle,
        resumeNeedsPermission = resumeNeedsPermission,
        showAutosaveResume = showAutosaveResume,
        onResumeAutosave = onResumeAutosave
    )
    var showOnboardingDialog by remember { mutableStateOf(false) }
    LaunchedEffect(showOnboarding) {
        if (showOnboarding) {
            showOnboardingDialog = true
        }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color.Transparent
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            EmmaAuroraBackground(modifier = Modifier.fillMaxSize())
            if (showOnboardingDialog) {
                OnboardingDialog(
                    questions = questions,
                    selections = questionSelections,
                    profileResponses = profileResponses,
                    promptSuggestions = promptSuggestions,
                    isFirstTime = showOnboarding,
                    onClose = { showOnboardingDialog = false },
                    onSkip = {
                        showOnboardingDialog = false
                        onSkipOnboarding()
                    },
                    onFinish = {
                        showOnboardingDialog = false
                        onSkipOnboarding()
                    }
                )
            }
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp, vertical = 24.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                LandingHero(
                    showContinue = showContinue,
                    onOrbClick = onOrbClick
                )

                LandingActionSection(
                    actions = actions
                )

                OnboardingEntryCard(
                    isFirstTime = showOnboarding,
                    onStart = { showOnboardingDialog = true },
                    onSkip = onSkipOnboarding
                )

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun LandingHero(
    showContinue: Boolean,
    onOrbClick: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        Surface(
            shape = RoundedCornerShape(999.dp),
            color = colors.surface.copy(alpha = 0.9f),
            border = BorderStroke(1.dp, colors.onSurface.copy(alpha = 0.1f))
        ) {
            Text(
                text = "Private by default",
                style = MaterialTheme.typography.labelMedium.copy(letterSpacing = 1.sp),
                color = colors.onSurface,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
            )
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "Your memory vault starts here",
            style = MaterialTheme.typography.headlineMedium.copy(
                color = colors.onBackground,
                fontWeight = FontWeight.Bold
            ),
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Capture moments, people, and places with Emma. Everything stays encrypted on device.",
            style = MaterialTheme.typography.bodyMedium.copy(color = colors.onBackground.copy(alpha = 0.82f)),
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(18.dp))
        OrbVisual(
            size = 170.dp,
            onClick = if (showContinue) onOrbClick else null
        )
        if (showContinue) {
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = "Tap the orb to jump back in.",
                style = MaterialTheme.typography.bodySmall.copy(color = colors.onBackground.copy(alpha = 0.78f))
            )
        }
    }
}

@Composable
private fun OnboardingEntryCard(
    isFirstTime: Boolean,
    onStart: () -> Unit,
    onSkip: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface.copy(alpha = 0.95f)),
        border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.18f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = if (isFirstTime) "Meet Emma and set her tone." else "Want to revisit your intro?",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                color = colors.onSurface
            )
            Text(
                text = if (isFirstTime) {
                    "Emma will introduce herself and ask a few quick prompts to personalize her responses."
                } else {
                    "Reopen the intro flow to tweak Emma's voice and your starter prompts."
                },
                style = MaterialTheme.typography.bodySmall.copy(color = colors.onSurface.copy(alpha = 0.75f))
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Button(
                    onClick = onStart,
                    colors = ButtonDefaults.buttonColors(containerColor = palette.primary, contentColor = colors.onPrimary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text(if (isFirstTime) "Meet Emma" else "Review intro")
                }
                if (isFirstTime) {
                    TextButton(onClick = onSkip) {
                        Text("Skip for now")
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun OnboardingDialog(
    questions: List<OnboardingQuestion>,
    selections: MutableMap<String, String>,
    profileResponses: MutableMap<String, String>,
    promptSuggestions: List<String>,
    isFirstTime: Boolean,
    onClose: () -> Unit,
    onSkip: () -> Unit,
    onFinish: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val dialogSurface = colors.surfaceColorAtElevation(INTRO_DIALOG_ELEVATION)
    val introTokens = rememberIntroChatTokens(dialogSurface)
    var stage by remember { mutableStateOf(OnboardingStage.Intro) }
    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .fillMaxHeight(0.92f),
            shape = RoundedCornerShape(24.dp),
            color = colors.surface,
            tonalElevation = INTRO_DIALOG_ELEVATION,
            shadowElevation = 10.dp
        ) {
            Column(
                modifier = Modifier
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                when (stage) {
                    OnboardingStage.Intro -> {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Meet Emma",
                                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.SemiBold),
                                color = colors.onSurface
                            )
                        }
                        Box(
                            modifier = Modifier.fillMaxWidth(),
                            contentAlignment = Alignment.Center
                        ) {
                            InlineOrbBadge(
                                size = 150.dp,
                                backgroundColor = introTokens.headerBackdrop
                            )
                        }
                        val introMessages = remember {
                            listOf(
                                "Hi, I'm Emma. Your intelligent memory companion.",
                                "Your memories stay private and encrypted on this device.",
                                "Tap Continue to choose how I respond."
                            )
                        }
                        EmmaIntroPacedMessages(messages = introMessages, tokens = introTokens)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextButton(onClick = if (isFirstTime) onSkip else onClose) {
                                Text(if (isFirstTime) "Not now" else "Close")
                            }
                            Button(
                                onClick = { stage = OnboardingStage.Personalize },
                                shape = RoundedCornerShape(14.dp)
                            ) {
                                Text("Continue")
                            }
                        }
                    }

                    OnboardingStage.Personalize -> {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Shape Emma",
                                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.SemiBold),
                                color = colors.onSurface
                            )
                            TextButton(onClick = { stage = OnboardingStage.Intro }) {
                                Text("Back")
                            }
                        }
                        Text(
                            text = "Answer a few quick prompts so I can respond in your style.",
                            style = MaterialTheme.typography.bodySmall.copy(color = colors.onSurface.copy(alpha = 0.75f))
                        )

                        AboutYouCard(
                            name = profileResponses["name"] ?: "",
                            onNameChange = { profileResponses["name"] = it },
                            focus = profileResponses["focus"] ?: "",
                            onFocusChange = { profileResponses["focus"] = it }
                        )

                        questions.forEach { question ->
                            OnboardingQuestionCard(
                                question = question,
                                selectedOption = selections[question.id],
                                onSelect = { option -> selections[question.id] = option },
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        LandingPromptBar(
                            suggestions = promptSuggestions,
                            modifier = Modifier.fillMaxWidth()
                        )

                        MembersSetupCard()

                        SectionHeader(
                            title = "What happens next",
                            subtitle = "A quick map of your first session."
                        )
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            HowItWorksStep(
                                step = "1",
                                title = "Open your vault",
                                description = "Keep everything encrypted and stored locally."
                            )
                            HowItWorksStep(
                                step = "2",
                                title = "Share a memory",
                                description = "Use chat or voice to capture details and context."
                            )
                            HowItWorksStep(
                                step = "3",
                                title = "Explore connections",
                                description = "See how people and memories link together."
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextButton(onClick = if (isFirstTime) onSkip else onClose) {
                                Text(if (isFirstTime) "Skip for now" else "Close")
                            }
                            Button(
                                onClick = if (isFirstTime) onFinish else onClose,
                                shape = RoundedCornerShape(14.dp)
                            ) {
                                Text(if (isFirstTime) "Finish setup" else "Done")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EmmaIntroPacedMessages(
    messages: List<String>,
    tokens: IntroChatTokens,
    modifier: Modifier = Modifier
) {
    var visibleCount by remember { mutableStateOf(0) }
    var showTyping by remember { mutableStateOf(false) }

    LaunchedEffect(messages) {
        visibleCount = 0
        showTyping = true
        messages.forEachIndexed { index, message ->
            delay(650)
            showTyping = false
            visibleCount = index + 1
            val pause = (message.length * 18L).coerceIn(600L, 1600L)
            delay(pause)
            if (index < messages.lastIndex) {
                showTyping = true
            }
        }
    }

    IntroChatFrame(tokens = tokens, modifier = modifier) {
        messages.take(visibleCount).forEach { message ->
            EmmaIntroMessageBubble(tokens = tokens, message = message)
        }
        if (showTyping && visibleCount < messages.size) {
            IntroTypingIndicator(tokens = tokens)
        }
    }
}

@Composable
private fun IntroChatFrame(
    tokens: IntroChatTokens,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    val shape = RoundedCornerShape(18.dp)
    Box(
        modifier = modifier
            .fillMaxWidth()
            .shadow(14.dp, shape, clip = false)
            .clip(shape)
            .background(tokens.containerBrush)
            .border(2.dp, tokens.containerBorder, shape)
            .padding(14.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp), content = content)
    }
}

@Composable
private fun EmmaIntroMessageBubble(
    tokens: IntroChatTokens,
    message: String
) {
    Row(
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        IntroOrbAvatar(tokens = tokens)
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
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                Text(
                    text = "Emma",
                    color = tokens.emmaMeta,
                    fontSize = 11.sp
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = message,
                    color = tokens.emmaText,
                    fontSize = 15.sp,
                    lineHeight = 20.sp
                )
            }
        }
    }
}

@Composable
private fun IntroTypingIndicator(tokens: IntroChatTokens) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            IntroTypingDot(tokens = tokens, delayMillis = 0)
            IntroTypingDot(tokens = tokens, delayMillis = 150)
            IntroTypingDot(tokens = tokens, delayMillis = 300)
        }
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = "Emma is speaking...",
            color = tokens.textMuted,
            fontSize = 13.sp
        )
    }
}

@Composable
private fun IntroTypingDot(tokens: IntroChatTokens, delayMillis: Int) {
    val transition = rememberInfiniteTransition(label = "intro-typing")
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
private fun IntroOrbAvatar(tokens: IntroChatTokens) {
    InlineOrbBadge(
        size = 32.dp,
        backgroundColor = tokens.chatBackdrop
    )
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
private fun rememberIntroChatTokens(dialogSurface: Color): IntroChatTokens {
    val palette = LocalEmmaPalette.current
    val colors = MaterialTheme.colorScheme
    val isLight = colors.onSurface.luminance() < 0.5f
    val neutral = if (isLight) colors.onSurface else Color.White
    val chatStartOverlay = palette.primary.copy(alpha = 0.15f)
    val chatEndOverlay = palette.secondary.copy(alpha = 0.1f)
    val containerStart = blendOver(dialogSurface, chatStartOverlay)
    val containerEnd = blendOver(dialogSurface, chatEndOverlay)
    val containerBrush = Brush.linearGradient(listOf(containerStart, containerEnd))
    val border = neutral.copy(alpha = if (isLight) 0.18f else 0.2f)
    val emmaBubble = palette.surface.copy(alpha = if (isLight) 0.95f else 0.88f)
    val textStrong = colors.onSurface.copy(alpha = 0.92f)
    val textMuted = colors.onSurface.copy(alpha = 0.72f)
    val headerBackdrop = dialogSurface
    val chatBackdrop = containerStart
    return IntroChatTokens(
        containerBrush = containerBrush,
        containerBorder = palette.primary.copy(alpha = 0.3f),
        border = border,
        textMuted = textMuted,
        emmaBubble = emmaBubble,
        emmaText = textStrong,
        emmaMeta = colors.onSurface.copy(alpha = 0.65f),
        headerBackdrop = headerBackdrop,
        chatBackdrop = chatBackdrop
    )
}

private fun blendOver(base: Color, overlay: Color): Color {
    val alpha = overlay.alpha
    val inv = 1f - alpha
    return Color(
        red = base.red * inv + overlay.red * alpha,
        green = base.green * inv + overlay.green * alpha,
        blue = base.blue * inv + overlay.blue * alpha,
        alpha = 1f
    )
}

@Composable
private fun AboutYouCard(
    name: String,
    onNameChange: (String) -> Unit,
    focus: String,
    onFocusChange: (String) -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface.copy(alpha = 0.95f)),
        border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.18f))
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "About you",
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                color = colors.onSurface
            )
            Text(
                text = "Share a few details so Emma can respond with the right tone and context.",
                style = MaterialTheme.typography.bodySmall.copy(color = colors.onSurface.copy(alpha = 0.75f))
            )
            TextField(
                value = name,
                onValueChange = onNameChange,
                placeholder = { Text("What should I call you? (optional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    disabledContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                )
            )
            TextField(
                value = focus,
                onValueChange = onFocusChange,
                placeholder = { Text("What should I know about you or this moment?") },
                singleLine = false,
                modifier = Modifier.fillMaxWidth(),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    disabledContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                )
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MembersSetupCard() {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    var membersInput by remember { mutableStateOf("") }
    val suggestions = listOf("Family", "Friends", "Team", "Mentors")

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface.copy(alpha = 0.95f)),
        border = BorderStroke(1.dp, colors.onSurface.copy(alpha = 0.12f))
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(34.dp)
                        .clip(CircleShape)
                        .background(palette.primary.copy(alpha = 0.18f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Filled.People, contentDescription = null, tint = colors.onSurface)
                }
                Column {
                    Text("People to remember", fontWeight = FontWeight.SemiBold, color = colors.onSurface)
                    Text(
                        text = "Start a short list of people you want Emma to remember.",
                        style = MaterialTheme.typography.bodySmall.copy(color = colors.onSurface.copy(alpha = 0.75f))
                    )
                }
            }
            TextField(
                value = membersInput,
                onValueChange = { membersInput = it },
                placeholder = { Text("e.g., Mom, Jordan, Dr. Lee") },
                singleLine = false,
                modifier = Modifier.fillMaxWidth(),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    disabledContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                )
            )
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                suggestions.forEach { suggestion ->
                    AssistChip(
                        onClick = {
                            membersInput = if (membersInput.isBlank()) {
                                suggestion
                            } else if (membersInput.contains(suggestion, ignoreCase = true)) {
                                membersInput
                            } else {
                                "$membersInput, $suggestion"
                            }
                        },
                        label = { Text(suggestion) },
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = palette.primary.copy(alpha = 0.14f),
                            labelColor = colors.onSurface
                        ),
                        border = BorderStroke(1.dp, palette.primary.copy(alpha = 0.3f))
                    )
                }
            }
        }
    }
}

@Composable
private fun LandingActionSection(
    actions: List<LandingAction>
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionHeader(
            title = "Choose your path",
            subtitle = "Start fresh or continue where you left off."
        )
        actions.forEach { action ->
            LandingActionCard(action = action)
        }
    }
}

@Composable
private fun LandingActionCard(action: LandingAction) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    val shape = RoundedCornerShape(20.dp)
    val content = @Composable {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(
                        if (action.isPrimary) {
                            colors.onPrimary.copy(alpha = 0.18f)
                        } else {
                            colors.onSurface.copy(alpha = 0.08f)
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = action.icon,
                    contentDescription = null,
                    tint = if (action.isPrimary) colors.onPrimary else colors.onSurface
                )
            }
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = action.title,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = if (action.isPrimary) colors.onPrimary else colors.onSurface
                )
                Text(
                    text = action.subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (action.isPrimary) colors.onPrimary.copy(alpha = 0.82f) else colors.onSurface.copy(alpha = 0.72f)
                )
            }
        }
    }

    if (action.isPrimary) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clip(shape)
                .clickable { action.onClick() },
            shape = shape,
            colors = CardDefaults.cardColors(containerColor = Color.Transparent),
            elevation = CardDefaults.cardElevation(defaultElevation = 10.dp)
        ) {
            Box(
                modifier = Modifier
                    .background(
                        Brush.linearGradient(
                            colors = listOf(
                                palette.primary,
                                palette.secondary
                            )
                        )
                    )
            ) {
                content()
                Surface(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(12.dp),
                    color = colors.onPrimary.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(999.dp),
                    border = BorderStroke(1.dp, colors.onPrimary.copy(alpha = 0.3f))
                ) {
                    Text(
                        text = "Recommended",
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.onPrimary,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
            }
        }
    } else {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clip(shape)
                .clickable { action.onClick() },
            shape = shape,
            colors = CardDefaults.cardColors(containerColor = colors.surface.copy(alpha = 0.95f)),
            border = BorderStroke(1.dp, colors.onSurface.copy(alpha = 0.14f)),
            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
        ) {
            content()
        }
    }
}

@Composable
private fun SectionHeader(title: String, subtitle: String? = null) {
    val colors = MaterialTheme.colorScheme
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
            color = colors.onBackground
        )
        subtitle?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodySmall.copy(color = colors.onBackground.copy(alpha = 0.75f))
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun OnboardingQuestionCard(
    question: OnboardingQuestion,
    selectedOption: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = colors.surface.copy(alpha = 0.95f)),
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(1.dp, colors.onSurface.copy(alpha = 0.12f))
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(question.title, fontWeight = FontWeight.SemiBold, color = colors.onSurface)
            Text(
                question.subtitle,
                style = MaterialTheme.typography.bodySmall.copy(color = colors.onSurface.copy(alpha = 0.75f))
            )
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                question.options.forEach { option ->
                    val isSelected = option == selectedOption
                    AssistChip(
                        onClick = { onSelect(option) },
                        label = { Text(option.replaceFirstChar { it.uppercaseChar() }) },
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = if (isSelected) palette.primary.copy(alpha = 0.22f) else colors.surface,
                            labelColor = if (isSelected) colors.onSurface else colors.onSurface.copy(alpha = 0.78f)
                        ),
                        border = BorderStroke(
                            1.dp,
                            if (isSelected) palette.primary else colors.onSurface.copy(alpha = 0.14f)
                        )
                    )
                }
            }
        }
    }
}

@Composable
private fun HowItWorksStep(step: String, title: String, description: String) {
    val colors = MaterialTheme.colorScheme
    val palette = LocalEmmaPalette.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(colors.surface.copy(alpha = 0.95f))
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.Top
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(palette.primary.copy(alpha = 0.2f)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = step,
                style = MaterialTheme.typography.labelLarge,
                color = colors.onSurface
            )
        }
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold, color = colors.onSurface)
            Text(
                description,
                style = MaterialTheme.typography.bodySmall.copy(color = colors.onSurface.copy(alpha = 0.75f))
            )
        }
    }
}

@Composable
private fun OrbVisual(size: Dp, onClick: (() -> Unit)? = null) {
    Box(
        modifier = Modifier
            .size(size)
            .clip(RoundedCornerShape(size / 2))
            .background(Color.Transparent)
            .let { base -> if (onClick != null) base.clickable { onClick() } else base },
        contentAlignment = Alignment.Center
    ) {
        EmorbSurface(
            modifier = Modifier
                .size(size)
                .clip(RoundedCornerShape(size / 2))
        )
    }
}

private fun buildLandingActions(
    onOpenVault: () -> Unit,
    onCreateVault: () -> Unit,
    showContinue: Boolean,
    onGoToChat: () -> Unit,
    onResumeVault: (() -> Unit)?,
    recentVaultName: String?,
    recentVaultSubtitle: String?,
    resumeNeedsPermission: Boolean,
    showAutosaveResume: Boolean,
    onResumeAutosave: (() -> Unit)?
): List<LandingAction> {
    val actions = mutableListOf<LandingAction>()
    val hasResume = onResumeVault != null && recentVaultName != null
    val hasAutosave = showAutosaveResume && onResumeAutosave != null
    if (hasResume) {
        val title = if (resumeNeedsPermission) "Reopen $recentVaultName" else "Resume $recentVaultName"
        val subtitle = recentVaultSubtitle ?: if (resumeNeedsPermission) {
            "Storage access expired. Reselect the vault to continue."
        } else {
            "Open the last vault used on this device."
        }
        actions.add(
            LandingAction(
                id = "resume",
                title = title,
                subtitle = subtitle,
                icon = Icons.Filled.History,
                onClick = onResumeVault!!,
                isPrimary = true
            )
        )
    }
    if (hasAutosave) {
        actions.add(
            LandingAction(
                id = "autosave",
                title = "Resume from autosave",
                subtitle = "Load the on-device autosave copy with your passphrase.",
                icon = Icons.Filled.Save,
                onClick = onResumeAutosave!!,
                isPrimary = false
            )
        )
    }
    val primaryId = if (hasResume) "resume" else "create"
    actions.add(
        LandingAction(
            id = "create",
            title = "Create new vault",
            subtitle = "Start a clean, encrypted vault on this device.",
            icon = Icons.Filled.AddCircle,
            onClick = onCreateVault,
            isPrimary = primaryId == "create"
        )
    )
    actions.add(
        LandingAction(
            id = "open",
            title = "Open existing vault",
            subtitle = "Choose an .emma file and pick up where you left off.",
            icon = Icons.Filled.FolderOpen,
            onClick = onOpenVault,
            isPrimary = false
        )
    )
    if (showContinue) {
        actions.add(
            LandingAction(
                id = "continue",
                title = "Continue to chat",
                subtitle = "Your vault is loaded. Jump into Emma chat.",
                icon = Icons.AutoMirrored.Filled.Chat,
                onClick = onGoToChat,
                isPrimary = false
            )
        )
    }
    return actions
}

private fun buildSuggestedPrompt(
    selections: Map<String, String>,
    profileResponses: Map<String, String>
): String? {
    val name = profileResponses["name"]?.trim().orEmpty()
    val focusNote = profileResponses["focus"]?.trim().orEmpty()
    val tone = selections["tone"]
    val detail = selections["detail"]
    val focus = selections["focus"]
    if (name.isEmpty() && focusNote.isEmpty() && tone == null && detail == null && focus == null) {
        return null
    }

    val parts = mutableListOf<String>()
    if (name.isNotEmpty()) {
        parts.add("I'm $name.")
    }
    if (focusNote.isNotEmpty()) {
        val normalized = if (focusNote.endsWith(".") || focusNote.endsWith("!") || focusNote.endsWith("?")) {
            focusNote
        } else {
            "$focusNote."
        }
        parts.add(normalized)
    }

    val request = StringBuilder("Please ")
    if (!tone.isNullOrBlank()) {
        request.append("respond in a ").append(tone).append(" tone and ")
    }
    request.append("help me ")
    request.append(focus?.let { "capture $it" } ?: "get started")
    if (!detail.isNullOrBlank()) {
        request.append(" with ").append(detail).append(" detail")
    }
    request.append(".")
    parts.add(request.toString())
    return parts.joinToString(" ")
}
