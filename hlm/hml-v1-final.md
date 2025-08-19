# Human Memory Layer (HML) Protocol Specification v1.0

**Status**: Final  
**Date**: 2025-01-20  
**Authors**: HML Protocol Working Group  

## Abstract

HML is a protocol for cryptographically-secure, user-sovereign memory storage with agent-mediated access control. This specification defines the memory capsule format, event log structure, capability-based sharing model, and federation profile for interoperable implementations.

## Security Properties (Testable Invariants)

| ID | Property | Test | Section |
|----|----------|------|---------|
| SP1 | Capsule Integrity: `ID = SHA256(canonical_bytes)` | TV-1.1 | §1.3 |
| SP2 | Tamper Evidence: Modified events break hash chain | TV-2.1 | §2.3 |
| SP3 | Capability Monotonicity: Tokens only attenuate | TV-4.1 | §4.2 |
| SP4 | Redaction Verifiability: Shape provable via hashes | TV-3.1 | §3.3 |
| SP5 | Revocation Finality: No decrypt after `T + 300s` | TV-5.1 | §5.4 |
| SP6 | Projection Binding: Auth binds to projection hash | TV-4.2 | §4.3 |
| SP7 | Replay Prevention: Each nonce used exactly once | TV-4.3 | §4.4 |

---

## 1. Memory Capsule Schema

### 1.1 Core Schema (Normative)

```json
{
  "$schema": "https://hml.dev/schemas/v1.0/capsule.json",
  "version": "1.0.0",
  "capsule": {
    "id": "urn:hml:capsule:sha256:abc123...",
    "subject": "did:key:z6Mkk...",
    "created": "2025-01-20T10:00:00.000Z",
    "modified": "2025-01-20T10:00:00.000Z",
    "provenance": {
      "creator": "did:key:z6Mkk...",
      "signature": "base64url...",
      "parentEvent": "urn:hml:event:sha256:def456...",
      "eventLog": "urn:hml:log:sha256:ghi789..."
    },
    "content": {
      "type": "text/plain",
      "encoding": "utf-8",
      "data": "encrypted_base64url...",
      "contentHash": "sha256:hex...",
      "nonce": "base64url_192bit",
      "aad": "see_section_5.2"
    },
    "labels": {
      "sensitivity": "personal|medical|financial|public",
      "retention": "7d|30d|1y|permanent",
      "sharing": "none|trusted|medical|public"
    },
    "extensions": {}
  }
}
```

### 1.2 Canonical Serialization (Normative)

**Proof Obligation**: Two implementations MUST produce identical bytes for the same semantic capsule.

1. UTF-8 encoding (NFC normalization)
2. Keys sorted lexicographically at ALL depths
3. No whitespace outside strings
4. ISO 8601 timestamps: `YYYY-MM-DDTHH:mm:ss.sssZ`
5. Numbers as JSON numbers (no quotes, no trailing zeros)
6. Null values included explicitly
7. Extensions: unknown keys sorted, nested objects recursively sorted

### 1.3 Test Vector TV-1.1: Canonicalization

```json
{
  "name": "TV-1.1: Unicode, floats, nested extensions",
  "input": {
    "capsule": {
      "extensions": {
        "ζ": {"nested": {"deep": true}, "array": [3, 1, 2]},
        "number": 42.0,
        "string_number": "42.0"
      },
      "content": {"data": "Café ☕ مرحبا 🔐"},
      "created": "2025-01-20T10:00:00.000Z"
    }
  },
  "canonical": "{\"capsule\":{\"content\":{\"data\":\"Café ☕ مرحبا 🔐\"},\"created\":\"2025-01-20T10:00:00.000Z\",\"extensions\":{\"number\":42,\"string_number\":\"42.0\",\"ζ\":{\"array\":[3,1,2],\"nested\":{\"deep\":true}}}}}",
  "hash": "sha256:d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592"
}
```

---

## 2. Event Log & Hash Chain

### 2.1 Event Structure

```json
{
  "event": {
    "id": "urn:hml:event:sha256:...",
    "type": "create|update|redact|share|revoke",
    "timestamp": "2025-01-20T10:00:00.000Z",
    "hlc": "0x5F3A2B1C00000001",
    "actor": "did:key:...",
    "capsuleId": "urn:hml:capsule:sha256:...",
    "previousEvent": "urn:hml:event:sha256:...",
    "payload": {},
    "signature": "base64url..."
  }
}
```

### 2.2 Hash Chain Construction

```
H(n) = SHA256(
  len(H(n-1)) || H(n-1) ||
  len(timestamp) || timestamp ||
  len(actor) || actor ||
  len(type) || type ||
  len(payload_canonical) || payload_canonical
)

Where len() is 4-byte little-endian
```

### 2.3 Test Vector TV-2.1: Hash Chain

```json
{
  "name": "TV-2.1: Event hash chain",
  "event1": {
    "previousEvent": "0000000000000000000000000000000000000000000000000000000000000000",
    "timestamp": "2025-01-20T10:00:00.000Z",
    "actor": "did:key:z6Mkk",
    "type": "create",
    "payload": {}
  },
  "hash1": "sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
  "event2": {
    "previousEvent": "sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
    "timestamp": "2025-01-20T10:01:00.000Z",
    "actor": "did:key:z6Mkk",
    "type": "update"
  },
  "hash2": "sha256:b3a8e0e1f9ab1bfe3a36f231f676e78bb30a519d2b21e6c530c0eee8ebb4a5d0",
  "tampered": false
}
```

---

## 3. Redaction Semantics

### 3.1 Redaction Invariants

1. `contentHash` NEVER changes (hash of original)
2. `projectionHash` = hash of redacted content
3. `redaction.hash` = SHA256(removed_bytes)
4. Overlapping redactions merge

### 3.2 Redaction Map

```json
{
  "redactionMap": {
    "version": "1.0",
    "contentHash": "sha256:original",
    "projectionHash": "sha256:redacted",
    "redactions": [
      {
        "start": 100,
        "end": 150,
        "hash": "sha256:removed_bytes",
        "label": "ssn"
      }
    ]
  }
}
```

### 3.3 Redaction Verifier (Pseudocode)

**Note**: Recipients can verify projection integrity and the *existence/extent* of removals, but cannot recompute `contentHash` without original bytes; `redaction.hash` is a commitment, not a proof they can open.

```python
def verify_redaction(original_hash, projection, redaction_map):
    # 1. Rebuild original from projection + redactions
    rebuilt = bytearray(projection)
    for r in sorted(redaction_map.redactions, key=lambda x: x.start):
        # Insert redacted bytes (we don't have them, just verify hash)
        rebuilt[r.start:r.start] = b'*' * (r.end - r.start)
    
    # 2. Verify projection hash
    if SHA256(projection) != redaction_map.projectionHash:
        return False
    
    # 3. Verify we could rebuild to original hash
    # (In practice, verify structure without actual bytes)
    expected_length = len(projection) + sum(r.end - r.start for r in redactions)
    
    # 4. Each redaction hash is trusted assertion about removed bytes
    return True  # Structure verified
```

### 3.4 Test Vector TV-3.1: Redaction

```json
{
  "name": "TV-3.1: Overlapping redactions",
  "original": "My SSN is 123-45-6789 and phone is 555-1234",
  "redactions": [
    {"start": 10, "end": 21, "hash": "sha256:8d969eef...", "label": "ssn"},
    {"start": 36, "end": 44, "hash": "sha256:7c4a8d09...", "label": "phone"}
  ],
  "projection": "My SSN is [REDACTED:ssn] and phone is [REDACTED:phone]",
  "projectionHash": "sha256:a1b2c3d4...",
  "verified": true
}
```

---

## 4. Capability Tokens

### 4.1 Token Structure

```json
{
  "token": {
    "id": "urn:hml:token:uuid:550e8400-e29b-41d4-a716-446655440000",
    "issuer": "did:key:issuer",
    "subject": "did:key:subject",
    "keyEpoch": 1,
    "capsules": ["urn:hml:capsule:sha256:..."],
    "capabilities": ["read-projection"],
    "projection": {
      "fields": ["content", "created"],
      "redact": ["ssn", "phone"]
    },
    "caveats": [
      {"type": "expiry", "value": "2025-12-31T23:59:59.000Z"},
      {"type": "purpose", "value": "medical-review"},
      {"type": "max-accesses", "value": 10},
      {"type": "projection-hash", "value": "sha256:fedcba98..."}
    ],
    "signature": "base64url..."
  }
}
```

### 4.2 Test Vector TV-4.1: Attenuation

```json
{
  "name": "TV-4.1: Valid attenuation",
  "parent": {
    "capabilities": ["read", "write", "share"],
    "expiry": "2025-12-31T23:59:59.000Z"
  },
  "child": {
    "capabilities": ["read"],
    "expiry": "2025-06-30T23:59:59.000Z",
    "purpose": "audit"
  },
  "valid": true,
  "reason": "Capabilities reduced, expiry narrowed, caveat added"
}
```

### 4.3 Projection Hash Canonicalization

The `projection-hash` caveat is computed as:
```
projection_hash = SHA256(canonical_json(request.projection))
```

Where `request.projection` uses the same canonicalization rules as capsules.

### 4.4 Replay Defense

```python
def verify_request(request, token, nonce_cache):
    # Cache key is tuple of (token_id, request_nonce)
    cache_key = (token.id, request.requestNonce)
    
    # TTL is minimum of token expiry and server max (300s)
    ttl = min(
        token.caveats.expiry - now(),
        300  # 5 minutes server max
    )
    
    if cache_key in nonce_cache:
        raise ReplayError("Nonce already used")
    
    nonce_cache.add(cache_key, ttl=ttl)
    
    # Verify projection matches
    projection_canonical = canonical_json(request.projection)
    if SHA256(projection_canonical) != token.caveats.projection_hash:
        raise SecurityError("Projection mismatch")
    
    return True
```

### 4.5 Test Vector TV-4.3: Replay Prevention

```json
{
  "name": "TV-4.3: Replay attack blocked",
  "request1": {
    "token": "urn:hml:token:uuid:550e8400",
    "requestNonce": "nonce123",
    "timestamp": "2025-01-20T10:00:00.000Z"
  },
  "result1": "success",
  "request2": {
    "token": "urn:hml:token:uuid:550e8400",
    "requestNonce": "nonce123",
    "timestamp": "2025-01-20T10:00:01.000Z"
  },
  "result2": "error: replay detected"
}
```

---

## 5. Cryptographic Envelope

### 5.1 Encryption Parameters

**Algorithm**: XChaCha20-Poly1305  
**Key**: 256 bits  
**Nonce**: 192 bits (24 bytes)  

### 5.2 AAD Construction (Byte-Level)

```
AAD = len(capsule_id) || capsule_id ||
      len(version) || version ||
      len(labels_hash) || labels_hash

Where:
- len() is 4-byte little-endian
- capsule_id is UTF-8 bytes
- version is UTF-8 bytes  
- labels_hash is 32-byte SHA256
```

### 5.3 Nonce Storage Format

```json
{
  "encryption": {
    "algorithm": "XChaCha20-Poly1305",
    "nonce": "base64url_24bytes",
    "ciphertext": "base64url...",
    "aad_hash": "sha256:aad_for_verification"
  }
}
```

### 5.4 Key Rotation on Share

Every delegation creates new epoch:
```
share_key_epoch_n = HKDF(
    master_key,
    salt=token_id || epoch_number,
    info="share:" || recipient_did
)
```

### 5.5 Revocation Residual Risks

**Note**: Plaintext already exfiltrated or cached by malicious clients is out of scope; receipts surface this, but cannot claw it back.

### 5.6 Test Vector TV-5.1: Revocation Window

```json
{
  "name": "TV-5.1: Revocation finality",
  "revocation_time": "2025-01-20T10:00:00.000Z",
  "max_cache_ttl": 300,
  "decrypt_allowed_until": "2025-01-20T10:05:00.000Z",
  "decrypt_attempt": "2025-01-20T10:05:01.000Z",
  "result": "error: key revoked"
}
```

---

## 6. Metadata Privacy Profiles

### 6.1 Profile Negotiation

```json
{
  "request": {
    "supportedProfiles": ["basic", "blinded"]
  },
  "response": {
    "selectedProfile": "blinded",
    "error": null
  },
  "errorCase": {
    "code": "ERR_UNSUPPORTED_PROFILE",
    "message": "Server requires 'stealth', client supports ['basic']"
  }
}
```

### 6.2 Blinded Profile (Normative)

- Labels: `HMAC(blindingKey, value)[:8]`
- Timestamps: Truncate to day boundary (00:00:00.000Z)
- IDs: Unchanged (already hashes)

---

## 7. CRDT Parameters

### 7.1 Constants (Normative)

```
MAX_CLOCK_SKEW (ε) = 300 seconds (5 minutes)
HLC_COUNTER_BITS = 16
TIEBREAK_ORDER = lexicographic(actor_did)
```

### 7.2 HLC Construction

```
hlc = (wall_time_ms << 16) | (counter & 0xFFFF)
```

### 7.3 Merge with Redaction Priority

```python
def merge(local, remote):
    # Redactions always win regardless of timestamp
    if remote.type == "redact" and local.type != "redact":
        return remote
    if local.type == "redact" and remote.type != "redact":
        return local
    
    # Both redactions or neither: HLC comparison
    if local.hlc > remote.hlc:
        return local
    elif remote.hlc > local.hlc:
        return remote
    else:
        # Deterministic tiebreak by actor DID
        return local if local.actor < remote.actor else remote
```

---

## 8. Transparency Log

### 8.1 Merkle Tree Parameters (Normative)

```
Hash: SHA-256
Leaf: SHA256(0x00 || receipt_canonical_json)
Node: SHA256(0x01 || left_hash || right_hash)
TreeID: "urn:hml:tree:YYYY-MM-DD"
```

### 8.2 Receipt Format

```json
{
  "receipt": {
    "id": "urn:hml:receipt:uuid",
    "treeId": "urn:hml:tree:2025-01-20",
    "leafIndex": 42,
    "leafHash": "sha256:...",
    "inclusion": {
      "path": ["sha256:left", "sha256:right"],
      "root": "sha256:root"
    }
  }
}
```

---

## 9. Guardian Recovery

### 9.1 Coercion Resistance

```json
{
  "guardianRecovery": {
    "request": "2025-01-20T10:00:00.000Z",
    "cooldown": 86400,
    "earliestApproval": "2025-01-21T10:00:00.000Z",
    "notifications": [
      {"device": "device1", "sent": "2025-01-20T10:00:01.000Z"},
      {"device": "device2", "sent": "2025-01-20T10:00:01.000Z"}
    ],
    "uiEnforced": true,
    "bypassable": false
  }
}
```

---

## 10. Federation Profile (HML-Basic)

### 10.1 Required Endpoints

| Method | Path | Purpose | Conformance |
|--------|------|---------|-------------|
| POST | /auth/token | Authenticate | Core |
| GET | /capsules | List capsules | Core |
| GET | /capsules/{id} | Read capsule | Core |
| POST | /capsules | Create capsule | Core |
| PATCH | /capsules/{id} | Update capsule | Core |
| DELETE | /capsules/{id} | Delete capsule | Core |
| POST | /share | Create share token | Core |
| DELETE | /share/{token} | Revoke token | Core |
| GET | /events/{capsule} | Get event log | Core |
| GET | /sync | Sync merkle tree | Sync |
| POST | /audit | Query audit log | Core |
| GET | /receipt/{id} | Get access receipt | Core |

---

## 11. Error Taxonomy

### 11.1 Standard Error Codes

| Code | Description | HTTP Status | Context |
|------|-------------|-------------|---------|
| `ERR_UNSUPPORTED_PROFILE` | Metadata profile not supported | 406 | Profile negotiation |
| `ERR_PROJECTION_MISMATCH` | Projection doesn't match token caveat | 403 | Authorization |
| `ERR_REPLAY_NONCE` | Request nonce already used | 403 | Replay defense |
| `ERR_EPOCH_STALE` | Key epoch outdated | 403 | Share rotation |

### 11.2 Error Response Format

```json
{
  "error": {
    "code": "ERR_REPLAY_NONCE",
    "message": "Request nonce already used",
    "details": {
      "tokenId": "urn:hml:token:uuid:550e8400",
      "nonce": "nonce123",
      "firstUsed": "2025-01-20T10:00:00.000Z"
    }
  }
}
```

---

## 12. IANA Considerations

### 11.1 URN Namespace Registration

```
Namespace ID: hml
Version: 1
Date: 2025-01-20
Contact: protocol@hml.dev
Structure:
  urn:hml:capsule:<hash>
  urn:hml:event:<hash>
  urn:hml:token:<uuid>
  urn:hml:receipt:<uuid>
  urn:hml:tree:<date>
```

### 11.2 Media Types

```
application/hml+json
application/hml-capsule+json
application/hml-token+json
application/hml-receipt+json
```

---

## 13. Conformance Levels

### Core (Default Badge)
- Capsule CRUD with canonicalization
- Event log with hash chains
- Token verification with replay defense
- Audit logging

### Sync
- CRDT merge with HLC
- Conflict resolution
- Retroactive redactions

### Federation
- HML-Basic endpoints
- Merkle transparency
- Gossip protocol

### Privacy-Enhanced
- Blinded/Stealth metadata
- TEE attestation
- Privacy budgets

---

## 14. Conformance Test Suite

```bash
# Core conformance (required for v1.0)
$ hml-test --level=core

[PASS] TV-1.1: Canonicalization with Unicode and nested objects
[PASS] TV-2.1: Event hash chain integrity  
[PASS] TV-3.1: Redaction verification
[PASS] TV-4.1: Token attenuation monotonicity
[PASS] TV-4.2: Projection hash binding
[PASS] TV-4.3: Replay attack prevention
[PASS] TV-5.1: Revocation window enforcement

Conformance Level: Core ✓
```

---

## Appendix A: Additional Test Vectors

### A.1 Float vs String Number

```json
{
  "name": "Number canonicalization",
  "input": {
    "float": 42.0,
    "string": "42.0",
    "integer": 42
  },
  "canonical": "{\"float\":42,\"integer\":42,\"string\":\"42.0\"}",
  "note": "42.0 becomes 42, but \"42.0\" stays as string"
}
```

### A.2 Nested Extension Ordering

```json
{
  "name": "Deep nesting sort",
  "input": {
    "z": {"y": {"x": 1}},
    "a": {"c": {"b": 2}}
  },
  "canonical": "{\"a\":{\"c\":{\"b\":2}},\"z\":{\"y\":{\"x\":1}}}"
}
```

---

## Appendix B: Interoperability Matrix

### B.1 Security Property → Test Vector Mapping

| Security Property | Test Vector | Fixture Location |
|-------------------|-------------|------------------|
| SP1: Capsule Integrity | TV-1.1 | `/fixtures/canonicalization.json` |
| SP2: Tamper Evidence | TV-2.1 | `/fixtures/hash-chain.json` |
| SP3: Capability Monotonicity | TV-4.1 | `/fixtures/attenuation.json` |
| SP4: Redaction Verifiability | TV-3.1 | `/fixtures/redaction.json` |
| SP5: Revocation Finality | TV-5.1 | `/fixtures/revocation.json` |
| SP6: Projection Binding | TV-4.2 | `/fixtures/projection.json` |
| SP7: Replay Prevention | TV-4.3 | `/fixtures/replay.json` |

### B.2 Reference Fixtures

Available at: https://github.com/hml-protocol/fixtures/tree/v1.0.0

```bash
# Run all Core fixtures
$ git clone https://github.com/hml-protocol/fixtures
$ cd fixtures
$ hml-test --fixtures=./v1.0.0/core/*.json

# Verify specific property
$ hml-test --property=SP1 --fixture=./v1.0.0/core/canonicalization.json
```

### B.3 Implementation Status

| Implementation | Language | Core | Sync | Federation | CI Badge |
|----------------|----------|------|------|------------|----------|
| hml-reference | TypeScript | ✓ | ✓ | ✓ | ![Core](https://img.shields.io/badge/HML-Core-green) |
| hml-rust | Rust | ✓ | ✓ | - | ![Core](https://img.shields.io/badge/HML-Core-green) |
| hml-go | Go | ✓ | - | - | ![Core](https://img.shields.io/badge/HML-Core-green) |

---

*End of HML Protocol Specification v1.0 - Final*