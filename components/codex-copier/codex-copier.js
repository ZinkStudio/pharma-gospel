import { html, css, LitElement, BaseLit } from '/lit';

export const commonStyles = css`
  :host {
    display: inline-block;
  }
  `;

export const defaultSyles = css`
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      font-family: inherit;
      font-size: inherit;
      background: var(--pc-surface, #f0f0f4);
      color: var(--pc-text, #161616);
      border: 1px solid var(--pc-border, #d0d0d0);
      padding: 8px 16px;
      border-radius: 2px;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    button:hover {
      background: var(--pc-surface-hover, #e0e0e4);
      border-color: var(--pc-primary, #000091);
    }

    button:focus-visible {
      outline: 2px solid var(--pc-primary, #000091);
      outline-offset: 2px;
    }

    /* Style appliqué lorsque la copie vient d'être effectuée */
    button.is-copied {
      border-color: var(--pc-success, #198038);
    }
  `;

export const ibmStyles = css``;

export class CodexCopier extends BaseLit {
  static properties = {
    design: { type: String, reflect: true },
    target: { type: String },         // Sélecteur CSS de l'élément cible (ex: "#target-element")
    feedbackText: { type: String, attribute: 'feedback-text' }, // Texte ou emoji de succès
    timeout: { type: Number },        // Durée d'affichage du feedback en ms
    copied: { state: true }           // État interne pour gérer le retour visuel
  };

  static styles = [commonStyles, defaultSyles, ibmStyles];

  constructor() {
    super();
    this.design = '';
    this.target = '';
    this.feedbackText = '✅';
    this.timeout = 1500;
    this.copied = false;
  }

  async _handleCopy() {
    if (!this.target) {
      console.warn('[CodexCopier] Aucun sélecteur cible spécifié via l\'attribut "target".');
      return;
    }

    const targetEl = document.querySelector(this.target);
    if (!targetEl) {
      console.error(`[CodexCopier] Cible non trouvée pour le sélecteur : ${this.target}`);
      return;
    }

    // Récupération de la valeur (input/textarea) ou du texte brut
    const textToCopy = targetEl.value !== undefined ? targetEl.value : targetEl.innerText;

    try {
      await navigator.clipboard.writeText(textToCopy);
      this.copied = true;

      // Émission d'un événement personnalisé (hérité de BaseLit) via la méthode emit si besoin
      this.emit('codex-copier-success', { text: textToCopy });

      setTimeout(() => {
        this.copied = false;
      }, this.timeout);

    } catch (err) {
      console.error('[CodexCopier] Erreur lors de la copie dans le presse-papiers :', err);
      alert("Erreur de copie. Assurez-vous d'être en HTTPS ou localhost.");
    }
  }

  render() {
    return this.design === 'ibm' ? this._renderDesignIBM() : this._renderDesignDefault()
  }

  _renderDesignDefault() {
    return html`
      <button 
        type="button" 
        class="${this.copied ? 'is-copied' : ''}"
        @click="${this._handleCopy}">
        ${this.copied ? this.feedbackText : html`<slot>Copier</slot>`}
      </button>
    `;
  }
  _renderDesignIBM() {
    return html`
    <cds-copy-button @click="${this._handleCopy}" autoalign="true" feedback="Copié !" feedback-timeout="2000">Copier dans le presse-papiers</cds-copy-button>
    `;
  }
}

if (!customElements.get('codex-copier')) {
  customElements.define('codex-copier', CodexCopier);
}
window.CodexCopier = CodexCopier;