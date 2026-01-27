# Repository Guidelines

## Project Structure & Module Organization
- Web entry points live at the repo root (`index.html`, `dashboard.html`, `add-person.html`, `emma-cloud.html`); additional screens are in `pages/`.
- Browser logic and styles live in `js/`, `css/`, and `themes/`; shared vault logic is in `lib/`, and app wiring in `apps/`.
- Chrome extension code is in `emma-vault-extension-fixed/` (manifest, background/content scripts, popup UI).
- Native Android app lives in `mobile-native/` (Jetpack Compose + Gradle).
- Plans and audits are in `docs/`; sample data in `data/vault.json`.

## Subprojects & Focus Areas
- Web app + backend: update `index.html`/`dashboard.html` and `js/`; `server.js` serves static assets plus `/token` and `/voice`.
- Extension: `emma-vault-extension-fixed/popup.{html,js,css}` for UI; `background.js` and `content-*.js` for capture + vault syncing.
- Android: `mobile-native/app/src/main/java/.../ui` for screens, `.../vault` for `.emma` crypto/data, and `app/src/main/assets/orb/` for shaders.

## Build, Test, and Development Commands
- `npm install` then `npm run dev` (or `npm start`) to run the local server at `http://localhost:3000`.
- `npm run build:web` copies web assets into `mobile/www` for Capacitor builds; `npm run sync:android` syncs Capacitor assets.
- Android (from `mobile-native/`): `.\gradlew.bat assembleDebug` / `./gradlew assembleDebug`; `./gradlew installDebug`.

## Coding Style & Naming Conventions
- JavaScript/HTML/CSS: 2-space indentation; avoid mass reformatting.
- Use `camelCase` for variables/functions, `PascalCase` for classes, and kebab-case filenames (e.g., `memory-gallery-new.html`).

## Testing Guidelines
- Web: run the server and smoke test vault open/save, dashboard flows, and media capture.
- Extension: reload in `chrome://extensions/` and verify content scripts + popup flows.
- Android: run `./gradlew test` for unit tests (e.g., `VaultCryptoTest.kt`) and spot-check vault compatibility.

## Architecture Overview (Short)
- Local-first vault: the web app stores vault state locally and syncs with extension helpers.
- Voice: the browser connects to `/token` and `/voice` on `server.js`, which brokers OpenAI realtime sessions.
- Android mirrors the `.emma` format for cross-compatibility.

## Commit & Pull Request Guidelines
- Commit messages are short and descriptive; `feat:` appears in recent history.
- Keep changes scoped to one area (web, extension, or Android) when possible.
- PRs should include a summary, testing notes (commands + results), and UI screenshots/GIFs; link issues if available.

## Release Checklist (Short)
- Web: validate `index.html`/`dashboard.html`, memory capture, and vault export/import.
- Extension: confirm capture works on supported sites and vault open/export succeeds.
- Android: build/install debug and verify vault open/create + voice connection.

## Security & Configuration Tips
- Prefer environment variables; `OPENAI_API_KEY` is read by `server.js`.
- CORS and hosting are controlled by `EMMA_ALLOWED_ORIGINS`/`ALLOWED_ORIGINS`, `PORT`, and `NODE_ENV`.
