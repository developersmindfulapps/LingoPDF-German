import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy, PDFPageProxy, ZoomState } from '../types/pdf';
import type { WordSelection } from '../types/selection';
import { pdfService } from '../services/pdfService';
import { LoadingSpinner } from './LoadingSpinner';
import { TextLayer } from './TextLayer';
import { OCRTextLayer } from './OCRTextLayer';
import { EmptyTextWarning } from './EmptyTextWarning';
import { AutoOCROptInBanner } from './AutoOCROptInBanner';
import type { OCRPageResult } from '../services/ocr/ocrTypes';
import type { PageClassificationResult } from '../services/ocr/ocrDetection';
import { settingsService, type AutoOCRPreference } from '../services/settings/settingsService';

interface PDFViewerProps {
  doc: PDFDocumentProxy;
  currentPage: number;
  zoom: ZoomState;
  ocrResult?: OCRPageResult | null;
  isOCRProcessing?: boolean;
  ocrProgress?: number;
  ocrStatusText?: string;
  ocrError?: string | null;
  onRunOCR?: (canvas: HTMLCanvasElement | null, pageNumber?: number, isRetry?: boolean) => void;
  onCancelOCR?: () => void;
  isPageFailed?: (pageNumber: number) => boolean;
  hasCachedResult?: (pageNumber: number) => boolean;
  onPageChange: (newPage: number) => void;
  onZoomChange: (newZoom: ZoomState) => void;
  onLoadingStateChange: (isLoading: boolean) => void;
  onWordSelected?: (selection: WordSelection | null) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  doc,
  currentPage,
  zoom,
  ocrResult,
  isOCRProcessing,
  ocrProgress,
  ocrStatusText,
  ocrError,
  onRunOCR,
  onCancelOCR,
  isPageFailed,
  hasCachedResult,
  onPageChange,
  onZoomChange,
  onLoadingStateChange,
  onWordSelected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<PDFPageProxy | null>(null);
  const [currentScale, setCurrentScale] = useState<number>(zoom.scale);
  const [classification, setClassification] = useState<PageClassificationResult | null>(null);
  const [autoOCRPreference, setAutoOCRPreference] = useState<AutoOCRPreference>(() =>
    settingsService.getAutoOCRPreference()
  );

  const AUTO_OCR_DEBOUNCE_MS = 750;
  const cancelRenderRef = useRef<(() => void) | null>(null);
  const autoTriggeredPageRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPageRef = useRef<number>(currentPage);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Sync with persistent settings service
  useEffect(() => {
    setAutoOCRPreference(settingsService.getAutoOCRPreference());
    const unsubscribe = settingsService.subscribe((newPref) => {
      setAutoOCRPreference(newPref);
    });
    return unsubscribe;
  }, []);

  // Calculate fit-to-width scale if required
  const calculateEffectiveScale = useCallback(
    (page: PDFPageProxy): number => {
      if (zoom.mode === 'custom') {
        return zoom.scale;
      }

      if (!containerRef.current) {
        return zoom.scale;
      }

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      // Leave 48px padding (24px each side)
      const containerWidth = containerRef.current.clientWidth - 48;
      if (containerWidth <= 0) {
        return zoom.scale;
      }

      const fitScale = Math.min(Math.max(containerWidth / unscaledViewport.width, 0.4), 2.5);
      return fitScale;
    },
    [zoom.mode, zoom.scale]
  );

  // Render current page canvas and update active page
  useEffect(() => {
    let isCancelled = false;

    async function loadAndRender() {
      if (!canvasRef.current || !doc) return;

      setIsRendering(true);
      onLoadingStateChange(true);
      setRenderError(null);

      // Cancel any previous in-flight render task
      if (cancelRenderRef.current) {
        cancelRenderRef.current();
        cancelRenderRef.current = null;
      }

      try {
        const page = await pdfService.getPage(doc, currentPage);
        if (isCancelled) return;

        setActivePage(page);
        const effectiveScale = calculateEffectiveScale(page);
        setCurrentScale(effectiveScale);

        // Update zoom scale state if fit-width computed a new scale
        if (zoom.mode === 'fit-width' && Math.abs(zoom.scale - effectiveScale) > 0.01) {
          onZoomChange({ scale: effectiveScale, mode: 'fit-width' });
        }

        const renderHandle = pdfService.renderPage(page, canvasRef.current, effectiveScale);
        cancelRenderRef.current = renderHandle.cancel;

        await renderHandle.promise;

        if (!isCancelled) {
          setIsRendering(false);
          onLoadingStateChange(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error rendering page:', err);
          setRenderError(err instanceof Error ? err.message : 'Error rendering page.');
          setIsRendering(false);
          onLoadingStateChange(false);
        }
      }
    }

    loadAndRender();

    return () => {
      isCancelled = true;
      if (cancelRenderRef.current) {
        cancelRenderRef.current();
        cancelRenderRef.current = null;
      }
    };
  }, [doc, currentPage, zoom.scale, zoom.mode, calculateEffectiveScale, onZoomChange, onLoadingStateChange]);

  // Reset classification, auto-trigger guard, and pending debounce timer when changing pages
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setClassification(null);
    autoTriggeredPageRef.current = null;
  }, [currentPage, doc]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (currentPage > 1) onPageChange(currentPage - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        if (currentPage < doc.numPages) onPageChange(currentPage + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, doc.numPages, onPageChange]);

  // Handle container resize in fit-width mode
  useEffect(() => {
    if (zoom.mode !== 'fit-width' || !containerRef.current) return;

    let resizeTimer: number;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (activePage) {
          const newScale = calculateEffectiveScale(activePage);
          if (Math.abs(zoom.scale - newScale) > 0.02) {
            onZoomChange({ scale: newScale, mode: 'fit-width' });
          }
        }
      }, 100);
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      window.clearTimeout(resizeTimer);
    };
  }, [zoom.mode, zoom.scale, activePage, calculateEffectiveScale, onZoomChange]);

  const handleRunOCR = useCallback(
    async (isRetry = false) => {
      if (!onRunOCR || !activePage) return;
      const targetPageNumber = activePage.pageNumber;

      try {
        const ocrCanvas = await pdfService.renderPageForOCR(activePage);
        // Verify user has not navigated away during offscreen rendering
        if (currentPageRef.current !== targetPageNumber) {
          return;
        }
        onRunOCR(ocrCanvas, targetPageNumber, isRetry);
        return;
      } catch (err) {
        console.warn('High-resolution offscreen render for OCR failed, falling back to visible canvas:', err);
      }

      if (currentPageRef.current === targetPageNumber) {
        onRunOCR(canvasRef.current, targetPageNumber, isRetry);
      }
    },
    [activePage, onRunOCR]
  );

  // Automatic OCR Execution Lifecycle with 750ms Debounce and Safe Queue Management
  useEffect(() => {
    // Clear any existing debounce timer whenever page or eligibility changes
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const isEligible = (
      autoOCRPreference === 'enabled' &&
      classification?.isScannedCandidate &&
      !ocrResult &&
      !isOCRProcessing &&
      !isRendering &&
      activePage &&
      activePage.pageNumber === currentPage &&
      autoTriggeredPageRef.current !== currentPage &&
      !hasCachedResult?.(currentPage) &&
      !isPageFailed?.(currentPage)
    );

    if (!isEligible) {
      return;
    }

    const candidatePage = currentPage;
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      // Re-verify that page has remained relevant and stable for 750 ms
      if (
        settingsService.getAutoOCRPreference() === 'enabled' &&
        currentPageRef.current === candidatePage &&
        activePage &&
        activePage.pageNumber === candidatePage &&
        !hasCachedResult?.(candidatePage) &&
        !isPageFailed?.(candidatePage) &&
        autoTriggeredPageRef.current !== candidatePage
      ) {
        autoTriggeredPageRef.current = candidatePage;
        handleRunOCR(false);
      }
    }, AUTO_OCR_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [
    autoOCRPreference,
    classification,
    ocrResult,
    isOCRProcessing,
    isRendering,
    activePage,
    currentPage,
    hasCachedResult,
    isPageFailed,
    handleRunOCR,
  ]);

  const handleEnableAutoOCR = useCallback(() => {
    settingsService.setAutoOCRPreference('enabled');
    setAutoOCRPreference('enabled');
    autoTriggeredPageRef.current = currentPage;
    handleRunOCR();
  }, [currentPage, handleRunOCR]);

  const handleDeclineAutoOCR = useCallback(() => {
    settingsService.setAutoOCRPreference('disabled');
    setAutoOCRPreference('disabled');
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="flex-1 overflow-auto bg-slate-200/80 p-6 flex items-start justify-center focus:outline-none"
    >
      <div className="relative flex flex-col items-center">
        {/* Case A: One-time opt-in banner when preference is unset and page is scanned candidate */}
        {classification?.isScannedCandidate &&
          autoOCRPreference === 'unset' &&
          !ocrResult &&
          !isOCRProcessing && (
            <AutoOCROptInBanner
              onEnable={handleEnableAutoOCR}
              onDecline={handleDeclineAutoOCR}
              className="mb-4"
            />
          )}

        {/* Case B: EmptyTextWarning banner for processing, error, or manual OCR fallback */}
        {((classification?.isScannedCandidate && autoOCRPreference === 'disabled') ||
          isOCRProcessing ||
          ocrError) &&
          !ocrResult && (
            <EmptyTextWarning
              className="mb-4 w-full max-w-lg animate-in fade-in duration-200"
              isProcessing={isOCRProcessing}
              progress={ocrProgress}
              statusText={ocrStatusText}
              errorMessage={ocrError}
              onRunOCR={() => handleRunOCR(false)}
              onCancelOCR={onCancelOCR}
              onRetryOCR={() => handleRunOCR(true)}
            />
          )}

        {/* Page Container holding Canvas + TextLayer */}
        <div className="relative shadow-lg rounded-sm bg-white overflow-hidden transition-all duration-150">
          <canvas ref={canvasRef} className="block" />

          {/* Native Text Layer: Always rendered for active page to preserve browser text selection */}
          {activePage && !isRendering && (
            <TextLayer
              page={activePage}
              scale={currentScale}
              onClassificationChange={setClassification}
              onWordSelected={onWordSelected}
            />
          )}

          {/* OCR Text Layer: Non-blocking transparent overlay for recognized words */}
          {activePage &&
            !isRendering &&
            ocrResult &&
            ocrResult.pageNumber === currentPage && (
              <OCRTextLayer
                ocrResult={ocrResult}
                pageNumber={currentPage}
                page={activePage}
                scale={currentScale}
                onWordSelected={onWordSelected}
              />
            )}

          {/* Page Loading Overlay */}
          {isRendering && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center transition-opacity z-10">
              <LoadingSpinner message="Loading page..." size="sm" />
            </div>
          )}
        </div>

        {/* Render Error */}
        {renderError && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {renderError}
          </div>
        )}
      </div>
    </div>
  );
};
