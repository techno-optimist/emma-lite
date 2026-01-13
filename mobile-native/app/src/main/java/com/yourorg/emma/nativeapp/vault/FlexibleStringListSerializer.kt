package com.yourorg.emma.nativeapp.vault

import kotlinx.serialization.KSerializer
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

object FlexibleStringListSerializer : KSerializer<List<String>> {
    private val listSerializer = ListSerializer(String.serializer())
    override val descriptor: SerialDescriptor = listSerializer.descriptor

    override fun deserialize(decoder: Decoder): List<String> {
        val jsonDecoder = decoder as? JsonDecoder
        val json = jsonDecoder?.json ?: Json { ignoreUnknownKeys = true }
        val element = decoder.decodeSerializableValue(JsonElement.serializer())
        val rawList = when (element) {
            is JsonArray -> element.mapNotNull(::coerceString)
            is JsonObject -> coerceListFromObject(element)
            is JsonPrimitive -> if (element.isString) {
                parseString(element.content, json)
            } else {
                listOf(element.content)
            }
            else -> emptyList()
        }
        return rawList.map { it.trim() }.filter { it.isNotBlank() }.distinct()
    }

    override fun serialize(encoder: Encoder, value: List<String>) {
        encoder.encodeSerializableValue(listSerializer, value)
    }

    private fun coerceString(element: JsonElement): String? {
        return when (element) {
            is JsonPrimitive -> element.content
            is JsonObject -> firstStringOf(element, "id", "personId", "name", "label", "value")
                ?: nestedStringOf(element, "person", "personRef", "target", "entity", "value")
            else -> null
        }
    }

    private fun parseString(raw: String, json: Json): List<String> {
        val trimmed = raw.trim()
        if (trimmed.isBlank()) return emptyList()
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            val parsed = runCatching { json.parseToJsonElement(trimmed) }.getOrNull() as? JsonArray
            return parsed?.mapNotNull(::coerceString).orEmpty()
        }
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            val parsed = runCatching { json.parseToJsonElement(trimmed) }.getOrNull() as? JsonObject
            return parsed?.let(::coerceListFromObject).orEmpty()
        }
        if (trimmed.any { it == ',' }) {
            val csv = trimmed.split(",").map { it.trim() }.filter { it.isNotBlank() }
            if (csv.isNotEmpty()) return csv
        }
        return listOf(trimmed)
    }

    private fun coerceListFromObject(element: JsonObject): List<String> {
        val direct = firstStringOf(element, "id", "personId", "name", "label", "value")
        if (direct != null) return listOf(direct)
        val results = mutableListOf<String>()
        val sortedEntries = element.entries
            .sortedBy { it.key.toIntOrNull() ?: Int.MAX_VALUE }
        sortedEntries.forEach { (key, value) ->
            val primitive = value as? JsonPrimitive
            val valueIsNonString = primitive != null && !primitive.isString
            val valueString = if (valueIsNonString) null else coerceString(value)
            if (!valueString.isNullOrBlank()) {
                results.add(valueString)
            }
            if ((!valueString.isNullOrBlank() && looksLikeId(key)) || valueString == null || valueIsNonString) {
                if (key.toIntOrNull() == null) {
                    results.add(key)
                }
            }
        }
        return results
    }

    private fun looksLikeId(value: String): Boolean {
        if (value.isBlank()) return false
        val lowered = value.lowercase()
        return ID_PREFIXES.any { lowered.startsWith(it) }
    }

    private fun firstStringOf(obj: JsonObject, vararg keys: String): String? {
        keys.forEach { key ->
            val value = obj[key] as? JsonPrimitive
            if (value != null && value.content.isNotBlank()) return value.content
        }
        return null
    }

    private fun nestedStringOf(obj: JsonObject, vararg keys: String): String? {
        keys.forEach { key ->
            val nested = obj[key] as? JsonObject ?: return@forEach
            val nestedValue = firstStringOf(nested, "id", "personId", "name", "label", "value")
            if (nestedValue != null) return nestedValue
        }
        return null
    }

    private val ID_PREFIXES = listOf(
        "person-",
        "person_",
        "people-",
        "people_",
        "mem-",
        "mem_",
        "memory-",
        "memory_",
        "media-",
        "media_",
        "rel-",
        "rel_"
    )
}
