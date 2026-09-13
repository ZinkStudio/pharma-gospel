import { PdfMakeEngine } from './engines/pdfmake-engine.js';
import { PdfLibEngine } from './engines/pdf-lib-engine.js';
import { downloadBlob, shareBlob, canShareFiles } from '../../utils/export-utils.js';

/**
 * Service centralisé de gestion des PDF pour pharma-gospel
 */
export class PDFService {
  /**
   * Génère un PDF vectoriel à partir d'une structure JSON pdfmake
   * @param {Object} docDefinition 
   * @param {Object} options - { action: 'download'|'share'|'preview', filename: string }
   */
  static async generateDocument(docDefinition, options = {}) {
    const blob = await PdfMakeEngine.renderToBlob(docDefinition);
    return this._handleOutput(blob, options);
  }

  /**
   * Génère une planche d'étiquettes vectorielles
   * @param {Array} items 
   * @param {Object} gridConfig 
   * @param {Object} options 
   */
  static async generateGrid(items, gridConfig, options = {}) {
    const docDefinition = PdfMakeEngine.buildGridDefinition(items, gridConfig);
    const blob = await PdfMakeEngine.renderToBlob(docDefinition);
    return this._handleOutput(blob, options);
  }

  /**
   * Remplit un formulaire PDF binaire existant (AcroForm)
   */
  static async fillForm(pdfUrl, fieldData, options = {}) {
    const blob = await PdfLibEngine.fillAndRender(pdfUrl, fieldData, options);
    return this._handleOutput(blob, options);
  }

  /**
   * Gestion centralisée du téléchargement, du partage natif et des URLs Blob
   */
  static async _handleOutput(blob, options) {
    const filename = options.filename || 'document.pdf';

    if (options.action === 'share' && canShareFiles(blob, filename)) {
      await shareBlob(blob, filename);
      return { blob, filename };
    }

    if (options.action === 'download' || !options.action) {
      downloadBlob(blob, filename);
    }

    const blobUrl = URL.createObjectURL(blob);
    return { blob, blobUrl, filename };
  }
}