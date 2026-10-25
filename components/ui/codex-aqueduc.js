import { html, css, LitElement } from '/lit';
import { mediaBridge } from '../../utils/media-bridge.js';
import { MEDIA_DESTINATIONS } from '../../config/media-destinations.js';

export class CodexAqeduc extends LitElement {
  static properties = {
    currentView: { type: String, attribute: 'current-view' },
    file: { type: Object }, // Le fichier de référence (pour le typage)
    fileProvider: { type: Function }, // Optionnel : Fonction pour générer le fichier final
    _isOpen: { type: Boolean, state: true },
    _isGenerating: { type: Boolean, state: true }
  };

  static styles = css`
    :host { display: inline-block; position: relative; }
    .menu {
      position: absolute; top: 100%; left: 0; z-index: 100;
      background: var(--cds-layer-01, #ffffff);
      border: 1px solid var(--cds-border-subtle-01, #e0e0e0);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-radius: 4px;
      padding: 0.5rem 0; min-width: 200px; margin-top: 4px;
    }
    .menu-item { padding: 0.5rem 1rem; cursor: pointer; font-size: 0.875rem; color: var(--cds-text-primary, #161616); }
    .menu-item:hover { background: var(--cds-layer-hover-01, #e8e8e8); }
    .hidden { display: none !important; }
  `;

  constructor() {
    super();
    this.currentView = '';
    this.file = null;
    this.fileProvider = null;
    this._isOpen = false;
    this._isGenerating = false;
  }

  #getFileCategory(file) {
    if (!file) return null;
    const type = file.type || '';
    if (type === 'application/pdf' || (file.name && file.name.toLowerCase().endsWith('.pdf'))) return 'pdf';
    if (type.startsWith('image/')) return 'image';
    return 'unknown';
  }

  #getAvailableDestinations() {
    if (!this.file) return [];
    const category = this.#getFileCategory(this.file);
    if (category === 'unknown') return [];

    return MEDIA_DESTINATIONS.filter(dest => 
      dest.id !== this.currentView && dest.accepts.includes(category)
    );
  }

  async #handleSend(destination) {
    if (!this.file) return;
    this._isOpen = false;

    let finalFile = this.file;

    // Si une fonction de génération est fournie, on l'appelle pour avoir le fichier final
    if (typeof this.fileProvider === 'function') {
      this._isGenerating = true;
      try {
        finalFile = await this.fileProvider();
      } catch (err) {
        console.error('[CodexAqueduc] Erreur génération fichier :', err);
        this._isGenerating = false;
        return;
      }
      this._isGenerating = false;
    }

    if (!finalFile) return;
    
    mediaBridge.send(finalFile, this.currentView);
    window.location.hash = destination.route;
  }

  render() {
    const destinations = this.#getAvailableDestinations();
    
    if (!this.file || destinations.length === 0) return html``;

    return html`
      <cds-button kind="secondary" size="sm" @click=${() => this._isOpen = !this._isOpen} ?disabled=${this._isGenerating}>
        ${this._isGenerating ? '⏳ Génération...' : '📤 Envoyer vers...'}
      </cds-button>

      <div class="menu ${this._isOpen ? '' : 'hidden'}">
        ${destinations.map(dest => html`
          <div class="menu-item" @click=${() => this.#handleSend(dest)}>
            ${dest.label}
          </div>
        `)}
      </div>
    `;
  }
}

if (!customElements.get('codex-aqueduc')) {
  customElements.define('codex-aqueduc', CodexAqeduc);
}