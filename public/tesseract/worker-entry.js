/**
 * PDF Language Companion - Tesseract Worker Entrypoint
 *
 * Wraps worker.min.js to redirect Tesseract C++ diagnostic stderr output
 * ("Estimating resolution as %d") from console.error to console.info.
 *
 * In Chrome extensions, any call to console.error inside a Web Worker is
 * classified by the browser as an unhandled extension runtime error in
 * chrome://extensions. Tesseract outputs informational DPI estimation notices
 * to POSIX stderr (fd 2), which Emscripten's default printErr forwards to
 * console.error.
 *
 * This wrapper intercepts non-fatal DPI estimation diagnostics so they do not
 * generate false extension error entries, while preserving all real runtime
 * errors, uncaught exceptions, and CSP violations.
 */

if (typeof self !== 'undefined' && self.console && typeof self.console.error === 'function') {
  const originalConsoleError = self.console.error.bind(self.console);
  self.console.error = function (...args) {
    if (typeof args[0] === 'string' && args[0].startsWith('Estimating resolution as')) {
      (self.console.info || self.console.log)(...args);
      return;
    }
    originalConsoleError(...args);
  };
}

importScripts('./worker.min.js');
