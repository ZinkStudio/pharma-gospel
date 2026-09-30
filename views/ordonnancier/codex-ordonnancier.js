import { BaseView } from '../../core/base-view.js';
import { PDFService, PDF_PRESETS } from '../../services/pdf/pdf-service.js';

const MODELES = {
  'pdf-basique':         'basique',
  'pdf-basique-double':  'basique-double',
  'pdf-pansement':       'pansement',
  'pdf-pansement-double':'pansement-double'
};

export class CodexOrdonnancier extends BaseView {

  onReady() {
    for (const [id, partial] of Object.entries(MODELES)) {
      const btn = this.querySelector(`#${id}`);
      if (btn) btn.addEventListener('click', () => this.#telechargerModele(partial));
    }
  }

  /**
   * Charge un partial d'ordonnance et déclenche son export PDF.
   * @param {string} partial - Nom du modèle (basique, basique-double, pansement, pansement-double)
   */
  async #telechargerModele(partial) {
    const filename = `ordonnance-ide-${partial}.pdf`;

    try {
      this.notify.info(`Génération du modèle…`);

      // 1. Charge le partial (résolu relativement à ce module)
      const url = new URL(`./partials/${partial}.html`, import.meta.url);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();

      // 2. Parse
      const temp = document.createElement('div');
      temp.innerHTML = html.trim();

      const ordonnance = temp.querySelector('#ordonnance');
      if (!ordonnance) {
        throw new Error(`Élément #ordonnance introuvable dans ${partial}.html`);
      }

      // 3. Extrait le CSS du partial (il sera injecté dans le sandbox
      //    d'export, jamais dans le document global)
      const styles = temp.querySelector('style')?.textContent || '';

      // 4. Export via le service PDF — capture d'élément HTML
      await PDFService.capture(ordonnance, {
        ...PDF_PRESETS.FACTURE,
        filename,
        action: 'download',
        styles
      });

      this.notify.success(`PDF "${filename}" généré.`);
    } catch (err) {
      console.error(`[CodexOrdonnancier] Erreur "${partial}" :`, err);
      this.notify.error(`Impossible de générer le modèle "${partial}".`);
    }
  }
}

if (!customElements.get('codex-ordonnancier')) {
  customElements.define('codex-ordonnancier', CodexOrdonnancier);
}