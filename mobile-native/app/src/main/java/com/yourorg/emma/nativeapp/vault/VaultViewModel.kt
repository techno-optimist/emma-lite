package com.yourorg.emma.nativeapp.vault

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant
import com.yourorg.emma.nativeapp.vault.MemoryAttachmentInput
import com.yourorg.emma.nativeapp.vault.MemoryAttachment

class VaultViewModel(
    private val repository: VaultRepository,
    private val json: Json = Json { ignoreUnknownKeys = true }
) : ViewModel() {
    private val errorHandler = CoroutineExceptionHandler { _, throwable ->
        repository.publishError(throwable.message)
    }

    val state: StateFlow<VaultState> = repository.state

    val memories: StateFlow<List<MemoryRecord>> = repository.state
        .map { parseMemories(it.payload) }
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val people: StateFlow<List<PersonRecord>> = repository.state
        .map { repository.decodePeople(it.payload) }
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    fun toggleAutosave(enabled: Boolean) {
        launchSafely {
            repository.toggleAutosave(enabled)
        }
    }

    fun setOnboardingSeen(seen: Boolean) {
        launchSafely {
            repository.setOnboardingSeen(seen)
        }
    }

    fun createVault(name: String, uri: Uri?, passphrase: CharArray) {
        launchSafely {
            repository.createVault(name, passphrase, uri)
        }
    }

    fun openVault(uri: Uri, passphrase: CharArray) {
        launchSafely {
            android.util.Log.d("VaultViewModel", "openVault invoked for uri=$uri")
            repository.openVault(uri, passphrase)
        }
    }

    fun openAutosave(passphrase: CharArray) {
        launchSafely {
            repository.openAutosave(passphrase)
        }
    }

    fun saveVault(passphrase: CharArray? = null) {
        launchSafely {
            repository.saveNow(passphrase)
        }
    }

    fun exportVault(uri: Uri, passphrase: CharArray? = null) {
        launchSafely {
            repository.exportVault(uri, passphrase)
        }
    }

    fun upsertPerson(id: String? = null, name: String, relation: String, contact: String?, avatarData: ByteArray?, avatarMime: String?) {
        launchSafely {
            repository.addOrUpdatePerson(
                id = id,
                name = name,
                relation = relation,
                contact = contact,
                avatarData = avatarData,
                avatarMime = avatarMime
            )
        }
    }

    fun deletePerson(id: String) {
        launchSafely { repository.deletePerson(id) }
    }

    suspend fun runResumeSmokeCheck(): VaultResumeStatus {
        return repository.resumeSmokeCheck()
    }

    suspend fun runCryptoParityCheck(): VaultCryptoStatus {
        return repository.cryptoParityCheck()
    }

    suspend fun prepareShare(passphrase: CharArray? = null): Uri? {
        return runCatching { repository.shareVault(passphrase = passphrase) }
            .onFailure { updateError(it.message) }
            .getOrNull()
    }

    fun addMemory(
        title: String,
        body: String,
        attachments: List<MemoryAttachmentInput> = emptyList(),
        people: List<String> = emptyList(),
        tags: List<String> = emptyList()
    ) {
        val hasPeople = people.any { it.isNotBlank() }
        val hasTags = tags.any { it.isNotBlank() }
        if (title.isBlank() && body.isBlank() && attachments.isEmpty() && !hasPeople && !hasTags) return
        viewModelScope.launch {
            repository.addMemory(title, body, attachments, people = people, tags = tags)
        }
    }

    fun updateMemory(
        memoryId: String,
        title: String,
        body: String,
        people: List<String>,
        keptAttachments: List<MemoryAttachment>,
        newAttachments: List<MemoryAttachmentInput> = emptyList(),
        tags: List<String> = emptyList()
    ) {
        launchSafely {
            repository.updateMemory(
                memoryId = memoryId,
                title = title,
                body = body,
                people = people,
                keptAttachments = keptAttachments,
                newAttachments = newAttachments,
                tags = tags
            )
        }
    }

    fun updateVaultSettings(settings: VaultSettingsRecord) {
        launchSafely { repository.updateSettings(settings) }
    }

    fun updateConstellationLayout(layout: ConstellationLayoutRecord) {
        launchSafely { repository.updateConstellationLayout(layout) }
    }

    fun clearPassphrase() {
        repository.clearPassphrase()
    }

    fun lockVault() {
        repository.lockVault()
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
            }
                .getOrElse {
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

    private fun updateError(message: String?) {
        repository.publishError(message)
    }

    private fun launchSafely(block: suspend () -> Unit) {
        viewModelScope.launch(errorHandler) {
            try {
                block()
            } catch (t: Throwable) {
                updateError(t.message)
            }
        }
    }

    class Factory(private val repository: VaultRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(VaultViewModel::class.java)) {
                return VaultViewModel(repository) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
