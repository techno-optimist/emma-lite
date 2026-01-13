package com.yourorg.emma.nativeapp.vault

import android.content.ContentResolver
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import android.util.Log
import androidx.core.content.FileProvider
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.ByteArrayOutputStream
import java.io.File
import java.security.MessageDigest
import java.time.Instant

data class MemoryAttachmentInput(
    val name: String,
    val mime: String,
    val bytes: ByteArray
)

/**
 * Handles vault lifecycle: loading from SAF, in-memory state, autosave/export/share,
 * and metadata persistence.
 */
@OptIn(FlowPreview::class)
class VaultRepository(
    private val context: Context,
    private val crypto: VaultCrypto = VaultCrypto(),
    private val preferences: VaultPreferences = VaultPreferences(context),
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) {
    private val scope = CoroutineScope(SupervisorJob() + ioDispatcher)
    private val autosaveRequests = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    private var cachedPassphrase: CharArray? = null
    private var cachedCryptoHint: VaultCryptoHint? = null
    private var cachedCryptoUri: Uri? = null
    private var cachedCryptoFingerprint: String? = null

    private val _state = MutableStateFlow(VaultState())
    val state: StateFlow<VaultState> = _state.asStateFlow()

    private val contentResolver: ContentResolver = context.contentResolver
    private val json = Json { ignoreUnknownKeys = true }

    private val autosaveFile: File by lazy {
        val dir = File(context.filesDir, "autosave")
        if (!dir.exists()) dir.mkdirs()
        File(dir, "vault.autosave.emma")
    }

    init {
        scope.launch {
            preferences.metadata.collectLatest { metadata ->
                cachedCryptoHint = metadata.cryptoHint
                cachedCryptoUri = metadata.cryptoHintUri?.let { Uri.parse(it) }
                cachedCryptoFingerprint = metadata.cryptoHintFingerprint
                _state.update { current ->
                    current.copy(
                        autosaveEnabled = metadata.autosaveEnabled,
                        onboardingSeen = metadata.onboardingSeen,
                        lastOpenedUri = metadata.lastOpenedUri?.let { Uri.parse(it) },
                        lastVaultName = metadata.lastVaultName,
                        lastOpenedAt = metadata.lastOpenedAt.takeIf { it > 0 },
                        hasPersistedPermission = hasPersistedPermission(metadata.lastOpenedUri?.let { Uri.parse(it) }),
                        hasAutosave = autosaveFile.exists(),
                        message = current.message
                    )
                }
            }
        }

        scope.launch {
            autosaveRequests
                .debounce(1_000)
                .collectLatest { performAutosave() }
        }
    }

    suspend fun toggleAutosave(enabled: Boolean) {
        preferences.setAutosaveEnabled(enabled)
        _state.update { it.copy(autosaveEnabled = enabled) }
        if (enabled) {
            autosaveRequests.tryEmit(Unit)
        }
    }

    suspend fun setOnboardingSeen(seen: Boolean) {
        preferences.setOnboardingSeen(seen)
        _state.update { current ->
            if (current.onboardingSeen == seen) current else current.copy(onboardingSeen = seen)
        }
    }

    suspend fun createVault(name: String, passphrase: CharArray, targetUri: Uri?): VaultState = withContext(ioDispatcher) {
        _state.update { it.copy(status = VaultStatus.Loading, message = "Creating vault...", error = null) }
        val now = Instant.now().toString()
        val payload = VaultPayload(
            name = name.ifBlank { "Emma Vault" },
            created = now,
            encryption = VaultEncryption(iterations = VaultSpec.DEFAULT_ITERATIONS_CREATE)
        )
        cachePassphrase(passphrase)
        val bytes = crypto.encryptPayload(payload, passphrase)
        writeToUri(targetUri, bytes)
        writeAutosave(bytes)
        preferences.setLastOpened(targetUri?.toString(), payload.name)
        targetUri?.let { persistCryptoHint(it, payload.encryption.iterations, bytes) }
        val updated = VaultState(
            status = VaultStatus.Ready,
            payload = payload,
            activeUri = targetUri,
            lastOpenedUri = targetUri,
            lastVaultName = payload.name,
            lastOpenedAt = System.currentTimeMillis(),
            lastSavedAt = System.currentTimeMillis(),
            hasPersistedPermission = targetUri?.let { hasPersistedPermission(it) } ?: false,
            hasAutosave = true,
            autosaveEnabled = state.value.autosaveEnabled,
            onboardingSeen = true,
            isDirty = false,
            message = "Vault created and saved"
        )
        _state.value = updated
        setOnboardingSeen(true)
        updated
    }

    suspend fun openVault(uri: Uri, passphrase: CharArray): VaultState = withContext(ioDispatcher) {
        try {
            _state.update { it.copy(status = VaultStatus.Loading, message = "Opening vault...", error = null) }
            val updatedState = withTimeout(20_000) {
                val bytes = readBytes(uri) ?: throw IllegalStateException("Unable to read selected file.")
                val fingerprint = computeFingerprint(bytes)
                val hint = if (uri == cachedCryptoUri && cachedCryptoFingerprint == fingerprint) cachedCryptoHint else null
                val updated = openVaultInternal(
                    uri = uri,
                    bytes = bytes,
                    passphrase = passphrase,
                    fromAutosave = false,
                    cryptoHint = hint,
                    fileFingerprint = fingerprint
                )
                Log.i("VaultRepository", "Vault opened: name=${updated.payload?.name}, uri=$uri")
                updated
            }
            updatedState
        } catch (t: Throwable) {
            val cause = t.cause
            val message = t.message ?: cause?.message
            val tagMismatch = message?.contains("Tag mismatch", ignoreCase = true) == true ||
                t is javax.crypto.AEADBadTagException ||
                cause is javax.crypto.AEADBadTagException
            val friendly = when {
                t is SecurityException -> "Storage permission expired. Please reopen the vault file."
                t is kotlinx.coroutines.TimeoutCancellationException -> "Timed out opening vault. Check storage permission and file size."
                tagMismatch -> "Passphrase is incorrect or file is corrupted."
                message?.contains("stored vault parameters", ignoreCase = true) == true ->
                    "Vault crypto metadata mismatch. Reopen the vault file to refresh the key parameters."
                else -> message ?: "Failed to open vault. Check passphrase and storage access."
            }
            Log.e("VaultRepository", "openVault failed for uri=$uri", t)
            publishError(friendly)
            state.value
        }
    }

    suspend fun updateVault(transform: (VaultPayload) -> VaultPayload) {
        withContext(ioDispatcher) {
            val existing = state.value.payload ?: return@withContext
            val updatedPayload = transform(existing)
            _state.update {
                it.copy(
                    payload = updatedPayload,
                    isDirty = true,
                    message = "Changes pending save"
                )
            }
            autosaveRequests.tryEmit(Unit)
        }
    }

    suspend fun openAutosave(passphrase: CharArray): VaultState = withContext(ioDispatcher) {
        if (!autosaveFile.exists()) {
            publishError("No autosave found on this device.")
            return@withContext state.value
        }
        val bytes = autosaveFile.readBytes()
        val fingerprint = computeFingerprint(bytes)
        val hint = if (cachedCryptoFingerprint == fingerprint) cachedCryptoHint else null
        return@withContext openVaultInternal(
            uri = null,
            bytes = bytes,
            passphrase = passphrase,
            fromAutosave = true,
            cryptoHint = hint,
            fileFingerprint = fingerprint
        )
    }

    suspend fun saveNow(passphrase: CharArray? = null): Boolean = withContext(ioDispatcher) {
        val payload = state.value.payload ?: return@withContext false
        val resolvedPassphrase = (passphrase ?: cachedPassphrase)?.copyOf() ?: return@withContext false
        runCatching {
            cachePassphrase(resolvedPassphrase)
            val targetUri = state.value.activeUri
            val metaUri = targetUri ?: state.value.lastOpenedUri
            val bytes = crypto.encryptPayload(payload, resolvedPassphrase, payload.encryption.iterations)
            writeToUri(targetUri, bytes)
            writeAutosave(bytes)
            preferences.setLastOpened(metaUri?.toString(), payload.name)
            targetUri?.let { persistCryptoHint(it, payload.encryption.iterations, bytes) }
            _state.update {
                it.copy(
                    isDirty = false,
                    lastSavedAt = System.currentTimeMillis(),
                    lastOpenedAt = System.currentTimeMillis(),
                    lastVaultName = payload.name,
                    hasAutosave = true,
                    hasPersistedPermission = metaUri?.let { uri -> hasPersistedPermission(uri) } ?: it.hasPersistedPermission,
                    message = "Vault saved",
                    error = null
                )
            }
            true
        }.onFailure { publishError(it.message) }.getOrDefault(false)
    }

    suspend fun exportVault(targetUri: Uri, passphrase: CharArray? = null): Boolean = withContext(ioDispatcher) {
        val payload = state.value.payload ?: return@withContext false
        val resolvedPassphrase = passphrase ?: cachedPassphrase ?: return@withContext false
        val bytes = crypto.encryptPayload(payload, resolvedPassphrase, payload.encryption.iterations)
        writeToUri(targetUri, bytes)
        _state.update { it.copy(message = "Vault exported", error = null) }
        true
    }

    /**
     * Prepare a shareable URI using FileProvider. Caller is responsible for granting
     * URI permissions on the Intent.
     */
    suspend fun shareVault(fileName: String = "emma-vault.emma", passphrase: CharArray? = null): Uri = withContext(ioDispatcher) {
        val payload = state.value.payload ?: throw IllegalStateException("No vault loaded")
        val resolvedPassphrase = passphrase ?: cachedPassphrase ?: throw IllegalStateException("Passphrase required")
        val bytes = crypto.encryptPayload(payload, resolvedPassphrase, payload.encryption.iterations)
        val exportDir = File(context.cacheDir, "exports").apply { if (!exists()) mkdirs() }
        val exportFile = File(exportDir, fileName)
        exportFile.outputStream().use { it.write(bytes) }
        _state.update { it.copy(message = "Vault share prepared", error = null) }
        FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", exportFile)
    }

    fun clearPassphrase() {
        cachedPassphrase?.fill('0')
        cachedPassphrase = null
    }

    fun lockVault() {
        clearPassphrase()
        _state.update { current ->
            current.copy(
                status = VaultStatus.Empty,
                payload = null,
                activeUri = null,
                isDirty = false,
                constellationSaveInProgress = false,
                message = null,
                error = null
            )
        }
    }

    suspend fun addMemory(title: String, body: String, attachments: List<MemoryAttachmentInput> = emptyList()) {
        if (title.isBlank() && body.isBlank() && attachments.isEmpty()) return
        updateVault { payload ->
            val id = "mem-${System.currentTimeMillis()}"
            val memories = payload.content.memories.toMutableMap()
            val media = payload.content.media.toMutableMap()
            val resolvedTitle = title.ifBlank { "Untitled memory" }
            val summary = buildMemorySummary(body)
            val createdAttachments = attachments.mapNotNull { att ->
                val compressed = compressImage(att.bytes, att.mime)
                val dataToSave = compressed?.first ?: att.bytes
                val mimeToSave = compressed?.second ?: att.mime
                val mediaId = addMediaInternal(media, att.name, mimeToSave, dataToSave)
                MemoryAttachment(
                    id = mediaId,
                    type = mimeToSave,
                    name = att.name,
                    size = dataToSave.size.toLong()
                )
            }
            val record = MemoryRecord(
                id = id,
                title = resolvedTitle,
                body = body,
                content = body,
                summary = summary,
                created = Instant.now().toString(),
                metadata = MemoryMetadata(
                    title = resolvedTitle,
                    summary = summary
                ),
                attachments = createdAttachments
            )
            val encoded = json.encodeToString(record)
            memories[id] = encoded
            val attachmentBytes = createdAttachments.sumOf { it.size }.toInt()
            val relationships = rebuildRelationships(memories)
            payload.copy(
                content = payload.content.copy(memories = memories, media = media, relationships = relationships),
                stats = payload.stats.copy(
                    memoryCount = memories.size,
                    mediaCount = media.size,
                    totalSize = payload.stats.totalSize + body.length + attachmentBytes
                )
            )
        }
    }

    suspend fun updateMemory(
        memoryId: String,
        title: String,
        body: String,
        people: List<String>,
        keptAttachments: List<MemoryAttachment>,
        newAttachments: List<MemoryAttachmentInput> = emptyList(),
        tags: List<String> = emptyList()
    ) {
        updateVault { payload ->
            val memories = payload.content.memories.toMutableMap()
            val media = payload.content.media.toMutableMap()
            val raw = memories[memoryId] ?: return@updateVault payload
            val existing = runCatching { json.decodeFromString<MemoryRecord>(raw) }.getOrNull()
                ?: MemoryRecord(
                    id = memoryId,
                    title = title.ifBlank { "Untitled memory" },
                    body = body,
                    created = payload.created.ifBlank { Instant.now().toString() }
                )
            val normalizedPeople = people.map { it.trim() }.filter { it.isNotBlank() }.distinct()
            val normalizedTags = tags.map { it.trim() }.filter { it.isNotBlank() }.distinct()
            val resolvedTitle = title.ifBlank { existing.title.ifBlank { existing.metadata?.title.orEmpty() } }.ifBlank { "Untitled memory" }
            val resolvedBody = body
            val resolvedTheme = existing.theme ?: existing.metadata?.category
            val summary = buildMemorySummary(resolvedBody)
            val resolvedSummary = summary ?: existing.summary ?: existing.metadata?.summary
            val createdAttachments = newAttachments.mapNotNull { att ->
                val compressed = compressImage(att.bytes, att.mime)
                val dataToSave = compressed?.first ?: att.bytes
                val mimeToSave = compressed?.second ?: att.mime
                val mediaId = addMediaInternal(media, att.name, mimeToSave, dataToSave)
                MemoryAttachment(
                    id = mediaId,
                    type = mimeToSave,
                    name = att.name,
                    size = dataToSave.size.toLong()
                )
            }
            val mergedAttachments = keptAttachments + createdAttachments
            val updatedMetadata = (existing.metadata ?: MemoryMetadata()).copy(
                title = resolvedTitle,
                tags = normalizedTags,
                people = normalizedPeople,
                category = resolvedTheme,
                summary = resolvedSummary
            )
            val updated = existing.copy(
                title = resolvedTitle,
                body = resolvedBody,
                content = resolvedBody,
                summary = resolvedSummary,
                people = normalizedPeople,
                selectedPeople = normalizedPeople,
                tags = normalizedTags,
                attachments = mergedAttachments,
                metadata = updatedMetadata,
                theme = resolvedTheme,
                updated = Instant.now().toString()
            )
            val oldAttachmentBytes = existing.attachments.sumOf { it.size }
                .coerceAtMost(Int.MAX_VALUE.toLong())
                .toInt()
            val newAttachmentBytes = mergedAttachments.sumOf { it.size }
                .coerceAtMost(Int.MAX_VALUE.toLong())
                .toInt()
            val newTotal = (payload.stats.totalSize - existing.body.length - oldAttachmentBytes) +
                body.length + newAttachmentBytes
            memories[memoryId] = json.encodeToString(updated)
            val relationships = rebuildRelationships(memories)
            payload.copy(
                content = payload.content.copy(memories = memories, media = media, relationships = relationships),
                stats = payload.stats.copy(
                    mediaCount = media.size,
                    totalSize = newTotal.coerceAtLeast(0)
                )
            )
        }
    }

    suspend fun updateSettings(settings: VaultSettingsRecord) {
        updateVault { payload ->
            val settingsMap = payload.content.settings.toMutableMap()
            val record = settings.copy(updated = Instant.now().toString())
            settingsMap[record.id] = json.encodeToString(record)
            payload.copy(content = payload.content.copy(settings = settingsMap))
        }
    }

    suspend fun updateConstellationLayout(layout: ConstellationLayoutRecord) {
        val payload = state.value.payload ?: return
        val existingRaw = payload.content.settings[CONSTELLATION_LAYOUT_SETTINGS_KEY]
        val existing = if (existingRaw.isNullOrBlank()) null else {
            runCatching { json.decodeFromString<ConstellationLayoutRecord>(existingRaw) }.getOrNull()
        }
        if (existing != null && existing.copy(savedAt = 0L) == layout.copy(savedAt = 0L)) {
            return
        }
        if (state.value.autosaveEnabled) {
            _state.update { it.copy(constellationSaveInProgress = true) }
        }
        updateVault { current ->
            val settingsMap = current.content.settings.toMutableMap()
            settingsMap[CONSTELLATION_LAYOUT_SETTINGS_KEY] = json.encodeToString(layout)
            current.copy(content = current.content.copy(settings = settingsMap))
        }
    }

    private suspend fun performAutosave() {
        if (!state.value.autosaveEnabled || !state.value.isDirty) {
            if (state.value.constellationSaveInProgress) {
                _state.update { it.copy(constellationSaveInProgress = false) }
            }
            return
        }
        val payload = state.value.payload ?: return
        val passphrase = cachedPassphrase ?: return
        try {
            val bytes = crypto.encryptPayload(payload, passphrase, payload.encryption.iterations)
            val targetUri = state.value.activeUri
            writeToUri(targetUri, bytes)
            writeAutosave(bytes)
            val persistUri = state.value.activeUri ?: state.value.lastOpenedUri
            preferences.setLastOpened(persistUri?.toString(), payload.name)
            targetUri?.let { persistCryptoHint(it, payload.encryption.iterations, bytes) }
            _state.update {
                it.copy(
                    isDirty = false,
                    lastSavedAt = System.currentTimeMillis(),
                    message = "Autosaved",
                    error = null,
                    constellationSaveInProgress = false
                )
            }
        } catch (error: Exception) {
            _state.update { it.copy(error = error.message ?: "Autosave failed", constellationSaveInProgress = false) }
        }
    }

    private fun writeAutosave(bytes: ByteArray) {
        autosaveFile.outputStream().use { it.write(bytes) }
        _state.update { it.copy(hasAutosave = true) }
    }

    private fun writeToUri(uri: Uri?, bytes: ByteArray) {
        if (uri == null) {
            writeAutosave(bytes)
            return
        }
        val stream = contentResolver.openOutputStream(uri, "rwt")
            ?: contentResolver.openOutputStream(uri)
        stream?.use {
            it.write(bytes)
            it.flush()
        } ?: throw IllegalStateException("Unable to open output stream for $uri")
    }

    private fun readBytes(uri: Uri): ByteArray? {
        return runCatching {
            contentResolver.openInputStream(uri)?.use { it.readBytes() }
        }.onFailure { Log.e("VaultRepository", "Failed to read bytes from $uri", it) }
            .getOrNull()
    }

    private fun cachePassphrase(passphrase: CharArray) {
        cachedPassphrase?.fill('0')
        cachedPassphrase = passphrase.copyOf()
    }

    private suspend fun openVaultInternal(
        uri: Uri?,
        bytes: ByteArray,
        passphrase: CharArray,
        fromAutosave: Boolean,
        cryptoHint: VaultCryptoHint?,
        fileFingerprint: String
    ): VaultState {
        val head = bytes.take(32).joinToString(" ") { String.format("%02x", it) }
        Log.d("VaultRepository", "Read ${bytes.size} bytes from ${uri ?: "autosave"} head=$head")
        cachePassphrase(passphrase)
        val result = crypto.decryptPayloadWithHint(bytes, passphrase, cryptoHint)
        val payload = result.payload
        Log.d("VaultRepository", "Decrypted payload name=${payload.name}")
        val fallbackUri = state.value.lastOpenedUri
        val resolvedUri = uri ?: fallbackUri
        val resolvedPermission = resolvedUri?.let { hasPersistedPermission(it) } ?: state.value.hasPersistedPermission
        val updated = VaultState(
            status = VaultStatus.Ready,
            payload = payload,
            activeUri = resolvedUri,
            lastOpenedUri = resolvedUri ?: fallbackUri,
            lastVaultName = payload.name,
            lastOpenedAt = System.currentTimeMillis(),
            lastSavedAt = System.currentTimeMillis(),
            hasPersistedPermission = resolvedPermission,
            hasAutosave = true,
            autosaveEnabled = state.value.autosaveEnabled,
            onboardingSeen = true,
            isDirty = false,
            message = if (fromAutosave) "Autosave loaded" else "Vault opened",
            error = null
        )
        _state.value = updated
        setOnboardingSeen(true)
        val metaUri = resolvedUri ?: fallbackUri
        preferences.setLastOpened(metaUri?.toString(), payload.name)
        resolvedUri?.let {
            cachedCryptoHint = result.hint
            cachedCryptoUri = it
            cachedCryptoFingerprint = fileFingerprint
            preferences.setCryptoHint(it.toString(), result.hint, fileFingerprint)
        }
        if (!fromAutosave && scope.isActive) {
            writeAutosave(bytes)
        }
        return updated
    }

    private suspend fun persistCryptoHint(uri: Uri, iterations: Int, bytes: ByteArray) {
        val fingerprint = computeFingerprint(bytes)
        val hint = VaultCryptoHint(
            iterations = iterations,
            saltLen = VaultSpec.SALT_LEN_PRIMARY,
            ivLen = VaultSpec.IV_LEN_PRIMARY,
            hasVersion = crypto.writesVersionHeader,
            strategy = VaultKeyStrategy.WebCompat
        )
        cachedCryptoHint = hint
        cachedCryptoUri = uri
        cachedCryptoFingerprint = fingerprint
        preferences.setCryptoHint(uri.toString(), hint, fingerprint)
    }

    private fun computeFingerprint(bytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        val builder = StringBuilder(digest.size * 2)
        digest.forEach { byte -> builder.append(String.format("%02x", byte)) }
        return builder.toString()
    }

    private fun hasPersistedPermission(uri: Uri?): Boolean {
        if (uri == null) return false
        return contentResolver.persistedUriPermissions.any {
            it.uri == uri && it.isReadPermission && it.isWritePermission
        }
    }

    /**
     * Add or update a person, optionally saving an avatar as a small media record.
     * This keeps the on-disk format aligned with the web vault (JSON strings per entry).
     */
    suspend fun addOrUpdatePerson(
        id: String? = null,
        name: String,
        relation: String,
        contact: String?,
        avatarData: ByteArray?,
        avatarMime: String?
    ) {
        updateVault { payload ->
            val personId = id ?: "person-${System.currentTimeMillis()}"
            val people = payload.content.people.toMutableMap()
            val media = payload.content.media.toMutableMap()

            val (avatarId, avatarSize) =
                if (avatarData != null && avatarMime != null) {
                    val compressed = compressImage(avatarData, avatarMime)
                    val dataToSave = compressed?.first ?: avatarData
                    val mimeToSave = compressed?.second ?: avatarMime
                    addMediaInternal(media, "avatar_$personId", mimeToSave, dataToSave) to dataToSave.size
                } else {
                    val existingId = runCatching { json.decodeFromString<PersonRecord>(people[personId] ?: "") }
                        .getOrNull()
                        ?.avatarId
                    existingId to 0
                }

            val record = PersonRecord(
                id = personId,
                name = name,
                relation = relation.ifBlank { "other" },
                contact = contact?.ifBlank { null },
                avatarId = avatarId,
                created = Instant.now().toString(),
                updated = Instant.now().toString()
            )
            people[personId] = json.encodeToString(record)
            payload.copy(
                content = payload.content.copy(people = people, media = media),
                stats = payload.stats.copy(
                    peopleCount = people.size,
                    mediaCount = media.size,
                    totalSize = payload.stats.totalSize + avatarSize
                )
            )
        }
    }

    suspend fun deletePerson(personId: String) {
        updateVault { payload ->
            val people = payload.content.people.toMutableMap()
            people.remove(personId)
            val memories = payload.content.memories.toMutableMap()
            var updatedMemories = false
            memories.forEach { (memoryId, raw) ->
                val record = runCatching { json.decodeFromString<MemoryRecord>(raw) }.getOrNull() ?: return@forEach
                val mergedPeople = normalizeMemoryRecord(record).people
                if (!mergedPeople.contains(personId)) return@forEach
                val prunedPeople = mergedPeople.filterNot { it == personId }
                val updatedRecord = record.copy(
                    people = prunedPeople,
                    selectedPeople = prunedPeople,
                    metadata = record.metadata?.copy(people = prunedPeople)
                )
                memories[memoryId] = json.encodeToString(updatedRecord)
                updatedMemories = true
            }
            val relationships = if (updatedMemories) rebuildRelationships(memories) else payload.content.relationships
            payload.copy(
                content = payload.content.copy(people = people, memories = memories, relationships = relationships),
                stats = payload.stats.copy(peopleCount = people.size)
            )
        }
    }

    private fun rebuildRelationships(memories: Map<String, String>): Map<String, String> {
        if (memories.isEmpty()) return emptyMap()
        val now = Instant.now().toString()
        val byPerson = mutableMapOf<String, MutableSet<String>>()
        memories.forEach { (memoryId, raw) ->
            val record = runCatching { json.decodeFromString<MemoryRecord>(raw) }.getOrNull() ?: return@forEach
            val people = normalizeMemoryRecord(record).people
            people.forEach { personId ->
                byPerson.getOrPut(personId) { mutableSetOf() }.add(memoryId)
            }
        }
        return byPerson.mapValues { (personId, memoryIds) ->
            json.encodeToString(
                RelationshipRecord(
                    id = "rel-$personId",
                    personId = personId,
                    memoryIds = memoryIds.sorted(),
                    updated = now
                )
            )
        }
    }

    /**
     * Store a tiny media record (e.g., avatar) encoded as base64.
     */
    private fun addMediaInternal(
        media: MutableMap<String, String>,
        name: String,
        type: String,
        data: ByteArray
    ): String {
        val mediaId = "media-${System.currentTimeMillis()}"
        val record = MediaRecord(
            id = mediaId,
            name = name,
            type = type,
            size = data.size.toLong(),
            data = Base64.encodeToString(data, Base64.NO_WRAP)
        )
        media[mediaId] = json.encodeToString(record)
        return mediaId
    }

    fun decodePeople(payload: VaultPayload?): List<PersonRecord> {
        if (payload == null) return emptyList()
        return payload.content.people.mapNotNull { (id, raw) ->
            if (raw.isBlank()) return@mapNotNull null
            runCatching { json.decodeFromString<PersonRecord>(raw) }
                .getOrElse {
                    PersonRecord(
                        id = id,
                        name = raw.take(24).ifBlank { "Unknown" },
                        relation = "other",
                        created = payload.created
                    )
                }
        }
    }

    fun decodeSettings(payload: VaultPayload?): VaultSettingsRecord? {
        if (payload == null) return null
        val raw = payload.content.settings["settings"] ?: payload.content.settings.values.firstOrNull() ?: return null
        return runCatching { json.decodeFromString<VaultSettingsRecord>(raw) }.getOrNull()
    }

    fun decodeConstellationLayout(payload: VaultPayload?): ConstellationLayoutRecord? {
        if (payload == null) return null
        val raw = payload.content.settings[CONSTELLATION_LAYOUT_SETTINGS_KEY] ?: return null
        if (raw.isBlank()) return null
        return runCatching { json.decodeFromString<ConstellationLayoutRecord>(raw) }.getOrNull()
    }

    /**
     * Mirrors the web compression: max dimension 1920px, JPEG quality 0.8.
     */
    private fun compressImage(data: ByteArray, mime: String?, maxDimension: Int = 1920, quality: Int = 80): Pair<ByteArray, String>? {
        return runCatching {
            val original = BitmapFactory.decodeByteArray(data, 0, data.size) ?: return null
            val (width, height) = original.width to original.height
            val maxSide = maxOf(width, height).toFloat()
            val scale = if (maxSide > maxDimension) maxDimension / maxSide else 1f
            val targetWidth = (width * scale).toInt().coerceAtLeast(1)
            val targetHeight = (height * scale).toInt().coerceAtLeast(1)

            val bitmap = if (scale < 1f) {
                Bitmap.createScaledBitmap(original, targetWidth, targetHeight, true)
            } else {
                original
            }

            val output = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, output)

            if (bitmap != original) {
                bitmap.recycle()
            }
            original.recycle()

            output.toByteArray() to "image/jpeg"
        }.getOrNull()
    }

    fun publishError(message: String?) {
        val msg = message?.takeIf { it.isNotBlank() }
            ?: "Something went wrong. Please check your passphrase and file access."
        _state.update { it.copy(error = msg, status = VaultStatus.Error) }
    }


    suspend fun resumeSmokeCheck(): VaultResumeStatus = withContext(ioDispatcher) {
        val current = state.value
        val resumeUri = current.lastOpenedUri ?: current.activeUri
        val persisted = resumeUri?.let { hasPersistedPermission(it) } ?: false
        val autosaveExists = autosaveFile.exists() && autosaveFile.canRead()
        VaultResumeStatus(
            hasRecentUri = resumeUri != null,
            hasPersistedPermission = persisted,
            hasAutosave = autosaveExists,
            autosavePath = if (autosaveExists) autosaveFile.absolutePath else null,
            lastOpenedAt = current.lastOpenedAt,
            lastVaultName = current.lastVaultName ?: current.vaultName
        )
    }

    suspend fun cryptoParityCheck(): VaultCryptoStatus = withContext(ioDispatcher) {
        val samplePayload = VaultPayload(
            name = "Smoke Vault",
            created = Instant.now().toString(),
            content = VaultContent(
                memories = mapOf("smoke" to """{"title":"QA","body":"Mic/WS + vault smoke"}""")
            ),
            encryption = VaultEncryption(iterations = VaultSpec.DEFAULT_ITERATIONS_CREATE)
        )
        val passphrase = "native-smoke-pass".toCharArray()
        return@withContext runCatching {
            val encrypted = crypto.encryptPayload(samplePayload, passphrase, VaultSpec.DEFAULT_ITERATIONS_CREATE)
            val decrypted = crypto.decryptPayload(encrypted, passphrase)
            val rewrapped = crypto.encryptPayload(decrypted, passphrase, VaultSpec.DEFAULT_ITERATIONS_REWRAP)
            val rewrappedDecoded = crypto.decryptPayload(rewrapped, passphrase)
            VaultCryptoStatus(
                roundTripOk = decrypted.name == samplePayload.name && decrypted.content.memories.isNotEmpty(),
                rewrapOk = rewrappedDecoded.encryption.iterations == VaultSpec.DEFAULT_ITERATIONS_REWRAP,
                message = "Crypto parity check passed"
            )
        }.getOrElse { VaultCryptoStatus(roundTripOk = false, rewrapOk = false, message = it.message) }
    }
}
