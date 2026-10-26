import fs from 'node:fs';
import path from 'node:path';
import { createWorker, OEM, PSM } from 'tesseract.js';

async function testPsm() {
  const bmp = fs.readFileSync('test-assets/page-59-upright.bmp');

  const modes = [
    { name: 'AUTO (3)', psm: PSM.AUTO },
    { name: 'SPARSE_TEXT (11)', psm: PSM.SPARSE_TEXT },
    { name: 'SINGLE_COLUMN (4)', psm: PSM.SINGLE_COLUMN },
  ];

  for (const m of modes) {
    console.log(`\nTesting PSM: ${m.name}`);
    const worker = await createWorker('deu', OEM.LSTM_ONLY, {
      corePath: path.resolve('public/tesseract') + path.sep,
      langPath: path.resolve('public/tessdata'),
      gzip: true,
      workerBlobURL: false,
    });
    await worker.setParameters({
      tessedit_pageseg_mode: m.psm,
    });

    const res = await worker.recognize(bmp, {}, { blocks: true, text: true });
    const text = res.data.text || '';
    console.log(`PSM ${m.name}: text length = ${text.length}`);
    console.log('Contains Satz?', text.includes('Satz'));
    console.log('Contains helfen?', text.includes('helfen'));
    console.log('Contains Modalverben?', text.includes('Modalverben'));
    await worker.terminate();
  }
}

testPsm().catch(console.error);
