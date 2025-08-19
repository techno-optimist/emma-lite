/**
 * Basic HML Implementation Test
 * Simple validation of core HML functionality
 */

// Import Node.js modules for crypto
import { webcrypto } from 'crypto';
import { TextEncoder, TextDecoder } from 'util';

// Setup global crypto for Node.js
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}
if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Import our HML modules
import { HMLCanonicalizer } from './lib/hml-canonicalizer.js';
import { HMLCapsule } from './lib/hml-capsule.js';

async function testCanonicalizer() {
  console.log('🧪 Testing HML Canonicalization...');
  
  try {
    // Test basic canonicalization
    const testData = {
      "b": 2,
      "a": 1,
      "nested": {
        "z": 3,
        "y": 2
      }
    };
    
    const canonical = HMLCanonicalizer.canonicalize(testData);
    const expected = '{"a":1,"b":2,"nested":{"y":2,"z":3}}';
    
    if (canonical === expected) {
      console.log('✅ Basic canonicalization: PASSED');
    } else {
      console.log('❌ Basic canonicalization: FAILED');
      console.log('Expected:', expected);
      console.log('Actual:  ', canonical);
    }
    
    // Test content hash
    const hash = await HMLCanonicalizer.calculateContentHash(testData);
    if (hash && hash.startsWith('sha256:')) {
      console.log('✅ Content hash generation: PASSED');
      console.log('Hash:', hash);
    } else {
      console.log('❌ Content hash generation: FAILED');
    }
    
  } catch (error) {
    console.log('❌ Canonicalization test error:', error.message);
  }
}

async function testCapsule() {
  console.log('\n🧪 Testing HML Capsule Creation...');
  
  try {
    const content = "Test content for HML validation";
    const metadata = {
      labels: {
        sensitivity: 'personal',
        retention: '30d',
        sharing: 'none'
      }
    };
    
    const capsule = await HMLCapsule.create(content, metadata);
    
    // Validate structure
    if (capsule && capsule.capsule && capsule.capsule.id) {
      console.log('✅ Capsule creation: PASSED');
      console.log('Capsule ID:', capsule.capsule.id);
      console.log('Schema:', capsule.$schema);
      console.log('Version:', capsule.version);
    } else {
      console.log('❌ Capsule creation: FAILED');
      console.log('Result:', capsule);
    }
    
    // Validate URN format
    if (capsule.capsule.id.match(/^urn:hml:capsule:sha256:[a-f0-9]{64}$/)) {
      console.log('✅ URN format: PASSED');
    } else {
      console.log('❌ URN format: FAILED');
      console.log('ID:', capsule.capsule.id);
    }
    
    // Validate labels
    const labels = capsule.capsule.labels;
    if (['personal', 'medical', 'financial', 'public'].includes(labels.sensitivity) &&
        ['7d', '30d', '1y', 'permanent'].includes(labels.retention) &&
        ['none', 'trusted', 'medical', 'public'].includes(labels.sharing)) {
      console.log('✅ Labels validation: PASSED');
    } else {
      console.log('❌ Labels validation: FAILED');
      console.log('Labels:', labels);
    }
    
  } catch (error) {
    console.log('❌ Capsule test error:', error.message);
    console.error(error);
  }
}

async function main() {
  console.log('🚀 Emma Lite HML Implementation Test\n');
  
  await testCanonicalizer();
  await testCapsule();
  
  console.log('\n✅ Basic HML validation completed');
}

// Run if called directly
main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
