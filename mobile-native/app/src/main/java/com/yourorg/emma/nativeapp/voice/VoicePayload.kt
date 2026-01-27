package com.yourorg.emma.nativeapp.voice

import com.yourorg.emma.nativeapp.vault.MemoryRecord
import com.yourorg.emma.nativeapp.vault.PersonRecord

data class VoicePayload(
    val suggestions: List<String> = emptyList(),
    val memoryResults: List<MemoryRecord> = emptyList(),
    val memoryCards: List<MemoryRecord> = emptyList(),
    val peopleResults: List<PersonRecord> = emptyList(),
    val personMemories: List<MemoryRecord> = emptyList(),
    val memoryDraft: MemoryDraft? = null,
    val clarificationOptions: List<String> = emptyList(),
    val proactiveType: String? = null
)

data class MemoryDraft(
    val title: String,
    val content: String,
    val people: List<String> = emptyList(),
    val emotions: List<String> = emptyList(),
    val tags: List<String> = emptyList(),
    val dateLabel: String? = null,
    val location: String? = null,
    val importance: String? = null,
    val confidence: Int = 0,
    val sourceText: String = ""
)
