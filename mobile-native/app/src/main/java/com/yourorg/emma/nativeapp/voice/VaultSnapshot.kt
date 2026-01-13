package com.yourorg.emma.nativeapp.voice

import com.yourorg.emma.nativeapp.vault.FlexibleStringListSerializer
import com.yourorg.emma.nativeapp.vault.MemoryMetadata
import com.yourorg.emma.nativeapp.vault.MemoryRecord
import com.yourorg.emma.nativeapp.vault.PersonRecord
import com.yourorg.emma.nativeapp.vault.RelationshipRecord
import com.yourorg.emma.nativeapp.vault.VaultPayload
import com.yourorg.emma.nativeapp.vault.VaultRepository
import com.yourorg.emma.nativeapp.vault.buildMemorySummary
import com.yourorg.emma.nativeapp.vault.normalizeMemoryRecord
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import java.time.Instant

data class VaultSnapshot(
    val payload: VaultPayload?,
    val people: List<PersonRecord>,
    val memories: List<MemoryRecord>
)

object VaultSnapshotBuilder {
    private val json = Json { ignoreUnknownKeys = true }

    fun build(repository: VaultRepository): VaultSnapshot {
        val payload = repository.state.value.payload
        val people = repository.decodePeople(payload)
        val memories = parseMemories(payload)
        return VaultSnapshot(payload = payload, people = people, memories = memories)
    }

    private fun parseMemories(payload: VaultPayload?): List<MemoryRecord> {
        if (payload == null) return emptyList()
        val relationshipsByMemory = decodeRelationshipLinks(payload)
        return payload.content.memories.mapNotNull { (id, raw) ->
            if (raw.isBlank()) return@mapNotNull null
            runCatching {
                val decoded = json.decodeFromString<MemoryRecord>(raw)
                val normalized = normalizeMemoryRecord(decoded).copy(id = id)
                val relationshipPeople = relationshipsByMemory[id].orEmpty()
                if (relationshipPeople.isEmpty()) {
                    normalized
                } else {
                    val mergedPeople = mergePeopleLinks(normalized.people, relationshipPeople)
                    normalized.copy(
                        people = mergedPeople,
                        selectedPeople = if (normalized.selectedPeople.isNotEmpty()) normalized.selectedPeople else mergedPeople,
                        metadata = normalized.metadata?.copy(people = mergedPeople)
                    )
                }
            }.getOrElse {
                val fallbackBody = raw
                val summary = buildMemorySummary(fallbackBody)
                val relationshipPeople = relationshipsByMemory[id].orEmpty()
                MemoryRecord(
                    id = id,
                    title = raw.take(24).ifBlank { "Untitled memory" },
                    body = fallbackBody,
                    content = fallbackBody,
                    summary = summary,
                    metadata = MemoryMetadata(
                        title = raw.take(24).ifBlank { "Untitled memory" },
                        summary = summary,
                        people = relationshipPeople
                    ),
                    created = payload.created.ifBlank { Instant.now().toString() },
                    people = relationshipPeople,
                    selectedPeople = relationshipPeople
                )
            }
        }
    }

    private fun decodeRelationshipLinks(payload: VaultPayload): Map<String, List<String>> {
        if (payload.content.relationships.isEmpty()) return emptyMap()
        val knownMemoryIds = payload.content.memories.keys
        val byMemory = mutableMapOf<String, MutableSet<String>>()
        payload.content.relationships.forEach { (key, raw) ->
            if (raw.isBlank()) return@forEach
            val record = runCatching { json.decodeFromString<RelationshipRecord>(raw) }.getOrNull()
            if (record != null && record.personId.isNotBlank()) {
                record.memoryIds.forEach { memoryId ->
                    val trimmed = memoryId.trim()
                    if (trimmed.isBlank()) return@forEach
                    if (knownMemoryIds.isNotEmpty() && trimmed !in knownMemoryIds) return@forEach
                    byMemory.getOrPut(trimmed) { mutableSetOf() }.add(record.personId)
                }
                return@forEach
            }

            val fallbackPersonId = key.takeIf { looksLikePersonId(it) } ?: return@forEach
            val fallbackIds = runCatching { json.decodeFromString(FlexibleStringListSerializer, raw) }
                .getOrNull()
                ?: parseLooseStringList(raw)
            fallbackIds.forEach { memoryId ->
                val trimmed = memoryId.trim()
                if (trimmed.isBlank()) return@forEach
                if (knownMemoryIds.isNotEmpty() && trimmed !in knownMemoryIds) return@forEach
                byMemory.getOrPut(trimmed) { mutableSetOf() }.add(fallbackPersonId)
            }
        }
        return byMemory.mapValues { it.value.toList() }
    }

    private fun mergePeopleLinks(primary: List<String>, fallback: List<String>): List<String> {
        return (primary + fallback)
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .distinct()
    }

    private fun parseLooseStringList(raw: String): List<String> {
        val trimmed = raw.trim()
        if (trimmed.isBlank()) return emptyList()
        if (trimmed.any { it == ',' }) {
            val csv = trimmed.split(",").map { it.trim() }.filter { it.isNotBlank() }
            if (csv.isNotEmpty()) return csv
        }
        return listOf(trimmed)
    }

    private fun looksLikePersonId(value: String): Boolean {
        val trimmed = value.trim()
        if (trimmed.isBlank()) return false
        val lowered = trimmed.lowercase()
        return lowered.startsWith("person-") ||
            lowered.startsWith("person_") ||
            lowered.startsWith("people-") ||
            lowered.startsWith("people_")
    }
}
