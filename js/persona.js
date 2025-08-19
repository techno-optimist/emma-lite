// Emma Persona Prompt Generator
// Builds a compact persona summary from HML/MTAP memories for pasting into AI chats.

(async function initPersona() {
  const status = document.getElementById('status');
  const promptEl = document.getElementById('prompt');
  const copyBtn = document.getElementById('copy');
  const copyOpenAI = document.getElementById('copy-openai');
  const copyClaude = document.getElementById('copy-claude');
  const refreshBtn = document.getElementById('refresh');
  const highlightsEl = document.getElementById('highlights');

  function updateStatus(text) { if (status) status.textContent = text; }

  refreshBtn?.addEventListener('click', () => generateAndRenderPersona());
  copyBtn?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(promptEl.value || '');
    updateStatus('✅ Copied persona prompt');
  });
  copyOpenAI?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(promptEl.value || '');
    window.open('https://chat.openai.com/', '_blank');
  });
  copyClaude?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(promptEl.value || '');
    window.open('https://claude.ai/', '_blank');
  });

  function formatDate(ts) {
    try { return new Date(ts).toISOString().split('T')[0]; } catch { return '' }
  }

  function normalize(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function summarizeText(text, max = 280) {
    const t = normalize(text);
    if (t.length <= max) return t;
    // End at sentence boundary if possible
    const cut = t.slice(0, max);
    const last = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    return (last > 120 ? cut.slice(0, last + 1) : cut) + '…';
  }

  function topKByKey(map, k) {
    return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,k);
  }

  async function fetchAllMemories() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getAllMemories', limit: 1000, offset: 0 });
      if (response && response.success) return response.memories || [];
    } catch {}
    // Fallback: chrome.storage snapshot
    const local = await chrome.storage.local.get(['emma_memories']);
    return local.emma_memories || [];
  }

  function derivePersona(memories) {
    // Aggregate signal from memories: topics, people, sites, recency
    const topicFreq = new Map();
    const people = new Map();
    const sources = new Map();
    let first = Infinity; let last = 0;

    const examples = [];

    for (const m of memories) {
      const content = normalize(m.content || m.messages?.map(x=>x.content).join(' ') || '');
      if (!content) continue;
      first = Math.min(first, m.timestamp || Date.now());
      last = Math.max(last, m.timestamp || Date.now());

      // Very light entity extraction
      for (const tag of content.matchAll(/(^|\s)#([\p{L}0-9_]{2,50})/gu)) {
        const k = tag[2].toLowerCase(); topicFreq.set(k, (topicFreq.get(k)||0)+1);
      }
      for (const at of content.matchAll(/(^|\s)@([A-Za-z0-9_]{2,50})\b/g)) {
        const k = at[2].toLowerCase(); people.set(k, (people.get(k)||0)+1);
      }
      const host = (()=>{ try { return new URL(m.url || m.metadata?.url || '').hostname } catch { return '' }})();
      if (host) sources.set(host, (sources.get(host)||0)+1);

      if (examples.length < 8) {
        examples.push({ when: formatDate(m.timestamp || Date.now()), source: m.source || m.metadata?.source || 'web', text: summarizeText(content, 220) });
      }
    }

    const topTopics = topKByKey(topicFreq, 8).map(([k])=>k);
    const topPeople = topKByKey(people, 8).map(([k])=>k);
    const topSites = topKByKey(sources, 6).map(([k])=>k);

    return { topTopics, topPeople, topSites, examples, first, last };
  }

  function buildPrompt(summary) {
    const timeRange = summary.first < Infinity ? `${formatDate(summary.first)} → ${formatDate(summary.last)}` : 'recent';
    const topics = summary.topTopics.length ? `Topics: ${summary.topTopics.map(t=>`#${t}`).join(', ')}` : '';
    const people = summary.topPeople.length ? `People: ${summary.topPeople.map(p=>`@${p}`).join(', ')}` : '';
    const sites = summary.topSites.length ? `Sources: ${summary.topSites.join(', ')}` : '';

    const examples = summary.examples.map(ex => `- (${ex.when}) [${ex.source}] ${ex.text}`).join('\n');

    const system = `You are an assistant collaborating with me. Use the following persona, distilled from my Human Memory Layer (HML), to personalize your guidance. Respect privacy. Ask clarifying questions when uncertain. Prefer concise, actionable suggestions.`;

    return [
`<persona>
Timespan: ${timeRange}
${topics}
${people}
${sites}

Style preferences: friendly, practical, concise; prefers summaries with bullet points and next actions.
Decision style: evidence-driven; likes clear tradeoffs and short recommendations.

Examples of my recent interests and context:`,
examples,
`</persona>

Instructions for the assistant:
- Use the persona above to tailor your responses
- When giving advice, provide next steps and alternatives
- When unsure, ask a short clarifying question first
`
    ].join('\n');
  }

  function renderHighlights(summary) {
    if (!highlightsEl) return;
    highlightsEl.innerHTML = '';
    const add = (label) => { const div = document.createElement('div'); div.className='chip'; div.textContent=label; highlightsEl.appendChild(div); };
    summary.topTopics.forEach(t => add('#'+t));
    summary.topPeople.forEach(p => add('@'+p));
    summary.topSites.forEach(s => add(s));
  }

  async function generateAndRenderPersona() {
    try {
      updateStatus('Collecting memory capsules…');
      const memories = await fetchAllMemories();
      updateStatus(`Processing ${memories.length} memories…`);

      const summary = derivePersona(memories);
      const prompt = buildPrompt(summary);
      promptEl.value = prompt;
      renderHighlights(summary);
      updateStatus('✅ Persona ready — copy and paste into ChatGPT or Claude.');
    } catch (e) {
      console.error(e);
      updateStatus('Failed to generate persona: ' + e.message);
    }
  }

  generateAndRenderPersona();
})();



