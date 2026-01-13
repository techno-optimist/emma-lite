#!/usr/bin/env node
/**
 * Generate sample .emma vault fixtures for native interoperability tests.
 * Produces two files in docs/fixtures:
 *  - vault-100k.emma (iterations=100_000)
 *  - vault-310k.emma (iterations=310_000)
 * along with a metadata JSON describing salt/iv lengths and SHA-256 hashes.
 */
const { randomBytes, pbkdf2Sync, createCipheriv, createHash } = require('crypto');
const { mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const OUTPUT_DIR = join(__dirname, '..', 'docs', 'fixtures');
const MAGIC = Buffer.from('EMMA', 'ascii');
const SALT_LEN = 32;
const IV_LEN = 12;
const ITERATIONS = [100_000, 310_000];
const PASS = 'emma-native-fixture';

function createVaultPayload(name) {
  return {
    version: '1.0',
    created: new Date().toISOString(),
    name,
    encryption: {
      algorithm: 'AES-GCM',
      keyDerivation: 'PBKDF2',
      iterations: 0,
      salt: null
    },
    content: {
      memories: {},
      people: {},
      media: {},
      relationships: {},
      settings: {}
    },
    stats: {
      memoryCount: 0,
      peopleCount: 0,
      mediaCount: 0,
      totalSize: 0
    }
  };
}

function deriveKey(passphrase, salt, iterations) {
  return pbkdf2Sync(Buffer.from(passphrase, 'utf8'), salt, iterations, 32, 'sha256');
}

function encryptVault(passphrase, iterations, name) {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = deriveKey(passphrase, salt, iterations);
  const payload = createVaultPayload(name);
  payload.encryption.iterations = iterations;
  payload.encryption.salt = Array.from(salt.values());
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');

  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  const fileBuf = Buffer.concat([MAGIC, salt, iv, ciphertext, tag]);
  return { fileBuf, salt, iv, tag };
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const meta = [];
  ITERATIONS.forEach(iter => {
    const { fileBuf, salt, iv } = encryptVault(PASS, iter, `Fixture Vault ${iter}`);
    const filename = `vault-${iter}.emma`;
    writeFileSync(join(OUTPUT_DIR, filename), fileBuf);
    meta.push({
      filename,
      passphrase: PASS,
      iterations: iter,
      saltHex: salt.toString('hex'),
      ivHex: iv.toString('hex'),
      totalLength: fileBuf.length,
      sha256: sha256(fileBuf)
    });
  });
  writeFileSync(join(OUTPUT_DIR, 'metadata.json'), JSON.stringify(meta, null, 2));
  console.log('Fixtures written to', OUTPUT_DIR);
  console.log(meta);
}

main();
