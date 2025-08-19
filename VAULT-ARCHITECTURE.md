# Emma Vault-Based Storage Architecture

## Overview
Emma needs a unified vault-based storage system that organizes all memory data into discrete vault folders/databases, enabling complete backup and restore functionality.

## Current Problems
1. **Dual Storage Systems**: MTAP memories (EmmaLiteDB) and Vault capsules (EmmaVaultDB) are separate
2. **No Vault Isolation**: All memories stored in single global database regardless of vault
3. **No File Organization**: No folder/file structure for backup/restore
4. **Mixed APIs**: `saveMemory()` vs `vault.createCapsule()` with different flows

## Proposed Vault-Based Architecture

### Vault Directory Structure
```
Emma/
├── vaults/
│   ├── vault_{id}/
│   │   ├── vault.json                 # Vault metadata
│   │   ├── memories/
│   │   │   ├── memories.db            # IndexedDB for memories
│   │   │   ├── capsule_{id}.json      # Individual capsule metadata
│   │   │   └── ...
│   │   ├── attachments/
│   │   │   ├── attachments.db         # IndexedDB for attachments
│   │   │   ├── media/
│   │   │   │   ├── {hash}.jpg         # Media files by content hash
│   │   │   │   ├── {hash}.png
│   │   │   │   └── ...
│   │   │   └── thumbnails/
│   │   │       ├── {hash}_thumb.jpg   # Thumbnail cache
│   │   │       └── ...
│   │   ├── settings/
│   │   │   ├── preferences.json       # Vault-specific settings
│   │   │   └── permissions.json       # Access control
│   │   └── analytics/
│   │       └── events.json            # Vault-specific analytics
│   └── vault_{id2}/                   # Additional vaults
│       └── ...
└── global/
    ├── app-settings.json              # Global Emma settings
    └── vault-registry.json            # List of all vaults
```

### Database Organization

#### Per-Vault IndexedDB Databases
```javascript
// Database naming convention
const vaultDbName = `EmmaVault_${vaultId}`;

// Stores per vault:
{
  "memories": {
    keyPath: "id",
    indexes: ["timestamp", "source", "type", "mtap_id"]
  },
  "attachments": {
    keyPath: "id", 
    indexes: ["capsule_id", "content_hash", "type"]
  },
  "capsules": {
    keyPath: "id",
    indexes: ["created", "type", "memory_id"] 
  },
  "blobs": {
    keyPath: "content_hash"  // Encrypted blob storage
  }
}
```

### Unified Data Models

#### Memory Capsule (MTAP + Vault)
```javascript
{
  // MTAP Header
  header: {
    id: "mem_1234567890_abc123",
    version: "1.0.0",
    created: "2024-01-01T00:00:00.000Z",
    creator: "did:emma:user_123",
    protocol: "MTAP/1.0",
    vault_id: "vault_1234567890_xyz789"
  },
  
  // MTAP Core
  core: {
    type: "conversation",
    content: "Memory content...",
    encoding: "UTF-8",
    encrypted: true
  },
  
  // Vault Metadata
  vault: {
    capsule_id: "cap_1234567890_def456",
    encrypted_blob_id: "blob_hash_abc123",
    permissions: {...}
  },
  
  // Attachments
  attachments: [
    {
      id: "att_1234567890_ghi789",
      type: "image",
      content_hash: "sha256:abc123...",
      filename: "photo.jpg",
      size: 1024576,
      encrypted: true,
      thumbnail_hash: "sha256:def456..."
    }
  ]
}
```

### Storage Operations Flow

#### 1. Vault Creation
```javascript
async function createVault(passphrase, metadata = {}) {
  const vaultId = `vault_${Date.now()}_${generateId()}`;
  
  // 1. Initialize vault structure
  await initializeVaultDirectories(vaultId);
  
  // 2. Create vault-specific database
  await createVaultDatabase(vaultId);
  
  // 3. Initialize vault keyring
  await initializeVaultSecurity(vaultId, passphrase);
  
  // 4. Create vault metadata
  const vaultMetadata = {
    id: vaultId,
    created: new Date().toISOString(),
    name: metadata.name || "My Vault",
    description: metadata.description || "",
    version: "1.0.0",
    encryption: "AES-256-GCM",
    ...metadata
  };
  
  // 5. Save vault metadata
  await saveVaultMetadata(vaultId, vaultMetadata);
  
  // 6. Register in global registry
  await registerVault(vaultId, vaultMetadata);
  
  return vaultId;
}
```

#### 2. Memory Storage (Unified)
```javascript
async function saveMemoryToVault(memoryData, vaultId) {
  // 1. Ensure vault is unlocked
  await ensureVaultUnlocked(vaultId);
  
  // 2. Create MTAP-compliant memory
  const mtapMemory = await mtapAdapter.createMemory(memoryData.content, {
    ...memoryData.metadata,
    vault_id: vaultId
  });
  
  // 3. Encrypt memory content
  const encryptedContent = await encryptForVault(mtapMemory.core.content, vaultId);
  
  // 4. Create vault capsule
  const capsule = await createVaultCapsule({
    memory_id: mtapMemory.header.id,
    encrypted_blob: encryptedContent,
    vault_id: vaultId
  });
  
  // 5. Store in vault database
  await storeInVaultDB(vaultId, 'memories', mtapMemory);
  await storeInVaultDB(vaultId, 'capsules', capsule);
  
  // 6. Process attachments
  if (memoryData.attachments) {
    await processAttachments(memoryData.attachments, vaultId, mtapMemory.header.id);
  }
  
  return mtapMemory.header.id;
}
```

### Backup and Restore System

#### Backup Structure
```javascript
// Backup package format
{
  manifest: {
    version: "1.0.0",
    created: "2024-01-01T00:00:00.000Z",
    vault_id: "vault_1234567890_xyz789",
    vault_name: "My Personal Vault",
    total_memories: 150,
    total_attachments: 45,
    backup_size_bytes: 1073741824,
    encryption: "AES-256-GCM"
  },
  
  // Vault structure
  vault: {
    metadata: {...},      // vault.json
    memories: [...],      // All memory records
    capsules: [...],      // All capsule records  
    attachments: [...],   // Attachment metadata
    settings: {...},      // Vault settings
    analytics: [...]      // Event data
  },
  
  // Binary data (encrypted)
  blobs: {
    "sha256:abc123...": "base64_encrypted_content",
    "sha256:def456...": "base64_encrypted_thumbnail",
    // ... all media files
  }
}
```

#### Backup Process
```javascript
async function backupVault(vaultId, options = {}) {
  // 1. Verify vault access
  await ensureVaultUnlocked(vaultId);
  
  // 2. Export vault metadata
  const vaultMetadata = await getVaultMetadata(vaultId);
  
  // 3. Export all memories and capsules
  const memories = await exportVaultMemories(vaultId);
  const capsules = await exportVaultCapsules(vaultId);
  
  // 4. Export attachments metadata
  const attachments = await exportVaultAttachments(vaultId);
  
  // 5. Export binary blobs (encrypted)
  const blobs = await exportVaultBlobs(vaultId, attachments);
  
  // 6. Create backup package
  const backup = {
    manifest: {
      version: "1.0.0",
      created: new Date().toISOString(),
      vault_id: vaultId,
      vault_name: vaultMetadata.name,
      total_memories: memories.length,
      total_attachments: attachments.length,
      backup_size_bytes: calculateBackupSize(memories, attachments, blobs)
    },
    vault: {
      metadata: vaultMetadata,
      memories,
      capsules,
      attachments,
      settings: await exportVaultSettings(vaultId),
      analytics: await exportVaultAnalytics(vaultId)
    },
    blobs
  };
  
  // 7. Compress and optionally encrypt backup
  const compressed = await compressBackup(backup);
  
  return compressed;
}
```

#### Restore Process  
```javascript
async function restoreVault(backupData, newPassphrase) {
  // 1. Validate backup integrity
  await validateBackup(backupData);
  
  // 2. Generate new vault ID (or use original if not exists)
  const vaultId = backupData.manifest.vault_id;
  
  // 3. Create vault structure
  await createVault(newPassphrase, backupData.vault.metadata);
  
  // 4. Restore memories and capsules
  await restoreVaultMemories(vaultId, backupData.vault.memories);
  await restoreVaultCapsules(vaultId, backupData.vault.capsules);
  
  // 5. Restore attachments and blobs
  await restoreVaultAttachments(vaultId, backupData.vault.attachments);
  await restoreVaultBlobs(vaultId, backupData.blobs);
  
  // 6. Restore settings and analytics
  await restoreVaultSettings(vaultId, backupData.vault.settings);
  await restoreVaultAnalytics(vaultId, backupData.vault.analytics);
  
  // 7. Verify restoration
  await verifyVaultIntegrity(vaultId);
  
  return vaultId;
}
```

## Implementation Strategy

### Phase 1: Database Migration
1. Create vault-aware database layer
2. Migrate existing memories to vault structure
3. Unify MTAP and Vault storage APIs

### Phase 2: File Organization
1. Implement vault directory structure
2. Create attachment file management
3. Add vault metadata management

### Phase 3: Backup/Restore
1. Implement backup export system
2. Create restore functionality  
3. Add integrity verification

### Phase 4: Multi-Vault Support
1. Vault switching in UI
2. Cross-vault search
3. Vault sharing/import features

## Benefits
1. **Complete Backup**: All vault data in organized structure
2. **Portability**: Vaults can be moved between devices
3. **Security**: Per-vault encryption and isolation
4. **Scalability**: Multiple vaults per user
5. **Recovery**: Granular restore capabilities
6. **Compliance**: MTAP protocol maintained throughout

