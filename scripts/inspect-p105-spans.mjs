import fs from 'node:fs';

const spans = JSON.parse(fs.readFileSync('test-assets/phase16-spans-page-105.json'));
console.log('Total spans on page 105:', spans.length);

// Let's print spans grouped by vertical bands:
// Band 1: top header & text 12a (top: 0 .. 250)
// Band 2: Box 1 (Weihnachtsmarkt) (top: 250 .. 450)
// Band 3: Box 2 (Wattenmeer) (top: 450 .. 650)
// Band 4: Box 3 (Oktoberfest) (top: 650 .. 850)
// Band 5: Bottom exercises (top: 850 .. )

for (const s of spans) {
  if (s.top >= 200 && s.top <= 800) {
    console.log(`[top=${s.top}, left=${s.left}, w=${s.width}, h=${s.height}]: "${s.text}"`);
  }
}
