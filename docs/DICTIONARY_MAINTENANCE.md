# LingoPDF Extension — Dictionary Maintenance & Release Guide

## 1. Overview & Architecture

LingoPDF utilizes a dual-tier offline dictionary architecture for German-to-English translation:

```text
User Selects German Word
          ↓
CompositeDictionaryProvider
          ↓
  [Tier 1: Authored Dictionary]
  - 705 curated headwords, 2,364 inflection keys
  - High-precision CEFR A1-B1 vocabulary, grammar terminology, administrative compounds
  - Strict precedence over fallback
          ↓ (if not found in Tier 1)
  [Tier 2: Legacy Kaikki/Wiktionary Fallback]
  - 15,092 headwords, 114,847 inflection keys
  - Protected by pinned SHA-256 integrity checksums
          ↓ (if not found in Tier 2)
  [Stage 4: Morphological Suffix Stripping]
  - Restricted by POS compatibility guard (adj, verb, num only)
  - Pure nouns, adverbs, and closed-class words cannot serve as spurious targets
          ↓
  [Stage 5: Compositional Decomposition]
  - Productive patterns (Lieblings- + Noun, Street names ending in -straße)
          ↓ (if unresolved)
  Returns null -> Displays "Word not found" in tooltip (Zero hallucinated translations)
```

---

## 2. Source Files & Authoring Guidelines

All new dictionary content is authored exclusively in [`data-source/authoring/`](file:///c:/Users/rajat/OneDrive/Documents/Projects/PDFLanguageCompanion/data-source/authoring/):

| File Path | Grammatical Scope | Count | Notes |
| :--- | :--- | :---: | :--- |
| [`data-source/authoring/nouns.json`](file:///c:/Users/rajat/OneDrive/Documents/Projects/PDFLanguageCompanion/data-source/authoring/nouns.json) | General & textbook nouns | 266 | Must include `gender` (`m`, `f`, `n`) and `plural` where applicable. |
| [`data-source/authoring/compounds.json`](file:///c:/Users/rajat/OneDrive/Documents/Projects/PDFLanguageCompanion/data-source/authoring/compounds.json) | Bureaucratic & literary compounds | 42 | Includes components, domain metadata, and explicit declensions. |
| [`data-source/authoring/verbs.json`](file:///c:/Users/rajat/OneDrive/Documents/Projects/PDFLanguageCompanion/data-source/authoring/verbs.json) | Strong & weak verbs | 127 | Principal parts in `inflections` (e.g. `ging`, `gegangen`). |
| [`data-source/authoring/adjectives.json`](file:///c:/Users/rajat/OneDrive/Documents/Projects/PDFLanguageCompanion/data-source/authoring/adjectives.json) | Base & participial adjectives | 83 | Comparative/superlative and standard declensions. |
| [`data-source/authoring/adverbs.json`](file:///c:/Users/rajat/OneDrive/Documents/Projects/PDFLanguageCompanion/data-source/authoring/adverbs.json) | Pure adverbs & particles | 67 | Uninflected German adverbs (e.g. *oft*, *manchmal*, *heute*). |
| [`data-source/authoring/closed_class.json`](file:///c:/Users/rajat/OneDrive/Documents/Projects/PDFLanguageCompanion/data-source/authoring/closed_class.json) | Pronouns, determiners, prepositions | 121 | Explicit case variants and contractions (*im*, *am*, *beim*). |

---

## 3. How to Add a New Translation Safely

### 3.1 Noun Entry Example
```json
{
  "headword": "Mietvertrag",
  "pos": "noun",
  "gender": "m",
  "plural": "Mietverträge",
  "cefr": "A2",
  "translations": [
    "rental agreement",
    "lease contract"
  ],
  "inflections": [
    "Mietvertrags",
    "Mietvertrages",
    "Mietverträgen"
  ],
  "provenance": {
    "author": "pdf-language-companion-team",
    "method": "independent_lexicography",
    "reviewStatus": "verified"
  }
}
```

### 3.2 Verb Entry Example
```json
{
  "headword": "schlafen",
  "pos": "verb",
  "cefr": "A1",
  "translations": [
    "to sleep"
  ],
  "inflections": [
    "schläft",
    "schlief",
    "geschlafen"
  ],
  "provenance": {
    "author": "pdf-language-companion-team",
    "method": "independent_lexicography",
    "reviewStatus": "verified"
  }
}
```

### 3.3 Adjective Entry Example
```json
{
  "headword": "gemahlen",
  "pos": "adj",
  "cefr": "B1",
  "translations": [
    "ground",
    "milled"
  ],
  "inflections": [
    "gemahlene",
    "gemahlenem",
    "gemahlenen",
    "gemahlener",
    "gemahlenes"
  ],
  "provenance": {
    "author": "pdf-language-companion-team",
    "method": "independent_lexicography",
    "reviewStatus": "verified"
  }
}
```

---

## 4. Compilation Pipeline & Asset Locations

To compile authored changes into production assets, run:
```powershell
npm run pilot:build
```
This script executes [`scripts/build-authored-dictionary.mjs`](file:///c:/Users/rajat/OneDrive/Documents/Projects/PDFLanguageCompanion/scripts/build-authored-dictionary.mjs):
1. Pre-validates schema, homographs, and review statuses across all 6 authoring files.
2. Normalizes senses and compiles explicit inflections (merging multi-file entries like `sein`).
3. Lexicographically sorts all headwords and inflection keys for deterministic byte-level reproducibility.
4. Derives content SHA-256 hashes and creates a deterministic dataset version (`1.0.0-<contentHash>`).
5. Emits synchronized assets to:
   - `dist-pilot/`: `de-en-dictionary.json`, `de-en-inflections.json`, `de-en-metadata.json`, `de-en-manifest.json`
   - `public/data/`: `authored-de-en-dictionary.json`, `authored-de-en-inflections.json`, `authored-de-en-metadata.json`, `authored-de-en-manifest.json`

When `npm run build` runs, Vite automatically packages `public/data/*` into `dist/data/*`.

---

## 5. Protected Files (NEVER Edit Directly)

> [!CAUTION]
> The following legacy files are protected by pinned SHA-256 integrity checksums and must **NEVER** be modified directly:
> - `public/data/de-en-dictionary.json` (SHA-256: `ddc6a8dad7aa23f00fa9b9ca325f6cb23f77ece742cb2091b0ee52b4a0812412`)
> - `public/data/de-en-inflections.json` (SHA-256: `d18bb2d36d64979fbce8ea4e358c8b1800aa53a4c7c1953dc7e3457df7ab3a28`)
> - `public/data/de-en-metadata.json` (SHA-256: `43021c260a9f63abf121a66d390d2d8e633497d23a0b9825161047651478e201`)
>
> If a legacy entry is inaccurate or missing a sense, **author the headword in `data-source/authoring/`**. The composite provider will prioritize the authored entry over the legacy entry at runtime.

---

## 6. Release Gate & Validation Workflow

Before tagging or deploying any dictionary release, run the consolidated release gate:

```powershell
npm run release:gate
```
or
```powershell
node scripts/run-dictionary-release-gate.mjs
```

This executes 8 verification suites in sequence:
1. `scripts/verify-dictionary-release-gate.mjs`: Validates schema, hashes, manifest, asset parity, reproducibility, and sandboxed tamper detection.
2. `scripts/verify-phase3-3-morphological-compatibility.mjs`: Validates Stage 4 POS guard, 13 canonical suffixes, and negative contracts.
3. `scripts/verify-phase3-1-quality-audit.mjs`: Validates translation accuracy and independent 24-token test set.
4. `scripts/verify-phase3-compounds-domain.mjs`: Validates compounds, domain vocabulary, and 5-genre benchmark (467 tokens, 100%).
5. `scripts/test-composite-provider.mjs`: Validates authored precedence, fallback, and error discrimination.
6. `scripts/verify-phase7-integration.mjs`: Validates hook integration seam and offline invariants.
7. `scripts/verify-dictionary.mjs`: Validates legacy Kaikki snapshot integrity.
8. `scripts/verify-phase4-pdf-acceptance.mjs`: Validates in-browser PDF textLayer selection, Floating UI positioning, and negative contracts via Chrome CDP.

---

## 7. Troubleshooting Common Build & Release Issues

| Error / Symptom | Root Cause | Solution |
| :--- | :--- | :--- |
| **`dictSha256 mismatch` in release gate** | Production dictionary files in `public/data/` or `dist-pilot/` were edited manually without recompiling the manifest. | Run `npm run pilot:build` to regenerate the compiled assets and manifest cleanly from authoring sources. |
| **`Multi-file homonym detected`** | Same headword appears across different authoring files with conflicting POS. | Ensure the headword is intended to be polysemous (e.g. `sein` as determiner and verb). If unintended, delete the duplicate from the wrong file. |
| **`Legacy asset matches pinned hash: FAIL`** | A legacy dictionary file was touched or reformatted. | Restore the legacy file from git (`git checkout public/data/de-en-*`). Never edit legacy files. |
| **`Chrome CDP connection failed on port 9228`** | Port 9228 is in use or Chrome executable path is missing. | Ensure Chrome is installed at standard location (`C:\Program Files\Google\Chrome\Application\chrome.exe`) or set `CHROME_BIN` environment variable. |
| **`headwordsCount mismatch in manifest`** | Manifest headwords count doesn't match compiled dictionary keys. | Run `npm run pilot:build` followed by `npm run build`. |
