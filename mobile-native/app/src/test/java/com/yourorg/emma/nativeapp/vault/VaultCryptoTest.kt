package com.yourorg.emma.nativeapp.vault

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
import java.nio.file.Paths
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class VaultCryptoTest {
    private val fixturePassphrase = "emma-native-fixture".toCharArray()
    // Running from app module working dir; climb to repo/docs/fixtures
    private val fixturesDir = Paths.get("..", "..", "docs", "fixtures").toFile()
    private val json = Json { ignoreUnknownKeys = true }

    private fun readFixture(name: String): ByteArray {
        val file = File(fixturesDir, name)
        require(file.exists()) { "Fixture not found: ${file.absolutePath}" }
        return file.readBytes()
    }

    @Test
    fun `decrypts 100k fixture`() {
        val crypto = VaultCrypto()
        val file = readFixture("vault-100000.emma")
        val payload = crypto.decryptPayload(file, fixturePassphrase)
        assertEquals(100_000, payload.encryption.iterations)
        val reenc = crypto.encryptPayload(payload, fixturePassphrase, VaultSpec.DEFAULT_ITERATIONS_CREATE)
        assertEquals("EMMA", String(reenc.take(4).toByteArray(), Charsets.US_ASCII))
    }

    @Test
    fun `decrypts 310k fixture`() {
        val crypto = VaultCrypto()
        val file = readFixture("vault-310000.emma")
        val payload = crypto.decryptPayload(file, fixturePassphrase)
        assertEquals(310_000, payload.encryption.iterations)
        val reenc = crypto.encryptPayload(payload, fixturePassphrase, VaultSpec.DEFAULT_ITERATIONS_REWRAP)
        assertEquals("EMMA", String(reenc.take(4).toByteArray(), Charsets.US_ASCII))
        assert(payload.name.isNotBlank())
    }

    @Test
    fun `decrypts 100k fixture with version header present`() {
        val crypto = VaultCrypto()
        val file = readFixture("vault-100000.emma")
        // Inject a 2-byte version header after magic to mirror web-written files.
        val versioned = ByteArray(file.size + VaultSpec.VERSION_BYTES.size)
        file.copyInto(versioned, destinationOffset = 0, endIndex = 4) // EMMA
        VaultSpec.VERSION_BYTES.copyInto(versioned, destinationOffset = 4)
        file.copyInto(
            versioned,
            destinationOffset = 4 + VaultSpec.VERSION_BYTES.size,
            startIndex = 4
        )
        val payload = crypto.decryptPayload(versioned, fixturePassphrase)
        assertEquals(100_000, payload.encryption.iterations)
    }

    @Test
    fun `encrypts with version header when enabled`() {
        val crypto = VaultCrypto(includeVersionHeader = true)
        val payload = VaultPayload(name = "Test", content = VaultContent())
        val bytes = crypto.encryptPayload(payload, fixturePassphrase, VaultSpec.DEFAULT_ITERATIONS_CREATE)
        assertArrayEquals(VaultSpec.VERSION_BYTES, bytes.copyOfRange(4, 6))
    }

    @Test
    fun `native round trip without version header`() {
        val crypto = VaultCrypto(includeVersionHeader = false)
        val payload = VaultPayload(name = "Native Vault", content = VaultContent())
        val encrypted = crypto.encryptPayload(payload, fixturePassphrase, VaultSpec.DEFAULT_ITERATIONS_CREATE)
        val decrypted = crypto.decryptPayload(encrypted, fixturePassphrase)
        assertEquals("Native Vault", decrypted.name)
        assertEquals(VaultSpec.DEFAULT_ITERATIONS_CREATE, decrypted.encryption.iterations)
    }

    @Test
    fun `decrypts payload written with non-default iteration candidate`() {
        val crypto = VaultCrypto()
        val iterations = 262_144 // used by web reader as a migration candidate
        val payload = VaultPayload(name = "Candidate Vault", content = VaultContent())
        val encrypted = crypto.encryptPayload(payload, fixturePassphrase, iterations)
        val decrypted = crypto.decryptPayload(encrypted, fixturePassphrase, mode = VaultCryptoMode.Legacy)
        assertEquals(iterations, decrypted.encryption.iterations)
    }

    @Test
    fun `decrypts flexible salt and iv lengths`() {
        val saltLen = 16
        val ivLen = 16
        val iterations = 200_000
        val payload = VaultPayload(
            name = "Flex Vault",
            encryption = VaultEncryption(iterations = iterations, salt = emptyList()),
            content = VaultContent()
        )
        val file = buildFlexibleVault(payload, fixturePassphrase, saltLen, ivLen, iterations)
        val decrypted = VaultCrypto().decryptPayload(file, fixturePassphrase, mode = VaultCryptoMode.Legacy)
        assertEquals(iterations, decrypted.encryption.iterations)
        assertEquals("Flex Vault", decrypted.name)
    }

    private fun buildFlexibleVault(
        payload: VaultPayload,
        passphrase: CharArray,
        saltLen: Int,
        ivLen: Int,
        iterations: Int
    ): ByteArray {
        val salt = ByteArray(saltLen) { index -> ((index + 3) % 251).toByte() } // deterministic, avoids version-byte collision
        val iv = ByteArray(ivLen) { index -> ((index + 17) % 251).toByte() }
        val jsonBytes = json.encodeToString(payload).toByteArray(Charsets.UTF_8)
        val keyFactory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val keySpec = PBEKeySpec(passphrase, salt, iterations, VaultSpec.KEY_LEN_BITS)
        val key = keyFactory.generateSecret(keySpec).encoded
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, iv))
        val ciphertext = cipher.doFinal(jsonBytes)

        val header = VaultSpec.MAGIC.toByteArray(Charsets.US_ASCII)
        val result = ByteArray(header.size + salt.size + iv.size + ciphertext.size)
        header.copyInto(result, 0)
        salt.copyInto(result, header.size)
        iv.copyInto(result, header.size + salt.size)
        ciphertext.copyInto(result, header.size + salt.size + iv.size)
        return result
    }
}
