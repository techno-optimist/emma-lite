package com.yourorg.emma.nativeapp.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class OpenAiResponsesClient(
    private val baseUrl: String = "https://api.openai.com",
    private val client: OkHttpClient = OkHttpClient.Builder()
        .callTimeout(45, TimeUnit.SECONDS)
        .build()
) {
    suspend fun post(apiKey: String, path: String, payload: JSONObject): JSONObject =
        withContext(Dispatchers.IO) {
            val mediaType = "application/json; charset=utf-8".toMediaType()
            val requestBody = payload.toString().toRequestBody(mediaType)
            val request = Request.Builder()
                .url(baseUrl.trimEnd('/') + path)
                .addHeader("Authorization", "Bearer $apiKey")
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    throw IllegalStateException("OpenAI request failed (${response.code}): $body")
                }
                if (body.isBlank()) {
                    throw IllegalStateException("OpenAI response empty")
                }
                JSONObject(body)
            }
        }
}
