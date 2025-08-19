# Project: Universal MTAP Capture with First-Run Vault Setup

---

## Planner: HML v1.0 Compliance – Phase 2 (Event Log → Capabilities → Federation)

### Background and Motivation (Updated)
Emma Lite is the first app built for the Human Memory Layer (HML). Phase 1 delivered core foundations (canonicalization, capsule schema, XChaCha20-Poly1305 envelope, adapter, basic validation). Phase 2 focuses on security invariants (tamper-evident event chain), controlled access (capability tokens + projections), and interoperability (HML-Basic endpoints).

### Key Challenges and Analysis
- Event Integrity: Implement tamper-evident hash chain per HML §2.2 with correct length-prefix hashing and HLC timestamps
- Deterministic Time: Add Hybrid Logical Clock (HLC) with skew bounds and tie-breaking per HML §7
- Access Control: Capability tokens with projection-hash caveat and replay defense (nonce) per HML §4
- Federation: Minimal HML-Basic endpoints for local interoperability and future network use

### High-level Task Breakdown (with Success Criteria)
1) Event Log + Hash Chain (NOW)
- Implement `lib/hml-hlc.js` with HLC tick/update and parsing
- Implement `lib/hml-event-log.js` with `createEvent`, `calculateEventHash`, `verifyChain`
- Success: Unit tests pass for TV-2.1-like chain behavior and HLC monotonicity

2) Capability Tokens + Projection (NEXT)
- Token schema with attenuation + projection-hash caveat
- Nonce replay prevention and projection verification
- Success: Tests for TV-4.1/4.2/4.3 pass

3) Federation Endpoints (LATER)
- Add local HML-Basic endpoints: /capsules, /share, /agent/read, /receipt
- Add transparency log hook for receipts
- Success: Endpoints respond with correct structures; smoke tests green

### Project Status Board (Phase 2)
- [x] Phase 1 foundation (canonicalization, capsule schema, crypto envelope, adapter)
- [ ] Event Log: HLC + Hash Chain (IN PROGRESS)
- [ ] Capability Tokens + Projection (PENDING)
- [ ] Federation Endpoints + Receipts (PENDING)

## Current Status / Progress Tracking (Phase 2)
- Working on Event Log + HLC modules and tests. Jest config simplified for ESM to ensure reliable test runs. Next milestone: green unit tests for event chain and HLC.

## Executor's Feedback or Assistance Requests
- No blockers. After Event Log, I’ll design token/projection structures aligned to HML spec and add replay cache.

## Lessons (Phase 2)
- Jest ESM + Chrome extension context: keep tests Node-based with minimal mocking; avoid heavy reporters; ensure deterministic hashing by using canonical JSON.
























