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

  let dst = 54;
  let src = 0;
  for (let y = 0; y < height; y++) {
    const rowStart = dst;
    for (let x = 0; x < width; x++) {
      const r = rgbData[src++];
      const g = rgbData[src++];
      const b = rgbData[src++];
      buf[dst++] = b;
      buf[dst++] = g;
      buf[dst++] = r;
    }
    while ((dst - rowStart) % 4 !== 0) buf[dst++] = 0;
  }
  return buf;
}

async function testWithAllRegions() {
  const pdfBytes = new Uint8Array(fs.readFileSync('kursbuch.pdf'));
  const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const page = await doc.getPage(57);
  const ops = await page.getOperatorList();
  let imgObj = null;
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
      const imgName = ops.argsArray[i][0];
      await new Promise(r => page.objs.get(imgName, img => { imgObj = img; r(); }));
      if (imgObj) break;
    }
  }

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

  // 2x scaling (same as renderPageForOCR)
  const scale = 2;
  const sW = W * scale;
  const sH = H * scale;
  const sData = new Uint8Array(sW * sH * 3);
  for (let y = 0; y < sH; y++) {
    const srcY = Math.floor(y / scale);
    for (let x = 0; x < sW; x++) {
      const srcX = Math.floor(x / scale);
      const srcIdx = (srcY * W + srcX) * 3;
      const dstIdx = (y * sW + x) * 3;
      sData[dstIdx] = upright[srcIdx];
      sData[dstIdx + 1] = upright[srcIdx + 1];
      sData[dstIdx + 2] = upright[srcIdx + 2];
    }
  }

  const bmp = createBmpBuffer(sW, sH, sData);
  const ocr = OCRService.getInstance();
  ocr.configurePaths({
    corePath: path.resolve('public/tesseract') + path.sep,
    langPath: path.resolve('public/tessdata')
  });

  const res = await ocr.recognize(bmp, 57);
  console.log('Total recognized words:', res.words.length);
  const possessiveWords = res.words.filter(w =>
    ['possessivartikel', 'mein', 'meine', 'sohn', 'kind', 'tochter', 'kinder'].some(k => w.text.toLowerCase().includes(k))
  );
  console.log('Possessive table words recognized:', possessiveWords);
  await ocr.terminate();
}

testWithAllRegions().catch(console.error);
