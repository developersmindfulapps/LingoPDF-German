import fs from 'node:fs';
import path from 'node:path';
import { OCRService } from '../src/services/ocr/ocrService.ts';

// In page-59-upright.bmp:
// Exercise 11a email is roughly x: 100..450, y: 300..450
// The yellow callout box is on the right of the email:
// x: ~480..750, y: ~330..470 (or relative to page height 1143, width 790)

async function testCrop() {
  const bmp = fs.readFileSync('test-assets/page-59-upright.bmp');
  const width = bmp.readInt32LE(18);
  const height = Math.abs(bmp.readInt32LE(22));
  console.log('BMP dimensions:', width, height);

  // Let's create a cropped BMP of the right side where the yellow box is:
  // x from 450 to 760, y from 300 to 500
  const cropX0 = 450;
  const cropY0 = 320;
  const cropW = 310;
  const cropH = 180;

  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const cropRowSize = Math.floor((24 * cropW + 31) / 32) * 4;
  const cropPixelSize = cropRowSize * cropH;
  const cropBuf = Buffer.alloc(54 + cropPixelSize);

  bmp.copy(cropBuf, 0, 0, 54);
  cropBuf.writeInt32LE(cropW, 18);
  cropBuf.writeInt32LE(-cropH, 22);
  cropBuf.writeUInt32LE(cropPixelSize, 34);

  let dstOffset = 54;
  for (let y = cropY0; y < cropY0 + cropH; y++) {
    const srcRowStart = 54 + y * rowSize;
    const rowDst = dstOffset;
    for (let x = cropX0; x < cropX0 + cropW; x++) {
      const srcPx = srcRowStart + x * 3;
      cropBuf[dstOffset++] = bmp[srcPx];
      cropBuf[dstOffset++] = bmp[srcPx + 1];
      cropBuf[dstOffset++] = bmp[srcPx + 2];
    }
    while ((dstOffset - rowDst) % 4 !== 0) {
      cropBuf[dstOffset++] = 0;
    }
  }

  fs.writeFileSync('test-assets/crop-callout.bmp', cropBuf);
  console.log('Saved crop-callout.bmp');

  const ocr = OCRService.getInstance();
  ocr.configurePaths({
    corePath: path.resolve('public/tesseract') + path.sep,
    langPath: path.resolve('public/tessdata')
  });

  const res = await ocr.recognize(cropBuf, 1);
  console.log('Crop OCR text:', JSON.stringify(res.text));
  console.log('Crop words:', res.words.map(w => w.text));
}

testCrop().catch(console.error);
