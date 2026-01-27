package com.yourorg.emma.nativeapp.intelligence

import com.yourorg.emma.nativeapp.voice.MemoryDraft
import com.yourorg.emma.nativeapp.voice.VaultSnapshot
import com.yourorg.emma.nativeapp.vault.MemoryRecord
import java.time.Instant
class VectorlessEngine(
    private var options: VectorlessOptions = VectorlessOptions()
) {
    private var snapshot: VaultSnapshot? = null

    fun updateOptions(update: VectorlessOptions) {
        options = update
    }

    fun loadVault(snapshot: VaultSnapshot?) {
        this.snapshot = snapshot
    }

    fun analyzeVaultStructure(): VaultAnalysis {
        val memories = snapshot?.memories.orEmpty()
        val people = snapshot?.people.orEmpty()
        val categories = mutableSetOf<String>()
        val emotions = mutableSetOf<String>()
        val tags = mutableSetOf<String>()
        var earliest: Instant? = null
        var latest: Instant? = null
        val emotionKeywords = setOf(
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
            "hopeful",
            "lonely"
        )

        memories.forEach { memory ->
            memory.metadata?.tags?.forEach { tags.add(it) }
            memory.tags.forEach { tags.add(it) }
            memory.metadata?.category
                ?.trim()
                ?.takeIf { it.isNotBlank() }
                ?.let { categories.add(it.lowercase()) }
            val content = buildMemorySearchText(memory)
            if (content.contains("family")) categories.add("family")
            if (content.contains("work") || content.contains("job")) categories.add("work")
            if (content.contains("travel") || content.contains("vacation")) categories.add("travel")
            if (content.contains("birthday") || content.contains("celebration")) categories.add("celebrations")
            if (content.contains("photo") || content.contains("picture")) categories.add("photos")
            val memoryTags = (memory.tags + memory.metadata?.tags.orEmpty())
                .map { it.trim().lowercase() }
                .filter { it.isNotBlank() }
            memoryTags.forEach { tag ->
                if (tag in emotionKeywords) {
                    emotions.add(tag)
                }
            }
            emotionKeywords.forEach { emotion ->
                if (content.contains(emotion)) {
                    emotions.add(emotion)
                }
            }
            val memoryInstant = parseInstant(memory.created)
            if (memoryInstant != null) {
                if (earliest == null || memoryInstant.isBefore(earliest)) earliest = memoryInstant
                if (latest == null || memoryInstant.isAfter(latest)) latest = memoryInstant
            }
        }

        return VaultAnalysis(
            memoryCount = memories.size,
            peopleCount = people.size,
            categories = categories.toList(),
            emotions = emotions.toList(),
            tags = tags.toList(),
            earliest = earliest,
            latest = latest,
            peopleNames = people.mapNotNull { it.name.trim().takeIf { name -> name.isNotBlank() } }
        )
    }

    fun processQuestion(question: String): VectorlessResult {
        val memories = snapshot?.memories.orEmpty()
        if (memories.isEmpty()) {
            return VectorlessResult(
                success = false,
                response = fallbackResponse(),
                memories = emptyList(),
                suggestions = fallbackSuggestions()
            )
        }

        val selected = heuristicSelectCollections(question, memories)
        val relevant = heuristicDetectRelevance(question, selected)
        if (relevant.isEmpty()) {
            return VectorlessResult(
                success = true,
                response = fallbackResponse(),
                memories = emptyList(),
                suggestions = fallbackSuggestions()
            )
        }

        val response = heuristicGenerateResponse(question, relevant)
        val suggestions = generateSuggestions(relevant)
        return VectorlessResult(
            success = true,
            response = response,
            memories = relevant,
            suggestions = suggestions
        )
    }

    fun analyzeMemoryPotential(content: String): MemoryPotential {
        val trimmed = content.trim()
        if (trimmed.isBlank()) return MemoryPotential(score0to10 = 0.0, rationale = "empty")
        val firstPerson = Regex("\\b(I|I'm|I was|we|we were|my|our)\\b", RegexOption.IGNORE_CASE)
        val pastTense = Regex("\\b(remember|was|were|had|did|went|came|saw|felt|thought)\\b", RegexOption.IGNORE_CASE)
        val temporal = Regex("\\b(yesterday|years?\\s+ago|last\\s+(week|month|year))\\b", RegexOption.IGNORE_CASE)
        val lengthScore = (trimmed.length / 120.0).coerceAtMost(4.0)
        val score = (
            (if (firstPerson.containsMatchIn(trimmed)) 3.0 else 0.0) +
                (if (pastTense.containsMatchIn(trimmed)) 3.0 else 0.0) +
                (if (temporal.containsMatchIn(trimmed)) 2.0 else 0.0) +
                lengthScore
        ).coerceAtMost(10.0)
        return MemoryPotential(score0to10 = score, rationale = "heuristic")
    }

    fun generateTitle(content: String): String? {
        val cleaned = content.replace("\\s+".toRegex(), " ").trim()
        if (cleaned.isBlank()) return null
        return cleaned.split(" ").take(6).joinToString(" ")
    }

    fun generateMemoryPrompts(draft: MemoryDraft): List<String> {
        val prompts = mutableListOf<String>()
        if (draft.people.isNotEmpty()) {
            prompts.add("Tell me more about ${draft.people.first()}.")
        }
        if (draft.emotions.isNotEmpty()) {
            prompts.add("How did that make you feel?")
        }
        prompts.add("What made this moment special?")
        return prompts.take(3)
    }

    fun calculateRelevance(query: String, memory: MemoryRecord): Double {
        val queryLower = query.lowercase()
        val content = memory.body.ifBlank { memory.content.orEmpty() }.lowercase()
        val title = memory.title.lowercase()
        val tags = (memory.tags + memory.metadata?.tags.orEmpty()).joinToString(" ").lowercase()
        var score = 0.0
        if (title.contains(queryLower)) score += 1.0
        if (content.contains(queryLower)) score += 0.7
        if (tags.contains(queryLower)) score += 0.8
        val queryWords = queryLower.split(Regex("\\s+")).filter { it.isNotBlank() }
        if (queryWords.isNotEmpty()) {
            val matchCount = queryWords.count { word ->
                content.contains(word) || title.contains(word) || tags.contains(word)
            }
            score += (matchCount.toDouble() / queryWords.size) * 0.5
        }
        return score.coerceAtMost(1.0)
    }

    private fun heuristicSelectCollections(question: String, memories: List<MemoryRecord>): List<MemoryRecord> {
        val keywords = extractKeywords(question)
        if (keywords.isEmpty()) return memories.take(options.maxMemories / 2)
        return memories.map { memory ->
            val content = buildMemorySearchText(memory)
            val title = memory.title.lowercase()
            val tags = (memory.tags + memory.metadata?.tags.orEmpty()).joinToString(" ").lowercase()
            val score = keywords.sumOf { keyword ->
                (if (title.contains(keyword)) 3 else 0) +
                    (if (content.contains(keyword)) 2 else 0) +
                    (if (tags.contains(keyword)) 1 else 0)
            }
            memory to score
        }
            .sortedByDescending { it.second }
            .take((options.maxMemories / 2).coerceAtMost(15))
            .filter { it.second > 0 }
            .map { it.first }
    }

    private fun heuristicDetectRelevance(question: String, selected: List<MemoryRecord>): List<MemoryRecord> {
        if (selected.isEmpty()) return emptyList()
        val keywords = extractKeywords(question)
        return selected.map { memory ->
            val content = buildMemorySearchText(memory)
            val title = memory.title.lowercase()
            var score = 0
            keywords.forEach { keyword ->
                if (title == keyword) score += 5
                else if (title.contains(keyword)) score += 3
                if (content.contains(keyword)) {
                    val matches = Regex(keyword).findAll(content).count()
                    score += (matches * 2).coerceAtMost(10)
                }
            }
            val daysSince = daysSince(memory.updated ?: memory.created)
            if (daysSince in 0..30) score += 1
            memory to score
        }
            .sortedByDescending { it.second }
            .filter { it.second > 0 }
            .take(8)
            .map { it.first }
    }

    private fun heuristicGenerateResponse(question: String, memories: List<MemoryRecord>): String {
        val topMemory = memories.firstOrNull()
        val count = memories.size
        val memoryPhrase = if (count == 1) "memory" else "memories"
        val builder = StringBuilder("I found $count $memoryPhrase that might help. ")
        if (topMemory != null) {
            val title = topMemory.title.ifBlank { "one of your memories" }
            builder.append("The most relevant is \"$title\". ")
            val snippet = topMemory.body.ifBlank { topMemory.content.orEmpty() }
            if (snippet.isNotBlank()) {
                val preview = snippet.take(150).trim()
                builder.append("Here's what you captured: \"${preview}${if (snippet.length > 150) "..." else ""}\" ")
            }
        }
        return builder.toString().trim()
    }

    private fun generateSuggestions(memories: List<MemoryRecord>): List<String> {
        val suggestions = mutableListOf<String>()
        val topMemory = memories.firstOrNull()
        if (topMemory != null) {
            if (topMemory.people.isNotEmpty()) {
                suggestions.add("Tell me more about the people in this memory")
            }
            val tags = topMemory.tags + topMemory.metadata?.tags.orEmpty()
            if (tags.isNotEmpty()) {
                suggestions.add("Show me other memories about ${tags.first()}")
            }
        }
        suggestions.add("Add more details to this memory")
        val generic = listOf(
            "Browse your memory gallery",
            "Capture a new memory",
            "Explore your relationships",
            "View your memory timeline"
        )
        generic.forEach { option ->
            if (suggestions.size >= 3) return@forEach
            if (!suggestions.contains(option)) suggestions.add(option)
        }
        return suggestions.take(3)
    }

    private fun fallbackResponse(): String {
        val fallbacks = listOf(
            "I'd love to help you explore that topic. It looks like there aren't memories about this yet.",
            "That's a thoughtful question. I don't see memories for that yet, but I'm here to help you capture them.",
            "I couldn't find a memory for that, but we can create one together."
        )
        return fallbacks.random()
    }

    private fun fallbackSuggestions(): List<String> {
        return listOf(
            "Try asking about specific people or events",
            "Browse your memory gallery",
            "Add more memories to your vault"
        )
    }

    private fun extractKeywords(text: String): List<String> {
        val stop = setOf("show", "me", "find", "search", "for", "the", "a", "an", "memories", "about", "with", "from")
        return text.lowercase().split(Regex("\\s+"))
            .map { it.trim() }
            .filter { it.length > 2 && it !in stop }
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

    private fun parseInstant(value: String?): Instant? {
        if (value.isNullOrBlank()) return null
        return runCatching { Instant.parse(value) }.getOrNull()
    }

    private fun daysSince(value: String?): Long {
        val instant = parseInstant(value) ?: return Long.MAX_VALUE
        val now = Instant.now()
        return runCatching { (now.toEpochMilli() - instant.toEpochMilli()) / (1000 * 60 * 60 * 24) }
            .getOrDefault(Long.MAX_VALUE)
    }
}

data class VectorlessOptions(
    val maxMemories: Int = 50,
    val dementiaMode: Boolean = false,
    val debug: Boolean = false
)

data class VaultAnalysis(
    val memoryCount: Int,
    val peopleCount: Int,
    val categories: List<String>,
    val emotions: List<String>,
    val tags: List<String>,
    val earliest: Instant?,
    val latest: Instant?,
    val peopleNames: List<String>
)

data class MemoryPotential(
    val score0to10: Double,
    val rationale: String
)

data class VectorlessResult(
    val success: Boolean,
    val response: String,
    val memories: List<MemoryRecord>,
    val suggestions: List<String>
)
