package com.yourorg.emma.nativeapp.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.yourorg.emma.nativeapp.BuildConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.aiDataStore: DataStore<Preferences> by preferencesDataStore(name = "ai_prefs")

data class AiPreferencesState(
    val openAiApiKey: String? = null,
    val apiEnabled: Boolean = false
)

class AiPreferences(private val context: Context) {
    private val openAiApiKeyKey = stringPreferencesKey("openai_api_key")
    private val apiEnabledKey = booleanPreferencesKey("api_enabled")
    private val defaultOpenAiApiKey =
        BuildConfig.OPENAI_API_KEY.trim().takeIf { it.isNotBlank() }

    val state: Flow<AiPreferencesState> = context.aiDataStore.data.map { prefs ->
        val storedRawKey = prefs[openAiApiKeyKey]
        val storedKey = storedRawKey?.trim()
        val resolvedKey = when {
            storedRawKey != null && storedKey.isNullOrBlank() -> null
            !storedKey.isNullOrBlank() -> storedKey
            else -> defaultOpenAiApiKey
        }
        AiPreferencesState(
            openAiApiKey = resolvedKey,
            apiEnabled = prefs[apiEnabledKey] ?: (resolvedKey != null)
        )
    }

    suspend fun setOpenAiApiKey(key: String?) {
        context.aiDataStore.edit { prefs ->
            if (key.isNullOrBlank()) {
                prefs[openAiApiKeyKey] = ""
                prefs[apiEnabledKey] = false
            } else {
                prefs[openAiApiKeyKey] = key.trim()
                if (prefs[apiEnabledKey] == null) {
                    prefs[apiEnabledKey] = true
                }
            }
        }
    }

    suspend fun setApiEnabled(enabled: Boolean) {
        context.aiDataStore.edit { prefs ->
            prefs[apiEnabledKey] = enabled
        }
    }
}
