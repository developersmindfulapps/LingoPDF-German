import fs from 'node:fs';
import path from 'node:path';
import { createWorker, OEM, PSM } from 'tesseract.js';

async function checkBlocks() {
  const bmp = fs.readFileSync('test-assets/page-59-upright.bmp');
  const worker = await createWorker('deu', OEM.LSTM_ONLY, {
    corePath: path.resolve('public/tesseract') + path.sep,
    langPath: path.resolve('public/tessdata'),
    gzip: true,
    workerBlobURL: false,
  });
  const res = await worker.recognize(bmp, {}, { blocks: true });
  console.log('Total blocks:', res.data.blocks.length);
  for (let i = 0; i < res.data.blocks.length; i++) {
    const b = res.data.blocks[i];
    console.log(`Block ${i}: bbox=${JSON.stringify(b.bbox)}, text=${JSON.stringify(b.text.slice(0, 50))}`);
  }
  await worker.terminate();
}

checkBlocks().catch(console.error);
