package com.yourorg.emma.nativeapp.voice

import android.util.Base64
import com.yourorg.emma.nativeapp.vault.MemoryAttachment
import com.yourorg.emma.nativeapp.vault.MemoryAttachmentInput
import com.yourorg.emma.nativeapp.vault.MemoryRecord
import com.yourorg.emma.nativeapp.vault.PersonRecord
import com.yourorg.emma.nativeapp.vault.VaultRepository
import com.yourorg.emma.nativeapp.vault.buildMemorySummary
import com.yourorg.emma.nativeapp.vault.resolvePeopleIdsForMemory
import com.yourorg.emma.nativeapp.vault.VaultStatus
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

class AndroidToolExecutor(
    val repository: VaultRepository
) {
    suspend fun execute(toolName: String, params: JSONObject): JSONObject {
        return when (toolName) {
            "get_people" -> getPeople(params)
            "get_memories" -> getMemories(params)
            "summarize_memory" -> summarizeMemory(params)
            "create_memory_from_voice" -> createMemoryFromVoice(params)
            "create_memory_capsule" -> createMemoryCapsule(params)
            "update_person" -> updatePerson(params)
            "create_person_profile" -> createPersonProfile(params)
            "update_memory_capsule" -> updateMemoryCapsule(params)
            "attach_memory_media" -> attachMemoryMedia(params)
            else -> JSONObject().apply {
                put("error", "Unsupported tool: $toolName")
                put("success", false)
            }
        }
    }

    private fun isVaultReady(): Boolean {
        val state = repository.state.value
        return state.status == VaultStatus.Ready && state.payload != null
    }

    private fun vaultNotReady(message: String): JSONObject {
        return JSONObject().apply {
            put("error", message)
            put("needsVault", true)
            put("success", false)
        }
    }

    private fun getPeople(params: JSONObject): JSONObject {
        if (!isVaultReady()) {
            return vaultNotReady(
                "Your memory vault needs to be opened first. Would you like me to help you open it?"
            )
        }
        val query = params.optString("query", "").trim()
        val snapshot = VaultSnapshotBuilder.build(repository)
        val normalized = query.lowercase()
        val listAllQuery = query.isBlank() || looksLikePeopleListQuery(normalized)
        val matches = if (listAllQuery) {
            snapshot.people
        } else {
            snapshot.people.filter { person ->
                val haystack = listOf(person.name, person.relation, person.contact)
                    .filterNot { it.isNullOrBlank() }
                    .joinToString(" ")
                    .lowercase()
                haystack.contains(normalized)
            }
        }.let { results ->
            if (results.isEmpty() && looksLikePeopleListQuery(normalized)) {
                snapshot.people
            } else {
                results
            }
        }
        val peopleJson = JSONArray()
        matches.take(10).forEach { person ->
            peopleJson.put(personToJson(person))
        }
        return JSONObject().apply {
            put("query", query)
            put("people", peopleJson)
        }
    }

    private fun getMemories(params: JSONObject): JSONObject {
        if (!isVaultReady()) {
            return vaultNotReady(
                "Your memory vault needs to be opened first. Would you like me to help you open it?"
            )
        }
        val personId = params.optString("personId", "").trim()
        val dateRange = params.optString("dateRange", "").trim()
        val limit = params.optInt("limit", 5).coerceAtLeast(1)

        val snapshot = VaultSnapshotBuilder.build(repository)
        val people = snapshot.people
        var results = snapshot.memories

        val resolvedPersonId = resolvePersonId(personId, people)
        if (resolvedPersonId != null) {
            results = results.filter { memory ->
                resolvePeopleIdsForMemory(memory, people).contains(resolvedPersonId)
            }
        } else if (personId.isNotBlank()) {
            val needle = personId.lowercase()
            results = results.filter { memory ->
                buildSearchText(memory).contains(needle)
            }
        }

        if (dateRange.isNotBlank()) {
            val needle = dateRange.lowercase()
            results = results.filter { memory ->
                buildSearchText(memory).contains(needle)
            }
        }

        results = results.sortedByDescending { parseTimestamp(it.updated ?: it.created) }

        val memoriesJson = JSONArray()
        results.take(limit).forEach { memory ->
            memoriesJson.put(memoryToJson(memory, people))
        }

        return JSONObject().apply {
            put("personId", resolvedPersonId ?: if (personId.isBlank()) JSONObject.NULL else personId)
            put("dateRange", if (dateRange.isBlank()) JSONObject.NULL else dateRange)
            put("memories", memoriesJson)
        }
    }

    private fun looksLikePeopleListQuery(normalized: String): Boolean {
        if (normalized.isBlank()) return true
        val hints = listOf(
            "people",
            "person",
            "my people",
            "all people",
            "saved people",
            "list people",
            "show people",
            "contacts",
            "family",
            "friends",
            "everyone"
        )
        return hints.any { normalized.contains(it) } &&
            listOf("show", "list", "who", "all", "my", "saved", "people", "contacts").any { normalized.contains(it) }
    }

    private fun resolvePersonId(personId: String, people: List<PersonRecord>): String? {
        if (personId.isBlank()) return null
        val trimmed = personId.trim()
        val direct = people.firstOrNull { it.id.equals(trimmed, ignoreCase = true) }?.id
        if (direct != null) return direct
        val byName = people.firstOrNull { it.name.equals(trimmed, ignoreCase = true) }?.id
        if (byName != null) return byName
        val lowered = trimmed.lowercase()
        val matches = people.filter { person ->
            val name = person.name.trim().lowercase()
            name.contains(lowered) || lowered.contains(name)
        }
        return if (matches.size == 1) matches.first().id else null
    }

    private fun summarizeMemory(params: JSONObject): JSONObject {
        if (!isVaultReady()) {
            return vaultNotReady(
                "Your memory vault needs to be opened first. Would you like me to help you open it?"
            )
        }
        val memoryId = params.optString("memoryId", "").trim()
        if (memoryId.isBlank()) {
            return JSONObject().apply {
                put("error", "memoryId is required to summarize a memory")
                put("success", false)
            }
        }
        val snapshot = VaultSnapshotBuilder.build(repository)
        val memory = snapshot.memories.firstOrNull { it.id == memoryId }
            ?: return JSONObject().apply {
                put("error", "Memory $memoryId not found")
                put("success", false)
            }
        val summary = memory.summary
            ?: memory.metadata?.summary
            ?: buildMemorySummary(memory.body.ifBlank { memory.content.orEmpty() })
            ?: "This memory is saved, but it does not include story details yet."
        return JSONObject().apply {
            put("memoryId", memoryId)
            put("summary", summary)
            put("success", true)
        }
    }

    private suspend fun createMemoryFromVoice(params: JSONObject): JSONObject {
        if (!isVaultReady()) {
            return vaultNotReady(
                "Your memory vault needs to be opened to save this precious memory. Would you like me to help you open it?"
            )
        }
        val content = params.optString("content", "").trim()
        if (content.isBlank()) {
            return JSONObject().apply {
                put("error", "content is required to create a memory")
                put("success", false)
            }
        }
        val enriched = JSONObject(params.toString()).apply {
            if (!has("title")) {
                put("title", deriveTitle(content, "Shared Memory"))
            }
        }
        val result = createMemoryCapsule(enriched)
        if (result.has("error")) {
            if (!result.has("success")) {
                result.put("success", false)
            }
            return result
        }
        return JSONObject().apply {
            put("success", result.optBoolean("success", true))
            put("memoryId", result.optString("memoryId", ""))
            put("created", result.optJSONObject("memory"))
            put("createdPeople", result.optJSONArray("createdPeople") ?: JSONArray())
        }
    }

    private suspend fun createMemoryCapsule(params: JSONObject): JSONObject {
        if (!isVaultReady()) {
            return vaultNotReady(
                "Your memory vault needs to be opened to save this precious memory. Would you like me to help you open it?"
            )
        }
        val content = params.optString("content", "").trim()
        if (content.isBlank()) {
            return JSONObject().apply {
                put("error", "content is required to create a memory")
                put("success", false)
            }
        }
        val title = params.optString("title", "").trim().ifBlank { deriveTitle(content, "New Memory") }
        val tags = parseStringList(params.optJSONArray("tags"))
        val attachments = parseAttachmentInputs(params.optJSONArray("attachments"), "attachment")

        val beforeSnapshot = VaultSnapshotBuilder.build(repository)
        repository.addMemory(title, content, attachments)

        var afterSnapshot = VaultSnapshotBuilder.build(repository)
        val createdMemory = findCreatedMemory(beforeSnapshot, afterSnapshot, title, content)
            ?: return JSONObject().apply {
                put("error", "Unable to create memory")
                put("success", false)
            }

        val peopleResolution = resolvePeopleEntries(params.optJSONArray("people"), afterSnapshot)
        if (peopleResolution.updated) {
            afterSnapshot = VaultSnapshotBuilder.build(repository)
        }

        if (tags.isNotEmpty() || peopleResolution.entries.isNotEmpty()) {
            repository.updateMemory(
                memoryId = createdMemory.id,
                title = title,
                body = content,
                people = peopleResolution.entries,
                keptAttachments = createdMemory.attachments,
                newAttachments = emptyList(),
                tags = tags
            )
            afterSnapshot = VaultSnapshotBuilder.build(repository)
        }

        val updatedMemory = afterSnapshot.memories.firstOrNull { it.id == createdMemory.id } ?: createdMemory

        return JSONObject().apply {
            put("success", true)
            put("memoryId", updatedMemory.id)
            put("title", updatedMemory.title)
            put("peopleCount", peopleResolution.entries.size)
            put("attachmentCount", updatedMemory.attachments.size)
            put("memory", memoryToJson(updatedMemory, afterSnapshot.people))
            put("createdPeople", peopleResolution.createdPeopleJson)
        }
    }

    private suspend fun updatePerson(params: JSONObject): JSONObject {
        if (!isVaultReady()) {
            return vaultNotReady(
                "Your memory vault needs to be opened to update this person. Would you like me to help you open it?"
            )
        }
        val name = params.optString("name", "").trim()
        if (name.isBlank()) {
            return JSONObject().apply {
                put("error", "name is required to update a person")
                put("success", false)
            }
        }
        val relationship = params.optString("relationship", "").trim()
        val details = params.optString("details", "").trim()

        val snapshot = VaultSnapshotBuilder.build(repository)
        val existing = snapshot.people.firstOrNull { it.name.equals(name, ignoreCase = true) }

        repository.addOrUpdatePerson(
            id = existing?.id,
            name = name,
            relation = relationship.ifBlank { existing?.relation ?: "other" },
            contact = details.ifBlank { existing?.contact },
            avatarData = null,
            avatarMime = null
        )

        val updatedSnapshot = VaultSnapshotBuilder.build(repository)
        val person = updatedSnapshot.people.firstOrNull { it.name.equals(name, ignoreCase = true) } ?: existing

        return JSONObject().apply {
            put("success", true)
            put("personId", person?.id ?: existing?.id ?: "")
            put("personName", person?.name ?: name)
            put("created", existing == null)
            put("person", person?.let { personToJson(it) })
        }
    }

    private suspend fun createPersonProfile(params: JSONObject): JSONObject {
        if (!isVaultReady()) {
            return vaultNotReady(
                "Your memory vault needs to be opened to add this person. Would you like me to help you open it?"
            )
        }
        val name = params.optString("name", "").trim()
        if (name.isBlank()) {
            return JSONObject().apply {
                put("error", "name is required to create a person")
                put("success", false)
            }
        }
        val relationship = params.optString("relationship", "").trim()
        val pronouns = params.optString("pronouns", "").trim()
        val birthday = params.optString("birthday", "").trim()
        val details = params.optString("details", "").trim()
        val avatar = params.optJSONObject("avatar")

        val snapshot = VaultSnapshotBuilder.build(repository)
        val existing = snapshot.people.firstOrNull { it.name.equals(name, ignoreCase = true) }

        val avatarData = parseAvatarData(avatar)
        val avatarMime = avatar?.optString("type", "")?.trim().orEmpty()
            .ifBlank { avatarData?.mime.orEmpty() }
        val resolvedAvatarMime = avatarMime.takeIf { it.isNotBlank() }

        repository.addOrUpdatePerson(
            id = existing?.id,
            name = name,
            relation = relationship.ifBlank { existing?.relation ?: "other" },
            contact = details.ifBlank { existing?.contact },
            avatarData = avatarData?.bytes,
            avatarMime = resolvedAvatarMime
        )

        val updatedSnapshot = VaultSnapshotBuilder.build(repository)
        val person = updatedSnapshot.people.firstOrNull { it.name.equals(name, ignoreCase = true) } ?: existing

        return JSONObject().apply {
            put("success", true)
            put("personId", person?.id ?: existing?.id ?: "")
            put("personName", person?.name ?: name)
            put("created", existing == null)
            put(
                "person",
                person?.let {
                    personToJson(it).apply {
                        if (pronouns.isNotBlank()) put("pronouns", pronouns)
                        if (birthday.isNotBlank()) put("birthday", birthday)
                    }
                }
            )
        }
    }

    private suspend fun updateMemoryCapsule(params: JSONObject): JSONObject {
        if (!isVaultReady()) {
            return vaultNotReady(
                "Your memory vault needs to be opened to update this memory. Would you like me to help you open it?"
            )
        }
        val memoryId = params.optString("memoryId", "").trim()
        if (memoryId.isBlank()) {
            return JSONObject().apply {
                put("error", "memoryId is required to update a memory")
                put("success", false)
            }
        }
        val snapshot = VaultSnapshotBuilder.build(repository)
        val existing = snapshot.memories.firstOrNull { it.id == memoryId }
            ?: return JSONObject().apply {
                put("error", "Memory $memoryId not found")
                put("success", false)
            }

        val newContent = params.optString("content", existing.body.ifBlank { existing.content.orEmpty() }).trim()
        val newTitle = params.optString("title", existing.title).trim()
        val tags = if (params.has("tags")) parseStringList(params.optJSONArray("tags")) else existing.tags
        val replaceAttachments = params.optBoolean("replaceAttachments", false)
        val removeAttachmentIds = parseStringList(params.optJSONArray("removeAttachmentIds")).toSet()
        val attachments = parseAttachmentInputs(params.optJSONArray("attachments"), "attachment")

        val keptAttachments = if (replaceAttachments) {
            emptyList()
        } else {
            existing.attachments.filterNot { removeAttachmentIds.contains(it.id) }
        }

        val peopleResolution = if (params.has("people")) {
            resolvePeopleEntries(params.optJSONArray("people"), snapshot)
        } else {
            PeopleResolution(entries = existing.people, createdPeopleJson = JSONArray(), updated = false)
        }

        repository.updateMemory(
            memoryId = memoryId,
            title = newTitle,
            body = newContent,
            people = peopleResolution.entries,
            keptAttachments = keptAttachments,
            newAttachments = attachments,
            tags = tags
        )

        val updatedSnapshot = VaultSnapshotBuilder.build(repository)
        val updatedMemory = updatedSnapshot.memories.firstOrNull { it.id == memoryId } ?: existing

        return JSONObject().apply {
            put("success", true)
            put("memoryId", memoryId)
            put("updatedFields", JSONArray().apply {
                if (params.has("content")) put("content")
                if (params.has("title")) put("title")
                if (params.has("people")) put("people")
                if (params.has("tags")) put("tags")
                if (params.has("attachments")) put("attachments")
            })
            put("memory", memoryToJson(updatedMemory, updatedSnapshot.people))
            put("createdPeople", peopleResolution.createdPeopleJson)
        }
    }

    private suspend fun attachMemoryMedia(params: JSONObject): JSONObject {
        if (!isVaultReady()) {
            return vaultNotReady(
                "Your memory vault needs to be opened to attach media. Would you like me to help you open it?"
            )
        }
        val memoryId = params.optString("memoryId", "").trim()
        if (memoryId.isBlank()) {
            return JSONObject().apply {
                put("error", "memoryId is required to attach media")
                put("success", false)
            }
        }
        val mediaArray = params.optJSONArray("media")
        val attachments = parseAttachmentInputs(mediaArray, "media")
        if (attachments.isEmpty()) {
            return JSONObject().apply {
                put("error", "media array is required to attach media")
                put("success", false)
            }
        }
        val replaceExisting = params.optBoolean("replaceExisting", false)

        val snapshot = VaultSnapshotBuilder.build(repository)
        val existing = snapshot.memories.firstOrNull { it.id == memoryId }
            ?: return JSONObject().apply {
                put("error", "Memory $memoryId not found")
                put("success", false)
            }

        val keptAttachments = if (replaceExisting) emptyList() else existing.attachments

        repository.updateMemory(
            memoryId = memoryId,
            title = existing.title,
            body = existing.body.ifBlank { existing.content.orEmpty() },
            people = existing.people,
            keptAttachments = keptAttachments,
            newAttachments = attachments,
            tags = existing.tags
        )

        val updatedSnapshot = VaultSnapshotBuilder.build(repository)
        val updatedMemory = updatedSnapshot.memories.firstOrNull { it.id == memoryId } ?: existing
        val keptIds = keptAttachments.map { it.id }.toSet()
        val attached = updatedMemory.attachments.filterNot { keptIds.contains(it.id) }

        val attachedJson = JSONArray()
        attached.forEach { attachment ->
            attachedJson.put(attachmentToJson(attachment))
        }

        return JSONObject().apply {
            put("success", true)
            put("memoryId", memoryId)
            put("attachmentCount", attached.size)
            put("memory", memoryToJson(updatedMemory, updatedSnapshot.people))
            put("attached", attachedJson)
        }
    }

    private fun personToJson(person: PersonRecord): JSONObject {
        val relationship = person.relation.takeIf { it.isNotBlank() }
        return JSONObject().apply {
            put("id", person.id)
            put("name", person.name)
            put("relationship", relationship ?: JSONObject.NULL)
            put("details", person.contact ?: JSONObject.NULL)
        }
    }

    private fun memoryToJson(memory: MemoryRecord, people: List<PersonRecord>): JSONObject {
        val content = memory.body.ifBlank { memory.content.orEmpty() }
        val peopleJson = buildPeoplePayload(memory, people)
        val attachmentsJson = JSONArray()
        memory.attachments.forEach { attachment ->
            attachmentsJson.put(attachmentToJson(attachment))
        }
        return JSONObject().apply {
            put("id", memory.id)
            put("title", memory.title)
            put("content", content)
            put("emotion", JSONObject.NULL)
            put("importance", JSONObject.NULL)
            put("tags", JSONArray(memory.tags))
            put("date", JSONObject.NULL)
            put("location", JSONObject.NULL)
            put("people", peopleJson)
            put("attachments", attachmentsJson)
            put("createdAt", memory.created)
            put("updatedAt", memory.updated ?: memory.created)
        }
    }

    private fun attachmentToJson(attachment: MemoryAttachment): JSONObject {
        return JSONObject().apply {
            put("id", attachment.id)
            put("name", attachment.name)
            put("type", attachment.type)
            put("size", attachment.size)
        }
    }

    private fun buildPeoplePayload(memory: MemoryRecord, people: List<PersonRecord>): JSONArray {
        val resolvedIds = resolvePeopleIdsForMemory(memory, people)
        val peopleById = people.associateBy { it.id }
        val peopleByName = people.associateBy { it.name.trim().lowercase() }
        val resolvedNames = resolvedIds.mapNotNull { peopleById[it]?.name?.trim()?.lowercase() }.toSet()
        val payload = JSONArray()
        val added = mutableSetOf<String>()
        resolvedIds.forEach { id ->
            val person = peopleById[id] ?: return@forEach
            if (added.add(person.id)) {
                payload.put(personToJson(person))
            }
        }
        memory.people.map { it.trim() }.filter { it.isNotBlank() }.forEach { entry ->
            if (resolvedIds.contains(entry)) return@forEach
            if (resolvedNames.contains(entry.lowercase())) return@forEach
            val matched = peopleByName[entry.lowercase()]
            if (matched != null) {
                if (added.add(matched.id)) {
                    payload.put(personToJson(matched))
                }
                return@forEach
            }
            if (added.add(entry)) {
                payload.put(
                    JSONObject().apply {
                        put("id", entry)
                        put("name", entry)
                        put("relationship", JSONObject.NULL)
                    }
                )
            }
        }
        return payload
    }

    private fun buildSearchText(memory: MemoryRecord): String {
        val parts = listOf(
            memory.title,
            memory.body,
            memory.content,
            memory.summary,
            memory.metadata?.summary,
            memory.created,
            memory.updated
        ).filterNot { it.isNullOrBlank() }
        return parts.joinToString(" ").lowercase()
    }

    private fun parseTimestamp(value: String?): Long {
        if (value.isNullOrBlank()) return 0L
        return runCatching { Instant.parse(value).toEpochMilli() }.getOrDefault(0L)
    }

    private fun parseStringList(array: JSONArray?): List<String> {
        if (array == null) return emptyList()
        val results = mutableListOf<String>()
        for (i in 0 until array.length()) {
            val entry = array.optString(i, "").trim()
            if (entry.isNotBlank()) {
                results.add(entry)
            }
        }
        return results
    }

    private fun parseAttachmentInputs(array: JSONArray?, defaultPrefix: String): List<MemoryAttachmentInput> {
        if (array == null) return emptyList()
        val inputs = mutableListOf<MemoryAttachmentInput>()
        for (i in 0 until array.length()) {
            val item = array.optJSONObject(i) ?: continue
            val name = item.optString("name", "$defaultPrefix-${System.currentTimeMillis()}").trim()
            val type = item.optString("type", "").trim()
            val data = item.optString("data", "").trim()
            val dataUrl = item.optString("dataUrl", "").trim()
            val decoded = decodeAttachmentData(data, dataUrl)
            val bytes = decoded?.bytes ?: continue
            val mime = type.ifBlank { decoded?.mime ?: "application/octet-stream" }
            inputs.add(MemoryAttachmentInput(name = name, mime = mime, bytes = bytes))
        }
        return inputs
    }

    private fun decodeAttachmentData(data: String, dataUrl: String): AttachmentData? {
        if (data.isNotBlank()) {
            val bytes = decodeBase64(data) ?: return null
            return AttachmentData(bytes = bytes, mime = null)
        }
        if (dataUrl.isNotBlank() && dataUrl.startsWith("data:")) {
            val parts = dataUrl.substringAfter("data:").split(",", limit = 2)
            if (parts.size < 2) return null
            val meta = parts[0]
            val base64Payload = parts[1]
            val mime = meta.substringBefore(';').ifBlank { null }
            val bytes = decodeBase64(base64Payload) ?: return null
            return AttachmentData(bytes = bytes, mime = mime)
        }
        return null
    }

    private fun decodeBase64(raw: String): ByteArray? {
        return runCatching { Base64.decode(raw, Base64.DEFAULT) }.getOrNull()
    }

    private fun deriveTitle(content: String, fallback: String): String {
        val cleaned = content.replace("\\s+".toRegex(), " ").trim()
        if (cleaned.isBlank()) return fallback
        val words = cleaned.split(" ")
        val preview = words.take(6).joinToString(" ")
        return if (preview.length < cleaned.length) preview else preview
    }

    private fun findCreatedMemory(
        before: VaultSnapshot,
        after: VaultSnapshot,
        title: String,
        content: String
    ): MemoryRecord? {
        val beforeIds = before.memories.map { it.id }.toSet()
        val newMemories = after.memories.filter { it.id !in beforeIds }
        if (newMemories.isNotEmpty()) {
            return newMemories.maxByOrNull { parseTimestamp(it.created) } ?: newMemories.first()
        }
        return after.memories.lastOrNull { memory ->
            memory.title == title && memory.body.contains(content.take(24))
        }
    }

    private suspend fun resolvePeopleEntries(rawPeople: JSONArray?, snapshot: VaultSnapshot): PeopleResolution {
        if (rawPeople == null) return PeopleResolution(emptyList(), JSONArray(), updated = false)
        val entries = mutableListOf<String>()
        val createdNames = mutableListOf<String>()
        var updated = false

        val byId = snapshot.people.associateBy { it.id }
        val byName = snapshot.people.associateBy { it.name.trim().lowercase() }

        for (i in 0 until rawPeople.length()) {
            val entry = rawPeople.get(i)
            when (entry) {
                is String -> {
                    val trimmed = entry.trim()
                    if (trimmed.isBlank()) continue
                    val matched = byId[trimmed] ?: byName[trimmed.lowercase()]
                    if (matched != null) {
                        entries.add(matched.id)
                    } else {
                        entries.add(trimmed)
                    }
                }
                is JSONObject -> {
                    val id = entry.optString("id", "").trim()
                    val name = entry.optString("name", "").trim()
                    val relationship = entry.optString("relationship", "").trim()
                    val matchById = if (id.isNotBlank()) byId[id] else null
                    val matchByName = if (name.isNotBlank()) byName[name.lowercase()] else null
                    val existing = matchById ?: matchByName
                    if (existing != null) {
                        if (relationship.isNotBlank() && relationship != existing.relation) {
                            repository.addOrUpdatePerson(
                                id = existing.id,
                                name = existing.name,
                                relation = relationship,
                                contact = existing.contact,
                                avatarData = null,
                                avatarMime = null
                            )
                            updated = true
                        }
                        entries.add(existing.id)
                    } else if (name.isNotBlank()) {
                        repository.addOrUpdatePerson(
                            id = null,
                            name = name,
                            relation = relationship,
                            contact = null,
                            avatarData = null,
                            avatarMime = null
                        )
                        createdNames.add(name)
                        updated = true
                        entries.add(name)
                    }
                }
            }
        }

        if (!updated) {
            return PeopleResolution(entries = entries, createdPeopleJson = JSONArray(), updated = false)
        }

        val updatedSnapshot = VaultSnapshotBuilder.build(repository)
        val createdPeopleJson = JSONArray()
        val finalEntries = entries.map { value ->
            val match = updatedSnapshot.people.firstOrNull { it.id == value }
                ?: updatedSnapshot.people.firstOrNull { it.name.equals(value, ignoreCase = true) }
            if (match != null) {
                match.id
            } else {
                value
            }
        }
        createdNames.forEach { name ->
            val created = updatedSnapshot.people.firstOrNull { it.name.equals(name, ignoreCase = true) }
            if (created != null) {
                createdPeopleJson.put(personToJson(created))
            }
        }
        return PeopleResolution(entries = finalEntries, createdPeopleJson = createdPeopleJson, updated = true)
    }

    private fun parseAvatarData(avatar: JSONObject?): AttachmentData? {
        if (avatar == null) return null
        val data = avatar.optString("data", "").trim()
        val dataUrl = avatar.optString("dataUrl", "").trim()
        return decodeAttachmentData(data, dataUrl)
    }

    private data class AttachmentData(
        val bytes: ByteArray,
        val mime: String?
    )

    private data class PeopleResolution(
        val entries: List<String>,
        val createdPeopleJson: JSONArray,
        val updated: Boolean
    )
}
