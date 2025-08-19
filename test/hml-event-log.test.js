import { HMLHybridLogicalClock } from '../lib/hml-hlc.js';
import { HMLEventLog, InMemoryEventStorage } from '../lib/hml-event-log.js';

describe('HML Hybrid Logical Clock', () => {
  it('ticks monotonically and formats correctly', () => {
    const hlc = new HMLHybridLogicalClock();
    const a = hlc.tick();
    const b = hlc.tick();
    expect(/^0x[0-9A-F]+$/.test(a)).toBe(true);
    expect(/^0x[0-9A-F]+$/.test(b)).toBe(true);
    expect(a).not.toBe(b);
  });

  it('updates against remote clock', () => {
    const local = new HMLHybridLogicalClock();
    const remote = new HMLHybridLogicalClock();
    const r1 = remote.tick();
    const l1 = local.update(r1);
    expect(/^0x[0-9A-F]+$/.test(l1)).toBe(true);
  });
});

describe('HML Event Log & Hash Chain', () => {
  it('creates events and verifies chain', async () => {
    const storage = new InMemoryEventStorage();
    const log = new HMLEventLog(storage);

    const e1 = await log.createEvent('create', 'urn:hml:capsule:sha256:abc', { foo: 1 }, 'did:key:local');
    const e2 = await log.createEvent('update', 'urn:hml:capsule:sha256:abc', { bar: 2 }, 'did:key:local');

    expect(e1.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(e2.previousEvent).toBe(e1.hash);

    const res = await log.verifyChain();
    expect(res.ok).toBe(true);
    expect(res.count).toBe(2);
  });

  it('detects tampering', async () => {
    const storage = new InMemoryEventStorage();
    const log = new HMLEventLog(storage);

    await log.createEvent('create', 'urn:hml:capsule:sha256:abc', { foo: 1 }, 'did:key:local');
    const e2 = await log.createEvent('update', 'urn:hml:capsule:sha256:abc', { bar: 2 }, 'did:key:local');

    // tamper
    e2.payload = '{"bar":3}';

    const res = await log.verifyChain();
    expect(res.ok).toBe(false);
    expect(res.failedAt).toBe(e2.id);
  });
});

