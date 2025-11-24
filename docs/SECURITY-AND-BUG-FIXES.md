# Emma Lite - Security and Bug Fixes (2025-10-08)

This log captures the security hardening and bug fixes completed between 9–12 Oct 2025. Each item notes the area touched, the fix, and how we verified it.

## Backend & Infrastructure
- **Realtime agent logging gated** (`server.js`): wrapped transcript and tool logging behind `EMMA_AGENT_DEBUG` so production runs omit sensitive payloads; exercised logs with the flag toggled.
- **Express fingerprinting removed** (`server.js`): disabled `x-powered-by` to reduce HTTP response metadata that aids fingerprinting.
- **Token endpoint fails closed** (`server.js`): deleted the raw-key fallback from `/token`, returning HTTP 502 on upstream failures; verified 500 without `OPENAI_API_KEY` and the dev stub when set to `test_key`.
- **Static asset allowlist** (`server.js`): replaced `express.static('.')` with explicit directory allowlists, preventing accidental exposure of configs or source files.
- **WebSocket origin guard** (`server.js`): enforced allowed origins and `MAX_WS_PER_IP` limits to block cross-origin hijacking and connection floods.
- **Dashboard routing fix** (`server.js`): added `/dashboard` and `/dashboard.html` handlers so post-unlock redirects land on the dashboard instead of looping on `index.html`.
- **Vault PBKDF2 alignment** (`js/emma-web-vault.js`): standardized creation/decrypt iterations at 250 000 with a 100 000 fallback, restoring decryption of newly minted `.emma` files and keeping legacy files working.

## Client-Side Sanitization & Messaging
- **Global escape helper** (`js/sanitize.js`, `index.html`): shipped a shared `escapeHtml` utility and loaded it early, providing a consistent base for template sanitization.
- **Dashboard memory surfaces escaped** (`dashboard.html`, `js/emma-chat-experience.js`): rendered memory dialogs and previews through sanitized helpers, validated hero carousel URLs, and guarded lazy chat initialization with retry toasts; tested with stored XSS payloads and lazy-load race cases.
- **Assistant/modals output sanitized** (`js/assistant-experience-popup.js`, `js/emma-input-modal.js`, `js/secure-password-modal.js`, `js/clean-password-modal.js`, `js/emma-chat-experience.js`): escaped chat transcripts, modal text, and formatter output before DOM insertion; confirmed markup inputs render as plain text.
- **Printable share hardened** (`js/memories.js`): escaped printable memory exports before `document.write`, blocking user-supplied HTML execution.
- **People flows sanitized** (`pages/people.html` redirect, `pages/people-emma.html`, `add-person.html`): validated avatar sources, escaped names/fingerprints in success banners, and rebuilt contact cards with DOM APIs to prevent injection; exercised with crafted profile data.
- **Voice capture UI hardened** (`js/voice-capture-experience.js`): escaped suggestion text, transcript entries, and dataset attributes; final review confirmed toast handlers remain text-only.
- **Share invitation modal restyled** (`css/dashboard-base.css`, `dashboard.html`): migrated inline styles to class-based rules to reduce dependence on `style-src 'unsafe-inline'`.
- **postMessage origin restrictions** (`dashboard.html`, `js/webapp-extension-bridge.js`, `js/options.js`, `emma-vault-extension-fixed/content-script.js`): replaced `'*'` targets with `window.location.origin` and enforced same-origin listeners to stop cross-document spoofing.
- **CSP nonce enforcement** (`index.html`, `pages/*.html`): issued the stable nonce `nonce-c3RhdGljLWlubGluZQ==` across script tags and removed `unsafe-inline` from `script-src`; verified inline scripts honor the nonce.
- **Logger rewrite** (`js/emma-logger.js`): replaced the corrupted logger with a production-safe variant that redacts sensitive terms and suppresses noisy logs by default.

## Voice & Media Reliability
- **Voice session shutdown hardening** (`js/emma-browser-client.js`, `js/emma-chat-experience.js`): tracked media tracks, worklets, and recognition loops to ensure microphones, audio contexts, and UI buttons shut down cleanly; manual tests confirmed the “ghost mic” and echo regressions are resolved.
- **Memory pressure watchdog** (`js/emma-performance-optimizer.js`): instrumented heap usage, broadcast `emma:memoryPressure` events, and shed optional workloads above 120 MB with automatic recovery once usage falls back into range.

## Dashboard Experience Fixes
- **Mobile memory editor scroll restored** (`js/emma-chat-experience.js`, `css/dashboard-base.css`): relaxed scrim touch handling, added inner listeners, and applied `touch-action: pan-y` so modal content scrolls on mobile; validated on iOS Safari and Chrome for Android.
- **Constellation graph repairs** (`dashboard.html`): normalized person/memory metadata, isolated the create (`+`) node, deduped edges, and bound the Filters drawer close control; repeated reloads confirm stable single links and no stray UI elements.
- **Chat module load guard** (`dashboard.html`): prevented radial menu launches until `EmmaChatExperience` is ready, logging a retry toast instead of throwing `ReferenceError`.

## Codebase Cleanup
- **Legacy extension scripts removed** (`js/`): archived unused background scripts referencing defunct `../lib/*` paths, shrinking the exposed surface area.

## Verification
- `npm install` completes with no audit findings.
- `GET /api/health` reports status and environment as expected.
- `/token` returns HTTP 500 with no key configured and a dev stub when `OPENAI_API_KEY=test_key`.
- WebSocket connections from disallowed origins are rejected and per-IP limits respect `MAX_WS_PER_IP`.
