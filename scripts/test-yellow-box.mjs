import fs from 'node:fs';
import path from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createWorker, OEM, PSM } from 'tesseract.js';

function createBmpBuffer(width, height, rgbData) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize);

  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(-height, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(pixelArraySize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  let dstOffset = 54;
  let srcOffset = 0;
  for (let y = 0; y < height; y++) {
    const rowStart = dstOffset;
    for (let x = 0; x < width; x++) {
      const r = rgbData[srcOffset++];
      const g = rgbData[srcOffset++];
      const b = rgbData[srcOffset++];
      buf[dstOffset++] = b;
      buf[dstOffset++] = g;
      buf[dstOffset++] = r;
    }
    while ((dstOffset - rowStart) % 4 !== 0) {
      buf[dstOffset++] = 0;
    }
  }
  return buf;
}

async function testYellowBox() {
  const pdfBytes = new Uint8Array(fs.readFileSync('kursbuch.pdf'));
  const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const page = await doc.getPage(57);
  const vp = page.getViewport({ scale: 2.0 });

  // In Node, we can get page operator list image or render via node-canvas if available
  // Let's check how page 57 image is stored
  const ops = await page.getOperatorList();
  let imgObj = null;
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
      const imgName = ops.argsArray[i][0];
      await new Promise(r => page.objs.get(imgName, img => { imgObj = img; r(); }));
      if (imgObj) break;
    }
  }

  // We know the image is flipped with transform matrix [-581, 0, 0, -790, 581, 790]
  // Let's flip it correctly (both horizontal and vertical flip = 180 deg rotation)
  const W = imgObj.width;
  const H = imgObj.height;
  const rgb = imgObj.data;
  const upright = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const srcIdx = (y * W + x) * 3;
      const dstX = W - 1 - x;
      const dstY = H - 1 - y;
      const dstIdx = (dstY * W + dstX) * 3;
      upright[dstIdx] = rgb[srcIdx];
      upright[dstIdx + 1] = rgb[srcIdx + 1];
      upright[dstIdx + 2] = rgb[srcIdx + 2];
    }
  }

  // In the upright image (902 x 1226), where is the yellow possessive box?
  // Looking at the screenshot, it is in the lower-right quadrant, around x: 65%..90%, y: 65%..80%
  const cropX0 = Math.floor(W * 0.65);
  const cropX1 = Math.floor(W * 0.90);
  const cropY0 = Math.floor(H * 0.65);
  const cropY1 = Math.floor(H * 0.78);
  const cropW = cropX1 - cropX0;
  const cropH = cropY1 - cropY0;

  const cropRgb = new Uint8Array(cropW * cropH * 3);
  let cIdx = 0;
  for (let y = cropY0; y < cropY1; y++) {
    for (let x = cropX0; x < cropX1; x++) {
      const idx = (y * W + x) * 3;
      cropRgb[cIdx++] = upright[idx];
      cropRgb[cIdx++] = upright[idx + 1];
      cropRgb[cIdx++] = upright[idx + 2];
    }
  }

  const bmp = createBmpBuffer(cropW, cropH, cropRgb);
  fs.writeFileSync('test-assets/possessive-crop.bmp', bmp);
  console.log(`Saved possessive crop: ${cropW} x ${cropH}`);

  const worker = await createWorker('deu', OEM.LSTM_ONLY, {
    corePath: path.resolve('public/tesseract') + path.sep,
    langPath: path.resolve('public/tessdata'),
    gzip: true,
    workerBlobURL: false,
  });

  for (const psm of [PSM.AUTO, PSM.SPARSE_TEXT, PSM.SINGLE_BLOCK, PSM.AUTO_OSD]) {
    await worker.setParameters({ tessedit_pageseg_mode: psm });
    const res = await worker.recognize(bmp);
    console.log(`\n--- PSM ${psm} ---`);
    console.log(res.data.text);
    console.log('Words:', res.data.words.map(w => `${w.text} [conf=${w.confidence}, bbox=${JSON.stringify(w.bbox)}]`));
  }

  await worker.terminate();
}

testYellowBox().catch(console.error);
