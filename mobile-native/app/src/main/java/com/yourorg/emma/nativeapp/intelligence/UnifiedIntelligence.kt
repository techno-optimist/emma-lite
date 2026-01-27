package com.yourorg.emma.nativeapp.intelligence

import com.yourorg.emma.nativeapp.settings.SettingsPreferencesState
import com.yourorg.emma.nativeapp.voice.AndroidToolExecutor
import com.yourorg.emma.nativeapp.voice.MemoryDraft
import com.yourorg.emma.nativeapp.voice.VaultSnapshot
import com.yourorg.emma.nativeapp.voice.VaultSnapshotBuilder
import com.yourorg.emma.nativeapp.voice.VoicePayload
import com.yourorg.emma.nativeapp.vault.MemoryRecord
import com.yourorg.emma.nativeapp.vault.PersonRecord
import com.yourorg.emma.nativeapp.vault.MemoryAttachmentInput
import com.yourorg.emma.nativeapp.vault.resolvePeopleIdsForMemory
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

class UnifiedIntelligence(
    private val toolExecutor: AndroidToolExecutor,
    private val vectorlessEngine: VectorlessEngine = VectorlessEngine(),
    private val captureEngine: IntelligentCaptureEngine = IntelligentCaptureEngine(vectorlessEngine),
    private val clock: () -> Long = { System.currentTimeMillis() },
    private val attachmentsProvider: () -> List<MemoryAttachmentInput> = { emptyList() },
    private val onAttachmentsConsumed: () -> Unit = {}
) {
    private var settings: SettingsPreferencesState = SettingsPreferencesState()
    private val conversationHistory = ArrayDeque<ConversationTurn>()
    private val conversationState = ConversationStateManager()
    private val currentContext = ConversationContext()
    private var enrichmentSession: EnrichmentSession? = null
    private var pendingMemoryDraft: MemoryDraft? = null

    private val followUpQuestions = mutableListOf<String>()
    private val ambiguityThreshold = 0.55
    private var pendingClarifications: List<String> = emptyList()

    private val proactiveFeatures = ProactiveFeatures()
    private var lastProactiveCheck: Long? = null
    private val conversationPatterns = ConversationPatterns()
    private val anniversaries = mutableListOf<ProactiveMessage>()
    private val insights = mutableListOf<ProactiveMessage>()

    fun updateSettings(updated: SettingsPreferencesState) {
        settings = updated
        vectorlessEngine.updateOptions(
            VectorlessOptions(
                dementiaMode = updated.dementiaMode,
                debug = false
            )
        )
    }

    fun getVaultContext(snapshot: VaultSnapshot): VaultContext {
        val relations = snapshot.people
            .mapNotNull { person ->
                val relation = person.relation.trim()
                val name = person.name.trim()
                if (relation.isBlank() || relation.equals("other", ignoreCase = true) || name.isBlank()) {
                    null
                } else {
                    relation.lowercase() to name
                }
            }
            .groupBy({ it.first }, { it.second })
        return VaultContext(
            memoryCount = snapshot.memories.size,
            peopleCount = snapshot.people.size,
            peopleNames = snapshot.people.mapNotNull { it.name.trim().takeIf { name -> name.isNotBlank() } },
            recentTopics = emptyList(),
            peopleRelations = relations
        )
    }

    suspend fun analyzeAndRespond(userMessage: String, snapshot: VaultSnapshot): UnifiedResponse {
        val trimmed = userMessage.trim()
        if (trimmed.isBlank()) {
            return UnifiedResponse(
                text = applyDementiaTone("I'm here whenever you're ready."),
                shouldSpeak = true
            )
        }
        addToHistory(trimmed, "user")
        vectorlessEngine.loadVault(snapshot)
        trackConversationPatterns(trimmed, snapshot.people)
        enrichmentSession?.let { session ->
            val enriched = captureEngine.enrichDraft(session.draft, trimmed)
            val updatedSession = session.copy(
                draft = enriched,
                questionsAsked = session.questionsAsked + 1,
                collectedDetails = session.collectedDetails + trimmed
            )
            enrichmentSession = updatedSession
            return if (updatedSession.questionsAsked >= updatedSession.maxQuestions || updatedSession.prompts.isEmpty()) {
                conversationState.transitionTo("memory_confirmation")
                enrichmentSession = null
                pendingMemoryDraft = updatedSession.draft
                buildSavePrompt(updatedSession.draft)
            } else {
                conversationState.transitionTo("memory_enrichment")
                val nextPrompt = updatedSession.prompts.getOrNull(updatedSession.questionsAsked)
                    ?: updatedSession.prompts.lastOrNull()
                    ?: "Anything else you'd like to add?"
                UnifiedResponse(
                    text = applyDementiaTone(nextPrompt),
                    shouldSpeak = true
                )
            }
        }

        pendingMemoryDraft?.let { draft ->
            val confirmation = handleMemoryConfirmation(trimmed, draft)
            if (confirmation != null) return confirmation
        }

        val vaultContext = getVaultContext(snapshot)
        val resolvedClarification = maybeResolveClarification(trimmed, vaultContext)
        val analysis = resolvedClarification ?: heuristicAnalyzeIntent(trimmed, vaultContext)

        if (analysis.confidence < ambiguityThreshold && analysis.intent != IntentType.Clarification) {
            val clarification = handleAmbiguity(trimmed, vaultContext)
            if (clarification != null) return clarification
        }

        if (settings.memoryDetection &&
            (analysis.intent == IntentType.Conversation || analysis.intent == IntentType.MemorySharing)) {
            val capture = captureEngine.analyzeMessage(
                trimmed,
                recentUserMessages(3),
                IntelligentCaptureEngine.CaptureSettings(
                    memoryDetection = settings.memoryDetection,
                    peopleRecognition = settings.peopleRecognition,
                    dementiaMode = settings.dementiaMode,
                    autoCapture = settings.autoCapture
                ),
                snapshot
            )
            if (capture.isMemoryWorthy && capture.draft != null) {
                if (capture.autoCapture) {
                    return saveDraftAndRespond(capture.draft)
                }
                if (capture.prompts.isNotEmpty()) {
                    conversationState.transitionTo("memory_enrichment")
                    enrichmentSession = EnrichmentSession(
                        draft = capture.draft,
                        prompts = capture.prompts,
                        questionsAsked = 0,
                        maxQuestions = capture.prompts.size.coerceAtMost(3),
                        collectedDetails = emptyList()
                    )
                    val firstPrompt = capture.prompts.first()
                    return UnifiedResponse(
                        text = applyDementiaTone(firstPrompt),
                        shouldSpeak = true
                    )
                }
                conversationState.transitionTo("memory_confirmation")
                pendingMemoryDraft = capture.draft
                return buildSavePrompt(capture.draft)
            }
        }

        val response = generateUnifiedResponse(analysis, snapshot)
        val withFollowUps = maybeAttachFollowUps(response, analysis)
        addToHistory(withFollowUps.text, "emma")
        return withFollowUps
    }

    suspend fun runProactiveIntelligence(snapshot: VaultSnapshot): UnifiedResponse? {
        if (!proactiveFeatures.enabled) return null
        if (conversationState.currentState != "idle") return null
        val now = clock()
        if (lastProactiveCheck != null && now - (lastProactiveCheck ?: 0L) < proactiveFeatures.checkIntervalMs) {
            return null
        }
        lastProactiveCheck = now
        val proactiveMessages = mutableListOf<ProactiveMessage>()
        if (proactiveFeatures.anniversaryCheck) {
            proactiveMessages.addAll(checkMemoryAnniversaries(snapshot))
        }
        if (proactiveFeatures.patternRecognition) {
            proactiveMessages.addAll(analyzeConversationPatterns(snapshot))
        }
        if (proactiveFeatures.gentlePrompts) {
            proactiveMessages.addAll(generateGentlePrompts(snapshot))
        }
        if (proactiveFeatures.relationshipInsights) {
            proactiveMessages.addAll(generateRelationshipInsights(snapshot))
        }
        val next = proactiveMessages.firstOrNull() ?: return null
        val memoryCard = next.memoryId?.let { loadMemoryById(it) }
        val payload = VoicePayload(
            proactiveType = next.type.name,
            suggestions = buildProactiveSuggestions(next),
            memoryCards = memoryCard?.let { listOf(it) }.orEmpty()
        )
        return UnifiedResponse(
            text = applyDementiaTone(next.text),
            payload = payload,
            shouldSpeak = true
        )
    }

    private suspend fun handleMemoryConfirmation(message: String, draft: MemoryDraft): UnifiedResponse? {
        val lowered = message.lowercase()
        if (looksLikeConfirmation(lowered)) {
            pendingMemoryDraft = null
            conversationState.transitionTo("idle")
            return saveDraftAndRespond(draft)
        }
        if (looksLikeDecline(lowered)) {
            pendingMemoryDraft = null
            conversationState.transitionTo("idle")
            return UnifiedResponse(
                text = applyDementiaTone("No problem. I'm here whenever you want to save a memory."),
                shouldSpeak = true
            )
        }
        pendingMemoryDraft = captureEngine.enrichDraft(draft, message)
        return buildSavePrompt(pendingMemoryDraft!!)
    }

    private fun buildSavePrompt(draft: MemoryDraft): UnifiedResponse {
        val payload = VoicePayload(memoryDraft = draft)
        return UnifiedResponse(
            text = applyDementiaTone("That sounds meaningful. Would you like me to save it?"),
            payload = payload,
            shouldSpeak = true
        )
    }

    private suspend fun saveDraftAndRespond(draft: MemoryDraft): UnifiedResponse {
        val params = JSONObject().apply {
            put("content", draft.content)
            put("title", draft.title)
            if (draft.people.isNotEmpty()) {
                put("people", JSONArray(draft.people))
            }
            if (draft.tags.isNotEmpty()) {
                put("tags", JSONArray(draft.tags))
            }
        }
        val attachments = attachmentsProvider()
        if (attachments.isNotEmpty()) {
            val attachmentJson = JSONArray()
            attachments.forEach { attachment ->
                attachmentJson.put(
                    JSONObject().apply {
                        put("name", attachment.name)
                        put("type", attachment.mime)
                        put("data", android.util.Base64.encodeToString(attachment.bytes, android.util.Base64.NO_WRAP))
                    }
                )
            }
            params.put("attachments", attachmentJson)
        }
        val result = toolExecutor.execute("create_memory_capsule", params)
        val error = result.optString("error", "").trim()
        if (error.isNotBlank()) {
            return UnifiedResponse(
                text = applyDementiaTone(error),
                shouldSpeak = true
            )
        }
        if (attachments.isNotEmpty()) {
            onAttachmentsConsumed()
        }
        val memoryId = result.optString("memoryId", "")
        val savedMemory = loadMemoryById(memoryId)
        conversationState.transitionTo("idle")
        val payload = VoicePayload(
            memoryCards = savedMemory?.let { listOf(it) }.orEmpty()
        )
        return UnifiedResponse(
            text = applyDementiaTone("Saved that memory for you."),
            payload = payload,
            shouldSpeak = true
        )
    }

    private fun generateUnifiedResponse(analysis: IntentAnalysis, snapshot: VaultSnapshot): UnifiedResponse {
        if (analysis.targetPerson != null) {
            currentContext.lastQueriedPerson = analysis.targetPerson
        }
        updateConversationState(analysis.intent)
        return when (analysis.intent) {
            IntentType.VaultQuery -> handleVaultQuery(analysis, snapshot)
            IntentType.PhotoRequest -> handlePhotoRequest()
            IntentType.MemorySharing -> UnifiedResponse(
                text = applyDementiaTone(analysis.suggestedResponse ?: "Thank you for sharing that with me."),
                shouldSpeak = true
            )
            IntentType.Confusion -> handleConfusion()
            IntentType.Greeting -> UnifiedResponse(
                text = applyDementiaTone(analysis.suggestedResponse ?: generateGreeting()),
                shouldSpeak = true
            )
            IntentType.Farewell -> UnifiedResponse(
                text = applyDementiaTone(analysis.suggestedResponse ?: generateFarewell()),
                shouldSpeak = true
            )
            IntentType.Gratitude -> UnifiedResponse(
                text = applyDementiaTone(analysis.suggestedResponse
                    ?: "You're very welcome. I'm always here for you."),
                shouldSpeak = true
            )
            IntentType.MemorySearch -> handleMemorySearch(analysis, snapshot)
            IntentType.PersonInquiry -> handlePersonInquiry(analysis, snapshot)
            IntentType.TemporalQuery -> handleTemporalQuery(analysis, snapshot)
            IntentType.EmotionQuery -> handleEmotionQuery(analysis, snapshot)
            IntentType.PeopleList -> handlePeopleList(snapshot)
            IntentType.Clarification -> UnifiedResponse(
                text = applyDementiaTone(analysis.suggestedResponse
                    ?: "Let me understand better. Can you tell me more?"),
                payload = VoicePayload(clarificationOptions = emptyList()),
                shouldSpeak = true
            )
            IntentType.MemoryEdit -> UnifiedResponse(
                text = applyDementiaTone("Which memory would you like to edit?"),
                shouldSpeak = true
            )
            IntentType.MemoryDelete -> UnifiedResponse(
                text = applyDementiaTone("Which memory would you like to remove?"),
                shouldSpeak = true
            )
            IntentType.RelationshipQuery -> UnifiedResponse(
                text = applyDementiaTone("Tell me which relationship you'd like to explore."),
                shouldSpeak = true
            )
            IntentType.Conversation -> UnifiedResponse(
                text = applyDementiaTone(
                    analysis.suggestedResponse
                        ?: "I'm here to help with your memories. What would you like to explore?"
                ),
                shouldSpeak = true
            )
        }
    }

    private fun updateConversationState(intent: IntentType) {
        val next = when (intent) {
            IntentType.Greeting,
            IntentType.Farewell,
            IntentType.Gratitude -> "social_exchange"
            IntentType.MemorySearch,
            IntentType.TemporalQuery,
            IntentType.EmotionQuery -> "search_active"
            IntentType.PersonInquiry,
            IntentType.PeopleList,
            IntentType.VaultQuery -> "person_discussion"
            IntentType.Clarification -> "confusion_recovery"
            IntentType.MemorySharing -> "memory_sharing"
            else -> "idle"
        }
        conversationState.transitionTo(next)
    }

    private fun handleMemorySearch(analysis: IntentAnalysis, snapshot: VaultSnapshot): UnifiedResponse {
        val query = analysis.searchQuery?.fullQuery?.ifBlank { analysis.searchQuery.original }
            ?: analysis.searchQuery?.original
            ?: ""
        if (query.isBlank()) {
            return UnifiedResponse(
                text = applyDementiaTone("What memory would you like me to search for?"),
                shouldSpeak = true
            )
        }
        val queryLabel = if (query.isBlank()) "that" else "\"$query\""
        val result = vectorlessEngine.processQuestion(query)
        val suggestions = result.suggestions
        if (result.memories.isNotEmpty()) {
            val payload = VoicePayload(
                memoryResults = result.memories,
                suggestions = suggestions
            )
            val responseText = result.response.takeIf { it.isNotBlank() }
                ?: "I found ${result.memories.size} ${if (result.memories.size == 1) "memory" else "memories"} about $queryLabel."
            return UnifiedResponse(
                text = applyDementiaTone(responseText),
                payload = payload,
                shouldSpeak = true
            )
        }
        val payload = if (suggestions.isNotEmpty()) VoicePayload(suggestions = suggestions) else null
        return UnifiedResponse(
            text = applyDementiaTone("I couldn't find memories about $queryLabel. Would you like to create one?"),
            payload = payload,
            shouldSpeak = true
        )
    }

    private fun handlePersonInquiry(analysis: IntentAnalysis, snapshot: VaultSnapshot): UnifiedResponse {
        val personName = analysis.targetPerson ?: return UnifiedResponse(
            text = applyDementiaTone("Which person would you like to know about?"),
            shouldSpeak = true
        )
        val person = snapshot.people.firstOrNull { it.name.equals(personName, ignoreCase = true) }
        if (person == null) {
            return UnifiedResponse(
                text = applyDementiaTone("I don't have information about $personName yet. Would you like to add them?"),
                shouldSpeak = true
            )
        }
        val memories = memoriesForPerson(person, snapshot)
        val memoryText = if (memories.isNotEmpty()) {
            "I have ${memories.size} ${if (memories.size == 1) "memory" else "memories"} about ${person.name}."
        } else {
            "I know ${person.name} is ${person.relation}, but I don't have specific memories yet."
        }
        val payload = VoicePayload(
            peopleResults = listOf(person),
            personMemories = memories
        )
        return UnifiedResponse(
            text = applyDementiaTone("${person.name}! $memoryText Would you like to explore their memories?"),
            payload = payload,
            shouldSpeak = true
        )
    }

    private fun handlePeopleList(snapshot: VaultSnapshot): UnifiedResponse {
        if (snapshot.people.isEmpty()) {
            return UnifiedResponse(
                text = applyDementiaTone("I don't have any people saved yet. Would you like to add someone?"),
                shouldSpeak = true
            )
        }
        val sorted = snapshot.people.sortedBy { it.name.lowercase() }
        val preview = sorted.take(10)
        val suggestions = buildList {
            addAll(preview.take(3).map { "Tell me about ${it.name}" })
            add("Add a new person")
            if (preview.size < sorted.size) {
                add("Show all people")
            }
        }
        val payload = VoicePayload(
            peopleResults = preview,
            suggestions = suggestions
        )
        val responseText = if (preview.size == sorted.size) {
            "You have ${sorted.size} ${if (sorted.size == 1) "person" else "people"} in your vault. Here they are."
        } else {
            "You have ${sorted.size} people in your vault. Here are a few. I can show more if you'd like."
        }
        return UnifiedResponse(
            text = applyDementiaTone(responseText),
            payload = payload,
            shouldSpeak = true
        )
    }

    private fun handleTemporalQuery(analysis: IntentAnalysis, snapshot: VaultSnapshot): UnifiedResponse {
        val range = analysis.timeRange ?: return UnifiedResponse(
            text = applyDementiaTone("Which time period should I look at?"),
            shouldSpeak = true
        )
        val memories = searchMemoriesByTime(range, snapshot.memories)
        if (memories.isNotEmpty()) {
            val payload = VoicePayload(memoryResults = memories)
            return UnifiedResponse(
                text = applyDementiaTone(
                    "I found ${memories.size} memories from ${describeTimeRange(range)}."
                ),
                payload = payload,
                shouldSpeak = true
            )
        }
        return UnifiedResponse(
            text = applyDementiaTone(
                "I couldn't find memories from ${describeTimeRange(range)}. Would you like to capture one?"
            ),
            shouldSpeak = true
        )
    }

    private fun handleEmotionQuery(analysis: IntentAnalysis, snapshot: VaultSnapshot): UnifiedResponse {
        val emotion = analysis.emotion ?: "that"
        val memories = searchMemoriesByEmotion(emotion, snapshot.memories)
        if (memories.isNotEmpty()) {
            val payload = VoicePayload(memoryResults = memories)
            return UnifiedResponse(
                text = applyDementiaTone(
                    "I found ${memories.size} ${emotion} ${if (memories.size == 1) "memory" else "memories"}."
                ),
                payload = payload,
                shouldSpeak = true
            )
        }
        return UnifiedResponse(
            text = applyDementiaTone(
                "I couldn't find any ${emotion} memories yet. Would you like to share one?"
            ),
            shouldSpeak = true
        )
    }

    private fun handleVaultQuery(analysis: IntentAnalysis, snapshot: VaultSnapshot): UnifiedResponse {
        val personName = analysis.targetPerson ?: return UnifiedResponse(
            text = applyDementiaTone("Who would you like to talk about?"),
            shouldSpeak = true
        )
        val person = snapshot.people.firstOrNull { it.name.equals(personName, ignoreCase = true) }
            ?: return UnifiedResponse(
                text = applyDementiaTone("I don't see $personName in your vault yet. Would you like to add them?"),
                shouldSpeak = true
            )
        val memories = memoriesForPerson(person, snapshot)
        val memoryText = if (memories.isNotEmpty()) {
            "I have ${memories.size} memories about them."
        } else {
            "I don't see any memories with them yet."
        }
        val payload = VoicePayload(
            peopleResults = listOf(person),
            personMemories = memories
        )
        return UnifiedResponse(
            text = applyDementiaTone(
                "${person.name} is ${person.relation}. $memoryText Would you like me to share what I know?"
            ),
            payload = payload,
            shouldSpeak = true
        )
    }

    private fun handlePhotoRequest(): UnifiedResponse {
        return UnifiedResponse(
            text = applyDementiaTone(
                "I'd love to help you add photos. You can share them from your gallery anytime."
            ),
            shouldSpeak = true
        )
    }

    private fun handleConfusion(): UnifiedResponse {
        val person = currentContext.lastQueriedPerson
        return UnifiedResponse(
            text = applyDementiaTone(
                if (person != null) {
                    "I'm sorry if I confused you. You were telling me about $person. Would you like to continue?"
                } else {
                    "I'm here to help. What would you like to talk about?"
                }
            ),
            shouldSpeak = true
        )
    }

    private fun maybeAttachFollowUps(response: UnifiedResponse, analysis: IntentAnalysis): UnifiedResponse {
        if (!shouldGenerateFollowUps(analysis)) return response
        val followUps = generateFollowUpQuestions(analysis).filter { it.isNotBlank() }
        if (followUps.isEmpty()) return response
        val payload = response.payload ?: VoicePayload()
        val merged = payload.copy(
            suggestions = (payload.suggestions + followUps).distinct()
        )
        return response.copy(payload = merged)
    }

    private fun shouldGenerateFollowUps(analysis: IntentAnalysis): Boolean {
        val skip = setOf(IntentType.Greeting, IntentType.Farewell, IntentType.Gratitude, IntentType.Clarification)
        if (analysis.intent in skip) return false
        if (analysis.confidence < 0.5) return false
        if (followUpQuestions.isNotEmpty()) {
            followUpQuestions.clear()
            return false
        }
        val intents = setOf(
            IntentType.MemorySharing,
            IntentType.PersonInquiry,
            IntentType.TemporalQuery,
            IntentType.EmotionQuery,
            IntentType.MemorySearch,
            IntentType.VaultQuery
        )
        return analysis.intent in intents
    }

    private fun generateFollowUpQuestions(analysis: IntentAnalysis): List<String> {
        return when (analysis.intent) {
            IntentType.MemorySharing -> listOf(
                "What made that moment special?",
                "Who else was there with you?",
                "How did it make you feel?"
            )
            IntentType.PersonInquiry -> analysis.targetPerson?.let { person ->
                listOf(
                    "What's your favorite memory with $person?",
                    "When did you last see $person?",
                    "What makes $person special to you?"
                )
            } ?: emptyList()
            IntentType.TemporalQuery -> listOf(
                "What stands out most from that time?",
                "Are there specific moments you'd like to remember?",
                "Would you like to add photos from then?"
            )
            IntentType.EmotionQuery -> listOf(
                "Tell me more about those feelings.",
                "What contributed to feeling that way?",
                "Would you like to capture more about that time?"
            )
            IntentType.MemorySearch -> listOf(
                "Would you like me to show you any of these?",
                "Shall we refine the search?",
                "Is there something specific you're looking for?"
            )
            else -> listOf(
                "Tell me more about that.",
                "What else would you like to share?",
                "I'd love to hear more details."
            )
        }
    }

    private fun handleAmbiguity(
        message: String,
        vaultContext: VaultContext
    ): UnifiedResponse? {
        val interpretations = generateInterpretations(message, vaultContext)
        if (interpretations.isEmpty()) {
            return UnifiedResponse(
                text = applyDementiaTone(
                    "I want to make sure I understand. Could you tell me a bit more about what you're looking for?"
                ),
                shouldSpeak = true
            )
        }
        pendingClarifications = interpretations
        val payload = VoicePayload(clarificationOptions = interpretations)
        val optionsList = interpretations.joinToString(separator = "\n") { "- $it" }
        return UnifiedResponse(
            text = applyDementiaTone("Did you mean:\n$optionsList"),
            payload = payload,
            requiresResponse = true,
            shouldSpeak = true
        )
    }

    private fun generateInterpretations(message: String, vaultContext: VaultContext): List<String> {
        val interpretations = mutableListOf<String>()
        val lowered = message.lowercase()
        val mentionedPeople = vaultContext.peopleNames.filter { lowered.contains(it.lowercase()) }
        if (mentionedPeople.isNotEmpty()) {
            mentionedPeople.forEach { person ->
                interpretations.add("I want to know about $person")
                interpretations.add("I want to share a memory with $person")
            }
        }
        if (listOf("yesterday", "last", "ago", "when").any { lowered.contains(it) }) {
            interpretations.add("I want to explore memories from a specific time")
        }
        if (listOf("show", "find", "where").any { lowered.contains(it) }) {
            interpretations.add("I want to search for specific memories")
        }
        return interpretations.distinct().take(3)
    }

    private fun maybeResolveClarification(
        message: String,
        vaultContext: VaultContext
    ): IntentAnalysis? {
        val normalized = normalizeClarification(message)
        val optionMatch = pendingClarifications.firstOrNull {
            normalizeClarification(it) == normalized
        }
        val parsed = parseClarificationIntent(optionMatch ?: message, vaultContext)
        if (parsed != null) {
            pendingClarifications = emptyList()
            return parsed
        }
        if (pendingClarifications.isNotEmpty() && normalized.isNotBlank()) {
            pendingClarifications = emptyList()
        }
        return null
    }

    private fun parseClarificationIntent(
        message: String,
        vaultContext: VaultContext
    ): IntentAnalysis? {
        val lowered = message.lowercase().trim()
        if (lowered.contains("share a memory") || lowered.contains("share memory")) {
            val person = extractPersonName(lowered, vaultContext) ?: extractPhraseAfter(message, "with")
            val target = person?.trim()?.takeIf { it.isNotBlank() }
            val prompt = if (target != null) {
                "I'd love to hear about that memory with $target. What happened?"
            } else {
                "I'd love to hear about that memory. What happened?"
            }
            return IntentAnalysis(
                intent = IntentType.MemorySharing,
                confidence = 0.9,
                targetPerson = target,
                suggestedResponse = prompt
            )
        }
        if (lowered.startsWith("i want to know about") ||
            lowered.startsWith("i want to learn about") ||
            lowered.startsWith("i want to know more about")
        ) {
            val person = extractPersonName(lowered, vaultContext) ?: extractPhraseAfter(message, "about")
            return IntentAnalysis(
                intent = IntentType.PersonInquiry,
                confidence = 0.9,
                targetPerson = person?.trim()?.takeIf { it.isNotBlank() }
            )
        }
        if (lowered.contains("explore memories from a specific time") ||
            lowered.contains("explore memories from a time")
        ) {
            return IntentAnalysis(
                intent = IntentType.TemporalQuery,
                confidence = 0.85
            )
        }
        if (lowered.contains("search for specific memories") ||
            lowered.contains("search for memories")
        ) {
            return IntentAnalysis(
                intent = IntentType.MemorySearch,
                confidence = 0.85,
                searchQuery = SearchQuery(original = "", keywords = emptyList(), fullQuery = "")
            )
        }
        return null
    }

    private fun normalizeClarification(text: String): String {
        return text.trim().lowercase().replace("\\s+".toRegex(), " ")
    }

    private fun extractPhraseAfter(message: String, keyword: String): String? {
        val regex = Regex("\\b${Regex.escape(keyword)}\\s+(.+)$", RegexOption.IGNORE_CASE)
        return regex.find(message)
            ?.groupValues
            ?.getOrNull(1)
            ?.trim()
            ?.trimEnd('.', '?', '!')
    }

    private fun heuristicAnalyzeIntent(message: String, vaultContext: VaultContext): IntentAnalysis {
        val lower = message.lowercase().trim()
        if (detectGreeting(lower)) {
            return IntentAnalysis(
                intent = IntentType.Greeting,
                confidence = 0.95,
                suggestedResponse = generateGreeting(),
                recommendedActions = listOf("welcome")
            )
        }
        if (detectFarewell(lower)) {
            return IntentAnalysis(
                intent = IntentType.Farewell,
                confidence = 0.95,
                suggestedResponse = generateFarewell(),
                recommendedActions = listOf("goodbye")
            )
        }
        if (detectGratitude(lower)) {
            return IntentAnalysis(
                intent = IntentType.Gratitude,
                confidence = 0.95,
                suggestedResponse = "You're so welcome! I'm always here for you.",
                recommendedActions = listOf("acknowledgment")
            )
        }
        if (detectMisunderstanding(lower)) {
            return IntentAnalysis(
                intent = IntentType.Clarification,
                confidence = 0.9,
                suggestedResponse = "I'm sorry, let me understand better. Can you tell me more?",
                recommendedActions = listOf("clarification_request")
            )
        }
        if (detectMemoryEdit(lower)) {
            return IntentAnalysis(intent = IntentType.MemoryEdit, confidence = 0.85)
        }
        if (detectMemoryDelete(lower)) {
            return IntentAnalysis(intent = IntentType.MemoryDelete, confidence = 0.85)
        }
        if (detectPeopleList(lower)) {
            return IntentAnalysis(
                intent = IntentType.PeopleList,
                confidence = 0.9,
                recommendedActions = listOf("list_people")
            )
        }
        if (detectMemorySearch(lower)) {
            return IntentAnalysis(
                intent = IntentType.MemorySearch,
                confidence = 0.85,
                searchQuery = extractSearchQuery(message, lower),
                recommendedActions = listOf("execute_search", "display_results")
            )
        }
        if (detectPersonInquiry(lower, vaultContext)) {
            val targetPerson = extractPersonName(lower, vaultContext)
            return IntentAnalysis(
                intent = IntentType.PersonInquiry,
                confidence = 0.9,
                targetPerson = targetPerson,
                recommendedActions = listOf("show_person_details", "list_memories")
            )
        }
        if (detectTemporalQuery(lower)) {
            return IntentAnalysis(
                intent = IntentType.TemporalQuery,
                confidence = 0.85,
                timeRange = extractTimeRange(lower),
                recommendedActions = listOf("search_by_date", "show_timeline")
            )
        }
        if (detectEmotionQuery(lower)) {
            return IntentAnalysis(
                intent = IntentType.EmotionQuery,
                confidence = 0.85,
                emotion = extractEmotion(lower),
                recommendedActions = listOf("search_by_emotion", "show_mood_memories")
            )
        }
        if (lower.contains("who") && vaultContext.peopleNames.any { lower.contains(it.lowercase()) }) {
            val targetPerson = vaultContext.peopleNames.firstOrNull { lower.contains(it.lowercase()) }
            return IntentAnalysis(
                intent = IntentType.VaultQuery,
                confidence = 0.9,
                targetPerson = targetPerson,
                recommendedActions = listOf("show_person")
            )
        }
        if (detectPhotoRequest(lower)) {
            return IntentAnalysis(
                intent = IntentType.PhotoRequest,
                confidence = 0.9,
                targetPerson = currentContext.lastQueriedPerson,
                recommendedActions = listOf("trigger_photo_upload")
            )
        }
        if (currentContext.lastQueriedPerson != null && isLikelyMemorySharing(lower)) {
            val person = currentContext.lastQueriedPerson
            return IntentAnalysis(
                intent = IntentType.MemorySharing,
                confidence = 0.8,
                targetPerson = person,
                memoryContent = message,
                suggestedResponse = generateMemoryValidation(message, person)
            )
        }
        return IntentAnalysis(
            intent = IntentType.Conversation,
            confidence = 0.5,
            suggestedResponse = "I'm here to help with your memories. What would you like to explore?"
        )
    }

    private fun detectGreeting(lower: String): Boolean {
        val greetings = listOf("hello", "hi", "hey", "good morning", "good afternoon", "good evening", "howdy")
        return greetings.any { lower == it || lower.startsWith(it) }
    }

    private fun detectFarewell(lower: String): Boolean {
        val farewells = listOf("goodbye", "bye", "see you", "farewell", "good night", "take care", "talk later")
        return farewells.any { lower.contains(it) }
    }

    private fun detectGratitude(lower: String): Boolean {
        val gratitudes = listOf("thank you", "thanks", "thank", "appreciate", "grateful")
        return gratitudes.any { lower.contains(it) }
    }

    private fun detectMisunderstanding(lower: String): Boolean {
        val keywords = listOf("not what i meant", "that's wrong", "actually", "i meant", "confused")
        return keywords.any { lower.contains(it) } && lower.length < 120
    }

    private fun detectMemoryEdit(lower: String): Boolean {
        val editKeywords = listOf("edit", "change", "modify", "update", "fix", "correct")
        val memoryKeywords = listOf("memory", "that", "this", "it")
        return editKeywords.any { lower.contains(it) } && memoryKeywords.any { lower.contains(it) }
    }

    private fun detectMemoryDelete(lower: String): Boolean {
        val deleteKeywords = listOf("delete", "remove", "erase", "get rid of")
        val memoryKeywords = listOf("memory", "that", "this", "it")
        return deleteKeywords.any { lower.contains(it) } && memoryKeywords.any { lower.contains(it) }
    }

    private fun detectMemorySearch(lower: String): Boolean {
        if (lower.contains("remember when") || lower.startsWith("i remember") || lower.startsWith("we remember")) {
            return false
        }
        val memoryKeywords = listOf("memory", "memories", "remember")
        val searchKeywords = listOf(
            "show",
            "find",
            "search",
            "look for",
            "list",
            "see",
            "view",
            "tell me",
            "what",
            "when",
            "where",
            "who"
        )
        val directPhrases = listOf(
            "show me memories",
            "list memories",
            "find memories",
            "memories about",
            "memories with",
            "memories from",
            "memory list",
            "memory search"
        )
        return (memoryKeywords.any { lower.contains(it) } && searchKeywords.any { lower.contains(it) }) ||
            directPhrases.any { lower.contains(it) }
    }

    private fun detectPersonInquiry(lower: String, vaultContext: VaultContext): Boolean {
        val inquiryKeywords = listOf(
            "tell me about",
            "who is",
            "who was",
            "who's",
            "what about",
            "how about",
            "show me",
            "info on",
            "information about"
        )
        val person = extractPersonName(lower, vaultContext)
        val hasPerson = person != null
        val relationMentioned = detectRelationQuery(lower, vaultContext)
        if (!hasPerson && !relationMentioned) return false
        val cleaned = lower.replace("?", "").trim()
        val directNameOnly = person != null && cleaned == person.lowercase()
        return inquiryKeywords.any { lower.contains(it) } || directNameOnly
    }

    private fun detectTemporalQuery(lower: String): Boolean {
        val timeKeywords = listOf(
            "yesterday", "last week", "last month", "last year",
            "this week", "this month", "this year",
            "summer", "winter", "spring", "fall", "autumn",
            "january", "february", "march", "april", "may", "june",
            "july", "august", "september", "october", "november", "december"
        )
        return timeKeywords.any { lower.contains(it) } &&
            (lower.contains("show") || lower.contains("find") || lower.contains("what") || lower.contains("when"))
    }

    private fun detectEmotionQuery(lower: String): Boolean {
        val emotions = listOf(
            "happy",
            "sad",
            "joyful",
            "peaceful",
            "angry",
            "frustrated",
            "excited",
            "calm",
            "anxious",
            "grateful",
            "proud",
            "nostalgic",
            "lonely",
            "worried"
        )
        val queryKeywords = listOf(
            "when was i",
            "show me",
            "find",
            "memories when",
            "memories about",
            "times i felt",
            "times i feel",
            "when i felt",
            "when i feel"
        )
        return emotions.any { lower.contains(it) } && queryKeywords.any { lower.contains(it) }
    }

    private fun detectPeopleList(lower: String): Boolean {
        val hints = listOf(
            "show people",
            "show my people",
            "list people",
            "people list",
            "my people",
            "all people",
            "my contacts",
            "my family",
            "my friends",
            "who are my people",
            "all my people",
            "people in my vault",
            "family list",
            "friends list",
            "contacts list"
        )
        if (hints.any { lower.contains(it) }) return true
        if (lower.contains("people") || lower.contains("contacts") || lower.contains("family") || lower.contains("friends")) {
            return listOf("show", "list", "who", "view", "see", "my", "all").any { lower.contains(it) }
        }
        return false
    }

    private fun detectRelationQuery(lower: String, vaultContext: VaultContext): Boolean {
        if (vaultContext.peopleRelations.isEmpty()) return false
        val relationKeywords = listOf(
            "mom",
            "mother",
            "dad",
            "father",
            "sister",
            "brother",
            "aunt",
            "uncle",
            "grandma",
            "grandmother",
            "grandpa",
            "grandfather",
            "wife",
            "husband",
            "partner",
            "spouse",
            "daughter",
            "son",
            "child"
        )
        val match = relationKeywords.firstOrNull { lower.contains(it) } ?: return false
        return vaultContext.peopleRelations.keys.any { relation ->
            relation.contains(match) || match.contains(relation)
        }
    }

    private fun detectPhotoRequest(lower: String): Boolean {
        val addWords = listOf("add", "upload", "share", "yes")
        val photoWords = listOf("photo", "picture", "image")
        return addWords.any { lower.contains(it) } && photoWords.any { lower.contains(it) }
    }

    private fun isLikelyMemorySharing(lowerMessage: String): Boolean {
        val trimmed = lowerMessage.trim()
        if (trimmed.isBlank()) return false
        val shortReplies = setOf(
            "yes",
            "no",
            "ok",
            "okay",
            "sure",
            "maybe",
            "thanks",
            "thank you",
            "please",
            "alright"
        )
        if (trimmed.length <= 6 && shortReplies.contains(trimmed)) return false
        val memoryIndicators = listOf(
            "remember",
            "when i",
            "we went",
            "i was",
            "we were",
            "we had",
            "i had",
            "we saw",
            "i saw",
            "visited",
            "celebrated",
            "always",
            "usually",
            "back then",
            "growing up"
        )
        val hasIndicators = memoryIndicators.any { trimmed.contains(it) }
        val hasPastTense = Regex("\\b(remember|was|were|went|had|did|saw|felt)\\b")
            .containsMatchIn(trimmed)
        val hasStoryLength = trimmed.length >= 25 && (hasPastTense || trimmed.contains(" i "))
        return hasIndicators || hasStoryLength
    }

    private fun generateMemoryValidation(message: String, person: String?): String {
        val target = person ?: "them"
        return "That sounds like a special memory with $target. I love hearing moments like that. What else do you remember?"
    }

    private fun findPersonByRelation(
        lower: String,
        relations: Map<String, List<String>>
    ): String? {
        if (relations.isEmpty()) return null
        val relationKeywords = listOf(
            "mom",
            "mother",
            "dad",
            "father",
            "sister",
            "brother",
            "aunt",
            "uncle",
            "grandma",
            "grandmother",
            "grandpa",
            "grandfather",
            "wife",
            "husband",
            "partner",
            "spouse",
            "daughter",
            "son",
            "child"
        )
        val match = relationKeywords.firstOrNull { lower.contains(it) } ?: return null
        val relation = relations.keys.firstOrNull { key ->
            key.contains(match) || match.contains(key)
        } ?: return null
        val names = relations[relation].orEmpty()
        return if (names.size == 1) names.first() else null
    }

    private data class NameMatch(
        val name: String,
        val score: Double
    )

    private fun rankNameMatches(text: String, names: List<String>): List<NameMatch> {
        if (names.isEmpty()) return emptyList()
        val lowered = text.lowercase()
        val tokens = lowered.split(Regex("\\s+"))
            .map { it.trim() }
            .filter { it.length > 1 && it !in setOf("tell", "me", "about", "who", "is", "was", "show", "people", "person", "my", "the", "a", "an", "please") }
        if (tokens.isEmpty()) return emptyList()
        return names.mapNotNull { name ->
            val nameLower = name.lowercase()
            if (nameLower.isBlank()) return@mapNotNull null
            val nameTokens = nameLower.split(Regex("\\s+")).filter { it.isNotBlank() }
            var score = 0.0
            if (lowered.contains(nameLower)) {
                score += 1.2
            }
            tokens.forEach { token ->
                if (nameLower == token) {
                    score += 1.0
                } else if (nameTokens.any { it == token }) {
                    score += 0.9
                } else if (nameTokens.any { it.startsWith(token) }) {
                    score += 0.6
                } else if (nameTokens.any { it.contains(token) }) {
                    score += 0.4
                } else if (nameLower.contains(token)) {
                    score += 0.2
                }
            }
            val normalized = score / nameTokens.size.coerceAtLeast(1)
            NameMatch(name = name, score = normalized)
        }
            .sortedByDescending { it.score }
            .filter { it.score >= 0.55 }
    }

    private fun extractSearchQuery(original: String, lower: String): SearchQuery {
        val stop = setOf("show", "me", "find", "search", "for", "the", "a", "an", "memories", "about", "with", "from")
        val words = lower.split(Regex("\\s+")).filter { it.length > 2 && it !in stop }
        return SearchQuery(original = original, keywords = words, fullQuery = words.joinToString(" "))
    }

    private fun extractPersonName(lower: String, vaultContext: VaultContext): String? {
        val direct = vaultContext.peopleNames.firstOrNull { lower.contains(it.lowercase()) }
        if (direct != null) return direct
        val relationMatch = findPersonByRelation(lower, vaultContext.peopleRelations)
        if (relationMatch != null) return relationMatch
        val matches = rankNameMatches(lower, vaultContext.peopleNames)
        if (matches.isEmpty()) return null
        if (matches.size > 1 && matches[1].score >= matches[0].score - 0.08) return null
        return matches.first().name
    }

    private fun extractTimeRange(lower: String): TimeRange {
        return when {
            lower.contains("yesterday") -> TimeRange(TimeRangeType.Relative, value = "yesterday")
            lower.contains("last week") -> TimeRange(TimeRangeType.Relative, value = "last_week")
            lower.contains("last month") -> TimeRange(TimeRangeType.Relative, value = "last_month")
            lower.contains("last year") -> TimeRange(TimeRangeType.Relative, value = "last_year")
            else -> {
                val yearMatch = Regex("\\b(19\\d{2}|20\\d{2})\\b").find(lower)
                if (yearMatch != null) {
                    TimeRange(TimeRangeType.Year, year = yearMatch.value.toInt())
                } else {
                    val seasons = listOf("summer", "winter", "spring", "fall", "autumn")
                    val season = seasons.firstOrNull { lower.contains(it) }
                    if (season != null) {
                        TimeRange(TimeRangeType.Season, value = season)
                    } else {
                        TimeRange(TimeRangeType.Unknown, value = lower)
                    }
                }
            }
        }
    }

    private fun extractEmotion(lower: String): String {
        val emotions = listOf(
            "happy",
            "sad",
            "joyful",
            "peaceful",
            "angry",
            "frustrated",
            "excited",
            "calm",
            "anxious",
            "grateful",
            "proud",
            "nostalgic",
            "lonely",
            "worried",
            "relaxed",
            "surprised",
            "scared",
            "afraid"
        )
        return emotions.firstOrNull { lower.contains(it) } ?: "neutral"
    }

    private fun generateGreeting(): String {
        val greetings = listOf(
            "Hello! I'm Emma, your memory companion. What would you like to explore today?",
            "Hi there! I'm here to help you treasure your precious memories.",
            "Good to see you! What memories shall we talk about today?"
        )
        return greetings.random()
    }

    private fun generateFarewell(): String {
        val farewells = listOf(
            "Take care! Your memories are safe with me. See you soon!",
            "Goodbye! I'll be here whenever you want to explore more memories.",
            "See you later! Thank you for sharing these moments with me."
        )
        return farewells.random()
    }

    private fun memoriesForPerson(person: PersonRecord, snapshot: VaultSnapshot): List<MemoryRecord> {
        return snapshot.memories.filter { memory ->
            resolvePeopleIdsForMemory(memory, snapshot.people).contains(person.id)
        }
    }

    private fun searchMemoriesByTime(timeRange: TimeRange, memories: List<MemoryRecord>): List<MemoryRecord> {
        val now = Instant.now()
        return memories.filter { memory ->
            val date = parseInstant(memory.created ?: memory.updated) ?: return@filter false
            when (timeRange.type) {
                TimeRangeType.Relative -> when (timeRange.value) {
                    "yesterday" -> date.atZone(java.time.ZoneId.systemDefault()).toLocalDate()
                        .isEqual(now.minusSeconds(86400).atZone(java.time.ZoneId.systemDefault()).toLocalDate())
                    "last_week" -> date.isAfter(now.minusSeconds(7 * 86400))
                    "last_month" -> date.isAfter(now.minusSeconds(30 * 86400))
                    "last_year" -> date.isAfter(now.minusSeconds(365 * 86400))
                    else -> false
                }
                TimeRangeType.Year -> timeRange.year != null &&
                    date.atZone(java.time.ZoneId.systemDefault()).year == timeRange.year
                TimeRangeType.Season -> matchesSeason(timeRange.value, date)
                TimeRangeType.Unknown -> false
            }
        }
    }

    private fun searchMemoriesByEmotion(emotion: String, memories: List<MemoryRecord>): List<MemoryRecord> {
        val lowered = emotion.lowercase()
        val aliases = when (lowered) {
            "happy" -> listOf("joyful", "excited", "glad", "delighted", "cheerful")
            "sad" -> listOf("lonely", "down", "blue", "tearful")
            "angry" -> listOf("mad", "frustrated", "irritated")
            "frustrated" -> listOf("angry", "annoyed", "irritated")
            "anxious" -> listOf("worried", "nervous", "stressed")
            "calm" -> listOf("peaceful", "relaxed")
            "peaceful" -> listOf("calm", "relaxed")
            "grateful" -> listOf("thankful", "appreciative")
            "proud" -> listOf("accomplished")
            "nostalgic" -> listOf("remembering", "reminiscent")
            else -> emptyList()
        }
        val tokens = (listOf(lowered) + aliases).distinct()
        return memories.filter { memory ->
            val tags = (memory.tags + memory.metadata?.tags.orEmpty()).map { it.lowercase() }
            val text = buildMemorySearchText(memory)
            tokens.any { token ->
                tags.any { it.contains(token) } || text.contains(token)
            }
        }
    }

    private fun buildMemorySearchText(memory: MemoryRecord): String {
        val parts = mutableListOf<String>()
        fun add(value: String?) {
            if (!value.isNullOrBlank()) parts.add(value)
        }
        add(memory.title)
        add(memory.body)
        add(memory.content)
        add(memory.summary)
        add(memory.metadata?.summary)
        memory.responses.forEach { add(it) }
        memory.metadata?.responses?.forEach { add(it) }
        return parts.joinToString(" ").lowercase()
    }

    private fun describeTimeRange(timeRange: TimeRange): String {
        return when (timeRange.type) {
            TimeRangeType.Relative -> timeRange.value?.replace('_', ' ') ?: "that time"
            TimeRangeType.Year -> "the year ${timeRange.year}"
            TimeRangeType.Season -> timeRange.value ?: "that season"
            TimeRangeType.Unknown -> "that time"
        }
    }

    private fun matchesSeason(season: String?, date: Instant): Boolean {
        val month = date.atZone(java.time.ZoneId.systemDefault()).monthValue
        return when (season) {
            "summer" -> month in 6..8
            "winter" -> month == 12 || month <= 2
            "spring" -> month in 3..5
            "fall", "autumn" -> month in 9..11
            else -> false
        }
    }

    private fun looksLikeConfirmation(lowered: String): Boolean {
        val yesWords = listOf("yes", "save", "sure", "please", "ok", "okay", "do it", "go ahead")
        return yesWords.any { lowered.contains(it) }
    }

    private fun looksLikeDecline(lowered: String): Boolean {
        val noWords = listOf("no", "not now", "later", "don't", "do not", "maybe later")
        return noWords.any { lowered.contains(it) }
    }

    private fun recentUserMessages(count: Int): List<String> {
        return conversationHistory.filter { it.sender == "user" }
            .takeLast(count)
            .map { it.message }
    }

    private fun loadMemoryById(memoryId: String?): MemoryRecord? {
        if (memoryId.isNullOrBlank()) return null
        val snapshot = VaultSnapshotBuilder.build(toolExecutor.repository)
        return snapshot.memories.firstOrNull { it.id == memoryId }
    }

    private fun applyDementiaTone(text: String): String {
        if (!settings.dementiaMode) return text
        val trimmed = text.trim()
        val suffix = " I'm right here with you."
        return if (trimmed.endsWith(".") || trimmed.endsWith("!") || trimmed.endsWith("?")) {
            trimmed + suffix
        } else {
            "$trimmed.$suffix"
        }
    }

    private fun addToHistory(message: String, sender: String) {
        conversationHistory.addLast(ConversationTurn(sender, message, clock()))
        if (conversationHistory.size > 20) conversationHistory.removeFirst()
    }

    private fun trackConversationPatterns(message: String, people: List<PersonRecord>) {
        people.forEach { person ->
            if (message.contains(person.name, ignoreCase = true)) {
                val count = conversationPatterns.frequentPeople.getOrDefault(person.name, 0)
                conversationPatterns.frequentPeople[person.name] = count + 1
                conversationPatterns.lastMentioned[person.name] = clock()
            }
        }
    }

    private fun checkMemoryAnniversaries(snapshot: VaultSnapshot): List<ProactiveMessage> {
        val today = Instant.now().atZone(java.time.ZoneId.systemDefault()).toLocalDate()
        val targetYears = listOf(1, 5, 10, 20, 25, 30)
        val messages = mutableListOf<ProactiveMessage>()
        snapshot.memories.forEach { memory ->
            val date = parseInstant(memory.created ?: memory.updated) ?: return@forEach
            val localDate = date.atZone(java.time.ZoneId.systemDefault()).toLocalDate()
            val yearsDiff = today.year - localDate.year
            if (localDate.month == today.month && localDate.dayOfMonth == today.dayOfMonth &&
                targetYears.contains(yearsDiff)
            ) {
                val preview = memory.body.ifBlank { memory.content.orEmpty() }.take(80)
                messages.add(
                    ProactiveMessage(
                        type = ProactiveType.Anniversary,
                        priority = if (yearsDiff == 1) Priority.High else Priority.Medium,
                        text = "$yearsDiff years ago today: \"$preview...\" Would you like to revisit this memory?",
                        memoryId = memory.id,
                        yearsAgo = yearsDiff
                    )
                )
            }
        }
        anniversaries.clear()
        anniversaries.addAll(messages)
        return messages
    }

    private fun analyzeConversationPatterns(snapshot: VaultSnapshot): List<ProactiveMessage> {
        val messages = mutableListOf<ProactiveMessage>()
        val lastCheck = lastProactiveCheck ?: 0L
        val daysSinceCheck = (clock() - lastCheck) / (1000 * 60 * 60 * 24)
        if (daysSinceCheck < 7) return emptyList()
        snapshot.people.forEach { person ->
            val lastMentioned = conversationPatterns.lastMentioned[person.name] ?: 0L
            val daysSinceMention = if (lastMentioned == 0L) 999 else {
                (clock() - lastMentioned) / (1000 * 60 * 60 * 24)
            }
            if (daysSinceMention >= 14) {
                messages.add(
                    ProactiveMessage(
                        type = ProactiveType.GentlePrompt,
                        priority = Priority.Low,
                        text = "I noticed you haven't mentioned ${person.name} in a while. Would you like to share a memory?",
                        personName = person.name,
                        daysSince = daysSinceMention.toInt()
                    )
                )
            }
        }
        return messages
    }

    private fun generateGentlePrompts(snapshot: VaultSnapshot): List<ProactiveMessage> {
        if (conversationHistory.isEmpty()) return emptyList()
        val lastMessage = conversationHistory.last()
        val hoursSince = (clock() - lastMessage.timestamp) / (1000 * 60 * 60)
        if (hoursSince !in 24..72) return emptyList()
        val recentMemories = snapshot.memories.filter { memory ->
            val date = parseInstant(memory.created ?: memory.updated) ?: return@filter false
            date.isAfter(Instant.now().minusSeconds(7 * 86400))
        }
        return when {
            recentMemories.isEmpty() -> listOf(
                ProactiveMessage(
                    type = ProactiveType.GentlePrompt,
                    priority = Priority.Low,
                    text = "It's been a little while. Have any special moments you'd like to remember?"
                )
            )
            recentMemories.size < 3 -> listOf(
                ProactiveMessage(
                    type = ProactiveType.GentlePrompt,
                    priority = Priority.Low,
                    text = "I'd love to hear what you've been up to lately. Any moments worth remembering?"
                )
            )
            else -> emptyList()
        }
    }

    private fun generateRelationshipInsights(snapshot: VaultSnapshot): List<ProactiveMessage> {
        val messages = mutableListOf<ProactiveMessage>()
        val memoryCountByPerson = mutableMapOf<String, Int>()
        val recentCountByPerson = mutableMapOf<String, Int>()
        val recentThreshold = Instant.now().minusSeconds(7 * 86400)
        var untaggedCount = 0
        snapshot.memories.forEach { memory ->
            val ids = resolvePeopleIdsForMemory(memory, snapshot.people)
            if (ids.isEmpty()) {
                untaggedCount += 1
            }
            ids.forEach { id ->
                memoryCountByPerson[id] = (memoryCountByPerson[id] ?: 0) + 1
            }
            val memoryInstant = parseInstant(memory.created ?: memory.updated)
            if (memoryInstant != null && memoryInstant.isAfter(recentThreshold)) {
                ids.forEach { id ->
                    recentCountByPerson[id] = (recentCountByPerson[id] ?: 0) + 1
                }
            }
        }
        snapshot.people.forEach { person ->
            val count = memoryCountByPerson[person.id] ?: 0
            if (count >= 10 && count % 10 == 0) {
                messages.add(
                    ProactiveMessage(
                        type = ProactiveType.RelationshipInsight,
                        priority = Priority.Medium,
                        text = "You have $count wonderful memories with ${person.name}. They must be very special.",
                        personName = person.name
                    )
                )
            }
            val recentCount = recentCountByPerson[person.id] ?: 0
            if (recentCount >= 3) {
                messages.add(
                    ProactiveMessage(
                        type = ProactiveType.RelationshipInsight,
                        priority = Priority.Medium,
                        text = "I notice you've been spending a lot of time with ${person.name} lately. That sounds wonderful.",
                        personName = person.name
                    )
                )
            }
        }
        if (untaggedCount >= 5) {
            messages.add(
                ProactiveMessage(
                    type = ProactiveType.EnrichmentSuggestion,
                    priority = Priority.Low,
                    text = "You have $untaggedCount memories without people tagged yet. Would you like to add anyone to make them more meaningful?"
                )
            )
        }
        insights.clear()
        insights.addAll(messages)
        return messages
    }

    private fun buildProactiveSuggestions(message: ProactiveMessage): List<String> {
        return when (message.type) {
            ProactiveType.Anniversary -> listOf(
                "Show that memory",
                "Share a reflection",
                "Not now"
            )
            ProactiveType.GentlePrompt -> listOf(
                "Share a memory",
                "Maybe later",
                "Not now"
            )
            ProactiveType.RelationshipInsight -> listOfNotNull(
                message.personName?.let { "Show memories with $it" } ?: "Show related memories",
                "Add a new memory",
                "Not now"
            )
            ProactiveType.EnrichmentSuggestion -> listOf(
                "Add people to memories",
                "Maybe later",
                "Not now"
            )
        }
    }

    private fun parseInstant(value: String?): Instant? {
        if (value.isNullOrBlank()) return null
        return runCatching { Instant.parse(value) }.getOrNull()
    }

    private data class ConversationTurn(
        val sender: String,
        val message: String,
        val timestamp: Long
    )

    private data class ConversationContext(
        var lastQueriedPerson: String? = null
    )

    private data class EnrichmentSession(
        val draft: MemoryDraft,
        val prompts: List<String>,
        val questionsAsked: Int,
        val maxQuestions: Int,
        val collectedDetails: List<String>
    )

    private data class ConversationPatterns(
        val frequentPeople: MutableMap<String, Int> = mutableMapOf(),
        val lastMentioned: MutableMap<String, Long> = mutableMapOf()
    )

    private data class ProactiveFeatures(
        val enabled: Boolean = true,
        val anniversaryCheck: Boolean = true,
        val patternRecognition: Boolean = true,
        val gentlePrompts: Boolean = true,
        val relationshipInsights: Boolean = true,
        val checkIntervalMs: Long = 1000 * 60 * 60
    )
}
