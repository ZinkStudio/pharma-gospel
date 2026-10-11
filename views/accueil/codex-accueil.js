import { BaseView } from '../../core/base-view.js';

/**
 * Mapping chip → catégories autorisées.
 * Depuis la réorganisation de l'accueil en 5 sections distinctes
 * (Liens / Documents / Applications / Atelier / Planning), chaque
 * chip correspond exactement à une catégorie.
 */
const FILTER_MAP = {
  all:          null,             // null = aucune restriction
  officine:     ['officine'],
  documents:    ['documents'],
  applications: ['applications'],
  atelier:      ['atelier'],
  planning:     ['planning'],
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