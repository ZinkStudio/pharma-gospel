import { html, css, BaseLit } from '/lit';

/**
 * Toolbar Carbon pour les documents PDF.
 * Émet :
 *   - 'pdf-download'
 *   - 'pdf-print'
 *   - 'pdf-layout-change' (si showColumns/showRows, avec { columns?, rows? })
 */
export class CodexPdfToolbar extends BaseLit {
  static properties = {
    design:      { type: String, reflect: true },
    filename:    { type: String },
    showColumns: { type: Boolean, attribute: 'show-columns' },
    showRows:    { type: Boolean, attribute: 'show-rows' },
    columns:     { type: Number },
    rows:        { type: Number },
    disabled:    { type: Boolean }
  };

  static styles = css`
    :host {
      display: block;
      padding: 0.75rem 1rem;
      background: var(--cds-layer, #f4f4f4);
      border: 1px solid var(--cds-border-subtle, #e0e0e0);
      border-bottom: none;
      font-family: 'IBM Plex Sans', system-ui, sans-serif;
    }

    .row {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .title {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--cds-text-primary, #161616);
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .numbers {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .numbers label {
      display: flex;
      flex-direction: column;
      font-size: 0.75rem;
      color: var(--cds-text-secondary, #525252);
      gap: 0.125rem;
    }

    .numbers input {
      width: 4rem;
      padding: 0.25rem 0.5rem;
      border: 1px solid var(--cds-border-strong, #8d8d8d);
      background: var(--cds-field, #fff);
      color: var(--cds-text-primary, #161616);
      font-family: inherit;
      font-size: 0.875rem;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
    }
  `;

  constructor() {
    super();
    this.filename = 'document.pdf';
    this.showColumns = false;
    this.showRows = false;
    this.columns = 3;
    this.rows = 8;
    this.disabled = false;
  }

  render() {
    return html`
      <div class="row">
        <span class="title">${this.filename}</span>

        <div class="numbers">
          ${this.showColumns ? html`
            <label>
              Colonnes
              <input type="number" min="1" max="12"
                .value=${String(this.columns)}
                ?disabled=${this.disabled}
                @change=${(e) => this._onNumber('columns', e)}>
            </label>
          ` : ''}
          ${this.showRows ? html`
            <label>
              Lignes
              <input type="number" min="1" max="20"
                .value=${String(this.rows)}
                ?disabled=${this.disabled}
                @change=${(e) => this._onNumber('rows', e)}>
            </label>
          ` : ''}
        </div>

        <div class="actions">
          <cds-button size="sm" kind="ghost"
            ?disabled=${this.disabled}
            @click=${() => this.emit('pdf-download')}>
            📥 Télécharger
          </cds-button>
          <cds-button size="sm" kind="ghost"
            ?disabled=${this.disabled}
            @click=${() => this.emit('pdf-print')}>
            🖨 Imprimer
          </cds-button>
        </div>
      </div>
    `;
  }

  _onNumber(name, e) {
    const value = parseInt(e.target.value, 10) || 1;
    this[name] = value;
    this.emit('pdf-layout-change', { [name]: value });
  }
}

if (!customElements.get('codex-pdf-toolbar')) {
  customElements.define('codex-pdf-toolbar', CodexPdfToolbar);
}