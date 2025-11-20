# Emma Web Vault Security Analysis (Post-Mitigation)

_Prepared by Codex — October 19, 2025_

This document tracks the security posture of the web vault after the October 2025 hardening work. It records every mitigation that landed in the current branch and highlights remaining risks.

## Mitigations Implemented
- **Encrypted IndexedDB persistence** – saveToIndexedDB() now stores AES-256-GCM ciphertext plus metadata. Legacy plaintext backups re-encrypt the next time a vault is unlocked (js/emma-web-vault.js, overrides in the 2700s).
- **No automatic plaintext restoration** – Vault startup no longer marks the vault as open. The constructor caches only encrypted data; estoreVaultState() and the public unlock flow insist on a passphrase before decryption (js/emma-web-vault.js, constructor / restore helpers, window.emmaAPI.vault.unlock).
- **Media encryption enforcement** – Data URLs are converted to binary and routed through encryptData(), so every stored attachment carries encrypted: true (js/emma-web-vault.js, media helpers near the 1000s).
- **Passphrase lifecycle hardening** – The passphrase lives in memory only, clears after ~15 minutes of inactivity, and must be re-entered before any operation that needs the key (js/emma-web-vault.js, helpers around 2600–2700).
- **Safe IndexedDB/file fallback** – When direct file handles are missing, the vault keeps encrypted backups and prompts the user to re-establish access gracefully.
- **PBKDF2 standardization** – New saves use PBKDF2-SHA256 with 310k iterations. decryptData() records the iteration count, and exactWorkingDecrypt() now tries 250k and 100k iterations (covering historical extension files and newly saved web vaults) before failing (js/emma-web-vault.js, crypto helpers ~2000–2350).
- **Lazy vault bootstrap** – index.html exposes ensureEmmaWebVault() so UI entries load the vault script on demand before invoking crypto helpers, eliminating null-reference errors when the script is not yet loaded.
- **Inline script reduction / safer CSP** – The dashboard inline script moved into js/dashboard-init.js, event handlers were swapped for delegated listeners, and the backend CSP drops 'unsafe-eval' (dashboard.html, js/dashboard-init.js, server.js).
- **Console hygiene** – Emoji-heavy logs were replaced with ASCII-only messages to keep security-relevant traces readable.

## Findings and Status
### Critical
1. **Plaintext IndexedDB backups** – _Resolved._ IndexedDB now stores ciphertext/metadata only; legacy records re-encrypt on unlock.
2. **Passphrase bypass via auto-restore** – _Resolved._ Vaults stay locked until the user supplies the passphrase; cached data remains encrypted.
3. **Unencrypted media attachments** – _Resolved._ Every attachment is encrypted prior to persistence, and the vault tracks encrypted vs. legacy entries.
4. **Vault APIs exposed with permissive CSP** – _Partially mitigated._ The dashboard removed inline script and 'unsafe-eval', but many legacy pages still rely on inline handlers, so 'unsafe-inline' remains. Full CSP hardening depends on migrating those views.

### Medium
5. **Inconsistent KDF iterations** – _Resolved._ Encryption records the iteration count used; decryption tries the recorded value and known legacy fallbacks.
6. **Verbose debug logging** – _Outstanding._ Detailed debug output (e.g., attachment previews) remains and should be trimmed or gated before production.

## Verification Checklist
- IndexedDB (EmmaVault/current) contains encrypted bytes and metadata—no plaintext aultData.
- Unlock flow always prompts for the passphrase; successful unlocks re-encrypt legacy backups.
- Media saved through the UI is flagged encrypted: true and decrypts only after the passphrase is available in memory.
- exactWorkingDecrypt() opens vault files produced both by the legacy extension and the hardened web workflow (it tolerates optional version headers and multiple PBKDF2 iteration counts).
- dashboard.html loads js/dashboard-init.js; no inline <script> blocks remain on that page, and CSP responses omit 'unsafe-eval'.
- Console output uses plain ASCII text, avoiding the mojibake seen previously when emojis were logged.

## Residual Risks & Follow-Up
1. **Global exposure** – window.emmaWebVault and other helpers remain globally accessible. Any XSS still compromises vault contents. Long-term fix: isolate vault logic behind a worker or hardened message bridge.
2. **Inline handlers elsewhere** – Legacy dashboards (e.g., people, popup views) still use inline handlers. Migrating them would let us drop 'unsafe-inline' from the CSP entirely.
3. **Debug logging** – Remove or feature-flag the remaining verbose logs before shipping to production.
4. **Stronger KDF options** – Evaluate Argon2id or scrypt (via WASM) for future releases and consider adding MACs to detect vault tampering.
5. **Regression coverage** – Add automated tests for IndexedDB scraping, XSS, and vault re-open flows to guard against regressions.

## Summary
The hardened build enforces encryption at rest, mandates passphrase prompts before decryption, keeps IndexedDB backups in ciphertext, and maintains compatibility with both extension‑ and web-generated vaults. Dashboard scripting now runs without inline code, CSP no longer allows 'unsafe-eval', and crypto helpers correctly accommodate historical iteration counts. Remaining work centers on reducing exposed globals, finishing the CSP migration, trimming debug logs, and expanding automated security testing before declaring the web vault production-ready.
