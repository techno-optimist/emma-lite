# Mobile Optimization Roadmap

## Phase Tracker
| Phase | Scope | Current Status | Test URLs |
| --- | --- | --- | --- |
| 1. Discovery & Audit | Capture screens at 360/414/768/1024 for every page | ✅ baseline complete for settings + vault, continuing for the rest | `pages/emma-settings-redesigned.html`, vault overlay inside `dashboard.html` |
| 2. Responsive Foundations | Shared breakpoints, spacing tokens, safe-area helpers | ⚙️ active – see `css/main.css` utilities | Any page importing `css/main.css` |
| 3. Navigation & Modal Framework | Drawer/FAB behavior, full-height sheets, typography scale | ⏳ queued | TBD |
| 4. Priority Pages | Settings + Vault panel mobile UX | 🛠 in progress (changes in this update) | `pages/emma-settings-redesigned.html`, `dashboard.html` → vault button |
| 5-7 | Component deep dive, page waves, QA | 🔜 pending | — |

## Immediate Focus (Sprint A)
1. **Foundations** – shared breakpoints, safe-area helpers, and responsive utilities inside `css/main.css`.
2. **Settings Page** – single-column layout, horizontal nav scroller, stacked setting rows, sticky save CTA (`pages/emma-settings-redesigned.html`).
3. **Vault Control Panel** – full-height sheet, stacked hero/metrics, sticky action footer on ≤768 px (`css/vault-control-panel.css`).

## Testing Instructions
1. Open Chrome DevTools → Toggle Device Toolbar → test iPhone SE, iPhone 14, Pixel 7, iPad Mini.
2. After each pull:
   - `pages/emma-settings-redesigned.html`: ensure sidebar becomes a horizontal chip scroller, each section stacks cleanly, sticky action bar appears ≤540 px.
   - `dashboard.html` → click the Vault shield: dialog should fill viewport, hero/stats stack vertically, actions stick to bottom on phones.
   - Any page importing `css/main.css` (e.g., `index.html`) to verify typography clamps and `.responsive-stack`, `.sticky-action-bar` utilities.
3. Use `Ctrl+Shift+R` (hard reload) after CSS updates to bypass cache.

## Noted Pain Points (tracked until fixed)
- Settings cards previously collapsed to ~140 px width with overlapping text.
- Vault overlay forced horizontal scrolling because of fixed two-column grids.
- Modal close buttons overlapped content on small phones.
- Typography defaulted to desktop sizes causing overflow.

This document will be updated as each phase lands so you know what to test next.
