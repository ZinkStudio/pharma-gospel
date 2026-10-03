import { BaseView } from '../../core/base-view.js';

/**
 * Vue Aérosolthérapie — mémo règlementaire Assurance Maladie.
 * Contenu statique, mais le bouton "Copier la mention" évite au pharmacien
 * de retaper une formule légale qu'il doit reporter sur l'ordonnance.
 */
export class CodexAerosol extends BaseView {

  onReady() {
    this.querySelector('#aerosol-btn-copy')?.addEventListener('click', () => this.#copierMention());
  }

  async #copierMention() {
    const mention = 'Prescription hors autorisation de mise sur le marché';

    try {
      // Clipboard API moderne — nécessite une origine sécurisée (HTTPS ou localhost)
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(mention);
        this.notify.success('Mention copiée dans le presse-papiers.');
        return;
      }

      // Fallback très ancien (contexte non sécurisé) — rare, mais on garde
      // une roue de secours plutôt que d'échouer silencieusement.
      const textarea = document.createElement('textarea');
      textarea.value = mention;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      this.notify.success('Mention copiée dans le presse-papiers.');
    } catch (err) {
      console.error('[CodexAerosol] Erreur copie :', err);
      this.notify.error('Impossible de copier la mention.');
    }
  }
}

if (!customElements.get('codex-aerosol')) {
  customElements.define('codex-aerosol', CodexAerosol);
}