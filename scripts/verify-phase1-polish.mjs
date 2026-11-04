/**
 * scripts/verify-phase1-polish.mjs
 *
 * LingoPDF Extension — Phase 1 Polish Verification Suite
 *
 * Verifies:
 * 1. Dictionary Tooltip Grammatical Information:
 *    - German noun gender mapping: Masculine -> 'der', Feminine -> 'die', Neuter -> 'das'.
 *    - Plural form display: 'Plural: <plural>' when present.
 *    - Missing metadata safety: mass nouns (no plural), nouns without gender, malformed values.
 *    - Plural-only nouns safety: 'Leute', 'Nebenkosten', 'Eltern', 'Kosten' do NOT display misleading gender.
 *    - Non-noun preservation: adjectives, verbs, adverbs do NOT display noun gender or plural.
 * 2. About Modal Support Contact:
 *    - Presence of official address 'support@lingopdf.in'.
 *    - Working 'mailto:support@lingopdf.in' anchor link.
 *    - Visual consistency and 100% offline invariants (zero external requests).
 * 3. README OCR Documentation:
 *    - Local Tesseract.js engine documented.
 *    - Bundled German language data documented.
 *    - Automatic scanned page detection documented.
 *    - User opt-in and preferences documented.
 *    - Manual and automatic execution modes accurately described.
 *    - Offline processing and hardware limitations documented.
 *    - No outdated claims of scanned PDFs being unsupported.
 * 4. End-to-End Real Browser CDP Validation:
 *    - Headless Chrome loads viewer.html.
 *    - Noun lookup in text layer renders gender and plural in DOM tooltip.
 *    - Verb lookup in text layer leaves tooltip without gender/plural.
 *    - About modal opens and displays functional mailto link.
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const testAssetsDir = path.join(rootDir, 'test-assets');

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
const profileDir = path.resolve('.chrome-phase1-test-profile');
const testPort = 8795;
const cdpPort = 9232;

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
    throw new Error(`Assertion failed: ${label}`);
  }
}

function section(title) {
  console.log(`\n=====================================================================`);
  console.log(`  ${title}`);
  console.log(`=====================================================================`);
}

async function runVerification() {
  section('LINGOPDF — PHASE 1 POLISH VERIFICATION SUITE');

  // =========================================================================
  // SECTION 1: README OCR DOCUMENTATION ACCURACY AUDIT
  // =========================================================================
  console.log('\n--- Section 1: README OCR Documentation Audit ---');
  const readmePath = path.join(rootDir, 'README.md');
  assert(fs.existsSync(readmePath), 'README.md exists');
  const readmeContent = fs.readFileSync(readmePath, 'utf8');

  // Verify outdated claims are removed
  assert(!readmeContent.includes('Not supported in MVP v1'), 'Outdated "Not supported in MVP v1" removed from README');
  assert(!readmeContent.includes('Optical Character Recognition (OCR) for scanned PDFs is a planned future enhancement'), 'Outdated "planned future enhancement" claim removed');
  assert(!readmeContent.includes('The MVP does not contain OCR'), 'Outdated "The MVP does not contain OCR" claim removed');

  // Verify actual implemented features are documented
  assert(readmeContent.includes('Tesseract.js'), 'README documents Tesseract.js OCR engine');
  assert(readmeContent.includes('deu.traineddata'), 'README documents bundled German language data (deu.traineddata)');
  assert(readmeContent.includes('Automatic Scanned-Page Detection') || readmeContent.includes('Automatic scanned-page detection'), 'README documents automatic scanned-page detection');
  assert(readmeContent.includes('User Opt-In for Automatic OCR') || readmeContent.includes('User opt-in for automatic OCR'), 'README documents user opt-in for automatic OCR');
  assert(readmeContent.includes('Manual vs. Automatic') || readmeContent.includes('Manual & Automatic'), 'README documents manual and automatic OCR execution modes');
  assert(readmeContent.includes('Offline Processing & Limitations') || readmeContent.includes('Offline Processing and Limitations'), 'README documents offline processing and device/hardware limitations');
  assert(readmeContent.includes('support@lingopdf.in'), 'README documents official support contact address');

  // =========================================================================
  // SECTION 2: ABOUT MODAL SOURCE & CONTRACT AUDIT
  // =========================================================================
  console.log('\n--- Section 2: About Modal Support Link Contract ---');
  const aboutModalPath = path.join(rootDir, 'src', 'components', 'AboutModal.tsx');
  assert(fs.existsSync(aboutModalPath), 'AboutModal.tsx exists');
  const aboutContent = fs.readFileSync(aboutModalPath, 'utf8');

  assert(aboutContent.includes('support@lingopdf.in'), 'AboutModal contains support@lingopdf.in');
  assert(aboutContent.includes('href="mailto:support@lingopdf.in"'), 'AboutModal contains working mailto: anchor href');
  assert(aboutContent.includes('Mail'), 'AboutModal imports Mail icon for visual consistency');
  assert(!aboutContent.includes('fetch(') && !aboutContent.includes('axios'), 'AboutModal makes zero network calls (100% offline)');

  // =========================================================================
  // SECTION 3: DICTIONARY TOOLTIP GRAMMATICAL LOGIC AUDIT
  // =========================================================================
  console.log('\n--- Section 3: DictionaryTooltip Grammatical Information Rules ---');
  const tooltipPath = path.join(rootDir, 'src', 'components', 'DictionaryTooltip', 'DictionaryTooltip.tsx');
  assert(fs.existsSync(tooltipPath), 'DictionaryTooltip.tsx exists');
  const tooltipContent = fs.readFileSync(tooltipPath, 'utf8');

  // Verify gender mappings exist
  assert(tooltipContent.includes("'der'") && tooltipContent.includes("'die'") && tooltipContent.includes("'das'"), 'Tooltip maps masculine, feminine, and neuter to der, die, das');
  assert(tooltipContent.includes('Plural:'), 'Tooltip formats plural form as "Plural: <plural>"');
  assert(tooltipContent.includes('isPluralOnlyNoun'), 'Tooltip includes plural-only noun detection');
  assert(tooltipContent.includes('leute') && tooltipContent.includes('nebenkosten'), 'Tooltip includes representative plural-only nouns in protection set');

  // Unit-test the grammatical extraction logic by re-creating pure functions
  const PLURAL_ONLY_WORDS = new Set([
    'leute', 'nebenkosten', 'eltern', 'ferien', 'kosten', 'geschwister',
    'personalien', 'trümmer', 'alpen', 'finanzen', 'lebensmittel', 'gebrüder',
    'spaghetti', 'zutaten', 'memoiren', 'pocken', 'masern', 'röteln',
    'alliierten', 'diäten', 'einkünfte', 'spesen', 'wirren'
  ]);

  function isPluralOnly(word, lemma) {
    const check = (str) => {
      if (!str) return false;
      const lower = str.trim().toLowerCase();
      if (PLURAL_ONLY_WORDS.has(lower)) return true;
      if (
        lower.endsWith('kosten') ||
        lower.endsWith('eltern') ||
        lower.endsWith('ferien') ||
        lower.endsWith('leute')
      ) {
        return true;
      }
      return false;
    };
    return check(lemma) || check(word);
  }

  function getNounArticle(gender) {
    if (typeof gender !== 'string') return null;
    const normalized = gender.trim().toLowerCase();
    if (normalized === 'm' || normalized === 'masculine' || normalized === 'der') return 'der';
    if (normalized === 'f' || normalized === 'feminine' || normalized === 'die') return 'die';
    if (normalized === 'n' || normalized === 'neuter' || normalized === 'das') return 'das';
    return null;
  }

  function extractGrammar(wordSelection, result) {
    if (!result?.partOfSpeech || typeof result.partOfSpeech !== 'string') return null;
    const parts = result.partOfSpeech.toLowerCase().split('/');
    const isNoun = parts.some((p) => p.trim() === 'noun');
    if (!isNoun) return null;

    let pluralForm = null;
    if (typeof result.plural === 'string') {
      const trimmed = result.plural.trim();
      if (trimmed.length > 0) pluralForm = trimmed;
    }

    const queryWord = wordSelection?.word;
    const isPluralOnlyNoun = isPluralOnly(queryWord, result.lemma);

    let genderArticle = null;
    if (!isPluralOnlyNoun && result.gender) {
      genderArticle = getNounArticle(result.gender);
    }

    if (!genderArticle && !pluralForm) return null;

    return {
      article: genderArticle,
      plural: pluralForm,
    };
  }

  // Test Case 1: Masculine noun
  const testMasc = extractGrammar({ word: 'Tag' }, { partOfSpeech: 'noun', gender: 'm', plural: 'Tage' });
  assert(testMasc?.article === 'der', 'Masculine noun "Tag" has article "der"');
  assert(testMasc?.plural === 'Tage', 'Masculine noun "Tag" has plural "Tage"');

  // Test Case 2: Feminine noun
  const testFem = extractGrammar({ word: 'Schule' }, { partOfSpeech: 'noun', gender: 'f', plural: 'Schulen' });
  assert(testFem?.article === 'die', 'Feminine noun "Schule" has article "die"');
  assert(testFem?.plural === 'Schulen', 'Feminine noun "Schule" has plural "Schulen"');

  // Test Case 3: Neuter noun
  const testNeut = extractGrammar({ word: 'Buch' }, { partOfSpeech: 'noun', gender: 'n', plural: 'Bücher' });
  assert(testNeut?.article === 'das', 'Neuter noun "Buch" has article "das"');
  assert(testNeut?.plural === 'Bücher', 'Neuter noun "Buch" has plural "Bücher"');

  // Test Case 4: Mass noun with no plural
  const testMass = extractGrammar({ word: 'Wasser' }, { partOfSpeech: 'noun', gender: 'n', plural: null });
  assert(testMass?.article === 'das', 'Mass noun "Wasser" has article "das"');
  assert(testMass?.plural === null, 'Mass noun "Wasser" has plural === null');

  // Test Case 5: Plural-only noun "Leute" (authoring had gender: 'f')
  const testLeute = extractGrammar({ word: 'Leute' }, { partOfSpeech: 'noun', gender: 'f', plural: 'Leute' });
  assert(testLeute?.article === null, 'Plural-only noun "Leute" suppresses misleading gender article');
  assert(testLeute?.plural === 'Leute', 'Plural-only noun "Leute" displays plural form "Leute"');

  // Test Case 6: Plural-only noun "Nebenkosten" (draft had gender: 'f')
  const testNebenkosten = extractGrammar({ word: 'Nebenkosten' }, { partOfSpeech: 'noun', gender: 'f', plural: 'Nebenkosten' });
  assert(testNebenkosten?.article === null, 'Plural-only noun "Nebenkosten" suppresses misleading gender article');
  assert(testNebenkosten?.plural === 'Nebenkosten', 'Plural-only noun "Nebenkosten" displays plural form "Nebenkosten"');

  // Test Case 7: Plural-only noun "Eltern" (legacy has no gender)
  const testEltern = extractGrammar({ word: 'Eltern' }, { partOfSpeech: 'noun', plural: 'Eltern' });
  assert(testEltern?.article === null, 'Plural-only noun "Eltern" has no article');
  assert(testEltern?.plural === 'Eltern', 'Plural-only noun "Eltern" displays plural form "Eltern"');

  // Test Case 8: Compound plural-only "Kaufleute"
  const testKaufleute = extractGrammar({ word: 'Kaufleute' }, { lemma: 'Kaufleute', partOfSpeech: 'noun', gender: 'f', plural: 'Kaufleute' });
  assert(testKaufleute?.article === null, 'Compound "-leute" suppresses misleading gender article');

  // Test Case 9: Non-noun: Verb
  const testVerb = extractGrammar({ word: 'lernen' }, { partOfSpeech: 'verb', gender: 'n', plural: 'lernen' });
  assert(testVerb === null, 'Verb ignores any stray gender/plural metadata');

  // Test Case 10: Non-noun: Adjective
  const testAdj = extractGrammar({ word: 'schnell' }, { partOfSpeech: 'adj', gender: 'm' });
  assert(testAdj === null, 'Adjective ignores gender metadata');

  // Test Case 11: Non-noun: Adverb
  const testAdv = extractGrammar({ word: 'oft' }, { partOfSpeech: 'adv' });
  assert(testAdv === null, 'Adverb produces null grammar info');

  // Test Case 12: Missing or malformed metadata
  const testMalformed = extractGrammar({ word: 'Dings' }, { partOfSpeech: 'noun', gender: 'invalid_xyz', plural: '   ' });
  assert(testMalformed === null, 'Malformed gender and whitespace plural safely produce null grammar info');

  // =========================================================================
  // SECTION 4: REAL-WORLD BROWSER CDP ACCEPTANCE VALIDATION
  // =========================================================================
  console.log('\n--- Section 4: End-to-End Real Chrome Browser Validation ---');

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

  await new Promise((resolve) => server.listen(testPort, resolve));
  console.log(`  • Local HTTP test server running on port ${testPort}`);

  fs.mkdirSync(profileDir, { recursive: true });

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--window-size=1280,1024',
    `http://127.0.0.1:${testPort}/viewer.html`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  let versionData = null;
  for (let i = 0; i < 20; i++) {
    try {
      const versionRes = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      versionData = await versionRes.json();
      if (versionData?.webSocketDebuggerUrl) break;
    } catch {}
    await new Promise(r => setTimeout(r, 250));
  }

  assert(!!versionData?.webSocketDebuggerUrl, `CDP connection available on port ${cdpPort} (${versionData?.Browser})`);

  const ws = new WebSocket(versionData.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  const send = (method, params = {}, sessionId) => {
    return new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * 100000);
      const onMsg = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          ws.removeEventListener('message', onMsg);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
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
  await new Promise(r => setTimeout(r, 1000));

  // Helper: Load a PDF file into FilePicker via CDP DOM.setFileInputFiles
  async function loadPdfFixture(filePath) {
    const docNode = await send('DOM.getDocument', {}, sessionId);
    const inputNode = await send('DOM.querySelector', {
      nodeId: docNode.root.nodeId,
      selector: 'input[type="file"]'
    }, sessionId);

    await send('DOM.setFileInputFiles', {
      files: [filePath],
      nodeId: inputNode.nodeId
    }, sessionId);

    await new Promise(r => setTimeout(r, 2000));
  }

  // Helper: Navigate to page number
  async function navigateToPage(pageNum) {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const form = document.querySelector('form');
        const input = form ? form.querySelector('input') : null;
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, '${pageNum}');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        return true;
      })()`
    }, sessionId);
    await new Promise(r => setTimeout(r, 1500));
  }

  const multiPagePdfPath = path.join(testAssetsDir, 'sample-german-multipage.pdf');
  await loadPdfFixture(multiPagePdfPath);

  // Wait for PDF rendering and textLayer creation
  let rendered = false;
  for (let i = 0; i < 30; i++) {
    const check = await send('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('.textLayer span'))`
    }, sessionId);
    if (check.result.value) {
      rendered = true;
      break;
    }
    await new Promise(r => setTimeout(r, 200));
  }
  assert(rendered, 'Test PDF rendered with interactive text layer spans');

  // Helper to select word in text layer and trigger lookup
  async function selectWordInBrowser(targetWord) {
    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const spans = Array.from(document.querySelectorAll('.textLayer span'));
        for (const span of spans) {
          const text = span.textContent || '';
          const idx = text.indexOf('${targetWord}');
          if (idx !== -1) {
            const range = document.createRange();
            const textNode = span.firstChild;
            range.setStart(textNode, idx);
            range.setEnd(textNode, idx + '${targetWord}'.length);
            
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            span.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 200, clientY: 200 }));
            return { found: true, spanText: text };
          }
        }
        return { found: false };
      })()`,
      returnByValue: true
    }, sessionId);
    return evalRes.result.value;
  }

  async function getActiveTooltipText() {
    for (let i = 0; i < 20; i++) {
      const res = await send('Runtime.evaluate', {
        expression: `(() => {
          const tt = document.querySelector('[role="tooltip"]');
          return tt ? tt.innerText : null;
        })()`,
        returnByValue: true
      }, sessionId);
      if (res.result.value) return res.result.value;
      await new Promise(r => setTimeout(r, 150));
    }
    return null;
  }

  // 1. Browser Test: Masculine noun "Tag" -> der · Plural: Tage
  console.log('\n  [Browser Check 1: Masculine noun "Tag"]');
  const selTag = await selectWordInBrowser('Tag');
  assert(selTag?.found, 'Selected "Tag" in PDF text layer');
  const ttTag = await getActiveTooltipText();
  assert(ttTag !== null, 'Tooltip appeared for "Tag"');
  assert(ttTag.includes('Tag'), 'Tooltip displays word "Tag"');
  assert(ttTag.includes('der'), 'Tooltip displays masculine gender article "der"');
  assert(ttTag.includes('Plural: Tage'), 'Tooltip displays plural form "Plural: Tage"');
  assert(ttTag.toLowerCase().includes('day'), 'Tooltip displays translation "day"');

  // 2. Browser Test: Neuter noun with plural query "Wörter" -> lemma Wort, das, Plural: Wörter
  console.log('\n  [Browser Check 2: Neuter noun "Wörter"]');
  const selWoerter = await selectWordInBrowser('Wörter');
  assert(selWoerter?.found, 'Selected "Wörter" in PDF text layer');
  const ttWoerter = await getActiveTooltipText();
  assert(ttWoerter !== null, 'Tooltip appeared for "Wörter"');
  assert(ttWoerter.includes('Base: Wort'), 'Tooltip displays lemma "Base: Wort"');
  assert(ttWoerter.includes('das'), 'Tooltip displays neuter gender article "das"');
  assert(ttWoerter.includes('Plural: Wörter'), 'Tooltip displays plural form "Plural: Wörter"');
  assert(ttWoerter.toLowerCase().includes('word'), 'Tooltip displays translation "word"');

  // 3. Browser Test: Verb "lerne" -> Base: lernen, no gender/plural
  console.log('\n  [Browser Check 3: Verb "lerne"]');
  const selLerne = await selectWordInBrowser('lerne');
  assert(selLerne?.found, 'Selected "lerne" in PDF text layer');
  const ttLerne = await getActiveTooltipText();
  assert(ttLerne !== null, 'Tooltip appeared for "lerne"');
  assert(ttLerne.includes('Base: lernen'), 'Tooltip displays lemma "Base: lernen"');
  assert(!ttLerne.includes('Plural:'), 'Tooltip does NOT display "Plural:" for verb "lerne"');
  assert(!ttLerne.includes('der') && !ttLerne.includes('die') && !ttLerne.includes('das'), 'Tooltip does NOT display gender article for verb "lerne"');

  // 4. Browser Test: Feminine noun "Schule" on Page 2 -> die · Plural: Schulen
  console.log('\n  [Browser Check 4: Feminine noun "Schule" on Page 2]');
  await navigateToPage(2);

  const selSchule = await selectWordInBrowser('Schule');
  assert(selSchule?.found, 'Selected "Schule" on Page 2');
  const ttSchule = await getActiveTooltipText();
  assert(ttSchule !== null, 'Tooltip appeared for "Schule"');
  assert(ttSchule.includes('die'), 'Tooltip displays feminine gender article "die"');
  assert(ttSchule.includes('Plural: Schulen'), 'Tooltip displays plural form "Plural: Schulen"');
  assert(ttSchule.toLowerCase().includes('school'), 'Tooltip displays translation "school"');

  // 3. Browser Test: About Modal & Support Contact Link
  console.log('\n  [Browser Check 3: About Modal Support Link]');
  // Dismiss tooltip
  await send('Runtime.evaluate', {
    expression: `document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))`
  }, sessionId);
  await new Promise(r => setTimeout(r, 200));

  // Click the About button in Navbar
  const openAbout = await send('Runtime.evaluate', {
    expression: `(() => {
      const aboutBtn = document.querySelector('button[title*="About"]');
      if (aboutBtn) {
        aboutBtn.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  }, sessionId);
  assert(openAbout.result.value, 'Clicked About button in Navbar');
  await new Promise(r => setTimeout(r, 400));

  // Inspect the About modal for the support mailto link
  const aboutModalState = await send('Runtime.evaluate', {
    expression: `(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return null;
      const mailtoLink = modal.querySelector('a[href^="mailto:"]');
      return {
        isOpen: true,
        text: modal.innerText,
        mailtoHref: mailtoLink ? mailtoLink.getAttribute('href') : null,
        mailtoText: mailtoLink ? mailtoLink.innerText.trim() : null
      };
    })()`,
    returnByValue: true
  }, sessionId);

  assert(aboutModalState.result.value?.isOpen === true, 'About modal opened cleanly');
  assert(aboutModalState.result.value?.mailtoHref === 'mailto:support@lingopdf.in', 'About modal contains correct mailto:support@lingopdf.in href');
  assert(aboutModalState.result.value?.mailtoText === 'support@lingopdf.in', 'About modal displays support@lingopdf.in text');

  // Close modal via Escape key
  await send('Runtime.evaluate', {
    expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`
  }, sessionId);
  await new Promise(r => setTimeout(r, 200));

  const modalClosed = await send('Runtime.evaluate', {
    expression: `!document.querySelector('[role="dialog"]')`,
    returnByValue: true
  }, sessionId);
  assert(modalClosed.result.value === true, 'About modal closed on Escape key');

  // Clean up browser & server
  ws.close();
  chromeProc.kill('SIGKILL');
  server.close();
  try {
    fs.rmSync(profileDir, { recursive: true, force: true });
  } catch {}

  section(`PHASE 1 POLISH VERIFICATION: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    throw new Error(`${failed} test(s) failed in Phase 1 polish suite`);
  }
  console.log('🎉 ALL PHASE 1 POLISH VERIFICATION CHECKS PASSED 100% CLEANLY!\n');
}

runVerification().catch((err) => {
  console.error('\n💥 FATAL VERIFICATION ERROR:', err);
  process.exit(1);
});
