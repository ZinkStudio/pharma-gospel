import { html, css, LitElement, BaseLit } from '/lit';

const iconPath = new URL('../../services/carbon@2.24.0/svg/', import.meta.url).href;

export class CodexModule extends BaseLit {
  static properties = {
    title: { type: String },
    description: { type: String },
    icon: { type: String },
    variant: { type: String },
    category: { type: String },
    search: { type: String },
    href: { type: String }
  };

  static styles = css`
    :host {
      display: block;
    }

    .module {
      position: relative;
      min-height: 172px;
      display: flex;
      flex-direction: column;
      padding: 20px;
      background: var(--pc-surface, #fff);
      border: 2px solid var(--pc-border, #e0e0e0);
      cursor: pointer;
      box-sizing: border-box;
      text-decoration: none;
      color: inherit;
      transition:
          border-color .15s ease,
          box-shadow .15s ease,
          transform .15s ease;
    }

    .module:hover {
      border-color: var(--pc-primary, #000091);
      box-shadow: 0 2px 8px rgba(0, 0, 0, .08);
      transform: translateY(-1px);
    }

    .module:focus-visible {
      outline: 2px solid var(--pc-primary, #000091);
      outline-offset: 2px;
    }

    .module-icon {
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      margin-bottom: 18px;
      border-radius: 2px;
    }

    .module-icon img {
      width: 24px;
      height: 24px;
      display: block;
    }

    .module-icon.pharmacy { background: var(--pc-primary-light, #e8e8fd); color: var(--pc-primary, #000091); }
    .module-icon.green    { background: #E8F5E9; color: #198038; }
    .module-icon.purple   { background: #F0E8FF; color: #8A3FFC; }
    .module-icon.orange   { background: #FFF1E8; color: #BA4E00; }
    .module-icon.teal     { background: #E5F6F6; color: #007A78; }
    .module-icon.blue     { background: #E8F1FF; color: #0F62FE; }
    .module-icon.pink     { background: #FFEAF4; color: #D02670; }
    .module-icon.yellow   { background: #FFF4D6; color: #8E6A00; }
    .module-icon.cyan     { background: #E5F6FF; color: #0072C3; }
    .module-icon.gray     { background: #EEEEEE; color: #525252; }

    .module-title {
      margin: 0 0 8px;
      font-size: 16px;
      line-height: 1.3;
      font-weight: 600;
    }

    .module-description {
      margin: 0;
      max-width: 250px;
      color: var(--pc-text-secondary, #666);
      font-size: 13px;
      line-height: 1.45;
    }

    .module-arrow {
      position: absolute;
      right: 18px;
      bottom: 18px;
      font-size: 20px;
      transition: transform .15s ease;
    }

    .module:hover .module-arrow {
      transform: translateX(4px);
    }
  `;

  constructor() {
    super();
    this.title = '';
    this.description = '';
    this.icon = 'inventory-management';
    this.variant = 'pharmacy';
    this.category = '';
    this.search = '';
    this.href = '';
  }

  render() {
    const iconSrc = `${iconPath}${this.icon}.svg`;
    const content = html`
      <div class="module-icon ${this.variant}">
        <img src="${iconSrc}" alt="" aria-hidden="true">
      </div>
      <h2 class="module-title">${this.title}</h2>
      <p class="module-description">${this.description}</p>
      <span class="module-arrow" aria-hidden="true">→</span>
    `;

    // Si un href est fourni, on Rendu une balise 'a', sinon un 'article' interactif
    if (this.href) {
      return html`
        <a 
          class="module" 
          href="${this.href}"
          data-category="${this.category || ''}"
          data-search="${this.search || ''}">
          ${content}
        </a>
      `;
    }

    return html`
      <article 
        class="module" 
        tabindex="0"
        data-category="${this.category || ''}"
        data-search="${this.search || ''}">
        ${content}
      </article>
    `;
  }
}

if (!customElements.get('codex-module')) {
  customElements.define('codex-module', CodexModule);
}
window.CodexModule = CodexModule;