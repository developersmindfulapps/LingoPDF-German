/**
 * PDF Language Companion - Tesseract Worker Entrypoint
 *
 * Wraps worker.min.js to redirect Tesseract C++ diagnostic stderr output
 * ("Estimating resolution as %d" and "Detected %d diacritics") from console.error to console.info.
 */
if (typeof self !== 'undefined' && self.console && typeof self.console.error === 'function') {
  const originalConsoleError = self.console.error.bind(self.console);
  self.console.error = function (...args) {
    if (typeof args[0] === 'string' && (args[0].startsWith('Estimating resolution as') || args[0].startsWith('Detected '))) {
      (self.console.info || self.console.log)(...args);
      return;
    }
    originalConsoleError(...args);
  };
}

importScripts('./worker.min.js');
