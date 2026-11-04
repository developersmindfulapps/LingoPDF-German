import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// ============================================================================
// 1. PURE NODE.JS PNG ENCODER
// ============================================================================
function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}
const CRC_TABLE = createCrcTable();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

export function encodePng(width, height, rgbaBuffer) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = Buffer.alloc(4 + 4 + 13 + 4);
  ihdrChunk.writeUInt32BE(13, 0);
  ihdrChunk.write('IHDR', 4);
  ihdr.copy(ihdrChunk, 8);
  ihdrChunk.writeUInt32BE(crc32(ihdrChunk.subarray(4, 21)), 21);

  // IDAT chunk
  const rawScanlineLen = 1 + width * 4;
  const raw = Buffer.alloc(height * rawScanlineLen);
  for (let y = 0; y < height; y++) {
    raw[y * rawScanlineLen] = 0;
    rgbaBuffer.copy(raw, y * rawScanlineLen + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const idatChunk = Buffer.alloc(4 + 4 + compressed.length + 4);
  idatChunk.writeUInt32BE(compressed.length, 0);
  idatChunk.write('IDAT', 4);
  compressed.copy(idatChunk, 8);
  idatChunk.writeUInt32BE(crc32(idatChunk.subarray(4, 8 + compressed.length)), 8 + compressed.length);

  // IEND chunk
  const iendChunk = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// ============================================================================
// 2. EXTENSION ICONS (16x16, 48x48, 128x128)
// ============================================================================
export function renderAppIconBuffer(size) {
  const SAMPLES = size <= 32 ? 4 : 2;
  const outBuf = Buffer.alloc(size * size * 4);

  const pad = size <= 16 ? 0.04 : 0.08;
  const cornerR = 0.22;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;

      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const u = (px + (sx + 0.5) / SAMPLES) / size;
          const v = (py + (sy + 0.5) / SAMPLES) / size;

          const bx0 = pad, by0 = pad, bx1 = 1 - pad, by1 = 1 - pad;
          let insideBadge = false;

          if (u >= bx0 && u <= bx1 && v >= by0 && v <= by1) {
            const cr = cornerR;
            const inCornerTL = u < bx0 + cr && v < by0 + cr;
            const inCornerTR = u > bx1 - cr && v < by0 + cr;
            const inCornerBL = u < bx0 + cr && v > by1 - cr;
            const inCornerBR = u > bx1 - cr && v > by1 - cr;

            if (inCornerTL) {
              const dx = u - (bx0 + cr), dy = v - (by0 + cr);
              insideBadge = (dx * dx + dy * dy) <= cr * cr;
            } else if (inCornerTR) {
              const dx = u - (bx1 - cr), dy = v - (by0 + cr);
              insideBadge = (dx * dx + dy * dy) <= cr * cr;
            } else if (inCornerBL) {
              const dx = u - (bx0 + cr), dy = v - (by1 - cr);
              insideBadge = (dx * dx + dy * dy) <= cr * cr;
            } else if (inCornerBR) {
              const dx = u - (bx1 - cr), dy = v - (by1 - cr);
              insideBadge = (dx * dx + dy * dy) <= cr * cr;
            } else {
              insideBadge = true;
            }
          }

          if (!insideBadge) {
            if (size >= 48 && v > pad + 0.04) {
              const sby0 = by0 + 0.03, sby1 = by1 + 0.04;
              if (u >= bx0 && u <= bx1 && v >= sby0 && v <= sby1) {
                aSum += 0.15;
              }
            }
            continue;
          }

          const gradT = (u * 0.4 + v * 0.6);
          let bgR = 79 - gradT * 24;
          let bgG = 70 - gradT * 22;
          let bgB = 229 - gradT * 66;

          const isInnerBorder = (u < bx0 + 0.03 || u > bx1 - 0.03 || v < by0 + 0.03 || v > by1 - 0.03);
          if (isInnerBorder && size >= 48) {
            bgR = bgR * 0.8 + 255 * 0.2;
            bgG = bgG * 0.8 + 255 * 0.2;
            bgB = bgB * 0.8 + 255 * 0.2;
          }

          const bookW = 0.58;
          const bookH = 0.44;
          const bookX0 = 0.5 - bookW / 2;
          const bookX1 = 0.5 + bookW / 2;
          const bookY0 = 0.5 - bookH / 2;
          const bookY1 = 0.5 + bookH / 2;

          let r = bgR, g = bgG, b = bgB, a = 1.0;

          const spineX = 0.50;
          const spineGap = size <= 16 ? 0.05 : 0.035;

          const isLeftPageX = (u >= bookX0 && u <= spineX - spineGap / 2);
          const isRightPageX = (u >= spineX + spineGap / 2 && u <= bookX1);

          if (isLeftPageX || isRightPageX) {
            const normX = isLeftPageX
              ? (u - bookX0) / (spineX - spineGap / 2 - bookX0)
              : (bookX1 - u) / (bookX1 - (spineX + spineGap / 2));
            
            const arch = Math.sin(normX * Math.PI) * 0.04;
            const pageTop = bookY0 + (1 - normX) * 0.02;
            const pageBottom = bookY1 - arch;

            if (v >= pageTop && v <= pageBottom) {
              const spineDist = Math.abs(u - spineX);
              const spineShadow = Math.min(Math.max((spineGap * 2.5 - spineDist) / (spineGap * 2), 0), 1);

              let pageR = 255 - spineShadow * 40;
              let pageG = 255 - spineShadow * 35;
              let pageB = 255 - spineShadow * 20;

              if (size >= 32) {
                const line1Y = bookY0 + bookH * 0.32;
                const line2Y = bookY0 + bookH * 0.52;
                const line3Y = bookY0 + bookH * 0.72;
                const lineH = size >= 128 ? 0.035 : 0.045;
                const linePad = 0.04;

                const withinLineX = isLeftPageX
                  ? (u >= bookX0 + linePad && u <= spineX - spineGap / 2 - linePad)
                  : (u >= spineX + spineGap / 2 + linePad && u <= bookX1 - linePad);

                if (withinLineX) {
                  if (Math.abs(v - line1Y) < lineH || Math.abs(v - line2Y) < lineH || (Math.abs(v - line3Y) < lineH && normX > 0.3)) {
                    pageR = pageR * 0.75 + 160 * 0.25;
                    pageG = pageG * 0.75 + 175 * 0.25;
                    pageB = pageB * 0.75 + 200 * 0.25;
                  }
                }
              }

              r = pageR;
              g = pageG;
              b = pageB;
            }
          }

          const ribW = size <= 16 ? 0.08 : 0.06;
          const ribX0 = spineX - ribW / 2;
          const ribX1 = spineX + ribW / 2;
          const ribY0 = bookY0 - 0.03;
          const ribY1 = bookY0 + bookH * 0.62;

          if (u >= ribX0 && u <= ribX1 && v >= ribY0 && v <= ribY1) {
            const vDist = ribY1 - v;
            const centerDist = Math.abs(u - spineX) / (ribW / 2);
            const notchCutout = centerDist < 1.0 && vDist < (1.0 - centerDist) * 0.03;

            if (!notchCutout) {
              r = 245;
              g = 158;
              b = 11;
            }
          }

          rSum += r;
          gSum += g;
          bSum += b;
          aSum += a;
        }
      }

      const totalSamples = SAMPLES * SAMPLES;
      const finalA = Math.min(Math.max(aSum / totalSamples, 0), 1);
      const finalR = Math.min(Math.max(rSum / totalSamples, 0), 255);
      const finalG = Math.min(Math.max(gSum / totalSamples, 0), 255);
      const finalB = Math.min(Math.max(bSum / totalSamples, 0), 255);

      const idx = (py * size + px) * 4;
      outBuf[idx] = Math.round(finalR);
      outBuf[idx + 1] = Math.round(finalG);
      outBuf[idx + 2] = Math.round(finalB);
      outBuf[idx + 3] = Math.round(finalA * 255);
    }
  }

  return outBuf;
}

export function generateExtensionIcons() {
  const rootDir = process.cwd();
  const iconsDir = path.join(rootDir, 'public', 'icons');
  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

  const sizes = [16, 48, 128];
  for (const s of sizes) {
    const raw = renderAppIconBuffer(s);
    const pngBuf = encodePng(s, s, raw);
    const targetPath = path.join(iconsDir, `icon${s}.png`);
    fs.writeFileSync(targetPath, pngBuf);
    console.log(`  ✓ Generated public/icons/icon${s}.png (${s}x${s}, ${pngBuf.length} bytes)`);
  }
}

// ============================================================================
// 3. 2D GRAPHICS & BITMAP FONT RASTERIZER FOR PROMO & SCREENSHOT
// ============================================================================
// 5x7 Font Definition (5 columns, 7 rows where bit 0 is top row)
const FONT_5X7 = {
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
  '!': [0x00, 0x00, 0x5F, 0x00, 0x00],
  '"': [0x00, 0x07, 0x00, 0x07, 0x00],
  '#': [0x14, 0x7F, 0x14, 0x7F, 0x14],
  '$': [0x24, 0x2A, 0x7F, 0x2A, 0x12],
  '%': [0x23, 0x13, 0x08, 0x64, 0x62],
  '&': [0x36, 0x49, 0x55, 0x22, 0x50],
  '\'': [0x00, 0x05, 0x03, 0x00, 0x00],
  '(': [0x00, 0x1C, 0x22, 0x41, 0x00],
  ')': [0x00, 0x41, 0x22, 0x1C, 0x00],
  '*': [0x14, 0x08, 0x3E, 0x08, 0x14],
  '+': [0x08, 0x08, 0x3E, 0x08, 0x08],
  ',': [0x00, 0x50, 0x30, 0x00, 0x00],
  '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00],
  '/': [0x20, 0x10, 0x08, 0x04, 0x02],
  '0': [0x3E, 0x51, 0x49, 0x45, 0x3E],
  '1': [0x00, 0x42, 0x7F, 0x40, 0x00],
  '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4B, 0x31],
  '4': [0x18, 0x14, 0x12, 0x7F, 0x10],
  '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3C, 0x4A, 0x49, 0x49, 0x30],
  '7': [0x01, 0x71, 0x09, 0x05, 0x03],
  '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1E],
  ':': [0x00, 0x36, 0x36, 0x00, 0x00],
  ';': [0x00, 0x56, 0x36, 0x00, 0x00],
  '<': [0x08, 0x14, 0x22, 0x41, 0x00],
  '=': [0x14, 0x14, 0x14, 0x14, 0x14],
  '>': [0x00, 0x41, 0x22, 0x14, 0x08],
  '?': [0x02, 0x01, 0x51, 0x09, 0x06],
  '@': [0x32, 0x49, 0x79, 0x41, 0x3E],
  'A': [0x7E, 0x11, 0x11, 0x11, 0x7E],
  'B': [0x7F, 0x49, 0x49, 0x49, 0x36],
  'C': [0x3E, 0x41, 0x41, 0x41, 0x22],
  'D': [0x7F, 0x41, 0x41, 0x22, 0x1C],
  'E': [0x7F, 0x49, 0x49, 0x49, 0x41],
  'F': [0x7F, 0x09, 0x09, 0x09, 0x01],
  'G': [0x3E, 0x41, 0x49, 0x49, 0x7A],
  'H': [0x7F, 0x08, 0x08, 0x08, 0x7F],
  'I': [0x00, 0x41, 0x7F, 0x41, 0x00],
  'J': [0x20, 0x40, 0x41, 0x3F, 0x01],
  'K': [0x7F, 0x08, 0x14, 0x22, 0x41],
  'L': [0x7F, 0x40, 0x40, 0x40, 0x40],
  'M': [0x7F, 0x02, 0x0C, 0x02, 0x7F],
  'N': [0x7F, 0x04, 0x08, 0x10, 0x7F],
  'O': [0x3E, 0x41, 0x41, 0x41, 0x3E],
  'P': [0x7F, 0x09, 0x09, 0x09, 0x06],
  'Q': [0x3E, 0x41, 0x51, 0x21, 0x5E],
  'R': [0x7F, 0x09, 0x19, 0x29, 0x46],
  'S': [0x46, 0x49, 0x49, 0x49, 0x31],
  'T': [0x01, 0x01, 0x7F, 0x01, 0x01],
  'U': [0x3F, 0x40, 0x40, 0x40, 0x3F],
  'V': [0x1F, 0x20, 0x40, 0x20, 0x1F],
  'W': [0x7F, 0x20, 0x18, 0x20, 0x7F],
  'X': [0x63, 0x14, 0x08, 0x14, 0x63],
  'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
  'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
  '[': [0x00, 0x7F, 0x41, 0x41, 0x00],
  '\\': [0x02, 0x04, 0x08, 0x10, 0x20],
  ']': [0x00, 0x41, 0x41, 0x7F, 0x00],
  '^': [0x04, 0x02, 0x01, 0x02, 0x04],
  '_': [0x40, 0x40, 0x40, 0x40, 0x40],
  '`': [0x00, 0x01, 0x02, 0x04, 0x00],
  'a': [0x20, 0x54, 0x54, 0x54, 0x78],
  'b': [0x7F, 0x48, 0x44, 0x44, 0x38],
  'c': [0x38, 0x44, 0x44, 0x44, 0x20],
  'd': [0x38, 0x44, 0x44, 0x48, 0x7F],
  'e': [0x38, 0x54, 0x54, 0x54, 0x18],
  'f': [0x08, 0x7E, 0x09, 0x01, 0x02],
  'g': [0x0C, 0x52, 0x52, 0x52, 0x3E],
  'h': [0x7F, 0x08, 0x04, 0x04, 0x78],
  'i': [0x00, 0x44, 0x7D, 0x40, 0x00],
  'j': [0x20, 0x40, 0x44, 0x3D, 0x00],
  'k': [0x7F, 0x10, 0x28, 0x44, 0x00],
  'l': [0x00, 0x41, 0x7F, 0x40, 0x00],
  'm': [0x7C, 0x04, 0x18, 0x04, 0x78],
  'n': [0x7C, 0x08, 0x04, 0x04, 0x78],
  'o': [0x38, 0x44, 0x44, 0x44, 0x38],
  'p': [0x7C, 0x14, 0x14, 0x14, 0x08],
  'q': [0x08, 0x14, 0x14, 0x18, 0x7C],
  'r': [0x7C, 0x08, 0x04, 0x04, 0x08],
  's': [0x48, 0x54, 0x54, 0x54, 0x20],
  't': [0x04, 0x3F, 0x44, 0x40, 0x20],
  'u': [0x3C, 0x40, 0x40, 0x20, 0x7C],
  'v': [0x1C, 0x20, 0x40, 0x20, 0x1C],
  'w': [0x3C, 0x40, 0x30, 0x40, 0x3C],
  'x': [0x44, 0x28, 0x10, 0x28, 0x44],
  'y': [0x0C, 0x50, 0x50, 0x50, 0x3C],
  'z': [0x44, 0x64, 0x54, 0x4C, 0x44],
  '|': [0x00, 0x00, 0x7F, 0x00, 0x00],
  '~': [0x08, 0x04, 0x08, 0x10, 0x08],
  // German & special symbols
  'ä': [0x22, 0x55, 0x54, 0x55, 0x7A],
  'ö': [0x3A, 0x45, 0x44, 0x45, 0x3A],
  'ü': [0x3A, 0x41, 0x40, 0x21, 0x7A],
  'ß': [0x7E, 0x49, 0x49, 0x2A, 0x14],
  '•': [0x00, 0x18, 0x18, 0x00, 0x00],
  '✓': [0x00, 0x20, 0x40, 0x38, 0x04],
};

function blendPixel(buf, w, h, x, y, r, g, b, a) {
  if (x < 0 || x >= w || y < 0 || y >= h || a <= 0) return;
  const idx = (y * w + x) * 4;
  const bgA = buf[idx + 3] / 255;
  const outA = a + bgA * (1 - a);
  if (outA <= 0) return;

  const bgR = buf[idx];
  const bgG = buf[idx + 1];
  const bgB = buf[idx + 2];

  buf[idx] = Math.round((r * a + bgR * bgA * (1 - a)) / outA);
  buf[idx + 1] = Math.round((g * a + bgG * bgA * (1 - a)) / outA);
  buf[idx + 2] = Math.round((b * a + bgB * bgA * (1 - a)) / outA);
  buf[idx + 3] = Math.round(outA * 255);
}

function fillRect(buf, w, h, rx, ry, rw, rh, r, g, b, a = 1) {
  const x0 = Math.max(0, Math.floor(rx));
  const y0 = Math.max(0, Math.floor(ry));
  const x1 = Math.min(w, Math.ceil(rx + rw));
  const y1 = Math.min(h, Math.ceil(ry + rh));

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      blendPixel(buf, w, h, x, y, r, g, b, a);
    }
  }
}

function fillRoundedRect(buf, w, h, rx, ry, rw, rh, radius, r, g, b, a = 1) {
  const x0 = Math.max(0, Math.floor(rx));
  const y0 = Math.max(0, Math.floor(ry));
  const x1 = Math.min(w, Math.ceil(rx + rw));
  const y1 = Math.min(h, Math.ceil(ry + rh));
  const cr = radius;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let inside = true;
      const inTL = x < rx + cr && y < ry + cr;
      const inTR = x > rx + rw - cr && y < ry + cr;
      const inBL = x < rx + cr && y > ry + rh - cr;
      const inBR = x > rx + rw - cr && y > ry + rh - cr;

      if (inTL) {
        const dx = x - (rx + cr), dy = y - (ry + cr);
        inside = (dx * dx + dy * dy) <= cr * cr;
      } else if (inTR) {
        const dx = x - (rx + rw - cr), dy = y - (ry + cr);
        inside = (dx * dx + dy * dy) <= cr * cr;
      } else if (inBL) {
        const dx = x - (rx + cr), dy = y - (ry + rh - cr);
        inside = (dx * dx + dy * dy) <= cr * cr;
      } else if (inBR) {
        const dx = x - (rx + rw - cr), dy = y - (ry + rh - cr);
        inside = (dx * dx + dy * dy) <= cr * cr;
      }

      if (inside) {
        blendPixel(buf, w, h, x, y, r, g, b, a);
      }
    }
  }
}

function drawText(buf, w, h, text, startX, startY, scale, r, g, b, a = 1) {
  let curX = startX;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const cols = FONT_5X7[ch] || FONT_5X7['?'] || [0,0,0,0,0];

    for (let col = 0; col < 5; col++) {
      const bits = cols[col];
      for (let row = 0; row < 7; row++) {
        if ((bits >> row) & 1) {
          fillRect(buf, w, h, curX + col * scale, startY + row * scale, scale, scale, r, g, b, a);
        }
      }
    }
    curX += 6 * scale; // 5 cols + 1 spacing
  }
  return curX;
}

function blitIcon(buf, w, h, iconRaw, iconSize, dstX, dstY) {
  for (let y = 0; y < iconSize; y++) {
    for (let x = 0; x < iconSize; x++) {
      const sIdx = (y * iconSize + x) * 4;
      const r = iconRaw[sIdx];
      const g = iconRaw[sIdx + 1];
      const b = iconRaw[sIdx + 2];
      const a = iconRaw[sIdx + 3] / 255;
      blendPixel(buf, w, h, dstX + x, dstY + y, r, g, b, a);
    }
  }
}

// ============================================================================
// 4. GENERATE PROMOTIONAL TILE (440 x 280)
// ============================================================================
export function generatePromoTile() {
  const W = 440;
  const H = 280;
  const buf = Buffer.alloc(W * H * 4);

  // Background: Deep dark slate / indigo gradient
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tx = x / W;
      const ty = y / H;
      const r = Math.round(15 + ty * 20 + tx * 15);
      const g = Math.round(23 + ty * 18 + tx * 20);
      const b = Math.round(42 + ty * 60 + tx * 80);
      const idx = (y * W + x) * 4;
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = 255;
    }
  }

  // Draw App Icon (48x48 rendered, scaled nicely)
  const iconRaw = renderAppIconBuffer(48);
  blitIcon(buf, W, H, iconRaw, 48, 24, 24);

  // Title: "LingoPDF"
  drawText(buf, W, H, 'LingoPDF', 84, 26, 3, 255, 255, 255, 1);
  // Subtitle
  drawText(buf, W, H, 'German Edition • Offline Vocabulary Reader', 84, 54, 1, 165, 180, 252, 0.95);

  // Feature Badges (3 horizontal pills)
  // Badge 1: 100% Offline
  fillRoundedRect(buf, W, H, 24, 88, 116, 26, 6, 16, 185, 129, 0.2);
  fillRoundedRect(buf, W, H, 24, 88, 116, 26, 6, 16, 185, 129, 0.4);
  drawText(buf, W, H, '100% OFFLINE', 34, 96, 1, 52, 211, 153, 1);

  // Badge 2: Word Lookup
  fillRoundedRect(buf, W, H, 148, 88, 136, 26, 6, 99, 102, 241, 0.2);
  fillRoundedRect(buf, W, H, 148, 88, 136, 26, 6, 99, 102, 241, 0.4);
  drawText(buf, W, H, 'WORD LOOKUP', 174, 96, 1, 165, 180, 252, 1);

  // Badge 3: Built-In OCR
  fillRoundedRect(buf, W, H, 292, 88, 124, 26, 6, 245, 158, 11, 0.2);
  fillRoundedRect(buf, W, H, 292, 88, 124, 26, 6, 245, 158, 11, 0.4);
  drawText(buf, W, H, 'BUILT-IN OCR', 314, 96, 1, 251, 191, 36, 1);

  // Interactive Lookup Preview Card (mock reader + floating tooltip)
  // Base reader card
  fillRoundedRect(buf, W, H, 24, 126, 392, 134, 8, 255, 255, 255, 0.08);
  fillRoundedRect(buf, W, H, 24, 126, 392, 134, 8, 255, 255, 255, 0.15);

  // Document lines inside preview
  drawText(buf, W, H, 'Goethe A1: Start Deutsch 1 - Lesen', 38, 140, 1, 226, 232, 240, 0.85);
  drawText(buf, W, H, 'Sie moechten mehr Informationen bekommen.', 38, 156, 1, 203, 213, 225, 0.75);

  // Blue selection on "bekommen"
  fillRect(buf, W, H, 230, 153, 52, 12, 59, 130, 246, 0.4);

  // Floating Dictionary Tooltip Card
  const tipX = 168, tipY = 172, tipW = 236, tipH = 74;
  fillRoundedRect(buf, W, H, tipX, tipY, tipW, tipH, 6, 255, 255, 255, 0.98);
  fillRoundedRect(buf, W, H, tipX, tipY, tipW, tipH, 6, 99, 102, 241, 0.6); // border

  // Tooltip content
  drawText(buf, W, H, 'bekommen', tipX + 8, tipY + 8, 1, 15, 23, 42, 1);
  // POS & CEFR badges
  fillRoundedRect(buf, W, H, tipX + 66, tipY + 6, 38, 12, 3, 238, 242, 255, 1);
  drawText(buf, W, H, 'verb', tipX + 70, tipY + 8, 1, 79, 70, 229, 1);

  fillRoundedRect(buf, W, H, tipX + 108, tipY + 6, 24, 12, 3, 236, 253, 245, 1);
  drawText(buf, W, H, 'A1', tipX + 114, tipY + 8, 1, 5, 150, 105, 1);

  // Translation & Inflections
  drawText(buf, W, H, '1. to receive, to get', tipX + 8, tipY + 24, 1, 30, 41, 59, 1);
  drawText(buf, W, H, 'Forms: bekommt, bekam, hat bekommen', tipX + 8, tipY + 40, 1, 100, 116, 139, 0.9);

  // Provider Pill
  drawText(buf, W, H, '✓ Authored Learner Dictionary', tipX + 8, tipY + 56, 1, 16, 185, 129, 1);

  const pngBuf = encodePng(W, H, buf);
  const outPath = path.join(process.cwd(), 'store-assets', 'promo-tile-440x280.png');
  fs.writeFileSync(outPath, pngBuf);
  console.log(`  ✓ Generated store-assets/promo-tile-440x280.png (${W}x${H}, ${pngBuf.length} bytes)`);
}

// ============================================================================
// 5. GENERATE STORE SCREENSHOT (1280 x 800)
// ============================================================================
export function generateScreenshot() {
  const W = 1280;
  const H = 800;
  const buf = Buffer.alloc(W * H * 4);

  // 1. App background: Slate-100 (#F1F5F9)
  fillRect(buf, W, H, 0, 0, W, H, 241, 245, 249, 1);

  // 2. Navbar header (height 56px, #FFFFFF, border-bottom #E2E8F0)
  fillRect(buf, W, H, 0, 0, W, 56, 255, 255, 255, 1);
  fillRect(buf, W, H, 0, 55, W, 1, 226, 232, 240, 1);

  // Navbar brand icon + title
  const iconRaw = renderAppIconBuffer(32);
  blitIcon(buf, W, H, iconRaw, 32, 20, 12);
  drawText(buf, W, H, 'LingoPDF', 60, 14, 2, 15, 23, 42, 1);
  drawText(buf, W, H, 'German', 60, 34, 1, 100, 116, 139, 1);

  // Document pill in navbar
  fillRoundedRect(buf, W, H, 400, 12, 320, 32, 6, 248, 250, 252, 1);
  fillRoundedRect(buf, W, H, 400, 12, 320, 32, 6, 203, 213, 225, 0.6); // border
  drawText(buf, W, H, 'GOETHE PDF TEST.pdf', 416, 22, 1, 30, 41, 59, 1);
  drawText(buf, W, H, '|  47 pages', 615, 22, 1, 148, 163, 184, 1);

  // Navbar actions (right)
  // OCR button
  fillRoundedRect(buf, W, H, 820, 12, 105, 32, 6, 79, 70, 229, 0.1);
  drawText(buf, W, H, 'OCR German', 836, 22, 1, 67, 56, 202, 1);
  // Zoom pill
  fillRoundedRect(buf, W, H, 935, 12, 70, 32, 6, 241, 245, 249, 1);
  drawText(buf, W, H, '100%', 952, 22, 1, 51, 65, 85, 1);
  // Settings button
  fillRoundedRect(buf, W, H, 1015, 12, 85, 32, 6, 241, 245, 249, 1);
  drawText(buf, W, H, 'Settings', 1030, 22, 1, 51, 65, 85, 1);
  // About button
  fillRoundedRect(buf, W, H, 1110, 12, 75, 32, 6, 241, 245, 249, 1);
  drawText(buf, W, H, 'About', 1128, 22, 1, 51, 65, 85, 1);
  // Open PDF button
  fillRoundedRect(buf, W, H, 1195, 12, 70, 32, 6, 241, 245, 249, 1);
  drawText(buf, W, H, 'Open', 1214, 22, 1, 51, 65, 85, 1);

  // 3. Centered PDF Page (width 740, height 690, #FFFFFF, shadow)
  const pageX = 270, pageY = 76, pageW = 740, pageH = 690;
  // Drop shadow
  fillRect(buf, W, H, pageX + 4, pageY + 4, pageW, pageH, 0, 0, 0, 0.06);
  fillRect(buf, W, H, pageX, pageY, pageW, pageH, 255, 255, 255, 1);
  fillRect(buf, W, H, pageX, pageY, pageW, 1, 226, 232, 240, 1);
  fillRect(buf, W, H, pageX, pageY, 1, pageH, 226, 232, 240, 1);

  // Inside PDF page: Authentic Goethe A1 Exam Layout
  drawText(buf, W, H, 'Goethe-Zertifikat A1: Start Deutsch 1', pageX + 48, pageY + 36, 2, 79, 70, 229, 1);
  drawText(buf, W, H, 'Uebungssatz 01 • Teil 1: Lesen', pageX + 48, pageY + 68, 3, 15, 23, 42, 1);

  // Exercise instructions
  drawText(buf, W, H, 'Lesen Sie die Texte und die Aufgaben 1 bis 5.', pageX + 48, pageY + 112, 2, 30, 41, 59, 1);
  drawText(buf, W, H, 'Waehlen Sie die richtige Loesung: a, b oder c.', pageX + 48, pageY + 136, 1, 100, 116, 139, 1);

  // Real test reading lines featuring authentic vocabulary from test
  let textY = pageY + 190;
  const lines = [
    'Liebe Besucherinnen und Besucher,',
    'herzlich willkommen in unserem Kulturzentrum.',
    'Sie moechten Auskunft ueber Kursangebote bekommen?',
    'Unsere Partnerin beraet Sie gern im Erdgeschoss.',
    'Oeffnungszeiten am Vormittag: Montag bis Freitag 9-12 Uhr.',
    'Am Wochenende bleibt unser Informationszentrum geschlossen.',
    'Wir freuen uns auf Ihren Besuch und wuenschen viel Erfolg!'
  ];

  for (const line of lines) {
    if (line.length > 0) {
      drawText(buf, W, H, line, pageX + 48, textY, 2, 51, 65, 85, 1);
    }
    textY += 30;
  }

  // Word selection highlight on "bekommen" in line 3:
  // "Sie moechten Auskunft ueber Kursangebote bekommen?"
  // "Sie moechten Auskunft ueber Kursangebote " = 39 chars in scale 2: 39 * 12 = 468 px
  const selX = pageX + 48 + 468;
  const selY = pageY + 190 + 2 * 30 - 2;
  const selW = 98;
  const selH = 20;
  fillRect(buf, W, H, selX, selY, selW, selH, 59, 130, 246, 0.35);

  // Floating Dictionary Tooltip (placed directly above selection with ample clearance)
  const tipX = selX - 110;
  const tipY = selY - 176;
  const tipW = 340;
  const tipH = 168;

  // Tooltip drop shadow
  fillRoundedRect(buf, W, H, tipX + 4, tipY + 4, tipW, tipH, 8, 0, 0, 0, 0.12);
  // Tooltip background & border
  fillRoundedRect(buf, W, H, tipX, tipY, tipW, tipH, 8, 255, 255, 255, 1);
  fillRoundedRect(buf, W, H, tipX, tipY, tipW, tipH, 8, 99, 102, 241, 0.5);

  // Inside Tooltip:
  // Header: Word + POS + CEFR
  drawText(buf, W, H, 'bekommen', tipX + 16, tipY + 14, 2, 15, 23, 42, 1);
  fillRoundedRect(buf, W, H, tipX + 124, tipY + 12, 44, 18, 3, 238, 242, 255, 1);
  drawText(buf, W, H, 'VERB', tipX + 130, tipY + 16, 1, 79, 70, 229, 1);

  fillRoundedRect(buf, W, H, tipX + 176, tipY + 12, 28, 18, 3, 236, 253, 245, 1);
  drawText(buf, W, H, 'A1', tipX + 182, tipY + 16, 1, 5, 150, 105, 1);

  // Divider
  fillRect(buf, W, H, tipX + 16, tipY + 38, tipW - 32, 1, 241, 245, 249, 1);

  // Translations
  drawText(buf, W, H, '1. to receive, to get', tipX + 16, tipY + 48, 2, 30, 41, 59, 1);
  drawText(buf, W, H, '2. to catch (an illness)', tipX + 16, tipY + 74, 1, 71, 85, 105, 1);
  drawText(buf, W, H, '3. to agree with', tipX + 16, tipY + 90, 1, 71, 85, 105, 1);
  drawText(buf, W, H, 'Forms: bekommt, bekam, hat bekommen', tipX + 16, tipY + 108, 1, 100, 116, 139, 1);

  // Divider 2
  fillRect(buf, W, H, tipX + 16, tipY + 126, tipW - 32, 1, 241, 245, 249, 1);

  // Provider Pill / Badge
  fillRoundedRect(buf, W, H, tipX + 16, tipY + 134, 220, 22, 4, 240, 253, 244, 1);
  drawText(buf, W, H, '✓ Authored Learner Dictionary', tipX + 24, tipY + 140, 1, 22, 163, 74, 1);

  // 4. Bottom Page Controls Bar (floating at bottom center)
  fillRoundedRect(buf, W, H, 540, 740, 200, 36, 18, 255, 255, 255, 0.95);
  fillRoundedRect(buf, W, H, 540, 740, 200, 36, 18, 203, 213, 225, 0.5);
  drawText(buf, W, H, '<   Page 3 of 47   >', 570, 752, 1, 51, 65, 85, 1);

  const pngBuf = encodePng(W, H, buf);
  const outPath = path.join(process.cwd(), 'store-assets', 'screenshot-1280x800.png');
  fs.writeFileSync(outPath, pngBuf);
  console.log(`  ✓ Generated store-assets/screenshot-1280x800.png (${W}x${H}, ${pngBuf.length} bytes)`);
}

// ============================================================================
// MAIN CLI RUNNER
// ============================================================================
if (process.argv[1] && process.argv[1].endsWith('generate-brand-assets.mjs')) {
  console.log('=====================================================================');
  console.log('   LINGOPDF — STORE ASSETS GENERATOR                                 ');
  console.log('=====================================================================\n');

  const storeAssetsDir = path.join(process.cwd(), 'store-assets');
  if (!fs.existsSync(storeAssetsDir)) fs.mkdirSync(storeAssetsDir, { recursive: true });

  console.log('[1/3] Generating Extension Icons:');
  generateExtensionIcons();

  console.log('\n[2/3] Generating Store Promotional Tile (440x280):');
  generatePromoTile();

  console.log('\n[3/3] Generating Store Screenshot (1280x800):');
  generateScreenshot();

  console.log('\n=====================================================================');
  console.log('🎉 ALL BRAND AND STORE ASSETS GENERATED SUCCESSFULLY!');
  console.log('=====================================================================\n');
}
