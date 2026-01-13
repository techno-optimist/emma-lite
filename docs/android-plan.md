## Android Delivery Plan (Hybrid First)

**Goal:** Ship an Android app that reuses the existing Emma web app with minimal duplication, keeps web and mobile workstreams isolated, and leaves room to go more-native later.

**Status:** The hybrid shell exists in `mobile/`, but the native Compose app in `mobile-native/` is now the primary Android implementation. Hybrid work is paused unless a WebView fallback is needed.

### Architectural Approach
- **Hybrid shell (Capacitor + Android WebView):** Fastest path, retains current HTML/CSS/JS. Bridge only what the WebView lacks (mic, file access, notifications, secure storage).
- **Fallback path (later):** If performance/UX hits limits, incrementally replace screens with React Native/Flutter while keeping shared logic framework-agnostic.
- **Current focus:** Native Compose app is the active path; hybrid is maintained but not the mainline.

### Repo Layout (separate, same directory)
- Keep current web at repo root unchanged.
- Add `mobile/` for Android artifacts:
  - `mobile/android/` — Android/Gradle project (created by Capacitor).
  - `mobile/www/` — copied/built web assets for the app shell.
  - `mobile/README.md` — mobile-specific instructions.
- Optional shared code: `shared/` (e.g., `shared/core/`, `shared/ui/`) to avoid duplication; consumed by both web and mobile bundles.

### Tooling & Prereqs
- Node 18+ (matches repo engines), npm.
- Java 17, Android Studio/SDK/NDK, Android 14 (API 34) + 13 (API 33) SDKs; emulator/device with audio.
- Capacitor CLI (`npx @capacitor/cli`) only if working on the hybrid shell; Gradle via Android Studio.
- Access to current backend: token endpoint at `/token`, websocket to OpenAI; ensure reachable from emulator/device.

### Foundation Tasks (first passes)
- Inventory browser APIs used today: mic (`getUserMedia`), WebSockets, file download/upload, IndexedDB/localStorage, audio playback, service workers (if any).
- Decide web-to-mobile bundling: minimal copy vs. light build (e.g., Vite/rollup) into `mobile/www`.
- Add environment flagging: `MOBILE=true` (env or URL param) for mobile-only UI toggles.
- Update CORS/connectSrc in `server.js` to include `capacitor://localhost` and emulator loopbacks (`http://10.0.2.2` if used).
- Set up `mobile/` skeleton and scripts (`build:web`, `sync:android`) without touching web flow.

### Native Bridges & Permissions (to implement)
- **Permissions:** `RECORD_AUDIO`, `INTERNET`, `POST_NOTIFICATIONS` (if used), `FOREGROUND_SERVICE` (for long audio), storage scopes if exporting files.
- **Microphone:** Try WebView `getUserMedia`; if insufficient, add Capacitor audio recorder plugin and expose `window.emmaNative.record()`; stream PCM/Opus to existing pipeline.
- **File export/import:** Capacitor Filesystem/Share; scoped storage rules on Android 13+.
- **Notifications:** Capacitor Notifications for reminders; gate behind user consent.
- **Secure storage:** Keystore-backed storage for any secrets/tokens; avoid persisting raw API keys.
- **Media:** Handle audio focus (pause/duck on calls), background behavior, hardware acceleration on WebView.

### UX & Performance
- Responsive tuning: touch targets ≥48dp, keyboard-safe modals, reduced hover reliance, readable typography at small widths.
- Network resilience: offline/poor-network banners, websocket reconnects, retry affordances.
- Performance: enable hardware acceleration; defer non-critical scripts; lazy-load heavy modules; preconnect to backend domain.

### Build/Sync Pipeline (proposed)
- `npm run build:web` — outputs static bundle to `mobile/www`.
- `npm run sync:android` — `npx cap copy android && npx cap sync android`.
- Android build: `cd mobile/android && ./gradlew assembleDebug` (and `assembleRelease` with signing).
- CI: run build + sync + assembleDebug for smoke; attach artifact.

### Testing Strategy
- **Unit/JS:** Reuse existing tests; add mobile-flagged smoke tests.
- **Device/emulator manual:** mic permission flows, streaming latency, background/foreground, rotation, offline/limited network, downloads/uploads.
- **Instrumented:** Espresso for permission + navigation; optional Detox if migrating to RN later.
- **Performance checks:** cold start, first interaction latency, audio start time.
- **Security:** verify no plaintext secrets at rest; confirm network calls restricted to expected domains.

### Release Steps
- Create keystore; wire Gradle signing for release builds.
- Build variants: `debug` for QA, `release` for Play.
- Play Console internal testing track; run pre-launch report; capture logs for mic/websocket.
- Prepare store listing: privacy policy (mic access), data safety form (ephemeral tokens), screenshots (phone/tablet).

### Risks & Mitigations
- **WebView mic limitations:** Mitigate with native recorder plugin if `getUserMedia` fails.
- **CORS/connectSrc blocks:** Pre-allow `capacitor://localhost`, emulator hostnames.
- **Offline UX gaps:** Add banners/retries; queue actions if feasible.
- **Secret handling:** No hardcoded API keys in app; use backend token exchange.
- **Performance on low-end devices:** Profile; trim bundle; reduce animations on `MOBILE` flag.

### Timeline (aggressive but realistic)
- Week 0–1: Foundation — skeleton `mobile/`, CORS review, decide bundling, create scripts, first Android build running WebView.
- Week 2–3: Native bridges — mic/file/notifications, secure storage; responsive passes.
- Week 3–4: QA + perf — device matrix, instrumentation smoke, perf tuning.
- Week 4–5: Release — signing, Play internal, polish, data safety, launch.

### Immediate Next Actions (repo-level)
- [x] Create `mobile/` skeleton with README and placeholder `www/`.
- [x] Add build+sync scripts (web → `mobile/www`, Capacitor sync).
- [x] Add CORS/connectSrc allowances for Capacitor origins.
- [x] Initialize Capacitor config and add Android platform under `mobile/android`.
- [x] Align Android build tooling: Gradle wrapper to 8.5 and Android Gradle Plugin to 8.3.x for Java 17–19 compatibility.
- [x] Smoke WebView build on emulator (once emulator/device is running).
- [ ] Decide on audio strategy after first mic test in WebView (paused while native is primary).

---

## Native Android Rewrite Plan (Compose/Kotlin, Vault-Compatible)

**Goal:** Build a fully native Android app (no WebView) that matches the existing mobile UI, preserves all functionality, and remains 100% compatible with `.emma` vault files between web and native.

### Guiding Constraints
- UI parity: match current mobile look (colors, spacing, gradients, typography, layout).
- Vault compatibility: identical crypto/file format; native must open/create/save `.emma` files interoperably with web.
- Feature parity: vault create/open/unlock/save/export, autosave, memories/chat/voice flows, offline resilience.

### Technical Approach
- Stack: Kotlin, Jetpack Compose, Navigation Compose, Coroutines/Flows, DataStore, OkHttp; minSdk 24+, targetSdk 34.
- Crypto: Port the web vault format exactly (AES-GCM-256, PBKDF2-HMAC-SHA256, same salt/IV/iterations, same file layout `EMMA + salt + iv + ciphertext`). Validate with cross-language fixtures.
- Storage: App-private autosave file; Storage Access Framework (SAF) for open/create/export/share; preferences/secure storage for non-secret metadata only (no passphrases at rest).
- Voice: Native `AudioRecord` streaming to the existing backend via `/token` + `/voice` (see `BuildConfig.EMMA_BASE_URL` and `BuildConfig.EMMA_WS_PATH`).
- Networking: OkHttp WebSocket client with reconnect/error handling mirroring web behavior.
- Theming: Compose theme mapped to web tokens with runtime theme selection in settings.

### Work Breakdown
1) **Spec & Fixtures**
   - Extract vault format/crypto parameters from `js/emma-web-vault.js`.
   - Generate test fixtures from web: sample `.emma` files + passphrases + expected hashes/sizes.
   - Write a spec doc (layout, KDF params, JSON schema of plaintext).
2) **Vault Library (Kotlin)**
   - Implement read/write/encrypt/decrypt with exact parity; unit tests using fixtures; round-trip native↔web.
   - APIs: create/open/save/export/import, stats, in-memory model aligned to web JSON.
3) **App Skeleton**
   - New project under `mobile-native/` (independent from the WebView app).
   - Set up Gradle 8.6, AGP 8.4.x, Kotlin 1.9.x, Compose BOM; package `com.yourorg.emma.nativeapp`.
   - Theme: Compose theme mirroring current mobile tokens; gradient background scaffold.
4) **UI Parity**
   - Landing/vault setup screen recreated in Compose (cards: Open/Create/Recover, status).
   - Dashboard/memories/chat/voice screens: match layout/spacing/icons; reuse assets where possible.
5) **Vault Flows**
   - Create/open/unlock with passphrase prompts.
   - Autosave to app-private vault; export/share via SAF; import via SAF.
   - State persistence: remember active vault name/path; no passphrase at rest.
6) **Voice & Networking**
   - Mic permission flow; audio capture; streaming to backend; reconnect/error handling.
   - WebSocket/API client with retry/backoff consistent with web.
7) **Offline/Background**
   - Handle foreground/background lifecycle; show offline banners; retry queues where applicable.
8) **Testing & QA**
   - Unit tests: crypto/vault, file IO, basic viewmodels.
   - Instrumented tests: permission flows, vault create/open/import/export.
   - Cross-compat: create on native → open on web; create on web → open on native.
9) **Release Readiness**
   - App ID distinct from WebView app; signing config; Play internal track; privacy/data safety forms.

### Current Status (native)
- [x] Directory allocated for native work (`mobile-native/`).
- [x] Vault spec/fixtures extracted and generated (see `docs/vault-native-spec.md`, `docs/fixtures`, tests in `mobile-native/app/src/test/.../VaultCryptoTest.kt`).
- [x] Kotlin vault crypto implemented and passing fixture tests (decrypt/encrypt parity, optional version header, legacy layouts).
- [x] SAF-backed open/create/export/share flows wired with passphrase prompts and status updates.
- [x] Autosave to app-private storage plus resume flows for persisted SAF URIs and autosave fallback.
- [x] Landing + onboarding, dashboard orb + radial menu, settings, and vault control panel implemented.
- [x] Chat screen wired to `/token` + `/voice` with WebSocket, audio capture, playback, and transcript UI.
- [x] Memories screen supports creating memories with photo attachments (Photo Picker, including Google Photos selection).
- [x] People screen supports add/edit/delete with avatar picker, search, and detail sheet.
- [x] Constellation screen with memory/people nodes, filters, zoom/pan, and node dialogs.
- [ ] Memory editing, tagging, and people linking flows not implemented yet.
- [ ] Media management UI (attachment gallery, delete, per-memory edit) not complete.
- [ ] Cloud sync/background jobs and notifications not implemented.
- [ ] Release readiness (signing, Play track, QA matrix) pending.

### Next Actions (native)
- Add memory detail/editing, tags, and people linking (constellation and people screens rely on `memory.people`).
- Add attachment gallery and media management (delete/rename, per-memory previews).
- Persist constellation layout/filters in DataStore; add reduced-motion path and filter counts.
- Decide on cloud sync strategy (Emma Cloud vs BYO) and background work for sync/reminders.
- Run cross-compat QA with fixtures: create on native -> open on web; create on web -> open on native.
