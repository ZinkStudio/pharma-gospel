import { html, BaseLit } from '/lit';

export class CodexNexus extends BaseLit {
  static properties = {
    _isOpen: { type: Boolean, state: true }
  };

  constructor() {
    super();
    this._isOpen = false;
    this._resolveAuth = null;
  }

  connectedCallback() {
    super.connectedCallback();
    // On écoute l'événement global sur le document
    this._onAuthRequired = (e) => {
      this._resolveAuth = e.detail.resolve;
      this._isOpen = true;
      // Focus sur l'input après le rendu
      this.updateComplete.then(() => {
        const input = this.renderRoot.querySelector('#auth-password');
        if (input) input.focus();
      });
    };
    document.addEventListener('coffre:auth-required', this._onAuthRequired);
  }

  disconnectedCallback() {
    document.removeEventListener('coffre:auth-required', this._onAuthRequired);
    super.disconnectedCallback();
  }

  render() {
    return html`
      <cds-modal 
        id="auth-modal" 
        size="sm" 
        ?open="${this._isOpen}"
        prevent-close
        @cds-modal-closed="${this._onClose}"
      >
        <cds-modal-header>
          <h2 class="cds-modal-heading">Accès sécurisé</h2>
        </cds-modal-header>
        
        <cds-modal-body>
          <p class="mb-4 text-secondary" style="margin-bottom: 1rem; color: var(--cds-text-secondary);">
            Veuillez entrer le mot de passe pour accéder aux données de la pharmacie.
          </p>
          <cds-text-input 
            id="auth-password" 
            type="password" 
            label-text="Mot de passe" 
            placeholder="••••••••"
            @keydown="${this._onKeydown}"
          ></cds-text-input>
        </cds-modal-body>

        <cds-modal-footer>
          <cds-button id="auth-submit" kind="primary" type="button" @click="${this._valider}">
            Déverrouiller
          </cds-button>
        </cds-modal-footer>
      </cds-modal>
    `;
  }

  _onKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this._valider();
    }
  }

  _valider() {
    const input = this.renderRoot.querySelector('#auth-password');
    const password = input ? input.value : '';
    
    if (!password) return;
    
    if (this._resolveAuth) {
      this._resolveAuth(password);
      this._resolveAuth = null;
    }
    
    this._isOpen = false;
  }

  _onClose() {
    // Si la modale se ferme sans validation
    if (this._resolveAuth) {
      this._resolveAuth(null);
      this._resolveAuth = null;
    }
    this._isOpen = false;
  }
}

if (!customElements.get('codex-nexus')) {
  customElements.define('codex-nexus', CodexNexus);
}