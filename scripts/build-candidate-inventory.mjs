/**
 * build-candidate-inventory.mjs
 * 
 * Candidate-Ranking Pipeline for PDF Language Companion.
 * Identifies missing German lemmas and ranks them using transparent,
 * configurable weights totaling 100%:
 * - Frequency Evidence (35%)
 * - Grammatical Importance & Closed-Class Role (25%)
 * - CEFR Pedagogical Alignment (15%)
 * - Morphological Productivity & Compound Utility (15%)
 * - Domain & Register Breadth (10%)
 * 
 * Generates:
 * - data-source/candidates/candidate-inventory.json (Full ranked inventory)
 * - data-source/candidates/batches/batch-001.json (Top 250 candidates)
 * - data-source/candidates/batches/batch-002.json (Next 250 candidates)
 * 
 * SAFEGUARDS:
 * - Reads only approved local seed data.
 * - Does NOT perform network scraping or API calls.
 * - Never writes dictionary entries to data-source/authoring/.
 */

import fs from 'fs';
import path from 'path';

// Weights must total exactly 100% (1.00)
export const SCORING_WEIGHTS = {
  freq: 0.35,     // 35% Corpus frequency evidence
  gram: 0.25,     // 25% Grammatical & functional role
  cefr: 0.15,     // 15% CEFR pedagogical alignment
  morph: 0.15,    // 15% Morphological productivity / compound-prefix utility
  domain: 0.10    // 10% Domain & register breadth
};

// Validate that weights sum to 1.00
const weightSum = Object.values(SCORING_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(weightSum - 1.0) > 1e-6) {
  throw new Error(`Scoring weights must sum to 1.00, got ${weightSum}`);
}

/**
 * Normalizes string to Unicode NFC and trims whitespace.
 */
function normalizeString(str) {
  if (typeof str !== 'string') return '';
  return str.normalize('NFC').trim();
}

/**
 * Loads existing authored headwords from data-source/authoring/*.json.
 * Tracks headword + pos to preserve legitimate homographs.
 */
function loadExistingAuthored() {
  const authoringDir = path.resolve('data-source/authoring');
  const existingMap = new Map(); // headword -> Set of POS
  let totalAuthoredEntries = 0;

  if (fs.existsSync(authoringDir)) {
    const files = fs.readdirSync(authoringDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const data = JSON.parse(fs.readFileSync(path.join(authoringDir, f), 'utf8'));
      for (const entry of data) {
        totalAuthoredEntries++;
        const hw = normalizeString(entry.headword);
        if (!hw) continue;
        if (!existingMap.has(hw)) {
          existingMap.set(hw, new Set());
        }
        if (entry.pos) {
          existingMap.get(hw).add(entry.pos);
        }
        // If entry has multi-senses with POS
        if (Array.isArray(entry.senses)) {
          for (const s of entry.senses) {
            if (s.pos) existingMap.get(hw).add(s.pos);
          }
        }
      }
    }
  }

  return { existingMap, totalAuthoredEntries };
}

/**
 * Computes normalized Frequency Score (0-100) from available corpus evidence.
 * Correctly accounts for direction:
 * - DWDS Band: 1-6 (Higher = More frequent) -> Band/6 * 100
 * - Leipzig Class: 0-20 (Lower = More frequent) -> max(0, 100 - Class * 5)
 * - SUBTLEX Zipf: 1.0-7.0 (Higher = More frequent) -> (Zipf - 1.0)/6.0 * 100
 */
function computeFrequencyScore(seed) {
  const signals = [];

  if (typeof seed.dwdsBand === 'number' && seed.dwdsBand >= 1 && seed.dwdsBand <= 6) {
    signals.push((seed.dwdsBand / 6.0) * 100);
  }

  if (typeof seed.leipzigClass === 'number' && seed.leipzigClass >= 0) {
    signals.push(Math.max(0, 100 - seed.leipzigClass * 5.0));
  }

  if (typeof seed.subtlexZipf === 'number' && seed.subtlexZipf >= 1.0) {
    const normZipf = Math.min(100, Math.max(0, ((seed.subtlexZipf - 1.0) / 6.0) * 100));
    signals.push(normZipf);
  }

  if (signals.length === 0) {
    return { score: 30.0, hasEvidence: false }; // Neutral baseline when unobserved
  }

  const avg = signals.reduce((a, b) => a + b, 0) / signals.length;
  return { score: avg, hasEvidence: true };
}

/**
 * Computes Grammatical & Functional Role Score (0-100).
 */
function computeGrammaticalScore(seed) {
  const role = seed.functionalRole || '';
  const pos = seed.pos || '';
  const cat = seed.category || '';

  if (cat === 'closed_class') {
    if (role.includes('subordinating_conjunction') || role.includes('coordinating_conjunction')) return 100;
    if (role.includes('modal_particle') || role.includes('focus_particle')) return 95;
    if (role.includes('pronominal_adverb')) return 90;
    if (role.includes('conjunctional_adverb')) return 90;
    if (pos === 'pron' || pos === 'det') return 85;
    if (pos === 'prep' || pos === 'prep+art') return 85;
    return 80;
  }

  if (cat === 'core_verb') {
    if (role.includes('light_verb') || role.includes('auxiliary') || role.includes('modal')) return 85;
    if (seed.morphType === 'separable_verb') return 75;
    return 60;
  }

  if (cat === 'core_adv') {
    if (role.includes('conjunctional') || role.includes('discourse')) return 80;
    if (role.includes('temporal') || role.includes('spatial')) return 70;
    return 55;
  }

  if (cat === 'core_adj') {
    return 45;
  }

  if (cat === 'core_noun') {
    if (seed.morphType === 'high_productivity_compound_noun') return 50;
    return 40;
  }

  return 35;
}

/**
 * Computes CEFR Pedagogical Alignment Score (0-100).
 */
function computeCefrScore(seed) {
  const cefr = seed.cefr ? seed.cefr.toUpperCase() : null;
  switch (cefr) {
    case 'A1': return { score: 100, hasEvidence: true };
    case 'A2': return { score: 85, hasEvidence: true };
    case 'B1': return { score: 70, hasEvidence: true };
    case 'B2': return { score: 50, hasEvidence: true };
    case 'C1': return { score: 30, hasEvidence: true };
    default:   return { score: 50, hasEvidence: false };
  }
}

/**
 * Computes Morphological Productivity Score (0-100).
 */
function computeMorphologicalScore(seed) {
  const mType = seed.morphType || '';
  if (mType === 'high_productivity_verb_root' || mType === 'separable_verb') return 90;
  if (mType === 'high_productivity_compound_noun') return 85;
  if (mType === 'compound_verb') return 70;
  if (mType === 'standard_verb' || mType === 'standard_noun' || mType === 'standard_adj') return 50;
  if (mType === 'unproductive') return 30;
  return 40;
}

/**
 * Computes Domain & Register Score (0-100).
 */
function computeDomainScore(seed) {
  let score = 65;
  const dom = seed.domain || '';
  const reg = seed.register || '';

  if (dom === 'grammar' || dom === 'cross_domain' || dom === 'daily_life') {
    score += 20;
  } else if (dom === 'temporal' || dom === 'spatial' || dom === 'health' || dom === 'transit' || dom === 'social') {
    score += 10;
  }

  if (reg === 'spoken') {
    score += 10; // Bonus for high-utility conversational words
  } else if (reg === 'formal') {
    score += 5;
  }

  return Math.min(100, score);
}

/**
 * Main execution function.
 */
export function buildCandidateInventory(options = {}) {
  const seedsFile = options.seedsFile || path.resolve('data-source/candidates/seeds/candidate-seeds.json');
  const outDir = options.outDir || path.resolve('data-source/candidates');
  const batchesDir = path.join(outDir, 'batches');

  if (!fs.existsSync(seedsFile)) {
    throw new Error(`Candidate seeds file not found at: ${seedsFile}`);
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(batchesDir, { recursive: true });

  const { existingMap, totalAuthoredEntries } = loadExistingAuthored();
  const rawSeeds = JSON.parse(fs.readFileSync(seedsFile, 'utf8'));

  console.log('=====================================================================');
  console.log('   PDF LANGUAGE COMPANION — CANDIDATE RANKING PIPELINE (PHASE 9)    ');
  console.log('=====================================================================');
  console.log(`[Input Sources]:`);
  console.log(`  • Authored Dictionary Entries: ${totalAuthoredEntries} across ${existingMap.size} unique headwords`);
  console.log(`  • Candidate Seeds Available:   ${rawSeeds.length} candidate seeds`);

  const candidates = [];
  let skippedExistingCount = 0;
  const duplicatesSeen = new Set();

  for (const seed of rawSeeds) {
    const lemma = normalizeString(seed.lemma);
    const pos = normalizeString(seed.pos);
    if (!lemma || !pos) continue;

    const key = `${lemma}::${pos}`;
    if (duplicatesSeen.has(key)) continue;
    duplicatesSeen.add(key);

    // Check if lemma + POS already exists in authoring
    const existingPosSet = existingMap.get(lemma);
    if (existingPosSet) {
      if (existingPosSet.has(pos) || existingPosSet.size === 0) {
        skippedExistingCount++;
        continue;
      }
    }

    // Compute component scores
    const freqRes = computeFrequencyScore(seed);
    const gramScore = computeGrammaticalScore(seed);
    const cefrRes = computeCefrScore(seed);
    const morphScore = computeMorphologicalScore(seed);
    const domainScore = computeDomainScore(seed);

    // Calculate composite score
    const compositeScore = (
      SCORING_WEIGHTS.freq * freqRes.score +
      SCORING_WEIGHTS.gram * gramScore +
      SCORING_WEIGHTS.cefr * cefrRes.score +
      SCORING_WEIGHTS.morph * morphScore +
      SCORING_WEIGHTS.domain * domainScore
    );

    candidates.push({
      candidateLemma: lemma,
      canonicalPos: pos,
      gender: seed.gender || null,
      compositeScore: Number(compositeScore.toFixed(2)),
      scoreComponents: {
        frequencyScore: Number(freqRes.score.toFixed(2)),
        grammaticalScore: Number(gramScore.toFixed(2)),
        cefrScore: Number(cefrRes.score.toFixed(2)),
        morphologicalScore: Number(morphScore.toFixed(2)),
        domainScore: Number(domainScore.toFixed(2))
      },
      evidence: {
        dwdsBand: seed.dwdsBand || null,
        leipzigClass: seed.leipzigClass != null ? seed.leipzigClass : null,
        subtlexZipf: seed.subtlexZipf || null,
        cefrLevel: seed.cefr || null,
        hasFrequencyEvidence: freqRes.hasEvidence,
        hasCefrEvidence: cefrRes.hasEvidence
      },
      category: seed.category || 'general_lexicon',
      functionalRole: seed.functionalRole || null,
      domain: seed.domain || 'general',
      register: seed.register || 'standard',
      morphType: seed.morphType || 'standard',
      status: 'pending_authoring',
      provenance: {
        pipelineVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
        sourceSeed: path.basename(seedsFile)
      }
    });
  }

  // Sort descending by compositeScore
  candidates.sort((a, b) => b.compositeScore - a.compositeScore);

  // Assign 1-indexed ranks
  candidates.forEach((c, idx) => {
    c.rank = idx + 1;
  });

  // Write full inventory
  const inventoryFile = path.join(outDir, 'candidate-inventory.json');
  const inventoryData = {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    scoringWeights: SCORING_WEIGHTS,
    totalCandidates: candidates.length,
    skippedAlreadyAuthored: skippedExistingCount,
    candidates
  };
  fs.writeFileSync(inventoryFile, JSON.stringify(inventoryData, null, 2), 'utf8');

  // Export batches of 250 candidates
  const BATCH_SIZE = 250;
  const batchFiles = [];
  const totalBatches = Math.ceil(candidates.length / BATCH_SIZE);

  for (let b = 0; b < totalBatches; b++) {
    const startIdx = b * BATCH_SIZE;
    const endIdx = Math.min(startIdx + BATCH_SIZE, candidates.length);
    const batchCandidates = candidates.slice(startIdx, endIdx);
    const batchNumber = String(b + 1).padStart(3, '0');
    const batchFile = path.join(batchesDir, `batch-${batchNumber}.json`);

    const batchData = {
      batchId: `batch-${batchNumber}`,
      batchIndex: b + 1,
      totalBatches,
      startRank: startIdx + 1,
      endRank: endIdx,
      candidateCount: batchCandidates.length,
      generatedAt: new Date().toISOString(),
      candidates: batchCandidates
    };

    fs.writeFileSync(batchFile, JSON.stringify(batchData, null, 2), 'utf8');
    batchFiles.push(batchFile);
  }

  console.log(`\n[Inventory Generation Summary]:`);
  console.log(`  • Valid Un-authored Candidates: ${candidates.length}`);
  console.log(`  • Skipped Already Authored:     ${skippedExistingCount}`);
  console.log(`  • Full Inventory Written To:    ${inventoryFile}`);
  console.log(`  • Review Batches Created:       ${batchFiles.length} files (${BATCH_SIZE} items/batch)`);

  // Category breakdown
  const categoryCounts = {};
  const cefrCounts = {};
  for (const c of candidates) {
    categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    cefrCounts[c.evidence.cefrLevel || 'unknown'] = (cefrCounts[c.evidence.cefrLevel || 'unknown'] || 0) + 1;
  }
  console.log(`\n[Candidate Category Breakdown]:`);
  for (const [cat, cnt] of Object.entries(categoryCounts)) {
    console.log(`  • ${cat.padEnd(20)}: ${cnt}`);
  }
  console.log(`\n[Candidate CEFR Breakdown]:`);
  for (const [lvl, cnt] of Object.entries(cefrCounts)) {
    console.log(`  • Level ${lvl.padEnd(14)}: ${cnt}`);
  }

  console.log(`\n[Top 15 Ranked Candidates]:`);
  candidates.slice(0, 15).forEach(c => {
    const role = c.functionalRole || c.category;
    console.log(`  #${String(c.rank).padStart(2)}: ${c.candidateLemma.padEnd(14)} [${c.canonicalPos.padEnd(4)}] Score: ${c.compositeScore.toFixed(1).padStart(5)} | CEFR: ${c.evidence.cefrLevel || 'N/A'} | Role: ${role}`);
  });

  console.log('\n=====================================================================');
  console.log('🎉 CANDIDATE INVENTORY & BATCH GENERATION COMPLETED SUCCESSFULLY!');
  console.log('=====================================================================\n');

  return { inventoryFile, batchFiles, totalCandidates: candidates.length };
}

// Direct execution support
if (process.argv[1] && process.argv[1].endsWith('build-candidate-inventory.mjs')) {
  buildCandidateInventory();
}
