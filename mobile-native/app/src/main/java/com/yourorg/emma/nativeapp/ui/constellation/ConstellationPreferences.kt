package com.yourorg.emma.nativeapp.ui.constellation

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.constellationDataStore: DataStore<Preferences> by preferencesDataStore(name = "constellation_prefs")

data class ConstellationPreferencesState(
    val showMemories: Boolean = true,
    val showPeople: Boolean = true,
    val familyEnabled: Boolean = true,
    val travelEnabled: Boolean = true,
    val recentEnabled: Boolean = true,
    val specialEnabled: Boolean = true,
    val scale: Float = 1f,
    val offsetX: Float = 0f,
    val offsetY: Float = 0f
)

class ConstellationPreferences(private val context: Context) {
    private val showMemoriesLegacyKey = booleanPreferencesKey("show_memories")
    private val showPeopleLegacyKey = booleanPreferencesKey("show_people")
    private val familyEnabledLegacyKey = booleanPreferencesKey("family_enabled")
    private val travelEnabledLegacyKey = booleanPreferencesKey("travel_enabled")
    private val recentEnabledLegacyKey = booleanPreferencesKey("recent_enabled")
    private val specialEnabledLegacyKey = booleanPreferencesKey("special_enabled")
    private val scaleLegacyKey = floatPreferencesKey("scale")
    private val offsetXLegacyKey = floatPreferencesKey("offset_x")
    private val offsetYLegacyKey = floatPreferencesKey("offset_y")
    private val layoutLegacyKey = stringPreferencesKey("layout_json")

    fun state(vaultKey: String?): Flow<ConstellationPreferencesState> = context.constellationDataStore.data.map { prefs ->
        val showMemoriesKey = booleanPreferencesKey(scopedKey("show_memories", vaultKey))
        val showPeopleKey = booleanPreferencesKey(scopedKey("show_people", vaultKey))
        val familyEnabledKey = booleanPreferencesKey(scopedKey("family_enabled", vaultKey))
        val travelEnabledKey = booleanPreferencesKey(scopedKey("travel_enabled", vaultKey))
        val recentEnabledKey = booleanPreferencesKey(scopedKey("recent_enabled", vaultKey))
        val specialEnabledKey = booleanPreferencesKey(scopedKey("special_enabled", vaultKey))
        val scaleKey = floatPreferencesKey(scopedKey("scale", vaultKey))
        val offsetXKey = floatPreferencesKey(scopedKey("offset_x", vaultKey))
        val offsetYKey = floatPreferencesKey(scopedKey("offset_y", vaultKey))

        ConstellationPreferencesState(
            showMemories = prefs[showMemoriesKey] ?: prefs[showMemoriesLegacyKey] ?: true,
            showPeople = prefs[showPeopleKey] ?: prefs[showPeopleLegacyKey] ?: true,
            familyEnabled = prefs[familyEnabledKey] ?: prefs[familyEnabledLegacyKey] ?: true,
            travelEnabled = prefs[travelEnabledKey] ?: prefs[travelEnabledLegacyKey] ?: true,
            recentEnabled = prefs[recentEnabledKey] ?: prefs[recentEnabledLegacyKey] ?: true,
            specialEnabled = prefs[specialEnabledKey] ?: prefs[specialEnabledLegacyKey] ?: true,
            scale = prefs[scaleKey] ?: prefs[scaleLegacyKey] ?: 1f,
            offsetX = prefs[offsetXKey] ?: prefs[offsetXLegacyKey] ?: 0f,
            offsetY = prefs[offsetYKey] ?: prefs[offsetYLegacyKey] ?: 0f
        )
    }

    fun layoutFlow(vaultKey: String?): Flow<String?> = context.constellationDataStore.data.map { prefs ->
        val layoutKey = stringPreferencesKey(scopedKey("layout_json", vaultKey))
        prefs[layoutKey] ?: prefs[layoutLegacyKey]
    }

    suspend fun save(state: ConstellationPreferencesState, vaultKey: String?) {
        val showMemoriesKey = booleanPreferencesKey(scopedKey("show_memories", vaultKey))
        val showPeopleKey = booleanPreferencesKey(scopedKey("show_people", vaultKey))
        val familyEnabledKey = booleanPreferencesKey(scopedKey("family_enabled", vaultKey))
        val travelEnabledKey = booleanPreferencesKey(scopedKey("travel_enabled", vaultKey))
        val recentEnabledKey = booleanPreferencesKey(scopedKey("recent_enabled", vaultKey))
        val specialEnabledKey = booleanPreferencesKey(scopedKey("special_enabled", vaultKey))
        val scaleKey = floatPreferencesKey(scopedKey("scale", vaultKey))
        val offsetXKey = floatPreferencesKey(scopedKey("offset_x", vaultKey))
        val offsetYKey = floatPreferencesKey(scopedKey("offset_y", vaultKey))

        context.constellationDataStore.edit { prefs ->
            prefs[showMemoriesKey] = state.showMemories
            prefs[showPeopleKey] = state.showPeople
            prefs[familyEnabledKey] = state.familyEnabled
            prefs[travelEnabledKey] = state.travelEnabled
            prefs[recentEnabledKey] = state.recentEnabled
            prefs[specialEnabledKey] = state.specialEnabled
            prefs[scaleKey] = state.scale
            prefs[offsetXKey] = state.offsetX
            prefs[offsetYKey] = state.offsetY
        }
    }

    suspend fun saveLayout(layoutJson: String, vaultKey: String?) {
        val layoutKey = stringPreferencesKey(scopedKey("layout_json", vaultKey))
        context.constellationDataStore.edit { prefs ->
            prefs[layoutKey] = layoutJson
        }
    }

    private fun scopedKey(base: String, vaultKey: String?): String {
        val trimmed = vaultKey?.trim().orEmpty()
        return if (trimmed.isBlank()) base else "${base}_$trimmed"
    }
}
