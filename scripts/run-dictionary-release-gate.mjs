/**
 * scripts/run-dictionary-release-gate.mjs
 *
 * Consolidated Dictionary Release Gate Runner for LingoPDF Extension.
 *
 * Orchestrates the full release verification pipeline in sequence:
 * 1. Release Gate & Freeze Suite (schema, hashes, manifest, parity, repro, tamper tests).
 * 2. Morphological Compatibility & Safety Suite (Stage 4 guard, 13 suffixes).
 * 3. Translation Quality & Homograph Suite (audits, independent test set).
 * 4. Compounds & Domain Vocabulary Suite (compounds, multi-genre benchmark).
 * 5. Composite Dual-Provider Suite (precedence, error discrimination, fallbacks).
 * 6. Integration Seam Suite (hook contract, offline invariants).
 * 7. Legacy Dictionary Pinned Integrity Suite.
 * 8. Real-World PDF Browser Acceptance Suite (CDP headless Chrome).
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SUITES = [
  { name: 'Release Gate & Dataset Freeze (Integrity & Manifest)', script: 'scripts/verify-dictionary-release-gate.mjs' },
  { name: 'Morphological Compatibility & Safety Audit', script: 'scripts/verify-phase3-3-morphological-compatibility.mjs' },
  { name: 'Translation Quality & Homograph Audit', script: 'scripts/verify-phase3-1-quality-audit.mjs' },
  { name: 'Compounds & Domain Vocabulary Suite', script: 'scripts/verify-phase3-compounds-domain.mjs' },
  { name: 'Composite Provider & Precedence Suite', script: 'scripts/test-composite-provider.mjs' },
  { name: 'Integration Seam & Hook Verification', script: 'scripts/verify-phase7-integration.mjs' },
  { name: 'Legacy Kaikki Pinned Dictionary Verification', script: 'scripts/verify-dictionary.mjs' },
  { name: 'Real-World PDF Browser Acceptance (Chrome CDP)', script: 'scripts/verify-phase4-pdf-acceptance.mjs' }
];

console.log('=====================================================================');
console.log('  LINGO PDF — CONSOLIDATED DICTIONARY RELEASE GATE EXECUTION         ');
console.log('=====================================================================\n');

let totalSuitesPassed = 0;
const startTime = Date.now();

for (let i = 0; i < SUITES.length; i++) {
  const suite = SUITES[i];
  console.log(`[Suite ${i + 1}/${SUITES.length}] Executing: ${suite.name}...`);

  const result = spawnSync('node', [path.join(ROOT, suite.script)], {
    stdio: 'inherit',
    cwd: ROOT,
    env: process.env
  });

  if (result.status !== 0) {
    console.error(`\n💥 RELEASE GATE REJECTED: Suite "${suite.name}" exited with code ${result.status}`);
    process.exit(result.status || 1);
  }

  totalSuitesPassed++;
  console.log(`✓ Suite ${i + 1} passed cleanly.\n`);
}

const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
console.log('=====================================================================');
console.log(`🎉 ALL ${totalSuitesPassed}/${SUITES.length} RELEASE GATE SUITES PASSED CLEANLY (${elapsedSec}s)!`);
console.log('   Dictionary dataset is frozen, verified, and approved for release.');
console.log('=====================================================================\n');
process.exit(0);
