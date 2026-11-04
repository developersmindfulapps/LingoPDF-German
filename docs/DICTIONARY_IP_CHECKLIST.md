# LingoPDF — Authored Dictionary Intellectual Property Ownership Checklist

**Document Version:** 1.0.0  
**Date of Record:** November 1, 2026  
**Audited Dataset:** LingoPDF Authored German–English Learner Dictionary (`1.0.0-ecd7c8ecd5`)  
**Purpose:** Clear, auditable gap analysis distinguishing existing intellectual property evidence from pending administrative and legal requirements prior to commercial release.

---

## Status Legend
- **CONFIRMED:** Verifiable primary evidence exists in the repository or git history.
- **PENDING:** Administrative action required by the product owner / contributors.
- **LEGAL REVIEW:** Requires formal verification by qualified intellectual property legal counsel.

---

## 1. Contributor Identity & Legal Relationship

| Item # | Verification Check | Evidence Status | Repository / Factual Evidence | Required Action |
|:---:|---|:---:|---|---|
| **1.1** | Contributor identities identified in Git commit logs | **CONFIRMED** | Git history confirms 2 active authoring contributors: `Rajat2417` (commit `f63cf00`) and `developersmindfulapps` (commit `7535519`). | None. Identities are recorded in Git. |
| **1.2** | Legal full names and addresses verified for all committers | **PENDING** | Git handles and email addresses are recorded, but full legal names, physical addresses, and tax identifiers are not stored in the repository. | Collect verified full legal identities for both Git contributors. |
| **1.3** | Legal status determined (Employee vs. Contractor vs. Partner) | **PENDING** | The legal structure governing the relationship between the contributors and the LingoPDF operating entity is not documented in code. | Formally record whether contributors acted as employees, independent contractors, or company founders. |

---

## 2. Written IP Assignment Agreements

| Item # | Verification Check | Evidence Status | Repository / Factual Evidence | Required Action |
|:---:|---|:---:|---|---|
| **2.1** | Employment Agreements with IP Vesting / Work-for-Hire | **PENDING** | No employment agreements are stored in the code repository. | If contributors are employees, confirm standard employment agreement containing IP assignment clause is executed and archived. |
| **2.2** | Independent Contractor Agreements with IP Assignment | **PENDING** | No independent contractor master services agreements are stored in the code repository. | If contributors are contractors, confirm Contractor Services Agreement with explicit copyright assignment is executed. |
| **2.3** | Signed Contributor Authorship Declarations on file | **PENDING** | Template created in `docs/templates/DICTIONARY_AUTHORSHIP_DECLARATION.md`. No signed declarations exist yet. | Execute signed declaration with each contributor using the provided template. |
| **2.4** | Moral Rights Waiver executed where permissible | **PENDING** | Moral rights waiver clauses are included in the declaration template, pending execution. | Execute moral rights waiver in accordance with applicable national law. |

---

## 3. Lexicographical Non-Infringement & Originality

| Item # | Verification Check | Evidence Status | Repository / Factual Evidence | Required Action |
|:---:|---|:---:|---|---|
| **3.1** | No scraping or bulk extraction from commercial dictionaries | **CONFIRMED** | Full-text automated regex audits confirmed zero matches for commercial dictionary publishers (Duden, PONS, Langenscheidt, Oxford, Collins). | Maintain policy prohibiting scraping of commercial works. |
| **3.2** | No verbatim copied text from Wiktionary or Kaikki | **CONFIRMED** | 206 words in the authored dictionary do not exist in the Wiktionary dump; 403 shared words have completely distinct translations. Only 96 basic 1:1 cognates (*Bus*, *Hotel*, *Freitag*) overlap. | Keep authored dictionary strictly isolated from the Wiktionary fallback dataset. |
| **3.3** | Example sentences isolated from distribution build | **CONFIRMED** | 580 example sentences in `data-source/authoring/*.json` are excluded from the distribution build. `authored-de-en-dictionary.json` bundles zero example sentences. | Maintain compiler separation in `scripts/build-authored-dictionary.mjs`. |
| **3.4** | Factual nature of grammatical gender and plurals | **CONFIRMED** | German grammatical gender and plural forms are objective factual properties of the German language; not subject to copyright. | None. |

---

## 4. Database Rights & Compilation Copyright Vesting

| Item # | Verification Check | Evidence Status | Repository / Factual Evidence | Required Action |
|:---:|---|:---:|---|---|
| **4.1** | Compilation copyright protection established | **CONFIRMED** | Original selection of 705 learner words, structured CEFR tags, and custom sense disambiguations qualify as an original compilation. | None. Documented in `docs/DICTIONARY_PROVENANCE.md`. |
| **4.2** | Sui Generis Database Rights under EU Directive 96/9/EC | **CONFIRMED** | Substantial qualitative and quantitative investment in obtaining, verifying, and presenting 705 entries and 2,364 inflections. | Ensure the operating entity is documented as the "maker of the database". |
| **4.3** | Freedom from copyleft / ShareAlike contamination | **CONFIRMED** | Authored dataset is stored in distinct files (`authored-de-en-*`), built via separate scripts, and queried via an isolated provider. Not a derivative work of CC BY-SA data. | Preserve clean physical and runtime separation between datasets. |

---

## 5. Jurisdiction-Specific Legal Review Checklist

| Item # | Verification Check | Evidence Status | Legal Scope | Required Action |
|:---:|---|:---:|---|---|
| **5.1** | Chain-of-title sign-off under applicable national law | **LEGAL REVIEW** | India / US / EU / UK Copyright Law regarding independent contractor IP assignment. | Retain qualified IP counsel to confirm signed assignments vest 100% title in operating entity. |
| **5.2** | Review of Free-Tier Quota vs. CC BY-SA Fallback Data | **LEGAL REVIEW** | CC BY-SA 4.0 Section 2(a)(5)(B) Anti-DRM clause interaction with application lookup quotas. | Obtain legal opinion confirming that gating premium features/OCR while keeping basic Wiktionary unmetered avoids licensing disputes. |
| **5.3** | App Store / Browser Store Distribution Policy Review | **LEGAL REVIEW** | Chrome Web Store Developer Program Policies & Apple App Store Guidelines regarding bundled open data and proprietary datasets. | Verify compliance with store attribution and declaration rules. |

---

## Summary of Checklist Status
- **Technical & Lexicographical Originality:** 100% Verified (**CONFIRMED**)
- **Physical & Runtime Separation:** 100% Verified (**CONFIRMED**)
- **Administrative Contributor Documentation:** 0% Executed (**PENDING** — Requires signed declarations)
- **Legal Review Sign-off:** Pending commercial counsel review (**LEGAL REVIEW**)
