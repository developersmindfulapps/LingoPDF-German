import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('test-assets/raw-page57-spans.json'));
console.log('Total spans on page 57:', data.spans.length);
const eee = data.spans.filter(s => s.text.includes('EEE') || s.text.includes('AA'));
console.log('EEE/AA spans count:', eee.length);
console.log('EEE/AA spans:', eee);

const poss = data.spans.filter(s => 
  ['possessiv', 'mein', 'meine', 'sohn', 'kind', 'tochter', 'kinder'].some(k => s.text.toLowerCase().includes(k))
);
console.log('\nPossessive words on page 57 count:', poss.length);
for (const p of poss) {
  console.log(`  "${p.text}" [left=${Math.round(p.rect.left)}, top=${Math.round(p.rect.top)}, w=${Math.round(p.rect.width)}, h=${Math.round(p.rect.height)}]`);
}
