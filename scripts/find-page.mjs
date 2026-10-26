import fs from 'node:fs';
import path from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { OCRService } from '../src/services/ocr/ocrService.ts';

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

async function dumpPages() {
  const pdfBytes = new Uint8Array(fs.readFileSync('kursbuch.pdf'));
  const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const ocr = OCRService.getInstance();
  ocr.configurePaths({
    corePath: path.resolve('public/tesseract') + path.sep,
    langPath: path.resolve('public/tessdata')
  });

  for (let p = 57; p <= 61; p++) {
    const page = await doc.getPage(p);
    const ops = await page.getOperatorList();
    let imgObj = null;
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
        const imgName = ops.argsArray[i][0];
        await new Promise(r => page.objs.get(imgName, img => { imgObj = img; r(); }));
        if (imgObj) break;
      }
    }
    if (!imgObj) continue;
    const bmp = createBmpBuffer(imgObj.width, imgObj.height, imgObj.data);
    const res = await ocr.recognize(bmp, p);
    console.log(`=== PAGE ${p} ===`);
    console.log(res.text.slice(0, 400));
    fs.writeFileSync(`test-assets/page-${p}-ocr.json`, JSON.stringify(res, null, 2));
    fs.writeFileSync(`test-assets/page-${p}.bmp`, bmp);
  }
}
dumpPages().catch(console.error);
