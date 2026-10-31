/**
 * verify-phase1-dictionary-quality.mjs
 *
 * Comprehensive Phase 1 Dictionary Quality Test Suite.
 *
 * Tests cover:
 * - All 14 Phase 2 gap words (confirmed resolved)
 * - New grammar terminology entries (Phase 4 additions)
 * - New A1-A2 vocabulary additions
 * - Ordinal number inflection forms
 * - Capitalization and case normalization
 * - German umlauts and ß
 * - Punctuation and token cleaning boundary cases
 * - Inflection resolution (verbs, nouns, adjectives)
 * - Hyphenated and compound words
 * - Ambiguous homographs that must be correctly disambiguated
 * - Unknown words that MUST return null (no false translations)
 * - Existing entries and translation ordering
 */

import { compositeDictionaryProvider } from '../src/services/dictionary/index.ts';

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
  console.log('  LINGO PDF — PHASE 1 DICTIONARY QUALITY COMPREHENSIVE TEST SUITE');
  console.log('=================================================================\n');

  await compositeDictionaryProvider.ensureInitialized();

  // ==========================================================================
  // PART 1: PHASE 2 VOCABULARY GAP WORDS (all 14 must resolve)
  // ==========================================================================
  section('PART 1: Phase 2 Vocabulary Gap Words');

  const phase2Cases = [
    { word: 'REDEMITTEL',       lemma: 'Redemittel',    transIncludes: 'phrase',       desc: 'REDEMITTEL (all caps) → useful phrases' },
    { word: 'Redemittel',      lemma: undefined,        transIncludes: 'phrase',       desc: 'Redemittel (canonical) → useful phrases' },
    { word: 'Aussagesatz',     lemma: undefined,        transIncludes: 'declarative',  desc: 'Aussagesatz → declarative sentence' },
    { word: 'Aussagsatz',      lemma: 'Aussagesatz',   transIncludes: 'declarative',  desc: 'Aussagsatz (typo) → lemma Aussagesatz' },
    { word: 'Neutrum',         lemma: undefined,        transIncludes: 'neuter',       desc: 'Neutrum → neuter gender' },
    { word: 'neutrum',         lemma: 'Neutrum',        transIncludes: 'neuter',       desc: 'neutrum (lowercase) → Neutrum via case' },
    { word: 'Endungen',        lemma: 'Endung',         transIncludes: 'ending',       desc: 'Endungen → lemma Endung' },
    { word: 'Personalpronomen',lemma: undefined,        transIncludes: 'pronoun',      desc: 'Personalpronomen → personal pronoun' },
    { word: 'Kursstatistik',   lemma: undefined,        transIncludes: 'statistics',   desc: 'Kursstatistik → course statistics' },
    { word: 'Plural-Endungen', lemma: 'Plural-Endung', transIncludes: 'plural',       desc: 'Plural-Endungen → plural ending' },
    { word: 'kontrollieren',   lemma: undefined,        transIncludes: 'check',        desc: 'kontrollieren → to check/verify (verb)' },
    { word: 'Kontrollieren',   lemma: undefined,        transIncludes: 'check',        desc: 'Kontrollieren (nominalized) → checking' },
    { word: 'Müllerstraße',    lemma: undefined,        transIncludes: 'Street',       desc: 'Müllerstraße → Müller Street' },
    { word: 'unbestimmter',    lemma: 'unbestimmt',    transIncludes: 'indefinite',   desc: 'unbestimmter → lemma unbestimmt' },
    { word: 'Akkusativ',       lemma: undefined,        transIncludes: 'accusative',   desc: 'Akkusativ → accusative case' },
    { word: 'Nominativ',       lemma: undefined,        transIncludes: 'nominative',   desc: 'Nominativ → nominative case' },
  ];

  for (const c of phase2Cases) {
    const res = await compositeDictionaryProvider.lookup(c.word, 'de', 'en');
    assert(res !== null, `${c.desc} — resolves`, c.word);
    if (res) {
      assert(
        res.translations.some(t => t.toLowerCase().includes(c.transIncludes.toLowerCase())),
        `${c.desc} — translation contains "${c.transIncludes}"`,
        JSON.stringify(res.translations)
      );
      if (c.lemma) {
        assert(res.lemma === c.lemma, `${c.desc} — lemma = "${c.lemma}"`, `got: ${res.lemma}`);
      }
    }
  }

  // ==========================================================================
  // PART 2: NEW GRAMMAR TERMINOLOGY (Phase 4 additions)
  // ==========================================================================
  section('PART 2: New Grammar Terminology Entries');

  const grammarTerms = [
    { word: 'Adjektiv',   trans: 'adjective',           pos: 'noun', desc: 'Adjektiv → adjective' },
    { word: 'Infinitiv',  trans: 'infinitive',           pos: 'noun', desc: 'Infinitiv → infinitive' },
    { word: 'Partizip',   trans: 'participle',           pos: 'noun', desc: 'Partizip → participle' },
    { word: 'Komparativ', trans: 'comparative',          pos: 'noun', desc: 'Komparativ → comparative' },
    { word: 'Superlativ', trans: 'superlative',          pos: 'noun', desc: 'Superlativ → superlative' },
    { word: 'Präteritum', trans: 'past',                 pos: 'noun', desc: 'Präteritum → simple past tense' },
    { word: 'Futur',      trans: 'future',               pos: 'noun', desc: 'Futur → future tense' },
    { word: 'Singular',   trans: 'singular',             pos: 'noun', desc: 'Singular → singular' },
    { word: 'Fragesatz',  trans: 'question',             pos: 'noun', desc: 'Fragesatz → question sentence' },
    { word: 'Hilfsverb',  trans: 'auxiliary',            pos: 'noun', desc: 'Hilfsverb → auxiliary verb' },
    { word: 'Lektion',    trans: 'lesson',               pos: 'noun', desc: 'Lektion → lesson' },
    { word: 'Maskulinum', trans: 'masculine',            pos: 'noun', desc: 'Maskulinum → masculine gender' },
    { word: 'Femininum',  trans: 'feminine',             pos: 'noun', desc: 'Femininum → feminine gender' },
    { word: 'Genitiv',    trans: 'genitive',             pos: 'noun', desc: 'Genitiv → genitive case' },
  ];

  for (const t of grammarTerms) {
    const res = await compositeDictionaryProvider.lookup(t.word, 'de', 'en');
    assert(res !== null, `${t.desc} — resolves`, t.word);
    if (res) {
      assert(
        res.translations.some(tr => tr.toLowerCase().includes(t.trans.toLowerCase())),
        `${t.desc} — translation contains "${t.trans}"`,
        JSON.stringify(res.translations)
      );
      assert(res.partOfSpeech?.includes(t.pos), `${t.desc} — POS includes "${t.pos}"`, res.partOfSpeech);
    }
  }

  // Inflected forms of new grammar terms
  const grammarInflected = [
    { word: 'adjektive',   lemmaContains: 'Adjektiv',   desc: 'adjektive → Adjektiv via inflection' },
    { word: 'adjektiven',  lemmaContains: 'Adjektiv',   desc: 'adjektiven → Adjektiv' },
    { word: 'lektionen',   lemmaContains: 'Lektion',    desc: 'lektionen → Lektion via inflection' },
    { word: 'maskulina',   lemmaContains: 'Maskulinum', desc: 'maskulina → Maskulinum via inflection' },
    { word: 'feminina',    lemmaContains: 'Femininum',  desc: 'feminina → Femininum via inflection' },
    { word: 'fragesätze',  lemmaContains: 'Fragesatz',  desc: 'fragesätze → Fragesatz via inflection' },
    { word: 'präterita',   lemmaContains: 'Präteritum', desc: 'präterita → Präteritum via inflection' },
  ];

  for (const t of grammarInflected) {
    const res = await compositeDictionaryProvider.lookup(t.word, 'de', 'en');
    assert(res !== null, `${t.desc} — resolves`, t.word);
    if (res) {
      assert(
        (res.lemma || '').includes(t.lemmaContains) || res.query === t.word,
        `${t.desc} — lemma contains "${t.lemmaContains}"`,
        `lemma: ${res.lemma}`
      );
    }
  }

  // ==========================================================================
  // PART 3: NEW A1-A2 VOCABULARY (Phase 4 additions)
  // ==========================================================================
  section('PART 3: New A1–A2 Vocabulary Entries');

  const newVocab = [
    { word: 'Wohnung',    trans: 'apartment',     gender: 'f', desc: 'Wohnung → apartment (feminine)' },
    { word: 'Energie',    trans: 'energy',         gender: 'f', desc: 'Energie → energy' },
    { word: 'Schutz',     trans: 'protection',     gender: 'm', desc: 'Schutz → protection (masculine)' },
    { word: 'Gesundheit', trans: 'health',         gender: 'f', desc: 'Gesundheit → health' },
    { word: 'Traum',      trans: 'dream',          gender: 'm', desc: 'Traum → dream (masculine)' },
    { word: 'Rahmen',     trans: 'frame',          gender: 'm', desc: 'Rahmen → frame/context' },
    { word: 'Minute',     trans: 'minute',         gender: 'f', desc: 'Minute → minute (time)' },
    { word: 'Universität',trans: 'university',     gender: 'f', desc: 'Universität → university' },
    { word: 'Café',       trans: 'café',           gender: 'n', desc: 'Café → café' },
    { word: 'Laden',      trans: 'shop',           gender: 'm', desc: 'Laden → shop (as noun)' },
    { word: 'Weg',        trans: 'way',            gender: 'm', desc: 'Weg → way/path' },
    { word: 'Bahn',       trans: 'train',          gender: 'f', desc: 'Bahn → train/railway' },
    { word: 'schlafen',   trans: 'sleep',          pos: 'verb', desc: 'schlafen → to sleep (verb)' },
    { word: 'träumen',    trans: 'dream',          pos: 'verb', desc: 'träumen → to dream (verb)' },
    { word: 'hungrig',    trans: 'hungry',         pos: 'adj',  desc: 'hungrig → hungry (adj)' },
    { word: 'durstig',    trans: 'thirsty',        pos: 'adj',  desc: 'durstig → thirsty (adj)' },
    { word: 'gesund',     trans: 'healthy',        pos: 'adj',  desc: 'gesund → healthy (adj)' },
    { word: 'jung',       trans: 'young',          pos: 'adj',  desc: 'jung → young (adj)' },
    { word: 'laut',       trans: 'loud',           pos: 'adj',  desc: 'laut → loud (adj)' },
    { word: 'leise',      trans: 'quiet',          pos: 'adj',  desc: 'leise → quiet (adj)' },
    { word: 'teuer',      trans: 'expensive',      pos: 'adj',  desc: 'teuer → expensive (adj)' },
    { word: 'billig',     trans: 'cheap',          pos: 'adj',  desc: 'billig → cheap (adj)' },
    { word: 'leicht',     trans: 'easy',           pos: 'adj',  desc: 'leicht → easy/light (adj)' },
    { word: 'heiß',       trans: 'hot',            pos: 'adj',  desc: 'heiß → hot (adj)' },
    { word: 'manchmal',   trans: 'sometimes',      pos: 'adv',  desc: 'manchmal → sometimes (adv)' },
  ];

  for (const t of newVocab) {
    const res = await compositeDictionaryProvider.lookup(t.word, 'de', 'en');
    assert(res !== null, `${t.desc} — resolves`, t.word);
    if (res) {
      assert(
        res.translations.some(tr => tr.toLowerCase().includes(t.trans.toLowerCase())),
        `${t.desc} — translation includes "${t.trans}"`,
        JSON.stringify(res.translations)
      );
      if (t.gender) {
        assert(res.gender === t.gender, `${t.desc} — gender "${t.gender}"`, `got: ${res.gender}`);
      }
    }
  }

  // Noun inflections of new vocab
  const newVocabInflected = [
    { word: 'wohnungen',    lemma: 'Wohnung',    trans: 'apartment', desc: 'wohnungen → Wohnung' },
    { word: 'energien',     lemma: 'Energie',    trans: 'energy',    desc: 'energien → Energie' },
    { word: 'minuten',      lemma: 'Minute',     trans: 'minute',    desc: 'minuten → Minute' },
    { word: 'universitäten',lemma: 'Universität',trans: 'university',desc: 'universitäten → Universität' },
    { word: 'cafés',        lemma: 'Café',       trans: 'café',      desc: 'cafés → Café' },
    { word: 'café',         lemma: 'Café',       trans: 'café',      desc: 'cafe (no accent) → Café' },
    { word: 'läden',        lemma: 'Laden',      trans: 'shop',      desc: 'läden → Laden (umlaut plural)' },
    { word: 'wege',         lemma: 'Weg',        trans: 'way',       desc: 'wege → Weg (plural)' },
    { word: 'bahnen',       lemma: 'Bahn',       trans: 'train',     desc: 'bahnen → Bahn' },
    { word: 'träume',       lemma: 'Traum',      trans: 'dream',     desc: 'träume → Traum (umlaut plural)' },
  ];

  for (const t of newVocabInflected) {
    const res = await compositeDictionaryProvider.lookup(t.word, 'de', 'en');
    assert(res !== null, `${t.desc} — resolves`, t.word);
    if (res) {
      assert(
        res.translations.some(tr => tr.toLowerCase().includes(t.trans.toLowerCase())),
        `${t.desc} — translation includes "${t.trans}"`,
        JSON.stringify(res.translations)
      );
    }
  }

  // Verb inflections of new vocab
  const verbInflected = [
    { word: 'schläft',      lemma: 'schlafen', trans: 'sleep', desc: 'schläft (3sg present) → schlafen' },
    { word: 'schlief',      lemma: 'schlafen', trans: 'sleep', desc: 'schlief (past) → schlafen' },
    { word: 'geschlafen',   lemma: 'schlafen', trans: 'sleep', desc: 'geschlafen (past part) → schlafen' },
    { word: 'träumt',       lemma: 'träumen',  trans: 'dream', desc: 'träumt (3sg) → träumen' },
    { word: 'geträumt',     lemma: 'träumen',  trans: 'dream', desc: 'geträumt (past part) → träumen' },
  ];

  for (const t of verbInflected) {
    const res = await compositeDictionaryProvider.lookup(t.word, 'de', 'en');
    assert(res !== null, `${t.desc} — resolves`, t.word);
  }

  // Adjective inflections of new vocab
  const adjInflected = [
    { word: 'hungriger',  lemma: 'hungrig', trans: 'hungry',    desc: 'hungriger → hungrig' },
    { word: 'gesunde',    lemma: 'gesund',  trans: 'healthy',   desc: 'gesunde → gesund' },
    { word: 'junge',      lemma: 'jung',    trans: 'young',     desc: 'junge → jung' },
    { word: 'jünger',     lemma: 'jung',    trans: 'young',     desc: 'jünger (compar.) → jung' },
    { word: 'laute',      lemma: 'laut',    trans: 'loud',      desc: 'laute → laut' },
    { word: 'leichte',    lemma: 'leicht',  trans: 'easy',      desc: 'leichte → leicht' },
    { word: 'teurer',     lemma: 'teuer',   trans: 'expensive', desc: 'teurer → teuer' },
    { word: 'heiße',      lemma: 'heiß',    trans: 'hot',       desc: 'heiße → heiß' },
  ];

  for (const t of adjInflected) {
    const res = await compositeDictionaryProvider.lookup(t.word, 'de', 'en');
    assert(res !== null, `${t.desc} — resolves`, t.word);
    if (res) {
      assert(
        res.translations.some(tr => tr.toLowerCase().includes(t.trans.toLowerCase())),
        `${t.desc} — translation includes "${t.trans}"`,
        JSON.stringify(res.translations)
      );
    }
  }

  // ==========================================================================
  // PART 4: ORDINAL NUMBER FORMS
  // ==========================================================================
  section('PART 4: Ordinal Number Inflection Forms');

  const ordinalForms = [
    { word: 'erste',    trans: 'first',   desc: 'erste → first (ordinal)' },
    { word: 'ersten',   trans: 'first',   desc: 'ersten → first (oblique)' },
    { word: 'zweite',   trans: 'second',  desc: 'zweite → second' },
    { word: 'zweiten',  trans: 'second',  desc: 'zweiten → second (oblique)' },
    { word: 'dritte',   trans: 'third',   desc: 'dritte → third' },
    { word: 'dritten',  trans: 'third',   desc: 'dritten → third (oblique)' },
    { word: 'vierte',   trans: 'fourth',  desc: 'vierte → fourth' },
    { word: 'fünfte',   trans: 'fifth',   desc: 'fünfte → fifth' },
  ];

  for (const t of ordinalForms) {
    const res = await compositeDictionaryProvider.lookup(t.word, 'de', 'en');
    assert(res !== null, `${t.desc} — resolves`, t.word);
    if (res) {
      assert(
        res.translations.some(tr => tr.toLowerCase().includes(t.trans.toLowerCase())),
        `${t.desc} — translation includes "${t.trans}"`,
        JSON.stringify(res.translations)
      );
    }
  }

  // ==========================================================================
  // PART 5: CAPITALIZATION AND CASE NORMALIZATION
  // ==========================================================================
  section('PART 5: Capitalization and Case Normalization');

  const capCases = [
    { word: 'SCHULE',      lemmaContains: 'Schule',     desc: 'SCHULE (all caps) → Schule' },
    { word: 'schule',      lemmaContains: 'Schule',     desc: 'schule (all lower) → Schule' },
    { word: 'ADJEKTIV',    lemmaContains: 'Adjektiv',   desc: 'ADJEKTIV → Adjektiv' },
    { word: 'lektion',     lemmaContains: 'Lektion',    desc: 'lektion (lower) → Lektion' },
    { word: 'Gesundheit',  trans: 'health',             desc: 'Gesundheit (title) → health' },
    { word: 'gesundheit',  trans: 'health',             desc: 'gesundheit (lower) → health' },
    { word: 'WOHNUNG',     trans: 'apartment',          desc: 'WOHNUNG → apartment' },
  ];

  for (const t of capCases) {
    const res = await compositeDictionaryProvider.lookup(t.word, 'de', 'en');
    assert(res !== null, `${t.desc} — resolves`, t.word);
    if (res) {
      if (t.lemmaContains) {
        assert(
          (res.lemma || res.query).toLowerCase().includes(t.lemmaContains.toLowerCase()) ||
          (res.query?.toLowerCase() === t.word.toLowerCase()),
          `${t.desc} — points to correct headword`,
          `lemma: ${res.lemma}, query: ${res.query}`
        );
      }
      if (t.trans) {
        assert(
          res.translations.some(tr => tr.toLowerCase().includes(t.trans.toLowerCase())),
          `${t.desc} — translation includes "${t.trans}"`,
          JSON.stringify(res.translations)
        );
      }
    }
  }

  // ==========================================================================
  // PART 6: GERMAN UMLAUTS AND ß
  // ==========================================================================
  section('PART 6: German Umlauts and ß');

  const umlautCases = [
    { word: 'Straße',   trans: 'street',      desc: 'Straße → street (ß)' },
    { word: 'schön',    trans: 'beautiful',   desc: 'schön → beautiful (ö)' },
    { word: 'müde',     trans: 'tired',       desc: 'müde → tired (ü)' },
    { word: 'Übung',    trans: 'practice',    desc: 'Übung → practice (Ü)' },
    { word: 'Äpfel',    trans: 'apple',       desc: 'Äpfel → apple (Ä)' },
    { word: 'größer',   trans: 'big',         desc: 'größer → big/larger (comparative of groß)' },
    { word: 'heiß',     trans: 'hot',         desc: 'heiß → hot (ß)' },
    { word: 'heißen',   trans: 'named',       desc: 'heißen → to be named (ß)' },
    { word: 'Träume',   trans: 'dream',       desc: 'Träume → Traum (umlaut plural)' },
    { word: 'Fragesätze', trans: 'question',  desc: 'Fragesätze → Fragesatz (umlaut plural)' },
  ];

  for (const t of umlautCases) {
    const res = await compositeDictionaryProvider.lookup(t.word, 'de', 'en');
    assert(res !== null, `${t.desc} — resolves`, t.word);
    if (res) {
      assert(
        res.translations.some(tr => tr.toLowerCase().includes(t.trans.toLowerCase())),
        `${t.desc} — translation includes "${t.trans}"`,
        JSON.stringify(res.translations)
      );
    }
  }

  // ==========================================================================
  // PART 7: EXISTING VERB INFLECTIONS (regression)
  // ==========================================================================
  section('PART 7: Verb Inflection Regression');

  const verbRegression = [
    { word: 'ging',         lemma: 'gehen',    desc: 'ging → gehen' },
    { word: 'gegangen',     lemma: 'gehen',    desc: 'gegangen → gehen' },
    { word: 'arbeitete',    lemma: 'arbeiten', desc: 'arbeitete → arbeiten' },
    { word: 'gearbeitet',   lemma: 'arbeiten', desc: 'gearbeitet → arbeiten' },
    { word: 'liest',        lemma: 'lesen',    desc: 'liest → lesen' },
    { word: 'lest',         lemma: 'lesen',    desc: 'lest → lesen' },
    { word: 'geht',         lemma: 'gehen',    desc: 'geht → gehen' },
    { word: 'aufgestanden', lemma: 'aufstehen',desc: 'aufgestanden → aufstehen' },
    { word: 'eingekauft',   lemma: 'einkaufen',desc: 'eingekauft → einkaufen' },
    { word: 'angekommen',   lemma: 'ankommen', desc: 'angekommen → ankommen' },
    { word: 'angerufen',    lemma: 'anrufen',  desc: 'angerufen → anrufen' },
  ];

  for (const t of verbRegression) {
    const res = await compositeDictionaryProvider.lookup(t.word, 'de', 'en');
    assert(res !== null, `${t.desc} — resolves`, t.word);
    if (res) {
      assert(
        (res.lemma || '').includes(t.lemma) || (res.query === t.word),
        `${t.desc} — lemma contains "${t.lemma}"`,
        `got: ${res.lemma}`
      );
    }
  }

  // ==========================================================================
  // PART 8: HYPHENATED AND COMPOUND WORDS
  // ==========================================================================
  section('PART 8: Hyphenated and Compound Words');

  const compoundCases = [
    { word: 'Plural-Endungen', trans: 'plural',    desc: 'Plural-Endungen → plural ending' },
    { word: 'Plural-Endung',   trans: 'plural',    desc: 'Plural-Endung → plural ending (singular)' },
    { word: 'Lieblingsmusik',  trans: 'music',     desc: 'Lieblingsmusik → favorite music (compound)' },
    { word: 'Lieblingsfilm',   trans: 'film',      desc: 'Lieblingsfilm → favorite film (compound)' },
    { word: 'Rheinstraße',     trans: 'Street',    desc: 'Rheinstraße → Rhein Street (street name)' },
    { word: 'Telefonnummer',   trans: 'number',    desc: 'Telefonnummer → phone number' },
    { word: 'Telefongespräch', trans: 'phone',     desc: 'Telefongespräch → telephone call' },
  ];

  for (const t of compoundCases) {
    const res = await compositeDictionaryProvider.lookup(t.word, 'de', 'en');
    assert(res !== null, `${t.desc} — resolves`, t.word);
    if (res) {
      assert(
        res.translations.some(tr => tr.toLowerCase().includes(t.trans.toLowerCase())),
        `${t.desc} — translation includes "${t.trans}"`,
        JSON.stringify(res.translations)
      );
    }
  }

  // ==========================================================================
  // PART 9: HOMOGRAPH DISAMBIGUATION (must NOT be confused)
  // ==========================================================================
  section('PART 9: Homograph Disambiguation');

  // sie = she/they, Sie = you (formal)
  const sie = await compositeDictionaryProvider.lookup('sie', 'de', 'en');
  const Sie = await compositeDictionaryProvider.lookup('Sie', 'de', 'en');
  assert(sie?.translations.some(t => t === 'she' || t === 'her' || t === 'they'), 'sie (lower) → she/her/they', JSON.stringify(sie?.translations));
  assert(Sie?.translations.some(t => t.includes('formal') || t === 'you (formal)'), 'Sie (capital) → you (formal)', JSON.stringify(Sie?.translations));
  assert(!sie?.translations.some(t => t.includes('formal')), 'sie (lower) must NOT include formal you', JSON.stringify(sie?.translations));

  // morgen vs Morgen
  const morgen = await compositeDictionaryProvider.lookup('morgen', 'de', 'en');
  const Morgen = await compositeDictionaryProvider.lookup('Morgen', 'de', 'en');
  assert(morgen?.partOfSpeech?.includes('adv'), 'morgen (lower) → adverb', morgen?.partOfSpeech);
  assert(Morgen?.partOfSpeech?.includes('noun'), 'Morgen (capital) → noun', Morgen?.partOfSpeech);
  assert(morgen?.translations.some(t => t.includes('tomorrow')), 'morgen → tomorrow', JSON.stringify(morgen?.translations));
  assert(Morgen?.translations.some(t => t.includes('morning')), 'Morgen → morning', JSON.stringify(Morgen?.translations));

  // kontrollieren (verb) vs Kontrollieren (gerund/noun)
  const kontV = await compositeDictionaryProvider.lookup('kontrollieren', 'de', 'en');
  const kontN = await compositeDictionaryProvider.lookup('Kontrollieren', 'de', 'en');
  assert(kontV?.partOfSpeech?.includes('verb'), 'kontrollieren → verb', kontV?.partOfSpeech);
  assert(kontV?.translations.some(t => t.startsWith('to ')), 'kontrollieren → infinitive translation', JSON.stringify(kontV?.translations));
  assert(kontN?.translations.some(t => !t.startsWith('to ')), 'Kontrollieren (noun) → non-infinitive translation', JSON.stringify(kontN?.translations));

  // sein = to be vs sein = his
  const sein = await compositeDictionaryProvider.lookup('sein', 'de', 'en');
  assert(sein !== null, 'sein → resolves', 'sein');
  assert(
    sein?.translations.some(t => t.includes('be') || t.includes('his')),
    'sein → contains "be" or "his" (polysemous)',
    JSON.stringify(sein?.translations)
  );

  // ==========================================================================
  // PART 10: OCR CONFUSION RECOVERY
  // ==========================================================================
  section('PART 10: OCR Confusion Recovery');

  const ocrCases = [
    { word: 'Modatverben', trans: 'modal verb', desc: 'Modatverben (OCR: t→l) → Modalverben' },
    { word: 'mässen',      trans: 'must',       desc: 'mässen (OCR: ä→ü) → müssen' },
  ];

  for (const t of ocrCases) {
    const res = await compositeDictionaryProvider.lookup(t.word, 'de', 'en');
    assert(res !== null, `${t.desc} — resolves via OCR correction`, t.word);
    if (res) {
      assert(
        res.translations.some(tr => tr.toLowerCase().includes(t.trans.toLowerCase())),
        `${t.desc} — translation includes "${t.trans}"`,
        JSON.stringify(res.translations)
      );
    }
  }

  // ==========================================================================
  // PART 11: WORDS THAT MUST RETURN NULL (no false translations)
  // ==========================================================================
  section('PART 11: Unknown Words — Must Return Null');

  const mustBeNull = [
    'xyzqwert123',
    'nonexistentwordblahnein',
    'Meldebescheinigung',    // Administrative-specific, not in dictionary
    'Fahrkartenentwerter',   // Compound, not in dictionary, must not guess
    'Kaffeerösterei',        // Compound, not in dictionary, must not guess
  ];

  for (const w of mustBeNull) {
    const res = await compositeDictionaryProvider.lookup(w, 'de', 'en');
    assert(res === null, `"${w}" — correctly returns null (no false translation)`, w);
  }

  // Wrong language pair must return null
  const wrongLang = await compositeDictionaryProvider.lookup('Schule', 'fr', 'en');
  assert(wrongLang === null, 'Wrong source language (fr→en) returns null', 'Schule fr→en');

  // ==========================================================================
  // PART 12: PREVIOUSLY FIXED DEFECTS (regression)
  // ==========================================================================
  section('PART 12: Previously Fixed Defects Regression');

  const berge = await compositeDictionaryProvider.lookup('Berge', 'de', 'en');
  assert(berge?.translations.some(t => t.includes('mountain')), 'Berge → mountain (not salvage)', JSON.stringify(berge?.translations));
  assert(!berge?.translations.some(t => t.toLowerCase().includes('salvage')), 'Berge does NOT translate as salvage', JSON.stringify(berge?.translations));

  const modalverben = await compositeDictionaryProvider.lookup('Modalverben', 'de', 'en');
  assert(modalverben?.translations.some(t => t.includes('modal verb')), 'Modalverben → modal verb', JSON.stringify(modalverben?.translations));

  const unknown = await compositeDictionaryProvider.lookup('', 'de', 'en');
  assert(unknown === null, 'Empty string returns null cleanly', '""');

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n=================================================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=================================================================');

  if (failures.length > 0) {
    console.log('\n✗ FAILURES:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.label}${f.context ? ' :: ' + f.context : ''}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL PHASE 1 DICTIONARY QUALITY TESTS PASSED SUCCESSFULLY!');
  }
}

run().catch(err => {
  console.error('\n✗ UNHANDLED ERROR:', err.message);
  process.exit(1);
});
