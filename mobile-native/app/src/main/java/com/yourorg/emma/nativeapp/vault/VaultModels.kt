package com.yourorg.emma.nativeapp.vault

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class VaultStats(
    @SerialName("memoryCount") val memoryCount: Int = 0,
    @SerialName("peopleCount") val peopleCount: Int = 0,
    @SerialName("mediaCount") val mediaCount: Int = 0,
    @SerialName("totalSize") val totalSize: Int = 0
)

const val CONSTELLATION_LAYOUT_SETTINGS_KEY = "constellation_layout_v1"

/**
 * Base vault content as stored in the file. Values are JSON-encoded strings
 * for forward/backward compatibility with the web vault.
 */
@Serializable
data class VaultContent(
    @Serializable(with = FlexibleStringMapSerializer::class)
    val memories: Map<String, String> = emptyMap(),
    @Serializable(with = FlexibleStringMapSerializer::class)
    val people: Map<String, String> = emptyMap(),
    @Serializable(with = FlexibleStringMapSerializer::class)
    val media: Map<String, String> = emptyMap(),
    @Serializable(with = FlexibleStringMapSerializer::class)
    val relationships: Map<String, String> = emptyMap(),
    @Serializable(with = FlexibleStringMapSerializer::class)
    val settings: Map<String, String> = emptyMap()
)

@Serializable
data class VaultEncryption(
    val algorithm: String = "AES-GCM",
    @SerialName("keyDerivation") val keyDerivation: String = "PBKDF2",
    val iterations: Int = VaultSpec.DEFAULT_ITERATIONS_CREATE,
    @Serializable(with = FlexibleIntListSerializer::class)
    val salt: List<Int> = emptyList()
)

@Serializable
data class VaultPayload(
    val version: String = "1.0",
    val created: String = "",
    val name: String = "Emma Vault",
    val encryption: VaultEncryption = VaultEncryption(),
    val content: VaultContent = VaultContent(),
    val stats: VaultStats = VaultStats()
)

/**
 * Rich models parsed from the JSON strings in [VaultContent].
 */
@Serializable
data class MemoryMeta(
    val id: String,
    val title: String = "",
    val body: String = "",
    val created: String = "",
    val updated: String = "",
    val tags: List<String> = emptyList(),
    val people: List<String> = emptyList(),
    val attachments: List<MemoryAttachment> = emptyList(),
    val theme: String? = null
)

@Serializable
data class PersonRecord(
    val id: String,
    val name: String,
    val relation: String = "other",
    val contact: String? = null,
    val avatarId: String? = null,
    val avatarUrl: String? = null,
    val created: String = "",
    val updated: String = ""
)

@Serializable
data class RelationshipRecord(
    val id: String,
    val personId: String,
    @Serializable(with = FlexibleStringListSerializer::class)
    val memoryIds: List<String> = emptyList(),
    val updated: String = ""
)

@Serializable
data class VaultSettingsRecord(
    val id: String = "settings",
    val memoryDetection: Boolean = true,
    val peopleRecognition: Boolean = true,
    val dementiaMode: Boolean = false,
    val careAccessibilityEnabled: Boolean = false,
    val autoCapture: Boolean = true,
    val reducedMotion: Boolean = false,
    val highContrast: Boolean = false,
    val fontSize: Int = 100,
    val autoSaveEnabled: Boolean = true,
    val updated: String = ""
)

@Serializable
data class MediaRecord(
    val id: String,
    val name: String,
    val type: String,
    val size: Long = 0,
    val data: String? = null // Base64 when stored inline (avatars, small previews)
)

@Serializable
data class ConstellationLayoutNode(
    @SerialName("xRatio") val xRatio: Float = 0f,
    @SerialName("yRatio") val yRatio: Float = 0f
)

@Serializable
data class ConstellationLayoutRecord(
    val version: Int = 1,
    @SerialName("savedAt") val savedAt: Long = 0L,
    @SerialName("viewportWidth") val viewportWidth: Int = 0,
    @SerialName("viewportHeight") val viewportHeight: Int = 0,
    val scale: Float = 1f,
    @SerialName("offsetX") val offsetX: Float = 0f,
    @SerialName("offsetY") val offsetY: Float = 0f,
    val nodes: Map<String, ConstellationLayoutNode> = emptyMap()
)
