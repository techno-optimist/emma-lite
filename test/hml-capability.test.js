import { HMLCapability, HMLProjection, HMLAgentService } from '../lib/hml-capability.js';
import { HMLCanonicalizer } from '../lib/hml-canonicalizer.js';

const exampleCapsule = {
  $schema: 'https://hml.dev/schemas/v1.0/capsule.json',
  version: '1.0.0',
  capsule: {
    id: 'urn:hml:capsule:sha256:abc',
    subject: 'did:key:subject',
    created: '2025-01-20T10:00:00.000Z',
    modified: '2025-01-20T10:00:00.000Z',
    provenance: { creator: 'did:key:issuer', signature: 'sig', parentEvent: null, eventLog: 'urn:hml:log:sha256:x' },
    content: { type: 'text/plain', encoding: 'utf-8', data: 'cipher', contentHash: 'sha256:dead', nonce: 'n', aad: 'sha256:aad' },
    labels: { sensitivity: 'personal', retention: '30d', sharing: 'none' },
    extensions: { meta: true }
  }
};

describe('HML Capability Tokens & Projection', () => {
  it('creates a capability token with projection and caveats', async () => {
    const projection = { include: ['content', 'created', 'labels.sensitivity'], redact: ['sensitivity'] };
    const projHash = await HMLCanonicalizer.calculateContentHash(HMLCanonicalizer.canonicalize(projection));

    const token = HMLCapability.createToken({
      issuer: 'did:key:issuer',
      subject: 'did:key:agent',
      capsules: ['urn:hml:capsule:sha256:abc'],
      projection,
      caveats: { expiresAt: '2025-12-31T23:59:59Z', purpose: 'audit', maxAccesses: 3, projectionHash: projHash }
    });

    expect(token.token.id).toMatch(/^urn:hml:token:uuid:/);
    expect(token.token.capsules).toContain('urn:hml:capsule:sha256:abc');
    expect(HMLCapability.getCaveat(token, 'projection-hash').value).toBe(projHash);
  });

  it('blocks replay with same nonce', async () => {
    const projection = { include: ['content'] };
    const projHash = await HMLCanonicalizer.calculateContentHash(HMLCanonicalizer.canonicalize(projection));
    const token = HMLCapability.createToken({ issuer: 'did:key:issuer', subject: 'agent', capsules: ['urn:hml:capsule:sha256:abc'], projection, caveats: { projectionHash: projHash, expiresAt: '2099-01-01T00:00:00Z' } });

    const nonce = 'nonce123';
    await expect(HMLCapability.verifyRequest({ token, requestProjection: projection, requestNonce: nonce })).resolves.toBe(true);
    await expect(HMLCapability.verifyRequest({ token, requestProjection: projection, requestNonce: nonce })).rejects.toThrow('ERR_REPLAY_NONCE');
  });

  it('enforces projection binding', async () => {
    const projection = { include: ['content'] };
    const wrongProjection = { include: ['created'] };
    const projHash = await HMLCanonicalizer.calculateContentHash(HMLCanonicalizer.canonicalize(projection));
    const token = HMLCapability.createToken({ issuer: 'did:key:issuer', subject: 'agent', capsules: ['urn:hml:capsule:sha256:abc'], projection, caveats: { projectionHash: projHash, expiresAt: '2099-01-01T00:00:00Z' } });

    const nonce = 'nonce456';
    await expect(HMLCapability.verifyRequest({ token, requestProjection: wrongProjection, requestNonce: nonce })).rejects.toThrow('ERR_PROJECTION_MISMATCH');
  });

  it('agent read applies projection to capsules', async () => {
    const getCapsuleById = async (id) => exampleCapsule;
    const agent = new HMLAgentService({ getCapsuleById });

    const projection = { include: ['content', 'labels'] };
    const projHash = await HMLCanonicalizer.calculateContentHash(HMLCanonicalizer.canonicalize(projection));
    const token = HMLCapability.createToken({ issuer: 'did:key:issuer', subject: 'agent', capsules: [exampleCapsule.capsule.id], projection, caveats: { projectionHash: projHash, expiresAt: '2099-01-01T00:00:00Z' } });

    const res = await agent.agentRead({ token, requestProjection: projection, requestNonce: 'abc' });
    expect(res.data[0].projection.capsule.content).toBeDefined();
    expect(res.data[0].projection.capsule.labels.sensitivity).toBeDefined();
    // Fields not included should be absent
    expect(res.data[0].projection.capsule.created).toBeUndefined();
  });
});
