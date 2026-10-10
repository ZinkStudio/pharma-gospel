import { BaseView } from '../../core/base-view.js';

const PARTIALS = {
  tableau:      './views/vaccination/partials/tableau-global.html',
  prescription: './views/vaccination/partials/prescription.html',
  details:      './views/vaccination/partials/details-global.html'
};

export class CodexVaccination extends BaseView {
  #modal = null;
  #modalTitle = null;
  #modalBody = null;

  onReady() {
    this.#modal      = this.querySelector('#vaccination-modal');
    this.#modalTitle = this.querySelector('#vaccination-modal-title');
    this.#modalBody  = this.querySelector('#vaccination-modal-body');

    // Chargement des 3 onglets en parallèle
    this.#loadAllTabs();

    // Délégation d'événements pour les triggers de la modale
    this.addEventListener('click', (e) => this.#onClick(e));

    // Fermeture
    this.querySelector('#vaccination-modal-close')
      ?.addEventListener('click', () => this.#closeModal());
    this.#modal?.addEventListener('click', (e) => {
      // Fermeture si clic sur le backdrop (en dehors de la boîte modale)
      if (e.target === this.#modal) this.#closeModal();
    });
    // Échap géré nativement par <dialog> → event 'close' capté ci-dessous
    this.#modal?.addEventListener('close', () => this.#resetModal());
  }

  // =============================================================
  // Chargement des onglets
  // =============================================================

  async #loadAllTabs() {
    // Parallélisation : les 3 fetch démarrent en même temps.
    await Promise.all([
      this.#loadPartial(PARTIALS.tableau,      '#vaccination-tableau'),
      this.#loadPartial(PARTIALS.prescription, '#vaccination-prescription'),
      this.#loadPartial(PARTIALS.details,      '#vaccination-details')
    ]);
  }

  async #loadPartial(url, targetSelector) {
    const target = this.querySelector(targetSelector);
    if (!target) return;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      target.innerHTML = html;
    } catch (err) {
      console.error(`[CodexVaccination] Erreur chargement ${url} :`, err);
      target.innerHTML = `<p class="vaccination-error">Impossible de charger ce contenu.</p>`;
    }
  }

  // =============================================================
  // Trigger → ouverture modale
  // =============================================================

  async #onClick(e) {
    const trigger = e.target.closest?.('[data-vaccination-trigger]');
    if (!trigger) return;

    // Accessibilité clavier : on accepte aussi les éléments tabindex="0"
    const title = trigger.dataset.modalTitle || 'Détail';
    const path  = trigger.dataset.partialPath;

    if (!path) {
      console.warn('[CodexVaccination] data-partial-path manquant sur le trigger.');
      return;
    }

    await this.#openModal(title, path);
  }

  async #openModal(title, partialPath) {
    if (!this.#modal) return;

    this.#modalTitle.textContent = title;
    this.#modalBody.innerHTML = '<p class="vaccination-loading">Chargement…</p>';

    // Ouvrir AVANT le fetch pour un retour immédiat à l'utilisateur
    if (!this.#modal.open) this.#modal.showModal();

    try {
      const res = await fetch(partialPath);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      this.#modalBody.innerHTML = html;
    } catch (err) {
      console.error(`[CodexVaccination] Erreur chargement ${partialPath} :`, err);
      this.#modalBody.innerHTML =
        '<p class="vaccination-error">Impossible de charger ce contenu.</p>';
    }
  }

  #closeModal() {
    this.#modal?.close();
  }

  #resetModal() {
    if (this.#modalTitle) this.#modalTitle.textContent = '';
    if (this.#modalBody)  this.#modalBody.innerHTML = '';
  }
}

if (!customElements.get('codex-vaccination')) {
  customElements.define('codex-vaccination', CodexVaccination);
}