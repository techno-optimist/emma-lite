package com.yourorg.emma.nativeapp.vault

/**
 * Vault format constants mirrored from the web implementation.
 * These values drive the Kotlin crypto implementation to stay interoperable.
 */
object VaultSpec {
    const val MAGIC = "EMMA"
    val VERSION_BYTES = byteArrayOf(1, 0)
    const val SALT_LEN_PRIMARY = 32
    const val IV_LEN_PRIMARY = 12
    const val KEY_LEN_BITS = 256
    const val DEFAULT_ITERATIONS_CREATE = 100_000
    const val DEFAULT_ITERATIONS_WEB = 250_000
    const val DEFAULT_ITERATIONS_REWRAP = 310_000

    // Web decryptor tries a broad set of iteration candidates; keep here for parity.
    val ITERATION_CANDIDATES = listOf(
        500_000, 400_000, 350_000, 330_000, 320_000,
        310_000, 300_000, 280_000, 262_144, 250_000,
        200_000, 175_000, 150_000, 125_000, 110_000,
        100_000, 96_000, 80_000, 64_000
    )

    val SUPPORTED_SALT_LENGTHS = listOf(32, 16, 24, 48, 64, 40)
    val SUPPORTED_IV_LENGTHS = listOf(12, 16, 24)
}
