export class TamponGenerator {
  /**
   * Génère une image (DataURL) d'un tampon à partir d'un objet de données.
   * 
   * @param {Object} data - Les données du tampon (ex: { titre, pharmacien, finess })
   * @param {Object} options 
   * @param {Array<string>} [options.include] - Tableau des clés à inclure (si omis, toutes les clés de data)
   * @param {Array<string>} [options.exclude] - Tableau des clés à exclure
   * @param {string} [options.signatureUrl] - URL de l'image de signature à ajouter en bas
   */
  static async generer(data, options = {}) {
    // 1. Déterminer les champs à afficher
    let champsAAfficher = Object.keys(data).filter(k => data[k]);
    
    if (options.include && Array.isArray(options.include)) {
      champsAAfficher = options.include.filter(k => data[k]);
    }
    if (options.exclude && Array.isArray(options.exclude)) {
      champsAAfficher = champsAAfficher.filter(k => !options.exclude.includes(k));
    }

    // 2. Configuration visuelle
    const largeur = 600;
    const padding = 20;
    const lineHeight = 22;
    
    // 3. Précharger la signature si elle existe
    let signatureImg = null;
    let signatureHeight = 0;
    
    if (options.signatureUrl) {
      try {
        signatureImg = await this.#chargerImage(options.signatureUrl);
        // On force une largeur de 300px pour la signature, on calcule la hauteur proportionnelle
        signatureHeight = signatureImg.height * (300 / signatureImg.width);
      } catch (e) {
        console.warn('[TamponGenerator] Signature non trouvée ou erreur de chargement', e);
      }
    }

    // 4. Calcul de la hauteur totale
    let hauteur = (padding * 2) + (champsAAfficher.length * lineHeight) + signatureHeight;
    
    // 5. Dessin
    const canvas = document.createElement('canvas');
    canvas.width = largeur;
    canvas.height = hauteur;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    let currentY = padding;

    for (const key of champsAAfficher) {
      const texte = data[key];
      const estTitre = (key === 'titre');
      
      ctx.font = estTitre ? 'bold 22px Arial' : '18px Arial';
      ctx.fillText(texte, canvas.width / 2, currentY);
      currentY += lineHeight;
    }

    if (signatureImg) {
      // Centrer la signature sous le texte
      ctx.drawImage(signatureImg, (canvas.width - 300) / 2, currentY, 300, signatureHeight);
    }

    return canvas.toDataURL('image/png');
  }

  static #chargerImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
}