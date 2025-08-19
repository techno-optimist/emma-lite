/**
 * HML Capability Tokens and Projection per HML §4
 */

import { HMLCanonicalizer } from './hml-canonicalizer.js';
import { hmlNonceCache } from './hml-replay-cache.js';

export class HMLProjection {
  static normalizeProjection(spec = {}) {
    const fields = Array.isArray(spec.include) ? spec.include.slice() : [];
    const redact = Array.isArray(spec.redact) ? spec.redact.slice() : [];
    return { fields, redact };
  }

  static applyProjection(capsule, spec = {}) {
    const { fields, redact } = HMLProjection.normalizeProjection(spec);

    const source = capsule?.capsule || {};
    const resultCapsule = {};

    // If fields specified, pick only those paths
    if (fields.length > 0) {
      // Fast path for top-level content
      if (fields.includes('content') && source.content !== undefined) {
        resultCapsule.content = source.content;
      }
      for (const f of fields) {
        if (f === 'content') continue; // already handled
        const parts = f.split('.');
        let src = source;
        let dst = resultCapsule;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          if (!(p in src)) { break; }
          if (i === parts.length - 1) {
            dst[p] = src[p];
          } else {
            dst[p] = dst[p] || {};
            dst = dst[p];
            src = src[p];
          }
        }
      }
    } else {
      // No fields specified: include nothing except minimal metadata
      resultCapsule.id = source.id;
    }

    // Apply redactions within labels if present in result
    if (redact.length > 0 && resultCapsule.labels) {
      for (const label of redact) {
        if (label in resultCapsule.labels) {
          resultCapsule.labels[label] = `[REDACTED:${label}]`;
        }
      }
    }

    return { ...capsule, capsule: resultCapsule };
  }

  static async projectionHash(projectionSpec) {
    const canonical = HMLCanonicalizer.canonicalize(projectionSpec || {});
    return await HMLCanonicalizer.calculateContentHash(canonical);
  }
}

export class HMLCapability {
  static createToken({ issuer, subject, capsules, projection, caveats = {} }) {
    const token = {
      token: {
        id: `urn:hml:token:uuid:${HMLCapability._uuid()}`,
        issuer,
        subject,
        keyEpoch: caveats.keyEpoch || 1,
        capsules: capsules || [],
        capabilities: ['read-projection'],
        projection: HMLProjection.normalizeProjection(projection || {}),
        caveats: [],
        signature: null
      }
    };

    // Normalize caveats
    if (caveats.expiresAt) token.token.caveats.push({ type: 'expiry', value: caveats.expiresAt });
    if (caveats.purpose) token.token.caveats.push({ type: 'purpose', value: caveats.purpose });
    if (caveats.maxAccesses) token.token.caveats.push({ type: 'max-accesses', value: caveats.maxAccesses });
    if (caveats.projectionHash) token.token.caveats.push({ type: 'projection-hash', value: caveats.projectionHash });

    // Signature placeholder: implementation dependent
    token.token.signature = HMLCapability._signPlaceholder(token.token);

    return token;
  }

  static _uuid() {
    // RFC4122 v4 simplified
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const hex = Array.from(b).map((n) => n.toString(16).padStart(2, '0'));
    return `${hex.slice(0,4).join('')}-${hex.slice(4,6).join('')}-${hex.slice(6,8).join('')}-${hex.slice(8,10).join('')}-${hex.slice(10,16).join('')}`;
  }

  static _signPlaceholder(obj) {
    // Deterministic placeholder signature: hash of canonical token body
    const canonical = HMLCanonicalizer.canonicalize(obj);
    return `sig:${canonical.length}`; // not secure; placeholder only
  }

  static getCaveat(token, type) {
    return (token.token.caveats || []).find((c) => c.type === type) || null;
  }

  static async verifyRequest({ token, requestProjection, requestNonce }) {
    // 1) Replay defense: require fresh nonce per token id
    if (!requestNonce) throw new Error('Missing request nonce');
    const tokenId = token.token.id;

    // TTL: min(expiresAt - now, 300s)
    const expiryCaveat = HMLCapability.getCaveat(token, 'expiry');
    const now = Date.now();
    let ttlMs = 300 * 1000; // default 5 minutes
    if (expiryCaveat) {
      const exp = new Date(expiryCaveat.value).getTime();
      ttlMs = Math.min(ttlMs, Math.max(0, exp - now));
    }
    const expiresAt = now + ttlMs;

    if (hmlNonceCache.isUsed(tokenId, requestNonce)) {
      const err = new Error('ERR_REPLAY_NONCE');
      err.code = 'ERR_REPLAY_NONCE';
      throw err;
    }
    hmlNonceCache.markUsed(tokenId, requestNonce, expiresAt);

    // 2) Projection binding: hash of requested projection must match caveat
    const projectionHashCaveat = HMLCapability.getCaveat(token, 'projection-hash');
    if (projectionHashCaveat) {
      const canonicalProjection = HMLCanonicalizer.canonicalize(requestProjection || {});
      const hash = await HMLCanonicalizer.calculateContentHash(canonicalProjection);
      if (hash !== projectionHashCaveat.value) {
        const err = new Error('ERR_PROJECTION_MISMATCH');
        err.code = 'ERR_PROJECTION_MISMATCH';
        throw err;
      }
    }

    return true;
  }
}

export class HMLAgentService {
  constructor({ getCapsuleById }) {
    this.getCapsuleById = getCapsuleById; // async (id) => capsule
  }

  async agentRead({ token, requestProjection, requestNonce }) {
    // Verify request per §4.4
    await HMLCapability.verifyRequest({ token, requestProjection, requestNonce });

    // Apply projection
    const projSpec = token.token.projection || {};
    const results = [];
    for (const capId of token.token.capsules || []) {
      const capsule = await this.getCapsuleById(capId);
      if (!capsule) continue;
      const projected = HMLProjection.applyProjection(capsule, projSpec);
      results.push({ capsuleId: capId, projection: projected });
    }
    return { data: results };
  }
}
