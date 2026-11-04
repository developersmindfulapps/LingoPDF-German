/**
 * scripts/verify-draft-isolation.mjs
 *
 * LingoPDF Extension — Step 7: Draft Isolation Regression Test Suite
 *
 * Comprehensive Regression Verification:
 * 1. Draft-only headwords absent from customer dictionary.
 * 2. Draft-only inflections absent from customer inflection index.
 * 3. Reviewed/verified entries and inflections remain available with correct senses.
 * 4. Shared headwords: approved sense retained, draft sense excluded.
 * 5. Draft entries remain completely intact in authoring source files.
 * 6. Manifest counts accurately report excluded drafts.
 * 7. Draft preview build cannot overwrite customer assets (safety guard).
 * 8. Composite provider lookup priority & legacy fallback behavior preserved.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildAuthoredDictionary } from './build-authored-dictionary.mjs';
import { LocalDictionaryProvider } from '../src/services/dictionary/LocalDictionaryProvider.ts';
import { CompositeDictionaryProvider } from '../src/services/dictionary/CompositeDictionaryProvider.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

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

function computeFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function run() {
  console.log('=====================================================================');
  console.log('  PDF LANGUAGE COMPANION — DRAFT ISOLATION REGRESSION TEST SUITE     ');
  console.log('=====================================================================\n');

  const publicDataDir = path.join(ROOT, 'public', 'data');
  const distPilotDir = path.join(ROOT, 'dist-pilot');
  const distDataDir = path.join(ROOT, 'dist', 'data');
  const authoringDir = path.join(ROOT, 'data-source', 'authoring');

  // Load compiled customer assets
  const pubDict = JSON.parse(fs.readFileSync(path.join(publicDataDir, 'authored-de-en-dictionary.json'), 'utf8'));
  const pubInfl = JSON.parse(fs.readFileSync(path.join(publicDataDir, 'authored-de-en-inflections.json'), 'utf8'));
  const pubManifest = JSON.parse(fs.readFileSync(path.join(publicDataDir, 'authored-de-en-manifest.json'), 'utf8'));

  // Load authoring files to extract all draft items and approved items
  const authoringFiles = fs.readdirSync(authoringDir).filter(f => f.endsWith('.json')).sort();
  const allDraftEntries = [];
  const allApprovedEntries = [];

  for (const f of authoringFiles) {
    const raw = JSON.parse(fs.readFileSync(path.join(authoringDir, f), 'utf8'));
    for (const item of raw) {
      const status = item.provenance?.reviewStatus;
      if (status === 'draft') {
        allDraftEntries.push(item);
      } else if (status === 'reviewed' || status === 'verified') {
        allApprovedEntries.push(item);
      }
    }
  }

  // Set of approved headwords and approved inflection keys
  const approvedHeadwords = new Set(allApprovedEntries.map(e => e.headword));
  const approvedInflections = new Set();
  for (const item of allApprovedEntries) {
    if (Array.isArray(item.inflections)) {
      for (const inf of item.inflections) {
        approvedInflections.add(inf.toLowerCase());
      }
    }
  }

  // ==========================================================================
  // REGRESSION TEST 1: Draft-only headwords absent from customer dictionary
  // ==========================================================================
  console.log('--- TEST 1: Draft-Only Headwords Absent from Customer Dictionary ---');
  let draftHeadwordLeaks = 0;
  for (const draftItem of allDraftEntries) {
    if (!approvedHeadwords.has(draftItem.headword)) {
      if (pubDict[draftItem.headword]) {
        draftHeadwordLeaks++;
        console.error(`    Leak: Draft headword "${draftItem.headword}" exists in customer dictionary!`);
      }
    }
  }
  assert(draftHeadwordLeaks === 0, `All draft-only headwords are completely absent from customer dictionary (leaks: ${draftHeadwordLeaks})`);

  // Explicit check of 15 key representative words
  const representativeDrafts = [
    'Bewerbung', 'Vorstellungsgespräch', 'Erfahrung', 'zuverlässig',
    'Zusammenhang', 'überzeugen', 'begegnen', 'kennenlernen', 'schaffen',
    'Herz', 'Gedanke', 'Nebenkosten', 'wirklich', 'außerdem', 'deswegen'
  ];
  for (const w of representativeDrafts) {
    assert(!pubDict[w], `Representative draft word "${w}" is absent from customer dictionary`);
  }

  // ==========================================================================
  // REGRESSION TEST 2: Draft-only inflections absent from inflection index
  // ==========================================================================
  console.log('\n--- TEST 2: Draft-Only Inflections Absent from Inflection Index ---');
  let draftInflectionLeaks = 0;
  for (const draftItem of allDraftEntries) {
    if (Array.isArray(draftItem.inflections)) {
      for (const inf of draftItem.inflections) {
        const infLower = inf.toLowerCase();
        // If inflection does not belong to any approved headword, it must NOT be in customer index
        if (!approvedInflections.has(infLower)) {
          if (pubInfl[infLower]) {
            draftInflectionLeaks++;
            console.error(`    Leak: Draft-only inflection "${infLower}" exists in customer index mapping to "${pubInfl[infLower]}"!`);
          }
        }
      }
    }
  }
  assert(draftInflectionLeaks === 0, `All draft-only inflections are completely absent from customer inflection index (leaks: ${draftInflectionLeaks})`);

  const representativeDraftInflections = [
    'bewerbungen', 'schuf', 'schufen', 'herzens', 'gedankens', 'nebenkosten',
    'kennengelernt', 'überrascht'
  ];
  for (const di of representativeDraftInflections) {
    assert(!pubInfl[di], `Representative draft inflection "${di}" is absent from customer inflection index`);
  }

  // ==========================================================================
  // REGRESSION TEST 3: Reviewed and verified entries remain available
  // ==========================================================================
  console.log('\n--- TEST 3: Approved (Reviewed/Verified) Entries Remain Available ---');
  const sampleApprovedCases = [
    { hw: 'Haus', pos: 'noun', translation: 'house', inf: 'häuser' },
    { hw: 'arbeiten', pos: 'verb', translation: 'to work', inf: 'arbeitete' },
    { hw: 'gut', pos: 'adj', translation: 'good', inf: 'besser' },
    { hw: 'Buch', pos: 'noun', translation: 'book', inf: 'bücher' },
    { hw: 'Telefonnummer', pos: 'noun', translation: 'telephone number', inf: 'telefonnummern' },
    { hw: 'gehen', pos: 'verb', translation: 'to go', inf: 'ging' }
  ];

  for (const ac of sampleApprovedCases) {
    const entry = pubDict[ac.hw];
    assert(entry !== undefined, `Approved headword "${ac.hw}" exists in customer dictionary`);
    if (entry) {
      const matchPOS = entry.senses.some(s => s.pos === ac.pos);
      assert(matchPOS, `Approved headword "${ac.hw}" has correct POS "${ac.pos}"`);
      const matchTrans = entry.senses.some(s => s.translations.some(t => t.toLowerCase().includes(ac.translation.toLowerCase())));
      assert(matchTrans, `Approved headword "${ac.hw}" has expected translation "${ac.translation}"`);
    }
    const mappedLemma = pubInfl[ac.inf.toLowerCase()];
    assert(
      mappedLemma === ac.hw || (Array.isArray(mappedLemma) && mappedLemma.includes(ac.hw)),
      `Approved inflection "${ac.inf}" correctly resolves to "${ac.hw}" (actual: ${JSON.stringify(mappedLemma)})`
    );
  }

  // ==========================================================================
  // REGRESSION TEST 4: Shared headword: approved sense kept, draft excluded
  // ==========================================================================
  console.log('\n--- TEST 4: Shared Headword Homonym Isolation ---');
  const tempTestDir = path.join(ROOT, '.temp-homonym-test');
  const tempAuthoringDir = path.join(tempTestDir, 'authoring');
  try {
    fs.mkdirSync(tempAuthoringDir, { recursive: true });

    // Create synthetic authoring files with shared headword 'Testwort' across POS
    const syntheticApproved = [
      {
        headword: 'Testwort',
        pos: 'noun',
        gender: 'n',
        translations: ['approved castle definition'],
        inflections: ['testwörter'],
        provenance: { author: 'team', method: 'independent_lexicography', reviewStatus: 'reviewed' }
      }
    ];
    const syntheticDraft = [
      {
        headword: 'Testwort',
        pos: 'verb',
        translations: ['draft lock definition'],
        inflections: ['testworte_draft_only'],
        provenance: { author: 'team', method: 'independent_lexicography', reviewStatus: 'draft' }
      }
    ];

    fs.writeFileSync(path.join(tempAuthoringDir, 'nouns.json'), JSON.stringify(syntheticApproved), 'utf8');
    fs.writeFileSync(path.join(tempAuthoringDir, 'verbs.json'), JSON.stringify(syntheticDraft), 'utf8');

    // Build customer mode (includeDrafts: false)
    const outCustomerDir = path.join(tempTestDir, 'out-customer');
    buildAuthoredDictionary({
      authoringDir: tempAuthoringDir,
      outputDir: outCustomerDir,
      includeDrafts: false,
      writePublic: false
    });

    const custDict = JSON.parse(fs.readFileSync(path.join(outCustomerDir, 'de-en-dictionary.json'), 'utf8'));
    const custInfl = JSON.parse(fs.readFileSync(path.join(outCustomerDir, 'de-en-inflections.json'), 'utf8'));

    assert(custDict['Testwort'] !== undefined, 'Shared headword exists in customer dictionary');
    assert(custDict['Testwort'].senses.length === 1, `Shared headword has exactly 1 sense (actual: ${custDict['Testwort'].senses.length})`);
    assert(
      custDict['Testwort'].senses[0].translations.includes('approved castle definition'),
      'Approved sense is preserved in customer build'
    );
    assert(
      !custDict['Testwort'].senses[0].translations.includes('draft lock definition'),
      'Draft sense is excluded from customer build'
    );
    assert(custInfl['testwörter'] === 'Testwort', 'Approved inflection is indexed in customer build');
    assert(custInfl['testworte_draft_only'] === undefined, 'Draft inflection is excluded from customer build');

  } finally {
    try { fs.rmSync(tempTestDir, { recursive: true, force: true }); } catch {}
  }

  // ==========================================================================
  // REGRESSION TEST 5: Draft entries intact in authoring source files
  // ==========================================================================
  console.log('\n--- TEST 5: Authoring Source Records Integrity ---');
  assert(allDraftEntries.length === 100, `Exactly 100 draft entries remain in authoring source files (actual: ${allDraftEntries.length})`);
  assert(allApprovedEntries.length === 706, `Exactly 706 approved entries remain in authoring source files (actual: ${allApprovedEntries.length})`);

  for (const d of allDraftEntries) {
    assert(d.provenance.reviewStatus === 'draft', `Draft record "${d.headword}" preserves reviewStatus === "draft"`);
    const hasTranslations = (d.translations && d.translations.length > 0) || (d.senses && d.senses.some(s => s.translations && s.translations.length > 0));
    assert(hasTranslations, `Draft record "${d.headword}" has translations`);
    const hasPos = typeof d.pos === 'string' || (d.senses && d.senses.every(s => typeof s.pos === 'string'));
    assert(hasPos, `Draft record "${d.headword}" has valid POS`);
  }

  // ==========================================================================
  // REGRESSION TEST 6: Manifest counts accurately report excluded drafts
  // ==========================================================================
  console.log('\n--- TEST 6: Manifest Accurate Accounting ---');
  assert(pubManifest.totalSourceRecords === 806, `Manifest totalSourceRecords === 806 (actual: ${pubManifest.totalSourceRecords})`);
  assert(pubManifest.includedRecordsCount === 706, `Manifest includedRecordsCount === 706 (actual: ${pubManifest.includedRecordsCount})`);
  assert(pubManifest.excludedDraftsCount === 100, `Manifest excludedDraftsCount === 100 (actual: ${pubManifest.excludedDraftsCount})`);
  assert(pubManifest.headwordsCount === 705, `Manifest headwordsCount === 705 (actual: ${pubManifest.headwordsCount})`);
  assert(pubManifest.inflectionKeysCount === 2364, `Manifest inflectionKeysCount === 2364 (actual: ${pubManifest.inflectionKeysCount})`);

  // ==========================================================================
  // REGRESSION TEST 7: Draft preview build cannot overwrite customer assets
  // ==========================================================================
  console.log('\n--- TEST 7: Draft Preview Build Protection & Isolation ---');
  let safetyExceptionThrown = false;
  try {
    buildAuthoredDictionary({
      includeDrafts: true,
      outputDir: publicDataDir
    });
  } catch (err) {
    safetyExceptionThrown = true;
    assert(
      err.message.includes('CRITICAL SAFETY VIOLATION'),
      `Safety guard throws expected error: "${err.message}"`
    );
  }
  assert(safetyExceptionThrown, 'Draft build targeting public/data directory is safely blocked and throws');

  // Verify that customer public/data files were untouched
  const pubDictHashBefore = computeFileHash(path.join(publicDataDir, 'authored-de-en-dictionary.json'));
  const tempPreviewDir = path.join(ROOT, '.temp-preview-safety-check');
  try {
    buildAuthoredDictionary({
      includeDrafts: true,
      outputDir: tempPreviewDir,
      writePublic: false
    });
  } finally {
    try { fs.rmSync(tempPreviewDir, { recursive: true, force: true }); } catch {}
  }
  const pubDictHashAfter = computeFileHash(path.join(publicDataDir, 'authored-de-en-dictionary.json'));
  assert(pubDictHashBefore === pubDictHashAfter, 'Running draft preview does not alter customer public/data files');

  // ==========================================================================
  // REGRESSION TEST 8: CompositeDictionaryProvider & Legacy Fallback
  // ==========================================================================
  console.log('\n--- TEST 8: Runtime Composite Lookup Priority & Legacy Fallback ---');
  const pilotDict = JSON.parse(fs.readFileSync(path.join(distPilotDir, 'de-en-dictionary.json'), 'utf8'));
  const pilotInfl = JSON.parse(fs.readFileSync(path.join(distPilotDir, 'de-en-inflections.json'), 'utf8'));
  const legacyDict = JSON.parse(fs.readFileSync(path.join(publicDataDir, 'de-en-dictionary.json'), 'utf8'));
  const legacyInfl = JSON.parse(fs.readFileSync(path.join(publicDataDir, 'de-en-inflections.json'), 'utf8'));

  const authoredProvider = new LocalDictionaryProvider(pilotDict, pilotInfl);
  const legacyProvider = new LocalDictionaryProvider(legacyDict, legacyInfl);
  const compositeProvider = new CompositeDictionaryProvider(authoredProvider, legacyProvider);

  // 8A: Approved authored entry resolves via authored provider (primary priority)
  const resApproved = await compositeProvider.lookup('Haus', 'de', 'en');
  assert(resApproved !== null, 'Approved headword "Haus" resolves in CompositeDictionaryProvider');
  assert(resApproved.translations.includes('house'), 'Approved headword "Haus" returns authored definition');

  // 8B: Word not in authored (or excluded draft like schaffen), but in legacy -> falls back to legacy
  const resFallback = await compositeProvider.lookup('schaffen', 'de', 'en');
  assert(resFallback !== null, '"schaffen" falls back to legacy/Kaikki provider cleanly');
  assert(resFallback.translations.length > 0, '"schaffen" returns legacy translations');

  // 8C: Draft-only word not in legacy returns null
  const resDraftOnly = await compositeProvider.lookup('Vorstellungsgespräch', 'de', 'en');
  assert(resDraftOnly === null, 'Draft-only word "Vorstellungsgespräch" returns null to customer (zero leak)');

  // 8D: Unknown gibberish word returns null cleanly
  const resUnknown = await compositeProvider.lookup('xyznonexistentword123', 'de', 'en');
  assert(resUnknown === null, 'Unknown word returns null without error');

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n=====================================================================');
  console.log(`  DRAFT ISOLATION REGRESSION RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=====================================================================\n');

  if (failed > 0) {
    console.error(`💥 ${failed} check(s) failed in draft isolation suite!`);
    for (const f of failures) {
      console.error(`  - ${f.label} (${f.context})`);
    }
    process.exit(1);
  } else {
    console.log('🎉 ALL DRAFT ISOLATION REGRESSION TESTS PASSED 100% SUCCESSFULLY!\n');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Fatal regression suite error:', err);
  process.exit(1);
});
