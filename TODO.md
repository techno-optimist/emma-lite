# Emma Chat – MemoryWorthiness + Secure LLM Gating (High‑Level Plan)

Goal: Make Emma flawlessly recognize memory-worthy moments, run a gentle enrichment flow, and only call the LLM when needed – with a secure key path. No hard-coded secrets in web code.

Important: Client-side hard-coding an API key is not secure (anyone can read bundled JS). We will store the key privately in the browser extension (background service), encrypt-at-rest, and expose a minimal proxy only to Emma Chat.

## Architecture Overview
- MemoryWorthinessEngine (in-app) combines:
  - Heuristics score (0..1): first-person, past-tense, temporal hints, coherence/length, named-entity count
  - LLM reasoning score (0..1): from vectorlessEngine.analyzeMemoryPotential(content, context) when needed
  - Novelty penalty (0..1): similarity vs existing memories → reduces duplicates
  - finalScore = 0.6*LLM + 0.3*Heuristics − 0.2*Novelty
- Thresholds (normalized 0..1):
  - memoryWorthy ≥ 0.40 → always run enrichment FSM
  - autoCapture ≥ 0.70 → offer quick save + enrichment
- Secure LLM proxy: extension/background stores encrypted key, makes OpenAI calls, returns compact results to Emma Chat. No key ever reaches pages.

## Tasks

### 0) Offline‑first mode (no internet)
- [ ] Vault Indexer (browser-only):
  - Build searchable structures from `vaultData` (TF‑IDF bigrams, people map, tags, timestamps)
  - Fast APIs: `findPeople(names)`, `findByTime(range)`, `search(text)`
- [ ] Conversational QA over vault (no LLM):
  - Retrieve top-k memories from index; synthesize responses with templates + lightweight heuristics
  - Maintain short-term chat context (last 5 user turns) to refine retrieval
- [ ] MemoryWorthiness offline:
  - Heuristics scorer + novelty penalty produce finalScore without LLM
  - Enrichment FSM always runs when finalScore ≥ 0.40
- [ ] Capsule creation offline:
  - Build preview, accept local media, save to vault + IndexedDB
  - Update `lastSaved` indicators
- [ ] Offline tests: simulated interactions, ensure no network calls

### 1) MemoryWorthinessEngine (core)
- [ ] Add heuristics scorer (0..1) in `EmmaIntelligentCapture.analyzeMessage` without hard-coded phrases
- [ ] Add novelty penalty vs existing vault memories (lightweight TF‑IDF bigrams/Jaccard)
- [ ] Introduce aggregator producing `finalScore` with component breakdowns (debug-only)
- [ ] Replace single threshold gate with: `finalScore` → enrichment ≥0.40; quick-capture ≥0.70

### 2) Vectorless analyzer (LLM only when needed)
- [ ] Implement `vectorlessEngine.analyzeMemoryPotential(content, context)` returning `{ score0to10, rationale, categories }`
- [ ] Gating policy:
  - [ ] Skip LLM when heuristics are decisive (<0.20 or >0.80), or user is chatting casually
  - [ ] Use LLM only for borderline cases (0.30..0.70) or when enrichment stalls
- [ ] Strict token & timeout limits; structured output schema

### 3) Secure key management (extension)
- [ ] Store API key inside extension background storage only (never in page code)
- [ ] Encrypt-at-rest (WebCrypto AES‑GCM) using a derived key tied to extension scope
- [ ] Add extension message API: `LLM_SCORE_REQUEST` → returns normalized score + rationale
- [ ] Restrict origin to our web app pages; reject others
- [ ] Add minimal settings UI in extension to set/update the key (optional import from local file)

### 4) Enrichment FSM (guided follow-up)
- [ ] FSM states: who → when → where → what happened → feelings/meaning → media prompt → preview
- [ ] One short question at a time (dementia guardrails: 2–3s pacing, validation wording)
- [ ] Auto-generate title/tags; allow edit in preview
- [ ] Save capsule → vault + IndexedDB; update `lastSaved` indicators

### 5) UX polish
- [ ] Detection banner: show confidence (%) and “Save memory” CTA
- [ ] If not auto-capture: start enrichment immediately (≥0.40)
- [ ] Ask for photos gracefully after 2–3 enrichment turns
- [ ] Clean, accessible toasts; error states for offline/timeout

### 6) Telemetry (local-only, dev)
- [ ] Debug logs: heuristics, LLM score, novelty, finalScore (no PII in logs)
- [ ] Counters for enrichment completions and user confirmations

### 7) Tests
- [ ] Unit: heuristics scorer edge cases (short text, non-first-person, tense)
- [ ] Unit: novelty penalty vs near-duplicate memories
- [ ] Integration: enrichment FSM happy path + cancel/edit branches
- [ ] E2E script: type 5 archetypal memories → verify enrichment triggers and save preview appears

### 8) Rollout & safety
- [ ] Feature flag for LLM gating; default on
- [ ] If extension or key missing → heuristics-only mode (still runs enrichment ≥0.40)
- [ ] No secrets in repo or page bundle; extension is the only component holding the key

## Notes
- This plan intentionally avoids hard-coded “event lists.” Scoring relies on general linguistic features, contextual reasoning, and novelty checks.
- Dementia Mode remains first-class: short, validating prompts; no corrections; paced delivery.


