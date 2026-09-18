/**
 * Service d'export PDF et d'impression pour Pharma-Codex.
 * Basé sur html2pdf.js avec isolation en Sandbox et support des templates DSFR.
 */

// Presets de configuration
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

/**
 * Charge dynamiquement le module html2pdf
 */
async function getHtml2Pdf() {
  if (window.html2pdf) return window.html2pdf;
  try {
    const mod = await import('../vendor/pdf/html2pdf.bundle.min@0.10.1.js');
    return mod.default || window.html2pdf;
  } catch (err) {
    console.error('[pdf-utils] Impossible de charger html2pdf.bundle.min.js', err);
    throw new Error('Module html2pdf indisponible.');
  }
}

/**
 * Fusion profonde d'objets d'options
 */
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

/**
 * Exporte un élément HTML en PDF de façon isolée (sandbox).
 * @param {HTMLElement} element - Élément DOM à exporter
 * @param {string} [filename='document.pdf'] - Nom du fichier généré
 * @param {Object} [customOptions={}] - Surcharges des options html2pdf
 */
export async function exportToPdf(element, filename = 'document.pdf', customOptions = {}) {
  if (!element) throw new Error('[pdf-utils] Aucun élément fourni pour l\'export PDF');

  const html2pdf = await getHtml2Pdf();

  // Création du conteneur d'isolation (Sandbox)
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
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollY: 0
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    },
    pagebreak: {
      mode: ['css', 'legacy'],
      before: '.breaker'
    }
  };

  const finalOptions = mergeOptions(defaultOptions, customOptions);

  try {
    // Petit délai d'attente pour le calcul des styles
    await new Promise(resolve => setTimeout(resolve, 250));
    await html2pdf().set(finalOptions).from(sandbox.firstElementChild).save();
  } catch (error) {
    console.error('[pdf-utils] Erreur lors de la génération du PDF :', error);
    throw error;
  } finally {
    sandbox.remove();
  }
}

/**
 * Imprime un élément HTML dans une fenêtre popup configurée avec le DSFR.
 * @param {HTMLElement} element 
 * @param {Object} [printOptions={}]
 */
export function printElement(element, printOptions = {}) {
  if (!element) throw new Error('[pdf-utils] Aucun élément fourni pour l\'impression');

  const { title = document.title, styles = '' } = printOptions;
  const printWindow = window.open('', '_blank');

  if (!printWindow) throw new Error('[pdf-utils] Fenêtre d\'impression bloquée par le navigateur');

  const doc = printWindow.document;
  const html = doc.createElement('html');
  const head = doc.createElement('head');
  const body = doc.createElement('body');

  const titleEl = doc.createElement('title');
  titleEl.textContent = title;
  head.appendChild(titleEl);

  const linkDsfr = doc.createElement('link');
  linkDsfr.rel = 'stylesheet';
  linkDsfr.href = './dsfr-v1.14.2/dist/dsfr.min.css';
  head.appendChild(linkDsfr);

  const styleEl = doc.createElement('style');
  styleEl.textContent = `
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none !important; }
    }
    ${styles}
  `;
  head.appendChild(styleEl);

  body.innerHTML = element.innerHTML;
  html.appendChild(head);
  html.appendChild(body);

  doc.documentElement.replaceWith(html);

  linkDsfr.onload = () => {
    printWindow.focus();
    printWindow.print();
    setTimeout(() => printWindow.close(), 500);
  };
}