// /services/pdf/pdf-service.js
import { PdfMakeEngine } from './engines/pdfmake-engine.js';
import { PdfLibEngine } from './engines/pdf-lib-engine.js';
import { downloadBlob, shareBlob, canShareFiles } from '../../utils/export-utils.js';

export class PDFService {
  /**
   * Génère un PDF vectoriel à partir d'une définition pdfmake
   * @param {Object} docDefinition - Structure JSON du document pdfmake
   * @param {Object} options - Action ('download', 'share', 'preview'), filename, etc.
   */
  static async generateDocument(docDefinition, options = {}) {
    const blob = await PdfMakeEngine.renderToBlob(docDefinition);
    return this._handleOutput(blob, options);
  }

  /**
   * Génère une planche d'étiquettes vectorielle sous forme de grille pdfmake
   * @param {Array} items - Données des étiquettes
   * @param {Object} gridConfig - Configuration de la grille (colonnes, marges, dimensions)
   * @param {Object} options 
   */
  static async generateGrid(items, gridConfig, options = {}) {
    const docDefinition = PdfMakeEngine.buildGridDefinition(items, gridConfig);
    const blob = await PdfMakeEngine.renderToBlob(docDefinition);
    return this._handleOutput(blob, options);
  }

  /**
   * Remplit un formulaire PDF existant (AcroForm) ou applique des modifications binaires
   */
  static async fillForm(pdfUrl, fieldData, options = {}) {
    const blob = await PdfLibEngine.fillAndRender(pdfUrl, fieldData, options);
    return this._handleOutput(blob, options);
  }

  /**
   * Gestion centralisée des sorties (Téléchargement, Blob URL, Partage Web API)
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