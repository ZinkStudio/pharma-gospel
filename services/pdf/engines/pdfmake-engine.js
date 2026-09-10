/**
 * Moteur de rendu vectoriel basé sur pdfmake
 */
export class PdfMakeEngine {
  static isLoaded = false;

  /**
   * Charge dynamiquement les scripts pdfmake et leurs polices virtuelles (VFS)
   */
  static async loadDependencies() {
    if (this.isLoaded && window.pdfMake) return;

    // CDN fallback ou scripts locaux selon ton arborescence statique
    const pdfMakeUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/pdfmake.min.js';
    const vfsFontsUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/vfs_fonts.js';

    await this._loadScript(pdfMakeUrl);
    await this._loadScript(vfsFontsUrl);

    this.isLoaded = true;
  }

  /**
   * Convertit une definition pdfmake en Blob PDF
   * @param {Object} docDefinition 
   * @returns {Promise<Blob>}
   */
  static async renderToBlob(docDefinition) {
    await this.loadDependencies();

    return new Promise((resolve, reject) => {
      try {
        const pdfDocGenerator = window.pdfMake.createPdf(docDefinition);
        pdfDocGenerator.getBlob((blob) => resolve(blob));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Construit une grille d'étiquettes vectorielle (remplace l'ancien rendu DOM)
   * @param {Array} items - Tableau d'objets (ex: [{ title: '...', code: '...' }])
   * @param {Object} config - Options de grille (columns, margin, etc.)
   */
  static buildGridDefinition(items, config = {}) {
    const columnsCount = config.columns || 3;
    const body = [];
    let currentRow = [];

    items.forEach((item, index) => {
      // Cellule représentant une étiquette
      currentRow.push({
        stack: [
          { text: item.title || '', style: 'labelTitle' },
          { text: item.subtitle || '', style: 'labelSubtitle' },
          item.code ? { text: item.code, style: 'labelCode' } : ''
        ].filter(Boolean),
        margin: [2, 4, 2, 4]
      });

      // Fin de ligne atteint ou dernier élément
      if (currentRow.length === columnsCount || index === items.length - 1) {
        // Complétion des cellules vides pour garder un tableau régulier
        while (currentRow.length < columnsCount) {
          currentRow.push({ text: '' });
        }
        body.push(currentRow);
        currentRow = [];
      }
    });

    return {
      pageSize: config.pageSize || 'A4',
      pageMargins: config.pageMargins || [20, 20, 20, 20],
      content: [
        {
          table: {
            widths: Array(columnsCount).fill('*'),
            body: body
          },
          layout: config.layout || 'lightHorizontalLines'
        }
      ],
      styles: {
        labelTitle: { fontSize: 10, bold: true },
        labelSubtitle: { fontSize: 8, color: '#555555' },
        labelCode: { fontSize: 8, monospace: true, margin: [0, 2, 0, 0] }
      }
    };
  }

  static _loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Échec du chargement : ${src}`));
      document.head.appendChild(script);
    });
  }
}