/**
 * Moteur d'export PDF basé sur html2pdf (html2canvas + jsPDF).
 * Cas d'usage : capture d'un élément DOM existant → PDF image.
 * Ne remplace PAS les documents vectoriels (pdfmake) ni les PDF officiels (pdf-lib).
 */

/** Presets réutilisables. */
export const PDF_PRESETS = {
  FACTURE: {
    margin: 0,
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  },
  DOCUMENT: {
    margin: [10, 10, 10, 10],
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  },
  PAYSAGE: {
    margin: [10, 10, 10, 10],
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  },
  HIGH_RES: {
    margin: 0,
    image: { type: 'png', quality: 1 },
    html2canvas: { scale: 3, dpi: 300, backgroundColor: '#fff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }
};

async function getHtml2Pdf() {
  if (window.html2pdf) return window.html2pdf;
  try {
    const mod = await import('../../../vendor/pdf/html2pdf.bundle.min@0.10.1.js');
    return mod.default || window.html2pdf;
  } catch (err) {
    console.error('[html2pdf-engine] Impossible de charger html2pdf', err);
    throw new Error('Module html2pdf indisponible.');
  }
}

function mergeOptions(defaults, custom) {
  const result = { ...defaults };
  for (const key in custom) {
    if (custom[key] && typeof custom[key] === 'object' && !Array.isArray(custom[key])) {
      result[key] = mergeOptions(defaults[key] || {}, custom[key]);
    } else {
      result[key] = custom[key];
    }
  }
  return result;
}

export class Html2PdfEngine {
  /**
   * Capture un élément HTML et retourne le PDF en Blob.
   * @param {HTMLElement} element - Élément à capturer (sera cloné)
   * @param {Object} [options] - Options html2pdf (voir PDF_PRESETS)
   * @returns {Promise<Blob>}
   */
  static async capture(element, options = {}) {
    if (!element) throw new Error('[html2pdf-engine] Aucun élément fourni.');

    const html2pdf = await getHtml2Pdf();

    // Sandbox invisible — évite d'affecter la page visible.
    const sandbox = document.createElement('div');
    sandbox.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 210mm;
      background: white;
      opacity: 0;
      z-index: -9999;
      pointer-events: none;
    `;
    document.body.appendChild(sandbox);
    sandbox.appendChild(element.cloneNode(true));

    const defaultOptions = {
      margin: 0,
      filename: 'document.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollY: 0
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], before: '.breaker' }
    };

    const finalOptions = mergeOptions(defaultOptions, options);

    try {
      await new Promise(resolve => setTimeout(resolve, 250));
      const worker = html2pdf().set(finalOptions).from(sandbox.firstElementChild);
      return await worker.outputPdf('blob');
    } finally {
      sandbox.remove();
    }
  }
}