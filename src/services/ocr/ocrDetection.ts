import type { TextContent } from '../../types/pdf.ts';

export interface PageClassificationResult {
  /** Whether the page has a usable selectable text layer (rendering OCR unnecessary) */
  hasUsableText: boolean;
  /** Whether the page appears to be a scanned image and an eligible candidate for OCR */
  isScannedCandidate: boolean;
  /** Whether the page is completely blank without text or visual content */
  isBlank: boolean;
  /** Number of non-whitespace characters in the text layer */
  charCount: number;
  /** Number of alphanumeric characters in the text layer */
  alphaNumericCharCount: number;
  /** Number of distinct words extracted from the text layer */
  wordCount: number;
  /** Human-readable categorization reason */
  reason: 'usable_text' | 'scanned_image' | 'blank_page' | 'insufficient_text';
}

/**
 * Standard PDF.js operator IDs for image rendering and graphical drawing.
 * Sourced from pdfjsLib.OPS.
 */
const IMAGE_OPERATORS = new Set<number>([
  85, // paintImageXObject
  86, // paintInlineImageXObject
  83, // paintImageMaskXObject
]);

const DRAWING_OPERATORS = new Set<number>([
  91, // constructPath
  22, // fill
  23, // eoFill
  20, // stroke
  87, // paintFormXObject
  90, // shadingFill
]);

/**
 * Inspects an HTML canvas to determine whether it is completely blank (all white or transparent).
 * Uses a sparse grid sampling for sub-millisecond execution.
 */
export function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || canvas.width === 0 || canvas.height === 0) {
      return true;
    }

    const step = Math.max(10, Math.floor(Math.min(canvas.width, canvas.height) / 30));
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let y = 0; y < canvas.height; y += step) {
      const rowStart = y * canvas.width * 4;
      for (let x = 0; x < canvas.width; x += step) {
        const idx = rowStart + x * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Non-white (r, g, b < 248) and sufficiently opaque (a > 20) indicates ink/image pixels
        if (a > 20 && (r < 248 || g < 248 || b < 248)) {
          return false;
        }
      }
    }

    return true;
  } catch {
    // If canvas context access fails or is tainted, defensively treat as non-blank
    return false;
  }
}

/**
 * Evaluates whether a PDF page has a usable selectable text layer or represents a scanned page.
 *
 * Conservative Rules:
 * 1. Pages with valid selectable text (even minimal headings, titles, or page numbers)
 *    are classified as having a usable text layer. OCR is not needed.
 * 2. Pages with zero usable text are audited for visual content (images, vector shapes, or canvas ink).
 * 3. Pages with no text and no visual content are recognized as blank pages and do not trigger OCR.
 * 4. Only pages with visual/image content and no usable text layer are classified as OCR candidates.
 */
export function classifyPageTextContent(
  textContent: TextContent | null | undefined,
  operatorList?: { fnArray: ArrayLike<number> } | null,
  canvas?: HTMLCanvasElement | null
): PageClassificationResult {
  const items = textContent?.items || [];
  let charCount = 0;
  let wordCount = 0;
  let alphaNumericCharCount = 0;

  for (const item of items) {
    if ('str' in item && typeof item.str === 'string') {
      const trimmed = item.str.trim();
      if (trimmed.length > 0) {
        charCount += trimmed.length;
        const words = trimmed.split(/\s+/).filter(Boolean);
        wordCount += words.length;

        // Count letters (including German umlauts/eszett) and digits
        const alphas = trimmed.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '');
        alphaNumericCharCount += alphas.length;
      }
    }
  }

  // A usable text layer contains at least one meaningful alphanumeric word
  const hasUsableText = alphaNumericCharCount > 0 && wordCount > 0;
  if (hasUsableText) {
    return {
      hasUsableText: true,
      isScannedCandidate: false,
      isBlank: false,
      charCount,
      alphaNumericCharCount,
      wordCount,
      reason: 'usable_text',
    };
  }

  // Page has no usable text layer. Distinguish scanned image pages from blank pages.
  let hasImage = false;
  let hasDrawing = false;

  if (operatorList && operatorList.fnArray && operatorList.fnArray.length > 0) {
    const fns = operatorList.fnArray;
    const len = fns.length;
    for (let i = 0; i < len; i++) {
      const op = fns[i];
      if (IMAGE_OPERATORS.has(op)) {
        hasImage = true;
        break;
      }
      if (DRAWING_OPERATORS.has(op)) {
        hasDrawing = true;
      }
    }
  }

  // If operator list did not confirm images/drawings, check rendered canvas if available
  let canvasHasInk = false;
  if (!hasImage && !hasDrawing && canvas) {
    canvasHasInk = !isCanvasBlank(canvas);
  }

  const hasVisualContent = hasImage || hasDrawing || canvasHasInk;

  if (!hasVisualContent) {
    return {
      hasUsableText: false,
      isScannedCandidate: false,
      isBlank: true,
      charCount,
      alphaNumericCharCount,
      wordCount,
      reason: 'blank_page',
    };
  }

  return {
    hasUsableText: false,
    isScannedCandidate: true,
    isBlank: false,
    charCount,
    alphaNumericCharCount,
    wordCount,
    reason: 'scanned_image',
  };
}
