package com.yourorg.emma.nativeapp.vault

import kotlinx.serialization.Serializable
import java.time.Instant

@Serializable
data class MemoryMetadata(
    val title: String? = null,
    @Serializable(with = FlexibleStringListSerializer::class)
    val tags: List<String> = emptyList(),
    @Serializable(with = FlexibleStringListSerializer::class)
    val people: List<String> = emptyList(),
    val category: String? = null,
    val summary: String? = null,
    @Serializable(with = FlexibleResponseListSerializer::class)
    val responses: List<String> = emptyList()
)

@Serializable
data class MemoryAttachment(
    val id: String = "",
    val type: String = "unknown/unknown",
    val name: String = "",
    val size: Long = 0
)

@Serializable
data class MemoryRecord(
    val id: String,
    val title: String = "",
    val body: String = "",
    val content: String? = null,
    val summary: String? = null,
    @Serializable(with = FlexibleResponseListSerializer::class)
    val responses: List<String> = emptyList(),
    val created: String = Instant.now().toString(),
    val updated: String? = null,
    @Serializable(with = FlexibleStringListSerializer::class)
    val tags: List<String> = emptyList(),
    @Serializable(with = FlexibleStringListSerializer::class)
    val people: List<String> = emptyList(),
    @Serializable(with = FlexibleStringListSerializer::class)
    val selectedPeople: List<String> = emptyList(),
    val metadata: MemoryMetadata? = null,
    val attachments: List<MemoryAttachment> = emptyList(),
    val theme: String? = null
)

fun buildMemorySummary(text: String, maxChars: Int = 160): String? {
    val trimmed = text.replace("\\s+".toRegex(), " ").trim()
    if (trimmed.isBlank()) return null
    if (trimmed.length <= maxChars) return trimmed
    return trimmed.take(maxChars).trimEnd() + "..."
}

fun normalizeMemoryRecord(record: MemoryRecord): MemoryRecord {
    val resolvedBody = record.body.ifBlank { record.content.orEmpty() }
    val resolvedTitle = record.title.ifBlank { record.metadata?.title.orEmpty() }.ifBlank { "Untitled memory" }
    val mergedPeople = mergeMemoryList(
        record.people + record.selectedPeople + (record.metadata?.people.orEmpty())
    )
    val mergedTags = mergeMemoryList(record.tags + (record.metadata?.tags.orEmpty()))
    val resolvedTheme = record.theme ?: record.metadata?.category
    val resolvedSummary = record.summary ?: record.metadata?.summary ?: buildMemorySummary(resolvedBody)
    val normalizedMetadata = record.metadata?.copy(
        title = record.metadata.title ?: resolvedTitle.takeIf { it.isNotBlank() },
        tags = if (record.metadata.tags.isNotEmpty()) record.metadata.tags else mergedTags,
        people = if (record.metadata.people.isNotEmpty()) record.metadata.people else mergedPeople,
        category = record.metadata.category ?: resolvedTheme,
        summary = record.metadata.summary ?: resolvedSummary
    ) ?: MemoryMetadata(
        title = resolvedTitle.takeIf { it.isNotBlank() },
        tags = mergedTags,
        people = mergedPeople,
        category = resolvedTheme,
        summary = resolvedSummary
    )
    return record.copy(
        title = resolvedTitle,
        body = resolvedBody,
        content = resolvedBody,
        summary = resolvedSummary,
        tags = mergedTags,
        people = mergedPeople,
        selectedPeople = if (record.selectedPeople.isNotEmpty()) record.selectedPeople else mergedPeople,
        metadata = normalizedMetadata,
        theme = resolvedTheme
    )
}

private fun mergeMemoryList(items: List<String>): List<String> {
    return items.map { it.trim() }.filter { it.isNotBlank() }.distinct()
}

fun resolvePeopleIdsForMemory(memory: MemoryRecord, people: List<PersonRecord>): List<String> {
    if (people.isEmpty()) return memory.people
    val normalized = normalizeMemoryRecord(memory)
    val idLookup = people.associateBy { it.id }
    val nameLookup = people.associateBy { it.name.trim().lowercase() }
    return normalized.people.mapNotNull { entry ->
        val trimmed = entry.trim()
        if (trimmed.isBlank()) return@mapNotNull null
        idLookup[trimmed]?.id
            ?: nameLookup[trimmed.lowercase()]?.id
            ?: run {
                val lowered = trimmed.lowercase()
                val matches = people.filter { person ->
                    val name = person.name.trim().lowercase()
                    name.contains(lowered) || lowered.contains(name)
                }
                if (matches.size == 1) matches.first().id else null
            }
    }.distinct()
}

fun resolvePeopleIdsForConstellation(memory: MemoryRecord, people: List<PersonRecord>): List<String> {
    if (people.isEmpty()) return emptyList()
    val normalized = normalizeMemoryRecord(memory)
    val idLookup = people.associateBy { it.id }
    val explicitIds = normalized.people.map { it.trim() }.filter { it.isNotBlank() }
    val explicitMatches = explicitIds.mapNotNull { idLookup[it]?.id }.distinct()
    if (explicitMatches.isNotEmpty()) return explicitMatches
    val combinedText = buildPeopleSearchText(memory)
    if (combinedText.isBlank()) return emptyList()
    return people.mapNotNull { person ->
        val name = person.name.trim()
        if (name.isBlank()) null else if (contentMentionsPerson(name, combinedText)) person.id else null
    }.distinct()
}

private fun buildPeopleSearchText(memory: MemoryRecord): String {
    val parts = mutableListOf<String>()
    fun add(value: String?) {
        if (!value.isNullOrBlank()) parts.add(value)
    }
    add(memory.title)
    add(memory.content)
    if (memory.body.isNotBlank()) {
        add(memory.body)
    }
    add(memory.summary)
    add(memory.metadata?.summary)
    memory.responses.forEach { add(it) }
    memory.metadata?.responses?.forEach { add(it) }
    return parts.joinToString(" ")
}

private fun contentMentionsPerson(personName: String, content: String): Boolean {
    if (personName.isBlank() || content.isBlank()) return false
    val words = personName.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
    if (words.isEmpty()) return false
    val escaped = words.map { Regex.escape(it) }
    val pattern = "\\b${escaped.joinToString("\\s+")}\\b(?:'s)?"
    return Regex(pattern, RegexOption.IGNORE_CASE).containsMatchIn(content)
}
