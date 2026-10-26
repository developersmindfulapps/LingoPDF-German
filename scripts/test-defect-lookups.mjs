import { compositeDictionaryProvider } from '../src/services/dictionary/index.ts';

async function testLookups() {
  await compositeDictionaryProvider.ensureInitialized();

  console.log('=====================================================================');
  console.log('  PDF LANGUAGE COMPANION — COMPREHENSIVE DICTIONARY REGRESSION SUITE ');
  console.log('=====================================================================\n');

  // Helper assertion
  function assert(condition, msg) {
    if (!condition) {
      console.error(`  ✗ FAIL: ${msg}`);
      throw new Error(msg);
    }
    console.log(`  ✓ PASS: ${msg}`);
  }

  // --- PART 1: THE 12 PHASE 16 REPORTED DEFECTS ---
  console.log('\n--- PART 1: TWELVE REPORTED DICTIONARY TERMS ---');

  // 1. REDEMITTEL
  const redemittel = await compositeDictionaryProvider.lookup('REDEMITTEL', 'de', 'en');
  assert(!!redemittel, 'REDEMITTEL returns a dictionary result');
  assert(redemittel.lemma === 'Redemittel' || redemittel.query === 'REDEMITTEL', 'REDEMITTEL resolves to Redemittel');
  assert(redemittel.translations.some(t => t.includes('useful phrase') || t.includes('speech resource') || t.includes('expression')), 'REDEMITTEL provides useful phrases translation');

  // 2. Aussagsatz
  const aussagsatz = await compositeDictionaryProvider.lookup('Aussagsatz', 'de', 'en');
  assert(!!aussagsatz, 'Aussagsatz returns a dictionary result');
  assert(aussagsatz.lemma === 'Aussagesatz', 'Aussagsatz resolves to lemma Aussagesatz');
  assert(aussagsatz.translations.some(t => t.includes('declarative') || t.includes('statement')), 'Aussagsatz provides declarative sentence translation');

  // 3. neutrum
  const neutrum = await compositeDictionaryProvider.lookup('neutrum', 'de', 'en');
  assert(!!neutrum, 'neutrum returns a dictionary result');
  assert(neutrum.translations.some(t => t.toLowerCase().includes('neuter')), 'neutrum provides neuter gender translation');

  // 4. Endungen
  const endungen = await compositeDictionaryProvider.lookup('Endungen', 'de', 'en');
  assert(!!endungen, 'Endungen returns a dictionary result');
  assert(endungen.lemma === 'Endung', 'Endungen resolves to lemma Endung');
  assert(endungen.translations.some(t => t.includes('ending') || t.includes('suffix')), 'Endungen provides ending/suffix translation');

  // 5. Personalpronomen
  const personalpronomen = await compositeDictionaryProvider.lookup('Personalpronomen', 'de', 'en');
  assert(!!personalpronomen, 'Personalpronomen returns a dictionary result');
  assert(personalpronomen.translations.some(t => t.includes('personal pronoun')), 'Personalpronomen provides personal pronoun translation');

  // 6. Kursstatistik
  const kursstatistik = await compositeDictionaryProvider.lookup('Kursstatistik', 'de', 'en');
  assert(!!kursstatistik, 'Kursstatistik returns a dictionary result');
  assert(kursstatistik.translations.some(t => t.includes('statistics') || t.includes('survey')), 'Kursstatistik provides course statistics translation');

  // 7. Plural-Endungen
  const pluralEndungen = await compositeDictionaryProvider.lookup('Plural-Endungen', 'de', 'en');
  assert(!!pluralEndungen, 'Plural-Endungen returns a dictionary result');
  assert(pluralEndungen.lemma === 'Plural-Endung' || pluralEndungen.translations.some(t => t.includes('plural ending')), 'Plural-Endungen resolves to plural ending');

  // 8. Kontrollieren & kontrollieren
  const kontrollierenCap = await compositeDictionaryProvider.lookup('Kontrollieren', 'de', 'en');
  assert(!!kontrollierenCap, 'Kontrollieren (capitalized) returns a dictionary result');
  assert(kontrollierenCap.translations.some(t => t.includes('check') || t.includes('verif') || t.includes('inspect')), 'Kontrollieren provides checking/verification translation');

  const kontrollierenLower = await compositeDictionaryProvider.lookup('kontrollieren', 'de', 'en');
  assert(!!kontrollierenLower, 'kontrollieren (lower) returns a dictionary result');
  assert(kontrollierenLower.partOfSpeech === 'verb', 'kontrollieren is identified as verb');
  assert(kontrollierenLower.translations.some(t => t.includes('check') || t.includes('verify')), 'kontrollieren provides to check/verify translation');

  // 9. Müllerstraße & street pattern
  const muellerstrasse = await compositeDictionaryProvider.lookup('Müllerstraße', 'de', 'en');
  assert(!!muellerstrasse, 'Müllerstraße returns a dictionary result');
  assert(muellerstrasse.translations.some(t => t.includes('Street')), 'Müllerstraße translated as street name');

  const rheinstrasse = await compositeDictionaryProvider.lookup('Rheinstraße', 'de', 'en');
  assert(!!rheinstrasse, 'Rheinstraße resolves via compound street name pattern');
  assert(rheinstrasse.translations.some(t => t.includes('Street')), 'Rheinstraße translated as street name');

  // 10. unbestimmter
  const unbestimmter = await compositeDictionaryProvider.lookup('unbestimmter', 'de', 'en');
  assert(!!unbestimmter, 'unbestimmter returns a dictionary result');
  assert(unbestimmter.lemma === 'unbestimmt', 'unbestimmter resolves to lemma unbestimmt');
  assert(unbestimmter.translations.some(t => t.includes('indefinite')), 'unbestimmter provides indefinite translation');

  // 11. Akkusativ
  const akkusativ = await compositeDictionaryProvider.lookup('Akkusativ', 'de', 'en');
  assert(!!akkusativ, 'Akkusativ returns a dictionary result');
  assert(akkusativ.translations.some(t => t.includes('accusative')), 'Akkusativ provides accusative translation');

  // 12. Nominativ
  const nominativ = await compositeDictionaryProvider.lookup('Nominativ', 'de', 'en');
  assert(!!nominativ, 'Nominativ returns a dictionary result');
  assert(nominativ.translations.some(t => t.includes('nominative')), 'Nominativ provides nominative translation');

  // --- PART 2: PREVIOUSLY FIXED DEFECTS ---
  console.log('\n--- PART 2: PREVIOUSLY FIXED DEFECTS ---');

  // Berge -> Berg
  const berge = await compositeDictionaryProvider.lookup('Berge', 'de', 'en');
  assert(!!berge && berge.lemma?.startsWith('Berg'), 'Berge resolves to lemma Berg');
  assert(berge.translations.some(t => t.includes('mountain')), 'Berge translates as mountain');
  assert(!berge.translations.some(t => t.includes('salvage')), 'Berge does not show incorrect "salvage" verb sense');

  // Modalverben & OCR confusion Modatverben
  const modalverben = await compositeDictionaryProvider.lookup('Modalverben', 'de', 'en');
  assert(!!modalverben, 'Modalverben returns a dictionary result');
  assert(modalverben.translations.some(t => t.includes('modal verb')), 'Modalverben translates as modal verb');

  const modatverben = await compositeDictionaryProvider.lookup('Modatverben', 'de', 'en');
  assert(!!modatverben && modatverben.translations.some(t => t.includes('modal verb')), 'Modatverben resolves via OCR confusion to modal verb');

  // müssen & OCR confusion mässen
  const muessen = await compositeDictionaryProvider.lookup('müssen', 'de', 'en');
  assert(!!muessen && muessen.translations.some(t => t.includes('must') || t.includes('have to')), 'müssen translates as must/have to');

  const maessen = await compositeDictionaryProvider.lookup('mässen', 'de', 'en');
  assert(!!maessen && maessen.translations.some(t => t.includes('must') || t.includes('have to')), 'mässen resolves via OCR confusion to müssen');

  // arbeiten
  const arbeiten = await compositeDictionaryProvider.lookup('arbeiten', 'de', 'en');
  assert(!!arbeiten && arbeiten.translations.some(t => t.includes('work')), 'arbeiten translates as work');

  // Telefongespräch
  const tel = await compositeDictionaryProvider.lookup('Telefongespräch', 'de', 'en');
  assert(!!tel && tel.translations.some(t => t.includes('phone') || t.includes('call')), 'Telefongespräch translates as telephone call');

  // Homographs: morgen vs Morgen
  const m1 = await compositeDictionaryProvider.lookup('morgen', 'de', 'en');
  const m2 = await compositeDictionaryProvider.lookup('Morgen', 'de', 'en');
  assert(m1?.partOfSpeech === 'adv', 'morgen (lowercase) is adverb');
  assert(m2?.partOfSpeech === 'noun', 'Morgen (capitalized) is noun');

  // Unknown non-word
  const unknown = await compositeDictionaryProvider.lookup('xyzqwert', 'de', 'en');
  assert(unknown === null, 'Unknown word cleanly returns null');

  console.log('\n=====================================================================');
  console.log('🎉 ALL COMPREHENSIVE DICTIONARY TESTS PASSED SUCCESSFULLY!');
  console.log('=====================================================================\n');
}

testLookups().catch((err) => {
  console.error('\n✗ TEST FAILURE:', err);
  process.exit(1);
});
