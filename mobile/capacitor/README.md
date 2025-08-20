# Emma Mobile (Capacitor) — Scaffold

This directory will host the Capacitor mobile shell that embeds the existing Emma web app (HTML/vanilla JS). The app loads bundled assets and uses a filesystem adapter to read/write the `.emma` vault inside the app sandbox.

Planned contents (next steps):
- capacitor.config.ts
- ios/ and android/ projects
- www/ bundling of `pages/`, `css/`, and `js/` assets
- bridge preload for filesystem, biometrics, and share/export

Note: Actual Capacitor initialization and native projects will be created during Phase 1 execution.