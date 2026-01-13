package com.yourorg.emma.nativeapp.vault

import android.net.Uri

enum class VaultStatus { Empty, Loading, Ready, Error }

data class VaultState(
    val status: VaultStatus = VaultStatus.Empty,
    val payload: VaultPayload? = null,
    val activeUri: Uri? = null,
    val lastOpenedUri: Uri? = null,
    val lastVaultName: String? = null,
    val lastOpenedAt: Long? = null,
    val lastSavedAt: Long? = null,
    val hasPersistedPermission: Boolean = false,
    val hasAutosave: Boolean = false,
    val autosaveEnabled: Boolean = false,
    val onboardingSeen: Boolean = false,
    val isDirty: Boolean = false,
    val constellationSaveInProgress: Boolean = false,
    val message: String? = null,
    val error: String? = null
) {
    val vaultName: String?
        get() = payload?.name

    val hasRecentVault: Boolean
        get() = lastOpenedUri != null
}
