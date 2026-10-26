import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { LocalDictionaryProvider } from '../src/services/dictionary/LocalDictionaryProvider.ts';

const EXPECTED_PROD_HASHES = {
  'de-en-dictionary.json': 'ddc6a8dad7aa23f00fa9b9ca325f6cb23f77ece742cb2091b0ee52b4a0812412',
  'de-en-inflections.json': 'd18bb2d36d64979fbce8ea4e358c8b1800aa53a4c7c1953dc7e3457df7ab3a28',
  'de-en-metadata.json': '43021c260a9f63abf121a66d390d2d8e633497d23a0b9825161047651478e201'
};

function computeSha256(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex').toLowerCase();
}

export async function testAuthoredLookups() {
  console.log('===============================================================');
  console.log('   PDF LANGUAGE COMPANION — AUTHORED PILOT LOOKUP TEST SUITE   ');
  console.log('===============================================================\n');

  // Step 1: Production Data File Integrity Invariant
  console.log('[Check 1] Verifying Production Data Unchanged (public/data/*):');
  const prodDataDir = path.resolve(process.cwd(), 'public', 'data');
  for (const [fileName, expectedHash] of Object.entries(EXPECTED_PROD_HASHES)) {
    const filePath = path.join(prodDataDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Production file missing: ${filePath}`);
    }
    const actualHash = computeSha256(filePath);
    if (actualHash !== expectedHash) {
      throw new Error(`CRITICAL: Production file ${fileName} was modified! Expected ${expectedHash}, got ${actualHash}`);
    }
    console.log(`  ✓ ${fileName} matches production checksum (${actualHash.slice(0, 12)}...)`);
  }
  console.log('  ✓ Production files are 100% verified untouched.\n');

  // Step 2: Load compiled pilot assets from dist-pilot/
  console.log('[Check 2] Loading Pilot Assets from dist-pilot/:');
  const pilotDir = path.resolve(process.cwd(), 'dist-pilot');
  const dictFile = path.join(pilotDir, 'de-en-dictionary.json');
  const inflFile = path.join(pilotDir, 'de-en-inflections.json');
  const metaFile = path.join(pilotDir, 'de-en-metadata.json');

  if (!fs.existsSync(dictFile) || !fs.existsSync(inflFile) || !fs.existsSync(metaFile)) {
    throw new Error(`Pilot files missing in ${pilotDir}. Run "node scripts/build-authored-dictionary.mjs" first.`);
  }

  const pilotEntries = JSON.parse(fs.readFileSync(dictFile, 'utf-8'));
  const pilotInflections = JSON.parse(fs.readFileSync(inflFile, 'utf-8'));
  const pilotMetadata = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));

  console.log(`  • Pilot Headwords: ${Object.keys(pilotEntries).length}`);
  console.log(`  • Pilot Inflection Keys: ${Object.keys(pilotInflections).length}`);
  console.log(`  • Metadata Version: ${pilotMetadata.version}`);
  console.log('  ✓ Pilot assets loaded successfully.\n');

  // Step 3: Instantiate isolated LocalDictionaryProvider
  console.log('[Check 3] Instantiating Isolated LocalDictionaryProvider:');
  const pilotProvider = new LocalDictionaryProvider(pilotEntries, pilotInflections);
  if (!pilotProvider.isInitialized()) {
    throw new Error('Pilot provider failed to report isInitialized() === true with injected custom data');
  }
  console.log('  ✓ LocalDictionaryProvider initialized with pilot dataset (zero network/disk I/O).\n');

  // Step 4: Test Exact Lookups across POS
  console.log('[Check 4] Exact Headword Match Tests:');
  const exactCases = [
    { word: 'Haus', expectedPOS: 'noun', expectedGender: 'n', expectedPlural: 'Häuser', expectedTranslation: 'house' },
    { word: 'Buch', expectedPOS: 'noun', expectedGender: 'n', expectedPlural: 'Bücher', expectedTranslation: 'book' },
    { word: 'Schule', expectedPOS: 'noun', expectedGender: 'f', expectedPlural: 'Schulen', expectedTranslation: 'school' },
    { word: 'Kaffee', expectedPOS: 'noun', expectedGender: 'm', expectedPlural: 'Kaffees', expectedTranslation: 'coffee' },
    { word: 'Mädchen', expectedPOS: 'noun', expectedGender: 'n', expectedTranslation: 'girl' },
    { word: 'arbeiten', expectedPOS: 'verb', expectedTranslation: 'to work' },
    { word: 'lernen', expectedPOS: 'verb', expectedTranslation: 'to learn' },
    { word: 'gehen', expectedPOS: 'verb', expectedTranslation: 'to go' },
    { word: 'gut', expectedPOS: 'adj', expectedTranslation: 'good' },
    { word: 'schön', expectedPOS: 'adj', expectedTranslation: 'beautiful' },
    { word: 'heute', expectedPOS: 'adv', expectedTranslation: 'today' },
    { word: 'hier', expectedPOS: 'adv', expectedTranslation: 'here' },
    { word: 'Telefonnummer', expectedPOS: 'noun', expectedGender: 'f', expectedTranslation: 'telephone number' },
    { word: 'Lieblingsfilm', expectedPOS: 'noun', expectedGender: 'm', expectedTranslation: 'favorite film' }
  ];

  for (const tc of exactCases) {
    const res = await pilotProvider.lookup(tc.word, 'de', 'en');
    if (!res) throw new Error(`Lookup failed for exact word "${tc.word}"`);
    if (tc.expectedPOS && !res.partOfSpeech.includes(tc.expectedPOS)) {
      throw new Error(`POS mismatch for "${tc.word}": expected ${tc.expectedPOS}, got ${res.partOfSpeech}`);
    }
    if (tc.expectedGender && res.gender !== tc.expectedGender) {
      throw new Error(`Gender mismatch for "${tc.word}": expected ${tc.expectedGender}, got ${res.gender}`);
    }
    if (tc.expectedPlural && res.plural !== tc.expectedPlural) {
      throw new Error(`Plural mismatch for "${tc.word}": expected ${tc.expectedPlural}, got ${res.plural}`);
    }
    const hasTranslation = res.translations.some(t => t.toLowerCase().includes(tc.expectedTranslation.toLowerCase()));
    if (!hasTranslation) {
      throw new Error(`Translation mismatch for "${tc.word}": expected to contain "${tc.expectedTranslation}", got [${res.translations.join(', ')}]`);
    }
    console.log(`  ✓ "${tc.word}" -> [${res.partOfSpeech}${res.gender ? ' (' + res.gender + ')' : ''}] [${res.translations.slice(0, 2).join(', ')}]`);
  }

  // Verify mass nouns do not have erroneous plurals
  const resWasser = await pilotProvider.lookup('Wasser', 'de', 'en');
  if (resWasser?.plural) {
    throw new Error(`Mass noun "Wasser" should not have plural, got "${resWasser.plural}"`);
  }
  const resMusikBase = await pilotProvider.lookup('Musik', 'de', 'en');
  if (resMusikBase?.plural) {
    throw new Error(`Mass noun "Musik" should not have plural, got "${resMusikBase.plural}"`);
  }
  console.log('  ✓ Mass nouns ("Wasser", "Musik") verified without erroneous plural.');
  console.log('  ✓ All exact match lookups passed.\n');

  // Step 5: Test Case Normalization
  console.log('[Check 5] Case Normalization Lookups:');
  const caseCases = [
    { query: 'haus', expectedLemma: 'Haus', expectedTranslation: 'house' },
    { query: 'schule', expectedLemma: 'Schule', expectedTranslation: 'school' },
    { query: 'buch', expectedLemma: 'Buch', expectedTranslation: 'book' },
    { query: 'Arbeiten', expectedLemma: 'arbeiten', expectedTranslation: 'to work' },
    { query: 'Lernen', expectedLemma: 'lernen', expectedTranslation: 'to learn' },
    { query: 'Schön', expectedLemma: 'schön', expectedTranslation: 'beautiful' }
  ];

  for (const tc of caseCases) {
    const res = await pilotProvider.lookup(tc.query, 'de', 'en');
    if (!res) throw new Error(`Case lookup failed for "${tc.query}"`);
    if (res.lemma && res.lemma !== tc.expectedLemma) {
      throw new Error(`Case lemma mismatch for "${tc.query}": expected ${tc.expectedLemma}, got ${res.lemma}`);
    }
    console.log(`  ✓ "${tc.query}" -> resolved to ${res.lemma || tc.query} (${res.translations[0]})`);
  }
  console.log('  ✓ Case-normalization lookups passed.\n');

  // Step 6: Test Precompiled Inflection Mappings
  console.log('[Check 6] Precompiled Inflection Resolution:');
  const inflectionCases = [
    { inflected: 'häuser', expectedLemma: 'Haus', expectedTranslation: 'house' },
    { inflected: 'büchern', expectedLemma: 'Buch', expectedTranslation: 'book' },
    { inflected: 'kaffees', expectedLemma: 'Kaffee', expectedTranslation: 'coffee' },
    { inflected: 'mädchens', expectedLemma: 'Mädchen', expectedTranslation: 'girl' },
    { inflected: 'städte', expectedLemma: 'Stadt', expectedTranslation: 'city' },
    { inflected: 'kinder', expectedLemma: 'Kind', expectedTranslation: 'child' },
    { inflected: 'ging', expectedLemma: 'gehen', expectedTranslation: 'to go' },
    { inflected: 'gegangen', expectedLemma: 'gehen', expectedTranslation: 'to go' },
    { inflected: 'arbeitete', expectedLemma: 'arbeiten', expectedTranslation: 'to work' },
    { inflected: 'gearbeitet', expectedLemma: 'arbeiten', expectedTranslation: 'to work' },
    { inflected: 'schönste', expectedLemma: 'schön', expectedTranslation: 'beautiful' },
    { inflected: 'besser', expectedLemma: 'gut', expectedTranslation: 'good' },
    { inflected: 'größer', expectedLemma: 'groß', expectedTranslation: 'big' },
    { inflected: 'telefonnummern', expectedLemma: 'Telefonnummer', expectedTranslation: 'telephone number' },
    { inflected: 'bänke', expectedLemma: 'Bank', expectedTranslation: 'bench' },
    { inflected: 'aufgestanden', expectedLemma: 'aufstehen', expectedTranslation: 'to get up' },
    { inflected: 'aufstehe', expectedLemma: 'aufstehen', expectedTranslation: 'to get up' },
    { inflected: 'eingekauft', expectedLemma: 'einkaufen', expectedTranslation: 'to shop' },
    { inflected: 'einkaufe', expectedLemma: 'einkaufen', expectedTranslation: 'to shop' },
    { inflected: 'lest', expectedLemma: 'lesen', expectedTranslation: 'to read' },
    { inflected: 'esst', expectedLemma: 'essen', expectedTranslation: 'to eat' },
    { inflected: 'fahrt', expectedLemma: 'fahren', expectedTranslation: 'to drive' },
    { inflected: 'gebt', expectedLemma: 'geben', expectedTranslation: 'to give' },
    { inflected: 'nehmt', expectedLemma: 'nehmen', expectedTranslation: 'to take' },
    { inflected: 'seht', expectedLemma: 'sehen', expectedTranslation: 'to see' },
    { inflected: 'sprecht', expectedLemma: 'sprechen', expectedTranslation: 'to speak' }
  ];

  for (const tc of inflectionCases) {
    const res = await pilotProvider.lookup(tc.inflected, 'de', 'en');
    if (!res) throw new Error(`Inflection lookup failed for "${tc.inflected}"`);
    if (res.lemma !== tc.expectedLemma) {
      throw new Error(`Inflection lemma mismatch for "${tc.inflected}": expected "${tc.expectedLemma}", got "${res.lemma}"`);
    }
    console.log(`  ✓ "${tc.inflected}" -> Lemma: "${res.lemma}" (${res.translations[0]})`);
  }
  console.log('  ✓ All inflection lookups resolved accurately.\n');

  // Step 7: Homographs & Case-Sensitive Disambiguation
  console.log('[Check 7] Homograph & Case-Sensitive Disambiguation:');

  // 1. Morgen (noun) vs morgen (adv)
  const resMorgen = await pilotProvider.lookup('Morgen', 'de', 'en');
  if (!resMorgen || !resMorgen.translations.some(t => t.toLowerCase().includes('morning'))) {
    throw new Error('Capitalized "Morgen" did not resolve to morning');
  }
  const resMorgenAdv = await pilotProvider.lookup('morgen', 'de', 'en');
  if (!resMorgenAdv || !resMorgenAdv.translations.some(t => t.toLowerCase().includes('tomorrow'))) {
    throw new Error('Lowercase "morgen" did not resolve to tomorrow');
  }
  console.log(`  ✓ "Morgen" (noun): [${resMorgen.translations.join(', ')}]`);
  console.log(`  ✓ "morgen" (adv):  [${resMorgenAdv.translations.join(', ')}]`);

  // 2. sie (she/they) vs Sie (formal you)
  const resSieLower = await pilotProvider.lookup('sie', 'de', 'en');
  if (!resSieLower || !resSieLower.translations.some(t => t.includes('she') || t.includes('they'))) {
    throw new Error('Lowercase "sie" failed');
  }
  const resSieUpper = await pilotProvider.lookup('Sie', 'de', 'en');
  if (!resSieUpper || !resSieUpper.translations.some(t => t.toLowerCase().includes('you'))) {
    throw new Error('Capitalized "Sie" failed');
  }
  console.log(`  ✓ "sie" (pronoun): [${resSieLower.translations.join(', ')}]`);
  console.log(`  ✓ "Sie" (formal):  [${resSieUpper.translations.join(', ')}]`);

  // 3. ihr vs Ihr
  const resIhrLower = await pilotProvider.lookup('ihr', 'de', 'en');
  const resIhrUpper = await pilotProvider.lookup('Ihr', 'de', 'en');
  if (!resIhrLower || !resIhrUpper) throw new Error('ihr / Ihr lookup failed');
  console.log(`  ✓ "ihr" (lower):   [${resIhrLower.translations.join(', ')}]`);
  console.log(`  ✓ "Ihr" (formal):  [${resIhrUpper.translations.join(', ')}]`);

  // 4. sein (multi-sense: verb to be and det his/its)
  const resSein = await pilotProvider.lookup('sein', 'de', 'en');
  if (!resSein || !resSein.partOfSpeech.includes('verb') || !resSein.partOfSpeech.includes('det')) {
    throw new Error(`"sein" should include both verb and det senses (got: ${resSein?.partOfSpeech})`);
  }
  console.log(`  ✓ "sein" (senses): POS="${resSein.partOfSpeech}", Translations=[${resSein.translations.join(' | ')}]`);

  // 5. Bank (multi-sense: financial institution vs bench/seat)
  const resBank = await pilotProvider.lookup('Bank', 'de', 'en');
  if (!resBank || !resBank.translations.some(t => t.includes('financial')) || !resBank.translations.some(t => t.includes('bench'))) {
    throw new Error('"Bank" polysemy lookup failed');
  }
  console.log(`  ✓ "Bank" (senses): POS="${resBank.partOfSpeech}", Translations=[${resBank.translations.join(' | ')}]`);

  // 6. zu (multi-sense: preposition vs degree adverb)
  const resZu = await pilotProvider.lookup('zu', 'de', 'en');
  if (!resZu || !resZu.partOfSpeech.includes('prep') || !resZu.partOfSpeech.includes('adv')) {
    throw new Error(`"zu" should include prep and adv senses (got: ${resZu?.partOfSpeech})`);
  }
  console.log(`  ✓ "zu" (senses):   POS="${resZu.partOfSpeech}", Translations=[${resZu.translations.join(' | ')}]\n`);

  // Step 8: Contractions and Function Words
  console.log('[Check 8] Prepositional Contractions & Particles:');
  const functionWords = [
    { word: 'ins', expected: 'into the' },
    { word: 'im', expected: 'in the' },
    { word: 'am', expected: 'at the' },
    { word: 'beim', expected: 'at the' },
    { word: 'zum', expected: 'to the' },
    { word: 'zur', expected: 'to the' },
    { word: 'ja', expected: 'yes' },
    { word: 'nein', expected: 'no' },
    { word: 'doch', expected: 'yes' }
  ];
  for (const fw of functionWords) {
    const res = await pilotProvider.lookup(fw.word, 'de', 'en');
    if (!res || !res.translations.some(t => t.toLowerCase().includes(fw.expected.toLowerCase()))) {
      throw new Error(`Function word "${fw.word}" failed`);
    }
    console.log(`  ✓ "${fw.word}" -> [${res.partOfSpeech}] [${res.translations[0]}]`);
  }
  console.log('  ✓ Function words and contractions resolved.\n');

  // Step 9: Compound Handling (Explicit & Productive Fallback)
  console.log('[Check 9] Compound Decomposition & Productive Fallback:');
  // Explicit: Lieblingsfilm
  const resFilm = await pilotProvider.lookup('Lieblingsfilm', 'de', 'en');
  if (!resFilm || !resFilm.translations.includes('favorite film') || resFilm.gender !== 'm') {
    throw new Error('Lieblingsfilm lookup failed');
  }
  console.log(`  ✓ "Lieblingsfilm" (explicit): [${resFilm.translations.join(', ')}] (gender: ${resFilm.gender})`);

  // Compositional fallback: Lieblingsmusik
  // In our pilot, Lieblingsmusik is explicitly defined in compounds.json:
  const resMusik = await pilotProvider.lookup('Lieblingsmusik', 'de', 'en');
  if (!resMusik || !resMusik.translations.some(t => t.toLowerCase().includes('favorite music'))) {
    throw new Error('Lieblingsmusik lookup failed');
  }
  console.log(`  ✓ "Lieblingsmusik": [${resMusik.translations.join(', ')}] (gender: ${resMusik.gender})\n`);

  // Step 10: Unknown Words & Language Contracts
  console.log('[Check 10] Unknown Words & Contract Validation:');
  const unknown = await pilotProvider.lookup('VollstaendigUnbekanntesWort999', 'de', 'en');
  if (unknown !== null) {
    throw new Error(`Expected null for unknown word, got: ${JSON.stringify(unknown)}`);
  }
  console.log('  ✓ Unknown word returns null cleanly without throwing.');

  const badLang = await pilotProvider.lookup('Haus', 'fr', 'en');
  if (badLang !== null) {
    throw new Error('Unsupported language pair should return null');
  }
  console.log('  ✓ Unsupported language pair returns null cleanly.\n');

  // Step 11: Phase 10 High-Utility & Closed-Class Vocabulary
  console.log('[Check 11] Phase 10 Closed-Class & High-Utility Vocabulary:');
  const phase10Checks = [
    // Conjunctions
    { query: 'weil', expectedPos: 'conj', expectedTrans: 'because' },
    { query: 'dass', expectedPos: 'conj', expectedTrans: 'that' },
    { query: 'wenn', expectedPos: 'conj', expectedTrans: 'if' },
    { query: 'obwohl', expectedPos: 'conj', expectedTrans: 'although' },
    { query: 'ob', expectedPos: 'conj', expectedTrans: 'whether' },

    // Prepositions and multi-class
    { query: 'seit', expectedPos: 'prep/conj', expectedTrans: 'since' },
    { query: 'während', expectedPos: 'prep/conj', expectedTrans: 'during' },
    { query: 'wegen', expectedPos: 'prep', expectedTrans: 'because of' },
    { query: 'trotz', expectedPos: 'prep', expectedTrans: 'despite' },
    { query: 'als', expectedPos: 'conj/prep', expectedTrans: 'when' },
    { query: 'da', expectedPos: 'adv/conj', expectedTrans: 'there' },
    { query: 'damit', expectedPos: 'adv/conj', expectedTrans: 'with it' },

    // Pronouns & inflections
    { query: 'jemand', expectedPos: 'pron', expectedTrans: 'someone' },
    { query: 'jemandem', expectedLemma: 'jemand', expectedTrans: 'someone' },
    { query: 'niemand', expectedPos: 'pron', expectedTrans: 'no one' },
    { query: 'keiner', expectedPos: 'pron', expectedTrans: 'no one' },
    { query: 'keine', expectedLemma: 'kein / keiner', expectedTrans: 'no' },
    { query: 'dessen', expectedPos: 'pron', expectedTrans: 'whose' },
    { query: 'deren', expectedPos: 'pron', expectedTrans: 'whose' },
    { query: 'einige', expectedPos: 'pron/det', expectedTrans: 'some' },
    { query: 'beide', expectedPos: 'pron/det', expectedTrans: 'both' },

    // Pronominal adverbs
    { query: 'darauf', expectedPos: 'adv', expectedTrans: 'on it' },
    { query: 'drauf', expectedLemma: 'darauf', expectedTrans: 'on it' },
    { query: 'davon', expectedPos: 'adv', expectedTrans: 'of it' },
    { query: 'daran', expectedPos: 'adv', expectedTrans: 'at it' },
    { query: 'dafür', expectedPos: 'adv', expectedTrans: 'for it' },
    { query: 'dazu', expectedPos: 'adv', expectedTrans: 'to it' },
    { query: 'darüber', expectedPos: 'adv', expectedTrans: 'about it' },
    { query: 'woran', expectedPos: 'adv', expectedTrans: 'at what' },
    { query: 'darum', expectedPos: 'adv', expectedTrans: 'around it' },
    { query: 'darin', expectedPos: 'adv', expectedTrans: 'in it' },

    // Focus / modal particles & adverbs
    { query: 'nur', expectedPos: 'part', expectedTrans: 'only' },
    { query: 'halt', expectedPos: 'part', expectedTrans: 'just' },
    { query: 'eben', expectedPos: 'part/adv', expectedTrans: 'just' },
    { query: 'wohl', expectedPos: 'part/adv', expectedTrans: 'probably' },
    { query: 'gar', expectedPos: 'part', expectedTrans: 'at all' },
    { query: 'eigentlich', expectedPos: 'adv/adj', expectedTrans: 'actually' },
    { query: 'erst', expectedPos: 'adv', expectedTrans: 'only' },
    { query: 'überhaupt', expectedPos: 'adv', expectedTrans: 'at all' },
    { query: 'sogar', expectedPos: 'adv', expectedTrans: 'even' },
    { query: 'bereits', expectedPos: 'adv', expectedTrans: 'already' },
    { query: 'kaum', expectedPos: 'adv', expectedTrans: 'hardly' },
    { query: 'deshalb', expectedPos: 'adv', expectedTrans: 'therefore' },
    { query: 'nämlich', expectedPos: 'adv', expectedTrans: 'namely' },

    // Core verbs and inflected forms
    { query: 'lassen', expectedPos: 'verb', expectedTrans: 'to let' },
    { query: 'lässt', expectedLemma: 'lassen', expectedTrans: 'to let' },
    { query: 'gelassen', expectedLemma: 'lassen', expectedTrans: 'to let' },
    { query: 'halten', expectedPos: 'verb', expectedTrans: 'to hold' },
    { query: 'hält', expectedLemma: 'halten', expectedTrans: 'to hold' },
    { query: 'gehalten', expectedLemma: 'halten', expectedTrans: 'to hold' },
    { query: 'führen', expectedPos: 'verb', expectedTrans: 'to lead' },
    { query: 'setzen', expectedPos: 'verb', expectedTrans: 'to set' },
    { query: 'legen', expectedPos: 'verb', expectedTrans: 'to lay' },
    { query: 'ziehen', expectedPos: 'verb', expectedTrans: 'to pull' },
    { query: 'zog', expectedLemma: 'ziehen', expectedTrans: 'to pull' },
    { query: 'gezogen', expectedLemma: 'ziehen', expectedTrans: 'to pull' },
    { query: 'gelten', expectedPos: 'verb', expectedTrans: 'to apply' },
    { query: 'gilt', expectedLemma: 'gelten', expectedTrans: 'to apply' },
    { query: 'scheinen', expectedPos: 'verb', expectedTrans: 'to shine' },
    { query: 'schien', expectedLemma: 'scheinen', expectedTrans: 'to shine' },
    { query: 'tragen', expectedPos: 'verb', expectedTrans: 'to wear' },
    { query: 'trägt', expectedLemma: 'tragen', expectedTrans: 'to wear' },
    { query: 'getragen', expectedLemma: 'tragen', expectedTrans: 'to wear' },
    { query: 'schließen', expectedPos: 'verb', expectedTrans: 'to close' },
    { query: 'schloss', expectedLemma: 'Schloss / schließen', expectedTrans: 'close' },
    { query: 'geschlossen', expectedLemma: 'schließen', expectedTrans: 'to close' },
    { query: 'fallen', expectedPos: 'verb', expectedTrans: 'to fall' },
    { query: 'fällt', expectedLemma: 'fallen', expectedTrans: 'to fall' },

    // Separable verbs and inflected forms
    { query: 'mitnehmen', expectedPos: 'verb', expectedTrans: 'to take along' },
    { query: 'mitgenommen', expectedLemma: 'mitnehmen', expectedTrans: 'to take along' },
    { query: 'anfangen', expectedPos: 'verb', expectedTrans: 'to begin' },
    { query: 'angefangen', expectedLemma: 'anfangen', expectedTrans: 'to begin' },
    { query: 'aussehen', expectedPos: 'verb', expectedTrans: 'to look' },
    { query: 'ausgesehen', expectedLemma: 'aussehen', expectedTrans: 'to look' },
    { query: 'ankommen', expectedPos: 'verb', expectedTrans: 'to arrive' },
    { query: 'angekommen', expectedLemma: 'ankommen', expectedTrans: 'to arrive' },
    { query: 'anrufen', expectedPos: 'verb', expectedTrans: 'to call' },
    { query: 'angerufen', expectedLemma: 'anrufen', expectedTrans: 'to call' },
    { query: 'aufpassen', expectedPos: 'verb', expectedTrans: 'to pay attention' },
    { query: 'aufgepasst', expectedLemma: 'aufpassen', expectedTrans: 'to pay attention' },
    { query: 'aufmachen', expectedPos: 'verb', expectedTrans: 'to open' },
    { query: 'aufgemacht', expectedLemma: 'aufmachen', expectedTrans: 'to open' },
    { query: 'zumachen', expectedPos: 'verb', expectedTrans: 'to close' },
    { query: 'zugemacht', expectedLemma: 'zumachen', expectedTrans: 'to close' },
    { query: 'vorbereiten', expectedPos: 'verb', expectedTrans: 'to prepare' },
    { query: 'mitbringen', expectedPos: 'verb', expectedTrans: 'to bring along' },
    { query: 'mitgebracht', expectedLemma: 'mitbringen', expectedTrans: 'to bring along' },
    { query: 'mitkommen', expectedPos: 'verb', expectedTrans: 'to come along' },
    { query: 'mitgekommen', expectedLemma: 'mitkommen', expectedTrans: 'to come along' },
    { query: 'abholen', expectedPos: 'verb', expectedTrans: 'to pick up' },
    { query: 'abgeholt', expectedLemma: 'abholen', expectedTrans: 'to pick up' },
    { query: 'einladen', expectedPos: 'verb', expectedTrans: 'to invite' },
    { query: 'eingeladen', expectedLemma: 'einladen', expectedTrans: 'to invite' },
    { query: 'einsteigen', expectedPos: 'verb', expectedTrans: 'to get in' },
    { query: 'eingestiegen', expectedLemma: 'einsteigen', expectedTrans: 'to get in' },
    { query: 'aussteigen', expectedPos: 'verb', expectedTrans: 'to get off' },
    { query: 'ausgestiegen', expectedLemma: 'aussteigen', expectedTrans: 'to get off' },
    { query: 'abfahren', expectedPos: 'verb', expectedTrans: 'to depart' },
    { query: 'abgefahren', expectedLemma: 'abfahren', expectedTrans: 'to depart' },

    // Adjective
    { query: 'weit', expectedPos: 'adj', expectedTrans: 'far' },
    { query: 'weiter', expectedPos: 'adv/adj', expectedTrans: 'further' },
    { query: 'weitesten', expectedLemma: 'weit', expectedTrans: 'far' }
  ];

  for (const tc of phase10Checks) {
    const res = await pilotProvider.lookup(tc.query, 'de', 'en');
    if (!res) {
      throw new Error(`Phase 10 lookup failed for "${tc.query}"`);
    }
    if (tc.expectedPos && res.partOfSpeech !== tc.expectedPos) {
      throw new Error(`POS mismatch for "${tc.query}": expected ${tc.expectedPos}, got ${res.partOfSpeech}`);
    }
    if (tc.expectedLemma && res.lemma !== tc.expectedLemma) {
      throw new Error(`Lemma mismatch for "${tc.query}": expected ${tc.expectedLemma}, got ${res.lemma}`);
    }
    if (tc.expectedTrans && !res.translations.some(t => t.toLowerCase().includes(tc.expectedTrans.toLowerCase()))) {
      throw new Error(`Translation mismatch for "${tc.query}": expected to include "${tc.expectedTrans}", got [${res.translations.join(', ')}]`);
    }
    console.log(`  ✓ "${tc.query}" -> [${res.partOfSpeech || 'inflection'}] ${res.lemma ? '(lemma: ' + res.lemma + ') ' : ''}[${res.translations.slice(0, 2).join(', ')}]`);
  }
  console.log('  ✓ All Phase 10 core vocabulary lookups passed successfully.\n');

  // Step 12: Phase 11 Linguistic Corrections & Homograph Disambiguation
  console.log('[Check 12] Phase 11 Linguistic Corrections & Homograph Resolution:');
  const phase11Checks = [
    // 1. Negative Determiner (kein) vs Negative Pronoun (keiner)
    { query: 'kein', expectedPos: 'det', expectedTrans: 'no', expectedLemma: undefined },
    { query: 'keiner', expectedPos: 'pron', expectedTrans: 'no one', expectedLemma: undefined },
    { query: 'keine', expectedPos: 'det/pron', expectedTrans: 'no', expectedLemma: 'kein / keiner' },
    { query: 'keinen', expectedPos: 'det/pron', expectedTrans: 'no', expectedLemma: 'kein / keiner' },
    { query: 'keinem', expectedPos: 'det/pron', expectedTrans: 'no', expectedLemma: 'kein / keiner' },
    { query: 'keines', expectedPos: 'det/pron', expectedTrans: 'no', expectedLemma: 'kein / keiner' },
    { query: 'keins', expectedPos: 'pron', expectedTrans: 'no one', expectedLemma: 'keiner' },

    // 2. Multi-sense eigentlich (adv + adj)
    { query: 'eigentlich', expectedPos: 'adv/adj', expectedTrans: 'actually', expectedLemma: undefined },
    { query: 'eigentliche', expectedPos: 'adv/adj', expectedTrans: 'actual', expectedLemma: 'eigentlich' },
    { query: 'eigentlichen', expectedPos: 'adv/adj', expectedTrans: 'actual', expectedLemma: 'eigentlich' },

    // 3. Homograph resolution: Abfahrt (noun) vs abfahrt (verb inflection)
    { query: 'Abfahrt', expectedPos: 'noun', expectedTrans: 'departure', expectedLemma: undefined },
    { query: 'abfahrt', expectedPos: 'noun/verb', expectedTrans: 'departure', expectedLemma: 'Abfahrt / abfahren' },
    { query: 'Abfahrten', expectedPos: 'noun', expectedTrans: 'departure', expectedLemma: 'Abfahrt' },

    // 4. Homograph resolution: Schloss (noun) vs schloss (verb inflection)
    { query: 'Schloss', expectedPos: 'noun', expectedTrans: 'castle', expectedLemma: undefined },
    { query: 'schloss', expectedPos: 'noun/verb', expectedTrans: 'castle', expectedLemma: 'Schloss / schließen' },
    { query: 'Schlösser', expectedPos: 'noun', expectedTrans: 'castle', expectedLemma: 'Schloss' },

    // 5. Homograph resolution: Einstieg (noun) vs einstieg (verb inflection)
    { query: 'Einstieg', expectedPos: 'noun', expectedTrans: 'entry', expectedLemma: undefined },
    { query: 'einstieg', expectedPos: 'noun/verb', expectedTrans: 'entry', expectedLemma: 'Einstieg / einsteigen' },

    // 6. Homograph resolution: Ausstieg (noun) vs ausstieg (verb inflection)
    { query: 'Ausstieg', expectedPos: 'noun', expectedTrans: 'exit', expectedLemma: undefined },
    { query: 'ausstieg', expectedPos: 'noun/verb', expectedTrans: 'exit', expectedLemma: 'Ausstieg / aussteigen' },

    // 7. gefallen (verb: to please) vs fallen (verb: to fall)
    { query: 'gefallen', expectedPos: 'verb', expectedTrans: 'to please', expectedLemma: undefined },
    { query: 'gefällt', expectedPos: 'verb', expectedTrans: 'to please', expectedLemma: 'gefallen' },
    { query: 'fällt', expectedPos: 'verb', expectedTrans: 'to fall', expectedLemma: 'fallen' },

    // 8. weit (adj) vs weiter (adv/adj)
    { query: 'weit', expectedPos: 'adj', expectedTrans: 'far', expectedLemma: undefined },
    { query: 'weiter', expectedPos: 'adv/adj', expectedTrans: 'further', expectedLemma: undefined },
    { query: 'weitere', expectedPos: 'adv/adj', expectedTrans: 'additional', expectedLemma: 'weiter' },
    { query: 'weitesten', expectedPos: 'adj', expectedTrans: 'far', expectedLemma: 'weit' }
  ];

  for (const tc of phase11Checks) {
    const res = await pilotProvider.lookup(tc.query, 'de', 'en');
    if (!res) {
      throw new Error(`Phase 11 lookup failed for "${tc.query}"`);
    }
    if (tc.expectedPos && res.partOfSpeech !== tc.expectedPos) {
      throw new Error(`POS mismatch for "${tc.query}": expected ${tc.expectedPos}, got ${res.partOfSpeech}`);
    }
    if (tc.expectedLemma !== undefined && res.lemma !== tc.expectedLemma) {
      throw new Error(`Lemma mismatch for "${tc.query}": expected "${tc.expectedLemma}", got "${res.lemma}"`);
    }
    if (tc.expectedTrans && !res.translations.some(t => t.toLowerCase().includes(tc.expectedTrans.toLowerCase()))) {
      throw new Error(`Translation mismatch for "${tc.query}": expected to include "${tc.expectedTrans}", got [${res.translations.join(', ')}]`);
    }
    console.log(`  ✓ "${tc.query}" -> [${res.partOfSpeech}] ${res.lemma ? '(lemma: ' + res.lemma + ') ' : ''}[${res.translations.slice(0, 2).join(', ')}]`);
  }
  console.log('  ✓ All Phase 11 linguistic corrections & homograph resolutions verified accurately.\n');

  console.log('===============================================================');
  console.log('🎉 ALL AUTHORED PILOT LOOKUP TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================\n');
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('test-authored-lookups.mjs')) {
  testAuthoredLookups()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal test error:', err);
      process.exit(1);
    });
}
