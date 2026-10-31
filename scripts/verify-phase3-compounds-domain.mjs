/**
 * scripts/verify-phase3-compounds-domain.mjs
 *
 * Dedicated Phase 3 Verification Suite:
 * - Compounds and Domain Vocabulary (Administrative & Literary)
 * - Initial 6 candidates regression: Meldebehörde, Wohnungsgebers, Personalausweis, panzerartig, bogenförmigen, Ungeziefer
 * - Compound inflections (genitive, plural)
 * - Exact compound precedence over decomposition
 * - Domain vocabulary resolution (admin, lit, info, news, spoken)
 * - Sentence-start capitalization invariance
 * - Negative contract (unknown compounds return null)
 * - 5-genre benchmark resolution measurement
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
  console.log('  LINGO PDF — PHASE 3 COMPOUNDS & DOMAIN VOCABULARY TEST SUITE   ');
  console.log('=================================================================\n');

  await compositeDictionaryProvider.ensureInitialized();

  // ==========================================================================
  // SECTION 1: THE SIX REPORTED CANDIDATES
  // ==========================================================================
  section('SECTION 1: Six Reported Initial Regression Candidates');

  // 1. Meldebehörde (administrative compound noun)
  {
    const res = await compositeDictionaryProvider.lookup('Meldebehörde', 'de', 'en');
    assert(res !== null, 'Meldebehörde resolves', 'Meldebehörde');
    assert(res?.providerId === 'authored', 'Meldebehörde providerId === "authored"', res?.providerId);
    assert(res?.translations.some(t => t.toLowerCase().includes('registration') || t.toLowerCase().includes('office')), 'Meldebehörde translation includes "registration" / "office"', JSON.stringify(res?.translations));
    assert(res?.partOfSpeech?.includes('noun'), 'Meldebehörde partOfSpeech includes "noun"', res?.partOfSpeech);
    assert(res?.gender === 'f', 'Meldebehörde gender === "f"', res?.gender);
  }

  // 2. Wohnungsgebers (inflected genitive of compound Wohnungsgeber)
  {
    const res = await compositeDictionaryProvider.lookup('Wohnungsgebers', 'de', 'en');
    assert(res !== null, 'Wohnungsgebers (inflected genitive) resolves', 'Wohnungsgebers');
    assert(res?.providerId === 'authored', 'Wohnungsgebers providerId === "authored"', res?.providerId);
    assert(res?.lemma === 'Wohnungsgeber', 'Wohnungsgebers lemma === "Wohnungsgeber"', res?.lemma);
    assert(res?.translations.some(t => t.toLowerCase().includes('landlord') || t.toLowerCase().includes('housing provider')), 'Wohnungsgebers translation includes landlord / housing provider', JSON.stringify(res?.translations));

    // Also base lemma and plural
    const baseRes = await compositeDictionaryProvider.lookup('Wohnungsgeber', 'de', 'en');
    assert(baseRes !== null, 'Wohnungsgeber (base lemma) resolves', 'Wohnungsgeber');
    assert(baseRes?.gender === 'm', 'Wohnungsgeber gender === "m"', baseRes?.gender);

    const plRes = await compositeDictionaryProvider.lookup('wohnungsgeber', 'de', 'en');
    assert(plRes !== null, 'wohnungsgeber (lowercase) resolves to lemma', 'wohnungsgeber');
  }

  // 3. Personalausweis (administrative compound noun)
  {
    const res = await compositeDictionaryProvider.lookup('Personalausweis', 'de', 'en');
    assert(res !== null, 'Personalausweis resolves', 'Personalausweis');
    assert(res?.providerId === 'authored', 'Personalausweis providerId === "authored"', res?.providerId);
    assert(res?.translations.some(t => t.toLowerCase().includes('identity card') || t.toLowerCase().includes('id card')), 'Personalausweis translation includes ID / identity card', JSON.stringify(res?.translations));
    assert(res?.gender === 'm', 'Personalausweis gender === "m"', res?.gender);

    const plRes = await compositeDictionaryProvider.lookup('Personalausweise', 'de', 'en');
    assert(plRes !== null, 'Personalausweise (plural) resolves to lemma', 'Personalausweise');
    assert(plRes?.lemma === 'Personalausweis', 'Personalausweise lemma === "Personalausweis"', plRes?.lemma);
  }

  // 4. panzerartig (literary descriptive adjective)
  {
    const res = await compositeDictionaryProvider.lookup('panzerartig', 'de', 'en');
    assert(res !== null, 'panzerartig resolves', 'panzerartig');
    assert(res?.providerId === 'authored', 'panzerartig providerId === "authored"', res?.providerId);
    assert(res?.translations.some(t => t.toLowerCase().includes('armor') || t.toLowerCase().includes('armoured') || t.toLowerCase().includes('shell')), 'panzerartig translation includes armor / shell', JSON.stringify(res?.translations));
    assert(res?.partOfSpeech?.includes('adj'), 'panzerartig partOfSpeech includes "adj"', res?.partOfSpeech);

    // Inflections
    for (const infl of ['panzerartige', 'panzerartiger', 'panzerartiges', 'panzerartigen']) {
      const iRes = await compositeDictionaryProvider.lookup(infl, 'de', 'en');
      assert(iRes !== null, `panzerartig inflection "${infl}" resolves`, infl);
      assert(iRes?.lemma === 'panzerartig', `"${infl}" lemma === "panzerartig"`, iRes?.lemma);
    }

    // Capitalized at sentence start
    const capRes = await compositeDictionaryProvider.lookup('Panzerartig', 'de', 'en');
    assert(capRes !== null, 'Panzerartig (capitalized) resolves to lemma panzerartig', 'Panzerartig');
    assert(capRes?.lemma === 'panzerartig', 'Panzerartig lemma === "panzerartig"', capRes?.lemma);
  }

  // 5. bogenförmigen (literary inflected adjective)
  {
    const res = await compositeDictionaryProvider.lookup('bogenförmigen', 'de', 'en');
    assert(res !== null, 'bogenförmigen (inflected) resolves', 'bogenförmigen');
    assert(res?.providerId === 'authored', 'bogenförmigen providerId === "authored"', res?.providerId);
    assert(res?.lemma === 'bogenförmig', 'bogenförmigen lemma === "bogenförmig"', res?.lemma);
    assert(res?.translations.some(t => t.toLowerCase().includes('arch') || t.toLowerCase().includes('curved')), 'bogenförmigen translation includes arch / curved', JSON.stringify(res?.translations));

    // Base lemma
    const baseRes = await compositeDictionaryProvider.lookup('bogenförmig', 'de', 'en');
    assert(baseRes !== null, 'bogenförmig (base lemma) resolves', 'bogenförmig');

    // Capitalized sentence start
    const capRes = await compositeDictionaryProvider.lookup('Bogenförmig', 'de', 'en');
    assert(capRes !== null, 'Bogenförmig (capitalized) resolves to lemma bogenförmig', 'Bogenförmig');
    assert(capRes?.lemma === 'bogenförmig', 'Bogenförmig lemma === "bogenförmig"', capRes?.lemma);
  }

  // 6. Ungeziefer (literary noun)
  {
    const res = await compositeDictionaryProvider.lookup('Ungeziefer', 'de', 'en');
    assert(res !== null, 'Ungeziefer resolves', 'Ungeziefer');
    assert(res?.providerId === 'authored', 'Ungeziefer providerId === "authored"', res?.providerId);
    assert(res?.translations.some(t => t.toLowerCase().includes('vermin') || t.toLowerCase().includes('pests')), 'Ungeziefer translation includes vermin / pests', JSON.stringify(res?.translations));
    assert(res?.gender === 'n', 'Ungeziefer gender === "n"', res?.gender);

    // Genitive inflection
    const genRes = await compositeDictionaryProvider.lookup('Ungeziefers', 'de', 'en');
    assert(genRes !== null, 'Ungeziefers (genitive) resolves', 'Ungeziefers');
    assert(genRes?.lemma === 'Ungeziefer', 'Ungeziefers lemma === "Ungeziefer"', genRes?.lemma);
  }

  // ==========================================================================
  // SECTION 2: COMPOUND NOUNS & INFLECTIONS
  // ==========================================================================
  section('SECTION 2: Compound Nouns and Inflections');

  const compoundCases = [
    { word: 'Einzugsdatum', lemma: 'Einzugsdatum', gender: 'n', match: 'move-in date', infl: ['Einzugsdatums', 'Einzugsdaten'] },
    { word: 'Mietvertrag', lemma: 'Mietvertrag', gender: 'm', match: 'rental agreement', infl: ['Mietvertrags', 'Mietvertrages', 'Mietverträge', 'Mietverträgen'] },
    { word: 'Bußgeld', lemma: 'Bußgeld', gender: 'n', match: 'fine', infl: ['Bußgeldes', 'Bußgelds', 'Bußgelder', 'Bußgeldern'] },
    { word: 'Bettdecke', lemma: 'Bettdecke', gender: 'f', match: 'blanket', infl: ['Bettdecken'] },
    { word: 'Menschenzimmer', lemma: 'Menschenzimmer', gender: 'n', match: 'human room', infl: ['Menschenzimmers', 'Menschenzimmern'] },
    { word: 'Zeitschrift', lemma: 'Zeitschrift', gender: 'f', match: 'magazine', infl: ['Zeitschriften'] },
    { word: 'Heißgetränk', lemma: 'Heißgetränk', gender: 'n', match: 'hot beverage', infl: ['Heißgetränke', 'Heißgetränken', 'Heißgetränks'] },
    { word: 'Kaffeebohne', lemma: 'Kaffeebohne', gender: 'f', match: 'coffee bean', infl: ['Kaffeebohnen'] },
    { word: 'Kaffeepflanze', lemma: 'Kaffeepflanze', gender: 'f', match: 'coffee plant', infl: ['Kaffeepflanzen'] },
    { word: 'Straßenverkehr', lemma: 'Straßenverkehr', gender: 'm', match: 'road traffic', infl: ['Straßenverkehrs'] },
    { word: 'Verkehrsmittel', lemma: 'Verkehrsmittel', gender: 'n', match: 'means of transport', infl: ['Verkehrsmitteln', 'Verkehrsmittels'] },
    { word: 'Fahrkartenautomat', lemma: 'Fahrkartenautomat', gender: 'm', match: 'ticket machine', infl: ['Fahrkartenautomaten'] },
    { word: 'Zusammenhalt', lemma: 'Zusammenhalt', gender: 'm', match: 'cohesion', infl: ['Zusammenhalts'] },
    { word: 'Niedergleiten', lemma: 'Niedergleiten', gender: 'n', match: 'sliding down', infl: ['Niedergleitens'] },
  ];

  for (const c of compoundCases) {
    const res = await compositeDictionaryProvider.lookup(c.word, 'de', 'en');
    assert(res !== null, `Compound "${c.word}" resolves`, c.word);
    assert(res?.providerId === 'authored', `"${c.word}" providerId === "authored"`, res?.providerId);
    assert(res?.gender === c.gender, `"${c.word}" gender === "${c.gender}"`, res?.gender);
    assert(res?.translations.some(t => t.toLowerCase().includes(c.match.toLowerCase())), `"${c.word}" translation includes "${c.match}"`, JSON.stringify(res?.translations));

    // Test inflections
    for (const infl of c.infl) {
      const iRes = await compositeDictionaryProvider.lookup(infl, 'de', 'en');
      assert(iRes !== null, `Inflected compound "${infl}" resolves`, infl);
      assert(iRes?.lemma === c.lemma, `"${infl}" maps to lemma "${c.lemma}"`, iRes?.lemma);
    }
  }

  // ==========================================================================
  // SECTION 3: EXACT COMPOUND MATCHES OVER DECOMPOSITION
  // ==========================================================================
  section('SECTION 3: Exact Compound Matches Precedence Over Decomposition');

  const exactCheckWords = [
    { word: 'Lieblingsfilm', expectedTranslation: 'favorite film' },
    { word: 'Lieblingsmusik', expectedTranslation: 'favorite music' },
    { word: 'Meldebehörde', expectedTranslation: 'registration office' },
    { word: 'Fahrkartenautomat', expectedTranslation: 'ticket machine' },
    { word: 'Personalausweis', expectedTranslation: 'identity card' },
  ];

  for (const item of exactCheckWords) {
    const res = await compositeDictionaryProvider.lookup(item.word, 'de', 'en');
    assert(res !== null, `Exact compound "${item.word}" resolves`, item.word);
    assert(res?.source === 'dictionary', `"${item.word}" source === "dictionary" (not decomposed)`, res?.source);
    assert(res?.translations.some(t => t.toLowerCase().includes(item.expectedTranslation.toLowerCase())), `"${item.word}" uses exact definition: "${item.expectedTranslation}"`, JSON.stringify(res?.translations));
  }

  // ==========================================================================
  // SECTION 4: DOMAIN VOCABULARY ACROSS GENRES
  // ==========================================================================
  section('SECTION 4: Domain Vocabulary Across Genres');

  const domainWords = [
    // Administrative
    { word: 'Anmeldung', pos: 'noun', match: 'registration' },
    { word: 'Bestätigung', pos: 'noun', match: 'confirmation' },
    { word: 'Anschrift', pos: 'noun', match: 'address' },
    { word: 'Eigentümer', pos: 'noun', match: 'owner' },
    { word: 'Überschreitung', pos: 'noun', match: 'exceeding' },
    { word: 'verpflichtet', pos: 'adj', match: 'obligated' },
    { word: 'zuständig', pos: 'adj', match: 'responsible' },
    { word: 'schriftlich', pos: 'adj', match: 'written' },
    { word: 'erforderlich', pos: 'adj', match: 'required' },
    { word: 'gebührenfrei', pos: 'adj', match: 'free of charge' },
    { word: 'gesetzlich', pos: 'adj', match: 'statutory' },
    { word: 'vollständig', pos: 'adj', match: 'complete' },
    { word: 'bürokratisch', pos: 'adj', match: 'bureaucratic' },

    // Literary
    { word: 'unruhig', pos: 'adj', match: 'restless' },
    { word: 'gewölbt', pos: 'adj', match: 'arched' },
    { word: 'geteilt', pos: 'adj', match: 'divided' },
    { word: 'sonstig', pos: 'adj', match: 'other' },
    { word: 'kläglich', pos: 'adj', match: 'pitiful' },
    { word: 'wohlbekannt', pos: 'adj', match: 'well-known' },
    { word: 'illustriert', pos: 'adj', match: 'illustrated' },
    { word: 'hübsch', pos: 'adj', match: 'pretty' },
    { word: 'Versteifung', pos: 'noun', match: 'stiffening' },

    // Informational / Science / News
    { word: 'umweltfreundlich', pos: 'adj', match: 'environmentally friendly' },
    { word: 'weltweit', pos: 'adj', match: 'worldwide' },
    { word: 'spürbar', pos: 'adj', match: 'noticeable' },
    { word: 'kontinuierlich', pos: 'adj', match: 'continuous' },
    { word: 'modern', pos: 'adj', match: 'modern' },
    { word: 'tropisch', pos: 'adj', match: 'tropical' },
    { word: 'ursprünglich', pos: 'adj', match: 'original' },
    { word: 'bezahlbar', pos: 'adj', match: 'affordable' },
    { word: 'verlässlich', pos: 'adj', match: 'reliable' },
    { word: 'gesellschaftlich', pos: 'adj', match: 'social' },
    { word: 'gemeinsam', pos: 'adj', match: 'common' },
    { word: 'geradeaus', pos: 'adv', match: 'straight ahead' },
    { word: 'Bürgerin', pos: 'noun', match: 'citizen' },
    { word: 'Ministerin', pos: 'noun', match: 'minister' },
    { word: 'Innovation', pos: 'noun', match: 'innovation' },
    { word: 'Unterstützung', pos: 'noun', match: 'support' },
    { word: 'Technologie', pos: 'noun', match: 'technology' },
    { word: 'Investition', pos: 'noun', match: 'investment' },
  ];

  for (const dw of domainWords) {
    const res = await compositeDictionaryProvider.lookup(dw.word, 'de', 'en');
    assert(res !== null, `Domain word "${dw.word}" resolves`, dw.word);
    assert(res?.partOfSpeech?.includes(dw.pos), `"${dw.word}" partOfSpeech includes "${dw.pos}"`, res?.partOfSpeech);
    assert(res?.translations.some(t => t.toLowerCase().includes(dw.match.toLowerCase())), `"${dw.word}" translation includes "${dw.match}"`, JSON.stringify(res?.translations));
  }

  // ==========================================================================
  // SECTION 5: CAPITALIZATION INVARIANCE AT SENTENCE START
  // ==========================================================================
  section('SECTION 5: Capitalization Invariance at Sentence Start');

  const sentenceStartWords = [
    { input: 'Verpflichtet', expectedLemma: 'verpflichtet' },
    { input: 'Zuständig', expectedLemma: 'zuständig' },
    { input: 'Schriftlich', expectedLemma: 'schriftlich' },
    { input: 'Erforderlich', expectedLemma: 'erforderlich' },
    { input: 'Gebührenfrei', expectedLemma: 'gebührenfrei' },
    { input: 'Unruhig', expectedLemma: 'unruhig' },
    { input: 'Gewölbt', expectedLemma: 'gewölbt' },
    { input: 'Umweltfreundlich', expectedLemma: 'umweltfreundlich' },
    { input: 'Geradeaus', expectedLemma: 'geradeaus' },
  ];

  for (const sw of sentenceStartWords) {
    const res = await compositeDictionaryProvider.lookup(sw.input, 'de', 'en');
    assert(res !== null, `"${sw.input}" (sentence start) resolves`, sw.input);
    assert(res?.lemma === sw.expectedLemma, `"${sw.input}" resolves to lowercase lemma "${sw.expectedLemma}"`, res?.lemma);
  }

  // ==========================================================================
  // SECTION 6: NEGATIVE CONTRACT — UNKNOWN WORDS RETURN NULL
  // ==========================================================================
  section('SECTION 6: Negative Contract — Unknown Words Return Null');

  const negativeWords = [
    'xyzqwert123',
    'nonexistentwordblahnein',
    'Meldebescheinigung',
    'Fahrkartenentwerter',
    'Kaffeerösterei',
    'Wohnungsgebergesetzbuch',
    'panzerartigstentextabc',
    'Fahrkartenautomates', // Weak masculine noun does not take -es genitive; Stage 4 suffix stripping must not match it
  ];

  for (const nw of negativeWords) {
    const res = await compositeDictionaryProvider.lookup(nw, 'de', 'en');
    assert(res === null, `Unknown word "${nw}" returns null (no guessed translation)`, nw);
  }

  // ==========================================================================
  // SECTION 7: FULL FIVE-GENRE BENCHMARK RESOLUTION
  // ==========================================================================
  section('SECTION 7: Five-Genre Benchmark Measurement');

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
      } else {
        console.warn(`    Unresolved benchmark token: [${genre}] "${item.cleaned}"`);
      }
    }

    const genrePct = ((genreResolved / evaluatedTokens.length) * 100).toFixed(2);
    assert(genreResolved === evaluatedTokens.length, `Genre "${genre}": ${genreResolved}/${evaluatedTokens.length} (${genrePct}%)`, genre);
  }

  const overallPct = ((totalResolved / totalTokens) * 100).toFixed(2);
  const authoredPct = ((totalAuthored / totalTokens) * 100).toFixed(2);
  console.log(`\n  Benchmark Total: ${totalResolved}/${totalTokens} (${overallPct}%)`);
  console.log(`  Authored Primary: ${totalAuthored}/${totalTokens} (${authoredPct}%)`);
  console.log(`  Legacy Fallback: ${totalLegacy}/${totalTokens} (${((totalLegacy / totalTokens) * 100).toFixed(2)}%)`);
  assert(totalResolved === totalTokens, `100% benchmark resolution achieved: ${totalResolved}/${totalTokens}`, `${totalResolved}/${totalTokens}`);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n=================================================================');
  console.log(`  PHASE 3 RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=================================================================');

  if (failures.length > 0) {
    console.log('\n✗ FAILURES:');
    failures.forEach((f, idx) => console.log(`  ${idx + 1}. ${f.label} [${f.context}]`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL PHASE 3 COMPOUNDS & DOMAIN TESTS PASSED SUCCESSFULLY!\n');
  }
}

run().catch((err) => {
  console.error('Fatal error running Phase 3 verification suite:', err);
  process.exit(1);
});
