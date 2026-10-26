import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateAuthoredData } from './validate-authored-data.mjs';

export function buildAuthoredDictionary(options = {}) {
  const authoringDir = options.authoringDir || path.resolve(process.cwd(), 'data-source', 'authoring');
  const outputDir = options.outputDir || path.resolve(process.cwd(), 'dist-pilot');

  console.log('===============================================================');
  console.log('   PDF LANGUAGE COMPANION — COMPILE AUTHORED PILOT DATASET     ');
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

  for (const file of files) {
    const raw = fs.readFileSync(path.join(authoringDir, file), 'utf-8');
    const items = JSON.parse(raw);

    for (const item of items) {
      const hw = item.headword.trim();

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

      if (finalEntries[hw]) {
        finalEntries[hw].senses.push(...senses);
      } else {
        finalEntries[hw] = { senses };
      }

      // Record review status
      if (item.provenance && item.provenance.reviewStatus) {
        const st = item.provenance.reviewStatus;
        reviewStatusDistribution[st] = (reviewStatusDistribution[st] || 0) + 1;
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

      // Add explicit inflections to index
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

  // Step 3: Write to isolated output directory (dist-pilot/) and public/data/authored-de-en-*
  console.log(`\n[Step 3] Emitting compiled pilot assets to ${outputDir}...`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const dictFile = path.join(outputDir, 'de-en-dictionary.json');
  const inflFile = path.join(outputDir, 'de-en-inflections.json');
  const metaFile = path.join(outputDir, 'de-en-metadata.json');

  const dictContent = JSON.stringify(finalEntries, null, 2);
  const inflContent = JSON.stringify(finalInflections, null, 2);

  const dictSha256 = crypto.createHash('sha256').update(dictContent, 'utf8').digest('hex');
  const inflSha256 = crypto.createHash('sha256').update(inflContent, 'utf8').digest('hex');

  const metadata = {
    datasetName: 'PDF Language Companion — Independently Authored German-English Learner Dictionary (Pilot)',
    version: '0.2.0-pilot',
    license: 'Proprietary / Independently Authored',
    attribution: 'Authored by PDF Language Companion lexicography team',
    generatedAt: new Date().toISOString(),
    headwordsCount: Object.keys(finalEntries).length,
    inflectionKeysCount: Object.keys(finalInflections).length,
    posDistribution,
    reviewStatusDistribution,
    nounsWithGender,
    nounsWithPlural,
    dictSha256,
    inflSha256
  };

  const metaContent = JSON.stringify(metadata, null, 2);

  fs.writeFileSync(dictFile, dictContent, 'utf-8');
  fs.writeFileSync(inflFile, inflContent, 'utf-8');
  fs.writeFileSync(metaFile, metaContent, 'utf-8');

  console.log(`  ✓ Written ${dictFile} (${(fs.statSync(dictFile).size / 1024).toFixed(1)} KB, ${Object.keys(finalEntries).length} headwords)`);
  console.log(`  ✓ Written ${inflFile} (${(fs.statSync(inflFile).size / 1024).toFixed(1)} KB, ${Object.keys(finalInflections).length} inflection keys)`);
  console.log(`  ✓ Written ${metaFile}`);

  // Also package authored assets under distinct public/data/authored-de-en-* filenames
  const publicDataDir = path.resolve(process.cwd(), 'public', 'data');
  if (fs.existsSync(publicDataDir)) {
    const pubDictFile = path.join(publicDataDir, 'authored-de-en-dictionary.json');
    const pubInflFile = path.join(publicDataDir, 'authored-de-en-inflections.json');
    const pubMetaFile = path.join(publicDataDir, 'authored-de-en-metadata.json');

    fs.writeFileSync(pubDictFile, dictContent, 'utf-8');
    fs.writeFileSync(pubInflFile, inflContent, 'utf-8');
    fs.writeFileSync(pubMetaFile, metaContent, 'utf-8');

    console.log(`  ✓ Packaged ${pubDictFile} (${(fs.statSync(pubDictFile).size / 1024).toFixed(1)} KB)`);
    console.log(`  ✓ Packaged ${pubInflFile} (${(fs.statSync(pubInflFile).size / 1024).toFixed(1)} KB)`);
    console.log(`  ✓ Packaged ${pubMetaFile}`);
  }

  console.log('\n===============================================================');
  console.log('🎉 AUTHORED DICTIONARY PILOT BUILD COMPLETED SUCCESSFULLY!');
  console.log('===============================================================\n');

  return {
    dictFile,
    inflFile,
    metaFile,
    metadata
  };
}

if (process.argv[1] && process.argv[1].endsWith('build-authored-dictionary.mjs')) {
  try {
    buildAuthoredDictionary();
    process.exit(0);
  } catch (err) {
    console.error('Fatal build error:', err);
    process.exit(1);
  }
}
