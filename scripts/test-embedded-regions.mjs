import fs from 'node:fs';
import path from 'node:path';
import { createWorker, OEM } from 'tesseract.js';

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

function cropRgbToBmp(srcRgb, srcW, srcH, cropX, cropY, cropW, cropH) {
  const cropData = new Uint8Array(cropW * cropH * 3);
  let dstIdx = 0;
  for (let y = cropY; y < cropY + cropH; y++) {
    for (let x = cropX; x < cropX + cropW; x++) {
      const srcIdx = (y * srcW + x) * 3;
      cropData[dstIdx++] = srcRgb[srcIdx];
      cropData[dstIdx++] = srcRgb[srcIdx + 1];
      cropData[dstIdx++] = srcRgb[srcIdx + 2];
    }
  }
  return createBmpBuffer(cropW, cropH, cropData);
}

export function detectEmbeddedRegions(rgb, width, height) {
  const ds = 4;
  const dsW = Math.floor(width / ds);
  const dsH = Math.floor(height / ds);
  const mask = new Uint8Array(dsW * dsH);

  for (let dy = 0; dy < dsH; dy++) {
    const y = dy * ds;
    const rowStart = y * width * 3;
    for (let dx = 0; dx < dsW; dx++) {
      const x = dx * ds;
      const px = rowStart + x * 3;
      const r = rgb[px], g = rgb[px + 1], b = rgb[px + 2];
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const diff = maxC - minC;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // Tinted / shaded callout background (color saturation / chroma difference > 20, not near-black text, not pure white)
      if (lum > 110 && lum < 248 && diff > 20) {
        mask[dy * dsW + dx] = 1;
      }
    }
  }

  const visited = new Uint8Array(dsW * dsH);
  const regions = [];

  for (let y = 0; y < dsH; y++) {
    for (let x = 0; x < dsW; x++) {
      const idx = y * dsW + x;
      if (mask[idx] === 1 && visited[idx] === 0) {
        let minX = x, maxX = x, minY = y, maxY = y;
        let count = 0;
        const queue = [x, y];
        visited[idx] = 1;
        let qHead = 0;

        while (qHead < queue.length) {
          const cx = queue[qHead++];
          const cy = queue[qHead++];
          count++;
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < dsW && ny >= 0 && ny < dsH) {
              const nIdx = ny * dsW + nx;
              if (mask[nIdx] === 1 && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                queue.push(nx, ny);
              }
            }
          }
        }

        const nativeW = (maxX - minX + 1) * ds;
        const nativeH = (maxY - minY + 1) * ds;
        // Bounding box filter: minimum 80x35px, min 40 downsampled pixels, max 90% of page
        if (nativeW >= 80 && nativeH >= 35 && count >= 40 && nativeW < width * 0.95 && nativeH < height * 0.95) {
          const pad = 10;
          const px0 = Math.max(0, minX * ds - pad);
          const py0 = Math.max(0, minY * ds - pad);
          const px1 = Math.min(width, (maxX + 1) * ds + pad);
          const py1 = Math.min(height, (maxY + 1) * ds + pad);
          regions.push({
            x: px0,
            y: py0,
            width: px1 - px0,
            height: py1 - py0,
          });
        }
      }
    }
  }
  return regions;
}

async function runTest() {
  const bmp = fs.readFileSync('test-assets/page-59-upright.bmp');
  const width = bmp.readInt32LE(18);
  const height = Math.abs(bmp.readInt32LE(22));
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;

  const rgb = new Uint8Array(width * height * 3);
  let dst = 0;
  for (let y = 0; y < height; y++) {
    const rowStart = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const px = rowStart + x * 3;
      rgb[dst++] = bmp[px + 2]; // R
      rgb[dst++] = bmp[px + 1]; // G
      rgb[dst++] = bmp[px];     // B
    }
  }

  const regions = detectEmbeddedRegions(rgb, width, height);
  console.log('Detected embedded regions count:', regions.length);
  for (let i = 0; i < regions.length; i++) {
    const r = regions[i];
    console.log(`Region ${i}: [x=${r.x}, y=${r.y}, w=${r.width}, h=${r.height}]`);
  }

  const worker = await createWorker('deu', OEM.LSTM_ONLY, {
    corePath: path.resolve('public/tesseract') + path.sep,
    langPath: path.resolve('public/tessdata'),
    gzip: true,
    workerBlobURL: false,
  });

  for (let i = 0; i < regions.length; i++) {
    const r = regions[i];
    const cropBmp = cropRgbToBmp(rgb, width, height, r.x, r.y, r.width, r.height);
    const res = await worker.recognize(cropBmp, {}, { blocks: true });
    console.log(`\n--- Region ${i} Recognition: ---`);
    console.log(JSON.stringify(res.data.text.trim()));
  }

  await worker.terminate();
}

if (process.argv[1] && process.argv[1].endsWith('test-embedded-regions.mjs')) {
  runTest().catch(console.error);
}
