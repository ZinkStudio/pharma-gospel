import { html, css, BaseLit } from '/lit';

export class CodexDropZone extends BaseLit {
  static properties = {
    design: { type: String, reflect: true },   // '' (défaut) | 'ibm'
    accept: { type: String },
    multiple: { type: Boolean },
    heading: { type: String },
    hint: { type: String },
    formats: { type: String },
    state: { type: String, reflect: true },         // "empty" | "preview"
    previewSrc: { type: String, attribute: 'preview-src' },
    previewName: { type: String, attribute: 'preview-name' },
    previewDetails: { type: String, attribute: 'preview-details' },
    noReplace: { type: Boolean, attribute: 'no-replace' },
    _dragover: { type: Boolean, state: true },
  };

  static styles = css`
  /* ---------- Base commune ---------- */
  :host {
    display: block;
    font-family: inherit;
  }

  .empty {
    cursor: pointer;
    text-align: center;
    outline: none;
    transition: background-color .15s ease, border-color .15s ease, box-shadow .15s ease;
  }
  .empty:focus-visible { /* défini par thème */ }

  p { margin: 0; }
  input { display: none; }

  .preview { display: none; align-items: center; gap: 1rem; text-align: left; }
  :host([state="preview"]) .preview { display: flex; }
  :host([state="preview"]) .empty   { display: none; }

  .thumb { flex: 0 0 auto; object-fit: cover; }
  .meta  { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .name  { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .actions { display: flex; gap: 0.25rem; flex: 0 0 auto; }
  .actions button { cursor: pointer; padding: 0; line-height: 1; }

  /* ---------- Thème par défaut (marque projet) ---------- */
  :host(:not([design="ibm"])) .empty {
    padding: 2rem 1rem;
    border: 2px dashed var(--dropzone-border, var(--pc-primary, #006d44));
    border-radius: 8px;
    background: color-mix(in srgb, var(--dropzone-border, var(--pc-primary, #006d44)) 4%, transparent);
    color: var(--pc-text-secondary, #555);
  }
  :host(:not([design="ibm"])) .empty:focus-visible {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--dropzone-border, var(--pc-primary, #006d44)) 40%, transparent);
  }
  :host(:not([design="ibm"])) .empty[drag-active] {
    border-style: solid;
    background: color-mix(in srgb, var(--dropzone-border, var(--pc-primary, #006d44)) 12%, transparent);
  }
  :host(:not([design="ibm"])) .formats {
    font-size: 0.85rem; opacity: 0.75; margin-top: 0.75rem;
  }
  :host(:not([design="ibm"])) .preview {
    padding: 0.75rem;
    border: 1px solid var(--pc-border, #ddd);
    border-radius: 8px;
    background: var(--pc-surface, #fff);
  }
  :host(:not([design="ibm"])) .thumb {
    width: 64px; height: 64px; border-radius: 6px;
    border: 1px solid var(--pc-border, #ddd); background: #f4f4f4;
  }
  :host(:not([design="ibm"])) .details { font-size: 0.8rem; opacity: 0.75; }
  :host(:not([design="ibm"])) .actions button {
    width: 32px; height: 32px;
    border: 1px solid var(--pc-border, #ddd);
    background: var(--pc-surface, #fff);
    color: var(--pc-text-secondary, #555);
    border-radius: 6px;
    font-size: 14px;
    display: flex; align-items: center; justify-content: center;
  }
  :host(:not([design="ibm"])) .actions button:hover {
    border-color: var(--pc-primary, #006d44); color: var(--pc-primary, #006d44);
  }
  :host(:not([design="ibm"])) .actions button.danger:hover {
    border-color: #da1e28; color: #da1e28;
  }

  /* ---------- Thème IBM Carbon ---------- */
:host([design="ibm"]) {
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  color: var(--cds-text-primary);
}

:host([design="ibm"]) .empty {
  padding: 2.5rem 1rem;
  border: 1px dashed var(--cds-border-strong);
  border-radius: 0;
  background: var(--cds-layer-accent);   /* ← voir note */
  color: var(--cds-text-secondary);
  font-size: 0.875rem;
  line-height: 1.4;
}
:host([design="ibm"]) .empty:hover {
  background: var(--cds-layer-accent-hover, var(--cds-layer-accent));
}
:host([design="ibm"]) .empty:focus-visible {
  outline: 2px solid var(--cds-focus);
  outline-offset: -2px;
}
:host([design="ibm"]) .empty[drag-active] {
  border-style: solid;
  border-color: var(--cds-border-interactive);
  background: var(--cds-layer-hover);
}
:host([design="ibm"]) .empty p + p { margin-top: 0.25rem; }
:host([design="ibm"]) .formats {
  font-size: 0.75rem;
  letter-spacing: 0.32px;
  color: var(--cds-text-helper, var(--cds-text-secondary));
  margin-top: 0.75rem;
}

:host([design="ibm"]) .preview {
  padding: 1rem;
  border: 1px solid var(--cds-border-subtle);
  border-radius: 0;
  background: var(--cds-layer-accent);
}
:host([design="ibm"]) .thumb {
  width: 48px; height: 48px; border-radius: 0;
  border: 1px solid var(--cds-border-subtle);
  background: var(--cds-field);
}
:host([design="ibm"]) .name { font-size: 0.875rem; font-weight: 400; }
:host([design="ibm"]) .details {
  font-size: 0.75rem;
  color: var(--cds-text-helper, var(--cds-text-secondary));
}

:host([design="ibm"]) .actions button {
  width: 32px; height: 32px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--cds-icon-primary);
  border-radius: 0;
  font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}
:host([design="ibm"]) .actions button:hover {
  background: var(--cds-layer-hover);
}
:host([design="ibm"]) .actions button.danger:hover {
  background: var(--cds-support-error);
  color: #fff;
}
`;

  constructor() {
    super();
    this.state = 'empty';
    this.multiple = false;
    this.noReplace = false;
    this._dragover = false;
    this.heading = '📥 Glissez un fichier ici, <strong>cliquez</strong> pour en choisir un';
    this.hint = 'ou <strong>collez</strong> un fichier copié (Ctrl+V / Cmd+V)';
    this.formats = '';
    this.accept = '';
    this.previewSrc = '';
    this.previewName = '';
    this.previewDetails = '';
  }

  render() {
    return html`
      <input type="file" hidden
        accept=${this.accept}
        ?multiple=${this.multiple}
        @change=${this._onPick}>

      <div class="empty" role="button" tabindex="0"
        ?drag-active=${this._dragover}
        @click=${this._openPicker}
        @keydown=${this._onKey}>
        ${this.heading ? html`<p .innerHTML=${this.heading}></p>` : ''}
        ${this.hint ? html`<p .innerHTML=${this.hint}></p>` : ''}
        ${this.formats ? html`<p class="formats">Formats : ${this.formats}</p>` : ''}
      </div>

      <div class="preview">
        ${this.previewSrc ? html`<img class="thumb" src=${this.previewSrc} alt="">` : ''}
        <div class="meta">
          <span class="name">${this.previewName || ''}</span>
          ${this.previewDetails ? html`<span class="details">${this.previewDetails}</span>` : ''}
        </div>
        <div class="actions">
          ${this.noReplace ? '' : html`
            <button type="button" aria-label="Remplacer le fichier" title="Remplacer"
              @click=${this._openPicker}>↻</button>
          `}
          <button class="danger" type="button" aria-label="Retirer le fichier" title="Retirer"
            @click=${this._clearPreview}>✕</button>
        </div>
      </div>
    `;
  }

  // --- API publique (équivalent de clearPreview() côté natif) ---

  clearPreview({ silent = false } = {}) {
    this.state = 'empty';
    this.previewSrc = '';
    this.previewName = '';
    this.previewDetails = '';
    if (!silent) this.emit('preview-cleared');
  }

  // --- Handlers ---

  _openPicker = (e) => {
    e?.stopPropagation();
    this.renderRoot.querySelector('input')?.click();
  };

  _onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._openPicker(e);
    }
  };

  _onPick = (e) => {
    const input = e.target;
    const files = Array.from(input.files || []);
    input.value = '';           // permet de re-sélectionner le même fichier
    if (files.length) this._emit(files);
  };

  _clearPreview = (e) => {
    e.stopPropagation();
    this.clearPreview();
  };

  // --- Drag & drop au niveau host (couvre la zone de padding) ---

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('dragover', this._onDragOver);
    this.addEventListener('dragleave', this._onDragLeave);
    this.addEventListener('drop', this._onDrop);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('dragover', this._onDragOver);
    this.removeEventListener('dragleave', this._onDragLeave);
    this.removeEventListener('drop', this._onDrop);
  }

  _onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (this.state === 'empty' && !this._dragover) this._dragover = true;
  };

  _onDragLeave = (e) => {
    if (this.contains(e.relatedTarget)) return;
    this._dragover = false;
  };

  _onDrop = (e) => {
    e.preventDefault();
    this._dragover = false;
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) this._emit(files);
  };

  // --- Utilitaires ---

  _emit(rawFiles) {
    const accepted = rawFiles.filter((f) => this._isAccepted(f));
    const result = this.multiple ? accepted : accepted.slice(0, 1);
    if (!result.length) return;
    this.emit('files-captured', { files: result, file: result[0] });
  }

  _isAccepted(file) {
    const rules = (this.accept || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!rules.length) return true;
    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();
    return rules.some((rule) => {
      const r = rule.toLowerCase();
      if (r.startsWith('.')) return name.endsWith(r);
      if (r.endsWith('/*')) return type.startsWith(r.slice(0, -1));
      return type === r;
    });
  }
}

if (!customElements.get('codex-drop-zone')) {
  customElements.define('codex-drop-zone', CodexDropZone);
}