# Emma Theme System

## Overview
- Global design tokens drive palettes, neutral surfaces, text colors, and utility accents for every page (dashboard, chat, settings, extensions).
- Themes are identified by a stable `id` and configured through a manifest consumed by `theme-manager.js`.
- `document.documentElement.dataset.theme` exposes the active theme id, while CSS variables (custom properties) provide concrete values for components.

## Token Layers
1. **Semantic Tokens** – Named custom properties (e.g. `--emma-surface-primary`, `--emma-text-strong`) referenced throughout CSS. These live in `css/theme-tokens.css`.
2. **Theme Values** – A set of values per theme that override the semantic tokens, defined in the JS manifest to keep authoring simple and allow runtime switching.
3. **Component Tokens** – Optional aliases for specific widgets (e.g. `--emma-chat-user-bubble`) when a component requires a bespoke palette derived from semantics.

### Core Semantic Tokens
```
--emma-surface-primary      # Base surface tint
--emma-surface-muted        # Glass/secondary panes
--emma-surface-inverse      # Alternate surface (used for cards on light themes)
--emma-gradient-primary     # Hero gradient / major accent
--emma-gradient-aurora      # Background wash gradient
--emma-border-subtle        # Card borders and separators
--emma-text-strong          # High-emphasis copy
--emma-text-standard        # Body copy
--emma-text-muted           # Captions / tertiary labels
--emma-accent-primary       # Primary CTA color
--emma-accent-secondary     # Secondary CTA or outlines
--emma-success              # Success state
--emma-warning              # Warning state
--emma-danger               # Error state
--emma-glow-strong          # Drop shadow / glow used across orb and cards
--emma-chat-user-bubble     # Chat bubble background (user)
--emma-chat-emma-bubble     # Chat bubble background (Emma)
--emma-chat-text-user       # Chat text color (user)
--emma-chat-text-emma       # Chat text color (Emma)
--emma-nav-highlight        # Navigation hover highlight
--emma-constellation-node   # Memory node base color
--emma-constellation-glow   # Memory node glow
--emma-orb-hue              # Numeric hue for WebGL orb (0-360)
--emma-background-style     # Token describing background preset for CSS selectors
```

Component styles should extend this list only when a semantic mapping cannot satisfy the requirement. New tokens must be documented and added to the manifest schema.

## Theme Manifest Structure
`themes/theme-catalog.js` exports an array:
```javascript
export const EMMA_THEMES = [
  {
    id: 'aurora-classic',
    name: 'Aurora Classic',
    description: 'Signature purple gradient with deep-space background.',
    preview: {
      primary: '#7c3aed',
      secondary: '#deb3e4',
      surface: '#0f0c29'
    },
    cssVars: {
      '--emma-surface-primary': '#0a0a0f',
      '--emma-surface-muted': 'rgba(255, 255, 255, 0.04)',
      '--emma-gradient-primary': 'linear-gradient(...)',
      // …additional tokens…
    },
    background: {
      id: 'aurora',
      intensity: 0.35
    },
    flags: {
      highContrast: false,
      animatedBackground: true
    }
  },
  // Additional themes…
];
```

### Field Notes
- `cssVars` contains only custom property overrides; the manager will iterate and `setProperty` on `document.documentElement`.
- `background` metadata informs layered backgrounds (aurora canvas, texture selection). Exact handling lives in `theme-manager.js`.
- `flags` mark variants (e.g. `highContrast`, `reducedMotionPreferred`) to surface quick filters in UI.
- `preview` drives the settings gallery swatch without requiring heavy DOM rendering.

## Theme Manager Workflow
1. Detect user/system preference: read persisted selection, allow an `auto` entry that maps to `prefers-color-scheme`.
2. Apply theme: set `data-theme` attribute, iterate over `cssVars`, update orb hue via custom event (`new CustomEvent('emmaThemeApplied', { detail: theme })`).
3. Persist: store selected theme id and background choice in `localStorage` (`emma.theme.selection`) and, when a vault is available, in `window.emmaWebVault.vaultData.content.settings.theme`.
4. Broadcast: dispatch events (`emmaThemeApplied`, `emmaThemeChanged`) for listeners (orb, backgrounds, chat) to react without tight coupling.

## Testing Guidelines
- Verify WCAG AA contrast for primary text vs. primary surface using axe-core or similar tooling for every new theme.
- Provide screenshot regression coverage of dashboard, chat, and people view under each theme variant.
- Ensure background animations respect `prefers-reduced-motion` even when the theme marks `animatedBackground: true`.

## Authoring Workflow
1. Define semantic needs; avoid hard-coded colors in components.
2. Add or update theme entries in `themes/theme-catalog.js`.
3. Extend settings UI previews if a theme introduces unique backgrounds or requires custom iconography.
4. Update this document when new semantic tokens or manifest fields are introduced.
