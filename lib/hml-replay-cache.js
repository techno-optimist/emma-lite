/**
 * HML Nonce Replay Cache
 * In-memory cache with TTL to prevent replay attacks per HML §4.4
 */

export class HMLNonceCache {
  constructor() {
    this.map = new Map(); // key: `${tokenId}:${nonce}` -> expiresAt (ms)
  }

  _key(tokenId, nonce) {
    return `${tokenId}:${nonce}`;
  }

  /** Return true if nonce already used and not expired */
  isUsed(tokenId, nonce) {
    const key = this._key(tokenId, nonce);
    const exp = this.map.get(key);
    if (!exp) return false;
    if (Date.now() > exp) {
      this.map.delete(key);
      return false;
    }
    return true;
  }

  /** Mark a nonce as used until expiresAt (ms) */
  markUsed(tokenId, nonce, expiresAt) {
    const key = this._key(tokenId, nonce);
    this.map.set(key, expiresAt);
  }

  /** Clean up expired entries */
  prune() {
    const now = Date.now();
    for (const [k, exp] of this.map.entries()) {
      if (now > exp) this.map.delete(k);
    }
  }
}

export const hmlNonceCache = new HMLNonceCache();

