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
  - Large vault ops: write throughput tolerant to 1–2 GB media total; progress feedback.
- Reliability
  - Crash-safe writes with journaling/temp file + atomic rename.
  - Power-loss and low-storage handling; user feedback for recovery.
- Security & Privacy
  - No analytics by default; no network calls required.
  - AES-GCM encryption; passphrase-derived keys; salts stored in metadata.
  - Optional biometric wrapping of session key; no raw keys persisted.
- Accessibility
  - WCAG 2.1 AA: larger touch targets; reduced-motion option; screen reader labels.
  - Dementia-friendly UX: validation language; calm timing; no correction.

### Architecture Overview
- App Shell: Capacitor (iOS/Android) hosting our HTML/vanilla JS UI.
- Storage Abstraction: `VaultStorageAdapter` with environment-specific implementations:
  - ExtensionFileSystemAdapter (existing)
  - PWA_OPFS_Adapter (new)
  - CapacitorFilesystemAdapter (new)
- Crypto: Reuse `js/vault/*` Web Crypto; support Argon2id KDF where available; fall back to PBKDF2 for compatibility.
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
  - Face ID/Touch ID via Local Authentication plugin.
- Android
  - Storage Access Framework (SAF) for export/import; media intents for camera/gallery.
  - Fingerprint/biometric via BiometricPrompt; background execution constraints considered.

### Security & Compliance
- Local-only by default; no network; no accounts.
- Biometric unlock optional and non-destructive (fallback to passphrase always available).
- Clear privacy disclosures; optional crash-only logs stripped of PII.
- Threat model: device theft (biometric/passphrase), file exfiltration (export warnings), malformed import (validation), interrupted writes (journaling).

### Backup & Recovery
- Manual export recommended schedule (monthly): in-app nudges (local-only).
- Import flow validates checksum and structure; graceful error messages and non-destructive failure modes.
- Optional printed recovery guidance (non-technical instructions) for families.

### Metrics & Success Criteria (Privacy-Safe)
- Local counters (no upload): successful vault round-trips, average capture duration, export completions.
- Success Criteria:
  - 95%+ successful vault writes across device/storage conditions.
  - 90-second average capture session duration.
  - < 0.5% crash rate during large writes in test matrix.
  - 90% task completion in usability tests (caregiver, older adult).

### Risks & Mitigations
- iOS WebKit crypto quirks → verify SubtleCrypto; ship minimal native fallback only if necessary.
- Large media I/O performance → chunked writes; stream processing; progress UI.
- App store privacy review → no analytics; no 3rd-party SDKs; clear offline positioning.
- PWA limitations on iOS → position PWA as fallback; recommend native app.

### Dependencies
- Capacitor core + Filesystem, Camera, Share, Biometric/Local Auth plugins.
- Existing Emma JS code: `pages/*`, `js/*`, `js/vault/*`.

### Release Plan
- Phase 0: Adapter interface + PWA_OPFS_Adapter; internal QA.
- Phase 1: Capacitor shell + CapacitorFilesystemAdapter; device QA on iOS/Android.
- Phase 2: Biometrics (optional), media capture, journaling, polish.
- Beta: TestFlight and Play Console (closed testing) with family testers.
- GA: App Store + Play Store with clear privacy disclosures; no analytics.

### Testing Plan
- Unit: adapter methods, crypto flows, serialization/deserialization.
- Integration: create/open/write/read cycles; media attachments; import/export.
- E2E: device matrix (iOS 16/17, Android 12–14) including low battery, low storage, interrupted writes.
- Accessibility: screen reader, large text, reduced motion, color contrast.
- Dementia Companion: validation-first responses, 2–3s delay behavior, non-corrective language.

### Accessibility & Clinical Considerations
- Validation-only responses in dementia mode; no corrections.
- Subtle pacing (2–3s delay) to reduce anxiety; calm visuals.
- Large, clear controls; error language that reassures.

### Open Questions
- Sidecar media vs. embedded blobs trade-offs for very large vaults.
- Argon2id availability/perf across devices vs PBKDF2 compatibility path.
- Optional crash-only logs—how to expose strictly opt-in diagnostics to users.

### Acceptance Criteria (v1)
- Users can: create/open vault, capture a voice memory, attach a photo, save, close app, reopen, and see content persisted securely.
- Export/import works across iOS/Android and between devices of the same platform.
- Biometric quick unlock works when enabled; passphrase unlock always available.
- No plaintext at rest; no network required; app passes store review.

### Appendix
- File format: `.emma` container (unchanged from extension/web vault).
- Abstractions: `VaultStorageAdapter` interface; `PWA_OPFS_Adapter`, `CapacitorFilesystemAdapter` implementations.
- Fallback plan: PWA remains supported with explicit limitations messaging.

