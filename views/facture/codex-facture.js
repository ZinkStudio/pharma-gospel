import { BaseView } from '../../core/base-view.js';
import { PDFService } from '../../services/pdf/pdf-service.js';
import { PDF_PRESETS } from '../../services/pdf/engines/html2pdf-engine.js';
import { formatFR, initTodayInputs } from '../../utils/date-utils.js';

const TEMPLATES = {
  satisfait: './partials/satisfait.html',
  vierge: './partials/vierge.html',
  viergeDouble: './partials/vierge-double.html'
};

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class CodexFacture extends BaseView {
  #form = null;
  #preview = null;

  onReady() {
    initTodayInputs(this);
    this.#form = this.querySelector('#formFacture');
    this.#preview = this.querySelector('#facture-output');

    if (!this.#form) {
      console.warn('[CodexFacture] <codex-form id="formFacture"> introuvable.');
      return;
    }

    this.#form.addEventListener('codex-form-submit', (e) => this.#onSubmit(e.detail));
    this.#form.addEventListener('codex-form-invalid', (e) => this.#onInvalid(e.detail));

    this.querySelector('#pdf-renseignee')?.addEventListener('click', () => this.#downloadRenseignee());
    this.querySelector('#pdf-vierge')?.addEventListener('click', () => this.#downloadVierge());
    this.querySelector('#pdf-vierge-double')?.addEventListener('click', () => this.#downloadViergeDouble());
  }

  // =============================================================
  // Chargement de template avec substitution ${ns.key}
  // =============================================================

  async #loadTemplate(relativePath, data = {}) {
    const url = new URL(relativePath, import.meta.url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} sur ${relativePath}`);
    const html = await response.text();
    return html.replace(/\$\{(\w+)\.(\w+)\}/g, (_, ns, key) =>
      escapeHtml(data?.[ns]?.[key] ?? '')
    );
  }

  // =============================================================
  // Validation du formulaire
  // =============================================================

  #onInvalid({ invalidFields }) {
    this.notify.warning(
      `Champs manquants ou invalides : ${invalidFields.join(', ')}`
    );
    this.#form.focusField(invalidFields[0]);
  }
  
  // =============================================================
  // Soumission du formulaire → prévisualisation
  // =============================================================

  async #onSubmit({ values, isValid }) {
    if (!isValid) return;

    try {
      const html = await this.#loadTemplate(TEMPLATES.satisfait, { facture: values });
      if (!this.#preview) return;

      this.#preview.innerHTML = html;
      this.#preview.classList.remove('hidden');

      // Active le bouton de téléchargement de la facture renseignée
      const btn = this.querySelector('#pdf-renseignee');
      if (btn) btn.disabled = false;

      this.notify.success('Prévisualisation générée.');
      this.#preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      console.error('[CodexFacture] Erreur prévisualisation :', err);
      this.notify.error('Impossible de générer la prévisualisation.');
    }
  }

  // =============================================================
  // Téléchargement — facture renseignée
  // =============================================================

  async #downloadRenseignee() {
    try {
      const facture = this.#preview?.querySelector('#facture-pdf');
      if (!facture) {
        this.notify.warning('Aucune facture à télécharger. Générez d\'abord la prévisualisation.');
        return;
      }

      // Clone pour ne pas altérer le DOM visible
      const clone = facture.cloneNode(true);

      // Remplace l'input date par sa valeur formatée FR
      const dateInput = clone.querySelector('#facture-pdf-date input');
      if (dateInput) {
        const fr = formatFR(dateInput.value);
        const container = clone.querySelector('#facture-pdf-date');
        if (container) container.textContent = `À MARSEILLE, le : ${fr}`;
      }

      await PDFService.capture(clone, {
        ...PDF_PRESETS.FACTURE,
        filename: 'facture-renseignee.pdf',
        action: 'download'
      });

      this.notify.success('Facture téléchargée.');
    } catch (err) {
      console.error('[CodexFacture] Erreur facture renseignée :', err);
      this.notify.error('Impossible de générer la facture renseignée.');
    }
  }

  // =============================================================
  // Téléchargement — facture vierge A4
  // =============================================================

  async #downloadVierge() {
    try {
      const html = await this.#loadTemplate(TEMPLATES.vierge);
      const temp = document.createElement('div');
      temp.innerHTML = html;

      const facture = temp.querySelector('#facture-vierge');
      if (!facture) throw new Error('Bloc #facture-vierge introuvable.');

      await PDFService.capture(facture, {
        ...PDF_PRESETS.FACTURE,
        filename: 'facture-vierge.pdf',
        action: 'download'
      });

      this.notify.success('Facture vierge téléchargée.');
    } catch (err) {
      console.error('[CodexFacture] Erreur facture vierge :', err);
      this.notify.error('Impossible de générer la facture vierge.');
    }
  }

  // =============================================================
  // Téléchargement — facture vierge A5 (x2)
  // =============================================================

  async #downloadViergeDouble() {
    try {
      const html = await this.#loadTemplate(TEMPLATES.viergeDouble);
      const temp = document.createElement('div');
      temp.innerHTML = html;

      const facture = temp.querySelector('#facture-vierge-double');
      if (!facture) throw new Error('Bloc #facture-vierge-double introuvable.');

      await PDFService.capture(facture, {
        ...PDF_PRESETS.FACTURE,
        filename: 'facture-vierge-double.pdf',
        action: 'download',
        pagebreak: { mode: ['css', 'legacy'], before: '.breaker' }
      });

      this.notify.success('Facture vierge double téléchargée.');
    } catch (err) {
      console.error('[CodexFacture] Erreur facture vierge double :', err);
      this.notify.error('Impossible de générer la facture double.');
    }
  }
}

if (!customElements.get('codex-facture')) {
  customElements.define('codex-facture', CodexFacture);
}