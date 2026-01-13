# Handoff

Last updated: 2025-12-31

## Current focus
Android native parity gaps and UX polish.

## Android native gap list

Entry & Navigation
- Resume CTA not wired to persisted last vault/autosave. (done)
- Dashboard burger menu panels missing (daily brief/insights/quick actions). (done)
- Dashboard search entry point missing. (done)
- Dashboard widgets missing. (done)
- Constellation deep-link entry missing. (done)

Vault & Data Model
- Relationships/settings helpers missing (memory.people/relationships). (done)
- Backfill memory.people from relationships map when loading web vaults. (done)
- Memory summaries for constellation not implemented. (done)
- Thumbnail caching for constellation/people nodes missing. (done)
- Settings persistence to vault/DataStore not implemented. (done)

Memories & People
- Memory gallery grid parity missing. (done)
- Memory detail/editing (title/meta) missing. (done)
- Tags and people linking flows missing. (done)
- Attachment gallery/preview management missing (delete/rename/per-memory edit). (done)
- People cards missing memory slideshow overlay. (done)
- Person detail/connected memories UI relies on memory.people not populated. (done)

Constellation
- Layout/filter persistence in DataStore missing. (done)
- Filter counts missing. (done)
- Reduced-motion path missing. (done)
- Memory preview modal parity missing (attachments, people chips). (done)
- Constellation fallback linking via content mentions (matches web). (done)

Settings & Vault Panel
- Settings layout/sections parity missing (themes/accessibility/system status). (done)
- Vault control panel sync timestamps missing. (done)
- Vault control panel auto-refresh loop missing. (done)
- Vault panel download/export labels parity + toasts missing. (done)

Chat & Voice
- Vectorless AI + memory-worthiness gating missing (known in-progress).
- Chat-to-memory capture + memory citations missing.
- API key flow wiring TODO in EmmaApp.kt (line 2467). (done)
- Voice background audio rules + audio focus handling missing.
- Connectivity error UX/retry polish missing for voice.

Sync, Cloud, Background
- Cloud sync strategy not implemented.
- Background sync jobs + notifications missing.
- Google Photos import/sync beyond picker missing.
- Offline/poor-network UX (banners/queues) not implemented.

QA & Release
- Cross-compat QA (create native -> open web, web -> native) not done.
- End-to-end UI flows for people/constellation/vault panel not covered.
- Signing config + Play internal track setup pending.
- Data safety/privacy forms + store listing assets pending.
- QA device matrix/perf checks pending.
