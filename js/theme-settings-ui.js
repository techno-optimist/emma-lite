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

    container.innerHTML = '';
    const themes = window.emmaThemeManager.getThemes();
    if (!Array.isArray(themes) || themes.length === 0) {
      console.warn('EmmaThemeUI: no themes available to render, retrying shortly...');
      setTimeout(() => renderThemeCards(instance), 200);
      if (!container.dataset.pendingMessage) {
        container.dataset.pendingMessage = 'true';
        container.innerHTML = `
          <div style="padding:16px;border:1px solid rgba(var(--emma-neutral-rgb),0.12);border-radius:12px;background:rgba(var(--emma-neutral-rgb),0.04);color:var(--emma-text-secondary);">
            Loading themes…
          </div>
        `;
      }
      return;
    }
    console.log('[EmmaThemeUI] rendering themes:', themes.length);
    delete container.dataset.pendingMessage;
    const activeThemeId = window.emmaThemeManager.getActiveTheme()?.id || null;

    themes.forEach(theme => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'theme-card';
      card.dataset.themeId = theme.id;
      card.setAttribute('role', 'listitem');
      card.setAttribute('aria-label', `${theme.name} theme`);

      const preview = document.createElement('div');
      preview.className = 'theme-card__preview';
      const gradientPrimary = theme.cssVars?.['--emma-gradient-primary'] || theme.preview?.primary;
      if (gradientPrimary) {
        preview.style.background = gradientPrimary;
      }

      const swatches = document.createElement('div');
      swatches.className = 'theme-card__swatches';
      ['primary', 'secondary', 'surface'].forEach(key => {
        const value = theme.preview?.[key];
        if (!value) return;
        const swatch = document.createElement('div');
        swatch.className = 'theme-card__swatch';
        swatch.style.background = value;
        swatches.appendChild(swatch);
      });
      preview.appendChild(swatches);

      const info = document.createElement('div');
      info.className = 'theme-card__info';

      const nameEl = document.createElement('div');
      nameEl.className = 'theme-card__name';
      nameEl.textContent = theme.name;

      const descEl = document.createElement('div');
      descEl.className = 'theme-card__description';
      descEl.textContent = theme.description || 'Custom Emma theme.';

      info.appendChild(nameEl);
      info.appendChild(descEl);

      const badgeRow = document.createElement('div');
      badgeRow.className = 'theme-card__badges';
      if (theme.flags?.highContrast) {
        const badge = document.createElement('span');
        badge.className = 'theme-card__badge';
        badge.textContent = 'High Contrast';
        badgeRow.appendChild(badge);
      }
      if (theme.flags?.animatedBackground) {
        const badge = document.createElement('span');
        badge.className = 'theme-card__badge';
        badge.textContent = 'Animated';
        badgeRow.appendChild(badge);
      }

      card.append(preview, info);
      if (badgeRow.childElementCount > 0) {
        card.appendChild(badgeRow);
      }

      card.addEventListener('click', () => applyThemeSelection(theme.id));
      card.addEventListener('mouseenter', () => previewTheme(theme.id));
      card.addEventListener('mouseleave', cancelThemePreview);
      card.addEventListener('focus', () => previewTheme(theme.id));
      card.addEventListener('blur', cancelThemePreview);

      if (theme.id === activeThemeId) {
        card.classList.add('theme-card--active');
        card.setAttribute('aria-current', 'true');
      }

      container.appendChild(card);
    });
  }

  function renderBackgroundOptions(instance) {
    const container = instance.backgroundContainer;
    if (!container) return;

    container.innerHTML = '';

  const defaultButton = document.createElement('button');
  defaultButton.type = 'button';
  defaultButton.className = 'background-option';
  defaultButton.dataset.backgroundId = '';
  defaultButton.setAttribute('role', 'listitem');

    const defaultPreview = document.createElement('div');
    defaultPreview.className = 'background-option__preview';
    defaultPreview.style.background = 'var(--emma-gradient-secondary)';

    const defaultInfo = document.createElement('div');
    defaultInfo.className = 'background-option__info';

    const defaultName = document.createElement('div');
    defaultName.className = 'background-option__name';
    defaultName.textContent = 'Follow Theme';

    const defaultDescription = document.createElement('div');
    defaultDescription.className = 'background-option__description';
    defaultDescription.textContent = 'Automatically uses the background recommended by each theme.';

    defaultInfo.append(defaultName, defaultDescription);
    defaultButton.append(defaultPreview, defaultInfo);
  defaultButton.addEventListener('click', () => {
    updateBackground(null, { persist: true });
    try {
      localStorage.removeItem('emma.theme.background');
    } catch (error) {
      console.warn('EmmaThemeUI: could not clear stored background', error);
    }
    updateBackgroundActiveState(null);
  });
    container.appendChild(defaultButton);

    const backgroundsRaw = window.emmaThemeManager.getBackgrounds() || [];
    if (!Array.isArray(backgroundsRaw) || backgroundsRaw.length === 0) {
      console.warn('EmmaThemeUI: no backgrounds available to render, retrying shortly...');
      setTimeout(() => renderBackgroundOptions(instance), 200);
      container.innerHTML = `
        <div style="padding:14px;border:1px solid rgba(var(--emma-neutral-rgb),0.12);border-radius:12px;background:rgba(var(--emma-neutral-rgb),0.04);color:var(--emma-text-secondary);">
          Loading backgrounds…
        </div>
      `;
      return;
    }
    const backgrounds = backgroundsRaw.sort((a, b) => {
      const nameA = (a.name || a.id).toLowerCase();
      const nameB = (b.name || b.id).toLowerCase();
      return nameA.localeCompare(nameB);
    });
    console.log('[EmmaThemeUI] rendering backgrounds:', backgrounds.length);

    backgrounds.forEach(bg => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'background-option';
      option.dataset.backgroundId = bg.id;
      option.setAttribute('role', 'listitem');
      option.setAttribute('aria-label', `${bg.name || bg.id} background`);

      const preview = document.createElement('div');
      preview.className = 'background-option__preview';
      const firstThemeId = Array.isArray(bg.themeIds) ? bg.themeIds[0] : null;
      if (firstThemeId) {
        const theme = window.emmaThemeManager.getTheme(firstThemeId);
        const gradient = theme?.cssVars?.['--emma-gradient-primary'];
        if (gradient) {
          preview.style.background = gradient;
        }
      }

      const info = document.createElement('div');
      info.className = 'background-option__info';

      const nameEl = document.createElement('div');
      nameEl.className = 'background-option__name';
      nameEl.textContent = bg.name || bg.id;

      const descriptionEl = document.createElement('div');
      descriptionEl.className = 'background-option__description';
      descriptionEl.textContent = bg.description || 'Applies a thematic animated background.';

      info.append(nameEl, descriptionEl);
      option.append(preview, info);

      option.addEventListener('click', () => {
        console.log('[EmmaThemeUI] selecting background', bg.id);
        updateBackground(bg.id, { persist: true });
        try {
          localStorage.setItem('emma.theme.background', bg.id);
        } catch (error) {
          console.warn('EmmaThemeUI: could not persist background directly', error);
        }
        updateBackgroundActiveState(bg.id);
      });

      container.appendChild(option);
    });
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
