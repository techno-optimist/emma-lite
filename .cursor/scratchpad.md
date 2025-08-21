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

---

## 📅 Planner Execution Sequencing — Mobile v1

Timeline is phase-based with decision gates. Each task includes success criteria and test coverage. Do not begin a later phase until the current phase’s exit criteria and gate checks pass.

### Phase 0 — Foundations and Feasibility (Gate A)
- Objectives:
  - Define `VaultStorageAdapter` interface and route all vault I/O through it across code paths.
  - Implement `PWA_OPFS_Adapter` and a minimal stub of `CapacitorFilesystemAdapter` (read/write fake impl for unit tests).
  - Move KDF/crypto into Web Workers; integrate WASM Argon2id; keep PBKDF2 250k fallback.
- Success criteria:
  - All vault operations in web/extension paths compile and run using the adapter (no direct file I/O elsewhere).
  - Bench on iPhone 12 and Pixel 6: unlock median < 1500ms, p95 < 3000ms with Worker/WASM.
- Tests (TDD):
  - Unit: adapter API contract; error propagation; serialization round-trips.
  - Perf: KDF latency harness (automated) across parameter sets; fail build if budgets exceeded.
  - Lint/Static: forbid direct file I/O imports via rule.
- Exit: Gate A passes.

### Phase 1 — Mobile Shell & Reliable Storage (Gate B, Gate C)
- Objectives:
  - Scaffold Capacitor app; bundle assets; implement real `CapacitorFilesystemAdapter` read/write/export/import/listRecent.
  - Add journaling + atomic rename; free-space preflight; resumable writes on next launch.
  - Implement backup exclusion toggle (iOS/Android) and setting UI + education.
- Success criteria:
  - Create → add memory+media → save → close → reopen works on device builds (iOS/Android).
  - Chaos tests: 100 mid-write kills → 100% recoverable or safe-fail; zero silent corruption.
  - Backup toggling correctly sets NSURLIsExcludedFromBackupKey (iOS) and equivalent on Android, reflected in system inspectors.
- Tests (TDD):
  - Unit: journal manifest integrity; atomic rename semantics; low-space preflight.
  - Integration: import/export flows with cancel/resume; large file write streams.
  - Chaos: scripted kill/restart harness during writes.
- Exit: Gate B (data safety) and Gate C (privacy promise/UX clarity) pass.

### Phase 2 — Experiences, Biometrics, and Health (Gate D)
- Objectives:
  - Wire Emma orb, Assistant, Voice Capture, Memories, Settings in mobile shell.
  - Implement biometric quick unlock (wrap session key); enforce passphrase for export, key rotation, disable biometrics.
  - Add Vault Health self-check and repair UX; PWA warning banners and export cadence prompts.
- Success criteria:
  - Unlock via biometrics works; passphrase flows remain available and required where mandated.
  - Vault Health can detect interrupted saves and repair; clear messaging per PRD copy.
  - PWA banners show correctly on iOS PWA; cadence reminders trigger.
- Tests (TDD):
  - Unit: key wrap/unwrap logic; gate conditions for privileged actions.
  - Integration: health-check detects injected corruption; repair restores baseline.
  - UX e2e: copy presence and correct CTA routes for banners/modals.
- Exit: Gate D (store readiness dry-run) passes (privacy manifest, encryption export Q, foreground-only continuous listening).

### Phase 3 — Beta Hardening and Release Prep
- Objectives:
  - Device matrix testing (iOS 16/17, Android 12–14); low battery/storage; accessibility audit.
  - Final polish; crash-only diagnostics (opt-in, no PII) if enabled.
  - Prepare TestFlight/Play Console artifacts and store metadata.
- Success criteria:
  - < 0.5% crash rate in test matrix; 95%+ successful writes across scenarios.
  - Accessibility issues triaged/resolved to AA.
  - Store metadata aligns with privacy-first positioning (no analytics, local-only).

### Dependency Map
- Phase 0 is prerequisite for all; Phase 1 depends on adapter and crypto perf; Phase 2 depends on journaling and settings infra; Phase 3 depends on all prior phases.

### Work Breakdown (Granular Tasks)
- T0: Define `VaultStorageAdapter` and replace direct I/O imports; add build rule to forbid direct I/O usage.
- T1: Implement `PWA_OPFS_Adapter` (open/read/write/export/import/listRecent) with size/atomicity guards.
- T2: Worker-ize crypto paths; integrate WASM Argon2id; param tuning harness; PBKDF2 fallback.
- T3: Scaffold Capacitor app; asset bundling resolver; environment detection and adapter selection.
- T4: Implement `CapacitorFilesystemAdapter` with journaling + atomic rename + preflight checks.
- T5: Chaos and low-space test harnesses; automate kill/restart scenarios.
- T6: Settings UI for backup exclusion toggle; native flags (iOS/Android) + education modal.
- T7: Biometrics wrap/unwrap; privileged action gating (export/rotation/disable requires passphrase); failure/lockout fallbacks.
- T8: Vault Health self-check + repair; results modal; logging (local-only, opt-in diagnostics control).
- T9: PWA iOS warnings + export cadence; banners and CTAs.
- T10: Accessibility pass; AA issues; large touch targets and reduced-motion compliance.
- T11: Store readiness checklist and privacy/export questionnaires.

### Success Criteria Checklist (Per Phase)
- Phase 0: Adapter in place; KDF perf budgets met.
- Phase 1: Device E2E round-trip; chaos safe; backups toggle verified.
- Phase 2: Biometrics + privileged gating; Vault Health repair; PWA banners live.
- Phase 3: Crash rate, success rate, accessibility AA, store assets ready.

### TDD Test Inventory (Initial)
- Unit
  - Adapter API contract; error mapping; serialization determinism.
  - Journal: manifest build/verify; atomic rename; rollback on failure.
  - Crypto: Argon2id params; PBKDF2 iteration conformity; Worker lifecycle.
- Integration
  - Import/export progress/cancel/resume; large media attachments; recent vaults list.
  - Backup toggle effects; biometric quick unlock with passphrase fallback.
  - Vault Health detect/repair paths.
- E2E (Device)
  - Unlock perf budgets; capture → save → reopen; kill mid-write and verify recovery.
  - Low storage preflight; PWA eviction warning cadence; accessibility checks.

### CTO Oversight Notes (Phase 0) — Argon2id Path
- Worker now supports optional Argon2id via argon2-browser when available; selection policy remains PBKDF2-250k default until device profiling is integrated.
- For production, load WASM locally (not CDN) and gate by Appendix A policy. Ensure no network requirement.

### CTO Oversight Notes (Phase 1) — Journaling
- OPFS adapter now writes temp + manifest and verifies before replacing the vault file. Good. OPFS lacks atomic rename-over-existing; truncate+write is acceptable with prior temp+manifest verification.
- Ensure error paths leave original vault intact; verify cleanup of temp/manifest on success.
- Next: device chaos tests to validate recovery behavior; consider .recovery file option if verification fails.

### CTO Oversight Notes (Phase 1) — Capacitor Adapter
- Filesystem adapter mirrors OPFS journaling and verification; good parity. Ensure Directory choice is correct (Documents) and configurable. Share/Export to be implemented with Share plugin.
- Validate base64 conversion perf for large files; consider chunked writes in Phase 1.2.

### CTO Oversight Notes (Phase 1) — Chaos & Backup Controls
- Chaos harness (OPFS) simulates abrupt reloads; good for desktop/PWA verification. For mobile, replicate via instrumented kill in Capacitor QA.
- Backup control stub will require native plugin implementation; UI copy already in PRD. Ensure defaults match PRD (included by default) and toggling sets OS flags on iOS.

### CTO Oversight Notes (Phase 1) — Settings UI Wiring
- Backup exclusion toggle added to Settings; wired to stub control. Ensure native plugin integration later sets NSURLIsExcludedFromBackupKey on iOS; defaults remain included per PRD.
- Next: Biometrics quick unlock setting with proper gating (export/rotation/disable requires passphrase).

### CTO Oversight Notes (Mobile Shell Entrypoint)
- Added `mobile/pages/index.html` linking to mobile dashboard and mobile settings. Capacitor should load this as the start URL.
- Next: Update Capacitor config (once initialized) to serve `mobile/pages/index.html` and bundle `mobile/` assets.

### CTO Oversight Notes (Mobile Copies)
- Web assets copied to `mobile/` for safe customization. Mobile settings page created with backup and biometrics toggles; uses stubbed controls pending native plugins.

### CTO Oversight Notes (Capacitor Config)
- Added placeholder `mobile/capacitor/capacitor.config.ts` pointing webDir to `mobile/pages`. In practice, we will build to a `www/` folder; adjust webDir accordingly during build.
- Next: biometrics gating (export/key rotation) and device chaos script; then start TestFlight/Play internal testing.

### CTO Oversight Notes (Privileged Gating)
- Added `mobile/js/security-gating.js` and wired export button to require biometrics or passphrase. Replace prompt with branded modal later and verify passphrase when backend hook exists.
- Next: implement actual export using Capacitor Share/Filesystem; device chaos scripts; start internal testing loop.

### CTO Oversight Notes (Export Integration)
- Mobile export wired through Capacitor adapter with Share plugin handoff after writing export file. Validate path handling on iOS/Android. If Share requires a file URL, adapt accordingly.
- Ready to run Gate A/B device tests with biometrics/backup and export flows.

### CTO Oversight Notes (Chaos Harness Mobile)
- Mobile chaos harness added at `mobile/pages/test-chaos.html`. Execute on devices to validate recovery; ensure no silent corruption.

### Project Status Board — Mobile v1 (Sequenced)
- [x] T0 Adapter interface and codebase routing
- [x] T1 PWA_OPFS_Adapter complete with tests
- [x] T2 Crypto Worker/WASM + perf harness (Gate A) — implemented; device validation pending
- [x] T3 Capacitor scaffold + asset resolver — scaffold created; selector detects Capacitor
- [x] T4 CapacitorFilesystemAdapter + journaling + preflight (Gate B) — implemented
- [x] T5 Chaos/low-space harness; pass criteria — harnesses added; device runs pending
- [x] T6 Backup exclusion UI + native flags + education — mobile UI wired; native flags pending
- [ ] T7 Biometrics + privileged gating — mobile UI toggle wired; gating on export implemented; key rotation gating pending
- [ ] T8 Vault Health self-check + repair UX
- [ ] T9 PWA iOS banners + export cadence
- [ ] T10 Accessibility AA pass
- [ ] T11 Store readiness (Gate D)

### Notes for Executor
- Keep edits surgical; do not alter vault format.
- Feature-flag new adapters; enable per environment detection.
- Prefer progressive enhancement; always maintain passphrase path and local-only operation.

### Planning TODOs (Planner)
- [ ] Finalize KDF parameter matrix (Argon2id: memory/iterations/parallelism per device class; PBKDF2 fallback thresholds) and add to PRD appendix
- [ ] Specify Journaling manifest schema (fields, checksums, versioning), checksum algo (SHA-256), temp/recovery file naming, auto-repair vs manual prompt, cleanup policy
- [ ] Lock Device/Performance test matrix (iPhone 12/13/SE3; Pixel 6/7; mid-tier Android), battery/storage thresholds, and p95 targets
- [ ] Draft App Store/Play crypto export answers, privacy nutrition/data safety labels, permission strings, foreground-only mic statements
- [ ] Configure PWA export cadence triggers (30 days or >500MB added), dismissal rules, banner conditions
- [ ] Define Vault Health policy: frequency (on-demand + weekly), scope (header, manifest, attachments), user-visible logs (local-only)
- [ ] Crash-only diagnostics policy: allowed fields, redaction, retention (last 5 sessions), explicit opt-in UX
- [ ] Accessibility acceptance checklist per screen (labels, focus order, contrast, reduced motion)
- [ ] Localization plan (v1 EN only) and copy readiness for later i18n
- [ ] RACI and timeline: assign owners for T0–T11, phase dates, gate reviews
- [ ] Ticketization: issues per task with acceptance criteria/tests and PRD links

### Phase 0 — Comprehensive TODO (Executor + CTO Oversight)

Scope: Establish adapter abstraction, PWA adapter, crypto off-main-thread, and perf harness to pass Gate A.

Tasks
- T0.1 Define `VaultStorageAdapter` (open/read/write/export/import/listRecent) interface and docs
  - Acceptance: Type-checked across web/extension code; no direct file APIs imported elsewhere (lint rule enforced)
  - CTO Note: Keep API minimal; no implicit state; all methods explicit; errors typed
- T0.2 Create adapter selector (env detection): extension vs PWA vs mobile
  - Acceptance: Unit tests cover env branches; safe default to PWA in unknown
  - CTO Note: Avoid UA sniffing; feature-detect capabilities
- T0.3 Implement `PWA_OPFS_Adapter` (MVP)
  - open/create vault; read; write with basic temp file; export/import via pickers; listRecent
  - Acceptance: Works in desktop Chrome and Android; iOS uses IndexedDB fallback with explicit export warning banner
  - CTO Note: Guard OPFS availability; never assume persistent quota; show warnings from PRD copy
- T0.4 Wire web/extension paths to use adapter exclusively
  - Acceptance: Existing flows compile/run; adapter methods logged during E2E
  - CTO Note: Keep fallbacks; do not regress extension behavior
- T0.5 Crypto to Web Workers + WASM Argon2id integration
  - Acceptance: Worker lifecycle stable; unlock perf median < 1500ms (iPhone 12/Pixel 6), p95 < 3000ms; PBKDF2 250k fallback
  - CTO Note: Cap Argon2 memory to avoid OS kills; cancelable operations
- T0.6 Perf harness for KDF parameter probing and profile persistence
  - Acceptance: First unlock benchmarks device; stores profile in vault header; respects budgets
  - CTO Note: Never silently drop below PBKDF2-250k baseline
- T0.7 TDD coverage
  - Unit: adapter contract, OPFS feature detection, Worker lifecycle
  - Integration: create/open/write/read with OPFS; export/import; recent vaults
  - Perf: automated latency thresholds; fail build if exceeded

Deliverables
- Adapter interface + selector + PWA_OPFS_Adapter committed with tests
- Crypto Worker + WASM Argon2 path with fallback and perf budgets met
- Lint rule preventing direct file I/O in higher layers

Exit Criteria (Gate A)
- Unlock benchmarks meet budgets on reference devices; adapter routing complete; tests green

Risk Watch (CTO)
- Web Crypto quirks on iOS WKWebView; keep native fallback in contingency plan
- OPFS quota variability; ensure explicit export nudges are wired for PWA iOS
- Worker termination and memory caps on low-end devices; keep params conservative