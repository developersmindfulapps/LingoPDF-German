import React from 'react';
import { Sparkles, ShieldCheck, X } from 'lucide-react';

export interface AutoOCROptInBannerProps {
  onEnable: () => void;
  onDecline: () => void;
  className?: string;
}

export const AutoOCROptInBanner: React.FC<AutoOCROptInBannerProps> = ({
  onEnable,
  onDecline,
  className = '',
}) => {
  return (
    <div
      role="region"
      aria-labelledby="auto-ocr-title"
      aria-describedby="auto-ocr-desc"
      className={`w-full max-w-xl bg-white border border-indigo-200 rounded-xl shadow-md p-4 animate-in fade-in slide-in-from-top-2 duration-200 select-none ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 id="auto-ocr-title" className="text-sm font-bold text-slate-800 leading-snug">
              Enable automatic OCR?
            </h3>
            <button
              type="button"
              onClick={onDecline}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
              aria-label="Dismiss and do not enable"
              title="Not now"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p id="auto-ocr-desc" className="text-xs text-slate-600 leading-relaxed">
            Some pages in this PDF appear to be scanned images. LingoPDF can automatically recognize text on these pages so you can look up words without manually running OCR. Processing happens locally on your device.
          </p>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium pt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>100% private and offline &bull; No data leaves your computer</span>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onEnable}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs rounded-md shadow-xs transition-colors cursor-pointer"
            >
              Enable automatic OCR
            </button>
            <button
              type="button"
              onClick={onDecline}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-medium text-xs rounded-md transition-colors cursor-pointer"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
