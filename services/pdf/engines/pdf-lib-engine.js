/**
 * Moteur PDF-LIB — deux stratégies de remplissage :
 *   1. AcroForm : champs nommés (idéal quand le PDF est interactif)
 *   2. Overlay  : positionnement par coordonnées (fallback pour scans)
 *
 * pdf-lib est chargé en global via vendor/pdf/pdf-lib@1.17.1.js
 * (window.PDFLib). Si un jour on passe en import ES, remplacer
 * `_ensureLib` en conséquence.
 */
let pdfLibLoadPromise = null;

export class PdfLibEngine {
  /**
   * Charge pdf-lib à la demande (une seule fois par session).
   * Utilise un <script> injecté dans le <head> — pdf-lib@1.17.1 est un UMD,
   * pas un ES module, donc `import()` ne fonctionne pas directement.
   */
  static async _ensureLib() {
    if (window.PDFLib) return window.PDFLib;
    if (!pdfLibLoadPromise) {
      pdfLibLoadPromise = new Promise((resolve, reject) => {
        const src = new URL('../../../vendor/pdf/pdf-lib@1.17.1.js', import.meta.url).href;
        if (document.querySelector(`script[src="${src}"]`)) {
          // Déjà en cours de chargement par quelqu'un d'autre
          const check = setInterval(() => {
            if (window.PDFLib) { clearInterval(check); resolve(window.PDFLib); }
          }, 50);
          setTimeout(() => { clearInterval(check); reject(new Error('pdf-lib timeout')); }, 10000);
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(window.PDFLib);
        script.onerror = () => {
          pdfLibLoadPromise = null;
          reject(new Error('[PdfLibEngine] Échec du chargement de pdf-lib'));
        };
        document.head.appendChild(script);
      });
    }
    return pdfLibLoadPromise;
  }

  static async _loadPdf(templateUrl) {
    const resp = await fetch(templateUrl);
    if (!resp.ok) throw new Error(`[PdfLibEngine] HTTP ${resp.status} pour ${templateUrl}`);
    const buffer = await resp.arrayBuffer();
    if (!buffer || buffer.byteLength === 0) {
      throw new Error(`[PdfLibEngine] PDF vide ou introuvable : ${templateUrl}`);
    }
    const { PDFDocument } = await this._ensureLib();
    return await PDFDocument.load(buffer);
  }

  // =============================================================
  // Détection
  // =============================================================

  /** Retourne true si le PDF contient au moins un champ AcroForm. */
  static async hasAcroForm(templateUrl) {
    try {
      const pdfDoc = await this._loadPdf(templateUrl);
      return pdfDoc.getForm().getFields().length > 0;
    } catch {
      return false;
    }
  }

  /** Liste les champs AcroForm disponibles (nom + type). */
  static async listFields(templateUrl) {
    const pdfDoc = await this._loadPdf(templateUrl);
    return pdfDoc.getForm().getFields().map(f => ({
      name: f.getName(),
      type: f.constructor.name
    }));
  }

  // =============================================================
  // Chargement + stratégie unifiée
  // =============================================================

  /**
   * Charge le PDF, applique la stratégie adaptée (AcroForm ou overlay),
   * retourne un Blob.
   */
  static async smartFill(templateUrl, fieldData, fallbackLayout, options = {}) {
    const pdfDoc = await this._loadPdf(templateUrl);
    const form = pdfDoc.getForm();
    const hasForm = form.getFields().length > 0;

    if (hasForm) {
      this._applyAcroForm(pdfDoc, fieldData);
    } else {
      if (!fallbackLayout?.positions) {
        throw new Error(
          '[PdfLibEngine] Ce PDF n\'a pas d\'AcroForm et aucun layout ' +
          'de fallback n\'a été fourni.'
        );
      }
      await this._applyOverlay(pdfDoc, fieldData, fallbackLayout, options);
    }

    if (options.flatten !== false && hasForm) {
      form.flatten();
    }

    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  // =============================================================
  // Stratégie 1 — AcroForm
  // =============================================================

  static _applyAcroForm(pdfDoc, fieldData) {
    const form = pdfDoc.getForm();
    Object.entries(fieldData).forEach(([fieldName, value]) => {
      try {
        const field = form.getTextField(fieldName);
        if (field) field.setText(String(value ?? ''));
      } catch {
        console.warn(`[PdfLibEngine] Champ AcroForm introuvable : "${fieldName}"`);
      }
    });
  }

  // =============================================================
  // Stratégie 2 — Overlay par coordonnées
  // =============================================================

  /**
   * Dessine le texte champ par champ aux positions fournies.
   * Les positions sont exprimées en fraction de la page (0-1) :
   *   left : depuis le bord gauche
   *   top  : depuis le bord HAUT (inversé pour PDF)
   */
  static async _applyOverlay(pdfDoc, fieldData, layout, options = {}) {
    const { StandardFonts } = await this._ensureLib();
    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { width: pageW, height: pageH } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const defaultFontSize = options.fontSize ?? 10;
    const defaultLetterSpacing = options.letterSpacing ?? 0;

    const positions = layout.positions || {};

    Object.entries(fieldData).forEach(([key, value]) => {
      const pos = positions[key];
      if (!pos || value == null || value === '') return;

      // Coordonnées PDF : origine en bas-gauche, y vers le haut.
      const x = pos.left * pageW + (pos.padX ?? 0);
      const y = pageH - (pos.top * pageH) + (pos.padY ?? 0);

      const text = String(value);
      const size = pos.fontSize ?? defaultFontSize;
      const spacing = pos.letterSpacing ?? defaultLetterSpacing;

      if (spacing > 0) {
        let cursorX = x;
        for (const ch of text) {
          page.drawText(ch, { x: cursorX, y, size, font });
          cursorX += font.widthOfTextAtSize(ch, size) + spacing;
        }
      } else {
        page.drawText(text, { x, y, size, font });
      }
    });
  }
  // =============================================================
  // Stratégie hybride — AcroForm + overlay sur le même PDF
  // =============================================================

  /**
   * Remplit les AcroForm présents ET superpose les valeurs overlay
   * manquantes sur le même document, en une passe.
   *
   * @param {string} templateUrl
   * @param {Object} data - { acroForm: {...}, overlay: {...} }
   * @param {Object} layout - { positions: {...} }
   * @param {Object} options
   */
  static async fillAndOverlay(templateUrl, data, layout = null, options = {}) {
    const pdfDoc = await this._loadPdf(templateUrl);
    const form = pdfDoc.getForm();

    // 1. Remplir les AcroForm avec les valeurs fournies
    if (data.acroForm && Object.keys(data.acroForm).length) {
      this._applyAcroForm(pdfDoc, data.acroForm);
    }

    // 2. Superposer les valeurs overlay (si layout fourni)
    if (data.overlay && Object.keys(data.overlay).length) {
      if (!layout?.positions) {
        console.warn('[PdfLibEngine] fillAndOverlay : overlay fourni sans layout.');
      } else {
        await this._applyOverlay(pdfDoc, data.overlay, layout, options);
      }
    }

    // 3. Aplatir les AcroForm (les rend définitifs — plus modifiables)
    if (options.flatten !== false && form.getFields().length > 0) {
      form.flatten();
    }

    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }
  /**
 * Overlay pur : dessine les valeurs aux positions fournies,
 * en ignorant complètement les AcroForm du PDF (même s'il en a).
 *
 * @param {string} templateUrl
 * @param {Object} fieldData — { fieldKey: value }
 * @param {Object} layout — { positions: { fieldKey: { left, top, fontSize?, letterSpacing? } } }
 */
  static async overlayOnly(templateUrl, fieldData, layout, options = {}) {
    if (!layout?.positions) {
      throw new Error('[PdfLibEngine] overlayOnly : layout.positions requis.');
    }

    const pdfDoc = await this._loadPdf(templateUrl);
    await this._applyOverlay(pdfDoc, fieldData, layout, options);

    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }
}