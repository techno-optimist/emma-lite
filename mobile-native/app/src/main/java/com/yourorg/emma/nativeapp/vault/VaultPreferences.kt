package com.yourorg.emma.nativeapp.vault

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.vaultDataStore: DataStore<Preferences> by preferencesDataStore(name = "vault_prefs")

data class VaultMetadataPreference(
    val lastOpenedUri: String? = null,
    val lastVaultName: String? = null,
    val autosaveEnabled: Boolean = false,
    val onboardingSeen: Boolean = false,
    val lastOpenedAt: Long = 0L,
    val cryptoHintUri: String? = null,
    val cryptoHintFingerprint: String? = null,
    val cryptoHint: VaultCryptoHint? = null
)

class VaultPreferences(private val context: Context) {
    private val lastUriKey = stringPreferencesKey("last_uri")
    private val lastNameKey = stringPreferencesKey("last_name")
    private val autosaveKey = booleanPreferencesKey("autosave")
    private val onboardingSeenKey = booleanPreferencesKey("onboarding_seen")
    private val lastOpenedAtKey = longPreferencesKey("last_opened_at")
    private val cryptoUriKey = stringPreferencesKey("crypto_uri")
    private val cryptoIterationsKey = intPreferencesKey("crypto_iterations")
    private val cryptoSaltLenKey = intPreferencesKey("crypto_salt_len")
    private val cryptoIvLenKey = intPreferencesKey("crypto_iv_len")
    private val cryptoHasVersionKey = booleanPreferencesKey("crypto_has_version")
    private val cryptoStrategyKey = stringPreferencesKey("crypto_strategy")
    private val cryptoFingerprintKey = stringPreferencesKey("crypto_fingerprint")

    val metadata: Flow<VaultMetadataPreference> = context.vaultDataStore.data.map { prefs ->
        val cryptoUri = prefs[cryptoUriKey]
        val iterations = prefs[cryptoIterationsKey]
        val saltLen = prefs[cryptoSaltLenKey]
        val ivLen = prefs[cryptoIvLenKey]
        val hasVersion = prefs[cryptoHasVersionKey]
        val strategyName = prefs[cryptoStrategyKey]
        val fingerprint = prefs[cryptoFingerprintKey]
        val strategy = runCatching { VaultKeyStrategy.valueOf(strategyName ?: VaultKeyStrategy.WebCompat.name) }
            .getOrDefault(VaultKeyStrategy.WebCompat)
        val hint = if (cryptoUri != null && iterations != null && saltLen != null && ivLen != null && hasVersion != null) {
            VaultCryptoHint(iterations, saltLen, ivLen, hasVersion, strategy)
        } else {
            null
        }
        VaultMetadataPreference(
            lastOpenedUri = prefs[lastUriKey],
            lastVaultName = prefs[lastNameKey],
            autosaveEnabled = prefs[autosaveKey] ?: true,
            onboardingSeen = prefs[onboardingSeenKey] ?: false,
            lastOpenedAt = prefs[lastOpenedAtKey] ?: 0L,
            cryptoHintUri = cryptoUri,
            cryptoHintFingerprint = fingerprint,
            cryptoHint = hint
        )
    }

    suspend fun setLastOpened(uri: String?, name: String?) {
        context.vaultDataStore.edit { prefs ->
            if (uri != null) {
                prefs[lastUriKey] = uri
            } else {
                prefs.remove(lastUriKey)
            }
            if (!name.isNullOrBlank()) {
                prefs[lastNameKey] = name
            } else {
                prefs.remove(lastNameKey)
            }
            prefs[lastOpenedAtKey] = System.currentTimeMillis()
        }
    }

    suspend fun setAutosaveEnabled(enabled: Boolean) {
        context.vaultDataStore.edit { prefs ->
            prefs[autosaveKey] = enabled
        }
    }

    suspend fun setOnboardingSeen(seen: Boolean) {
        context.vaultDataStore.edit { prefs ->
            prefs[onboardingSeenKey] = seen
        }
    }

    suspend fun setCryptoHint(uri: String, hint: VaultCryptoHint, fingerprint: String) {
        context.vaultDataStore.edit { prefs ->
            prefs[cryptoUriKey] = uri
            prefs[cryptoIterationsKey] = hint.iterations
            prefs[cryptoSaltLenKey] = hint.saltLen
            prefs[cryptoIvLenKey] = hint.ivLen
            prefs[cryptoHasVersionKey] = hint.hasVersion
            prefs[cryptoStrategyKey] = hint.strategy.name
            prefs[cryptoFingerprintKey] = fingerprint
        }
    }
}
