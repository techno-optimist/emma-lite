// js/memories.js - External JavaScript for memory gallery

console.log('🧠 Emma Memory Gallery script loading...');

let allMemories = [];
let filteredMemories = [];

async function loadMemories() {
  const container = document.getElementById('memory-grid');
  const emptyState = document.getElementById('empty-state');
  const vaultBanner = document.getElementById('vault-banner');
  
  console.log('🧠 Emma Memory Gallery: Loading memories...');
  
  try {
    // Show loading state
    container.innerHTML = `
      <div class="loading-gallery">
        <div class="loading-capsule">
          <div class="loading-header"></div>
          <div class="loading-content">
            <div class="loading-line"></div>
            <div class="loading-line"></div>
            <div class="loading-line"></div>
          </div>
        </div>
        <div class="loading-capsule">
          <div class="loading-header"></div>
          <div class="loading-content">
            <div class="loading-line"></div>
            <div class="loading-line"></div>
            <div class="loading-line"></div>
          </div>
        </div>
        <div class="loading-capsule">
          <div class="loading-header"></div>
          <div class="loading-content">
            <div class="loading-line"></div>
            <div class="loading-line"></div>
            <div class="loading-line"></div>
          </div>
        </div>
      </div>
    `;
    
    // Check vault status using simplified direct storage approach (like dashboard)
    let vaultStatus = null;
    try {
      console.log('🔐 Memories: Checking vault status (simplified)...');
      const storage = await chrome.storage.local.get(['emma_vault_initialized', 'emma_vault_settings']);
      vaultStatus = {
        initialized: !!storage.emma_vault_initialized,
        settings: storage.emma_vault_settings
      };
      console.log('🔐 Memories: Simplified vault status:', vaultStatus);
      
      if (!vaultStatus.initialized) {
        // Vault not set up
        if (vaultBanner) {
          vaultBanner.style.display = 'block';
          vaultBanner.style.background = 'linear-gradient(90deg, rgba(244,63,94,0.15) 0%, rgba(239,68,68,0.15) 100%)';
          vaultBanner.style.border = '1px solid rgba(244,63,94,0.3)';
          vaultBanner.textContent = '🔧 Vault not set up · Use the dashboard to create your vault';
        }
      } else {
        // Vault exists - assume it's working (simplified approach)
        if (vaultBanner) {
          vaultBanner.style.display = 'block';
          vaultBanner.style.background = 'rgba(16,185,129,0.15)';
          vaultBanner.style.border = '1px solid rgba(16,185,129,0.3)';
          vaultBanner.textContent = `🔐 Vault active · Memory storage ready`;
        }
      }
    } catch (e) {
      console.error('🔐 Memories: Error checking vault status:', e);
      if (vaultBanner) {
        vaultBanner.style.display = 'block';
        vaultBanner.style.background = 'linear-gradient(90deg, rgba(244,63,94,0.15) 0%, rgba(239,68,68,0.15) 100%)';
        vaultBanner.style.border = '1px solid rgba(244,63,94,0.3)';
        vaultBanner.textContent = '⚠️ Could not check vault status · Use dashboard to manage vault';
      }
    }

    // Prefer Vault list first
    let vaultList = null;
    try {
      vaultList = await chrome.runtime.sendMessage({ action: 'vault.listCapsules', limit: 200 });
    } catch {}

    if (vaultList && vaultList.success && vaultList.items && vaultList.items.length > 0) {
      if (vaultBanner) {
        vaultBanner.style.display = 'block';
        vaultBanner.style.background = 'rgba(16,185,129,0.15)';
        vaultBanner.style.border = '1px solid rgba(16,185,129,0.3)';
        vaultBanner.textContent = '🔐 Vault active: showing encrypted capsules (headers only).';
      }
      allMemories = vaultList.items.map(h => ({
        id: h.id,
        content: h.title || '(Encrypted Capsule)',
        timestamp: h.ts || Date.now(),
        role: h.role || 'assistant',
        source: h.source || 'unknown'
      }));
      // Enrich with attachment previews
      await enrichMemoriesWithAttachments(allMemories);
      filteredMemories = [...allMemories];
      
      if (allMemories.length > 0) {
        displayMemories(filteredMemories);
        updateResultsCount();
      } else {
        // Continue to legacy fallback
        throw new Error('Vault returned no items');
      }
    } else {
      // Legacy background first
      const response = await chrome.runtime.sendMessage({ action: 'getAllMemories', limit: 1000, offset: 0 });
      if (response && response.success && response.memories && response.memories.length > 0) {
         allMemories = response.memories;
         await enrichMemoriesWithAttachments(allMemories);
         filteredMemories = [...allMemories];
        displayMemories(filteredMemories);
        updateResultsCount();
      } else {
        // Load from simplified storage (primary approach now)
        const result = await chrome.storage.local.get(['emma_memories']);
        const memories = result.emma_memories || [];
        if (memories.length > 0) {
          allMemories = memories;
          await enrichMemoriesWithAttachments(allMemories);
          filteredMemories = [...allMemories];
          displayMemories(filteredMemories);
          updateResultsCount();
          console.log(`✅ Loaded ${memories.length} memories from simplified storage`);
          
          // Update banner to show success
          if (vaultBanner && vaultStatus && vaultStatus.initialized) {
            vaultBanner.style.display = 'block';
            vaultBanner.style.background = 'rgba(16,185,129,0.15)';
            vaultBanner.style.border = '1px solid rgba(16,185,129,0.3)';
            vaultBanner.textContent = `🔐 Vault active · ${memories.length} memories stored`;
          }
        } else {
          showEmptyState();
          console.log('📭 No memories found in storage');
        }
      }
    }
  } catch (error) {
    console.error('🧠 Failed to load memories:', error);
    container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Failed to load memories</h3>
        <p>${error.message}</p>
        <button onclick="loadMemories()" class="btn-secondary">Try Again</button>
      </div>
    `;
  }
}

function displayMemories(memories) {
  const container = document.getElementById('memory-grid');
  const emptyState = document.getElementById('empty-state');
  
  if (memories.length === 0) {
    showEmptyState();
    return;
  }
  
  // Hide empty state
  emptyState.classList.add('hidden');
  
  const sortedMemories = memories.sort((a, b) => b.timestamp - a.timestamp);
  
  container.innerHTML = sortedMemories.map(memory => createMemoryCapsule(memory)).join('');
  
  // Add click handlers for memory cards
  container.querySelectorAll('.memory-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't open detail if clicking on action buttons
      if (e.target.closest('.memory-action-btn')) {
        return;
      }
      const memoryId = card.dataset.id;
      openMemoryDetail(memoryId);
    });
  });
}

// Fetch first attachment thumbnail for each memory to use as card background
async function enrichMemoriesWithAttachments(memories) {
  try {
    const limited = memories.slice(0, 60); // avoid excessive calls
    await Promise.all(limited.map(async (m) => {
      try {
        // Prefer attachment API when available
        const resp = await chrome.runtime.sendMessage({ action: 'attachment.list', capsuleId: m.id });
        if (resp && resp.success && Array.isArray(resp.items)) {
          m._attachmentCount = resp.items.length;
          if (resp.items.length) {
            const firstImage = resp.items.find(x => (x.type || '').startsWith('image')) || resp.items[0];
            if (firstImage) {
              // Request dataUrl for the first image to paint as bg
              const blobResp = await chrome.runtime.sendMessage({ action: 'attachment.get', id: firstImage.id });
              if (blobResp && blobResp.success && blobResp.dataUrl) {
                m._previewThumb = blobResp.dataUrl;
              }
            }
          }
        } else if (Array.isArray(m.attachments) && m.attachments.length) {
          // Fallback for simplified storage where attachments are embedded on the capsule
          m._attachmentCount = m.attachments.length;
          const first = m.attachments[0];
          if (first && first.src) {
            m._previewThumb = first.src; // may be remote URL
          }
        }
      } catch {}
    }));
  } catch {}
}

function createMemoryCapsule(memory) {
  const timeAgo = getTimeAgo(new Date(memory.timestamp));
  
  // Handle conversation capsules vs individual memories
  let displayTitle, displayContent, messageCount = 0, totalChars = 0;
  
  if (memory.type === 'conversation' && memory.messages) {
    displayTitle = memory.title;
    messageCount = memory.messageCount || memory.messages.length;
    
    // Show preview of first message
    const firstMessage = memory.messages[0];
    displayContent = firstMessage ? firstMessage.content : 'No content';
    
    // Calculate total character count for all messages
    totalChars = memory.messages.reduce((total, msg) => total + (msg.content ? msg.content.length : 0), 0);
  } else {
    displayTitle = memory.title || 'Untitled Memory';
    displayContent = memory.content || 'No content';
    totalChars = displayContent.length;
  }
  
  const preview = displayContent ? escapeHtml(displayContent.substring(0, 200)) : 'No content';
  const platform = memory.metadata?.platform || memory.source || 'unknown';
  
  const attachmentCount = memory._attachmentCount || memory.attachmentCount || (Array.isArray(memory.attachments) ? memory.attachments.length : 0);
  const bgStyle = memory._previewThumb ? `style=\"background-image:url('${memory._previewThumb}'); background-size:cover; background-position:center;\"` : '';
  return `
    <div class="memory-card" data-id="${memory.id}">
      <div class="memory-card-header" ${bgStyle}>
        <div class="memory-category">${memory.type || 'note'}</div>
        <div class="memory-actions">
          <button class="memory-action-btn" onclick="deleteMemory('${memory.id}')" title="Delete">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
        ${memory._previewThumb ? '' : `<div class="memory-icon">${memory.type === 'conversation' ? '💬' : '📝'}</div>`}
        ${attachmentCount ? `<div class="memory-badge">🖼️ ${attachmentCount}</div>` : ''}
      </div>
      
      <div class="memory-card-content">
        <h3 class="memory-title">${escapeHtml(displayTitle)}</h3>
        <p class="memory-description">
          ${preview}${displayContent.length > 200 ? '...' : ''}
        </p>
        <div class="memory-meta">
          <span class="memory-date">${timeAgo}</span>
          <span class="memory-stats">
            ${messageCount > 0 ? `${messageCount} messages • ` : ''}${getSourceName(platform)}
          </span>
        </div>
      </div>
    </div>
  `;
}

// Get friendly source name
function getSourceName(source) {
  const sourceMap = {
    'claude': 'Claude',
    'chatgpt': 'ChatGPT',
    'selection': 'Text Selection',
    'test': 'Test Data'
  };
  return sourceMap[source] || 'Unknown';
}

function getSourceIcon(source) {
  const icons = {
    claude: '🤖',
    chatgpt: '💬',
    selection: '✨',
    unknown: '📝'
  };
  return icons[source] || '📝';
}

function showEmptyState() {
  const container = document.getElementById('memory-grid');
  const emptyState = document.getElementById('empty-state');
  
  // Hide the grid content and show empty state
  container.innerHTML = '';
  emptyState.classList.remove('hidden');
  
  // Update empty state message
  const emptyMessageText = document.getElementById('empty-message-text');
  if (emptyMessageText) {
    emptyMessageText.textContent = 'Start creating your first memory capsule';
  }
}

// Generate sample memories for testing
async function generateSampleMemories() {
  const sampleMemories = [
    {
      content: 'Hello, how are you doing today?',
      role: 'user',
      source: 'chatgpt',
      type: 'conversation',
      metadata: { timestamp: Date.now() - 3600000 }
    },
    {
      content: "I'm doing well, thank you! How can I help you today?",
      role: 'assistant',
      source: 'chatgpt',
      type: 'conversation',
      metadata: { timestamp: Date.now() - 3500000 }
    },
    {
      content: 'Can you explain quantum computing to me?',
      role: 'user',
      source: 'claude',
      type: 'conversation',
      metadata: { timestamp: Date.now() - 7200000 }
    },
    {
      content: 'Quantum computing is a revolutionary computing paradigm that leverages quantum mechanical phenomena like superposition and entanglement to process information in ways that classical computers cannot...',
      role: 'assistant',
      source: 'claude',
      type: 'conversation',
      metadata: { timestamp: Date.now() - 7100000 }
    },
    {
      content: 'The future of AI will be shaped by advances in neural architectures, training methodologies, and computational efficiency.',
      role: 'user',
      source: 'selection',
      type: 'text_selection',
      metadata: { timestamp: Date.now() - 1800000 }
    }
  ];
  
  try {
    for (const memory of sampleMemories) {
      await chrome.runtime.sendMessage({
        action: 'saveMemory',
        data: memory
      });
    }
    
    showNotification('Sample memories generated successfully!');
    await loadMemories(); // Reload the gallery
    
  } catch (error) {
    console.error('Failed to generate sample memories:', error);
    showNotification('Failed to generate sample memories: ' + error.message, 'error');
  }
}

// Simple notification system
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#ef4444' : '#10b981'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function filterMemories() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const sourceFilter = document.getElementById('source-filter').value;
  const roleFilter = document.getElementById('role-filter').value;
  
  filteredMemories = allMemories.filter(memory => {
    const matchesSearch = memory.content.toLowerCase().includes(searchTerm);
    const matchesSource = sourceFilter === 'all' || memory.source === sourceFilter;
    const matchesRole = roleFilter === 'all' || memory.role === roleFilter;
    
    return matchesSearch && matchesSource && matchesRole;
  });
  
  displayMemories(filteredMemories);
  updateResultsCount();
}

function updateResultsCount() {
  const filteredCountEl = document.getElementById('filtered-count');
  const totalCountEl = document.getElementById('total-count');
  const total = allMemories.length;
  const showing = filteredMemories.length;
  
  if (filteredCountEl) filteredCountEl.textContent = showing;
  if (totalCountEl) totalCountEl.textContent = total;
}

function refreshMemories() {
  loadMemories();
}

// --- Constellation View ---
async function loadConstellationView() {
  const grid = document.getElementById('memory-grid');
  const headerTitle = document.querySelector('.page-title');
  if (headerTitle) headerTitle.textContent = 'Constellation View';
  const resultsInfo = document.querySelector('.results-info');
  if (resultsInfo) resultsInfo.style.display = 'none';
  const searchFilter = document.querySelector('.search-filter-section');
  if (searchFilter) searchFilter.style.display = 'none';

  grid.innerHTML = '';

  // Fetch memories using same vault → background → local order
  let items = [];
  try {
    const vaultList = await chrome.runtime.sendMessage({ action: 'vault.listCapsules', limit: 200 });
    if (vaultList && vaultList.success && Array.isArray(vaultList.items) && vaultList.items.length) {
      items = vaultList.items.map(h => ({
        id: h.id,
        title: h.title || '(Encrypted Capsule)',
        timestamp: h.ts || Date.now(),
        source: h.source || 'unknown',
        tags: []
      }));
    }
  } catch {}

  if (!items.length) {
    try {
      const resp = await chrome.runtime.sendMessage({ action: 'getAllMemories', limit: 500, offset: 0 });
      if (resp && resp.success && Array.isArray(resp.memories) && resp.memories.length) {
        items = resp.memories.map(m => ({
          id: m.id,
          title: m.title || m.metadata?.title || (m.content ? String(m.content).slice(0, 40) : 'Untitled'),
          timestamp: m.timestamp || Date.now(),
          source: m.metadata?.platform || m.source || 'unknown',
          tags: Array.isArray(m.metadata?.tags)
            ? m.metadata.tags
            : (typeof m.metadata?.tags === 'string' ? m.metadata.tags.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(m.tags) ? m.tags : []))
        }));
      }
    } catch {}
  }

  if (!items.length) {
    try {
      const res = await chrome.storage.local.get(['emma_memories']);
      const list = res.emma_memories || [];
      items = list.map(m => ({
        id: m.id,
        title: m.title || m.metadata?.title || (m.content ? String(m.content).slice(0, 40) : 'Untitled'),
        timestamp: m.timestamp || Date.now(),
        source: m.metadata?.platform || m.source || 'unknown',
        tags: Array.isArray(m.metadata?.tags)
          ? m.metadata.tags
          : (typeof m.metadata?.tags === 'string' ? m.metadata.tags.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(m.tags) ? m.tags : []))
      }));
    } catch {}
  }

  if (!items.length) {
    grid.innerHTML = '<div class="empty-state">No memories available to render constellation.</div>';
    return;
  }

  // Sort by time for subtle adjacency edges
  items.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  // Make available to detail modal
  try { allMemories = items.map(it => ({ id: it.id, title: it.title, timestamp: it.timestamp, source: it.source })); } catch {}

  // Create canvas host
  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  wrap.style.width = '100%';
  wrap.style.height = '68vh';
  wrap.style.minHeight = '420px';
  wrap.style.border = '1px solid var(--emma-border)';
  wrap.style.borderRadius = '16px';
  wrap.style.background = 'var(--emma-card-bg)';
  wrap.style.backdropFilter = 'blur(20px)';

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  wrap.appendChild(canvas);

  // Tooltip
  const tip = document.createElement('div');
  tip.style.position = 'absolute';
  tip.style.pointerEvents = 'none';
  tip.style.padding = '8px 10px';
  tip.style.border = '1px solid var(--emma-border)';
  tip.style.borderRadius = '8px';
  tip.style.background = 'rgba(0,0,0,0.6)';
  tip.style.color = '#e9d5ff';
  tip.style.fontSize = '12px';
  tip.style.transform = 'translate(8px, -8px)';
  tip.style.display = 'none';
  wrap.appendChild(tip);

  // Controls (cluster + reset)
  const controls = document.createElement('div');
  controls.style.position = 'absolute';
  controls.style.top = '8px';
  controls.style.left = '8px';
  controls.style.display = 'flex';
  controls.style.gap = '8px';
  controls.style.background = 'rgba(0,0,0,0.4)';
  controls.style.border = '1px solid var(--emma-border)';
  controls.style.borderRadius = '10px';
  controls.style.padding = '6px 8px';
  controls.style.backdropFilter = 'blur(8px)';
  controls.innerHTML = `
    <label style="font-size:12px; color:#e9d5ff; display:flex; align-items:center; gap:6px;">
      Cluster:
      <select id="cluster-mode" style="font-size:12px; background:rgba(17,24,39,0.6); color:#e9d5ff; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:3px 6px;">
        <option value="none">None</option>
        <option value="source">Source</option>
        <option value="tags">Tags</option>
      </select>
    </label>
    <button id="reset-view" class="btn secondary" style="font-size:12px; padding:4px 8px;">Reset</button>
  `;
  wrap.appendChild(controls);

  grid.appendChild(wrap);

  const ctx = canvas.getContext('2d');

  // View transform for pan/zoom
  const view = { scale: 1, tx: 0, ty: 0 };
  const minScale = 0.5;
  const maxScale = 3;
  let dragging = false;
  let dragStart = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    draw();
  }
  window.addEventListener('resize', resize);

  // Layout: radial by time
  const center = () => {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.width / 2, y: rect.height / 2 };
  };
  const nodeRadius = 6;
  const positions = new Map();
  let clusterMode = 'none';

  function groupItems() {
    if (clusterMode === 'none') return { groups: [{ key: 'All', items: items }] };
    const map = new Map();
    for (const it of items) {
      let key = 'Other';
      if (clusterMode === 'source') {
        key = (it.source || 'unknown').toString();
      } else if (clusterMode === 'tags') {
        const t = Array.isArray(it.tags) && it.tags.length ? it.tags[0] : null;
        key = t || 'untagged';
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    const entries = Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
    const maxClusters = 8;
    const top = entries.slice(0, maxClusters);
    if (entries.length > maxClusters) {
      const rest = entries.slice(maxClusters).flatMap(e => e[1]);
      top.push(['Other', rest]);
    }
    return { groups: top.map(([key, arr]) => ({ key, items: arr })) };
  }

  function layout() {
    positions.clear();
    const n = items.length;
    const minTs = items[0].timestamp || 0;
    const maxTs = items[n - 1].timestamp || 1;
    const c = center();
    const rect = canvas.getBoundingClientRect();
    const rMax = Math.max(40, Math.min(rect.width, rect.height) / 2 - 40);

    if (clusterMode === 'none') {
      for (let i = 0; i < n; i++) {
        const t = items[i].timestamp || 0;
        const norm = maxTs === minTs ? 0.5 : (t - minTs) / (maxTs - minTs);
        const angle = (i / n) * Math.PI * 2;
        const radius = 24 + norm * rMax;
        const x = c.x + Math.cos(angle) * radius;
        const y = c.y + Math.sin(angle) * radius;
        positions.set(items[i].id, { x, y });
      }
      return;
    }

    const { groups } = groupItems();
    const gCount = groups.length;
    const ringR = Math.max(60, rMax * 0.6);
    for (let gi = 0; gi < gCount; gi++) {
      const g = groups[gi];
      const gAngle = (gi / gCount) * Math.PI * 2;
      const gx = c.x + Math.cos(gAngle) * ringR;
      const gy = c.y + Math.sin(gAngle) * ringR;
      const m = g.items.length;
      const innerR = Math.max(20, Math.min(80, 18 + Math.sqrt(m) * 10));
      for (let j = 0; j < m; j++) {
        const a = (j / m) * Math.PI * 2;
        const rr = innerR * (0.7 + 0.3 * ((j % 5) / 5));
        const x = gx + Math.cos(a) * rr;
        const y = gy + Math.sin(a) * rr;
        positions.set(g.items[j].id, { x, y });
      }
    }
  }

  // Edges: connect neighbors by time
  const edges = [];
  for (let i = 0; i < items.length - 1; i++) {
    edges.push([items[i].id, items[i + 1].id]);
  }

  function colorForSource(src) {
    const map = {
      chatgpt: '#10a37f',
      claude: '#ff6b35',
      selection: '#a855f7',
      unknown: '#9ca3af',
      manual: '#93c5fd'
    };
    return map[(src || 'unknown').toLowerCase()] || '#9ca3af';
  }

  let hoverId = null;

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(view.tx, view.ty);
    ctx.scale(view.scale, view.scale);

    layout();
    const rect = canvas.getBoundingClientRect();
    const c2x = rect.width / 2, c2y = rect.height / 2;

    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = 'rgba(148,163,184,0.5)';
    ctx.lineWidth = 1;
    for (const [a, b] of edges) {
      const pa = positions.get(a), pb = positions.get(b);
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const item of items) {
      const p = positions.get(item.id);
      if (!p) continue;
      const r = (item.id === hoverId) ? nodeRadius + 2 : nodeRadius;
      ctx.beginPath();
      ctx.fillStyle = colorForSource(item.source);
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Reset to screen space for title
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(226,232,240,0.8)';
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Memories Constellation', c2x, 20);
  }

  function hitTest(mx, my) {
    const xw = (mx - view.tx);
    const yw = (my - view.ty);
    const wx = xw / view.scale;
    const wy = yw / view.scale;
    for (const item of items) {
      const p = positions.get(item.id);
      if (!p) continue;
      const dx = p.x - wx;
      const dy = p.y - wy;
      if (Math.hypot(dx, dy) <= nodeRadius + 3) return item.id;
    }
    return null;
  }

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (dragging) {
      view.tx = dragStart.tx + (mx - dragStart.x);
      view.ty = dragStart.ty + (my - dragStart.y);
      draw();
      return;
    }
    const id = hitTest(mx, my);
    hoverId = id;
    if (id) {
      const item = items.find(x => x.id === id);
      if (item) {
        tip.innerHTML = `${escapeHtml(item.title || '(Untitled)')}<br/><span style="opacity:.8">${new Date(item.timestamp).toLocaleString()}</span>`;
        tip.style.left = `${mx + 10}px`;
        tip.style.top = `${my - 10}px`;
        tip.style.display = 'block';
      }
    } else {
      tip.style.display = 'none';
    }
    draw();
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const id = hitTest(mx, my);
    if (id) openMemoryDetail(id);
  });

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top, tx: view.tx, ty: view.ty };
    dragging = true;
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  canvas.addEventListener('mouseleave', () => { dragging = false; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const zoom = Math.exp(-e.deltaY * 0.0015);
    const newScale = Math.max(minScale, Math.min(maxScale, view.scale * zoom));
    const wx = (mx - view.tx) / view.scale;
    const wy = (my - view.ty) / view.scale;
    view.scale = newScale;
    view.tx = mx - wx * view.scale;
    view.ty = my - wy * view.scale;
    draw();
  }, { passive: false });

  const clusterSelect = controls.querySelector('#cluster-mode');
  clusterSelect.addEventListener('change', () => { clusterMode = clusterSelect.value; draw(); });
  const resetBtn = controls.querySelector('#reset-view');
  resetBtn.addEventListener('click', () => { view.scale = 1; view.tx = 0; view.ty = 0; draw(); });

  resize();
}

function openMemoryDetail(memoryId) {
  const memory = allMemories.find(m => m.id == memoryId);
  if (!memory) return;
  
  // Create modal for memory detail
  const modal = document.createElement('div');
  modal.className = 'memory-detail-modal';
  modal.innerHTML = `
    <div class="memory-detail-overlay"></div>
    <div class="memory-detail-content">
      <div class="memory-detail-header">
        <h2>${escapeHtml(memory.title || 'Untitled Memory')}</h2>
        <button class="close-btn">×</button>
      </div>
      <div class="memory-tabs">
        <button class="tab-btn active" data-tab="overview">Overview</button>
        <button class="tab-btn" data-tab="meta">Meta</button>
        <button class="tab-btn" data-tab="media">Media <span class="tab-count" id="tab-media-count">0</span></button>
        <button class="tab-btn" data-tab="people">People <span class="tab-count" id="tab-people-count">0</span></button>
        <button class="tab-btn" data-tab="related">Related <span class="tab-count" id="tab-related-count">0</span></button>
        <div style="margin-left:auto; padding:8px 12px;">
          <button class="btn secondary" id="share-memory-btn">Share</button>
        </div>
      </div>
      <div class="memory-detail-body" id="memory-detail-body"></div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners for closing
  const overlay = modal.querySelector('.memory-detail-overlay');
  const closeBtn = modal.querySelector('.close-btn');
  
  overlay.addEventListener('click', () => closeMemoryDetail());
  closeBtn.addEventListener('click', () => closeMemoryDetail());
  
  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeMemoryDetail();
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Store the handler on the modal for cleanup
  modal._escapeHandler = handleEscape;
  
  // Local tab state & lazy loading
  let activeTab = 'overview';
  const bodyHost = modal.querySelector('#memory-detail-body');
  const tabButtons = Array.from(modal.querySelectorAll('.tab-btn'));
  tabButtons.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  modal.querySelector('#share-memory-btn').addEventListener('click', () => openShareModal(memory));

  // Preload counts (media, people, related)
  preloadCounts(memory).then(({ mediaCount, peopleCount, relatedCount }) => {
    const setCount = (id, val) => { const el = modal.querySelector(id); if (el) el.textContent = String(val); };
    setCount('#tab-media-count', mediaCount);
    setCount('#tab-people-count', peopleCount);
    setCount('#tab-related-count', relatedCount);
  }).catch(() => {});

  function switchTab(tab) {
    activeTab = tab;
    tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    renderTab();
  }

  function renderTab() {
    if (activeTab === 'overview') {
      bodyHost.innerHTML = renderOverview(memory);
      wireOverviewActions(bodyHost, memory);
    } else if (activeTab === 'meta') {
      bodyHost.innerHTML = renderMeta(memory);
    } else if (activeTab === 'media') {
      loadMedia(memory).then(items => {
        bodyHost.innerHTML = renderMedia(items);
        wireMediaActions(bodyHost, items);
      }).catch(() => { bodyHost.innerHTML = '<div class="media-empty">Failed to load media</div>'; });
    } else if (activeTab === 'people') {
      loadPeople(memory).then(list => {
        bodyHost.innerHTML = renderPeople(list);
      }).catch(() => { bodyHost.innerHTML = '<div class="media-empty">Failed to load people</div>'; });
    } else if (activeTab === 'related') {
      loadRelated(memory).then(list => {
        bodyHost.innerHTML = renderRelated(list);
      }).catch(() => { bodyHost.innerHTML = '<div class="media-empty">Failed to load related</div>'; });
    }
  }

  // initial render
  window._currentMemoryId = memory.id;
  renderTab();

  setTimeout(() => modal.classList.add('active'), 10);
}

// --- Rendering helpers ---
function renderOverview(memory) {
  if (Array.isArray(memory.messages) && memory.messages.length) {
    const messagesHtml = memory.messages.map(msg => `
      <div class="conversation-message ${msg.role || 'user'}">
        <div class="message-header">
          <span class="message-role">${msg.role || 'user'}</span>
          <span class="message-time">${getTimeAgo(new Date(msg.timestamp || memory.timestamp))}</span>
        </div>
        <div class="message-content">${escapeHtml(msg.content || '')}</div>
      </div>
    `).join('');
    return `
      <div class="overview-section">
        <div class="conversation-meta">
          <span class="conversation-platform">${memory.metadata?.platform || 'Unknown Platform'}</span>
          <span class="conversation-stats">${memory.messageCount || memory.messages.length} messages</span>
          <span class="conversation-date">${getTimeAgo(new Date(memory.timestamp))}</span>
        </div>
        <div class="conversation-messages">${messagesHtml}</div>
      </div>
    `;
  }
  const description = memory.content || memory.metadata?.description || '';
  const show = description || memory.metadata?.title || '';
  return `
    <div class="overview-section">
      <div class="description">${escapeHtml(show || 'No description')}</div>
      <div class="memory-meta-detail" style="margin-top:16px;">
        <span>Source: ${memory.source || memory.metadata?.platform || 'Unknown'}</span>
        <span>Created: ${getTimeAgo(new Date(memory.timestamp))}</span>
      </div>
    </div>
  `;
}

function renderMeta(memory) {
  const md = memory.metadata || {};
  // Build a large text corpus to detect entities if not present
  const corpus = (() => {
    if (memory.type === 'conversation' && Array.isArray(memory.messages)) {
      return memory.messages.map(m => m.content || '').join('\n');
    }
    return (memory.content || '') + '\n' + (md.description || '');
  })();
  const entities = memory.entities || extractEntitiesLocal(corpus);
  const participants = Array.isArray(md.participants) ? md.participants : [];
  const label = (s) => `<div class="meta-label">${s}</div>`;
  const value = (s) => `<div class="meta-value">${s || '<span class=\"muted\">—</span>'}</div>`;
  const chips = (arr, prefix='') => (arr && arr.length) ? arr.map(x => `<span class="chip">${prefix}${escapeHtml(String(x))}</span>`).join(' ') : '<span class="muted">—</span>';
  const url = md.url || md.canonicalUrl || '';
  const link = url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>` : '<span class="muted">—</span>';
  const published = md.publishedAt || md.articlePublishedTime || '';
  const attCount = memory.attachmentCount || memory._attachmentCount || (Array.isArray(memory.attachments) ? memory.attachments.length : 0) || 0;
  return `
    <div class="meta-grid">
      <div class="meta-row">${label('Type')}${value(escapeHtml(memory.type || 'unknown'))}</div>
      <div class="meta-row">${label('Title')}${value(escapeHtml(md.title || memory.title || ''))}</div>
      <div class="meta-row">${label('Author')}${value(escapeHtml(md.author || ''))}</div>
      <div class="meta-row">${label('Participants')}${value(chips(participants))}</div>
      <div class="meta-row">${label('Site')}${value(escapeHtml(md.siteName || ''))}</div>
      <div class="meta-row">${label('URL')}${value(link)}</div>
      <div class="meta-row">${label('Published')}${value(escapeHtml(published))}</div>
      <div class="meta-row">${label('OG Type')}${value(escapeHtml(md.ogType || ''))}</div>
      <div class="meta-row">${label('Attachments')}${value(String(attCount))}</div>
      <div class="meta-sep"></div>
      <div class="meta-row">${label('Mentions')}${value(chips(entities.mentions, '@'))}</div>
      <div class="meta-row">${label('Hashtags')}${value(chips(entities.hashtags, '#'))}</div>
      <div class="meta-row">${label('Links')}${value((entities.urls||[]).map(u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${escapeHtml(u)}</a>`).join('<br/>') || '<span class=\"muted\">—</span>')}</div>
    </div>
  `;
}

function extractEntitiesLocal(text) {
  const mentions = Array.from((text||'').matchAll(/(^|\s)@([a-zA-Z0-9_]{2,30})\b/g)).map(m => m[2]);
  const hashtags = Array.from((text||'').matchAll(/(^|\s)#([\p{L}0-9_]{2,50})/gu)).map(m => m[2]);
  const urls = Array.from((text||'').matchAll(/https?:\/\/[\w.-]+(?:\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?/g)).map(m => m[0]);
  return { mentions: Array.from(new Set(mentions)), hashtags: Array.from(new Set(hashtags)), urls: Array.from(new Set(urls)) };
}

function renderMedia(items) {
  if (!items || !items.length) return '<div class="media-empty">No media</div>';
  return `
    <div>
      <div class="media-toolbar">
        <div>Media (${items.length})</div>
        <button class="btn" id="slideshow-start">Start Slideshow</button>
      </div>
      <div class="media-grid">
        ${items.map((it, idx) => `
          <div class="media-thumb" data-idx="${idx}" data-id="${it.id}">
            <div style="position:absolute; top:6px; right:6px; display:flex; gap:6px; z-index:2;">
              <button class="btn secondary media-rename" data-id="${it.id}" title="Rename/Caption">✎</button>
              <button class="btn secondary media-delete" data-id="${it.id}" title="Delete">🗑</button>
            </div>
            ${it.type && it.type.startsWith('video') ? `<video src="${it.url}" muted></video>` : `<img src="${it.url}" alt="media" />`}
            ${it.caption ? `<div style="position:absolute; left:8px; bottom:8px; background:rgba(0,0,0,0.5); padding:4px 8px; border-radius:8px; font-size:12px;">${escapeHtml(it.caption)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderPeople(list) {
  if (!list || !list.length) return '<div class="media-empty">No people tagged</div>';
  return `<div class="people-grid">${list.map(p => `
    <div class="person-card">
      <div class="person-avatar">${(p.name || '?').slice(0,1)}</div>
      <div>
        <div style="font-weight:600;">${p.name || 'Unknown'}</div>
        <div style="font-size:12px; color:var(--emma-text-tertiary);">${p.relationship || 'Friend'}</div>
      </div>
    </div>
  `).join('')}</div>`;
}

function renderRelated(list) {
  if (!list || !list.length) return '<div class="media-empty">No related memories found</div>';
  return `<div class="related-list">${list.map(r => `<div class="related-item">${escapeHtml(r.title || r.content || 'Memory')}</div>`).join('')}</div>`;
}

// --- Data loaders (bridge to background / mtap) ---
async function preloadCounts(memory) {
  const [media, people, related] = await Promise.all([
    loadMedia(memory).catch(() => []),
    loadPeople(memory).catch(() => []),
    loadRelated(memory).catch(() => [])
  ]);
  return { mediaCount: media.length, peopleCount: people.length, relatedCount: related.length };
}

async function loadMedia(memory) {
  // Ask background for attachments for this capsule
  try {
    const resp = await chrome.runtime.sendMessage({ action: 'attachment.list', capsuleId: memory.id });
    if (resp && resp.success && Array.isArray(resp.items)) {
      // Fetch data URLs so images display even when remote URLs are blocked or ephemeral
      const items = await Promise.all(resp.items.map(async (it) => {
        try {
          const blobResp = await chrome.runtime.sendMessage({ action: 'attachment.get', id: it.id });
          const url = (blobResp && blobResp.success && blobResp.dataUrl) ? blobResp.dataUrl : (it.sourceUrl || '');
          return { ...it, url };
        } catch {
          return { ...it, url: it.sourceUrl || '' };
        }
      }));
      return items;
    }
  } catch {}
  // Fallback to embedded attachments (simplified storage)
  if (Array.isArray(memory.attachments) && memory.attachments.length) {
    return memory.attachments.map((a, i) => ({
      id: a.id || `att_${memory.id}_${i}`,
      type: a.type || (a.mime && a.mime.startsWith('video') ? 'video' : 'image'),
      url: a.src || a.url || a.sourceUrl || '',
      caption: a.caption || ''
    }));
  }
  return [];
}

async function loadPeople(memory) {
  try {
    const resp = await chrome.runtime.sendMessage({ action: 'memory.getPeople', id: memory.id });
    if (resp && resp.success && Array.isArray(resp.items)) return resp.items;
  } catch {}
  return [];
}

async function loadRelated(memory) {
  try {
    const resp = await chrome.runtime.sendMessage({ action: 'memory.getRelated', id: memory.id, limit: 10 });
    if (resp && resp.success && Array.isArray(resp.items)) return resp.items;
  } catch {}
  return [];
}

// --- Wire actions ---
function wireOverviewActions(host, memory) { /* reserved for future actions */ }

function wireMediaActions(host, items) {
  const startBtn = host.querySelector('#slideshow-start');
  const thumbs = Array.from(host.querySelectorAll('.media-thumb'));
  const openAt = (idx) => openSlideshow(items, idx);
  if (startBtn) startBtn.addEventListener('click', () => openAt(0));
  thumbs.forEach(t => t.addEventListener('click', () => openAt(parseInt(t.dataset.idx, 10))));

  // Delete
  host.querySelectorAll('.media-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!confirm('Delete this attachment?')) return;
      await chrome.runtime.sendMessage({ action: 'attachment.delete', id });
      const refreshed = await loadMedia({ id: window._currentMemoryId });
      host.innerHTML = renderMedia(refreshed);
      wireMediaActions(host, refreshed);
    });
  });

  // Rename/Caption (stores caption client-side in meta for now)
  host.querySelectorAll('.media-rename').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const caption = prompt('Enter caption/title for this media:');
      if (caption == null) return;
      // Use efficient attachment.update API
      const resp = await chrome.runtime.sendMessage({ 
        action: 'attachment.update', 
        id, 
        updates: { caption } 
      });
      if (resp && resp.success) {
        const refreshed = await loadMedia({ id: window._currentMemoryId });
        host.innerHTML = renderMedia(refreshed);
        wireMediaActions(host, refreshed);
      }
    });
  });

  // Drag & drop import (MVP)
  const container = host.closest('.memory-detail-content');
  if (container && window._currentMemoryId) {
    container.addEventListener('dragover', (e) => { e.preventDefault(); });
    container.addEventListener('drop', async (e) => {
      e.preventDefault();
      const dt = e.dataTransfer;
      if (!dt || !dt.files || !dt.files.length) return;
      const file = dt.files[0];
      const dataUrl = await fileToDataUrl(file);
      const meta = { id: `att_${Date.now()}`, mime: file.type, size: file.size, type: file.type.startsWith('video') ? 'video' : 'image', capturedAt: new Date().toISOString(), capsuleId: window._currentMemoryId };
      await chrome.runtime.sendMessage({ action: 'attachment.add', meta, dataUrl });
      // Refresh
      const refreshed = await loadMedia({ id: window._currentMemoryId });
      host.innerHTML = renderMedia(refreshed);
      wireMediaActions(host, refreshed);
    });
  }
}

function openSlideshow(items, startIndex) {
  const wrap = document.createElement('div');
  wrap.className = 'slideshow-modal';
  wrap.innerHTML = `
    <div class="slideshow-frame">
      <button class="slide-close">×</button>
      <button class="slide-nav slide-prev">‹</button>
      <button class="slide-nav slide-next">›</button>
      <img class="slideshow-media" id="slide-media" />
    </div>`;
  document.body.appendChild(wrap);
  let index = startIndex || 0;
  async function render() {
    const img = wrap.querySelector('#slide-media');
    const att = items[index];
    // If we don't have a dataUrl, request the blob from background
    if (!att.url || att.url.startsWith('http')) {
      try {
        const resp = await chrome.runtime.sendMessage({ action: 'attachment.get', id: att.id });
        if (resp && resp.success && resp.dataUrl) {
          img.src = resp.dataUrl;
          return;
        }
      } catch {}
    }
    img.src = att.url;
  }
  const close = () => wrap.remove();
  wrap.querySelector('.slide-close').addEventListener('click', close);
  wrap.querySelector('.slide-prev').addEventListener('click', () => { index = (index - 1 + items.length) % items.length; render(); });
  wrap.querySelector('.slide-next').addEventListener('click', () => { index = (index + 1) % items.length; render(); });
  render();
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } catch (e) { reject(e); }
  });
}

// --- Share ---
function openShareModal(memory) {
  const wrap = document.createElement('div');
  wrap.className = 'share-modal';
  const shareUrl = location.origin + '/memories.html#' + encodeURIComponent(memory.id);
  wrap.innerHTML = `
    <div class="share-card">
      <div style="font-weight:700; margin-bottom:8px;">Share Memory</div>
      <input class="share-input" value="${shareUrl}" readonly />
      <div class="share-actions">
        <button class="btn" id="share-copy">Copy Link</button>
        <button class="btn secondary" id="share-close">Close</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('#share-close').addEventListener('click', () => wrap.remove());
  wrap.querySelector('#share-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(shareUrl); } catch {}
  });
}

function closeMemoryDetail() {
  const modal = document.querySelector('.memory-detail-modal');
  if (modal) {
    modal.classList.remove('active');
    
    // Clean up escape key listener
    if (modal._escapeHandler) {
      document.removeEventListener('keydown', modal._escapeHandler);
    }
    
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

// Make it globally available
window.closeMemoryDetail = closeMemoryDetail;

function getTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('🧠 DOM loaded, starting memory view...');
  // Route by query param
  let isConstellation = false;
  try {
    const params = new URLSearchParams(window.location.search);
    isConstellation = params.get('view') === 'constellation';
  } catch {}

  if (isConstellation) {
    loadConstellationView();
  } else {
    loadMemories();
  }
  
  // Set up event listeners
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.addEventListener('input', filterMemories);
  const sourceFilter = document.getElementById('source-filter');
  if (sourceFilter) sourceFilter.addEventListener('change', filterMemories);
  const roleFilter = document.getElementById('role-filter');
  if (roleFilter) roleFilter.addEventListener('change', filterMemories);
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', () => {
    // In constellation mode, redraw instead of reloading gallery
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'constellation') {
      loadConstellationView();
    } else {
      refreshMemories();
    }
  });
  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.addEventListener('click', () => window.close());

  // Unlock button removed - use dashboard for vault management

  // Bind "Generate Sample Data" without inline handlers (CSP safe)
  const genBtn = document.getElementById('generate-sample-btn');
  if (genBtn) {
    genBtn.addEventListener('click', generateSampleMemories);
  }

  // Bind Create New Capsule buttons
  const createBtn = document.getElementById('create-memory-btn');
  if (createBtn) createBtn.addEventListener('click', () => openCreateWizardModal());
  const emptyCreateBtn = document.getElementById('empty-create-btn');
  if (emptyCreateBtn) emptyCreateBtn.addEventListener('click', () => openCreateWizardModal());

  // React to vault state changes to refresh UI immediately
  try {
    chrome.runtime.onMessage.addListener((request) => {
      if (request && request.action === 'vault.stateChanged') {
        console.log('🔐 Memories: Received vault state change:', request.status);
        
        // Update vault banner based on new status
        updateVaultBanner(request.status);
        
        // Reload memories to reflect new state
        loadMemories();
      }
    });
  } catch (e) {
    console.error('🔐 Memories: Error setting up state listener:', e);
  }
  // Auto-open wizard if requested
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === 'true' || params.get('create') === 'wizard') {
      setTimeout(() => openCreateWizardModal(), 300);
    }
  } catch {}
});

// Database diagnostic function
async function checkDatabaseModes() {
  try {
    console.log('🔍 Checking database modes...');
    
    // Check current MTAP setting
    const mtapSetting = localStorage.getItem('emma_use_mtap');
    console.log('🔍 localStorage MTAP:', mtapSetting);
    
    // Get stats (shows what database the background is using)
    const statsResponse = await chrome.runtime.sendMessage({ action: 'getStats' });
    console.log('🔍 Stats response:', statsResponse);
    
    // Get MTAP status from background
    const mtapResponse = await chrome.runtime.sendMessage({ action: 'getMTAPStatus' });
    console.log('🔍 Background MTAP status:', mtapResponse);
    
    // Direct database check
    return new Promise((resolve) => {
      const dbRequest = indexedDB.open('EmmaLiteDB');
      
      dbRequest.onsuccess = (event) => {
        const db = event.target.result;
        const stores = Array.from(db.objectStoreNames);
        
        const counts = {};
        let completed = 0;
        
        stores.forEach(storeName => {
          if (storeName === 'memories' || storeName === 'mtap_memories') {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const countRequest = store.count();
            
            countRequest.onsuccess = () => {
              counts[storeName] = countRequest.result;
              completed++;
              
              if (completed === 2 || (completed === 1 && stores.length === 1)) {
                console.log('🔍 Direct database counts:', counts);
                resolve(counts);
              }
            };
          }
        });
      };
    });
    
  } catch (error) {
    console.error('🔍 Database check failed:', error);
  }
}

// Make functions global for onclick handlers in HTML
window.generateSampleMemories = generateSampleMemories;
window.loadMemories = loadMemories;
window.refreshMemories = refreshMemories;
window.filterMemories = filterMemories;
window.checkDatabaseModes = checkDatabaseModes;

// Export for debugging
window.memoryGallery = {
  loadMemories,
  allMemories: () => allMemories,
  generateSampleMemories,
  filterMemories,
  refreshMemories,
  createNewCapsuleFlow
};

console.log('🧠 Emma Memory Gallery script loaded');

// DEBUG: Add vault state debugging
window.debugVaultState = async function() {
  console.log('🔍 === VAULT STATE DEBUG ===');
  
  try {
    console.log('🔍 Step 1: Checking vault.getStatus...');
    const status = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
    console.log('🔍 Vault Status Response:', status);
    
    if (status && status.success) {
      console.log('🔍 Key Status Fields:');
      console.log('  - initialized:', status.initialized);
      console.log('  - isUnlocked:', status.isUnlocked);
      console.log('  - hasValidSession:', status.hasValidSession);
      console.log('  - sessionExpiresAt:', status.sessionExpiresAt);
      console.log('  - debug info:', status.debug);
    }
    
    console.log('🔍 Step 2: Testing vault.listCapsules...');
    const list = await chrome.runtime.sendMessage({ action: 'vault.listCapsules', limit: 5 });
    console.log('🔍 List Capsules Response:', list);
    
    console.log('🔍 Step 3: Checking raw storage...');
    const storage = await chrome.storage.local.get([
      'emma_vault_initialized', 
      'emma_vault_settings', 
      'emma_vault_session',
      'emma_vault_state'
    ]);
    console.log('🔍 Raw Storage:', storage);
    
    console.log('🔍 Step 4: Testing vault.debug...');
    const debug = await chrome.runtime.sendMessage({ action: 'vault.debug' });
    console.log('🔍 Debug Response:', debug);
    
  } catch (e) {
    console.error('🔍 Debug error:', e);
  }
  
  console.log('🔍 === DEBUG COMPLETE ===');
};

console.log('🔍 Debug function added. Run debugVaultState() in console to test vault state.');

// Update vault banner based on status
function updateVaultBanner(status) {
  const vaultBanner = document.getElementById('vault-banner');
  if (!vaultBanner || !status) return;
  
  if (!status.initialized) {
    vaultBanner.style.display = 'block';
    vaultBanner.style.background = 'linear-gradient(90deg, rgba(244,63,94,0.15) 0%, rgba(239,68,68,0.15) 100%)';
    vaultBanner.style.border = '1px solid rgba(244,63,94,0.3)';
    vaultBanner.textContent = '🔧 Vault not set up · Complete setup to secure your memories';
  } else if (!status.isUnlocked) {
    vaultBanner.style.display = 'block';
    vaultBanner.style.background = 'linear-gradient(90deg, rgba(244,63,94,0.15) 0%, rgba(239,68,68,0.15) 100%)';
    vaultBanner.style.border = '1px solid rgba(244,63,94,0.3)';
    if (status.hasValidSession) {
      vaultBanner.textContent = '🔄 Vault session expired · Re-unlock to see encrypted capsules';
    } else {
      vaultBanner.textContent = '🔒 Vault locked · Unlock to see encrypted capsules';
    }
  } else {
    vaultBanner.style.display = 'block';
    vaultBanner.style.background = 'rgba(16,185,129,0.15)';
    vaultBanner.style.border = '1px solid rgba(16,185,129,0.3)';
    const sessionText = status.sessionExpiresAt ? 
      ` (session expires ${new Date(status.sessionExpiresAt).toLocaleTimeString()})` : '';
    vaultBanner.textContent = `🔐 Vault unlocked · Encrypted capsules available${sessionText}`;
  }
}

// Create new capsule via prompts (quick MVP)
async function createNewCapsuleFlow() {
  // Backward-compatible alias; now opens the full wizard
  openCreateWizardModal();
}

// --- Wizard Modal (vanilla) ---
function openCreateWizardModal() {
  // Build modal shell
  const wrap = document.createElement('div');
  wrap.className = 'memory-wizard-modal';
  Object.assign(wrap.style, {
    position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.5)', zIndex: 9999,
    display: 'grid', placeItems: 'center'
  });
  wrap.innerHTML = `
    <div class="wizard-card" style="width: 680px; max-width: 96vw; background: #0f0b24; color: #fff; border:1px solid rgba(255,255,255,0.12); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.45);">
      <div style="padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between;">
        <div>
          <div style="font-weight:700;">Create Memory Capsule</div>
          <div id="wiz-step-sub" style="opacity:.7; font-size:12px;">Step 1 of 3</div>
        </div>
        <button id="wiz-close" class="btn secondary">✕</button>
      </div>
      <div id="wiz-body" style="padding:16px 20px; max-height: 70vh; overflow:auto;"></div>
      <div style="padding:12px 20px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; gap:8px;">
        <div><button id="wiz-back" class="btn secondary">Back</button></div>
        <div style="display:flex; gap:8px;">
          <button id="wiz-cancel" class="btn secondary">Cancel</button>
          <button id="wiz-next" class="btn">Next</button>
          <button id="wiz-create" class="btn" style="display:none;">Create Capsule</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  // State
  let step = 1;
  let title = '';
  let description = '';
  let category = 'general';
  let tags = '';
  /** @type {{file:File, name:string, size:number, type:string, caption:string, preview:string}[]} */
  let files = [];

  const sub = wrap.querySelector('#wiz-step-sub');
  const body = wrap.querySelector('#wiz-body');
  const btnBack = wrap.querySelector('#wiz-back');
  const btnNext = wrap.querySelector('#wiz-next');
  const btnCreate = wrap.querySelector('#wiz-create');
  wrap.querySelector('#wiz-close').addEventListener('click', () => wrap.remove());
  wrap.querySelector('#wiz-cancel').addEventListener('click', () => wrap.remove());

  function render() {
    if (sub) sub.textContent = `Step ${step} of 3`;
    btnBack.style.visibility = step > 1 ? 'visible' : 'hidden';
    btnNext.style.display = step < 3 ? 'inline-block' : 'none';
    btnCreate.style.display = step === 3 ? 'inline-block' : 'none';
    if (step === 1) {
      body.innerHTML = `
        <div class="field"><label>Title</label><input id="wiz-title" type="text" placeholder="Give this memory a title"/></div>
        <div class="field"><label>Description</label><textarea id="wiz-desc" rows="4" placeholder="Describe this moment"></textarea></div>
        <div style="display:flex; gap:12px;">
          <div class="field" style="flex:1"><label>Category</label>
            <select id="wiz-cat">
              <option value="general">General</option>
              <option value="photos">Photos</option>
              <option value="videos">Videos</option>
              <option value="notes">Notes</option>
              <option value="work">Work</option>
              <option value="personal">Personal</option>
            </select>
          </div>
          <div class="field" style="flex:2"><label>Tags</label><input id="wiz-tags" type="text" placeholder="Comma-separated tags"/></div>
        </div>`;
      body.querySelector('#wiz-title').value = title;
      body.querySelector('#wiz-desc').value = description;
      body.querySelector('#wiz-cat').value = category;
      body.querySelector('#wiz-tags').value = tags;
      body.querySelector('#wiz-title').addEventListener('input', e => title = e.target.value);
      body.querySelector('#wiz-desc').addEventListener('input', e => description = e.target.value);
      body.querySelector('#wiz-cat').addEventListener('change', e => category = e.target.value);
      body.querySelector('#wiz-tags').addEventListener('input', e => tags = e.target.value);
    } else if (step === 2) {
      body.innerHTML = `
        <div class="uploader" style="border:1px dashed rgba(255,255,255,0.25); border-radius:12px; padding:16px; text-align:center;">
          <input id="wiz-file" type="file" multiple accept="image/*,video/*" style="display:none"/>
          <div style="margin-bottom:8px">Add photos or videos</div>
          <button id="wiz-file-btn" class="btn">Select Files</button>
        </div>
        <div id="wiz-grid" style="margin-top:12px; display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px;"></div>`;
      const fileBtn = body.querySelector('#wiz-file-btn');
      const fileInput = body.querySelector('#wiz-file');
      fileBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const list = Array.from(e.target.files || []);
        for (const f of list) {
          const url = URL.createObjectURL(f);
          files.push({ file: f, name: f.name, size: f.size, type: f.type, caption: '', preview: url });
        }
        renderGrid();
      });
      renderGrid();
    } else {
      const tagList = (tags || '').split(',').map(t => t.trim()).filter(Boolean);
      body.innerHTML = `
        <div style="display:grid; gap:8px;">
          <div><strong>Title:</strong> ${escapeHtml(title || '(none)')}</div>
          <div><strong>Description:</strong> ${escapeHtml(description || '(none)')}</div>
          <div><strong>Category:</strong> ${escapeHtml(category)}</div>
          <div><strong>Tags:</strong> ${tagList.length ? escapeHtml(tagList.join(', ')) : '(none)'}</div>
          <div><strong>Attachments:</strong> ${files.length}</div>
        </div>`;
    }
  }

  function renderGrid() {
    const grid = body.querySelector('#wiz-grid');
    if (!grid) return;
    grid.innerHTML = files.map(att => `
      <div class="itm" data-id="${att.name}" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:10px; display:flex; flex-direction:column; gap:8px;">
        ${att.type.startsWith('image') ? `<img src="${att.preview}" style="width:100%; height:100px; object-fit:cover; border-radius:8px"/>` : `<div style="height:100px; display:grid; place-items:center; background:rgba(0,0,0,0.3); border-radius:8px">🎥</div>`}
        <div style="font-size:12px; opacity:.8">${escapeHtml(att.name)}</div>
        <div style="font-size:12px; opacity:.6">${(att.size/1024/1024).toFixed(1)} MB</div>
        <input class="cap" type="text" placeholder="Caption" style="font-size:12px"/>
        <button class="rm btn secondary" type="button">Remove</button>
      </div>
    `).join('');
    grid.querySelectorAll('.cap').forEach((el, idx) => el.addEventListener('input', e => files[idx].caption = e.target.value));
    grid.querySelectorAll('.rm').forEach((btn, idx) => btn.addEventListener('click', () => { files.splice(idx,1); renderGrid(); }));
  }

  btnBack.addEventListener('click', () => { step = Math.max(1, step - 1); render(); });
  btnNext.addEventListener('click', () => { step = Math.min(3, step + 1); render(); });
  btnCreate.addEventListener('click', saveWizard);
  render();

  async function saveWizard() {
    try {
      btnCreate.disabled = true; btnNext.disabled = true; btnBack.disabled = true;
      const tagList = (tags || '').split(',').map(t => t.trim()).filter(Boolean);
      const payload = {
        content: description || title || '(Untitled memory)',
        role: 'user',
        source: 'manual',
        type: files.length ? 'media' : 'note',
        metadata: { title: title || undefined, category, tags: tagList, createdVia: 'CreateMemoryWizardModal' }
      };
      const save = await chrome.runtime.sendMessage({ action: 'saveMemory', data: payload });
      if (!save || !save.success) throw new Error(save?.error || 'Failed to create memory');
      const capsuleId = save.memoryId;

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const dataUrl = await fileToDataUrl(f.file);
        const meta = {
          id: `att_${Date.now()}_${i}`,
          mime: f.type || 'application/octet-stream',
          size: f.size || 0,
          type: f.type.startsWith('video') ? 'video' : (f.type.startsWith('image') ? 'image' : 'file'),
          caption: f.caption || '',
          capturedAt: new Date().toISOString(),
          capsuleId
        };
        const resp = await chrome.runtime.sendMessage({ action: 'attachment.add', meta, dataUrl });
        if (!resp || !resp.success) throw new Error(resp?.error || 'Attachment upload failed');
      }

      wrap.remove();
      showNotification('✅ Capsule created');
      await loadMemories();
    } catch (e) {
      showNotification('Failed to create capsule: ' + e.message, 'error');
      btnCreate.disabled = false; btnNext.disabled = false; btnBack.disabled = false;
    }
  }
}