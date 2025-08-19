# Emma Lite Extension - MTAP Protocol Integration

## Overview
Emma Lite Extension now fully implements **MTAP (Memory Transport and Access Protocol) v1.0** as the primary protocol for capturing and orchestrating all memories. This provides a standardized, secure, and federated approach to memory storage.

## What is MTAP?

MTAP (Memory Transport and Access Protocol) is a revolutionary protocol designed for:
- **Secure Memory Storage**: Every memory is cryptographically signed and content-addressed
- **Federation Support**: Memories can be shared across devices and agents (future)
- **AI Agent Interoperability**: Standard format for AI agents to access memories via MCP
- **Privacy-First Design**: Complete local control with optional federation

## Key Features

### 1. MTAP Memory Structure
Each memory stored with MTAP includes:
- **Header**: Immutable metadata (ID, version, creator, signature)
- **Core Content**: The actual memory data with encoding information
- **Semantic Layer**: Keywords, summaries, entities, and embeddings
- **Relations**: Links to related memories and references
- **Permissions**: Fine-grained access control for agents

### 2. Content Addressing
- Every memory gets a unique MTAP address: `mtap://memory/{contentHash}`
- Content-based addressing ensures integrity and deduplication
- Enables efficient distributed storage (future federation)

### 3. MCP Bridge Integration
- Seamlessly provides context to AI agents via Model Context Protocol
- Automatic relevance scoring and token estimation
- Optimized for LLM consumption

## How to Use

### Enable/Disable MTAP
1. Click the Emma extension icon
2. Toggle the "MTAP Protocol" switch
3. When enabled, all new memories are stored in MTAP format

### Check MTAP Status
- Green indicator (🔐) = MTAP Active
- Gray indicator = Using simple storage
- Footer shows "MTAP Enabled" when active

### Memory Storage Modes

#### MTAP Mode (Recommended)
- Full protocol compliance
- Federation-ready storage
- Enhanced semantic analysis
- Agent permission management
- Content-addressed storage

#### Simple Mode (Legacy)
- Basic key-value storage
- No federation support
- Limited metadata
- Faster for basic use cases

## API Endpoints for Developers

### Save Memory with MTAP
```javascript
chrome.runtime.sendMessage({
  action: 'saveMemory',
  data: {
    content: 'Memory content',
    role: 'user',
    source: 'chatgpt',
    metadata: {
      protocol: 'MTAP/1.0'
    }
  }
});
```

### Get MCP Context
```javascript
chrome.runtime.sendMessage({
  action: 'getMCPContext',
  query: 'search query',
  options: {
    maxTokens: 4000
  }
});
```

### Toggle MTAP Mode
```javascript
chrome.runtime.sendMessage({
  action: 'toggleMTAP',
  enabled: true
});
```

## Data Export/Import

### Export Format
When MTAP is enabled, exports include:
- Full MTAP protocol headers
- Content hashes for verification
- Semantic metadata
- Agent permissions
- Digital signatures

### Import Compatibility
- Automatically detects MTAP vs simple format
- Validates MTAP structure on import
- Preserves all protocol metadata

## Future Roadmap

### Phase 1: Local MTAP (Current)
✅ Protocol-compliant storage
✅ Content addressing
✅ MCP bridge
✅ Agent permissions

### Phase 2: Federation (Coming Soon)
- P2P memory sharing
- Cross-device sync
- Distributed backup
- Family memory pools

### Phase 3: Advanced Features
- Zero-knowledge encryption
- Smart contracts for permissions
- Memory marketplace
- AI memory coaching

## Technical Details

### MTAP Memory Example
```json
{
  "header": {
    "id": "mem_1234567890",
    "version": "1.0.0",
    "created": "2025-01-15T10:30:00Z",
    "creator": "did:emma:user123",
    "contentHash": "sha256:abc123...",
    "signature": "sig_xyz789...",
    "protocol": "MTAP/1.0"
  },
  "core": {
    "type": "text",
    "content": "Had a great conversation about AI",
    "encoding": "UTF-8",
    "encrypted": false
  },
  "semantic": {
    "summary": "Conversation about AI",
    "keywords": ["AI", "conversation"],
    "entities": [],
    "emotions": ["positive"]
  },
  "relations": {
    "previous": null,
    "related": []
  },
  "permissions": {
    "owner": "did:emma:user123",
    "public": false,
    "agents": [
      {
        "agentId": "chatgpt",
        "permissions": ["read"]
      }
    ]
  }
}
```

### Storage Architecture
```
IndexedDB
├── memories (simple mode)
├── mtap_memories (MTAP storage)
├── mtap_index (fast lookups)
├── embeddings (vector storage)
└── settings (configuration)
```

## Privacy & Security

- **100% Local**: All MTAP processing happens on your device
- **No Cloud Required**: Works completely offline
- **Encrypted at Rest**: Memories are encrypted in storage
- **Signed Memories**: Every memory is cryptographically signed
- **Agent Permissions**: Fine-grained control over AI access

## Support

For issues or questions about MTAP:
- GitHub: [Emma HML Repository](https://github.com/emma-hml)
- Documentation: [MTAP Protocol Spec](https://emma-hml.org/mtap)
- Email: support@emma-hml.org

## License

MTAP Protocol is open-source under MIT License.
Emma Lite Extension © 2025 Emma HML

---

**Note**: MTAP is designed to be the future of personal memory management, enabling true ownership and control of your digital memories while maintaining interoperability with AI systems.
