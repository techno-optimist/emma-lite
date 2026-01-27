package com.yourorg.emma.nativeapp.intelligence

import com.yourorg.emma.nativeapp.voice.MemoryDraft
import com.yourorg.emma.nativeapp.voice.VaultSnapshot
import com.yourorg.emma.nativeapp.vault.MemoryRecord
import java.time.Instant
import kotlin.math.max
import kotlin.math.min

class IntelligentCaptureEngine(
    private val vectorlessEngine: VectorlessEngine
) {
    data class CaptureSettings(
        val memoryDetection: Boolean,
        val peopleRecognition: Boolean,
        val dementiaMode: Boolean,
        val autoCapture: Boolean
    )

    data class MemorySignals(
        var score: Int = 0,
        val types: MutableList<String> = mutableListOf(),
        val emotions: MutableList<String> = mutableListOf(),
        val people: MutableList<String> = mutableListOf(),
        val milestones: MutableList<String> = mutableListOf(),
        val knownPeople: MutableList<String> = mutableListOf()
    )

    data class CaptureAnalysis(
        val isMemoryWorthy: Boolean,
        val autoCapture: Boolean,
        val confidence: Int,
        val finalScore: Double,
        val draft: MemoryDraft? = null,
        val prompts: List<String> = emptyList()
    )

    private val thresholds = Thresholds(
        memoryWorthy = 0.25,
        autoCapture = 0.55
    )

    fun analyzeMessage(
        message: String,
        contextMessages: List<String>,
        settings: CaptureSettings,
        snapshot: VaultSnapshot
    ): CaptureAnalysis {
        val content = message.trim()
        if (content.isBlank() || !settings.memoryDetection) {
            return CaptureAnalysis(isMemoryWorthy = false, autoCapture = false, confidence = 0, finalScore = 0.0)
        }

        val signals = detectMemorySignals(content, settings.peopleRecognition)
        if (settings.peopleRecognition) {
            val knownPeople = detectKnownPeople(content, snapshot)
            if (knownPeople.isNotEmpty()) {
                signals.knownPeople.addAll(knownPeople)
                signals.people.addAll(knownPeople)
            }
        }
        val contextBoost = detectContextBoost(contextMessages.joinToString(" "))
        signals.score += contextBoost

        val heuristicsScore = calculateHeuristicsScore(content, signals)
        val aiAnalysis = vectorlessEngine.analyzeMemoryPotential(content)
        val llmScore = if (aiAnalysis.rationale != "heuristic") {
            normalizeScore(aiAnalysis.score0to10)
        } else {
            0.0
        }
        val noveltyPenalty = calculateNoveltyPenalty(content, snapshot.memories)
        val finalScore = if (llmScore > 0.0) {
            clamp01(0.6 * llmScore + 0.3 * heuristicsScore - 0.1 * noveltyPenalty)
        } else {
            clamp01(0.8 * heuristicsScore - 0.1 * noveltyPenalty)
        }
        val isMemoryWorthy = finalScore >= thresholds.memoryWorthy
        val autoCapture = settings.autoCapture && finalScore >= thresholds.autoCapture

        if (!isMemoryWorthy) {
            return CaptureAnalysis(
                isMemoryWorthy = false,
                autoCapture = false,
                confidence = (finalScore * 100).toInt(),
                finalScore = finalScore
            )
        }

        val draft = buildMemoryDraft(content, signals, settings)
        val prompts = buildPrompts(draft, signals, settings.dementiaMode)
        return CaptureAnalysis(
            isMemoryWorthy = true,
            autoCapture = autoCapture,
            confidence = (finalScore * 100).toInt(),
            finalScore = finalScore,
            draft = draft,
            prompts = prompts
        )
    }

    fun enrichDraft(draft: MemoryDraft, response: String): MemoryDraft {
        val details = extractKeyDetails(response)
        val updatedContent = buildString {
            append(draft.content.trim())
            if (details.isNotEmpty()) {
                append(" ")
                append(details.joinToString(" "))
            }
        }.trim()
        val newPeople = extractPeopleNames(listOf(response))
        val newEmotions = extractEmotions(response)
        return draft.copy(
            content = updatedContent,
            people = (draft.people + newPeople).distinct(),
            emotions = (draft.emotions + newEmotions).distinct()
        )
    }

    private fun detectMemorySignals(content: String, peopleRecognition: Boolean): MemorySignals {
        val signals = MemorySignals()
        val lowered = content.lowercase()

        val milestonePatterns = listOf(
            "first time",
            "learned to",
            "finally did",
            "finally made",
            "finally achieved",
            "graduated",
            "birthday",
            "anniversary",
            "passed away",
            "was born",
            "got married",
            "got engaged",
            "new job",
            "new house",
            "new baby",
            "almost died",
            "almost killed",
            "almost lost",
            "survived",
            "recovered",
            "adventure",
            "story about",
            "reminded me",
            "remember when",
            "was little",
            "used to",
            "would always",
            "growing up",
            "as a kid"
        )
        milestonePatterns.forEach { pattern ->
            if (lowered.contains(pattern)) {
                signals.score += 3
                signals.types.add("milestone")
                signals.milestones.add(pattern)
            }
        }

        val petPatterns = listOf("pet", "dog", "cat", "puppy", "kitten")
        petPatterns.forEach { pattern ->
            if (lowered.contains(pattern)) {
                signals.score += 3
                signals.types.add("pet")
                signals.milestones.add(pattern)
            }
        }

        val emotionalWords = mapOf(
            "high" to listOf(
                "amazing",
                "incredible",
                "wonderful",
                "terrible",
                "devastating",
                "perfect",
                "worst",
                "best",
                "special",
                "precious"
            ),
            "medium" to listOf(
                "happy",
                "sad",
                "excited",
                "proud",
                "worried",
                "grateful",
                "disappointed",
                "nostalgic",
                "anxious",
                "lonely",
                "peaceful",
                "calm",
                "joyful",
                "surprised"
            ),
            "low" to listOf("nice", "good", "okay", "fine")
        )
        emotionalWords.forEach { (level, words) ->
            words.forEach { word ->
                if (lowered.contains(word)) {
                    signals.score += when (level) {
                        "high" -> 3
                        "medium" -> 2
                        else -> 1
                    }
                    signals.emotions.add(word)
                }
            }
        }

        if (peopleRecognition) {
            val peoplePatterns = listOf(
                "\\b(mom|dad|mother|father|parent)\\b",
                "\\b(son|daughter|child|children|kids?)\\b",
                "\\b(husband|wife|spouse|partner)\\b",
                "\\b(grandma|grandpa|grandmother|grandfather)\\b",
                "\\b(sister|brother|sibling)\\b",
                "\\b(friend|best friend)\\b",
                "\\b(he|she|they)\\s+(was|were|used to|would)\\b"
            )
            peoplePatterns.forEach { pattern ->
                val matches = Regex(pattern, RegexOption.IGNORE_CASE).findAll(content).map { it.value }
                matches.forEach { match ->
                    signals.score += 2
                    signals.people.add(match)
                }
            }

            val properNames = extractProperNames(content)
            if (properNames.isNotEmpty()) {
                properNames.forEach { name -> signals.people.add(name) }
                signals.score += properNames.size.coerceAtMost(2)
            }
        }

        val temporalPatterns = listOf(
            "yesterday",
            "today",
            "last week",
            "last month",
            "last year",
            "years ago",
            "decades ago",
            "when i was",
            "as a kid",
            "growing up",
            "in high school",
            "in college",
            "back then",
            "age "
        )
        temporalPatterns.forEach { pattern ->
            if (lowered.contains(pattern)) {
                signals.score += 1
                signals.types.add("temporal")
            }
        }

        return signals
    }

    private fun detectKnownPeople(content: String, snapshot: VaultSnapshot): List<String> {
        if (snapshot.people.isEmpty()) return emptyList()
        val lowered = content.lowercase()
        return snapshot.people.mapNotNull { person ->
            val name = person.name.trim()
            if (name.isBlank()) return@mapNotNull null
            if (lowered.contains(name.lowercase())) name else null
        }.distinct()
    }

    private fun detectContextBoost(contextText: String): Int {
        if (contextText.isBlank()) return 0
        val patterns = listOf(
            "remember",
            "back then",
            "when i was",
            "last year",
            "last summer",
            "used to",
            "growing up",
            "in high school",
            "in college",
            "years ago",
            "mom",
            "dad",
            "grand"
        )
        val hits = patterns.count { contextText.lowercase().contains(it) }
        return min(3, hits)
    }

    private fun calculateHeuristicsScore(content: String, signals: MemorySignals): Double {
        var score = 0.0
        val lowered = content.lowercase()
        val firstPersonMatches = Regex("\\b(I|I'm|I was|we|we were|my|our)\\b", RegexOption.IGNORE_CASE)
            .findAll(content).count()
        if (firstPersonMatches > 0) {
            score += min(0.4, 0.35 + (firstPersonMatches - 1) * 0.05)
        }

        val pastTenseHits = listOf(
            "\\bremember\\b",
            "\\bwas\\b",
            "\\bwere\\b",
            "\\bhad\\b",
            "\\bdid\\b",
            "\\bwent\\b",
            "\\bused to\\b",
            "\\b\\w+ed\\b",
            "\\bback then\\b"
        ).count { Regex(it, RegexOption.IGNORE_CASE).containsMatchIn(content) }
        score += min(0.25, pastTenseHits * 0.08)

        val temporalHits = listOf(
            "\\bwhen i was\\b",
            "\\byesterday\\b",
            "\\byears? ago\\b",
            "\\blast (week|month|year)\\b",
            "\\bgrowing up\\b",
            "\\bas a kid\\b",
            "\\bin (high school|college)\\b"
        ).count { Regex(it, RegexOption.IGNORE_CASE).containsMatchIn(content) }
        score += min(0.25, temporalHits * 0.08)

        val eventHits = listOf(
            "fell",
            "hit",
            "hurt",
            "accident",
            "happened",
            "story",
            "time",
            "moment",
            "climbing",
            "playing",
            "running",
            "walking",
            "going",
            "tree",
            "house",
            "park",
            "hospital",
            "doctor"
        ).count { lowered.contains(it) }
        score += min(0.15, eventHits * 0.05)

        val intentHits = listOf(
            "\\b(save|remember|memory|capture|record)\\b",
            "\\b(want to|need to|should)\\s+(save|remember|capture|record)\\b"
        ).count { Regex(it, RegexOption.IGNORE_CASE).containsMatchIn(content) }
        if (intentHits > 0) {
            score += 0.30
        }

        val knownPeopleCount = signals.knownPeople.distinct().size
        if (knownPeopleCount > 0) {
            score += min(0.50, 0.30 + (knownPeopleCount - 1) * 0.10)
        }

        if (content.length > 50) score += 0.10
        if (content.length > 20) score += 0.05

        score += min(0.2, signals.score / 12.0)
        return clamp01(score)
    }

    private fun calculateNoveltyPenalty(content: String, memories: List<MemoryRecord>): Double {
        if (memories.isEmpty()) return 0.0
        val tokens = tokenize(content)
        val best = memories.maxOfOrNull { memory ->
            val memoryTokens = tokenize(buildMemoryText(memory))
            jaccard(tokens, memoryTokens)
        } ?: 0.0
        return if (best >= 0.6) 0.2 else if (best >= 0.45) 0.1 else 0.0
    }

    private fun buildMemoryDraft(content: String, signals: MemorySignals, settings: CaptureSettings): MemoryDraft {
        val title = vectorlessEngine.generateTitle(content) ?: deriveTitle(content)
        val enriched = enrichContent(content)
        val people = if (settings.peopleRecognition) extractPeopleNames(signals.people) else emptyList()
        val tags = buildTags(content, signals)
        val importance = when {
            signals.score >= 7 -> "high"
            signals.score >= 4 -> "medium"
            else -> "low"
        }
        return MemoryDraft(
            title = title,
            content = enriched,
            people = people,
            emotions = signals.emotions.distinct(),
            tags = tags,
            dateLabel = extractDateLabel(content),
            location = extractLocation(content),
            importance = importance,
            confidence = min(100, max(10, signals.score * 8)),
            sourceText = content
        )
    }

    private fun buildPrompts(draft: MemoryDraft, signals: MemorySignals, dementiaMode: Boolean): List<String> {
        if (dementiaMode) {
            return listOf(
                "That sounds wonderful. Tell me more.",
                "How did that make you feel?",
                "Who else was there with you?"
            )
        }

        val prompts = mutableListOf<String>()
        if (draft.people.isNotEmpty()) {
            prompts.add("Tell me more about ${draft.people.first()}.")
        }
        if (signals.emotions.isNotEmpty()) {
            prompts.add("You mentioned feeling ${signals.emotions.first()}. Can you tell me more?")
        }
        if (signals.types.contains("milestone")) {
            prompts.add("This sounds important. What led up to it?")
        }
        if (prompts.isEmpty()) {
            prompts.addAll(
                listOf(
                    "What made this moment special?",
                    "Who else was there?",
                    "Is there anything else you want to remember?"
                )
            )
        }
        return prompts.take(3)
    }

    private fun buildTags(content: String, signals: MemorySignals): List<String> {
        val tags = mutableSetOf<String>()
        if (signals.types.contains("milestone")) tags.add("milestone")
        if (signals.types.contains("pet")) tags.add("pet")
        signals.emotions.forEach { tags.add(it) }
        if (content.lowercase().contains("family")) tags.add("family")
        if (content.lowercase().contains("travel")) tags.add("travel")
        return tags.toList()
    }

    private fun extractPeopleNames(rawPeople: List<String>): List<String> {
        val names = mutableSetOf<String>()
        rawPeople.forEach { person ->
            val cleaned = cleanPersonName(person)
            if (cleaned.isNotBlank()) names.add(cleaned)
        }
        return names.toList()
    }

    private fun cleanPersonName(person: String): String {
        return person.replace(Regex("\\b(my|the|our)\\b", RegexOption.IGNORE_CASE), "")
            .replace(Regex("[,\\.]"), "")
            .trim()
            .replaceFirstChar { it.uppercase() }
    }

    private fun extractProperNames(text: String): List<String> {
        val excluded = setOf(
            "I", "The", "A", "An", "And", "But", "Or", "So", "Because", "When", "While",
            "He", "She", "They", "We", "You", "It", "His", "Her", "Their", "Our", "Your", "Its",
            "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
            "January", "February", "March", "April", "May", "June", "July", "August", "September",
            "October", "November", "December"
        )
        val names = mutableSetOf<String>()
        val sentences = text.split(Regex("(?<=[.!?])\\s+"))
        sentences.forEach { sentence ->
            val words = sentence.split(Regex("\\s+"))
            words.forEachIndexed { index, raw ->
                val word = raw.replace(Regex("[^A-Za-z'-]"), "")
                if (word.isBlank()) return@forEachIndexed
                if (index == 0) return@forEachIndexed
                val normalized = word.replaceFirstChar { it.uppercase() }
                if (normalized in excluded) return@forEachIndexed
                if (normalized.first().isUpperCase() && normalized.length > 2) {
                    names.add(normalized)
                }
            }
        }
        return names.toList()
    }

    private fun extractEmotions(text: String): List<String> {
        val emotions = listOf(
            "happy",
            "sad",
            "excited",
            "proud",
            "grateful",
            "worried",
            "surprised",
            "nostalgic",
            "anxious",
            "lonely",
            "peaceful",
            "calm",
            "joyful",
            "angry",
            "frustrated"
        )
        return emotions.filter { text.lowercase().contains(it) }
    }

    private fun extractKeyDetails(text: String): List<String> {
        val sentences = Regex("[^.!?]+[.!?]").findAll(text).map { it.value.trim() }.toList()
        return sentences.filter { it.length > 20 }
    }

    private fun extractLocation(text: String): String? {
        val pattern = Regex("\\b(?:at|in)\\s+(?:the\\s+)?([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)")
        val match = pattern.find(text)
        return match?.groupValues?.getOrNull(1)
    }

    private fun extractDateLabel(text: String): String? {
        val lowered = text.lowercase()
        return when {
            lowered.contains("yesterday") -> "Yesterday"
            lowered.contains("today") -> "Today"
            lowered.contains("last week") -> "Last week"
            lowered.contains("last month") -> "Last month"
            lowered.contains("last year") -> "Last year"
            else -> null
        }
    }

    private fun enrichContent(content: String): String {
        val trimmed = content.trim()
        if (trimmed.isBlank()) return trimmed
        val hasTemporal = Regex("\\b(yesterday|today|last|ago)\\b", RegexOption.IGNORE_CASE)
            .containsMatchIn(trimmed)
        val base = if (hasTemporal) trimmed else "Today, $trimmed"
        return if (base.endsWith(".") || base.endsWith("!") || base.endsWith("?")) base else "$base."
    }

    private fun deriveTitle(content: String): String {
        val cleaned = content.replace("\\s+".toRegex(), " ").trim()
        if (cleaned.isBlank()) return "A Special Memory"
        return cleaned.split(" ").take(6).joinToString(" ")
    }

    private fun buildMemoryText(memory: MemoryRecord): String {
        return listOf(
            memory.title,
            memory.body,
            memory.content,
            memory.summary,
            memory.metadata?.summary
        ).filterNot { it.isNullOrBlank() }.joinToString(" ")
    }

    private fun tokenize(text: String): Set<String> {
        return text.lowercase().split(Regex("\\s+"))
            .map { it.trim() }
            .filter { it.length > 2 }
            .toSet()
    }

    private fun jaccard(a: Set<String>, b: Set<String>): Double {
        if (a.isEmpty() || b.isEmpty()) return 0.0
        val intersection = a.intersect(b).size.toDouble()
        val union = (a.size + b.size - intersection).toDouble()
        return if (union == 0.0) 0.0 else intersection / union
    }

    private fun normalizeScore(score0to10: Double): Double {
        return clamp01(score0to10 / 10.0)
    }

    private fun clamp01(value: Double): Double = max(0.0, min(1.0, value))

    private data class Thresholds(
        val memoryWorthy: Double,
        val autoCapture: Double
    )
}
