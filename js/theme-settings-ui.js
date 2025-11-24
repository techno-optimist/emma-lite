(function(window) {
  if (!window) return;

  const instances = new Set();
  let previewOriginal = null;
  let listenersBound = false;

  function init(config = {}) {
    console.log('[EmmaThemeUI] init called with', config);
    if (!window.emmaThemeManager) {
      console.warn('EmmaThemeUI: theme manager not available yet.');
      setTimeout(() => init(config), 200);
      return;
    }

    const themeContainer = config.themeContainerId
      ? document.getElementById(config.themeContainerId)
      : null;
    if (!themeContainer) {
      console.warn('EmmaThemeUI: theme container not found for id', config.themeContainerId);
      return;
    }

    const backgroundContainer = config.backgroundContainerId
      ? document.getElementById(config.backgroundContainerId)
      : null;

    const instance = {
      themeContainer,
      backgroundContainer
    };
    instances.add(instance);

    renderThemeCards(instance);
    if (backgroundContainer) {
      renderBackgroundOptions(instance);
    }

    if (!listenersBound) {
      window.addEventListener('emmaThemeApplied', handleThemeApplied);
      window.addEventListener('emmaBackgroundChanged', handleBackgroundChanged);
      listenersBound = true;
    }

    ensureThemeConsistency();
    const activeTheme = window.emmaThemeManager.getActiveTheme();
    if (activeTheme) {
      updateThemeActiveState(activeTheme.id);
    }
    updateBackgroundActiveState(window.emmaThemeManager.getBackground());
  }

  function renderThemeCards(instance) {
    const container = instance.themeContainer;
    if (!container) return;

    const themes = window.emmaThemeManager.getThemes();
    if (!Array.isArray(themes) || themes.length === 0) {
      console.warn('EmmaThemeUI: no themes available to render, retrying shortly...');
      setTimeout(() => renderThemeCards(instance), 200);
      if (!container.dataset.pendingMessage) {
        container.dataset.pendingMessage = 'true';
        container.innerHTML = `
          <div style="padding:16px;border:1px solid rgba(var(--emma-neutral-rgb),0.12);border-radius:12px;background:rgba(var(--emma-neutral-rgb),0.04);color:var(--emma-text-secondary);">
            Loading themes...
          </div>
        `;
      }
      return;
    }
    console.log('[EmmaThemeUI] rendering themes:', themes.length);
    delete container.dataset.pendingMessage;
    const activeThemeId = window.emmaThemeManager.getActiveTheme()?.id || null;
    const fragment = document.createDocumentFragment();
    themes.forEach(theme => {
      fragment.appendChild(createThemeCard(theme));
    });
    container.innerHTML = '';
    container.appendChild(fragment);
    updateThemeActiveState(activeThemeId);
  }

  function renderBackgroundOptions(instance) {
    const container = instance.backgroundContainer;
    if (!container) return;

    const backgroundsRaw = window.emmaThemeManager.getBackgrounds() || [];
    if (!Array.isArray(backgroundsRaw) || backgroundsRaw.length === 0) {
      console.warn('EmmaThemeUI: no backgrounds available to render, retrying shortly...');
      setTimeout(() => renderBackgroundOptions(instance), 200);
      container.innerHTML = `
        <div style="padding:14px;border:1px solid rgba(var(--emma-neutral-rgb),0.12);border-radius:12px;background:rgba(var(--emma-neutral-rgb),0.04);color:var(--emma-text-secondary);">
          Loading backgrounds...
        </div>
      `;
      return;
    }
    delete container.dataset.pendingMessage;
    const backgrounds = backgroundsRaw
      .slice()
      .sort((a, b) => {
        const nameA = (a.name || a.id).toLowerCase();
        const nameB = (b.name || b.id).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    const backgroundMap = new Map(backgrounds.map(bg => [bg.id, bg]));
    console.log('[EmmaThemeUI] rendering backgrounds:', backgrounds.length);

    const fragment = document.createDocumentFragment();
    fragment.appendChild(createBackgroundOption(null));
    backgrounds.forEach(background => {
      fragment.appendChild(createBackgroundOption(background));
    });
    container.innerHTML = '';
    container.appendChild(fragment);
    updateBackgroundActiveState(window.emmaThemeManager.getBackground());
  }

  function createThemeCard(theme) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'theme-card';
    card.dataset.themeId = theme.id;
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', `${theme.name} theme`);

    const preview = document.createElement('div');
    preview.className = 'theme-card__preview';
    preview.setAttribute('aria-hidden', 'true');
    card.appendChild(preview);
    const gradientPrimary = theme.cssVars?.['--emma-gradient-primary'] || theme.preview?.primary || '';
    preview.style.background = gradientPrimary;

    const swatches = document.createElement('div');
    swatches.className = 'theme-card__swatches';
    preview.appendChild(swatches);
    const swatchEls = [];
    for (let i = 0; i < 3; i += 1) {
      const swatch = document.createElement('span');
      swatch.className = 'theme-card__swatch';
      swatches.appendChild(swatch);
      swatchEls.push(swatch);
    }
    const swatchColors = [
      theme.preview?.primary || theme.cssVars?.['--emma-accent-primary'],
      theme.preview?.secondary || theme.cssVars?.['--emma-accent-secondary'],
      theme.preview?.surface || theme.cssVars?.['--emma-surface-primary']
    ];
    swatchEls.forEach((swatch, index) => {
      const color = swatchColors[index];
      if (color) {
        swatch.style.background = color;
        swatch.style.opacity = '1';
      } else {
        swatch.style.background = 'var(--emma-glass)';
        swatch.style.opacity = '0.25';
      }
    });

    const info = document.createElement('div');
    info.className = 'theme-card__info';
    card.appendChild(info);

    const nameEl = document.createElement('div');
    nameEl.className = 'theme-card__name';
    nameEl.textContent = theme.name;
    info.appendChild(nameEl);

    const descEl = document.createElement('div');
    descEl.className = 'theme-card__description';
    descEl.textContent = theme.description || 'Custom Emma theme.';
    info.appendChild(descEl);

    const badges = [];
    if (theme.flags?.highContrast) {
      badges.push('High Contrast');
    }
    if (theme.flags?.animatedBackground) {
      badges.push('Animated');
    }
    if (badges.length) {
      const badgeRow = document.createElement('div');
      badgeRow.className = 'theme-card__badges';
      badges.forEach(label => {
        const badge = document.createElement('span');
        badge.className = 'theme-card__badge';
        badge.textContent = label;
        badgeRow.appendChild(badge);
      });
      card.appendChild(badgeRow);
    }

    attachThemeCardEvents(card);
    return card;
  }

  function attachThemeCardEvents(card) {
    if (card.dataset.themeEventsBound === 'true') {
      return;
    }
    card.addEventListener('click', handleThemeCardClick);
    card.addEventListener('mouseenter', handleThemeCardEnter);
    card.addEventListener('mouseleave', cancelThemePreview);
    card.addEventListener('focus', handleThemeCardEnter);
    card.addEventListener('blur', cancelThemePreview);
    card.dataset.themeEventsBound = 'true';
  }

  function handleThemeCardClick(event) {
    const themeId = event?.currentTarget?.dataset?.themeId;
    if (themeId) {
      applyThemeSelection(themeId);
    }
  }

  function handleThemeCardEnter(event) {
    const themeId = event?.currentTarget?.dataset?.themeId;
    if (themeId) {
      previewTheme(themeId);
    }
  }

  function createBackgroundOption(background) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'background-option';
    option.setAttribute('role', 'listitem');
    hydrateBackgroundOption(option, background);
    return option;
  }

  function hydrateBackgroundOption(option, background) {
    const id = background?.id || '';
    option.dataset.backgroundId = id;
    option.type = 'button';
    option.classList.add('background-option');
    option.setAttribute('role', 'listitem');
    const name = background?.name || 'Emma Adaptive';
    const description = background?.description || 'Automatically uses the background recommended by each theme.';
    option.setAttribute('aria-label', `${name} background`);

    let preview = option.querySelector('.background-option__preview');
    if (!preview) {
      preview = document.createElement('div');
      preview.className = 'background-option__preview';
      preview.setAttribute('aria-hidden', 'true');
      option.insertBefore(preview, option.firstChild);
    }
    preview.style.background = getBackgroundPreviewFill(background);

    let info = option.querySelector('.background-option__info');
    if (!info) {
      info = document.createElement('div');
      info.className = 'background-option__info';
      option.appendChild(info);
    }
    let nameEl = info.querySelector('.background-option__name');
    if (!nameEl) {
      nameEl = document.createElement('div');
      nameEl.className = 'background-option__name';
      info.appendChild(nameEl);
    }
    nameEl.textContent = name;

    let descEl = info.querySelector('.background-option__description');
    if (!descEl) {
      descEl = document.createElement('div');
      descEl.className = 'background-option__description';
      info.appendChild(descEl);
    }
    descEl.textContent = description;

    attachBackgroundOptionEvents(option);
  }

  function getBackgroundPreviewFill(background) {
    if (!background || !background.id) {
      return 'var(--emma-gradient-secondary)';
    }
    const firstThemeId = Array.isArray(background.themeIds) ? background.themeIds[0] : null;
    if (firstThemeId) {
      const theme = window.emmaThemeManager.getTheme(firstThemeId);
      const gradient = theme?.cssVars?.['--emma-gradient-primary'];
      if (gradient) {
        return gradient;
      }
    }
    const fallbackTheme = window.emmaThemeManager
      .getThemes()
      .find(theme => theme.background?.id === background.id);
    if (fallbackTheme?.cssVars?.['--emma-gradient-primary']) {
      return fallbackTheme.cssVars['--emma-gradient-primary'];
    }
    return `var(--emma-background-${background.id})`;
  }

  function attachBackgroundOptionEvents(option) {
    if (option.dataset.backgroundEventsBound === 'true') {
      return;
    }
    option.addEventListener('click', handleBackgroundClick);
    option.dataset.backgroundEventsBound = 'true';
  }

  function handleBackgroundClick(event) {
    const target = event?.currentTarget;
    if (!target) {
      return;
    }
    const backgroundId = target.dataset.backgroundId || '';
    console.log('[EmmaThemeUI] selecting background', backgroundId || 'follow-theme');
    updateBackground(backgroundId || null, { persist: true });
    try {
      if (backgroundId) {
        localStorage.setItem('emma.theme.background', backgroundId);
      } else {
        localStorage.removeItem('emma.theme.background');
      }
    } catch (error) {
      console.warn('EmmaThemeUI: could not persist background directly', error);
    }
    updateBackgroundActiveState(backgroundId || null);
  }

  function applyThemeSelection(themeId) {
    if (!window.emmaThemeManager) return;
    console.log('[EmmaThemeUI] applying theme via selection', themeId);
    previewOriginal = null;
    const currentBackground = window.emmaThemeManager.getBackground();
    const keepBackground = !!currentBackground;
    window.emmaThemeManager.setTheme(themeId, { keepBackground });
    try {
      localStorage.setItem('emma.theme.selection', themeId);
    } catch (error) {
      console.warn('EmmaThemeUI: could not persist theme selection directly', error);
    }
    updateThemeActiveState(themeId);
  }

  function previewTheme(themeId) {
    if (!window.emmaThemeManager) return;
    const activeTheme = window.emmaThemeManager.getActiveTheme();
    if (activeTheme && activeTheme.id === themeId) {
      return;
    }
    if (!previewOriginal) {
      previewOriginal = activeTheme ? activeTheme.id : null;
    }
    window.emmaThemeManager.setTheme(themeId, { persist: false, silent: true, keepBackground: true });
    updateThemeActiveState(themeId);
  }

  function cancelThemePreview() {
    if (!window.emmaThemeManager) return;
    if (!previewOriginal) return;
    const current = window.emmaThemeManager.getActiveTheme();
    if (current && current.id !== previewOriginal) {
      window.emmaThemeManager.setTheme(previewOriginal, { persist: false, silent: true, keepBackground: true });
      updateThemeActiveState(previewOriginal);
    }
    previewOriginal = null;
  }

  function updateThemeActiveState(activeThemeId) {
    document.querySelectorAll('.theme-card').forEach(card => {
      const isActive = card.dataset.themeId === activeThemeId;
      card.classList.toggle('theme-card--active', isActive);
      if (isActive) {
        card.setAttribute('aria-current', 'true');
      } else {
        card.removeAttribute('aria-current');
      }
    });
  }

  function updateBackgroundActiveState(backgroundId) {
    document.querySelectorAll('.background-option').forEach(option => {
      const optionId = option.dataset.backgroundId || '';
      const isActive = (!backgroundId && !optionId) || optionId === backgroundId;
      option.classList.toggle('background-option--active', isActive);
      if (isActive) {
        option.setAttribute('aria-current', 'true');
      } else {
        option.removeAttribute('aria-current');
      }
    });
  }

  function updateBackground(backgroundId, options = {}) {
    if (!window.emmaThemeManager) return;
    window.emmaThemeManager.setBackground(backgroundId, options);
  }

  function handleThemeApplied(event) {
    const themeId = event?.detail?.theme?.id;
    if (themeId) {
      updateThemeActiveState(themeId);
      updateBackgroundActiveState(window.emmaThemeManager.getBackground());
    }
  }

  function handleBackgroundChanged(event) {
    updateBackgroundActiveState(event?.detail?.backgroundId || null);
  }

  window.EmmaThemeUI = {
    init,
    refresh() {
      ensureThemeConsistency();
      const activeTheme = window.emmaThemeManager?.getActiveTheme()?.id;
      if (activeTheme) {
        updateThemeActiveState(activeTheme);
      }
      updateBackgroundActiveState(window.emmaThemeManager?.getBackground() || null);
      instances.forEach(instance => {
        renderThemeCards(instance);
        if (instance.backgroundContainer) {
          renderBackgroundOptions(instance);
        }
      });
    }
  };

  function ensureThemeConsistency() {
    if (!window.emmaThemeManager) return;
    try {
      const storedThemeId = localStorage.getItem('emma.theme.selection');
      const activeTheme = window.emmaThemeManager.getActiveTheme();
      if (storedThemeId && (!activeTheme || activeTheme.id !== storedThemeId)) {
        const themeExists = window.emmaThemeManager.getTheme(storedThemeId);
        if (themeExists) {
          const currentBg = window.emmaThemeManager.getBackground();
          const keepBackground = !!currentBg;
          window.emmaThemeManager.setTheme(storedThemeId, {
            persist: false,
            silent: true,
            keepBackground
          });
        }
      }

      const storedBackground = localStorage.getItem('emma.theme.background');
      const activeBackground = window.emmaThemeManager.getBackground();
      if (storedBackground && activeBackground !== storedBackground) {
        window.emmaThemeManager.setBackground(storedBackground, { persist: false });
      } else if (!storedBackground && activeBackground) {
        window.emmaThemeManager.setBackground(null, { persist: false });
      }
    } catch (error) {
      console.warn('EmmaThemeUI: unable to sync theme from storage', error);
    }
  }
})(window);
