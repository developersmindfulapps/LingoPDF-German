import fs from 'node:fs';
import path from 'node:path';
import { compositeDictionaryProvider, localDictionaryProvider, authoredDictionaryProvider } from '../src/services/dictionary/index.ts';

const words = [
  'Redemittel',
  'Aussagesatz',
  'Aussagsatz',
  'Neutrum',
  'Endungen',
  'Personalpronomen',
  'Kursstatistik',
  'Plural-Endungen',
  'kontrollieren',
  'Kontrollieren',
  'Müllerstraße',
  'unbestimmter',
  'Akkusativ',
  'Nominativ'
];

async function main() {
  await compositeDictionaryProvider.ensureInitialized();
  console.log('=== DETAILED AUDIT OF PHASE 2 VOCABULARY GAP WORDS ===\n');

  // Check occurrences in authoring source JSON files
  console.log('[Authoring Source Files (data-source/authoring/*.json)]:');
  const authoringDir = path.resolve(process.cwd(), 'data-source', 'authoring');
  for (const f of fs.readdirSync(authoringDir)) {
    if (!f.endsWith('.json')) continue;
    const content = fs.readFileSync(path.join(authoringDir, f), 'utf8');
    for (const w of words) {
      if (content.includes(`"${w}"`)) {
        console.log(`  • "${w}" found in ${f}`);
      }
    }
  }

  console.log('\n[Lookup Resolution in Providers]:');
  for (const w of words) {
    const comp = await compositeDictionaryProvider.lookup(w, 'de', 'en');
    const auth = await authoredDictionaryProvider.lookup(w, 'de', 'en');
    const leg = await localDictionaryProvider.lookup(w, 'de', 'en');

    console.log(`\nWord: "${w}"`);
    console.log(`  Composite Provider: ${comp ? JSON.stringify({
      found: true,
      providerId: comp.providerId,
      lemma: comp.lemma,
      partOfSpeech: comp.partOfSpeech,
      translations: comp.translations,
      gender: comp.gender,
      plural: comp.plural,
      source: comp.source,
      isDerived: comp.isDerived
    }) : 'null (NOT FOUND)'}`);

    console.log(`  Authored Provider:  ${auth ? JSON.stringify({
      found: true,
      lemma: auth.lemma,
      partOfSpeech: auth.partOfSpeech,
      translations: auth.translations
    }) : 'null'}`);

    console.log(`  Legacy Provider:    ${leg ? JSON.stringify({
      found: true,
      lemma: leg.lemma,
      partOfSpeech: leg.partOfSpeech,
      translations: leg.translations
    }) : 'null'}`);
  }
}

main().catch(console.error);
