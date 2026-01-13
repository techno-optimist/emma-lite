package com.yourorg.emma.nativeapp.voice

import com.yourorg.emma.nativeapp.settings.SettingsPreferences
import com.yourorg.emma.nativeapp.vault.MemoryRecord
import com.yourorg.emma.nativeapp.vault.PersonRecord
import com.yourorg.emma.nativeapp.vault.VaultRepository
import com.yourorg.emma.nativeapp.vault.buildMemorySummary
import kotlinx.coroutines.flow.first
import java.time.Instant

data class OfflineResponse(
    val text: String,
    val shouldSpeak: Boolean = true
)

class OfflineEmmaResponder(
    private val repository: VaultRepository,
    private val settingsPreferences: SettingsPreferences
) {
    suspend fun respondTo(input: String): OfflineResponse {
        val trimmed = input.trim()
        if (trimmed.isBlank()) {
            return OfflineResponse("I'm here whenever you're ready.")
        }

        val settings = settingsPreferences.state.first()
        val snapshot = VaultSnapshotBuilder.build(repository)
        val lowered = trimmed.lowercase()

        if (isGreeting(lowered)) {
            return OfflineResponse(withGentleSuffix("Hello. I'm here with you.", settings.dementiaMode))
        }

        if (isGratitude(lowered)) {
            return OfflineResponse(withGentleSuffix("You're welcome. I'm glad to help.", settings.dementiaMode))
        }

        if (settings.peopleRecognition) {
            val peopleListResponse = respondToPeopleList(lowered, snapshot.people, settings.dementiaMode)
            if (peopleListResponse != null) {
                return OfflineResponse(peopleListResponse)
            }
            val peopleResponse = respondToPeopleInquiry(lowered, snapshot.people, settings.dementiaMode)
            if (peopleResponse != null) {
                return OfflineResponse(peopleResponse)
            }
        }

        if (settings.memoryDetection) {
            val captureResponse = handleMemoryCapture(lowered, trimmed, settings.dementiaMode)
            if (captureResponse != null) {
                return captureResponse
            }

            val memoryResponse = respondToMemorySearch(lowered, snapshot.memories, settings.dementiaMode)
            if (memoryResponse != null) {
                return OfflineResponse(memoryResponse)
            }
        }

        return OfflineResponse(withGentleSuffix("I'm offline right now, but I'm listening.", settings.dementiaMode))
    }

    private fun isGreeting(text: String): Boolean {
        return GREETINGS.any { text.contains(it) }
    }

    private fun isGratitude(text: String): Boolean {
        return GRATITUDE.any { text.contains(it) }
    }

    private fun respondToPeopleInquiry(
        text: String,
        people: List<PersonRecord>,
        dementiaMode: Boolean
    ): String? {
        if (people.isEmpty()) return null
        val nameMatches = people.filter { person ->
            val name = person.name.trim()
            name.isNotBlank() && text.contains(name.lowercase())
        }
        if (nameMatches.isNotEmpty()) {
            val person = nameMatches.first()
            val relation = person.relation.ifBlank { "someone important to you" }
            val details = person.contact?.takeIf { it.isNotBlank() }
            val base = if (details != null) {
                "${person.name} is $relation. $details"
            } else {
                "${person.name} is $relation."
            }
            return withGentleSuffix(base, dementiaMode)
        }

        val relationMatch = RELATION_KEYWORDS.firstOrNull { text.contains(it) }
        if (relationMatch != null) {
            val matchedPeople = people.filter { person ->
                person.relation.equals(relationMatch, ignoreCase = true) ||
                    person.relation.lowercase().contains(relationMatch)
            }
            if (matchedPeople.isNotEmpty()) {
                val names = matchedPeople.joinToString(", ") { it.name }
                val base = "I have $names listed as $relationMatch."
                return withGentleSuffix(base, dementiaMode)
            }
        }

        if (text.contains("who is") || text.contains("tell me about") || text.contains("who's")) {
            return withGentleSuffix("I can help with people if you tell me a name.", dementiaMode)
        }
        return null
    }

    private fun respondToPeopleList(
        text: String,
        people: List<PersonRecord>,
        dementiaMode: Boolean
    ): String? {
        if (!looksLikePeopleListQuery(text)) return null
        if (people.isEmpty()) {
            return withGentleSuffix(
                "I don't have any people saved yet. Would you like to add someone?",
                dementiaMode
            )
        }
        val preview = people
            .sortedBy { it.name.lowercase() }
            .take(6)
            .map { person ->
                val name = person.name.ifBlank { "Unknown" }
                val relation = person.relation.ifBlank { "" }
                if (relation.isBlank() || relation.equals("other", ignoreCase = true)) {
                    name
                } else {
                    "$name ($relation)"
                }
            }
        val remaining = (people.size - preview.size).coerceAtLeast(0)
        val suffix = if (remaining > 0) " and $remaining more." else "."
        return withGentleSuffix(
            "Here are the people in your vault: ${preview.joinToString(", ")}$suffix",
            dementiaMode
        )
    }

    private suspend fun handleMemoryCapture(
        lowered: String,
        original: String,
        dementiaMode: Boolean
    ): OfflineResponse? {
        if (shouldAutoSave(lowered)) {
            val title = deriveTitle(original)
            repository.addMemory(title, original)
            val message = withGentleSuffix("Saved that as a memory.", dementiaMode)
            return OfflineResponse(message)
        }
        if (looksLikeMemoryNarrative(lowered)) {
            val message = withGentleSuffix(
                "That sounds meaningful. I can save it as a memory whenever you want.",
                dementiaMode
            )
            return OfflineResponse(message)
        }
        return null
    }

    private fun respondToMemorySearch(
        lowered: String,
        memories: List<MemoryRecord>,
        dementiaMode: Boolean
    ): String? {
        if (!looksLikeSearchQuery(lowered)) return null
        if (memories.isEmpty()) {
            return withGentleSuffix(
                "You don't have any memories saved yet. Would you like to add one?",
                dementiaMode
            )
        }

        val tokens = extractMemoryTokens(lowered)
        if (tokens.isEmpty()) {
            return formatMemoryList(memories, dementiaMode)
        }

        val matches = rankMemories(tokens, memories)
        if (matches.isEmpty()) {
            return withGentleSuffix("I couldn't find a memory for that yet.", dementiaMode)
        }

        val previews = matches.take(3).map { memory ->
            val title = memory.title.ifBlank { "Untitled memory" }
            val summary = memory.summary
                ?: memory.metadata?.summary
                ?: buildMemorySummary(memory.body.ifBlank { memory.content.orEmpty() })
                ?: ""
            if (summary.isBlank()) title else "$title: $summary"
        }
        val response = "Here are a few memories I found: " + previews.joinToString(" | ")
        return withGentleSuffix(response, dementiaMode)
    }

    private fun rankMemories(query: String, memories: List<MemoryRecord>): List<MemoryRecord> {
        val tokens = extractMemoryTokens(query)
        return rankMemories(tokens, memories)
    }

    private fun rankMemories(tokens: List<String>, memories: List<MemoryRecord>): List<MemoryRecord> {
        if (tokens.isEmpty()) return emptyList()
        return memories.map { memory ->
            val haystack = buildMemorySearchText(memory)
            val score = tokens.count { token -> haystack.contains(token) }
            memory to score
        }
            .filter { it.second > 0 }
            .sortedWith(
                compareByDescending<Pair<MemoryRecord, Int>> { it.second }
                    .thenByDescending { parseTimestamp(it.first.updated ?: it.first.created) }
            )
            .map { it.first }
    }

    private fun buildMemorySearchText(memory: MemoryRecord): String {
        val parts = listOf(
            memory.title,
            memory.body,
            memory.content,
            memory.summary,
            memory.metadata?.summary
        ).filterNot { it.isNullOrBlank() }
        return parts.joinToString(" ").lowercase()
    }

    private fun extractMemoryTokens(query: String): List<String> {
        return query.split(Regex("\\s+"))
            .map { it.trim().lowercase() }
            .filter { it.length > 2 && it !in MEMORY_STOP_WORDS }
    }

    private fun formatMemoryList(memories: List<MemoryRecord>, dementiaMode: Boolean): String {
        val sorted = memories.sortedByDescending { memory ->
            parseTimestamp(memory.updated ?: memory.created)
        }
        val previews = sorted.take(3).map { memory ->
            val title = memory.title.ifBlank { memory.metadata?.title.orEmpty() }.ifBlank { "Untitled memory" }
            val summary = memory.summary
                ?: memory.metadata?.summary
                ?: buildMemorySummary(memory.body.ifBlank { memory.content.orEmpty() })
                ?: ""
            if (summary.isBlank()) title else "$title: $summary"
        }
        val remaining = (sorted.size - previews.size).coerceAtLeast(0)
        val suffix = if (remaining > 0) " And $remaining more." else "."
        return withGentleSuffix(
            "Here are a few recent memories: ${previews.joinToString(" | ")}$suffix",
            dementiaMode
        )
    }

    private fun looksLikeSearchQuery(text: String): Boolean {
        return SEARCH_HINTS.any { text.contains(it) }
    }

    private fun looksLikePeopleListQuery(text: String): Boolean {
        if (PEOPLE_LIST_HINTS.any { text.contains(it) }) return true
        if (text.contains("people") || text.contains("contacts") || text.contains("family") || text.contains("friends")) {
            return listOf("show", "list", "who", "view", "see", "my", "all").any { text.contains(it) }
        }
        return false
    }

    private fun shouldAutoSave(text: String): Boolean {
        return SAVE_HINTS.any { text.contains(it) }
    }

    private fun looksLikeMemoryNarrative(text: String): Boolean {
        if (text.length < 24) return false
        val hasSubject = text.contains(" i ") || text.contains(" we ") || text.contains(" my ")
        val hasStoryVerb = STORY_VERBS.any { text.contains(" $it ") }
        return hasSubject && hasStoryVerb
    }

    private fun deriveTitle(text: String): String {
        val cleaned = text.replace("\\s+".toRegex(), " ").trim()
        if (cleaned.isBlank()) return "New Memory"
        return cleaned.split(" ").take(6).joinToString(" ")
    }

    private fun parseTimestamp(value: String?): Long {
        if (value.isNullOrBlank()) return 0L
        return runCatching { Instant.parse(value).toEpochMilli() }.getOrDefault(0L)
    }

    private fun withGentleSuffix(text: String, dementiaMode: Boolean): String {
        return if (dementiaMode) "$text I'm right here with you." else text
    }

    companion object {
        private val GREETINGS = listOf(
            "hello",
            "hi ",
            "hey",
            "good morning",
            "good afternoon",
            "good evening"
        )
        private val GRATITUDE = listOf("thank", "thanks", "appreciate")
        private val SEARCH_HINTS = listOf("remember", "memory", "memories", "show me", "find", "look up", "tell me about")
        private val SAVE_HINTS = listOf("save this", "remember this", "add a memory", "store this", "save it")
        private val STORY_VERBS = listOf("went", "met", "saw", "visited", "shared", "celebrated", "had", "was", "were")
        private val PEOPLE_LIST_HINTS = listOf(
            "show people",
            "show my people",
            "list people",
            "people list",
            "my people",
            "all people",
            "my contacts",
            "my family",
            "my friends"
        )
        private val MEMORY_STOP_WORDS = setOf(
            "about",
            "ask",
            "find",
            "list",
            "look",
            "memory",
            "memories",
            "recent",
            "remember",
            "search",
            "show",
            "tell",
            "your",
            "you",
            "my",
            "me"
        )
        private val RELATION_KEYWORDS = listOf(
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
            "grandfather"
        )
    }
}
