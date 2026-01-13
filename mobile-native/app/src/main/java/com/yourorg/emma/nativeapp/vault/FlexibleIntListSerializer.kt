package com.yourorg.emma.nativeapp.vault

import android.util.Base64
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

object FlexibleIntListSerializer : KSerializer<List<Int>> {
    private val listSerializer = ListSerializer(Int.serializer())
    override val descriptor: SerialDescriptor = listSerializer.descriptor

    override fun deserialize(decoder: Decoder): List<Int> {
        val jsonDecoder = decoder as? JsonDecoder
        val json = jsonDecoder?.json ?: Json { ignoreUnknownKeys = true }
        val element = decoder.decodeSerializableValue(JsonElement.serializer())
        return when (element) {
            is JsonArray -> element.mapNotNull(::coerceInt)
            is JsonObject -> {
                element.entries
                    .sortedBy { it.key.toIntOrNull() ?: Int.MAX_VALUE }
                    .mapNotNull { coerceInt(it.value) }
            }
            is JsonPrimitive -> if (element.isString) {
                parseString(element.content, json)
            } else {
                element.content.toIntOrNull()?.let { listOf(it) } ?: emptyList()
            }
            else -> emptyList()
        }
    }

    override fun serialize(encoder: Encoder, value: List<Int>) {
        encoder.encodeSerializableValue(listSerializer, value)
    }

    private fun coerceInt(element: JsonElement): Int? {
        val primitive = element as? JsonPrimitive ?: return null
        return primitive.content.toIntOrNull()
    }

    private fun parseString(raw: String, json: Json): List<Int> {
        val trimmed = raw.trim()
        if (trimmed.isBlank()) return emptyList()
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            val parsed = runCatching { json.parseToJsonElement(trimmed) }.getOrNull() as? JsonArray
            return parsed?.mapNotNull(::coerceInt).orEmpty()
        }
        if (trimmed.any { it == ',' }) {
            val csv = trimmed.split(",").mapNotNull { it.trim().toIntOrNull() }
            if (csv.isNotEmpty()) return csv
        }
        if (trimmed.length >= 16 && trimmed.length % 4 == 0 && trimmed.matches(BASE64_REGEX)) {
            val base64Bytes = runCatching { Base64.decode(trimmed, Base64.DEFAULT) }.getOrNull()
            if (base64Bytes != null && base64Bytes.isNotEmpty()) {
                return base64Bytes.map { it.toInt() and 0xFF }
            }
        }
        return trimmed.toByteArray(Charsets.UTF_8).map { it.toInt() and 0xFF }
    }

    private val BASE64_REGEX = Regex("^[A-Za-z0-9+/]+={0,2}$")
}
