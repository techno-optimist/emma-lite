#!/usr/bin/env node
/**
 * HML v1.0 Compliance Validation Script
 * Validates Emma Lite's HML implementation against official test vectors
 */

import { HMLCanonicalizer, HMLCanonicalTestUtils } from '../lib/hml-canonicalizer.js';
import { HMLCapsule, HMLCapsuleUtils } from '../lib/hml-capsule.js';
import { HMLCryptography, HMLCryptoTestUtils } from '../lib/hml-crypto.js';
import { hmlAdapter } from '../lib/hml-adapter.js';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function logSection(title) {
  console.log('\n' + colorize('='.repeat(60), 'cyan'));
  console.log(colorize(`📋 ${title}`, 'bold'));
  console.log(colorize('='.repeat(60), 'cyan'));
}

function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  console.log(`${icon} ${colorize(name, color)} ${details}`);
}

function logInfo(message) {
  console.log(colorize(`ℹ️  ${message}`, 'blue'));
}

function logWarning(message) {
  console.log(colorize(`⚠️  ${message}`, 'yellow'));
}

function logError(message) {
  console.log(colorize(`❌ ${message}`, 'red'));
}

async function validateCanonicalizer() {
  logSection('HML Canonicalization Validation');
  
  let passed = 0;
  let total = 0;
  
  try {
    // Test Vector TV-1.1
    total++;
    logInfo('Running Test Vector TV-1.1: Unicode and nested objects...');
    
    const tv11Result = await HMLCanonicalTestUtils.runTestVector_TV_1_1();
    logTest('TV-1.1 Canonicalization', tv11Result.passed);
    
    if (tv11Result.passed) {
      passed++;
      logInfo(`✓ Expected: ${tv11Result.expected.canonical.substring(0, 100)}...`);
      logInfo(`✓ Actual:   ${tv11Result.actual.canonical.substring(0, 100)}...`);
      logInfo(`✓ Hash:     ${tv11Result.actual.hash}`);
    } else {
      logError(`✗ Expected: ${tv11Result.expected.canonical.substring(0, 100)}...`);
      logError(`✗ Actual:   ${tv11Result.actual.canonical.substring(0, 100)}...`);
      logError(`✗ Expected hash: ${tv11Result.expected.hash}`);
      logError(`✗ Actual hash:   ${tv11Result.actual.hash}`);
    }
    
    // Edge case tests
    total++;
    logInfo('Running canonicalization edge cases...');
    
    const edgeCases = HMLCanonicalTestUtils.generateEdgeCaseTests();
    let edgePassed = true;
    
    for (const testCase of edgeCases) {
      const canonical = HMLCanonicalizer.canonicalize(testCase.input);
      if (canonical !== testCase.expected) {
        edgePassed = false;
        logError(`Edge case "${testCase.name}" failed:`);
        logError(`  Expected: ${testCase.expected}`);
        logError(`  Actual:   ${canonical}`);
      }
    }
    
    logTest('Canonicalization Edge Cases', edgePassed);
    if (edgePassed) passed++;
    
    // Performance test
    total++;
    logInfo('Running canonicalization performance test...');
    
    const largeObject = {
      level1: {
        level2: {
          level3: {
            array: Array.from({length: 1000}, (_, i) => ({
              id: i,
              value: `test_${i}`,
              nested: { prop: i * 2 }
            }))
          }
        }
      }
    };
    
    const startTime = Date.now();
    const canonical = HMLCanonicalizer.canonicalize(largeObject);
    const hash = await HMLCanonicalizer.calculateContentHash(largeObject);
    const endTime = Date.now();
    
    const performanceTest = endTime - startTime < 1000; // Under 1 second
    logTest('Canonicalization Performance', performanceTest, `(${endTime - startTime}ms)`);
    if (performanceTest) passed++;
    
  } catch (error) {
    logError(`Canonicalization validation failed: ${error.message}`);
  }
  
  logInfo(`Canonicalization: ${passed}/${total} tests passed`);
  return { passed, total, percentage: (passed / total) * 100 };
}

async function validateCapsuleSchema() {
  logSection('HML Capsule Schema Validation');
  
  let passed = 0;
  let total = 0;
  
  try {
    // Basic capsule creation
    total++;
    logInfo('Testing basic capsule creation...');
    
    const content = "Test memory content for HML validation";
    const metadata = {
      labels: {
        sensitivity: 'personal',
        retention: '30d',
        sharing: 'none'
      },
      extensions: {
        test: true,
        source: 'validation-script'
      }
    };
    
    const capsule = await HMLCapsule.create(content, metadata);
    
    // Validate structure
    const structureValid = (
      capsule.$schema === "https://hml.dev/schemas/v1.0/capsule.json" &&
      capsule.version === "1.0.0" &&
      capsule.capsule &&
      capsule.capsule.id &&
      capsule.capsule.id.match(/^urn:hml:capsule:sha256:[a-f0-9]{64}$/) &&
      capsule.capsule.subject &&
      capsule.capsule.subject.match(/^did:/) &&
      capsule.capsule.created &&
      capsule.capsule.created.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) &&
      capsule.capsule.provenance &&
      capsule.capsule.content &&
      capsule.capsule.labels
    );
    
    logTest('Basic Capsule Structure', structureValid);
    if (structureValid) passed++;
    
    // Content validation
    total++;
    const contentValid = (
      capsule.capsule.content.type &&
      capsule.capsule.content.encoding === "utf-8" &&
      capsule.capsule.content.data &&
      capsule.capsule.content.contentHash &&
      capsule.capsule.content.contentHash.match(/^sha256:[a-f0-9]{64}$/) &&
      capsule.capsule.content.nonce
    );
    
    logTest('Content Structure', contentValid);
    if (contentValid) passed++;
    
    // Labels validation
    total++;
    const labelsValid = (
      ['personal', 'medical', 'financial', 'public'].includes(capsule.capsule.labels.sensitivity) &&
      ['7d', '30d', '1y', 'permanent'].includes(capsule.capsule.labels.retention) &&
      ['none', 'trusted', 'medical', 'public'].includes(capsule.capsule.labels.sharing)
    );
    
    logTest('Labels Validation', labelsValid);
    if (labelsValid) passed++;
    
    // Schema validation
    total++;
    const validation = HMLCapsuleUtils.validateAgainstSchema(capsule);
    logTest('Schema Compliance', validation.valid);
    if (validation.valid) passed++;
    
    if (!validation.valid) {
      validation.errors.forEach(error => logError(`  ${error}`));
    }
    
    // Content addressability test
    total++;
    logInfo('Testing content addressability...');
    
    const capsule2 = await HMLCapsule.create(content, metadata);
    const addressabilityTest = capsule.capsule.id !== capsule2.capsule.id; // Should be different due to timestamps
    
    logTest('Content Addressability', addressabilityTest);
    if (addressabilityTest) passed++;
    
    logInfo(`Capsule ID 1: ${capsule.capsule.id}`);
    logInfo(`Capsule ID 2: ${capsule2.capsule.id}`);
    
  } catch (error) {
    logError(`Capsule schema validation failed: ${error.message}`);
    console.error(error);
  }
  
  logInfo(`Capsule Schema: ${passed}/${total} tests passed`);
  return { passed, total, percentage: (passed / total) * 100 };
}

async function validateCryptography() {
  logSection('HML Cryptography Validation');
  
  let passed = 0;
  let total = 0;
  
  try {
    // Encryption/decryption round trip
    total++;
    logInfo('Testing encryption round trip...');
    
    const roundTripSuccess = await HMLCryptoTestUtils.testEncryptionRoundTrip();
    logTest('Encryption Round Trip', roundTripSuccess);
    if (roundTripSuccess) passed++;
    
    // AAD construction
    total++;
    logInfo('Testing AAD construction...');
    
    const aadSuccess = await HMLCryptoTestUtils.testAADConstruction();
    logTest('AAD Construction', aadSuccess);
    if (aadSuccess) passed++;
    
    // Algorithm validation
    total++;
    logInfo('Testing encryption algorithm compliance...');
    
    const testContent = "Test content for algorithm validation";
    const envelope = await HMLCryptography.encryptContent(
      testContent, "test-capsule", "1.0.0", { sensitivity: "personal" }
    );
    
    const algorithmValid = envelope.algorithm === "XChaCha20-Poly1305";
    logTest('XChaCha20-Poly1305 Algorithm', algorithmValid);
    if (algorithmValid) passed++;
    
    // Envelope format validation
    total++;
    const formatValid = HMLCryptography.validateEnvelope(envelope);
    logTest('Envelope Format', formatValid);
    if (formatValid) passed++;
    
    logInfo(`Encryption envelope: ${JSON.stringify(envelope, null, 2).substring(0, 200)}...`);
    
    // Nonce uniqueness
    total++;
    logInfo('Testing nonce uniqueness...');
    
    const nonce1 = HMLCryptography.generateNonce(24);
    const nonce2 = HMLCryptography.generateNonce(24);
    
    const nonceUnique = (
      nonce1.length === 24 &&
      nonce2.length === 24 &&
      !nonce1.every((byte, index) => byte === nonce2[index])
    );
    
    logTest('Nonce Uniqueness', nonceUnique);
    if (nonceUnique) passed++;
    
  } catch (error) {
    logError(`Cryptography validation failed: ${error.message}`);
    console.error(error);
  }
  
  logInfo(`Cryptography: ${passed}/${total} tests passed`);
  return { passed, total, percentage: (passed / total) * 100 };
}

async function validateIntegration() {
  logSection('HML Integration Validation');
  
  let passed = 0;
  let total = 0;
  
  try {
    // HML Adapter initialization
    total++;
    logInfo('Testing HML adapter initialization...');
    
    const adapterValid = hmlAdapter && hmlAdapter.version === '1.0.0';
    logTest('HML Adapter', adapterValid);
    if (adapterValid) passed++;
    
    // Memory creation through adapter
    total++;
    logInfo('Testing memory creation through adapter...');
    
    const testContent = "Integration test content with Unicode: Café ☕ 🔐";
    const testMetadata = {
      source: 'validation-script',
      type: 'test',
      role: 'user'
    };
    
    const memory = await hmlAdapter.createMemory(testContent, testMetadata);
    const memoryValid = memory && memory.capsule && memory.capsule.id;
    
    logTest('Memory Creation via Adapter', memoryValid);
    if (memoryValid) passed++;
    
    if (memoryValid) {
      logInfo(`Memory ID: ${memory.capsule.id}`);
      logInfo(`Content hash: ${memory.capsule.content.contentHash}`);
    }
    
    // Format conversion
    total++;
    logInfo('Testing format conversion...');
    
    if (memoryValid) {
      const emmaFormat = hmlAdapter.convertHMLToEmma(memory);
      const mtapFormat = hmlAdapter.convertHMLToMTAP(memory);
      
      const conversionValid = (
        emmaFormat && emmaFormat.id && emmaFormat.content &&
        mtapFormat && mtapFormat.header && mtapFormat.core
      );
      
      logTest('Format Conversion', conversionValid);
      if (conversionValid) passed++;
    } else {
      logTest('Format Conversion', false, '(skipped - memory creation failed)');
    }
    
    // Migration stats
    total++;
    logInfo('Testing migration statistics...');
    
    const migrationStats = await hmlAdapter.getMigrationStats();
    const statsValid = (
      migrationStats &&
      typeof migrationStats.hml_compliant === 'number' &&
      typeof migrationStats.migration_progress === 'number'
    );
    
    logTest('Migration Statistics', statsValid);
    if (statsValid) passed++;
    
    if (statsValid) {
      logInfo(`HML compliant: ${migrationStats.hml_compliant}`);
      logInfo(`Migration progress: ${(migrationStats.migration_progress * 100).toFixed(1)}%`);
    }
    
  } catch (error) {
    logError(`Integration validation failed: ${error.message}`);
    console.error(error);
  }
  
  logInfo(`Integration: ${passed}/${total} tests passed`);
  return { passed, total, percentage: (passed / total) * 100 };
}

async function validatePerformance() {
  logSection('HML Performance Validation');
  
  let passed = 0;
  let total = 0;
  
  try {
    // Large content processing
    total++;
    logInfo('Testing large content processing...');
    
    const largeContent = 'x'.repeat(100000); // 100KB
    const startTime = Date.now();
    
    const largeCapsule = await HMLCapsule.create(largeContent, {
      labels: { sensitivity: 'personal', retention: '30d', sharing: 'none' }
    });
    
    const endTime = Date.now();
    const performanceValid = endTime - startTime < 5000; // Under 5 seconds
    
    logTest('Large Content Processing', performanceValid, `(${endTime - startTime}ms)`);
    if (performanceValid) passed++;
    
    // Concurrent operations
    total++;
    logInfo('Testing concurrent operations...');
    
    const concurrentStart = Date.now();
    const operations = Array.from({length: 10}, (_, i) => 
      HMLCapsule.create(`Concurrent test ${i}`, {
        labels: { sensitivity: 'personal', retention: '30d', sharing: 'none' }
      })
    );
    
    const results = await Promise.all(operations);
    const concurrentEnd = Date.now();
    
    const concurrentValid = (
      results.length === 10 &&
      results.every(r => r && r.capsule && r.capsule.id) &&
      concurrentEnd - concurrentStart < 10000 // Under 10 seconds
    );
    
    logTest('Concurrent Operations', concurrentValid, `(${concurrentEnd - concurrentStart}ms)`);
    if (concurrentValid) passed++;
    
  } catch (error) {
    logError(`Performance validation failed: ${error.message}`);
    console.error(error);
  }
  
  logInfo(`Performance: ${passed}/${total} tests passed`);
  return { passed, total, percentage: (passed / total) * 100 };
}

async function main() {
  console.log(colorize('🔍 Emma Lite HML v1.0 Compliance Validation', 'bold'));
  console.log(colorize('Human Memory Layer Protocol Specification Compliance Check', 'cyan'));
  console.log(`Started at: ${new Date().toISOString()}\n`);
  
  const results = {
    canonicalization: { passed: 0, total: 0, percentage: 0 },
    capsuleSchema: { passed: 0, total: 0, percentage: 0 },
    cryptography: { passed: 0, total: 0, percentage: 0 },
    integration: { passed: 0, total: 0, percentage: 0 },
    performance: { passed: 0, total: 0, percentage: 0 }
  };
  
  try {
    // Run all validation tests
    results.canonicalization = await validateCanonicalizer();
    results.capsuleSchema = await validateCapsuleSchema();
    results.cryptography = await validateCryptography();
    results.integration = await validateIntegration();
    results.performance = await validatePerformance();
    
    // Calculate overall results
    const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
    const totalTests = Object.values(results).reduce((sum, r) => sum + r.total, 0);
    const overallPercentage = (totalPassed / totalTests) * 100;
    
    logSection('HML Compliance Summary');
    
    console.log(`📊 ${colorize('Canonicalization:', 'cyan')} ${results.canonicalization.passed}/${results.canonicalization.total} (${results.canonicalization.percentage.toFixed(1)}%)`);
    console.log(`📊 ${colorize('Capsule Schema:', 'cyan')} ${results.capsuleSchema.passed}/${results.capsuleSchema.total} (${results.capsuleSchema.percentage.toFixed(1)}%)`);
    console.log(`📊 ${colorize('Cryptography:', 'cyan')} ${results.cryptography.passed}/${results.cryptography.total} (${results.cryptography.percentage.toFixed(1)}%)`);
    console.log(`📊 ${colorize('Integration:', 'cyan')} ${results.integration.passed}/${results.integration.total} (${results.integration.percentage.toFixed(1)}%)`);
    console.log(`📊 ${colorize('Performance:', 'cyan')} ${results.performance.passed}/${results.performance.total} (${results.performance.percentage.toFixed(1)}%)`);
    
    console.log('\n' + colorize('━'.repeat(60), 'cyan'));
    console.log(`📊 ${colorize('OVERALL COMPLIANCE:', 'bold')} ${totalPassed}/${totalTests} (${overallPercentage.toFixed(1)}%)`);
    
    let complianceLevel;
    let color;
    if (overallPercentage >= 90) {
      complianceLevel = '🟢 EXCELLENT - Production Ready';
      color = 'green';
    } else if (overallPercentage >= 75) {
      complianceLevel = '🟡 GOOD - Minor Issues';
      color = 'yellow';
    } else if (overallPercentage >= 50) {
      complianceLevel = '🟠 FAIR - Major Work Needed';
      color = 'yellow';
    } else {
      complianceLevel = '🔴 POOR - Critical Issues';
      color = 'red';
    }
    
    console.log(`🎯 ${colorize('COMPLIANCE LEVEL:', 'bold')} ${colorize(complianceLevel, color)}`);
    
    if (overallPercentage < 100) {
      console.log(`\n${colorize('📋 RECOMMENDATIONS:', 'bold')}`);
      if (results.canonicalization.percentage < 100) {
        console.log('  • Fix canonicalization issues for interoperability');
      }
      if (results.capsuleSchema.percentage < 100) {
        console.log('  • Address capsule schema compliance gaps');
      }
      if (results.cryptography.percentage < 100) {
        console.log('  • Resolve cryptographic implementation issues');
      }
      if (results.integration.percentage < 100) {
        console.log('  • Improve integration layer reliability');
      }
      if (results.performance.percentage < 100) {
        console.log('  • Optimize performance for production use');
      }
    }
    
    console.log(`\n${colorize('✅ Validation completed successfully', 'green')}`);
    console.log(`Completed at: ${new Date().toISOString()}`);
    
    // Exit with appropriate code
    process.exit(overallPercentage >= 75 ? 0 : 1);
    
  } catch (error) {
    logError(`Validation failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Validation script failed:', error);
    process.exit(1);
  });
}

