## Mobile (Android) Workspace

This directory isolates the Android app so web and mobile can iterate independently while sharing assets/logic deliberately.

### Planned Structure
- `android/` — Capacitor-generated Android/Gradle project (created).
- `www/` — copied/built web assets for the mobile shell (created by `npm run build:web`).
- `shared/` (optional, at repo root) — shared JS/modules if we start deduplicating web/mobile logic.

### Bootstrap Plan (next steps)
1) Generate/update web build → `mobile/www`:
   - `npm run build:web`
2) Sync after web builds:
   - `npm run sync:android` → `npx cap copy android && npx cap sync android`
3) Build Android:
   - `cd mobile/android && ./gradlew assembleDebug`
4) Install/debug on device/emulator:
   - `cd mobile/android && ./gradlew installDebug`
   - Or `npx cap run android --target <deviceId>`

### Immediate Concerns
- Update backend CORS/connectSrc to allow `capacitor://localhost` (and emulator loopbacks, e.g., `http://10.0.2.2` if used).
- Verify mic access in WebView; if `getUserMedia` is blocked, plan native recorder plugin.
- Plan secure storage for any tokens/secrets; avoid storing API keys in plaintext on device.
- Use Android Studio’s bundled JDK 17 (or JDK ≤19) to match Gradle 8.5/AGP 8.3.x; Java 21 is not supported.

### Status
- Capacitor config at repo root (`capacitor.config.json`) points to `mobile/www` and native path `mobile/android`.
- Android platform has been added (Capacitor-generated project in `mobile/android`).
- `npm run build:web` copies current web assets into `mobile/www`; `npm run sync:android` refreshes the native project.

### Testing from VS Code (terminal)
1) Start Android emulator (via Android Studio or `emulator -avd <name>` with Android SDK on PATH).
2) From repo root: `npm run build:web && npm run sync:android`.
3) In VS Code terminal: `cd mobile/android && ./gradlew installDebug` to install to the running emulator/device.
4) Re-run steps 2–3 after web changes. Use `adb logcat` (or `./gradlew logcat` via Android Studio) to view logs.
