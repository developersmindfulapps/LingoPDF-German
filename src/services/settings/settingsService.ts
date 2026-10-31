/**
 * Settings and Preferences Storage Service
 *
 * Manages persistent extension preferences locally on device using standard localStorage.
 * No data leaves the device; zero network or cloud dependencies.
 */

export type AutoOCRPreference = 'unset' | 'enabled' | 'disabled';

export const AUTO_OCR_PREFERENCE_KEY = 'lingopdf_auto_ocr_preference';

type PreferenceListener = (preference: AutoOCRPreference) => void;

class SettingsService {
  private static instance: SettingsService;
  private listeners: Set<PreferenceListener> = new Set();
  private memoryFallback: Map<string, string> = new Map();

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === AUTO_OCR_PREFERENCE_KEY) {
          const newPref = this.getAutoOCRPreference();
          this.notifyListeners(newPref);
        }
      });
    }
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  private isLocalStorageAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retrieves the current automatic OCR preference.
   * Returns 'unset' if the user has never made a decision.
   */
  public getAutoOCRPreference(): AutoOCRPreference {
    let raw: string | null = null;
    if (this.isLocalStorageAvailable()) {
      raw = window.localStorage.getItem(AUTO_OCR_PREFERENCE_KEY);
    } else {
      raw = this.memoryFallback.get(AUTO_OCR_PREFERENCE_KEY) ?? null;
    }

    if (raw === 'enabled' || raw === 'disabled') {
      return raw;
    }
    return 'unset';
  }

  /**
   * Updates and persists the automatic OCR preference.
   */
  public setAutoOCRPreference(preference: AutoOCRPreference): void {
    if (this.isLocalStorageAvailable()) {
      if (preference === 'unset') {
        window.localStorage.removeItem(AUTO_OCR_PREFERENCE_KEY);
      } else {
        window.localStorage.setItem(AUTO_OCR_PREFERENCE_KEY, preference);
      }
    } else {
      if (preference === 'unset') {
        this.memoryFallback.delete(AUTO_OCR_PREFERENCE_KEY);
      } else {
        this.memoryFallback.set(AUTO_OCR_PREFERENCE_KEY, preference);
      }
    }

    this.notifyListeners(preference);
  }

  /**
   * Resets preference to 'unset' (re-enabling the one-time opt-in prompt).
   */
  public resetAutoOCRPreference(): void {
    this.setAutoOCRPreference('unset');
  }

  /**
   * Subscribes to preference changes. Returns an unsubscribe function.
   */
  public subscribe(listener: PreferenceListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(preference: AutoOCRPreference): void {
    for (const listener of this.listeners) {
      try {
        listener(preference);
      } catch (err) {
        console.error('Error in settings listener:', err);
      }
    }
  }

  /**
   * Testing helper to reset in-memory and local state.
   */
  public clearForTests(): void {
    this.memoryFallback.clear();
    if (this.isLocalStorageAvailable()) {
      window.localStorage.removeItem(AUTO_OCR_PREFERENCE_KEY);
    }
    this.notifyListeners('unset');
  }
}

export const settingsService = SettingsService.getInstance();
