import { PDFService } from '../services/pdf/pdf-service.js';

/**
 * OrdoscanAssistant
 * Orchestrateur du workflow de numérisation, retouche et génération d'ordonnance
 */
export class OrdoscanAssistant {
  constructor() {
    this.currentImageBlob = null;
    this.processedImageBlob = null;
    this.metadata = {};
  }

  /**
   * Initialise les données de la session de numérisation
   * @param {File|Blob} imageSource 
   * @param {Object} metadata - Informations optionnelles (patient, date, etc.)
   */
  loadImage(imageSource, metadata = {}) {
    this.currentImageBlob = imageSource;
    this.metadata = { timestamp: Date.now(), ...metadata };
  }

  /**
   * Convertit un Blob/Canvas recadré en image finale pour le PDF
   * @param {Blob} processedBlob 
   */
  setProcessedImage(processedBlob) {
    this.processedImageBlob = processedBlob;
  }

  /**
   * Convertit un Blob image en DataURL (base64) pour le moteur pdfmake
   * @param {Blob} blob 
   * @returns {Promise<string>}
   */
  _blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Génère le document PDF de l'ordonnance numérisée
   * @param {Object} options - Action d'export ('download', 'share', etc.)
   */
  async generatePDF(options = {}) {
    if (!this.processedImageBlob && !this.currentImageBlob) {
      throw new Error('Aucune image disponible pour générer l\'ordonnance.');
    }

    const imageToUse = this.processedImageBlob || this.currentImageBlob;
    const dataUrl = await this._blobToDataURL(imageToUse);

    // Construction de la définition vectorielle pdfmake avec l'image incrustée
    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [30, 30, 30, 30],
      content: [
        {
          text: `Numérisation du ${new Date().toLocaleDateString('fr-FR')}`,
          style: 'header'
        },
        {
          image: dataUrl,
          width: 535, // Largeur utile de la page A4 (595 - 2*30)
          margin: [0, 10, 0, 0]
        }
      ],
      styles: {
        header: {
          fontSize: 12,
          bold: true,
          alignment: 'right',
          color: '#555555'
        }
      }
    };

    const filename = options.filename || `ordonnance_${Date.now()}.pdf`;
    return await PDFService.generateDocument(docDefinition, { ...options, filename });
  }
}