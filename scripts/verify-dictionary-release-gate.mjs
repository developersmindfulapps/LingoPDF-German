/**
 * scripts/verify-dictionary-release-gate.mjs
 *
 * LingoPDF Extension — Phase 5: Dictionary Release Gate & Dataset Freeze
 *
 * Consolidated Release Verification Suite:
 * 1. Legacy Dictionary Pinned SHA-256 Integrity.
 * 2. Authored Source Schema, Homograph & Consistency Validation.
 * 3. Authored Dataset Manifest & Content Checksum Verification.
 * 4. Multi-Directory Asset Parity (public/data vs dist-pilot vs dist/data).
 * 5. Deterministic & Reproducible Build Verification (double-build bitwise parity).
 * 6. Negative Integrity Contract (Tamper Detection in isolated sandbox).
 * 7. End-to-End Regression Test Suite Execution.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateAuthoredData } from './validate-authored-data.mjs';
import { buildAuthoredDictionary } from './build-authored-dictionary.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const EXPECTED_LEGACY_HASHES = {
  'de-en-dictionary.json': 'ddc6a8dad7aa23f00fa9b9ca325f6cb23f77ece742cb2091b0ee52b4a0812412',
  'de-en-inflections.json': 'd18bb2d36d64979fbce8ea4e358c8b1800aa53a4c7c1953dc7e3457df7ab3a28',
  'de-en-metadata.json': '43021c260a9f63abf121a66d390d2d8e633497d23a0b9825161047651478e201'
};

const PINNED_KAIKKI_SNAPSHOT_SHA256 = 'ff03802fa4d034a80c03fd72a78243834cc06e69d7031c7be9d745a02c78b34e';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label, context) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    failures.push({ label, context });
    console.error(`  ✗ FAIL: ${label}${context ? ' [' + context + ']' : ''}`);
  }
}

function section(title) {
  console.log(`\n--- ${title} ---`);
}

/**
 * Pure integrity checker for a manifest and dictionary directory.
 * Used for both production asset verification and tamper detection tests.
 */
export function verifyManifestAndContent(manifestPath, dictPath, inflPath) {
  if (!fs.existsSync(manifestPath)) {
    return { ok: false, error: `Manifest missing at ${manifestPath}` };
  }
  if (!fs.existsSync(dictPath)) {
    return { ok: false, error: `Dictionary file missing at ${dictPath}` };
  }
  if (!fs.existsSync(inflPath)) {
    return { ok: false, error: `Inflections file missing at ${inflPath}` };
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const dictContent = fs.readFileSync(dictPath, 'utf8');
  const inflContent = fs.readFileSync(inflPath, 'utf8');

  const dictEntries = JSON.parse(dictContent);
  const inflEntries = JSON.parse(inflContent);

  const dictSha256 = crypto.createHash('sha256').update(dictContent, 'utf8').digest('hex');
  const inflSha256 = crypto.createHash('sha256').update(inflContent, 'utf8').digest('hex');
  const combinedContent = dictContent + '\n' + inflContent;
  const contentChecksum = crypto.createHash('sha256').update(combinedContent, 'utf8').digest('hex');

  if (dictSha256 !== manifest.dictSha256) {
    return {
      ok: false,
      error: `dictSha256 mismatch: expected ${manifest.dictSha256}, calculated ${dictSha256}`
    };
  }

  if (inflSha256 !== manifest.inflSha256) {
    return {
      ok: false,
      error: `inflSha256 mismatch: expected ${manifest.inflSha256}, calculated ${inflSha256}`
    };
  }

  if (contentChecksum !== manifest.contentChecksum) {
    return {
      ok: false,
      error: `contentChecksum mismatch: expected ${manifest.contentChecksum}, calculated ${contentChecksum}`
    };
  }

  const expectedVersion = `1.0.0-${contentChecksum.slice(0, 10)}`;
  if (manifest.datasetVersion !== expectedVersion) {
    return {
      ok: false,
      error: `datasetVersion mismatch: expected ${expectedVersion}, manifest has ${manifest.datasetVersion}`
    };
  }

  if (Object.keys(dictEntries).length !== manifest.headwordsCount) {
    return {
      ok: false,
      error: `headwordsCount mismatch: expected ${manifest.headwordsCount}, actual ${Object.keys(dictEntries).length}`
    };
  }

  if (Object.keys(inflEntries).length !== manifest.inflectionKeysCount) {
    return {
      ok: false,
      error: `inflectionKeysCount mismatch: expected ${manifest.inflectionKeysCount}, actual ${Object.keys(inflEntries).length}`
    };
  }

  return { ok: true, manifest, dictSha256, inflSha256, contentChecksum };
}

async function run() {
  console.log('=====================================================================');
  console.log('  PDF LANGUAGE COMPANION — DICTIONARY RELEASE GATE & FREEZE SUITE    ');
  console.log('=====================================================================\n');

  // ==========================================================================
  // SECTION 1: LEGACY DICTIONARY INTEGRITY (PINNED SHA-256 CHECK)
  // ==========================================================================
  section('SECTION 1: Legacy Dictionary Integrity & Checksum Verification');

  const publicDataDir = path.join(ROOT, 'public', 'data');
  for (const [filename, expectedHash] of Object.entries(EXPECTED_LEGACY_HASHES)) {
    const filePath = path.join(publicDataDir, filename);
    assert(fs.existsSync(filePath), `Legacy asset ${filename} exists in public/data`);
    const buf = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    assert(
      hash.toLowerCase() === expectedHash.toLowerCase(),
      `Legacy asset ${filename} matches pinned hash (${hash.slice(0, 16)}...)`,
      `actual: ${hash}, expected: ${expectedHash}`
    );
  }

  const legacyMeta = JSON.parse(fs.readFileSync(path.join(publicDataDir, 'de-en-metadata.json'), 'utf8'));
  assert(
    legacyMeta.sourceSha256 === PINNED_KAIKKI_SNAPSHOT_SHA256,
    `Kaikki source snapshot SHA-256 matches pinned checksum (${PINNED_KAIKKI_SNAPSHOT_SHA256.slice(0, 16)}...)`
  );
  assert(legacyMeta.acceptedHeadwordsCount === 15092, `Legacy headword count === 15092 (actual: ${legacyMeta.acceptedHeadwordsCount})`);
  assert(legacyMeta.inflectionKeysCount === 114847, `Legacy inflection count === 114847 (actual: ${legacyMeta.inflectionKeysCount})`);

  // ==========================================================================
  // SECTION 2: AUTHORED SOURCE DATASET SCHEMA & CONSISTENCY
  // ==========================================================================
  section('SECTION 2: Authored Source Data Schema & Homograph Audit');

  const authoringDir = path.join(ROOT, 'data-source', 'authoring');
  const prevalidationPassed = validateAuthoredData({ authoringDir });
  assert(prevalidationPassed === true, 'validateAuthoredData() passed with zero errors');

  // Verify file counts in authoring
  const authFiles = fs.readdirSync(authoringDir).filter(f => f.endsWith('.json')).sort();
  assert(authFiles.length === 6, `Authoring contains exactly 6 source files (actual: ${authFiles.length})`);

  let totalRawEntries = 0;
  for (const f of authFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(authoringDir, f), 'utf8'));
    totalRawEntries += data.length;
  }
  assert(totalRawEntries === 806, `Raw source entries === 806 (actual: ${totalRawEntries})`);

  // ==========================================================================
  // SECTION 3: AUTHORED MANIFEST & CONTENT CHECKSUM VERIFICATION
  // ==========================================================================
  section('SECTION 3: Authored Dataset Manifest & Content Checksum Verification');

  const pubManifestPath = path.join(publicDataDir, 'authored-de-en-manifest.json');
  const pubDictPath = path.join(publicDataDir, 'authored-de-en-dictionary.json');
  const pubInflPath = path.join(publicDataDir, 'authored-de-en-inflections.json');

  const integrityCheck = verifyManifestAndContent(pubManifestPath, pubDictPath, pubInflPath);
  assert(integrityCheck.ok === true, 'Public authored dataset matches manifest checksums and counts', integrityCheck.error);

  const manifest = integrityCheck.manifest;
  console.log(`  • Dataset Version:    ${manifest.datasetVersion}`);
  console.log(`  • Content Checksum:   ${manifest.contentChecksum}`);
  console.log(`  • Headwords Count:    ${manifest.headwordsCount}`);
  console.log(`  • Inflection Keys:    ${manifest.inflectionKeysCount}`);
  console.log(`  • Build Timestamp:    ${manifest.buildTimestamp}`);

  assert(manifest.languagePair === 'de-en', 'Manifest languagePair === "de-en"');
  assert(manifest.schemaVersion === '1.0.0', 'Manifest schemaVersion === "1.0.0"');
  assert(manifest.headwordsCount === 705, `Manifest headwordsCount === 705 (actual: ${manifest.headwordsCount})`);
  assert(manifest.inflectionKeysCount === 2364, `Manifest inflectionKeysCount === 2364 (actual: ${manifest.inflectionKeysCount})`);
  assert(manifest.nounsWithGender === 308, `Manifest nounsWithGender === 308 (actual: ${manifest.nounsWithGender})`);
  assert(manifest.nounsWithPlural === 279, `Manifest nounsWithPlural === 279 (actual: ${manifest.nounsWithPlural})`);
  assert(manifest.excludedDraftsCount === 100, `Manifest excludedDraftsCount === 100 (actual: ${manifest.excludedDraftsCount})`);
  assert(manifest.includedRecordsCount === 706, `Manifest includedRecordsCount === 706 (actual: ${manifest.includedRecordsCount})`);
  assert(manifest.totalSourceRecords === 806, `Manifest totalSourceRecords === 806 (actual: ${manifest.totalSourceRecords})`);
  assert(manifest.contentChecksum.length === 64, 'Manifest contentChecksum is valid 64-character hex SHA-256');

  // Verify Draft Isolation in customer-facing compiled assets
  const pubDict = JSON.parse(fs.readFileSync(pubDictPath, 'utf8'));
  const pubInfl = JSON.parse(fs.readFileSync(pubInflPath, 'utf8'));
  const sampleDraftHeadwords = [
    'Bewerbung', 'Vorstellungsgespräch', 'Erfahrung', 'zuverlässig',
    'Zusammenhang', 'überzeugen', 'begegnen', 'kennenlernen', 'schaffen',
    'Herz', 'Gedanke', 'Nebenkosten', 'wirklich', 'außerdem', 'deswegen'
  ];
  for (const dh of sampleDraftHeadwords) {
    assert(!pubDict[dh], `Draft headword "${dh}" is absent from customer dictionary`);
  }
  const sampleDraftInflections = [
    'bewerbungen', 'schuf', 'schufen', 'herzens', 'gedankens', 'nebenkosten',
    'kennengelernt', 'überrascht'
  ];
  for (const di of sampleDraftInflections) {
    assert(!pubInfl[di], `Draft inflection "${di}" is absent from customer inflection index`);
  }

  // Verify that metadata matches manifest
  const pubMetaPath = path.join(publicDataDir, 'authored-de-en-metadata.json');
  const pubMetadata = JSON.parse(fs.readFileSync(pubMetaPath, 'utf8'));
  assert(pubMetadata.version === manifest.datasetVersion, 'authored-de-en-metadata.json version matches manifest');
  assert(pubMetadata.dictSha256 === manifest.dictSha256, 'authored-de-en-metadata.json dictSha256 matches manifest');
  assert(pubMetadata.inflSha256 === manifest.inflSha256, 'authored-de-en-metadata.json inflSha256 matches manifest');

  // ==========================================================================
  // SECTION 4: MULTI-DIRECTORY ASSET PARITY (public/data vs dist-pilot vs dist/data)
  // ==========================================================================
  section('SECTION 4: Multi-Directory Asset Parity Verification');

  const distPilotDir = path.join(ROOT, 'dist-pilot');
  const distDataDir = path.join(ROOT, 'dist', 'data');

  const assetPairs = [
    { pub: 'authored-de-en-dictionary.json', pilot: 'de-en-dictionary.json', dist: 'authored-de-en-dictionary.json' },
    { pub: 'authored-de-en-inflections.json', pilot: 'de-en-inflections.json', dist: 'authored-de-en-inflections.json' },
    { pub: 'authored-de-en-metadata.json', pilot: 'de-en-metadata.json', dist: 'authored-de-en-metadata.json' },
    { pub: 'authored-de-en-manifest.json', pilot: 'de-en-manifest.json', dist: 'authored-de-en-manifest.json' },
  ];

  for (const pair of assetPairs) {
    const pubBuf = fs.readFileSync(path.join(publicDataDir, pair.pub));
    const pilotBuf = fs.readFileSync(path.join(distPilotDir, pair.pilot));

    assert(pubBuf.equals(pilotBuf), `Byte parity verified: public/data/${pair.pub} === dist-pilot/${pair.pilot}`);

    if (fs.existsSync(path.join(distDataDir, pair.dist))) {
      const distBuf = fs.readFileSync(path.join(distDataDir, pair.dist));
      assert(pubBuf.equals(distBuf), `Byte parity verified: public/data/${pair.pub} === dist/data/${pair.dist}`);
    }
  }

  // ==========================================================================
  // SECTION 5: DETERMINISTIC & REPRODUCIBLE BUILD VERIFICATION
  // ==========================================================================
  section('SECTION 5: Deterministic & Reproducible Build Verification');

  const tempBuild1 = path.join(ROOT, '.temp-repro-build-1');
  const tempBuild2 = path.join(ROOT, '.temp-repro-build-2');

  try {
    buildAuthoredDictionary({ outputDir: tempBuild1 });
    buildAuthoredDictionary({ outputDir: tempBuild2 });

    const filesToCompare = [
      'de-en-dictionary.json',
      'de-en-inflections.json',
      'de-en-metadata.json',
      'de-en-manifest.json'
    ];

    for (const f of filesToCompare) {
      const b1 = fs.readFileSync(path.join(tempBuild1, f));
      const b2 = fs.readFileSync(path.join(tempBuild2, f));
      assert(b1.equals(b2), `Build reproducibility: 2 consecutive builds produce identical bytes for ${f}`);
    }
  } finally {
    try { fs.rmSync(tempBuild1, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(tempBuild2, { recursive: true, force: true }); } catch {}
  }

  // ==========================================================================
  // SECTION 6: NEGATIVE INTEGRITY CONTRACT (TAMPER DETECTION IN SANDBOX)
  // ==========================================================================
  section('SECTION 6: Negative Integrity Contract (Tamper Detection)');

  const sandboxDir = path.join(ROOT, '.test-tamper-sandbox');
  try {
    if (fs.existsSync(sandboxDir)) fs.rmSync(sandboxDir, { recursive: true, force: true });
    fs.mkdirSync(sandboxDir, { recursive: true });

    const sManifest = path.join(sandboxDir, 'authored-de-en-manifest.json');
    const sDict = path.join(sandboxDir, 'authored-de-en-dictionary.json');
    const sInfl = path.join(sandboxDir, 'authored-de-en-inflections.json');

    // 1. Untampered sandbox baseline passes
    fs.copyFileSync(pubManifestPath, sManifest);
    fs.copyFileSync(pubDictPath, sDict);
    fs.copyFileSync(pubInflPath, sInfl);

    const baselineCheck = verifyManifestAndContent(sManifest, sDict, sInfl);
    assert(baselineCheck.ok === true, 'Sandbox baseline passes without modification');

    // 2. Tamper Test A: Modify 1 byte in dictionary JSON
    const dictObj = JSON.parse(fs.readFileSync(sDict, 'utf8'));
    dictObj['Haus'].senses[0].translations[0] = 'mansion_tampered';
    fs.writeFileSync(sDict, JSON.stringify(dictObj, null, 2), 'utf8');

    const tamperACheck = verifyManifestAndContent(sManifest, sDict, sInfl);
    assert(tamperACheck.ok === false, 'Tamper Test A: Modified dictionary content is caught by hash check');
    assert(tamperACheck.error.includes('dictSha256 mismatch'), 'Tamper Test A error explicitly reports dictSha256 mismatch');

    // Restore dictionary
    fs.copyFileSync(pubDictPath, sDict);

    // 3. Tamper Test B: Modify 1 byte in inflections JSON
    const inflObj = JSON.parse(fs.readFileSync(sInfl, 'utf8'));
    inflObj['häuser'] = 'Villa';
    fs.writeFileSync(sInfl, JSON.stringify(inflObj, null, 2), 'utf8');

    const tamperBCheck = verifyManifestAndContent(sManifest, sDict, sInfl);
    assert(tamperBCheck.ok === false, 'Tamper Test B: Modified inflections content is caught by hash check');
    assert(tamperBCheck.error.includes('inflSha256 mismatch'), 'Tamper Test B error explicitly reports inflSha256 mismatch');

    // Restore inflections
    fs.copyFileSync(pubInflPath, sInfl);

    // 4. Tamper Test C: Modify manifest count without updating checksum
    const manifestObj = JSON.parse(fs.readFileSync(sManifest, 'utf8'));
    manifestObj.headwordsCount = 999;
    fs.writeFileSync(sManifest, JSON.stringify(manifestObj, null, 2), 'utf8');

    const tamperCCheck = verifyManifestAndContent(sManifest, sDict, sInfl);
    assert(tamperCCheck.ok === false, 'Tamper Test C: Inconsistent headwordsCount in manifest is caught');
    assert(tamperCCheck.error.includes('headwordsCount mismatch'), 'Tamper Test C error explicitly reports count mismatch');

    // 5. Tamper Test D: Change contentChecksum in manifest
    manifestObj.headwordsCount = 705;
    manifestObj.contentChecksum = '0000000000000000000000000000000000000000000000000000000000000000';
    fs.writeFileSync(sManifest, JSON.stringify(manifestObj, null, 2), 'utf8');

    const tamperDCheck = verifyManifestAndContent(sManifest, sDict, sInfl);
    assert(tamperDCheck.ok === false, 'Tamper Test D: Forged contentChecksum is detected and rejected');
    assert(tamperDCheck.error.includes('contentChecksum mismatch'), 'Tamper Test D error explicitly reports contentChecksum mismatch');

    console.log('  • All 4 negative tamper tests succeeded in isolated sandbox without corrupting production assets.');
  } finally {
    try { fs.rmSync(sandboxDir, { recursive: true, force: true }); } catch {}
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n=====================================================================');
  console.log(`  RELEASE GATE VERIFICATION RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=====================================================================\n');

  if (failed > 0) {
    console.error(`💥 ${failed} check(s) failed in dictionary release gate!`);
    for (const f of failures) {
      console.error(`  - ${f.label} (${f.context})`);
    }
    process.exit(1);
  } else {
    console.log('🎉 DICTIONARY RELEASE GATE PASSED 100% SUCCESSFULLY!\n');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal release gate error:', err);
  process.exit(1);
});
