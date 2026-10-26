import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import { spawn } from 'node:child_process';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Import providers and helpers
import { LocalDictionaryProvider } from '../src/services/dictionary/LocalDictionaryProvider.ts';
import { CompositeDictionaryProvider } from '../src/services/dictionary/CompositeDictionaryProvider.ts';
import { OCRService, OCRCancelledError } from '../src/services/ocr/index.ts';
import { cleanWordToken, isSingleWord, extractWordAtOffset } from '../src/utils/textUtils.ts';

const rootDir = process.cwd();
const zipPath = path.join(rootDir, 'pdf-language-companion-v0.1.0.zip');
const unpackedDir = path.join(rootDir, 'dist-unpacked');
const testDir = path.join(rootDir, 'test-assets');
const chromePath = 'C:\\Users\\LENOVO\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';

console.log('=====================================================================');
console.log('   PDF LANGUAGE COMPANION v0.1.0 — RC ACCEPTANCE TEST SUITE (PHASE 14)');
console.log('=====================================================================\n');

let totalTests = 0;
let passedTests = 0;
const failureList = [];

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    failureList.push(message);
    throw new Error(message);
  }
  passedTests++;
  console.log(`  ✓ PASS: ${message}`);
}

async function runAcceptanceSuite() {
  // =========================================================================
  // TEST 1 — INSPECT THE RELEASE PACKAGE
  // =========================================================================
  console.log('--- TEST 1 — INSPECT THE RELEASE PACKAGE ---');
  assert(fs.existsSync(zipPath), 'pdf-language-companion-v0.1.0.zip exists at repository root');
  assert(fs.existsSync(unpackedDir), 'dist-unpacked extracted directory exists');

  // Check manifest.json
  const manifestPath = path.join(unpackedDir, 'manifest.json');
  assert(fs.existsSync(manifestPath), 'manifest.json exists at archive root');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert(manifest.manifest_version === 3, 'manifest_version is 3');
  assert(manifest.name === 'PDF Language Companion', 'Extension name is "PDF Language Companion"');
  assert(manifest.version === '0.1.0', 'Extension version is 0.1.0');
  assert(!manifest.permissions || manifest.permissions.length === 0, 'No permissions requested in manifest');
  assert(!manifest.host_permissions || manifest.host_permissions.length === 0, 'No host permissions requested in manifest');

  // Check icons
  for (const [sz, iconRel] of Object.entries(manifest.icons || {})) {
    const iconP = path.join(unpackedDir, iconRel);
    assert(fs.existsSync(iconP), `Icon ${sz}x${sz} exists at ${iconRel}`);
  }

  // Check entry points
  assert(fs.existsSync(path.join(unpackedDir, 'viewer.html')), 'viewer.html exists at package root');
  assert(fs.existsSync(path.join(unpackedDir, 'background.js')), 'background.js exists at package root');

  // Check Authored dictionary assets
  assert(fs.existsSync(path.join(unpackedDir, 'data', 'authored-de-en-dictionary.json')), 'authored-de-en-dictionary.json exists');
  assert(fs.existsSync(path.join(unpackedDir, 'data', 'authored-de-en-inflections.json')), 'authored-de-en-inflections.json exists');
  assert(fs.existsSync(path.join(unpackedDir, 'data', 'authored-de-en-metadata.json')), 'authored-de-en-metadata.json exists');

  // Check Legacy dictionary assets
  assert(fs.existsSync(path.join(unpackedDir, 'data', 'de-en-dictionary.json')), 'de-en-dictionary.json exists');
  assert(fs.existsSync(path.join(unpackedDir, 'data', 'de-en-inflections.json')), 'de-en-inflections.json exists');
  assert(fs.existsSync(path.join(unpackedDir, 'data', 'de-en-metadata.json')), 'de-en-metadata.json exists');

  // Check PDF.js and OCR assets
  assert(fs.existsSync(path.join(unpackedDir, 'pdf.worker.min.mjs')), 'pdf.worker.min.mjs exists');
  assert(fs.existsSync(path.join(unpackedDir, 'tesseract', 'worker-entry.js')), 'tesseract/worker-entry.js exists');
  assert(fs.existsSync(path.join(unpackedDir, 'tesseract', 'worker.min.js')), 'tesseract/worker.min.js exists');
  assert(fs.existsSync(path.join(unpackedDir, 'tesseract', 'tesseract-core-lstm.wasm')), 'tesseract-core-lstm.wasm exists');
  assert(fs.existsSync(path.join(unpackedDir, 'tesseract', 'tesseract-core-simd-lstm.wasm')), 'tesseract-core-simd-lstm.wasm exists');
  assert(fs.existsSync(path.join(unpackedDir, 'tesseract', 'tesseract-core-relaxedsimd-lstm.wasm')), 'tesseract-core-relaxedsimd-lstm.wasm exists');
  assert(fs.existsSync(path.join(unpackedDir, 'tessdata', 'deu.traineddata.gz')), 'deu.traineddata.gz exists');
  assert(fs.existsSync(path.join(unpackedDir, 'cmaps', 'LICENSE')), 'cmaps/LICENSE exists');
  assert(fs.existsSync(path.join(unpackedDir, 'standard_fonts', 'LICENSE_FOXIT')), 'LICENSE_FOXIT exists');
  assert(fs.existsSync(path.join(unpackedDir, 'standard_fonts', 'LICENSE_LIBERATION')), 'LICENSE_LIBERATION exists');

  // Check Licenses and Privacy
  assert(fs.existsSync(path.join(unpackedDir, 'LICENSE_DICTIONARY.txt')), 'LICENSE_DICTIONARY.txt exists');
  assert(fs.existsSync(path.join(unpackedDir, 'THIRD_PARTY_LICENSES.txt')), 'THIRD_PARTY_LICENSES.txt exists');
  assert(fs.existsSync(path.join(unpackedDir, 'privacy.html')), 'privacy.html exists');

  // Check no forbidden/unwanted files
  function scanForbidden(dir) {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) {
        scanForbidden(full);
      } else {
        const low = item.toLowerCase();
        assert(!low.endsWith('.map'), `No source maps: ${item}`);
        assert(!low.endsWith('.ts') && !low.endsWith('.tsx'), `No TS sources: ${item}`);
        assert(!low.includes('.env') && !low.includes('secret') && !low.includes('id_rsa'), `No credentials: ${item}`);
      }
    }
  }
  scanForbidden(unpackedDir);

  // Check build hash parity between dist/ and dist-unpacked
  const distDir = path.join(rootDir, 'dist');
  let hashMismatches = 0;
  function compareDir(dirA, dirB) {
    const list = fs.readdirSync(dirA);
    for (const item of list) {
      const pA = path.join(dirA, item);
      const pB = path.join(dirB, item);
      if (fs.statSync(pA).isDirectory()) {
        compareDir(pA, pB);
      } else {
        const hashA = crypto.createHash('sha256').update(fs.readFileSync(pA)).digest('hex');
        const hashB = crypto.createHash('sha256').update(fs.readFileSync(pB)).digest('hex');
        if (hashA !== hashB) hashMismatches++;
      }
    }
  }
  compareDir(distDir, unpackedDir);
  assert(hashMismatches === 0, 'Exact 100% byte-for-byte parity between dist/ and release ZIP');

  console.log('\n--- TEST 2 — PRODUCTION DICTIONARY INTEGRATION ---');
  // Load actual unpacked data assets into providers
  const authoredDictData = JSON.parse(fs.readFileSync(path.join(unpackedDir, 'data', 'authored-de-en-dictionary.json'), 'utf8'));
  const authoredInflData = JSON.parse(fs.readFileSync(path.join(unpackedDir, 'data', 'authored-de-en-inflections.json'), 'utf8'));
  const legacyDictData = JSON.parse(fs.readFileSync(path.join(unpackedDir, 'data', 'de-en-dictionary.json'), 'utf8'));
  const legacyInflData = JSON.parse(fs.readFileSync(path.join(unpackedDir, 'data', 'de-en-inflections.json'), 'utf8'));

  const testAuthoredProvider = new LocalDictionaryProvider(authoredDictData, authoredInflData);
  const testLegacyProvider = new LocalDictionaryProvider(legacyDictData, legacyInflData);
  const compositeProvider = new CompositeDictionaryProvider(testAuthoredProvider, testLegacyProvider);
  await compositeProvider.ensureInitialized();

  // 1. Authored hits take precedence
  const hitHaus = await compositeProvider.lookup('Haus', 'de', 'en');
  assert(hitHaus && hitHaus.providerId === 'authored', 'Authored hit "Haus" resolved with providerId "authored"');
  assert(hitHaus.translations.includes('house') && hitHaus.partOfSpeech.toLowerCase().includes('noun'), '"Haus" has correct translation and noun POS');

  const hitArbeiten = await compositeProvider.lookup('arbeiten', 'de', 'en');
  assert(hitArbeiten && hitArbeiten.providerId === 'authored', 'Authored hit "arbeiten" resolved with providerId "authored"');
  assert(hitArbeiten.translations.some(t => t.includes('work')), '"arbeiten" translation includes "work"');

  // 2. Authored inflection takes precedence
  const hitHaeuser = await compositeProvider.lookup('Häuser', 'de', 'en');
  assert(hitHaeuser && hitHaeuser.providerId === 'authored' && hitHaeuser.lemma === 'Haus', 'Inflected "Häuser" resolves to lemma "Haus" via authored');

  // 3. Legacy-only hit fallback
  const hitSchrank = await compositeProvider.lookup('Schrank', 'de', 'en');
  assert(hitSchrank && hitSchrank.providerId === 'legacy', 'Legacy-only word "Schrank" falls back to legacy provider');
  assert(hitSchrank.translations.some(t => t.includes('cabinet') || t.includes('cupboard')), '"Schrank" translated correctly');

  const hitFenster = await compositeProvider.lookup('Fenster', 'de', 'en');
  assert(hitFenster && hitFenster.providerId === 'legacy', 'Legacy-only word "Fenster" falls back to legacy provider');

  // 4. Ambiguous inflections
  const hitSprachen = await compositeProvider.lookup('sprachen', 'de', 'en');
  assert(hitSprachen && hitSprachen.lemma.includes('Sprache') && hitSprachen.lemma.includes('sprechen'), 'Ambiguous inflection "sprachen" resolves compound lemma "Sprache / sprechen"');
  assert(hitSprachen.partOfSpeech.includes('noun') && hitSprachen.partOfSpeech.includes('verb'), '"sprachen" polysemous POS contains noun/verb');

  // 5. Homographs and capitalization
  const hitSie = await compositeProvider.lookup('Sie', 'de', 'en');
  const hitsie = await compositeProvider.lookup('sie', 'de', 'en');
  assert(hitSie.translations.some(t => /you/i.test(t)), 'Capitalized "Sie" resolves formal you');
  assert(hitsie.translations.some(t => /she|they/i.test(t)), 'Lowercase "sie" resolves she/they');

  const hitMorgen = await compositeProvider.lookup('Morgen', 'de', 'en');
  const hitmorgen = await compositeProvider.lookup('morgen', 'de', 'en');
  assert(hitMorgen.partOfSpeech.includes('noun') && hitmorgen.partOfSpeech.includes('adv'), 'Case distinction for Morgen (noun) vs morgen (adv) preserved');

  // 6. Genuine miss returns null cleanly
  const miss = await compositeProvider.lookup('xyznonexistentword987', 'de', 'en');
  assert(miss === null, 'Genuine miss "xyznonexistentword987" returns null cleanly without throwing');

  // 7. Error handling contract
  const failingPrimary = {
    isInitialized: () => true,
    ensureInitialized: async () => {},
    lookup: async () => { throw new Error('Authored simulated failure'); }
  };
  const fallbackComposite = new CompositeDictionaryProvider(failingPrimary, testLegacyProvider);
  const fallbackRes = await fallbackComposite.lookup('Haus', 'de', 'en');
  assert(fallbackRes && fallbackRes.providerId === 'legacy', 'Primary lookup failure gracefully falls back to legacy');

  const failingFallback = {
    isInitialized: () => true,
    ensureInitialized: async () => {},
    lookup: async () => { throw new Error('Legacy simulated corruption'); }
  };
  const bothFailingComposite = new CompositeDictionaryProvider(failingPrimary, failingFallback);
  let caughtExplicitError = false;
  try {
    await bothFailingComposite.lookup('Haus', 'de', 'en');
  } catch (err) {
    caughtExplicitError = true;
    assert(err.message.includes('Legacy simulated corruption'), 'Explicit error thrown when fallback fails');
  }
  assert(caughtExplicitError, 'Dual provider failure throws explicit error, never returns null');

  console.log('\n--- TEST 3 — PDF READER ---');
  // 1. Open normal text-based PDF
  const multiPdfBytes = new Uint8Array(fs.readFileSync(path.join(testDir, 'sample-german-multipage.pdf')));
  const multiDoc = await pdfjsLib.getDocument({ data: multiPdfBytes }).promise;
  assert(multiDoc.numPages === 3, 'Normal multi-page PDF loaded with 3 pages');

  // 2. Multi-page navigation & text extraction across all pages
  for (let p = 1; p <= 3; p++) {
    const page = await multiDoc.getPage(p);
    const content = await page.getTextContent();
    const hasItems = content.items.some(i => 'str' in i && i.str.trim().length > 0);
    assert(hasItems, `Page ${p} has selectable text content`);
  }

  // 3. Zoom scale & Fit Width calculations
  const samplePage = await multiDoc.getPage(1);
  const viewport100 = samplePage.getViewport({ scale: 1.0 });
  const viewport150 = samplePage.getViewport({ scale: 1.5 });
  const viewport200 = samplePage.getViewport({ scale: 2.0 });
  assert(viewport150.width === viewport100.width * 1.5, '150% zoom viewport width scales by 1.5x');
  assert(viewport200.width === viewport100.width * 2.0, '200% zoom viewport width scales by 2.0x');

  // Fit Width calculation for 820px container
  const containerWidth = 820;
  const padding = 32;
  const fitScale = (containerWidth - padding) / viewport100.width;
  const fitViewport = samplePage.getViewport({ scale: fitScale });
  assert(Math.abs(fitViewport.width - (containerWidth - padding)) < 0.01, 'Fit Width scale fits within container bounds');

  // 4. Text selection & tooltip alignment
  const lineText = 'Ich lerne jeden Tag neue Wörter.';
  const offset = lineText.indexOf('Wörter') + 2;
  const extractedWord = extractWordAtOffset(lineText, offset);
  assert(extractedWord && extractedWord.word === 'Wörter', 'Word extracted accurately at character offset');
  assert(isSingleWord(extractedWord.word), 'Extracted token classified as single word');
  assert(!isSingleWord('zwei Wörter zusammen'), 'Multi-word selection rejected');

  // 5. Document replacement lifecycle PDF A -> PDF B -> PDF A
  const densePdfBytes = new Uint8Array(fs.readFileSync(path.join(testDir, 'sample-dense-text.pdf')));
  const denseDoc = await pdfjsLib.getDocument({ data: densePdfBytes }).promise;
  assert(denseDoc.numPages === 1, 'Replacement document PDF B loaded successfully');
  await multiDoc.destroy();
  await denseDoc.destroy();

  const reloadBytes = new Uint8Array(fs.readFileSync(path.join(testDir, 'sample-german-multipage.pdf')));
  const reloadDoc = await pdfjsLib.getDocument({ data: reloadBytes }).promise;
  assert(reloadDoc.numPages === 3, 'Original document reloaded successfully');
  await reloadDoc.destroy();
  console.log('  ✓ PASS: Clean document swapping and resource destruction verified');
  passedTests++;

  console.log('\n--- TEST 4 — OCR SUBSYSTEM ---');
  // 1. OCR on image-only / test fixture
  const ocrService = OCRService.getInstance();
  await ocrService.initialize();
  assert(ocrService.isInitialized(), 'OCR Service initialized successfully');

  const testImagePath = path.join(testDir, 'sample-german-ocr.bmp');
  const ocrRes = await ocrService.recognize(testImagePath, 1);
  assert(ocrRes && ocrRes.words.length > 0, `OCR recognized ${ocrRes.words.length} words from image`);

  // 2. German character handling (ä, ö, ü, ß)
  const fullOcrText = ocrRes.text;
  assert(fullOcrText.includes('Mädchen') || fullOcrText.includes('Bücher'), 'OCR correctly recognized German umlauts (Mädchen / Bücher)');
  const recognizedWords = ocrRes.words.map(w => w.text);
  assert(recognizedWords.some(w => cleanWordToken(w) === 'Mädchen'), 'Word "Mädchen" sanitized and isolated');

  // 3. Word bounding box geometry & normalization
  const firstWord = ocrRes.words[0];
  assert(firstWord.bbox && firstWord.bbox.x0 < firstWord.bbox.x1, 'Bounding box coordinates valid');
  assert(firstWord.confidence > 0, 'Word confidence score is positive');

  // 4. In-flight cancellation
  const cancelPromise = ocrService.recognize(testImagePath, 2);
  ocrService.cancel();
  let cancelCaught = false;
  try {
    await cancelPromise;
  } catch (err) {
    if (err instanceof OCRCancelledError) {
      cancelCaught = true;
    }
  }
  assert(cancelCaught, 'In-flight OCR job cancelled cleanly throwing OCRCancelledError');

  // 5. Cleanup and termination
  await ocrService.terminate();
  assert(!ocrService.isInitialized(), 'OCR Service terminated and resources released');

  console.log('\n--- TEST 5 — OFFLINE AND PRIVACY BEHAVIOR ---');
  // 1. Manifest permissions
  assert(!manifest.permissions || manifest.permissions.length === 0, 'Zero manifest permissions requested');
  assert(!manifest.host_permissions || manifest.host_permissions.length === 0, 'Zero host permissions requested');
  assert(manifest.content_security_policy.extension_pages.includes("'wasm-unsafe-eval'"), 'CSP permits local WASM execution');
  assert(!manifest.content_security_policy.extension_pages.includes("'unsafe-eval'"), 'CSP strictly forbids unsafe-eval');

  // 2. Privacy HTML and policy reconciliation
  const privacyHtml = fs.readFileSync(path.join(unpackedDir, 'privacy.html'), 'utf8');
  assert(privacyHtml.includes('100% Offline'), 'privacy.html confirms 100% offline operation');
  assert(privacyHtml.includes('Zero Data Collection') || privacyHtml.includes('Zero-Data Collection'), 'privacy.html declares Zero Data Collection');
  assert(privacyHtml.includes('No Telemetry or Analytics'), 'privacy.html explicitly disclaims telemetry');

  // 3. Scan code bundles for remote request triggers
  const viewerJsFile = fs.readdirSync(path.join(unpackedDir, 'assets')).find(f => f.startsWith('viewer-') && f.endsWith('.js'));
  assert(Boolean(viewerJsFile), 'Found viewer-*.js bundle in assets/');
  const viewerJs = fs.readFileSync(path.join(unpackedDir, 'assets', viewerJsFile), 'utf8');
  assert(!viewerJs.includes('google-analytics.com'), 'No Google Analytics in production bundle');
  assert(!viewerJs.includes('mixpanel'), 'No Mixpanel in production bundle');
  assert(!viewerJs.includes('sentry'), 'No Sentry in production bundle');

  console.log('\n--- TEST 6 — CHROME RUNTIME VALIDATION (HEADLESS AUTOMATION) ---');
  // Serve unpacked dist over local HTTP and test in headless Chrome
  const mimeTypes = {
    '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
    '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
    '.wasm': 'application/wasm', '.gz': 'application/gzip', '.bcmap': 'application/octet-stream',
    '.pfb': 'application/x-font-pfb', '.ttf': 'font/ttf'
  };

  const testServer = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/viewer.html';
    const filePath = path.join(unpackedDir, reqPath.replace(/^\//, ''));
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  const testPort = 8788;
  await new Promise(r => testServer.listen(testPort, r));

  const profileDir = path.resolve('.chrome-test-suite-profile');
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--window-size=1280,900',
    `http://127.0.0.1:${testPort}/viewer.html`
  ]);

  let versionRes;
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      versionRes = await fetch('http://127.0.0.1:9222/json/version');
      if (versionRes.ok) break;
    } catch {
      // Chrome still launching
    }
  }

  try {
    if (!versionRes) {
      versionRes = await fetch('http://127.0.0.1:9222/json/version');
    }
    const versionData = await versionRes.json();
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
    assert(!!pageTarget, 'Chrome successfully loaded viewer.html');

    const attachRes = await send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
    const sessionId = attachRes.sessionId;

    const chromeErrors = [];
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.sessionId === sessionId) {
        if (msg.method === 'Runtime.exceptionThrown') {
          chromeErrors.push(msg.params.exceptionDetails);
        }
      }
    });

    await send('Runtime.enable', {}, sessionId);
    await send('DOM.enable', {}, sessionId);
    await new Promise(r => setTimeout(r, 1500));

    // Verify initial UI elements
    const initialDom = await send('Runtime.evaluate', {
      expression: `(() => {
        return {
          title: document.title,
          hasOpenPdfBtn: Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Open PDF')),
          hasChoosePdfBtn: Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Choose PDF')),
          hasFileInput: !!document.querySelector('input[type=\"file\"]')
        };
      })()`,
      returnByValue: true
    }, sessionId);

    assert(initialDom.result.value.title === 'PDF Language Companion', 'Viewer title is "PDF Language Companion"');
    assert(initialDom.result.value.hasOpenPdfBtn, 'Open PDF button present in Navbar');
    assert(initialDom.result.value.hasFileInput, 'File picker input present');

    // Load PDF file via DOM.setFileInputFiles
    const docNode = await send('DOM.getDocument', {}, sessionId);
    const inputNode = await send('DOM.querySelector', {
      nodeId: docNode.root.nodeId,
      selector: 'input[type="file"]'
    }, sessionId);

    await send('DOM.setFileInputFiles', {
      files: [path.resolve(testDir, 'sample-german-multipage.pdf')],
      nodeId: inputNode.nodeId
    }, sessionId);

    // Wait for PDF render
    await new Promise(r => setTimeout(r, 3000));

    const renderedState = await send('Runtime.evaluate', {
      expression: `(() => {
        const canvas = document.querySelector('canvas');
        const textSpans = Array.from(document.querySelectorAll('.textLayer span')).map(s => s.innerText);
        const headerText = document.querySelector('header')?.innerText;
        return {
          canvasRendered: !!canvas && canvas.width > 0,
          textSpansCount: textSpans.length,
          firstSpan: textSpans[0] || '',
          headerText
        };
      })()`,
      returnByValue: true
    }, sessionId);

    assert(renderedState.result.value.canvasRendered, 'PDF Canvas rendered successfully in Chrome');
    assert(renderedState.result.value.textSpansCount > 0, 'Text layer spans rendered in Chrome');
    assert(renderedState.result.value.headerText.includes('sample-german-multipage.pdf'), 'Header updated with PDF filename');

    // Trigger word selection lookup
    await send('Runtime.evaluate', {
      expression: `(() => {
        const span = Array.from(document.querySelectorAll('.textLayer span')).find(s => s.innerText.includes('Wörter'));
        if (!span) return;
        const textNode = span.firstChild;
        const text = textNode.nodeValue;
        const range = document.createRange();
        range.setStart(textNode, text.indexOf('Wörter'));
        range.setEnd(textNode, text.indexOf('Wörter') + 'Wörter'.length);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        span.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
      })()`
    }, sessionId);

    await new Promise(r => setTimeout(r, 1500));

    const tooltipCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const tooltip = document.querySelector('[role=\"tooltip\"]');
        if (!tooltip) return null;
        return {
          word: tooltip.querySelector('span.font-bold')?.innerText,
          base: tooltip.innerText.includes('Base: Wort'),
          pos: tooltip.innerText.includes('NOUN'),
          translation: tooltip.innerText.includes('word')
        };
      })()`,
      returnByValue: true
    }, sessionId);

    assert(tooltipCheck.result.value && tooltipCheck.result.value.word === 'Wörter', 'Tooltip displayed for selected word "Wörter" in Chrome');
    assert(tooltipCheck.result.value.base, 'Tooltip displays Base: Wort');
    assert(tooltipCheck.result.value.translation, 'Tooltip displays translation "word"');

    // Check for runtime exceptions
    assert(chromeErrors.length === 0, `Zero uncaught runtime exceptions in Chrome console (actual: ${chromeErrors.length})`);

    await send('Browser.close');
  } finally {
    testServer.close();
    chromeProc.kill();
  }

  console.log('\n=====================================================================');
  console.log(`🎉 ALL ${passedTests} RC ACCEPTANCE CHECKS PASSED WITH ZERO FAILURES!`);
  console.log('=====================================================================\n');
}

runAcceptanceSuite().catch(err => {
  console.error('\n❌ ACCEPTANCE TEST SUITE FAILED:', err);
  process.exit(1);
});
