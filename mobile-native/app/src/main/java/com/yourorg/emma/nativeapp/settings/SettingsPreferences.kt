package com.yourorg.emma.nativeapp.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.settingsDataStore: DataStore<Preferences> by preferencesDataStore(name = "settings_prefs")

data class SettingsPreferencesState(
    val memoryDetection: Boolean = true,
    val peopleRecognition: Boolean = true,
    val dementiaMode: Boolean = false,
    val careAccessibilityEnabled: Boolean = false,
    val autoCapture: Boolean = true,
    val reducedMotion: Boolean = false,
    val highContrast: Boolean = false,
    val fontSize: Int = 100
)

class SettingsPreferences(private val context: Context) {
    private val memoryDetectionKey = booleanPreferencesKey("memory_detection")
    private val peopleRecognitionKey = booleanPreferencesKey("people_recognition")
    private val dementiaModeKey = booleanPreferencesKey("dementia_mode")
    private val careAccessibilityKey = booleanPreferencesKey("care_accessibility")
    private val autoCaptureKey = booleanPreferencesKey("auto_capture")
    private val reducedMotionKey = booleanPreferencesKey("reduced_motion")
    private val highContrastKey = booleanPreferencesKey("high_contrast")
    private val fontSizeKey = intPreferencesKey("font_size")

    val state: Flow<SettingsPreferencesState> = context.settingsDataStore.data.map { prefs ->
        val storedFontSize = (prefs[fontSizeKey] ?: 100).coerceIn(80, 200)
        SettingsPreferencesState(
            memoryDetection = prefs[memoryDetectionKey] ?: true,
            peopleRecognition = prefs[peopleRecognitionKey] ?: true,
            dementiaMode = prefs[dementiaModeKey] ?: false,
            careAccessibilityEnabled = prefs[careAccessibilityKey] ?: false,
            autoCapture = prefs[autoCaptureKey] ?: true,
            reducedMotion = prefs[reducedMotionKey] ?: false,
            highContrast = prefs[highContrastKey] ?: false,
            fontSize = storedFontSize
        )
    }

    suspend fun setMemoryDetection(enabled: Boolean) {
        context.settingsDataStore.edit { it[memoryDetectionKey] = enabled }
    }

    suspend fun setPeopleRecognition(enabled: Boolean) {
        context.settingsDataStore.edit { it[peopleRecognitionKey] = enabled }
    }

    suspend fun setDementiaMode(enabled: Boolean) {
        context.settingsDataStore.edit { it[dementiaModeKey] = enabled }
    }

    suspend fun setCareAccessibility(enabled: Boolean) {
        context.settingsDataStore.edit { it[careAccessibilityKey] = enabled }
    }

    suspend fun setAutoCapture(enabled: Boolean) {
        context.settingsDataStore.edit { it[autoCaptureKey] = enabled }
    }

    suspend fun setReducedMotion(enabled: Boolean) {
        context.settingsDataStore.edit { it[reducedMotionKey] = enabled }
    }

    suspend fun setHighContrast(enabled: Boolean) {
        context.settingsDataStore.edit { it[highContrastKey] = enabled }
    }

    suspend fun setFontSize(value: Int) {
        context.settingsDataStore.edit { it[fontSizeKey] = value }
    }
}
