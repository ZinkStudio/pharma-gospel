import { html, css, BaseLit } from '/lit';

export class CodexPdfPreview extends BaseLit {
  static properties = {
    src:        { type: String },
    filename:   { type: String },
    design:     { type: String, reflect: true },
    loading:    { type: Boolean },
    _iframeKey: { state: true }
  };

  static styles = css`
    :host { display: block; width: 100%; }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 1rem;
      background: var(--cds-layer, #f4f4f4);
      border: 1px solid var(--cds-border-subtle, #e0e0e0);
    }

    .toolbar-title {
      font-size: 0.875rem;
      color: var(--cds-text-primary, #161616);
      font-family: 'IBM Plex Sans', system-ui, sans-serif;
    }

    .toolbar-actions {
      display: flex;
      gap: 0.5rem;
    }

    iframe {
      width: 100%;
      height: 600px;
      border: 1px solid var(--cds-border-subtle, #e0e0e0);
      border-top: none;
      background: #fff;
      display: block;
    }

    .empty {
      padding: 2rem;
      text-align: center;
      color: var(--cds-text-secondary, #525252);
      border: 1px dashed var(--cds-border-subtle, #e0e0e0);
      font-family: 'IBM Plex Sans', system-ui, sans-serif;
      font-size: 0.875rem;
    }
  `;

  constructor() {
    super();
    this.filename = 'document.pdf';
    this.loading = false;
    this._iframeKey = 0;
  }

  render() {
    return html`
      <div class="toolbar">
        <span class="toolbar-title">${this.filename}</span>
        <div class="toolbar-actions">
          <cds-button size="sm" kind="ghost"
            ?disabled=${!this.src}
            @click=${this._download}>
            📥 Télécharger
          </cds-button>
          <cds-button size="sm" kind="ghost"
            ?disabled=${!this.src}
            @click=${this._print}>
            🖨 Imprimer
          </cds-button>
        </div>
      </div>
      ${this.loading
        ? html`<div class="empty">⏳ Génération du document…</div>`
        : this.src
          ? html`<iframe key=${this._iframeKey} src=${this.src} title="Aperçu PDF"></iframe>`
          : html`<div class="empty">Aucun document généré.</div>`}
    `;
  }

  /**
   * Affiche un PDF à partir d'un Blob. Révoque l'URL précédente.
   * Force le rechargement de l'iframe via _iframeKey.
   */
  setPdfBlob(blob, filename) {
    if (this.src?.startsWith('blob:')) URL.revokeObjectURL(this.src);
    this.src = URL.createObjectURL(blob);
    this.filename = filename || this.filename;
    this.loading = false;
    this._iframeKey++;
  }

  setFilename(filename) {
    this.filename = filename;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.src?.startsWith('blob:')) URL.revokeObjectURL(this.src);
  }

  _download = () => {
    if (!this.src) return;
    const a = document.createElement('a');
    a.href = this.src;
    a.download = this.filename;
    a.click();
  };

  _print = () => {
    if (!this.src) return;
    const iframe = this.renderRoot.querySelector('iframe');
    iframe?.contentWindow?.print();
  };
}

if (!customElements.get('codex-pdf-preview')) {
  customElements.define('codex-pdf-preview', CodexPdfPreview);
}