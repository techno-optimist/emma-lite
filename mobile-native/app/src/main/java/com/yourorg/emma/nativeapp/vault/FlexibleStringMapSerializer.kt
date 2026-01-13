package com.yourorg.emma.nativeapp.vault

import kotlinx.serialization.KSerializer
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive

object FlexibleStringMapSerializer : KSerializer<Map<String, String>> {
    private val mapSerializer = MapSerializer(String.serializer(), JsonElement.serializer())
    override val descriptor: SerialDescriptor = mapSerializer.descriptor

    override fun deserialize(decoder: Decoder): Map<String, String> {
        val jsonDecoder = decoder as? JsonDecoder
        val json = jsonDecoder?.json ?: Json { ignoreUnknownKeys = true }
        val values = decoder.decodeSerializableValue(mapSerializer)
        return values.mapValues { (_, element) ->
            when (element) {
                is JsonPrimitive -> if (element.isString) element.content else element.toString()
                else -> json.encodeToString(JsonElement.serializer(), element)
            }
        }
    }

    override fun serialize(encoder: Encoder, value: Map<String, String>) {
        val jsonMap = value.mapValues { (_, raw) -> JsonPrimitive(raw) }
        encoder.encodeSerializableValue(mapSerializer, jsonMap)
    }
}
