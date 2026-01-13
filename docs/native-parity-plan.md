# Android Native Parity Plan (Constellation, People, Vault Panel)

Goal: rebuild the memory constellation, people directory, and vault control panel natively in Compose with identical design and functionality to the web versions.

## Current Native Status (actual)
- ConstellationScreen implemented with memory + people nodes, zoom/pan, filters, add-memory button, and node dialogs. Layout/filter persistence is not implemented yet.
- PeopleScreen implemented with add/edit/delete, avatar picker, search, and detail sheet. Memory linkage relies on `memory.people` and is not exposed in UI yet.
- VaultControlPanelDialog implemented with open/create/export/share, autosave toggle, lock, and stats. Sync timestamps and auto-refresh are not implemented.
- VaultRepository supports autosave, SAF resume, media base64 storage, and attachment compression.

## Primary Web References
- Constellation: `dashboard.html`, `js/dashboard-init.js`, `css/dashboard-base.css`, `css/theme-tokens.css`
- People: `pages/people-emma.html` (inline JS/CSS), shared vault scripts (`js/emma-web-vault.js`, `js/modal-helpers.js`)
- Vault control panel: `js/vault-control-panel.js`, `css/vault-control-panel.css`
- Mobile expectations: `docs/mobile-optimization-roadmap.md`

## Feature Parity Inventory (Web Baseline)

### Memory Constellation
- Full-screen canvas with aurora/neural background; hides other UI in constellation mode.
- Nodes: memories grouped by theme (family/travel/recent/special), people nodes, create-memory node; glow/heartbeat effects and theme-colored tokens.
- Interactions: zoom/pan with scroll + drag; burger filter menu (memories/people toggles, per-theme toggles, counts, reset); keyboard arrows; reduced-motion adjustments.
- Layout/state: saved in localStorage (`emmaConstellationLayoutV1`, `emmaConstellationFiltersV1`); auto-enter via `?constellation=true` or `#constellation`; refresh on memory/person add/delete events.
- Memory preview modal: responsive sheet with attachments, people chips, disables constellation interactions/z-index until closed.
- Native status: zoom/pan + filters implemented; no layout/filter persistence; memory preview is minimal compared to web.

### People Directory
- Glass/aurora background; responsive grid of person cards with relation-colored avatar ring and memory-backed slideshow overlay.
- Data: list people, avatar display (initial fallback; avatarUrl preferred; otherwise fetch media by avatarId), relation, contact.
- Actions: add person modal with avatar upload (stores avatar as media, associates with person), edit person modal, delete with confirm modal.
- Detail modal: name, relation, contact, connected memories, recent activity; toasts for errors/success.
- Vault behaviors: creates vault instance if missing, restores session if active, handles fallback/“enable direct save” affordance.
- Native status: CRUD + avatar picker + search + detail sheet implemented; no memory slideshow overlay; connected memories only show if `memory.people` is populated.

### Vault Control Panel
- Floating shield FAB; opens full-height glass modal with hero glow, sync signal, quick stats (memories/people/storage), active vault chip.
- Sections: vault info/stats, sync status (web vs local timestamps, autosave flag), controls (open different vault, download/export, lock vault, stats), toasts.
- Behavior: auto-refresh sync every ~30s when open; locks scroll/background (`vault-control-locked`); supports close via ESC/dismiss button.
- Native status: bottom sheet with open/create/export/share, autosave toggle, lock, and stats; sync timestamps and auto-refresh not implemented.

## Native Implementation Blueprint

### Data/Repository Parity
- Vault models already match the web payload shape and store JSON strings in maps for compatibility (`memories`, `people`, `media`, `relationships`, `settings`).
- Repository supports people CRUD, media save/fetch (base64), memory parsing with `ignoreUnknownKeys`, autosave, and SAF resume.
- Remaining: relationship helpers, memory summaries for constellation, thumbnail caching, and constellation layout persistence in DataStore.

### Screen Architecture (Compose)
- ConstellationScreen:
  - Background: aurora/neural layers; central orb (`EmorbView`).
  - Canvas layer for nodes/edges; zoom/pan via pointer input (pinch, double-tap), inertia; optional reduced-motion path.
  - Burger filter panel composable with counts, toggles, reset; layout persistence; deep-link entry (nav argument) to auto-start in constellation mode.
  - Node interactions: tap to open MemoryPreviewModal (scrollable, attachments, people chips); long-press to focus; create-memory node routes to memory creation flow.
- PeopleScreen:
  - Grid layout matching web spacing; card glass styling; slideshow overlay using memory thumbnails per person; relation-colored avatar ring.
  - Modals: AddPerson (name/relation/contact, avatar picker), EditPerson, PersonDetail (connected memories, contact).
  - Avatar picker integrates SAF and media save; toasts on success/failure; delete confirm modal.
  - Empty state with CTA when no people.
- VaultControlPanel:
  - Global FAB shown on main screens; opens modal dialog composable with hero, quick stats, sync rows, controls matching web labels/icons.
  - Hooks to repository for open/create/export (SAF), lock/clear passphrase, autosave toggle, stat refresh; toast system with stacked indices.
  - Scroll lock and safe-area padding for phones; sticky footer actions on small screens as in roadmap.

## Execution Backlog (Remaining)
1) Data parity
   - [x] Models: `PersonRecord`, `MediaRecord`, `MemoryRecord` stored as JSON strings in `VaultPayload` maps.
   - [x] Repository: people CRUD, media save/fetch, memory parsing with `ignoreUnknownKeys`.
   - [ ] Relationships/settings helpers and memory summaries for constellation.
   - [ ] Persist constellation layout/filter state in DataStore.
2) UI scaffolding
   - [x] Nav routes for Constellation, People, Vault panel and dashboard actions.
   - [x] PeopleScreen UI with CRUD and avatar picker.
   - [x] VaultControlPanel dialog with open/create/export/share/autosave/lock.
   - [x] ConstellationScreen with zoom/pan and filters.
3) Feature completeness
   - [ ] Memory preview modal parity (attachments, people chips, edit flow).
   - [ ] Person detail activity and memory linking UI.
   - [ ] Constellation layout persistence, filter counts, reduced-motion path, deep-link handling.
4) QA/Parity checks
   - [x] Fixture-driven vault open tests (VaultCryptoTest + fixtures).
   - [ ] End-to-end UI flows for people/constellation/vault panel.
   - [ ] Performance checks on device (touch targets, zoom stability, modal z-order).

## Immediate Next Steps
- Implement memory detail/editing, tags, and people linking.
- Add attachment gallery and media management (delete/rename, per-memory previews).
- Persist constellation layout/filters in DataStore and surface filter counts.
- Run cross-compat QA with fixtures: create on native -> open on web; create on web -> open on native.
