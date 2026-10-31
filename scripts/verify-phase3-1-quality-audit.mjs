/**
 * scripts/verify-phase3-1-quality-audit.mjs
 *
 * Dedicated Phase 3.1 Quality Audit Test Suite:
 * 1. Verification of all linguistic and morphological corrections made in Phase 3.1:
 *    - geteiltem (dative strong ending) resolves to geteilt; typo teiltem rejected
 *    - lädens ungrammatical plural form rejected; correct läden resolves
 *    - superlativem ungrammatical noun ending rejected; correct forms resolve
 *    - Moderne noun entry verified with authentic modernity context
 *    - niedergleiten (verb) and Niedergleiten (nominalized gerund) homograph disambiguation
 *    - Preterite plural inflections (träumten, planten) resolve to their base lemmas
 * 2. Morphological and POS correctness across representative sample of Phase 1-3 additions
 * 3. Homograph and case-sensitivity safety (Sie/sie, Morgen/morgen, erst/erste)
 * 4. Negative contract (unknown/invented tokens strictly return null)
 * 5. Independent German Test Set (non-benchmark authentic sentences across Administrative, Educational, Everyday/Lit)
 *    - Measures both Coverage Rate and Translation Correctness Rate as separate metrics
 * 6. Multi-genre benchmark verification (preserves 467/467 tokens, 100.00% coverage baseline)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compositeDictionaryProvider } from '../src/services/dictionary/index.ts';

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
  console.log('  LINGO PDF — PHASE 3.1 TRANSLATION QUALITY AUDIT TEST SUITE     ');
  console.log('=================================================================\n');

  await compositeDictionaryProvider.ensureInitialized();

  // ==========================================================================
  // SECTION 1: PHASE 3.1 AUDIT CORRECTIONS REGRESSION
  // ==========================================================================
  section('SECTION 1: Audit Corrections Regression');

  // Correction 1: geteilt / geteiltem (typo teiltem fixed)
  {
    const resCorrect = await compositeDictionaryProvider.lookup('geteiltem', 'de', 'en');
    assert(resCorrect !== null, 'geteiltem (dative strong adj) resolves', 'geteiltem');
    assert(resCorrect?.lemma === 'geteilt', 'geteiltem maps to lemma geteilt', resCorrect?.lemma);
    assert(resCorrect?.translations.some(t => t.toLowerCase().includes('divided') || t.toLowerCase().includes('split')), 'geteiltem translation contains divided/split', JSON.stringify(resCorrect?.translations));

    const resTypo = await compositeDictionaryProvider.lookup('teiltem', 'de', 'en');
    assert(resTypo?.lemma !== 'geteilt', 'teiltem (typo) does NOT map to lemma geteilt', resTypo?.lemma);
  }

  // Correction 2: Laden (ungrammatical lädens removed)
  {
    const resPlural = await compositeDictionaryProvider.lookup('läden', 'de', 'en');
    assert(resPlural !== null, 'läden (correct plural) resolves to Laden', 'läden');
    assert(resPlural?.lemma === 'Laden', 'läden lemma is Laden', resPlural?.lemma);

    const resGenSing = await compositeDictionaryProvider.lookup('ladens', 'de', 'en');
    assert(resGenSing !== null, 'ladens (correct genitive sing) resolves to Laden', 'ladens');

    const resInvalid = await compositeDictionaryProvider.lookup('lädens', 'de', 'en');
    assert(resInvalid === null, 'lädens (ungrammatical plural -s) returns null cleanly', 'lädens');
  }

  // Correction 3: Superlativ (ungrammatical superlativem removed from authoring entry)
  {
    const resSuperlativ = await compositeDictionaryProvider.lookup('Superlativ', 'de', 'en');
    assert(resSuperlativ !== null, 'Superlativ resolves', 'Superlativ');
    assert(resSuperlativ?.partOfSpeech?.includes('noun'), 'Superlativ is a noun', resSuperlativ?.partOfSpeech);

    const resPlural = await compositeDictionaryProvider.lookup('superlativen', 'de', 'en');
    assert(resPlural !== null, 'superlativen (dative plural) resolves to Superlativ', 'superlativen');

    const rawNouns = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-source', 'authoring', 'nouns.json'), 'utf8'));
    const supEntry = rawNouns.find(e => e.headword === 'Superlativ');
    assert(!supEntry.inflections.includes('superlativem'), 'superlativem successfully removed from Superlativ authoring inflections');
  }

  // Correction 4: niedergleiten (verb) and Niedergleiten (nominalized noun)
  {
    const resVerb = await compositeDictionaryProvider.lookup('niedergleiten', 'de', 'en');
    assert(resVerb !== null, 'niedergleiten (verb) resolves', 'niedergleiten');
    assert(resVerb?.partOfSpeech?.includes('verb'), 'niedergleiten POS includes verb', resVerb?.partOfSpeech);
    assert(resVerb?.translations.some(t => t.toLowerCase().includes('slide down') || t.toLowerCase().includes('glide down')), 'niedergleiten translations include slide down / glide down', JSON.stringify(resVerb?.translations));

    const resPart = await compositeDictionaryProvider.lookup('niedergeglitten', 'de', 'en');
    assert(resPart !== null, 'niedergeglitten (past participle) resolves', 'niedergeglitten');
    assert(resPart?.lemma === 'niedergleiten', 'niedergeglitten maps to verb niedergleiten', resPart?.lemma);

    const resNoun = await compositeDictionaryProvider.lookup('Niedergleiten', 'de', 'en');
    assert(resNoun !== null, 'Niedergleiten (capitalized noun) resolves', 'Niedergleiten');
    assert(resNoun?.gender === 'n', 'Niedergleiten gender is neuter', resNoun?.gender);
  }

  // Correction 5: Preterite plural verb forms
  {
    const resTraumten = await compositeDictionaryProvider.lookup('träumten', 'de', 'en');
    assert(resTraumten !== null, 'träumten resolves', 'träumten');
    assert(resTraumten?.lemma === 'träumen', 'träumten maps to lemma träumen', resTraumten?.lemma);

    const resPlanten = await compositeDictionaryProvider.lookup('planten', 'de', 'en');
    assert(resPlanten !== null, 'planten resolves', 'planten');
    assert(resPlanten?.lemma === 'planen', 'planten maps to lemma planen', resPlanten?.lemma);
  }

  // Correction 6: Moderne (noun) and modern (adjective)
  {
    const resNoun = await compositeDictionaryProvider.lookup('Moderne', 'de', 'en');
    assert(resNoun !== null, 'Moderne resolves', 'Moderne');
    assert(resNoun?.partOfSpeech?.includes('noun'), 'Moderne is noun', resNoun?.partOfSpeech);
    assert(resNoun?.gender === 'f', 'Moderne gender is feminine', resNoun?.gender);
    assert(resNoun?.translations.some(t => t.toLowerCase().includes('modernity') || t.toLowerCase().includes('modern era')), 'Moderne translations include modernity / modern era', JSON.stringify(resNoun?.translations));

    const resAdj = await compositeDictionaryProvider.lookup('modern', 'de', 'en');
    assert(resAdj !== null, 'modern (adjective) resolves', 'modern');
    assert(resAdj?.partOfSpeech?.includes('adj'), 'modern is adjective', resAdj?.partOfSpeech);
    assert(resAdj?.translations.some(t => t.toLowerCase().includes('modern') || t.toLowerCase().includes('contemporary')), 'modern translations include modern', JSON.stringify(resAdj?.translations));
  }

  // ==========================================================================
  // SECTION 2: LINGUISTIC TARGET AUDIT (5 Key Candidates)
  // ==========================================================================
  section('SECTION 2: Linguistic Target Audit (5 Key Candidates)');

  // 1. Wohnungsgeber
  {
    const res = await compositeDictionaryProvider.lookup('Wohnungsgeber', 'de', 'en');
    assert(res !== null, 'Wohnungsgeber resolves', 'Wohnungsgeber');
    assert(res?.gender === 'm', 'Wohnungsgeber is masculine (der Wohnungsgeber)', res?.gender);
    assert(res?.translations.some(t => t.toLowerCase().includes('housing provider') || t.toLowerCase().includes('landlord')), 'Wohnungsgeber translation includes housing provider / landlord', JSON.stringify(res?.translations));

    const gen = await compositeDictionaryProvider.lookup('Wohnungsgebers', 'de', 'en');
    assert(gen?.lemma === 'Wohnungsgeber', 'Wohnungsgebers correctly resolves genitive to Wohnungsgeber', gen?.lemma);
  }

  // 2. Ungeziefer
  {
    const res = await compositeDictionaryProvider.lookup('Ungeziefer', 'de', 'en');
    assert(res !== null, 'Ungeziefer resolves', 'Ungeziefer');
    assert(res?.gender === 'n', 'Ungeziefer is neuter (das Ungeziefer)', res?.gender);
    assert(res?.translations.some(t => t.toLowerCase().includes('vermin') || t.toLowerCase().includes('pest')), 'Ungeziefer translation contains vermin / pest', JSON.stringify(res?.translations));
  }

  // 3. Afrika
  {
    const res = await compositeDictionaryProvider.lookup('Afrika', 'de', 'en');
    assert(res !== null, 'Afrika resolves', 'Afrika');
    assert(res?.gender === 'n', 'Afrika is neuter proper noun', res?.gender);
    assert(res?.translations.includes('Africa'), 'Afrika translates to Africa', JSON.stringify(res?.translations));

    const gen = await compositeDictionaryProvider.lookup('Afrikas', 'de', 'en');
    assert(gen !== null && gen?.lemma === 'Afrika', 'Afrikas (genitive) resolves to Afrika', gen?.lemma);
  }

  // 4. Menschenzimmer
  {
    const res = await compositeDictionaryProvider.lookup('Menschenzimmer', 'de', 'en');
    assert(res !== null, 'Menschenzimmer resolves', 'Menschenzimmer');
    assert(res?.gender === 'n', 'Menschenzimmer is neuter compound (das Zimmer)', res?.gender);
    assert(res?.translations.some(t => t.toLowerCase().includes('human room')), 'Menschenzimmer preserves literary meaning "human room"', JSON.stringify(res?.translations));
  }

  // 5. Niedergleiten
  {
    const res = await compositeDictionaryProvider.lookup('Niedergleiten', 'de', 'en');
    assert(res !== null, 'Niedergleiten resolves', 'Niedergleiten');
    assert(res?.gender === 'n', 'Niedergleiten is neuter nominalized gerund', res?.gender);
    assert(res?.translations.some(t => t.toLowerCase().includes('sliding down') || t.toLowerCase().includes('gliding down')), 'Niedergleiten translation includes sliding down / gliding down', JSON.stringify(res?.translations));
  }

  // ==========================================================================
  // SECTION 3: GRAMMAR TERMINOLOGY & ORDINAL NUMBER INTEGRITY
  // ==========================================================================
  section('SECTION 3: Grammar Terminology & Ordinal Number Integrity');

  const grammarChecks = [
    { word: 'Konjunktiv', pos: 'noun', gender: 'm', match: 'subjunctive' },
    { word: 'Imperativ', pos: 'noun', gender: 'm', match: 'imperative' },
    { word: 'Partizip', pos: 'noun', gender: 'n', match: 'participle' },
    { word: 'Präteritum', pos: 'noun', gender: 'n', match: 'past' },
    { word: 'Futur', pos: 'noun', gender: 'n', match: 'future' },
    { word: 'Grundform', pos: 'noun', gender: 'f', match: 'base form' },
    { word: 'Stammform', pos: 'noun', gender: 'f', match: 'principal part' },
    { word: 'trennbar', pos: 'adj', gender: undefined, match: 'separable' },
  ];

  for (const g of grammarChecks) {
    const res = await compositeDictionaryProvider.lookup(g.word, 'de', 'en');
    assert(res !== null, `Grammar term "${g.word}" resolves`, g.word);
    assert(res?.partOfSpeech?.includes(g.pos), `"${g.word}" POS includes "${g.pos}"`, res?.partOfSpeech);
    if (g.gender) {
      assert(res?.gender === g.gender, `"${g.word}" gender === "${g.gender}"`, res?.gender);
    }
    assert(res?.translations.some(t => t.toLowerCase().includes(g.match.toLowerCase())), `"${g.word}" translation includes "${g.match}"`, JSON.stringify(res?.translations));
  }

  // Ordinals vs Adverbs separation
  {
    const erstRes = await compositeDictionaryProvider.lookup('erst', 'de', 'en');
    assert(erstRes?.partOfSpeech?.includes('adv'), 'erst is adverb', erstRes?.partOfSpeech);
    assert(erstRes?.translations.some(t => t.toLowerCase().includes('only') || t.toLowerCase().includes('not until')), 'erst translation is "only / not until"', JSON.stringify(erstRes?.translations));

    const ersteRes = await compositeDictionaryProvider.lookup('erste', 'de', 'en');
    assert(ersteRes?.partOfSpeech?.includes('num'), 'erste is numeral', ersteRes?.partOfSpeech);
    assert(ersteRes?.translations.some(t => t.toLowerCase().includes('first')), 'erste translation is "first"', JSON.stringify(ersteRes?.translations));
    assert(!ersteRes?.translations.some(t => t.toLowerCase().includes('only') || t.toLowerCase().includes('not until')), 'erste does NOT contain adverb meanings', JSON.stringify(ersteRes?.translations));
  }

  // ==========================================================================
  // SECTION 4: NEGATIVE CONTRACT & SAFETY CHECKS
  // ==========================================================================
  section('SECTION 4: Negative Contract & Unknown Word Safety');

  const negativeCases = [
    'xyzqwert123',
    'nonexistentwordblahnein',
    'Meldebescheinigung',
    'Fahrkartenentwerter',
    'Kaffeerösterei',
    'Wohnungsgebergesetzbuch',
    'lädens',
    'panzerartigstentextabc'
  ];

  for (const neg of negativeCases) {
    const res = await compositeDictionaryProvider.lookup(neg, 'de', 'en');
    assert(res === null, `Unsupported token "${neg}" strictly returns null (no invented translation)`, neg);
  }

  // ==========================================================================
  // SECTION 5: INDEPENDENT GERMAN QUALITY TEST SET (Non-Benchmark Sentences)
  // ==========================================================================
  section('SECTION 5: Independent German Quality Test Set (Coverage vs Translation Accuracy)');

  // Authentic test corpus not used for tuning the 467-token benchmark
  const independentCorpus = [
    // 1. Administrative Context
    {
      sentence: "Bitte legen Sie die Bestätigung des Wohnungsgebers bei der Anmeldung vor.",
      tokens: [
        { word: "Bestätigung", expectedLemma: "Bestätigung", pos: "noun", expectedMeaning: "confirmation" },
        { word: "Wohnungsgebers", expectedLemma: "Wohnungsgeber", pos: "noun", expectedMeaning: "housing provider" },
        { word: "Anmeldung", expectedLemma: "Anmeldung", pos: "noun", expectedMeaning: "registration" },
      ]
    },
    {
      sentence: "Für den Antrag ist ein gültiger Personalausweis erforderlich.",
      tokens: [
        { word: "Personalausweis", expectedLemma: "Personalausweis", pos: "noun", expectedMeaning: "identity card" },
        { word: "erforderlich", expectedLemma: "erforderlich", pos: "adj", expectedMeaning: "required" },
      ]
    },
    {
      sentence: "Bei Überschreitung der Frist kann ein Bußgeld drohen.",
      tokens: [
        { word: "Überschreitung", expectedLemma: "Überschreitung", pos: "noun", expectedMeaning: "exceeding" },
        { word: "Bußgeld", expectedLemma: "Bußgeld", pos: "noun", expectedMeaning: "fine" },
      ]
    },
    // 2. Educational & Grammar Context
    {
      sentence: "In dieser Lektion lernen die Schüler das Präteritum der Hilfsverben.",
      tokens: [
        { word: "Lektion", expectedLemma: "Lektion", pos: "noun", expectedMeaning: "lesson" },
        { word: "Präteritum", expectedLemma: "Präteritum", pos: "noun", expectedMeaning: "past" },
        { word: "Hilfsverben", expectedLemma: "Hilfsverb", pos: "noun", expectedMeaning: "auxiliary" },
      ]
    },
    {
      sentence: "Der Konjunktiv und der Imperativ sind wichtige grammatische Formen.",
      tokens: [
        { word: "Konjunktiv", expectedLemma: "Konjunktiv", pos: "noun", expectedMeaning: "subjunctive" },
        { word: "Imperativ", expectedLemma: "Imperativ", pos: "noun", expectedMeaning: "imperative" },
      ]
    },
    {
      sentence: "Bilden Sie einen Fragesatz in der Grundform.",
      tokens: [
        { word: "Fragesatz", expectedLemma: "Fragesatz", pos: "noun", expectedMeaning: "question" },
        { word: "Grundform", expectedLemma: "Grundform", pos: "noun", expectedMeaning: "base form" },
      ]
    },
    // 3. Everyday & Literary Context
    {
      sentence: "Er schlief unruhig unter der dicken Bettdecke.",
      tokens: [
        { word: "schlief", expectedLemma: "schlafen", pos: "verb", expectedMeaning: "sleep" },
        { word: "unruhig", expectedLemma: "unruhig", pos: "adj", expectedMeaning: "restless" },
        { word: "Bettdecke", expectedLemma: "Bettdecke", pos: "noun", expectedMeaning: "blanket" },
      ]
    },
    {
      sentence: "Am Fahrkartenautomaten kaufte sie eine Fahrkarte für das nächste Verkehrsmittel.",
      tokens: [
        { word: "Fahrkartenautomaten", expectedLemma: "Fahrkartenautomat", pos: "noun", expectedMeaning: "ticket machine" },
        { word: "Fahrkarte", expectedLemma: "Fahrkarte", pos: "noun", expectedMeaning: "ticket" },
        { word: "Verkehrsmittel", expectedLemma: "Verkehrsmittel", pos: "noun", expectedMeaning: "means of transport" },
      ]
    },
    {
      sentence: "Gehen Sie geradeaus bis zum Café an der Ecke.",
      tokens: [
        { word: "geradeaus", expectedLemma: "geradeaus", pos: "adv", expectedMeaning: "straight ahead" },
        { word: "Café", expectedLemma: "Café", pos: "noun", expectedMeaning: "café" },
      ]
    },
    {
      sentence: "Die zweite Straße links führt direkt zur Universität.",
      tokens: [
        { word: "zweite", expectedLemma: "zweite", pos: "num", expectedMeaning: "second" },
        { word: "Universität", expectedLemma: "Universität", pos: "noun", expectedMeaning: "university" },
      ]
    }
  ];

  let independentTotal = 0;
  let independentResolved = 0;
  let independentCorrect = 0;

  for (const item of independentCorpus) {
    for (const t of item.tokens) {
      independentTotal++;
      const res = await compositeDictionaryProvider.lookup(t.word, 'de', 'en');

      if (res !== null) {
        independentResolved++;
        const hasCorrectLemma = !t.expectedLemma || res.lemma === t.expectedLemma || res.query === t.expectedLemma;
        const hasCorrectMeaning = res.translations.some(tr => tr.toLowerCase().includes(t.expectedMeaning.toLowerCase()));
        const hasCorrectPos = !t.pos || res.partOfSpeech?.includes(t.pos);

        if (hasCorrectLemma && hasCorrectMeaning && hasCorrectPos) {
          independentCorrect++;
          assert(true, `[Independent] "${t.word}" -> ${res.translations[0]} (Lemma: ${res.lemma || res.query}, POS: ${res.partOfSpeech}) [CORRECT]`);
        } else {
          assert(false, `[Independent] "${t.word}" translation inaccuracy`, `got: ${JSON.stringify(res.translations)}, expected meaning: "${t.expectedMeaning}"`);
        }
      } else {
        assert(false, `[Independent] "${t.word}" unresolved`, t.word);
      }
    }
  }

  const coveragePct = ((independentResolved / independentTotal) * 100).toFixed(2);
  const accuracyPct = ((independentCorrect / independentTotal) * 100).toFixed(2);

  console.log(`\n  Independent Test Set Evaluated Tokens: ${independentTotal}`);
  console.log(`  Independent Test Set Coverage:         ${independentResolved}/${independentTotal} (${coveragePct}%)`);
  console.log(`  Independent Test Set Correctness:      ${independentCorrect}/${independentTotal} (${accuracyPct}%)`);

  assert(independentResolved === independentTotal, `Independent test set coverage is 100% (${independentResolved}/${independentTotal})`);
  assert(independentCorrect === independentTotal, `Independent test set translation correctness is 100% (${independentCorrect}/${independentTotal})`);

  // ==========================================================================
  // SECTION 6: MULTI-GENRE BENCHMARK REGRESSION VERIFICATION
  // ==========================================================================
  section('SECTION 6: Multi-Genre Benchmark Regression Verification');

  const fixturesDir = path.join(ROOT, 'data-source', 'benchmarks', 'fixtures');
  const fixtureFiles = [
    { name: 'administrative', file: 'administrative-berlin-anmeldung.json' },
    { name: 'informational', file: 'informational-wikipedia-curated.json' },
    { name: 'literature', file: 'literature-kafka-verwandlung.json' },
    { name: 'news', file: 'news-bundesregierung-press.json' },
    { name: 'spoken', file: 'spoken-tatoeba-dialogues.json' },
  ];

  let benchTotal = 0;
  let benchResolved = 0;
  let benchAuthored = 0;
  let benchLegacy = 0;

  for (const { name: genre, file } of fixtureFiles) {
    const fixturePath = path.join(fixturesDir, file);
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const evaluatedTokens = fixture.tokens.filter(t => !t.isExcluded);
    let genreResolved = 0;

    for (const item of evaluatedTokens) {
      benchTotal++;
      const res = await compositeDictionaryProvider.lookup(item.cleaned, 'de', 'en');
      if (res !== null) {
        genreResolved++;
        benchResolved++;
        if (res.providerId === 'authored') {
          benchAuthored++;
        } else {
          benchLegacy++;
        }
      } else {
        console.warn(`    Unresolved benchmark token: [${genre}] "${item.cleaned}"`);
      }
    }

    const genrePct = ((genreResolved / evaluatedTokens.length) * 100).toFixed(2);
    assert(genreResolved === evaluatedTokens.length, `Genre "${genre}": ${genreResolved}/${evaluatedTokens.length} (${genrePct}%)`, genre);
  }

  const benchOverallPct = ((benchResolved / benchTotal) * 100).toFixed(2);
  const benchAuthoredPct = ((benchAuthored / benchTotal) * 100).toFixed(2);
  console.log(`\n  Benchmark Total:    ${benchResolved}/${benchTotal} (${benchOverallPct}%)`);
  console.log(`  Authored Primary:   ${benchAuthored}/${benchTotal} (${benchAuthoredPct}%)`);
  console.log(`  Legacy Fallback:    ${benchLegacy}/${benchTotal} (${((benchLegacy / benchTotal) * 100).toFixed(2)}%)`);

  assert(benchResolved === benchTotal, `Multi-genre benchmark maintains 100% resolution: ${benchResolved}/${benchTotal}`, `${benchResolved}/${benchTotal}`);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n=================================================================');
  console.log(`  PHASE 3.1 AUDIT RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=================================================================');

  if (failures.length > 0) {
    console.log('\n✗ FAILURES:');
    failures.forEach((f, idx) => console.log(`  ${idx + 1}. ${f.label} [${f.context}]`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL PHASE 3.1 QUALITY AUDIT TESTS PASSED SUCCESSFULLY!\n');
  }
}

run().catch((err) => {
  console.error('Fatal error running Phase 3.1 audit suite:', err);
  process.exit(1);
});
