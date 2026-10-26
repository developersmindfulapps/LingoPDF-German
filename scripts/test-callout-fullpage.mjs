import fs from 'node:fs';
import path from 'node:path';
import { createWorker, OEM, PSM } from 'tesseract.js';

async function testCalloutFullPage() {
  const bmp = fs.readFileSync('test-assets/page-59-upright.bmp');
  const width = bmp.readInt32LE(18);
  const height = Math.abs(bmp.readInt32LE(22));

  // Let's test with PSM and parameters:
  // e.g. textord_heavy_nr=1, or other tesseract parameters
  const worker = await createWorker('deu', OEM.LSTM_ONLY, {
    corePath: path.resolve('public/tesseract') + path.sep,
    langPath: path.resolve('public/tessdata'),
    gzip: true,
    workerBlobURL: false,
  });

  // Let's test default parameters first on upscale (2x)
  // Scaling 902x1226 up 2x to 1804x2452 (nearest neighbor / bilinear)
  console.log('Testing 2x upscaled full page...');
  const upW = width * 2;
  const upH = height * 2;
  const upRowSize = Math.floor((24 * upW + 31) / 32) * 4;
  const upPixelSize = upRowSize * upH;
  const upBuf = Buffer.alloc(54 + upPixelSize);

  bmp.copy(upBuf, 0, 0, 54);
  upBuf.writeInt32LE(upW, 18);
  upBuf.writeInt32LE(-upH, 22);
  upBuf.writeUInt32LE(upPixelSize, 34);

  const srcRowSize = Math.floor((24 * width + 31) / 32) * 4;
  let dst = 54;
  for (let y = 0; y < upH; y++) {
    const srcY = Math.floor(y / 2);
    const srcRow = 54 + srcY * srcRowSize;
    const rowDst = dst;
    for (let x = 0; x < upW; x++) {
      const srcX = Math.floor(x / 2);
      const px = srcRow + srcX * 3;
      upBuf[dst++] = bmp[px];
      upBuf[dst++] = bmp[px + 1];
      upBuf[dst++] = bmp[px + 2];
    }
    while ((dst - rowDst) % 4 !== 0) {
      upBuf[dst++] = 0;
    }
  }

  const res2x = await worker.recognize(upBuf, {}, { blocks: true, text: true });
  const text2x = res2x.data.text || '';
  console.log('2x text length:', text2x.length);
  console.log('Contains "Satz"?', text2x.includes('Satz'));
  console.log('Contains "helfen"?', text2x.includes('helfen'));
  console.log('Contains "Kinder"?', text2x.includes('Kinder'));

  await worker.terminate();
}

testCalloutFullPage().catch(console.error);
