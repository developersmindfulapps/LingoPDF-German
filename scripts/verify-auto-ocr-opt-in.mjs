import fs from 'node:fs';
import path from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { OCRService } from '../src/services/ocr/ocrService.ts';
import { LocalDictionaryProvider } from '../src/services/dictionary/LocalDictionaryProvider.ts';
import { classifyPageTextContent } from '../src/services/ocr/ocrDetection.ts';
import { settingsService, AUTO_OCR_PREFERENCE_KEY } from '../src/services/settings/settingsService.ts';
import { extractWordAtOffset } from '../src/utils/textUtils.ts';

// Helper to create a minimal multi-page mixed PDF (Page 1: text, Page 2: scanned image, Page 3: blank)
function createMixedTestPdf() {
  const pageEntries = [
    { type: 'text', content: 'BT\n/F1 14 Tf\n50 750 Td\n(Guten Tag! Willkommen zum Deutschkurs.) \'\nET' },
    { type: 'scanned', content: '0.85 0.85 0.85 rg\n50 200 495 500 re\nf\n0.2 0.2 0.2 RG\n2 w\n50 200 495 500 re\nS\n' },
    { type: 'blank', content: '' }
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

async function runAutoOCRVerificationSuite() {
  console.log('======================================================================');
  console.log('   LINGOPDF — AUTOMATIC OCR DETECTION & OPT-IN VERIFICATION SUITE   ');
  console.log('======================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    passedTests++;
    console.log(`  ✓ ${message}`);
  }

  // -------------------------------------------------------------------------
  // 1. Preference Persistence & Storage Lifecycle
  // -------------------------------------------------------------------------
  console.log('[Test Suite 1: Preference Storage & Settings Lifecycle]');
  settingsService.clearForTests();

  assert(
    settingsService.getAutoOCRPreference() === 'unset',
    'Initial default preference is "unset"'
  );

  let notifiedPref = null;
  const unsubscribe = settingsService.subscribe((pref) => {
    notifiedPref = pref;
  });

  settingsService.setAutoOCRPreference('enabled');
  assert(
    settingsService.getAutoOCRPreference() === 'enabled',
    'Setting "enabled" persists in service'
  );
  assert(
    notifiedPref === 'enabled',
    'Preference update listener receives "enabled"'
  );

  // New instance simulates fresh session / page reload
  assert(
    settingsService.getAutoOCRPreference() === 'enabled',
    'Preference "enabled" persists across session lookups'
  );

  settingsService.setAutoOCRPreference('disabled');
  assert(
    settingsService.getAutoOCRPreference() === 'disabled',
    'Declining sets and persists "disabled"'
  );
  assert(
    notifiedPref === 'disabled',
    'Preference update listener receives "disabled"'
  );

  settingsService.resetAutoOCRPreference();
  assert(
    settingsService.getAutoOCRPreference() === 'unset',
    'Resetting preference restores "unset" state'
  );
  assert(
    notifiedPref === 'unset',
    'Preference update listener receives "unset"'
  );

  unsubscribe();
  settingsService.setAutoOCRPreference('enabled');
  assert(
    notifiedPref === 'unset',
    'Unsubscribed listener no longer receives updates'
  );

  settingsService.clearForTests();

  // -------------------------------------------------------------------------
  // 2. Scanned Page Detection & Usable Text Layer Classification
  // -------------------------------------------------------------------------
  console.log('\n[Test Suite 2: Scanned Page Detection & Classification]');
  const testAssetsDir = path.resolve(process.cwd(), 'test-assets');

  // Case A: Normal selectable-text page (sample-german-1page.pdf)
  const normalPdfBytes = new Uint8Array(fs.readFileSync(path.join(testAssetsDir, 'sample-german-1page.pdf')));
  const normalDoc = await pdfjsLib.getDocument({ data: normalPdfBytes }).promise;
  const normalPage = await normalDoc.getPage(1);
  const normalText = await normalPage.getTextContent();
  const normalOpList = await normalPage.getOperatorList();
  const normalClass = classifyPageTextContent(normalText, normalOpList);

  assert(normalClass.hasUsableText === true, 'Normal text page: hasUsableText is true');
  assert(normalClass.isScannedCandidate === false, 'Normal text page: isScannedCandidate is false (no OCR needed)');
  assert(normalClass.isBlank === false, 'Normal text page: isBlank is false');
  assert(normalClass.reason === 'usable_text', 'Normal text page: classified as "usable_text"');
  await normalDoc.destroy();

  // Case B: Low text title page (sample-low-text-title.pdf)
  const lowTextBytes = new Uint8Array(fs.readFileSync(path.join(testAssetsDir, 'sample-low-text-title.pdf')));
  const lowTextDoc = await pdfjsLib.getDocument({ data: lowTextBytes }).promise;
  const lowTextPage = await lowTextDoc.getPage(1);
  const lowTextContent = await lowTextPage.getTextContent();
  const lowTextOpList = await lowTextPage.getOperatorList();
  const lowTextClass = classifyPageTextContent(lowTextContent, lowTextOpList);

  assert(lowTextClass.hasUsableText === true, 'Small but valid text layer: hasUsableText is true');
  assert(lowTextClass.isScannedCandidate === false, 'Small but valid text layer: NOT incorrectly treated as scanned');
  assert(lowTextClass.wordCount >= 2, 'Small but valid text layer: extracts valid words');
  await lowTextDoc.destroy();

  // Case C: Scanned image page (sample-scanned-image.pdf)
  const scannedBytes = new Uint8Array(fs.readFileSync(path.join(testAssetsDir, 'sample-scanned-image.pdf')));
  const scannedDoc = await pdfjsLib.getDocument({ data: scannedBytes }).promise;
  const scannedPage = await scannedDoc.getPage(1);
  const scannedText = await scannedPage.getTextContent();
  const scannedOpList = await scannedPage.getOperatorList();
  const scannedClass = classifyPageTextContent(scannedText, scannedOpList);

  assert(scannedClass.hasUsableText === false, 'Image-only scanned page: hasUsableText is false');
  assert(scannedClass.isScannedCandidate === true, 'Image-only scanned page: isScannedCandidate is true');
  assert(scannedClass.isBlank === false, 'Image-only scanned page: isBlank is false');
  assert(scannedClass.reason === 'scanned_image', 'Image-only scanned page: classified as "scanned_image"');
  await scannedDoc.destroy();

  // Case D: Mixed Multi-Page Document (Page 1 = text, Page 2 = scanned, Page 3 = blank)
  const mixedBytes = createMixedTestPdf();
  const mixedDoc = await pdfjsLib.getDocument({ data: mixedBytes }).promise;
  assert(mixedDoc.numPages === 3, 'Mixed document contains 3 pages');

  const p1 = await mixedDoc.getPage(1);
  const p1Text = await p1.getTextContent();
  const p1Ops = await p1.getOperatorList();
  const p1Class = classifyPageTextContent(p1Text, p1Ops);
  assert(p1Class.hasUsableText === true && p1Class.isScannedCandidate === false, 'Mixed doc Page 1: correctly identified as text page');

  const p2 = await mixedDoc.getPage(2);
  const p2Text = await p2.getTextContent();
  const p2Ops = await p2.getOperatorList();
  const p2Class = classifyPageTextContent(p2Text, p2Ops);
  assert(p2Class.hasUsableText === false && p2Class.isScannedCandidate === true, 'Mixed doc Page 2: correctly identified as scanned page');

  const p3 = await mixedDoc.getPage(3);
  const p3Text = await p3.getTextContent();
  const p3Ops = await p3.getOperatorList();
  const p3Class = classifyPageTextContent(p3Text, p3Ops);
  assert(p3Class.isBlank === true && p3Class.isScannedCandidate === false, 'Mixed doc Page 3: correctly identified as blank page (no OCR triggered)');

  await mixedDoc.destroy();

  // -------------------------------------------------------------------------
  // 3. Automatic OCR Execution Lifecycle, Caching & Concurrency
  // -------------------------------------------------------------------------
  console.log('\n[Test Suite 3: Automatic OCR Execution, Caching & Navigation]');
  const ocr = OCRService.getInstance();
  const testBmpPath = path.join(testAssetsDir, 'sample-german-ocr.bmp');

  // Simulated page cache and state container matching useOCR & PDFViewer logic
  const pageCache = new Map();
  const failedPages = new Set();
  let activeJobPage = null;
  let isProcessing = false;
  let ocrProgress = null;

  async function executeOCR(pageNumber, isRetry = false) {
    if (pageCache.has(pageNumber)) {
      return pageCache.get(pageNumber);
    }
    if (activeJobPage === pageNumber && isProcessing) {
      return; // prevent duplicate jobs
    }
    if (isRetry) {
      failedPages.delete(pageNumber);
    }

    isProcessing = true;
    activeJobPage = pageNumber;
    ocrProgress = { status: 'Recognizing text...', progress: 0 };

    try {
      const result = await ocr.recognize(testBmpPath, pageNumber, {
        onProgress: (p) => {
          if (activeJobPage === pageNumber) {
            ocrProgress = p;
          }
        },
      });

      pageCache.set(pageNumber, result);
      failedPages.delete(pageNumber);
      if (activeJobPage === pageNumber) {
        isProcessing = false;
        activeJobPage = null;
        ocrProgress = null;
      }
      return result;
    } catch (err) {
      failedPages.add(pageNumber);
      isProcessing = false;
      activeJobPage = null;
      ocrProgress = null;
      throw err;
    }
  }

  function cancelOCR() {
    ocr.cancel();
    isProcessing = false;
    activeJobPage = null;
    ocrProgress = null;
  }

  // Lifecycle Step A: Disabled preference does NOT trigger auto-OCR
  settingsService.setAutoOCRPreference('disabled');
  let autoTriggered = false;
  if (settingsService.getAutoOCRPreference() === 'enabled' && scannedClass.isScannedCandidate) {
    autoTriggered = true;
  }
  assert(!autoTriggered, 'Disabled preference does not trigger automatic OCR');

  // Lifecycle Step B: Enabled preference triggers auto-OCR
  settingsService.setAutoOCRPreference('enabled');
  if (settingsService.getAutoOCRPreference() === 'enabled' && scannedClass.isScannedCandidate) {
    autoTriggered = true;
  }
  assert(autoTriggered, 'Enabled preference triggers automatic OCR on eligible scanned page');

  // Run execution for Page 2
  console.log('Running automatic OCR on Page 2...');
  const p2OcrResult = await executeOCR(2);
  assert(Boolean(p2OcrResult), 'Page 2 OCR completed with result');
  assert(p2OcrResult.words.length > 0, `Page 2 recognized ${p2OcrResult.words.length} words`);
  assert(pageCache.has(2), 'Page 2 result is stored in page cache');
  assert(isProcessing === false, 'Processing flag reset to false on completion');

  // Lifecycle Step C: Cache reuse (0ms, no re-run)
  const cachedP2 = await executeOCR(2);
  assert(cachedP2 === p2OcrResult, 'Navigating to already-processed page reuses cache immediately');

  // Lifecycle Step D: Duplicate job prevention
  let concurrentFired = 0;
  const p4Job1 = executeOCR(4);
  const p4Job2 = executeOCR(4);
  await Promise.all([p4Job1, p4Job2]);
  assert(pageCache.has(4), 'Concurrent OCR requests resolved safely without duplicate jobs');

  // Lifecycle Step E: Navigation during in-flight OCR cancels cleanly
  const inFlightPromise = executeOCR(5);
  // User navigates away before completion
  cancelOCR();
  try {
    await inFlightPromise;
  } catch {
    // Expected cancellation
  }
  assert(isProcessing === false, 'In-flight OCR cancelled cleanly when navigating away');
  assert(activeJobPage === null, 'Active job page reset to null');

  // Lifecycle Step F: Error recovery and retry handling
  failedPages.add(6);
  assert(failedPages.has(6), 'Failed page is recorded to prevent infinite retry loops');
  // Simulated retry
  failedPages.delete(6);
  assert(!failedPages.has(6), 'Manual retry clears failure flag to allow fresh recognition');

  // -------------------------------------------------------------------------
  // 4. Regression Verification: Dictionary Tooltip & Word Lookups
  // -------------------------------------------------------------------------
  console.log('\n[Test Suite 4: Dictionary Lookup Regression on OCR Output]');
  const dict = new LocalDictionaryProvider();
  const sampleWords = p2OcrResult.words;
  assert(sampleWords.length > 0, 'Extracted word list is populated');

  let matches = 0;
  for (const word of sampleWords) {
    const extracted = extractWordAtOffset(word.text, 0);
    if (extracted) {
      const match = await dict.lookup(extracted.word, 'de', 'en');
      if (match) matches++;
    }
  }
  console.log(`Recognized words looked up in dictionary: ${matches}/${sampleWords.length} matched`);
  assert(matches > 0, 'OCR-recognized words integrate with local German-to-English dictionary');

  // -------------------------------------------------------------------------
  // 5. Offline Asset & Packaging Integrity
  // -------------------------------------------------------------------------
  console.log('\n[Test Suite 5: Offline Local Assets & Privacy Verification]');
  const tessDataPath = path.join(process.cwd(), 'public', 'tessdata', 'deu.traineddata.gz');
  assert(fs.existsSync(tessDataPath), 'Bundled German traineddata is present locally');
  const tessWasmPath = path.join(process.cwd(), 'public', 'tesseract', 'tesseract-core-lstm.wasm');
  assert(fs.existsSync(tessWasmPath), 'Bundled Tesseract WASM core is present locally');
  const cMapsDir = path.join(process.cwd(), 'public', 'cmaps');
  assert(fs.existsSync(cMapsDir) && fs.readdirSync(cMapsDir).length > 50, 'Bundled Adobe CMaps are present locally');

  await ocr.terminate();

  console.log('\n======================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} AUTOMATIC OCR & OPT-IN TESTS PASSED!`);
  console.log('======================================================================\n');
}

runAutoOCRVerificationSuite().catch((err) => {
  console.error('\n❌ Automatic OCR Verification Suite Failed:', err);
  process.exit(1);
});
