import fs from 'node:fs';

const authoredDict = JSON.parse(fs.readFileSync('public/data/authored-de-en-dictionary.json', 'utf8'));
const authoredInfl = JSON.parse(fs.readFileSync('public/data/authored-de-en-inflections.json', 'utf8'));
const legacyDict = JSON.parse(fs.readFileSync('public/data/de-en-dictionary.json', 'utf8'));
const legacyInfl = JSON.parse(fs.readFileSync('public/data/de-en-inflections.json', 'utf8'));

// Helper to check if a word exists in dictionary
function isKnownWord(w) {
  const q = w.trim();
  const lower = q.toLowerCase();
  const title = lower[0].toUpperCase() + lower.slice(1);
  return (
    authoredDict[q] || authoredDict[lower] || authoredDict[title] ||
    authoredInfl[lower] ||
    legacyDict[q] || legacyDict[lower] || legacyDict[title] ||
    legacyInfl[lower]
  );
}

// Common OCR substitution pairs in German
const OCR_CONFUSIONS = [
  ['t', 'l'], ['l', 't'],
  ['ä', 'ü'], ['ü', 'ä'],
  ['ö', 'o'], ['o', 'ö'],
  ['rn', 'm'], ['m', 'rn'],
  ['cl', 'd'], ['d', 'cl'],
  ['vv', 'w'], ['w', 'vv'],
  ['ß', 'ss'], ['ss', 'ß'],
  ['1', 'l'], ['l', '1'],
  ['0', 'o'], ['o', '0'],
  ['f', 't'], ['t', 'f'],
];

function generateOcrCandidates(word) {
  const candidates = new Set();
  const lower = word.toLowerCase();

  // Try single character / bigram OCR confusion substitutions
  for (const [from, to] of OCR_CONFUSIONS) {
    let pos = 0;
    while ((pos = lower.indexOf(from, pos)) !== -1) {
      // Replace instance
      const candLower = lower.slice(0, pos) + to + lower.slice(pos + from.length);
      // Preserve case of original word
      let cand = candLower;
      if (word[0] === word[0].toUpperCase()) {
        cand = candLower[0].toUpperCase() + candLower.slice(1);
      }
      if (isKnownWord(cand)) {
        candidates.add(cand);
      }
      pos += from.length;
    }
  }

  return Array.from(candidates);
}

console.log('Testing "Modatverben":', generateOcrCandidates('Modatverben'));
console.log('Testing "mässen":', generateOcrCandidates('mässen'));
console.log('Testing "arbeiten":', generateOcrCandidates('arbeiten'));
console.log('Testing "xyzfoobar":', generateOcrCandidates('xyzfoobar'));
