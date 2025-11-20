(function createEmmaThemeManager() {
  const STORAGE_KEY = 'emma.theme.selection';
  const STORAGE_BG_KEY = 'emma.theme.background';
  const EVENT_APPLIED = 'emmaThemeApplied';
  const EVENT_CHANGED = 'emmaThemeChanged';
  const DEFAULT_THEME_ID = 'aurora-classic';

  const docEl = document.documentElement;

  const themeLookup = new Map();
  const backgroundLookup = new Map();
  let appliedVariables = [];
  let activeTheme = null;
  let initialized = false;

  let themeDefaultGradient = null;
  let themeDefaultAurora = null;

  const DEFAULT_THEME_CATALOG = [
    {
      id: 'aurora-classic',
      name: 'Aurora Classic',
      description: 'Signature Emma gradient with deep cosmos ambiance.',
      preview: { primary: '#6f63d9', secondary: '#d06fa8', surface: '#0a0a0f' },
      cssVars: {
        '--emma-surface-primary': '#0a0a0f',
        '--emma-surface-muted': 'rgba(255, 255, 255, 0.04)',
        '--emma-surface-inverse': 'rgba(255, 255, 255, 0.92)',
        '--emma-gradient-primary': 'linear-gradient(135deg, #5058b4 0%, #5a3f8f 50%, #a468a5 100%)',
        '--emma-gradient-secondary': 'linear-gradient(135deg, #3f3f7d 0%, #5a3f8a 50%, #84528f 100%)',
        '--emma-gradient-aurora': 'linear-gradient(135deg, rgba(80, 88, 180, 0.3) 0%, rgba(90, 63, 143, 0.28) 25%, rgba(164, 104, 165, 0.25) 50%, rgba(67, 132, 187, 0.18) 75%, rgba(80, 88, 180, 0.3) 100%)',
        '--emma-border-subtle': 'rgba(255, 255, 255, 0.1)',
        '--emma-border-strong': 'rgba(255, 255, 255, 0.2)',
        '--emma-text-strong': '#ffffff',
        '--emma-text-standard': 'rgba(255, 255, 255, 0.85)',
        '--emma-text-muted': 'rgba(255, 255, 255, 0.6)',
        '--emma-text-on-accent': '#ffffff',
        '--emma-neutral-rgb': '255, 255, 255',
        '--emma-neutral-inverse-rgb': '10, 10, 15',
        '--emma-accent-primary': '#6f63d9',
        '--emma-accent-secondary': '#d06fa8',
        '--emma-accent-primary-rgb': '111, 99, 217',
        '--emma-accent-secondary-rgb': '208, 111, 168',
        '--emma-accent-surface': 'rgba(111, 99, 217, 0.14)',
        '--emma-accent-surface-strong': 'rgba(111, 99, 217, 0.24)',
        '--emma-accent-border': 'rgba(111, 99, 217, 0.3)',
        '--emma-success': '#4ade80',
        '--emma-warning': '#fbbf24',
        '--emma-danger': '#f87171',
        '--emma-chat-user-bubble': 'linear-gradient(135deg, #6f63d9, #d06fa8)',
        '--emma-chat-user-text': '#ffffff',
        '--emma-chat-emma-bubble': 'rgba(37, 38, 65, 0.85)',
        '--emma-chat-emma-text': 'rgba(255, 255, 255, 0.92)',
        '--emma-chat-user-meta': 'rgba(255, 255, 255, 0.7)',
        '--emma-chat-emma-meta': 'rgba(255, 255, 255, 0.6)',
        '--emma-chat-surface': 'rgba(255, 255, 255, 0.05)',
        '--emma-chat-surface-strong': 'rgba(255, 255, 255, 0.1)',
        '--emma-chat-border': 'rgba(255, 255, 255, 0.2)',
        '--emma-chat-muted': 'rgba(255, 255, 255, 0.7)',
        '--emma-chat-strong': 'rgba(255, 255, 255, 0.9)',
        '--emma-chat-error': '#f87171',
        '--emma-chat-success': '#10b981',
        '--emma-nav-highlight': 'rgba(111, 99, 217, 0.16)',
        '--emma-constellation-node': 'rgba(111, 99, 217, 0.45)',
        '--emma-constellation-glow': 'rgba(111, 99, 217, 0.6)',
        '--emma-orb-hue': '265',
        '--emma-orb-hover-intensity': '0.25',
        '--emma-glass': 'rgba(255, 255, 255, 0.05)',
        '--emma-card-bg': 'rgba(255, 255, 255, 0.04)',
        '--emma-button-secondary-bg': 'rgba(255, 255, 255, 0.1)',
        '--emma-button-secondary-border': 'rgba(255, 255, 255, 0.2)',
        '--emma-button-secondary-text': 'rgba(255, 255, 255, 0.85)',
        '--emma-button-secondary-bg-hover': 'rgba(255, 255, 255, 0.2)',
        '--emma-bg-gradient': 'linear-gradient(135deg, #0a0a0f 0%, #1a1033 50%, #0f0c29 100%)'
      },
      background: {
        id: 'aurora',
        name: 'Aurora Field',
        description: 'Soft cosmic gradients with Emma\'s signature glow.',
        intensity: 0.35
      },
      flags: {
        highContrast: false,
        animatedBackground: true
      }
    },
    {
      id: 'sunrise-glow',
      name: 'Sunrise Glow',
      description: 'Warm peach and coral palette with soft morning light.',
      preview: { primary: '#ff8c68', secondary: '#ffd26f', surface: '#fff6eb' },
      cssVars: {
        '--emma-surface-primary': '#fff6eb',
        '--emma-surface-muted': '#ffe9d6',
        '--emma-surface-inverse': '#1f1a24',
        '--emma-gradient-primary': 'linear-gradient(135deg, #ff9a8b 0%, #ff6a88 50%, #ff99ac 100%)',
        '--emma-gradient-secondary': 'linear-gradient(135deg, #ffecd6 0%, #ffcba4 50%, #ff9a8b 100%)',
        '--emma-gradient-aurora': 'linear-gradient(135deg, rgba(255, 206, 170, 0.4) 0%, rgba(255, 145, 171, 0.4) 50%, rgba(255, 233, 214, 0.4) 100%)',
        '--emma-border-subtle': 'rgba(31, 26, 36, 0.1)',
        '--emma-border-strong': 'rgba(31, 26, 36, 0.2)',
        '--emma-text-strong': '#1f1a24',
        '--emma-text-standard': 'rgba(31, 26, 36, 0.85)',
        '--emma-text-muted': 'rgba(31, 26, 36, 0.6)',
        '--emma-text-on-accent': '#1f1a24',
        '--emma-neutral-rgb': '31, 26, 36',
        '--emma-neutral-inverse-rgb': '240, 224, 205',
        '--emma-accent-primary': '#ff8c68',
        '--emma-accent-secondary': '#ffb347',
        '--emma-accent-primary-rgb': '255, 140, 104',
        '--emma-accent-secondary-rgb': '255, 179, 71',
        '--emma-accent-surface': 'rgba(255, 176, 124, 0.18)',
        '--emma-accent-surface-strong': 'rgba(255, 176, 124, 0.3)',
        '--emma-accent-border': 'rgba(255, 176, 124, 0.35)',
        '--emma-success': '#3aa76d',
        '--emma-warning': '#f59e0b',
        '--emma-danger': '#e4566e',
        '--emma-chat-user-bubble': 'linear-gradient(135deg, #ffb07c, #ff8c68)',
        '--emma-chat-user-text': '#1f1a24',
        '--emma-chat-emma-bubble': 'rgba(255, 233, 214, 0.95)',
        '--emma-chat-emma-text': '#1f1a24',
        '--emma-chat-user-meta': 'rgba(31, 26, 36, 0.6)',
        '--emma-chat-emma-meta': 'rgba(31, 26, 36, 0.5)',
        '--emma-chat-surface': 'rgba(31, 26, 36, 0.08)',
        '--emma-chat-surface-strong': 'rgba(31, 26, 36, 0.12)',
        '--emma-chat-border': 'rgba(31, 26, 36, 0.18)',
        '--emma-chat-muted': 'rgba(31, 26, 36, 0.6)',
        '--emma-chat-strong': 'rgba(31, 26, 36, 0.9)',
        '--emma-chat-error': '#e4566e',
        '--emma-chat-success': '#3aa76d',
        '--emma-nav-highlight': 'rgba(255, 176, 124, 0.25)',
        '--emma-constellation-node': 'rgba(255, 176, 124, 0.7)',
        '--emma-constellation-glow': 'rgba(255, 176, 124, 0.9)',
        '--emma-orb-hue': '24',
        '--emma-orb-hover-intensity': '0.2',
        '--emma-glass': 'rgba(255, 255, 255, 0.7)',
        '--emma-card-bg': 'rgba(255, 255, 255, 0.85)',
        '--emma-button-secondary-bg': 'rgba(31, 26, 36, 0.08)',
        '--emma-button-secondary-border': 'rgba(31, 26, 36, 0.12)',
        '--emma-button-secondary-text': 'rgba(31, 26, 36, 0.72)',
        '--emma-button-secondary-bg-hover': 'rgba(31, 26, 36, 0.14)',
        '--emma-bg-gradient': 'linear-gradient(135deg, #fff6eb 0%, #ffe3cc 50%, #ffd2b0 100%)'
      },
      background: {
        id: 'sunrise',
        name: 'Sunrise Veil',
        description: 'Warm morning light with gentle amber motion.',
        intensity: 0.2
      },
      flags: {
        highContrast: false,
        animatedBackground: true
      }
    },
    {
      id: 'midnight-forest',
      name: 'Midnight Forest',
      description: 'Deep greens and teals with luminous accents for focus.',
      preview: { primary: '#1c3d3a', secondary: '#3ae8b3', surface: '#061b1a' },
      cssVars: {
        '--emma-surface-primary': '#061b1a',
        '--emma-surface-muted': 'rgba(10, 58, 52, 0.55)',
        '--emma-surface-inverse': '#e9fff9',
        '--emma-gradient-primary': 'linear-gradient(135deg, #0f4251 0%, #166c54 50%, #3ae8b3 100%)',
        '--emma-gradient-secondary': 'linear-gradient(135deg, #2d9486 0%, #1f745f 50%, #3ae8b3 100%)',
        '--emma-gradient-aurora': 'linear-gradient(135deg, rgba(61, 214, 190, 0.2) 0%, rgba(26, 95, 91, 0.35) 50%, rgba(73, 164, 164, 0.2) 100%)',
        '--emma-border-subtle': 'rgba(58, 149, 138, 0.32)',
        '--emma-border-strong': 'rgba(58, 149, 138, 0.5)',
        '--emma-text-strong': '#e9fff9',
        '--emma-text-standard': 'rgba(233, 255, 249, 0.86)',
        '--emma-text-muted': 'rgba(233, 255, 249, 0.65)',
        '--emma-text-on-accent': '#032221',
        '--emma-neutral-rgb': '233, 255, 249',
        '--emma-neutral-inverse-rgb': '12, 64, 60',
        '--emma-accent-primary': '#3ae8b3',
        '--emma-accent-secondary': '#5adeff',
        '--emma-accent-primary-rgb': '58, 232, 179',
        '--emma-accent-secondary-rgb': '90, 222, 255',
        '--emma-accent-surface': 'rgba(58, 149, 138, 0.18)',
        '--emma-accent-surface-strong': 'rgba(58, 149, 138, 0.32)',
        '--emma-accent-border': 'rgba(58, 149, 138, 0.45)',
        '--emma-success': '#4ade80',
        '--emma-warning': '#fbbf24',
        '--emma-danger': '#f87171',
        '--emma-chat-user-bubble': 'linear-gradient(135deg, #3ae8b3, #5adeff)',
        '--emma-chat-user-text': '#0b2320',
        '--emma-chat-emma-bubble': 'rgba(14, 52, 54, 0.88)',
        '--emma-chat-emma-text': 'rgba(233, 255, 249, 0.92)',
        '--emma-chat-user-meta': 'rgba(11, 35, 33, 0.6)',
        '--emma-chat-emma-meta': 'rgba(233, 255, 249, 0.65)',
        '--emma-chat-surface': 'rgba(12, 64, 60, 0.35)',
        '--emma-chat-surface-strong': 'rgba(12, 64, 60, 0.5)',
        '--emma-chat-border': 'rgba(58, 149, 138, 0.45)',
        '--emma-chat-muted': 'rgba(233, 255, 249, 0.7)',
        '--emma-chat-strong': 'rgba(233, 255, 249, 0.92)',
        '--emma-chat-error': '#f87171',
        '--emma-chat-success': '#3ae8b3',
        '--emma-nav-highlight': 'rgba(58, 149, 138, 0.3)',
        '--emma-constellation-node': 'rgba(58, 149, 138, 0.7)',
        '--emma-constellation-glow': 'rgba(58, 149, 138, 0.95)',
        '--emma-orb-hue': '160',
        '--emma-orb-hover-intensity': '0.25',
        '--emma-glass': 'rgba(8, 43, 43, 0.6)',
        '--emma-card-bg': 'rgba(8, 43, 43, 0.55)',
        '--emma-button-secondary-bg': 'rgba(12, 64, 60, 0.6)',
        '--emma-button-secondary-border': 'rgba(58, 149, 138, 0.45)',
        '--emma-button-secondary-text': 'rgba(233, 255, 249, 0.88)',
        '--emma-button-secondary-bg-hover': 'rgba(12, 64, 60, 0.75)',
        '--emma-bg-gradient': 'linear-gradient(135deg, #031010 0%, #0f2f2b 50%, #041b19 100%)'
      },
      background: {
        id: 'forest',
        name: 'Forest Night',
        description: 'Luminous particles drifting through deep forest hues.',
        intensity: 0.45
    },
    flags: {
      highContrast: true,
      animatedBackground: false
    }
    },
    {
      id: 'lunar-tide',
      name: 'Lunar Tide',
      description: 'Noctilucent blues with aqua highlights for calm focus.',
      preview: { primary: '#0f3c68', secondary: '#4dc4ff', surface: '#06131f' },
      cssVars: {
        '--emma-surface-primary': '#06131f',
        '--emma-surface-muted': 'rgba(13, 40, 61, 0.55)',
        '--emma-surface-inverse': '#f0fbff',
        '--emma-gradient-primary': 'linear-gradient(135deg, #0f3c68 0%, #0b7895 50%, #4dc4ff 100%)',
        '--emma-gradient-secondary': 'linear-gradient(135deg, #0b5e7a 0%, #2093a9 50%, #4dc4ff 100%)',
        '--emma-gradient-aurora': 'linear-gradient(135deg, rgba(77, 196, 255, 0.22) 0%, rgba(20, 130, 155, 0.35) 50%, rgba(11, 60, 96, 0.3) 100%)',
        '--emma-border-subtle': 'rgba(77, 196, 255, 0.24)',
        '--emma-border-strong': 'rgba(77, 196, 255, 0.45)',
        '--emma-text-strong': '#f0fbff',
        '--emma-text-standard': 'rgba(240, 251, 255, 0.86)',
        '--emma-text-muted': 'rgba(240, 251, 255, 0.65)',
        '--emma-text-on-accent': '#03121f',
        '--emma-neutral-rgb': '240, 251, 255',
        '--emma-neutral-inverse-rgb': '6, 19, 31',
        '--emma-accent-primary': '#4dc4ff',
        '--emma-accent-secondary': '#64f7d5',
        '--emma-accent-primary-rgb': '77, 196, 255',
        '--emma-accent-secondary-rgb': '100, 247, 213',
        '--emma-accent-surface': 'rgba(77, 196, 255, 0.18)',
        '--emma-accent-surface-strong': 'rgba(77, 196, 255, 0.32)',
        '--emma-accent-border': 'rgba(77, 196, 255, 0.4)',
        '--emma-success': '#34d399',
        '--emma-warning': '#facc15',
        '--emma-danger': '#f87171',
        '--emma-chat-user-bubble': 'linear-gradient(135deg, #4dc4ff, #64f7d5)',
        '--emma-chat-user-text': '#03121f',
        '--emma-chat-emma-bubble': 'rgba(11, 49, 78, 0.88)',
        '--emma-chat-emma-text': 'rgba(240, 251, 255, 0.92)',
        '--emma-chat-user-meta': 'rgba(3, 18, 31, 0.6)',
        '--emma-chat-emma-meta': 'rgba(240, 251, 255, 0.65)',
        '--emma-chat-surface': 'rgba(13, 40, 61, 0.45)',
        '--emma-chat-surface-strong': 'rgba(13, 40, 61, 0.6)',
        '--emma-chat-border': 'rgba(77, 196, 255, 0.35)',
        '--emma-chat-muted': 'rgba(240, 251, 255, 0.7)',
        '--emma-chat-strong': 'rgba(240, 251, 255, 0.92)',
        '--emma-chat-error': '#f87171',
        '--emma-chat-success': '#34d399',
        '--emma-nav-highlight': 'rgba(77, 196, 255, 0.3)',
        '--emma-constellation-node': 'rgba(77, 196, 255, 0.7)',
        '--emma-constellation-glow': 'rgba(77, 196, 255, 0.95)',
        '--emma-orb-hue': '200',
        '--emma-orb-hover-intensity': '0.28',
        '--emma-glass': 'rgba(6, 31, 45, 0.6)',
        '--emma-card-bg': 'rgba(6, 31, 45, 0.55)',
        '--emma-button-secondary-bg': 'rgba(11, 49, 78, 0.6)',
        '--emma-button-secondary-border': 'rgba(77, 196, 255, 0.45)',
        '--emma-button-secondary-text': 'rgba(240, 251, 255, 0.9)',
        '--emma-button-secondary-bg-hover': 'rgba(11, 49, 78, 0.75)',
        '--emma-bg-gradient': 'linear-gradient(135deg, #041019 0%, #0d2232 50%, #032236 100%)',
        '--emma-background-ocean': 'linear-gradient(135deg, rgba(77, 196, 255, 0.18), rgba(14, 84, 120, 0.4))'
      },
      background: {
        id: 'ocean',
        name: 'Lunar Tide',
        description: 'Slow aurora bands drifting over deep ocean blues.',
        intensity: 0.38
      },
      flags: {
        highContrast: true,
        animatedBackground: true
      }
    },
    {
      id: 'ember-noir',
      name: 'Ember Noir',
      description: 'Sleek charcoal base with ember-lit highlights.',
      preview: { primary: '#2b1a1f', secondary: '#f97316', surface: '#131015' },
      cssVars: {
        '--emma-surface-primary': '#131015',
        '--emma-surface-muted': 'rgba(55, 30, 43, 0.55)',
        '--emma-surface-inverse': '#fdf6f0',
        '--emma-gradient-primary': 'linear-gradient(135deg, #2b1a1f 0%, #50232c 50%, #f97316 100%)',
        '--emma-gradient-secondary': 'linear-gradient(135deg, #311920 0%, #8b2635 50%, #fb7185 100%)',
        '--emma-gradient-aurora': 'linear-gradient(135deg, rgba(249, 115, 22, 0.25) 0%, rgba(251, 113, 133, 0.2) 45%, rgba(79, 18, 30, 0.4) 100%)',
        '--emma-border-subtle': 'rgba(249, 115, 22, 0.24)',
        '--emma-border-strong': 'rgba(249, 115, 22, 0.45)',
        '--emma-text-strong': '#fdf6f0',
        '--emma-text-standard': 'rgba(253, 246, 240, 0.85)',
        '--emma-text-muted': 'rgba(253, 246, 240, 0.65)',
        '--emma-text-on-accent': '#220a0a',
        '--emma-neutral-rgb': '253, 246, 240',
        '--emma-neutral-inverse-rgb': '19, 16, 21',
        '--emma-accent-primary': '#f97316',
        '--emma-accent-secondary': '#fb7185',
        '--emma-accent-primary-rgb': '249, 115, 22',
        '--emma-accent-secondary-rgb': '251, 113, 133',
        '--emma-accent-surface': 'rgba(249, 115, 22, 0.18)',
        '--emma-accent-surface-strong': 'rgba(249, 115, 22, 0.32)',
        '--emma-accent-border': 'rgba(249, 115, 22, 0.42)',
        '--emma-success': '#22c55e',
        '--emma-warning': '#facc15',
        '--emma-danger': '#f87171',
        '--emma-chat-user-bubble': 'linear-gradient(135deg, #f97316, #fb7185)',
        '--emma-chat-user-text': '#2b0b0b',
        '--emma-chat-emma-bubble': 'rgba(44, 21, 29, 0.88)',
        '--emma-chat-emma-text': 'rgba(253, 246, 240, 0.92)',
        '--emma-chat-user-meta': 'rgba(43, 11, 11, 0.65)',
        '--emma-chat-emma-meta': 'rgba(253, 246, 240, 0.65)',
        '--emma-chat-surface': 'rgba(55, 30, 43, 0.5)',
        '--emma-chat-surface-strong': 'rgba(55, 30, 43, 0.65)',
        '--emma-chat-border': 'rgba(249, 115, 22, 0.35)',
        '--emma-chat-muted': 'rgba(253, 246, 240, 0.7)',
        '--emma-chat-strong': 'rgba(253, 246, 240, 0.92)',
        '--emma-chat-error': '#f87171',
        '--emma-chat-success': '#22c55e',
        '--emma-nav-highlight': 'rgba(249, 115, 22, 0.32)',
        '--emma-constellation-node': 'rgba(249, 115, 22, 0.66)',
        '--emma-constellation-glow': 'rgba(249, 115, 22, 0.88)',
        '--emma-orb-hue': '20',
        '--emma-orb-hover-intensity': '0.22',
        '--emma-glass': 'rgba(24, 12, 18, 0.65)',
        '--emma-card-bg': 'rgba(24, 12, 18, 0.58)',
        '--emma-button-secondary-bg': 'rgba(45, 23, 31, 0.65)',
        '--emma-button-secondary-border': 'rgba(249, 115, 22, 0.35)',
        '--emma-button-secondary-text': 'rgba(253, 246, 240, 0.9)',
        '--emma-button-secondary-bg-hover': 'rgba(45, 23, 31, 0.8)',
        '--emma-bg-gradient': 'linear-gradient(135deg, #12090d 0%, #211017 50%, #2f181f 100%)',
        '--emma-background-ember': 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(71, 21, 27, 0.45))'
      },
      background: {
        id: 'ember',
        name: 'Ember Noir',
        description: 'Amber sparks drifting across a noir twilight.',
        intensity: 0.34
      },
      flags: {
        highContrast: false,
        animatedBackground: true
      }
    },
    {
      id: 'blossom-dream',
      name: 'Blossom Dream',
      description: 'Pastel bloom with gentle light for uplifting moments.',
      preview: { primary: '#fcb3ff', secondary: '#f472b6', surface: '#fef8ff' },
      cssVars: {
        '--emma-surface-primary': '#fef8ff',
        '--emma-surface-muted': 'rgba(247, 220, 255, 0.7)',
        '--emma-surface-inverse': '#20142a',
        '--emma-gradient-primary': 'linear-gradient(135deg, #fcb3ff 0%, #a855f7 50%, #6366f1 100%)',
        '--emma-gradient-secondary': 'linear-gradient(135deg, #ffe3f7 0%, #fcb3ff 50%, #f9a8d4 100%)',
        '--emma-gradient-aurora': 'linear-gradient(135deg, rgba(252, 179, 255, 0.35) 0%, rgba(249, 168, 212, 0.3) 50%, rgba(99, 102, 241, 0.25) 100%)',
        '--emma-border-subtle': 'rgba(32, 20, 42, 0.12)',
        '--emma-border-strong': 'rgba(32, 20, 42, 0.28)',
        '--emma-text-strong': '#20142a',
        '--emma-text-standard': 'rgba(32, 20, 42, 0.85)',
        '--emma-text-muted': 'rgba(32, 20, 42, 0.6)',
        '--emma-text-on-accent': '#20142a',
        '--emma-neutral-rgb': '32, 20, 42',
        '--emma-neutral-inverse-rgb': '254, 248, 255',
        '--emma-accent-primary': '#a855f7',
        '--emma-accent-secondary': '#f472b6',
        '--emma-accent-primary-rgb': '168, 85, 247',
        '--emma-accent-secondary-rgb': '244, 114, 182',
        '--emma-accent-surface': 'rgba(244, 114, 182, 0.16)',
        '--emma-accent-surface-strong': 'rgba(244, 114, 182, 0.28)',
        '--emma-accent-border': 'rgba(244, 114, 182, 0.32)',
        '--emma-success': '#22c55e',
        '--emma-warning': '#f59e0b',
        '--emma-danger': '#ef4444',
        '--emma-chat-user-bubble': 'linear-gradient(135deg, #f9a8d4, #a855f7)',
        '--emma-chat-user-text': '#20142a',
        '--emma-chat-emma-bubble': 'rgba(255, 236, 250, 0.96)',
        '--emma-chat-emma-text': '#20142a',
        '--emma-chat-user-meta': 'rgba(32, 20, 42, 0.6)',
        '--emma-chat-emma-meta': 'rgba(32, 20, 42, 0.5)',
        '--emma-chat-surface': 'rgba(32, 20, 42, 0.08)',
        '--emma-chat-surface-strong': 'rgba(32, 20, 42, 0.12)',
        '--emma-chat-border': 'rgba(32, 20, 42, 0.16)',
        '--emma-chat-muted': 'rgba(32, 20, 42, 0.6)',
        '--emma-chat-strong': 'rgba(32, 20, 42, 0.9)',
        '--emma-chat-error': '#ef4444',
        '--emma-chat-success': '#16a34a',
        '--emma-nav-highlight': 'rgba(244, 114, 182, 0.25)',
        '--emma-constellation-node': 'rgba(244, 114, 182, 0.7)',
        '--emma-constellation-glow': 'rgba(244, 114, 182, 0.9)',
        '--emma-orb-hue': '285',
        '--emma-orb-hover-intensity': '0.2',
        '--emma-glass': 'rgba(255, 255, 255, 0.7)',
        '--emma-card-bg': 'rgba(255, 255, 255, 0.85)',
        '--emma-button-secondary-bg': 'rgba(32, 20, 42, 0.08)',
        '--emma-button-secondary-border': 'rgba(32, 20, 42, 0.12)',
        '--emma-button-secondary-text': 'rgba(32, 20, 42, 0.72)',
        '--emma-button-secondary-bg-hover': 'rgba(32, 20, 42, 0.14)',
        '--emma-bg-gradient': 'linear-gradient(135deg, #fef8ff 0%, #ffe9f7 50%, #e8ddff 100%)',
        '--emma-background-blossom': 'linear-gradient(135deg, rgba(252, 179, 255, 0.22), rgba(241, 179, 239, 0.35))'
      },
      background: {
        id: 'blossom',
        name: 'Blossom Veil',
        description: 'Soft petal diffraction floating across gentle light.',
        intensity: 0.22
      },
      flags: {
        highContrast: false,
        animatedBackground: true
      }
    },
    {
      id: 'zen-slate',
      name: 'Zen Slate',
      description: 'Modern graphite palette with calm blue-green accents.',
      preview: { primary: '#1f2937', secondary: '#60a5fa', surface: '#111827' },
      cssVars: {
        '--emma-surface-primary': '#111827',
        '--emma-surface-muted': 'rgba(255, 255, 255, 0.06)',
        '--emma-surface-inverse': '#f9fafb',
        '--emma-gradient-primary': 'linear-gradient(135deg, #0f172a 0%, #1f2937 50%, #4b5563 100%)',
        '--emma-gradient-secondary': 'linear-gradient(135deg, #1f2937 0%, #374151 50%, #6b7280 100%)',
        '--emma-gradient-aurora': 'linear-gradient(135deg, rgba(79, 70, 229, 0.18) 0%, rgba(15, 118, 110, 0.22) 50%, rgba(30, 64, 175, 0.2) 100%)',
        '--emma-border-subtle': 'rgba(255, 255, 255, 0.14)',
        '--emma-border-strong': 'rgba(255, 255, 255, 0.28)',
        '--emma-text-strong': '#f9fafb',
        '--emma-text-standard': 'rgba(249, 250, 251, 0.9)',
        '--emma-text-muted': 'rgba(249, 250, 251, 0.65)',
        '--emma-text-on-accent': '#0b1120',
        '--emma-neutral-rgb': '249, 250, 251',
        '--emma-neutral-inverse-rgb': '17, 24, 39',
        '--emma-accent-primary': '#60a5fa',
        '--emma-accent-secondary': '#34d399',
        '--emma-accent-primary-rgb': '96, 165, 250',
        '--emma-accent-secondary-rgb': '52, 211, 153',
        '--emma-accent-surface': 'rgba(96, 165, 250, 0.2)',
        '--emma-accent-surface-strong': 'rgba(96, 165, 250, 0.32)',
        '--emma-accent-border': 'rgba(96, 165, 250, 0.34)',
        '--emma-success': '#34d399',
        '--emma-warning': '#facc15',
        '--emma-danger': '#f87171',
        '--emma-chat-user-bubble': 'linear-gradient(135deg, #60a5fa, #34d399)',
        '--emma-chat-user-text': '#0b1120',
        '--emma-chat-emma-bubble': 'rgba(24, 36, 52, 0.9)',
        '--emma-chat-emma-text': 'rgba(249, 250, 251, 0.92)',
        '--emma-chat-user-meta': 'rgba(11, 17, 32, 0.65)',
        '--emma-chat-emma-meta': 'rgba(249, 250, 251, 0.65)',
        '--emma-chat-surface': 'rgba(31, 41, 55, 0.45)',
        '--emma-chat-surface-strong': 'rgba(31, 41, 55, 0.6)',
        '--emma-chat-border': 'rgba(96, 165, 250, 0.32)',
        '--emma-chat-muted': 'rgba(249, 250, 251, 0.75)',
        '--emma-chat-strong': 'rgba(249, 250, 251, 0.95)',
        '--emma-chat-error': '#f87171',
        '--emma-chat-success': '#34d399',
        '--emma-nav-highlight': 'rgba(96, 165, 250, 0.26)',
        '--emma-constellation-node': 'rgba(96, 165, 250, 0.7)',
        '--emma-constellation-glow': 'rgba(96, 165, 250, 0.95)',
        '--emma-orb-hue': '215',
        '--emma-orb-hover-intensity': '0.27',
        '--emma-glass': 'rgba(15, 23, 42, 0.65)',
        '--emma-card-bg': 'rgba(17, 24, 39, 0.6)',
        '--emma-button-secondary-bg': 'rgba(31, 41, 55, 0.55)',
        '--emma-button-secondary-border': 'rgba(96, 165, 250, 0.32)',
        '--emma-button-secondary-text': 'rgba(249, 250, 251, 0.9)',
        '--emma-button-secondary-bg-hover': 'rgba(31, 41, 55, 0.72)',
        '--emma-bg-gradient': 'linear-gradient(135deg, #0b1120 0%, #111827 50%, #1f2937 100%)',
        '--emma-background-zen': 'linear-gradient(135deg, rgba(96, 165, 250, 0.22), rgba(17, 94, 89, 0.25))'
      },
      background: {
        id: 'zen',
        name: 'Zen Slate',
        description: 'Holographic mist gliding over graphite horizons.',
        intensity: 0.3
      },
      flags: {
        highContrast: true,
        animatedBackground: false
      }
    }
  ];

  const externalCatalog = Array.isArray(window.EMMA_THEMES) ? window.EMMA_THEMES : null;
  const catalog = externalCatalog && externalCatalog.length ? externalCatalog : DEFAULT_THEME_CATALOG;
  if (!externalCatalog || externalCatalog.length === 0) {
    console.warn('Emma theme manager: falling back to built-in theme catalog');
    window.EMMA_THEMES = catalog;
  }
  catalog.forEach(theme => {
    if (theme && theme.id) {
      themeLookup.set(theme.id, theme);
      if (theme.background && theme.background.id) {
        const existing = backgroundLookup.get(theme.background.id) || {
          ...theme.background,
          themeIds: []
        };
        if (!existing.themeIds.includes(theme.id)) {
          existing.themeIds.push(theme.id);
        }
        backgroundLookup.set(theme.background.id, existing);
      }
    }
  });

  function getThemeByBackgroundId(backgroundId) {
    if (!backgroundId) return null;
    return catalog.find(theme => theme.background && theme.background.id === backgroundId) || null;
  }

  function getFallbackTheme() {
    return themeLookup.get(DEFAULT_THEME_ID) || catalog[0] || null;
  }

  function readPersistedThemeId() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      console.log('[ThemeManager] read persisted theme:', stored);
      return stored;
    } catch (error) {
      console.warn('Emma theme manager: unable to read persisted theme', error);
      return null;
    }
  }

  function persistThemeSelection(themeId) {
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
      console.log('[ThemeManager] persisted theme selection:', themeId);
    } catch (error) {
      console.warn('Emma theme manager: unable to persist selection', error);
    }
  }

  function readPersistedBackgroundId() {
    try {
      const stored = localStorage.getItem(STORAGE_BG_KEY);
      return stored || null;
    } catch (error) {
      console.warn('Emma theme manager: unable to read persisted background', error);
      return null;
    }
  }

  function persistBackgroundId(backgroundId) {
    try {
      if (backgroundId) {
        localStorage.setItem(STORAGE_BG_KEY, backgroundId);
      } else {
        localStorage.removeItem(STORAGE_BG_KEY);
      }
    } catch (error) {
      console.warn('Emma theme manager: unable to persist background choice', error);
    }
  }

  function applyBackgroundState(backgroundId) {
    const resolvedBackgroundId = backgroundId || (activeTheme && activeTheme.background && activeTheme.background.id) || null;

    if (resolvedBackgroundId) {
      docEl.dataset.background = resolvedBackgroundId;
    } else {
      delete docEl.dataset.background;
    }

    const backgroundTheme = getThemeByBackgroundId(resolvedBackgroundId);

    if (backgroundTheme && backgroundTheme.cssVars) {
      const gradientOverride = backgroundTheme.cssVars['--emma-bg-gradient'] || themeDefaultGradient;
      if (gradientOverride) {
        docEl.style.setProperty('--emma-bg-gradient', gradientOverride);
      } else if (themeDefaultGradient) {
        docEl.style.setProperty('--emma-bg-gradient', themeDefaultGradient);
      } else {
        docEl.style.removeProperty('--emma-bg-gradient');
      }

      const auroraOverride = backgroundTheme.cssVars['--emma-gradient-aurora'] || backgroundTheme.cssVars['--emma-aurora'];
      if (auroraOverride) {
        docEl.style.setProperty('--emma-aurora', auroraOverride);
      } else if (themeDefaultAurora) {
        docEl.style.setProperty('--emma-aurora', themeDefaultAurora);
      } else {
        docEl.style.removeProperty('--emma-aurora');
      }
    } else {
      if (themeDefaultGradient) {
        docEl.style.setProperty('--emma-bg-gradient', themeDefaultGradient);
      } else {
        docEl.style.removeProperty('--emma-bg-gradient');
      }

      if (themeDefaultAurora) {
        docEl.style.setProperty('--emma-aurora', themeDefaultAurora);
      } else {
        docEl.style.removeProperty('--emma-aurora');
      }
    }
  }

  function dispatchBackgroundChange(backgroundId, previousBackgroundId) {
    const detail = {
      backgroundId: backgroundId || null,
      previousBackgroundId: previousBackgroundId || null,
      timestamp: Date.now()
    };
    window.dispatchEvent(new CustomEvent('emmaBackgroundChanged', { detail }));
  }

  function lookupBackground(backgroundId) {
    return backgroundLookup.get(backgroundId) || null;
  }

  function buildEventPayload(theme, previousTheme) {
    return {
      theme,
      previousTheme,
      timestamp: Date.now()
    };
  }

  function broadcast(theme, previousTheme, eventName) {
    if (!theme) return;
    const detail = buildEventPayload(theme, previousTheme);
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
    if (eventName !== EVENT_APPLIED) {
      window.dispatchEvent(new CustomEvent(EVENT_APPLIED, { detail }));
    }
  }

  function applyCssVariables(theme) {
    if (!theme || !theme.cssVars) return;
    // Remove previously applied inline properties to avoid stale values
    appliedVariables.forEach(key => {
      docEl.style.removeProperty(key);
    });

    themeDefaultGradient = null;
    themeDefaultAurora = null;

    const keys = Object.keys(theme.cssVars);
    keys.forEach(key => {
      docEl.style.setProperty(key, theme.cssVars[key]);
    });

    docEl.style.setProperty('--emma-theme-id', `'${theme.id}'`);
    if (theme.cssVars && theme.cssVars['--emma-bg-gradient']) {
      themeDefaultGradient = theme.cssVars['--emma-bg-gradient'];
      docEl.style.setProperty('--emma-bg-gradient', themeDefaultGradient);
    } else if (!themeDefaultGradient) {
      const computed = getComputedStyle(docEl).getPropertyValue('--emma-bg-gradient');
      themeDefaultGradient = computed && computed.trim() ? computed.trim() : null;
    }
    appliedVariables = keys.concat('--emma-theme-id');

    if (theme.cssVars && theme.cssVars['--emma-gradient-aurora']) {
      themeDefaultAurora = theme.cssVars['--emma-gradient-aurora'];
      docEl.style.setProperty('--emma-aurora', themeDefaultAurora);
    } else if (!themeDefaultAurora) {
      const computedAurora = getComputedStyle(docEl).getPropertyValue('--emma-aurora');
      themeDefaultAurora = computedAurora && computedAurora.trim() ? computedAurora.trim() : null;
    }
  }

  function applyBackgroundMetadata(theme, options = {}) {
    if (!theme) return;

    const stored = readPersistedBackgroundId();
    const respectStored = options.respectStored !== false;
    const previousBackground = docEl.dataset.background || null;

    let targetBackgroundId = null;

    if (respectStored && stored && lookupBackground(stored)) {
      targetBackgroundId = stored;
    } else if (theme.background && theme.background.id) {
      targetBackgroundId = theme.background.id;
      if (options.persist !== false) {
        persistBackgroundId(theme.background.id);
      }
    } else if (options.persist !== false) {
      persistBackgroundId(null);
    }

    applyBackgroundState(targetBackgroundId);

    if (previousBackground !== targetBackgroundId) {
      dispatchBackgroundChange(targetBackgroundId, previousBackground);
    }
  }

  async function syncThemeToVault(theme) {
    const vault = window.emmaWebVault;
    if (!vault || !vault.vaultData) return;

    try {
      vault.vaultData.content = vault.vaultData.content || {};
      vault.vaultData.content.settings = vault.vaultData.content.settings || {};

      vault.vaultData.content.settings.theme = {
        id: theme.id,
        appliedAt: Date.now()
      };

      if (typeof vault.persistSettings === 'function') {
        await vault.persistSettings('theme');
      } else if (typeof vault.saveToIndexedDB === 'function') {
        await vault.saveToIndexedDB();
      } else {
        // Fallback: flag pending save
        vault.pendingChanges = true;
      }
    } catch (error) {
      console.warn('Emma theme manager: unable to sync theme to vault', error);
    }
  }

  function applyTheme(themeId, options = {}) {
    const previousTheme = activeTheme;

    let theme = themeLookup.get(themeId);
    if (!theme) {
      theme = getFallbackTheme();
    }

    if (!theme) {
      console.error('Emma theme manager: no theme available to apply');
      return null;
    }

    if (previousTheme && previousTheme.id === theme.id && options.force !== true) {
      return activeTheme;
    }

    docEl.dataset.theme = theme.id;
    applyCssVariables(theme);
    applyBackgroundMetadata(theme, {
      respectStored: options.keepBackground !== false,
      persist: options.persist !== false
    });

    activeTheme = theme;

    if (options.persist !== false) {
      persistThemeSelection(theme.id);
      syncThemeToVault(theme);
    }

    broadcast(theme, previousTheme, options.silent ? EVENT_APPLIED : EVENT_CHANGED);
    return theme;
  }

  function detectInitialTheme() {
    const persisted = readPersistedThemeId();
    if (persisted && themeLookup.has(persisted)) {
      console.log('[ThemeManager] using persisted theme', persisted);
      return persisted;
    }

    // Attempt to map system preference to a matching theme flag
    try {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        const darkCandidate = catalog.find(theme => theme.flags && theme.flags.darkPreferred);
        if (darkCandidate) return darkCandidate.id;
      } else {
        const lightCandidate = catalog.find(theme => theme.flags && theme.flags.lightPreferred);
        if (lightCandidate) return lightCandidate.id;
      }
    } catch (error) {
      // No-op: fallback handled below
    }

    return getFallbackTheme()?.id || null;
  }

  function initialize() {
    if (initialized) return;
    initialized = true;

    const initialThemeId = detectInitialTheme();
    console.log('[ThemeManager] initialize -> applying', initialThemeId || DEFAULT_THEME_ID);
    applyTheme(initialThemeId || DEFAULT_THEME_ID, { persist: false, silent: true });

    if (window.matchMedia) {
      try {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        media.addEventListener('change', () => {
          const stored = readPersistedThemeId();
          if (!stored) {
            const fallbackId = detectInitialTheme();
            applyTheme(fallbackId, { persist: false });
          }
        });
      } catch (error) {
        // Older browsers may not support addEventListener on media query lists
      }
    }
  }
  function updateBackground(backgroundId, options = {}) {
    if (backgroundId && !lookupBackground(backgroundId)) {
      console.warn('Emma theme manager: unknown background id', backgroundId);
    }

    const previous = docEl.dataset.background || null;
    applyBackgroundState(backgroundId || null);

    if (options.persist !== false) {
      persistBackgroundId(backgroundId || null);
    }

    if (previous !== (backgroundId || null)) {
      dispatchBackgroundChange(backgroundId || null, previous);
    }
  }
  const themeManager = {
    init: initialize,
    applyTheme,
    setTheme(themeId, options = {}) {
      return applyTheme(themeId, options);
    },
    getTheme(themeId) {
      return themeLookup.get(themeId) || null;
    },
    getThemes() {
      return [...catalog];
    },
    getActiveTheme() {
      return activeTheme;
    },
    setBackground(backgroundId, options = {}) {
      updateBackground(backgroundId, options);
    },
    getBackground() {
      return docEl.dataset.background || null;
    },
    getBackgrounds() {
      return [...backgroundLookup.values()];
    },
    getBackgroundInfo(backgroundId) {
      return lookupBackground(backgroundId);
    },
    refresh() {
      if (activeTheme) {
        applyTheme(activeTheme.id, { force: true, persist: false, silent: true });
      }
    }
  };

  window.emmaThemeManager = themeManager;
  initialize();
})();


























