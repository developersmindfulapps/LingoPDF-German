import fs from 'node:fs';
import path from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

function detectEmbeddedRegions(rgba, width, height) {
  if (width < 200 || height < 200) return [];
  const ds = 4;
  const dsW = Math.floor(width / ds);
  const dsH = Math.floor(height / ds);
  const mask = new Uint8Array(dsW * dsH);

  for (let dy = 0; dy < dsH; dy++) {
    const y = dy * ds;
    const rowStart = y * width * 4;
    for (let dx = 0; dx < dsW; dx++) {
      const x = dx * ds;
      const px = rowStart + x * 4;
      const r = rgba[px];
      const g = rgba[px + 1];
      const b = rgba[px + 2];
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const diff = maxC - minC;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 110 && lum < 245 && diff > 35) {
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
        if (nativeW >= 120 && nativeH >= 60 && count >= 80 && nativeW < width * 0.90 && nativeH < height * 0.90) {
          const pad = 6;
          const px0 = Math.max(0, minX * ds - pad);
          const py0 = Math.max(0, minY * ds - pad);
          const px1 = Math.min(width, (maxX + 1) * ds + pad);
          const py1 = Math.min(height, (maxY + 1) * ds + pad);
          regions.push({
            x: px0,
            y: py0,
            width: px1 - px0,
            height: py1 - py0,
            score: count,
          });
        }
      }
    }
  }

  regions.sort((a, b) => b.score - a.score);
  return regions;
}

async function testPage105() {
  const pdfBytes = new Uint8Array(fs.readFileSync('kursbuch.pdf'));
  const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const page = await doc.getPage(105);
  const ops = await page.getOperatorList();
  let imgObj = null;
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
      const imgName = ops.argsArray[i][0];
      await new Promise(r => page.objs.get(imgName, img => { imgObj = img; r(); }));
      if (imgObj) break;
    }
  }
  console.log('Page 105 image dim:', imgObj.width, 'x', imgObj.height);
  const W = imgObj.width;
  const H = imgObj.height;
  // Convert rgb to rgba
  const rgba = new Uint8Array(W * H * 4);
  let src = 0, dst = 0;
  for (let i = 0; i < W * H; i++) {
    rgba[dst++] = imgObj.data[src++];
    rgba[dst++] = imgObj.data[src++];
    rgba[dst++] = imgObj.data[src++];
    rgba[dst++] = 255;
  }

  const regions = detectEmbeddedRegions(rgba, W, H);
  console.log('Page 105 detected regions count:', regions.length);
  console.log('Regions:', regions);
}

testPage105().catch(console.error);
