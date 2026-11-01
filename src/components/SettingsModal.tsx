import React, { useEffect, useRef, useState } from 'react';
import { Settings, X, ShieldCheck, Sparkles, Hand } from 'lucide-react';
import { settingsService, type AutoOCRPreference } from '../services/settings/settingsService.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const [preference, setPreference] = useState<AutoOCRPreference>(() =>
    settingsService.getAutoOCRPreference()
  );

  useEffect(() => {
    if (isOpen) {
      setPreference(settingsService.getAutoOCRPreference());
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
          return;
        }

        if (e.key === 'Tab' && backdropRef.current) {
          const focusableElements = backdropRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown, true);
      return () => {
        window.removeEventListener('keydown', handleKeyDown, true);
        if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
          previousActiveElementRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePreferenceChange = (newPref: AutoOCRPreference) => {
    settingsService.setAutoOCRPreference(newPref);
    setPreference(newPref);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 font-sans select-text">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-sm font-bold text-slate-800 leading-tight">
                Extension Settings
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                Preferences &bull; LingoPDF
              </span>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors"
            aria-label="Close settings"
            title="Close (Escape)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-600">
          {/* Automatic OCR Preference */}
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Optical Character Recognition (OCR)
              </h3>
              <p className="text-[11px] text-slate-500 pt-0.5">
                Control how LingoPDF processes scanned or image-only PDF pages.
              </p>
            </div>

            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  preference === 'enabled'
                    ? 'bg-indigo-50/60 border-indigo-300 text-slate-800'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="auto_ocr_pref"
                  value="enabled"
                  checked={preference === 'enabled'}
                  onChange={() => handlePreferenceChange('enabled')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Automatic OCR (Recommended)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Automatically detect scanned pages and recognize German text in the background so you can look up words instantly.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  preference === 'disabled'
                    ? 'bg-indigo-50/60 border-indigo-300 text-slate-800'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="auto_ocr_pref"
                  value="disabled"
                  checked={preference === 'disabled'}
                  onChange={() => handlePreferenceChange('disabled')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                    <Hand className="w-3.5 h-3.5 text-slate-600" />
                    <span>Manual OCR Only</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Never run OCR automatically. You can still trigger text recognition on any scanned page by clicking the &ldquo;Run OCR&rdquo; button.
                  </p>
                </div>
              </label>
            </div>

            {preference === 'unset' && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-800">
                You have not yet set a preference. LingoPDF will ask for your preference when the first scanned page is detected.
              </div>
            )}

            {preference !== 'unset' && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handlePreferenceChange('unset')}
                  className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 underline cursor-pointer"
                >
                  Reset preference to default (prompt me next time)
                </button>
              </div>
            )}
          </div>

          {/* Privacy Notice */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-[11px]">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Offline &amp; Local Processing</span>
            </div>
            <p className="text-slate-600">
              All OCR processing runs locally inside your browser via WebAssembly and bundled Tesseract language models.
              Zero network requests, zero third-party APIs, and zero data uploads.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-slate-100 bg-slate-50/80 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
