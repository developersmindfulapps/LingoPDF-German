import { createWorker, OEM, PSM, type Worker, type ImageLike } from 'tesseract.js';
import {
  type OCRBoundingBox,
  type OCRWord,
  type OCRPageResult,
  type OCRProgress,
  type OCRStatus,
  type RecognizeOptions,
  OCRCancelledError,
} from './ocrTypes.ts';

/**
 * Resolves the Tesseract worker script URL for the current environment.
 * In a Chrome Extension MV3, this loads from the local extension bundle.
 */
function resolveWorkerPath(): string | undefined {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    try {
      return chrome.runtime.getURL('tesseract/worker-entry.js');
    } catch {
      // Fallback to relative URL
    }
  }
  if (typeof window !== 'undefined') {
    return '/tesseract/worker-entry.js';
  }
  return undefined;
}

/**
 * Resolves the Tesseract core WASM directory URL for the current environment.
 */
function resolveCorePath(): string | undefined {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    try {
      return chrome.runtime.getURL('tesseract/');
    } catch {
      // Fallback to relative URL
    }
  }
  if (typeof window !== 'undefined') {
    return '/tesseract/';
  }
  return undefined;
}

/**
 * Resolves the traineddata language directory URL for the current environment.
 */
function resolveLangPath(): string {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    try {
      return chrome.runtime.getURL('tessdata');
    } catch {
      // Fallback to relative URL
    }
  }
  if (typeof window !== 'undefined') {
    return '/tessdata';
  }
  return 'public/tessdata';
}

interface EmbeddedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Detects embedded tinted/callout/sidebar regions on a page canvas or bitmap.
 * Downsamples by 4x for sub-millisecond connected component analysis.
 */
function detectEmbeddedRegionsFromRgba(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): EmbeddedRegion[] {
  if (width < 200 || height < 200) return [];

  const ds = 4;
  const dsW = Math.floor(width / ds);
  const dsH = Math.floor(height / ds);
  const mask = new Uint8Array(dsW * dsH);

  for (let dy = 0; dy < dsH; dy++) {
    const y = dy * ds;
    const rowStart = y * width * 4;
    for (let dx = 0; dx < dsW; dx++) {
      const x = dx * ds;
      const px = rowStart + x * 4;
      const r = rgba[px];
      const g = rgba[px + 1];
      const b = rgba[px + 2];
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const diff = maxC - minC;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // Tinted / shaded callout background (color saturation / chroma difference > 18, not black text, not pure white)
      if (lum > 110 && lum < 248 && diff > 18) {
        mask[dy * dsW + dx] = 1;
      }
    }
  }

  const visited = new Uint8Array(dsW * dsH);
  const regions: Array<EmbeddedRegion & { score: number }> = [];

  for (let y = 0; y < dsH; y++) {
    for (let x = 0; x < dsW; x++) {
      const idx = y * dsW + x;
      if (mask[idx] === 1 && visited[idx] === 0) {
        let minX = x, maxX = x, minY = y, maxY = y;
        let count = 0;
        const queue = [x, y];
        visited[idx] = 1;
        let qHead = 0;

        while (qHead < queue.length) {
          const cx = queue[qHead++];
          const cy = queue[qHead++];
          count++;
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < dsW && ny >= 0 && ny < dsH) {
              const nIdx = ny * dsW + nx;
              if (mask[nIdx] === 1 && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                queue.push(nx, ny);
              }
            }
          }
        }

        const nativeW = (maxX - minX + 1) * ds;
        const nativeH = (maxY - minY + 1) * ds;
        // Bounding box filter: minimum 100x50px for callout boxes/tables, max 95% of page
        if (nativeW >= 100 && nativeH >= 50 && count >= 50 && nativeW < width * 0.95 && nativeH < height * 0.95) {
          const pad = 10;
          const px0 = Math.max(0, minX * ds - pad);
          const py0 = Math.max(0, minY * ds - pad);
          const px1 = Math.min(width, (maxX + 1) * ds + pad);
          const py1 = Math.min(height, (maxY + 1) * ds + pad);
          regions.push({
            x: px0,
            y: py0,
            width: px1 - px0,
            height: py1 - py0,
            score: count,
          });
        }
      }
    }
  }

  // Sort by prominence (pixel count) and take up to 6 prominent embedded regions
  regions.sort((a, b) => b.score - a.score);
  return regions.slice(0, 6);
}

function extractWordsFromData(data: { blocks?: any[] | null; words?: any[] | null }): OCRWord[] {
  const words: OCRWord[] = [];
  if (data.blocks) {
    for (const block of data.blocks) {
      if (block.paragraphs) {
        for (const paragraph of block.paragraphs) {
          if (paragraph.lines) {
            for (const line of paragraph.lines) {
              if (line.words) {
                for (const word of line.words) {
                  const rawText = word.text ? word.text.trim() : '';
                  if (rawText.length > 0 && word.bbox) {
                    let x0 = Math.round(word.bbox.x0);
                    let y0 = Math.round(word.bbox.y0);
                    let x1 = Math.round(word.bbox.x1);
                    let y1 = Math.round(word.bbox.y1);

                    // Clamp to line bounds if line has valid bounding box and word spans anomalously
                    if (line.bbox) {
                      const lineY0 = Math.round(line.bbox.y0);
                      const lineY1 = Math.round(line.bbox.y1);
                      const lineH = lineY1 - lineY0;
                      if (lineH > 0 && (y1 - y0) > lineH * 2.2) {
                        y0 = Math.max(y0, lineY0);
                        y1 = Math.min(y1, lineY1);
                      }
                    }

                    // Reject anomalous single- or two-character noise spans that stretch excessively wide (e.g. photo grain/squiggles)
                    const wWidth = x1 - x0;
                    const conf = typeof word.confidence === 'number' ? Math.round(word.confidence) : 0;
                    if (rawText.length <= 2 && wWidth > 80 && conf < 50) {
                      continue;
                    }

                    words.push({
                      text: rawText,
                      bbox: { x0, y0, x1, y1 },
                      confidence: conf,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  if (words.length === 0 && Array.isArray((data as unknown as { words?: Array<{ text: string; bbox: OCRBoundingBox; confidence: number }> }).words)) {
    const directWords = (data as unknown as { words: Array<{ text: string; bbox: OCRBoundingBox; confidence: number }> }).words;
    for (const word of directWords) {
      const rawText = word.text ? word.text.trim() : '';
      if (rawText.length > 0 && word.bbox) {
        words.push({
          text: rawText,
          bbox: {
            x0: Math.round(word.bbox.x0),
            y0: Math.round(word.bbox.y0),
            x1: Math.round(word.bbox.x1),
            y1: Math.round(word.bbox.y1),
          },
          confidence: typeof word.confidence === 'number' ? Math.round(word.confidence) : 0,
        });
      }
    }
  }

  return words;
}

interface ActiveJob {
  id: number;
  abortReject: (err: OCRCancelledError) => void;
  onProgress?: (progress: OCRProgress) => void;
}

export class OCRService {
  private static instance: OCRService;
  private worker: Worker | null = null;
  private initPromise: Promise<Worker> | null = null;
  private status: OCRStatus = 'idle';
  private activeJob: ActiveJob | null = null;
  private jobCounter = 0;

  // Custom path overrides for Node.js / testing environments
  private customWorkerPath?: string;
  private customCorePath?: string;
  private customLangPath?: string;

  private constructor() {}

  public static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }

  /**
   * Configures custom local path overrides (primarily for Node.js automated test environments).
   */
  public configurePaths(paths: { workerPath?: string; corePath?: string; langPath?: string }): void {
    if (paths.workerPath) this.customWorkerPath = paths.workerPath;
    if (paths.corePath) this.customCorePath = paths.corePath;
    if (paths.langPath) this.customLangPath = paths.langPath;
  }

  /**
   * Returns whether an OCR worker is currently initialized and ready.
   */
  public isInitialized(): boolean {
    return this.worker !== null;
  }

  /**
   * Returns current lifecycle status.
   */
  public getStatus(): OCRStatus {
    return this.status;
  }

  /**
   * Initializes the Tesseract OCR worker for German ('deu') using local assets.
   * Concurrent initialization calls share the same promise.
   */
  public async initialize(): Promise<Worker> {
    if (this.worker) {
      return this.worker;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.status = 'initializing';

    this.initPromise = (async () => {
      try {
        const workerPath = this.customWorkerPath || resolveWorkerPath();
        const corePath = this.customCorePath || resolveCorePath();
        const langPath = this.customLangPath || resolveLangPath();

        const workerOptions: Record<string, unknown> = {
          langPath,
          gzip: true,
          workerBlobURL: false,
          logger: (msg: { status?: string; progress?: number }) => {
            if (this.activeJob?.onProgress && msg.progress !== undefined) {
              this.activeJob.onProgress({
                status: msg.status || 'processing',
                progress: typeof msg.progress === 'number' ? Math.min(Math.max(msg.progress, 0), 1) : 0,
              });
            }
          },
        };

        if (workerPath) {
          workerOptions.workerPath = workerPath;
        }
        if (corePath) {
          workerOptions.corePath = corePath;
        }

        const worker = await createWorker(
          'deu',
          OEM.LSTM_ONLY,
          workerOptions
        );

        // Configure Page Segmentation Mode (PSM.SPARSE_TEXT preserves marginalia, headers, footers, and page numbers)
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        });

        // Cold-start cancellation guard: terminate worker if cancelled while initializing
        if (this.status === 'cancelled') {
          await worker.terminate().catch(() => {});
          this.worker = null;
          return worker;
        }

        this.worker = worker;
        this.status = 'idle';
        return worker;
      } catch (err) {
        this.status = 'error';
        this.worker = null;
        console.error('Failed to initialize OCR worker:', err);
        throw err;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Runs OCR on a single page image source.
   * Returns structured word tokens with bounding boxes and confidence metrics.
   */
  public async recognize(
    imageSource: ImageLike,
    pageNumber = 1,
    options: RecognizeOptions = {}
  ): Promise<OCRPageResult> {
    // Check if cancellation was pre-requested via AbortSignal
    if (options.signal?.aborted) {
      throw new OCRCancelledError();
    }

    // Cancel any previous in-flight job before starting a new one
    if (this.activeJob) {
      this.cancel();
    }

    const jobId = ++this.jobCounter;
    this.status = 'recognizing';

    let abortRejectHandler!: (err: OCRCancelledError) => void;
    const cancelPromise = new Promise<never>((_, reject) => {
      abortRejectHandler = reject;
    });

    const activeJobInfo: ActiveJob = {
      id: jobId,
      abortReject: abortRejectHandler,
      onProgress: options.onProgress,
    };
    this.activeJob = activeJobInfo;

    // Listen to optional AbortSignal
    const abortListener = () => {
      this.cancel();
    };
    if (options.signal) {
      options.signal.addEventListener('abort', abortListener, { once: true });
    }

    try {
      const recognitionPromise = (async () => {
        const worker = await this.initialize();

        // Check if job was cancelled while initializing worker
        if (this.activeJob?.id !== jobId) {
          throw new OCRCancelledError();
        }

        // Request structured blocks & text format
        let result;
        try {
          result = await worker.recognize(
            imageSource,
            {},
            { blocks: true, text: true }
          );
        } catch (recognizeErr) {
          if (this.activeJob?.id !== jobId || this.status === 'cancelled') {
            throw new OCRCancelledError();
          }
          throw recognizeErr;
        }

        // Check if job was cancelled while recognition was running
        if (this.activeJob?.id !== jobId) {
          throw new OCRCancelledError();
        }

        const data = result.data;
        let words = extractWordsFromData(data);

        // Determine source image dimensions
        let imageWidth = 0;
        let imageHeight = 0;

        if (typeof imageSource === 'object' && imageSource !== null) {
          if ('width' in imageSource && typeof (imageSource as { width: unknown }).width === 'number') {
            imageWidth = (imageSource as { width: number }).width;
          }
          if ('height' in imageSource && typeof (imageSource as { height: unknown }).height === 'number') {
            imageHeight = (imageSource as { height: number }).height;
          }
        }

        // Detect embedded callout boxes, sidebars, and tables
        let embeddedRegions: EmbeddedRegion[] = [];
        let createSubImage: ((r: EmbeddedRegion) => ImageLike) | null = null;

        if (typeof HTMLCanvasElement !== 'undefined' && imageSource instanceof HTMLCanvasElement) {
          const ctx = imageSource.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            const imgData = ctx.getImageData(0, 0, imageSource.width, imageSource.height);
            embeddedRegions = detectEmbeddedRegionsFromRgba(imgData.data, imageSource.width, imageSource.height);
            createSubImage = (r) => {
              const subCanvas = document.createElement('canvas');
              subCanvas.width = r.width;
              subCanvas.height = r.height;
              const subCtx = subCanvas.getContext('2d');
              if (subCtx) {
                subCtx.drawImage(imageSource, r.x, r.y, r.width, r.height, 0, 0, r.width, r.height);
              }
              return subCanvas;
            };
          }
        } else if (
          typeof Buffer !== 'undefined' &&
          Buffer.isBuffer(imageSource) &&
          imageSource.length > 54 &&
          imageSource[0] === 0x42 &&
          imageSource[1] === 0x4d
        ) {
          // Node.js test environment support for BMP buffers
          const bW = imageSource.readInt32LE(18);
          const bH = Math.abs(imageSource.readInt32LE(22));
          imageWidth = imageWidth || bW;
          imageHeight = imageHeight || bH;
          const rowSize = Math.floor((24 * bW + 31) / 32) * 4;
          const rgba = new Uint8Array(bW * bH * 4);
          let dstIdx = 0;
          for (let y = 0; y < bH; y++) {
            const rowStart = 54 + y * rowSize;
            for (let x = 0; x < bW; x++) {
              const px = rowStart + x * 3;
              rgba[dstIdx++] = imageSource[px + 2]; // R
              rgba[dstIdx++] = imageSource[px + 1]; // G
              rgba[dstIdx++] = imageSource[px]; // B
              rgba[dstIdx++] = 255;
            }
          }
          embeddedRegions = detectEmbeddedRegionsFromRgba(rgba, bW, bH);
          createSubImage = (r) => {
            const cropRowSize = Math.floor((24 * r.width + 31) / 32) * 4;
            const cropBuf = Buffer.alloc(54 + cropRowSize * r.height);
            imageSource.copy(cropBuf, 0, 0, 54);
            cropBuf.writeInt32LE(r.width, 18);
            cropBuf.writeInt32LE(-r.height, 22);
            cropBuf.writeUInt32LE(cropRowSize * r.height, 34);
            let dst = 54;
            for (let y = r.y; y < r.y + r.height; y++) {
              const srcRow = 54 + y * rowSize;
              const rowDst = dst;
              for (let x = r.x; x < r.x + r.width; x++) {
                const px = srcRow + x * 3;
                cropBuf[dst++] = imageSource[px];
                cropBuf[dst++] = imageSource[px + 1];
                cropBuf[dst++] = imageSource[px + 2];
              }
              while ((dst - rowDst) % 4 !== 0) cropBuf[dst++] = 0;
            }
            return cropBuf;
          };
        }

        // Layout-aware secondary pass: run isolated OCR on detected callouts/sidebars
        if (embeddedRegions.length > 0 && createSubImage) {
          try {
            await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
            for (const r of embeddedRegions) {
              if (this.activeJob?.id !== jobId) break;
              const subImage = createSubImage(r);
              const regResult = await worker.recognize(subImage, {}, { blocks: true });
              if (this.activeJob?.id !== jobId) break;

              const regWords = extractWordsFromData(regResult.data);
              if (regWords.length > 0) {
                // Offset bounding boxes to full page coordinate space
                for (const rw of regWords) {
                  rw.bbox.x0 += r.x;
                  rw.bbox.x1 += r.x;
                  rw.bbox.y0 += r.y;
                  rw.bbox.y1 += r.y;
                }

                // Remove coarse/overlapping words inside or significantly intersecting this region
                words = words.filter((w) => {
                  const cx = (w.bbox.x0 + w.bbox.x1) / 2;
                  const cy = (w.bbox.y0 + w.bbox.y1) / 2;
                  const wW = w.bbox.x1 - w.bbox.x0;
                  const wH = w.bbox.y1 - w.bbox.y0;
                  const wArea = Math.max(1, wW * wH);
                  const ox = Math.max(0, Math.min(w.bbox.x1, r.x + r.width) - Math.max(w.bbox.x0, r.x));
                  const oy = Math.max(0, Math.min(w.bbox.y1, r.y + r.height) - Math.max(w.bbox.y0, r.y));
                  const overlapRatio = (ox * oy) / wArea;
                  const inside = (cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height) || overlapRatio > 0.35;
                  return !inside;
                });

                // Add high-precision region words
                words.push(...regWords);
              }
            }
          } finally {
            // Restore SPARSE_TEXT mode for subsequent page recognitions
            await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT }).catch(() => {});
          }
        }

        // Fallback dimension calculation from bounding boxes
        if (imageWidth === 0 || imageHeight === 0) {
          let maxX = 0;
          let maxY = 0;
          for (const word of words) {
            if (word.bbox.x1 > maxX) maxX = word.bbox.x1;
            if (word.bbox.y1 > maxY) maxY = word.bbox.y1;
          }
          imageWidth = imageWidth || maxX;
          imageHeight = imageHeight || maxY;
        }

        // Defensive bounding box clamping to image boundaries
        for (const word of words) {
          if (imageWidth > 0) {
            word.bbox.x0 = Math.max(0, Math.min(word.bbox.x0, imageWidth));
            word.bbox.x1 = Math.max(0, Math.min(word.bbox.x1, imageWidth));
          }
          if (imageHeight > 0) {
            word.bbox.y0 = Math.max(0, Math.min(word.bbox.y0, imageHeight));
            word.bbox.y1 = Math.max(0, Math.min(word.bbox.y1, imageHeight));
          }
        }

        const pageResult: OCRPageResult = {
          pageNumber,
          text: data.text ? data.text.trim() : '',
          words,
          confidence: typeof data.confidence === 'number' ? Math.round(data.confidence) : 0,
          imageWidth,
          imageHeight,
        };

        return pageResult;
      })();

      // Catch and swallow background worker termination errors if the job was cancelled
      const safeRecognitionPromise = recognitionPromise.catch((err) => {
        if (this.activeJob?.id !== jobId || this.status === 'cancelled') {
          // Return a pending promise that never resolves/rejects so cancelPromise wins the race cleanly
          return new Promise<never>(() => {});
        }
        throw err;
      });

      // Race recognition against cancellation
      const pageResult = await Promise.race([safeRecognitionPromise, cancelPromise]);

      this.status = 'completed';
      return pageResult;
    } catch (err) {
      if (err instanceof OCRCancelledError) {
        this.status = 'cancelled';
      } else {
        this.status = 'error';
      }
      throw err;
    } finally {
      if (options.signal) {
        options.signal.removeEventListener('abort', abortListener);
      }
      if (this.activeJob?.id === jobId) {
        this.activeJob = null;
      }
    }
  }

  /**
   * Cancels the currently running OCR operation immediately.
   * If a job is active, terminates the active worker thread so in-flight Wasm
   * processing stops immediately and resets the worker reference for subsequent calls.
   */
  public cancel(): void {
    if (this.activeJob) {
      const job = this.activeJob;
      this.activeJob = null;
      this.status = 'cancelled';

      // Terminate running worker to immediately halt background processing
      if (this.worker) {
        const workerToTerminate = this.worker;
        this.worker = null;
        workerToTerminate.terminate().catch((err) => {
          console.warn('Error during OCR worker cancellation termination:', err);
        });
      } else if (this.initPromise) {
        // Cold-start guard: worker is still initializing in the background.
        // Once resolved, ensure it terminates cleanly without leaking resources.
        this.initPromise.then((w) => {
          w.terminate().catch(() => {});
        }).catch(() => {});
      }

      job.abortReject(new OCRCancelledError());
    }
  }

  /**
   * Terminates the OCR worker and releases all resources.
   */
  public async terminate(): Promise<void> {
    this.cancel();

    if (this.initPromise) {
      try {
        const worker = await this.initPromise;
        await worker.terminate();
      } catch {
        // Ignore initialization error during termination
      }
      this.initPromise = null;
    }

    if (this.worker) {
      const worker = this.worker;
      this.worker = null;
      try {
        await worker.terminate();
      } catch (err) {
        console.warn('Error terminating OCR worker:', err);
      }
    }

    this.status = 'idle';
    this.activeJob = null;
  }
}

export const ocrService = OCRService.getInstance();
