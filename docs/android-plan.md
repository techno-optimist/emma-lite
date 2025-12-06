## Android Delivery Plan (Hybrid First)

**Goal:** Ship an Android app that reuses the existing Emma web app with minimal duplication, keeps web and mobile workstreams isolated, and leaves room to go more-native later.

### Architectural Approach
- **Hybrid shell (Capacitor + Android WebView):** Fastest path, retains current HTML/CSS/JS. Bridge only what the WebView lacks (mic, file access, notifications, secure storage).
- **Fallback path (later):** If performance/UX hits limits, incrementally replace screens with React Native/Flutter while keeping shared logic framework-agnostic.

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
- Capacitor CLI (`npx @capacitor/cli`), Gradle via Android Studio.
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
- [ ] Decide on audio strategy after first mic test in WebView.
