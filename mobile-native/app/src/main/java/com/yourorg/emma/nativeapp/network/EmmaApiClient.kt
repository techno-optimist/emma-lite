package com.yourorg.emma.nativeapp.network

import com.yourorg.emma.nativeapp.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject

class EmmaApiClient(
    private val baseUrl: String = BuildConfig.EMMA_BASE_URL,
    private val client: OkHttpClient = OkHttpClient()
) {
    suspend fun fetchEphemeralToken(): Result<String> = withContext(Dispatchers.IO) {
        runCatching {
            val request = Request.Builder()
                .url("${baseUrl.trimEnd('/')}/token")
                .build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    throw IllegalStateException("Token request failed (${response.code})")
                }
                val body = response.body?.string() ?: throw IllegalStateException("Empty token response")
                val json = JSONObject(body)
                json.optString("value").ifBlank {
                    throw IllegalStateException("Token missing")
                }
            }
        }
    }

    suspend fun fetchAppManifest(): Result<JSONObject> = withContext(Dispatchers.IO) {
        runCatching {
            val request = Request.Builder()
                .url("${baseUrl.trimEnd('/')}/apps/emma/manifest")
                .build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    throw IllegalStateException("Manifest request failed (${response.code})")
                }
                val body = response.body?.string() ?: "{}"
                JSONObject(body)
            }
        }
    }
}
