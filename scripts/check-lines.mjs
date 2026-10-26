import fs from 'node:fs';
import path from 'node:path';
import { createWorker, OEM } from 'tesseract.js';

async function checkLines() {
  const bmp = fs.readFileSync('test-assets/page-59-upright.bmp');
  const worker = await createWorker('deu', OEM.LSTM_ONLY, {
    corePath: path.resolve('public/tesseract') + path.sep,
    langPath: path.resolve('public/tessdata'),
    gzip: true,
    workerBlobURL: false,
  });
  const res = await worker.recognize(bmp, {}, { blocks: true });
  const lines = res.data.blocks[0].paragraphs[0].lines;
  console.log('Lines count:', lines.length);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    console.log(`Line ${i}: y0=${l.bbox.y0}, y1=${l.bbox.y1}, words=${l.words.length}: ${JSON.stringify(l.text)}`);
  }
  await worker.terminate();
}

checkLines().catch(console.error);
