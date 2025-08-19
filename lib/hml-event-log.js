/**
 * HML Event Log & Hash Chain per HML §2
 * - Event structure and tamper-evident chain
 * - Length-prefixed hashing (4-byte little-endian)
 */

import { HMLCanonicalizer } from './hml-canonicalizer.js';
import { HMLHybridLogicalClock } from './hml-hlc.js';

export class HMLEventLog {
  constructor(storage) {
    this.storage = storage; // abstraction with getLast(), append(event), getAll()
    this.hlc = new HMLHybridLogicalClock();
  }

  /** Create an event and append to the log */
  async createEvent(type, capsuleId, payload = {}, actorDid) {
    const previous = await this.storage.getLast();
    const previousHash = previous?.hash || null;

    const event = {
      id: null, // computed after hash
      type,
      timestamp: new Date().toISOString(),
      hlc: this.hlc.tick(),
      actor: actorDid || 'did:emma:unknown',
      capsuleId,
      previousEvent: previousHash,
      payload: HMLCanonicalizer.canonicalize(payload),
      signature: null,
      hash: null
    };

    const hash = await this.calculateEventHash(event, previousHash);
    event.hash = hash;
    event.id = `urn:hml:event:${hash}`;
    event.signature = hash; // placeholder for future signing

    await this.storage.append(event);
    return event;
  }

  /** Verify entire chain integrity */
  async verifyChain() {
    const events = await this.storage.getAll();
    let previousHash = null;

    for (const evt of events) {
      const expected = await this.calculateEventHash(evt, previousHash);
      if (evt.hash !== expected) {
        return { ok: false, failedAt: evt.id };
      }
      previousHash = evt.hash;
    }
    return { ok: true, count: events.length };
  }

  /** HML §2.2: length-prefixed hash over previous hash, timestamp, actor, type, payload */
  async calculateEventHash(event, previousHash) {
    const parts = [];

    // helper
    const enc = (s) => new TextEncoder().encode(s || '');
    const lp = (bytes) => {
      const buf = new ArrayBuffer(4);
      new DataView(buf).setUint32(0, bytes.length, true);
      return new Uint8Array(buf);
    };

    // previous hash
    const prevBytes = previousHash ? enc(previousHash) : new Uint8Array();
    parts.push(lp(prevBytes));
    parts.push(prevBytes);

    // timestamp
    const tsBytes = enc(event.timestamp);
    parts.push(lp(tsBytes));
    parts.push(tsBytes);

    // actor
    const actorBytes = enc(event.actor);
    parts.push(lp(actorBytes));
    parts.push(actorBytes);

    // type
    const typeBytes = enc(event.type);
    parts.push(lp(typeBytes));
    parts.push(typeBytes);

    // payload (canonical string)
    const payloadBytes = enc(event.payload || '');
    parts.push(lp(payloadBytes));
    parts.push(payloadBytes);

    // concat
    const totalLen = parts.reduce((s, a) => s + a.length, 0);
    const combined = new Uint8Array(totalLen);
    let offset = 0;
    for (const p of parts) {
      combined.set(p, offset);
      offset += p.length;
    }

    const buf = await crypto.subtle.digest('SHA-256', combined);
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `sha256:${hex}`;
  }
}

/**
 * In-memory storage adapter (for tests and local use)
 */
export class InMemoryEventStorage {
  constructor() {
    this.events = [];
  }

  async getLast() {
    return this.events[this.events.length - 1] || null;
  }

  async append(event) {
    this.events.push(event);
  }

  async getAll() {
    return this.events.slice();
  }
}







