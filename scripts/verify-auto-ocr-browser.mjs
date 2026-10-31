/**
 * scripts/verify-auto-ocr-browser.mjs
 *
 * In-browser Acceptance & E2E Verification of Automatic OCR Detection,
 * One-Time Opt-In Banner, Settings Modal, and Preference Persistence.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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
const profileDir = path.resolve('.chrome-auto-ocr-profile');
const testPort = 8792;
const cdpPort = 9229;

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label, context) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    failures.push({ label, context });
    console.error(`  ✗ FAIL: ${label}${context ? ' [' + context + ']' : ''}`);
  }
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
    res.end('Not found: ' + reqPath);
  }
});

async function runBrowserTest() {
  console.log('=====================================================================');
  console.log('  LINGO PDF — BROWSER AUTOMATIC OCR & OPT-IN ACCEPTANCE SUITE        ');
  console.log('=====================================================================\n');

  await new Promise(r => server.listen(testPort, r));
  console.log(`  • Local HTTP test server listening on port ${testPort}`);

  fs.mkdirSync(profileDir, { recursive: true });

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
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

  assert(cdpConnected, `Chrome launched with CDP on port ${cdpPort}`);

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
  assert(!!pageTarget, 'Browser target viewer.html found');

  const attachRes = await send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
  const sessionId = attachRes.sessionId;

  await send('Runtime.enable', {}, sessionId);
  await send('DOM.enable', {}, sessionId);
  await new Promise(r => setTimeout(r, 1200));

  // Helper to load PDF in browser
  async function loadPdfInBrowser(pdfFilePath) {
    const fileBytes = fs.readFileSync(pdfFilePath);
    const base64Data = fileBytes.toString('base64');
    const fileName = path.basename(pdfFilePath);

    return await send('Runtime.evaluate', {
      expression: `(async () => {
        const b64 = "${base64Data}";
        const byteChars = atob(b64);
        const byteNums = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
        const byteArray = new Uint8Array(byteNums);
        const file = new File([byteArray], "${fileName}", { type: "application/pdf" });
        const input = document.querySelector('input[type="file"]');
        if (!input) return { ok: false, error: "File input not found" };
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return { ok: true };
      })()`,
      awaitPromise: true,
      returnByValue: true
    }, sessionId);
  }

  // Clear localStorage for clean test baseline
  await send('Runtime.evaluate', {
    expression: 'localStorage.clear()'
  }, sessionId);

  // -------------------------------------------------------------------------
  // Scenario 1: Normal Selectable Text PDF (sample-german-1page.pdf)
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 1: Normal Selectable Text PDF ---');
  await loadPdfInBrowser(path.join(testDir, 'sample-german-1page.pdf'));
  await new Promise(r => setTimeout(r, 1500));

  const textPageCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const banner = document.querySelector('[aria-labelledby="auto-ocr-title"]');
      const warning = document.querySelector('[role="alert"]');
      const spans = document.querySelectorAll('.textLayer span');
      return {
        hasBanner: Boolean(banner),
        hasWarning: Boolean(warning),
        spanCount: spans.length,
      };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(!textPageCheck.result.value.hasBanner, 'Normal text PDF: Opt-in banner is NOT shown');
  assert(!textPageCheck.result.value.hasWarning, 'Normal text PDF: Scanned warning is NOT shown');
  assert(textPageCheck.result.value.spanCount > 0, `Normal text PDF: Text layer rendered ${textPageCheck.result.value.spanCount} spans`);

  // -------------------------------------------------------------------------
  // Scenario 2: Scanned Page with Preference "unset" -> Shows Opt-In Prompt
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 2: Scanned Image Page with Preference "unset" ---');
  // Reset document to file picker
  await send('Runtime.evaluate', {
    expression: `(() => {
      const openBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Open PDF'));
      if (openBtn) openBtn.click();
    })()`
  }, sessionId);
  await new Promise(r => setTimeout(r, 600));

  await loadPdfInBrowser(path.join(testDir, 'sample-scanned-image.pdf'));
  await new Promise(r => setTimeout(r, 1500));

  const promptCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const banner = document.querySelector('[aria-labelledby="auto-ocr-title"]');
      if (!banner) return { found: false };
      const title = document.getElementById('auto-ocr-title')?.innerText || '';
      const desc = document.getElementById('auto-ocr-desc')?.innerText || '';
      const enableBtn = Array.from(banner.querySelectorAll('button')).find(b => b.innerText.includes('Enable automatic OCR'));
      const notNowBtn = Array.from(banner.querySelectorAll('button')).find(b => b.innerText.includes('Not now'));
      return {
        found: true,
        title,
        desc,
        hasEnableBtn: Boolean(enableBtn),
        hasNotNowBtn: Boolean(notNowBtn),
      };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(promptCheck.result.value.found, 'Scanned page with unset preference: Opt-in prompt is displayed');
  assert(promptCheck.result.value.title.includes('Enable automatic OCR?'), 'Opt-in title matches required copy');
  assert(promptCheck.result.value.desc.includes('Some pages in this PDF appear to be scanned images'), 'Opt-in description explains automatic recognition and local processing');
  assert(promptCheck.result.value.hasEnableBtn, 'Prompt provides "Enable automatic OCR" action');
  assert(promptCheck.result.value.hasNotNowBtn, 'Prompt provides "Not now" action');

  // Click "Not now"
  console.log('Clicking "Not now"...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const banner = document.querySelector('[aria-labelledby="auto-ocr-title"]');
      const notNowBtn = Array.from(banner.querySelectorAll('button')).find(b => b.innerText.includes('Not now'));
      if (notNowBtn) notNowBtn.click();
    })()`
  }, sessionId);
  await new Promise(r => setTimeout(r, 600));

  const afterDeclineCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const pref = localStorage.getItem('lingopdf_auto_ocr_preference');
      const banner = document.querySelector('[aria-labelledby="auto-ocr-title"]');
      const warning = document.querySelector('[role="alert"]');
      return {
        pref,
        hasBanner: Boolean(banner),
        warningText: warning?.innerText || ''
      };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(afterDeclineCheck.result.value.pref === 'disabled', 'Declining persists "disabled" in localStorage');
  assert(!afterDeclineCheck.result.value.hasBanner, 'Opt-in prompt is dismissed after user decision');
  assert(afterDeclineCheck.result.value.warningText.includes('Run OCR'), 'Fallback manual "Run OCR" button is visible when auto-OCR is declined');

  // -------------------------------------------------------------------------
  // Scenario 3: Previously Declined User Reopening Scanned PDF -> Not Prompted Again
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 3: Reopening Scanned Page with Preference "disabled" ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const openBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Open PDF'));
      if (openBtn) openBtn.click();
    })()`
  }, sessionId);
  await new Promise(r => setTimeout(r, 600));

  await loadPdfInBrowser(path.join(testDir, 'sample-scanned-image.pdf'));
  await new Promise(r => setTimeout(r, 1500));

  const rePromptCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const banner = document.querySelector('[aria-labelledby="auto-ocr-title"]');
      return { hasBanner: Boolean(banner) };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(!rePromptCheck.result.value.hasBanner, 'Previously declined user is NOT prompted repeatedly');

  // -------------------------------------------------------------------------
  // Scenario 4: Settings Modal Inspection and Preference Change
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 4: Changing Preference via Settings Modal ---');
  // Open Settings modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const settingsBtn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === 'Settings & OCR Preferences');
      if (settingsBtn) settingsBtn.click();
    })()`
  }, sessionId);
  await new Promise(r => setTimeout(r, 600));

  const settingsCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const modal = document.querySelector('[role="dialog"][aria-labelledby="settings-modal-title"]');
      if (!modal) return { open: false };
      const radios = Array.from(modal.querySelectorAll('input[name="auto_ocr_pref"]'));
      const enabledRadio = radios.find(r => r.value === 'enabled');
      const disabledRadio = radios.find(r => r.value === 'disabled');
      return {
        open: true,
        disabledChecked: disabledRadio?.checked,
        enabledChecked: enabledRadio?.checked
      };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(settingsCheck.result.value.open, 'Settings modal opens with role="dialog"');
  assert(settingsCheck.result.value.disabledChecked === true, 'Settings modal accurately reflects current "disabled" preference');

  // Select "enabled"
  console.log('Selecting "Automatic OCR (Recommended)" in Settings modal...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const modal = document.querySelector('[role="dialog"][aria-labelledby="settings-modal-title"]');
      const enabledRadio = modal.querySelector('input[value="enabled"]');
      if (enabledRadio) enabledRadio.click();
      const doneBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Done'));
      if (doneBtn) doneBtn.click();
    })()`
  }, sessionId);
  await new Promise(r => setTimeout(r, 600));

  const afterSettingsCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const pref = localStorage.getItem('lingopdf_auto_ocr_preference');
      const modal = document.querySelector('[role="dialog"][aria-labelledby="settings-modal-title"]');
      return {
        pref,
        modalClosed: !modal
      };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(afterSettingsCheck.result.value.pref === 'enabled', 'Changing preference in Settings modal persists "enabled" in localStorage');
  assert(afterSettingsCheck.result.value.modalClosed, 'Settings modal closes cleanly on clicking Done');

  console.log('\n=====================================================================');
  console.log(`  BROWSER ACCEPTANCE RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=====================================================================\n');

  ws.close();
  chromeProc.kill('SIGKILL');
  server.close();

  if (failed > 0) {
    process.exit(1);
  }
}

runBrowserTest().catch((err) => {
  console.error('\n❌ Browser acceptance test failed:', err);
  process.exit(1);
});
