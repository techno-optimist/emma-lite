package com.yourorg.emma.nativeapp.vault

import android.util.Log
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.security.SecureRandom
import java.time.Instant
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

enum class VaultCryptoMode { Fast, Legacy }

enum class VaultKeyStrategy { WebCompat, Direct }

data class VaultCryptoHint(
    val iterations: Int,
    val saltLen: Int,
    val ivLen: Int,
    val hasVersion: Boolean,
    val strategy: VaultKeyStrategy = VaultKeyStrategy.WebCompat
)

data class VaultPayloadResult(
    val payload: VaultPayload,
    val hint: VaultCryptoHint
)

/**
 * Kotlin vault crypto aligned with the web implementation.
 * Handles both versioned (EMMA + 2-byte version + salt + iv + ciphertext) and
 * legacy unversioned layouts written by the native Android app; writes stay
 * unversioned by default to match existing native files.
 *
 * Decryption runs in fast mode by default (single-layout, limited iterations).
 * Legacy compatibility mode can be opted into explicitly.
 */
class VaultCrypto(
    private val secureRandom: SecureRandom = SecureRandom(),
    private val json: Json = Json { ignoreUnknownKeys = true },
    private val includeVersionHeader: Boolean = false
) {
    private val tag = "VaultCrypto"
    val writesVersionHeader: Boolean
        get() = includeVersionHeader

    private fun safeLog(message: String) {
        runCatching { Log.d(tag, message) }.onFailure { println("$tag: $message") }
    }

    private fun deriveKey(passphrase: CharArray, salt: ByteArray, iterations: Int): ByteArray {
        val passBytes = passphrase.concatToString().toByteArray(Charsets.UTF_8)
        val passChars = passBytes.map { it.toInt().toChar() }.toCharArray()
        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val spec = PBEKeySpec(passChars, salt, iterations, VaultSpec.KEY_LEN_BITS)
        return factory.generateSecret(spec).encoded
    }

    private fun deriveKeyDirect(passphrase: CharArray, salt: ByteArray, iterations: Int): ByteArray {
        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val spec = PBEKeySpec(passphrase, salt, iterations, VaultSpec.KEY_LEN_BITS)
        return factory.generateSecret(spec).encoded
    }

    private fun deriveKey(strategy: VaultKeyStrategy, passphrase: CharArray, salt: ByteArray, iterations: Int): ByteArray {
        return when (strategy) {
            VaultKeyStrategy.WebCompat -> deriveKey(passphrase, salt, iterations)
            VaultKeyStrategy.Direct -> deriveKeyDirect(passphrase, salt, iterations)
        }
    }

    fun encrypt(plaintext: ByteArray, passphrase: CharArray, iterations: Int = VaultSpec.DEFAULT_ITERATIONS_CREATE): ByteArray {
        val salt = ByteArray(VaultSpec.SALT_LEN_PRIMARY).also { secureRandom.nextBytes(it) }
        val iv = ByteArray(VaultSpec.IV_LEN_PRIMARY).also { secureRandom.nextBytes(it) }
        val key = deriveKey(passphrase, salt, iterations)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, iv))
        val ciphertext = cipher.doFinal(plaintext)
        return buildPacket(salt, iv, ciphertext)
    }

    fun decrypt(
        file: ByteArray,
        passphrase: CharArray,
        hint: VaultCryptoHint? = null,
        mode: VaultCryptoMode = VaultCryptoMode.Fast
    ): ByteArray {
        return decryptWithResult(file, passphrase, hint, mode).plaintext
    }

    fun decryptPayload(
        file: ByteArray,
        passphrase: CharArray,
        hint: VaultCryptoHint? = null,
        mode: VaultCryptoMode = VaultCryptoMode.Fast
    ): VaultPayload {
        val result = decryptWithResult(file, passphrase, hint, mode)
        val jsonString = result.plaintext.toString(Charsets.UTF_8)
        return json.decodeFromString(VaultPayload.serializer(), jsonString)
    }

    fun decryptPayloadWithHint(
        file: ByteArray,
        passphrase: CharArray,
        hint: VaultCryptoHint? = null,
        mode: VaultCryptoMode = VaultCryptoMode.Fast
    ): VaultPayloadResult {
        val result = decryptWithResult(file, passphrase, hint, mode)
        val jsonString = result.plaintext.toString(Charsets.UTF_8)
        val payload = json.decodeFromString(VaultPayload.serializer(), jsonString)
        return VaultPayloadResult(payload, result.hint)
    }

    private data class VaultDecryptResult(val plaintext: ByteArray, val hint: VaultCryptoHint)

    private fun decryptWithResult(
        file: ByteArray,
        passphrase: CharArray,
        hint: VaultCryptoHint?,
        mode: VaultCryptoMode
    ): VaultDecryptResult {
        require(file.size > 4) { "File too small" }
        val magic = String(file, 0, 4, Charsets.US_ASCII)
        require(magic == VaultSpec.MAGIC) { "Invalid magic" }

        return when (mode) {
            VaultCryptoMode.Fast -> decryptFast(file, passphrase, hint)
            VaultCryptoMode.Legacy -> decryptLegacy(file, passphrase)
        }
    }

    private fun decryptFast(file: ByteArray, passphrase: CharArray, hint: VaultCryptoHint?): VaultDecryptResult {
        val hasVersion = hasVersionHeader(file)
        val saltLen = VaultSpec.SALT_LEN_PRIMARY
        val ivLen = VaultSpec.IV_LEN_PRIMARY
        val layout = buildLayout(file, saltLen, ivLen, hasVersion)
            ?: throw IllegalArgumentException("Unsupported vault layout")

        val normalizedHint = hint?.copy(hasVersion = hasVersion, saltLen = saltLen, ivLen = ivLen)
        val iterations = if (hasVersion) {
            listOf(
                VaultSpec.DEFAULT_ITERATIONS_WEB,
                VaultSpec.DEFAULT_ITERATIONS_CREATE,
                VaultSpec.DEFAULT_ITERATIONS_REWRAP
            )
        } else {
            listOf(
                VaultSpec.DEFAULT_ITERATIONS_CREATE,
                VaultSpec.DEFAULT_ITERATIONS_WEB,
                VaultSpec.DEFAULT_ITERATIONS_REWRAP
            )
        }.distinct()
        val attempts = LinkedHashMap<Int, VaultCryptoHint>()
        normalizedHint?.let { attempts[it.iterations] = it }
        iterations.forEach { iter ->
            attempts.putIfAbsent(
                iter,
                VaultCryptoHint(
                    iterations = iter,
                    saltLen = saltLen,
                    ivLen = ivLen,
                    hasVersion = hasVersion
                )
            )
        }

        var lastError: Exception? = null
        for (attempt in attempts.values) {
            val strategies = listOf(attempt.strategy, VaultKeyStrategy.Direct).distinct()
            for (strategy in strategies) {
                try {
                    safeLog("Decrypt attempt iter=${attempt.iterations} saltLen=${layout.salt.size} ivLen=${layout.iv.size} strategy=${strategy.ordinal} hasVersion=${layout.hasVersion}")
                    val plain = decryptWithLayout(layout, passphrase, attempt.iterations, strategy)
                    safeLog("Decrypt success iter=${attempt.iterations} saltLen=${layout.salt.size} ivLen=${layout.iv.size} strategy=${strategy.ordinal} hasVersion=${layout.hasVersion}")
                    return VaultDecryptResult(plain, attempt.copy(strategy = strategy))
                } catch (e: Exception) {
                    lastError = e
                }
            }
        }
        throw IllegalArgumentException("Unable to decrypt with stored vault parameters", lastError)
    }

    fun encryptPayload(payload: VaultPayload, passphrase: CharArray, iterations: Int = VaultSpec.DEFAULT_ITERATIONS_CREATE): ByteArray {
        val salt = ByteArray(VaultSpec.SALT_LEN_PRIMARY).also { secureRandom.nextBytes(it) }
        val iv = ByteArray(VaultSpec.IV_LEN_PRIMARY).also { secureRandom.nextBytes(it) }
        val updatedPayload = payload.copy(
            encryption = payload.encryption.copy(
                iterations = iterations,
                salt = salt.map { it.toInt() }
            ),
            created = payload.created.ifBlank { Instant.now().toString() }
        )
        val jsonBytes = json.encodeToString(updatedPayload).toByteArray(Charsets.UTF_8)
        val key = deriveKey(passphrase, salt, iterations)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, iv))
        val ciphertext = cipher.doFinal(jsonBytes)
        return buildPacket(salt, iv, ciphertext)
    }

    private fun buildPacket(salt: ByteArray, iv: ByteArray, ciphertext: ByteArray): ByteArray {
        val header = VaultSpec.MAGIC.toByteArray(Charsets.US_ASCII)
        val version = if (includeVersionHeader) VaultSpec.VERSION_BYTES else ByteArray(0)
        val offset = header.size + version.size
        val result = ByteArray(offset + salt.size + iv.size + ciphertext.size)
        header.copyInto(result, 0)
        if (version.isNotEmpty()) {
            version.copyInto(result, header.size)
        }
        salt.copyInto(result, offset)
        iv.copyInto(result, offset + salt.size)
        ciphertext.copyInto(result, offset + salt.size + iv.size)
        return result
    }

    private data class ParsedLayout(val salt: ByteArray, val iv: ByteArray, val ciphertext: ByteArray, val hasVersion: Boolean)

    private fun hasVersionHeader(file: ByteArray): Boolean {
        val start = VaultSpec.MAGIC.length
        val end = start + VaultSpec.VERSION_BYTES.size
        if (file.size <= end) return false
        return file.copyOfRange(start, end).contentEquals(VaultSpec.VERSION_BYTES)
    }

    private fun buildLayout(file: ByteArray, saltLen: Int, ivLen: Int, hasVersion: Boolean): ParsedLayout? {
        val offset = VaultSpec.MAGIC.length + if (hasVersion) VaultSpec.VERSION_BYTES.size else 0
        val startIv = offset + saltLen
        val startCipher = startIv + ivLen
        if (startCipher >= file.size) return null
        val salt = file.copyOfRange(offset, offset + saltLen)
        val iv = file.copyOfRange(startIv, startIv + ivLen)
        val ciphertext = file.copyOfRange(startCipher, file.size)
        return if (ciphertext.isNotEmpty()) ParsedLayout(salt, iv, ciphertext, hasVersion) else null
    }

    private fun decryptWithLayout(
        layout: ParsedLayout,
        passphrase: CharArray,
        iterations: Int,
        strategy: VaultKeyStrategy
    ): ByteArray {
        val key = deriveKey(strategy, passphrase, layout.salt, iterations)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, layout.iv))
        return cipher.doFinal(layout.ciphertext)
    }

    private fun decryptLegacy(file: ByteArray, passphrase: CharArray): VaultDecryptResult {
        val layouts = detectLayouts(file)
        // Front-load the most common iteration counts (native create + rewrap) and
        // then try the remaining candidates from smallest to largest to avoid
        // long PBKDF2 runs before hitting the likely match.
        val candidates = buildList<Int> {
            add(VaultSpec.DEFAULT_ITERATIONS_CREATE)
            add(VaultSpec.DEFAULT_ITERATIONS_REWRAP)
            addAll(VaultSpec.ITERATION_CANDIDATES.sorted())
        }.distinct()
        val strategies = listOf(VaultKeyStrategy.WebCompat, VaultKeyStrategy.Direct)
        var lastError: Exception? = null
        for (layout in layouts) {
            for (iter in candidates) {
                for (strategy in strategies) {
                    try {
                        safeLog("Decrypt attempt iter=$iter saltLen=${layout.salt.size} ivLen=${layout.iv.size} strategy=${strategy.ordinal} hasVersion=${layout.hasVersion}")
                        val plain = decryptWithLayout(layout, passphrase, iter, strategy)
                        safeLog("Decrypt success iter=$iter saltLen=${layout.salt.size} ivLen=${layout.iv.size} strategy=${strategy.ordinal} hasVersion=${layout.hasVersion}")
                        return VaultDecryptResult(
                            plain,
                            VaultCryptoHint(
                                iterations = iter,
                                saltLen = layout.salt.size,
                                ivLen = layout.iv.size,
                                hasVersion = layout.hasVersion,
                                strategy = strategy
                            )
                        )
                    } catch (e: Exception) {
                        lastError = e
                    }
                }
            }
        }
        throw IllegalArgumentException("Unable to decrypt with provided passphrase/iterations", lastError)
    }

    private fun detectLayouts(file: ByteArray): List<ParsedLayout> {
        val hasVersion = hasVersionHeader(file)
        val offset = VaultSpec.MAGIC.length + if (hasVersion) VaultSpec.VERSION_BYTES.size else 0

        val candidates = VaultSpec.SUPPORTED_SALT_LENGTHS.flatMap { saltLen ->
            VaultSpec.SUPPORTED_IV_LENGTHS.map { ivLen -> saltLen to ivLen }
        }
        return candidates.mapNotNull { (saltLen, ivLen) ->
            val startIv = offset + saltLen
            val startCipher = startIv + ivLen
            if (startCipher >= file.size) return@mapNotNull null
            val salt = file.copyOfRange(offset, offset + saltLen)
            val iv = file.copyOfRange(startIv, startIv + ivLen)
            val ciphertext = file.copyOfRange(startCipher, file.size)
            if (ciphertext.isNotEmpty()) {
                ParsedLayout(salt, iv, ciphertext, hasVersion)
            } else {
                null
            }
        }.ifEmpty { throw IllegalArgumentException("Unsupported vault layout") }
    }
}
