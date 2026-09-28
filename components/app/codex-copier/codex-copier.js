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

  button.is-copied {
    border-color: var(--pc-success, #198038);
  }
`;

export const ibmStyles = css``;

/** Détecte la présence de balises HTML dans une chaîne. */
const HAS_HTML_RE = /<[a-z][\s\S]*>/i;

export class CodexCopier extends BaseLit {
  static properties = {
    design:       { type: String, reflect: true },
    target:       { type: String },                          // Sélecteur CSS de la cible
    feedbackText: { type: String, attribute: 'feedback-text' },
    timeout:      { type: Number },
    format:       { type: String },                          // 'auto' | 'html' | 'text'
    copied:       { state: true }
  };

  static styles = [commonStyles, defaultSyles, ibmStyles];

  constructor() {
    super();
    this.design = '';
    this.target = '';
    this.feedbackText = '✅';
    this.timeout = 1500;
    this.format = 'auto';
    this.copied = false;
  }

  /**
   * Récupère le contenu (texte + HTML) de la cible.
   * ⚠️ On utilise `textContent` (pas `innerText`) : fonctionne même sur
   * un élément [hidden] ou non rendu, cas classique du <span hidden>.
   */
  #extractContent(targetEl) {
    const isFormField =
      targetEl instanceof HTMLInputElement ||
      targetEl instanceof HTMLTextAreaElement;

    if (isFormField) {
      return { text: targetEl.value, html: '' };
    }

    return {
      text: targetEl.textContent ?? '',
      html: targetEl.innerHTML ?? ''
    };
  }

  /**
   * Écrit dans le presse-papiers :
   * - si `rich` : tente ClipboardItem (text/html + text/plain), sinon fallback
   * - sinon : writeText classique
   */
  async #writeToClipboard(text, html, rich) {
    if (rich && window.ClipboardItem && navigator.clipboard.write) {
      try {
        const item = new ClipboardItem({
          'text/html':  new Blob([html],  { type: 'text/html' }),
          'text/plain': new Blob([text],  { type: 'text/plain' })
        });
        await navigator.clipboard.write([item]);
        return true;
      } catch (err) {
        console.warn('[CodexCopier] ClipboardItem indisponible, fallback texte.', err);
      }
    }

    await navigator.clipboard.writeText(text);
    return true;
  }

  async _handleCopy() {
    if (!this.target) {
      console.warn('[CodexCopier] Aucun sélecteur cible spécifié via l\'attribut "target".');
      return;
    }

    // On cherche d'abord dans le shadowRoot du host, puis dans le document
    const root = this.getRootNode?.() || document;
    const targetEl =
      root.querySelector?.(this.target) ||
      document.querySelector(this.target);

    if (!targetEl) {
      console.error(`[CodexCopier] Cible non trouvée pour le sélecteur : ${this.target}`);
      return;
    }

    const { text, html } = this.#extractContent(targetEl);

    // Détermine si on doit copier en enrichi
    const format  = this.format || 'auto';
    const hasHtml = HAS_HTML_RE.test(html);
    const rich    = format === 'html' || (format === 'auto' && hasHtml);

    // Texte final : si format=text on prend textContent, sinon on s'assure
    // d'avoir un fallback texte non vide (strip des balises)
    const textToCopy = (text && text.trim())
      ? text.trim()
      : html.replace(/<[^>]+>/g, '').trim();

    if (!textToCopy && !html.trim()) {
      console.warn('[CodexCopier] Rien à copier.');
      return;
    }

    try {
      await this.#writeToClipboard(textToCopy, html, rich);

      this.copied = true;
      this.emit('codex-copier-success', {
        text: textToCopy,
        html,
        format: rich ? 'html' : 'text'
      });

      setTimeout(() => { this.copied = false; }, this.timeout);

    } catch (err) {
      console.error('[CodexCopier] Erreur lors de la copie dans le presse-papiers :', err);
      alert("Erreur de copie. Assurez-vous d'être en HTTPS ou localhost.");
    }
  }

  render() {
    return this.design === 'ibm' ? this._renderDesignIBM() : this._renderDesignDefault();
  }

  _renderDesignDefault() {
    return html`
      <button
        type="button"
        class="${this.copied ? 'is-copied' : ''}"
        @click="${this._handleCopy}">
        ${this.copied ? this.feedbackText : html`<slot> 📋 Copier </slot>`}
      </button>
    `;
  }

  _renderDesignIBM() {
    return html`
      <cds-copy-button
        @click="${this._handleCopy}"
        autoalign="true"
        feedback="Copié !"
        feedback-timeout="2000">
        Copier dans le presse-papiers
      </cds-copy-button>
    `;
  }
}

if (!customElements.get('codex-copier')) {
  customElements.define('codex-copier', CodexCopier);
}
window.CodexCopier = CodexCopier;