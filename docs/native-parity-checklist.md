# Android Native Parity Checklist (Web -> Native)

Scope: primary web experience (`index.html`, `dashboard.html`, `pages/gallery.html`, `pages/people-emma.html`, `pages/emma-settings-redesigned.html`) mapped to the native Compose app (`mobile-native/`).

Legend: Done = implemented with parity intent. Partial = implemented but missing key behaviors or UI parity. Missing = not implemented.

## Entry + Vault Setup
- Web: `index.html` (vault create/open, passphrase, extension detection, browser-only fallback).
- Native: `VaultLandingScreen` (create/open, onboarding, orb).
- Status: Partial.
- Gaps: resume CTA not wired to persisted last vault/autosave; no browser-only fallback messaging; no extension integration (not applicable on native).

## Dashboard + Orb Navigation
- Web: `dashboard.html` (orb + radial menu, constellation mode, vault panel, burger menu panels, search/settings).
- Native: `DashboardScreen` (orb + radial menu, settings + vault panel buttons).
- Status: Partial.
- Gaps: burger menu panels (daily brief/insights/quick actions), search entry point, dashboard widgets.

## Constellation
- Web: `dashboard.html` + `js/dashboard-init.js` (layout persistence, filters with counts, memory preview modal, reduced motion).
- Native: `ConstellationScreen` (nodes, filters, zoom/pan, add memory, node dialogs).
- Status: Partial.
- Gaps: layout/filter persistence, filter counts, reduced-motion path, full memory preview with attachments/people chips, deep-link entry.

## Memories / Gallery
- Web: `pages/gallery.html` + `js/gallery.js` (grid, filters, memory detail modal, edit metadata, attachments).
- Native: `MemoriesScreen` (create + list, attachments via Photo Picker).
- Status: Partial.
- Gaps: gallery grid, memory detail/editing, tags, people linking, attachment previews and management.

## People
- Web: `pages/people-emma.html` (grid cards, relation styling, memory slideshow overlay, detail modal).
- Native: `PeopleScreen` (list, add/edit/delete, avatar picker, search, detail sheet).
- Status: Partial.
- Gaps: slideshow overlay, connected memories depends on `memory.people` which UI does not populate yet.

## Settings
- Web: `pages/emma-settings-redesigned.html` (themes, accessibility, system status).
- Native: `SettingsScreen`/sheet (theme selection, accessibility toggles, QA checks).
- Status: Partial.
- Gaps: persistence of settings to vault/DataStore; parity with full web settings layout and sections.

## Vault Control Panel
- Web: `js/vault-control-panel.js` (stats, sync status, auto-refresh, lock/export).
- Native: `VaultControlPanelDialog` (open/create/export/share, autosave toggle, lock, stats).
- Status: Partial.
- Gaps: sync timestamps, auto-refresh loop, download/export labels parity, toasts.

## Chat + Intelligence
- Web: `js/emma-chat-experience.js`, `js/emma-vectorless-engine.js`, `js/emma-intelligent-capture.js`.
- Native: `ChatScreen` + `VoiceSessionManager`.
- Status: Partial.
- Gaps: vectorless AI, memory-worthiness gating, chat-to-memory capture, memory citations.

## Voice Pipeline
- Web: `/token` + `/voice` WebSocket with realtime voice pipeline.
- Native: `/token` + `/voice` WebSocket + AudioRecord capture + playback.
- Status: Done (baseline).
- Gaps: background audio rules, audio focus, and UX polish for connectivity errors.

## Vault + Crypto Parity
- Web: `js/emma-web-vault.js` (AES-GCM + PBKDF2, variant iteration support).
- Native: `VaultCrypto` + `VaultRepository`.
- Status: Done (parity).
- Gaps: none at crypto level; verify UI flows for export/import/persistence.

## Media Handling
- Web: attachments stored in vault media, previews via gallery/constellation.
- Native: attachments stored as base64 media; Constellation uses first attachment for thumbnails.
- Status: Partial.
- Gaps: attachment gallery UI, delete/rename, per-memory media edit.

## Cross-Compat QA
- Fixtures: `docs/fixtures/*.emma`, `VaultCryptoTest.kt`.
- Status: Partial.
- Gaps: end-to-end tests for create native -> open web, and create web -> open native.
