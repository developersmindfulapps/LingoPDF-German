import fs from 'node:fs';
const data = JSON.parse(fs.readFileSync('test-assets/page-59-ocr.json', 'utf8'));
console.log('Image dimensions:', data.imageWidth, data.imageHeight);
console.log('Words count:', data.words.length);

const targets = ['Modalverben', 'Modatverben', 'Satz', 'Kinder', 'helfen', 'Telefongespräch', 'arbeiten', 'einkaufen', 'Berge', 'müssen', 'mässen', 'morgen', 'Stress', 'arkaufen'];

data.words.forEach((w, i) => {
  for (const t of targets) {
    if (w.text.toLowerCase().includes(t.toLowerCase())) {
      console.log(`[${i}] "${w.text}" (conf ${w.confidence}): x0=${w.bbox.x0}, y0=${w.bbox.y0}, x1=${w.bbox.x1}, y1=${w.bbox.y1}`);
      break;
    }
  }
});
