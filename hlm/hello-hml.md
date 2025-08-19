# Hello HML — 5-Minute Quickstart (HML-Basic)

This walkthrough demonstrates **create → share (projection) → agent read → revoke → receipt** using only the **HML-Basic** endpoints.

> Replace placeholder values (tokens, IDs, URLs) with your own.

---

## 0) Env
```bash
export HML_BASE_URL="https://example-hml-basic.dev/v1"
export USER_TOKEN="Bearer YOUR_USER_BEARER_TOKEN"
export AGENT_NAME="example-agent"
```

## 1) Create a capsule
```bash
curl -sS -X POST "$HML_BASE_URL/capsules"   -H "Authorization: $USER_TOKEN"   -H "Content-Type: application/json"   -d '{
    "subject": "visit:dentist",
    "labels": ["health", "receipt"],
    "content": {
      "type": "text/plain; charset=utf-8",
      "data": "Routine cleaning with Dr. Lee; follow-up in 6 months."
    },
    "extensions": {"providerId": "dr-lee-42"}
  }' | jq
# → { "capsuleId": "cap_...", "eventId": "evt_..." }
```

## 2) Create a projection + share token (capability)
```bash
# Minimal projection: only specific fields
PROJECTION_SPEC='{
  "include": ["subject", "labels", "content.type"],
  "exclude": ["content.data"],
  "redactions": []
}'

# Capability caveats
CAVEATS='{
  "purpose": "summarization",
  "aud": "'"$AGENT_NAME"'",
  "expiresAt": "2025-12-31T23:59:59Z",
  "maxAccesses": 3
}'

curl -sS -X POST "$HML_BASE_URL/shares"   -H "Authorization: $USER_TOKEN"   -H "Content-Type: application/json"   -d '{
    "capsuleId": "cap_...",
    "projection": '"$PROJECTION_SPEC"',
    "caveats": '"$CAVEATS"'
  }' | jq
# → { "shareId": "shr_...", "token": "cap_eyJhbGciOi..." , "projectionHash":"phash_..." }
```

## 3) Agent read (projection-bound, nonce-protected)
```bash
# Agent generates a fresh nonce per request
NONCE=$(openssl rand -hex 16)

curl -sS -X POST "$HML_BASE_URL/agent/read"   -H "Authorization: Capability cap_eyJhbGciOi..."   -H "Content-Type: application/json"   -d '{
    "projectionHash": "phash_...",
    "requestNonce": "'"$NONCE"'"
  }' | jq
# → { "requestId":"req_...", "data": { ...projection... } }
```

## 4) Revoke the share
```bash
curl -sS -X POST "$HML_BASE_URL/shares/shr_.../revoke"   -H "Authorization: $USER_TOKEN" | jq
# → { "revoked": true, "epoch": 3 }
```

## 5) Fetch the receipt
```bash
curl -sS -X GET "$HML_BASE_URL/receipts/req_..."   -H "Authorization: $USER_TOKEN" | jq
# → { "requestId":"req_...", "nonce":"...", "projectionHash":"...", "timestamp":"...", "serverSig":"..." }
```

---

### Notes
- The server MUST bind the capability token to the **projectionHash** and **requestNonce** when verifying authorization.  
- Receipts SHOULD be anchored in the transparency log; clients MAY verify inclusion proofs asynchronously.
