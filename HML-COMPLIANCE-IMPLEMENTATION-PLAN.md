# HML Compliance Implementation Plan for Emma Lite

**Target**: Full HML v1.0 Protocol Compliance  
**Timeline**: 12-16 weeks  
**Priority**: Critical for ecosystem positioning

---

## Phase 1: Core Protocol Foundation (Weeks 1-6)

### Week 1-2: Schema & Canonicalization 🔴 **CRITICAL**

#### Task 1.1: Implement HML Capsule Schema
**File**: `lib/hml-capsule.js`
```javascript
export class HMLCapsule {
  static async create(content, metadata = {}) {
    const capsule = {
      $schema: "https://hml.dev/schemas/v1.0/capsule.json",
      version: "1.0.0",
      capsule: {
        id: await this.generateCapsuleURN(content),
        subject: metadata.subject || await this.getDefaultSubject(),
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        provenance: await this.createProvenance(metadata),
        content: await this.createContentEnvelope(content),
        labels: this.standardizeLabels(metadata.labels),
        extensions: metadata.extensions || {}
      }
    };
    
    return capsule;
  }
  
  static async generateCapsuleURN(content) {
    const canonical = HMLCanonicalizer.canonicalize(content);
    const hash = await crypto.subtle.digest('SHA-256', 
      new TextEncoder().encode(canonical)
    );
    const hashHex = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    return `urn:hml:capsule:sha256:${hashHex}`;
  }
}
```

#### Task 1.2: HML Canonicalization Engine
**File**: `lib/hml-canonicalizer.js`
```javascript
export class HMLCanonicalizer {
  static canonicalize(object) {
    if (object === null) return null;
    if (typeof object !== 'object') return object;
    if (Array.isArray(object)) return object.map(this.canonicalize);
    
    // Sort keys lexicographically and recursively canonicalize
    const sorted = {};
    Object.keys(object)
      .sort()
      .forEach(key => {
        sorted[key] = this.canonicalize(object[key]);
      });
    
    return JSON.stringify(sorted);
  }
  
  static async calculateContentHash(capsule) {
    const canonical = this.canonicalize(capsule);
    const hash = await crypto.subtle.digest('SHA-256', 
      new TextEncoder().encode(canonical)
    );
    return 'sha256:' + Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
```

#### Task 1.3: Test Vector Implementation
**File**: `test/hml-compliance.test.js`
```javascript
import { HMLCanonicalizer } from '../lib/hml-canonicalizer.js';

describe('HML v1.0 Test Vectors', () => {
  it('TV-1.1: Canonicalization with Unicode', async () => {
    const input = {
      "capsule": {
        "extensions": {
          "ζ": {"nested": {"deep": true}, "array": [3, 1, 2]},
          "number": 42.0,
          "string_number": "42.0"
        },
        "content": {"data": "Café ☕ مرحبا 🔐"},
        "created": "2025-01-20T10:00:00.000Z"
      }
    };
    
    const canonical = HMLCanonicalizer.canonicalize(input);
    const expected = "{\"capsule\":{\"content\":{\"data\":\"Café ☕ مرحبا 🔐\"},\"created\":\"2025-01-20T10:00:00.000Z\",\"extensions\":{\"number\":42,\"string_number\":\"42.0\",\"ζ\":{\"array\":[3,1,2],\"nested\":{\"deep\":true}}}}}";
    
    expect(canonical).toBe(expected);
    
    const hash = await HMLCanonicalizer.calculateContentHash(input);
    expect(hash).toBe('sha256:d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592');
  });
});
```

### Week 3-4: Event Log & Hash Chain 🔴 **CRITICAL**

#### Task 1.4: Event Log System
**File**: `lib/hml-event-log.js`
```javascript
export class HMLEventLog {
  constructor(vaultId) {
    this.vaultId = vaultId;
    this.dbName = `HMLEventLog_${vaultId}`;
  }
  
  async createEvent(type, capsuleId, payload = {}) {
    const previousEvent = await this.getLastEvent();
    
    const event = {
      id: await this.generateEventURN(),
      type, // create|update|redact|share|revoke
      timestamp: new Date().toISOString(),
      hlc: this.generateHLC(),
      actor: await this.getDID(),
      capsuleId,
      previousEvent: previousEvent ? previousEvent.id : null,
      payload: HMLCanonicalizer.canonicalize(payload),
      signature: null
    };
    
    // Calculate hash chain
    event.signature = await this.calculateEventHash(event, previousEvent);
    
    // Store event
    await this.storeEvent(event);
    
    return event;
  }
  
  async calculateEventHash(event, previousEvent) {
    // HML spec: H(n) = SHA256(len(H(n-1)) || H(n-1) || ...)
    const parts = [];
    
    if (previousEvent) {
      const prevHashBytes = new TextEncoder().encode(previousEvent.signature);
      parts.push(this.lengthPrefix(prevHashBytes));
      parts.push(prevHashBytes);
    }
    
    const timestampBytes = new TextEncoder().encode(event.timestamp);
    parts.push(this.lengthPrefix(timestampBytes));
    parts.push(timestampBytes);
    
    const actorBytes = new TextEncoder().encode(event.actor);
    parts.push(this.lengthPrefix(actorBytes));
    parts.push(actorBytes);
    
    const typeBytes = new TextEncoder().encode(event.type);
    parts.push(this.lengthPrefix(typeBytes));
    parts.push(typeBytes);
    
    const payloadBytes = new TextEncoder().encode(event.payload);
    parts.push(this.lengthPrefix(payloadBytes));
    parts.push(payloadBytes);
    
    const combined = this.concatBytes(parts);
    const hash = await crypto.subtle.digest('SHA-256', combined);
    
    return 'sha256:' + Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  lengthPrefix(bytes) {
    const length = new Uint32Array([bytes.length]);
    return new Uint8Array(length.buffer);
  }
}
```

#### Task 1.5: Hybrid Logical Clock
**File**: `lib/hml-hlc.js`
```javascript
export class HMLHybridLogicalClock {
  constructor() {
    this.logicalTime = 0;
    this.wallClockTime = 0;
  }
  
  tick() {
    const now = Date.now();
    
    if (now > this.wallClockTime) {
      this.wallClockTime = now;
      this.logicalTime = 0;
    } else {
      this.logicalTime++;
    }
    
    // HML format: (wall_time_ms << 16) | (counter & 0xFFFF)
    const hlc = (this.wallClockTime << 16) | (this.logicalTime & 0xFFFF);
    return '0x' + hlc.toString(16).toUpperCase().padStart(16, '0');
  }
  
  update(remoteHLC) {
    const remote = this.parseHLC(remoteHLC);
    const now = Date.now();
    
    this.wallClockTime = Math.max(now, Math.max(this.wallClockTime, remote.wallTime));
    
    if (this.wallClockTime === remote.wallTime) {
      this.logicalTime = Math.max(this.logicalTime, remote.logical) + 1;
    } else if (this.wallClockTime === now && this.wallClockTime > remote.wallTime) {
      this.logicalTime = 0;
    } else {
      this.logicalTime = this.logicalTime + 1;
    }
    
    return this.tick();
  }
}
```

### Week 5-6: Cryptographic Envelope 🔴 **CRITICAL**

#### Task 1.6: XChaCha20-Poly1305 Implementation
**File**: `lib/hml-crypto.js`
```javascript
export class HMLCryptography {
  static async encryptContent(content, capsuleId, version, labels) {
    // Import XChaCha20-Poly1305 (need to add to dependencies)
    const { XChaCha20Poly1305 } = await import('@stablelib/xchacha20poly1305');
    
    const key = await this.deriveContentKey();
    const nonce = crypto.getRandomValues(new Uint8Array(24)); // 192 bits
    
    // Construct AAD per HML spec
    const aad = this.constructAAD(capsuleId, version, labels);
    
    const cipher = new XChaCha20Poly1305(key);
    const ciphertext = cipher.seal(nonce, new TextEncoder().encode(content), aad);
    
    return {
      algorithm: "XChaCha20-Poly1305",
      nonce: this.base64url(nonce),
      ciphertext: this.base64url(ciphertext),
      aad_hash: await this.hash(aad)
    };
  }
  
  static constructAAD(capsuleId, version, labels) {
    // HML spec: len(capsule_id) || capsule_id || len(version) || version || len(labels_hash) || labels_hash
    const parts = [];
    
    const capsuleIdBytes = new TextEncoder().encode(capsuleId);
    parts.push(this.lengthPrefix(capsuleIdBytes));
    parts.push(capsuleIdBytes);
    
    const versionBytes = new TextEncoder().encode(version);
    parts.push(this.lengthPrefix(versionBytes));
    parts.push(versionBytes);
    
    const labelsHash = await this.hash(HMLCanonicalizer.canonicalize(labels));
    parts.push(this.lengthPrefix(labelsHash));
    parts.push(labelsHash);
    
    return this.concatBytes(parts);
  }
  
  static base64url(bytes) {
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}
```

---

## Phase 2: Capability & Federation (Weeks 7-12)

### Week 7-8: Capability Token System 🟡 **HIGH**

#### Task 2.1: Capability Token Engine
**File**: `lib/hml-capability.js`
```javascript
export class HMLCapability {
  static async createCapabilityToken(capsuleIds, projection, caveats) {
    const token = {
      id: `urn:hml:token:uuid:${this.generateUUID()}`,
      issuer: await this.getDID(),
      subject: caveats.aud || caveats.agent,
      keyEpoch: await this.getCurrentKeyEpoch(),
      capsules: capsuleIds.map(id => this.ensureURNFormat(id)),
      capabilities: ["read-projection"],
      projection: this.normalizeProjection(projection),
      caveats: this.normalizeCaveats(caveats),
      signature: null
    };
    
    token.signature = await this.signCapabilityToken(token);
    return token;
  }
  
  static normalizeProjection(projection) {
    return {
      fields: projection.include || [],
      redact: projection.exclude || []
    };
  }
  
  static normalizeCaveats(caveats) {
    const normalized = [];
    
    if (caveats.expiresAt) {
      normalized.push({
        type: "expiry",
        value: caveats.expiresAt
      });
    }
    
    if (caveats.purpose) {
      normalized.push({
        type: "purpose", 
        value: caveats.purpose
      });
    }
    
    if (caveats.maxAccesses) {
      normalized.push({
        type: "max-accesses",
        value: caveats.maxAccesses
      });
    }
    
    return normalized;
  }
}
```

#### Task 2.2: Projection System
**File**: `lib/hml-projection.js`
```javascript
export class HMLProjection {
  static async createProjection(capsule, projectionSpec) {
    const { fields, redact } = projectionSpec;
    
    // Start with full capsule
    let projected = JSON.parse(JSON.stringify(capsule));
    
    // Apply field filtering
    if (fields && fields.length > 0) {
      projected = this.filterFields(projected, fields);
    }
    
    // Apply redactions
    if (redact && redact.length > 0) {
      projected = await this.applyRedactions(projected, redact);
    }
    
    // Calculate projection hash
    const projectionHash = await HMLCanonicalizer.calculateContentHash(projected);
    
    return {
      data: projected,
      projectionHash,
      originalHash: capsule.capsule.content.contentHash,
      redactions: redact || []
    };
  }
  
  static async applyRedactions(capsule, redactionLabels) {
    const redactionMap = {
      version: "1.0",
      contentHash: capsule.capsule.content.contentHash,
      projectionHash: null, // Will be calculated
      redactions: []
    };
    
    for (const label of redactionLabels) {
      const redactedContent = await this.redactByLabel(capsule, label);
      
      redactionMap.redactions.push({
        start: redactedContent.start,
        end: redactedContent.end,
        hash: await this.hashRedactedBytes(redactedContent.removed),
        label
      });
      
      capsule = redactedContent.result;
    }
    
    redactionMap.projectionHash = await HMLCanonicalizer.calculateContentHash(capsule);
    
    return {
      capsule,
      redactionMap
    };
  }
}
```

### Week 9-10: Federation Endpoints 🟡 **HIGH**

#### Task 2.3: HML-Basic Server Implementation
**File**: `lib/hml-federation.js`
```javascript
export class HMLFederation {
  constructor(vaultManager) {
    this.vaultManager = vaultManager;
    this.server = null;
  }
  
  setupRoutes() {
    // Core HML-Basic endpoints
    this.server.post('/capsules', this.createCapsule.bind(this));
    this.server.get('/capsules', this.listCapsules.bind(this));
    this.server.get('/capsules/:id', this.getCapsule.bind(this));
    this.server.patch('/capsules/:id', this.updateCapsule.bind(this));
    this.server.delete('/capsules/:id', this.deleteCapsule.bind(this));
    
    // Sharing endpoints
    this.server.post('/share', this.createShare.bind(this));
    this.server.delete('/share/:token', this.revokeShare.bind(this));
    
    // Event log endpoints
    this.server.get('/events/:capsule', this.getEventLog.bind(this));
    
    // Receipt endpoints  
    this.server.get('/receipt/:id', this.getReceipt.bind(this));
    
    // Agent access endpoint
    this.server.post('/agent/read', this.agentRead.bind(this));
  }
  
  async createCapsule(req, res) {
    try {
      const { subject, labels, content, extensions } = req.body;
      
      // Validate HML capsule format
      if (!this.validateCapsuleRequest(req.body)) {
        return res.status(400).json({
          error: {
            code: "ERR_INVALID_CAPSULE",
            message: "Invalid capsule format"
          }
        });
      }
      
      // Create HML-compliant capsule
      const capsule = await HMLCapsule.create(content, {
        subject,
        labels,
        extensions
      });
      
      // Store in vault
      const capsuleId = await this.vaultManager.storeCapsule(capsule);
      
      // Create event
      const event = await this.vaultManager.eventLog.createEvent(
        'create', 
        capsuleId,
        { subject, labels }
      );
      
      res.json({
        capsuleId,
        eventId: event.id
      });
      
    } catch (error) {
      this.handleError(res, error);
    }
  }
  
  async agentRead(req, res) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Capability ')) {
        return res.status(401).json({
          error: {
            code: "ERR_MISSING_CAPABILITY",
            message: "Capability token required"
          }
        });
      }
      
      const token = authHeader.substring('Capability '.length);
      const { projectionHash, requestNonce } = req.body;
      
      // Verify capability token
      const capability = await this.verifyCapabilityToken(token);
      
      // Check nonce for replay protection
      if (await this.isNonceUsed(capability.id, requestNonce)) {
        return res.status(403).json({
          error: {
            code: "ERR_REPLAY_NONCE",
            message: "Request nonce already used"
          }
        });
      }
      
      // Verify projection hash matches
      if (capability.caveats.projectionHash !== projectionHash) {
        return res.status(403).json({
          error: {
            code: "ERR_PROJECTION_MISMATCH", 
            message: "Projection doesn't match token caveat"
          }
        });
      }
      
      // Apply projection and return data
      const projection = await this.applyProjection(capability);
      
      // Store nonce to prevent replay
      await this.storeNonce(capability.id, requestNonce);
      
      // Create receipt
      const receipt = await this.createReceipt(requestNonce, projectionHash);
      
      res.json({
        requestId: receipt.id,
        data: projection.data
      });
      
    } catch (error) {
      this.handleError(res, error);
    }
  }
}
```

### Week 11-12: Advanced Features 🟡 **HIGH**

#### Task 2.4: Transparency Log
**File**: `lib/hml-transparency.js`
```javascript
export class HMLTransparencyLog {
  constructor() {
    this.treeId = `urn:hml:tree:${new Date().toISOString().split('T')[0]}`;
    this.leaves = [];
    this.tree = null;
  }
  
  async addReceipt(receipt) {
    // Calculate leaf hash per HML spec
    const leafData = HMLCanonicalizer.canonicalize(receipt);
    const leafHash = await crypto.subtle.digest('SHA-256', 
      this.concatBytes([new Uint8Array([0]), new TextEncoder().encode(leafData)])
    );
    
    const leaf = {
      index: this.leaves.length,
      hash: 'sha256:' + Array.from(new Uint8Array(leafHash))
        .map(b => b.toString(16).padStart(2, '0')).join(''),
      data: receipt
    };
    
    this.leaves.push(leaf);
    await this.rebuildTree();
    
    return {
      treeId: this.treeId,
      leafIndex: leaf.index,
      leafHash: leaf.hash,
      inclusion: await this.generateInclusionProof(leaf.index)
    };
  }
  
  async rebuildTree() {
    // Build Merkle tree with SHA-256
    // Node hash: SHA256(0x01 || left_hash || right_hash)
    this.tree = await this.buildMerkleTree(this.leaves.map(l => l.hash));
  }
}
```

---

## Phase 3: Integration & Testing (Weeks 13-16)

### Week 13-14: MTAP Migration 🟠 **MEDIUM**

#### Task 3.1: MTAP to HML Migration Tool
**File**: `lib/mtap-hml-migrator.js`
```javascript
export class MTAPToHMLMigrator {
  async migrateVault(vaultId) {
    console.log(`Migrating vault ${vaultId} from MTAP to HML format...`);
    
    // Get all MTAP memories
    const mtapMemories = await this.getAllMTAPMemories(vaultId);
    
    // Create migration event log
    const eventLog = new HMLEventLog(vaultId);
    
    const migrated = [];
    const failed = [];
    
    for (const mtapMemory of mtapMemories) {
      try {
        // Convert MTAP to HML capsule
        const hmlCapsule = await this.convertMTAPToHML(mtapMemory);
        
        // Create migration event
        const event = await eventLog.createEvent('create', hmlCapsule.capsule.id, {
          migrated_from: 'MTAP',
          original_id: mtapMemory.header.id
        });
        
        // Store HML capsule
        await this.storeHMLCapsule(hmlCapsule);
        
        migrated.push({
          mtapId: mtapMemory.header.id,
          hmlId: hmlCapsule.capsule.id,
          eventId: event.id
        });
        
      } catch (error) {
        console.error(`Failed to migrate memory ${mtapMemory.header.id}:`, error);
        failed.push({
          mtapId: mtapMemory.header.id,
          error: error.message
        });
      }
    }
    
    return {
      migrated: migrated.length,
      failed: failed.length,
      details: { migrated, failed }
    };
  }
  
  async convertMTAPToHML(mtapMemory) {
    return HMLCapsule.create(mtapMemory.core.content, {
      subject: `did:emma:${mtapMemory.header.creator}`,
      labels: {
        sensitivity: this.mapMTAPSensitivity(mtapMemory.metadata),
        retention: this.mapMTAPRetention(mtapMemory.metadata),
        sharing: this.mapMTAPSharing(mtapMemory.permissions)
      },
      extensions: {
        mtap_migration: {
          original_id: mtapMemory.header.id,
          migrated_at: new Date().toISOString(),
          mtap_version: mtapMemory.header.version
        },
        ...mtapMemory.metadata
      }
    });
  }
}
```

### Week 15-16: Comprehensive Testing 🔴 **CRITICAL**

#### Task 3.2: Complete Test Suite
**File**: `test/hml-complete.test.js`
```javascript
import { HMLCanonicalizer } from '../lib/hml-canonicalizer.js';
import { HMLEventLog } from '../lib/hml-event-log.js';
import { HMLCapability } from '../lib/hml-capability.js';
import { HMLCryptography } from '../lib/hml-crypto.js';

describe('HML v1.0 Complete Compliance', () => {
  
  describe('TV-1.1: Canonicalization', () => {
    it('should handle Unicode and nested objects', async () => {
      // Full test vector implementation
    });
  });
  
  describe('TV-2.1: Event Hash Chain', () => {
    it('should create valid hash chain', async () => {
      const eventLog = new HMLEventLog('test-vault');
      
      const event1 = await eventLog.createEvent('create', 'test-capsule', {});
      const event2 = await eventLog.createEvent('update', 'test-capsule', { change: 'test' });
      
      // Verify hash chain integrity
      expect(event2.previousEvent).toBe(event1.id);
      
      // Verify hash calculation
      const recalculatedHash = await eventLog.calculateEventHash(event2, event1);
      expect(event2.signature).toBe(recalculatedHash);
    });
  });
  
  describe('TV-3.1: Redaction Verification', () => {
    it('should create verifiable redactions', async () => {
      // Implement redaction test
    });
  });
  
  describe('TV-4.1: Token Attenuation', () => {
    it('should enforce capability monotonicity', async () => {
      const parentToken = await HMLCapability.createCapabilityToken(
        ['urn:hml:capsule:sha256:abc123'],
        { include: ['content', 'created', 'subject'] },
        { expiresAt: '2025-12-31T23:59:59Z', purpose: 'full-access' }
      );
      
      const childToken = await HMLCapability.attenuateToken(parentToken, {
        projection: { include: ['content'] },
        caveats: { purpose: 'content-only', expiresAt: '2025-06-30T23:59:59Z' }
      });
      
      // Verify attenuation rules
      expect(childToken.projection.include).toEqual(['content']);
      expect(new Date(childToken.caveats.expiresAt)).toBeLessThan(new Date(parentToken.caveats.expiresAt));
    });
  });
  
  describe('TV-4.3: Replay Prevention', () => {
    it('should block replay attacks', async () => {
      const nonce = 'test-nonce-123';
      
      // First request should succeed
      const result1 = await federation.agentRead({
        headers: { authorization: 'Capability valid-token' },
        body: { projectionHash: 'test-hash', requestNonce: nonce }
      });
      expect(result1.success).toBe(true);
      
      // Second request with same nonce should fail
      await expect(federation.agentRead({
        headers: { authorization: 'Capability valid-token' },
        body: { projectionHash: 'test-hash', requestNonce: nonce }
      })).rejects.toThrow('ERR_REPLAY_NONCE');
    });
  });
  
  describe('TV-5.1: Revocation Finality', () => {
    it('should enforce revocation window', async () => {
      const token = await HMLCapability.createCapabilityToken(
        ['urn:hml:capsule:sha256:abc123'],
        { include: ['content'] },
        { expiresAt: '2025-12-31T23:59:59Z' }
      );
      
      // Revoke token
      await federation.revokeShare(token.id);
      
      // Wait for revocation finality (300s)
      await new Promise(resolve => setTimeout(resolve, 301000));
      
      // Access should be denied
      await expect(federation.agentRead({
        headers: { authorization: `Capability ${token.id}` },
        body: { projectionHash: 'test', requestNonce: 'test' }
      })).rejects.toThrow('key revoked');
    });
  });
});
```

#### Task 3.3: Performance & Security Testing
**File**: `test/hml-performance.test.js`
```javascript
describe('HML Performance Tests', () => {
  it('should handle large capsule creation efficiently', async () => {
    const largeCapsule = {
      content: 'x'.repeat(1000000), // 1MB content
      metadata: { test: true }
    };
    
    const startTime = performance.now();
    const capsule = await HMLCapsule.create(largeCapsule.content, largeCapsule.metadata);
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(5000); // Under 5 seconds
    expect(capsule.capsule.id).toMatch(/^urn:hml:capsule:sha256:[a-f0-9]{64}$/);
  });
  
  it('should prevent timing attacks on key derivation', async () => {
    const timings = [];
    
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await HMLCryptography.deriveKey('wrong-password', 'test-salt');
      timings.push(performance.now() - start);
    }
    
    const variance = this.calculateVariance(timings);
    expect(variance).toBeLessThan(10); // Low timing variance
  });
});
```

---

## Implementation Checklist

### Phase 1 Deliverables ✅
- [ ] HML capsule schema implementation
- [ ] Canonical JSON serialization  
- [ ] Content hash calculation (SHA-256)
- [ ] Event log with hash chains
- [ ] Hybrid Logical Clock implementation
- [ ] XChaCha20-Poly1305 encryption
- [ ] Test vectors TV-1.1, TV-2.1 passing

### Phase 2 Deliverables ✅
- [ ] Capability token system
- [ ] Projection and redaction engine
- [ ] HML-Basic federation endpoints
- [ ] Agent access protocol
- [ ] Transparency log implementation
- [ ] Test vectors TV-3.1, TV-4.1, TV-4.3 passing

### Phase 3 Deliverables ✅
- [ ] MTAP to HML migration tool
- [ ] Backward compatibility layer
- [ ] Complete test suite
- [ ] Performance benchmarks
- [ ] Security audit compliance
- [ ] Documentation and examples

---

## Dependencies & Setup

### Required npm Packages
```bash
npm install --save \
  @stablelib/xchacha20poly1305 \
  @stablelib/base64 \
  uuid \
  jose

npm install --save-dev \
  jest \
  @testing-library/jest-dom \
  performance-now
```

### Build Configuration
**File**: `webpack.config.js`
```javascript
module.exports = {
  entry: {
    'hml-adapter': './lib/hml-adapter.js',
    'background': './js/background.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
};
```

---

## Success Metrics

### Technical Compliance
- ✅ Pass all HML v1.0 test vectors (TV-1.1 through TV-5.1)
- ✅ Interoperate with reference HML implementation
- ✅ Support federation with other HML applications
- ✅ Zero security vulnerabilities in audit

### Performance Targets
- ✅ Capsule creation: < 100ms for 1KB content
- ✅ Event log: < 50ms per event
- ✅ Capability verification: < 10ms
- ✅ Projection application: < 200ms for complex redactions

### Ecosystem Goals
- ✅ First production-ready HML application
- ✅ Reference implementation for other developers
- ✅ Contribution to HML ecosystem standards
- ✅ Community adoption and feedback integration

---

This implementation plan provides a **complete roadmap** for transforming Emma Lite from a custom MTAP application into a **fully HML-compliant ecosystem leader**. The structured approach ensures both technical compliance and practical usability.

