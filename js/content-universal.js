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
  return hostname;
}

// Prevent multiple injections
if (window.emmaUniversalInjected) {
  console.log('Emma: Universal content script already injected');
} else {
  window.emmaUniversalInjected = true;
  console.log('Emma: Universal content script initializing...');

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
        console.log('Emma Universal: Attempting minimal initialization...');
        isInitialized = true; // Mark as initialized so we can at least respond to ping
        console.log('Emma Universal: ⚠️ Minimal initialization complete');
      } catch (minimalError) {
        console.error('Emma Universal: Even minimal initialization failed:', minimalError);
      }
    }
  }

  // Progressive hover overlay: add a small " Emma" button to IMG/VIDEO
  try {
    const overlayCss = `.emma-hover-add{position:absolute;top:6px;left:6px;z-index:999999;border-radius:16px;padding:4px 8px;font-size:12px;color:#fff;background:linear-gradient(135deg,#667eea,#764ba2);box-shadow:0 2px 10px rgba(0,0,0,.3);cursor:pointer;display:none}`;
    const style = document.createElement('style');
    style.textContent = overlayCss;
    document.documentElement.appendChild(style);
    const observer = new MutationObserver(() => bindHoverAdds());
    bindHoverAdds();
    observer.observe(document.documentElement, { childList: true, subtree: true });

    function bindHoverAdds(){
      const elements = Array.from(document.querySelectorAll('img, video'));
      elements.forEach(el => {
        if (el._emmaBound) return; el._emmaBound = true;
        const parent = el.parentElement || el;
        if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
        const btn = document.createElement('div');
        btn.className = 'emma-hover-add';
        btn.textContent = '+ Emma';
        parent.appendChild(btn);
        el.addEventListener('mouseenter', () => btn.style.display = 'inline-block');
        el.addEventListener('mouseleave', () => btn.style.display = 'none');
        btn.addEventListener('click', async (e) => {
          e.stopPropagation(); e.preventDefault();
          const srcUrl = el.currentSrc || el.src;
          if (!srcUrl) return;
          try {
            const out = await chrome.runtime.sendMessage({ action: 'media.importFromUrl', url: srcUrl, pageUrl: location.href, mediaType: el.tagName.toLowerCase() });
            btn.textContent = out && out.success ? '✓ Added' : '⚠︎ Error';
            setTimeout(()=> btn.textContent = '+ Emma', 1500);
          } catch {}
        });
      });
    }
  } catch {}

  /**
   * Create minimal hybrid engine (embedded to avoid CSP issues)
   */
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
          console.log(`Emma Universal: Saving ${memories.length} memories...`);
          
          // Dedupe near-duplicate messages by normalized text
          const seen = new Set();
          const uniqueMemories = [];
          for (const m of memories) {
            const key = normalizeText(m.content || '');
            if (!key || key.length < 10) continue;
            if (isLikelyGarbage(key)) continue;
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
            
            console.log(`Emma Universal: Updated existing capsule with ${uniqueMemories.length} new messages`);
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
            console.log(`Emma Universal: Created new conversation capsule with ${uniqueMemories.length} messages`);
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
          
          await chrome.storage.local.set({ emma_memories: existingMemories });
          
          console.log(`Emma Universal: Conversation capsule saved successfully`);
          let countOut = uniqueMemories.length;
          if (countOut === 0 && attachmentsAdded > 0) countOut = 1;
          const success = countOut > 0 || attachmentsAdded > 0;
          return { success, count: countOut, attachmentsAdded, capsuleId: capsuleIdOut };
          
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
          
          console.log('Emma Universal: Saved to localStorage, total memories:', memories.length);
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
    const base = meta.ogTitle || meta.title || '';
    if (base) return base;
    const first = (mainText || '').trim().split(/\s+/).slice(0, 10).join(' ');
    return first ? first : new URL(location.href).hostname;
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
    console.log('Emma Universal: Setting up with settings:', settings);
    
    // Add Emma UI
    if (settings.showFloatingButton !== false) {
      console.log('Emma Universal: Adding UI...');
      addEmmaUI();
    }
    
    // Set up auto-capture if enabled
    if (settings.autoCapture) {
      console.log('Emma Universal: Setting up auto-capture...');
      await setupAutoCapture();
    }
    
    // Set up keyboard shortcuts
    if (settings.enableShortcuts) {
      console.log('Emma Universal: Setting up keyboard shortcuts...');
      setupKeyboardShortcuts();
    }
    
    console.log('Emma Universal: Setup complete');
  }

  /**
   * Set up automatic capture
   */
  async function setupAutoCapture() {
    // Analyze current page
    const analysis = await emmaEngine.analyze();
    
    console.log(`Emma: Page analysis - Type: ${analysis.type}, Confidence: ${analysis.confidence}`);
    
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
      console.log('Emma: Starting content capture...', options);
      
      // Check if engine is available
      if (!emmaEngine) {
        console.log('Emma: Engine not available, performing fallback capture...');
        return await performFallbackCapture(options);
      }
      
      const result = await emmaEngine.capture(options);
      const capturedCount = result && typeof result.count === 'number' ? result.count : (Array.isArray(result) ? result.length : 0);
      
      if (capturedCount > 0) {
        console.log(`Emma: Captured ${capturedCount} memories`, result);
        
        // Show notification if not auto-capture
        if (!options.auto) {
          const attText = result && result.attachmentsAdded ? ` (+${result.attachmentsAdded} media)` : '';
          showNotification(`Captured ${capturedCount} item(s)${attText}`);
        }
        
        return { success: true, count: capturedCount, attachmentsAdded: result.attachmentsAdded || 0, capsuleId: result.capsuleId };
      } else {
        console.log('Emma: No content to capture');
        return { success: false, message: 'No content found' };
      }
      
    } catch (error) {
      console.error('Emma: Capture failed:', error);
      console.log('Emma: Attempting fallback capture...');
      return await performFallbackCapture(options);
    }
  }

  /**
   * Fallback capture when engine is not available
   */
  async function performFallbackCapture(options = {}) {
    try {
      console.log('Emma: Performing fallback capture...');
      
      // Try to capture selected text or page content
      const selection = window.getSelection().toString();
      let content = '';
      let type = 'page';
      
      if (selection && selection.length > 10) {
        content = selection;
        type = 'selection';
        console.log('Emma: Capturing selected text');
      } else {
        // Capture page title and some content
        const title = document.title;
        const bodyText = document.body.textContent.substring(0, 500).trim();
        content = `${title}\n\n${bodyText}`;
        console.log('Emma: Capturing page content');
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
        
        console.log('Emma: Saving fallback memory to simplified storage:', memory);
        try {
          // Check vault setup using simplified approach
          const storage = await chrome.storage.local.get(['emma_vault_initialized']);
          if (!storage.emma_vault_initialized) {
            return { success: false, message: 'Vault not set up. Please create your vault in the dashboard first.' };
          }
          // Save to simplified storage
          const existingStorage = await chrome.storage.local.get(['emma_memories']);
          const existingMemories = existingStorage.emma_memories || [];
          const newMemory = {
            ...memory,
            id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            timestamp: Date.now(),
            created: new Date().toISOString(),
            fallback: true
          };
          
          const allMemories = [newMemory, ...existingMemories];
          if (allMemories.length > 100) {
            allMemories.splice(100);
          }
          
          await chrome.storage.local.set({ emma_memories: allMemories });
          return { success: true, count: 1, message: 'Captured page content' };
        } catch (saveError) {
          console.error('Emma: Failed to save to Vault:', saveError);
          return { success: false, error: saveError.message };
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
    console.log('Emma Universal: Received message:', request.action, 'initialized:', isInitialized);
    
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
          
          console.log('Emma Universal: Starting capture...');
          
          // Add timeout to prevent hanging
          Promise.race([
            captureContent({ userTriggered: true, force: true }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Content capture timeout')), 8000))
          ])
            .then(result => {
              console.log('Emma Universal: Capture result:', result);
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
              console.log('🔍 CONTENT: Starting enhanced media capture...');
              
              // Try Universal Capture first, but don't block on loading issues
              let useUniversal = false;
              try {
                if (!window.UniversalMediaCapture) {
                  console.log('🔍 CONTENT: Attempting to load UniversalMediaCapture...');
                  const script = document.createElement('script');
                  script.src = chrome.runtime.getURL('js/universal-media-capture.js');
                  document.head.appendChild(script);
                  
                  // Quick attempt to load (max 2 seconds)
                  await Promise.race([
                    new Promise((resolve, reject) => {
                      script.onload = () => {
                        if (window.UniversalMediaCapture && typeof window.UniversalMediaCapture === 'function') {
                          console.log('🔍 CONTENT: UniversalMediaCapture loaded successfully');
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
                  console.log('🔍 CONTENT: UniversalMediaCapture already available');
                }
              } catch (error) {
                console.log('🔍 CONTENT: Universal capture not available, using enhanced fallback:', error.message);
                useUniversal = false;
              }
              
              let result;
              
              if (useUniversal) {
                try {
                  if (!window.universalCapture) {
                    window.universalCapture = new window.UniversalMediaCapture();
                  }
                  
                  console.log('🔍 CONTENT: Using Universal Media Capture');
                  result = await window.universalCapture.capturePageMedia({
                    includeVideos: true,
                    qualityThreshold: request.qualityThreshold || 3,
                    maxElements: request.maxElements || 100,
                    scrollToLoad: request.scrollToLoad !== false
                  });
                  
                  console.log('🔍 CONTENT: Universal capture successful:', result.summary);
                } catch (error) {
                  console.error('🔍 CONTENT: Universal capture failed, falling back:', error);
                  useUniversal = false;
                }
              }
              
              if (!useUniversal) {
                console.log('🔍 CONTENT: Using enhanced scanPageForMedia fallback');
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
                
                console.log('🔍 CONTENT: Enhanced fallback found', result.elements.length, 'quality elements');
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
              sendResponse(suggestion);
            } catch (e) {
              sendResponse({ success: false, error: e.message });
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
      this.gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
      if (!this.gl) { this.useFallback(); return; }
      this.gl.clearColor(0, 0, 0, 0);
      this.resize();
    }
    
    setupShaders() {
      const vert = 'precision highp float; attribute vec2 position; attribute vec2 uv; varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }';
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
      const dpr = window.devicePixelRatio || 1; const width = this.container.clientWidth; const height = this.container.clientHeight;
      this.canvas.width = width * dpr; this.canvas.height = height * dpr; this.canvas.style.width = width + 'px'; this.canvas.style.height = height + 'px';
      if (this.gl) { this.gl.viewport(0, 0, this.canvas.width, this.canvas.height); }
    }
    
    createShader(type, source) { const shader = this.gl.createShader(type); this.gl.shaderSource(shader, source); this.gl.compileShader(shader); if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) { console.error('Shader compile error:', this.gl.getShaderInfoLog(shader)); this.gl.deleteShader(shader); return null; } return shader; }
    createProgram(vertexSource, fragmentSource) { const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource); const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource); if (!vertexShader || !fragmentShader) return null; const program = this.gl.createProgram(); this.gl.attachShader(program, vertexShader); this.gl.attachShader(program, fragmentShader); this.gl.linkProgram(program); if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) { console.error('Program link error:', this.gl.getProgramInfoLog(program)); this.gl.deleteProgram(program); return null; } return program; }
    useFallback() { this.container.innerHTML = '<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); border-radius: 50%; animation: float 3s ease-in-out infinite;"></div>'; }
  }

  /**
   * Add Emma UI elements
   */
  function addEmmaUI() {
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
    
    // Use YOUR orb directly - no script loading!
    window.EmmaOrb = EmmaOrb;
    setTimeout(() => {
      initializeFloatingOrb();
      initializePanelOrb();
    }, 100);
    
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
        <div class="emma-actions-modern" id="emma-dynamic-actions">
          <!-- Dynamic actions will be populated based on page context -->
        </div>
        <div class="emma-status" style="display: none; padding: 12px; margin: 12px 0; border-radius: 8px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: white; text-align: center; font-size: 14px; transition: all 0.3s ease;"></div>
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
    
    // Initialize orb for panel header
    setTimeout(() => initializePanelOrb(), 150);
    
    // Add event listeners
    panel.querySelector('.emma-close').addEventListener('click', hideEmmaPanel);
    panel.querySelectorAll('.emma-action-card').forEach(btn => {
      btn.addEventListener('click', handleActionButton);
    });
    
    // Add styles
    addEmmaStyles();
    
    // Update page analysis
    updatePageAnalysis();
  }

  /**
   * Add Emma styles
   */
  function addEmmaStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Emma CSS Variables (same as dashboard) */
      :root {
        --emma-gradient-1: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
        --emma-purple: #764ba2;
        --emma-pink: #f093fb;
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
        background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
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
        border-color: rgba(240, 147, 251, 0.3);
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
        color: rgba(240, 147, 251, 0.9);
        font-weight: 600;
        background: rgba(240, 147, 251, 0.1);
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

  // YOUR ORB IS NOW EMBEDDED ABOVE - NO LOADING NEEDED!
  
  /**
   * Force beautiful gradient fallback (no brain emoji!)
   */
  function forceOrbFallback() {
    const floatingOrb = document.getElementById('emma-float-orb');
    const panelOrb = document.getElementById('emma-panel-orb');
    
    if (floatingOrb) {
      floatingOrb.innerHTML = '<div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); border-radius: 50%; box-shadow: 0 4px 16px rgba(118, 75, 162, 0.4); animation: float 3s ease-in-out infinite;"></div>';
    }
    
    if (panelOrb) {
      panelOrb.innerHTML = '<div style="width: 48px; height: 48px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); border-radius: 50%; box-shadow: 0 4px 16px rgba(118, 75, 162, 0.4); animation: float 3s ease-in-out infinite;"></div>';
    }
    
    console.log('🎨 Beautiful gradient orb fallback applied');
  }

  /**
   * Initialize floating orb - EXACT copy of dashboard orb
   */
  function initializeFloatingOrb() {
    console.log('🔥 INITIALIZING FLOATING ORB...');
    const orbContainer = document.getElementById('emma-float-orb');
    
    console.log('🔍 orbContainer:', orbContainer);
    console.log('🔍 window.EmmaOrb:', window.EmmaOrb);
    
    if (!orbContainer) {
      console.error('❌ NO ORB CONTAINER FOUND!');
      return;
    }
    
    if (!window.EmmaOrb) {
      console.error('❌ NO EMMA ORB CLASS FOUND! Using fallback.');
      orbContainer.innerHTML = '<div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); border-radius: 50%; box-shadow: 0 4px 16px rgba(118, 75, 162, 0.4); animation: float 3s ease-in-out infinite;"></div>';
      return;
    }
    
    try {
      // CLEAR any existing content first!
      orbContainer.innerHTML = '';
      console.log('🧹 Cleared floating container contents');
      
      console.log('🚀 CREATING YOUR EXACT ORB with settings:', {
        hue: 0,
        hoverIntensity: 0.5,
        rotateOnHover: true,
        forceHoverState: false
      });
      
      window.emmaFloatingOrbInstance = new EmmaOrb(orbContainer, {
        hue: 0,
        hoverIntensity: 0.5,
        rotateOnHover: true,
        forceHoverState: false
      });
      
      console.log('✅ YOUR EXACT ORB CREATED SUCCESSFULLY!');
      console.log('🎯 Orb instance:', window.emmaFloatingOrbInstance);
      
    } catch (error) {
      console.error('💥 FAILED TO CREATE YOUR ORB:', error);
      console.error('Error stack:', error.stack);
      // Beautiful gradient fallback
      orbContainer.innerHTML = '<div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); border-radius: 50%; box-shadow: 0 4px 16px rgba(118, 75, 162, 0.4); animation: float 3s ease-in-out infinite;"></div>';
    }
  }

  /**
   * Initialize panel header orb - EXACT copy of dashboard orb  
   */
  function initializePanelOrb() {
    const orbContainer = document.getElementById('emma-panel-orb');
    console.log('🔍 Panel orb container:', orbContainer);
    console.log('🔍 Current container contents:', orbContainer ? orbContainer.innerHTML : 'No container');
    
    if (orbContainer && window.EmmaOrb) {
      try {
        // CLEAR any existing content first!
        orbContainer.innerHTML = '';
        console.log('🧹 Cleared container contents');
        
        // Use YOUR EXACT orb settings!
        window.emmaPanelOrbInstance = new EmmaOrb(orbContainer, {
          hue: 0,
          hoverIntensity: 0.5,
          rotateOnHover: true,
          forceHoverState: false
        });
        console.log('✨ Panel orb initialized - EXACT dashboard copy');
        console.log('🔍 Final container contents:', orbContainer.innerHTML);
      } catch (error) {
        console.warn('Failed to initialize panel orb:', error);
        // Beautiful gradient fallback (NO BRAIN EMOJI!)  
        orbContainer.innerHTML = '<div style="width: 56px; height: 56px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); border-radius: 50%; box-shadow: 0 4px 16px rgba(118, 75, 162, 0.4); animation: float 3s ease-in-out infinite;"></div>';
      }
    } else if (orbContainer) {
      // Beautiful gradient fallback (NO BRAIN EMOJI!)
      orbContainer.innerHTML = '<div style="width: 56px; height: 56px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); border-radius: 50%; box-shadow: 0 4px 16px rgba(118, 75, 162, 0.4); animation: float 3s ease-in-out infinite;"></div>';
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
        isAlbum: url.includes('/album/') || url.includes('/shared/') || document.querySelector('[data-album-id]') || title.includes('album') || title.toLowerCase().includes('trip') || document.querySelector('[data-sharing-id]'),
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
    
    console.log('Emma: Added event listeners to', actions.length, 'action buttons');
  }

  /**
   * Handle clicks on dynamic action buttons with proper event delegation
   */
  function handleDynamicActionClick(event) {
    console.log('Emma: Action button clicked', event.target);
    
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
    
    console.log('Emma: Executing action:', button.dataset.action);
    
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
      <div style="padding: 12px; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; font-size: 13px; color: white;">
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
      <div style="padding: 12px; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; font-size: 13px; color: white;">
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
    
    // Helper function to safely update status
    const updateStatus = (message, isVisible = true) => {
      if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.style.display = isVisible ? 'block' : 'none';
        if (isVisible) {
          statusDiv.classList.add('show');
        }
      }
    };
    
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
        updateStatus('Saving all media from this page...');
        try {
          console.log('🔍 BATCH-SAVE: Starting UNIVERSAL approach...');
          
          // Use universal media capture for all sites
          const result = await chrome.runtime.sendMessage({ 
            action: 'media.batchImport',
            pageUrl: window.location.href,
            source: 'universal_page_media',
            useUniversalCapture: true,
            qualityThreshold: 3, // High quality only for saving
            maxElements: 100
          });
          
          console.log('🔍 BATCH-SAVE: Universal batch import result:', result);
          
          if (result && result.success) {
            const count = result.importCount || result.count || (result.elements && result.elements.length) || 0;
            if (count > 0) {
              updateStatus(`✅ Saved ${count} high-quality media items to memory vault`);
              if (result.summary) {
                console.log('🔍 BATCH-SAVE: Capture summary:', result.summary);
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
          const src = target.currentSrc || target.src;
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
            updateStatus('❌ Failed to save photo');
          }
          setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 3000);
        } catch (error) {
          console.error('Emma: Save current photo failed:', error);
          updateStatus('❌ Failed to save photo');
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
        updateStatus('Importing all media from this page...');
        try {
          const result = await chrome.runtime.sendMessage({ action: 'media.batchImport' });
          if (result.success) {
            updateStatus(`✅ Imported ${result.count} media items`);
          } else {
            updateStatus('❌ Failed to import media: ' + (result.message || 'Unknown error'));
          }
          setTimeout(() => {
            if (statusDiv) {
              statusDiv.style.display = 'none';
            }
          }, 3000);
        } catch (error) {
          console.error('Emma: Batch import failed:', error);
          updateStatus('❌ Failed to import media');
          setTimeout(() => {
            if (statusDiv) {
              statusDiv.style.display = 'none';
            }
          }, 2000);
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
      
      const checkAndScroll = () => {
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
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.3) !important;
          border: 3px solid #8b5cf6 !important;
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
          border: 1px solid rgba(139, 92, 246, 0.3) !important;
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
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'emma-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
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
  console.log('Emma Universal: Message listener attached');

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

  /**
   * Initialize when ready
   */
  if (document.readyState === 'loading') {
    console.log('Emma Universal: DOM loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
        
      initializeEmma();
    });
  } else {
    // For SPAs and dynamic content, delay slightly
    setTimeout(() => {
      initializeEmma();
    }, 500);
  }
  
  // Initialize media overlay system
  initializeMediaOverlays();
}

// --- Media Import System ---

/**
 * Scan page for media elements and return their metadata
 */
function scanPageForMedia(selector = 'img, video') {
  const elements = [];
  const mediaNodes = document.querySelectorAll(selector);
  const isGooglePhotos = window.location.hostname.includes('photos.google.com');
  
  console.log(`Emma: Scanning ${mediaNodes.length} media elements with selector: ${selector}`);
  EmmaLog.debug(`Emma: photos domain: ${isGooglePhotos}`);
  console.log(`Emma: Page URL: ${window.location.href}`);
  
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
          console.log(`Emma: Skipping small element ${index}: ${rect.width}x${rect.height}`);
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
        console.log(`Emma: Skipping element ${index}: no valid src`);
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
          console.log(`Emma: Skipping small sized image ${index}: size=${sizeMatch[1]}`);
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
  
  console.log(`Emma: Final scan result: ${elements.length} valid media elements`);
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
  
  console.log('🔍 UNIFIED getGooglePhotosElements:', {
    totalFound: allPhotos.length,
    afterSizeFilter: sizedPhotos.length,
    selector: 'UNIFIED_COMPLEX_SELECTOR'
  });
  
  return sizedPhotos;
}

// Google Photos: Aggressively collect all media by repeatedly scanning the grid while scrolling
async function collectAllGooglePhotos() {
  console.log('🔍 COLLECTION: Starting unified collection using SAME selector as detection...');
  
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
    console.log(`🔍 COLLECTION: === Iteration ${iterations} ===`);
    
    // Use the UNIFIED function that matches detectPageContext exactly
    const nodes = getGooglePhotosElements();
    
    console.log(`🔍 COLLECTION: Iteration ${iterations}: UNIFIED function found ${nodes.length} elements`);
    
    // If we're not finding any elements in early iterations, try a more aggressive approach
    if (iterations <= 3 && nodes.length === 0) {
      console.log('🔍 COLLECTION: No elements found with unified selector, trying fallback approaches...');
      
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
        console.log(`🔍 COLLECTION: Fallback selector "${selector}" found: ${fallbackElements.length} elements`);
        if (fallbackElements.length > 0) {
          // Use fallback elements but still apply size filtering
          const filteredFallback = Array.from(fallbackElements).filter(img => {
            const rect = img.getBoundingClientRect();
            return rect.width >= 32 && rect.height >= 32; // More permissive for fallback
          });
          console.log(`🔍 COLLECTION: After size filtering fallback: ${filteredFallback.length} elements`);
          
          // If we found usable elements with fallback, break out to use them
          if (filteredFallback.length > 0) {
            console.log('🔍 COLLECTION: Using fallback elements as nodes');
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
    console.log(`🔍 COLLECTION: Current collected count: ${collected.length}, seen set size: ${seen.size}`);
    
    if (newItemsFound === 0) {
      stableCount++;
      console.log(`🔍 COLLECTION: No new items found. Stable count: ${stableCount}`);
      // Be less aggressive about breaking early - ensure we actually find some items
      if (stableCount >= 3 && collected.length === 0) {
        console.log('🔍 COLLECTION: Breaking early - found nothing after 3 stable iterations');
        break;
      } else if (stableCount >= 5 && (collected.length > 10 || iterations > 15)) {
        console.log('🔍 COLLECTION: Breaking due to stable count reached with items collected');
        break;
      }
    } else {
      stableCount = 0; // Reset stable count if we found new items
    }
    lastCount = after;

    // Scroll further down to load more
    const step = Math.max(window.innerHeight, 800);
    console.log(`Emma: Scrolling down ${step}px...`);
    
    // Try multiple scrolling approaches for Google Photos
    let scrolled = false;
    
    // Try container scroll first
    if (container && container !== document.body && container !== document.scrollingElement) {
      if (container.scrollBy) {
        container.scrollBy(0, step);
        scrolled = true;
        console.log('Emma: Scrolled container');
      } else if (container.scrollTop !== undefined) {
        container.scrollTop += step;
        scrolled = true;
        console.log('Emma: Scrolled container via scrollTop');
      }
    }
    
    // Also try window scroll for Google Photos (it often uses both)
    window.scrollBy(0, step);
    console.log('Emma: Also scrolled window');
    
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
  console.log('🔍 CONTENT: - Total collected before dedup:', collected.length);
  console.log('🔍 CONTENT: - Unique items after dedup:', uniq.length);
  console.log('🔍 CONTENT: - Final unique sources:', uniq.map(u => u.src?.substring(0, 100)));
  console.log('🔍 CONTENT: - All collected items details:', uniq.slice(0, 10));
  
  return uniq;
}

/**
 * Generate a unique selector for an element
 */
function generateElementSelector(element) {
  if (element.id) return `#${element.id}`;
  if (element.className) {
    const classes = Array.from(element.classList).slice(0, 2).join('.');
    if (classes) return `${element.tagName.toLowerCase()}.${classes}`;
  }
  
  // Fallback to nth-child
  const parent = element.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(element) + 1;
    return `${generateElementSelector(parent)} > ${element.tagName.toLowerCase()}:nth-child(${index})`;
  }
  
  return element.tagName.toLowerCase();
}

/**
 * Initialize hover overlay system for media elements
 */
function initializeMediaOverlays() {
  let hoverOverlay = null;
  let currentElement = null;
  
  // Create overlay element
  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      background: linear-gradient(135deg, #8B5CF6, #A855F7);
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 12px;
      font-weight: 600;
      z-index: 999999;
      pointer-events: auto;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      backdrop-filter: blur(8px);
      transition: all 0.2s ease;
      user-select: none;
    `;
    overlay.textContent = '+ Emma';
    overlay.title = 'Add to Emma memory';
    
    // Click handler for media import
    overlay.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (currentElement) {
        try {
          const rect = currentElement.getBoundingClientRect();
          const src = currentElement.src || currentElement.currentSrc;
          const mediaType = currentElement.tagName.toLowerCase() === 'img' ? 'image' : 'video';
          
          // Show loading state
          overlay.textContent = '⏳';
          overlay.style.background = 'linear-gradient(135deg, #6B7280, #9CA3AF)';
          
          let result;
          
          if (src && !src.startsWith('data:')) {
            // Try direct URL import first
            result = await chrome.runtime.sendMessage({
              action: 'media.importFromUrl',
              url: src,
              pageUrl: window.location.href,
              mediaType
            });
          }
          
          // If URL import fails, fall back to screenshot
          if (!result?.success) {
            result = await chrome.runtime.sendMessage({
              action: 'media.captureElement',
              rect: {
                x: rect.x + window.scrollX,
                y: rect.y + window.scrollY,
                width: rect.width,
                height: rect.height
              },
              dpr: window.devicePixelRatio || 1,
              pageUrl: window.location.href,
              elementSelector: generateElementSelector(currentElement)
            });
          }
          
          if (result?.success) {
            overlay.textContent = '✓';
            overlay.style.background = 'linear-gradient(135deg, #10B981, #059669)';
            setTimeout(() => hideOverlay(), 1000);
          } else {
            overlay.textContent = '✗';
            overlay.style.background = 'linear-gradient(135deg, #EF4444, #DC2626)';
            setTimeout(() => hideOverlay(), 2000);
          }
        } catch (error) {
          console.error('Media import failed:', error);
          overlay.textContent = '✗';
          overlay.style.background = 'linear-gradient(135deg, #EF4444, #DC2626)';
          setTimeout(() => hideOverlay(), 2000);
        }
      }
    });
    
    return overlay;
  }
  
  function showOverlay(element, event) {
    if (!hoverOverlay) {
      hoverOverlay = createOverlay();
      document.body.appendChild(hoverOverlay);
    }
    
    currentElement = element;
    const rect = element.getBoundingClientRect();
    
    // Position overlay at top-right of element
    hoverOverlay.style.left = `${rect.right - 60 + window.scrollX}px`;
    hoverOverlay.style.top = `${rect.top + 5 + window.scrollY}px`;
    hoverOverlay.style.display = 'block';
    hoverOverlay.style.opacity = '1';
    
    // Reset to default state
    hoverOverlay.textContent = '+ Emma';
    hoverOverlay.style.background = 'linear-gradient(135deg, #8B5CF6, #A855F7)';
  }
  
  function hideOverlay() {
    if (hoverOverlay) {
      hoverOverlay.style.opacity = '0';
      setTimeout(() => {
        if (hoverOverlay && hoverOverlay.style.opacity === '0') {
          hoverOverlay.style.display = 'none';
          currentElement = null;
        }
      }, 200);
    }
  }
  
  // Set up event delegation for hover detection
  document.addEventListener('mouseover', (e) => {
    const target = e.target;
    if (target.tagName && (target.tagName.toLowerCase() === 'img' || target.tagName.toLowerCase() === 'video')) {
      // Skip tiny images
      const rect = target.getBoundingClientRect();
      if (rect.width < 20 || rect.height < 20) return;
      
      showOverlay(target, e);
    }
  });
  
  document.addEventListener('mouseout', (e) => {
    const target = e.target;
    if (target.tagName && (target.tagName.toLowerCase() === 'img' || target.tagName.toLowerCase() === 'video')) {
      // Delay hiding to allow moving to overlay
      setTimeout(() => {
        if (!hoverOverlay?.matches(':hover') && currentElement === target) {
          hideOverlay();
        }
      }, 100);
    }
  });
  
  // Hide overlay when it loses hover
  document.addEventListener('mouseover', (e) => {
    if (hoverOverlay && !hoverOverlay.contains(e.target) && currentElement && !currentElement.contains(e.target)) {
      setTimeout(() => {
        if (!hoverOverlay?.matches(':hover') && !currentElement?.matches(':hover')) {
          hideOverlay();
        }
      }, 100);
    }
  });
  
  console.log('Emma: Media overlay system initialized');
}
