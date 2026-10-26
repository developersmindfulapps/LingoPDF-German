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

async function diagnose() {
  const pdfBytes = new Uint8Array(fs.readFileSync('kursbuch.pdf'));
  const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  console.log('kursbuch.pdf numPages:', doc.numPages);

  const ocr = OCRService.getInstance();
  ocr.configurePaths({
    corePath: path.resolve('public/tesseract') + path.sep,
    langPath: path.resolve('public/tessdata')
  });

  for (const pageNum of [58, 59, 60, 61]) {
    console.log(`\n=================== PAGE ${pageNum} ===================`);
    const page = await doc.getPage(pageNum);
    const vp = page.getViewport({ scale: 1.0 });
    console.log(`Page ${pageNum} viewport: ${vp.width} x ${vp.height}`);

    const ops = await page.getOperatorList();
    let imgObj = null;
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
        const imgName = ops.argsArray[i][0];
        await new Promise(r => page.objs.get(imgName, img => { imgObj = img; r(); }));
        if (imgObj) break;
      }
    }

    if (!imgObj) {
      console.log('No image found on page', pageNum);
      continue;
    }

    console.log(`Native image: ${imgObj.width} x ${imgObj.height}`);

    // If native image is landscape (height < width), rotate it 90 deg clockwise
    let width = imgObj.width;
    let height = imgObj.height;
    let rgb = imgObj.data;

    if (width > height) {
      console.log('Rotating 90 deg clockwise to upright portrait...');
      const rotW = height;
      const rotH = width;
      const rotData = new Uint8Array(rotW * rotH * 3);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIdx = (y * width + x) * 3;
          const dstX = height - 1 - y;
          const dstY = x;
          const dstIdx = (dstY * rotW + dstX) * 3;
          rotData[dstIdx] = rgb[srcIdx];
          rotData[dstIdx + 1] = rgb[srcIdx + 1];
          rotData[dstIdx + 2] = rgb[srcIdx + 2];
        }
      }
      width = rotW;
      height = rotH;
      rgb = rotData;
    }

    // High-res 2x scaling (same as our renderPageForOCR)
    const scale = 2;
    const scaledW = width * scale;
    const scaledH = height * scale;
    const scaledData = new Uint8Array(scaledW * scaledH * 3);

    for (let y = 0; y < scaledH; y++) {
      const srcY = Math.floor(y / scale);
      for (let x = 0; x < scaledW; x++) {
        const srcX = Math.floor(x / scale);
        const srcIdx = (srcY * width + srcX) * 3;
        const dstIdx = (y * scaledW + x) * 3;
        scaledData[dstIdx] = rgb[srcIdx];
        scaledData[dstIdx + 1] = rgb[srcIdx + 1];
        scaledData[dstIdx + 2] = rgb[srcIdx + 2];
      }
    }

    const bmp = createBmpBuffer(scaledW, scaledH, scaledData);
    console.log(`Running OCR on ${scaledW} x ${scaledH}...`);
    const res = await ocr.recognize(bmp, pageNum);

    console.log(`Total recognized words: ${res.words.length}`);

    // Check header words (top 12% of height)
    const headerCutoff = scaledH * 0.12;
    const headerWords = res.words.filter(w => w.bbox.y0 < headerCutoff);
    console.log(`\nHeader words (y0 < ${Math.round(headerCutoff)}):`, headerWords.map(w => `${w.text} [y0=${w.bbox.y0}]`).join(', '));

    // Check footer words (bottom 10% of height)
    const footerCutoff = scaledH * 0.90;
    const footerWords = res.words.filter(w => w.bbox.y1 > footerCutoff);
    console.log(`\nFooter words (y1 > ${Math.round(footerCutoff)}):`, footerWords.map(w => `${w.text} [y0=${w.bbox.y0}, y1=${w.bbox.y1}]`).join(', '));

    // Check for page numbers (digits near top or bottom edges)
    const edgeNumbers = res.words.filter(w => /^\d+$/.test(w.text) && (w.bbox.y0 < headerCutoff || w.bbox.y1 > footerCutoff));
    console.log(`\nEdge numbers (digits at top/bottom):`, edgeNumbers.map(w => `"${w.text}" at [y0=${w.bbox.y0}, y1=${w.bbox.y1}, x0=${w.bbox.x0}, x1=${w.bbox.x1}]`));

    // Check callout words
    const calloutWords = res.words.filter(w => 
      ['modalverben', 'satz', 'kinder', 'können', 'helfen', 'samstag', 'muss', 'arbeiten'].some(kw => w.text.toLowerCase().includes(kw))
    );
    console.log(`\nCallout / Keyword words:`);
    for (const w of calloutWords) {
      console.log(`  "${w.text}" (conf: ${w.confidence}) at [x0=${w.bbox.x0}, y0=${w.bbox.y0}, x1=${w.bbox.x1}, y1=${w.bbox.y1}]`);
    }

    // Save OCR words for analysis
    fs.writeFileSync(`test-assets/diagnose-page-${pageNum}-ocr.json`, JSON.stringify(res, null, 2));
  }

  await ocr.terminate();
}

diagnose().catch(console.error);
