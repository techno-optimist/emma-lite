## Emma Vault File Format (Working Notes for Native Parity)

Status: Implemented in `mobile-native` (see `VaultCrypto`/`VaultRepository`). This document reflects current parity expectations and fixtures.

### File Container Layout (current web implementation)
- Magic: ASCII `EMMA` (4 bytes).
- Optional version (observed in layouts): 2 bytes (major, minor). Readers accept both versioned and unversioned layouts.
- Salt: 32 bytes (Uint8Array). Web code uses `generateSalt()` with default length 32.
- IV: 12 bytes (Uint8Array) for AES-GCM (default in web writes).
- Ciphertext: remainder of file (AES-GCM encrypted JSON payload).
- Default write path: `EMMA + salt(32) + iv(12) + ciphertext`. Web writes are unversioned today; native writes are unversioned by default but can include a version header when enabled.

### Crypto Parameters (observed)
- Cipher: AES-GCM, key length 256 bits.
- KDF: PBKDF2-HMAC-SHA256.
- Iterations:
  - New vault creation (native): 100_000.
  - Web default: 250_000.
  - `applyNewPassphrase` (re-wrapping): 310_000.
  - Decryptor tries multiple candidates: [500000, 400000, 350000, 330000, 320000, 310000, 300000, 280000, 262144, 250000, 200000, 175000, 150000, 125000, 110000, 100000, 96000, 80000, 64000, ...].
- Salt length: 32 bytes (primary); reader also tolerates other lengths (16, 24, 48, 64, 40).
- IV length: 12 bytes (primary); reader tolerates 16, 24.
- Native status: Kotlin `VaultCrypto` supports optional version headers, fast-mode decrypt for primary layouts, and legacy-mode decrypt for candidate iterations/salt/IV variants. Tests cover 100k/310k fixtures, a non-default iteration (262,144), and a flexible layout (16-byte salt + 16-byte IV).
- Storage permissions: Native tracks persisted SAF permissions; if access expires, UI prompts users to reselect the vault before decrypting.

### Plaintext JSON Shape (high level)
- `version`, `created`, `name`.
- `encryption`: `{ algorithm: 'AES-GCM', keyDerivation: 'PBKDF2', iterations: <number>, salt: <Uint8Array> }`.
- `content`: `{ memories: {}, people: {}, media: {}, relationships: {}, settings: {} }` where values are JSON-encoded strings for web/native compatibility, plus stats.
- Stats fields: `memoryCount`, `peopleCount`, `mediaCount`, `totalSize`.

### Fixtures (current)
- `docs/fixtures/vault-100000.emma` and `docs/fixtures/vault-310000.emma` using passphrase `emma-native-fixture`.
- `docs/fixtures/metadata.json` records salt/IV, total length, and SHA-256 for assertions.

### Kotlin Implementation Notes (current)
- AES-GCM with 12-byte IV, PBKDF2WithHmacSHA256, key length 256.
- Default write: `EMMA + salt32 + iv12 + ciphertext` (optional version header via `VaultCrypto(includeVersionHeader = true)`).
- Fast decrypt: primary layout + common iterations; legacy decrypt: full candidate list and salt/IV variants.
- No passphrase at rest. Cache in memory only; store last vault URI/name and crypto hint in preferences.

### Validation Notes
- Web files may include an optional version header; native handles both layouts.
- Iteration candidates include 100k/250k/310k plus the legacy list for back-compat.
- Recovery flows that re-wrap should use 310k; native supports that value.
