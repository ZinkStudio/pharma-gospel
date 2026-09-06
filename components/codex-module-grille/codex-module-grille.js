import { html, css, LitElement, BaseLit } from '/lit';

export class CodexModuleGrille extends BaseLit {
  static properties = {
    taille: { type: String },
    max: { type: String }
  };

  static styles = css`
    :host {
      display: block;
    }

    .modules {
      display: grid;
      gap: 16px;
      container-type: inline-size;
      grid-template-columns: repeat(
        auto-fit,
        minmax(
          min(
            100%, 
            max(
              var(--grid-item-min, 290px), 
              calc((100% - (var(--grid-gap-count, 7) * 16px)) / var(--grid-max-items, 8))
            )
          ),
          1fr
        )
      );
    }
  `;

  constructor() {
    super();
    this.taille = '290';
    this.max = '8';
    this._boundOnSearch = (e) => this._filterModules(e.detail.query);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('codex-search-input', this._boundOnSearch);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('codex-search-input', this._boundOnSearch);
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    this._applyGridVariables();
  }

  _applyGridVariables() {
    const colCount = parseInt(this.max, 10) || 8;
    const gapCount = colCount - 1;

    this.style.setProperty('--grid-item-min', `${this.taille}px`);
    this.style.setProperty('--grid-max-items', colCount);
    this.style.setProperty('--grid-gap-count', gapCount);
  }

  _filterModules(query) {
    const slot = this.shadowRoot.querySelector('slot');
    if (!slot) return;

    const assignedElements = slot.assignedElements({ flatten: true });

    assignedElements.forEach(el => {
      if (el.tagName.toLowerCase() === 'codex-module') {
        // Récupération sécurisée depuis les propriétés JS ou les attributs HTML de l'élément
        const title = (el.title || el.getAttribute('title') || '').toLowerCase();
        const description = (el.description || el.getAttribute('description') || '').toLowerCase();
        const category = (el.category || el.getAttribute('category') || '').toLowerCase();
        const searchKeywords = (el.search || el.getAttribute('search') || '').toLowerCase();

        // Union de tous les champs pour le filtrage global
        const fullText = `${title} ${description} ${category} ${searchKeywords}`;

        const matches = !query || fullText.includes(query);

        if (matches) {
          el.removeAttribute('hidden');
          el.style.display = '';
        } else {
          el.setAttribute('hidden', '');
          el.style.display = 'none';
        }
      }
    });
  }

  render() {
    return html`
      <section class="modules" aria-label="modules">
        <slot></slot>
      </section>
    `;
  }
}

if (!customElements.get('codex-module-grille')) {
  customElements.define('codex-module-grille', CodexModuleGrille);
}
window.CodexModuleGrille = CodexModuleGrille;