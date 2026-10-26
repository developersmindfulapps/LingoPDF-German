import { LocalDictionaryProvider, localDictionaryProvider } from './LocalDictionaryProvider.ts';
import { loadAuthoredDictionaryAssets } from './deEnDataLoader.ts';
import { CompositeDictionaryProvider } from './CompositeDictionaryProvider.ts';

export { LocalDictionaryProvider, localDictionaryProvider } from './LocalDictionaryProvider.ts';
export {
  loadDictionaryAssets,
  loadAuthoredDictionaryAssets,
  resolveDataAssetUrl,
  type LoadedDictionaryData
} from './deEnDataLoader.ts';
export { CompositeDictionaryProvider } from './CompositeDictionaryProvider.ts';
export type {
  DictionaryProvider,
  InitializableDictionaryProvider,
  DictionaryResult,
  DictionaryEntry
} from '../../types/dictionary.ts';

// Dedicated standalone instance for authored learner dataset
export const authoredDictionaryProvider = new LocalDictionaryProvider(
  undefined,
  undefined,
  loadAuthoredDictionaryAssets,
  'authored-de-en',
  'Authored German-English Dictionary'
);

// Composite instance coordinating Authored (Primary) and Legacy (Fallback)
export const compositeDictionaryProvider = new CompositeDictionaryProvider(
  authoredDictionaryProvider,
  localDictionaryProvider
);
