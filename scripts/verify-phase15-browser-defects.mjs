import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const testDir = path.join(rootDir, 'test-assets');
function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    'C:\\Users\\LENOVO\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}
const chromePath = findChrome();
const profileDir = path.resolve('.chrome-phase15-test-profile');
const testPort = 8799;
const cdpPort = 9224;

console.log('=====================================================================');
console.log('  PDF LANGUAGE COMPANION — PHASE 15 BROWSER REGRESSION TEST SUITE   ');
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

const chromeProc = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${cdpPort}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--window-size=1280,1024',
  `http://127.0.0.1:${testPort}/viewer.html`
]);

await new Promise(r => setTimeout(r, 2000));

try {
  const versionRes = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
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
  assert(!!pageTarget, 'Chrome loaded viewer.html successfully');

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
  await new Promise(r => setTimeout(r, 1000));

  // --- PART 1: TEST SCANNED TEXTBOOK (kursbuch.pdf page 59) ---
  console.log('\n--- PART 1: SCANNED TEXTBOOK REPRODUCTION & VERIFICATION (kursbuch.pdf, page 59) ---');

  const docNode = await send('DOM.getDocument', {}, sessionId);
  const inputNode = await send('DOM.querySelector', {
    nodeId: docNode.root.nodeId,
    selector: 'input[type="file"]'
  }, sessionId);

  console.log('Loading kursbuch.pdf...');
  await send('DOM.setFileInputFiles', {
    files: [path.resolve('kursbuch.pdf')],
    nodeId: inputNode.nodeId
  }, sessionId);

  // Wait for initial load
  await new Promise(r => setTimeout(r, 4000));

  // Navigate to page 59
  console.log('Navigating to page 59...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const form = document.querySelector('form');
      const input = form ? form.querySelector('input') : null;
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '59');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      return true;
    })()`
  }, sessionId);

  // Wait for and click Run OCR button
  console.log('Triggering OCR on page 59...');
  let ocrClicked = false;
  for (let i = 0; i < 20; i++) {
    const ocrClick = await send('Runtime.evaluate', {
      expression: `(() => {
        const notNow = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Not now'));
          if (notNow) notNow.click();
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Run OCR'));
        if (btn) { btn.click(); return true; }
        return false;
      })()`,
      returnByValue: true
    }, sessionId);
    if (ocrClick.result.value) {
      ocrClicked = true;
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  assert(ocrClicked, 'Found and clicked "Run OCR" button on page 59');

  // Poll for OCR completion
  console.log('Waiting for OCR recognition to complete (high-resolution render)...');
  let ocrCompleted = false;
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const status = await send('Runtime.evaluate', {
      expression: `(() => {
        const layer = document.querySelector('.ocrTextLayer');
        const count = layer ? layer.querySelectorAll('span').length : 0;
        return { hasLayer: !!layer, count };
      })()`,
      returnByValue: true
    }, sessionId);

    if (status.result.value.hasLayer && status.result.value.count > 100) {
      console.log(`  OCR completed in ~${i + 1}s with ${status.result.value.count} word spans!`);
      ocrCompleted = true;
      break;
    }
  }
  assert(ocrCompleted, 'OCR completed and populated .ocrTextLayer with recognized word spans');

  // Helper function to click on a word span by exact or partial text and inspect tooltip
  async function clickWordAndGetTooltip(wordText) {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const escEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true });
        document.dispatchEvent(escEvent);
        window.getSelection()?.removeAllRanges();
      })()`
    }, sessionId);
    await new Promise(r => setTimeout(r, 150));

    const clickRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const cleanWord = (str) => str.replace(/^[^a-zA-ZäöüÄÖÜß]+|[^a-zA-ZäöüÄÖÜß]+$/g, '');
        const spans = Array.from(document.querySelectorAll('.ocrTextLayer span'));
        const span = spans.find(s => {
          const w = s.getAttribute('data-ocr-word') || s.innerText || '';
          return cleanWord(w).toLowerCase() === '${wordText}'.toLowerCase();
        });
        if (!span) return { found: false };
        const rect = span.getBoundingClientRect();
        window.getSelection()?.removeAllRanges();
        // Dispatch mousedown, mouseup, click at the visual center of the span
        const clientX = rect.left + rect.width / 2;
        const clientY = rect.top + rect.height / 2;
        const opts = { bubbles: true, cancelable: true, view: window, clientX, clientY };
        span.dispatchEvent(new MouseEvent('mousedown', opts));
        span.dispatchEvent(new MouseEvent('mouseup', opts));
        span.dispatchEvent(new MouseEvent('click', opts));
        return { found: true, text: span.innerText, rect };
      })()`,
      returnByValue: true
    }, sessionId);

    if (!clickRes.result.value || !clickRes.result.value.found) {
      return null;
    }

    // Poll until tooltip updates to the clicked word and completes loading
    let tooltip = null;
    for (let t = 0; t < 25; t++) {
      await new Promise(r => setTimeout(r, 150));
      const tooltipRes = await send('Runtime.evaluate', {
        expression: `(() => {
          const tooltip = document.querySelector('[role="tooltip"]');
          if (!tooltip) return null;
          const header = tooltip.querySelector('span.font-bold')?.innerText || '';
          const body = tooltip.innerText;
          const isLoading = body.includes('Looking up translation');
          return {
            header,
            body,
            isLoading,
            visible: tooltip.offsetWidth > 0 && tooltip.offsetHeight > 0
          };
        })()`,
        returnByValue: true
      }, sessionId);

      const val = tooltipRes.result.value;
      if (val && !val.isLoading && val.header.toLowerCase() === wordText.toLowerCase()) {
        tooltip = val;
        break;
      }
      if (val && !val.isLoading && t > 8) {
        tooltip = val;
      }
    }

    console.log(`  [Tooltip inspection for "${wordText}"]:`, JSON.stringify(tooltip));

    return {
      span: clickRes.result.value,
      tooltip
    };
  }

  // --- DEFECT A: Modalverben ---
  console.log('\n[DEFECT A] Verifying "Modalverben" resolution:');
  const resModalverben = await clickWordAndGetTooltip('Modalverben');
  assert(!!resModalverben && !!resModalverben.tooltip, 'Clicking visual center of "Modalverben" opened tooltip');
  assert(resModalverben.tooltip.body.includes('Modalverb'), 'Tooltip displays Lemma: Modalverb');
  assert(resModalverben.tooltip.body.toLowerCase().includes('modal verb'), 'Tooltip displays translation "modal verb"');

  // --- DEFECT B: arbeiten ---
  console.log('\n[DEFECT B] Verifying "arbeiten" single-word selection:');
  // First ensure "arbeiten" is clean and distinct from "einkaufen"
  const spanCheckB = await send('Runtime.evaluate', {
    expression: `(() => {
      const spans = Array.from(document.querySelectorAll('.ocrTextLayer span'));
      const arbeitenSpan = spans.find(s => s.innerText === 'arbeiten');
      const einkaufenSpan = spans.find(s => s.innerText === 'einkaufen');
      const arkaufenSpan = spans.find(s => s.innerText.includes('arkaufen'));
      return {
        hasArbeiten: !!arbeitenSpan,
        arbeitenH: arbeitenSpan ? arbeitenSpan.offsetHeight : 0,
        hasEinkaufen: !!einkaufenSpan,
        hasArkaufen: !!arkaufenSpan
      };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(spanCheckB.result.value.hasArbeiten, '"arbeiten" recognized as independent word');
  assert(!spanCheckB.result.value.hasArkaufen, 'No merged multi-row "arkaufen" artifact produced');
  assert(spanCheckB.result.value.arbeitenH <= 30, '"arbeiten" span height corresponds to a single line (< 30px)');

  const resArbeiten = await clickWordAndGetTooltip('arbeiten');
  assert(!!resArbeiten && !!resArbeiten.tooltip, 'Clicking visual center of "arbeiten" opened tooltip');
  assert(resArbeiten.tooltip.body.includes('work') || resArbeiten.tooltip.body.includes('labor'), 'Tooltip displays translation "work"');

  // --- DEFECT C: Yellow Callout box ---
  console.log('\n[DEFECT C] Verifying words inside yellow callout box:');
  const resKinder = await clickWordAndGetTooltip('Kinder');
  assert(!!resKinder && !!resKinder.tooltip, 'Clicking "Kinder" in yellow callout opened tooltip');
  assert(resKinder.tooltip.body.includes('child'), 'Tooltip displays translation "child"');

  const resWoche = await clickWordAndGetTooltip('Woche');
  assert(!!resWoche && !!resWoche.tooltip, 'Clicking "Woche" in yellow callout opened tooltip');
  assert(resWoche.tooltip.body.includes('week'), 'Tooltip displays translation "week"');

  // --- DEFECT D: Berge -> Berg (noun, mountains) ---
  console.log('\n[DEFECT D] Verifying "Berge" lemma resolution:');
  const resBerge = await clickWordAndGetTooltip('Berge');
  assert(!!resBerge && !!resBerge.tooltip, 'Clicking "Berge" opened tooltip');
  assert(resBerge.tooltip.body.includes('Base: Berg'), 'Tooltip displays Lemma "Berg", NOT "bergen"');
  assert(resBerge.tooltip.body.includes('mountain') || resBerge.tooltip.body.includes('mount'), 'Tooltip displays translation "mountain"');
  assert(!resBerge.tooltip.body.includes('salvage') && !resBerge.tooltip.body.includes('recover'), 'Tooltip does not show incorrect "salvage/recover" verb sense');

  // --- DEFECT E: müssen ---
  console.log('\n[DEFECT E] Verifying "müssen" resolution:');
  const resMuessen = await clickWordAndGetTooltip('müssen');
  assert(!!resMuessen && !!resMuessen.tooltip, 'Clicking "müssen" opened tooltip');
  assert(resMuessen.tooltip.body.includes('must') || resMuessen.tooltip.body.includes('to have to'), 'Tooltip displays translation "must / to have to"');

  // --- DEFECT F: Telefongespräch vs morgen ---
  console.log('\n[DEFECT F] Verifying "Telefongespräch" vs "morgen" precision:');
  const checkSpansF = await send('Runtime.evaluate', {
    expression: `(() => {
      const spans = Array.from(document.querySelectorAll('.ocrTextLayer span'));
      const tel = spans.find(s => s.innerText.includes('Telefongespräch'));
      const telTop = tel ? tel.getBoundingClientRect().top : 0;
      // Find the 'morgen' instance situated on the line directly below Telefongespräch
      const mor = spans.filter(s => s.innerText.toLowerCase().startsWith('morgen'))
                       .find(s => s.getBoundingClientRect().top > telTop);
      return {
        hasTel: !!tel,
        telTop,
        hasMor: !!mor,
        morTop: mor ? mor.getBoundingClientRect().top : 0
      };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(checkSpansF.result.value.hasTel, '"Telefongespräch" heading recognized in OCR layer');
  assert(checkSpansF.result.value.hasMor, '"morgen" recognized on line below');
  assert(checkSpansF.result.value.telTop < checkSpansF.result.value.morTop, '"Telefongespräch" is vertically positioned above "morgen"');

  const resTelefon = await clickWordAndGetTooltip('Telefongespräch');
  assert(!!resTelefon && !!resTelefon.tooltip, 'Clicking "Telefongespräch" opened tooltip');
  assert(resTelefon.tooltip.header === 'Telefongespräch', 'Tooltip header is "Telefongespräch" (not "morgen")');
  assert(resTelefon.tooltip.body.includes('telephone') || resTelefon.tooltip.body.includes('call'), 'Tooltip displays phone call translation');

  // --- PHASE 15.1 ISSUE A: YELLOW CALLOUT TEXT SELECTION ---
  console.log('\n[PHASE 15.1 ISSUE A] Verifying embedded yellow callout text selection:');
  const calloutSpansCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const spans = Array.from(document.querySelectorAll('.ocrTextLayer span'));
      // Find spans located in the yellow callout box (right side, middle height)
      const calloutWords = ['Modalverben', 'Die', 'Kinder', 'können', 'auch', 'nicht', 'helfen', 'Am', 'Samstag', 'muss', 'ich', 'arbeiten'];
      const foundInCallout = spans.filter(s => {
        const text = s.getAttribute('data-ocr-word') || s.innerText || '';
        const rect = s.getBoundingClientRect();
        return rect.left >= 480 && rect.top >= 330 && rect.top <= 490;
      }).map(s => s.innerText);

      return {
        foundWords: foundInCallout,
        hasModalverben: foundInCallout.some(w => w.toLowerCase().includes('modalverben')),
        hasKinder: foundInCallout.some(w => w.toLowerCase().includes('kinder')),
        hasKoennen: foundInCallout.some(w => w.toLowerCase().includes('können')),
        hasSamstag: foundInCallout.some(w => w.toLowerCase().includes('samstag')),
        hasArbeiten: foundInCallout.some(w => w.toLowerCase().includes('arbeiten'))
      };
    })()`,
    returnByValue: true
  }, sessionId);

  console.log('Callout spans found:', calloutSpansCheck.result.value.foundWords);
  assert(calloutSpansCheck.result.value.hasKinder, 'Callout word "Kinder" present in OCR layer');
  assert(calloutSpansCheck.result.value.hasKoennen, 'Callout word "können" present in OCR layer');
  assert(calloutSpansCheck.result.value.hasSamstag, 'Callout word "Samstag" present in OCR layer');
  assert(calloutSpansCheck.result.value.hasArbeiten, 'Callout word "arbeiten" present in OCR layer');

  const resCalloutKoennen = await clickWordAndGetTooltip('können');
  assert(!!resCalloutKoennen && !!resCalloutKoennen.tooltip, 'Clicking "können" in yellow callout opened tooltip');
  assert(resCalloutKoennen.tooltip.body.includes('can') || resCalloutKoennen.tooltip.body.includes('able'), 'Tooltip displays translation "can / to be able to"');

  const resCalloutSamstag = await clickWordAndGetTooltip('Samstag');
  assert(!!resCalloutSamstag && !!resCalloutSamstag.tooltip, 'Clicking "Samstag" in yellow callout opened tooltip');
  assert(resCalloutSamstag.tooltip.body.toLowerCase().includes('saturday'), 'Tooltip displays translation "Saturday"');

  // --- PHASE 15.1 ISSUE B: HEADERS, FOOTERS & PAGE NUMBERS ---
  console.log('\n[PHASE 15.1 ISSUE B] Verifying page headers, footers & page numbers:');
  const headerCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const spans = Array.from(document.querySelectorAll('.ocrTextLayer span'));
      const headerSpan = spans.find(s => s.innerText === 'SICH' || s.innerText === 'VERABREDEN');
      return {
        hasHeader: !!headerSpan,
        rect: headerSpan ? headerSpan.getBoundingClientRect() : null
      };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(headerCheck.result.value.hasHeader, 'Page header "SICH / VERABREDEN" present in OCR layer');

  const resHeader = await clickWordAndGetTooltip('VERABREDEN');
  assert(!!resHeader && !!resHeader.tooltip, 'Clicking page header "VERABREDEN" opened tooltip');
  assert(resHeader.tooltip.body.includes('agree') || resHeader.tooltip.body.includes('arrange'), 'Tooltip displays translation for "verabreden"');

  const footerCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const spans = Array.from(document.querySelectorAll('.ocrTextLayer span'));
      const footerSpan = spans.find(s => s.innerText.toLowerCase().includes('siebenundfünfzig'));
      return {
        hasFooter: !!footerSpan,
        rect: footerSpan ? footerSpan.getBoundingClientRect() : null
      };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(footerCheck.result.value.hasFooter, 'Bottom page footer "siebenundfünfzig" present and reachable');

  const resFooter = await clickWordAndGetTooltip('siebenundfünfzig');
  assert(!!resFooter && !!resFooter.tooltip, 'Clicking page footer "siebenundfünfzig" opened tooltip');

  // --- PART 2: ZOOM INVARIANCE ON OCR LAYER ---
  console.log('\n--- PART 2: ZOOM INVARIANCE ON OCR LAYER ---');
  // Zoom to 1.5x (150%)
  await send('Runtime.evaluate', {
    expression: `(() => {
      const zoomInBtn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === 'Zoom In' || b.innerText.includes('+'));
      if (zoomInBtn) { zoomInBtn.click(); zoomInBtn.click(); return true; }
      return false;
    })()`
  }, sessionId);

  await new Promise(r => setTimeout(r, 1000));

  const zoom150Res = await clickWordAndGetTooltip('arbeiten');
  assert(!!zoom150Res && !!zoom150Res.tooltip, 'Word "arbeiten" remains selectable and accurate at zoomed scale');

  // --- PART 3: NORMAL TEXT-BASED PDF INVARIANCE ---
  console.log('\n--- PART 3: NORMAL TEXT-BASED PDF INVARIANCE ---');
  // Click "Open PDF" button in the navbar to reset to FilePicker
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Open PDF'));
      if (btn) btn.click();
    })()`
  }, sessionId);

  await new Promise(r => setTimeout(r, 1200));

  // Now FilePicker is rendered with input[type="file"]
  const reloadDocNode = await send('DOM.getDocument', {}, sessionId);
  const reloadInputNode = await send('DOM.querySelector', {
    nodeId: reloadDocNode.root.nodeId,
    selector: 'input[type="file"]'
  }, sessionId);

  console.log('Loading sample-german-multipage.pdf...');
  await send('DOM.setFileInputFiles', {
    files: [path.resolve(testDir, 'sample-german-multipage.pdf')],
    nodeId: reloadInputNode.nodeId
  }, sessionId);

  await new Promise(r => setTimeout(r, 3500));

  // Click on word "Wörter" in normal text layer
  const normalClick = await send('Runtime.evaluate', {
    expression: `(() => {
      const span = Array.from(document.querySelectorAll('.textLayer span')).find(s => s.innerText.includes('Wörter'));
      if (!span) return { found: false };
      const textNode = span.firstChild;
      const text = textNode.nodeValue;
      const range = document.createRange();
      range.setStart(textNode, text.indexOf('Wörter'));
      range.setEnd(textNode, text.indexOf('Wörter') + 'Wörter'.length);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      span.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
      return { found: true };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(normalClick.result.value.found, 'Selected "Wörter" in normal text-based PDF textLayer');

  await new Promise(r => setTimeout(r, 800));

  const normalTooltip = await send('Runtime.evaluate', {
    expression: `(() => {
      const tooltip = document.querySelector('[role="tooltip"]');
      if (!tooltip) return null;
      return {
        text: tooltip.innerText,
        hasWord: tooltip.innerText.includes('Wort')
      };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(!!normalTooltip.result.value && normalTooltip.result.value.hasWord, 'Tooltip resolved Base: Wort in normal text PDF');

  // --- PART 4: ZERO RUNTIME CONSOLE EXCEPTIONS ---
  console.log('\n--- PART 4: CHROME RUNTIME CONSOLE AUDIT ---');
  assert(chromeErrors.length === 0, `Zero uncaught runtime exceptions in Chrome console (actual: ${chromeErrors.length})`);

  await send('Browser.close');
} finally {
  server.close();
  chromeProc.kill();
}

console.log('\n=====================================================================');
console.log(`🎉 ALL ${passedTests} BROWSER REGRESSION CHECKS PASSED WITH ZERO FAILURES!`);
console.log('=====================================================================\n');
