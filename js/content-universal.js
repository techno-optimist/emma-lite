/**
 * Emma Universal Content Script
 * Single entry point for all websites using the Hybrid Engine
 */

// Global minimal logger (available before any other code uses it)
(() => {
  if (typeof window === 'undefined') return;
  if (window.EmmaLog) return; // already defined
  const order = { none: 0, error: 1, warn: 2, info: 3, debug: 4 };
  let levelName = 'warn';
  try {
    const stored = (localStorage.getItem('emma_log') || '').toLowerCase();
    if (stored && order[stored] != null) levelName = stored;
  } catch {}
  const lvl = order[levelName];
  const enabled = (n) => lvl >= order[n];
  window.EmmaLog = {
    debug: (...a) => { if (enabled('debug')) console.log(...a); },
    info:  (...a) => { if (enabled('info'))  console.log(...a); },
    warn:  (...a) => { if (enabled('warn'))  console.warn(...a); },
    error: (...a) => { console.error(...a); }
  };
})();

// Global status update function
function updateStatus(message, isVisible = true) {
  const statusDiv = document.querySelector('.emma-status');
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.style.display = isVisible ? 'block' : 'none';
    if (isVisible) {
      statusDiv.classList.add('show');
    }
  }
}

// Helper functions for conversation detection
function generateConversationId() {
  // Try to detect conversation ID from URL or page
  const url = window.location.href;

  // ChatGPT conversation ID
  if (url.includes('chatgpt.com') && url.includes('/c/')) {
    const match = url.match(/\/c\/([a-f0-9-]+)/);
    if (match) return `chatgpt_${match[1]}`;
  }

  // Claude conversation ID
  if (url.includes('claude.ai') && url.includes('/chat/')) {
    const match = url.match(/\/chat\/([a-f0-9-]+)/);
    if (match) return `claude_${match[1]}`;
  }

  // Fallback: use domain + timestamp (for sessions without clear IDs)
  const domain = window.location.hostname.replace('www.', '');
  const sessionStart = Math.floor(Date.now() / (30 * 60 * 1000)) * (30 * 60 * 1000); // 30-minute windows
  return `${domain}_${sessionStart}`;
}

function detectPlatform() {
  const hostname = window.location.hostname;
  if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) return 'ChatGPT';
  if (hostname.includes('claude.ai') || hostname.includes('anthropic.com')) return 'Claude';
  if (hostname.includes('gemini.google.com')) return 'Gemini';
  if (hostname.includes('character.ai')) return 'Character.AI';
  if (hostname.includes('poe.com')) return 'Poe';
  if (hostname.includes('x.com') || hostname.includes('twitter.com')) return 'twitter';
  if (hostname.includes('linkedin.com')) return 'LinkedIn';
  if (hostname.includes('instagram.com')) return 'Instagram';
  if (hostname.includes('facebook.com')) return 'Facebook';
  if (hostname.includes('reddit.com')) return 'Reddit';
  if (hostname.includes('youtube.com')) return 'YouTube';
  return hostname;
}

// Prevent multiple injections
if (window.emmaUniversalInjected) {

} else {
  window.emmaUniversalInjected = true;

  // Minimal logger with quiet default; set localStorage.emma_log = 'debug'|'info'|'warn'|'error'|'none'
  const EmmaLog = (() => {
    const order = { none: 0, error: 1, warn: 2, info: 3, debug: 4 };
    let levelName = 'warn';
    try {
      const stored = (localStorage.getItem('emma_log') || '').toLowerCase();
      if (stored && order[stored] != null) levelName = stored;
    } catch {}
    const lvl = order[levelName];
    const enabled = (n) => lvl >= order[n];
    return {
      debug: (...a) => { if (enabled('debug')) console.log(...a); },
      info:  (...a) => { if (enabled('info'))  console.log(...a); },
      warn:  (...a) => { if (enabled('warn'))  console.warn(...a); },
      error: (...a) => { console.error(...a); }
    };
  })();

  // Debounce helper to batch rapid DOM mutation callbacks and UI updates
  function debounce(fn, waitMs = 200) {
    let timeoutId = null;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(null, args), waitMs);
    };
  }

  // Robust text hash for deduplication
  function generateContentHash(text) {
    const normalized = (text || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
      hash |= 0; // 32-bit
    }
    return hash.toString(36);
  }

  // Optional telemetry (must be consent-gated by caller)
  const analytics = {
    captureEvent(action, metadata = {}) {
      try {
        chrome.runtime.sendMessage({
          action: 'analytics.track',
          event: action,
          metadata: { ...metadata, platform: detectPlatform(), timestamp: Date.now(), pageUrl: location.href }
        });
      } catch {}
    }
  };

  // Simple rate limiter factory
  function createRateLimiter(minIntervalMs = 1000) {
    let lastCallTs = 0;
    return {
      canCall() {
        const now = Date.now();
        if (now - lastCallTs >= minIntervalMs) {
          lastCallTs = now;
          return true;
        }
        return false;
      }
    };
  }

  // Load the hybrid engine
  let emmaEngine = null;
  let isInitialized = false;

  /**
   * Initialize Emma on the page
   */
  async function initializeEmma() {
    if (isInitialized) return;

    try {
      // Initialization
      emmaEngine = createMinimalEngine();

      // Get user settings with timeout fallback
      let settings = null;

      try {
        settings = await Promise.race([
          chrome.runtime.sendMessage({ action: 'getSettings' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Settings timeout')), 3000))
        ]);
        // Settings received
      } catch (error) {
        // Use defaults silently on timeout
        settings = { success: false };
      }

      // Set up based on settings with timeout
      try {
        if (settings && settings.success) {
          EmmaLog.info('Emma: applying user settings');
          await Promise.race([
            setupEmma(settings.settings),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Setup timeout')), 5000))
          ]);
        } else {
          EmmaLog.info('Emma: using default settings');
          await Promise.race([
            setupEmma({
              showFloatingButton: true,
              autoCapture: false,
              enableShortcuts: true
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Setup timeout')), 5000))
          ]);
        }
      } catch (setupError) {
        EmmaLog.warn('Emma: setup timed out; continuing minimal');
      }

      isInitialized = true;
      EmmaLog.info('Emma: ready');

      // Notify that we're ready
      try {
        chrome.runtime.sendMessage({
          action: 'contentScriptReady',
          url: window.location.href
        });
      } catch (msgError) {
        EmmaLog.debug('Emma: notify background failed');
      }

    } catch (error) {
      EmmaLog.error('Emma: init failed', error);
      EmmaLog.debug('Emma: init details', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      // Try to initialize in minimal mode
      try {

        isInitialized = true; // Mark as initialized so we can at least respond to ping

      } catch (minimalError) {
        console.error('Emma Universal: Even minimal initialization failed:', minimalError);
      }
    }
  }

  // Single media collection system with staging capsule
  let currentCollection = null; // Will hold staging capsule ID
  let existingCapsule = null; // Track any existing conversation capsules
  let manualModeActive = false; // Track if user is manually collecting media

  try {
    const collectionCss = `
      .emma-media-btn{position:absolute;top:8px;right:8px;z-index:999999;border-radius:20px;padding:6px 12px;font-size:11px;font-weight:600;color:#fff;background:linear-gradient(135deg,#667eea,#764ba2);box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer;display:none;transition:all 0.2s ease;}
      .emma-media-btn:hover{transform:scale(1.05);box-shadow:0 4px 12px rgba(0,0,0,.35);}
      .emma-media-btn.added{background:linear-gradient(135deg,#48bb78,#38a169);transform:scale(0.95);}
      .emma-collection-toast{position:fixed;top:20px;right:20px;z-index:1000000;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:12px 16px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.3);font-size:13px;font-weight:500;opacity:0;transition:all 0.3s ease;pointer-events:none;}
      .emma-collection-toast.show{opacity:1;pointer-events:auto;}
      .emma-collection-toast .count{font-weight:700;font-size:16px;}
    `;
    const style = document.createElement('style');
    style.textContent = collectionCss;
    document.documentElement.appendChild(style);

    const observer = new MutationObserver(debounce(() => bindMediaButtons(), 200));
    bindMediaButtons();
    observer.observe(document.documentElement, { childList: true, subtree: true });

    function bindMediaButtons(){
      const elements = Array.from(document.querySelectorAll('img, video'));
      elements.forEach(el => {
        if (el._emmaBound) return; el._emmaBound = true;

        try {
          const r = el.getBoundingClientRect();
          if (r.width < 60 || r.height < 60) return; // skip small elements
        } catch {}

        const parent = el.parentElement || el;
        if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';

        const btn = document.createElement('div');
        btn.className = 'emma-media-btn';
        btn.textContent = '+ Emma';
        parent.appendChild(btn);

        el.addEventListener('mouseenter', () => btn.style.display = 'block');
        el.addEventListener('mouseleave', () => btn.style.display = 'none');

        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          e.preventDefault();
          await addToCollection(el, btn);
        });
      });
    }

    async function addToCollection(element, button) {
      const srcUrl = element.currentSrc || element.src;

      if (!srcUrl) {
        console.warn('📎 Content: No URL found for element');
        return;
      }

      try {
        // Activate manual mode to prevent autonomous capture conflicts
        manualModeActive = true;

        // Check for existing conversation capsule first
        if (!currentCollection && !existingCapsule) {

          const stagingResponse = await chrome.runtime.sendMessage({ action: 'ephemeral.list' });
          if (stagingResponse?.success && Array.isArray(stagingResponse.items)) {
            // Look for recent conversation capsules from this page
            const pageUrl = location.href;
            const recentCapsule = stagingResponse.items.find(item =>
              item.data?.source === 'conversation' &&
              item.data?.metadata?.url === pageUrl &&
              Date.now() - (item.createdAt || 0) < 300000 // Within 5 minutes
            );

            if (recentCapsule) {

              existingCapsule = recentCapsule.id;
              currentCollection = recentCapsule.id;
            }
          }
        }

        // Create or get current collection
        if (!currentCollection) {

          const response = await chrome.runtime.sendMessage({
            action: 'collection.create',
            pageUrl: location.href,
            pageTitle: document.title
          });

          if (response?.success) {
            currentCollection = response.collectionId;

          } else {
            throw new Error('Failed to create collection: ' + (response?.error || 'Unknown error'));
          }
        }

        if (!currentCollection) {
          throw new Error('No collection ID available');
        }

        // Add media to collection
        const result = await chrome.runtime.sendMessage({
          action: 'collection.addMedia',
          collectionId: currentCollection,
          url: srcUrl,
          pageUrl: location.href,
          mediaType: element.tagName.toLowerCase(),
          alt: element.alt || '',
          width: element.naturalWidth || element.videoWidth || 0,
          height: element.naturalHeight || element.videoHeight || 0
        });

        if (result?.success) {
          // Visual feedback
          button.textContent = '✓ Added';
          button.classList.add('added');

          // Show collection toast
          showCollectionToast(result.totalItems);

          setTimeout(() => {
            button.textContent = '+ Emma';
            button.classList.remove('added');
          }, 2000);
        } else {
          throw new Error('Failed to add media: ' + (result?.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('📎 Content: Failed to add to collection:', err);
        button.textContent = '✗ Error';
        button.style.background = 'linear-gradient(135deg, #EF4444, #DC2626)';
        setTimeout(() => {
          button.textContent = '+ Emma';
          button.style.background = 'linear-gradient(135deg,#667eea,#764ba2)';
        }, 2000);
      }
    }

    function showCollectionToast(count) {
      let toast = document.querySelector('.emma-collection-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.className = 'emma-collection-toast';
        document.body.appendChild(toast);
      }

      toast.innerHTML = `<span class="count">${count}</span> item${count !== 1 ? 's' : ''} in collection`;
      toast.classList.add('show');

      clearTimeout(toast.hideTimer);
      toast.hideTimer = setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }

  } catch (error) {
    console.warn('Emma Universal: Media collection setup failed:', error);
  }

  // Add global error handler to prevent third-party errors from interfering
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    // Filter out AdEmbed and other third-party errors that don't affect Emma
    if (message && typeof message === 'string' &&
        (message.includes('AdEmbed') || message.includes('addEmbed'))) {
      console.warn('Emma: Filtered third-party AdEmbed error:', message);
      return true; // Prevent the error from propagating
    }

    // Call original error handler if it exists
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }

    return false; // Let other errors propagate normally
  };

  // Add unhandled promise rejection handler
  const originalOnUnhandledRejection = window.onunhandledpromiserejection;
  window.onunhandledpromiserejection = function(event) {
    // Filter out AdEmbed and other third-party promise rejections
    if (event.reason && typeof event.reason === 'object' &&
        (event.reason.message?.includes('AdEmbed') || event.reason.message?.includes('addEmbed'))) {
      console.warn('Emma: Filtered third-party AdEmbed promise rejection:', event.reason);
      event.preventDefault(); // Prevent the unhandled rejection
      return;
    }

    // Call original handler if it exists
    if (originalOnUnhandledRejection) {
      return originalOnUnhandledRejection.call(this, event);
    }
  };

/**
 * Create minimal hybrid engine (embedded to avoid CSP issues)
 */
  // Add context invalidation detection and recovery
  function detectContextInvalidation() {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
      console.warn('🔄 Emma: Extension context lost, attempting recovery...');
      // Show user notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 999999;
        background: linear-gradient(135deg, #667eea, #764ba2); color: white;
        padding: 12px 16px; border-radius: 12px; font-size: 13px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      `;
      notification.innerHTML = '🔄 Emma: Extension updated - refresh page to restore functionality';
      document.body.appendChild(notification);

      setTimeout(() => notification.remove(), 5000);
      return true;
    }
    return false;
  }

  function createMinimalEngine() {
    return {
      async analyze() {
        const url = window.location.href;
        const domain = new URL(url).hostname;
        const meta = extractPageMetadata();

        // Detect content type based on URL and DOM
        let type = 'universal';
        let confidence = 0.5;

        if (domain.includes('chatgpt.com') || domain.includes('chat.openai.com')) {
          type = 'conversation';
          confidence = 0.9;
        } else if (domain.includes('claude.ai')) {
          type = 'conversation';
          confidence = 0.9;
        } else if (domain.includes('mail.google.com')) {
          type = 'email';
          confidence = 0.85;
        } else if (domain.includes('photos.google.com')) {
          type = 'media_gallery';
          confidence = 0.85;
        } else if (/(^|\.)x\.com$|twitter\.com$/.test(domain)) {
          type = 'social';
          confidence = 0.85;
        } else if ((meta.ogType || '').includes('article') || meta.articlePublishedTime || document.querySelector('article')) {
          type = 'article';
          confidence = 0.8;
        } else if (meta.ogVideo || document.querySelector('video')) {
          type = 'video';
          confidence = 0.7;
        } else if (domain.includes('github.com')) {
          type = 'code';
          confidence = 0.8;
        } else if (domain.includes('stackoverflow.com')) {
          type = 'documentation';
          confidence = 0.8;
        } else if (document.querySelector('article, .post, .blog-post')) {
          type = 'article';
          confidence = 0.7;
        }

        return { type, confidence };
      },

      async capture(options = {}) {
        const analysis = await this.analyze();
        const meta = extractPageMetadata();
        const memories = [];
        let attachmentsAdded = 0;
        let capsuleIdOut = '';

        try {
          if (analysis.type === 'conversation') {
            // Extract conversation messages
            const messages = this.extractConversationMessages();
            for (const message of messages) {
              memories.push({
                content: message.content,
                role: message.role,
                source: analysis.type,
                type: 'conversation',
                metadata: {
                  platform: new URL(window.location.href).hostname,
                  timestamp: Date.now()
                }
              });
            }
          } else if (analysis.type === 'social') {
            // Social: extract primary post contextually
            const post = await extractPrimarySocialPost();
            const title = composeSocialTitle(post.author, post.text) || composeTitle(meta, post.text);
            if (post.text && post.text.length > 20) {
              memories.push({
                content: post.text,
                role: 'user',
                source: 'social',
                type: 'social',
                metadata: {
                  title,
                  author: post.author || undefined,
                  url: post.permalink || meta.canonicalUrl || location.href,
                  timestamp: Date.now()
                }
              });
            }
          } else if (analysis.type === 'email') {
            const email = extractPrimaryEmailThread();
            const title = composeEmailTitle(email.subject, email.participants) || composeTitle(meta, email.text);
            if (email.text && email.text.length > 20) {
              memories.push({
                content: email.text,
                role: 'user',
                source: 'email',
                type: 'email',
                metadata: {
                  title,
                  subject: email.subject || undefined,
                  participants: email.participants || [],
                  url: meta.canonicalUrl || location.href,
                  timestamp: Date.now()
                }
              });
            }
          } else if (analysis.type === 'media_gallery') {
            const gallery = extractMediaGallerySummary();
            const title = gallery.title || composeTitle(meta, '');
            memories.push({
              content: gallery.summary || title,
              role: 'user',
              source: 'media',
              type: 'media',
              metadata: {
                title,
                itemCount: gallery.count || undefined,
                url: meta.canonicalUrl || location.href,
                timestamp: Date.now()
              }
            });
          } else if (options.userTriggered || options.force) {
            // Manual capture for any content
            const selection = window.getSelection().toString();
            if (selection && selection.length > 10) {
              memories.push({
                content: selection,
                type: 'selection',
                source: 'manual',
                metadata: {
                  title: document.title,
                  url: window.location.href,
                  timestamp: Date.now()
                }
              });
            } else {
              // Universal page capture (title + primary text + canonical + entities)
              const mainContent = this.extractMainContent();
              const title = composeTitle(meta, mainContent);
              const snippet = (mainContent || '').trim().substring(0, 2000);
              if (snippet && snippet.length > 50) {
                memories.push({
                  content: `${title}\n\n${snippet}`,
                  type: (analysis.type === 'universal' ? 'page' : analysis.type),
                  source: 'manual',
                  metadata: {
                    title,
                    url: meta.canonicalUrl || window.location.href,
                    author: meta.author || undefined,
                    siteName: meta.siteName || undefined,
                    description: meta.description || undefined,
                    publishedAt: meta.articlePublishedTime || undefined,
                    ogType: meta.ogType || undefined,
                    timestamp: Date.now()
                  }
                });
              }
            }
          }

          // Also collect representative media to attach alongside text
          let topMedia = [];
          try {
            topMedia = await collectTopMedia(5);
          } catch (e) {
            console.warn('Emma Universal: Unable to collect top media:', e);
          }

          // Save memories (storage-first, with background attachment import)

          // Dedupe near-duplicate messages by normalized text (hashed)
          const seen = new Set();
          const uniqueMemories = [];
          for (const m of memories) {
            const norm = normalizeText(m.content || '');
            if (!norm || norm.length < 10) continue;
            if (isLikelyGarbage(norm)) continue;
            const key = generateContentHash(norm);
            if (seen.has(key)) continue;
            seen.add(key);
            uniqueMemories.push(m);
          }

          // Check if vault is set up
          const storage = await chrome.storage.local.get(['emma_vault_initialized', 'emma_memories']);
          if (!storage.emma_vault_initialized) {
            throw new Error('Vault not set up. Please create your vault in the dashboard first.');
          }

          // Create or update conversation capsule
          const conversationId = generateConversationId();
          const existingMemories = storage.emma_memories || [];

          // Find existing capsule for this conversation/session
          const existingCapsuleIndex = existingMemories.findIndex(cap =>
            cap.conversationId === conversationId ||
            (cap.url === window.location.href && cap.type === 'conversation' &&
             Date.now() - cap.lastUpdated < 30 * 60 * 1000) // Same page within 30 minutes
          );

          if (existingCapsuleIndex >= 0) {
            // Update existing capsule
            const existingCapsule = existingMemories[existingCapsuleIndex];
            existingCapsule.messages.push(...uniqueMemories);
            existingCapsule.messageCount = existingCapsule.messages.length;
            existingCapsule.lastUpdated = Date.now();
            // Title: conversation vs non-conversation
            if (existingCapsule.type === 'conversation') {
              existingCapsule.title = `${detectPlatform()} conversation (${existingCapsule.messageCount} messages)`;
            } else {
              const incomingTitle = (uniqueMemories.find(m => m?.metadata?.title)?.metadata?.title) || '';
              if (incomingTitle) {
                existingCapsule.title = incomingTitle;
              }
            }
            // Merge media attachments (dedupe by src)
            try {
              const existingSources = new Set((existingCapsule.attachments || []).map(a => a.src));
              const newAttachments = (topMedia || []).filter(a => a && a.src && !existingSources.has(a.src));
              attachmentsAdded = newAttachments.length;
              existingCapsule.attachments = [...(existingCapsule.attachments || []), ...newAttachments];
              existingCapsule.attachmentCount = existingCapsule.attachments.length;
            } catch {}

            // Move to top of list
            existingMemories.splice(existingCapsuleIndex, 1);
            existingMemories.unshift(existingCapsule);
            capsuleIdOut = existingCapsule.id || conversationId;

            // Import media into background attachments store for persistence
            try {
              await Promise.all((topMedia || []).map(async (m) => {
                if (!m || !m.src) return;
                try {
                  await chrome.runtime.sendMessage({
                    action: 'media.importFromUrl',
                    url: m.src,
                    pageUrl: location.href,
                    mediaType: (m.tagName || '').toLowerCase() === 'video' ? 'video' : 'image',
                    capsuleId: existingCapsule.id || conversationId
                  });
                } catch (e) { /* ignore per-item errors */ }
              }));
            } catch {}
          } else {
            // Create new conversation capsule
            const newCapsule = {
              id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              conversationId,
              type: analysis.type === 'conversation' ? 'conversation' : (analysis.type === 'article' || analysis.type === 'social' || analysis.type === 'video' ? analysis.type : 'page'),
              title: (() => {
                if (analysis.type !== 'conversation' && uniqueMemories.length && uniqueMemories[0].metadata && uniqueMemories[0].metadata.title) {
                  return uniqueMemories[0].metadata.title;
                }
                return analysis.type === 'conversation' ? `${detectPlatform()} conversation (${uniqueMemories.length} messages)` : (composeTitle(meta, uniqueMemories[0]?.content || ''));
              })(),
              url: window.location.href,
              domain: window.location.hostname,
              messages: uniqueMemories,
              messageCount: uniqueMemories.length,
              timestamp: Date.now(),
              created: new Date().toISOString(),
              lastUpdated: Date.now(),
              captured: true,
              metadata: {
                pageTitle: document.title,
                userAgent: navigator.userAgent,
                platform: detectPlatform(),
                canonicalUrl: meta.canonicalUrl || undefined,
                author: meta.author || undefined,
                siteName: meta.siteName || undefined,
                description: meta.description || undefined,
                ogType: meta.ogType || undefined
              },
              attachments: topMedia || [],
              attachmentCount: (topMedia || []).length
            };

            existingMemories.unshift(newCapsule);
            capsuleIdOut = newCapsule.id;
            attachmentsAdded = (topMedia || []).length;

            // Import media into background attachments store for persistence
            try {
              await Promise.all((topMedia || []).map(async (m) => {
                if (!m || !m.src) return;
                try {
                  await chrome.runtime.sendMessage({
                    action: 'media.importFromUrl',
                    url: m.src,
                    pageUrl: location.href,
                    mediaType: (m.tagName || '').toLowerCase() === 'video' ? 'video' : 'image',
                    capsuleId: newCapsule.id
                  });
                } catch (e) { /* ignore per-item errors */ }
              }));
            } catch {}
          }

          // Keep only last 50 capsules to avoid storage limits
          if (existingMemories.length > 50) {
            existingMemories.splice(50);
          }

          // Save via background service to ensure proper MTAP storage
          try {
            // Clean up the capsule before saving - remove attachments that don't have data
            const capsuleToSave = {...existingMemories[0]};
            if (capsuleToSave.attachments && Array.isArray(capsuleToSave.attachments)) {
              // Filter out attachments without actual data
              capsuleToSave.attachments = capsuleToSave.attachments.filter(att =>
                att && att.data && typeof att.data === 'string'
              );
              capsuleToSave.attachmentCount = capsuleToSave.attachments.length;
            }

            const saveResult = await chrome.runtime.sendMessage({
              action: 'ephemeral.add',
              data: capsuleToSave
            });

            if (saveResult && saveResult.success) {

              // Trigger refresh of memories.html if it's open
              try {
                chrome.runtime.sendMessage({ action: 'memories.refresh' });
              } catch {}

          let countOut = uniqueMemories.length;
          if (countOut === 0 && attachmentsAdded > 0) countOut = 1;
          const success = countOut > 0 || attachmentsAdded > 0;
          return { success, count: countOut, attachmentsAdded, capsuleId: capsuleIdOut };
            } else {
              console.error('Emma Universal: Background save failed:', saveResult);
              console.error('Emma Universal: Error details:', {
                hasError: !!saveResult?.error,
                errorType: typeof saveResult?.error,
                errorValue: saveResult?.error,
                fullResponse: saveResult
              });

              // Vault-first UX: guide unlock instead of local fallback
              const err = (saveResult && saveResult.error) ? saveResult.error : '';
              if (/vault is locked/i.test(err) || /unlock/i.test(err)) {
                updateStatus('🔒 Vault is locked — please unlock to save');
                try { await chrome.runtime.sendMessage({ action: 'open.popup' }); } catch {}
                return { success: false, error: 'vault_locked' };
              }
              const errorMsg = typeof err === 'string' ? err : JSON.stringify(err) || 'save_failed';
              return { success: false, error: errorMsg };
            }
          } catch (saveError) {
            console.error('Emma Universal: Failed to save via background:', saveError);
            updateStatus('❌ Save failed');
            return { success: false, error: saveError?.message || 'save_failed' };
          }

        } catch (error) {
          console.error('Emma Universal: Capture error:', error);
          return [];
        }
      },

      extractConversationMessages() {
        const messages = [];

        // ChatGPT selectors
        if (window.location.hostname.includes('chatgpt.com') || window.location.hostname.includes('chat.openai.com')) {
          const messageElements = document.querySelectorAll('[data-testid^="conversation-turn-"]');
          messageElements.forEach((element, index) => {
            const isUser = element.querySelector('[data-message-author-role="user"]');
            const isAssistant = element.querySelector('[data-message-author-role="assistant"]');

            if (isUser || isAssistant) {
              const content = element.textContent.trim();
              if (content.length > 10) {
                messages.push({
                  content,
                  role: isUser ? 'user' : 'assistant',
                  id: `chatgpt-${Date.now()}-${index}`
                });
              }
            }
          });
        }

        // Claude selectors
        else if (window.location.hostname.includes('claude.ai')) {
          const possibleMessages = document.querySelectorAll('div[class*="message"], article, section');
          let lastRole = null;

          possibleMessages.forEach((element, index) => {
            const text = element.textContent.trim();
            if (text.length > 20) {
              // Alternate between user and assistant for Claude
              const role = lastRole === 'user' ? 'assistant' : 'user';
              lastRole = role;

              messages.push({
                content: text,
                role,
                id: `claude-${Date.now()}-${index}`
              });
            }
          });
        }

        return messages;
      },

      extractMainContent() {
        // Multi-strategy: 1) semantic containers 2) largest block 3) visible selection fallback
        const candidates = [];
        const push = (el, score) => { if (el && el.textContent && el.textContent.trim().length > 50) candidates.push({ el, score }); };
        const bySel = (sel, baseScore) => Array.from(document.querySelectorAll(sel)).forEach((el) => {
          const rect = el.getBoundingClientRect();
          const area = Math.max(1, rect.width * rect.height);
          push(el, baseScore + Math.log10(area));
        });

        // 1) Strong semantic containers
        bySel('article', 10);
        bySel('main', 8);
        bySel('[role="main"]', 8);
        bySel('.post,.post-content,.entry-content,.blog-post,.StoryBodyCompanionColumn', 7);

        // 2) Social primary content (generic)
        bySel('article[role="article"]', 6); // covers X
        bySel('[data-testid="tweetText"],[data-testid="post-container"]', 6);

        // 3) Largest text block
        const blocks = Array.from(document.querySelectorAll('p,div,section'))
          .filter(el => (el.textContent || '').trim().length > 100)
          .slice(0, 1000);
        blocks.forEach(el => {
          const rect = el.getBoundingClientRect();
          const area = Math.max(1, rect.width * rect.height);
          push(el, 2 + Math.log10(area));
        });

        // Rank by score, favor visible elements
        candidates.forEach(c => { const r = c.el.getBoundingClientRect(); if (r.top >= 0 && r.bottom <= (window.innerHeight*2)) c.score += 1.5; });
        candidates.sort((a,b) => b.score - a.score);
        const best = candidates.length ? candidates[0].el : document.body;

        // Clone and strip noise
        const clone = best.cloneNode(true);
        clone.querySelectorAll('script, style, nav, header, footer, aside, form, button, svg, noscript, menu').forEach(el => el.remove());
        // Remove obvious UI labels
        Array.from(clone.querySelectorAll('*')).forEach(el => {
          const txt = (el.firstChild && el.firstChild.nodeType === 3) ? el.firstChild.nodeValue : '';
          if (txt && txt.trim().length <= 2) return;
        });
        const text = clone.textContent.replace(/\s+/g, ' ').trim();
        return text;
      },

      async saveToLocalStorage(memory) {
        // Final fallback: use domain-specific localStorage
        const memoryId = `emma_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const enrichedMemory = {
          id: memoryId,
          ...memory,
          savedAt: new Date().toISOString(),
          source: 'localStorage_fallback'
        };

        try {
          // Get existing memories from localStorage
          const existing = localStorage.getItem('emma_memories');
          const memories = existing ? JSON.parse(existing) : [];

          // Add new memory
          memories.push(enrichedMemory);

          // Keep only last 100 memories to avoid storage issues
          if (memories.length > 100) {
            memories.splice(0, memories.length - 100);
          }

          // Save back to localStorage
          localStorage.setItem('emma_memories', JSON.stringify(memories));

          return memoryId;
        } catch (error) {
          console.error('Emma Universal: localStorage failed:', error);
          throw error;
        }
      }
    };
  }

  /**
   * Collect top media items on the page using UniversalMediaCapture when available,
   * falling back to scanPageForMedia. Returns lightweight attachment metadata.
   */
  async function collectTopMedia(maxItems = 5) {
    let items = [];
    try {
      // Try universal capture first
      if (!window.UniversalMediaCapture) {
        try {
          const script = document.createElement('script');
          script.src = chrome.runtime.getURL('js/universal-media-capture.js');
          document.head.appendChild(script);
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        } catch {}
      }
      if (window.UniversalMediaCapture && typeof window.UniversalMediaCapture === 'function') {
        if (!window.universalCapture) window.universalCapture = new window.UniversalMediaCapture();
        const result = await window.universalCapture.capturePageMedia({ includeVideos: true, qualityThreshold: 3, maxElements: Math.max(10, maxItems), scrollToLoad: false });
        if (result && result.success && Array.isArray(result.elements)) {
          items = result.elements.map(el => ({
            src: el.src || el.originalSrc,
            width: Math.round(el.rect?.width || 0),
            height: Math.round(el.rect?.height || 0),
            tagName: el.tagName || 'img',
            qualityScore: el.metadata?.qualityScore || 0,
            visible: !!el.metadata?.visible,
            upgraded: !!el.metadata?.upgraded,
            capturedAt: Date.now()
          }));
        }
      }
      // Fallback
      if (items.length === 0) {
        const fallback = scanPageForMedia('img, video') || [];
        items = fallback.map(el => ({
          src: el.src,
          width: Math.round(el.rect?.width || 0),
          height: Math.round(el.rect?.height || 0),
          tagName: el.tagName || 'img',
          qualityScore: Math.round((el.rect?.width || 0) * (el.rect?.height || 0) / 10000),
          visible: true,
          upgraded: false,
          capturedAt: Date.now()
        }));
      }
    } catch (e) {
      console.warn('collectTopMedia failed:', e);
    }
    // Sort by quality and size, take top N, dedupe by src
    const seen = new Set();
    const deduped = [];
    items.sort((a,b) => (b.qualityScore||0) - (a.qualityScore||0));
    for (const it of items) {
      if (!it || !it.src || seen.has(it.src)) continue;
      seen.add(it.src);
      deduped.push(it);
      if (deduped.length >= maxItems) break;
    }
    return deduped;
  }

  /**
   * Build a capture suggestion for the current page combining text preview and media highlights
   */
  async function getCaptureSuggestion() {
    try {
      const engine = emmaEngine || createMinimalEngine();
      const analysis = await engine.analyze();
      const meta = extractPageMetadata();
      const mainText = engine.extractMainContent();
      const title = composeTitle(meta, mainText) || document.title || new URL(location.href).hostname;
      const textPreview = (mainText || '').replace(/\s+/g, ' ').trim().slice(0, 280);
      const media = await collectTopMedia(3);
      const entities = extractEntitiesFromText((mainText || ''));
      const hasContent = (textPreview && textPreview.length > 60) || (media && media.length > 0);
      return {
        success: true,
        suggested: !!hasContent,
        title,
        analysis,
        textPreview,
        media,
        entities,
        url: location.href
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Extract OpenGraph/Twitter/Article metadata for universal awareness
  function extractPageMetadata() {
    const get = (sel) => document.querySelector(sel)?.getAttribute('content') || '';
    const meta = {
      title: document.title || '',
      description: get('meta[name="description"]') || get('meta[property="og:description"]') || get('meta[name="twitter:description"]'),
      ogTitle: get('meta[property="og:title"]') || get('meta[name="twitter:title"]'),
      ogType: get('meta[property="og:type"]'),
      siteName: get('meta[property="og:site_name"]'),
      author: get('meta[name="author"]') || get('meta[property="article:author"]') || get('meta[name="twitter:creator"]'),
      canonicalUrl: document.querySelector('link[rel="canonical"]')?.href || get('meta[property="og:url"]') || location.href,
      articlePublishedTime: get('meta[property="article:published_time"]'),
      ogImage: get('meta[property="og:image"]'),
      ogVideo: get('meta[property="og:video"]')
    };
    return meta;
  }

  function composeTitle(meta, mainText) {
    const domain = location.hostname;

    // Enhanced Twitter/X title generation
    if (/(^|\.)x\.com$|twitter\.com$/.test(domain)) {
      // Try to get tweet text directly
      const tweetText = document.querySelector('article[role="article"] [data-testid="tweetText"]')?.textContent?.trim();
      if (tweetText) {
        const truncated = tweetText.length > 60 ? tweetText.substring(0, 60) + '...' : tweetText;
        return `Tweet: ${truncated}`;
      }

      // Fallback to author + "post"
      const author = meta.author || document.querySelector('[data-testid="User-Names"] a')?.textContent?.trim();
      if (author) {
        const authorClean = author.replace(/^@/, '');
        return `${authorClean}'s post on X`;
      }

      // Final fallback for Twitter
      if (mainText && mainText.trim()) {
        const truncated = mainText.trim().length > 60 ? mainText.trim().substring(0, 60) + '...' : mainText.trim();
        return `X post: ${truncated}`;
      }
    }

    // Enhanced general title logic
    const base = meta.ogTitle || meta.title || '';
    if (base && base !== 'X' && base !== 'Twitter' && !base.includes('Sign up') && !base.includes('Login')) {
      return base;
    }

    // Extract meaningful content for title
    if (mainText && mainText.trim()) {
      const cleaned = mainText.trim().replace(/\s+/g, ' ');
      const words = cleaned.split(/\s+/).slice(0, 12);
      const title = words.join(' ');
      return title.length > 80 ? title.substring(0, 80) + '...' : title;
    }

    return new URL(location.href).hostname;
  }

  // Lightweight page profiles to guide extraction across many sites without hardcoding a single site
  function getPageProfile() {
    const domain = location.hostname;
    const meta = extractPageMetadata();
    const profile = { primaryTextSelectors: [], mediaSelectors: [], threadContainerSelector: '', ignoreSelectors: 'script, style, nav, header, footer, aside, form, svg, noscript, menu' };
    if (domain.includes('mail.google.com')) {
      profile.primaryTextSelectors = [
        'h2.hP', /* Gmail subject */
        'div.a3s.aiL', /* Gmail message body */
        'div.gs' /* Gmail conversation segment */
      ];
      profile.mediaSelectors = ['div.a3s.aiL img'];
      return profile;
    }
    if (domain.includes('photos.google.com')) {
      profile.primaryTextSelectors = ['body'];
      profile.mediaSelectors = ['img[src*="googleusercontent.com"], video'];
      return profile;
    }
    if (/(^|\.)x\.com$|twitter\.com$/.test(domain)) {
      profile.primaryTextSelectors = [
        'article[role="article"] [data-testid="tweetText"]',
        '[data-testid="tweetText"]',
        'article[role="article"] div[lang]'
      ];
      profile.mediaSelectors = [
        'article[role="article"] img[src*="twimg.com"]',
        'article[role="article"] video source',
        'img[src*="twimg.com"]'
      ];
      profile.threadContainerSelector = 'article[role="article"]';
      return profile;
    }
    if ((meta.ogType || '').includes('article') || document.querySelector('article')) {
      profile.primaryTextSelectors = ['article', 'main', '[role="main"]'];
      profile.mediaSelectors = ['article img', 'article video source'];
      return profile;
    }
    // Generic fallback
    profile.primaryTextSelectors = ['main', '[role="main"]', 'article', '.content', 'body'];
    profile.mediaSelectors = ['img', 'video source'];
    return profile;
  }

  // Extract entities (mentions, hashtags, urls) from text
  function extractEntitiesFromText(text) {
    const mentions = Array.from(text.matchAll(/(^|\s)@([a-zA-Z0-9_]{2,30})\b/g)).map(m => m[2]);
    const hashtags = Array.from(text.matchAll(/(^|\s)#([\p{L}0-9_]{2,50})/gu)).map(m => m[2]);
    const urls = Array.from(text.matchAll(/https?:\/\/[\w.-]+(?:\/[\w\-._~:\/?#[\]@!$&'()*+,;=%]*)?/g)).map(m => m[0]);
    return { mentions, hashtags, urls };
  }

  function normalizeText(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
  function isLikelyGarbage(text) {
    const t = text.slice(0, 4000).toLowerCase();
    return (
      t.includes('<style') || t.includes('<script') || t.includes('</svg') ||
      t.includes('javascript is not available') || t.includes('we\u2019ve detected that javascript is disabled') ||
      t.includes('errorcontainer') || t.includes('help center') || t.includes('terms of service')
    );
  }
  async function waitForSelectorText(sel, timeoutMs = 1500) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const el = document.querySelector(sel);
      const text = el && normalizeText(el.textContent || '');
      if (text && text.length > 10 && !isLikelyGarbage(text)) return text;
      await new Promise(r => setTimeout(r, 100));
    }
    return '';
  }

  // Extract a primary social post (generic), with author, text, permalink, and media refs
  async function extractPrimarySocialPost() {
    const profile = getPageProfile();
    const pickContainer = () => {
      const articles = Array.from(document.querySelectorAll(profile.threadContainerSelector || 'article'));
      let best = null; let bestScore = -Infinity;
      const viewportH = window.innerHeight;
      for (const el of articles) {
        const r = el.getBoundingClientRect();
        const visible = Math.max(0, Math.min(r.bottom, viewportH) - Math.max(r.top, 0));
        const area = Math.max(1, r.width * r.height);
        const textNode = el.querySelector('[data-testid="tweetText"], div[lang]');
        const score = (textNode ? 10 : 0) + Math.log10(area) + (visible > viewportH * 0.25 ? 5 : 0);
        if (score > bestScore) { bestScore = score; best = el; }
      }
      return best || document.querySelector(profile.threadContainerSelector) || document.querySelector('article') || document.body;
    };
    const container = pickContainer();
    // Wait for tweet text
    let text = await waitForSelectorText('[data-testid="tweetText"], article div[lang]');
    if ((!text || text.length < 10) && container) {
      const t = normalizeText(container.textContent || '');
      if (t && !isLikelyGarbage(t)) text = t;
    }
    if (isLikelyGarbage(text)) text = '';
    // Author
    let author = '';
    const nameBlock = container.querySelector('[data-testid="User-Name"]');
    if (nameBlock) {
      const spans = Array.from(nameBlock.querySelectorAll('span')).map(s => s.textContent.trim()).filter(Boolean);
      author = spans.join(' · ').split('·')[0] || '';
    }
    if (!author) author = extractPageMetadata().author || '';
    // Permalink
    let permalink = '';
    const link = container.querySelector('a[href*="/status/"]') || document.querySelector('a[aria-label*="Post"]');
    if (link) { try { permalink = new URL(link.getAttribute('href'), location.href).href; } catch {} }
    // Media candidates
    const mediaEls = Array.from(container.querySelectorAll('img[src*="twimg.com"], video source'));
    const media = mediaEls.slice(0, 4).map(el => ({ src: el.src || el.currentSrc, tagName: el.tagName.toLowerCase() }));
    return { text, author, permalink, media };
  }

  function composeSocialTitle(author, text) {
    const snippet = (text || '').trim().split(/\s+/).slice(0, 12).join(' ');
    return `${author || 'Post'}: ${snippet}`.trim();
  }

  // Gmail lightweight extractor (structure may vary; use robust selectors)
  function extractPrimaryEmailThread() {
    const subject = document.querySelector('h2.hP')?.textContent?.trim() || document.title;
    // Collect visible message bodies (exclude quoted text)
    const bodies = Array.from(document.querySelectorAll('div.a3s.aiL')).map(el => el.innerText.trim()).filter(t => t.length > 50);
    const text = bodies.join('\n\n').replace(/\s+/g, ' ').trim().slice(0, 4000);
    // Participants (from headers chips)
    const chips = Array.from(document.querySelectorAll('span.gD, span.g2')).map(el => el.getAttribute('email') || el.textContent.trim());
    const participants = Array.from(new Set(chips.filter(Boolean)));
    return { subject, text, participants };
  }

  function composeEmailTitle(subject, participants=[]) {
    if (subject) return subject;
    if (participants.length) return `Email with ${participants.slice(0,3).join(', ')}${participants.length>3?'…':''}`;
    return 'Email thread';
  }

  // Google Photos / generic media gallery summary
  function extractMediaGallerySummary() {
    // Count visible large images to summarize the album/page
    const imgs = Array.from(document.querySelectorAll('img')).filter(img => {
      const r = img.getBoundingClientRect();
      return (r.width >= 80 && r.height >= 80) && (/googleusercontent\.com/.test(img.src) || r.width*r.height > 25000);
    });
    const count = imgs.length;
    const title = document.title;
    const summary = count ? `Media selection (${count} items)` : title;
    return { count, title, summary };
  }

  /**
   * Set up Emma based on user settings
   */
  async function setupEmma(settings) {

    // Add Emma UI
    if (settings.showFloatingButton !== false) {

      addEmmaUI();

      // Verify UI was added
      setTimeout(() => {
        const floatingBtn = document.getElementById('emma-float-btn');
        if (floatingBtn) {

          // Force visibility to debug CSS issues
          floatingBtn.style.cssText = `
            position: fixed !important;
            bottom: 24px !important;
            right: 24px !important;
            width: 56px !important;
            height: 56px !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #deb3e4 100%) !important;
            border: 2px solid white !important;
            border-radius: 50% !important;
            cursor: pointer !important;
            z-index: 999999 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: white !important;
            font-weight: bold !important;
            box-shadow: 0 4px 16px rgba(118, 75, 162, 0.4) !important;
            opacity: 1 !important;
            visibility: visible !important;
          `;

        } else {
          console.error('❌ Emma floating button NOT found in DOM');
        }
      }, 100);
    } else {

    }

    // Set up auto-capture if enabled
    if (settings.autoCapture) {

      await setupAutoCapture();
    }

    // Set up keyboard shortcuts
    if (settings.enableShortcuts) {

      setupKeyboardShortcuts();
    }

  }

  /**
   * Set up automatic capture
   */
  async function setupAutoCapture() {
    // Analyze current page
    const analysis = await emmaEngine.analyze();

    // Only auto-capture high confidence content
    if (analysis.confidence > 0.7) {
      // Set up observer for dynamic content
      observePageChanges();

      // Initial capture after page settles
      setTimeout(() => {
        captureContent({ auto: true });
      }, 2000);
    }
  }

  /**
   * Observe page changes for dynamic content
   */
  function observePageChanges() {
    let captureTimeout = null;

    const observer = new MutationObserver((mutations) => {
      // Debounce captures
      clearTimeout(captureTimeout);
      captureTimeout = setTimeout(() => {
        captureContent({ auto: true, incremental: true });
      }, 1500);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  /**
   * Capture content from the page
   */
  async function captureContent(options = {}) {
    try {

      // Check if engine is available
      if (!emmaEngine) {

        return await performFallbackCapture(options);
      }

      const result = await emmaEngine.capture(options);
      const capturedCount = result && typeof result.count === 'number' ? result.count : (Array.isArray(result) ? result.length : 0);

      if (capturedCount > 0) {

        // Show notification if not auto-capture
        if (!options.auto) {
          const attText = result && result.attachmentsAdded ? ` (+${result.attachmentsAdded} media)` : '';
          showNotification(`Captured ${capturedCount} item(s)${attText}`);
        }

        return { success: true, count: capturedCount, attachmentsAdded: result.attachmentsAdded || 0, capsuleId: result.capsuleId };
      } else {

        return { success: false, message: 'No content found' };
      }

    } catch (error) {
      console.error('Emma: Capture failed:', error);

      return await performFallbackCapture(options);
    }
  }

  /**
   * Fallback capture when engine is not available
   */
  async function performFallbackCapture(options = {}) {
    try {

      // Try to capture selected text or page content
      const selection = window.getSelection().toString();
      let content = '';
      let type = 'page';

      if (selection && selection.length > 10) {
        content = selection;
        type = 'selection';

      } else {
        // Capture page title and some content
        const title = document.title;
        const bodyText = document.body.textContent.substring(0, 500).trim();
        content = `${title}\n\n${bodyText}`;

      }

      if (content && content.length > 20) {
        const memory = {
          content,
          type,
          source: 'manual',
          metadata: {
            title: document.title,
            url: window.location.href,
            timestamp: Date.now()
          }
        };

        try {
          // Save via background service to ensure proper storage
          const saveResult = await chrome.runtime.sendMessage({
            action: 'ephemeral.add',
            data: {
            ...memory,
            id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            timestamp: Date.now(),
            created: new Date().toISOString(),
            fallback: true
            }
          });

          if (saveResult && saveResult.success) {

            // Trigger refresh of memories.html if it's open
            try {
              chrome.runtime.sendMessage({ action: 'memories.refresh' });
            } catch {}
          return { success: true, count: 1, message: 'Captured page content' };
          } else {
            console.error('Emma: Background save failed:', saveResult);
            return { success: false, error: saveResult?.error || 'Failed to save via background service' };
          }
        } catch (saveError) {
          console.error('Emma: Failed to save to Vault:', saveError);
          const msg = (saveError && saveError.message) ? saveError.message : '';
          if ((saveError && saveError.name === 'QuotaExceededError') || /quota/i.test(msg)) {
            return { success: false, error: 'Storage quota exceeded. Delete older items or attachments and try again.' };
          }
          if (/Extension context invalidated/i.test(msg)) {
            return { success: false, error: 'Extension reloaded. Please retry capture.' };
          }
          return { success: false, error: msg || 'Unknown error while saving' };
        }
      }

      return {
        success: false,
        count: 0,
        message: 'No content available to capture'
      };

    } catch (error) {
      console.error('Emma: Fallback capture failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle messages from extension
   */
  function handleMessage(request, sender, sendResponse) {

    try {
      switch (request.action) {
        case 'ping':
          sendResponse({
            success: true,
            initialized: isInitialized,
            message: 'Emma Universal content script is active',
            timestamp: Date.now()
          });
          break;

        case 'captureNow':
          if (!isInitialized) {
            sendResponse({ success: false, error: 'Emma not initialized yet' });
            break;
          }

          // Add timeout to prevent hanging
          Promise.race([
            captureContent({ userTriggered: true, force: true }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Content capture timeout')), 8000))
          ])
            .then(result => {

              sendResponse(result);
            })
            .catch(error => {
              console.error('Emma Universal: Capture error:', error);
              sendResponse({ success: false, error: error.message });
            });
          return true; // Async response

        case 'getPageAnalysis':
          if (!isInitialized || !emmaEngine) {
            sendResponse({ success: false, error: 'Emma engine not available' });
            break;
          }

          emmaEngine.analyze()
            .then(analysis => sendResponse({ success: true, analysis }))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true; // Async response

        case 'captureSelection':
          captureSelection()
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true; // Async response

        case 'media.scanPage':
          (async () => {
            try {

              // Try Universal Capture first, but don't block on loading issues
              let useUniversal = false;
              try {
                if (!window.UniversalMediaCapture) {

                  const script = document.createElement('script');
                  script.src = chrome.runtime.getURL('js/universal-media-capture.js');
                  document.head.appendChild(script);

                  // Quick attempt to load (max 2 seconds)
                  await Promise.race([
                    new Promise((resolve, reject) => {
                      script.onload = () => {
                        if (window.UniversalMediaCapture && typeof window.UniversalMediaCapture === 'function') {

                          resolve();
                        } else {
                          reject(new Error('Class not available'));
                        }
                      };
                      script.onerror = reject;
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Load timeout')), 2000))
                  ]);
                  useUniversal = true;
                } else if (typeof window.UniversalMediaCapture === 'function') {
                  useUniversal = true;

                }
              } catch (error) {

                useUniversal = false;
              }

              let result;

              if (useUniversal) {
                try {
                  if (!window.universalCapture) {
                    window.universalCapture = new window.UniversalMediaCapture();
                  }

                  result = await window.universalCapture.capturePageMedia({
                    includeVideos: true,
                    qualityThreshold: request.qualityThreshold || 1, // Lower default threshold
                    maxElements: request.maxElements || 100,
                    scrollToLoad: request.scrollToLoad !== false
                  });

                } catch (error) {
                  console.error('🔍 CONTENT: Universal capture failed, falling back:', error);
                  useUniversal = false;
                }
              }

              if (!useUniversal) {

                const elements = scanPageForMedia('img, video');

                // Apply quality filtering similar to universal capture
                const filteredElements = elements.filter(el => {
                  const area = el.rect.width * el.rect.height;
                  const aspectRatio = el.rect.width / el.rect.height;

                  // Basic quality heuristics
                  if (area >= 160000) return true; // >= 400x400 (high quality)
                  if (area >= 40000 && aspectRatio >= 0.2 && aspectRatio <= 5) return true; // >= 200x200 with reasonable aspect ratio
                  if (area < 10000) return false; // < 100x100 (likely thumbnail)

                  // Check for obvious thumbnail patterns in URL
                  const src = (el.src || '').toLowerCase();
                  if (src.includes('thumbnail') || src.includes('thumb') || src.includes('icon')) return false;

                  return true;
                });

                result = {
                  success: true,
                  elements: filteredElements,
                  summary: {
                    totalFound: elements.length,
                    highQuality: filteredElements.length,
                    method: 'enhanced_fallback'
                  }
                };

              }

              // Check for Chrome message size limit
              const responseSize = JSON.stringify(result).length;
              if (responseSize > 50000000) { // 50MB limit
                console.warn('🔍 CONTENT: Response too large, truncating...');
                sendResponse({
                  ...result,
                  elements: result.elements.slice(0, 50),
                  truncated: true,
                  originalCount: result.elements.length
                });
              } else {
                sendResponse(result);
              }
            } catch (error) {
              console.error('🔍 CONTENT: Universal capture failed:', error);
              sendResponse({ success: false, error: error.message });
            }
          })();
          return true; // async
          break;

        case 'suggest.capture':
          (async () => {
            try {
              const suggestion = await getCaptureSuggestion();
              // Show suggestion popup directly above the Emma orb instead of in popup
              if (suggestion && suggestion.success && suggestion.suggested) {
                showContentScriptSuggestionPopup(suggestion);
              }
              sendResponse(suggestion);
            } catch (e) {
              sendResponse({ success: false, error: e.message });
            }
          })();
          return true; // async
          break;

        case 'clever.captureElement':
          (async () => {
            try {

              // Load clever bypass system if not already loaded
              if (!window.emmaCleverBypass) {

                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('js/clever-capture-bypass.js');
                document.head.appendChild(script);

                // Wait for it to load
                await new Promise((resolve, reject) => {
                  script.onload = resolve;
                  script.onerror = reject;
                  setTimeout(reject, 3000); // 3 second timeout
                });
              }

              // Find the element to capture
              let element;
              if (request.elementSelector) {
                element = document.querySelector(request.elementSelector);
              } else if (request.elementIndex !== undefined) {
                const allImages = document.querySelectorAll('img');
                element = allImages[request.elementIndex];
              }

              if (!element) {
                sendResponse({ success: false, error: 'Element not found' });
                return;
              }

              console.log('🧠 CONTENT: Attempting clever capture on element:', element.src?.substring(0, 100));

              // Use clever bypass to capture the element
              const result = await window.emmaCleverBypass.captureElementClever(element);

              sendResponse(result);

            } catch (error) {
              console.error('🧠 CONTENT: Clever capture error:', error);
              sendResponse({ success: false, error: error.message });
            }
          })();
          return true; // async
          break;

        case 'clever.batchCapture':
          (async () => {
            try {

              // Load clever bypass system if not already loaded
              if (!window.emmaCleverBypass) {

                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('js/clever-capture-bypass.js');
                document.head.appendChild(script);

                // Wait for it to load
                await new Promise((resolve, reject) => {
                  script.onload = resolve;
                  script.onerror = reject;
                  setTimeout(reject, 3000); // 3 second timeout
                });
              }

              // Use clever bypass to capture all images (tolerant to different exports)
              let result;
              if (window.emmaCleverBypass && typeof window.emmaCleverBypass.batchCleverCapture === 'function') {
                result = await window.emmaCleverBypass.batchCleverCapture();
              } else if (typeof window.emmaBatchCleverCapture === 'function') {
                result = await window.emmaBatchCleverCapture();
              } else {
                throw new Error('Clever bypass not initialized');
              }

              console.log('🧠 CONTENT: Batch capture result:', result.success ? `SUCCESS (${result.captured?.length} items)` : 'FAILED');

              sendResponse(result);

            } catch (error) {
              console.error('🧠 CONTENT: Clever batch capture error:', error);
              sendResponse({ success: false, error: error.message });
            }
          })();
          return true; // async
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action: ' + request.action });
      }
    } catch (error) {
      console.error('Emma Universal: Message handling error:', error);
      sendResponse({ success: false, error: 'Message handling failed: ' + error.message });
    }
  }

  /**
   * Capture selected text
   */
  async function captureSelection() {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length < 10) {
      return { success: false, message: 'No text selected' };
    }

    try {
      // Check vault setup using simplified approach
      const storage = await chrome.storage.local.get(['emma_vault_initialized']);
      if (!storage.emma_vault_initialized) {
        return { success: false, message: 'Vault not set up. Please create your vault in the dashboard first.' };
      }
      // Save selection to simplified storage
      const selectionMemory = {
        id: `sel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        content: text,
        type: 'selection',
        source: 'manual',
        url: window.location.href,
        title: document.title,
        timestamp: Date.now(),
        created: new Date().toISOString(),
        selection: true
      };

      const existingStorage = await chrome.storage.local.get(['emma_memories']);
      const existingMemories = existingStorage.emma_memories || [];
      const allMemories = [selectionMemory, ...existingMemories];

      if (allMemories.length > 100) {
        allMemories.splice(100);
      }

      await chrome.storage.local.set({ emma_memories: allMemories });
      showNotification('Selection saved to memory storage');
      return { success: true };
    } catch (error) {
      console.error('Emma: Failed to save selection:', error);
      return { success: false, error: error.message };
    }
  }

  // YOUR EXACT ORB CLASS - EMBEDDED!
  class EmmaOrb {
    constructor(container, options = {}) {
      this.container = container;
      this.options = { hue: 0, hoverIntensity: 0.2, rotateOnHover: true, forceHoverState: false, ...options };
      this.init();
    }

    init() {
      if (!this.container) return;
      this.setupWebGL();
      this.setupShaders();
      this.setupGeometry();
      this.setupEventListeners();
      this.startRenderLoop();
    }

    setupWebGL() {
      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = 'width: 100%; height: 100%; display: block;';
      this.container.appendChild(this.canvas);

      // Enhanced WebGL context with better quality settings
      this.gl = this.canvas.getContext('webgl', {
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
      });

      if (!this.gl) { this.useFallback(); return; }

      // Enable high-quality rendering extensions if available
      const ext = this.gl.getExtension('OES_standard_derivatives');
      if (ext) {
        this.hasDerivatives = true;
      }

      this.gl.clearColor(0, 0, 0, 0);
      this.gl.disable(this.gl.DEPTH_TEST);
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

      this.resize();
    }

    setupShaders() {
      const vert = 'precision highp float; attribute vec2 position; attribute vec2 uv; varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }';

      // Original shader design with anti-aliasing for crisp edges
      const frag = 'precision highp float; uniform float iTime; uniform vec3 iResolution; uniform float hue; uniform float hover; uniform float rot; uniform float hoverIntensity; varying vec2 vUv; vec3 rgb2yiq(vec3 c) { float y = dot(c, vec3(0.299, 0.587, 0.114)); float i = dot(c, vec3(0.596, -0.274, -0.322)); float q = dot(c, vec3(0.211, -0.523, 0.312)); return vec3(y, i, q); } vec3 yiq2rgb(vec3 c) { float r = c.x + 0.956 * c.y + 0.621 * c.z; float g = c.x - 0.272 * c.y - 0.647 * c.z; float b = c.x - 1.106 * c.y + 1.703 * c.z; return vec3(r, g, b); } vec3 adjustHue(vec3 color, float hueDeg) { float hueRad = hueDeg * 3.14159265 / 180.0; vec3 yiq = rgb2yiq(color); float cosA = cos(hueRad); float sinA = sin(hueRad); float i = yiq.y * cosA - yiq.z * sinA; float q = yiq.y * sinA + yiq.z * cosA; yiq.y = i; yiq.z = q; return yiq2rgb(yiq); } vec3 hash33(vec3 p3) { p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787)); p3 += dot(p3, p3.yxz + 19.19); return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx); } float snoise3(vec3 p) { const float K1 = 0.333333333; const float K2 = 0.166666667; vec3 i = floor(p + (p.x + p.y + p.z) * K1); vec3 d0 = p - (i - (i.x + i.y + i.z) * K2); vec3 e = step(vec3(0.0), d0 - d0.yzx); vec3 i1 = e * (1.0 - e.zxy); vec3 i2 = 1.0 - e.zxy * (1.0 - e); vec3 d1 = d0 - (i1 - K2); vec3 d2 = d0 - (i2 - K1); vec3 d3 = d0 - 0.5; vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0); vec4 n = h * h * h * h * vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0))); return dot(vec4(31.316), n); } vec4 extractAlpha(vec3 colorIn) { float a = max(max(colorIn.r, colorIn.g), colorIn.b); return vec4(colorIn.rgb / (a + 1e-5), a); } const vec3 baseColor1 = vec3(0.611765, 0.262745, 0.996078); const vec3 baseColor2 = vec3(0.298039, 0.760784, 0.913725); const vec3 baseColor3 = vec3(0.062745, 0.078431, 0.600000); const float innerRadius = 0.6; const float noiseScale = 0.65; float light1(float intensity, float attenuation, float dist) { return intensity / (1.0 + dist * attenuation); } float light2(float intensity, float attenuation, float dist) { return intensity / (1.0 + dist * dist * attenuation); } vec4 draw(vec2 uv) { vec3 color1 = adjustHue(baseColor1, hue); vec3 color2 = adjustHue(baseColor2, hue); vec3 color3 = adjustHue(baseColor3, hue); float ang = atan(uv.y, uv.x); float len = length(uv); float invLen = len > 0.0 ? 1.0 / len : 0.0; float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5; float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0); float d0 = distance(uv, (r0 * invLen) * uv); float v0 = light1(1.0, 10.0, d0); v0 *= smoothstep(r0 * 1.05, r0, len); float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5; float a = iTime * -1.0; vec2 pos = vec2(cos(a), sin(a)) * r0; float d = distance(uv, pos); float v1 = light2(1.5, 5.0, d); v1 *= light1(1.0, 50.0, d0); float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len); float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len); vec3 col = mix(color1, color2, cl); col = mix(color3, col, v0); col = (col + v1) * v2 * v3; col = clamp(col, 0.0, 1.0); return extractAlpha(col); } vec4 mainImage(vec2 fragCoord) { vec2 center = iResolution.xy * 0.5; float size = min(iResolution.x, iResolution.y); vec2 uv = (fragCoord - center) / size * 2.0; float angle = rot; float s = sin(angle); float c = cos(angle); uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y); uv.x += hover * hoverIntensity * 0.1 * sin(uv.y * 10.0 + iTime); uv.y += hover * hoverIntensity * 0.1 * sin(uv.x * 10.0 + iTime); return draw(uv); } void main() { vec2 fragCoord = vUv * iResolution.xy; vec4 col = mainImage(fragCoord); gl_FragColor = vec4(col.rgb * col.a, col.a); }';

      this.program = this.createProgram(vert, frag);
      if (!this.program) { this.useFallback(); return; }
      this.uniforms = { iTime: this.gl.getUniformLocation(this.program, 'iTime'), iResolution: this.gl.getUniformLocation(this.program, 'iResolution'), hue: this.gl.getUniformLocation(this.program, 'hue'), hover: this.gl.getUniformLocation(this.program, 'hover'), rot: this.gl.getUniformLocation(this.program, 'rot'), hoverIntensity: this.gl.getUniformLocation(this.program, 'hoverIntensity') };
      this.attributes = { position: this.gl.getAttribLocation(this.program, 'position'), uv: this.gl.getAttribLocation(this.program, 'uv') };
    }

    setupGeometry() {
      this.positionBuffer = this.gl.createBuffer(); this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer); this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), this.gl.STATIC_DRAW);
      this.uvBuffer = this.gl.createBuffer(); this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.uvBuffer); this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([0, 0, 2, 0, 0, 2]), this.gl.STATIC_DRAW);
    }

    setupEventListeners() {
      this.targetHover = 0; this.currentRot = 0;
      this.container.addEventListener('mousemove', (e) => {
        const rect = this.container.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; const width = rect.width; const height = rect.height; const size = Math.min(width, height); const centerX = width / 2; const centerY = height / 2; const uvX = ((x - centerX) / size) * 2.0; const uvY = ((y - centerY) / size) * 2.0;
        if (Math.sqrt(uvX * uvX + uvY * uvY) < 0.8) { this.targetHover = 1; } else { this.targetHover = 0; }
      });
      this.container.addEventListener('mouseleave', () => { this.targetHover = 0; });
      window.addEventListener('resize', () => this.resize());
    }

    startRenderLoop() {
      this.currentHover = 0; this.currentRot = 0;
      const render = (time) => {
        if (!this.gl || !this.program) return;
        const t = time * 0.001; const dt = (time - this.lastTime) * 0.001 || 0; this.lastTime = time;
        const effectiveHover = this.options.forceHoverState ? 1 : this.targetHover; this.currentHover += (effectiveHover - this.currentHover) * 0.1;
        if (this.options.rotateOnHover && effectiveHover > 0.5) { this.currentRot += dt * 0.3; }
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height); this.gl.clear(this.gl.COLOR_BUFFER_BIT); this.gl.useProgram(this.program);
        this.gl.uniform1f(this.uniforms.iTime, t); this.gl.uniform3f(this.uniforms.iResolution, this.gl.canvas.width, this.gl.canvas.height, this.gl.canvas.width / this.gl.canvas.height); this.gl.uniform1f(this.uniforms.hue, this.options.hue); this.gl.uniform1f(this.uniforms.hover, this.currentHover); this.gl.uniform1f(this.uniforms.rot, this.currentRot); this.gl.uniform1f(this.uniforms.hoverIntensity, this.options.hoverIntensity);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer); this.gl.enableVertexAttribArray(this.attributes.position); this.gl.vertexAttribPointer(this.attributes.position, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.uvBuffer); this.gl.enableVertexAttribArray(this.attributes.uv); this.gl.vertexAttribPointer(this.attributes.uv, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
        requestAnimationFrame(render);
      };
      requestAnimationFrame(render);
    }

    resize() {
      if (!this.canvas || !this.container) return;

      // Enhanced high-DPI rendering
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance
      const rect = this.container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Set canvas size with pixel ratio for crisp rendering
      const canvasWidth = Math.floor(width * dpr);
      const canvasHeight = Math.floor(height * dpr);

      if (this.canvas.width !== canvasWidth || this.canvas.height !== canvasHeight) {
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';

        if (this.gl) {
          this.gl.viewport(0, 0, canvasWidth, canvasHeight);
        }
      }
    }

    createShader(type, source) { const shader = this.gl.createShader(type); this.gl.shaderSource(shader, source); this.gl.compileShader(shader); if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) { console.error('Shader compile error:', this.gl.getShaderInfoLog(shader)); this.gl.deleteShader(shader); return null; } return shader; }
    createProgram(vertexSource, fragmentSource) { const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource); const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource); if (!vertexShader || !fragmentShader) return null; const program = this.gl.createProgram(); this.gl.attachShader(program, vertexShader); this.gl.attachShader(program, fragmentShader); this.gl.linkProgram(program); if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) { console.error('Program link error:', this.gl.getProgramInfoLog(program)); this.gl.deleteProgram(program); return null; } return program; }
    useFallback() {
      this.container.innerHTML = '<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #deb3e4 100%); border-radius: 50%; animation: float 3s ease-in-out infinite;"></div>';
    }
  }

  // Lazy orb initializer to defer WebGL work until user interaction
  let orbsInitialized = false;
  function initializeOrbsLazy() {
    if (orbsInitialized) return;
    orbsInitialized = true;
    try { window.EmmaOrb = EmmaOrb; } catch {}
    try { initializeFloatingOrb(); } catch (e) { console.warn('Emma: floating orb init failed', e); }
    try { initializePanelOrb(); } catch (e) { console.warn('Emma: panel orb init failed', e); }
  }

  /**
   * Add Emma UI elements
   */
  function addEmmaUI() {

    // Check if UI already exists
    if (document.getElementById('emma-float-btn')) {

      return;
    }

    // Floating button with orb
    const button = document.createElement('div');
    button.id = 'emma-float-btn';
    button.className = 'emma-float-btn';
    button.innerHTML = `
      <div class="emma-btn-inner">
        <div class="emma-orb-container-small" id="emma-float-orb"></div>
        <span class="emma-label">Emma</span>
      </div>
    `;
    button.addEventListener('click', toggleEmmaPanel);
    document.body.appendChild(button);

    // Defer orb initialization until user interacts with the button
    try {
      button.addEventListener('mouseenter', initializeOrbsLazy, { once: true });
      button.addEventListener('click', initializeOrbsLazy, { once: true });
    } catch {}

    // Main panel with modern design
    const panel = document.createElement('div');
    panel.id = 'emma-panel';
    panel.className = 'emma-panel emma-panel-hidden';
    panel.innerHTML = `
      <div class="emma-panel-header">
        <div class="emma-header-content">
          <div class="emma-orb-container-header" id="emma-panel-orb"></div>
          <div class="emma-title-section">
            <h3>emma</h3>
            <span class="emma-subtitle">intelligent memory</span>
          </div>
        </div>
        <button class="emma-close">×</button>
      </div>
      <div class="emma-panel-body">
        <div class="emma-tabbar">
          <button class="emma-tab emma-tab-active" data-tab="capture">Capture</button>
          <button class="emma-tab" data-tab="chat">Chat</button>
        </div>
        <section id="emma-capture-section" class="emma-tab-section emma-tab-section-active">
          <div class="emma-actions-modern" id="emma-dynamic-actions"></div>
          <div class="emma-status" style="display: none; padding: 12px; margin: 12px 0; border-radius: 8px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: white; text-align: center; font-size: 14px; transition: all 0.3s ease;"></div>
          <div class="emma-auto">
            <div class="emma-auto-status"><span id="emma-auto-vault"></span><span class="divider">•</span><span id="emma-auto-service">Checking automation…</span></div>
            <div class="emma-auto-row">
              <textarea id="emma-auto-query" class="emma-auto-input" rows="2" placeholder="e.g., Find all posts about my mom on Facebook"></textarea>
              <button id="emma-auto-start" class="emma-auto-btn">Start</button>
            </div>
            <div id="emma-auto-progress" class="emma-auto-progress" hidden>
              <div class="bar"></div>
              <div class="msg" id="emma-auto-msg">Initializing…</div>
            </div>
          </div>
        </section>
        <section id="emma-chat-section" class="emma-tab-section">
          <div id="emma-chat-messages" class="emma-chat-messages"></div>
          <div class="emma-chat-input"><textarea id="emma-chat-input" rows="1" placeholder="Ask Emma about your memories…"></textarea><button id="emma-chat-send" class="emma-chat-send">→</button></div>
        </section>
        <div class="emma-page-analysis" id="emma-analysis-section">
          <div class="analysis-header">
            <span class="analysis-icon">🔬</span>
            <span class="analysis-title">Page Analysis:</span>
          </div>
          <div class="analysis-content">
            <div class="analysis-item">
              <span class="analysis-label">Type:</span>
              <span class="analysis-value" id="page-type">conversation</span>
            </div>
            <div class="analysis-item">
              <span class="analysis-label">Confidence:</span>
              <span class="analysis-value" id="page-confidence">90%</span>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Defer panel orb; initialize on first open or hover
    try { panel.addEventListener('mouseenter', initializeOrbsLazy, { once: true }); } catch {}

    // Add event listeners
    panel.querySelector('.emma-close').addEventListener('click', hideEmmaPanel);
    panel.querySelectorAll('.emma-action-card').forEach(btn => { btn.addEventListener('click', handleActionButton); });
    const tabbar = panel.querySelector('.emma-tabbar');
    tabbar && tabbar.addEventListener('click', (e) => {
      const btn = e.target.closest('.emma-tab');
      if (!btn) return;
      const tab = btn.getAttribute('data-tab');
      panel.querySelectorAll('.emma-tab').forEach(b => b.classList.remove('emma-tab-active'));
      btn.classList.add('emma-tab-active');
      panel.querySelectorAll('.emma-tab-section').forEach(sec => sec.classList.remove('emma-tab-section-active'));
      const active = panel.querySelector(`#emma-${tab}-section`);
      active && active.classList.add('emma-tab-section-active');
    });
    const startBtn = panel.querySelector('#emma-auto-start');
    startBtn && startBtn.addEventListener('click', async () => {
      // Ensure vault is unlocked before running
      try {
        const v = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
        if (!v?.isUnlocked) {
          showInlineStatus('Vault is locked — please unlock in popup and retry');
          return;
        }
      } catch {}
      startAutonomousCaptureFromPanel();
    });
    const sendBtn = panel.querySelector('#emma-chat-send');
    const chatInput = panel.querySelector('#emma-chat-input');
    sendBtn && sendBtn.addEventListener('click', () => sendChatMessage());
    chatInput && chatInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); sendChatMessage(); } });

    // Add styles
    addEmmaStyles();

    // Update page analysis
    updatePageAnalysis();
    refreshVaultAndAutomationStatus();
  }

  /**
   * Add Emma styles
   */
  function addEmmaStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Emma CSS Variables (same as dashboard) */
      :root {
        --emma-gradient-1: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #deb3e4 100%);
        --emma-purple: #764ba2;
        --emma-pink: #deb3e4;
        --emma-blue: #667eea;
      }

      /* Floating Emma Memory Interface */
      /* Floating Button with Orb */
              .emma-float-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          background: transparent;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          z-index: 999999;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: visible;
        }

              .emma-float-btn:hover {
          transform: translateY(-4px) scale(1.05);
        }

      .emma-btn-inner {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: white;
        font-size: 24px;
        position: relative;
      }

      .emma-orb-container-small {
        width: 40px;
        height: 40px;
        position: relative;
        filter: drop-shadow(0 4px 16px rgba(118, 75, 162, 0.3));
        background: none !important;
      }

      .emma-orb-container-header {
        width: 56px;
        height: 56px;
        position: relative;
        flex-shrink: 0;
        filter: drop-shadow(0 4px 16px rgba(118, 75, 162, 0.3));
        background: none !important;
      }

      .emma-orb-container-small canvas,
      .emma-orb-container-header canvas {
        width: 100% !important;
        height: 100% !important;
      }

      .emma-label {
        display: none;
      }

      /* Modern Panel Design */
      .emma-panel {
        position: fixed;
        right: 24px;
        bottom: 90px;
        width: 380px;
        background: rgba(26, 16, 51, 0.95);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        z-index: 999998;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: white;
      }

      .emma-panel-hidden {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        pointer-events: none;
      }

      /* Header with Orb */
      .emma-panel-header {
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #deb3e4 100%);
        border-radius: 20px 20px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
        overflow: hidden;
      }

      .emma-header-content {
        display: flex;
        align-items: center;
        gap: 16px;
        flex: 1;
      }

      .emma-title-section {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .emma-panel-header h3 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: white;
        line-height: 1.2;
      }

      .emma-subtitle {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 400;
        text-transform: lowercase;
        letter-spacing: 0.5px;
      }

      .emma-close {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .emma-close:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
      }

      /* Panel Body */
      .emma-panel-body {
        padding: 20px;
        max-height: 500px;
        overflow-y: auto;
      }
      /* Tabs */
      .emma-tabbar { display:flex; gap:8px; margin: 4px 0 12px 0; }
      .emma-tab { padding:8px 12px; font-size:12px; border-radius:9999px; border:1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color:#fff; cursor:pointer; }
      .emma-tab-active { background: var(--emma-gradient-1); border-color: transparent; }
      .emma-tab-section { display:none; }
      .emma-tab-section-active { display:block; }
      /* Auto capture */
      .emma-auto { margin-top: 8px; padding: 10px; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(255,255,255,0.03); }
      .emma-auto-status { font-size:12px; color: rgba(255,255,255,0.75); margin-bottom:8px; display:flex; align-items:center; gap:6px; }
      .emma-auto-status .divider { opacity:.5; }
      .emma-auto-row { display:flex; gap:8px; align-items:flex-end; }
      .emma-auto-input { flex:1; min-height:40px; padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.3); color:#fff; resize: vertical; }
      .emma-auto-btn { padding:10px 14px; border-radius:10px; border:none; cursor:pointer; color:#fff; background: var(--emma-gradient-1); }
      .emma-auto-btn:disabled { opacity:.6; cursor:not-allowed; }
      .emma-auto-progress { margin-top:10px; }
      .emma-auto-progress .bar { height:6px; width:0%; background: var(--emma-gradient-1); border-radius:4px; transition: width .3s ease; }
      .emma-auto-progress .msg { margin-top:6px; font-size:12px; color: rgba(255,255,255,0.8); }
      /* Chat */
      .emma-chat-messages { max-height: 280px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding:8px; border:1px solid rgba(255,255,255,0.08); border-radius:12px; background: rgba(255,255,255,0.03); }
      .emma-chat-input { display:flex; gap:8px; margin-top:8px; }
      .emma-chat-input textarea { flex:1; min-height:36px; max-height:120px; padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.3); color:#fff; resize: vertical; }
      .emma-chat-send { padding:10px 14px; border-radius:10px; border:none; cursor:pointer; color:#fff; background: var(--emma-gradient-1); }

      /* Modern Action Cards */
      .emma-actions-modern {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 20px;
      }

      .emma-action-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        text-align: left;
        color: white;
        font-family: inherit;
        font-size: 14px;
      }

      .emma-action-card:hover {
        transform: translateY(-2px);
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(222, 179, 228, 0.3);
        box-shadow: 0 8px 24px rgba(118, 75, 162, 0.2);
      }

      .action-icon {
        font-size: 24px;
        min-width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
      }

      .action-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .action-title {
        font-size: 14px;
        font-weight: 600;
        color: white;
        line-height: 1.2;
      }

      .action-subtitle {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        line-height: 1.3;
      }

      /* Page Analysis Section */
      .emma-page-analysis {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 16px;
        margin-top: 8px;
      }

      .analysis-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .analysis-icon {
        font-size: 16px;
      }

      .analysis-title {
        font-size: 14px;
        font-weight: 600;
        color: white;
      }

      .analysis-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .analysis-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .analysis-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 500;
      }

      .analysis-value {
        font-size: 12px;
        color: rgba(222, 179, 228, 0.9);
        font-weight: 600;
        background: rgba(222, 179, 228, 0.1);
        padding: 4px 8px;
        border-radius: 6px;
      }

      /* Notifications */
      .emma-notification {
        position: fixed;
        top: 24px;
        right: 24px;
        padding: 16px 20px;
        background: rgba(26, 16, 51, 0.95);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 999999;
        animation: slideIn 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      /* Scrollbar Styling */
      .emma-panel-body::-webkit-scrollbar {
        width: 6px;
      }

      .emma-panel-body::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 3px;
      }

      .emma-panel-body::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
      }

      .emma-panel-body::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      /* Status element styling */
      .emma-status.show {
        display: block !important;
        animation: statusFadeIn 0.3s ease;
      }

      @keyframes statusFadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes float {
        0%, 100% {
          transform: translateY(0px) rotate(0deg);
          filter: hue-rotate(0deg);
        }
        50% {
          transform: translateY(-4px) rotate(180deg);
          filter: hue-rotate(30deg);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Autonomous capture from panel
   */
  async function startAutonomousCaptureFromPanel() {
    try {
      const queryEl = document.getElementById('emma-auto-query');
      const btn = document.getElementById('emma-auto-start');
      const progress = document.getElementById('emma-auto-progress');
      const bar = progress?.querySelector('.bar');
      const msg = document.getElementById('emma-auto-msg');
      const query = (queryEl?.value || '').trim();
      if (!query) { showInlineStatus('Please enter what to capture (e.g., posts about mom)'); return; }
      btn && (btn.disabled = true);
      progress && (progress.hidden = false);
      if (bar) bar.style.width = '10%';
      if (msg) msg.textContent = 'Contacting Emma automation…';

      // Check if companion automation service is available
      let useService = false;
      try {
        const status = await chrome.runtime.sendMessage({ action: 'checkAutomationStatus' });
        useService = !!status?.available;
      } catch {}

      if (useService) {
        const res = await chrome.runtime.sendMessage({ action: 'startAutonomousCapture', query, options: { headless: false } });
        if (bar) bar.style.width = '90%';
        if (!res || !res.success) throw new Error(res?.error || 'Automation failed');
        if (bar) bar.style.width = '100%';
        if (msg) msg.textContent = `Captured ${res.count} memories`;
        showInlineStatus(`✅ Captured ${res.count} memories`, true);
      } else {
        // Fallback: run lite automation inside this page (no companion needed)
        if (msg) msg.textContent = 'Running on-page capture (no companion)…';
        const saved = await runLiteAutoCapture(query, (p, m) => {
          if (bar) bar.style.width = `${Math.min(95, p)}%`;
          if (msg) msg.textContent = m || 'Scanning…';
        });
        if (bar) bar.style.width = '100%';
        if (msg) msg.textContent = `Saved ${saved} memories`;
        showInlineStatus(`✅ Saved ${saved} memories`, true);
      }
      setTimeout(() => { progress && (progress.hidden = true); }, 2000);
      queryEl && (queryEl.value = '');
    } catch (e) {
      showInlineStatus(`❌ ${e.message || e}`, false);
    } finally {
      const btn = document.getElementById('emma-auto-start');
      btn && (btn.disabled = false);
    }
  }

  /**
   * On-page lite automation: scroll and extract content without external browser
   */
  async function runLiteAutoCapture(query, onProgress) {
    const host = window.location.hostname;
    const lower = host.toLowerCase();
    if (lower.includes('facebook.com')) {
      return await collectFacebookLite(query, onProgress);
    }
    if (lower.includes('x.com') || lower.includes('twitter.com')) {
      return await collectTwitterLite(query, onProgress);
    }
    if (lower.includes('instagram.com')) {
      return await collectInstagramLite(query, onProgress);
    }
    if (lower.includes('linkedin.com') || lower.includes('reddit.com') || lower.includes('youtube.com')) {
      return await collectGenericSocialLite(query, onProgress);
    }
    if (onProgress) onProgress(0, 'This page is not yet supported for on-page automation');
    return 0;
  }

  function buildKeywordSet(query) {
    // Normalize apostrophes and punctuation, split into terms, add synonyms for robustness
    const normalized = (query || '').toLowerCase().replace(/[’']/g, "'");
    const terms = new Set(normalized.split(/[^a-z0-9]+/g).filter(Boolean));
    // Add synonyms for common intents
    if ([...terms].some(t => t.includes('mom') || t.includes('mother'))) {
      ['mom','mother','mum','mama','mommy','mothers','mother','mothersday','mothers-day','mother-day','mother-s-day']
        .forEach(t => terms.add(t));
    }
    return terms;
  }

  function textMatches(text, keywords) {
    const t = (text || '').toLowerCase();
    for (const k of keywords) { if (k && t.includes(k)) return true; }
    return false;
  }

  async function collectFacebookLite(query, onProgress) {
    const keywords = buildKeywordSet(query);
    const seen = new Set();
    const collected = [];
    const maxIterations = 12; // ~ a few screens
    for (let i = 0; i < maxIterations; i++) {
      const articles = Array.from(document.querySelectorAll('div[role="article"]'));
      for (const art of articles) {
        if (seen.has(art)) continue;
        seen.add(art);
        const rect = art.getBoundingClientRect();
        if (rect.height < 80 || rect.width < 200) continue; // skip tiny cards
        // Extract text
        const textNode = art.querySelector('div[dir="auto"], span[dir="auto"], div[role="paragraph"]');
        const text = (textNode?.innerText || art.innerText || '').trim();
        if (!text) continue;
        if (!textMatches(text, keywords)) continue;
        // Author
        const author = (art.querySelector('h2 strong span, h3 a, h3 span')?.textContent || '').trim();
        // Date/URL
        const timeEl = art.querySelector('a[role="link"][tabindex] abbr, a[role="link"] time');
        const date = timeEl?.getAttribute('title') || timeEl?.textContent || '';
        let url = '';
        const linkEl = art.querySelector('a[role="link"][href*="/posts/"], a[aria-label*="Comment"]');
        if (linkEl && linkEl.href) url = linkEl.href;
        // Images
        const imgs = Array.from(art.querySelectorAll('img[src]')).filter(img => {
          const r = img.getBoundingClientRect();
          return r.width >= 80 && r.height >= 80 && !/s\d{2}(?:-c)?/.test(img.src);
        }).slice(0, 4).map(img => ({ type: 'image', src: img.src }));

        collected.push({ author, text, date, url, images: imgs });
      }
      if (onProgress) onProgress(Math.min(90, Math.round((i+1)/maxIterations*90)), `Scanning… found ${collected.length}`);
      // Scroll further
      window.scrollBy({ top: Math.max(400, window.innerHeight*0.8), behavior: 'smooth' });
      await new Promise(r => setTimeout(r, 900));
    }

    // Save to vault
    let saved = 0;
    for (const post of collected) {
      const title = (post.text || '').slice(0, 60) + ((post.text||'').length>60?'…':'');
      const memory = {
        type: 'social_post',
        platform: 'facebook',
        title: `Facebook: ${title}`,
        content: post.text,
        metadata: { author: post.author || 'Unknown', date: post.date || '', url: post.url || window.location.href },
        attachments: post.images || []
      };
      try {
        // Stage to ephemeral first; user will approve commit to vault in popup
        await chrome.runtime.sendMessage({ action: 'ephemeral.add', data: memory });
        saved++;
      } catch {}
      if (onProgress) onProgress(90 + Math.round((saved/Math.max(1,collected.length))*10), `Saving… ${saved}/${collected.length}`);
    }
    return saved;
  }

  async function collectTwitterLite(query, onProgress) {
    const keywords = buildKeywordSet(query);
    const seen = new Set();
    const collected = [];
    const maxIterations = 12;
    for (let i = 0; i < maxIterations; i++) {
      const articles = Array.from(document.querySelectorAll('article[role="article"]'));
      for (const art of articles) {
        if (seen.has(art)) continue;
        seen.add(art);
        const rect = art.getBoundingClientRect();
        if (rect.height < 80 || rect.width < 200) continue;
        let text = '';
        const textNode = art.querySelector('[data-testid="tweetText"], div[lang]');
        if (textNode) text = (textNode.innerText || '').trim();
        if (!text) continue;
        if (!textMatches(text, keywords)) continue;
        // author
        let author = '';
        const nm = art.querySelector('div[data-testid="User-Name"]');
        if (nm) author = (nm.innerText || '').split('\n')[0];
        // date + url
        let url = '';
        const time = art.querySelector('time');
        const timeLink = time ? time.closest('a[href*="/status/"]') : null;
        if (timeLink && timeLink.href) url = timeLink.href;
        const date = time?.getAttribute('datetime') || time?.textContent || '';
        // images
        const imgs = Array.from(art.querySelectorAll('img[src*="twimg.com"], div[data-testid="tweetPhoto"] img[src]'))
          .filter(img => { const r = img.getBoundingClientRect(); return r.width >= 80 && r.height >= 80; })
          .slice(0, 4)
          .map(img => ({ type: 'image', src: img.src }));
        collected.push({ author, text, date, url, images: imgs });
      }
      if (onProgress) onProgress(Math.min(90, Math.round((i+1)/maxIterations*90)), `Scanning… found ${collected.length}`);
      window.scrollBy({ top: Math.max(400, window.innerHeight*0.8), behavior: 'smooth' });
      await new Promise(r => setTimeout(r, 700));
    }
    // save
    let saved = 0;
    for (const tw of collected) {
      const title = (tw.text || '').slice(0,60) + ((tw.text||'').length>60?'…':'');
      const memory = {
        type: 'social_post',
        platform: 'twitter',
        title: `Tweet: ${title}`,
        content: tw.text,
        metadata: { author: tw.author || 'Unknown', date: tw.date || '', url: tw.url || window.location.href },
        attachments: tw.images || []
      };
      try {
        await chrome.runtime.sendMessage({ action: 'ephemeral.add', data: memory });
        saved++;
      } catch {}
      if (onProgress) onProgress(90 + Math.round((saved/Math.max(1,collected.length))*10), `Saving… ${saved}/${collected.length}`);
    }
    return saved;
  }

  async function collectInstagramLite(query, onProgress) {
    const keywords = buildKeywordSet(query);
    const seen = new Set();
    const collected = [];
    const maxIterations = 10;
    for (let i = 0; i < maxIterations; i++) {
      // grid posts and single-post pages
      const items = Array.from(document.querySelectorAll('article, a[href*="/p/"]')).map(el => el.closest('article') || el);
      for (const item of items) {
        if (!item || seen.has(item)) continue; seen.add(item);
        const rect = item.getBoundingClientRect();
        if (rect.height < 80 || rect.width < 200) continue;
        // caption text
        let text = '';
        const captionNode = item.querySelector('h1, h2, span[dir], div[role="button"][tabindex]');
        if (captionNode) text = (captionNode.innerText || '').trim();
        // alt text often carries caption
        if (!text) {
          const altImg = item.querySelector('img[alt]');
          text = (altImg?.alt || '').trim();
        }
        if (!text || !textMatches(text, keywords)) continue;
        // author
        const author = (document.querySelector('header a[role="link"][href*="/"] span')?.textContent || '').trim();
        // url
        let url = '';
        const link = item.querySelector('a[href*="/p/"]');
        if (link && link.href) url = link.href;
        // images
        const images = Array.from(item.querySelectorAll('img[srcset], img[src]'))
          .filter(img => { const r = img.getBoundingClientRect(); return r.width >= 80 && r.height >= 80; })
          .slice(0, 6)
          .map(img => ({ type: 'image', src: bestImageUrl(img) }));
        collected.push({ author, text, url, images });
      }
      if (onProgress) onProgress(Math.min(90, Math.round((i+1)/maxIterations*90)), `Scanning… found ${collected.length}`);
      window.scrollBy({ top: Math.max(400, window.innerHeight*0.8), behavior: 'smooth' });
      await new Promise(r => setTimeout(r, 900));
    }
    let saved = 0;
    for (const post of collected) {
      const title = (post.text || '').slice(0,60) + ((post.text||'').length>60?'…':'');
      const memory = {
        type: 'social_post',
        platform: 'instagram',
        title: `Instagram: ${title}`,
        content: post.text,
        metadata: { author: post.author || 'Unknown', url: post.url || window.location.href },
        attachments: post.images || []
      };
      try {
        await chrome.runtime.sendMessage({ action: 'ephemeral.add', data: memory });
        saved++;
      } catch {}
      if (onProgress) onProgress(90 + Math.round((saved/Math.max(1,collected.length))*10), `Saving… ${saved}/${collected.length}`);
    }
    return saved;
  }

  function bestImageUrl(img) {
    const srcset = img.getAttribute('srcset');
    if (!srcset) return img.src;
    const parts = srcset.split(',').map(s => s.trim());
    const last = parts[parts.length - 1];
    const url = last?.split(' ')[0];
    return url || img.src;
  }

  async function collectGenericSocialLite(query, onProgress) {
    const keywords = buildKeywordSet(query);
    const seen = new Set();
    const collected = [];
    const maxIterations = 8;
    for (let i = 0; i < maxIterations; i++) {
      const candidates = Array.from(document.querySelectorAll('article, section[role="region"], div[role="article"], li[role="article"]'));
      for (const el of candidates) {
        if (seen.has(el)) continue; seen.add(el);
        const rect = el.getBoundingClientRect();
        if (rect.height < 80 || rect.width < 200) continue;
        const text = (el.innerText || '').trim().slice(0, 1000);
        if (!text || !textMatches(text, keywords)) continue;
        const time = el.querySelector('time');
        const date = time?.getAttribute('datetime') || time?.textContent || '';
        const anchor = el.querySelector('a[href^="http"], a[href^="/"]');
        let url = '';
        if (anchor) url = anchor.href || '';
        const images = Array.from(el.querySelectorAll('img[src]'))
          .filter(img => { const r = img.getBoundingClientRect(); return r.width >= 80 && r.height >= 80; })
          .slice(0, 4)
          .map(img => ({ type: 'image', src: img.src }));
        collected.push({ text, date, url, images });
      }
      if (onProgress) onProgress(Math.min(90, Math.round((i+1)/maxIterations*90)), `Scanning… found ${collected.length}`);
      window.scrollBy({ top: Math.max(400, window.innerHeight*0.8), behavior: 'smooth' });
      await new Promise(r => setTimeout(r, 800));
    }
    let saved = 0;
    const platform = window.location.hostname.replace('www.','');
    for (const item of collected) {
      const title = (item.text || '').slice(0,60) + ((item.text||'').length>60?'…':'');
      const memory = {
        type: 'social_post',
        platform,
        title: `${platform}: ${title}`,
        content: item.text,
        metadata: { date: item.date || '', url: item.url || window.location.href },
        attachments: item.images || []
      };
      try {
        const res = await chrome.runtime.sendMessage({ action: 'ephemeral.add', data: memory });
        if (res?.success) saved++;
      } catch {}
      if (onProgress) onProgress(90 + Math.round((saved/Math.max(1,collected.length))*10), `Saving… ${saved}/${collected.length}`);
    }
    return saved;
  }

  function showInlineStatus(text, success=false) {
    const el = document.querySelector('.emma-status');
    if (!el) return;
    el.textContent = text;
    el.style.display = 'block';
    el.style.background = success ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
    el.style.borderColor = success ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  }

  async function refreshVaultAndAutomationStatus() {
    // Vault
    try {
      const v = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
      const s = document.getElementById('emma-auto-vault');
      if (s) s.textContent = v?.unlocked ? 'Vault: Unlocked' : 'Vault: Locked';
    } catch { const s = document.getElementById('emma-auto-vault'); if (s) s.textContent = 'Vault: Unknown'; }
    // Automation
    try {
      const a = await chrome.runtime.sendMessage({ action: 'checkAutomationStatus' });
      const s2 = document.getElementById('emma-auto-service');
      if (s2) s2.textContent = a?.available ? 'Automation: Connected' : 'Automation: Offline';
    } catch { const s2 = document.getElementById('emma-auto-service'); if (s2) s2.textContent = 'Automation: Offline'; }
  }

  /**
   * Simple chat inside panel backed by memory search for now
   */
  async function sendChatMessage() {
    const input = document.getElementById('emma-chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    appendChat('you', text);
    // search memories via background
    try {
      const res = await chrome.runtime.sendMessage({ action: 'searchMemories', query: text, limit: 5 });
      if (res?.success && res.results?.length) {
        appendChat('emma', `I found ${res.results.length} memories related to that. Showing the most relevant:`);
        res.results.slice(0,3).forEach(m => appendChat('emma', `• ${m.title || (m.content||'').slice(0,60)}…`));
      } else {
        appendChat('emma', "I couldn't find matching memories yet. Try capturing this page or broadening the query.");
      }
    } catch (e) {
      appendChat('emma', 'I had trouble searching your memories just now.');
    }
  }

  function appendChat(sender, text) {
    const container = document.getElementById('emma-chat-messages');
    if (!container) return;
    const row = document.createElement('div');
    row.className = `emma-msg ${sender === 'you' ? 'you' : 'emma'}`;
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = sender === 'you' ? '🙂' : '🧠';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    row.appendChild(avatar);
    row.appendChild(bubble);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  // YOUR ORB IS NOW EMBEDDED ABOVE - NO LOADING NEEDED!

  /**
   * Force beautiful gradient fallback (no brain emoji!)
   */
  function forceOrbFallback() {
    const floatingOrb = document.getElementById('emma-float-orb');
    const panelOrb = document.getElementById('emma-panel-orb');

    if (floatingOrb) {
      floatingOrb.innerHTML = '<div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #deb3e4 100%); border-radius: 50%; box-shadow: 0 4px 16px rgba(118, 75, 162, 0.4); animation: float 3s ease-in-out infinite;"></div>';
    }

    if (panelOrb) {
      panelOrb.innerHTML = '<div style="width: 48px; height: 48px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #deb3e4 100%); border-radius: 50%; box-shadow: 0 4px 16px rgba(118, 75, 162, 0.4); animation: float 3s ease-in-out infinite;"></div>';
    }

  }

  /**
   * Initialize floating orb - EXACT copy of dashboard orb
   */
  function initializeFloatingOrb() {

    const orbContainer = document.getElementById('emma-float-orb');    if (!orbContainer) {
      console.error('❌ NO ORB CONTAINER FOUND!');
      return;
    }

    if (!window.EmmaOrb) {
      console.error('❌ NO EMMA ORB CLASS FOUND! Using fallback.');
      orbContainer.innerHTML = '<div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #deb3e4 100%); border-radius: 50%; box-shadow: 0 4px 16px rgba(118, 75, 162, 0.4); animation: float 3s ease-in-out infinite;"></div>';
      return;
    }

    try {
      // CLEAR any existing content first!
      orbContainer.innerHTML = '';

      window.emmaFloatingOrbInstance = new EmmaOrb(orbContainer, {
        hue: 0,
        hoverIntensity: 0.5,
        rotateOnHover: true,
        forceHoverState: false
      });    } catch (error) {
      console.error('💥 FAILED TO CREATE YOUR ORB:', error);
      console.error('Error stack:', error.stack);
      // Beautiful gradient fallback
      orbContainer.innerHTML = '<div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #deb3e4 100%); border-radius: 50%; box-shadow: 0 4px 16px rgba(118, 75, 162, 0.4); animation: float 3s ease-in-out infinite;"></div>';
    }
  }

  /**
   * Initialize panel header orb - EXACT copy of dashboard orb
   */
  function initializePanelOrb() {
    const orbContainer = document.getElementById('emma-panel-orb');

    if (orbContainer && window.EmmaOrb) {
      try {
        // CLEAR any existing content first!
        orbContainer.innerHTML = '';

        // Use YOUR EXACT orb settings!
        window.emmaPanelOrbInstance = new EmmaOrb(orbContainer, {
          hue: 0,
          hoverIntensity: 0.5,
          rotateOnHover: true,
          forceHoverState: false
        });

      } catch (error) {
        console.warn('Failed to initialize panel orb:', error);
        // Beautiful gradient fallback (NO BRAIN EMOJI!)
        orbContainer.innerHTML = '<div style="width: 56px; height: 56px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #deb3e4 100%); border-radius: 50%; box-shadow: 0 4px 16px rgba(118, 75, 162, 0.4); animation: float 3s ease-in-out infinite;"></div>';
      }
    } else if (orbContainer) {
      // Beautiful gradient fallback (NO BRAIN EMOJI!)
      orbContainer.innerHTML = '<div style="width: 56px; height: 56px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #deb3e4 100%); border-radius: 50%; box-shadow: 0 4px 16px rgba(118, 75, 162, 0.4); animation: float 3s ease-in-out infinite;"></div>';
    }
  }

  /**
   * Update page analysis section
   */
  async function updatePageAnalysis() {
    try {
      if (emmaEngine) {
        const analysis = await emmaEngine.analyze();
        const typeElement = document.getElementById('page-type');
        const confidenceElement = document.getElementById('page-confidence');

        if (typeElement) {
          typeElement.textContent = analysis.type || 'webpage';
        }
        if (confidenceElement) {
          confidenceElement.textContent = Math.round((analysis.confidence || 0.8) * 100) + '%';
        }
      }
    } catch (error) {
      console.warn('Failed to update page analysis:', error);
    }
  }

  /**
   * Toggle Emma panel
   */
  function toggleEmmaPanel() {
    const panel = document.getElementById('emma-panel');
    if (panel.classList.contains('emma-panel-hidden')) {
      showEmmaPanel();
    } else {
      hideEmmaPanel();
    }
  }

  /**
   * Detect page context and generate appropriate actions
   */
  function detectPageContext() {
    const url = window.location.href;
    const hostname = window.location.hostname;
    const title = document.title.toLowerCase();

    // Google Photos detection
    if (hostname.includes('photos.google.com')) {
      // More comprehensive selectors for Google Photos, excluding small thumbnails and UI elements
      // Use UNIFIED function to ensure exact same behavior as collection
      const sizedPhotos = getGooglePhotosElements();

      console.log('🔍 DETECTION: Using UNIFIED getGooglePhotosElements() function');

      console.log('🔍 DETECTION: Emma Context Detection (UNIFIED):', {
        sizedPhotos: sizedPhotos.length,
        sampleUrls: Array.from(sizedPhotos).slice(0, 3).map(img => img.src?.substring(0, 80) + '...')
      });

      const videos = document.querySelectorAll('video, [data-video-id]');

      // Also check for lazy-loaded images that might not be visible yet
      const lazyImages = document.querySelectorAll('[data-src*="googleusercontent.com"], [data-src*="photos.google.com"]');

      // For Google Photos, also try more general selectors as fallback
      const fallbackPhotos = document.querySelectorAll(`
        img[src*="googleusercontent.com"],
        img[src*="photos.google.com"],
        img[src*="ggpht.com"],
        img[role="img"],
        [data-photo] img,
        [data-item] img,
        .photo img,
        .item img
      `);

      // Also try to detect from elements that might contain photo data
      const photoContainers = document.querySelectorAll('[data-photo-url], [data-item-url], [style*="background-image"]');

      console.log('Emma Fallback Detection:', {
        fallbackCount: fallbackPhotos.length,
        photoContainers: photoContainers.length,
        fallbackSample: Array.from(fallbackPhotos).slice(0, 3).map(img => img.src?.substring(0, 80) + '...')
      });

      const totalMediaCount = Math.max(
        sizedPhotos.length + videos.length,
        fallbackPhotos.length,
        photoContainers.length
      );

      // Try to get a more accurate count from Google Photos UI elements
      const photoCounterElements = document.querySelectorAll('[aria-label*="photo"], [aria-label*="item"], .photo-count, .item-count');
      let detectedCount = totalMediaCount;

      // Look for any element that might indicate the total count
      photoCounterElements.forEach(el => {
        const text = el.textContent || el.getAttribute('aria-label') || '';
        const match = text.match(/(\d+)\s*(photo|item|image)/i);
        if (match && parseInt(match[1]) > detectedCount) {
          detectedCount = parseInt(match[1]);
        }
      });

      return {
        type: 'photo_gallery',
        platform: 'google_photos',
        mediaCount: Math.max(totalMediaCount, detectedCount),
        actualVisibleCount: sizedPhotos.length + videos.length,
        title: document.title,
        isAlbum: (
          url.includes('/album/') ||
          url.includes('/shared/') ||
          document.querySelector('[data-album-id]') ||
          title.includes('album') ||
          title.toLowerCase().includes('trip') ||
          document.querySelector('[data-sharing-id]') ||
          document.querySelector('[jsname="GbQqNe"]') ||
          document.querySelector('[data-latest-bg]')
        ),
        isPhotoView: url.includes('/photo/') || document.querySelector('[data-photo-id]')
      };
    }

    // Instagram detection
    if (hostname.includes('instagram.com')) {
      const images = document.querySelectorAll('img[alt]');
      return {
        type: 'social_media',
        platform: 'instagram',
        mediaCount: images.length,
        isProfile: url.includes('instagram.com/') && !url.includes('/p/'),
        isPost: url.includes('/p/')
      };
    }

    // Twitter/X detection
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      const images = document.querySelectorAll('[data-testid="tweetPhoto"], img[alt*="Image"]');
      return {
        type: 'social_media',
        platform: 'twitter',
        mediaCount: images.length,
        isTweet: url.includes('/status/')
      };
    }

    // Facebook detection
    if (hostname.includes('facebook.com')) {
      const images = document.querySelectorAll('[role="img"], img[src*="fbcdn"]');
      return {
        type: 'social_media',
        platform: 'facebook',
        mediaCount: images.length
      };
    }

    // Generic image gallery detection
    const allImages = document.querySelectorAll('img');
    const allVideos = document.querySelectorAll('video');
    const mediaCount = allImages.length + allVideos.length;

    if (mediaCount > 5) {
      return {
        type: 'media_rich',
        platform: 'generic',
        mediaCount: mediaCount,
        hasGallery: !!document.querySelector('[class*="gallery"], [class*="slideshow"], [class*="carousel"]')
      };
    }

    return {
      type: 'general',
      platform: 'generic',
      mediaCount: mediaCount
    };
  }

  /**
   * Generate dynamic actions based on page context
   */
  function generateDynamicActions(context) {
    const actions = [];

    if (context.type === 'photo_gallery' && context.platform === 'google_photos') {
      // Google Photos specific actions
      // Show "Save All Photos" if it's an album OR if we detect any photos (including fallback detection)
      if (context.isAlbum || context.mediaCount > 0) {
        const photoText = context.mediaCount > 0 ? context.mediaCount : 'available';
        actions.push({
          id: 'save-all-photos',
          icon: '📁',
          title: 'Save All Photos',
          subtitle: `Capture all ${photoText} photos from this page`,
          action: 'batch-save-photos'
        });
      }

      actions.push({
        id: 'select-photos',
        icon: '🎯',
        title: 'Select Individual Photos',
        subtitle: 'Choose specific photos to save',
        action: 'individual-select'
      });

      if (context.isPhotoView) {
        actions.push({
          id: 'save-current-photo',
          icon: '📸',
          title: 'Save Current Photo',
          subtitle: 'Save this photo to memory vault',
          action: 'save-current'
        });
      }
    } else if (context.type === 'social_media') {
      actions.push({
        id: 'save-post',
        icon: '💾',
        title: 'Save Post',
        subtitle: `Save this ${context.platform} post`,
        action: 'save-social-post'
      });

      if (context.mediaCount > 1) {
        actions.push({
          id: 'save-all-media',
          icon: '📱',
          title: 'Save All Media',
          subtitle: `Save all ${context.mediaCount} images/videos`,
          action: 'batch-save-media'
        });
      }
    } else if (context.type === 'media_rich') {
      actions.push({
        id: 'batch-import',
        icon: '🖼️',
        title: 'Import All Media',
        subtitle: `Found ${context.mediaCount} images/videos`,
        action: 'batch-import-all'
      });
    }

    // Always include these universal actions
    actions.push({
      id: 'capture-page',
      icon: '📄',
      title: 'Capture Page',
      subtitle: 'Save entire page content',
      action: 'capture'
    });

    actions.push({
      id: 'save-selection',
      icon: '✂️',
      title: 'Save Selection',
      subtitle: 'Capture selected content',
      action: 'selection'
    });

    actions.push({
      id: 'search-memories',
      icon: '🔍',
      title: 'Search Memories',
      subtitle: 'Find your saved content',
      action: 'search'
    });

    return actions;
  }

  /**
   * Populate actions in the panel
   */
  function populateDynamicActions(actions) {
    const actionsContainer = document.getElementById('emma-dynamic-actions');
    if (!actionsContainer) {
      console.warn('Emma: Actions container not found');
      return;
    }

    actionsContainer.innerHTML = actions.map(action => `
      <button class="emma-action-card" data-action="${action.action}">
        <div class="action-icon">${action.icon}</div>
        <div class="action-content">
          <span class="action-title">${action.title}</span>
          <span class="action-subtitle">${action.subtitle}</span>
        </div>
      </button>
    `).join('');

    // Remove any existing event listeners to prevent duplicates
    actionsContainer.removeEventListener('click', handleDynamicActionClick);

    // Add event listener with proper delegation
    actionsContainer.addEventListener('click', handleDynamicActionClick);

  }

  /**
   * Handle clicks on dynamic action buttons with proper event delegation
   */
  function handleDynamicActionClick(event) {

    // Find the button element (event might be on a child element)
    let button = event.target;
    while (button && !button.dataset.action) {
      button = button.parentElement;
      if (button === event.currentTarget) break; // Don't go beyond the container
    }

    if (!button || !button.dataset.action) {
      console.warn('Emma: No action found for clicked element');
      return;
    }

    // Create a synthetic event that handleActionButton expects
    const syntheticEvent = {
      currentTarget: button,
      target: button,
      preventDefault: () => {},
      stopPropagation: () => {}
    };

    handleActionButton(syntheticEvent);
  }

  /**
   * Show Emma panel
   */
  async function showEmmaPanel() {
    const panel = document.getElementById('emma-panel');
    if (!panel) {
      console.warn('Emma: Panel element not found');
      return;
    }
    panel.classList.remove('emma-panel-hidden');

    // Detect page context and populate dynamic actions
    const context = detectPageContext();
    const actions = generateDynamicActions(context);
    populateDynamicActions(actions);

    // Show page analysis
    const analysisDiv = panel.querySelector('#emma-analysis-section .analysis-content');
    if (!analysisDiv) {
      console.warn('Emma: Analysis section not found in panel');
      return;
    }

    try {
      const analysis = await emmaEngine.analyze();
      analysisDiv.innerHTML = `
      <div style="padding: 12px; background: rgba(111, 99, 217, 0.1); border: 1px solid rgba(111, 99, 217, 0.3); border-radius: 12px; font-size: 13px; color: white;">
        <strong style="color: #a78bfa;">Page Analysis:</strong><br>
        <div style="margin-top: 8px; line-height: 1.4;">
          Type: <span style="color: #c4b5fd;">${context.type}</span> (${context.platform})<br>
          Media Found: <span style="color: #c4b5fd;">${context.mediaCount}</span> items<br>
          Confidence: <span style="color: #c4b5fd;">${(analysis.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>
    `;
    } catch (error) {
      console.warn('Emma: Error updating analysis panel:', error);
      analysisDiv.innerHTML = `
      <div style="padding: 12px; background: rgba(111, 99, 217, 0.1); border: 1px solid rgba(111, 99, 217, 0.3); border-radius: 12px; font-size: 13px; color: white;">
        <strong style="color: #a78bfa;">Page Analysis:</strong><br>
        <div style="margin-top: 8px; line-height: 1.4;">
          Type: <span style="color: #c4b5fd;">${context.type}</span> (${context.platform})<br>
          Media Found: <span style="color: #c4b5fd;">${context.mediaCount}</span> items<br>
          Analysis: <span style="color: #fbbf24;">Temporarily unavailable</span>
        </div>
      </div>
      `;
    }
  }

  /**
   * Hide Emma panel
   */
  function hideEmmaPanel() {
    const panel = document.getElementById('emma-panel');
    if (!panel) {
      console.warn('Emma: Panel element not found');
      return;
    }
    panel.classList.add('emma-panel-hidden');
  }

  /**
   * Handle action button clicks
   */
  async function handleActionButton(event) {
    const action = event.currentTarget.dataset.action;
    const statusDiv = document.querySelector('.emma-status');

    switch (action) {
      case 'capture':
        updateStatus('Capturing page content...');

        try {
          const result = await captureContent({ userTriggered: true, force: true });

          if (result.success) {
            updateStatus(`✅ Captured ${result.count} memories`);
          } else {
            updateStatus('❌ ' + (result.message || 'Capture failed'));
          }

          // Hide status after 3 seconds
          setTimeout(() => {
            if (statusDiv) {
              statusDiv.classList.remove('show');
              setTimeout(() => {
                if (statusDiv) {
                  statusDiv.style.display = 'none';
                }
              }, 300);
            }
          }, 3000);
        } catch (error) {
          console.error('Emma: Capture action failed:', error);
          updateStatus('❌ Capture failed: ' + error.message);
          setTimeout(() => {
            if (statusDiv) {
              statusDiv.classList.remove('show');
              statusDiv.style.display = 'none';
            }
          }, 3000);
        }
        break;

      case 'selection':
        const selection = window.getSelection().toString();
        if (selection.length > 10) {
          updateStatus('Saving selection...');
          try {
            const selResult = await captureSelection();
            updateStatus(selResult.success ? '✅ Selection saved!' : '❌ Failed to save selection');
            showNotification(selResult.success ? 'Selection saved!' : 'Failed to save');
            setTimeout(() => {
              if (statusDiv) {
                statusDiv.style.display = 'none';
              }
            }, 2000);
          } catch (error) {
            updateStatus('❌ Selection save failed');
            showNotification('Failed to save selection');
            setTimeout(() => {
              if (statusDiv) {
                statusDiv.style.display = 'none';
              }
            }, 2000);
          }
        } else {
          updateStatus('⚠️ Please select some text first');
          showNotification('Please select some text first');
          setTimeout(() => {
            if (statusDiv) {
              statusDiv.style.display = 'none';
            }
          }, 2000);
        }
        break;

      case 'search':
        updateStatus('Opening memory gallery...');
        try {
          chrome.runtime.sendMessage({ action: 'openMemoryGallery' });
          setTimeout(() => {
            if (statusDiv) {
              statusDiv.style.display = 'none';
            }
          }, 1000);
        } catch (error) {
          updateStatus('❌ Failed to open gallery');
          setTimeout(() => {
            if (statusDiv) {
              statusDiv.style.display = 'none';
            }
          }, 2000);
        }
        break;

      case 'batch-save-photos':
        updateStatus('🎨 Preparing to capture all visual content...');
        try {
          // Vault-first: ensure vault is initialized and unlocked
          try {
            const vs = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
            if (!vs || !vs.success || !vs.initialized) {
              updateStatus('🔐 Please complete vault setup in the Emma popup');
              await chrome.runtime.sendMessage({ action: 'open.popup' });
              break;
            }
            if (!vs.isUnlocked) {
              updateStatus('🔒 Vault is locked — please unlock to save');
              await chrome.runtime.sendMessage({ action: 'open.popup' });
              break;
            }
          } catch {
            await chrome.runtime.sendMessage({ action: 'open.popup' });
            break;
          }

          // Load the render capture engine
          if (!window.RenderCaptureEngine) {

            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('js/render-capture-engine.js');
            document.head.appendChild(script);
            await new Promise(resolve => {
              script.onload = resolve;
              setTimeout(resolve, 1000);
            });
          }

          if (window.RenderCaptureEngine) {
            const engine = new window.RenderCaptureEngine();
            const media = await engine.captureAllVisualMedia();

            if (media.length > 0) {

              updateStatus(`🎨 Processing ${media.length} items...`);

              // Create contextual memory
              const memory = await engine.createContextualMemory(media);

              // Save to vault
              const saveResult = await chrome.runtime.sendMessage({
                action: 'ephemeral.add',
                data: memory
              });

              if (saveResult.success) {
                updateStatus(`✅ Saved ${media.length} visual items to memory vault!`);
                showNotification(`Successfully captured ${media.length} items! Check your memories.`, 4000);
                setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 4000);

                // Refresh memories page if open
                try {
                  chrome.runtime.sendMessage({ action: 'memories.refresh' });
                } catch {}

                break;
              } else {
                // Vault save failed - prompt user to unlock vault

                if (saveResult.error && saveResult.error.includes('vault is locked')) {
                  updateStatus('🔒 Vault is locked');
                  showNotification('Please unlock your vault to save memories', 3000);

                  // Open Emma popup to unlock vault
                  setTimeout(() => {
                    chrome.runtime.sendMessage({ action: 'open.popup' });
                  }, 1000);
                } else {
                  updateStatus(`❌ Failed to save: ${saveResult.error || 'Unknown error'}`);
                  showNotification(`Failed to save: ${saveResult.error || 'Unknown error'}`, 4000);
                }

                setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 4000);
                break;
              }
            }
          }

          // Fallback to previous screenshot-based method

          // Use direct implementation instead of loading external script
          updateStatus('📸 Finding photos on page...');

          // Find all photos on the page
          const photos = [];
          let images;

          // For Google Photos, use specific selectors
          if (window.location.hostname.includes('photos.google.com')) {
            // First, get ALL images on the page
            const allImages = document.querySelectorAll('img');

            // Filter for actual photos
            const photoImages = [];
            allImages.forEach(img => {
              const src = img.src || img.dataset.src || '';
              const rect = img.getBoundingClientRect();

              // Check if it's a Google Photos image
              if (src && (
                src.includes('googleusercontent.com') ||
                src.includes('lh3.google') ||
                src.includes('gstatic.com')
              )) {
                // Check if it's a reasonable size for a photo
                if (rect.width > 50 && rect.height > 50) {
                  photoImages.push(img);
                  console.log(`📸 Found photo: ${src.substring(0, 60)}... (${Math.round(rect.width)}x${Math.round(rect.height)})`);
                }
              }
            });

            images = photoImages;

          } else {
            images = document.querySelectorAll('img');
          }

          const minSize = 100;
          const seenSources = new Set(); // Avoid duplicates

          images.forEach((img, index) => {
            const rect = img.getBoundingClientRect();
            const src = img.src || img.dataset.src || '';

            // Skip if already processed this source
            if (seenSources.has(src)) return;

            // Filter criteria
            if (rect.width < minSize || rect.height < minSize) return;
            if (rect.width === 0 || rect.height === 0) return;

            // For now, capture all photos regardless of viewport position
            // We'll handle scrolling later

            // Check if likely a photo (especially for Google Photos)
            const isLikelyPhoto =
              src.includes('googleusercontent.com') ||
              src.includes('gstatic.com') ||
              src.includes('photos.google.com') ||
              (rect.width > 150 && rect.height > 150);

            if (isLikelyPhoto && src) {
              seenSources.add(src);
              photos.push({
                src: src,
                rect: {
                  x: rect.left,
                  y: rect.top,
                  width: rect.width,
                  height: rect.height
                },
                index: index
              });
              console.log(`📸 Found photo ${photos.length}:`, src.substring(0, 80) + '...');
            }
          });

          if (photos.length === 0) {

            // Don't throw here, let it continue to try other methods
          } else {
            updateStatus(`📸 Capturing ${photos.length} photos...`);

            // Group photos by viewport for efficient capture
          const viewportHeight = window.innerHeight;
          const photoGroups = [];
          let currentGroup = null;

          // Sort by vertical position
          const sorted = [...photos].sort((a, b) =>
            (a.rect.y + window.scrollY) - (b.rect.y + window.scrollY)
          );

          sorted.forEach(photo => {
            const photoTop = photo.rect.y + window.scrollY;

            if (!currentGroup ||
                photoTop - currentGroup.scrollTop > viewportHeight * 0.8) {
              currentGroup = {
                scrollTop: Math.max(0, photoTop - 100),
                photos: []
              };
              photoGroups.push(currentGroup);
            }

            currentGroup.photos.push(photo);
          });

          const capturedPhotos = [];
          let captureCount = 0;

          // Process each group
          for (const group of photoGroups) {
            if (capturedPhotos.length >= 50) break;

            // Scroll to position
            if (group.scrollTop !== window.scrollY) {
              window.scrollTo(0, group.scrollTop);
              await new Promise(resolve => setTimeout(resolve, 800));
            }

            // Request screenshot from background

            const screenshotResponse = await chrome.runtime.sendMessage({
              action: 'captureAndProcessPhotos',
              photos: group.photos.map(p => ({
                rect: {
                  x: p.rect.x,
                  y: p.rect.y - window.scrollY, // Adjust for current scroll
                  width: p.rect.width,
                  height: p.rect.height
                },
                src: p.src
              }))
            });

            if (screenshotResponse && screenshotResponse.success && screenshotResponse.photos && screenshotResponse.photos.length > 0) {
              capturedPhotos.push(...screenshotResponse.photos);
              captureCount += screenshotResponse.photos.length;

              updateStatus(`📸 Captured ${captureCount} photos...`);
            } else {

            }
          }

          if (capturedPhotos.length > 0) {
            updateStatus(`💾 Saving ${capturedPhotos.length} photos to vault...`);

            // Create memory capsule with photos
            const saveResponse = await chrome.runtime.sendMessage({
              action: 'savePhotoMemory',
              photos: capturedPhotos,
              metadata: {
                url: window.location.href,
                title: document.title,
                photoCount: capturedPhotos.length
              }
            });

            const captureResult = {
              success: true,
              count: capturedPhotos.length,
              capsuleId: saveResponse?.memoryId
            };

            updateStatus(`✅ Saved ${captureResult.count} photos to your memory vault!`);

            // Show success notification
            showNotification(`Successfully captured ${captureResult.count} photos! Check your memories.`, 4000);
            setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 4000);
            break;
          } else {

          }
          } // Close the else block for photos.length > 0

          // If no photos found with screenshot method, try Google Photos specific capture
          if (window.location.hostname.includes('photos.google.com')) {

            // Load Google Photos capture module
            if (!window.GooglePhotosCapture) {
              const script = document.createElement('script');
              script.src = chrome.runtime.getURL('js/google-photos-capture.js');
              document.head.appendChild(script);
              await new Promise(resolve => {
                script.onload = resolve;
                setTimeout(resolve, 1000);
              });
            }

            if (window.GooglePhotosCapture) {
              const gpc = new window.GooglePhotosCapture();
              const photos = gpc.findAllPhotos();

              if (photos.length > 0) {

                updateStatus(`📸 Processing ${photos.length} photos...`);

                // Convert to Emma format and send to background
                const emmaFormat = gpc.toEmmaFormat(photos);
                const result = await chrome.runtime.sendMessage({
                  action: 'media.batchImport',
                  pageUrl: window.location.href,
                  elements: emmaFormat
                });

                if (result.success) {
                  updateStatus(`✅ Saved ${result.imported || photos.length} photos!`);
                  showNotification(`Successfully saved ${result.imported || photos.length} photos!`, 4000);
                  setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 4000);
                  break;
                }
              }
            }
          }

          // Use universal media capture for all sites
          const result = await chrome.runtime.sendMessage({
            action: 'media.batchImport',
            pageUrl: window.location.href,
            source: 'universal_page_media',
            useUniversalCapture: true,
            qualityThreshold: 1, // Lower threshold to capture more media
            maxElements: 100
          });

          if (result && result.success) {
            const count = result.importCount || result.count || (result.elements && result.elements.length) || 0;
            if (count > 0) {
              updateStatus(`✅ Saved ${count} high-quality media items to memory vault`);
              if (result.summary) {

              }
            } else {
              updateStatus('⚠️ No high-quality media found on this page');
            }
          } else {
            const errorMsg = result?.error || result?.message || 'Unknown error';
            updateStatus('❌ Failed to save media: ' + errorMsg);
            console.error('🔍 BATCH-SAVE: Universal save failed:', result);

            // Show partial success if any imports worked
            if (result?.results && result.results.length > 0) {
              const successCount = result.results.filter(r => r.success).length;
              if (successCount > 0) {
                updateStatus(`⚠️ Partial success: ${successCount}/${result.results.length} items saved. Error: ${errorMsg}`);
              }
            }
          }
          setTimeout(() => {
            if (statusDiv) {
              statusDiv.style.display = 'none';
            }
          }, 3000);
        } catch (error) {
          console.error('Emma: Batch save photos failed:', error);
          updateStatus('❌ Failed to save photos: ' + error.message);
          setTimeout(() => {
            if (statusDiv) {
              statusDiv.style.display = 'none';
            }
          }, 2000);
        }
        break;

      case 'individual-select':
        updateStatus('Activating photo selection mode...');
        activatePhotoSelectionMode();
        setTimeout(() => {
          if (statusDiv) {
            statusDiv.style.display = 'none';
          }
        }, 2000);
        break;

      case 'save-current':
        updateStatus('Saving current photo...');
        try {
          // Pick the largest visible media element as the current photo (works for Google Photos and others)
          const candidates = Array.from(document.querySelectorAll('img, video, canvas'))
            .filter(el => {
              const r = el.getBoundingClientRect();
              return r.width > 40 && r.height > 40 && r.top < window.innerHeight && r.left < window.innerWidth;
            });
          let target = null, maxArea = 0;
          for (const el of candidates) {
            const r = el.getBoundingClientRect();
            const area = r.width * r.height;
            if (area > maxArea) { maxArea = area; target = el; }
          }

          if (!target) {
            updateStatus('❌ No photo found to save');
            setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 2000);
            break;
          }

          // Try high-quality URL import first when available
          let src = target.currentSrc || target.src;
          // Attempt to upgrade common Google Photos URLs
          try {
            if (src && /googleusercontent\.com|photos\.google\.com/.test(new URL(src, location.href).hostname)) {
              src = src.replace(/=s(\d+)(?=[^0-9]|$)/g, '=s4096')
                       .replace(/w\d+-h\d+/g, 'w4096-h4096')
                       .replace(/=w\d+-h\d+-no/g, '=w4096-h4096-no');
            }
          } catch {}
          let result = null;
          if (src && !String(src).startsWith('data:')) {
            result = await chrome.runtime.sendMessage({
              action: 'media.importFromUrl',
              url: src,
              pageUrl: window.location.href,
              mediaType: (target.tagName.toLowerCase() === 'video') ? 'video' : 'image'
            });
          }

          // Fallback to precise screenshot crop if URL import failed
          if (!result || !result.success) {
            const rect = target.getBoundingClientRect();
            result = await chrome.runtime.sendMessage({
              action: 'media.captureElement',
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              dpr: window.devicePixelRatio,
              pageUrl: window.location.href,
              elementSelector: target.tagName.toLowerCase()
            });
          }

          if (result && result.success) {
            updateStatus('✅ Photo saved to memory vault');
          } else {
            const reason = (result && result.error) ? `: ${result.error}` : '';
            updateStatus(`❌ Failed to save photo${reason}`);
          }
          setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 3000);
        } catch (error) {
          console.error('Emma: Save current photo failed:', error);
          updateStatus(`❌ Failed to save photo: ${error.message || 'Unknown error'}`);
          setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 2000);
        }
        break;

        case 'save-social-post':
          updateStatus('Saving social media post...');
          try {
            const result = await captureContent({ userTriggered: true, force: true });
            if (result && result.success) {
              const att = result.attachmentsAdded ? ` (+${result.attachmentsAdded} media)` : '';
              updateStatus(`✅ Saved ${result.count} item(s)${att}`);
            } else {
              updateStatus('❌ Failed to save post');
            }
            setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 2500);
          } catch (error) {
            console.error('Emma: Save social post failed:', error);
            updateStatus('❌ Failed to save post');
            setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 2000);
          }
          break;

      case 'batch-save-media':
      case 'batch-import-all':
        updateStatus('🔍 Scanning page for media...');
        try {
          // Step 1: Find all media elements on the page
          const mediaElements = Array.from(document.querySelectorAll('img, video'))
            .filter(el => {
              try {
                const rect = el.getBoundingClientRect();
                const src = el.currentSrc || el.src;

                // Quality filters
                return (
                  src && src.startsWith('http') && // Has valid URL
                  rect.width >= 100 && rect.height >= 100 && // Minimum size
                  !src.includes('avatar') && !src.includes('icon') && // Skip UI elements
                  !src.includes('loading') && !src.includes('placeholder') // Skip placeholders
                );
              } catch {
                return false;
              }
            })
            .slice(0, 50) // Safety limit
            .map(el => {
              const rect = el.getBoundingClientRect();
              return {
                url: el.currentSrc || el.src,
                type: el.tagName.toLowerCase() === 'img' ? 'image' : 'video',
                alt: el.alt || '',
                width: el.naturalWidth || el.videoWidth || rect.width,
                height: el.naturalHeight || el.videoHeight || rect.height,
                selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ')[0] : '')
              };
            });

          if (mediaElements.length === 0) {
            updateStatus('❌ No suitable media found on this page');
            setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 3000);
            break;
          }

          // Step 2: Send to background for processing
          updateStatus(`📥 Importing ${mediaElements.length} media items...`);

          const result = await chrome.runtime.sendMessage({
            action: 'media.batchImport',
            pageUrl: window.location.href,
            elements: mediaElements,
            qualityThreshold: 0.5,
            maxElements: 50
          });

          if (result.success) {
            updateStatus(`✅ Imported ${result.processed || result.attachments || mediaElements.length} media items`);
          } else {
            updateStatus('❌ Failed to import media: ' + (result.error || 'Unknown error'));
          }
          setTimeout(() => {
            if (statusDiv) {
              statusDiv.style.display = 'none';
            }
          }, 3000);
        } catch (error) {
          console.error('Emma: Batch import failed:', error);

          // Handle specific error types
          let errorMessage = 'Failed to import media';
          if (error.message?.includes('Extension context invalidated')) {
            errorMessage = 'Extension reloaded - please refresh page (F5)';
          } else if (error.message?.includes('Receiving end does not exist')) {
            errorMessage = 'Extension connection lost - please refresh page (F5)';
          } else if (error.message) {
            errorMessage = `Failed: ${error.message}`;
          }

          updateStatus(`❌ ${errorMessage}`);
          setTimeout(() => {
            if (statusDiv) {
              statusDiv.style.display = 'none';
            }
          }, 5000); // Longer timeout for error messages
        }
        break;
    }
  }

  /**
   * Scroll to load all photos in Google Photos (handles lazy loading)
   */
  async function scrollToLoadAllPhotos() {
    return new Promise(resolve => {
      let previousImageCount = 0;
      let stableCount = 0;
      const maxScrollAttempts = 30; // Aggressive to load big albums
      let scrollAttempts = 0;
      const limiter = createRateLimiter(400); // avoid too-frequent scrolls

      const checkAndScroll = () => {
        if (!limiter.canCall()) { setTimeout(checkAndScroll, 100); return; }
        // Check both Google Photos URLs and any visible images
        const googleImages = document.querySelectorAll('img[src*="googleusercontent.com"], img[src*="photos.google.com"]');
        const visibleImages = Array.from(document.querySelectorAll('img')).filter(img => {
          const rect = img.getBoundingClientRect();
          return rect.width > 32 && rect.height > 32;
        });

        const currentImageCount = Math.max(googleImages.length, visibleImages.length);
        EmmaLog.debug(`Emma: scroll attempt ${scrollAttempts + 1} (GP:${googleImages.length}/vis:${visibleImages.length})`);

        if (currentImageCount === previousImageCount) {
          stableCount++;
        } else {
          stableCount = 0;
          previousImageCount = currentImageCount;
        }

        // If count is stable for 3 iterations or we've tried enough times, we're done
        if (stableCount >= 3 || scrollAttempts >= maxScrollAttempts) {
          EmmaLog.debug(`Emma: scroll complete (${scrollAttempts}) final:${currentImageCount}`);
          resolve();
          return;
        }

        // Try multiple scroll strategies
        if (scrollAttempts % 3 === 0) {
          // Scroll to bottom
          window.scrollTo(0, document.body.scrollHeight);
        } else if (scrollAttempts % 3 === 1) {
          // Scroll down by viewport height
          window.scrollBy(0, window.innerHeight);
        } else {
          // Scroll to specific position
          window.scrollTo(0, scrollAttempts * window.innerHeight);
        }

        scrollAttempts++;

        // Wait a bit for images to load, then check again
        setTimeout(checkAndScroll, 600); // Faster polling
      };

      checkAndScroll();
    });
  }

  /**
   * Activate photo selection mode for individual photo selection
   */
  function activatePhotoSelectionMode() {
    // Add selection overlay styles if not already present
    if (!document.getElementById('emma-selection-styles')) {
      const styles = document.createElement('style');
      styles.id = 'emma-selection-styles';
      styles.textContent = `
        .emma-photo-selectable {
          cursor: pointer !important;
          transition: all 0.3s ease !important;
          position: relative !important;
        }
        .emma-photo-selectable:hover {
          transform: scale(1.05) !important;
          box-shadow: 0 8px 25px rgba(111, 99, 217, 0.3) !important;
          border: 3px solid #6f63d9 !important;
        }
        .emma-photo-selected {
          border: 3px solid #10b981 !important;
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4) !important;
        }
        .emma-photo-selected::after {
          content: '✓';
          position: absolute !important;
          top: 10px !important;
          right: 10px !important;
          background: #10b981 !important;
          color: white !important;
          border-radius: 50% !important;
          width: 30px !important;
          height: 30px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 18px !important;
          font-weight: bold !important;
          z-index: 1000 !important;
        }
        .emma-selection-panel {
          position: fixed !important;
          bottom: 20px !important;
          right: 20px !important;
          background: rgba(20, 20, 30, 0.95) !important;
          backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(111, 99, 217, 0.3) !important;
          border-radius: 16px !important;
          padding: 20px !important;
          color: white !important;
          z-index: 10000 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important;
          min-width: 250px !important;
        }
        .emma-selection-counter {
          font-size: 14px !important;
          margin-bottom: 15px !important;
          color: #a78bfa !important;
        }
        .emma-selection-actions {
          display: flex !important;
          gap: 10px !important;
        }
        .emma-selection-btn {
          padding: 8px 16px !important;
          border: none !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          transition: all 0.2s ease !important;
        }
        .emma-selection-save {
          background: #10b981 !important;
          color: white !important;
        }
        .emma-selection-save:hover {
          background: #059669 !important;
        }
        .emma-selection-cancel {
          background: #ef4444 !important;
          color: white !important;
        }
        .emma-selection-cancel:hover {
          background: #dc2626 !important;
        }
      `;
      document.head.appendChild(styles);
    }

    // Find all photos on the page using comprehensive selectors that exclude small thumbnails
    const allPhotos = document.querySelectorAll(`
      img[src*="googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
      img[src*="photos.google.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
      img[src*="lh3.googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
      img[src*="lh4.googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
      img[src*="lh5.googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
      img[src*="lh6.googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"])
    `);

    // Filter photos by size to exclude small UI elements (more lenient for Google Photos)
    const photos = Array.from(allPhotos).filter(img => {
      const rect = img.getBoundingClientRect();
      return rect.width >= 50 && rect.height >= 50; // Google Photos uses smaller preview images
    });
    const selectedPhotos = new Set();

    // Make photos selectable
    photos.forEach(photo => {
      photo.classList.add('emma-photo-selectable');
      photo.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (selectedPhotos.has(photo)) {
          selectedPhotos.delete(photo);
          photo.classList.remove('emma-photo-selected');
        } else {
          selectedPhotos.add(photo);
          photo.classList.add('emma-photo-selected');
        }

        updateSelectionCounter();
      });
    });

    // Create selection panel
    const selectionPanel = document.createElement('div');
    selectionPanel.className = 'emma-selection-panel';
    selectionPanel.innerHTML = `
      <div class="emma-selection-counter">0 photos selected</div>
      <div class="emma-selection-actions">
        <button class="emma-selection-btn emma-selection-save">Save Selected</button>
        <button class="emma-selection-btn emma-selection-cancel">Cancel</button>
      </div>
    `;
    document.body.appendChild(selectionPanel);

    function updateSelectionCounter() {
      const counter = selectionPanel.querySelector('.emma-selection-counter');
      counter.textContent = `${selectedPhotos.size} photo${selectedPhotos.size !== 1 ? 's' : ''} selected`;
    }

    // Handle save selected photos
    selectionPanel.querySelector('.emma-selection-save').addEventListener('click', async () => {
      if (selectedPhotos.size === 0) {
        showNotification('Please select at least one photo');
        return;
      }

      const statusDiv = document.querySelector('.emma-status');
      statusDiv.style.display = 'block';
      statusDiv.textContent = `Saving ${selectedPhotos.size} selected photos...`;

      try {
        let savedCount = 0;
        for (const photo of selectedPhotos) {
          const rect = photo.getBoundingClientRect();
          const result = await chrome.runtime.sendMessage({
            action: 'media.captureElement',
            rect: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height
            },
            dpr: window.devicePixelRatio
          });
          if (result.success) savedCount++;
        }

        statusDiv.textContent = `✅ Saved ${savedCount} of ${selectedPhotos.size} photos`;
        deactivatePhotoSelectionMode();

        setTimeout(() => {
          if (statusDiv) {
            statusDiv.style.display = 'none';
          }
        }, 3000);
      } catch (error) {
        console.error('Emma: Failed to save selected photos:', error);
        statusDiv.textContent = '❌ Failed to save selected photos';
        setTimeout(() => {
          if (statusDiv) {
            statusDiv.style.display = 'none';
          }
        }, 3000);
      }
    });

    // Handle cancel
    selectionPanel.querySelector('.emma-selection-cancel').addEventListener('click', () => {
      deactivatePhotoSelectionMode();
    });

    function deactivatePhotoSelectionMode() {
      // Remove selectable class and event listeners
      photos.forEach(photo => {
        photo.classList.remove('emma-photo-selectable', 'emma-photo-selected');
      });

      // Remove selection panel
      if (selectionPanel && selectionPanel.parentNode) {
        selectionPanel.parentNode.removeChild(selectionPanel);
      }

      selectedPhotos.clear();
    }

    showNotification('Click on photos to select them, then click "Save Selected"');
  }

  /**
   * Show notification
   */
  function showNotification(message, duration = 3000) {
    const notification = document.createElement('div');
    notification.className = 'emma-notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  /**
   * Set up keyboard shortcuts
   */
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + E = Toggle Emma
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        toggleEmmaPanel();
      }

      // Ctrl/Cmd + Shift + S = Save selection
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        const selection = window.getSelection().toString();
        if (selection.length > 10) {
          e.preventDefault();
          captureSelection();
        }
      }
    });
  }

  /**
   * Set up message listener immediately (before initialization)
   */
  chrome.runtime.onMessage.addListener(handleMessage);

  async function ensureBackgroundAwake(retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await Promise.race([
          chrome.runtime.sendMessage({ action: 'ping' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('bg ping timeout')), 1200))
        ]);
        if (res && res.success) return true;
      } catch (e) {
        console.warn(`Emma Universal: Background ping attempt ${i + 1} failed:`, e.message);
        await new Promise(r => setTimeout(r, 300));
      }
    }
    return false;
  }

  // Try to show suggestion popup based on page content
  async function tryShowSuggestionPopup() {
    try {

      // Only show on http/https pages
      if (!location.href.startsWith('http')) {

        return;
      }

      // Don't show on Emma's own pages
      if (location.href.includes('extension://') || location.href.includes('emma')) {

        return;
      }

      const suggestion = await getCaptureSuggestion();

      if (suggestion && suggestion.success && suggestion.suggested) {

        showContentScriptSuggestionPopup(suggestion);
      } else {

      }
    } catch (error) {
      console.error('❌ SUGGESTION TRIGGER: Error getting suggestion:', error);
    }
  }

  // Show suggestion popup above Emma orb in content script
  function showContentScriptSuggestionPopup(suggestion) {
    // Remove any existing suggestion popup
    const existing = document.querySelector('.emma-suggestion-popup-content');
    if (existing) existing.remove();

    // Create suggestion popup
    const popup = document.createElement('div');
    popup.className = 'emma-suggestion-popup-content';

    // Build content
    const titleText = suggestion.title || 'Save this page as a memory';
    const preview = suggestion.textPreview ? suggestion.textPreview.slice(0, 100) + (suggestion.textPreview.length > 100 ? '…' : '') : '';
    const mediaHint = suggestion.media && suggestion.media.length ? ` (+${suggestion.media.length} media)` : '';

    popup.innerHTML = `
      <div class="suggestion-header">
        <div class="suggestion-icon">💡</div>
        <div class="suggestion-title">${titleText}${mediaHint}</div>
        <button class="suggestion-close">×</button>
      </div>
      ${preview ? `<div class="suggestion-preview">"${preview}"</div>` : ''}
      <div class="suggestion-actions">
        <button class="suggestion-btn suggestion-save">Save now</button>
      </div>
    `;

    // Style the popup to appear above Emma orb
    Object.assign(popup.style, {
      position: 'fixed',
      bottom: '100px', // Above Emma orb (which is at 24px + 50px height + some margin)
      right: '24px', // Aligned with Emma orb
      width: '320px',
      background: 'linear-gradient(135deg, rgba(139, 69, 255, 0.95) 0%, rgba(88, 28, 135, 0.95) 100%)',
      borderRadius: '16px',
      padding: '0',
      boxShadow: '0 12px 40px rgba(0,0,0,0.4), 0 4px 16px rgba(139, 69, 255, 0.3)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.2)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      zIndex: '999998', // Just below Emma orb but above everything else
      transform: 'translateX(350px) scale(0.9)',
      opacity: '0',
      transition: 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    });

    // Add internal styles for suggestion popup elements
    const style = document.createElement('style');
    style.textContent = `
      .emma-suggestion-popup-content .suggestion-header {
        display: flex;
        align-items: center;
        padding: 16px 20px 12px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .emma-suggestion-popup-content .suggestion-icon {
        font-size: 18px;
        margin-right: 12px;
      }
      .emma-suggestion-popup-content .suggestion-title {
        flex: 1;
        font-weight: 600;
        font-size: 14px;
        color: white;
        line-height: 1.4;
      }
      .emma-suggestion-popup-content .suggestion-close {
        background: none;
        border: none;
        color: rgba(255,255,255,0.8);
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background 0.2s;
      }
      .emma-suggestion-popup-content .suggestion-close:hover {
        background: rgba(255,255,255,0.1);
        color: white;
      }
      .emma-suggestion-popup-content .suggestion-preview {
        padding: 0 20px 12px;
        font-size: 13px;
        color: rgba(255,255,255,0.9);
        line-height: 1.4;
        font-style: italic;
      }
      .emma-suggestion-popup-content .suggestion-actions {
        padding: 12px 20px 16px;
        display: flex;
        gap: 8px;
      }
      .emma-suggestion-popup-content .suggestion-btn {
        flex: 1;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .emma-suggestion-popup-content .suggestion-save {
        background: white;
        color: #764ba2;
      }
      .emma-suggestion-popup-content .suggestion-save:hover {
        background: rgba(255,255,255,0.9);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
    `;

    popup.appendChild(style);
    document.body.appendChild(popup);

    // Animate in
    requestAnimationFrame(() => {
      popup.style.transform = 'translateX(0) scale(1)';
      popup.style.opacity = '1';
    });

    // Wire up event handlers
    const closeBtn = popup.querySelector('.suggestion-close');
    const saveBtn = popup.querySelector('.suggestion-save');

    const handleClose = () => {
      popup.style.transform = 'translateX(350px) scale(0.9)';
      popup.style.opacity = '0';
      setTimeout(() => popup.remove(), 400);
    };

    closeBtn.addEventListener('click', handleClose);

    saveBtn.addEventListener('click', async () => {

      // Trigger the same capture as the main capture button
      try {
        showNotification('🔍 Starting page capture...', 3000);

        // Check vault status (allow proceeding if vault not set up)
        let vaultAvailable = false;
        try {

          const vs = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });

          if (vs && vs.success && vs.isUnlocked) {

            vaultAvailable = true;
          } else if (vs && vs.success && !vs.isUnlocked) {

            showNotification('⚠️ Vault locked - saving to temporary storage. Unlock vault for secure storage.', 3000);
          } else {

            showNotification('ℹ️ Saving to temporary storage. Set up vault for secure storage.', 3000);
          }
        } catch (vaultError) {

          showNotification('ℹ️ Saving to temporary storage.', 3000);
        }

        // Check if captureContent function exists
        if (typeof captureContent !== 'function') {
          console.error('❌ SUGGESTION POPUP: captureContent function not found!');
          showNotification('❌ Capture function not available. Please refresh the page.', 4000);
          return;
        }

        // Use the same capture function that captureNow uses
        const result = await Promise.race([
          captureContent({ userTriggered: true, force: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Content capture timeout')), 8000))
        ]);

        if (result && result.success) {
          const count = result.count || 'some';

          showNotification(`🎉 Successfully captured ${count} memories from this page!`, 4000);
          handleClose();
        } else {
          const errorMsg = result?.error || result?.message || 'Unknown error occurred';
          console.error('❌ SUGGESTION POPUP: Capture failed:', errorMsg);
          showNotification('❌ Failed to save: ' + errorMsg, 4000);
        }
      } catch (error) {
        console.error('❌ SUGGESTION POPUP: Save error:', error);
        showNotification('❌ Failed to save memory: ' + error.message, 4000);
      }
    });

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (popup.parentNode) {
        handleClose();
      }
    }, 10000);
  }

  /**
   * Initialize when ready
   */
  if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', () => {

      initializeEmma();
      // Try to show suggestion popup after page loads
      setTimeout(() => {

        tryShowSuggestionPopup();
      }, 2000);
    });
  } else {
    // For SPAs and dynamic content, delay slightly
    setTimeout(() => {
      initializeEmma();
      // Try to show suggestion popup after initialization
      setTimeout(() => {
        console.log('⏰ SUGGESTION TIMER: 2 seconds elapsed (SPA mode), checking for suggestions...');
        tryShowSuggestionPopup();
      }, 2000);
    }, 500);
  }

  // Initialize media overlay system
  // Media overlays now handled by collection system above
}

// --- Media Import System ---

/**
 * Scan page for media elements and return their metadata
 */
function scanPageForMedia(selector = 'img, video') {
  const elements = [];
  const mediaNodes = document.querySelectorAll(selector);
  const isGooglePhotos = window.location.hostname.includes('photos.google.com');

  EmmaLog.debug(`Emma: photos domain: ${isGooglePhotos}`);

  mediaNodes.forEach((element, index) => {
    try {
      // Skip tiny images (likely tracking pixels or UI elements)
      const rect = element.getBoundingClientRect();

      // For Google Photos, be very permissive with size filtering to capture thumbnails for screenshot
      if (isGooglePhotos) {
        // Include any image 24x24 or larger for Google Photos (thumbnails can be screenshotted)
        if (rect.width < 24 || rect.height < 24) {
          EmmaLog.debug(`Emma: GP tiny skip ${index}: ${rect.width}x${rect.height}`);
          return;
        }
          EmmaLog.debug(`Emma: GP include ${index}: ${rect.width}x${rect.height}`);
      } else {
        // For other sites, use standard 10px minimum
        if (rect.width < 10 || rect.height < 10) {

          return;
        }
      }

      // Get source URL
      let src = element.src || element.currentSrc;
      // Attempt to upgrade Google Photos thumbnails to HQ variants
      const upgradeGoogleSrc = (s) => {
        try {
          if (!s) return s;
          const u = new URL(s, window.location.href);
          const host = u.hostname || '';
          if (!/googleusercontent\.com|photos\.google\.com|lh\d+\.googleusercontent\.com/.test(host)) return s;
          let out = s.replace(/=s(\d+)(?=[^0-9]|$)/g, '=s4096');
          out = out.replace(/w\d+-h\d+/g, 'w4096-h4096');
          out = out.replace(/=w\d+-h\d+-no/g, '=w4096-h4096-no');
          return out;
        } catch { return s; }
      };
      src = upgradeGoogleSrc(src);

      // If image tag has srcset, select the largest candidate
      if (!src && element.tagName.toLowerCase() === 'img' && element.srcset) {
        try {
          const candidates = element.srcset.split(',').map(s => s.trim());
          const parsed = candidates.map(c => {
            const [u, w] = c.split(' ');
            return { url: upgradeGoogleSrc(u), w: parseInt((w||'').replace(/[^0-9]/g,'')) || 0 };
          }).sort((a,b) => b.w - a.w);
          if (parsed.length) src = parsed[0].url;
        } catch {}
      }
      if (element.tagName.toLowerCase() === 'video') {
        // For videos, try to get the main source
        const source = element.querySelector('source');
        if (source && source.src) src = source.src;
      }

      if (!src || src.startsWith('data:')) {

        return; // Skip data URLs and empty sources
      }

      // Additional Google Photos filtering
      if (isGooglePhotos) {
        // Skip profile pictures and UI avatars
        if (element.closest('[data-person-id]') ||
            element.closest('.profile') ||
            element.closest('[aria-label*="profile"]') ||
            element.closest('[data-testid*="profile"]')) {
          console.log(`Emma: Skipping profile image ${index}: ${src.substring(0, 50)}...`);
          return;
        }

        // Skip very small thumbnails based on URL patterns, but be more lenient
        if (src.includes('=s32') || src.includes('=s40') || src.includes('=s48') ||
            src.includes('=s64') || src.includes('=s80') || src.includes('=s96')) {
          console.log(`Emma: Skipping thumbnail ${index}: ${src.substring(0, 50)}...`);
          return;
        }

        // Prefer larger image versions - look for =s parameter but be more lenient for slideshow views
        const sizeMatch = src.match(/=s(\d+)/);
        if (sizeMatch && parseInt(sizeMatch[1]) < 150) { // Reduced from 200 to 150

          return;
        }

        // Special handling for Google Photos without size parameter (slideshow view)
        if (!sizeMatch && src.includes('googleusercontent.com')) {
          EmmaLog.debug(`Emma: GP include w/o size param`);
        }
      }

      // Build element metadata
      const elementData = {
        tagName: element.tagName.toLowerCase(),
        src,
        selector: generateElementSelector(element),
        rect: {
          x: rect.x + window.scrollX,
          y: rect.y + window.scrollY,
          width: rect.width,
          height: rect.height
        },
        dpr: window.devicePixelRatio || 1,
        alt: element.alt || '',
        title: element.title || '',
        index
      };

      console.log(`Emma: Including element ${index}: ${rect.width}x${rect.height}, src: ${src.substring(0, 50)}...`);
      elements.push(elementData);
    } catch (error) {
      console.warn('Error scanning media element:', error);
    }
  });

  if (elements.length > 0) {
    console.log(`Emma: Valid elements summary:`, elements.map(e => `${e.tagName} ${e.rect.width}x${e.rect.height}`));
  }
  return elements;
}

/**
 * UNIFIED Google Photos element detection - used by BOTH detectPageContext and collectAllGooglePhotos
 * This ensures consistent behavior between detection and collection
 */
function getGooglePhotosElements() {
  // Use EXACT same selector as detectPageContext for consistency
  const unifiedSelector = `
    img[src*="googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]):not([style*="width: 32"]):not([style*="width: 40"]):not([style*="width: 48"]),
    img[src*="photos.google.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
    img[src*="lh3.googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
    img[src*="lh4.googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
    img[src*="lh5.googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
    img[src*="lh6.googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"])
  `.replace(/\s+/g, ' ').trim();

  const allPhotos = document.querySelectorAll(unifiedSelector);

  // Use EXACT same size filtering as detectPageContext for consistency
  const sizedPhotos = Array.from(allPhotos).filter(img => {
    const rect = img.getBoundingClientRect();
    return rect.width >= 50 && rect.height >= 50; // SAME as detectPageContext
  });

  return sizedPhotos;
}

// Google Photos: Aggressively collect all media by repeatedly scanning the grid while scrolling
async function collectAllGooglePhotos() {

  const seen = new Set();
  const collected = [];

  // Try to find the main scroll container; fallback to window
  let container = document.querySelector('[jscontroller][jsaction*="scroll"]') ||
                  document.querySelector('[role="main"] [jscontroller]') ||
                  document.querySelector('[data-ved] [jscontroller]') ||
                  document.querySelector('[role="main"]') ||
                  document.querySelector('[data-view-type]') ||
                  document.scrollingElement ||
                  document.body;

  console.log('Emma: Using scroll container:', container?.tagName, container?.className?.slice(0, 50));

  // Use a timed loop to scroll and accumulate; stop when no new items after a few passes
  let iterations = 0;
  let lastCount = 0;
  let stableCount = 0; // Count consecutive iterations with no new items

                 EmmaLog.debug('Emma: GP unified collection start');

  while (iterations < 30) {
    iterations++;

    // Use the UNIFIED function that matches detectPageContext exactly
    const nodes = getGooglePhotosElements();

    // If we're not finding any elements in early iterations, try a more aggressive approach
    if (iterations <= 3 && nodes.length === 0) {

      // Try simpler selectors as fallback
      const fallbackSelectors = [
        'img[src*="googleusercontent.com"]',
        'img[src*="photos.google.com"]',
        'img[src*="lh3.googleusercontent.com"]',
        'img[src*="lh4.googleusercontent.com"]',
        'img[src*="lh5.googleusercontent.com"]',
        'img[src*="lh6.googleusercontent.com"]'
      ];

      for (const selector of fallbackSelectors) {
        const fallbackElements = document.querySelectorAll(selector);

        if (fallbackElements.length > 0) {
          // Use fallback elements but still apply size filtering
          const filteredFallback = Array.from(fallbackElements).filter(img => {
            const rect = img.getBoundingClientRect();
            return rect.width >= 32 && rect.height >= 32; // More permissive for fallback
          });

          // If we found usable elements with fallback, break out to use them
          if (filteredFallback.length > 0) {

            nodes.length = 0;
            nodes.push(...filteredFallback);
            break;
          }
        }
      }
    }

    // Debug: log first few elements found
    if (iterations <= 3 && nodes.length > 0) {
      console.log(`🔍 COLLECTION: First few elements found:`, nodes.slice(0, 3).map(el => ({
        tag: el.tagName,
        src: (el.currentSrc || el.src || '').slice(0, 50),
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
        classes: el.className.slice(0, 50)
      })));
    }

    const before = collected.length;
    let addedThisIteration = 0;

    for (const element of nodes) {
      const rect = element.getBoundingClientRect();
      const elementSrc = element.currentSrc || element.src || '';

      // Debug: log each element being examined
      if (iterations <= 3) { // Only log for first few iterations to avoid spam
        console.log(`🔍 COLLECTION: Examining element: ${rect.width}x${rect.height} at (${rect.left},${rect.top}) src=${elementSrc.slice(0,50)}...`);
      }

      // Check for duplicates using same key as seen set
      const key = element.currentSrc || element.src || element.srcset || `${rect.left},${rect.top},${rect.width},${rect.height}`;
      if (seen.has(key)) {
        if (iterations <= 3) console.log(`🔍 COLLECTION: Skipping duplicate element with key: ${key.slice(0,50)}...`);
        continue;
      }
      seen.add(key);
      addedThisIteration++;

      if (iterations <= 3) console.log(`🔍 COLLECTION: ✅ Adding element: ${rect.width}x${rect.height} src=${key.slice(0,50)}...`);

      // Build one media entry similar to scanPageForMedia path
      let src = element.currentSrc || element.src || '';
      if (!src && element.srcset) {
        try {
          const parsed = element.srcset.split(',').map(s => s.trim()).map(c => { const [u,w] = c.split(' '); return { url: u, w: parseInt((w||'').replace(/[^0-9]/g,''))||0 }; }).sort((a,b)=>b.w-a.w);
          if (parsed.length) src = parsed[0].url;
        } catch {}
      }
      const upgraded = (function(s){ try { const u=new URL(s, location.href); if(!/googleusercontent\.com|photos\.google\.com/.test(u.hostname)) return s; let out=s.replace(/=s(\d+)(?=[^0-9]|$)/g,'=s4096'); out=out.replace(/w\d+-h\d+/g,'w4096-h4096'); out=out.replace(/=w\d+-h\d+-no/g,'=w4096-h4096-no'); return out; } catch { return s; } }) (src);
      collected.push({ tagName: 'img', src: upgraded, rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }, dpr: window.devicePixelRatio || 1, selector: generateElementSelector(element) });
    }

    const after = collected.length;
    const newItemsFound = after - before;

    console.log(`🔍 COLLECTION: Iteration ${iterations}: Added ${addedThisIteration} new items (before: ${before}, after: ${after})`);

    if (newItemsFound === 0) {
      stableCount++;

      // Be less aggressive about breaking early - ensure we actually find some items
      if (stableCount >= 3 && collected.length === 0) {

        break;
      } else if (stableCount >= 5 && (collected.length > 10 || iterations > 15)) {

        break;
      }
    } else {
      stableCount = 0; // Reset stable count if we found new items
    }
    lastCount = after;

    // Scroll further down to load more
    const step = Math.max(window.innerHeight, 800);

    // Try multiple scrolling approaches for Google Photos
    let scrolled = false;

    // Try container scroll first
    if (container && container !== document.body && container !== document.scrollingElement) {
      if (container.scrollBy) {
        container.scrollBy(0, step);
        scrolled = true;

      } else if (container.scrollTop !== undefined) {
        container.scrollTop += step;
        scrolled = true;

      }
    }

    // Also try window scroll for Google Photos (it often uses both)
    window.scrollBy(0, step);

    await new Promise(r => setTimeout(r, 800)); // Increased wait time for loading
  }

  // As a safety, de-duplicate by src
  const uniq = [];
  const seenSrc = new Set();
  for (const item of collected) {
    const key = item.src || `${item.rect.x},${item.rect.y}`;
    if (seenSrc.has(key)) continue; seenSrc.add(key); uniq.push(item);
  }

  EmmaLog.debug('Emma: GP collection summary');

  console.log('🔍 CONTENT: - Final unique sources:', uniq.map(u => u.src?.substring(0, 100)));
  console.log('🔍 CONTENT: - All collected items details:', uniq.slice(0, 10));

  return uniq;
}

/**
 * Generate a unique selector for an element
 */
function generateElementSelector(element) {
  try {
    // Bounded, sanitized selector to avoid excessively long/unsafe selectors
    const MAX_DEPTH = 4;
    const MAX_LEN = 256;
    if (!element || !(element instanceof Element)) return '';
    if (element.id) return `#${CSS.escape(element.id)}`;
    const parts = [];
    let node = element;
    let depth = 0;
    while (node && depth < MAX_DEPTH) {
      let segment = node.tagName ? node.tagName.toLowerCase() : '';
      if (node.classList && node.classList.length) {
        const classes = Array.from(node.classList).slice(0, 2).map(c => CSS.escape(c)).join('.');
        if (classes) segment += `.${classes}`;
      }
      const parent = node.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children);
        const index = siblings.indexOf(node) + 1;
        segment += `:nth-child(${index})`;
      }
      parts.unshift(segment);
      const candidate = parts.join(' > ');
      if (candidate.length > MAX_LEN) break;
      node = parent;
      depth++;
    }
    return parts.join(' > ') || (element.tagName ? element.tagName.toLowerCase() : '');
  } catch {
    try { return element.tagName ? element.tagName.toLowerCase() : ''; } catch { return ''; }
  }
}

// Removed duplicate media overlay system - using collection system instead

// Global function for testing suggestion popup
window.testSuggestionPopup = function() {

  const testSuggestion = {
    success: true,
    suggested: true,
    title: 'Test Page Capture',
    textPreview: 'This is a test suggestion popup to verify the save functionality is working correctly.',
    media: [{ type: 'image', url: 'test.jpg' }]
  };
  showContentScriptSuggestionPopup(testSuggestion);
};

// Debug Emma orb status
window.debugEmmaOrb = function() {

  const floatingBtn = document.getElementById('emma-float-btn');
  const floatingOrb = document.getElementById('emma-float-orb');
  const panelOrb = document.getElementById('emma-panel-orb');

  console.log('Floating button styles:', floatingBtn ? window.getComputedStyle(floatingBtn) : 'N/A');  if (floatingBtn) {
    const rect = floatingBtn.getBoundingClientRect();

  }

  return {
    floatingBtn: !!floatingBtn,
    floatingOrb: !!floatingOrb,
    panelOrb: !!panelOrb,
    emmaOrbClass: !!window.EmmaOrb,
    orbsInitialized: typeof orbsInitialized !== 'undefined' ? orbsInitialized : 'undefined'
  };
};

// Global function to manually trigger suggestion flow
window.testSuggestionTrigger = function() {

  tryShowSuggestionPopup();
};

// Force Emma UI to appear (debugging function)
window.forceEmmaUI = function() {

  try {
    addEmmaUI();

    setTimeout(() => {
      const btn = document.getElementById('emma-float-btn');
      if (btn) {
        btn.style.cssText = `
          position: fixed !important;
          bottom: 24px !important;
          right: 24px !important;
          width: 56px !important;
          height: 56px !important;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #deb3e4 100%) !important;
          border: 2px solid white !important;
          border-radius: 50% !important;
          cursor: pointer !important;
          z-index: 999999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: white !important;
          font-weight: bold !important;
          box-shadow: 0 4px 16px rgba(118, 75, 162, 0.4) !important;
          opacity: 1 !important;
          visibility: visible !important;
        `;
        btn.innerHTML = '<span style="font-size: 24px;">🧠</span>';

      }
    }, 100);
  } catch (error) {
    console.error('❌ Failed to force Emma UI:', error);
  }
};

// 🖼️ Emma Image Detection Integration
let emmaImageDetector = null;

/**
 * Initialize Emma Image Detector when requested
 */
async function initializeImageDetector() {
  if (!emmaImageDetector) {
    // Load the image detector module if not already loaded
    if (!window.EmmaImageDetector) {
      try {
        // Dynamically load the image detector
        await loadImageDetectorModule();
      } catch (error) {
        console.error('🖼️ Failed to load image detector module:', error);
        return null;
      }
    }

    emmaImageDetector = new window.EmmaImageDetector();
  }

  return emmaImageDetector;
}

/**
 * Load image detector module dynamically
 */
function loadImageDetectorModule() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('js/emma-image-detector.js');
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Handle image detection requests from popup
 */
async function handleImageDetectionRequest() {
  try {

    const detector = await initializeImageDetector();
    if (!detector) {
      throw new Error('Failed to initialize image detector');
    }

    const images = await detector.startDetection();

    // Send results back to popup
    chrome.runtime.sendMessage({
      action: 'IMAGE_DETECTION_COMPLETE',
      data: {
        images: images,
        pageInfo: {
          url: window.location.href,
          title: document.title,
          hostname: window.location.hostname,
          timestamp: Date.now()
        }
      }
    });

    return images;

  } catch (error) {
    console.error('🖼️ Image detection failed:', error);

    // Send error back to popup
    chrome.runtime.sendMessage({
      action: 'IMAGE_DETECTION_ERROR',
      data: {
        error: error.message,
        pageInfo: {
          url: window.location.href,
          title: document.title,
          hostname: window.location.hostname
        }
      }
    });

    return [];
  }
}

// Add image detection to message handlers
if (typeof handleMessage !== 'undefined') {
  const originalHandleMessage = handleMessage;
  handleMessage = function(message, sender, sendResponse) {
    if (message.action === 'DETECT_IMAGES') {
      handleImageDetectionRequest().then(images => {
        sendResponse({ success: true, images });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // Indicates async response
    }

    // Call original handler for other messages
    return originalHandleMessage(message, sender, sendResponse);
  };
} else {
  // Create message handler if it doesn't exist
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'DETECT_IMAGES') {
      handleImageDetectionRequest().then(images => {
        sendResponse({ success: true, images });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // Indicates async response
    }
  });
}

// Simple popup test that bypasses all suggestion logic
window.testSimplePopup = function() {

  const popup = document.createElement('div');
  popup.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 24px;
    width: 300px;
    padding: 20px;
    background: linear-gradient(135deg, rgba(139, 69, 255, 0.95) 0%, rgba(88, 28, 135, 0.95) 100%);
    color: white;
    border-radius: 16px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
    z-index: 999999;
    font-family: system-ui;
  `;
  popup.innerHTML = `
    <div>📍 Simple Test Popup</div>
    <div style="margin-top: 10px; font-size: 14px;">If you can see this, the popup positioning works!</div>
    <button onclick="this.parentElement.remove()" style="margin-top: 15px; padding: 8px 16px; background: white; color: purple; border: none; border-radius: 8px; cursor: pointer;">Close</button>
  `;
  document.body.appendChild(popup);
};
