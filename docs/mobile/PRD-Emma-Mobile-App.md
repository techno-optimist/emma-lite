## Emma Mobile App — Product Requirements Document (PRD)

### Document Info
- Version: 1.0 (January 2025)
- Owners: Product, CTO, Mobile Lead
- Status: Draft for internal review

### Executive Summary
Emma Mobile brings our local-first, privacy-by-default memory companion to iOS and Android. It wraps our existing HTML/vanilla JS experiences in a lightweight native shell to provide reliable filesystem access, media capture, and biometric unlock—without accounts, servers, or cloud by default. Families fully own their data in a portable `.emma` vault file, with optional export/import and backup. A PWA fallback supports broader coverage; the native shell ensures a consistent iOS experience.

### Goals
- Deliver a production-quality mobile app that:
  - Preserves Emma’s local-first, no-accounts architecture (zero cloud dependency).
  - Reliably reads/writes the `.emma` vault file on-device.
  - Provides simple import/export/backup via native file pickers and share sheets.
  - Supports media capture and attachments (camera, gallery, mic) into the vault.
  - Enables optional biometric quick unlock using device secure storage.
  - Runs the existing Emma experiences (orb, voice capture, chat, dementia companion) with minimal UI adjustments.

### Non-Goals
- No mandatory user accounts, cloud sync, or server backend.
- No rewrite of core UI in a new framework; reuse HTML/vanilla JS.
- No analytics/telemetry by default (privacy-first).

### Personas & Use Cases
- Older Adult (self-capture): Easily record stories with voice and add photos.
- Family Caregiver: Help capture and organize a loved one’s memories; manage backups.
- Professional Caregiver: Capture sessions and share locally with families (manual export).

Primary Use Cases:
1) Create/Open Vault: Select or create a `.emma` vault on-device.
2) Capture Memories: Voice-first capture with live transcription; add photos/videos.
3) View & Recall: Browse memories with the Emma orb; dementia companion assists.
4) Backup/Transfer: Export vault to Files/Drive/iCloud/SAF; import from same.
5) Quick Unlock: Optional biometric unlock that wraps a session key.

### Product Principles
- Local-first privacy (no accounts, no servers by default).
- Simplicity and reliability over feature breadth.
- Accessibility and validation-forward UX for dementia support.
- One portable file (`.emma`) users can move, back up, and share manually.

### Scope
- Platforms: iOS (16+), Android (12+). PWA fallback for other environments.
- App Type: Capacitor native shell embedding our HTML/vanilla JS experiences.
- Filesystem: App sandbox as the default storage location; explicit export/import.
- Media: Camera/gallery integration; attachment storage referenced in vault.
- Security: AES-GCM data-at-rest; key derived from passphrase; optional biometric wrap.

### Out of Scope (v1)
- Continuous background sync; auto cloud backup; accounts and collaboration.
- Push notifications; background capture; advanced ML on-device beyond current scope.
- Cross-device conflict resolution beyond manual import/export.

### User Stories (Selected)
- As a caregiver, I can create or open a vault from my phone so I can add stories during visits.
- As an older adult, I can tap the orb and speak a memory while Emma transcribes it in real-time.
- As a user, I can attach photos/videos to a memory directly from the camera or gallery.
- As a user, I can export my vault to Files (iOS) or a folder/share target (Android) for backup.
- As a user, I can enable Face ID/Touch ID (iOS) or fingerprint (Android) to quickly unlock my vault.
- As a user, I can import a vault provided by family and continue capturing memories.

### Functional Requirements
1. Vault Lifecycle
   - Create new vault with passphrase.
   - Open existing vault from app sandbox or import location.
   - Read/write operations must be atomic with crash-safe recovery.
   - Recent vaults list with safe path handling (sandbox paths, not raw OS paths on iOS).

2. Capture & Media
   - Voice capture with live transcription (Web Speech API; native fallback if needed).
   - Photo/video capture via native camera; gallery picker support.
   - Attachments written to vault (or managed sidecar folder referenced in vault metadata if size/perf requires).

3. Import/Export
   - Export vault via share sheet (iOS) / SAF (Android) to user-selected destination.
   - Import vault from Files/SAF; validate `.emma` structure; warn on large files.
   - Progress UI for large import/export operations; cancel/abort handling.

4. Unlock & Session
   - Passphrase-based unlock with PBKDF2 (compat) and/or Argon2id (preferred when available for mobile performance).
   - Optional biometric quick unlock: wrap session key in Keychain/Keystore.
   - Session timeout configurable; requires passphrase re-entry after expiry (biometric optional).

5. Experiences
   - Emma Orb: tap to open assistant panel; consistent with web design.
   - Voice Capture: extended listening, live transcription, save as memory.
   - Chat: basic chat with Emma using local context (no cloud requirement).
   - Dementia Companion: continuous listening during photo viewing; validation-first responses; optional wake word; 2–3s response delay; local-only processing.

6. PWA Fallback
   - Android: OPFS primary + file picker export; iOS: IndexedDB/OPFS with explicit export guidance.
   - Feature detection and UX prompts when capabilities are limited.

### Non-Functional Requirements
- Performance
  - App launch < 2s on modern devices; orb open < 300ms; transcription latency < 100ms.
  - Unlock/KDF: median unlock < 1500ms on iPhone 12 / Pixel 6; p95 < 3000ms.
  - Crypto execution off main thread (Web Workers); WASM Argon2id path preferred; PBKDF2 250k iterations for compatibility where Argon2id unavailable.
  - Large vault ops: write throughput tolerant to 1–2 GB media total; progress feedback; chunked streaming to avoid memory spikes.
- Reliability
  - Crash-safe writes with journaling: write to temp with manifest + checksums, then atomic rename to `.emma`.
  - Power-loss and low-storage handling; preflight free-space checks; resumable operations with recovery on next launch.
  - PWA eviction awareness (especially iOS): data persistence risks mitigated by proactive export prompts and warnings.
- Security & Privacy
  - No analytics by default; no network calls required.
  - AES-GCM encryption; passphrase-derived keys; salts stored in metadata.
  - Optional biometric wrapping of session key; no raw keys persisted. Passphrase path always retained for recovery; passphrase required for export, key rotation, or disabling biometrics.
- Accessibility
  - WCAG 2.1 AA: larger touch targets; reduced-motion option; screen reader labels.
  - Dementia-friendly UX: validation language; calm timing; no correction.

### Architecture Overview
- App Shell: Capacitor (iOS/Android) hosting our HTML/vanilla JS UI.
- Storage Abstraction: `VaultStorageAdapter` with environment-specific implementations:
  - ExtensionFileSystemAdapter (existing)
  - PWA_OPFS_Adapter (new)
  - CapacitorFilesystemAdapter (new)
- Crypto: Reuse `js/vault/*` Web Crypto; KDF and encrypt/decrypt run in Web Workers; prefer WASM Argon2id where available; fall back to PBKDF2 (250k iterations) for compatibility.
- Media: Capacitor Camera/Filesystem plugins; temp → vault write pipeline; streaming to avoid large-memory spikes.
- Unlock: Passphrase → derived key; optional Keychain/Keystore wrap of in-memory session key for quick unlock.

### Data Model (Simplified)
- Vault container: `.emma` file (JSON + encrypted blobs).
- Memory capsule: id, title, transcription, attachments, metadata (people/places/tags/emotion), timestamps.
- Attachments: binary payloads (base64 or external sidecar references), type, size, checksum.
- Settings: local preferences (biometric enabled, session timeout); per-vault.

### UX & Design
- Retain Emma’s premium, minimal glass-morphism design.
- Mobile tweaks: full-screen modals, bottom sheet patterns, thumb-friendly hit areas.
- Orb: persistent FAB; assistant panel anchored near bottom for reachability.
- Voice capture: focused panel under orb; live transcript; pause/save/cancel.
- Import/export: clear “Backup” and “Restore” actions with warnings for large files and storage space.

### Platform-Specific Considerations
- iOS
  - Files app integration via share/export; sandboxed default location.
  - OPFS limitations in PWA; native Capacitor path preferred for reliability.
  - iCloud backup semantics: app sandbox may be included in device backups; provide user setting to exclude vault from backups (NSURLIsExcludedFromBackupKey).
  - Face ID/Touch ID via Local Authentication plugin.
- Android
  - Storage Access Framework (SAF) for export/import; media intents for camera/gallery.
  - Fingerprint/biometric via BiometricPrompt; background execution constraints considered.

### Security & Compliance
- Local-only by default; no network; no accounts.
- Biometric unlock optional and non-destructive (fallback to passphrase always available).
- Clear privacy disclosures; optional crash-only logs stripped of PII; no third-party analytics SDKs.
- Threat model: device theft (biometric/passphrase), file exfiltration (export warnings), malformed import (validation), interrupted writes (journaling).
 - Export compliance: standard platform crypto; complete App Store export questionnaire; document local-only positioning.

### Backup & Recovery
- OS backup semantics: By default, vault stored in app sandbox may be included in device backups. Provide explicit setting "Exclude vault from OS backups" (default: Included for resilience) with clear education about implications.
- Manual export recommended schedule (monthly): in-app nudges (local-only). On iOS PWA, increase cadence due to eviction risk.
- Import flow validates checksum and structure; graceful error messages and non-destructive failure modes.
- Optional printed recovery guidance (non-technical instructions) for families.
- Vault Health self-check: on-demand and periodic verification of checksums/manifests; guided repair if mismatch found.

### Metrics & Success Criteria (Privacy-Safe)
- Local counters (no upload): successful vault round-trips, average capture duration, export completions.
- Success Criteria:
  - 95%+ successful vault writes across device/storage conditions.
  - 90-second average capture session duration.
  - < 0.5% crash rate during large writes in test matrix.
  - 90% task completion in usability tests (caregiver, older adult).
  - Chaos testing: 100 trial mid-write kills → 100% recoverable or safe-fail with zero silent corruption.

### Risks & Mitigations
- iOS WebKit crypto quirks → verify SubtleCrypto; ship minimal native fallback only if necessary.
- Large media I/O performance → chunked writes; stream processing; progress UI.
- App store privacy review → no analytics; no 3rd-party SDKs; clear offline positioning.
- PWA limitations on iOS → position PWA as fallback; recommend native app.
 - OS backups may conflict with "local-only" expectations → explicit setting and education; default to included backups unless user opts out.

### Dependencies
- Capacitor core + Filesystem, Camera, Share, Biometric/Local Auth plugins.
- Existing Emma JS code: `pages/*`, `js/*`, `js/vault/*`.

### Release Plan
- Phase 0: Adapter interface + PWA_OPFS_Adapter; internal QA. Gate A (KDF latency) must pass before Phase 1.
- Phase 1: Capacitor shell + CapacitorFilesystemAdapter; device QA on iOS/Android. Gate B (journaling chaos) and Gate C (backup semantics UX) must pass.
- Phase 2: Biometrics (optional), media capture, journaling, polish. Gate D (store readiness checklist) must pass before Beta.
- Beta: TestFlight and Play Console (closed testing) with family testers.
- GA: App Store + Play Store with clear privacy disclosures; no analytics.

### Decision Gates & Launch Criteria
- Gate A — Feasibility: SubtleCrypto + Worker/WASM KDF meets latency budget on target devices (median < 1500ms; p95 < 3000ms). If not, implement native crypto fallback; if still failing, reassess platform.
- Gate B — Data Safety: Journaling + atomic rename passes power-loss/disk-full chaos tests with zero silent corruption.
- Gate C — Privacy Promise: OS backup semantics and user education are unambiguous; backup exclusion toggle implemented; defaults documented.
- Gate D — Store Readiness: App review checklist passes dry-run; continuous listening constrained to foreground; privacy manifests complete.

### Testing Plan
- Unit: adapter methods, crypto flows, serialization/deserialization.
- Integration: create/open/write/read cycles; media attachments; import/export.
- E2E: device matrix (iOS 16/17, Android 12–14) including low battery, low storage, interrupted writes; chaos tests (mid-write kill/restart).
- Accessibility: screen reader, large text, reduced motion, color contrast.
- Dementia Companion: validation-first responses, 2–3s delay behavior, non-corrective language.
 - PWA eviction reality: iOS PWA persistence tests; verify export prompts cadence.

### Accessibility & Clinical Considerations
- Validation-only responses in dementia mode; no corrections.
- Subtle pacing (2–3s delay) to reduce anxiety; calm visuals.
- Large, clear controls; error language that reassures.

### Defaults & Policies (Resolved)
- Storage model: Single `.emma` file for v1; evaluate sidecar performance mode post‑GA if needed.
- Backups: Included in OS backups by default (resilience); explicit user toggle to exclude with clear education.
- KDF: Argon2id (WASM) preferred with mobile‑tuned params; PBKDF2 (250k) fallback for compatibility.
- Biometrics: Optional quick unlock; passphrase required for export, key rotation, and disabling biometrics.
- Diagnostics: Crash‑only logs strictly opt‑in; default off; never include PII.

### UX Copy Library (In‑App Messaging)

1) Backup Exclusion Toggle
- Setting title: "Exclude vault from device backups"
- Setting subtitle (default OFF): "Recommended OFF. Including your vault in device backups helps protect against loss."
- Setting subtitle (when ON): "Excluded from backups. Export your vault regularly to avoid data loss."
- Info tooltip (short): "Backups improve safety but may store encrypted data in iCloud/Device backups. Exclude for stricter privacy."
- Learn more modal:
  - Title: "About device backups"
  - Body: "When enabled, your `.emma` vault is included in your device's encrypted backups (iCloud/Device). This improves recovery if your phone is lost or replaced. If you prefer stricter privacy, you can exclude the vault from backups and use manual exports."
  - CTA primary: "Keep Included (Recommended)"
  - CTA secondary: "Exclude from Backups"
- Confirmation (when turning ON/exclude):
  - Title: "Exclude from backups?"
  - Body: "If excluded, your vault will not be recoverable from device backups. We recommend exporting a copy monthly."
  - CTA primary: "Exclude"
  - CTA secondary: "Cancel"
- Success toast: "Vault backup setting updated."

2) PWA Fallback Warnings (iOS emphasis)
- First‑run banner (PWA only):
  - Title: "Limited reliability in web app"
  - Body: "On iOS, installed web apps can be removed by the system when storage is low. Export backups regularly or install the Emma Mobile app for best reliability."
  - CTA primary: "Open Export"
  - CTA secondary: "Install Native App"
- Pre‑capture nudge (large operation, PWA only):
  - Body: "You’re about to add large media. For the most reliable experience, use the Emma Mobile app or export a backup first."
  - CTA primary: "Continue"
  - CTA secondary: "Export First"
- Periodic reminder (every 30 days, PWA only):
  - Body: "Time to back up your vault. Export a copy to Files or install the Emma Mobile app for improved reliability."
  - CTA: "Export"

3) Low Storage & Preflight Checks
- Low storage warning:
  - Title: "Low storage"
  - Body: "Your device is low on space. Saving large memories may fail. Free up space or export your vault before continuing."
  - CTA primary: "Continue"
  - CTA secondary: "Export Vault"
- Out‑of‑space error:
  - Title: "Not enough space"
  - Body: "Emma couldn’t save your changes because the device is out of space. Try freeing storage or exporting your vault to external storage."
  - CTA: "OK"

4) Crash/Interrupt Recovery (Journaling)
- On launch detection:
  - Title: "Recovered your vault"
  - Body: "Emma found an unfinished save and restored your vault safely. You can review recent changes."
  - CTA: "Continue"
- Partial recovery (non‑destructive):
  - Title: "Recovery needed"
  - Body: "We found incomplete changes. Emma preserved your original vault and moved the partial save to a recovery file."
  - CTA primary: "View Details"
  - CTA secondary: "Dismiss"

5) Export/Import Flow
- Export success: "Export complete. Keep this file safe."
- Export reminder (monthly): "It’s been a while since your last backup. Export your vault to keep it safe."
- Import validation error: "This file doesn’t look like a valid .emma vault. Please try another file."
- Import large file warning: "This is a large vault. Keep the app open and connected to power during import."

6) Biometrics
- Enable prompt:
  - Title: "Enable quick unlock"
  - Body: "Use Face ID/Touch ID (or fingerprint) to unlock faster. Your passphrase is still required for some actions (like export)."
  - CTA primary: "Enable"
  - CTA secondary: "Not now"
- Disable confirmation:
  - Title: "Disable quick unlock?"
  - Body: "You’ll need your passphrase each time."
  - CTA primary: "Disable"
  - CTA secondary: "Cancel"

7) Vault Health Self‑Check
- Healthy: "Vault check complete. Everything looks good."
- Repaired: "Vault repaired after an interrupted save. No data loss detected."
- Attention: "We found issues with recent changes. Emma preserved your original vault and created a recovery file."

### UI Flows & Wireframes

#### Information Architecture (Mobile v1)
- Launch/Splash → Unlock → Dashboard (Emma orb primary) →
  - Assistant Panel (bottom sheet) → Voice Capture → Memory Composer → Save
  - Memories (list/detail)
  - Import/Export (modal)
  - Settings (backup exclusion, biometrics, vault health)
  - Vault Health (modal) / Recovery Detail (modal)
  - PWA Guidance (banner + actions)

Global patterns
- Bottom sheet for assistant/capture; full‑screen modals for unlock/import/export; persistent FAB orb.
- Progress bars for long ops; toasts for success/minor notices; confirm dialogs for destructive actions.

#### Screen Specs (wireframe descriptions)
1) Launch/Splash
- Elements: Logo + “Emma” wordmark; subtle loading indicator.
- Behavior: If recent vault exists → go to Unlock; else → Create/Open Vault chooser.

2) Create/Open Vault (Chooser)
- Elements: Two cards: “Create new vault” and “Open existing vault”.
- Create: Passphrase fields (twice) + strength meter; CTA “Create”.
- Open: Native file picker (Import) or “Choose from app storage”.

3) Unlock
- Elements: Passphrase field; “Unlock” CTA; “Enable quick unlock” prompt if biometrics available.
- States: Error for wrong passphrase; p75 unlock < 1500ms, spinner + message if longer.
- Secondary: “Forgot passphrase?” opens recovery guidance modal.

4) Dashboard (Home)
- Elements: Emma orb FAB; recent memories grid/list; primary actions (Capture, Import/Export, Settings) in header/menu.
- Empty state: “Let’s capture your first memory” with CTA to open Assistant Panel.

5) Assistant Panel (Bottom Sheet)
- Elements: Greeting; quick actions (🎙️ Capture memory, 📸 Add photo, 🔍 Search memories, ⚙️ Settings);
- Interaction: Swipe down to dismiss; tap outside to close; keyboard‑aware layout.

6) Voice Capture Flow
- States: Idle → Listening → Transcribing → Review → Save.
- Elements: Live transcript area; suggested topics chips; controls (Pause/Resume, Save, Cancel); progress/time.
- Errors: Mic denied → show fallback text input; no storage → low storage modal.

7) Memory Composer
- Elements: Title (auto‑suggested), transcript editable, add photos/videos, tags.
- CTAs: Save (primary), Discard (secondary), Add more media.

8) Memory Detail
- Elements: Title, date, media carousel, transcript, tags, related memories.
- Actions: Edit, Share (local export), Delete (confirm).

9) Import/Export (Modal)
- Tabs: Export, Import.
- Export: Destination chooser (Files/SAF/share sheet), warning on size, progress with cancel.
- Import: File picker, validation, large file warning, progress with cancel.

10) Settings
- Sections: Security (biometrics), Backups (exclude toggle + learn more), Vault Health (Run check), About.
- Actions: Run Vault Health → results modal; toggle biometrics; toggle backup exclusion; open diagnostics opt‑in.

11) Vault Health (Modal)
- States: Running → Healthy/Issues/Repaired.
- Actions: View details/log (local only), Close.

12) Recovery Detail (Modal)
- Elements: Summary of recovered items, where recovery file is stored, CTA “Replace current vault” or “Keep both”.

13) Low Storage (Modal)
- Elements: Warning icon, copy from UX library, CTAs Continue/Export Vault.

14) PWA Guidance (Banner)
- iOS PWA only; persistent dismissible banner; CTAs “Export” and “Install Native App”.

#### Transitions & Gestures
- Bottom sheets: slide up/down 300ms; modals: fade/slide 200–300ms; progress transitions smooth and cancellable.
- Hardware back: close modal/sheet before leaving screen; never lose unsaved edits without confirmation.

#### State Machine Summary (Core)
- Vault: locked → unlocked(session) → timeout → locked.
- Capture: idle → listening → transcribing → reviewing → saved | canceled | error(recoverable).
- Write: staging → journaled → atomic rename → success | resume_needed.

#### Accessibility Wireframe Notes
- Minimum 44x44dp touch targets; focus order top→bottom; announce state changes (start/stop recording, saved, errors).
- Reduced motion: disable large slide animations; prefer fades.

#### Component Mapping (for Executor)
- Dashboard: `pages/dashboard-new.html` (mobile layout variant), orb via `js/emma-orb.js`.
- Assistant/Voice: `js/experience-popup-base.js`, `js/voice-capture-experience.js`, `js/unified-memory-wizard.js`.
- Memories: `pages/memories.html`, `js/memories.js`.
- Settings: `pages/options.html`, `js/options.js` (add backup toggle, biometrics, vault health actions).
- Import/Export: `js/universal-vault-modal.js` (extend) or new `js/mobile-export-import.js`.
- Vault Health: new `js/vault/health-check.js` (invoked from Settings).

#### Acceptance per Flow
- Unlock: meets latency target; biometric optional; wrong passphrase error clear.
- Capture: live transcript <100ms latency; save creates a new capsule with media; cancel preserves nothing.
- Export/Import: progress + cancel; validated structures; recover gracefully on interrupt.
- Settings: toggles persist; backup exclusion applied at filesystem level; Vault Health reports actionable results.

### Acceptance Criteria (v1)
- Users can: create/open vault, capture a voice memory, attach a photo, save, close app, reopen, and see content persisted securely.
- Export/import works across iOS/Android and between devices of the same platform.
- Biometric quick unlock works when enabled; passphrase unlock always available.
- No plaintext at rest; no network required; app passes store review.
 - Decision Gates A–D passed; chaos tests meet criteria; backup semantics documented in‑app.

### Appendix
- File format: `.emma` container (unchanged from extension/web vault).
- Abstractions: `VaultStorageAdapter` interface; `PWA_OPFS_Adapter`, `CapacitorFilesystemAdapter` implementations.
- Fallback plan: PWA remains supported with explicit limitations messaging.

