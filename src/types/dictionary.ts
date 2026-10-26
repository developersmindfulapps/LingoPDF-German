/**
 * Type definitions for dictionary lookups, providers, and results.
 */

export interface LexicalSense {
  pos: string;
  gender?: 'm' | 'f' | 'n';
  plural?: string;
  translations: string[];
}

export interface HeadwordEntry {
  senses: LexicalSense[];
}

export interface DictionaryResult {
  query: string;
  lemma?: string;
  sourceLang: string;
  targetLang: string;
  translations: string[];
  partOfSpeech?: string;
  gender?: 'm' | 'f' | 'n';
  plural?: string;
  senses?: LexicalSense[];
  isDerived?: boolean;
  source?: 'dictionary' | 'compositional' | 'ocr-correction';
  /**
   * Internal source identifier indicating which provider resolved the query:
   * - 'authored': Independently authored learner dictionary (Primary)
   * - 'legacy': Kaikki/Wiktextract dataset (Fallback)
   * - 'compositional': Runtime morphological/compound rule engine
   * - 'ocr-correction': Recovered via conservative OCR confusion pair correction
   */
  providerId?: 'authored' | 'legacy' | 'compositional' | 'ocr-correction';
}

export interface DictionaryEntry {
  translations: string[];
  partOfSpeech?: string;
  lemma?: string;
  gender?: 'm' | 'f' | 'n';
  plural?: string;
}

export interface DictionaryData {
  version: string;
  source: string;
  license: string;
  entries: Record<string, HeadwordEntry | { t: string[]; pos?: string; lemma?: string }>;
  lemmas?: Record<string, string | string[]>;
}

export interface DictionaryProvider {
  id: string;
  name: string;

  lookup(
    word: string,
    sourceLang: string,
    targetLang: string
  ): Promise<DictionaryResult | null>;
}

/**
 * Extended interface for providers that require asynchronous offline asset loading.
 */
export interface InitializableDictionaryProvider extends DictionaryProvider {
  ensureInitialized(): Promise<void>;
  isInitialized(): boolean;
  getInitializationError(): Error | null;
}
