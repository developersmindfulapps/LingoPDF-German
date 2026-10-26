import fs from 'node:fs';
import path from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { OCRService } from '../src/services/ocr/ocrService.ts';

// Helper to create BMP buffer from ImageData/RGBA
function createBmpFromRgba(width, height, rgbaData) {
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
      const r = rgbaData[srcOffset++];
      const g = rgbaData[srcOffset++];
      const b = rgbaData[srcOffset++];
      srcOffset++; // skip alpha
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

// In node-environment, render page using PDF.js into a dummy canvas context or check
async function testHighResOCR() {
  const pdfBytes = new Uint8Array(fs.readFileSync('kursbuch.pdf'));
  const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const page = await doc.getPage(59);

  // Let's test the native scan image scaled up vs down
  const bmp = fs.readFileSync('test-assets/page-59-upright.bmp');
  const width = bmp.readInt32LE(18);
  const height = Math.abs(bmp.readInt32LE(22));
  console.log('Native image size:', width, height);

  // Let's test OCR on the native image
  const ocr = OCRService.getInstance();
  ocr.configurePaths({
    corePath: path.resolve('public/tesseract') + path.sep,
    langPath: path.resolve('public/tessdata')
  });

  const res = await ocr.recognize(bmp, 59);
  console.log('Words count at native resolution:', res.words.length);
  const words = res.words.map(w => w.text);

  const targets = ['Modalverben', 'Modatverben', 'arbeiten', 'einkaufen', 'arkaufen', 'Berge', 'müssen', 'mässen', 'Telefongespräch', 'morgen'];
  for (const t of targets) {
    const found = res.words.filter(w => w.text.toLowerCase().includes(t.toLowerCase()));
    console.log(`Target "${t}": count=${found.length}`);
    for (const f of found) {
      console.log(`   "${f.text}" bbox:`, f.bbox, 'conf:', f.confidence);
    }
  }
}

testHighResOCR().catch(console.error);
