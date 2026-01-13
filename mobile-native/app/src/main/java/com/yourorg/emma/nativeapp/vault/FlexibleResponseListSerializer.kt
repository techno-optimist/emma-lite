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

object FlexibleResponseListSerializer : KSerializer<List<String>> {
    private val listSerializer = ListSerializer(String.serializer())
    override val descriptor: SerialDescriptor = listSerializer.descriptor

    override fun deserialize(decoder: Decoder): List<String> {
        val jsonDecoder = decoder as? JsonDecoder
        val json = jsonDecoder?.json ?: Json { ignoreUnknownKeys = true }
        val element = decoder.decodeSerializableValue(JsonElement.serializer())
        val rawList = coerceResponseStrings(element, json)
        return rawList.map { it.trim() }.filter { it.isNotBlank() }.distinct()
    }

    override fun serialize(encoder: Encoder, value: List<String>) {
        encoder.encodeSerializableValue(listSerializer, value)
    }

    private fun coerceResponseStrings(element: JsonElement, json: Json): List<String> {
        return when (element) {
            is JsonArray -> element.flatMap { coerceResponseStrings(it, json) }
            is JsonObject -> {
                val direct = firstStringOf(
                    element,
                    "response",
                    "text",
                    "answer",
                    "content",
                    "message",
                    "transcript",
                    "value"
                )
                if (direct != null) {
                    listOf(direct)
                } else {
                    val nested = element["response"] ?: element["responses"] ?: element["message"]
                    if (nested != null && nested !is JsonPrimitive) {
                        coerceResponseStrings(nested, json)
                    } else {
                        emptyList()
                    }
                }
            }
            is JsonPrimitive -> if (element.isString) {
                parseString(element.content, json)
            } else {
                listOf(element.content)
            }
            else -> emptyList()
        }
    }

    private fun parseString(raw: String, json: Json): List<String> {
        val trimmed = raw.trim()
        if (trimmed.isBlank()) return emptyList()
        if ((trimmed.startsWith("[") && trimmed.endsWith("]")) ||
            (trimmed.startsWith("{") && trimmed.endsWith("}"))
        ) {
            val parsed = runCatching { json.parseToJsonElement(trimmed) }.getOrNull()
            if (parsed != null) return coerceResponseStrings(parsed, json)
        }
        if (trimmed.contains(',')) {
            val csv = trimmed.split(",").map { it.trim() }.filter { it.isNotBlank() }
            if (csv.isNotEmpty()) return csv
        }
        return listOf(trimmed)
    }

    private fun firstStringOf(obj: JsonObject, vararg keys: String): String? {
        keys.forEach { key ->
            val value = obj[key] as? JsonPrimitive
            if (value != null && value.content.isNotBlank()) return value.content
        }
        return null
    }
}
