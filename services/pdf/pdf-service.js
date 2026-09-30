import { PdfMakeEngine } from './engines/pdfmake-engine.js';
import { PdfLibEngine } from './engines/pdf-lib-engine.js';
import { Html2PdfEngine } from './engines/html2pdf-engine.js';
import { printElement } from './print-service.js';
import { downloadBlob, shareBlob, canShareFiles } from '../../utils/export-utils.js';
export { PDF_PRESETS } from './engines/html2pdf-engine.js';
/**
 * PDFService — façade unique pour tous les usages PDF.
 *
 *   compose()      → PDF créé from scratch (vectoriel, pdfmake)
 *   composeGrid()  → planche d'étiquettes (pdfmake)
 *   fill()         → PDF officiel avec AcroForm
 *   overlay()      → PDF officiel sans AcroForm (positions)
 *   smartFill()    → choisit automatiquement fill / overlay
 *   listFields()   → diagnostic des champs AcroForm
 *   capture()      → élément HTML → PDF image (html2pdf)
 *   print()        → impression native
 */
export class PDFService {

  // =============================================================
  // Composition vectorielle (pdfmake)
  // =============================================================

  static async compose(docDefinition, options = {}) {
    const blob = await PdfMakeEngine.renderToBlob(docDefinition);
    return this._handleOutput(blob, options);
  }

  static async composeGrid(items, gridConfig, options = {}) {
    const docDefinition = PdfMakeEngine.buildGridDefinition(items, gridConfig);
    const blob = await PdfMakeEngine.renderToBlob(docDefinition);
    return this._handleOutput(blob, options);
  }

  // =============================================================
  // Remplissage de PDF officiels (pdf-lib)
  // =============================================================

  /** Remplissage AcroForm strict. */
  static async fill(templateUrl, fieldData, options = {}) {
    const blob = await PdfLibEngine.smartFill(templateUrl, fieldData, null, options);
    return this._handleOutput(blob, options);
  }

  /** Remplissage par coordonnées. */
  static async overlay(templateUrl, fieldData, layout, options = {}) {
    const blob = await PdfLibEngine.smartFill(templateUrl, {}, layout, { ...options, forceOverlay: true });
    // Note : si tu veux un overlay pur (ignorer AcroForm), il faudra une méthode dédiée.
    return this._handleOutput(blob, options);
  }

  /**
   * Remplissage "intelligent" : détecte les AcroForm, sinon utilise le layout.
   * @param {string} templateUrl
   * @param {Object} fieldData      - { nomChamp: valeur }
   * @param {Object|null} fallbackLayout - { positions: {...} } ou null
   */
  static async smartFill(templateUrl, fieldData, fallbackLayout, options = {}) {
    const blob = await PdfLibEngine.smartFill(templateUrl, fieldData, fallbackLayout, options);
    return this._handleOutput(blob, options);
  }

  /**
   * Remplissage hybride : AcroForm + overlay sur le même document.
   * À utiliser quand le PDF officiel expose certains champs en AcroForm
   * et en laisse d'autres à remplir par dessin (postes/positions).
   *
   * @param {string} templateUrl
   * @param {Object} data - { acroForm: {...}, overlay: {...} }
   * @param {Object} layout - { positions: {...} } (voir presets/)
   */
  static async fillAndOverlay(templateUrl, data, layout, options = {}) {
    const blob = await PdfLibEngine.fillAndOverlay(templateUrl, data, layout, options);
    return this._handleOutput(blob, options);
  }
  
  /** Diagnostic : liste les champs AcroForm d'un PDF. */
  static async listFields(templateUrl) {
    return PdfLibEngine.listFields(templateUrl);
  }

  /** Diagnostic : le PDF a-t-il des AcroForm ? */
  static async hasAcroForm(templateUrl) {
    return PdfLibEngine.hasAcroForm(templateUrl);
  }

  // =============================================================
  // Capture HTML → PDF image (html2pdf)
  // =============================================================

  static async capture(element, options = {}) {
    const blob = await Html2PdfEngine.capture(element, options);
    return this._handleOutput(blob, options);
  }

  // =============================================================
  // Impression native
  // =============================================================

  static print(element, options = {}) {
    return printElement(element, options);
  }

  // =============================================================
  // Sortie commune
  // =============================================================

  static async _handleOutput(blob, options = {}) {
    const filename = options.filename || 'document.pdf';

    if (options.action === 'share' && canShareFiles(blob, filename)) {
      await shareBlob(blob, filename);
      return { blob, filename };
    }

    if (options.action === 'download') {
      downloadBlob(blob, filename);
    }

    const blobUrl = URL.createObjectURL(blob);
    return { blob, blobUrl, filename };
  }
}