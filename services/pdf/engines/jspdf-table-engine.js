/**
 * Moteur de génération PDF pour tableaux structurés.
 * Utilise jsPDF + jspdf-autotable, chargés séparément en lazy-load.
 *
 * Note : html2pdf.bundle embarque jsPDF mais ne l'expose PAS sur window.
 * On vendorise donc jsPDF + autotable indépendamment pour ce moteur.
 *
 * Ordre de chargement OBLIGATOIRE :
 *   1. jspdf.umd.min.js          → window.jspdf.jsPDF
 *   2. jspdf.autotable.min.js    → jsPDF.API.autoTable
 */

const JSPDF_URL = new URL(
  '../../../vendor/pdf/jspdf.umd.min@2.5.1.js',
  import.meta.url
).href;

const AUTOTABLE_URL = new URL(
  '../../../vendor/pdf/jspdf.autotable.min@3.5.28.js',
  import.meta.url
).href;

let jsPdfLoadPromise = null;

/** Charge un script une seule fois, en réutilisant si déjà présent. */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`[JsPdfTableEngine] Échec du chargement : ${src}`));
    document.head.appendChild(s);
  });
}

/**
 * Charge jsPDF + autotable (une seule fois par session).
 * @returns {Promise<typeof jsPDF>}
 */
async function getJsPdf() {
  if (window.jspdf?.jsPDF?.API?.autoTable) return window.jspdf.jsPDF;
  if (jsPdfLoadPromise) return jsPdfLoadPromise;

  jsPdfLoadPromise = (async () => {
    try {
      // 1. jsPDF (expose window.jspdf.jsPDF)
      if (!window.jspdf?.jsPDF) {
        await loadScript(JSPDF_URL);
      }
      if (!window.jspdf?.jsPDF) {
        throw new Error('jsPDF non exposé après chargement');
      }

      // 2. autotable (étend jsPDF.API)
      if (!window.jspdf.jsPDF.API.autoTable) {
        await loadScript(AUTOTABLE_URL);
      }
      if (!window.jspdf.jsPDF.API.autoTable) {
        throw new Error('jspdf-autotable non attaché après chargement');
      }

      return window.jspdf.jsPDF;
    } catch (err) {
      jsPdfLoadPromise = null;   // permet un retry au prochain appel
      throw err;
    }
  })();

  return jsPdfLoadPromise;
}

export class JsPdfTableEngine {
  /**
   * Compose un PDF tabulaire à partir d'une liste de sections.
   *
   * @param {Array<{ title: string, head: string[], body: any[][], headFill?: [number,number,number] }>} sections
   * @param {Object} options
   * @param {string} [options.title]        — Titre en haut de la première page
   * @param {string} [options.subtitle]     — Sous-titre (date, numéro…)
   * @param {Object} [options.theme]        — Couleurs (primaryColor, headerColor…)
   * @returns {Promise<Blob>}
   */
  static async compose(sections, options = {}) {
    const JsPDF = await getJsPdf();

    const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const margin = 14;

    // En-tête du document
    let cursorY = 20;
    if (options.title) {
      doc.setFontSize(18);
      doc.setTextColor(30, 30, 30);
      doc.text(options.title, margin, cursorY);
      cursorY += 8;
    }
    if (options.subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(options.subtitle, margin, cursorY);
      cursorY += 6;
    }
    cursorY += 4;

    // Sections
    const theme = options.theme || {};
    for (const section of sections) {
      if (!section.body?.length) continue;

      // Titre de section
      doc.setFontSize(13);
      doc.setTextColor(...(theme.sectionTitleColor || [44, 62, 80]));
      doc.text(section.title, margin, cursorY);

      // Tableau (autotable gère les sauts de page et répète les en-têtes)
      doc.autoTable({
        startY: cursorY + 3,
        head: [section.head || []],
        body: section.body,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: {
          fillColor: section.headFill || theme.headFill || [52, 152, 219],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        margin: { left: margin, right: margin },
      });

      cursorY = doc.lastAutoTable.finalY + 12;

      // Nouvelle page si le prochain titre de section n'aurait pas de place
      if (cursorY > 260) {
        doc.addPage();
        cursorY = 20;
      }
    }

    return doc.output('blob');
  }
}