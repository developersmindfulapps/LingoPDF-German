/**
 * scripts/verify-phase3-3-morphological-compatibility.mjs
 *
 * LingoPDF Extension — Phase 3.3: Morphological Compatibility & Lookup Regression Audit
 *
 * Dedicated verification suite covering:
 * 1. Suffix-by-suffix behavior for all 13 canonical suffixes (es, er, en, em, e, sten, st, ten, te, est, et, t, s).
 * 2. Valid adjective inflections (strong, weak, comparative, superlative).
 * 3. Valid verb forms (finite, past, participles).
 * 4. Valid numeral forms (declined ordinals).
 * 5. Explicit inflection index integrity (nouns resolving via Stage 3 without being blocked by Stage 4 guard).
 * 6. Closed-class forms & pronouns (preservation and case-sensitive homograph disambiguation).
 * 7. Participles categorized as adjectives vs verbs.
 * 8. Phase 3.2 collision cases and negative contract (superlativem, bilden, teiltem, gemahlenen, Fahrkartenautomates).
 * 9. Five-genre benchmark resolution measurement (467/467 tokens, 100.00%).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compositeDictionaryProvider, authoredDictionaryProvider } from '../src/services/dictionary/index.ts';

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

function section(title) {
  console.log(`\n--- ${title} ---`);
}

async function run() {
  console.log('=================================================================');
  console.log('  LINGO PDF — PHASE 3.3 MORPHOLOGICAL COMPATIBILITY TEST SUITE  ');
  console.log('=================================================================\n');

  await compositeDictionaryProvider.ensureInitialized();
  await authoredDictionaryProvider.ensureInitialized();

  // ==========================================================================
  // SECTION 1: SUFFIX-BY-SUFFIX MORPHOLOGICAL VERIFICATION (13 SUFFIXES)
  // ==========================================================================
  section('SECTION 1: Suffix-by-Suffix Behavior Audit (13 Canonical Suffixes)');

  // 1. -es (neuter adjective strong ending)
  {
    const res = await compositeDictionaryProvider.lookup('schnelles', 'de', 'en');
    assert(res !== null, 'Suffix "-es": "schnelles" resolves via adjective stem', 'schnelles');
    assert(res?.partOfSpeech?.includes('adj'), 'Suffix "-es": "schnelles" POS includes "adj"', res?.partOfSpeech);
    assert(res?.lemma === 'schnell', 'Suffix "-es": "schnelles" lemma === "schnell"', res?.lemma);

    // Negative guard: -es on weak noun must NOT resolve via Stage 4
    const badWeak = await compositeDictionaryProvider.lookup('Fahrkartenautomates', 'de', 'en');
    assert(badWeak === null, 'Suffix "-es": ungrammatical "Fahrkartenautomates" returns null', 'Fahrkartenautomates');
  }

  // 2. -er (comparative / masculine nominative strong)
  {
    const res = await compositeDictionaryProvider.lookup('kleiner', 'de', 'en');
    assert(res !== null, 'Suffix "-er": "kleiner" resolves', 'kleiner');
    assert(res?.partOfSpeech?.includes('adj'), 'Suffix "-er": "kleiner" POS includes "adj"', res?.partOfSpeech);
    assert(res?.lemma === 'klein', 'Suffix "-er": "kleiner" lemma === "klein"', res?.lemma);
  }

  // 3. -en (plural / accusative masc / dative plural / infinitive / weak)
  {
    const resAdj = await compositeDictionaryProvider.lookup('schönen', 'de', 'en');
    assert(resAdj !== null, 'Suffix "-en": "schönen" (adj) resolves', 'schönen');
    assert(resAdj?.partOfSpeech?.includes('adj'), 'Suffix "-en": "schönen" POS includes "adj"', resAdj?.partOfSpeech);

    const resVerb = await compositeDictionaryProvider.lookup('bilden', 'de', 'en');
    assert(resVerb !== null, 'Suffix "-en": "bilden" resolves to verb', 'bilden');
    assert(resVerb?.partOfSpeech?.includes('verb'), 'Suffix "-en": "bilden" POS includes "verb"', resVerb?.partOfSpeech);
    assert(resVerb?.lemma !== 'Bild', 'Suffix "-en": "bilden" does NOT collide with noun "Bild"', resVerb?.lemma);
  }

  // 4. -em (dative strong ending on adjectives and numerals)
  {
    const res = await compositeDictionaryProvider.lookup('kleinem', 'de', 'en');
    assert(res !== null, 'Suffix "-em": "kleinem" resolves via adjective stem', 'kleinem');
    assert(res?.partOfSpeech?.includes('adj'), 'Suffix "-em": "kleinem" POS includes "adj"', res?.partOfSpeech);

    // Negative collision check: -em on masculine noun must NOT resolve
    const resNounColl = await compositeDictionaryProvider.lookup('superlativem', 'de', 'en');
    assert(resNounColl === null, 'Suffix "-em": "superlativem" rejected (does not match noun Superlativ)', 'superlativem');
  }

  // 5. -e (nominative/accusative singular adjective ending)
  {
    const res = await compositeDictionaryProvider.lookup('schöne', 'de', 'en');
    assert(res !== null, 'Suffix "-e": "schöne" resolves via adjective stem', 'schöne');
    assert(res?.partOfSpeech?.includes('adj'), 'Suffix "-e": "schöne" POS includes "adj"', res?.partOfSpeech);
    assert(res?.lemma === 'schön', 'Suffix "-e": "schöne" lemma === "schön"', res?.lemma);
  }

  // 6. -sten (superlative weak/dative ending)
  {
    const res = await compositeDictionaryProvider.lookup('schnellsten', 'de', 'en');
    assert(res !== null, 'Suffix "-sten": "schnellsten" resolves', 'schnellsten');
    assert(res?.partOfSpeech?.includes('adj'), 'Suffix "-sten": "schnellsten" POS includes "adj"', res?.partOfSpeech);
  }

  // 7. -st (2nd singular verb ending / superlative base)
  {
    const res = await compositeDictionaryProvider.lookup('lernst', 'de', 'en');
    assert(res !== null, 'Suffix "-st": "lernst" resolves', 'lernst');
    assert(res?.partOfSpeech?.includes('verb'), 'Suffix "-st": "lernst" POS includes "verb"', res?.partOfSpeech);
  }

  // 8. -ten (weak verb past plural / ordinal numeral)
  {
    const resVerb = await compositeDictionaryProvider.lookup('lernten', 'de', 'en');
    assert(resVerb !== null, 'Suffix "-ten": "lernten" resolves', 'lernten');
    assert(resVerb?.partOfSpeech?.includes('verb'), 'Suffix "-ten": "lernten" POS includes "verb"', resVerb?.partOfSpeech);

    const resNum = await compositeDictionaryProvider.lookup('neunzehnten', 'de', 'en');
    assert(resNum !== null, 'Suffix "-ten": "neunzehnten" resolves to numeral', 'neunzehnten');
    assert(resNum?.partOfSpeech?.includes('num'), 'Suffix "-ten": "neunzehnten" POS includes "num"', resNum?.partOfSpeech);
  }

  // 9. -te (weak verb past singular / ordinal numeral)
  {
    const resVerb = await compositeDictionaryProvider.lookup('arbeitete', 'de', 'en');
    assert(resVerb !== null, 'Suffix "-te": "arbeitete" resolves', 'arbeitete');
    assert(resVerb?.partOfSpeech?.includes('verb'), 'Suffix "-te": "arbeitete" POS includes "verb"', resVerb?.partOfSpeech);

    const resNum = await compositeDictionaryProvider.lookup('dritte', 'de', 'en');
    assert(resNum !== null, 'Suffix "-te": "dritte" resolves', 'dritte');
    assert(resNum?.partOfSpeech?.includes('num'), 'Suffix "-te": "dritte" POS includes "num"', resNum?.partOfSpeech);
  }

  // 10. -est (2nd person singular verb ending after dentals)
  {
    const res = await compositeDictionaryProvider.lookup('arbeitest', 'de', 'en');
    assert(res !== null, 'Suffix "-est": "arbeitest" resolves', 'arbeitest');
    assert(res?.partOfSpeech?.includes('verb'), 'Suffix "-est": "arbeitest" POS includes "verb"', res?.partOfSpeech);
  }

  // 11. -et (3rd person singular verb ending after dentals)
  {
    const res = await compositeDictionaryProvider.lookup('arbeitet', 'de', 'en');
    assert(res !== null, 'Suffix "-et": "arbeitet" resolves', 'arbeitet');
    assert(res?.partOfSpeech?.includes('verb'), 'Suffix "-et": "arbeitet" POS includes "verb"', res?.partOfSpeech);
  }

  // 12. -t (3rd person singular present / past participle)
  {
    const res = await compositeDictionaryProvider.lookup('lernt', 'de', 'en');
    assert(res !== null, 'Suffix "-t": "lernt" resolves', 'lernt');
    assert(res?.partOfSpeech?.includes('verb'), 'Suffix "-t": "lernt" POS includes "verb"', res?.partOfSpeech);

    // Negative guard: -t on base nouns must NOT strip to nonsense
    const resNoun = await compositeDictionaryProvider.lookup('zeit', 'de', 'en');
    assert(resNoun !== null, 'Exact noun "zeit" resolves to "Zeit"', 'zeit');
    assert(resNoun?.partOfSpeech?.includes('noun'), '"zeit" POS is "noun"', resNoun?.partOfSpeech);
  }

  // 13. -s (noun genitive/plural handled in Stage 3, intentionally excluded from Stage 4)
  {
    const resGen = await compositeDictionaryProvider.lookup('wohnungsgebers', 'de', 'en');
    assert(resGen !== null, 'Suffix "-s": "wohnungsgebers" resolves via Stage 3 inflection index', 'wohnungsgebers');
    assert(resGen?.lemma === 'Wohnungsgeber', 'Suffix "-s": maps to lemma "Wohnungsgeber"', resGen?.lemma);

    const resStemNotStripped = await compositeDictionaryProvider.lookup('lädens', 'de', 'en');
    assert(resStemNotStripped === null, 'Suffix "-s": spurious "lädens" returns null (bare -s not in Stage 4)', 'lädens');
  }

  // ==========================================================================
  // SECTION 2: VALID ADJECTIVE INFLECTIONS
  // ==========================================================================
  section('SECTION 2: Valid Adjective Inflections');

  const adjCases = [
    { query: 'schnelles', lemma: 'schnell', pos: 'adj', note: 'strong neuter nom/acc' },
    { query: 'schneller', lemma: 'schnell', pos: 'adj', note: 'comparative / strong masc nom' },
    { query: 'schnelle', lemma: 'schnell', pos: 'adj', note: 'strong fem nom/acc' },
    { query: 'schnellen', lemma: 'schnell', pos: 'adj', note: 'weak dative/acc' },
    { query: 'schnellem', lemma: 'schnell', pos: 'adj', note: 'strong dative masc/neuter' },
    { query: 'schnellste', lemma: 'schnell', pos: 'adj', note: 'superlative nom fem' },
    { query: 'schnellsten', lemma: 'schnell', pos: 'adj', note: 'superlative dative/weak' },
    { query: 'kleines', lemma: 'klein', pos: 'adj', note: 'strong neuter' },
    { query: 'kleinem', lemma: 'klein', pos: 'adj', note: 'strong dative' },
    { query: 'kleiner', lemma: 'klein', pos: 'adj', note: 'comparative / masc' },
    { query: 'schönes', lemma: 'schön', pos: 'adj', note: 'strong neuter' },
    { query: 'schöner', lemma: 'schön', pos: 'adj', note: 'comparative / masc' },
    { query: 'schönste', lemma: 'schön', pos: 'adj', note: 'superlative' },
    { query: 'gutes', lemma: 'gut', pos: 'adj', note: 'strong neuter' },
    { query: 'gutem', lemma: 'gut', pos: 'adj', note: 'strong dative' },
    { query: 'guter', lemma: 'gut', pos: 'adj', note: 'strong masc' },
    { query: 'altes', lemma: 'alt', pos: 'adj', note: 'strong neuter' },
    { query: 'altem', lemma: 'alt', pos: 'adj', note: 'strong dative' },
  ];

  for (const c of adjCases) {
    const res = await compositeDictionaryProvider.lookup(c.query, 'de', 'en');
    assert(res !== null, `Adjective "${c.query}" (${c.note}) resolves`, c.query);
    assert(res?.partOfSpeech?.includes(c.pos), `"${c.query}" POS includes "${c.pos}"`, res?.partOfSpeech);
    assert(res?.lemma === c.lemma || res?.query === c.lemma, `"${c.query}" lemma matches "${c.lemma}"`, res?.lemma);
  }

  // ==========================================================================
  // SECTION 3: VALID VERB FORMS
  // ==========================================================================
  section('SECTION 3: Valid Verb Forms');

  const verbCases = [
    { query: 'arbeitete', lemma: 'arbeiten', pos: 'verb', note: 'past 1st/3rd sing' },
    { query: 'arbeiteten', lemma: 'arbeiten', pos: 'verb', note: 'past 1st/3rd pl' },
    { query: 'arbeitet', lemma: 'arbeiten', pos: 'verb', note: '3rd sing present' },
    { query: 'lernte', lemma: 'lernen', pos: 'verb', note: 'past sing' },
    { query: 'lernten', lemma: 'lernen', pos: 'verb', note: 'past pl' },
    { query: 'machte', lemma: 'machen', pos: 'verb', note: 'past sing' },
    { query: 'machten', lemma: 'machen', pos: 'verb', note: 'past pl' },
    { query: 'suchte', lemma: 'suchen', pos: 'verb', note: 'past sing' },
    { query: 'ging', lemma: 'gehen', pos: 'verb', note: 'strong past (Stage 3)' },
    { query: 'gegangen', lemma: 'gehen', pos: 'verb', note: 'strong participle (Stage 3)' },
    { query: 'schläft', lemma: 'schlafen', pos: 'verb', note: 'strong 3rd sing (Stage 3)' },
    { query: 'geschlafen', lemma: 'schlafen', pos: 'verb', note: 'strong participle (Stage 3)' },
  ];

  for (const c of verbCases) {
    const res = await compositeDictionaryProvider.lookup(c.query, 'de', 'en');
    assert(res !== null, `Verb "${c.query}" (${c.note}) resolves`, c.query);
    assert(res?.partOfSpeech?.includes(c.pos), `"${c.query}" POS includes "${c.pos}"`, res?.partOfSpeech);
    assert(res?.lemma === c.lemma || res?.query === c.lemma, `"${c.query}" lemma matches "${c.lemma}"`, res?.lemma);
  }

  // ==========================================================================
  // SECTION 4: VALID NUMERAL FORMS
  // ==========================================================================
  section('SECTION 4: Valid Numeral Forms (Declined Ordinals)');

  const numCases = [
    { query: 'erste', lemma: 'erste', pos: 'num', note: 'ordinal nom' },
    { query: 'ersten', lemma: 'erste', pos: 'num', note: 'ordinal acc/dat' },
    { query: 'erstem', lemma: 'erste', pos: 'num', note: 'ordinal dative' },
    { query: 'erster', lemma: 'erste', pos: 'num', note: 'ordinal gen/dat' },
    { query: 'erstes', lemma: 'erste', pos: 'num', note: 'ordinal neuter' },
    { query: 'zweite', lemma: 'zweite', pos: 'num', note: 'ordinal nom' },
    { query: 'zweiten', lemma: 'zweite', pos: 'num', note: 'ordinal acc/dat' },
    { query: 'zweitem', lemma: 'zweite', pos: 'num', note: 'ordinal dative' },
    { query: 'dritte', lemma: 'dritte', pos: 'num', note: 'ordinal nom' },
    { query: 'dritten', lemma: 'dritte', pos: 'num', note: 'ordinal acc/dat' },
    { query: 'drittem', lemma: 'dritte', pos: 'num', note: 'ordinal dative' },
    { query: 'neunzehnten', lemma: 'neunzehn', pos: 'num', note: 'ordinal oblique' },
  ];

  for (const c of numCases) {
    const res = await compositeDictionaryProvider.lookup(c.query, 'de', 'en');
    assert(res !== null, `Numeral "${c.query}" (${c.note}) resolves`, c.query);
    assert(res?.partOfSpeech?.includes(c.pos), `"${c.query}" POS includes "${c.pos}"`, res?.partOfSpeech);
  }

  // ==========================================================================
  // SECTION 5: NOUN INFLECTIONS VIA EXPLICIT INFLECTION INDEX (STAGE 3)
  // ==========================================================================
  section('SECTION 5: Noun Inflections via Explicit Index (Never Blocked by Guard)');

  const nounInflectionCases = [
    { query: 'häuser', lemma: 'Haus', gender: 'n', note: 'strong neuter plural with umlaut' },
    { query: 'büchern', lemma: 'Buch', gender: 'n', note: 'dative plural with umlaut' },
    { query: 'tage', lemma: 'Tag', gender: 'm', note: 'masculine plural' },
    { query: 'frauen', lemma: 'Frau', gender: 'f', note: 'feminine plural' },
    { query: 'bußgeldes', lemma: 'Bußgeld', gender: 'n', note: 'neuter genitive singular' },
    { query: 'bußgelder', lemma: 'Bußgeld', gender: 'n', note: 'neuter plural' },
    { query: 'mietvertrages', lemma: 'Mietvertrag', gender: 'm', note: 'masculine genitive' },
    { query: 'mietverträge', lemma: 'Mietvertrag', gender: 'm', note: 'masculine plural with umlaut' },
    { query: 'wohnungsgebers', lemma: 'Wohnungsgeber', gender: 'm', note: 'masculine genitive singular' },
    { query: 'einzugsdatums', lemma: 'Einzugsdatum', gender: 'n', note: 'compound neuter genitive' },
    { query: 'einzugsdaten', lemma: 'Einzugsdatum', gender: 'n', note: 'compound neuter plural' },
    { query: 'meldebehörden', lemma: 'Meldebehörde', gender: 'f', note: 'compound feminine plural' },
    { query: 'personalausweise', lemma: 'Personalausweis', gender: 'm', note: 'compound masculine plural' },
    { query: 'fahrkartenautomaten', lemma: 'Fahrkartenautomat', gender: 'm', note: 'weak masculine genitive/plural' },
    { query: 'menschen', lemma: 'Mensch', gender: 'm', note: 'weak masculine oblique/plural' },
  ];

  for (const c of nounInflectionCases) {
    const res = await compositeDictionaryProvider.lookup(c.query, 'de', 'en');
    assert(res !== null, `Noun inflection "${c.query}" (${c.note}) resolves`, c.query);
    assert(res?.lemma === c.lemma, `"${c.query}" maps to lemma "${c.lemma}"`, res?.lemma);
    assert(res?.gender === c.gender, `"${c.query}" gender === "${c.gender}"`, res?.gender);
    assert(res?.partOfSpeech?.includes('noun'), `"${c.query}" POS is "noun"`, res?.partOfSpeech);
  }

  // ==========================================================================
  // SECTION 6: CLOSED-CLASS FORMS, PRONOUNS & HOMOGRAPH DISAMBIGUATION
  // ==========================================================================
  section('SECTION 6: Closed-Class Forms & Homograph Disambiguation');

  // Pronouns
  const pronouns = ['ich', 'mich', 'mir', 'du', 'dich', 'dir', 'er', 'ihn', 'ihm', 'es', 'wir', 'uns', 'ihr', 'euch', 'ihnen'];
  for (const p of pronouns) {
    const res = await compositeDictionaryProvider.lookup(p, 'de', 'en');
    assert(res !== null, `Pronoun "${p}" resolves`, p);
    assert(res?.partOfSpeech?.includes('pron'), `"${p}" POS includes "pron"`, res?.partOfSpeech);
  }

  // Contractions
  const contractions = [
    { word: 'im', target: 'in the' },
    { word: 'am', target: 'at the' },
    { word: 'beim', target: 'at the' },
    { word: 'zum', target: 'to the' },
    { word: 'zur', target: 'to the' },
    { word: 'ins', target: 'into the' },
  ];
  for (const ct of contractions) {
    const res = await compositeDictionaryProvider.lookup(ct.word, 'de', 'en');
    assert(res !== null, `Contraction "${ct.word}" resolves`, ct.word);
    assert(res?.translations.some(t => t.toLowerCase().includes(ct.target)), `"${ct.word}" translation includes "${ct.target}"`, JSON.stringify(res?.translations));
  }

  // Homograph Disambiguation
  {
    const sieLower = await compositeDictionaryProvider.lookup('sie', 'de', 'en');
    assert(sieLower !== null, '"sie" (lowercase) resolves', 'sie');
    assert(sieLower?.translations.includes('she') || sieLower?.translations.includes('they'), '"sie" contains she/they', JSON.stringify(sieLower?.translations));
    assert(!sieLower?.translations.some(t => t.includes('formal')), '"sie" does NOT contain formal you', JSON.stringify(sieLower?.translations));

    const sieUpper = await compositeDictionaryProvider.lookup('Sie', 'de', 'en');
    assert(sieUpper !== null, '"Sie" (capitalized) resolves', 'Sie');
    assert(sieUpper?.translations.some(t => t.includes('you')), '"Sie" contains formal you', JSON.stringify(sieUpper?.translations));

    const morgenAdv = await compositeDictionaryProvider.lookup('morgen', 'de', 'en');
    assert(morgenAdv !== null, '"morgen" (lowercase) resolves', 'morgen');
    assert(morgenAdv?.partOfSpeech === 'adv', '"morgen" POS is "adv"', morgenAdv?.partOfSpeech);
    assert(morgenAdv?.translations.includes('tomorrow'), '"morgen" translation is "tomorrow"', JSON.stringify(morgenAdv?.translations));

    const morgenNoun = await compositeDictionaryProvider.lookup('Morgen', 'de', 'en');
    assert(morgenNoun !== null, '"Morgen" (capitalized) resolves', 'Morgen');
    assert(morgenNoun?.partOfSpeech?.includes('noun'), '"Morgen" POS includes "noun"', morgenNoun?.partOfSpeech);
    assert(morgenNoun?.translations.includes('morning'), '"Morgen" translation is "morning"', JSON.stringify(morgenNoun?.translations));
  }

  // ==========================================================================
  // SECTION 7: PARTICIPLES CLASSIFIED AS ADJECTIVES VS VERBS
  // ==========================================================================
  section('SECTION 7: Participles Classified as Adjectives vs Verbs');

  // Participial adjectives
  const partAdjs = [
    { query: 'gemahlen', match: 'ground', pos: 'adj' },
    { query: 'gemahlenen', match: 'ground', pos: 'adj' },
    { query: 'gemahlener', match: 'ground', pos: 'adj' },
    { query: 'gemahlenes', match: 'ground', pos: 'adj' },
    { query: 'verpflichtet', match: 'obligated', pos: 'adj' },
    { query: 'verpflichtete', match: 'obligate', pos: 'adj' },
    { query: 'geteilt', match: 'divided', pos: 'adj' },
    { query: 'geteiltem', match: 'divided', pos: 'adj' },
  ];

  for (const pa of partAdjs) {
    const res = await compositeDictionaryProvider.lookup(pa.query, 'de', 'en');
    assert(res !== null, `Participial adjective "${pa.query}" resolves`, pa.query);
    assert(res?.partOfSpeech?.includes(pa.pos), `"${pa.query}" POS includes "${pa.pos}"`, res?.partOfSpeech);
    assert(res?.translations.some(t => t.toLowerCase().includes(pa.match)), `"${pa.query}" translation includes "${pa.match}"`, JSON.stringify(res?.translations));
  }

  // Verbal participles
  const verbParticiples = [
    { query: 'geröstet', lemma: 'rösten', pos: 'verb' },
    { query: 'gerösteten', lemma: 'rösten', pos: 'verb' },
    { query: 'gemacht', lemma: 'machen', pos: 'verb' },
    { query: 'gesagt', lemma: 'sagen', pos: 'verb' },
  ];

  for (const vp of verbParticiples) {
    const res = await compositeDictionaryProvider.lookup(vp.query, 'de', 'en');
    assert(res !== null, `Verbal participle "${vp.query}" resolves`, vp.query);
    assert(res?.partOfSpeech?.includes(vp.pos), `"${vp.query}" POS includes "${vp.pos}"`, res?.partOfSpeech);
    assert(res?.lemma === vp.lemma || res?.query === vp.lemma, `"${vp.query}" lemma matches "${vp.lemma}"`, res?.lemma);
  }

  // ==========================================================================
  // SECTION 8: PHASE 3.2 COLLISION CASES & NEGATIVE CONTRACT
  // ==========================================================================
  section('SECTION 8: Collision Cases & Negative Contract');

  // Phase 3.2 collision cases
  {
    // 1. superlativem -> must return null
    const resSup = await compositeDictionaryProvider.lookup('superlativem', 'de', 'en');
    assert(resSup === null, 'Collision check: "superlativem" strictly returns null', 'superlativem');

    // 2. bilden -> must resolve to verb "to form", NOT noun "Bild"
    const resBilden = await compositeDictionaryProvider.lookup('bilden', 'de', 'en');
    assert(resBilden !== null, '"bilden" resolves', 'bilden');
    assert(resBilden?.partOfSpeech?.includes('verb'), '"bilden" POS is "verb"', resBilden?.partOfSpeech);
    assert(resBilden?.lemma !== 'Bild', '"bilden" lemma is NOT noun "Bild"', resBilden?.lemma);
    assert(resBilden?.translations.some(t => t.includes('form')), '"bilden" translation includes "form"', JSON.stringify(resBilden?.translations));

    // 3. teiltem -> must return null (not resolve to noun Teil)
    const resTeiltem = await compositeDictionaryProvider.lookup('teiltem', 'de', 'en');
    assert(resTeiltem === null, 'Collision check: "teiltem" strictly returns null', 'teiltem');

    // 4. gemahlenen -> resolves to adjective gemahlen ("ground"), NOT noun Gemahl ("husband")
    const resGem = await compositeDictionaryProvider.lookup('gemahlenen', 'de', 'en');
    assert(resGem !== null, '"gemahlenen" resolves', 'gemahlenen');
    assert(resGem?.partOfSpeech?.includes('adj'), '"gemahlenen" POS is "adj"', resGem?.partOfSpeech);
    assert(resGem?.lemma === 'gemahlen', '"gemahlenen" lemma is "gemahlen"', resGem?.lemma);
    assert(resGem?.translations.some(t => t.includes('ground')), '"gemahlenen" translation is "ground"', JSON.stringify(resGem?.translations));

    // 5. Fahrkartenautomates -> must return null (weak noun does not take -es genitive)
    const resAutomat = await compositeDictionaryProvider.lookup('Fahrkartenautomates', 'de', 'en');
    assert(resAutomat === null, 'Collision check: "Fahrkartenautomates" strictly returns null', 'Fahrkartenautomates');
  }

  // Negative contract (spurious forms and non-words)
  const negativeForms = [
    'lädens',
    'autobahnenstem',
    'panzerartigstentextabc',
    'xyzqwert123',
    'nonexistentwordblahnein',
    'Wohnungsgebergesetzbuch',
    'Meldebescheinigung',
    'Fahrkartenentwerter',
  ];

  for (const nf of negativeForms) {
    const res = await compositeDictionaryProvider.lookup(nf, 'de', 'en');
    assert(res === null, `Negative contract: unsupported word "${nf}" returns null`, nf);
  }

  // ==========================================================================
  // SECTION 9: FIVE-GENRE BENCHMARK MEASUREMENT (467 TOKENS)
  // ==========================================================================
  section('SECTION 9: Five-Genre Benchmark Measurement');

  const fixturesDir = path.join(ROOT, 'data-source', 'benchmarks', 'fixtures');
  const fixtureFiles = [
    { name: 'administrative', file: 'administrative-berlin-anmeldung.json' },
    { name: 'informational', file: 'informational-wikipedia-curated.json' },
    { name: 'literature', file: 'literature-kafka-verwandlung.json' },
    { name: 'news', file: 'news-bundesregierung-press.json' },
    { name: 'spoken', file: 'spoken-tatoeba-dialogues.json' },
  ];

  let totalTokens = 0;
  let totalResolved = 0;
  let totalAuthored = 0;
  let totalLegacy = 0;

  for (const { name: genre, file } of fixtureFiles) {
    const fixturePath = path.join(fixturesDir, file);
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const evaluatedTokens = fixture.tokens.filter(t => !t.isExcluded);
    let genreResolved = 0;

    for (const item of evaluatedTokens) {
      totalTokens++;
      const res = await compositeDictionaryProvider.lookup(item.cleaned, 'de', 'en');
      if (res !== null) {
        genreResolved++;
        totalResolved++;
        if (res.providerId === 'authored') {
          totalAuthored++;
        } else {
          totalLegacy++;
        }
      }
    }

    const pct = ((genreResolved / evaluatedTokens.length) * 100).toFixed(2);
    console.log(`  ✓ Genre "${genre}": ${genreResolved}/${evaluatedTokens.length} (${pct}%)`);
  }

  console.log(`\n  Benchmark Total:  ${totalResolved}/${totalTokens} (${((totalResolved / totalTokens) * 100).toFixed(2)}%)`);
  console.log(`  Authored Primary: ${totalAuthored}/${totalTokens} (${((totalAuthored / totalTokens) * 100).toFixed(2)}%)`);
  console.log(`  Legacy Fallback:  ${totalLegacy}/${totalTokens} (${((totalLegacy / totalTokens) * 100).toFixed(2)}%)`);

  assert(totalResolved === totalTokens, `100% benchmark resolution achieved: ${totalResolved}/${totalTokens}`);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n=================================================================');
  console.log(`  PHASE 3.3 RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=================================================================\n');

  if (failed > 0) {
    console.error(`💥 ${failed} check(s) failed in Phase 3.3!`);
    for (const f of failures) {
      console.error(`  - ${f.label} (${f.context})`);
    }
    process.exit(1);
  } else {
    console.log('🎉 ALL PHASE 3.3 MORPHOLOGICAL COMPATIBILITY TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
