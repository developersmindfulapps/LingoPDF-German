import fs from 'node:fs';
import path from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { OCRService } from '../src/services/ocr/index.ts';
import {
  LocalDictionaryProvider,
  CompositeDictionaryProvider,
  loadDictionaryAssets,
  loadAuthoredDictionaryAssets
} from '../src/services/dictionary/index.ts';

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

export async function evaluate3WayKursbuch() {
  const pagesToScan = [10, 11, 12, 13, 14, 15, 16];
  const pdfPath = path.resolve(process.cwd(), 'kursbuch.pdf');

  console.log('=====================================================================');
  console.log('   PDF LANGUAGE COMPANION — 3-WAY KURSBUCH EVALUATION (PHASE 7)      ');
  console.log('   Side-by-Side: Authored vs. Legacy vs. Composite Dual Provider     ');
  console.log('=====================================================================\n');

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Kursbuch PDF not found at ${pdfPath}`);
  }
  const pdfBytes = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  console.log(`[Input] Kursbuch PDF Loaded: ${pdfPath}`);
  console.log(`  • Pages Evaluated: ${pagesToScan.join(', ')} (Netzwerk A1, Kapitel 1 Unit)\n`);

  // Step 1: Initialize Providers
  console.log('[Providers Setup]:');
  const legacyData = await loadDictionaryAssets();
  const authoredData = await loadAuthoredDictionaryAssets();

  const legacyProvider = new LocalDictionaryProvider(
    legacyData.entries,
    legacyData.inflections,
    loadDictionaryAssets,
    'legacy-de-en',
    'Legacy German-English Dictionary'
  );

  const authoredProvider = new LocalDictionaryProvider(
    authoredData.entries,
    authoredData.inflections,
    loadAuthoredDictionaryAssets,
    'authored-de-en',
    'Authored German-English Dictionary'
  );

  const compositeProvider = new CompositeDictionaryProvider(authoredProvider, legacyProvider);

  await legacyProvider.ensureInitialized();
  await authoredProvider.ensureInitialized();
  await compositeProvider.ensureInitialized();

  console.log(`  • Authored Provider Headwords: ${Object.keys(authoredData.entries).length}`);
  console.log(`  • Authored Inflection Keys:    ${Object.keys(authoredData.inflections).length}`);
  console.log(`  • Legacy Provider Headwords:   ${Object.keys(legacyData.entries).length}`);
  console.log(`  • Legacy Inflection Keys:      ${Object.keys(legacyData.inflections).length}\n`);

  // Step 2: Run OCR Extraction
  console.log('[OCR Processing] Extracting word tokens via local Tesseract (deu)...');
  const ocr = OCRService.getInstance();
  await ocr.initialize();

  const allRawTokens = [];
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

    const isOdd = p % 2 !== 0;
    const bmp = createBmpBuffer(imgObj.width, imgObj.height, imgObj.data, isOdd);
    const ocrResult = await ocr.recognize(bmp, p);
    console.log(`  • Page ${p} ${isOdd ? '(180° rotated)' : '(standard)'}: ${ocrResult.words.length} words`);

    for (const w of ocrResult.words) {
      allRawTokens.push({
        text: w.text,
        confidence: w.confidence,
        page: p
      });
    }
  }

  await ocr.terminate();
  console.log(`  ✓ Total Raw OCR Tokens: ${allRawTokens.length}\n`);

  // Step 3: Filter Tokens to 696 Denominator
  let excludedCount = 0;
  const evaluatedTokens = [];

  for (const item of allRawTokens) {
    const raw = item.text.trim();
    const cleaned = raw.replace(/^[.,;:!?()\[\]"„“”»«\-_/\\#@*+]+/g, '')
                       .replace(/[.,;:!?()\[\]"„“”»«\-_/\\#@*+]+$/g, '');

    if (
      cleaned.length === 0 ||
      /^\d+$/.test(cleaned) ||
      /^\d+[a-zA-Z]$/.test(cleaned) ||
      !/[a-zA-ZäöüÄÖÜß]/.test(cleaned) ||
      item.confidence < 40
    ) {
      excludedCount++;
      continue;
    }

    evaluatedTokens.push({
      original: raw,
      cleaned,
      confidence: item.confidence,
      page: item.page
    });
  }

  const denominator = evaluatedTokens.length;
  console.log(`[Token Corpus Validation]:`);
  console.log(`  • Raw OCR Tokens:        ${allRawTokens.length}`);
  console.log(`  • Excluded Tokens:       ${excludedCount}`);
  console.log(`  • Evaluated Word Tokens: ${denominator} (Target Denominator: 696)\n`);

  if (denominator !== 696) {
    console.warn(`  ⚠️ Warning: Evaluated tokens count is ${denominator}, expected 696`);
  }

  // Step 4: Run Evaluation Function for a Given Provider
  async function evaluateProvider(provider, providerLabel) {
    let exactHeadwords = 0;
    let inflectionMatches = 0;
    let compoundMatches = 0;
    let unresolved = 0;

    const resolvedDetails = [];
    const unresolvedDetails = [];

    for (const item of evaluatedTokens) {
      const word = item.cleaned;
      const lookup = await provider.lookup(word, 'de', 'en');

      if (lookup) {
        const isCompound = lookup.isDerived;
        const isInflection = !isCompound && lookup.lemma && lookup.lemma !== word && lookup.lemma.toLowerCase() !== word.toLowerCase();
        const isExact = !isCompound && !isInflection;

        if (isCompound) compoundMatches++;
        else if (isInflection) inflectionMatches++;
        else exactHeadwords++;

        resolvedDetails.push({
          token: word,
          lookup,
          type: isCompound ? 'compound' : (isInflection ? 'inflection' : 'exact')
        });
      } else {
        unresolved++;
        unresolvedDetails.push(item);
      }
    }

    const totalResolved = exactHeadwords + inflectionMatches + compoundMatches;
    return {
      label: providerLabel,
      exactHeadwords,
      exactPct: ((exactHeadwords / denominator) * 100).toFixed(1),
      inflectionMatches,
      inflPct: ((inflectionMatches / denominator) * 100).toFixed(1),
      compoundMatches,
      compPct: ((compoundMatches / denominator) * 100).toFixed(1),
      totalResolved,
      resolvedPct: ((totalResolved / denominator) * 100).toFixed(1),
      unresolved,
      unresolvedPct: ((unresolved / denominator) * 100).toFixed(1),
      resolvedDetails,
      unresolvedDetails
    };
  }

  console.log('[Running 3-Way Comparative Evaluation]...');
  const authoredResults = await evaluateProvider(authoredProvider, '1. Authored-Only');
  const legacyResults = await evaluateProvider(legacyProvider, '2. Legacy-Only');
  const compositeResults = await evaluateProvider(compositeProvider, '3. Composite (Authored + Legacy Fallback)');

  // Step 5: Side-by-Side Summary Table
  console.log('\n========================================================================================');
  console.log('                          3-WAY COMPARATIVE COVERAGE MATRIX                             ');
  console.log('========================================================================================');
  console.log('Metric                     | Authored-Only        | Legacy-Only          | Composite (Dual)     ');
  console.log('---------------------------|----------------------|----------------------|----------------------');
  console.log(
    `Exact Headword Matches     | ${authoredResults.exactHeadwords.toString().padStart(4)} (${authoredResults.exactPct.padStart(5)}%) | ` +
    `${legacyResults.exactHeadwords.toString().padStart(4)} (${legacyResults.exactPct.padStart(5)}%) | ` +
    `${compositeResults.exactHeadwords.toString().padStart(4)} (${compositeResults.exactPct.padStart(5)}%)`
  );
  console.log(
    `Inflection Matches         | ${authoredResults.inflectionMatches.toString().padStart(4)} (${authoredResults.inflPct.padStart(5)}%) | ` +
    `${legacyResults.inflectionMatches.toString().padStart(4)} (${legacyResults.inflPct.padStart(5)}%) | ` +
    `${compositeResults.inflectionMatches.toString().padStart(4)} (${compositeResults.inflPct.padStart(5)}%)`
  );
  console.log(
    `Compound Matches           | ${authoredResults.compoundMatches.toString().padStart(4)} (${authoredResults.compPct.padStart(5)}%) | ` +
    `${legacyResults.compoundMatches.toString().padStart(4)} (${legacyResults.compPct.padStart(5)}%) | ` +
    `${compositeResults.compoundMatches.toString().padStart(4)} (${compositeResults.compPct.padStart(5)}%)`
  );
  console.log('---------------------------|----------------------|----------------------|----------------------');
  console.log(
    `TOTAL RESOLVED             | ${authoredResults.totalResolved.toString().padStart(4)} (${authoredResults.resolvedPct.padStart(5)}%) | ` +
    `${legacyResults.totalResolved.toString().padStart(4)} (${legacyResults.resolvedPct.padStart(5)}%) | ` +
    `${compositeResults.totalResolved.toString().padStart(4)} (${compositeResults.resolvedPct.padStart(5)}%)`
  );
  console.log(
    `UNRESOLVED TOKENS          | ${authoredResults.unresolved.toString().padStart(4)} (${authoredResults.unresolvedPct.padStart(5)}%) | ` +
    `${legacyResults.unresolved.toString().padStart(4)} (${legacyResults.unresolvedPct.padStart(5)}%) | ` +
    `${compositeResults.unresolved.toString().padStart(4)} (${compositeResults.unresolvedPct.padStart(5)}%)`
  );
  console.log('========================================================================================\n');

  // Step 6: Provider Contribution Analysis in Composite Configuration
  let authoredContributionCount = 0;
  let legacyContributionCount = 0;
  const legacyFallbackTokens = new Map();

  for (const item of compositeResults.resolvedDetails) {
    if (item.lookup.providerId === 'authored') {
      authoredContributionCount++;
    } else if (item.lookup.providerId === 'legacy') {
      legacyContributionCount++;
      const tok = item.token;
      legacyFallbackTokens.set(tok, (legacyFallbackTokens.get(tok) || 0) + 1);
    }
  }

  const authoredContributionPct = ((authoredContributionCount / compositeResults.totalResolved) * 100).toFixed(1);
  const legacyContributionPct = ((legacyContributionCount / compositeResults.totalResolved) * 100).toFixed(1);

  console.log('[Composite Provider Contribution Analysis]:');
  console.log(`  • Total Composite Resolved Tokens: ${compositeResults.totalResolved} / ${denominator} (${compositeResults.resolvedPct}%)`);
  console.log(`  • Resolved by Authored (Primary):   ${authoredContributionCount} (${authoredContributionPct}% of resolved tokens)`);
  console.log(`  • Resolved by Legacy (Fallback):    ${legacyContributionCount} (${legacyContributionPct}% of resolved tokens)\n`);

  console.log('  Top Tokens Rescued by Legacy Fallback:');
  const sortedFallbackTokens = Array.from(legacyFallbackTokens.entries()).sort((a,b) => b[1] - a[1]);
  sortedFallbackTokens.slice(0, 15).forEach(([tok, count], idx) => {
    console.log(`    ${(idx+1).toString().padStart(2)}. "${tok}" (${count} occurrences)`);
  });
  console.log();

  // Step 7: Regression Analysis
  console.log('[Regression Analysis (Composite vs Legacy-Only)]:');
  let regressionCount = 0;
  const regressions = [];

  for (let i = 0; i < evaluatedTokens.length; i++) {
    const token = evaluatedTokens[i].cleaned;
    const legacyRes = legacyResults.resolvedDetails.find(d => d.token === token)?.lookup || null;
    const compositeRes = compositeResults.resolvedDetails.find(d => d.token === token)?.lookup || null;

    if (legacyRes && !compositeRes) {
      regressionCount++;
      regressions.push({
        token,
        legacyTranslations: legacyRes.translations,
        issue: 'Resolved in legacy but missed in composite'
      });
    }
  }

  console.log(`  • Total Hard Regressions (resolved by legacy but failed in composite): ${regressionCount}`);
  if (regressionCount === 0) {
    console.log('  ✓ ZERO hard coverage regressions! The fallback cleanly rescues every single legacy-resolvable token.\n');
  } else {
    console.warn(`  ⚠️ Regressions detected:`, regressions);
  }

  // Step 8: Qualitative Comparison on Shared Tokens
  console.log('[Qualitative Comparison on Key Learner Vocabulary]:');
  const sampleVocabulary = ['arbeiten', 'woher', 'aus', 'Kaffee', 'Name', 'Buchstabe', 'sprechen', 'hören'];
  console.log('Word         | Authored Definition                  | Legacy (Wiktionary) Definition');
  console.log('-------------|--------------------------------------|---------------------------------------');
  for (const w of sampleVocabulary) {
    const auth = await authoredProvider.lookup(w, 'de', 'en');
    const leg = await legacyProvider.lookup(w, 'de', 'en');
    const authText = auth ? auth.translations.slice(0, 2).join('; ') : 'N/A';
    const legText = leg ? leg.translations.slice(0, 2).join('; ') : 'N/A';
    console.log(`${w.padEnd(12)} | ${authText.slice(0, 36).padEnd(36)} | ${legText.slice(0, 37).padEnd(37)}`);
  }
  console.log();

  return {
    denominator,
    authored: authoredResults,
    legacy: legacyResults,
    composite: compositeResults,
    contribution: {
      authoredCount: authoredContributionCount,
      authoredPct: authoredContributionPct,
      legacyCount: legacyContributionCount,
      legacyPct: legacyContributionPct,
      topFallbackTokens: sortedFallbackTokens
    },
    regressionCount
  };
}

if (process.argv[1] && process.argv[1].endsWith('evaluate-3way-kursbuch.mjs')) {
  evaluate3WayKursbuch()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal evaluation error:', err);
      process.exit(1);
    });
}
