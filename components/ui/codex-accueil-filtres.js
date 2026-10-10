import { html, css, BaseLit } from '/lit';

/**
 * Barre de filtres pour l'accueil — chips de catégories.
 * Émet 'accueil-filter-change' avec { category } à chaque clic.
 * La catégorie 'all' désactive le filtre.
 */
export class CodexAccueilFiltres extends BaseLit {
  static properties = {
    active: { type: String, reflect: true },
    groups: { type: Array },
  };

  static styles = css`
    :host { display: block; }

    .chips {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
      align-items: center;
    }

    button {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.9rem;
      border: 1px solid var(--pc-border, #e0e0e0);
      background: var(--pc-surface, #fff);
      color: var(--pc-text-secondary, #525252);
      border-radius: 999px;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 500;
      transition: border-color .15s ease, background-color .15s ease, color .15s ease;
    }

    button:hover {
      border-color: var(--pc-primary, #006d44);
      color: var(--pc-primary, #006d44);
    }

    button:focus-visible {
      outline: 2px solid var(--pc-primary, #006d44);
      outline-offset: 2px;
    }

    button[aria-pressed="true"] {
      background: var(--pc-primary, #006d44);
      border-color: var(--pc-primary, #006d44);
      color: #fff;
    }
  `;

  constructor() {
    super();
    this.active = 'all';
    this.groups = [
      { id: 'all',          label: 'Tout' },
      { id: 'officine',     label: '🔗 Officine' },
      { id: 'documents',    label: '📄 Documents' },
      { id: 'applications', label: '🧰 Applications' },
    ];
  }

  render() {
    return html`
      <div class="chips" role="group" aria-label="Filtrer les modules">
        ${this.groups.map((g) => html`
          <button
            type="button"
            aria-pressed=${this.active === g.id}
            @click=${() => this._onClick(g.id)}>
            ${g.label}
          </button>
        `)}
      </div>
    `;
  }

  _onClick(id) {
    if (this.active === id) return;
    this.active = id;
    this.emit('accueil-filter-change', { category: id });
  }
}

if (!customElements.get('codex-accueil-filtres')) {
  customElements.define('codex-accueil-filtres', CodexAccueilFiltres);
}