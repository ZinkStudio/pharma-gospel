import { html, css, LitElement, BaseLit } from '/lit';
import { missiveBus } from '@services/missive-bus.js';

const TYPE_TO_ICON = {
  info: 'fr-icon-info-fill',
  success: 'fr-icon-success-fill',
  error: 'fr-icon-error-fill',
  warning: 'fr-icon-warning-fill'
};

export const commonStyles = css`
  :host {
    display: block;
    position: relative;
    font-family: inherit;
  }
`;

export const defaultStyles = css`
  .dsfr-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: .5rem;
    flex-wrap: nowrap;
    padding: .5rem;
    box-sizing: border-box;
  }

  .arsenal {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  .missives {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    flex-grow: 1;
    min-height: 40px;
  }

  .history-panel {
    position: absolute;
    top: 45px;
    right: 0;
    width: 600px;
    max-height: 600px;
    overflow-y: auto;
    background: var(--background-default-grey, #fff);
    border: 1px solid var(--border-default-grey, #ddd);
    border-radius: .5rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, .2);
    padding: .5rem;
    z-index: 10;
    transition: opacity .15s ease, transform .15s ease;
  }

  .history-panel[hidden] {
    opacity: 0;
    transform: scale(.95);
    pointer-events: none;
  }

  .history-title {
    font-weight: bold;
    margin-bottom: .5rem;
    text-align: center;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: .5rem;
  }

  .counter {
    font-weight: bold;
    margin-left: .25rem;
  }
`;

export const ibmStyles = css`
  :host {
    display: flex;
  }

  /* Zone fixe pour empiler les Toasts en bas/haut à droite */
  .ibm-toast-container {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
  }

  cds-toast-notification {
    pointer-events: auto;
  }
`;

export class CodexMissives extends BaseLit {
  static properties = {
    design: { type: String, reflect: true },
    small: { type: Boolean },
    messages: { state: true },       // Historique complet
    activeToasts: { state: true },   // Toasts temporaires actifs à l'écran
    isPanelOpen: { state: true }
  };

  static styles = [commonStyles, defaultStyles, ibmStyles];
  
  connectedCallback() {
    super.connectedCallback?.();

    this._onMissive = (e) => {
      const { type, text, message } = e.detail || {};
      const msgText = text || message;
      if (msgText) {
        this.addMessage(type || 'info', msgText);
      }
    };

    missiveBus.addEventListener('missive', this._onMissive);
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    missiveBus.removeEventListener('missive', this._onMissive);
  }
  constructor() {
    super();
    this.design = '';
    this.small = false;
    this.messages = [];
    this.activeToasts = [];
    this.isPanelOpen = false;
  }

  testMessages() {
    this.addMessage('info', 'Démarrage du système...');
    setTimeout(() => this.addMessage('success', 'Initialisation du module Ordoscan terminée.'), 2000);
    setTimeout(() => this.addMessage('warning', 'La qualité du document scanné est un peu faible.'), 3000);
    setTimeout(() => this.addMessage('error', 'Échec de l\'extraction des données. Veuillez réessayer.'), 4000);
  }

  addMessage(type, message) {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const item = { id, type, message, timestamp: Date.now() };

    // 1. Ajouter à l'historique général
    this.messages = [...this.messages, item];

    // 2. Si mode IBM, déclencher un Toast temporaire
    if (this.design === 'ibm') {
      this.activeToasts = [...this.activeToasts, item];

      // Auto-suppression du Toast après 5 secondes
      setTimeout(() => {
        this._removeToast(id);
      }, 5000);
    }
  }

  _removeToast(id) {
    this.activeToasts = this.activeToasts.filter(t => t.id !== id);
  }

  clearMessages() {
    this.messages = [];
    this.activeToasts = [];
  }

  _togglePanel() {
    this.isPanelOpen = !this.isPanelOpen;
  }

  _getIbmKind(type) {
    const map = {
      info: 'info',
      success: 'success',
      error: 'error',
      warning: 'warning'
    };
    return map[type] || 'info';
  }

  render() {
    return this.design === 'ibm' ? this._renderDesignIBM() : this._renderDesignDefault();
  }

  _renderDesignDefault() {
    const latestMsg = this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
    const displayMessages = [...this.messages].reverse();

    return html`
      <div class="dsfr-container">
        <div class="missives">
          ${latestMsg ? html`
            <div class="fr-alert fr-alert--${latestMsg.type} ${TYPE_TO_ICON[latestMsg.type]} ${this.small ? 'fr-alert--sm' : ''}">
              ${this.small
          ? html`<p>${latestMsg.message}</p>`
          : html`<h3 class="fr-alert__title">${latestMsg.message}</h3>`}
            </div>
          ` : ''}
        </div>

        <div class="arsenal">
          <button class="fr-btn fr-btn--secondary fr-btn--sm" @click="${this._togglePanel}">
            📜 Journal <span class="counter">(${this.messages.length})</span>
          </button>
          <button class="fr-btn fr-btn--tertiary fr-btn--sm" @click="${this.clearMessages}">
            🗑️ Vider
          </button>
        </div>

        <div class="history-panel" ?hidden="${!this.isPanelOpen}">
          <div class="history-title">Historique</div>
          <div class="history-list">
            ${displayMessages.length > 0
        ? displayMessages.map(h => html`
                  <div class="fr-alert fr-alert--${h.type} ${TYPE_TO_ICON[h.type]} fr-alert--sm">
                    <p>${h.message}</p>
                  </div>
                `)
        : html`<p style="text-align:center; color: #666; margin-top:1rem;">Aucun message.</p>`
      }
          </div>
        </div>
      </div>
    `;
  }

  _renderDesignIBM() {
    const hasMessages = this.messages.length > 0;
    const displayMessages = [...this.messages].reverse();

    return html`
      <cds-header-global-action aria-label="Notification" tooltip-text="Notifications" @click="${this._togglePanel}">
        <svg focusable="false" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"
          fill="currentColor" slot="icon" width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M28.7071,19.293,26,16.5859V13a10.0136,10.0136,0,0,0-9-9.9492V1H15V3.0508A10.0136,10.0136,0,0,0,6,13v3.5859L3.2929,19.293A1,1,0,0,0,3,20v3a1,1,0,0,0,1,1h7v.7768a5.152,5.152,0,0,0,4.5,5.1987A5.0057,5.0057,0,0,0,21,25V24h7a1,1,0,0,0,1-1V20A1,1,0,0,0,28.7071,19.293ZM19,25a3,3,0,0,1-6,0V24h6Zm8-3H5V20.4141L7.707,17.707A1,1,0,0,0,8,17V13a8,8,0,0,1,16,0v4a1,1,0,0,0,.293.707L27,20.4141Z"></path>
        </svg>
      </cds-header-global-action>
      <!-- Modale d'historique (Ouverture indépendante) -->
      <cds-modal 
        ?open="${this.isPanelOpen}" 
        @cds-modal-closed="${() => this.isPanelOpen = false}">
        <cds-modal-header>
          <cds-modal-close-button close-button-label="Close"></cds-modal-close-button>
          <cds-modal-heading>Historique des messages</cds-modal-heading>
        </cds-modal-header>
        <cds-modal-body>
          ${hasMessages ? html`<cds-header-global-action aria-label="Tout effacer" tooltip-text="Tout effacer" @click="${this.clearMessages}">
          <svg focusable="false" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"
          fill="currentColor" slot="icon" width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M12 12H14V24H12zM18 12H20V24H18z"></path>
          <path d="M4 6V8H6V28a2 2 0 002 2H24a2 2 0 002-2V8h2V6zM8 28V8H24V28zM12 2H20V4H12z"></path>
          </svg>            
          </cds-header-global-action>` : ``
      }

          ${hasMessages ? displayMessages.map(m => html`
                <cds-inline-notification
                  kind="${this._getIbmKind(m.type)}"
                  title="${m.type.toUpperCase()}"
                  subtitle="${m.message}"
                  low-contrast>
                </cds-inline-notification>
              `)
        : html`<p style="margin-bottom: 1rem; color: var(--cds-text-secondary, #525252);">Aucun message dans l'historique.</p>`
      }
        </cds-modal-body>
      </cds-modal>

      <!-- File d'attente des Toasts éphémères -->
      <div class="ibm-toast-container">
        ${this.activeToasts.map(toast => html`
          <cds-toast-notification
            kind="${this._getIbmKind(toast.type)}"
            title="${toast.type.toUpperCase()}"
            subtitle="${toast.message}"
            low-contrast
            @cds-toast-notification-closed="${() => this._removeToast(toast.id)}">
          </cds-toast-notification>
        `)}
      </div>
    `;
  }
}

if (!customElements.get('codex-missives')) {
  customElements.define('codex-missives', CodexMissives);
}
window.CodexMissives = CodexMissives;