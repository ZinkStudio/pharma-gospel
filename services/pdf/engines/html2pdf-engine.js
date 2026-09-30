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

let html2pdfLoadPromise = null;

async function getHtml2Pdf() {
  if (window.html2pdf) return window.html2pdf;
  if (!html2pdfLoadPromise) {
    html2pdfLoadPromise = new Promise((resolve, reject) => {
      const src = new URL('../../../vendor/pdf/html2pdf.bundle.min@0.10.1.js', import.meta.url).href;
      if (document.querySelector(`script[src="${src}"]`)) {
        const check = setInterval(() => {
          if (window.html2pdf) { clearInterval(check); resolve(window.html2pdf); }
        }, 50);
        setTimeout(() => { clearInterval(check); reject(new Error('html2pdf timeout')); }, 10000);
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve(window.html2pdf);
      script.onerror = () => {
        html2pdfLoadPromise = null;
        reject(new Error('[html2pdf-engine] Échec du chargement de html2pdf'));
      };
      document.head.appendChild(script);
    });
  }
  return html2pdfLoadPromise;
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
   *
   * ⚠️ Note — html2pdf clone l'intégralité de document.body en interne,
   * y compris les composants Lit de la coquille applicative. Comme ces
   * composants utilisent `adoptedStyleSheets`, leur upgrade dans le
   * document intermédiaire d'html2pdf lève plusieurs DOMException
   * ("Adopted style sheet's constructor document must match...").
   * Ces exceptions sont SANS EFFET sur le PDF produit (le contenu de
   * `element` est du HTML brut, non concerné). Ne pas chercher à les
   * corriger : c'est un comportement upstream connu.
   *
   * 
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

    // Injecter les styles fournis DANS le sandbox — évite de polluer
    // le document global et garantit qu'ils s'appliquent au clone.
    if (options.styles) {
      const styleEl = document.createElement('style');
      styleEl.textContent = options.styles;
      sandbox.appendChild(styleEl);
    }

    // Garde une référence explicite au clone : plus robuste que
    // firstElementChild si on injecte autre chose avant (styles, meta, etc.)
    const clone = element.cloneNode(true);
    sandbox.appendChild(clone);

    const { styles: _ignored, ...html2pdfOptions } = options;

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

    const finalOptions = mergeOptions(defaultOptions, html2pdfOptions);

    try {
      await new Promise(resolve => setTimeout(resolve, 250));
      const worker = html2pdf().set(finalOptions).from(clone);   // ← clone, pas firstElementChild
      return await worker.outputPdf('blob');
    } finally {
      sandbox.remove();
    }
  }
}