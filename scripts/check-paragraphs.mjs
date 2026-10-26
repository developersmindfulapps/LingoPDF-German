import fs from 'node:fs';
import path from 'node:path';
import { createWorker, OEM } from 'tesseract.js';

async function checkParagraphs() {
  const bmp = fs.readFileSync('test-assets/page-59-upright.bmp');
  const worker = await createWorker('deu', OEM.LSTM_ONLY, {
    corePath: path.resolve('public/tesseract') + path.sep,
    langPath: path.resolve('public/tessdata'),
    gzip: true,
    workerBlobURL: false,
  });
  const res = await worker.recognize(bmp, {}, { blocks: true });
  const block = res.data.blocks[0];
  console.log('Paragraphs count:', block.paragraphs.length);
  for (let i = 0; i < block.paragraphs.length; i++) {
    const p = block.paragraphs[i];
    console.log(`Para ${i}: bbox=${JSON.stringify(p.bbox)}, lines=${p.lines.length}, text=${JSON.stringify(p.text.slice(0, 40))}`);
  }
  await worker.terminate();
}

checkParagraphs().catch(console.error);
