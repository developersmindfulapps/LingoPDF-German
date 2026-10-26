import fs from 'node:fs';
import path from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { OCRService } from '../src/services/ocr/index.ts';
import { LocalDictionaryProvider } from '../src/services/dictionary/LocalDictionaryProvider.ts';

// Helper to create BMP buffer with optional 180-degree rotation
function createBmpBuffer(width, height, rgbData, isRotated180 = false) {
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
  buf.writeInt32LE(-height, 22); // top-down
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(pixelArraySize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  let dstOffset = 54;
  if (!isRotated180) {
    let srcOffset = 0;
    for (let y = 0; y < height; y++) {
      const rowStart = dstOffset;
      for (let x = 0; x < width; x++) {
        const r = rgbData[srcOffset++];
        const g = rgbData[srcOffset++];
        const b = rgbData[srcOffset++];
        buf[dstOffset++] = b;
        buf[dstOffset++] = g;
        buf[dstOffset++] = r;
      }
      while ((dstOffset - rowStart) % 4 !== 0) {
        buf[dstOffset++] = 0;
      }
    }
  } else {
    // 180 degree rotation: read from end of buffer to start
    let srcOffset = rgbData.length - 3;
    for (let y = 0; y < height; y++) {
      const rowStart = dstOffset;
      for (let x = 0; x < width; x++) {
        const r = rgbData[srcOffset];
        const g = rgbData[srcOffset + 1];
        const b = rgbData[srcOffset + 2];
        srcOffset -= 3;
        buf[dstOffset++] = b;
        buf[dstOffset++] = g;
        buf[dstOffset++] = r;
      }
      while ((dstOffset - rowStart) % 4 !== 0) {
        buf[dstOffset++] = 0;
      }
    }
  }

  return buf;
}

export async function evaluateKursbuchPilot(options = {}) {
  const pagesToScan = options.pages || [10, 11, 12, 13, 14, 15, 16];
  const pdfPath = options.pdfPath || path.resolve(process.cwd(), 'kursbuch.pdf');
  const pilotDir = options.pilotDir || path.resolve(process.cwd(), 'dist-pilot');

  console.log('=====================================================================');
  console.log('   PDF LANGUAGE COMPANION — PHASE 3 PILOT EVALUATION PIPELINE       ');
  console.log('=====================================================================\n');

  // Step 1: Verify Kursbuch existence
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Kursbuch PDF not found at ${pdfPath}`);
  }
  const pdfBytes = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  console.log(`[Input] Kursbuch PDF Loaded: ${pdfPath}`);
  console.log(`  • Total PDF Pages: ${doc.numPages}`);
  console.log(`  • Evaluated Sample Pages: ${pagesToScan.join(', ')} (Netzwerk A1, Kapitel 1 Unit)\n`);

  // Step 2: Load Pilot Assets
  const pilotDictPath = path.join(pilotDir, 'de-en-dictionary.json');
  const pilotInflPath = path.join(pilotDir, 'de-en-inflections.json');
  if (!fs.existsSync(pilotDictPath) || !fs.existsSync(pilotInflPath)) {
    throw new Error(`Pilot dictionary files missing in ${pilotDir}. Run "npm run pilot:build" first.`);
  }
  const pilotEntries = JSON.parse(fs.readFileSync(pilotDictPath, 'utf-8'));
  const pilotInflections = JSON.parse(fs.readFileSync(pilotInflPath, 'utf-8'));
  const pilotProvider = new LocalDictionaryProvider(pilotEntries, pilotInflections);
  console.log(`[Pilot Dataset] Loaded from ${pilotDir}:`);
  console.log(`  • Pilot Headwords: ${Object.keys(pilotEntries).length}`);
  console.log(`  • Pilot Inflection Keys: ${Object.keys(pilotInflections).length}\n`);

  // Step 3: Run Local OCR across evaluated sample
  console.log(`[OCR Processing] Extracting word tokens via local Tesseract (deu)...`);
  const ocr = OCRService.getInstance();
  await ocr.initialize();

  const allRawTokens = [];
  const pageStats = [];

  for (const p of pagesToScan) {
    const page = await doc.getPage(p);
    const ops = await page.getOperatorList();
    let imgObj = null;
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
        const imgName = ops.argsArray[i][0];
        await new Promise(r => page.objs.get(imgName, img => { imgObj = img; r(); }));
        if (imgObj) break;
      }
    }

    if (!imgObj) {
      console.warn(`  ⚠️ Page ${p}: No raster image found`);
      continue;
    }

    // Physical scanner Feeder Invariant: odd pages scanned rotated 180°
    const isOdd = p % 2 !== 0;
    const bmp = createBmpBuffer(imgObj.width, imgObj.height, imgObj.data, isOdd);
    const ocrResult = await ocr.recognize(bmp, p);

    console.log(`  • Page ${p} ${isOdd ? '(180° rotated scan)' : '(standard scan)'}: ${ocrResult.words.length} words detected (avg confidence: ${ocrResult.confidence}%)`);
    pageStats.push({ page: p, wordCount: ocrResult.words.length, confidence: ocrResult.confidence });

    for (const w of ocrResult.words) {
      allRawTokens.push({
        text: w.text,
        confidence: w.confidence,
        page: p
      });
    }
  }

  await ocr.terminate();
  console.log(`  ✓ Total Raw OCR Tokens Collected: ${allRawTokens.length}\n`);

  // Step 4: Classification & Coverage Measurement
  console.log('[Token Analysis & Multi-Level Coverage Evaluation]:');

  let totalRaw = allRawTokens.length;
  let excludedCount = 0;
  const excludedTokens = [];
  const evaluatedTokens = [];

  for (const item of allRawTokens) {
    const raw = item.text.trim();

    // Clean leading/trailing punctuation
    const cleaned = raw.replace(/^[.,;:!?()\[\]"„“”»«\-_/\\#@*+]+/g, '')
                       .replace(/[.,;:!?()\[\]"„“”»«\-_/\\#@*+]+$/g, '');

    // Exclusion criteria:
    // 1. Empty or single punctuation
    // 2. Pure digits (numbers, page numbers, exercise numbers like 1, 20, 3b)
    // 3. Isolated non-alphabetic symbols or low-confidence noise (< 40%)
    if (
      cleaned.length === 0 ||
      /^\d+$/.test(cleaned) ||
      /^\d+[a-zA-Z]$/.test(cleaned) || // e.g. "4a", "1b"
      !/[a-zA-ZäöüÄÖÜß]/.test(cleaned) ||
      item.confidence < 40
    ) {
      excludedCount++;
      excludedTokens.push({ raw, reason: cleaned.length === 0 ? 'empty/punct' : (/^\d+/.test(cleaned) ? 'number' : 'low_conf/symbol'), conf: item.confidence });
      continue;
    }

    evaluatedTokens.push({
      original: raw,
      cleaned,
      confidence: item.confidence,
      page: item.page
    });
  }

  const denominator = evaluatedTokens.length; // Denominator for coverage percentage

  let exactHeadwordMatches = 0;
  let inflectionMatches = 0;
  let compoundMatches = 0;
  let unresolvedMatches = 0;

  const exactTokenList = [];
  const inflectionTokenList = [];
  const compoundTokenList = [];
  const unresolvedTokenList = [];

  for (const tokenItem of evaluatedTokens) {
    const word = tokenItem.cleaned;
    const lookup = await pilotProvider.lookup(word, 'de', 'en');

    if (lookup) {
      if (lookup.isDerived) {
        compoundMatches++;
        compoundTokenList.push({ token: word, lemma: lookup.lemma || word, translations: lookup.translations });
      } else if (lookup.lemma && lookup.lemma !== word && lookup.lemma.toLowerCase() !== word.toLowerCase()) {
        inflectionMatches++;
        inflectionTokenList.push({ token: word, lemma: lookup.lemma, translations: lookup.translations });
      } else {
        exactHeadwordMatches++;
        exactTokenList.push({ token: word, lemma: lookup.lemma || word, translations: lookup.translations });
      }
    } else {
      unresolvedMatches++;
      unresolvedTokenList.push(tokenItem);
    }
  }

  const totalResolved = exactHeadwordMatches + inflectionMatches + compoundMatches;
  const exactPct = ((exactHeadwordMatches / denominator) * 100).toFixed(1);
  const inflPct = ((inflectionMatches / denominator) * 100).toFixed(1);
  const compPct = ((compoundMatches / denominator) * 100).toFixed(1);
  const totalResolvedPct = ((totalResolved / denominator) * 100).toFixed(1);
  const unresolvedPct = ((unresolvedMatches / denominator) * 100).toFixed(1);

  console.log(`\n=================== EVALUATION RESULTS ===================`);
  console.log(`Evaluated Scope: Pages ${pagesToScan.join(', ')} (Complete Kapitel 1 Unit)`);
  console.log(`Total Raw OCR Tokens:             ${totalRaw}`);
  console.log(`Excluded Non-Word Tokens:         ${excludedCount} (numbers, exercise labels, symbols, OCR noise)`);
  console.log(`Evaluated Learner Word Tokens:    ${denominator} (100.0% DENOMINATOR)`);
  console.log(`----------------------------------------------------------`);
  console.log(`1. Exact Headword Matches:        ${exactHeadwordMatches.toString().padStart(4)} (${exactPct}%)`);
  console.log(`2. Inflection-Resolved Matches:   ${inflectionMatches.toString().padStart(4)} (${inflPct}%)`);
  console.log(`3. Compound Matches:              ${compoundMatches.toString().padStart(4)} (${compPct}%)`);
  console.log(`----------------------------------------------------------`);
  console.log(`TOTAL RESOLVED (Pilot Coverage):  ${totalResolved.toString().padStart(4)} (${totalResolvedPct}%)`);
  console.log(`UNRESOLVED TOKENS:                ${unresolvedMatches.toString().padStart(4)} (${unresolvedPct}%)`);
  console.log(`==========================================================\n`);

  // Step 5: Build Frequency Map and Gap Report for Unresolved Tokens
  const unresolvedFreq = new Map();
  for (const u of unresolvedTokenList) {
    const norm = u.cleaned;
    const lower = norm.toLowerCase();
    if (!unresolvedFreq.has(lower)) {
      unresolvedFreq.set(lower, {
        token: norm,
        count: 0,
        pages: new Set()
      });
    }
    const item = unresolvedFreq.get(lower);
    item.count++;
    item.pages.add(u.page);
  }

  // Sort by frequency descending
  const sortedGaps = Array.from(unresolvedFreq.values()).sort((a, b) => b.count - a.count);

  console.log(`[Top Unresolved Vocabulary Tokens in Kapitel 1]:`);
  const categorizedGaps = [];

  for (const g of sortedGaps) {
    const tok = g.token;
    const lower = tok.toLowerCase();

    // Heuristic grammatical inference for candidate lemmas
    let candidateLemma = tok;
    let pos = 'unknown';
    let reason = 'missing_headword';
    let priority = 'Medium';
    let status = 'candidate_for_phase4';

    // Recognizable high-frequency A1 beginner words
    if (['sie', 'du', 'ich', 'er', 'wir', 'ihr', 'es'].includes(lower)) {
      pos = 'pron';
      candidateLemma = lower;
      reason = 'ambiguous_case_or_ocr';
      priority = 'High';
    } else if (['und', 'oder', 'aber'].includes(lower)) {
      pos = 'conj';
      candidateLemma = lower;
      reason = 'missing_headword';
      priority = 'High';
    } else if (['wie', 'wo', 'woher', 'was', 'wer'].includes(lower)) {
      pos = 'pron/adv';
      candidateLemma = lower;
      reason = 'missing_headword';
      priority = 'High';
    } else if (['nicht', 'auch', 'sehr', 'noch', 'schon'].includes(lower)) {
      pos = 'adv';
      candidateLemma = lower;
      reason = 'missing_headword';
      priority = 'High';
    } else if (['aus', 'in', 'an', 'bei', 'nach'].includes(lower)) {
      pos = 'prep';
      candidateLemma = lower;
      reason = 'missing_headword';
      priority = 'High';
    } else if (['hallo', 'tschüs', 'tschüss', 'bitte', 'danke'].includes(lower)) {
      pos = 'interj';
      candidateLemma = lower === 'tschüs' || lower === 'tschüss' ? 'Tschüs' : tok;
      reason = 'missing_headword';
      priority = 'High';
    } else if (['nicole', 'paco', 'nina', 'anna', 'thomas', 'deutschland', 'österreich', 'schweiz', 'wien', 'berlin'].includes(lower)) {
      pos = 'propn';
      candidateLemma = tok;
      reason = 'proper_noun';
      priority = 'Low';
    } else if (/en$/.test(tok) && /^[a-zäöü]/.test(tok)) {
      pos = 'verb';
      candidateLemma = tok;
      reason = 'missing_headword';
      priority = g.count >= 2 ? 'High' : 'Medium';
    } else if (/^[A-ZÄÖÜ]/.test(tok)) {
      pos = 'noun';
      candidateLemma = tok;
      reason = 'missing_headword';
      priority = g.count >= 2 ? 'High' : 'Medium';
    }

    categorizedGaps.push({
      token: tok,
      count: g.count,
      pages: Array.from(g.pages).sort((a,b)=>a-b),
      candidateLemma,
      pos,
      reason,
      priority,
      status
    });
  }

  // Print top 30 gaps
  console.log(`Rank | Token             | Freq | POS    | Candidate Lemma     | Reason            | Priority`);
  console.log(`-----|-------------------|------|--------|---------------------|-------------------|---------`);
  categorizedGaps.slice(0, 30).forEach((g, idx) => {
    console.log(
      `${(idx + 1).toString().padStart(4)} | ` +
      `${g.token.padEnd(17)} | ` +
      `${g.count.toString().padStart(4)} | ` +
      `${g.pos.padEnd(6)} | ` +
      `${g.candidateLemma.padEnd(19)} | ` +
      `${g.reason.padEnd(17)} | ` +
      `${g.priority}`
    );
  });
  console.log();

  return {
    evaluatedPages: pagesToScan,
    pageStats,
    totalRaw,
    excludedCount,
    denominator,
    exactHeadwordMatches,
    inflectionMatches,
    compoundMatches,
    totalResolved,
    unresolvedMatches,
    exactPct,
    inflPct,
    compPct,
    totalResolvedPct,
    unresolvedPct,
    topGaps: categorizedGaps
  };
}

if (process.argv[1] && process.argv[1].endsWith('evaluate-kursbuch-pilot.mjs')) {
  evaluateKursbuchPilot()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal evaluation error:', err);
      process.exit(1);
    });
}
