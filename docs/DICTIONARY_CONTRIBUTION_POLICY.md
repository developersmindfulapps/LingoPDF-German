# LingoPDF — Authored Dictionary Contribution Policy

**Policy Version:** 1.0.0  
**Effective Date:** November 1, 2026  
**Scope:** Governing all future contributions, additions, modifications, and expansions to LingoPDF's authored dictionary datasets.  
**Notice:** *This document defines mandatory governance policies for future dictionary authoring. It does not authorize dictionary modifications or expansions for the current release phase.*

---

## 1. Purpose & Core Principles

LingoPDF's authored dictionary is a proprietary commercial asset. To protect the product from intellectual property disputes, copyright infringement claims, and copyleft (ShareAlike) contamination, all future contributions must adhere to three non-negotiable principles:

1. **Strict Independent Authorship:** Every translation, definition, and example must be independently authored. Scraping, copying, or adapting text from third-party commercial dictionaries, web services, or LLM outputs with unverified training sets is strictly prohibited.
2. **Total Traceability & Provenance:** Every single lexical entry must record its human author, creation date, review status, and methodology in structured metadata.
3. **Clear Chain-of-Title:** No contribution will be accepted into the repository without an executed Contributor Authorship Declaration and IP Assignment Agreement.

---

## 2. Contributor Onboarding & Legal Prerequisite

Before any contributor (employee, contractor, or partner) may submit entries to `data-source/authoring/`:

1. **Identity Verification:** The contributor's legal identity, physical address, and associated Git commit email addresses must be recorded in the company's internal Contributor Register.
2. **Executed IP Agreement:** The contributor must execute either:
   - An Employment Agreement with standard IP vesting/work-for-hire provisions; or
   - An Independent Contractor Master Services Agreement with an irrevocable, worldwide copyright assignment clause; and
   - A signed **Contributor Authorship Declaration** (`docs/templates/DICTIONARY_AUTHORSHIP_DECLARATION.md`).
3. **No Anonymous Submissions:** Commits signed by untracked or pseudonymous accounts will be automatically rejected by pre-commit hooks and CI gates.

---

## 3. Independent Lexicography Standards

### 3.1 Prohibited Practices
Contributors must **NOT**:
- Copy, scrape, or extract entries from commercial dictionaries (Duden, PONS, Langenscheidt, Oxford, Collins, Cambridge, Leo, etc.).
- Copy definitions or translations from open-source or copyleft datasets (Wiktionary, Kaikki, FreeDict, OpenThesaurus).
- Use machine translation APIs (Google Translate, DeepL) to auto-generate dictionary entries without independent lexicographical composition.
- Import bulk vocabulary lists without establishing origin and licensing.

### 3.2 Permitted Practices
Contributors **MAY**:
- Consult factual corpus frequency data (DWDS, Leipzig, SUBTLEX-DE) to determine which words language learners need most.
- Refer to standard pedagogical curriculum guidelines (Goethe-Institut, telc, CEFR A1–C1 profiles) to prioritize vocabulary difficulty.
- Verify objective grammatical facts (standard grammatical gender, irregular verb principal parts, plural endings) using standard public-domain reference grammars.
- Compose original, concise English translations, disambiguating senses based on learner context.
- Compose original, simple pedagogical example sentences.

---

## 4. Metadata and Provenance Requirements for Every Entry

Every JSON object added to `data-source/authoring/*.json` must include a mandatory `provenance` block conforming to the following JSON schema:

```json
{
  "headword": "Beispielwort",
  "pos": "noun",
  "gender": "n",
  "plural": "Beispielwörter",
  "cefr": "A2",
  "translations": [
    "example translation"
  ],
  "examples": [
    {
      "de": "Dies ist ein originales Beispielsatz.",
      "en": "This is an original example sentence."
    }
  ],
  "inflections": [
    "beispielwortes",
    "beispielworte"
  ],
  "provenance": {
    "authorId": "CONTRIBUTOR_ID",
    "author": "Full Contributor Name or Handle",
    "method": "independent_lexicography",
    "reviewStatus": "pending_review",
    "created": "YYYY-MM-DD",
    "referenceNotes": "Grammatical confirmation via standard Duden grammar rules; original pedagogical translation."
  }
}
```

### Required Fields:
- `authorId`: The contributor's verified identifier in the internal Contributor Register.
- `method`: Must be `"independent_lexicography"`.
- `reviewStatus`: Initially set to `"pending_review"`. Promoted to `"reviewed"` or `"verified"` only after secondary review.
- `created`: ISO 8601 date format (`YYYY-MM-DD`).

---

## 5. Review & Approval Process

All proposed dictionary changes must proceed through a multi-stage review before merging into `main`:

```text
[Contributor Drafts Entry]
           ↓
[Pre-commit Schema & Metadata Validation]
           ↓
[Pull Request Submitted to staging-dictionary branch]
           ↓
[Automated Lexical Overlap & Scraper Audit]
  - Regex check against commercial dictionary brand strings
  - Overlap analysis against Wiktionary dump
           ↓
[Peer Lexicographical Review]
  - Verification of translation accuracy and pedagogical tone
  - Verification of gender, plural, and inflection completeness
           ↓
[Lead Lexicographer / Legal Sign-off]
  - Status promoted from "pending_review" to "verified"
           ↓
[Compilation & Release Gate]
  - `npm run pilot:validate` passes with 0 errors
  - `npm run release:gate` passes all 8 test suites
```

---

## 6. Prohibited Bulk Ingestion

No bulk-generation or batch-import script may write directly to `data-source/authoring/*.json`. Batch generation tools (such as `scripts/build-candidate-inventory.mjs`) are permitted **only** to identify candidate lemma targets for human authoring in `data-source/candidates/batches/`. All definitions and translations must be composed and verified by human lexicographers.

---

## 7. Change History & Versioning

- Every change to `data-source/authoring/` requires a semantic version increment in `public/data/authored-de-en-manifest.json`.
- The compilation pipeline automatically recomputes the SHA-256 `contentChecksum` across all normalized entries.
- The Git commit message must explicitly reference the Contributor Authorship Declaration on file for that batch (e.g., `feat(dict): add A2 transportation vocabulary [Authored by Contributor #04]`).
