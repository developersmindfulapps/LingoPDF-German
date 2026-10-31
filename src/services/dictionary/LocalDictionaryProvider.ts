import type {
  InitializableDictionaryProvider,
  DictionaryResult,
  HeadwordEntry,
  LexicalSense,
} from '../../types/dictionary.ts';
import {
  loadDictionaryAssets,
  type LoadedDictionaryData
} from './deEnDataLoader.ts';

/**
 * Common German inflectional suffixes for rule-based adjective/participle fallback.
 * Ordered from longest to shortest suffix.
 */
const INFLECTION_SUFFIXES = [
  'esten', 'ester', 'estes', 'estem', 'este',
  'enden', 'endem', 'ender', 'endes', 'ende',
  'sten', 'ster', 'stes', 'stem', 'ste',
  'tem', 'ten', 'ter', 'tes', 'te',
  'en', 'em', 'er', 'es', 'e', 'st', 't'
];

export class LocalDictionaryProvider implements InitializableDictionaryProvider {
  public readonly id: string;
  public readonly name: string;

  private entries: Record<string, HeadwordEntry>;
  private inflections: Record<string, string | string[]>;
  private initPromise: Promise<void> | null = null;
  private isReady = false;
  private initError: Error | null = null;
  private loader: () => Promise<LoadedDictionaryData>;

  constructor(
    customEntries?: Record<string, HeadwordEntry>,
    customInflections?: Record<string, string | string[]>,
    loader: () => Promise<LoadedDictionaryData> = loadDictionaryAssets,
    id = 'local-de-en',
    name = 'Local German-English Dictionary'
  ) {
    this.id = id;
    this.name = name;
    this.loader = loader;
    if (customEntries && customInflections) {
      this.entries = customEntries;
      this.inflections = customInflections;
      this.isReady = true;
    } else {
      this.entries = customEntries || {};
      this.inflections = customInflections || {};
      this.isReady = Boolean(customEntries && customInflections);
    }
  }

  /**
   * Returns true if the dictionary and inflection datasets are fully loaded into memory.
   */
  public isInitialized(): boolean {
    return this.isReady;
  }

  /**
   * Returns the error encountered during asset loading, if any.
   */
  public getInitializationError(): Error | null {
    return this.initError;
  }

  /**
   * Ensures that the dictionary datasets are loaded and validated asynchronously.
   * Uses a singleton promise to deduplicate concurrent requests.
   */
  public async ensureInitialized(): Promise<void> {
    if (this.isReady) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const { entries, inflections } = await this.loader();
        this.entries = entries;
        this.inflections = inflections;
        this.isReady = true;
        this.initError = null;
      } catch (err) {
        this.initPromise = null; // Clear so subsequent lookups can retry
        this.initError = err instanceof Error ? err : new Error(String(err));
        throw this.initError;
      }
    })();

    return this.initPromise;
  }

  /**
   * Helper to format a HeadwordEntry into a DictionaryResult.
   */
  private formatResult(query: string, entry: HeadwordEntry, lemma?: string): DictionaryResult {
    const senses: LexicalSense[] = entry.senses || [];
    const allTranslations: string[] = [];
    const posSet = new Set<string>();
    let gender: 'm' | 'f' | 'n' | undefined;
    let plural: string | undefined;

    for (const sense of senses) {
      if (sense.pos) posSet.add(sense.pos);
      if (sense.gender && !gender) gender = sense.gender;
      if (sense.plural && !plural) plural = sense.plural;
      for (const t of sense.translations) {
        if (!allTranslations.includes(t)) {
          allTranslations.push(t);
        }
      }
    }

    return {
      query,
      lemma: lemma && lemma !== query ? lemma : undefined,
      sourceLang: 'de',
      targetLang: 'en',
      translations: allTranslations,
      partOfSpeech: Array.from(posSet).join('/'),
      gender,
      plural,
      senses,
      isDerived: false,
      source: 'dictionary',
    };
  }

  /**
   * Resolves a raw inflection value (which can be a single lemma string or an array of candidate lemmas)
   * against this.entries, normalizing and deduplicating candidate lemmas deterministically.
   * If multiple candidate lemmas exist in entries, preserves legitimate ambiguity by returning
   * a combined result with all candidate senses.
   */
  private resolveCandidateLemmas(
    query: string,
    rawLemma: string | string[]
  ): DictionaryResult | null {
    const candidateList = Array.isArray(rawLemma) ? rawLemma : [rawLemma];
    const uniqueCandidates = Array.from(
      new Set(
        candidateList
          .map((c) => (typeof c === 'string' ? c.trim() : ''))
          .filter(Boolean)
      )
    );

    const matches: Array<{ lemma: string; entry: HeadwordEntry }> = [];
    for (const cand of uniqueCandidates) {
      if (Object.prototype.hasOwnProperty.call(this.entries, cand)) {
        matches.push({ lemma: cand, entry: this.entries[cand] });
      } else {
        const lowerCand = cand.toLowerCase();
        const titleCand = lowerCand[0].toUpperCase() + lowerCand.slice(1);
        if (Object.prototype.hasOwnProperty.call(this.entries, lowerCand)) {
          matches.push({ lemma: lowerCand, entry: this.entries[lowerCand] });
        } else if (Object.prototype.hasOwnProperty.call(this.entries, titleCand)) {
          matches.push({ lemma: titleCand, entry: this.entries[titleCand] });
        }
      }
    }

    if (matches.length === 0) {
      return null;
    }

    if (matches.length === 1) {
      return this.formatResult(query, matches[0].entry, matches[0].lemma);
    }

    // Prioritize candidates based on linguistic evidence:
    // If the surface query is capitalized (German noun capitalization), prioritize noun headwords
    // whose plural or lemma matches the surface form.
    const isCapitalized = query.length > 0 && query[0] === query[0].toUpperCase() && query !== query.toLowerCase();
    if (isCapitalized) {
      matches.sort((a, b) => {
        const aIsNoun = (a.entry.senses || []).some((s) => s.pos === 'noun');
        const bIsNoun = (b.entry.senses || []).some((s) => s.pos === 'noun');
        if (aIsNoun && !bIsNoun) return -1;
        if (!aIsNoun && bIsNoun) return 1;

        // Check if plural explicitly matches query
        const aPluralMatch = (a.entry.senses || []).some((s) => s.plural && s.plural.toLowerCase() === query.toLowerCase());
        const bPluralMatch = (b.entry.senses || []).some((s) => s.plural && s.plural.toLowerCase() === query.toLowerCase());
        if (aPluralMatch && !bPluralMatch) return -1;
        if (!aPluralMatch && bPluralMatch) return 1;

        return 0;
      });
    }

    // Multiple valid candidate lemmas exist: preserve legitimate ambiguity
    return this.formatMultiCandidateResult(query, matches);
  }

  /**
   * Formats multiple matching candidate HeadwordEntries into a combined DictionaryResult,
   * deterministically preserving all candidate lemmas, senses, and translations.
   */
  private formatMultiCandidateResult(
    query: string,
    matches: Array<{ lemma: string; entry: HeadwordEntry }>
  ): DictionaryResult {
    const allSenses: LexicalSense[] = [];
    const allTranslations: string[] = [];
    const posSet = new Set<string>();
    const lemmaSet = new Set<string>();
    let gender: 'm' | 'f' | 'n' | undefined;
    let plural: string | undefined;

    for (const { lemma, entry } of matches) {
      if (lemma && (matches.length > 1 || lemma.toLowerCase() !== query.toLowerCase())) {
        lemmaSet.add(lemma);
      }
      const senses = entry.senses || [];
      for (const sense of senses) {
        allSenses.push(sense);
        if (sense.pos) posSet.add(sense.pos);
        if (sense.gender && !gender) gender = sense.gender;
        if (sense.plural && !plural) plural = sense.plural;
        for (const t of sense.translations) {
          if (!allTranslations.includes(t)) {
            allTranslations.push(t);
          }
        }
      }
    }

    const combinedLemma = lemmaSet.size > 0 ? Array.from(lemmaSet).join(' / ') : undefined;

    return {
      query,
      lemma: combinedLemma,
      sourceLang: 'de',
      targetLang: 'en',
      translations: allTranslations,
      partOfSpeech: Array.from(posSet).join('/'),
      gender,
      plural,
      senses: allSenses,
      isDerived: false,
      source: 'dictionary',
    };
  }

  /**
   * Evaluates whether a candidate entry or resolved candidate result can legitimately serve
   * as a base stem for rule-based adjective/participle suffix stripping fallback.
   * Rejects entries that are incompatible (e.g. pure nouns without adjective, verbal, or numeral senses)
   * to prevent false-positive category errors where an adjective-looking form resolves to an incompatible noun
   * (e.g. superlativem -> Superlativ, bilden -> Bild, or buchem -> Buch).
   */
  private isCompatibleSuffixStrippingTarget(item: HeadwordEntry | DictionaryResult | null | undefined): boolean {
    if (!item || !Array.isArray(item.senses) || item.senses.length === 0) {
      return false;
    }
    return item.senses.some(
      (sense) => sense.pos === 'adj' || sense.pos === 'verb' || sense.pos === 'num'
    );
  }

  /**
   * Looks up a German word and resolves to its English translations.
   * Multi-stage lookup pipeline:
   * 1. Exact case-sensitive match (preserves homographs: Sie vs sie, Morgen vs morgen)
   * 2. Case-disambiguated fallback (e.g. sentence-initial Gehen -> gehen, lowercase buch -> Buch)
   * 3. Precompiled inflection index lookup (e.g. häuser -> Haus, sprachen -> Sprache / sprechen)
   * 4. Morphological suffix stripping fallback (e.g. schnelles -> schnell)
   * 5. Returns null if unknown
   */
  public async lookup(
    word: string,
    sourceLang: string,
    targetLang: string
  ): Promise<DictionaryResult | null> {
    if (!word) return null;

    // Validate languages (German -> English)
    if (sourceLang.toLowerCase() !== 'de' || targetLang.toLowerCase() !== 'en') {
      return null;
    }

    const query = word.trim();
    if (!query) return null;

    // Ensure assets are loaded before querying
    if (!this.isReady) {
      await this.ensureInitialized();
    }

    // 1. Stage 1 — Exact case-sensitive match
    if (Object.prototype.hasOwnProperty.call(this.entries, query)) {
      return this.formatResult(query, this.entries[query]);
    }

    // 2. Stage 2 — Case-disambiguated match
    const lowerQuery = query.toLowerCase();
    const titleQuery = lowerQuery[0].toUpperCase() + lowerQuery.slice(1);

    // Try lowercase entry (sentence-initial verbs, adjectives, mixed case)
    if (query !== lowerQuery && Object.prototype.hasOwnProperty.call(this.entries, lowerQuery)) {
      return this.formatResult(query, this.entries[lowerQuery], lowerQuery);
    }
    // Try titlecase entry (lowercase or mixed-case nouns like buch/SchUlE -> Buch/Schule)
    // Defer to Stage 3 if the lowercase query is an ambiguous inflection pointing to multiple lemmas (e.g. abfahrt -> [Abfahrt, abfahren], schloss -> [Schloss, schließen])
    if (
      query !== titleQuery &&
      Object.prototype.hasOwnProperty.call(this.entries, titleQuery) &&
      !Array.isArray(this.inflections[lowerQuery])
    ) {
      return this.formatResult(query, this.entries[titleQuery], titleQuery);
    }

    // 3. Stage 3 — Precompiled inflection index
    const mappedLemma = this.inflections[lowerQuery];
    if (mappedLemma) {
      const result = this.resolveCandidateLemmas(query, mappedLemma);
      if (result) return result;
    }

    // 4. Stage 4 — Morphological suffix stripping fallback (adjectives / participles)
    if (lowerQuery.length >= 5) {
      for (const suffix of INFLECTION_SUFFIXES) {
        if (lowerQuery.endsWith(suffix) && lowerQuery.length - suffix.length >= 3) {
          const stem = lowerQuery.slice(0, -suffix.length);

          // Direct stem check
          if (Object.prototype.hasOwnProperty.call(this.entries, stem)) {
            const entry = this.entries[stem];
            if (this.isCompatibleSuffixStrippingTarget(entry)) {
              return this.formatResult(query, entry, stem);
            }
          }

          // Capitalized stem check
          const capStem = stem[0].toUpperCase() + stem.slice(1);
          if (Object.prototype.hasOwnProperty.call(this.entries, capStem)) {
            const entry = this.entries[capStem];
            if (this.isCompatibleSuffixStrippingTarget(entry)) {
              return this.formatResult(query, entry, capStem);
            }
          }

          // Stem in inflections index
          const stemLemma = this.inflections[stem];
          if (stemLemma) {
            const result = this.resolveCandidateLemmas(query, stemLemma);
            if (result && this.isCompatibleSuffixStrippingTarget(result)) {
              return result;
            }
          }
        }
      }
    }

    // 5. Stage 5 — Productive learner compound decomposition fallback
    // e.g., Lieblings- + Noun (Lieblingsmusik -> Liebling + Musik -> "favorite music")
    // Note: Marked explicitly as source: "compositional" / isDerived: true to distinguish from upstream dictionary entries.
    if (lowerQuery.startsWith('lieblings') && lowerQuery.length > 9) {
      const remainder = lowerQuery.slice(9);
      const capRemainder = remainder[0].toUpperCase() + remainder.slice(1);
      const baseEntry = this.entries[capRemainder] || this.entries[remainder];
      if (baseEntry) {
        const baseResult = this.formatResult(capRemainder, baseEntry);
        // Only take the safe, primary base noun meaning to avoid spurious idiomatic extensions
        const primaryBaseMeaning = baseResult.translations[0] || remainder;
        const compoundTranslation = `favorite ${primaryBaseMeaning}`;
        return {
          query,
          lemma: `Liebling + ${capRemainder}`,
          sourceLang: 'de',
          targetLang: 'en',
          translations: [compoundTranslation],
          partOfSpeech: 'noun',
          gender: baseResult.gender,
          plural: baseResult.plural,
          isDerived: true,
          source: 'compositional',
          senses: [
            {
              pos: 'noun',
              gender: baseResult.gender,
              plural: baseResult.plural,
              translations: [compoundTranslation],
            },
          ],
        };
      }
    }

    // Productive German street name decomposition fallback: [Name] + straße / strasse
    // e.g., Müllerstraße, Rheinstraße -> [Proper Name] + Straße -> "... Street (street name)"
    const streetSuffix = lowerQuery.endsWith('straße') ? 'straße' : lowerQuery.endsWith('strasse') ? 'strasse' : null;
    if (streetSuffix && lowerQuery.length > streetSuffix.length + 2) {
      const stemLower = lowerQuery.slice(0, -streetSuffix.length);
      const capStem = stemLower[0].toUpperCase() + stemLower.slice(1);
      const translation = `${capStem} Street (street name)`;
      return {
        query,
        lemma: `${capStem} + Straße`,
        sourceLang: 'de',
        targetLang: 'en',
        translations: [translation],
        partOfSpeech: 'noun',
        gender: 'f',
        plural: `${capStem}straßen`,
        isDerived: true,
        source: 'compositional',
        senses: [
          {
            pos: 'noun',
            gender: 'f',
            plural: `${capStem}straßen`,
            translations: [translation],
          },
        ],
      };
    }

    // 6. Stage 6 — Conservative German OCR error recovery
    // Recovers high-probability single-character or bigram OCR confusions
    // (e.g. "Modatverben" -> "Modalverben", "mässen" -> "müssen")
    // ONLY triggered when the query is completely unknown across stages 1-5.
    // Does NOT apply global fuzzy matching or unrestricted edit distance.
    if (lowerQuery.length >= 4) {
      const OCR_CONFUSIONS: Array<[string, string]> = [
        ['t', 'l'], ['l', 't'],
        ['ä', 'ü'], ['ü', 'ä'],
        ['ö', 'o'], ['o', 'ö'],
        ['rn', 'm'], ['m', 'rn'],
        ['cl', 'd'], ['d', 'cl'],
        ['vv', 'w'], ['w', 'vv'],
        ['ß', 'ss'], ['ss', 'ß'],
      ];

      for (const [from, to] of OCR_CONFUSIONS) {
        let pos = 0;
        while ((pos = lowerQuery.indexOf(from, pos)) !== -1) {
          const correctedLower = lowerQuery.slice(0, pos) + to + lowerQuery.slice(pos + from.length);
          let correctedQuery = correctedLower;
          if (query[0] === query[0].toUpperCase()) {
            correctedQuery = correctedLower[0].toUpperCase() + correctedLower.slice(1);
          }

          let candidateMatch: DictionaryResult | null = null;
          if (Object.prototype.hasOwnProperty.call(this.entries, correctedQuery)) {
            candidateMatch = this.formatResult(query, this.entries[correctedQuery], correctedQuery);
          } else if (Object.prototype.hasOwnProperty.call(this.entries, correctedLower)) {
            candidateMatch = this.formatResult(query, this.entries[correctedLower], correctedLower);
          } else {
            const titleCand = correctedLower[0].toUpperCase() + correctedLower.slice(1);
            if (Object.prototype.hasOwnProperty.call(this.entries, titleCand)) {
              candidateMatch = this.formatResult(query, this.entries[titleCand], titleCand);
            } else if (this.inflections[correctedLower]) {
              candidateMatch = this.resolveCandidateLemmas(query, this.inflections[correctedLower]);
            }
          }

          if (candidateMatch) {
            return {
              ...candidateMatch,
              isDerived: true,
              source: 'ocr-correction',
            };
          }

          pos += from.length;
        }
      }
    }

    return null;
  }
}

export const localDictionaryProvider = new LocalDictionaryProvider();
