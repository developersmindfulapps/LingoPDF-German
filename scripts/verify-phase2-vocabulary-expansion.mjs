/**
 * verify-phase2-vocabulary-expansion.mjs
 *
 * Dedicated regression test suite for Dictionary Quality Phase 2: Targeted Vocabulary Expansion.
 *
 * Tests cover:
 * 1. Newly added German grammar terminology (Konjunktiv, Imperativ, Grundform, Stammform, trennbar)
 * 2. Full set of 19 grammar terminology candidates with case-normalization and inflections
 * 3. Audited common A1-A2 vocabulary (verbs, adjectives, adverbs, nouns with gender/plural)
 * 4. Ordinal numbers (erste, zweite, dritte, vierte, fünfte) and inflected forms (ersten, erster, erstes, etc.)
 * 5. Ordinal boundary cases and homograph separation (erst vs. erste, vier vs. vierte, fünf vs. fünfte, etc.)
 * 6. Provider precedence (authored entries take strict priority over legacy)
 * 7. Non-ordinal boundary preservation (no unrestricted suffix stripping on words like Minute, Kälte, bunte)
 * 8. Negative contract (unknown words return null cleanly without guessed translations)
 * 9. OCR recovery and compound decomposition invariance
 */

import { compositeDictionaryProvider, authoredDictionaryProvider, localDictionaryProvider } from '../src/services/dictionary/index.ts';

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

async function run() {
  console.log('=================================================================');
  console.log('  LINGO PDF — PHASE 2 TARGETED VOCABULARY EXPANSION TEST SUITE   ');
  console.log('=================================================================\n');

  await compositeDictionaryProvider.ensureInitialized();

  // ==========================================================================
  // SECTION 1: NEW GRAMMAR TERMINOLOGY (Phase 2 Additions)
  // ==========================================================================
  section('SECTION 1: Newly Added Grammar Terminology');

  const newGrammar = [
    { word: 'Konjunktiv', pos: 'noun', gender: 'm', plural: 'Konjunktive', trans: 'subjunctive', desc: 'Konjunktiv → subjunctive mood (masculine)' },
    { word: 'Imperativ',  pos: 'noun', gender: 'm', plural: 'Imperative',  trans: 'imperative',  desc: 'Imperativ → imperative mood (masculine)' },
    { word: 'Grundform',  pos: 'noun', gender: 'f', plural: 'Grundformen', trans: 'base form',   desc: 'Grundform → base form (feminine)' },
    { word: 'Stammform',  pos: 'noun', gender: 'f', plural: 'Stammformen', trans: 'principal part', desc: 'Stammform → principal part / stem form (feminine)' },
    { word: 'trennbar',   pos: 'adj',  trans: 'separable',  desc: 'trennbar → separable (adjective)' },
  ];

  for (const item of newGrammar) {
    const res = await compositeDictionaryProvider.lookup(item.word, 'de', 'en');
    assert(res !== null, `${item.desc} resolves`, item.word);
    if (res) {
      assert(res.providerId === 'authored', `${item.desc} providerId === "authored"`, res.providerId);
      assert(
        res.translations.some(t => t.toLowerCase().includes(item.trans.toLowerCase())),
        `${item.desc} translation contains "${item.trans}"`,
        JSON.stringify(res.translations)
      );
      assert(res.partOfSpeech?.includes(item.pos), `${item.desc} POS contains "${item.pos}"`, res.partOfSpeech);
      if (item.gender) {
        assert(res.gender === item.gender, `${item.desc} gender === "${item.gender}"`, res.gender);
      }
      if (item.plural) {
        assert(res.plural === item.plural, `${item.desc} plural === "${item.plural}"`, res.plural);
      }
    }
  }

  // Inflected forms of new grammar terms
  const newGrammarInflections = [
    { word: 'konjunktivs',   lemma: 'Konjunktiv', trans: 'subjunctive', desc: 'konjunktivs (genitive) → Konjunktiv' },
    { word: 'Konjunktive',   lemma: 'Konjunktiv', trans: 'subjunctive', desc: 'Konjunktive (plural) → Konjunktiv' },
    { word: 'konjunktiven',  lemma: 'Konjunktiv', trans: 'subjunctive', desc: 'konjunktiven (dative pl) → Konjunktiv' },
    { word: 'imperativs',    lemma: 'Imperativ',  trans: 'imperative',  desc: 'imperativs (genitive) → Imperativ' },
    { word: 'Imperative',    lemma: 'Imperativ',  trans: 'imperative',  desc: 'Imperative (plural) → Imperativ' },
    { word: 'imperativen',   lemma: 'Imperativ',  trans: 'imperative',  desc: 'imperativen (dative pl) → Imperativ' },
    { word: 'grundformen',   lemma: 'Grundform',  trans: 'base form',   desc: 'grundformen (plural) → Grundform' },
    { word: 'stammformen',   lemma: 'Stammform',  trans: 'principal part', desc: 'stammformen (plural) → Stammform' },
    { word: 'trennbare',     lemma: 'trennbar',   trans: 'separable',   desc: 'trennbare (fem/plur adj) → trennbar' },
    { word: 'trennbaren',    lemma: 'trennbar',   trans: 'separable',   desc: 'trennbaren (acc/dat adj) → trennbar' },
    { word: 'trennbarer',    lemma: 'trennbar',   trans: 'separable',   desc: 'trennbarer (masc/gen adj) → trennbar' },
    { word: 'trennbares',    lemma: 'trennbar',   trans: 'separable',   desc: 'trennbares (neut adj) → trennbar' },
    { word: 'Trennbar',      lemma: 'trennbar',   trans: 'separable',   desc: 'Trennbar (capitalized) → trennbar' },
  ];

  for (const item of newGrammarInflections) {
    const res = await compositeDictionaryProvider.lookup(item.word, 'de', 'en');
    assert(res !== null, `${item.desc} resolves`, item.word);
    if (res) {
      assert(res.lemma === item.lemma, `${item.desc} lemma === "${item.lemma}"`, `got: ${res.lemma}`);
      assert(
        res.translations.some(t => t.toLowerCase().includes(item.trans.toLowerCase())),
        `${item.desc} translation contains "${item.trans}"`,
        JSON.stringify(res.translations)
      );
    }
  }

  // ==========================================================================
  // SECTION 2: COMPLETE AUDITED GRAMMAR CANDIDATE INVENTORY (all 19)
  // ==========================================================================
  section('SECTION 2: Full 19 Grammar Candidates Regression');

  const allGrammarTerms = [
    'Adjektiv', 'Infinitiv', 'Konjunktiv', 'Imperativ', 'Partizip',
    'Komparativ', 'Superlativ', 'Präteritum', 'Futur', 'Singular',
    'Fragesatz', 'Hilfsverb', 'Lektion', 'Genitiv', 'Maskulinum',
    'Femininum', 'trennbar', 'Grundform', 'Stammform'
  ];

  for (const term of allGrammarTerms) {
    const res = await compositeDictionaryProvider.lookup(term, 'de', 'en');
    assert(res !== null, `Grammar candidate "${term}" resolves`, term);
    assert(res?.providerId === 'authored', `"${term}" comes from authored provider`, res?.providerId);
  }

  // Verify fixed Superlativ inflection (superlativen)
  const superlativen = await compositeDictionaryProvider.lookup('superlativen', 'de', 'en');
  assert(superlativen !== null && superlativen.lemma === 'Superlativ', 'superlativen resolves to lemma Superlativ', superlativen?.lemma);

  // ==========================================================================
  // SECTION 3: COMMON A1-A2 VOCABULARY AUDIT
  // ==========================================================================
  section('SECTION 3: Common A1–A2 Vocabulary Audit');

  const a1a2List = [
    { word: 'schlafen',     pos: 'verb', trans: 'sleep',     desc: 'schlafen (verb) → sleep' },
    { word: 'hungrig',      pos: 'adj',  trans: 'hungry',    desc: 'hungrig (adj) → hungry' },
    { word: 'gesund',       pos: 'adj',  trans: 'healthy',   desc: 'gesund (adj) → healthy' },
    { word: 'jung',         pos: 'adj',  trans: 'young',     desc: 'jung (adj) → young' },
    { word: 'laut',         pos: 'adj',  trans: 'loud',      desc: 'laut (adj) → loud' },
    { word: 'leise',        pos: 'adj',  trans: 'quiet',     desc: 'leise (adj) → quiet' },
    { word: 'teuer',        pos: 'adj',  trans: 'expensive', desc: 'teuer (adj) → expensive' },
    { word: 'billig',       pos: 'adj',  trans: 'cheap',     desc: 'billig (adj) → cheap' },
    { word: 'leicht',       pos: 'adj',  trans: 'easy',      desc: 'leicht (adj) → easy/light' },
    { word: 'heiß',         pos: 'adj',  trans: 'hot',       desc: 'heiß (adj) → hot' },
    { word: 'manchmal',     pos: 'adv',  trans: 'sometimes', desc: 'manchmal (adv) → sometimes' },
    { word: 'Minute',       pos: 'noun', gender: 'f', plural: 'Minuten',      trans: 'minute',     desc: 'Minute (f) → minute' },
    { word: 'Universität',  pos: 'noun', gender: 'f', plural: 'Universitäten',trans: 'university', desc: 'Universität (f) → university' },
    { word: 'Café',         pos: 'noun', gender: 'n', plural: 'Cafés',        trans: 'café',       desc: 'Café (n) → café' },
    { word: 'Laden',        pos: 'noun', gender: 'm', plural: 'Läden',        trans: 'shop',       desc: 'Laden (m) → shop' },
    { word: 'Weg',          pos: 'noun', gender: 'm', plural: 'Wege',         trans: 'way',        desc: 'Weg (m) → way/path' },
    { word: 'Bahn',         pos: 'noun', gender: 'f', plural: 'Bahnen',       trans: 'train',      desc: 'Bahn (f) → train/railway' },
    { word: 'Wohnung',      pos: 'noun', gender: 'f', plural: 'Wohnungen',    trans: 'apartment',  desc: 'Wohnung (f) → apartment' },
    { word: 'Energie',      pos: 'noun', gender: 'f', plural: 'Energien',     trans: 'energy',     desc: 'Energie (f) → energy' },
    { word: 'Schutz',       pos: 'noun', gender: 'm',                         trans: 'protection', desc: 'Schutz (m) → protection' },
    { word: 'Gesundheit',   pos: 'noun', gender: 'f',                         trans: 'health',     desc: 'Gesundheit (f) → health' },
    { word: 'Traum',        pos: 'noun', gender: 'm', plural: 'Träume',       trans: 'dream',      desc: 'Traum (m) → dream' },
    { word: 'Rahmen',       pos: 'noun', gender: 'm', plural: 'Rahmen',       trans: 'frame',      desc: 'Rahmen (m) → frame' },
  ];

  for (const item of a1a2List) {
    const res = await compositeDictionaryProvider.lookup(item.word, 'de', 'en');
    assert(res !== null, `${item.desc} resolves`, item.word);
    if (res) {
      assert(res.providerId === 'authored', `${item.desc} from authored provider`, res.providerId);
      assert(
        res.translations.some(t => t.toLowerCase().includes(item.trans.toLowerCase())),
        `${item.desc} translation contains "${item.trans}"`,
        JSON.stringify(res.translations)
      );
      if (item.gender) {
        assert(res.gender === item.gender, `${item.desc} gender === "${item.gender}"`, res.gender);
      }
      if (item.plural) {
        assert(res.plural === item.plural, `${item.desc} plural === "${item.plural}"`, res.plural);
      }
    }
  }

  // ==========================================================================
  // SECTION 4: ORDINAL NUMBERS AND INFLECTIONS
  // ==========================================================================
  section('SECTION 4: Ordinal Numbers and Inflected Forms');

  const ordinals = [
    // Lemma forms
    { query: 'erste',  expectedLemma: undefined, expectedTrans: 'first',  desc: 'erste (lemma) → first' },
    { query: 'zweite', expectedLemma: undefined, expectedTrans: 'second', desc: 'zweite (lemma) → second' },
    { query: 'dritte', expectedLemma: undefined, expectedTrans: 'third',  desc: 'dritte (lemma) → third' },
    { query: 'vierte', expectedLemma: undefined, expectedTrans: 'fourth', desc: 'vierte (lemma) → fourth' },
    { query: 'fünfte', expectedLemma: undefined, expectedTrans: 'fifth',  desc: 'fünfte (lemma) → fifth' },
    { query: 'sechste',expectedLemma: undefined, expectedTrans: 'sixth',  desc: 'sechste (lemma) → sixth' },
    { query: 'siebte', expectedLemma: undefined, expectedTrans: 'seventh',desc: 'siebte (lemma) → seventh' },
    { query: 'achte',  expectedLemma: undefined, expectedTrans: 'eighth', desc: 'achte (lemma) → eighth' },
    { query: 'neunte', expectedLemma: undefined, expectedTrans: 'ninth',  desc: 'neunte (lemma) → ninth' },
    { query: 'zehnte', expectedLemma: undefined, expectedTrans: 'tenth',  desc: 'zehnte (lemma) → tenth' },

    // Inflected forms of erste
    { query: 'ersten', expectedLemma: 'erste', expectedTrans: 'first', desc: 'ersten (oblique) → lemma: erste' },
    { query: 'erster', expectedLemma: 'erste', expectedTrans: 'first', desc: 'erster (masc/gen) → lemma: erste' },
    { query: 'erstes', expectedLemma: 'erste', expectedTrans: 'first', desc: 'erstes (neuter) → lemma: erste' },
    { query: 'erstem', expectedLemma: 'erste', expectedTrans: 'first', desc: 'erstem (dative) → lemma: erste' },

    // Inflected forms of zweite
    { query: 'zweiten', expectedLemma: 'zweite', expectedTrans: 'second', desc: 'zweiten (oblique) → lemma: zweite' },
    { query: 'zweiter', expectedLemma: 'zweite', expectedTrans: 'second', desc: 'zweiter (masc/gen) → lemma: zweite' },
    { query: 'zweites', expectedLemma: 'zweite', expectedTrans: 'second', desc: 'zweites (neuter) → lemma: zweite' },
    { query: 'zweitem', expectedLemma: 'zweite', expectedTrans: 'second', desc: 'zweitem (dative) → lemma: zweite' },

    // Inflected forms of dritte
    { query: 'dritten', expectedLemma: 'dritte', expectedTrans: 'third', desc: 'dritten (oblique) → lemma: dritte' },
    { query: 'dritter', expectedLemma: 'dritte', expectedTrans: 'third', desc: 'dritter (masc/gen) → lemma: dritte' },
    { query: 'drittes', expectedLemma: 'dritte', expectedTrans: 'third', desc: 'drittes (neuter) → lemma: dritte' },
    { query: 'drittem', expectedLemma: 'dritte', expectedTrans: 'third', desc: 'drittem (dative) → lemma: dritte' },

    // Inflected forms of vierte
    { query: 'vierten', expectedLemma: 'vierte', expectedTrans: 'fourth', desc: 'vierten (oblique) → lemma: vierte' },
    { query: 'vierter', expectedLemma: 'vierte', expectedTrans: 'fourth', desc: 'vierter (masc/gen) → lemma: vierte' },
    { query: 'viertes', expectedLemma: 'vierte', expectedTrans: 'fourth', desc: 'viertes (neuter) → lemma: vierte' },
    { query: 'viertem', expectedLemma: 'vierte', expectedTrans: 'fourth', desc: 'viertem (dative) → lemma: vierte' },

    // Inflected forms of fünfte
    { query: 'fünften', expectedLemma: 'fünfte', expectedTrans: 'fifth', desc: 'fünften (oblique) → lemma: fünfte' },
    { query: 'fünfter', expectedLemma: 'fünfte', expectedTrans: 'fifth', desc: 'fünfter (masc/gen) → lemma: fünfte' },
    { query: 'fünftes', expectedLemma: 'fünfte', expectedTrans: 'fifth', desc: 'fünftes (neuter) → lemma: fünfte' },
    { query: 'fünftem', expectedLemma: 'fünfte', expectedTrans: 'fifth', desc: 'fünftem (dative) → lemma: fünfte' },

    // Capitalized sentence-initial forms
    { query: 'Erste',  expectedLemma: 'erste', expectedTrans: 'first', desc: 'Erste (capitalized) → lemma: erste' },
    { query: 'Ersten', expectedLemma: 'erste', expectedTrans: 'first', desc: 'Ersten (capitalized) → lemma: erste' },
    { query: 'Erster', expectedLemma: 'erste', expectedTrans: 'first', desc: 'Erster (capitalized) → lemma: erste' },
    { query: 'Erstes', expectedLemma: 'erste', expectedTrans: 'first', desc: 'Erstes (capitalized) → lemma: erste' },
    { query: 'Zweite', expectedLemma: 'zweite', expectedTrans: 'second', desc: 'Zweite (capitalized) → lemma: zweite' },
    { query: 'Zweiten',expectedLemma: 'zweite', expectedTrans: 'second', desc: 'Zweiten (capitalized) → lemma: zweite' },
    { query: 'Zweiter',expectedLemma: 'zweite', expectedTrans: 'second', desc: 'Zweiter (capitalized) → lemma: zweite' },
    { query: 'Dritte', expectedLemma: 'dritte', expectedTrans: 'third', desc: 'Dritte (capitalized) → lemma: dritte' },
    { query: 'Dritten',expectedLemma: 'dritte', expectedTrans: 'third', desc: 'Dritten (capitalized) → lemma: dritte' },
    { query: 'Vierte', expectedLemma: 'vierte', expectedTrans: 'fourth', desc: 'Vierte (capitalized) → lemma: vierte' },
    { query: 'Vierten',expectedLemma: 'vierte', expectedTrans: 'fourth', desc: 'Vierten (capitalized) → lemma: vierte' },
    { query: 'Fünfte', expectedLemma: 'fünfte', expectedTrans: 'fifth', desc: 'Fünfte (capitalized) → lemma: fünfte' },
    { query: 'Fünften',expectedLemma: 'fünfte', expectedTrans: 'fifth', desc: 'Fünften (capitalized) → lemma: fünfte' },
  ];

  for (const item of ordinals) {
    const res = await compositeDictionaryProvider.lookup(item.query, 'de', 'en');
    assert(res !== null, `${item.desc} resolves`, item.query);
    if (res) {
      assert(res.providerId === 'authored', `${item.desc} providerId === "authored"`, res.providerId);
      assert(
        res.translations.some(t => t.toLowerCase().includes(item.expectedTrans.toLowerCase())),
        `${item.desc} translation contains "${item.expectedTrans}"`,
        JSON.stringify(res.translations)
      );
      if (item.expectedLemma !== undefined) {
        assert(res.lemma === item.expectedLemma, `${item.desc} lemma === "${item.expectedLemma}"`, `got: ${res.lemma}`);
      } else {
        assert(!res.lemma || res.lemma === item.query, `${item.desc} lemma is citation form`, res.lemma);
      }
    }
  }

  // ==========================================================================
  // SECTION 5: AMBIGUOUS BOUNDARY CASES & HOMOGRAPHS
  // ==========================================================================
  section('SECTION 5: Ambiguous Boundary Cases and Homograph Disambiguation');

  // Boundary 1: Adverb "erst" vs. Ordinal "erste"
  const erstAdv = await compositeDictionaryProvider.lookup('erst', 'de', 'en');
  const ersteNum = await compositeDictionaryProvider.lookup('erste', 'de', 'en');
  assert(erstAdv !== null, 'erst (adverb) resolves', 'erst');
  assert(erstAdv?.partOfSpeech?.includes('adv'), 'erst is POS "adv"', erstAdv?.partOfSpeech);
  assert(
    erstAdv?.translations.some(t => t === 'only' || t === 'not until'),
    'erst translations include "only" or "not until"',
    JSON.stringify(erstAdv?.translations)
  );
  assert(ersteNum !== null, 'erste (numeral) resolves', 'erste');
  assert(
    !ersteNum?.translations.some(t => t === 'only' || t === 'not until'),
    'erste translations must NOT contain adverb meanings "only" or "not until"',
    JSON.stringify(ersteNum?.translations)
  );

  // Boundary 2: Cardinals vs. Ordinals
  const vier = await compositeDictionaryProvider.lookup('vier', 'de', 'en');
  const vierte = await compositeDictionaryProvider.lookup('vierte', 'de', 'en');
  assert(vier?.translations.some(t => t.toLowerCase() === 'four'), 'vier translates as cardinal "four"', JSON.stringify(vier?.translations));
  assert(vierte?.translations.some(t => t.toLowerCase() === 'fourth'), 'vierte translates as ordinal "fourth"', JSON.stringify(vierte?.translations));

  const fünf = await compositeDictionaryProvider.lookup('fünf', 'de', 'en');
  const fünfte = await compositeDictionaryProvider.lookup('fünfte', 'de', 'en');
  assert(fünf?.translations.some(t => t.toLowerCase() === 'five'), 'fünf translates as cardinal "five"', JSON.stringify(fünf?.translations));
  assert(fünfte?.translations.some(t => t.toLowerCase() === 'fifth'), 'fünfte translates as ordinal "fifth"', JSON.stringify(fünfte?.translations));

  const acht = await compositeDictionaryProvider.lookup('acht', 'de', 'en');
  const achte = await compositeDictionaryProvider.lookup('achte', 'de', 'en');
  assert(acht?.translations.some(t => t.toLowerCase() === 'eight'), 'acht translates as cardinal "eight"', JSON.stringify(acht?.translations));
  assert(achte?.translations.some(t => t.toLowerCase() === 'eighth'), 'achte translates as ordinal "eighth"', JSON.stringify(achte?.translations));

  // Boundary 3: Legacy precedence override
  // In legacy, "erster" was noun "winner", "zweiter" was noun "runner-up"
  const erster = await compositeDictionaryProvider.lookup('erster', 'de', 'en');
  const zweiter = await compositeDictionaryProvider.lookup('zweiter', 'de', 'en');
  assert(erster?.providerId === 'authored', 'erster is resolved by authored provider', erster?.providerId);
  assert(erster?.translations.some(t => t.toLowerCase().includes('first')), 'erster translates as "first" (not winner)', JSON.stringify(erster?.translations));
  assert(zweiter?.providerId === 'authored', 'zweiter is resolved by authored provider', zweiter?.providerId);
  assert(zweiter?.translations.some(t => t.toLowerCase().includes('second')), 'zweiter translates as "second" (not runner-up)', JSON.stringify(zweiter?.translations));

  // Boundary 4: Non-ordinal words ending in -te / -ten must NOT be corrupted
  const minute = await compositeDictionaryProvider.lookup('Minute', 'de', 'en');
  assert(minute?.translations.some(t => t.includes('minute')), 'Minute resolves to "minute" (not stripped)', JSON.stringify(minute?.translations));
  const minuten = await compositeDictionaryProvider.lookup('Minuten', 'de', 'en');
  assert(minuten?.lemma === 'Minute', 'Minuten resolves to lemma Minute', minuten?.lemma);

  // Boundary 5: Noun vs. Adverb / Homographs
  const morgen = await compositeDictionaryProvider.lookup('morgen', 'de', 'en');
  const Morgen = await compositeDictionaryProvider.lookup('Morgen', 'de', 'en');
  assert(morgen?.partOfSpeech?.includes('adv'), 'morgen (lowercase) is adverb', morgen?.partOfSpeech);
  assert(Morgen?.partOfSpeech?.includes('noun'), 'Morgen (capitalized) is noun', Morgen?.partOfSpeech);

  const sie = await compositeDictionaryProvider.lookup('sie', 'de', 'en');
  const Sie = await compositeDictionaryProvider.lookup('Sie', 'de', 'en');
  assert(!sie?.translations.some(t => t.includes('formal')), 'sie does not contain formal you', JSON.stringify(sie?.translations));
  assert(Sie?.translations.some(t => t.includes('formal')), 'Sie contains formal you', JSON.stringify(Sie?.translations));

  // ==========================================================================
  // SECTION 6: NEGATIVE CONTRACT (Unknown Words Return null)
  // ==========================================================================
  section('SECTION 6: Unknown Words Return null');

  const unknownWords = [
    'xyzqwert123',
    'nonexistentwordblahnein',
    'Meldebescheinigung',
    'Fahrkartenentwerter',
    'Kaffeerösterei',
    'erstensunbekanntxyz',
  ];

  for (const word of unknownWords) {
    const res = await compositeDictionaryProvider.lookup(word, 'de', 'en');
    assert(res === null, `Unknown word "${word}" returns null cleanly`, word);
  }

  // ==========================================================================
  // SECTION 7: COMPOUND DECOMPOSITION & OCR RECOVERY INVARIANCE
  // ==========================================================================
  section('SECTION 7: Compound & OCR Invariance');

  const compRes = await compositeDictionaryProvider.lookup('Lieblingsmusik', 'de', 'en');
  assert(compRes !== null && compRes.translations.some(t => t.includes('favorite music')), 'Lieblingsmusik compound resolves', JSON.stringify(compRes?.translations));

  const ocrRes = await compositeDictionaryProvider.lookup('Modatverben', 'de', 'en');
  assert(ocrRes !== null && ocrRes.source === 'ocr-correction', 'Modatverben OCR correction resolves', ocrRes?.source);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n=================================================================');
  console.log(`  PHASE 2 RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=================================================================');

  if (failures.length > 0) {
    console.log('\n✗ FAILURES:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.label}${f.context ? ' :: ' + f.context : ''}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL PHASE 2 VOCABULARY EXPANSION TESTS PASSED SUCCESSFULLY!');
  }
}

run().catch(err => {
  console.error('\n✗ UNHANDLED ERROR:', err.message);
  process.exit(1);
});
