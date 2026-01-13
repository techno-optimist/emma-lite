# AGENTS.md - emma-lite

## Overview
This repo ships two versions of Emma:
- Web app: static HTML/JS/CSS served by a small Express server in `server.js`.
- Android native app: Jetpack Compose app in `mobile-native/` (no WebView).

Note: There is also a Capacitor WebView shell in `mobile/` that wraps the web build, but the primary Android native app lives in `mobile-native/`.

## Project map
- `server.js` - Express backend, token endpoint, and WebSocket `/voice`.
- `index.html`, `dashboard.html`, `add-person.html`, `emma-cloud.html` - primary web pages.
- `js/`, `css/`, `themes/`, `pages/` - web assets.
- `apps/` - Emma app manifests and tools.
- `lib/` - backend helpers (vault, utilities).
- `mobile/` - Capacitor wrapper and `mobile/www` web build output.
- `mobile-native/` - native Android app (Compose).

## Web app (version 1)
- Install: `npm install`
- Run: `npm run dev` (starts `server.js` on port 3000) or `npm start`
- Build: `npm run build` (no-op for static assets)
- Optional (WebView wrapper): `npm run build:web` then `npm run sync:android`
- Config: set `OPENAI_API_KEY` to override the default beta key in `server.js`

## Android native app (version 2)
- Requirements: JDK 17, Android SDK 34, Gradle wrapper in `mobile-native/`
- Build: `cd mobile-native` then `./gradlew assembleDebug` (or `.\gradlew.bat assembleDebug` on Windows)
- Install: `./gradlew installDebug`
- Backend URL: `mobile-native/app/build.gradle.kts` -> `BuildConfig.EMMA_BASE_URL`

## Tests
- Web app: no automated test runner configured.
- Android native app: `cd mobile-native` then `./gradlew test` or `./gradlew connectedAndroidTest`

## Doc upkeep reference
Maintain:
* `README.md` — stable overview.
* `HANDOFF.md` — current status for continuity.

Refresh triggers: contradictions, omissions, flaky tests, or version uncertainty.

Refresh includes:
* `README.md`: purpose, architecture, stack with versions, run instructions, changelog-lite.
* `HANDOFF.md`: current status, next steps, test results, artifacts, environment details.
