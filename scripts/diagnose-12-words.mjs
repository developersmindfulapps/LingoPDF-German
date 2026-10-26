import fs from 'node:fs';

const authoredDict = JSON.parse(fs.readFileSync('public/data/authored-de-en-dictionary.json'));
const authoredInfl = JSON.parse(fs.readFileSync('public/data/authored-de-en-inflections.json'));
const legacyDict = JSON.parse(fs.readFileSync('public/data/de-en-dictionary.json'));
const legacyInfl = JSON.parse(fs.readFileSync('public/data/de-en-inflections.json'));

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

for (const w of words) {
  console.log(`\n=================== "${w}" ===================`);
  const lower = w.toLowerCase();
  const cap = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

  console.log('Authored Dict:', {
    exact: authoredDict[w],
    cap: authoredDict[cap],
    lower: authoredDict[lower],
  });

  console.log('Authored Inflections:', {
    exact: authoredInfl[w],
    cap: authoredInfl[cap],
    lower: authoredInfl[lower],
  });

  console.log('Legacy Dict:', {
    exact: legacyDict.entries ? legacyDict.entries[w] : legacyDict[w],
    cap: legacyDict.entries ? legacyDict.entries[cap] : legacyDict[cap],
    lower: legacyDict.entries ? legacyDict.entries[lower] : legacyDict[lower],
  });

  console.log('Legacy Inflections:', {
    exact: legacyInfl[w],
    cap: legacyInfl[cap],
    lower: legacyInfl[lower],
  });
}
