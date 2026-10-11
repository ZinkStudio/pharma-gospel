// utils/pdfjs-loader.js
const PDFJS_URL        = new URL('../vendor/pdf/pdfjs.min@6.3.289.js',        import.meta.url).href;
const PDFJS_WORKER_URL = new URL('../vendor/pdf/pdfjs.worker.min@6.3.289.js', import.meta.url).href;

let promise = null;

/**
 * Charge pdf.js en lazy-load (une seule fois par session).
 * Configure le worker automatiquement.
 *
 * @returns {Promise<typeof import('pdfjs')>}
 */
export function loadPdfJs() {
  if (!promise) {
    promise = import(PDFJS_URL).then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return mod;
    });
  }
  return promise;
}