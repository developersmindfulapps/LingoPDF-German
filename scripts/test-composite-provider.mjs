import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  LocalDictionaryProvider,
  CompositeDictionaryProvider,
  loadDictionaryAssets,
  loadAuthoredDictionaryAssets
} from '../src/services/dictionary/index.ts';

const EXPECTED_LEGACY_HASHES = {
  'de-en-dictionary.json': 'ddc6a8dad7aa23f00fa9b9ca325f6cb23f77ece742cb2091b0ee52b4a0812412',
  'de-en-inflections.json': 'd18bb2d36d64979fbce8ea4e358c8b1800aa53a4c7c1953dc7e3457df7ab3a28',
  'de-en-metadata.json': '43021c260a9f63abf121a66d390d2d8e633497d23a0b9825161047651478e201'
};

async function runCompositeProviderTests() {
  console.log('=====================================================================');
  console.log('   PDF LANGUAGE COMPANION — COMPOSITE PROVIDER TEST SUITE (PHASE 6) ');
  console.log('=====================================================================\n');

  // Test 1: Verify Legacy Production Asset Checksums
  console.log('[Test 1] Verifying Legacy Production Assets Untouched (public/data/*):');
  const publicDataDir = path.resolve(process.cwd(), 'public', 'data');
  for (const [filename, expectedHash] of Object.entries(EXPECTED_LEGACY_HASHES)) {
    const filePath = path.join(publicDataDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Critical legacy asset missing: ${filePath}`);
    }
    const buf = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    if (hash.toLowerCase() !== expectedHash.toLowerCase()) {
      throw new Error(`SHA256 mismatch for ${filename}! Expected ${expectedHash}, got ${hash}`);
    }
    console.log(`  ✓ ${filename} matches expected baseline (${hash.slice(0, 16)}...)`);
  }
  console.log('  ✓ Legacy production dictionary assets are 100% verified untouched.\n');

  // Test 2: Verify Authored Asset Packaging in public/data/
  console.log('[Test 2] Offline Authored Asset Packaging (public/data/authored-de-en-*):');
  const authoredAssets = [
    'authored-de-en-dictionary.json',
    'authored-de-en-inflections.json',
    'authored-de-en-metadata.json'
  ];
  for (const assetName of authoredAssets) {
    const assetPath = path.join(publicDataDir, assetName);
    if (!fs.existsSync(assetPath)) {
      throw new Error(`Authored asset missing from public/data/: ${assetPath}`);
    }
    const sizeKb = (fs.statSync(assetPath).size / 1024).toFixed(1);
    console.log(`  ✓ Packaged ${assetName} (${sizeKb} KB)`);
  }
  console.log('  ✓ Authored assets packaged offline under distinct filenames.\n');

  // Test 3: Load Data and Instantiate Dual Providers
  console.log('[Test 3] Loading Assets & Initializing Composite Provider:');
  const legacyData = await loadDictionaryAssets();
  const authoredData = await loadAuthoredDictionaryAssets();

  const legacyProvider = new LocalDictionaryProvider(
    legacyData.entries,
    legacyData.inflections,
    loadDictionaryAssets,
    'legacy-de-en',
    'Legacy German-English Dictionary'
  );

  const authoredProvider = new LocalDictionaryProvider(
    authoredData.entries,
    authoredData.inflections,
    loadAuthoredDictionaryAssets,
    'authored-de-en',
    'Authored German-English Dictionary'
  );

  const compositeProvider = new CompositeDictionaryProvider(authoredProvider, legacyProvider);
  await compositeProvider.ensureInitialized();
  if (!compositeProvider.isInitialized()) {
    throw new Error('Composite provider reported isInitialized() === false after ensureInitialized()');
  }
  console.log('  ✓ Authored Headwords:', Object.keys(authoredData.entries).length);
  console.log('  ✓ Legacy Headwords:', Object.keys(legacyData.entries).length);
  console.log('  ✓ CompositeDictionaryProvider successfully initialized.\n');

  // Test 4: Authored Exact Match Takes Precedence
  console.log('[Test 4] Authored Exact Match Precedence:');
  const exactTestWords = ['Haus', 'arbeiten', 'Kaffee', 'gut', 'und', 'wie'];
  for (const word of exactTestWords) {
    const res = await compositeProvider.lookup(word, 'de', 'en');
    if (!res) throw new Error(`Lookup returned null for authored word "${word}"`);
    if (res.providerId !== 'authored') {
      throw new Error(`Expected providerId 'authored' for "${word}", got '${res.providerId}'`);
    }
    console.log(`  ✓ "${word}" -> resolved by [${res.providerId}] -> ${res.translations[0]}`);
  }
  console.log('  ✓ Authored exact matches take strict precedence over legacy.\n');

  // Test 5: Authored Inflection Match Takes Precedence
  console.log('[Test 5] Authored Inflection Match Precedence:');
  const inflectionTestWords = [
    { word: 'häuser', expectedLemma: 'Haus' },
    { word: 'arbeitete', expectedLemma: 'arbeiten' },
    { word: 'schönste', expectedLemma: 'schön' }
  ];
  for (const tc of inflectionTestWords) {
    const res = await compositeProvider.lookup(tc.word, 'de', 'en');
    if (!res) throw new Error(`Lookup returned null for inflection "${tc.word}"`);
    if (res.providerId !== 'authored') {
      throw new Error(`Expected providerId 'authored' for "${tc.word}", got '${res.providerId}'`);
    }
    if (res.lemma !== tc.expectedLemma) {
      throw new Error(`Expected lemma "${tc.expectedLemma}", got "${res.lemma}"`);
    }
    console.log(`  ✓ "${tc.word}" -> resolved by [${res.providerId}] to Lemma: "${res.lemma}"`);
  }
  console.log('  ✓ Authored inflection matches take strict precedence.\n');

  // Test 6: Authored Miss Falls Back to Legacy
  console.log('[Test 6] Authored Miss Falls Back to Legacy:');
  // Words that exist in legacy (15k Wiktionary) but NOT in the ~354-word authored pilot:
  const legacyOnlyWords = [
    { word: 'Schrank', expectedLemma: undefined }, // cabinet, cupboard
    { word: 'Fenster', expectedLemma: undefined }, // window
    { word: 'laufen', expectedLemma: undefined }   // to run
  ];
  for (const tc of legacyOnlyWords) {
    // Confirm it is not in authored
    const authoredCheck = await authoredProvider.lookup(tc.word, 'de', 'en');
    if (authoredCheck !== null) {
      throw new Error(`Word "${tc.word}" unexpectedly found in authored pilot`);
    }
    const res = await compositeProvider.lookup(tc.word, 'de', 'en');
    if (!res) throw new Error(`Lookup failed on legacy fallback for "${tc.word}"`);
    if (res.providerId !== 'legacy') {
      throw new Error(`Expected providerId 'legacy' for "${tc.word}", got '${res.providerId}'`);
    }
    console.log(`  ✓ "${tc.word}" -> Authored: null -> Fallback to [${res.providerId}] -> ${res.translations[0]}`);
  }
  console.log('  ✓ Missing authored words fall back seamlessly to legacy.\n');

  // Test 7: Ambiguous Inflections & Multi-Lemma Resolution (Requirement A)
  console.log('[Test 7] Ambiguous Inflection Index (Record<string, string | string[]>):');
  
  // 7a: "sprachen" resolves to BOTH "Sprache" and "sprechen"
  const sprachenRes = await compositeProvider.lookup('sprachen', 'de', 'en');
  if (!sprachenRes) throw new Error('Lookup returned null for ambiguous inflection "sprachen"');
  if (!sprachenRes.lemma || !sprachenRes.lemma.includes('Sprache') || !sprachenRes.lemma.includes('sprechen')) {
    throw new Error(`Expected combined lemma for "sprachen", got "${sprachenRes.lemma}"`);
  }
  if (!sprachenRes.partOfSpeech.includes('noun') || !sprachenRes.partOfSpeech.includes('verb')) {
    throw new Error(`Expected both noun and verb in partOfSpeech for "sprachen", got "${sprachenRes.partOfSpeech}"`);
  }
  console.log(`  ✓ "sprachen" -> Lemma: "${sprachenRes.lemma}", POS: "${sprachenRes.partOfSpeech}", Translations: [${sprachenRes.translations.slice(0, 3).join(', ')}...]`);

  // 7b: "gehört" resolves to BOTH "gehören" and "hören"
  const gehoertRes = await compositeProvider.lookup('gehört', 'de', 'en');
  if (!gehoertRes) throw new Error('Lookup returned null for ambiguous inflection "gehört"');
  if (!gehoertRes.lemma || !gehoertRes.lemma.includes('gehören') || !gehoertRes.lemma.includes('hören')) {
    throw new Error(`Expected combined lemma for "gehört", got "${gehoertRes.lemma}"`);
  }
  console.log(`  ✓ "gehört" -> Lemma: "${gehoertRes.lemma}", POS: "${gehoertRes.partOfSpeech}"`);

  // 7c: Duplicate candidates in inflection index (e.g. ['Sprache', 'Sprache']) deduplicated
  const mockEntries = {
    Sprache: { senses: [{ pos: 'noun', translations: ['language'] }] }
  };
  const mockProvider = new LocalDictionaryProvider(
    mockEntries,
    { sprachen_dupe: ['Sprache', 'Sprache'] }
  );
  const dupeRes = await mockProvider.lookup('sprachen_dupe', 'de', 'en');
  if (!dupeRes || dupeRes.lemma !== 'Sprache') {
    throw new Error(`Duplicate candidate deduplication failed, got lemma: "${dupeRes?.lemma}"`);
  }
  console.log('  ✓ Duplicate candidates in array deduplicated to single lemma result.');

  // 7d: Missing candidate gracefully handled (e.g. ['Sprache', 'NonExistentLemma'])
  const mockPartialProvider = new LocalDictionaryProvider(
    mockEntries,
    { sprachen_partial: ['Sprache', 'NonExistentLemma'] }
  );
  const partialRes = await mockPartialProvider.lookup('sprachen_partial', 'de', 'en');
  if (!partialRes || partialRes.lemma !== 'Sprache') {
    throw new Error(`Partial missing candidate handling failed, got lemma: "${partialRes?.lemma}"`);
  }
  console.log('  ✓ Partially missing candidate in array gracefully falls back to existing lemma.');

  // 7e: Single string entries backward compatibility (legacy and authored)
  const singleStringRes = await compositeProvider.lookup('häuser', 'de', 'en');
  if (!singleStringRes || singleStringRes.lemma !== 'Haus') {
    throw new Error('Single-string backward compatibility failed');
  }
  console.log('  ✓ Single string inflection entries maintain 100% backward compatibility.\n');

  // Test 8: Homographs and Case-Sensitive Disambiguation
  console.log('[Test 8] Homographs & Case-Sensitive Disambiguation:');
  const sieRes = await compositeProvider.lookup('sie', 'de', 'en');
  const SieRes = await compositeProvider.lookup('Sie', 'de', 'en');
  if (!sieRes || !sieRes.translations.some(t => t.toLowerCase().includes('she') || t.toLowerCase().includes('they'))) {
    throw new Error('Lookup failed for lowercase "sie"');
  }
  if (!SieRes || !SieRes.translations.some(t => t.toLowerCase().includes('you'))) {
    throw new Error('Lookup failed for formal "Sie"');
  }
  console.log(`  ✓ "sie" (lowercase) -> [${sieRes.translations.slice(0, 2).join(', ')}]`);
  console.log(`  ✓ "Sie" (formal)    -> [${SieRes.translations.slice(0, 2).join(', ')}]`);

  const morgenRes = await compositeProvider.lookup('morgen', 'de', 'en');
  const MorgenRes = await compositeProvider.lookup('Morgen', 'de', 'en');
  if (!morgenRes || !morgenRes.partOfSpeech.includes('adv')) throw new Error('Failed for adverb "morgen"');
  if (!MorgenRes || !MorgenRes.partOfSpeech.includes('noun')) throw new Error('Failed for noun "Morgen"');
  console.log(`  ✓ "morgen" (adv)    -> [${morgenRes.translations[0]}]`);
  console.log(`  ✓ "Morgen" (noun)   -> [${MorgenRes.translations[0]}]`);
  console.log('  ✓ Case-sensitive homographs preserved distinctly.\n');

  // Test 9: Authored Failure Falls Back to Legacy
  console.log('[Test 9] Authored Failure Fallback Behavior:');
  // Create a broken authored provider that throws on lookup
  const brokenAuthoredProvider = {
    id: 'broken-authored',
    name: 'Broken Authored Provider',
    isInitialized: () => true,
    getInitializationError: () => null,
    ensureInitialized: async () => {},
    lookup: async () => {
      throw new Error('Simulated authored disk read / lookup error');
    }
  };
  const fallbackComposite = new CompositeDictionaryProvider(brokenAuthoredProvider, legacyProvider);
  const fallbackRes = await fallbackComposite.lookup('Haus', 'de', 'en');
  if (!fallbackRes || fallbackRes.providerId !== 'legacy') {
    throw new Error(`Expected fallback to legacy upon authored throw, got: ${JSON.stringify(fallbackRes)}`);
  }
  console.log(`  ✓ Authored throw gracefully falls back to [${fallbackRes.providerId}] for "Haus".\n`);

  // Test 10: Error Discrimination (Legacy Failure Produces Error, NOT "Not Found")
  console.log('[Test 10] Error Discrimination Contract:');
  const brokenLegacyProvider = {
    id: 'broken-legacy',
    name: 'Broken Legacy Provider',
    isInitialized: () => true,
    getInitializationError: () => null,
    ensureInitialized: async () => {},
    lookup: async () => {
      throw new Error('Simulated critical legacy store corruption');
    }
  };
  // Provider where authored misses and legacy throws:
  const doubleBrokenComposite = new CompositeDictionaryProvider(authoredProvider, brokenLegacyProvider);
  let threwExplicit = false;
  try {
    // Word not in authored: triggers legacy lookup
    await doubleBrokenComposite.lookup('Schrank', 'de', 'en');
  } catch (err) {
    threwExplicit = true;
    console.log(`  ✓ Caught expected explicit error: "${err.message}"`);
  }
  if (!threwExplicit) {
    throw new Error('Expected explicit error when fallback fails; did NOT throw!');
  }
  console.log('  ✓ Legacy failure correctly surfaced as explicit Error, never as null.\n');

  // Test 11: Genuine Not Found (Word Missing in Both)
  console.log('[Test 11] Genuine Not Found State:');
  const unknownWord = 'xyznonexistentword987';
  const notFoundRes = await compositeProvider.lookup(unknownWord, 'de', 'en');
  if (notFoundRes !== null) {
    throw new Error(`Expected null for unknown word, got: ${JSON.stringify(notFoundRes)}`);
  }
  console.log(`  ✓ Unknown word "${unknownWord}" returns null cleanly without throwing.\n`);

  // Test 12: Concurrent Initialization Deduplication & Self-Healing Retry
  console.log('[Test 12] Concurrent Initialization & Retry Contract:');
  let fetchCount = 0;
  const mockLoader = async () => {
    fetchCount++;
    await new Promise(r => setTimeout(r, 20));
    return {
      entries: { Test: { senses: [{ pos: 'noun', translations: ['test'] }] } },
      inflections: {}
    };
  };
  const testProvider = new LocalDictionaryProvider(undefined, undefined, mockLoader);
  // Launch 25 concurrent calls
  await Promise.all(Array.from({ length: 25 }, () => testProvider.ensureInitialized()));
  if (fetchCount !== 1) {
    throw new Error(`Expected exactly 1 underlying load for 25 concurrent calls, got ${fetchCount}`);
  }
  console.log(`  ✓ 25 concurrent ensureInitialized() calls resolved with exactly 1 underlying load.`);

  // Self-healing retry after initialization failure:
  let shouldFail = true;
  const flakyLoader = async () => {
    if (shouldFail) {
      throw new Error('Transient network timeout');
    }
    return {
      entries: { Ok: { senses: [{ pos: 'noun', translations: ['ok'] }] } },
      inflections: {}
    };
  };
  const retryProvider = new LocalDictionaryProvider(undefined, undefined, flakyLoader);
  let initialFailed = false;
  try {
    await retryProvider.ensureInitialized();
  } catch (err) {
    initialFailed = true;
  }
  if (!initialFailed) throw new Error('Expected first attempt to fail');

  // Subsequent attempt recovers
  shouldFail = false;
  await retryProvider.ensureInitialized();
  if (!retryProvider.isInitialized()) throw new Error('Self-healing retry failed to recover');
  console.log('  ✓ Provider cleanly recovers and re-initializes on retry after failure.\n');

  console.log('=====================================================================');
  console.log('🎉 ALL 12 COMPOSITE PROVIDER VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  console.log('=====================================================================\n');
}

runCompositeProviderTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ COMPOSITE PROVIDER TEST SUITE FAILED:', err);
    process.exit(1);
  });
