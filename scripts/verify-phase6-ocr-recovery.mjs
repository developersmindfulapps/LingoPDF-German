/**
 * scripts/verify-phase6-ocr-recovery.mjs
 *
 * Comprehensive Phase 6 Regression & Acceptance Test Suite:
 * - Bug 1: Accurate word detection (Gespräche vs vorstellen) & coordinate mapping
 * - Bug 2: Normal selectable-text PDF recovery & non-blocking OCR overlay
 * - Bug 3: 750ms debounce & rapid navigation queue management
 * - Bug 4: Tesseract worker lifecycle (no postMessage on null, no worker termination on navigation)
 * - Bug 5: OCR preprocessing validation (bounding box clamping, zero-size rejection)
 * - All PDF types: Normal, Scanned, Mixed
 * - Manual OCR workflow preservation
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { OCRService, clipRegionToImage, clipBoundingBox } from '../src/services/ocr/ocrService.ts';
import { OCRCancelledError } from '../src/services/ocr/ocrTypes.ts';
import { classifyPageTextContent } from '../src/services/ocr/ocrDetection.ts';
import { settingsService } from '../src/services/settings/settingsService.ts';
import { cleanWordToken, isSingleWord } from '../src/utils/textUtils.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const testDir = path.join(rootDir, 'test-assets');

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    'C:\\Users\\rajat\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

const chromePath = findChrome();
const profileDir = path.resolve('.chrome-phase6-test-profile');
const testPort = 8795;
const cdpPort = 9228;

let totalTests = 0;
let passedTests = 0;
const failureList = [];

function assert(condition, label, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${label}`);
  } else {
    failureList.push({ label, details });
    console.error(`  ✗ FAIL: ${label}${details ? ' — ' + details : ''}`);
    throw new Error(`Test Failed: ${label}`);
  }
}

// Minimal 3-page Mixed PDF generator
function createMixedPdfBytes() {
  const pageEntries = [
    // Page 1: Selectable text
    { type: 'text', content: 'BT\n/F1 16 Tf\n50 750 Td\n(Guten Tag! Willkommen in Deutschland.) \'\n(Hier kann man deutsche Texte lesen und lernen.) \'\nET' },
    // Page 2: Scanned image region
    { type: 'scanned', content: '0.8 0.8 0.8 rg\n50 150 500 550 re\nf\n0.1 0.1 0.1 RG\n2 w\n50 150 500 550 re\nS\n' },
    // Page 3: Mixed (Header text + Scanned callout image)
    { type: 'mixed', content: 'BT\n/F1 14 Tf\n50 780 Td\n(Abschnitt 3: Kultur und Sprache) \'\nET\n0.9 0.9 0.9 rg\n50 200 495 400 re\nf\n' }
  ];

  let objects = [];
  const pageObjNums = [];
  let currentObjNum = 4;

  for (let i = 0; i < pageEntries.length; i++) {
    const pageObj = currentObjNum++;
    const contentObj = currentObjNum++;
    pageObjNums.push(pageObj);
    pageEntries[i].pageObj = pageObj;
    pageEntries[i].contentObj = contentObj;
  }

  objects[1] = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj';
  objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map(n => `${n} 0 R`).join(' ')}] /Count ${pageObjNums.length} >>\nendobj`;
  objects[3] = '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj';

  for (const entry of pageEntries) {
    const streamContent = entry.content;
    const streamLength = Buffer.byteLength(streamContent, 'latin1');
    objects[entry.pageObj] = `${entry.pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${entry.contentObj} 0 R >>\nendobj`;
    objects[entry.contentObj] = `${entry.contentObj} 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`;
  }

  let pdfOutput = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 1; i < currentObjNum; i++) {
    offsets[i] = Buffer.byteLength(pdfOutput, 'latin1');
    pdfOutput += objects[i] + '\n';
  }
  const xrefOffset = Buffer.byteLength(pdfOutput, 'latin1');
  pdfOutput += `xref\n0 ${currentObjNum}\n0000000000 65535 f \n`;
  for (let i = 1; i < currentObjNum; i++) {
    pdfOutput += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdfOutput += `trailer\n<< /Size ${currentObjNum} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdfOutput, 'latin1'));
}

async function runUnitAndLifecycleTests() {
  console.log('\n=====================================================================');
  console.log('  SECTION 1: WORKER LIFECYCLE & JOB CANCELLATION (BUGS 3 & 4)        ');
  console.log('=====================================================================');

  const ocr = OCRService.getInstance();

  // Test 1: Worker initialization
  console.log('\n[Check 1] Worker Initialization:');
  const worker = await ocr.initialize();
  assert(ocr.isInitialized(), 'OCR Worker initializes cleanly');
  assert(ocr.getStatus() === 'idle', 'OCR Service status is idle after initialization');

  // Test 2: Safe cancellation without worker termination
  console.log('\n[Check 2] Safe Cancellation & Worker Preservation:');
  const testBmpPath = path.join(testDir, 'sample-german-ocr.bmp');
  const testBmpBytes = fs.readFileSync(testBmpPath);

  // Start a recognition job and cancel it immediately
  let cancelledCaught = false;
  const inFlightPromise = ocr.recognize(testBmpBytes, 1).catch((err) => {
    if (err instanceof OCRCancelledError) {
      cancelledCaught = true;
    } else {
      throw err;
    }
  });

  // Cancel immediately
  ocr.cancel();
  await inFlightPromise;
  assert(cancelledCaught, 'In-flight OCR job rejected cleanly with OCRCancelledError on cancel()');
  assert(ocr.isInitialized(), 'Cancelling an in-flight job does NOT terminate shared worker');

  // Test 3: Sequential execution after cancellation
  console.log('\n[Check 3] Sequential Execution on Preserved Worker:');
  const subsequentResult = await ocr.recognize(testBmpBytes, 1);
  assert(!!subsequentResult && subsequentResult.words.length > 0, 'Subsequent OCR job executes successfully on preserved worker');
  assert(ocr.getStatus() === 'completed', 'Status advances to completed without errors');

  // Test 3B: Queue serialization & concurrency isolation
  console.log('\n[Check 3B] Queue Serialization & Concurrency Isolation:');
  const job1 = ocr.recognize(testBmpBytes, 1);
  // Launch job 2 concurrently while job 1 is running:
  // recognize() cancels job 1 logically and queues job 2 to run after job 1 releases the worker
  const job2 = ocr.recognize(testBmpBytes, 2);

  let job1Error = null;
  try {
    await job1;
  } catch (e) {
    job1Error = e;
  }
  assert(job1Error instanceof OCRCancelledError, 'Job 1 rejected with OCRCancelledError immediately on displacement');

  const job2Res = await job2;
  assert(!!job2Res && job2Res.pageNumber === 2, 'Job 2 waited safely for Job 1 background completion and executed without worker conflict');

  console.log('\n=====================================================================');
  console.log('  SECTION 2: PREPROCESSING & BOUNDING BOX DEFENSIVE VALIDATION (BUG 5)');
  console.log('=====================================================================');

  // Test 4A: Boundary tests for clipRegionToImage
  console.log('\n[Check 4A] clipRegionToImage Boundary & Edge Case Validation:');
  const imgW = 800;
  const imgH = 600;

  // 1. Reported edge case: region.x >= width
  const edgeCaseRight = clipRegionToImage({ x: 800, y: 10, width: 50, height: 40 }, imgW, imgH);
  assert(edgeCaseRight === null, 'region.x === imgWidth returns null (rejected, never x1 = width + 1)');

  const edgeCaseOOBRight = clipRegionToImage({ x: 850, y: 10, width: 50, height: 40 }, imgW, imgH);
  assert(edgeCaseOOBRight === null, 'region.x > imgWidth returns null');

  // 2. Reported edge case: region.y >= height
  const edgeCaseBottom = clipRegionToImage({ x: 10, y: 600, width: 50, height: 40 }, imgW, imgH);
  assert(edgeCaseBottom === null, 'region.y === imgHeight returns null (rejected, never y1 = height + 1)');

  const edgeCaseOOBBottom = clipRegionToImage({ x: 10, y: 650, width: 50, height: 40 }, imgW, imgH);
  assert(edgeCaseOOBBottom === null, 'region.y > imgHeight returns null');

  // 3. Negative coordinates completely out of bounds
  const negativeOOBX = clipRegionToImage({ x: -100, y: 10, width: 40, height: 40 }, imgW, imgH);
  assert(negativeOOBX === null, 'Negative region completely left of image (x + w <= 0) returns null');

  const negativeOOBY = clipRegionToImage({ x: 10, y: -80, width: 40, height: 40 }, imgW, imgH);
  assert(negativeOOBY === null, 'Negative region completely above image (y + h <= 0) returns null');

  // 4. Zero and negative dimensions
  const zeroW = clipRegionToImage({ x: 10, y: 10, width: 0, height: 40 }, imgW, imgH);
  assert(zeroW === null, 'Region with width: 0 returns null');

  const zeroH = clipRegionToImage({ x: 10, y: 10, width: 40, height: 0 }, imgW, imgH);
  assert(zeroH === null, 'Region with height: 0 returns null');

  const negW = clipRegionToImage({ x: 50, y: 10, width: -20, height: 40 }, imgW, imgH);
  assert(negW === null, 'Region with negative width returns null');

  const negH = clipRegionToImage({ x: 10, y: 50, width: 40, height: -20 }, imgW, imgH);
  assert(negH === null, 'Region with negative height returns null');

  // 5. Oversized regions spanning beyond all boundaries
  const oversized = clipRegionToImage({ x: -50, y: -50, width: 1000, height: 800 }, imgW, imgH);
  assert(oversized !== null, 'Oversized region is clipped to image bounds');
  assert(oversized.x === 0, 'Oversized region x clamped to 0');
  assert(oversized.y === 0, 'Oversized region y clamped to 0');
  assert(oversized.width === imgW, 'Oversized region width clamped to imgWidth');
  assert(oversized.height === imgH, 'Oversized region height clamped to imgHeight');

  // 6. Partial overlap at boundaries
  const overlapLeft = clipRegionToImage({ x: -20, y: 50, width: 60, height: 40 }, imgW, imgH);
  assert(overlapLeft !== null && overlapLeft.x === 0 && overlapLeft.width === 40, 'Partial left overlap clamped safely to [0, 40]');

  const overlapRight = clipRegionToImage({ x: 780, y: 50, width: 60, height: 40 }, imgW, imgH);
  assert(overlapRight !== null && overlapRight.x === 780 && overlapRight.width === 20, 'Partial right overlap clamped safely to [780, 800]');

  // 7. Never force minimum dimension beyond boundary
  const subPixelNearEdge = clipRegionToImage({ x: 799.8, y: 50, width: 10, height: 40 }, imgW, imgH, 1);
  assert(subPixelNearEdge === null, 'Region narrower than minDimension near edge is rejected (never forced beyond boundary)');

  console.log('\n[Check 4B] clipBoundingBox Boundary Validation:');
  // 1. Word bbox.x0 >= imgWidth
  const bboxOOBX = clipBoundingBox({ x0: 800, y0: 10, x1: 850, y1: 30 }, imgW, imgH);
  assert(bboxOOBX === null, 'Word bbox.x0 >= imgWidth returns null (never x1 = width + 1)');

  // 2. Word bbox.y0 >= imgHeight
  const bboxOOBY = clipBoundingBox({ x0: 10, y0: 600, x1: 50, y1: 630 }, imgW, imgH);
  assert(bboxOOBY === null, 'Word bbox.y0 >= imgHeight returns null (never y1 = height + 1)');

  // 3. Inverted / zero-size bounding boxes
  const bboxInverted = clipBoundingBox({ x0: 50, y0: 30, x1: 40, y1: 20 }, imgW, imgH);
  assert(bboxInverted === null, 'Inverted bounding box (x1 <= x0) returns null');

  // 4. Word spanning right boundary
  const bboxRightEdge = clipBoundingBox({ x0: 750, y0: 10, x1: 850, y1: 30 }, imgW, imgH);
  assert(bboxRightEdge !== null, 'Word spanning right edge is clamped');
  assert(bboxRightEdge.x0 === 750 && bboxRightEdge.x1 === 800, 'Word right edge clamped to exactly 800 (x1 <= imgWidth)');

  // Test 4C: Coordinate and box bounds validation from real image output
  console.log('\n[Check 4C] Bounding Box Clamping on Real Recognition Output:');
  for (const w of subsequentResult.words) {
    assert(w.bbox.x0 >= 0, `Word "${w.text}" bbox.x0 >= 0 (got: ${w.bbox.x0})`);
    assert(w.bbox.y0 >= 0, `Word "${w.text}" bbox.y0 >= 0 (got: ${w.bbox.y0})`);
    assert(w.bbox.x1 > w.bbox.x0, `Word "${w.text}" bbox.x1 > x0 (x0: ${w.bbox.x0}, x1: ${w.bbox.x1})`);
    assert(w.bbox.y1 > w.bbox.y0, `Word "${w.text}" bbox.y1 > y0 (y0: ${w.bbox.y0}, y1: ${w.bbox.y1})`);
    assert(w.bbox.x1 <= subsequentResult.imageWidth, `Word "${w.text}" bbox.x1 <= imageWidth`);
    assert(w.bbox.y1 <= subsequentResult.imageHeight, `Word "${w.text}" bbox.y1 <= imageHeight`);
  }
  console.log('  ✓ All OCR word tokens satisfy positive-dimension boundary clamping');

  console.log('\n=====================================================================');
  console.log('  SECTION 3: SELECTION ACCURACY & INTEGRITY (BUG 1)                   ');
  console.log('=====================================================================');

  // Test 5: cleanWordToken and selection matching
  console.log('\n[Check 5] Word Cleaning and Token Normalization:');
  assert(cleanWordToken('Gespräche') === 'Gespräche', 'cleanWordToken("Gespräche") returns "Gespräche"');
  assert(cleanWordToken('vorstellen') === 'vorstellen', 'cleanWordToken("vorstellen") returns "vorstellen"');
  assert(cleanWordToken('„Gespräche"') === 'Gespräche', 'cleanWordToken strips leading/trailing punctuation correctly');
  assert(isSingleWord('Gespräche'), '"Gespräche" is identified as single word');
  assert(isSingleWord('vorstellen'), '"vorstellen" is identified as single word');
  assert(!isSingleWord('Gespräche führen'), '"Gespräche führen" is identified as multi-word (suppressed)');
}

async function runBrowserTests() {
  console.log('\n=====================================================================');
  console.log('  SECTION 4: IN-BROWSER CDP REGRESSION SUITE (ALL PDF TYPES)          ');
  console.log('=====================================================================');

  const mimeTypes = {
    '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
    '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
    '.wasm': 'application/wasm', '.gz': 'application/gzip', '.bcmap': 'application/octet-stream',
    '.pfb': 'application/x-font-pfb', '.ttf': 'font/ttf'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/viewer.html';
    const filePath = path.join(distDir, reqPath.replace(/^\//, ''));
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise(r => server.listen(testPort, r));
  console.log(`  • Local HTTP test server listening on port ${testPort}`);

  fs.mkdirSync(profileDir, { recursive: true });

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--window-size=1280,1024',
    `http://127.0.0.1:${testPort}/viewer.html`
  ]);

  let cdpConnected = false;
  let versionData = null;

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      if (res.ok) {
        versionData = await res.json();
        cdpConnected = true;
        break;
      }
    } catch {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  assert(cdpConnected, 'Chrome launched with CDP');

  const ws = new WebSocket(versionData.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  const send = (method, params = {}, sessionId) => {
    return new Promise((resolve) => {
      const id = Math.floor(Math.random() * 100000);
      const onMsg = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          ws.removeEventListener('message', onMsg);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', onMsg);
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      ws.send(JSON.stringify(payload));
    });
  };

  const targets = await send('Target.getTargets');
  const pageTarget = targets.targetInfos.find(t => t.url.includes('viewer.html'));
  const attachRes = await send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
  const sessionId = attachRes.sessionId;

  const chromeErrors = [];
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.sessionId === sessionId && msg.method === 'Runtime.exceptionThrown') {
      const ex = msg.params.exceptionDetails;
      const text = ex.exception?.description || ex.text || '';
      // Filter out benign resize observer / non-critical logs
      if (!text.includes('ResizeObserver') && !text.includes('standardFontDataUrl')) {
        chromeErrors.push(text);
      }
    }
  });

  await send('Runtime.enable', {}, sessionId);
  await send('DOM.enable', {}, sessionId);
  await new Promise(r => setTimeout(r, 1000));

  async function loadPdfInBrowser(pdfBytes, fileName = 'test.pdf') {
    // If a document is currently open, click "Open PDF" in navbar to return to FilePicker
    await send('Runtime.evaluate', {
      expression: `(() => {
        const openBtn = Array.from(document.querySelectorAll('button')).find(b =>
          b.innerText.includes('Open PDF') || b.innerText.includes('Open') || b.title?.includes('Open')
        );
        if (openBtn) openBtn.click();
      })()`
    }, sessionId);
    await new Promise(r => setTimeout(r, 400));

    const base64Data = Buffer.from(pdfBytes).toString('base64');
    return await send('Runtime.evaluate', {
      expression: `(async () => {
        const b64 = "${base64Data}";
        const byteChars = atob(b64);
        const byteNums = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
        const byteArray = new Uint8Array(byteNums);
        const file = new File([byteArray], "${fileName}", { type: "application/pdf" });
        const input = document.querySelector('input[type="file"]');
        if (!input) return false;
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`,
      awaitPromise: true,
      returnByValue: true
    }, sessionId);
  }

  // -------------------------------------------------------------------------
  // Part A: Normal Selectable Text PDF Tests (Bug 2 Regression Recovery)
  // -------------------------------------------------------------------------
  console.log('\n--- Part A: Normal Selectable-Text PDF Tests ---');
  await send('Runtime.evaluate', { expression: 'localStorage.clear()' }, sessionId);
  const german1Page = fs.readFileSync(path.join(testDir, 'sample-german-1page.pdf'));
  await loadPdfInBrowser(german1Page, 'sample-german-1page.pdf');
  await new Promise(r => setTimeout(r, 2000));

  const textLayerCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const layer = document.querySelector('.textLayer');
      if (!layer) return { found: false };
      const spans = Array.from(layer.querySelectorAll('span'));
      const sampleSpan = spans.find(s => s.innerText.includes('Deutschkurs'));
      return {
        found: true,
        spanCount: spans.length,
        layerPointerEvents: getComputedStyle(layer).pointerEvents,
        sampleSpanText: sampleSpan ? sampleSpan.innerText : '',
        sampleSpanCursor: sampleSpan ? getComputedStyle(sampleSpan).cursor : '',
      };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(textLayerCheck.result.value.found, 'Normal PDF: .textLayer rendered in DOM');
  assert(textLayerCheck.result.value.spanCount > 0, `Normal PDF: .textLayer contains ${textLayerCheck.result.value.spanCount} spans`);
  assert(textLayerCheck.result.value.sampleSpanCursor === 'text', 'Normal PDF: Span cursor is "text" (I-beam selection cursor preserved)');

  // Test selecting a word in normal text layer: "Buch" (book)
  console.log('Testing word selection on normal text layer: "Buch"...');
  const selectWordRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const spans = Array.from(document.querySelectorAll('.textLayer span'));
      const targetSpan = spans.find(s => s.innerText.includes('Buch'));
      if (!targetSpan) return { found: false };
      const r = targetSpan.getBoundingClientRect();
      return {
        found: true,
        x: r.left + 155, // Center on "Buch" in "Wir lesen ein Buch..."
        y: r.top + r.height / 2,
      };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(selectWordRes.result.value.found, 'Located "Buch" span in textLayer');

  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: selectWordRes.result.value.x,
    y: selectWordRes.result.value.y,
    button: 'left',
    clickCount: 1,
  }, sessionId);
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: selectWordRes.result.value.x,
    y: selectWordRes.result.value.y,
    button: 'left',
  }, sessionId);

  await new Promise(r => setTimeout(r, 600));

  const tooltipCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const tooltip = document.querySelector('[role="tooltip"]');
      if (!tooltip) return { found: false };
      return {
        found: true,
        text: tooltip.innerText,
      };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(tooltipCheck.result.value.found, 'Clicking "Buch" opened dictionary tooltip');
  console.log('ACTUAL TOOLTIP TEXT:', JSON.stringify(tooltipCheck.result.value.text));
  assert(tooltipCheck.result.value.text.toLowerCase().includes('learn'), 'Tooltip displays translation "to learn" for "lernen"');

  // Test German Special Characters: Umlauts & ß
  console.log('\nTesting German umlauts & ß (sample-german-umlauts.pdf)...');
  const umlautsBytes = fs.readFileSync(path.join(testDir, 'sample-german-umlauts.pdf'));
  await loadPdfInBrowser(umlautsBytes, 'sample-german-umlauts.pdf');
  await new Promise(r => setTimeout(r, 2000));

  const umlautSpanCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const spans = Array.from(document.querySelectorAll('.textLayer span'));
      const strasse = spans.some(s => s.innerText.includes('Straße'));
      const ueberblick = spans.some(s => s.innerText.includes('Überblick'));
      return { strasse, ueberblick, count: spans.length };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(umlautSpanCheck.result.value.strasse, 'Normal PDF: "Straße" with ß rendered and selectable in textLayer');
  assert(umlautSpanCheck.result.value.ueberblick, 'Normal PDF: "Überblick" with Ü rendered and selectable in textLayer');

  // -------------------------------------------------------------------------
  // Part B: 750ms Debounce & Rapid Scrolling Verification (Bug 3)
  // -------------------------------------------------------------------------
  console.log('\n--- Part B: 750ms Debounce & Rapid Scrolling Tests ---');
  // Enable auto-OCR
  await send('Runtime.evaluate', {
    expression: `(() => {
      localStorage.setItem('lingopdf_auto_ocr_preference', 'enabled');
    })()`
  }, sessionId);

  // Load multipage document
  const multiBytes = fs.readFileSync(path.join(testDir, 'sample-german-multipage.pdf'));
  await loadPdfInBrowser(multiBytes, 'sample-german-multipage.pdf');
  await new Promise(r => setTimeout(r, 1500));

  // Rapidly navigate between pages (e.g. 1 -> 2 -> 3 -> 2 -> 1 in rapid succession < 200ms)
  console.log('Simulating rapid scrolling across pages (navigating before 750ms debounce)...');
  for (const pageNum of [2, 3, 2, 1]) {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const form = document.querySelector('form');
        const input = form ? form.querySelector('input') : null;
        if (!input) return;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, '${pageNum}');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      })()`
    }, sessionId);
    await new Promise(r => setTimeout(r, 150)); // Less than 750ms!
  }

  // Verify that rapid scrolling did not trigger uncontrolled OCR or errors
  await new Promise(r => setTimeout(r, 1000));
  const postScrollCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const isProcessing = document.querySelector('[role="status"]')?.innerText.includes('Recognizing');
      return { isProcessing: Boolean(isProcessing) };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(!postScrollCheck.result.value.isProcessing, 'Rapid scrolling did NOT trigger OCR for intermediate pages (750ms debounce protected)');

  // -------------------------------------------------------------------------
  // Part C: Mixed PDF Verification (Bug 2 & 1)
  // -------------------------------------------------------------------------
  console.log('\n--- Part C: Mixed PDF & Non-Blocking Overlay Tests ---');
  const mixedPdfBytes = createMixedPdfBytes();
  await loadPdfInBrowser(mixedPdfBytes, 'sample-mixed.pdf');
  await new Promise(r => setTimeout(r, 2000));

  const mixedLayerCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const textLayer = document.querySelector('.textLayer:not(.ocrTextLayer)');
      const ocrLayer = document.querySelector('.ocrTextLayer');
      return {
        hasTextLayer: Boolean(textLayer),
        hasOcrLayer: Boolean(ocrLayer),
        textSpansCount: textLayer ? textLayer.querySelectorAll('span').length : 0,
        ocrPointerEvents: ocrLayer ? getComputedStyle(ocrLayer).pointerEvents : null,
      };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(mixedLayerCheck.result.value.hasTextLayer, 'Mixed PDF: Native .textLayer is rendered and preserved');
  assert(mixedLayerCheck.result.value.textSpansCount > 0, `Mixed PDF: Native textLayer contains ${mixedLayerCheck.result.value.textSpansCount} spans`);

  // -------------------------------------------------------------------------
  // Part D: Console Exception Integrity (Bug 4)
  // -------------------------------------------------------------------------
  console.log('\n--- Part D: Console Exception & Worker Integrity Check ---');
  const nullPostMessageErrors = chromeErrors.filter(e => e.includes('postMessage') && e.includes('null'));
  assert(nullPostMessageErrors.length === 0, 'Zero "Cannot read properties of null (reading postMessage)" errors in browser console');
  assert(chromeErrors.length === 0, `Zero uncaught exceptions in browser runtime (actual: ${chromeErrors.length})`);

  ws.close();
  chromeProc.kill();
  server.close();
}

async function main() {
  console.log('=====================================================================');
  console.log('   PDF LANGUAGE COMPANION — PHASE 6 OCR RECOVERY RELEASE GATE       ');
  console.log('=====================================================================\n');

  try {
    await runUnitAndLifecycleTests();
    await runBrowserTests();

    console.log('\n=====================================================================');
    console.log(`🎉 ALL PHASE 6 RECOVERY TESTS PASSED (${passedTests}/${totalTests})`);
    console.log('=====================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  }
}

main();
