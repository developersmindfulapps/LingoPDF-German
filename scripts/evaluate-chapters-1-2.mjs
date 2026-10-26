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

function filterTokens(rawTokens) {
  let excludedCount = 0;
  const evaluatedTokens = [];

  for (const item of rawTokens) {
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

  return { evaluatedTokens, excludedCount };
}

async function evaluateTokenCorpus(tokens, authoredProvider, legacyProvider, compositeProvider) {
  const denominator = tokens.length;

  async function evalProvider(provider) {
    let exactHeadwords = 0;
    let inflectionMatches = 0;
    let compoundMatches = 0;
    let unresolved = 0;
    const resolvedDetails = [];
    const unresolvedDetails = [];

    for (const item of tokens) {
      const word = item.cleaned;
      const lookup = await provider.lookup(word, 'de', 'en');

      if (lookup) {
        const isCompound = lookup.isDerived;
        const isInflection = !isCompound && lookup.lemma && lookup.lemma !== word && lookup.lemma.toLowerCase() !== word.toLowerCase();
        const isExact = !isCompound && !isInflection;

        if (isCompound) compoundMatches++;
        else if (isInflection) inflectionMatches++;
        else exactHeadwords++;

        resolvedDetails.push({ token: word, lookup, type: isCompound ? 'compound' : (isInflection ? 'inflection' : 'exact') });
      } else {
        unresolved++;
        unresolvedDetails.push(item);
      }
    }

    const totalResolved = exactHeadwords + inflectionMatches + compoundMatches;
    return {
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

  const authored = await evalProvider(authoredProvider);
  const legacy = await evalProvider(legacyProvider);
  const composite = await evalProvider(compositeProvider);

  // Contribution analysis
  let authoredCount = 0;
  let legacyCount = 0;
  const legacyFallbackTokens = new Map();

  for (const item of composite.resolvedDetails) {
    if (item.lookup.providerId === 'authored') {
      authoredCount++;
    } else if (item.lookup.providerId === 'legacy') {
      legacyCount++;
      const tok = item.token;
      legacyFallbackTokens.set(tok, (legacyFallbackTokens.get(tok) || 0) + 1);
    }
  }

  // Regression check
  let hardRegressions = 0;
  const regressionList = [];
  for (const item of tokens) {
    const word = item.cleaned;
    const legRes = legacy.resolvedDetails.find(d => d.token === word)?.lookup || null;
    const compRes = composite.resolvedDetails.find(d => d.token === word)?.lookup || null;
    if (legRes && !compRes) {
      hardRegressions++;
      regressionList.push(word);
    }
  }

  return {
    denominator,
    authored,
    legacy,
    composite,
    contribution: {
      authoredCount,
      authoredPct: ((authoredCount / composite.totalResolved) * 100).toFixed(1),
      legacyCount,
      legacyPct: ((legacyCount / composite.totalResolved) * 100).toFixed(1),
      sortedFallback: Array.from(legacyFallbackTokens.entries()).sort((a,b) => b[1] - a[1])
    },
    hardRegressions,
    regressionList
  };
}

export async function runChapterEvaluation() {
  const ch1Pages = [10, 11, 12, 13, 14, 15, 16];
  const ch2Pages = [20, 21, 22, 23, 24, 25, 26, 27];
  const allPages = [...ch1Pages, ...ch2Pages];

  console.log('=====================================================================');
  console.log('   PDF LANGUAGE COMPANION — CHAPTERS 1 & 2 EVALUATION (PHASE 8)     ');
  console.log('   Multi-Chapter Benchmark: Netzwerk A1, Kapitel 1 & Kapitel 2      ');
  console.log('=====================================================================\n');

  const pdfPath = path.resolve(process.cwd(), 'kursbuch.pdf');
  if (!fs.existsSync(pdfPath)) throw new Error(`Kursbuch PDF not found at ${pdfPath}`);

  const pdfBytes = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;

  // Load dictionary datasets
  const legacyData = await loadDictionaryAssets();
  const authoredData = await loadAuthoredDictionaryAssets();

  const legacyProvider = new LocalDictionaryProvider(legacyData.entries, legacyData.inflections, loadDictionaryAssets, 'legacy-de-en');
  const authoredProvider = new LocalDictionaryProvider(authoredData.entries, authoredData.inflections, loadAuthoredDictionaryAssets, 'authored-de-en');
  const compositeProvider = new CompositeDictionaryProvider(authoredProvider, legacyProvider);

  await legacyProvider.ensureInitialized();
  await authoredProvider.ensureInitialized();
  await compositeProvider.ensureInitialized();

  console.log(`[Providers Setup]:`);
  console.log(`  • Authored Headwords:  ${Object.keys(authoredData.entries).length}`);
  console.log(`  • Authored Inflections: ${Object.keys(authoredData.inflections).length}`);
  console.log(`  • Legacy Headwords:    ${Object.keys(legacyData.entries).length}`);
  console.log(`  • Legacy Inflections:  ${Object.keys(legacyData.inflections).length}\n`);

  // Run OCR
  console.log('[OCR Processing] Scanning evaluated pages with Tesseract deu...');
  const ocr = OCRService.getInstance();
  await ocr.initialize();

  const ch1RawTokens = [];
  const ch2RawTokens = [];

  for (const p of allPages) {
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

    if (!imgObj) continue;

    const isOdd = p % 2 !== 0;
    const bmp = createBmpBuffer(imgObj.width, imgObj.height, imgObj.data, isOdd);
    const ocrResult = await ocr.recognize(bmp, p);

    const targetList = ch1Pages.includes(p) ? ch1RawTokens : ch2RawTokens;
    for (const w of ocrResult.words) {
      targetList.push({ text: w.text, confidence: w.confidence, page: p });
    }
  }

  await ocr.terminate();

  const ch1Filtered = filterTokens(ch1RawTokens);
  const ch2Filtered = filterTokens(ch2RawTokens);
  const combinedTokens = [...ch1Filtered.evaluatedTokens, ...ch2Filtered.evaluatedTokens];

  console.log(`[Corpus Metrics]:`);
  console.log(`  • Kapitel 1 (Pages 10–16): Raw = ${ch1RawTokens.length}, Excluded = ${ch1Filtered.excludedCount}, Denominator = ${ch1Filtered.evaluatedTokens.length}`);
  console.log(`  • Kapitel 2 (Pages 20–27): Raw = ${ch2RawTokens.length}, Excluded = ${ch2Filtered.excludedCount}, Denominator = ${ch2Filtered.evaluatedTokens.length}`);
  console.log(`  • Combined (15 pages):     Denominator = ${combinedTokens.length}\n`);

  // Run evaluations
  const ch1Eval = await evaluateTokenCorpus(ch1Filtered.evaluatedTokens, authoredProvider, legacyProvider, compositeProvider);
  const ch2Eval = await evaluateTokenCorpus(ch2Filtered.evaluatedTokens, authoredProvider, legacyProvider, compositeProvider);
  const combinedEval = await evaluateTokenCorpus(combinedTokens, authoredProvider, legacyProvider, compositeProvider);

  function printMatrix(title, ev) {
    console.log(`========================================================================================`);
    console.log(`                 ${title.toUpperCase()} (DENOMINATOR: ${ev.denominator} TOKENS)`);
    console.log(`========================================================================================`);
    console.log('Metric                     | Authored-Only        | Legacy-Only          | Composite (Dual)     ');
    console.log('---------------------------|----------------------|----------------------|----------------------');
    console.log(
      `Exact Headword Matches     | ${ev.authored.exactHeadwords.toString().padStart(4)} (${ev.authored.exactPct.padStart(5)}%) | ` +
      `${ev.legacy.exactHeadwords.toString().padStart(4)} (${ev.legacy.exactPct.padStart(5)}%) | ` +
      `${ev.composite.exactHeadwords.toString().padStart(4)} (${ev.composite.exactPct.padStart(5)}%)`
    );
    console.log(
      `Inflection Matches         | ${ev.authored.inflectionMatches.toString().padStart(4)} (${ev.authored.inflPct.padStart(5)}%) | ` +
      `${ev.legacy.inflectionMatches.toString().padStart(4)} (${ev.legacy.inflPct.padStart(5)}%) | ` +
      `${ev.composite.inflectionMatches.toString().padStart(4)} (${ev.composite.inflPct.padStart(5)}%)`
    );
    console.log(
      `Compound Matches           | ${ev.authored.compoundMatches.toString().padStart(4)} (${ev.authored.compPct.padStart(5)}%) | ` +
      `${ev.legacy.compoundMatches.toString().padStart(4)} (${ev.legacy.compPct.padStart(5)}%) | ` +
      `${ev.composite.compoundMatches.toString().padStart(4)} (${ev.composite.compPct.padStart(5)}%)`
    );
    console.log('---------------------------|----------------------|----------------------|----------------------');
    console.log(
      `TOTAL RESOLVED             | ${ev.authored.totalResolved.toString().padStart(4)} (${ev.authored.resolvedPct.padStart(5)}%) | ` +
      `${ev.legacy.totalResolved.toString().padStart(4)} (${ev.legacy.resolvedPct.padStart(5)}%) | ` +
      `${ev.composite.totalResolved.toString().padStart(4)} (${ev.composite.resolvedPct.padStart(5)}%)`
    );
    console.log(
      `UNRESOLVED TOKENS          | ${ev.authored.unresolved.toString().padStart(4)} (${ev.authored.unresolvedPct.padStart(5)}%) | ` +
      `${ev.legacy.unresolved.toString().padStart(4)} (${ev.legacy.unresolvedPct.padStart(5)}%) | ` +
      `${ev.composite.unresolved.toString().padStart(4)} (${ev.composite.unresolvedPct.padStart(5)}%)`
    );
    console.log('----------------------------------------------------------------------------------------');
    console.log(`Composite Provider Contribution: Authored = ${ev.contribution.authoredCount} (${ev.contribution.authoredPct}%), Legacy Fallback = ${ev.contribution.legacyCount} (${ev.contribution.legacyPct}%)`);
    console.log(`Hard Regressions (Legacy-resolved missed by Composite): ${ev.hardRegressions}`);
    console.log(`========================================================================================\n`);
  }

  printMatrix('Kapitel 1 Coverage Matrix', ch1Eval);
  printMatrix('Kapitel 2 Coverage Matrix', ch2Eval);
  printMatrix('Combined Chapters 1 & 2 Matrix', combinedEval);

  // Acceptance criteria analysis
  console.log('[Acceptance Gates Tracking for Chapters 1-3]:');
  const ch1Pass = parseFloat(ch1Eval.composite.resolvedPct) >= 85.0;
  const ch2Pass = parseFloat(ch2Eval.composite.resolvedPct) >= 85.0;
  const combinedPct = parseFloat(combinedEval.composite.resolvedPct);
  const zeroReg = ch1Eval.hardRegressions === 0 && ch2Eval.hardRegressions === 0;

  console.log(`  • Kapitel 1 composite >= 85%: ${ch1Eval.composite.resolvedPct}% -> ${ch1Pass ? 'PASSED' : 'FAILED'}`);
  console.log(`  • Kapitel 2 composite >= 85%: ${ch2Eval.composite.resolvedPct}% -> ${ch2Pass ? 'PASSED' : 'FAILED'}`);
  console.log(`  • Combined Ch1+Ch2 composite: ${combinedEval.composite.resolvedPct}% (Target >= 90% across Ch1-3)`);
  console.log(`  • Zero hard regressions:     ${zeroReg ? 'PASSED (0 hard regressions)' : 'FAILED'}`);
  console.log('  • Note: Full validation gate requires Chapter 3 evaluation in next phase.\n');

  return { ch1Eval, ch2Eval, combinedEval };
}

if (process.argv[1] && process.argv[1].endsWith('evaluate-chapters-1-2.mjs')) {
  runChapterEvaluation()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal evaluation error:', err);
      process.exit(1);
    });
}
