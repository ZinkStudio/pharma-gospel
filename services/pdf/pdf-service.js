// /services/pdf/pdf-service.js
import { HtmlPdfEngine } from './engines/html-pdf-engine.js';
import { PdfLibEngine } from './engines/pdf-lib-engine.js';
import { downloadBlob, shareBlob, canShareFiles } from '../../utils/export-utils.js';

export class PDFService {
    /**
     * Génère un PDF à partir d'un élément HTML ou d'un template
     */
    static async generateFromHTML(elementOrTemplate, options = {}) {
        const blob = await HtmlPdfEngine.renderToBlob(elementOrTemplate, options);
        return this._handleOutput(blob, options);
    }

    /**
     * Génère une planche d'étiquettes en grille dynamique à partir de données
     */
    static async generateGrid(items, gridConfig, options = {}) {
        const element = await HtmlPdfEngine.buildGridDOM(items, gridConfig);
        const blob = await HtmlPdfEngine.renderToBlob(element, options);
        return this._handleOutput(blob, options);
    }

    /**
     * Remplit un formulaire PDF existant (AcroForm) ou dessine sur un modèle vectoriel
     */
    static async fillForm(pdfUrl, fieldData, options = {}) {
        const blob = await PdfLibEngine.fillAndRender(pdfUrl, fieldData, options);
        return this._handleOutput(blob, options);
    }

    /**
     * Gestion interne des sorties (Téléchargement, Blob URL, Partage)
     */
    static async _handleOutput(blob, options) {
        const filename = options.filename || 'document.js.pdf';

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