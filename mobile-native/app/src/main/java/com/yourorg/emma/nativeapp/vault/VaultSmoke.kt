package com.yourorg.emma.nativeapp.vault

/**
 * Small value objects used by the QA/smoke helpers to summarize vault health.
 */
data class VaultResumeStatus(
    val hasRecentUri: Boolean,
    val hasPersistedPermission: Boolean,
    val hasAutosave: Boolean,
    val autosavePath: String?,
    val lastOpenedAt: Long?,
    val lastVaultName: String?
) {
    val ok: Boolean get() = hasAutosave || (hasRecentUri && hasPersistedPermission)
    val needsPermission: Boolean get() = hasRecentUri && !hasPersistedPermission
}

data class VaultCryptoStatus(
    val roundTripOk: Boolean,
    val rewrapOk: Boolean,
    val message: String? = null
) {
    val ok: Boolean get() = roundTripOk && rewrapOk
}
