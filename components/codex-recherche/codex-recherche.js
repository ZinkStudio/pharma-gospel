import { html, css, LitElement, BaseLit } from '/lit';

export const commonStyles = css`
  :host {
    display: inline-block;
    position: relative;
    width: 100%;
    flex: 0 1 auto;
  }
`;

export const defaultStyles = css`
    .search-container {
      position: relative;
      max-width: 400px;
    }
    .search-results {
      position: absolute;
      top: 100%;
      left: 0;
      width: 100%;
      max-width: 500px;
      background: var(--background-default-grey, #fff);
      border: 1px solid var(--border-default-grey, #ccc);
      border-top: none;
      border-radius: 0 0 .5rem .5rem;
      box-shadow: 0 2px 6px rgba(0, 0, 0, .1);
      z-index: 20;
      max-height: 300px;
      overflow-y: auto;
      padding: 0;
      list-style: none;
      margin: 0;
    }

    .search-results li {
      padding: .5rem 1rem;
    }

    .search-results li:hover {
      background-color: var(--background-alt-blue-france, #f0f0f4);
    }

    .search-results a {
      display: block;
      color: var(--text-title-grey, #333);
      text-decoration: none;
    }
  `;
export const ibmStyles = css`
  .ibm-search-results {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    min-width: 300px;
    
    /* État par défaut : Curseur en dehors (transparent & flouté) */
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    
    border: 1px solid var(--border-default-grey, #ccc);
    border-top: none;
    border-radius: 0 0 .5rem .5rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, .05);
    z-index: 20;
    max-height: 300px;
    overflow-y: auto;
    padding: 0;
    list-style: none;
    margin: 0;
    
    /* Transition fluide lors du passage de la souris */
    transition: background 0.3s ease, backdrop-filter 0.3s ease, box-shadow 0.3s ease;
}
    
.ibm-search-results:hover {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.ibm-search-results li {
    padding: .5rem 1rem;
}

.ibm-search-results li:hover {
    background-color: var(--background-alt-blue-france, #f0f0f0);
}

.ibm-search-results li a {
    display: block;
    color: var(--text-title-grey, #161616);
    text-decoration: none;
}
`;

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

    // Fermer les suggestions au clic en dehors
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

  async _loadIndex() {
    try {
      const res = await fetch('./components/codex-recherche/search-index.json');
      this.searchIndex = await res.json();
    } catch (err) {
      console.error("[CodexRecherche] Erreur chargement index:", err);
    }
  }

  _handleInput(e) {
    const query = e.target.value.toLowerCase().trim();

    // 1. Événement pour filtrer la grille en temps réel
    this.emit('codex-search-input', { query });

    // 2. Gestion des suggestions
    if (query.length < this.minQueryLength) {
      this._isDropdownOpen = false;
      this.results = [];
    } else {
      this.results = this.searchIndex.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.keywords.toLowerCase().includes(query)
      ).slice(0, 5);
      this._isDropdownOpen = true;
    }
  }

  render() {
    return this.design === 'ibm' ? this._renderDesignIBM() : this._renderDesignDefault();
  }

  _renderDesignDefault() {
    return html`
      <div class="search-container">
        <form role="search" @submit="${(e) => e.preventDefault()}">
        <label class="fr-label fr-sr-only" for="search-input">Rechercher un module</label>
        <div style="display: flex;">
          <input class="fr-input" placeholder="Rechercher un module..." type="search" id="search-input" @input="${this._handleInput}">
          <button class="fr-btn" title="Rechercher" type="submit">Rechercher</button>
        </div>
      </form>
        <ul class="search-results" ?hidden="${!this._isDropdownOpen}">
          ${this.results.length === 0
        ? html`<li><span class="fr-text--sm fr-m-0">Aucun résultat trouvé.</span></li>`
        : this.results.map(item => html`
                <li>
                  <a href="${item.route}" @click="${() => this._isDropdownOpen = false}">${item.title}</a>
                </li>
              `)
      }
        </ul>
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
      @input="${this._handleInput}"></cds-search>
      <ul class="ibm-search-results" ?hidden="${!this._isDropdownOpen}">
          ${this.results.length === 0
        ? html`<li><span>Aucun résultat trouvé.</span></li>`
        : this.results.map(item => html`
                <li>
                  <a href="${item.route}" @click="${() => this._isDropdownOpen = false}">${item.title}</a>
                </li>
              `)
      }
        </ul>
    `;
  }
}

if (!customElements.get('codex-recherche')) {
  customElements.define('codex-recherche', CodexRecherche);
}
window.CodexRecherche = CodexRecherche;