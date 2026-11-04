import React, { useMemo, useEffect } from 'react';
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react';
import type { WordSelection } from '../../types/selection';
import type { DictionaryResult } from '../../types/dictionary';

// Known German plural-only nouns (Pluraliatantum) where assigning a singular grammatical gender is misleading
const PLURAL_ONLY_WORDS = new Set<string>([
  'leute',
  'nebenkosten',
  'eltern',
  'ferien',
  'kosten',
  'geschwister',
  'personalien',
  'trümmer',
  'alpen',
  'finanzen',
  'lebensmittel',
  'gebrüder',
  'spaghetti',
  'zutaten',
  'memoiren',
  'pocken',
  'masern',
  'röteln',
  'alliierten',
  'diäten',
  'einkünfte',
  'spesen',
  'wirren',
]);

function isPluralOnlyNoun(word?: string, lemma?: string): boolean {
  const check = (str?: string) => {
    if (!str) return false;
    const lower = str.trim().toLowerCase();
    if (PLURAL_ONLY_WORDS.has(lower)) return true;
    if (
      lower.endsWith('kosten') ||
      lower.endsWith('eltern') ||
      lower.endsWith('ferien') ||
      lower.endsWith('leute')
    ) {
      return true;
    }
    return false;
  };
  return check(lemma) || check(word);
}

function getNounArticle(gender: unknown): 'der' | 'die' | 'das' | null {
  if (typeof gender !== 'string') return null;
  const normalized = gender.trim().toLowerCase();
  if (normalized === 'm' || normalized === 'masculine' || normalized === 'der') return 'der';
  if (normalized === 'f' || normalized === 'feminine' || normalized === 'die') return 'die';
  if (normalized === 'n' || normalized === 'neuter' || normalized === 'das') return 'das';
  return null;
}

interface DictionaryTooltipProps {
  wordSelection: WordSelection | null;
  result: DictionaryResult | null;
  isLoading?: boolean;
  error?: Error | null;
  onClose: () => void;
}

export const DictionaryTooltip: React.FC<DictionaryTooltipProps> = ({
  wordSelection,
  result,
  isLoading = false,
  error = null,
  onClose,
}) => {
  // Virtual element based on the selected word's DOM bounding rect
  const virtualElement = useMemo(() => {
    if (!wordSelection?.rect) return null;
    return {
      getBoundingClientRect: () => wordSelection.rect,
    };
  }, [wordSelection]);

  const { refs, floatingStyles, context } = useFloating({
    open: Boolean(wordSelection),
    onOpenChange: (open) => {
      if (!open) {
        onClose();
      }
    },
    placement: 'top',
    middleware: [
      offset(8),
      flip({
        fallbackPlacements: ['bottom', 'top-start', 'bottom-start', 'right', 'left'],
        padding: 12,
      }),
      shift({ padding: 12 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (virtualElement) {
      refs.setReference(virtualElement);
    }
  }, [virtualElement, refs]);

  const dismiss = useDismiss(context, {
    outsidePress: true,
    escapeKey: true,
  });

  const role = useRole(context, { role: 'tooltip' });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  const isNoun = useMemo(() => {
    if (!result?.partOfSpeech || typeof result.partOfSpeech !== 'string') return false;
    const parts = result.partOfSpeech.toLowerCase().split('/');
    return parts.some((p) => p.trim() === 'noun');
  }, [result?.partOfSpeech]);

  const grammarInfo = useMemo(() => {
    if (!isNoun || !result || isLoading || error) {
      return null;
    }

    // 1. Plural extraction & validation
    let pluralForm: string | null = null;
    if (typeof result.plural === 'string') {
      const trimmed = result.plural.trim();
      if (trimmed.length > 0) {
        pluralForm = trimmed;
      }
    }

    // 2. Plural-only detection to prevent misleading gender display
    const queryWord = wordSelection?.word;
    const isPluralOnly = isPluralOnlyNoun(queryWord, result.lemma);

    // 3. Gender mapping (Masculine -> der, Feminine -> die, Neuter -> das)
    let genderArticle: 'der' | 'die' | 'das' | null = null;
    if (!isPluralOnly && result.gender) {
      genderArticle = getNounArticle(result.gender);
    }

    if (!genderArticle && !pluralForm) {
      return null;
    }

    return {
      article: genderArticle,
      plural: pluralForm,
    };
  }, [isNoun, result, wordSelection?.word, isLoading, error]);

  if (!wordSelection) {
    return null;
  }

  const queryWord = wordSelection.word;
  const hasLemma = Boolean(result?.lemma && result.lemma.toLowerCase() !== queryWord.toLowerCase());

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={floatingStyles}
        {...getFloatingProps()}
        className="z-50 max-w-xs sm:max-w-sm min-w-[180px] bg-white rounded-xl shadow-xl border border-slate-200/90 p-3.5 text-slate-800 animate-in fade-in zoom-in-95 duration-150 select-text font-sans"
        role="tooltip"
        aria-live="polite"
      >
        {/* Header: Query Word, Optional Lemma, Grammatical Info & Part of Speech Badge */}
        <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex flex-col">
            <span className="font-bold text-base text-slate-900 leading-tight">
              {queryWord}
            </span>
            {hasLemma && result?.lemma && (
              <span className="text-xs text-slate-500 font-medium mt-0.5">
                Base: <span className="font-semibold text-slate-700">{result.lemma}</span>
              </span>
            )}
            {grammarInfo && (
              <div className="text-xs text-slate-600 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                {grammarInfo.article && (
                  <span className="font-semibold text-indigo-600">{grammarInfo.article}</span>
                )}
                {grammarInfo.article && grammarInfo.plural && (
                  <span className="text-slate-300">·</span>
                )}
                {grammarInfo.plural && (
                  <span className="text-slate-500">
                    Plural: <span className="font-semibold text-slate-700">{grammarInfo.plural}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {result?.partOfSpeech && !isLoading && !error && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded shrink-0">
              {result.partOfSpeech}
            </span>
          )}
        </div>

        {/* Body: Loading, Error, Translation list, or Word Not Found */}
        <div className="pt-2">
          {isLoading ? (
            <div className="py-1 flex items-center gap-2 text-slate-500">
              <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="text-xs font-medium text-slate-600">Looking up translation...</span>
            </div>
          ) : error ? (
            <div className="py-0.5">
              <p className="text-xs font-semibold text-rose-600 mb-0.5">Dictionary unavailable</p>
              <p className="text-xs text-slate-500 leading-snug">
                Failed to load offline dictionary data. PDF viewing is unaffected.
              </p>
            </div>
          ) : result && result.translations.length > 0 ? (
            <div className="space-y-1">
              {result.translations.length === 1 ? (
                <p className="text-sm font-semibold text-slate-800 leading-snug">
                  {result.translations[0]}
                </p>
              ) : (
                <ul className="space-y-1">
                  {result.translations.map((translation, idx) => (
                    <li
                      key={idx}
                      className="text-xs sm:text-sm font-medium text-slate-700 flex items-start gap-1.5 leading-snug"
                    >
                      <span className="text-slate-400 text-xs mt-0.5 shrink-0">{idx + 1}.</span>
                      <span>{translation}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="py-0.5">
              <p className="text-xs font-semibold text-slate-500 mb-0.5">Word not found</p>
              <p className="text-xs text-slate-400 italic">
                No local translation available for &ldquo;{queryWord}&rdquo;.
              </p>
            </div>
          )}
        </div>
      </div>
    </FloatingPortal>
  );
};
