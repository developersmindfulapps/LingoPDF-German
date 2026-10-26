import fs from 'node:fs';
import path from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { OCRService } from '../src/services/ocr/ocrService.ts';

function createBmpBuffer(width, height, rgbData, isRotated180 = true) {
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
  buf.writeInt32LE(-height, 22); // top-down
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(pixelArraySize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  let dstOffset = 54;
  if (!isRotated180) {
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
  } else {
    // 180 degree rotation: read from end of buffer to start
    let srcOffset = rgbData.length - 3;
    for (let y = 0; y < height; y++) {
      const rowStart = dstOffset;
      for (let x = 0; x < width; x++) {
        const r = rgbData[srcOffset];
        const g = rgbData[srcOffset + 1];
        const b = rgbData[srcOffset + 2];
        srcOffset -= 3;
        buf[dstOffset++] = b;
        buf[dstOffset++] = g;
        buf[dstOffset++] = r;
      }
      while ((dstOffset - rowStart) % 4 !== 0) {
        buf[dstOffset++] = 0;
      }
    }
  }

  return buf;
}

async function runPage59() {
  const pdfBytes = new Uint8Array(fs.readFileSync('kursbuch.pdf'));
  const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const page = await doc.getPage(59);
  const ops = await page.getOperatorList();
  let imgObj = null;
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
      const imgName = ops.argsArray[i][0];
      await new Promise(r => page.objs.get(imgName, img => { imgObj = img; r(); }));
      if (imgObj) break;
    }
  }

  const bmp = createBmpBuffer(imgObj.width, imgObj.height, imgObj.data, true);
  fs.writeFileSync('test-assets/page-59-upright.bmp', bmp);

  const ocr = OCRService.getInstance();
  ocr.configurePaths({
    corePath: path.resolve('public/tesseract') + path.sep,
    langPath: path.resolve('public/tessdata')
  });

  const res = await ocr.recognize(bmp, 59);
  console.log('=== PAGE 59 OCR RESULT (UPRIGHT) ===');
  console.log('Total words:', res.words.length);
  console.log(res.text);

  fs.writeFileSync('test-assets/page-59-ocr.json', JSON.stringify(res, null, 2));

  // Find specific words:
  for (const w of res.words) {
    if (
      w.text.toLowerCase().includes('modal') ||
      w.text.toLowerCase().includes('modat') ||
      w.text.toLowerCase().includes('arbeit') ||
      w.text.toLowerCase().includes('berg') ||
      w.text.toLowerCase().includes('müss') ||
      w.text.toLowerCase().includes('mäss') ||
      w.text.toLowerCase().includes('telefon') ||
      w.text.toLowerCase().includes('morgen')
    ) {
      console.log(`FOUND: "${w.text}" bbox:`, w.bbox, 'conf:', w.confidence);
    }
  }
}

runPage59().catch(console.error);
