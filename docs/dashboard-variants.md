# Emma Dashboard Variants

This note captures the status of historical dashboard files after the consolidation carried out in 2025-02.

## Canonical Entry Point

- `dashboard.html` at the repository root is the **only** dashboard that should receive production updates.
- `server.js` explicitly serves `/dashboard` and `/dashboard.html` from this file to avoid any confusion.

## Legacy Cleanup

- `pages/dashboard.html`, `pages/dashboard-new.html`, `pages/dashboard-secure.html`, and `working-desktop-dashboard.html` now live only in version control history after repeated audits confirmed no production code references them.
- Reference copies remain available in git history if the legacy layouts ever need review.

## CSS Guidance

- Shared dashboard styles live in `css/dashboard-base.css` (see below for extraction details).
- When updating the dashboard experience, add new rules to the dedicated stylesheet rather than reviving inline `<style>` blocks in HTML variants.
