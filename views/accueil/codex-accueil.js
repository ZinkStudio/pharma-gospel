import { BaseView } from '../../core/base-view.js';

/**
 * Mapping chip → catégories autorisées.
 * Un chip peut regrouper plusieurs `category` d'origine.
 */
const FILTER_MAP = {
  all:          null,      // null = aucune restriction
  officine:     ['officine'],
  documents:    ['documents', 'vaccination', 'aerosol', 'infirmerie'],
  applications: ['applications', 'atelier', 'planning'],
};

export class CodexAccueil extends BaseView {
  #filtres = null;
  #sections = [];

  onReady() {
    this.#filtres = this.querySelector('#accueil-filtres');
    this.#sections = [...this.querySelectorAll('.accueil-section')];

    this.#filtres?.addEventListener('accueil-filter-change', (e) => {
      this.#applyFilter(e.detail.category);
    });
  }

  #applyFilter(category) {
    const allowed = FILTER_MAP[category] ?? null;
    const modules = this.querySelectorAll('codex-module');

    modules.forEach((m) => {
      const cat = m.getAttribute('category') || '';
      const hidden = allowed !== null && !allowed.includes(cat);
      m.classList.toggle('filter-hidden', hidden);
    });

    // Une section devient invisible si elle n'a plus aucun module visible
    this.#sections.forEach((section) => {
      const visible = section.querySelectorAll('codex-module:not(.filter-hidden)');
      section.hidden = visible.length === 0;
    });
  }
}

if (!customElements.get('codex-accueil')) {
  customElements.define('codex-accueil', CodexAccueil);
}