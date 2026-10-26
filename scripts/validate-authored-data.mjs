import fs from 'node:fs';
import path from 'node:path';

const VALID_POS = new Set([
  'noun', 'verb', 'adj', 'adv', 'pron', 'prep', 'prep+art',
  'conj', 'num', 'art', 'interj', 'part', 'phrase', 'det'
]);

const VALID_GENDERS = new Set(['m', 'f', 'n']);
const VALID_REVIEW_STATUSES = new Set(['draft', 'reviewed', 'verified']);

export function validateAuthoredData(options = {}) {
  const authoringDir = options.authoringDir || path.resolve(process.cwd(), 'data-source', 'authoring');
  console.log('===============================================================');
  console.log('   PDF LANGUAGE COMPANION — AUTHORED DATA VALIDATION           ');
  console.log('===============================================================\n');

  if (!fs.existsSync(authoringDir)) {
    throw new Error(`Authoring directory not found at ${authoringDir}`);
  }

  const files = fs.readdirSync(authoringDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    throw new Error(`No JSON authoring files found in ${authoringDir}`);
  }

  console.log(`[Check 1] Discovered ${files.length} authoring file(s) in ${authoringDir}:`);
  for (const f of files) {
    console.log(`  • ${f}`);
  }
  console.log();

  const headwordMap = new Map(); // exact case-sensitive headword -> { file, entry }
  const lowerHeadwordMap = new Map(); // lowercase headword -> Set of { headword, file }
  const errors = [];
  const warnings = [];

  let totalEntries = 0;
  const posCounts = {};
  const statusCounts = {};
  let nounsWithGender = 0;
  let nounsWithPlural = 0;
  let totalInflections = 0;

  for (const file of files) {
    const filePath = path.join(authoringDir, file);
    let content;
    try {
      content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
      errors.push(`[${file}] JSON Parse Error: ${err.message}`);
      continue;
    }

    if (!Array.isArray(content)) {
      errors.push(`[${file}] Root must be an array of entries.`);
      continue;
    }

    for (let idx = 0; idx < content.length; idx++) {
      totalEntries++;
      const entry = content[idx];
      const entryId = `[${file} #${idx + 1} "${entry.headword || 'UNKNOWN'}"]`;

      // 1. Headword check
      if (!entry.headword || typeof entry.headword !== 'string' || !entry.headword.trim()) {
        errors.push(`${entryId} Missing or empty 'headword' string.`);
        continue;
      }
      const hw = entry.headword.trim();

      // Check for corrupted encoding / mojibake
      if (/[\uFFFD\u00C3\u00C2]/.test(hw)) {
        errors.push(`${entryId} Potential corrupted characters / mojibake detected in headword: "${hw}".`);
      }

      // Check duplicate exact headwords across files
      if (headwordMap.has(hw)) {
        const prev = headwordMap.get(hw);
        const prevPos = prev.entry.pos || (prev.entry.senses && prev.entry.senses[0]?.pos);
        const currPos = entry.pos || (entry.senses && entry.senses[0]?.pos);
        if (prevPos && currPos && prevPos !== currPos) {
          warnings.push(`${entryId} Multi-file homonym detected for "${hw}": defined as "${prevPos}" in ${prev.file} and "${currPos}" in ${file}. Senses will be merged during compilation.`);
        } else {
          errors.push(`${entryId} Duplicate headword "${hw}"! Already defined in ${prev.file}.`);
        }
      } else {
        headwordMap.set(hw, { file, entry });
      }

      // Check case-insensitive collisions (informational / homograph check)
      const hwLower = hw.toLowerCase();
      if (!lowerHeadwordMap.has(hwLower)) {
        lowerHeadwordMap.set(hwLower, new Set());
      }
      lowerHeadwordMap.get(hwLower).add({ headword: hw, file });

      // 2. Senses and POS/Translations validation
      const senses = [];
      if (Array.isArray(entry.senses) && entry.senses.length > 0) {
        for (const s of entry.senses) {
          senses.push(s);
        }
      } else if (entry.pos && entry.translations) {
        senses.push({
          pos: entry.pos,
          gender: entry.gender,
          plural: entry.plural,
          cefr: entry.cefr,
          translations: entry.translations,
          examples: entry.examples
        });
      } else {
        errors.push(`${entryId} Must define either 'senses' array or top-level 'pos' and 'translations'.`);
      }

      if (senses.length === 0) {
        errors.push(`${entryId} Entry has 0 senses.`);
      }

      for (let sIdx = 0; sIdx < senses.length; sIdx++) {
        const sense = senses[sIdx];
        const senseId = `${entryId} Sense #${sIdx + 1}`;

        if (!sense.pos || typeof sense.pos !== 'string' || !VALID_POS.has(sense.pos)) {
          errors.push(`${senseId} Invalid or missing 'pos': "${sense.pos}". Valid: ${Array.from(VALID_POS).join(', ')}`);
        } else {
          posCounts[sense.pos] = (posCounts[sense.pos] || 0) + 1;
        }

        if (!Array.isArray(sense.translations) || sense.translations.length === 0) {
          errors.push(`${senseId} 'translations' must be a non-empty array of strings.`);
        } else {
          for (const t of sense.translations) {
            if (typeof t !== 'string' || !t.trim()) {
              errors.push(`${senseId} Contains empty or invalid translation.`);
            }
          }
        }

        // Noun specific checks
        if (sense.pos === 'noun') {
          if (!sense.gender || !VALID_GENDERS.has(sense.gender)) {
            errors.push(`${senseId} Noun missing valid 'gender' ('m' | 'f' | 'n'): got "${sense.gender}".`);
          } else {
            nounsWithGender++;
          }
          if (sense.plural && typeof sense.plural === 'string') {
            nounsWithPlural++;
          }
        }

        // Examples check
        if (sense.examples && Array.isArray(sense.examples)) {
          for (let eIdx = 0; eIdx < sense.examples.length; eIdx++) {
            const ex = sense.examples[eIdx];
            if (!ex.de || !ex.en) {
              errors.push(`${senseId} Example #${eIdx + 1} missing 'de' or 'en' text.`);
            }
          }
        }
      }

      // 3. Inflections check
      if (entry.inflections) {
        if (!Array.isArray(entry.inflections)) {
          errors.push(`${entryId} 'inflections' must be an array of strings.`);
        } else {
          for (const inf of entry.inflections) {
            if (typeof inf !== 'string' || !inf.trim()) {
              errors.push(`${entryId} Contains invalid or empty inflection.`);
            } else if (/\s/.test(inf.trim())) {
              errors.push(`${entryId} Inflection "${inf}" contains whitespace. Multi-word phrases cannot be indexed by single-token dictionary.`);
            } else {
              totalInflections++;
            }
          }
        }
      }

      // 4. Provenance and review status check
      if (!entry.provenance || typeof entry.provenance !== 'object') {
        errors.push(`${entryId} Missing 'provenance' object.`);
      } else {
        const prov = entry.provenance;
        if (!prov.author || typeof prov.author !== 'string') {
          errors.push(`${entryId} Provenance missing 'author'.`);
        }
        if (!prov.method || typeof prov.method !== 'string') {
          errors.push(`${entryId} Provenance missing 'method'.`);
        }
        if (!prov.reviewStatus || !VALID_REVIEW_STATUSES.has(prov.reviewStatus)) {
          errors.push(`${entryId} Provenance invalid 'reviewStatus': "${prov.reviewStatus}". Valid: ${Array.from(VALID_REVIEW_STATUSES).join(', ')}`);
        } else {
          statusCounts[prov.reviewStatus] = (statusCounts[prov.reviewStatus] || 0) + 1;
        }
      }
    }
  }

  // Check homographs
  console.log('[Check 2] Homograph & Case-Sensitivity Audit:');
  let homographCount = 0;
  for (const [lowerKey, instances] of lowerHeadwordMap.entries()) {
    if (instances.size > 1) {
      homographCount++;
      const list = Array.from(instances).map(i => `"${i.headword}" (${i.file})`).join(', ');
      console.log(`  • Homograph pair detected for lower "${lowerKey}": ${list}`);
    }
  }
  console.log(`  ✓ Total distinct homograph pairs detected: ${homographCount}\n`);

  // Report statistics
  console.log('[Check 3] Dataset Summary & Quality Metrics:');
  console.log(`  • Total Validated Headwords: ${totalEntries}`);
  console.log(`  • Total Explicit Inflection Links: ${totalInflections}`);
  console.log(`  • Nouns with Verified Gender: ${nounsWithGender}`);
  console.log(`  • Nouns with Verified Plural: ${nounsWithPlural}`);
  console.log(`  • POS Distribution:`, posCounts);
  console.log(`  • Review Status Distribution:`, statusCounts);

  if (warnings.length > 0) {
    console.log('\n[Warnings]:');
    for (const w of warnings) console.warn(`  ⚠️  ${w}`);
  }

  if (errors.length > 0) {
    console.error('\n❌ VALIDATION FAILED WITH ERRORS:');
    for (const err of errors) console.error(`  ✗ ${err}`);
    console.log();
    return false;
  }

  console.log('\n===============================================================');
  console.log('🎉 ALL AUTHORED DATA VALIDATION CHECKS PASSED SUCCESSFULLY!');
  console.log('===============================================================\n');
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('validate-authored-data.mjs')) {
  try {
    const success = validateAuthoredData();
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('Fatal validation error:', err);
    process.exit(1);
  }
}
