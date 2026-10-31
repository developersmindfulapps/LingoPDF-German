import React, { useEffect, useRef } from 'react';
import type { PDFPageProxy } from '../types/pdf';
import type { WordSelection } from '../types/selection';
import { pdfService } from '../services/pdfService';
import { useWordSelection } from '../hooks/useWordSelection';
import { classifyPageTextContent, type PageClassificationResult } from '../services/ocr/ocrDetection';

interface TextLayerProps {
  page: PDFPageProxy;
  scale: number;
  onHasTextChange?: (hasText: boolean) => void;
  onClassificationChange?: (classification: PageClassificationResult) => void;
  onWordSelected?: (selection: WordSelection | null) => void;
}

export const TextLayer: React.FC<TextLayerProps> = ({
  page,
  scale,
  onHasTextChange,
  onClassificationChange,
  onWordSelected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cancelRenderRef = useRef<(() => void) | null>(null);

  // Hook into word selection and click detection
  useWordSelection({
    containerRef,
    pageNumber: page.pageNumber,
    onWordSelected,
    enabled: true,
  });

  useEffect(() => {
    let isCancelled = false;
    const container = containerRef.current;
    if (!container) return;

    // Cancel any previous in-flight text layer render
    if (cancelRenderRef.current) {
      cancelRenderRef.current();
      cancelRenderRef.current = null;
    }

    // Clear previous DOM nodes immediately
    container.innerHTML = '';

    async function loadAndRenderText() {
      try {
        const textContent = await pdfService.getTextContent(page);
        if (isCancelled || !container) return;

        // Check if page contains selectable text content
        const hasText = textContent.items.some(
          (item) => 'str' in item && typeof item.str === 'string' && item.str.trim().length > 0
        );

        if (hasText) {
          // Render native PDF text layer immediately so text selection remains fully interactive
          const viewport = page.getViewport({ scale });
          const renderHandle = pdfService.renderTextLayer(textContent, container, viewport);
          cancelRenderRef.current = renderHandle.cancel;
          await renderHandle.promise;
          if (isCancelled) return;
        } else {
          container.innerHTML = '';
        }

        // Asynchronously classify page for OCR candidate detection without blocking text layer
        let opList = null;
        try {
          opList = await page.getOperatorList();
        } catch {
          // If operator list extraction fails, proceed with textContent alone
        }
        if (isCancelled) return;

        const classification = classifyPageTextContent(textContent, opList);
        onHasTextChange?.(classification.hasUsableText);
        onClassificationChange?.(classification);
      } catch (err) {
        if (!isCancelled) {
          console.warn('Text layer extraction/render error:', err);
          onHasTextChange?.(false);
          onClassificationChange?.({
            hasUsableText: false,
            isScannedCandidate: false,
            isBlank: true,
            charCount: 0,
            alphaNumericCharCount: 0,
            wordCount: 0,
            reason: 'insufficient_text',
          });
        }
      }
    }

    loadAndRenderText();

    return () => {
      isCancelled = true;
      if (cancelRenderRef.current) {
        cancelRenderRef.current();
        cancelRenderRef.current = null;
      }
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [page, scale, onHasTextChange, onClassificationChange]);

  return (
    <div
      ref={containerRef}
      className="textLayer"
      aria-hidden="true"
    />
  );
};
