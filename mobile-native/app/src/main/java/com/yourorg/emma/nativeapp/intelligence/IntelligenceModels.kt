package com.yourorg.emma.nativeapp.intelligence

import com.yourorg.emma.nativeapp.voice.VoicePayload

enum class IntentType {
    VaultQuery,
    MemorySharing,
    PhotoRequest,
    Conversation,
    Confusion,
    MemorySearch,
    PersonInquiry,
    RelationshipQuery,
    TemporalQuery,
    EmotionQuery,
    PeopleList,
    Clarification,
    MemoryEdit,
    MemoryDelete,
    Gratitude,
    Greeting,
    Farewell
}

enum class EmotionalTone {
    Positive,
    Neutral,
    Confused,
    Sad
}

data class SearchQuery(
    val original: String,
    val keywords: List<String>,
    val fullQuery: String
)

enum class TimeRangeType { Relative, Year, Season, Unknown }

data class TimeRange(
    val type: TimeRangeType,
    val value: String? = null,
    val year: Int? = null
)

data class IntentAnalysis(
    val intent: IntentType,
    val confidence: Double,
    val targetPerson: String? = null,
    val memoryContent: String? = null,
    val searchQuery: SearchQuery? = null,
    val timeRange: TimeRange? = null,
    val emotion: String? = null,
    val emotionalTone: EmotionalTone = EmotionalTone.Neutral,
    val suggestedResponse: String? = null,
    val recommendedActions: List<String> = emptyList(),
    val stateTransition: String? = null
)

data class VaultContext(
    val memoryCount: Int,
    val peopleCount: Int,
    val peopleNames: List<String>,
    val recentTopics: List<String>,
    val peopleRelations: Map<String, List<String>> = emptyMap()
)

data class UnifiedResponse(
    val text: String,
    val payload: VoicePayload? = null,
    val requiresResponse: Boolean = false,
    val shouldSpeak: Boolean = true
)

enum class ProactiveType {
    Anniversary,
    GentlePrompt,
    RelationshipInsight,
    EnrichmentSuggestion
}

enum class Priority { High, Medium, Low }

data class ProactiveMessage(
    val type: ProactiveType,
    val priority: Priority,
    val text: String,
    val memoryId: String? = null,
    val personName: String? = null,
    val yearsAgo: Int? = null,
    val daysSince: Int? = null
)
