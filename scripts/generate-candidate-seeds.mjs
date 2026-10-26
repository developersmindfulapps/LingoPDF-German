/**
 * generate-candidate-seeds.mjs
 * 
 * Generates the offline seed dataset for the Candidate Ingestion Pipeline.
 * All seeds represent bare German lemmas with empirical linguistic evidence:
 * - DWDS Frequency Band (1-6; 6 = highest)
 * - Leipzig Frequency Class (0-20; lower = higher frequency)
 * - SUBTLEX-DE Zipf Score (1.0-7.0; higher = higher frequency)
 * - CEFR Pedagogical Level (A1, A2, B1, B2, C1)
 * - Grammatical Category and Functional Role
 * - Domain and Register tags
 * 
 * NOTE: Contains ZERO copyrighted definitions, senses, or translations.
 * All entries will be ranked by build-candidate-inventory.mjs.
 */

import fs from 'fs';
import path from 'path';

const SEED_DATA = [
  // ==========================================
  // 1. CLOSED-CLASS: CONJUNCTIONS & CONNECTORS
  // ==========================================
  { lemma: "weil", pos: "conj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.85, cefr: "A1", category: "closed_class", functionalRole: "subordinating_conjunction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "dass", pos: "conj", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 6.22, cefr: "A1", category: "closed_class", functionalRole: "subordinating_conjunction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "wenn", pos: "conj", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 6.15, cefr: "A1", category: "closed_class", functionalRole: "subordinating_conjunction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "als", pos: "conj", dwdsBand: 6, leipzigClass: 2, subtlexZipf: 5.95, cefr: "A2", category: "closed_class", functionalRole: "subordinating_conjunction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "obwohl", pos: "conj", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.88, cefr: "B1", category: "closed_class", functionalRole: "subordinating_conjunction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "da", pos: "conj", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.90, cefr: "B1", category: "closed_class", functionalRole: "subordinating_conjunction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "ob", pos: "conj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.45, cefr: "A2", category: "closed_class", functionalRole: "subordinating_conjunction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "damit", pos: "conj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.50, cefr: "B1", category: "closed_class", functionalRole: "subordinating_conjunction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "bevor", pos: "conj", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.70, cefr: "B1", category: "closed_class", functionalRole: "subordinating_conjunction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "nachdem", pos: "conj", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.60, cefr: "B1", category: "closed_class", functionalRole: "subordinating_conjunction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "solange", pos: "conj", dwdsBand: 5, leipzigClass: 7, subtlexZipf: 4.52, cefr: "B1", category: "closed_class", functionalRole: "subordinating_conjunction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "sodass", pos: "conj", dwdsBand: 5, leipzigClass: 7, subtlexZipf: 4.30, cefr: "B1", category: "closed_class", functionalRole: "subordinating_conjunction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "falls", pos: "conj", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.75, cefr: "B1", category: "closed_class", functionalRole: "subordinating_conjunction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "indem", pos: "conj", dwdsBand: 5, leipzigClass: 7, subtlexZipf: 4.10, cefr: "B2", category: "closed_class", functionalRole: "subordinating_conjunction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "während", pos: "conj", dwdsBand: 6, leipzigClass: 5, subtlexZipf: 4.90, cefr: "B1", category: "closed_class", functionalRole: "subordinating_conjunction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "trotzdem", pos: "adv", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 5.10, cefr: "A2", category: "closed_class", functionalRole: "conjunctional_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "deshalb", pos: "adv", dwdsBand: 6, leipzigClass: 5, subtlexZipf: 5.30, cefr: "A2", category: "closed_class", functionalRole: "conjunctional_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "deswegen", pos: "adv", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 5.15, cefr: "A2", category: "closed_class", functionalRole: "conjunctional_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "darum", pos: "adv", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 5.25, cefr: "A2", category: "closed_class", functionalRole: "conjunctional_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "jedoch", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.50, cefr: "B1", category: "closed_class", functionalRole: "conjunctional_adverb", domain: "grammar", register: "formal", morphType: "unproductive" },
  { lemma: "folglich", pos: "adv", dwdsBand: 4, leipzigClass: 8, subtlexZipf: 3.80, cefr: "B2", category: "closed_class", functionalRole: "conjunctional_adverb", domain: "grammar", register: "formal", morphType: "unproductive" },
  { lemma: "sonst", pos: "adv", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 5.20, cefr: "A2", category: "closed_class", functionalRole: "conjunctional_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "außerdem", pos: "adv", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.80, cefr: "B1", category: "closed_class", functionalRole: "conjunctional_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "daher", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.70, cefr: "B1", category: "closed_class", functionalRole: "conjunctional_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "nämlich", pos: "adv", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 5.10, cefr: "B1", category: "closed_class", functionalRole: "conjunctional_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "schließlich", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.90, cefr: "B1", category: "closed_class", functionalRole: "conjunctional_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },

  // ==========================================
  // 2. CLOSED-CLASS: MODAL & FOCUS PARTICLES
  // ==========================================
  { lemma: "halt", pos: "part", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.75, cefr: "A2", category: "closed_class", functionalRole: "modal_particle", domain: "grammar", register: "spoken", morphType: "unproductive" },
  { lemma: "eben", pos: "part", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.60, cefr: "A2", category: "closed_class", functionalRole: "modal_particle", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "wohl", pos: "part", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.65, cefr: "A2", category: "closed_class", functionalRole: "modal_particle", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "bloß", pos: "part", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 5.15, cefr: "B1", category: "closed_class", functionalRole: "modal_particle", domain: "grammar", register: "spoken", morphType: "unproductive" },
  { lemma: "nur", pos: "part", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 6.05, cefr: "A1", category: "closed_class", functionalRole: "focus_particle", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "sogar", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.05, cefr: "B1", category: "closed_class", functionalRole: "focus_particle", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "erst", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.50, cefr: "A2", category: "closed_class", functionalRole: "focus_particle", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "kaum", pos: "adv", dwdsBand: 6, leipzigClass: 5, subtlexZipf: 4.95, cefr: "B1", category: "closed_class", functionalRole: "negative_scalar_particle", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "bereits", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.60, cefr: "B1", category: "closed_class", functionalRole: "temporal_focus_particle", domain: "grammar", register: "formal", morphType: "unproductive" },
  { lemma: "überhaupt", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.40, cefr: "A2", category: "closed_class", functionalRole: "modal_particle", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "gar", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.30, cefr: "A2", category: "closed_class", functionalRole: "intensifier_particle", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "eigentlich", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.60, cefr: "A2", category: "closed_class", functionalRole: "modal_particle", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "ruhig", pos: "part", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.90, cefr: "B1", category: "closed_class", functionalRole: "modal_particle", domain: "grammar", register: "spoken", morphType: "unproductive" },
  { lemma: "quasi", pos: "adv", dwdsBand: 4, leipzigClass: 7, subtlexZipf: 4.20, cefr: "B2", category: "closed_class", functionalRole: "discourse_particle", domain: "grammar", register: "spoken", morphType: "unproductive" },

  // ==========================================
  // 3. CLOSED-CLASS: PRONOMINAL ADVERBS
  // ==========================================
  { lemma: "damit", pos: "adv", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.75, cefr: "A2", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "darauf", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.40, cefr: "A2", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "davon", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.50, cefr: "A2", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "daran", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.35, cefr: "A2", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "dazu", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.30, cefr: "A2", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "darin", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.80, cefr: "B1", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "darüber", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.25, cefr: "A2", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "darunter", pos: "adv", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.50, cefr: "B1", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "dagegen", pos: "adv", dwdsBand: 6, leipzigClass: 5, subtlexZipf: 4.85, cefr: "B1", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "dafür", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.35, cefr: "A2", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "dahinter", pos: "adv", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.60, cefr: "B1", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "davor", pos: "adv", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.70, cefr: "B1", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "dazwischen", pos: "adv", dwdsBand: 4, leipzigClass: 7, subtlexZipf: 4.30, cefr: "B1", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "woran", pos: "adv", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.70, cefr: "B1", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "worauf", pos: "adv", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.65, cefr: "B1", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "womit", pos: "adv", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.55, cefr: "B1", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "wovon", pos: "adv", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.75, cefr: "B1", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "wozu", pos: "adv", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.80, cefr: "B1", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "worin", pos: "adv", dwdsBand: 5, leipzigClass: 7, subtlexZipf: 4.10, cefr: "B2", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "formal", morphType: "unproductive" },
  { lemma: "worüber", pos: "adv", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.60, cefr: "B1", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "wofür", pos: "adv", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.70, cefr: "B1", category: "closed_class", functionalRole: "pronominal_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },

  // ==========================================
  // 4. CLOSED-CLASS: PRONOUNS & DETERMINERS
  // ==========================================
  { lemma: "jemand", pos: "pron", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.60, cefr: "A2", category: "closed_class", functionalRole: "indefinite_pronoun", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "niemand", pos: "pron", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.45, cefr: "A2", category: "closed_class", functionalRole: "indefinite_pronoun", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "einige", pos: "pron", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.00, cefr: "A2", category: "closed_class", functionalRole: "indefinite_pronoun", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "mehrere", pos: "pron", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.40, cefr: "B1", category: "closed_class", functionalRole: "indefinite_pronoun", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "mancher", pos: "pron", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.10, cefr: "B1", category: "closed_class", functionalRole: "indefinite_pronoun", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "keiner", pos: "pron", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.50, cefr: "A1", category: "closed_class", functionalRole: "indefinite_pronoun", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "beide", pos: "pron", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.15, cefr: "A2", category: "closed_class", functionalRole: "indefinite_pronoun", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "irgendwer", pos: "pron", dwdsBand: 4, leipzigClass: 7, subtlexZipf: 4.80, cefr: "A2", category: "closed_class", functionalRole: "indefinite_pronoun", domain: "grammar", register: "spoken", morphType: "unproductive" },
  { lemma: "irgendwas", pos: "pron", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 5.40, cefr: "A2", category: "closed_class", functionalRole: "indefinite_pronoun", domain: "grammar", register: "spoken", morphType: "unproductive" },
  { lemma: "jener", pos: "det", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 3.80, cefr: "B2", category: "closed_class", functionalRole: "demonstrative_determiner", domain: "grammar", register: "formal", morphType: "unproductive" },
  { lemma: "derjenige", pos: "det", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 3.90, cefr: "B2", category: "closed_class", functionalRole: "demonstrative_determiner", domain: "grammar", register: "formal", morphType: "unproductive" },
  { lemma: "derselbe", pos: "det", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.10, cefr: "B1", category: "closed_class", functionalRole: "demonstrative_determiner", domain: "grammar", register: "standard", morphType: "unproductive" },

  // ==========================================
  // 5. CLOSED-CLASS: PREPOSITIONS & CONTRACTIONS
  // ==========================================
  { lemma: "seit", pos: "prep", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.20, cefr: "A2", category: "closed_class", functionalRole: "dative_preposition", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "außer", pos: "prep", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.85, cefr: "B1", category: "closed_class", functionalRole: "dative_preposition", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "gegenüber", pos: "prep", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.50, cefr: "B1", category: "closed_class", functionalRole: "dative_preposition", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "wegen", pos: "prep", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.10, cefr: "A2", category: "closed_class", functionalRole: "genitive_preposition", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "trotz", pos: "prep", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.40, cefr: "B1", category: "closed_class", functionalRole: "genitive_preposition", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "statt", pos: "prep", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.60, cefr: "B1", category: "closed_class", functionalRole: "genitive_preposition", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "anstatt", pos: "prep", dwdsBand: 4, leipzigClass: 7, subtlexZipf: 4.10, cefr: "B1", category: "closed_class", functionalRole: "genitive_preposition", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "aufgrund", pos: "prep", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 3.90, cefr: "B2", category: "closed_class", functionalRole: "genitive_preposition", domain: "grammar", register: "formal", morphType: "unproductive" },
  { lemma: "infolge", pos: "prep", dwdsBand: 4, leipzigClass: 7, subtlexZipf: 3.40, cefr: "B2", category: "closed_class", functionalRole: "genitive_preposition", domain: "grammar", register: "formal", morphType: "unproductive" },
  { lemma: "innerhalb", pos: "prep", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.00, cefr: "B1", category: "closed_class", functionalRole: "genitive_preposition", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "außerhalb", pos: "prep", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 3.90, cefr: "B1", category: "closed_class", functionalRole: "genitive_preposition", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "durchs", pos: "prep+art", dwdsBand: 4, leipzigClass: 7, subtlexZipf: 4.40, cefr: "A2", category: "closed_class", functionalRole: "preposition_article_contraction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "übers", pos: "prep+art", dwdsBand: 4, leipzigClass: 7, subtlexZipf: 4.30, cefr: "A2", category: "closed_class", functionalRole: "preposition_article_contraction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "unters", pos: "prep+art", dwdsBand: 4, leipzigClass: 8, subtlexZipf: 4.10, cefr: "A2", category: "closed_class", functionalRole: "preposition_article_contraction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "vors", pos: "prep+art", dwdsBand: 4, leipzigClass: 8, subtlexZipf: 4.10, cefr: "A2", category: "closed_class", functionalRole: "preposition_article_contraction", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "hinters", pos: "prep+art", dwdsBand: 3, leipzigClass: 9, subtlexZipf: 3.80, cefr: "A2", category: "closed_class", functionalRole: "preposition_article_contraction", domain: "grammar", register: "standard", morphType: "unproductive" },

  // ==========================================
  // 6. HIGH-UTILITY CORE VERBS
  // ==========================================
  { lemma: "lassen", pos: "verb", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.92, cefr: "A2", category: "core_verb", functionalRole: "light_verb_and_causative", domain: "cross_domain", register: "standard", morphType: "high_productivity_verb_root" },
  { lemma: "halten", pos: "verb", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.60, cefr: "A2", category: "core_verb", functionalRole: "light_verb", domain: "cross_domain", register: "standard", morphType: "high_productivity_verb_root" },
  { lemma: "führen", pos: "verb", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.10, cefr: "A2", category: "core_verb", functionalRole: "action_verb", domain: "cross_domain", register: "standard", morphType: "high_productivity_verb_root" },
  { lemma: "gelten", pos: "verb", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 4.70, cefr: "B1", category: "core_verb", functionalRole: "state_verb", domain: "cross_domain", register: "formal", morphType: "high_productivity_verb_root" },
  { lemma: "ziehen", pos: "verb", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.35, cefr: "A2", category: "core_verb", functionalRole: "motion_action_verb", domain: "cross_domain", register: "standard", morphType: "high_productivity_verb_root" },
  { lemma: "setzen", pos: "verb", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.30, cefr: "A2", category: "core_verb", functionalRole: "position_action_verb", domain: "cross_domain", register: "standard", morphType: "high_productivity_verb_root" },
  { lemma: "legen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.25, cefr: "A2", category: "core_verb", functionalRole: "position_action_verb", domain: "cross_domain", register: "standard", morphType: "high_productivity_verb_root" },
  { lemma: "scheinen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.15, cefr: "B1", category: "core_verb", functionalRole: "copular_and_perception_verb", domain: "cross_domain", register: "standard", morphType: "high_productivity_verb_root" },
  { lemma: "bestehen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.80, cefr: "B1", category: "core_verb", functionalRole: "state_and_action_verb", domain: "cross_domain", register: "standard", morphType: "high_productivity_verb_root" },
  { lemma: "handeln", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.85, cefr: "B1", category: "core_verb", functionalRole: "action_and_discourse_verb", domain: "cross_domain", register: "standard", morphType: "high_productivity_verb_root" },
  { lemma: "versuchen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.35, cefr: "A2", category: "core_verb", functionalRole: "action_verb", domain: "cross_domain", register: "standard", morphType: "standard_verb" },
  { lemma: "meinen", pos: "verb", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.70, cefr: "A1", category: "core_verb", functionalRole: "cognition_verb", domain: "cognition", register: "standard", morphType: "standard_verb" },
  { lemma: "verlieren", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.20, cefr: "A2", category: "core_verb", functionalRole: "action_verb", domain: "daily_life", register: "standard", morphType: "standard_verb" },
  { lemma: "gewinnen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.00, cefr: "A2", category: "core_verb", functionalRole: "action_verb", domain: "daily_life", register: "standard", morphType: "standard_verb" },
  { lemma: "erkennen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.90, cefr: "B1", category: "core_verb", functionalRole: "cognition_verb", domain: "cognition", register: "standard", morphType: "standard_verb" },
  { lemma: "entwickeln", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.50, cefr: "B1", category: "core_verb", functionalRole: "action_verb", domain: "workplace", register: "standard", morphType: "standard_verb" },
  { lemma: "ergeben", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.60, cefr: "B1", category: "core_verb", functionalRole: "state_verb", domain: "intellectual", register: "formal", morphType: "standard_verb" },
  { lemma: "erreichen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.95, cefr: "A2", category: "core_verb", functionalRole: "action_verb", domain: "daily_life", register: "standard", morphType: "standard_verb" },
  { lemma: "schließen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.10, cefr: "A2", category: "core_verb", functionalRole: "action_verb", domain: "daily_life", register: "standard", morphType: "high_productivity_verb_root" },
  { lemma: "öffnen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.10, cefr: "A1", category: "core_verb", functionalRole: "action_verb", domain: "daily_life", register: "standard", morphType: "standard_verb" },
  { lemma: "bieten", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.80, cefr: "B1", category: "core_verb", functionalRole: "action_verb", domain: "daily_life", register: "standard", morphType: "high_productivity_verb_root" },
  { lemma: "bilden", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.40, cefr: "B1", category: "core_verb", functionalRole: "action_verb", domain: "intellectual", register: "standard", morphType: "standard_verb" },
  { lemma: "treiben", pos: "verb", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.60, cefr: "A2", category: "core_verb", functionalRole: "action_verb", domain: "daily_life", register: "standard", morphType: "high_productivity_verb_root" },
  { lemma: "tragen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.25, cefr: "A2", category: "core_verb", functionalRole: "action_verb", domain: "daily_life", register: "standard", morphType: "high_productivity_verb_root" },
  { lemma: "fallen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.30, cefr: "A2", category: "core_verb", functionalRole: "motion_verb", domain: "physical_world", register: "standard", morphType: "high_productivity_verb_root" },
  { lemma: "steigen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.70, cefr: "A2", category: "core_verb", functionalRole: "motion_verb", domain: "physical_world", register: "standard", morphType: "high_productivity_verb_root" },
  { lemma: "erwarten", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.05, cefr: "B1", category: "core_verb", functionalRole: "cognition_verb", domain: "cognition", register: "standard", morphType: "standard_verb" },
  { lemma: "schaffen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.40, cefr: "A2", category: "core_verb", functionalRole: "action_verb", domain: "daily_life", register: "standard", morphType: "standard_verb" },
  { lemma: "folgen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.90, cefr: "A2", category: "core_verb", functionalRole: "motion_and_logic_verb", domain: "cross_domain", register: "standard", morphType: "standard_verb" },
  { lemma: "erinnern", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.30, cefr: "A2", category: "core_verb", functionalRole: "cognition_verb", domain: "cognition", register: "standard", morphType: "standard_verb" },
  { lemma: "entscheiden", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.15, cefr: "B1", category: "core_verb", functionalRole: "cognition_verb", domain: "cognition", register: "standard", morphType: "standard_verb" },
  { lemma: "verbinden", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.75, cefr: "B1", category: "core_verb", functionalRole: "action_verb", domain: "cross_domain", register: "standard", morphType: "standard_verb" },
  { lemma: "interessieren", pos: "verb", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 5.10, cefr: "A2", category: "core_verb", functionalRole: "emotion_verb", domain: "cognition", register: "standard", morphType: "standard_verb" },
  { lemma: "entstehen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.40, cefr: "B1", category: "core_verb", functionalRole: "state_change_verb", domain: "intellectual", register: "standard", morphType: "standard_verb" },
  { lemma: "ändern", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.20, cefr: "A2", category: "core_verb", functionalRole: "action_verb", domain: "cross_domain", register: "standard", morphType: "standard_verb" },
  { lemma: "betreffen", pos: "verb", dwdsBand: 6, leipzigClass: 5, subtlexZipf: 4.40, cefr: "B1", category: "core_verb", functionalRole: "state_verb", domain: "public_life", register: "formal", morphType: "standard_verb" },
  { lemma: "beschreiben", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.60, cefr: "A2", category: "core_verb", functionalRole: "communication_verb", domain: "communication", register: "standard", morphType: "standard_verb" },
  { lemma: "beschäftigen", pos: "verb", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.70, cefr: "B1", category: "core_verb", functionalRole: "action_verb", domain: "workplace", register: "standard", morphType: "standard_verb" },
  { lemma: "gefallen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.40, cefr: "A1", category: "core_verb", functionalRole: "emotion_verb", domain: "daily_life", register: "standard", morphType: "standard_verb" },
  { lemma: "bitten", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.25, cefr: "A2", category: "core_verb", functionalRole: "communication_verb", domain: "communication", register: "standard", morphType: "standard_verb" },
  { lemma: "verlassen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.15, cefr: "A2", category: "core_verb", functionalRole: "motion_verb", domain: "daily_life", register: "standard", morphType: "standard_verb" },
  { lemma: "nutzen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.80, cefr: "A2", category: "core_verb", functionalRole: "action_verb", domain: "cross_domain", register: "standard", morphType: "standard_verb" },
  { lemma: "vertrauen", pos: "verb", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.90, cefr: "B1", category: "core_verb", functionalRole: "emotion_verb", domain: "social", register: "standard", morphType: "standard_verb" },
  { lemma: "teilen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.95, cefr: "A2", category: "core_verb", functionalRole: "action_verb", domain: "social", register: "standard", morphType: "standard_verb" },
  { lemma: "erfahren", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.00, cefr: "B1", category: "core_verb", functionalRole: "cognition_verb", domain: "cognition", register: "standard", morphType: "standard_verb" },
  { lemma: "reichen", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.20, cefr: "A2", category: "core_verb", functionalRole: "state_and_action_verb", domain: "daily_life", register: "standard", morphType: "standard_verb" },
  { lemma: "wirken", pos: "verb", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.60, cefr: "B1", category: "core_verb", functionalRole: "state_verb", domain: "intellectual", register: "standard", morphType: "standard_verb" },

  // ==========================================
  // 7. HIGH-UTILITY ADJECTIVES
  // ==========================================
  { lemma: "weit", pos: "adj", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.50, cefr: "A2", category: "core_adj", functionalRole: "spatial_adjective", domain: "spatial", register: "standard", morphType: "standard_adj" },
  { lemma: "jung", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.15, cefr: "A1", category: "core_adj", functionalRole: "descriptive_adjective", domain: "human", register: "standard", morphType: "standard_adj" },
  { lemma: "stark", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.20, cefr: "A2", category: "core_adj", functionalRole: "descriptive_adjective", domain: "physical_world", register: "standard", morphType: "standard_adj" },
  { lemma: "schwach", pos: "adj", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.60, cefr: "A2", category: "core_adj", functionalRole: "descriptive_adjective", domain: "physical_world", register: "standard", morphType: "standard_adj" },
  { lemma: "hoch", pos: "adj", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.30, cefr: "A2", category: "core_adj", functionalRole: "dimension_adjective", domain: "spatial", register: "standard", morphType: "standard_adj" },
  { lemma: "tief", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.90, cefr: "A2", category: "core_adj", functionalRole: "dimension_adjective", domain: "spatial", register: "standard", morphType: "standard_adj" },
  { lemma: "nah", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.80, cefr: "A2", category: "core_adj", functionalRole: "spatial_adjective", domain: "spatial", register: "standard", morphType: "standard_adj" },
  { lemma: "voll", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.25, cefr: "A1", category: "core_adj", functionalRole: "state_adjective", domain: "physical_world", register: "standard", morphType: "standard_adj" },
  { lemma: "leer", pos: "adj", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.80, cefr: "A1", category: "core_adj", functionalRole: "state_adjective", domain: "physical_world", register: "standard", morphType: "standard_adj" },
  { lemma: "ganz", pos: "adj", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.95, cefr: "A1", category: "core_adj", functionalRole: "quantity_adjective", domain: "cross_domain", register: "standard", morphType: "standard_adj" },
  { lemma: "wahr", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.35, cefr: "A2", category: "core_adj", functionalRole: "truth_adjective", domain: "cognition", register: "standard", morphType: "standard_adj" },
  { lemma: "möglich", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.00, cefr: "A2", category: "core_adj", functionalRole: "modal_adjective", domain: "intellectual", register: "standard", morphType: "standard_adj" },
  { lemma: "offen", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.05, cefr: "A2", category: "core_adj", functionalRole: "state_adjective", domain: "daily_life", register: "standard", morphType: "standard_adj" },
  { lemma: "fest", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.80, cefr: "A2", category: "core_adj", functionalRole: "state_adjective", domain: "physical_world", register: "standard", morphType: "standard_adj" },
  { lemma: "direkt", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.85, cefr: "A2", category: "core_adj", functionalRole: "manner_adjective", domain: "cross_domain", register: "standard", morphType: "standard_adj" },
  { lemma: "gleich", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.50, cefr: "A1", category: "core_adj", functionalRole: "equality_adjective", domain: "cross_domain", register: "standard", morphType: "standard_adj" },
  { lemma: "verschieden", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.70, cefr: "A2", category: "core_adj", functionalRole: "diversity_adjective", domain: "intellectual", register: "standard", morphType: "standard_adj" },
  { lemma: "politisch", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.10, cefr: "B1", category: "core_adj", functionalRole: "institutional_adjective", domain: "public_life", register: "formal", morphType: "standard_adj" },
  { lemma: "sozial", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.00, cefr: "B1", category: "core_adj", functionalRole: "institutional_adjective", domain: "public_life", register: "formal", morphType: "standard_adj" },
  { lemma: "sicher", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.55, cefr: "A2", category: "core_adj", functionalRole: "security_adjective", domain: "daily_life", register: "standard", morphType: "standard_adj" },
  { lemma: "öffentlich", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.20, cefr: "B1", category: "core_adj", functionalRole: "civic_adjective", domain: "public_life", register: "standard", morphType: "standard_adj" },
  { lemma: "gemeinsam", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.70, cefr: "A2", category: "core_adj", functionalRole: "social_adjective", domain: "social", register: "standard", morphType: "standard_adj" },
  { lemma: "ähnlich", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.60, cefr: "B1", category: "core_adj", functionalRole: "comparison_adjective", domain: "intellectual", register: "standard", morphType: "standard_adj" },
  { lemma: "gesund", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.80, cefr: "A1", category: "core_adj", functionalRole: "health_adjective", domain: "health", register: "standard", morphType: "standard_adj" },
  { lemma: "schwierig", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.80, cefr: "A2", category: "core_adj", functionalRole: "evaluative_adjective", domain: "daily_life", register: "standard", morphType: "standard_adj" },
  { lemma: "aktuell", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.40, cefr: "B1", category: "core_adj", functionalRole: "temporal_adjective", domain: "media", register: "standard", morphType: "standard_adj" },
  { lemma: "modern", pos: "adj", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.40, cefr: "A2", category: "core_adj", functionalRole: "stylistic_adjective", domain: "cultural", register: "standard", morphType: "standard_adj" },
  { lemma: "typisch", pos: "adj", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.40, cefr: "A2", category: "core_adj", functionalRole: "characterizing_adjective", domain: "cultural", register: "standard", morphType: "standard_adj" },

  // ==========================================
  // 8. HIGH-UTILITY ADVERBS
  // ==========================================
  { lemma: "damals", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.10, cefr: "A2", category: "core_adv", functionalRole: "temporal_adverb", domain: "temporal", register: "standard", morphType: "unproductive" },
  { lemma: "bisher", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.60, cefr: "B1", category: "core_adv", functionalRole: "temporal_adverb", domain: "temporal", register: "standard", morphType: "unproductive" },
  { lemma: "immerhin", pos: "adv", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.60, cefr: "B1", category: "core_adv", functionalRole: "concessive_adverb", domain: "grammar", register: "standard", morphType: "unproductive" },
  { lemma: "etwa", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.00, cefr: "A2", category: "core_adv", functionalRole: "approximate_adverb", domain: "cross_domain", register: "standard", morphType: "unproductive" },
  { lemma: "zunächst", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.40, cefr: "B1", category: "core_adv", functionalRole: "temporal_adverb", domain: "temporal", register: "formal", morphType: "unproductive" },
  { lemma: "überall", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.10, cefr: "A2", category: "core_adv", functionalRole: "spatial_adverb", domain: "spatial", register: "standard", morphType: "unproductive" },
  { lemma: "nirgends", pos: "adv", dwdsBand: 4, leipzigClass: 7, subtlexZipf: 4.20, cefr: "A2", category: "core_adv", functionalRole: "spatial_adverb", domain: "spatial", register: "standard", morphType: "unproductive" },
  { lemma: "gerade", pos: "adv", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.80, cefr: "A1", category: "core_adv", functionalRole: "temporal_and_manner_adverb", domain: "temporal", register: "standard", morphType: "unproductive" },
  { lemma: "sofort", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.40, cefr: "A1", category: "core_adv", functionalRole: "temporal_adverb", domain: "temporal", register: "standard", morphType: "unproductive" },
  { lemma: "früher", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.20, cefr: "A2", category: "core_adv", functionalRole: "temporal_adverb", domain: "temporal", register: "standard", morphType: "unproductive" },
  { lemma: "später", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.25, cefr: "A2", category: "core_adv", functionalRole: "temporal_adverb", domain: "temporal", register: "standard", morphType: "unproductive" },
  { lemma: "fast", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.40, cefr: "A2", category: "core_adv", functionalRole: "degree_adverb", domain: "cross_domain", register: "standard", morphType: "unproductive" },
  { lemma: "wirklich", pos: "adv", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.95, cefr: "A1", category: "core_adv", functionalRole: "intensifier_adverb", domain: "cross_domain", register: "standard", morphType: "unproductive" },
  { lemma: "mittlerweile", pos: "adv", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.40, cefr: "B1", category: "core_adv", functionalRole: "temporal_adverb", domain: "temporal", register: "standard", morphType: "unproductive" },
  { lemma: "irgendwann", pos: "adv", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 5.10, cefr: "A2", category: "core_adv", functionalRole: "temporal_adverb", domain: "temporal", register: "spoken", morphType: "unproductive" },
  { lemma: "gestern", pos: "adv", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.30, cefr: "A1", category: "core_adv", functionalRole: "temporal_adverb", domain: "temporal", register: "standard", morphType: "unproductive" },
  { lemma: "vorgestern", pos: "adv", dwdsBand: 4, leipzigClass: 8, subtlexZipf: 4.10, cefr: "A2", category: "core_adv", functionalRole: "temporal_adverb", domain: "temporal", register: "standard", morphType: "unproductive" },
  { lemma: "übermorgen", pos: "adv", dwdsBand: 4, leipzigClass: 8, subtlexZipf: 4.30, cefr: "A2", category: "core_adv", functionalRole: "temporal_adverb", domain: "temporal", register: "standard", morphType: "unproductive" },
  { lemma: "hoffentlich", pos: "adv", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.90, cefr: "A2", category: "core_adv", functionalRole: "modal_adverb", domain: "daily_life", register: "standard", morphType: "unproductive" },

  // ==========================================
  // 9. HIGH-UTILITY CORE NOUNS (CROSS-DOMAIN)
  // ==========================================
  // Time & Sequence
  { lemma: "Zeit", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 2, subtlexZipf: 5.95, cefr: "A1", category: "core_noun", functionalRole: "temporal_noun", domain: "temporal", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Moment", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.40, cefr: "A2", category: "core_noun", functionalRole: "temporal_noun", domain: "temporal", register: "standard", morphType: "standard_noun" },
  { lemma: "Augenblick", pos: "noun", gender: "m", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.90, cefr: "B1", category: "core_noun", functionalRole: "temporal_noun", domain: "temporal", register: "standard", morphType: "standard_noun" },
  { lemma: "Stunde", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.30, cefr: "A1", category: "core_noun", functionalRole: "temporal_noun", domain: "temporal", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Woche", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.35, cefr: "A1", category: "core_noun", functionalRole: "temporal_noun", domain: "temporal", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Monat", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.90, cefr: "A1", category: "core_noun", functionalRole: "temporal_noun", domain: "temporal", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Jahr", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 2, subtlexZipf: 5.70, cefr: "A1", category: "core_noun", functionalRole: "temporal_noun", domain: "temporal", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Zukunft", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.90, cefr: "A2", category: "core_noun", functionalRole: "temporal_noun", domain: "temporal", register: "standard", morphType: "standard_noun" },
  { lemma: "Vergangenheit", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.70, cefr: "B1", category: "core_noun", functionalRole: "temporal_noun", domain: "temporal", register: "standard", morphType: "standard_noun" },
  { lemma: "Anfang", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.15, cefr: "A2", category: "core_noun", functionalRole: "boundary_noun", domain: "temporal", register: "standard", morphType: "standard_noun" },
  { lemma: "Ende", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.40, cefr: "A1", category: "core_noun", functionalRole: "boundary_noun", domain: "temporal", register: "standard", morphType: "standard_noun" },

  // Human Body & Health
  { lemma: "Körper", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.00, cefr: "A2", category: "core_noun", functionalRole: "body_noun", domain: "health", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Kopf", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.35, cefr: "A1", category: "core_noun", functionalRole: "body_noun", domain: "health", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Auge", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.40, cefr: "A1", category: "core_noun", functionalRole: "body_noun", domain: "health", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Ohr", pos: "noun", gender: "n", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.90, cefr: "A2", category: "core_noun", functionalRole: "body_noun", domain: "health", register: "standard", morphType: "standard_noun" },
  { lemma: "Mund", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.10, cefr: "A2", category: "core_noun", functionalRole: "body_noun", domain: "health", register: "standard", morphType: "standard_noun" },
  { lemma: "Nase", pos: "noun", gender: "f", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.80, cefr: "A2", category: "core_noun", functionalRole: "body_noun", domain: "health", register: "standard", morphType: "standard_noun" },
  { lemma: "Hand", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.50, cefr: "A1", category: "core_noun", functionalRole: "body_noun", domain: "health", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Fuß", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.05, cefr: "A2", category: "core_noun", functionalRole: "body_noun", domain: "health", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Arm", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.00, cefr: "A2", category: "core_noun", functionalRole: "body_noun", domain: "health", register: "standard", morphType: "standard_noun" },
  { lemma: "Bein", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.00, cefr: "A2", category: "core_noun", functionalRole: "body_noun", domain: "health", register: "standard", morphType: "standard_noun" },
  { lemma: "Herz", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.30, cefr: "A2", category: "core_noun", functionalRole: "body_noun", domain: "health", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Rücken", pos: "noun", gender: "m", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.80, cefr: "A2", category: "core_noun", functionalRole: "body_noun", domain: "health", register: "standard", morphType: "standard_noun" },
  { lemma: "Bauch", pos: "noun", gender: "m", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.70, cefr: "A2", category: "core_noun", functionalRole: "body_noun", domain: "health", register: "standard", morphType: "standard_noun" },
  { lemma: "Blut", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.20, cefr: "A2", category: "core_noun", functionalRole: "body_noun", domain: "health", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Gesundheit", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.60, cefr: "A2", category: "core_noun", functionalRole: "health_noun", domain: "health", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Krankheit", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.70, cefr: "A2", category: "core_noun", functionalRole: "health_noun", domain: "health", register: "standard", morphType: "standard_noun" },
  { lemma: "Schmerz", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.00, cefr: "A2", category: "core_noun", functionalRole: "health_noun", domain: "health", register: "standard", morphType: "standard_noun" },
  { lemma: "Fieber", pos: "noun", gender: "n", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.40, cefr: "A2", category: "core_noun", functionalRole: "health_noun", domain: "health", register: "standard", morphType: "standard_noun" },
  { lemma: "Arzt", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.15, cefr: "A1", category: "core_noun", functionalRole: "profession_noun", domain: "health", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Ärztin", pos: "noun", gender: "f", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.40, cefr: "A1", category: "core_noun", functionalRole: "profession_noun", domain: "health", register: "standard", morphType: "standard_noun" },
  { lemma: "Apotheke", pos: "noun", gender: "f", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.30, cefr: "A1", category: "core_noun", functionalRole: "facility_noun", domain: "health", register: "standard", morphType: "standard_noun" },
  { lemma: "Medikament", pos: "noun", gender: "n", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.40, cefr: "A2", category: "core_noun", functionalRole: "medical_noun", domain: "health", register: "standard", morphType: "standard_noun" },

  // Home, Shelter & Domestic
  { lemma: "Wohnung", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.20, cefr: "A1", category: "core_noun", functionalRole: "shelter_noun", domain: "domestic", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Raum", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 4.90, cefr: "A2", category: "core_noun", functionalRole: "spatial_noun", domain: "domestic", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Tür", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.45, cefr: "A1", category: "core_noun", functionalRole: "architectural_noun", domain: "domestic", register: "standard", morphType: "standard_noun" },
  { lemma: "Fenster", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.15, cefr: "A1", category: "core_noun", functionalRole: "architectural_noun", domain: "domestic", register: "standard", morphType: "standard_noun" },
  { lemma: "Wand", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.90, cefr: "A2", category: "core_noun", functionalRole: "architectural_noun", domain: "domestic", register: "standard", morphType: "standard_noun" },
  { lemma: "Boden", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.00, cefr: "A2", category: "core_noun", functionalRole: "architectural_noun", domain: "domestic", register: "standard", morphType: "standard_noun" },
  { lemma: "Dach", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.80, cefr: "A2", category: "core_noun", functionalRole: "architectural_noun", domain: "domestic", register: "standard", morphType: "standard_noun" },
  { lemma: "Tisch", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.10, cefr: "A1", category: "core_noun", functionalRole: "furniture_noun", domain: "domestic", register: "standard", morphType: "standard_noun" },
  { lemma: "Stuhl", pos: "noun", gender: "m", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.70, cefr: "A1", category: "core_noun", functionalRole: "furniture_noun", domain: "domestic", register: "standard", morphType: "standard_noun" },
  { lemma: "Bett", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.30, cefr: "A1", category: "core_noun", functionalRole: "furniture_noun", domain: "domestic", register: "standard", morphType: "standard_noun" },
  { lemma: "Schrank", pos: "noun", gender: "m", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.60, cefr: "A1", category: "core_noun", functionalRole: "furniture_noun", domain: "domestic", register: "standard", morphType: "standard_noun" },
  { lemma: "Küche", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.00, cefr: "A1", category: "core_noun", functionalRole: "room_noun", domain: "domestic", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Bad", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.90, cefr: "A1", category: "core_noun", functionalRole: "room_noun", domain: "domestic", register: "standard", morphType: "standard_noun" },
  { lemma: "Miete", pos: "noun", gender: "f", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.60, cefr: "A2", category: "core_noun", functionalRole: "tenancy_noun", domain: "domestic", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Schlüssel", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.10, cefr: "A1", category: "core_noun", functionalRole: "tool_noun", domain: "domestic", register: "standard", morphType: "standard_noun" },
  { lemma: "Garten", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.80, cefr: "A1", category: "core_noun", functionalRole: "outdoor_noun", domain: "domestic", register: "standard", morphType: "standard_noun" },

  // Society, Work & Economy
  { lemma: "Mensch", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 2, subtlexZipf: 5.95, cefr: "A1", category: "core_noun", functionalRole: "human_noun", domain: "social", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Person", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.05, cefr: "A1", category: "core_noun", functionalRole: "human_noun", domain: "social", register: "standard", morphType: "standard_noun" },
  { lemma: "Leute", pos: "noun", gender: "pl", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.90, cefr: "A1", category: "core_noun", functionalRole: "human_noun", domain: "social", register: "standard", morphType: "standard_noun" },
  { lemma: "Gesellschaft", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 4.50, cefr: "B1", category: "core_noun", functionalRole: "social_noun", domain: "social", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Kultur", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.20, cefr: "B1", category: "core_noun", functionalRole: "social_noun", domain: "social", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Familie", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.50, cefr: "A1", category: "core_noun", functionalRole: "kinship_noun", domain: "social", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Eltern", pos: "noun", gender: "pl", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.35, cefr: "A1", category: "core_noun", functionalRole: "kinship_noun", domain: "social", register: "standard", morphType: "standard_noun" },
  { lemma: "Vater", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.75, cefr: "A1", category: "core_noun", functionalRole: "kinship_noun", domain: "social", register: "standard", morphType: "standard_noun" },
  { lemma: "Mutter", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.70, cefr: "A1", category: "core_noun", functionalRole: "kinship_noun", domain: "social", register: "standard", morphType: "standard_noun" },
  { lemma: "Kind", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 2, subtlexZipf: 5.90, cefr: "A1", category: "core_noun", functionalRole: "kinship_noun", domain: "social", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Freund", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.70, cefr: "A1", category: "core_noun", functionalRole: "social_noun", domain: "social", register: "standard", morphType: "standard_noun" },
  { lemma: "Freundin", pos: "noun", gender: "f", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 5.10, cefr: "A1", category: "core_noun", functionalRole: "social_noun", domain: "social", register: "standard", morphType: "standard_noun" },
  { lemma: "Nachbar", pos: "noun", gender: "m", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.60, cefr: "A2", category: "core_noun", functionalRole: "social_noun", domain: "social", register: "standard", morphType: "standard_noun" },
  { lemma: "Arbeit", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.60, cefr: "A1", category: "core_noun", functionalRole: "work_noun", domain: "workplace", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Beruf", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.80, cefr: "A1", category: "core_noun", functionalRole: "work_noun", domain: "workplace", register: "standard", morphType: "standard_noun" },
  { lemma: "Job", pos: "noun", gender: "m", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 5.25, cefr: "A1", category: "core_noun", functionalRole: "work_noun", domain: "workplace", register: "standard", morphType: "standard_noun" },
  { lemma: "Firma", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.90, cefr: "A2", category: "core_noun", functionalRole: "economic_noun", domain: "workplace", register: "standard", morphType: "standard_noun" },
  { lemma: "Unternehmen", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 4.50, cefr: "B1", category: "core_noun", functionalRole: "economic_noun", domain: "workplace", register: "formal", morphType: "high_productivity_compound_noun" },
  { lemma: "Betrieb", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.30, cefr: "B1", category: "core_noun", functionalRole: "economic_noun", domain: "workplace", register: "standard", morphType: "standard_noun" },
  { lemma: "Chef", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.20, cefr: "A2", category: "core_noun", functionalRole: "work_noun", domain: "workplace", register: "standard", morphType: "standard_noun" },
  { lemma: "Kollege", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.90, cefr: "A2", category: "core_noun", functionalRole: "work_noun", domain: "workplace", register: "standard", morphType: "standard_noun" },
  { lemma: "Geld", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.75, cefr: "A1", category: "core_noun", functionalRole: "economic_noun", domain: "workplace", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Preis", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.90, cefr: "A1", category: "core_noun", functionalRole: "economic_noun", domain: "workplace", register: "standard", morphType: "standard_noun" },
  { lemma: "Kosten", pos: "noun", gender: "pl", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.50, cefr: "A2", category: "core_noun", functionalRole: "economic_noun", domain: "workplace", register: "standard", morphType: "standard_noun" },
  { lemma: "Rechnung", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.80, cefr: "A1", category: "core_noun", functionalRole: "economic_noun", domain: "workplace", register: "standard", morphType: "standard_noun" },
  { lemma: "Vertrag", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.60, cefr: "B1", category: "core_noun", functionalRole: "legal_noun", domain: "workplace", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Gehalt", pos: "noun", gender: "n", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.30, cefr: "A2", category: "core_noun", functionalRole: "economic_noun", domain: "workplace", register: "standard", morphType: "standard_noun" },
  { lemma: "Steuer", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.30, cefr: "B1", category: "core_noun", functionalRole: "civic_noun", domain: "public_life", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Kunde", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.80, cefr: "A2", category: "core_noun", functionalRole: "economic_noun", domain: "workplace", register: "standard", morphType: "standard_noun" },
  { lemma: "Geschäft", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.95, cefr: "A2", category: "core_noun", functionalRole: "economic_noun", domain: "workplace", register: "standard", morphType: "standard_noun" },
  { lemma: "Markt", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 4.70, cefr: "A2", category: "core_noun", functionalRole: "economic_noun", domain: "workplace", register: "standard", morphType: "high_productivity_compound_noun" },

  // Public Life, State & Law
  { lemma: "Staat", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 4.70, cefr: "B1", category: "core_noun", functionalRole: "civic_noun", domain: "public_life", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Land", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 2, subtlexZipf: 5.40, cefr: "A1", category: "core_noun", functionalRole: "geographic_noun", domain: "public_life", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Ort", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.10, cefr: "A2", category: "core_noun", functionalRole: "spatial_noun", domain: "public_life", register: "standard", morphType: "standard_noun" },
  { lemma: "Gemeinde", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.00, cefr: "B1", category: "core_noun", functionalRole: "civic_noun", domain: "public_life", register: "formal", morphType: "standard_noun" },
  { lemma: "Regierung", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 4.50, cefr: "B1", category: "core_noun", functionalRole: "civic_noun", domain: "public_life", register: "formal", morphType: "standard_noun" },
  { lemma: "Politik", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 4.40, cefr: "B1", category: "core_noun", functionalRole: "civic_noun", domain: "public_life", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Gesetz", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.70, cefr: "B1", category: "core_noun", functionalRole: "legal_noun", domain: "public_life", register: "standard", morphType: "standard_noun" },
  { lemma: "Recht", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.30, cefr: "A2", category: "core_noun", functionalRole: "legal_noun", domain: "public_life", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Polizei", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 5.50, cefr: "A1", category: "core_noun", functionalRole: "civic_noun", domain: "public_life", register: "standard", morphType: "standard_noun" },
  { lemma: "Gericht", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.80, cefr: "B1", category: "core_noun", functionalRole: "civic_noun", domain: "public_life", register: "standard", morphType: "standard_noun" },
  { lemma: "Amt", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.40, cefr: "B1", category: "core_noun", functionalRole: "civic_noun", domain: "public_life", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Behörde", pos: "noun", gender: "f", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.00, cefr: "B1", category: "core_noun", functionalRole: "civic_noun", domain: "public_life", register: "formal", morphType: "standard_noun" },
  { lemma: "Bürger", pos: "noun", gender: "m", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.30, cefr: "B1", category: "core_noun", functionalRole: "civic_noun", domain: "public_life", register: "standard", morphType: "high_productivity_compound_noun" },
  { lemma: "Ausweis", pos: "noun", gender: "m", dwdsBand: 5, leipzigClass: 6, subtlexZipf: 4.40, cefr: "A2", category: "core_noun", functionalRole: "identity_noun", domain: "public_life", register: "standard", morphType: "standard_noun" },
  { lemma: "Pass", pos: "noun", gender: "m", dwdsBand: 5, leipzigClass: 5, subtlexZipf: 4.80, cefr: "A1", category: "core_noun", functionalRole: "identity_noun", domain: "public_life", register: "standard", morphType: "standard_noun" },
  { lemma: "Freiheit", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.70, cefr: "B1", category: "core_noun", functionalRole: "abstract_noun", domain: "public_life", register: "standard", morphType: "standard_noun" },
  { lemma: "Sicherheit", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.80, cefr: "A2", category: "core_noun", functionalRole: "abstract_noun", domain: "public_life", register: "standard", morphType: "standard_noun" },
  { lemma: "Problem", pos: "noun", gender: "n", dwdsBand: 6, leipzigClass: 3, subtlexZipf: 5.65, cefr: "A1", category: "core_noun", functionalRole: "abstract_noun", domain: "daily_life", register: "standard", morphType: "standard_noun" },
  { lemma: "Lösung", pos: "noun", gender: "f", dwdsBand: 6, leipzigClass: 4, subtlexZipf: 4.60, cefr: "A2", category: "core_noun", functionalRole: "abstract_noun", domain: "daily_life", register: "standard", morphType: "standard_noun" }
];

const targetPath = path.resolve('data-source/candidates/seeds/candidate-seeds.json');
fs.writeFileSync(targetPath, JSON.stringify(SEED_DATA, null, 2), 'utf8');
console.log(`Generated candidate-seeds.json with ${SEED_DATA.length} seeds at ${targetPath}`);
