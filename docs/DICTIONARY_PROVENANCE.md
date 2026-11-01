# LingoPDF — Authored German-English Dictionary Provenance Document

**Document Version:** 1.0.0  
**Date of Record:** November 1, 2026  
**Status:** Certified Audit Baseline  
**Product:** LingoPDF Browser Extension  
**Audited Component:** Independently Authored German–English Learner Dictionary (Tier 1 Primary Provider)

---

## 1. Product and Dataset Identification

LingoPDF incorporates an independently authored German-to-English vocabulary database created specifically for language learners. This dataset acts as the primary offline translation provider (`authoredDictionaryProvider`), taking strict precedence over the secondary Wiktionary fallback dataset.

### 1.1 Dataset Metadata & Versioning
- **Dataset Name:** PDF Language Companion — Independently Authored German-English Learner Dictionary
- **Declared License:** `Proprietary / Independently Authored`
- **Declared Attribution:** `Authored by PDF Language Companion lexicography team`
- **Dataset Version:** `1.0.0-ecd7c8ecd5`
- **Content Checksum (SHA-256):** `ecd7c8ecd5fb0de844e4fceff7859cc7e6448449e0f9f3c7a2f0cac4efe1e6fb`
- **Build Timestamp:** `2026-10-29T15:24:45.038Z`

### 1.2 Quantitative Entry Metrics
- **Unique Canonical Headwords:** `705`
- **Total Lexical Senses:** `721`
- **Unique Inflection Keys:** `2,364`
- **Compound Entries:** `42` (integrated directly into the canonical headword index)
- **Nouns with Verified Gender:** `308` (`masculine`: 112, `feminine`: 128, `neuter`: 68)
- **Nouns with Verified Plurals:** `279` (remaining 29 are uncountable mass nouns)
- **Review Status Distribution:** `499 verified`, `207 reviewed`

### 1.3 File Inventory & Checksums

#### A. Raw Authoring Source Files (`data-source/authoring/`)
These files represent the human-authored source of truth:
1. `data-source/authoring/nouns.json` — 263 raw entries (185,572 bytes)
2. `data-source/authoring/verbs.json` — 127 raw entries (100,528 bytes)
3. `data-source/authoring/closed_class.json` — 148 raw entries (84,411 bytes)
4. `data-source/authoring/adjectives.json` — 81 raw entries (55,274 bytes)
5. `data-source/authoring/adverbs.json` — 45 raw entries (29,881 bytes)
6. `data-source/authoring/compounds.json` — 42 raw entries (31,987 bytes)
*Total raw source records:* 706 (Homograph `sein` defined as determiner in `closed_class.json` and verb in `verbs.json` merges into 1 headword during build).

#### B. Compiled Distribution Assets (`public/data/` and `dist/data/`)
Deterministic JSON assets bundled into the extension package:
1. `public/data/authored-de-en-dictionary.json`  
   - *Size:* 132,651 bytes  
   - *SHA-256:* `dd0c3e6e21cd276bb63366ec016f2ef4ab6ad85874469cd95f2ee425884f1921`
2. `public/data/authored-de-en-inflections.json`  
   - *Size:* 61,327 bytes  
   - *SHA-256:* `4d619e88ed3624104e276a400c53a4f16a7f053afb26fa6f21ebb936d6e38113`
3. `public/data/authored-de-en-manifest.json`  
   - *Size:* 1,053 bytes  
   - *SHA-256:* `6535c4c8590c95ed19bd327dfdfdea2b1ac3362444824cb204f8999e12bbab3d`
4. `public/data/authored-de-en-metadata.json`  
   - *Size:* 1,131 bytes  
   - *SHA-256:* `2298efe4ce1a9eb6411e6a018ed60e24951c78bd087d63b994f2ea4d99099beb`

---

## 2. Authoring Methodology

Based on repository evidence, generation scripts (`scripts/generate-candidate-seeds.mjs`, `scripts/build-candidate-inventory.mjs`, `scripts/build-authored-dictionary.mjs`), and Git commit history, the methodology used to create the dictionary is documented below.

### 2.1 Vocabulary Selection
- **Corpus Frequency Basis:** Candidate lemmas were selected using objective, non-copyrightable corpus frequency metrics stored in `data-source/candidates/seeds/candidate-seeds.json`.
- **Ranking Weights:** Ranked via `scripts/build-candidate-inventory.mjs` using a transparent 5-factor scoring model:
  - 35% Corpus frequency evidence (DWDS band, Leipzig class, SUBTLEX-DE Zipf)
  - 25% Grammatical role & closed-class necessity (conjunctions, prepositions, particles)
  - 15% CEFR pedagogical alignment (focusing on A1 and A2 beginner needs)
  - 15% Morphological productivity (productive roots and compound prefixes)
  - 10% Domain and register breadth (daily life, administrative, spoken)
- **Pedagogical Prioritization:** Selection specifically prioritized high-utility language learner vocabulary, everyday German administrative terms (*Anmeldung*, *Meldebehörde*, *Wohnungsgeber*, *Mietvertrag*), and German textbook grammatical markers.

### 2.2 Translation and Sense Definition Preparation
- **Translation Style:** English translations are concise, direct equivalents designed for instantaneous in-situ reader comprehension (e.g., *Haus* -> `["house", "building", "home"]`).
- **Disambiguation Tags:** Contextual parentheticals were authored to disambiguate polysemous words for learners (e.g., *Anzug* -> `["suit (clothing)"]`, *Artikel* -> `["article (grammar)", "article (text)"]`, *Arzt* -> `["doctor (male)", "physician"]`).
- **Absence of Descriptive Text in Distribution:** Unlike Wiktionary or commercial encyclopedic dictionaries, the compiled runtime asset (`authored-de-en-dictionary.json`) contains zero explanatory sentences, etymology blocks, or usage essays. It contains only headword, POS, translations, and noun grammatical markers.
- **Specific Lexicographer Identities:** `NEEDS CONFIRMATION` (Git commit authors are known, but individual word-by-word author logs were not maintained).

### 2.3 Grammatical Information Recording
- **Grammatical Gender:** Assigned based on standard German grammatical rules (`m`, `f`, `n`).
- **Plural Paradigms:** Authored with explicit plural forms (*Häuser*, *Bücher*, *Frauen*, *Männer*, *Autos*).
- **Part of Speech:** Tagged with standardized linguistic abbreviations (`noun`, `verb`, `adj`, `adv`, `pron`, `prep`, `conj`, `part`, `det`, `art`, `num`, `interj`, `prep+art`).
- **Nature of Information:** Pure factual linguistics of the German language; not subject to copyright.

### 2.4 Inflections and Compounds Generation
- **Explicit Inflection Indexing:** 2,364 inflection keys were created by mapping explicit case variants (e.g. *Hauses*, *Hause*, *Häusern*) and verb conjugations (e.g. *schläft*, *schlief*, *geschlafen*) to the canonical lemma.
- **Compounds:** 42 high-frequency compounds were composed and verified for beginner readers.
- **Lowercase Collision Resolution:** The compilation pipeline deterministically indexes lowercase forms while preserving uppercase entries, ensuring case-insensitive PDF selection works reliably.

### 2.5 External Linguistic References Consulted
- **Statistical Frequency Databases:** DWDS (Berlin-Brandenburg Academy of Sciences), Leipzig Corpora Collection, and SUBTLEX-DE were consulted for statistical ranking counts only.
- **Curriculum Frameworks:** CEFR (Common European Framework of Reference for Languages) proficiency descriptors.
- **External Lexicons:** `NEEDS CONFIRMATION` (Whether contributors consulted reference lexicons for verification of translations requires contributor declarations).

---

## 3. Contributor Register

The following register identifies all individuals and entities associated with the authored dictionary based on verifiable Git commit logs and source metadata.

| Contributor / Entity | Git Identity & Contact | Contribution Scope | Primary Evidence in Repository | Legal & Confirmation Status |
|---|---|---|---|---|
| **Rajat2417** | `Rajat2417 <rajatdeepsingh2417@gmail.com>` | Initial authoring and schema creation of core entries across all 6 authoring files | Commit `f63cf00` (2026-10-26): Created `data-source/authoring/*.json` (15,835 lines added) | **Confirmed via Git**; Needs signed Authorship Declaration |
| **developersmindfulapps** | `developersmindfulapps <developers.mindfulapps@gmail.com>` | Vocabulary expansion, compound definitions, baseline stabilization, and release gate checks | Commit `7535519` (2026-10-31): Added 3,312 lines across all 6 authoring files | **Confirmed via Git**; Needs signed Authorship Declaration |
| **PDF Language Companion Lexicography Team** | Collective Team Entity | Declared in metadata as collective author (`"author": "pdf-language-companion-team"`) | Stored in `provenance.author` across all 706 JSON records; `manifest.json` attribution | **Declared in Metadata**; Formal corporate identity/employment linkage `NEEDS CONFIRMATION` |

---

## 4. Third-Party Source Register

The following register documents external resources identified during the Phase 3.3 audit, categorizing their relationship to the authored dictionary:

| Source / Resource | Organization / Maintainer | Role / Influence on Authored Dictionary | Copied or Adapted Text? | License / Status |
|---|---|---|---|---|
| **DWDS Frequency Corpus** | Berlin-Brandenburgische Akademie der Wissenschaften | Consulted for statistical word frequency bands (1–6) in seed generation | **None.** Only numerical frequency statistics were used. | Open Access Academic / Factual data |
| **Leipzig Corpora Collection** | Universität Leipzig (Wortschatz) | Consulted for frequency classes (0–20) in seed generation | **None.** Only numerical frequency statistics were used. | Open Access Academic / Factual data |
| **SUBTLEX-DE** | Brysbaert et al. (2011) | Consulted for Zipf frequency scores (1.0–7.0) in seed generation | **None.** Only numerical frequency statistics were used. | Open Research Data / Factual data |
| **CEFR Profiles** | Council of Europe / Goethe-Institut | Used to classify pedagogical levels (A1, A2, B1) | **None.** Standard pedagogical taxonomy. | Public educational standard |
| **English Wiktionary (via Kaikki.org)** | Wikimedia Foundation / Tatu Ylonen | Bundled as a **separate, secondary fallback dataset** (`de-en-dictionary.json`). **206 authored words do not exist in the Wiktionary dump.** | **None.** 403 shared words have completely distinct translations. 96 words match only because they are direct 1:1 cognates (*Bus*, *Hotel*, *Freitag*). | CC BY-SA 4.0 / GFDL (Confined strictly to secondary fallback) |
| **Standard German Dictionaries (Duden/PONS/Langenscheidt)** | Commercial Publishers | `NEEDS CONFIRMATION` (Whether lexicographers consulted commercial dictionaries as reference aids during translation drafting) | **No verbatim copied definitions found.** Full-text regex search confirmed zero matches for publisher trademarks or long prose definitions. | Proprietary (No infringement detected) |

---

## 5. Licensing and Ownership Assessment

### 5.1 Intellectual Property Position
1. **Compilation Copyright:**  
   The authored dictionary represents an original pedagogical selection and arrangement of 705 German words, inflections, and grammatical tags tailored specifically for beginner and intermediate PDF readers. This selection is protected as a compilation under international copyright law (Berne Convention Art. 2(5); US 17 U.S.C. § 103).
2. **Merger Doctrine (Basic Translations):**  
   Under US and European copyright doctrine, direct 1:1 translations of factual words (e.g. *Freitag* = "Friday", *Apfel* = "apple") are non-copyrightable because the expression merges with the underlying fact. No third party can monopolize the direct English translation of a basic German word.
3. **Absence of ShareAlike Contamination:**  
   The authored dictionary was compiled independently of the legacy Wiktionary dataset. It is stored in separate files, loaded via a distinct provider, and contains vocabulary absent from Wiktionary. It is **not an Adapted Material** of Wiktionary and is entirely free of CC BY-SA 4.0 or GFDL obligations.

### 5.2 Ownership Evidence Gaps & Legal Questions
While technical evidence confirms independent creation:
- **Missing Written IP Assignments:** The repository does not contain signed Contributor IP Assignment Agreements transferring the copyright from `Rajat2417` and `developersmindfulapps` to the commercial operating entity.
- **Work-for-Hire Status:** Whether contributions were made as employees (where copyright vests automatically in the employer under applicable labor law) or as independent contractors (where written assignment is required) requires formal corporate documentation.
- **Legal Review Required:** Qualified intellectual property counsel must review the completed Contributor Declarations and confirm full title vesting prior to commercial licensing.

---

## 6. Document Certification & Non-Modification Statement

This document was prepared in a read-only audit environment. No dictionary files, entries, inflections, checksums, or application code were modified during its creation.

- `public/data/authored-de-en-dictionary.json` SHA-256: `dd0c3e6e21cd276bb63366ec016f2ef4ab6ad85874469cd95f2ee425884f1921`
- `public/data/authored-de-en-inflections.json` SHA-256: `4d619e88ed3624104e276a400c53a4f16a7f053afb26fa6f21ebb936d6e38113`
- *Dataset Status:* **FROZEN & VERIFIED.**
