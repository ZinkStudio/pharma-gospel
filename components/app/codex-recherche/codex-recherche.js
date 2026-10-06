import { html, css, BaseLit } from '/lit';

/**
 * Icône Carbon "arrow--up-right" (16px).
 * Inlinée pour éviter un composant dédié — hérite de currentColor, donc
 * s'adapte automatiquement à la couleur du lien (light/dark).
 * Source : @carbon/icons/packages/arrow--up-right/16.js
 */
const ARROW_UP_RIGHT_ICON = html`
  <svg
    focusable="false"
    preserveAspectRatio="xMidYMid meet"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    aria-hidden="true">
    <path d="M6 4v2h6.29L3 15.29 4.71 17 14 7.71V14h2V4H6z"></path>
  </svg>
`;

export const commonStyles = css`
  :host {
    display: inline-block;
    position: relative;
    width: 100%;
    flex: 0 1 auto;
  }
`;

export const defaultStyles = css`
  .search-container { position: relative; max-width: 400px; }
  .search-results {
    position: absolute; top: 100%; left: 0; width: 100%; max-width: 500px;
    background: var(--background-default-grey, #fff);
    border: 1px solid var(--border-default-grey, #ccc);
    border-top: none; border-radius: 0 0 .5rem .5rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, .1);
    z-index: 20; max-height: 300px; overflow-y: auto;
    padding: 0; list-style: none; margin: 0;
  }
  .search-results li { padding: .5rem 1rem; }
  .search-results li:hover { background-color: var(--background-alt-blue-france, #f0f0f4); }
  .search-results a { display: block; color: var(--text-title-grey, #333); text-decoration: none; }
  .search-results a .ext, .ibm-search-results a .ext { display: inline-flex; vertical-align: -2px; margin-left: 0.35rem; opacity: 0.7; }
`;

export const ibmStyles = css`
  .ibm-search-results {
    position: absolute; top: 100%; left: 0; width: 100%; min-width: 300px;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    border: 1px solid var(--border-default-grey, #ccc);
    border-top: none; border-radius: 0 0 .5rem .5rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, .05);
    z-index: 20; max-height: 300px; overflow-y: auto;
    padding: 0; list-style: none; margin: 0;
    transition: background .3s ease, backdrop-filter .3s ease, box-shadow .3s ease;
  }
  .ibm-search-results:hover {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }
  .ibm-search-results li { padding: .5rem 1rem; }
  .ibm-search-results li:hover { background-color: var(--background-alt-blue-france, #f0f0f0); }
  .ibm-search-results li a { display: block; color: var(--text-title-grey, #161616); text-decoration: none; }
  .search-results a .ext, .ibm-search-results a .ext { display: inline-flex; vertical-align: -2px; margin-left: 0.35rem; opacity: 0.7; }
`;

/** Sources d'index — chaque fichier doit contenir un tableau d'objets
 *  { id, title|description, keywords, route }. */
const INDEX_SOURCES = [
  './components/app/codex-recherche/search-index.json',
  './components/app/codex-recherche/search-links.json',
];

export class CodexRecherche extends BaseLit {
  static properties = {
    design: { type: String, reflect: true },
    results: { state: true }
  };
  static styles = [commonStyles, defaultStyles, ibmStyles];

  constructor() {
    super();
    this.design = '';
    this.results = [];
    this.searchIndex = [];
    this.minQueryLength = 2;
    this._isDropdownOpen = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadIndex();

    this._boundOutsideClick = (e) => {
      if (!this.shadowRoot.contains(e.target)) {
        this._isDropdownOpen = false;
        this.requestUpdate();
      }
    };
    document.addEventListener('click', this._boundOutsideClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._boundOutsideClick);
  }

  _handleCdsClick(e) {
    const path = e.composedPath();
    const isCloseButtonClicked = path.some(el =>
      el.nodeType === Node.ELEMENT_NODE && el.getAttribute('part') === 'close-button'
    );

    if (isCloseButtonClicked) {
      this.emit('codex-search-input', { query: '' });
      this._isDropdownOpen = false;
      this.results = [];

      const cdsSearch = this.shadowRoot.querySelector('cds-search');
      if (cdsSearch) cdsSearch.value = '';
    }
  }

  // =============================================================
  // Chargement + normalisation des index
  // =============================================================

  async _loadIndex() {
    try {
      const responses = await Promise.allSettled(
        INDEX_SOURCES.map(async (url) => {
          const res = await fetch(url);
          if (!res.ok) {
            console.warn(`[CodexRecherche] ${url} → HTTP ${res.status}`);
            return [];
          }
          return await res.json();
        })
      );

      // Concatène les sources qui ont réussi, puis normalise le schéma :
      //   search-index.json → title
      //   search-links.json → description
      // On unifie sur `title` et on filtre les entrées inexploitables.
      const merged = responses
        .filter((r) => r.status === 'fulfilled' && Array.isArray(r.value))
        .flatMap((r) => r.value)
        .map((item) => ({
          id: item.id || '',
          title: item.title || item.description || item.label || '',
          keywords: item.keywords || '',
          route: item.route || item.url || '',
        }))
        .filter((item) => item.title && item.route);

      // Dédoublonnage par route (priorité à la première source)
      const seen = new Set();
      this.searchIndex = merged.filter((item) => {
        if (seen.has(item.route)) return false;
        seen.add(item.route);
        return true;
      });

      console.info(
        `[CodexRecherche] ${this.searchIndex.length} entrées ` +
        `(source: ${INDEX_SOURCES.length} fichiers)`
      );
    } catch (err) {
      console.error('[CodexRecherche] Erreur chargement index :', err);
      this.searchIndex = [];
    }
  }

  // =============================================================
  // Recherche
  // =============================================================

  _handleInput(e) {
    let query = '';
    if (e.target && typeof e.target.value === 'string') {
      query = e.target.value;
    } else if (e.detail && e.detail.value !== undefined) {
      query = e.detail.value;
    }

    query = query.toLowerCase().trim();
    this.emit('codex-search-input', { query });

    if (query.length < this.minQueryLength) {
      this._isDropdownOpen = false;
      this.results = [];
      return;
    }

    this.results = this.searchIndex
      .filter((item) =>
        (item.title || '').toLowerCase().includes(query) ||
        (item.keywords || '').toLowerCase().includes(query)
      )
      .slice(0, 5);

    this._isDropdownOpen = true;
  }

  // =============================================================
  // Rendu
  // =============================================================

  render() {
    return this.design === 'ibm' ? this._renderDesignIBM() : this._renderDesignDefault();
  }

  /** Vrai si la route pointe vers un domaine externe (http/https). */
  _isExternal(route) {
    return /^https?:\/\//i.test(route);
  }

  /**
   * Rend la liste de résultats. Utilisée par les deux designs pour éviter
   * la duplication : seule la classe <ul> change.
   */
  _renderResultsList(cssClass) {
    return html`
      <ul class="${cssClass}" ?hidden="${!this._isDropdownOpen}">
        ${this.results.length === 0
        ? html`<li><span>Aucun résultat trouvé.</span></li>`
        : this.results.map((item) => {
          const external = this._isExternal(item.route);
          return html`
                <li>
                  <a
                    href="${item.route}"
                    target="${external ? '_blank' : '_self'}"
                    rel="${external ? 'noopener noreferrer' : ''}"
                    @click="${() => (this._isDropdownOpen = false)}">
                    ${item.title}${external ? html`<span class="ext">${ARROW_UP_RIGHT_ICON}</span>` : ''}
                  </a>
                </li>
              `;
        })}
      </ul>
    `;
  }

  _renderDesignDefault() {
    return html`
      <div class="search-container">
        <form role="search" @submit="${(e) => e.preventDefault()}">
          <label class="fr-label fr-sr-only" for="search-input">Rechercher un module</label>
          <div style="display: flex;">
            <input class="fr-input" placeholder="Rechercher un module..."
              type="search" id="search-input" @input="${this._handleInput}">
            <button class="fr-btn" title="Rechercher" type="submit">Rechercher</button>
          </div>
        </form>
        ${this._renderResultsList('search-results')}
      </div>
    `;
  }

  _renderDesignIBM() {
    return html`
      <cds-search
        autocomplete="off"
        expandable="true"
        size="md"
        type="text"
        role="searchbox"
        label-text="Rechercher un module..."
        placeholder="Rechercher un module..."
        close-button-label-text="Vider la recherche"
        @input="${this._handleInput}"
        @click="${this._handleCdsClick}"></cds-search>
      ${this._renderResultsList('ibm-search-results')}
    `;
  }
}

if (!customElements.get('codex-recherche')) {
  customElements.define('codex-recherche', CodexRecherche);
}
window.CodexRecherche = CodexRecherche;