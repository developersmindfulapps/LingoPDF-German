import { compositeDictionaryProvider } from '../src/services/dictionary/index.ts';

const words = [
  'REDEMITTEL',
  'Aussagsatz',
  'neutrum',
  'Endungen',
  'Personalpronomen',
  'Kursstatistik',
  'Plural-Endungen',
  'Kontrollieren',
  'Müllerstraße',
  'unbestimmter',
  'Akkusativ',
  'Nominativ'
];

async function main() {
  await compositeDictionaryProvider.ensureInitialized();
  for (const word of words) {
    const res = await compositeDictionaryProvider.lookup(word, 'de', 'en');
    console.log(`Word: "${word}" ->`, res ? {
      lemma: res.lemma,
      pos: res.partOfSpeech,
      translations: res.translations,
      source: res.source,
      providerId: res.providerId
    } : 'NULL (NOT FOUND)');
  }
}

main().catch(console.error);
