**Critical Success Factor**: Every cloud feature must gracefully degrade to local-only mode. Cloud enhances but never replaces local ownership.

---

## 🔎 SHERLOCK PROTOCOL — Mobile Plan Pre‑Mortem, Conflict Analysis, and Future Wiring (Planner)

Date: January 2025

Vision recap: The phone stores a `.emma` file locally. The app unlocks it and provides the full Emma web app memory management experience inside a native shell, using our existing HTML/vanilla JS stack [[memory:6451476]], with the extension ethos of local, account‑free ownership preserved [[memory:6640701]]. Dementia Companion behaviors remain local and validation‑first [[memory:6149235]].

### 1) Critical Unknowns and Potential Fault Lines

- Web Crypto in Mobile WebViews
  - Issue: Inconsistent SubtleCrypto support/performance in iOS WKWebView; large PBKDF2/Argon2 workloads can stall UI.
  - Risk: Unlock latency (5–10s) on older devices; perceived app freeze.
  - Mitigation: Measure on target devices; consider moving KDF to a Web Worker; adopt Argon2id with mobile‑tuned params; ship native bridge fallback if required.

- Filesystem Semantics and iCloud/Device Backups
  - Issue: App sandbox may be backed up to iCloud by default (iOS) or Device Backup (Android), inadvertently creating cloud copies contrary to our privacy promise.
  - Risk: Users think data is “local‑only,” but it’s in platform backups.
  - Mitigation: Provide a user‑controlled setting: “Exclude vault from OS backups.” On iOS, set NSURLIsExcludedFromBackupKey on vault paths; clearly educate users in UI.

- Atomicity, Power Loss, and Large Media Writes
  - Issue: Multi‑hundred MB media writes risk partial/corrupted vault on crash/kill/disk full.
  - Risk: Data loss; vault unreadable.
  - Mitigation: Write‑ahead journal (temp file + manifest) and atomic rename; per‑chunk checksums; resume on next launch; out‑of‑space preflight checks.

- Single‑File Container vs. Sidecar Media
  - Issue: Single `.emma` simplifies ownership but inflates I/O for small edits with large media; risk of long writes.
  - Risk: Battery drain, timeouts, perceived slowness.
  - Mitigation: v1 keep single file for simplicity; enable optional “performance mode” using a managed sidecar folder for media with content‑addressed blobs and references in the vault; do not expose folder to users directly.

- Biometric Quick Unlock Semantics
  - Issue: Keychain/Keystore wrapping must not become a single point of lockout if biometrics change/fail.
  - Risk: Permanent loss of access.
  - Mitigation: Always retain passphrase path; store only wrapped session key; require passphrase for critical operations (rotation, export).

- PWA Fallback Reality (Especially iOS)
  - Issue: OPFS/IndexedDB eviction, storage quotas, and install quirks; background lifecycle fragility; limited file picker integrations.
  - Risk: User trusts PWA like a native app but loses data after OS cleanup.
  - Mitigation: Treat PWA as explicit fallback with strong warnings and frequent export nudges; prefer native shell for iOS.

- Background Lifecycle and Long Operations
  - Issue: OS can kill the app during long writes or imports.
  - Risk: Partial writes; user confusion.
  - Mitigation: Foreground required for critical operations; show persistent progress UI; chunked commits; resume tokens.

- Platform Policy and Crypto Export
  - Issue: App Store export compliance for encryption; privacy manifests.
  - Risk: Review delays/rejection.
  - Mitigation: Use standard crypto; fill export questionnaire; document local‑only behavior; no third‑party analytics SDKs.

- Logging and Leaky Temp Files
  - Issue: Sensitive data in console logs or residual media in temp dirs.
  - Risk: Privacy breach on device; forensic leakage.
  - Mitigation: Strip sensitive logs in production; aggressively clean temp storage after use.

- Spec Drift and Legacy Vaults
  - Issue: Iteration/KDF param changes and field‑level encryption paths must stay compatible.
  - Risk: Old vaults fail to open or silently corrupt.
  - Mitigation: Versioned vault header; deterministic migration steps; strict open‑fail with clear UX if incompatible.

### 2) Architecture Conflicts and Integration Gaps

- Adapter Boundary Clarity (Must be rock‑solid)
  - Conflict: `js/emma-web-vault.js` assumes a browser/extension file handle; mobile needs a sandbox path + plugin I/O.
  - Resolution: Formalize `VaultStorageAdapter` contract (open/read/write/export/import/listRecent), route all file I/O through it; zero direct file calls elsewhere.

- Crypto Work Distribution
  - Conflict: UI thread blocking during KDF and encryption; WebView single‑threaded pain.
  - Resolution: Web Workers for crypto; consider WASM Argon2; native plugin fallback as last resort.

- Asset Loading and Offline Bundling
  - Conflict: Pages assume network/relative paths.
  - Resolution: Bundle assets with Capacitor; audit `fetch()` and relative URLs; implement a URL resolver using the app’s base path.

- Media Capture Pipeline
  - Conflict: Browser‑centric capture code vs native intents and temp files.
  - Resolution: Standardize a `MediaCaptureService` that normalizes Camera/Gallery inputs to blob streams; adapter writes to vault or sidecar.

- Dementia Companion Continuous Listening
  - Conflict: Mobile mic permissions, OS background constraints, anxiety‑reducing delay behavior.
  - Resolution: Foreground‑only continuous mode; clear mic indicators; 2–3s delay retained; avoid background recording to pass review [[memory:6149235]].

### 3) Future Issues (See Forward 6–12 Months)

- Vault Growth and Device Storage Pressure
  - Expect multi‑GB vaults; need lifecycle policies, duplicate detection, and storage usage dashboard.

- Cross‑Device Transfer UX
  - Family workflows to move `.emma` between iOS and Android; need checksum validation and guidance.

- Recovery and Guardianship
  - Trusted contacts and printable recovery hints (local only) to reduce passphrase loss for dementia contexts.

- Optional Cloud Add‑On (Later)
  - If enabled by users, must remain opt‑in and encrypted end‑to‑end; mobile app should treat cloud as remote storage behind the same adapter interface.

### 4) Concrete Wiring Plan (From Today’s Code → Mobile App)

- Introduce `VaultStorageAdapter` and refactor all vault I/O routes to use it (web/extension/electron/mobile) [[memory:5722592]].
- Implement `CapacitorFilesystemAdapter` and `PWA_OPFS_Adapter` with identical semantics (open/read/write/export/import/listRecent).
- Add `MediaCaptureService` to normalize camera/gallery pipelines.
- Move KDF/encrypt/decrypt into Web Workers; add WASM Argon2 path; preserve PBKDF2 for compatibility.
- Add journaling system inside adapter: write to `vault.tmp` + manifest; atomic rename to `.emma`.
- Add backup exclusion toggle (iOS/Android) with clear education and default to “included” to respect user platform backups unless explicitly disabled.
- Add “Vault Health” self‑check: validate checksums, manifest, and recent writes; offer repair if mismatch.
- Add settings to enable biometric quick unlock; always retain passphrase path.

### 5) Test/Verification Extensions (Pre‑Build Gates)

- Crypto latency budget: unlock < 1500ms median on iPhone 12 and Pixel 6 using chosen KDF params; p95 < 3000ms.
- Corruption chaos: kill app mid‑write across 100 trials; 100% recoverable or failsafe with clear error; no silent corruption.
- Disk full chaos: simulate low storage; ensure preflight prevents destructive writes; show actionable UI.
- Backup reality: verify iOS/Android backup behavior with and without exclusion flag; document clearly in app.
- PWA eviction reality: verify iOS PWA eviction risks and show forced export cadence.
- Accessibility: WCAG AA checks for mobile layouts; dementia validation language audits.

### 6) Decision Gates and Kill Criteria

- Gate A (Feasibility): SubtleCrypto + Web Worker KDF meets latency budget on test devices. If not, implement native crypto fallback; if still failing, halt and reassess platform approach (e.g., Tauri Mobile) before broad build.
- Gate B (Data Safety): Journaling passes chaos tests; if not, do not ship.
- Gate C (Privacy Promise): Backup behavior and user education are crystal‑clear; switch defaults if confusion persists.
- Gate D (Store Readiness): App review checklist passes dry‑run; if blocked on background audio/recording, scope dementia continuous listening strictly to foreground.

### 7) PRD Gaps to Address (Delta to `docs/mobile/PRD-Emma-Mobile-App.md`)

- Add backup exclusion toggle requirement + education copy.
- Specify journaling/atomic rename and chaos‑testing as non‑functional requirements.
- Define KDF parameter targets per device class; add Web Worker/WASM requirement.
- Add “Vault Health” self‑check flows and repair UX.
- Clarify PWA fallback warnings and export cadence prompts on iOS.

### 8) Open Questions for Final Sign‑off

- Single‑file purity vs sidecar performance: Do we permit a “performance mode” in v1 or hold for v1.1?
- Default for backup exclusion: Include in OS backups by default (safer for loss) vs exclude by default (stricter privacy)?
- Argon2id availability vs PBKDF2 compatibility: Which is default on mobile? Consider dual‑path with header flags.
- Biometric unlock scope: Which actions remain strictly passphrase‑gated (e.g., export, key rotation)?

### Planner Verdict (Do Not Build Yet)

Do not proceed to implementation until Gates A–D are satisfied and PRD deltas are applied. The adapter boundary, journaling, crypto performance, backup semantics, and UX education are the most important risks to retire up‑front. Once resolved, the current plan yields a minimal‑change, high‑confidence path to shipping the full Emma web app experience on mobile while honoring our local‑first promise.