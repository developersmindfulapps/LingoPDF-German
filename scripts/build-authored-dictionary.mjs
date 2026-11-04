import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateAuthoredData } from './validate-authored-data.mjs';

const VALID_REVIEW_STATUSES = new Set(['draft', 'reviewed', 'verified']);
const APPROVED_REVIEW_STATUSES = new Set(['reviewed', 'verified']);

export function buildAuthoredDictionary(options = {}) {
  const authoringDir = options.authoringDir || path.resolve(process.cwd(), 'data-source', 'authoring');
  
  // CLI flag or options-based draft preview
  const includeDrafts = options.includeDrafts === true;
  const isDraftPreview = includeDrafts;
  
  const defaultOutputDir = isDraftPreview
    ? path.resolve(process.cwd(), 'dist-draft')
    : path.resolve(process.cwd(), 'dist-pilot');
  const outputDir = options.outputDir || defaultOutputDir;

  const publicDataDir = path.resolve(process.cwd(), 'public', 'data');

  // STRICT SAFETY INVARIANT: Draft previews must NEVER write to public/data
  if (isDraftPreview && (options.outputDir === publicDataDir || options.writePublic === true)) {
    throw new Error('CRITICAL SAFETY VIOLATION: Draft builds must never be written to customer-facing public/data directory!');
  }

  // Only the default customer build (or when explicitly requested without drafts) packages into public/data
  const isDefaultCustomerBuild = !isDraftPreview && (!options.outputDir || options.outputDir === path.resolve(process.cwd(), 'dist-pilot')) && options.writePublic !== false;

  console.log('===============================================================');
  console.log(`   PDF LANGUAGE COMPANION — COMPILE AUTHORED DATASET           `);
  console.log(`   Mode: ${isDraftPreview ? 'DRAFT PREVIEW (Isolated)' : 'CUSTOMER BUILD (Drafts Excluded)'} `);
  console.log('===============================================================\n');

  // Step 1: Pre-validation
  console.log('[Step 1] Running Pre-Compilation Validation...');
  const isValid = validateAuthoredData({ authoringDir });
  if (!isValid) {
    throw new Error('Pre-compilation validation failed. Aborting build.');
  }

  // Step 2: Read authoring files
  console.log(`\n[Step 2] Ingesting authoring data from ${authoringDir}...`);
  const files = fs.readdirSync(authoringDir).filter(f => f.endsWith('.json')).sort();

  const finalEntries = {};
  const finalInflections = {};
  const posDistribution = {};
  const reviewStatusDistribution = {};
  let nounsWithGender = 0;
  let nounsWithPlural = 0;
  let totalSourceRecords = 0;
  let includedRecordsCount = 0;
  let excludedDraftsCount = 0;

  for (const file of files) {
    const raw = fs.readFileSync(path.join(authoringDir, file), 'utf-8');
    const items = JSON.parse(raw);

    for (const item of items) {
      totalSourceRecords++;
      const hw = item.headword.trim();

      // Validate review status strictly
      const status = item.provenance?.reviewStatus;
      if (!status || typeof status !== 'string' || !VALID_REVIEW_STATUSES.has(status)) {
        throw new Error(
          `[${file}] Entry "${hw}": Missing or unknown reviewStatus: "${status}". ` +
          `Must be explicitly 'reviewed', 'verified', or 'draft'. Failing safely.`
        );
      }

      // Record distribution across all source records
      reviewStatusDistribution[status] = (reviewStatusDistribution[status] || 0) + 1;

      // Determine inclusion: default customer build excludes drafts
      const isApproved = APPROVED_REVIEW_STATUSES.has(status);
      const shouldInclude = includeDrafts ? true : isApproved;

      if (!shouldInclude) {
        excludedDraftsCount++;
        continue; // Exclude draft entry: do NOT add senses, do NOT add inflections
      }

      includedRecordsCount++;

      // Normalize senses
      const senses = [];
      if (Array.isArray(item.senses) && item.senses.length > 0) {
        for (const s of item.senses) {
          const senseObj = {
            pos: s.pos,
            translations: s.translations
          };
          if (s.gender) senseObj.gender = s.gender;
          if (s.plural) senseObj.plural = s.plural;
          senses.push(senseObj);
          posDistribution[s.pos] = (posDistribution[s.pos] || 0) + 1;
          if (s.pos === 'noun' && s.gender) nounsWithGender++;
          if (s.pos === 'noun' && s.plural) nounsWithPlural++;
        }
      } else {
        const senseObj = {
          pos: item.pos,
          translations: item.translations
        };
        if (item.gender) senseObj.gender = item.gender;
        if (item.plural) senseObj.plural = item.plural;
        senses.push(senseObj);
        posDistribution[item.pos] = (posDistribution[item.pos] || 0) + 1;
        if (item.pos === 'noun' && item.gender) nounsWithGender++;
        if (item.pos === 'noun' && item.plural) nounsWithPlural++;
      }

      // If headword already has senses from another approved record (e.g. homonym across files),
      // append the new approved senses; otherwise initialize.
      if (finalEntries[hw]) {
        finalEntries[hw].senses.push(...senses);
      } else {
        finalEntries[hw] = { senses };
      }

      // Helper to add inflection supporting multiple candidate lemmas
      const addInflectionMapping = (inf, lemma) => {
        if (typeof inf !== 'string') return;
        const infLower = inf.trim().toLowerCase();
        if (!infLower || infLower === lemma.toLowerCase()) return;

        if (!finalInflections[infLower]) {
          finalInflections[infLower] = lemma;
        } else {
          const existing = finalInflections[infLower];
          if (typeof existing === 'string') {
            if (existing !== lemma) {
              finalInflections[infLower] = [existing, lemma].sort();
            }
          } else if (Array.isArray(existing)) {
            if (!existing.includes(lemma)) {
              existing.push(lemma);
              existing.sort();
            }
          }
        }
      };

      // Add explicit inflections to index (only for included approved entries)
      if (Array.isArray(item.inflections)) {
        for (const inf of item.inflections) {
          addInflectionMapping(inf, hw);
        }
      }

      // Add plural form to inflection index if noun
      for (const s of senses) {
        if (s.pos === 'noun' && s.plural) {
          addInflectionMapping(s.plural, hw);
        }
      }
    }
  }

  // Add lowercase entry mappings for capitalized headwords if distinct and no lowercase collision
  for (const hw of Object.keys(finalEntries)) {
    const lower = hw.toLowerCase();
    if (lower !== hw && !finalEntries[lower]) {
      const existing = finalInflections[lower];
      if (!existing) {
        finalInflections[lower] = hw;
      } else if (typeof existing === 'string') {
        if (existing !== hw) {
          finalInflections[lower] = [existing, hw].sort();
        }
      } else if (Array.isArray(existing)) {
        if (!existing.includes(hw)) {
          existing.push(hw);
          existing.sort();
        }
      }
    }
  }

  // Step 3: Write compiled assets
  console.log(`\n[Step 3] Emitting compiled assets to ${outputDir}...`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Sort keys alphabetically for deterministic, reproducible output
  const sortedEntries = {};
  for (const k of Object.keys(finalEntries).sort()) {
    sortedEntries[k] = finalEntries[k];
  }

  const sortedInflections = {};
  for (const k of Object.keys(finalInflections).sort()) {
    sortedInflections[k] = finalInflections[k];
  }

  const dictFile = path.join(outputDir, 'de-en-dictionary.json');
  const inflFile = path.join(outputDir, 'de-en-inflections.json');
  const metaFile = path.join(outputDir, 'de-en-metadata.json');
  const manifestFile = path.join(outputDir, 'de-en-manifest.json');

  const dictContent = JSON.stringify(sortedEntries, null, 2);
  const inflContent = JSON.stringify(sortedInflections, null, 2);

  const dictSha256 = crypto.createHash('sha256').update(dictContent, 'utf8').digest('hex');
  const inflSha256 = crypto.createHash('sha256').update(inflContent, 'utf8').digest('hex');
  const combinedContent = dictContent + '\n' + inflContent;
  const contentChecksum = crypto.createHash('sha256').update(combinedContent, 'utf8').digest('hex');

  // Deterministic dataset version derived directly from dictionary content
  const datasetVersion = `1.0.0-${contentChecksum.slice(0, 10)}`;

  // Deterministic build timestamp derived from latest source mtime
  const latestMtimeMs = files.reduce((max, f) => {
    const stat = fs.statSync(path.join(authoringDir, f));
    return Math.max(max, stat.mtimeMs);
  }, 0);
  const buildTimestamp = options.buildTimestamp || new Date(latestMtimeMs).toISOString();

  const manifest = {
    languagePair: 'de-en',
    datasetVersion,
    schemaVersion: '1.0.0',
    datasetName: isDraftPreview
      ? 'PDF Language Companion — Authored German-English Learner Dictionary (Draft Preview)'
      : 'PDF Language Companion — Independently Authored German-English Learner Dictionary',
    license: 'Proprietary / Independently Authored',
    attribution: 'Authored by PDF Language Companion lexicography team',
    buildMode: isDraftPreview ? 'draft-preview' : 'customer',
    totalSourceRecords,
    includedRecordsCount,
    excludedDraftsCount,
    headwordsCount: Object.keys(sortedEntries).length,
    inflectionKeysCount: Object.keys(sortedInflections).length,
    contentChecksum,
    dictSha256,
    inflSha256,
    buildTimestamp,
    posDistribution,
    reviewStatusDistribution,
    nounsWithGender,
    nounsWithPlural
  };

  const metadata = {
    ...manifest,
    version: datasetVersion,
    generatedAt: buildTimestamp
  };

  const metaContent = JSON.stringify(metadata, null, 2);
  const manifestContent = JSON.stringify(manifest, null, 2);

  fs.writeFileSync(dictFile, dictContent, 'utf-8');
  fs.writeFileSync(inflFile, inflContent, 'utf-8');
  fs.writeFileSync(metaFile, metaContent, 'utf-8');
  fs.writeFileSync(manifestFile, manifestContent, 'utf-8');

  console.log(`  ✓ Written ${dictFile} (${(fs.statSync(dictFile).size / 1024).toFixed(1)} KB, ${Object.keys(sortedEntries).length} headwords)`);
  console.log(`  ✓ Written ${inflFile} (${(fs.statSync(inflFile).size / 1024).toFixed(1)} KB, ${Object.keys(sortedInflections).length} inflection keys)`);
  console.log(`  ✓ Written ${metaFile}`);
  console.log(`  ✓ Written ${manifestFile}`);
  console.log(`  • Build Statistics: ${includedRecordsCount} records included, ${excludedDraftsCount} drafts excluded.`);

  // Also package authored assets under distinct public/data/authored-de-en-* filenames ONLY if default customer build
  if (isDefaultCustomerBuild && fs.existsSync(publicDataDir)) {
    const pubDictFile = path.join(publicDataDir, 'authored-de-en-dictionary.json');
    const pubInflFile = path.join(publicDataDir, 'authored-de-en-inflections.json');
    const pubMetaFile = path.join(publicDataDir, 'authored-de-en-metadata.json');
    const pubManifestFile = path.join(publicDataDir, 'authored-de-en-manifest.json');

    fs.writeFileSync(pubDictFile, dictContent, 'utf-8');
    fs.writeFileSync(pubInflFile, inflContent, 'utf-8');
    fs.writeFileSync(pubMetaFile, metaContent, 'utf-8');
    fs.writeFileSync(pubManifestFile, manifestContent, 'utf-8');

    console.log(`  ✓ Packaged ${pubDictFile} (${(fs.statSync(pubDictFile).size / 1024).toFixed(1)} KB)`);
    console.log(`  ✓ Packaged ${pubInflFile} (${(fs.statSync(pubInflFile).size / 1024).toFixed(1)} KB)`);
    console.log(`  ✓ Packaged ${pubMetaFile}`);
    console.log(`  ✓ Packaged ${pubManifestFile}`);
  }

  console.log('\n===============================================================');
  console.log(`🎉 AUTHORED DICTIONARY BUILD SUCCESSFUL! (Version: ${datasetVersion})`);
  console.log('===============================================================\n');

  return {
    dictFile,
    inflFile,
    metaFile,
    manifestFile,
    metadata,
    manifest
  };
}

if (process.argv[1] && process.argv[1].endsWith('build-authored-dictionary.mjs')) {
  try {
    const args = process.argv.slice(2);
    const includeDrafts = args.includes('--include-drafts') || args.includes('--drafts');
    buildAuthoredDictionary({ includeDrafts });
    process.exit(0);
  } catch (err) {
    console.error('Fatal build error:', err);
    process.exit(1);
  }
}
