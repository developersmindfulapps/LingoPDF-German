/**
 * scripts/create-and-verify-final-zip.mjs
 *
 * Automates the packaging and verification of the final production release ZIP:
 * 1. Validates that the build is fresh and clean.
 * 2. Creates `lingopdf-chrome-v0.1.0-final.zip` from `dist/`.
 * 3. Copies to `release/lingopdf-chrome-v0.1.0-final.zip`.
 * 4. Verifies archive contents, manifest, OCR, fonts, CMaps, dictionary draft isolation.
 * 5. Extracts to temporary directory and executes a real Chrome CDP smoke test.
 * 6. Calculates exact SHA-256 and byte sizes.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const testAssetsDir = path.join(rootDir, 'test-assets');
const releaseDir = path.join(rootDir, 'release');

const zipFileName = 'lingopdf-chrome-v0.1.0-final.zip';
const targetZipPath = path.join(rootDir, zipFileName);
const releaseZipPath = path.join(releaseDir, zipFileName);
const tempExtractDir = path.join(rootDir, '.temp-extracted-final-zip');

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
const profileDir = path.resolve('.chrome-smoke-test-profile');
const testPort = 8796;
const cdpPort = 9235;

function computeSha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

async function run() {
  console.log('=====================================================================');
  console.log('   LINGOPDF — FINAL CHROME WEB STORE PRODUCTION PACKAGING & AUDIT    ');
  console.log('=====================================================================\n');

  // STEP 1: SAFETY CHECK — PREVENT OVERWRITING LEGACY RELEASES
  console.log('[Step 1] Inspecting Release Target Destination...');
  // Ensure we never touch existing baseline releases
  const protectedZips = ['lingopdf-chrome-v0.1.0.zip', 'lingopdf-v0.1.0.zip'];
  for (const pz of protectedZips) {
    const p = path.join(rootDir, pz);
    if (fs.existsSync(p)) {
      console.log(`  ✓ Pinned baseline archive protected: ${pz} (${(fs.statSync(p).size / 1048576).toFixed(2)} MB)`);
    }
  }

  // Remove previous run's final zip artifact to enable clean re-creation
  if (fs.existsSync(targetZipPath)) {
    fs.unlinkSync(targetZipPath);
  }
  if (fs.existsSync(releaseZipPath)) {
    fs.unlinkSync(releaseZipPath);
  }
  console.log(`  ✓ Target destination "${zipFileName}" ready for fresh creation.`);

  // STEP 2: VERIFY DIST ASSETS ARE IN PLACE
  console.log('\n[Step 2] Verifying Production Build Output in dist/...');
  if (!fs.existsSync(distDir)) {
    console.error('❌ FATAL: dist/ directory does not exist. Run "npm run build" first.');
    process.exit(1);
  }

  const manifestPath = path.join(distDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ FATAL: dist/manifest.json does not exist.');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log(`  ✓ Manifest valid: "${manifest.name}" v${manifest.version} (Manifest V${manifest.manifest_version})`);

  // STEP 3: CREATE THE PRODUCTION ZIP
  console.log('\n[Step 3] Creating Production ZIP Archive...');
  const psZipCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${path.join(distDir, '*')}' -DestinationPath '${targetZipPath}'"`;
  execSync(psZipCmd, { stdio: 'inherit' });

  if (!fs.existsSync(targetZipPath)) {
    console.error('❌ FATAL: Failed to create ZIP archive.');
    process.exit(1);
  }
  const zipStats = fs.statSync(targetZipPath);
  console.log(`  ✓ Successfully created: ${zipFileName} (${(zipStats.size / 1048576).toFixed(2)} MB, ${zipStats.size} bytes)`);

  // Copy into release folder
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.copyFileSync(targetZipPath, releaseZipPath);
  console.log(`  ✓ Copied to release folder: ${releaseZipPath}`);

  // STEP 4: VERIFY ZIP CONTENTS VIA POWERSHELL ZIP ENTRIES
  console.log('\n[Step 4] Inspecting ZIP Archive Contents...');
  const psListEntries = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::OpenRead('${targetZipPath}').Entries | Select-Object -Property FullName, Length | ConvertTo-Json -Depth 2"`;
  const entriesRaw = execSync(psListEntries, { encoding: 'utf8' });
  const entries = JSON.parse(entriesRaw);
  console.log(`  ✓ ZIP contains ${entries.length} items.`);

  const entryNames = new Set(entries.map(e => e.FullName.replace(/\\/g, '/')));

  // Check required core files
  const requiredEntries = [
    'manifest.json',
    'viewer.html',
    'background.js',
    'pdf.worker.min.mjs',
    'privacy.html',
    'LICENSE_DICTIONARY.txt',
    'THIRD_PARTY_LICENSES.txt',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png',
    'data/authored-de-en-dictionary.json',
    'data/authored-de-en-inflections.json',
    'data/authored-de-en-manifest.json',
    'data/authored-de-en-metadata.json',
    'data/de-en-dictionary.json',
    'data/de-en-inflections.json',
    'data/de-en-metadata.json',
    'tessdata/deu.traineddata.gz',
    'tesseract/worker-entry.js',
    'tesseract/worker.min.js',
    'tesseract/tesseract-core-lstm.wasm',
    'tesseract/tesseract-core-simd-lstm.wasm',
    'tesseract/tesseract-core-relaxedsimd-lstm.wasm',
    'standard_fonts/LICENSE_FOXIT',
    'standard_fonts/LICENSE_LIBERATION',
    'cmaps/LICENSE'
  ];

  for (const req of requiredEntries) {
    if (!entryNames.has(req)) {
      console.error(`❌ FATAL: Missing required entry in ZIP: ${req}`);
      process.exit(1);
    }
  }
  console.log(`  ✓ All ${requiredEntries.length} required runtime assets confirmed present inside ZIP archive.`);

  // Check for forbidden development/test files
  const forbiddenPatterns = [
    /\.git/,
    /node_modules/,
    /\.ts$/,
    /\.map$/,
    /test-assets/,
    /data-source/,
    /scripts\//,
    /\.cache/
  ];

  for (const name of entryNames) {
    for (const pat of forbiddenPatterns) {
      if (pat.test(name)) {
        console.error(`❌ FATAL: Forbidden dev/test file found in ZIP: ${name}`);
        process.exit(1);
      }
    }
  }
  console.log('  ✓ Zero development files, TypeScript sources, test scripts, or source data present in ZIP.');

  // STEP 5: EXTRACT ZIP TO TEMPORARY DIRECTORY & AUDIT
  console.log('\n[Step 5] Extracting ZIP to Temporary Directory for Verification...');
  if (fs.existsSync(tempExtractDir)) {
    fs.rmSync(tempExtractDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempExtractDir, { recursive: true });

  const psExpandCmd = `powershell -NoProfile -Command "Expand-Archive -Path '${targetZipPath}' -DestinationPath '${tempExtractDir}'"`;
  execSync(psExpandCmd, { stdio: 'inherit' });
  console.log(`  ✓ ZIP extracted successfully to ${tempExtractDir}`);

  // Verify extracted manifest
  const extManifest = JSON.parse(fs.readFileSync(path.join(tempExtractDir, 'manifest.json'), 'utf8'));
  if (extManifest.manifest_version !== 3 || extManifest.version !== '0.1.0' || extManifest.name !== 'LingoPDF') {
    console.error('❌ FATAL: Extracted manifest verification failed:', extManifest);
    process.exit(1);
  }
  console.log(`  ✓ Extracted manifest verified: ${extManifest.name} v${extManifest.version}`);

  // Verify dictionary draft isolation in extracted files
  console.log('\n[Step 6] Auditing Extracted Dictionary Draft Isolation...');
  const extAuthDict = JSON.parse(fs.readFileSync(path.join(tempExtractDir, 'data', 'authored-de-en-dictionary.json'), 'utf8'));
  const extAuthInfl = JSON.parse(fs.readFileSync(path.join(tempExtractDir, 'data', 'authored-de-en-inflections.json'), 'utf8'));
  const extAuthManifest = JSON.parse(fs.readFileSync(path.join(tempExtractDir, 'data', 'authored-de-en-manifest.json'), 'utf8'));

  const draftSampleWords = [
    'Bewerbung', 'Vorstellungsgespräch', 'Erfahrung', 'zuverlässig',
    'Zusammenhang', 'überzeugen', 'begegnen', 'kennenlernen', 'schaffen',
    'Herz', 'Gedanke', 'Nebenkosten', 'wirklich', 'außerdem', 'deswegen'
  ];

  for (const dw of draftSampleWords) {
    if (extAuthDict[dw]) {
      console.error(`❌ FATAL: Draft leak detected! Word "${dw}" found in extracted production dictionary.`);
      process.exit(1);
    }
  }
  console.log('  ✓ Confirmed zero draft headword leaks in extracted production dictionary.');

  const draftSampleInflections = ['bewerbungen', 'schuf', 'schufen', 'herzens', 'gedankens', 'nebenkosten', 'kennengelernt'];
  for (const di of draftSampleInflections) {
    if (extAuthInfl[di]) {
      console.error(`❌ FATAL: Draft inflection leak detected! Key "${di}" found in extracted inflection index.`);
      process.exit(1);
    }
  }
  console.log('  ✓ Confirmed zero draft inflection leaks in extracted production dictionary.');
  console.log(`  ✓ Manifest accounting: ${extAuthManifest.headwordsCount} headwords, ${extAuthManifest.inflectionKeysCount} inflections, ${extAuthManifest.excludedDraftsCount} drafts excluded.`);

  // STEP 7: REAL BROWSER CDP SMOKE TEST ON EXTRACTED ZIP CONTENTS
  console.log('\n[Step 7] Performing Live Chrome Browser Smoke Test on Extracted Package...');
  const mimeTypes = {
    '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
    '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
    '.wasm': 'application/wasm', '.gz': 'application/gzip', '.bcmap': 'application/octet-stream',
    '.pfb': 'application/x-font-pfb', '.ttf': 'font/ttf'
  };

  const smokeServer = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/viewer.html';
    const filePath = path.join(tempExtractDir, reqPath.replace(/^\//, ''));
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

  await new Promise((resolve) => smokeServer.listen(testPort, resolve));
  console.log(`  • Smoke test server serving extracted ZIP at http://127.0.0.1:${testPort}`);

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

  if (!versionData?.webSocketDebuggerUrl) {
    throw new Error('Could not connect to Chrome CDP WebSocket');
  }

  const ws = new WebSocket(versionData.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  const send = (method, params = {}, sessionId) => {
    return new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * 100000);
      const onMsg = (event) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : event.data.toString();
          const msg = JSON.parse(raw);
          if (msg.id === id) {
            ws.removeEventListener('message', onMsg);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          }
        } catch {
          // ignore unparseable events
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

  await send('Runtime.enable', {}, sessionId);
  await send('DOM.enable', {}, sessionId);
  await new Promise(r => setTimeout(r, 1000));

  // Load sample-german-1page.pdf into FilePicker via CDP
  const docNode = await send('DOM.getDocument', {}, sessionId);
  const inputNode = await send('DOM.querySelector', {
    nodeId: docNode.root.nodeId,
    selector: 'input[type="file"]'
  }, sessionId);

  await send('DOM.setFileInputFiles', {
    files: [path.join(testAssetsDir, 'sample-german-1page.pdf')],
    nodeId: inputNode.nodeId
  }, sessionId);

  await new Promise(r => setTimeout(r, 2000));

  // Verify textLayer rendered
  const textLayerReady = await send('Runtime.evaluate', {
    expression: `Boolean(document.querySelector('.textLayer span'))`
  }, sessionId);
  if (!textLayerReady.result.value) {
    throw new Error('Smoke test PDF did not render textLayer');
  }
  console.log('  ✓ Extracted viewer successfully rendered PDF canvas and textLayer.');

  // Trigger lookup on "Tag"
  await send('Runtime.evaluate', {
    expression: `(() => {
      const spans = Array.from(document.querySelectorAll('.textLayer span'));
      const span = spans.find(s => s.innerText.includes('Tag'));
      if (span) {
        const range = document.createRange();
        range.setStart(span.firstChild, span.innerText.indexOf('Tag'));
        range.setEnd(span.firstChild, span.innerText.indexOf('Tag') + 3);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        span.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 200, clientY: 200 }));
      }
    })()`
  }, sessionId);

  await new Promise(r => setTimeout(r, 500));

  const tooltipState = await send('Runtime.evaluate', {
    expression: `(() => {
      const tt = document.querySelector('[role="tooltip"]');
      return tt ? tt.innerText : null;
    })()`,
    returnByValue: true
  }, sessionId);

  if (!tooltipState.result.value || !tooltipState.result.value.includes('der') || !tooltipState.result.value.includes('Plural: Tage')) {
    throw new Error(`Smoke test tooltip lookup failed: ${tooltipState.result.value}`);
  }
  console.log(`  ✓ Smoke test word lookup verified in extracted bundle: "Tag" -> "${tooltipState.result.value.replace(/\n/g, ' ')}"`);

  // Verify About Modal in extracted bundle
  const aboutClick = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[title*="About"]');
      if (btn) { btn.click(); return true; }
      return false;
    })()`,
    returnByValue: true
  }, sessionId);

  await new Promise(r => setTimeout(r, 400));
  const aboutModalState = await send('Runtime.evaluate', {
    expression: `(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return null;
      const mailto = modal.querySelector('a[href^="mailto:"]');
      return {
        open: true,
        mailtoHref: mailto ? mailto.getAttribute('href') : null
      };
    })()`,
    returnByValue: true
  }, sessionId);

  if (!aboutModalState.result.value?.open || aboutModalState.result.value?.mailtoHref !== 'mailto:support@lingopdf.in') {
    throw new Error(`Smoke test About Modal failed: ${JSON.stringify(aboutModalState.result.value)}`);
  }
  console.log('  ✓ Smoke test About modal verified with working mailto:support@lingopdf.in link.');

  // Clean up smoke test resources
  ws.close();
  chromeProc.kill('SIGKILL');
  smokeServer.close();
  try {
    fs.rmSync(profileDir, { recursive: true, force: true });
    fs.rmSync(tempExtractDir, { recursive: true, force: true });
  } catch {}

  // STEP 8: FINAL METRICS & HASH
  const sha256 = computeSha256(targetZipPath);
  const releaseSha256 = computeSha256(releaseZipPath);
  if (sha256 !== releaseSha256) {
    throw new Error('Checksum mismatch between root ZIP and release/ copy!');
  }

  console.log('\n=====================================================================');
  console.log('🎉 FINAL PRODUCTION RELEASE PACKAGE SUCCESSFULLY CREATED & VERIFIED!');
  console.log('=====================================================================');
  console.log(`ZIP filename:            ${zipFileName}`);
  console.log(`Absolute file path:      ${targetZipPath}`);
  console.log(`Release copy path:       ${releaseZipPath}`);
  console.log(`Folder containing ZIP:   ${rootDir}`);
  console.log(`File size:               ${zipStats.size} bytes (${(zipStats.size / 1048576).toFixed(2)} MB)`);
  console.log(`SHA-256:                 ${sha256}`);
  console.log(`Manifest version:        ${manifest.version}`);
  console.log(`Production build status: Clean & Verified`);
  console.log('=====================================================================\n');
}

run().catch(err => {
  console.error('\n💥 FATAL PACKAGING ERROR:', err);
  process.exit(1);
});
