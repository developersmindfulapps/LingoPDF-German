import type {
  DictionaryResult,
  InitializableDictionaryProvider,
} from '../../types/dictionary.ts';

/**
 * CompositeDictionaryProvider coordinates multi-tier offline dictionary lookups.
 * 
 * Pipeline:
 * 1. Primary: Independently authored German-English learner dictionary.
 * 2. Fallback: Legacy Kaikki/Wiktextract dictionary (queried ONLY when authored has no match).
 * 
 * Error Discrimination Contract:
 * - Genuine word not found: Returns null cleanly.
 * - Provider initialization / asset load failure: Logs useful warning and attempts fallback.
 *   If both providers (or the final active provider) fail, throws an explicit Error.
 *   Load failures NEVER masquerade as "Word not found".
 */
export class CompositeDictionaryProvider implements InitializableDictionaryProvider {
  public readonly id = 'composite-de-en';
  public readonly name = 'Composite German-English Dictionary';

  private primary: InitializableDictionaryProvider;
  private fallback: InitializableDictionaryProvider | null;
  private isReady = false;
  private initPromise: Promise<void> | null = null;
  private initError: Error | null = null;

  constructor(
    primary: InitializableDictionaryProvider,
    fallback: InitializableDictionaryProvider | null = null
  ) {
    this.primary = primary;
    this.fallback = fallback;
    this.isReady = this.primary.isInitialized() && (this.fallback ? this.fallback.isInitialized() : true);
  }

  /**
   * Returns true if active dictionary providers are initialized into memory.
   */
  public isInitialized(): boolean {
    return this.isReady;
  }

  /**
   * Returns initialization error if all active providers failed to load.
   */
  public getInitializationError(): Error | null {
    return this.initError;
  }

  /**
   * Asynchronously initializes the primary and fallback providers.
   * Uses singleton promise deduplication to prevent redundant concurrent fetches.
   * If both providers fail, throws an explicit error and clears the promise to permit retry.
   */
  public async ensureInitialized(): Promise<void> {
    if (this.isReady) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      let primaryError: Error | null = null;
      let fallbackError: Error | null = null;

      // 1. Initialize Primary (Authored)
      try {
        await this.primary.ensureInitialized();
      } catch (err) {
        primaryError = err instanceof Error ? err : new Error(String(err));
        console.warn('[CompositeDictionaryProvider] Primary (authored) provider initialization failed:', primaryError.message);
      }

      // 2. Initialize Fallback (Legacy) if present
      if (this.fallback) {
        try {
          await this.fallback.ensureInitialized();
        } catch (err) {
          fallbackError = err instanceof Error ? err : new Error(String(err));
          console.warn('[CompositeDictionaryProvider] Fallback (legacy) provider initialization failed:', fallbackError.message);
        }
      }

      // 3. Evaluate combined readiness
      const primaryOk = this.primary.isInitialized();
      const fallbackOk = this.fallback ? this.fallback.isInitialized() : false;

      if (!primaryOk && !fallbackOk) {
        // Both failed: surface explicit error and allow subsequent retry
        this.initPromise = null;
        this.isReady = false;
        this.initError = primaryError || fallbackError || new Error('All dictionary providers failed to initialize');
        throw this.initError;
      }

      // At least one provider is ready
      this.isReady = true;
      this.initError = null;
    })();

    return this.initPromise;
  }

  /**
   * Multi-stage composite lookup:
   * 1. Query authored provider first. If match found, return tagged with providerId: 'authored'.
   * 2. If authored returns null or throws, fallback to legacy provider.
   * 3. If fallback returns match, return tagged with providerId: 'legacy'.
   * 4. If neither matches, return null (genuine word not found).
   * 5. If legacy throws after authored failure, rethrow explicit error.
   */
  public async lookup(
    word: string,
    sourceLang: string,
    targetLang: string
  ): Promise<DictionaryResult | null> {
    if (!word) return null;

    const query = word.trim();
    if (!query) return null;

    if (!this.isReady) {
      await this.ensureInitialized();
    }

    let authoredResult: DictionaryResult | null = null;
    let authoredThrew = false;

    // Stage 1: Query Primary (Authored) Provider
    try {
      authoredResult = await this.primary.lookup(query, sourceLang, targetLang);
    } catch (err) {
      authoredThrew = true;
      console.warn('[CompositeDictionaryProvider] Primary provider lookup error, falling back:', err);
    }

    if (authoredResult) {
      return {
        ...authoredResult,
        providerId: 'authored',
      };
    }

    // Stage 2: Fallback to Legacy Provider (if authored returned null or threw)
    if (this.fallback) {
      try {
        const legacyResult = await this.fallback.lookup(query, sourceLang, targetLang);
        if (legacyResult) {
          return {
            ...legacyResult,
            providerId: 'legacy',
          };
        }
      } catch (legacyErr) {
        // If authored also failed/threw or if fallback was strictly required, rethrow explicit error
        console.error('[CompositeDictionaryProvider] Fallback provider lookup failed:', legacyErr);
        throw legacyErr instanceof Error ? legacyErr : new Error(String(legacyErr));
      }
    } else if (authoredThrew) {
      // No fallback available and primary threw: must throw explicit error
      throw new Error(`Primary dictionary provider lookup failed for "${query}"`);
    }

    // Stage 3: Genuine word not found across all active providers
    return null;
  }
}
