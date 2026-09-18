import { BaseComponent } from '../../core/base-component.js';
import { exportToPdf, PDF_PRESETS } from '../../utils/pdf-utils.js';

const MODELES = {
  'pdf-basique': 'basique',
  'pdf-basique-double': 'basique-double',
  'pdf-pansement': 'pansement',
  'pdf-pansement-double': 'pansement-double'
};

export class CodexOrdonnancier extends BaseComponent {
  render() {
    this.shadowRoot.innerHTML = `
      <style>:host { display: block; }</style>
      <slot></slot>
    `;
  }

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
    try {
      // 1. Charge le template (résolu relativement à ce module, insensible à la profondeur de route)
      const url = new URL(`./partials/${partial}.html`, import.meta.url);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();

      // 2. Parse le HTML récupéré
      const temp = document.createElement('div');
      temp.innerHTML = html.trim();

      // 3. Injecte temporairement le style du modèle dans le document
      const styleTag = temp.querySelector('style');
      let injectedStyle = null;
      if (styleTag) {
        injectedStyle = styleTag.cloneNode(true);
        document.head.appendChild(injectedStyle);
      }

      // 4. Récupère l'élément à exporter
      const ordonnance = temp.querySelector('#ordonnance');
      if (!ordonnance) {
        throw new Error(`Élément #ordonnance non trouvé dans ${partial}.html`);
      }

      // 5. Export PDF
      await exportToPdf(ordonnance, `ordonnance-ide-${partial}.pdf`, PDF_PRESETS.FACTURE);

      // 6. Nettoyage du style injecté
      if (injectedStyle) injectedStyle.remove();

      this.notify.success('PDF généré avec succès');
    } catch (err) {
      console.error(`[CodexOrdonnancier] Erreur chargement ${partial}:`, err);
      this.notify.error(`Impossible de charger le modèle "${partial}"`);
    }
  }
}

if (!customElements.get('codex-ordonnancier')) {
  customElements.define('codex-ordonnancier', CodexOrdonnancier);
}