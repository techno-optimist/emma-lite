## Native Android App (Compose)

This is the primary Android implementation (no WebView). It targets parity with the web app and stays compatible with `.emma` vault files.

### Highlights
- Vault compatibility: AES-GCM + PBKDF2, `.emma` open/create/export/share via SAF, autosave, resume.
- UI: landing + onboarding, dashboard orb + radial menu, memories, people, constellation, settings, vault panel.
- Voice: `/token` + `/voice` WebSocket with AudioRecord capture + playback.
- Media: Photo Picker for memory attachments and avatars (Google Photos supported by the picker).

### Structure
- `app/` - Android application module (Compose).
- `app/src/main/java/...` - UI, vault, voice, network.
- `app/src/test/.../VaultCryptoTest.kt` - crypto parity tests.
- `app/src/main/assets/orb/` - orb shader assets.

### Build Requirements
- JDK 17 (or 19), Android Studio Giraffe+.
- Android SDK/Platform 34, Build-Tools 34.x; minSdk set to 24.

### Basic Commands
- From `mobile-native/`: `./gradlew assembleDebug` (Unix) or `.\gradlew.bat assembleDebug` (Windows).
- Install: `./gradlew installDebug`.

### Configuration
- `mobile-native/app/build.gradle.kts`:
  - `BuildConfig.EMMA_BASE_URL` (default `https://emma-lite-optimized.onrender.com`)
  - `BuildConfig.EMMA_WS_PATH` (default `/voice`)
- `OPENAI_API_KEY` (required for voice + AI features):
  - Add to `mobile-native/local.properties` or `mobile-native/gradle.properties` as `OPENAI_API_KEY=...`, or set an `OPENAI_API_KEY` environment variable.
  - Keep the key out of Git (do not commit it).

### Current Gaps
- Memory editing, tags, and people linking UI.
- Attachment gallery management (delete/rename, per-memory previews).
- Cloud sync / background sync / notifications.
- Vectorless AI and chat-to-memory capture.
