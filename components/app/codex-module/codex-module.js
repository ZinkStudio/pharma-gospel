import { html, css, BaseLit } from '/lit';

const iconPath = new URL('../../../vendor/carbon@2.24.0/svg/', import.meta.url).href;

/**
 * Icône de repli par variante — n'est utilisée que si `icon`, `logo` et
 * `image` sont absents ou en échec. Les noms doivent exister dans Carbon :
 *   ../../../vendor/carbon@2.24.0/svg/<nom>.svg
 */
const VARIANT_FALLBACK_ICON = {
  pharmacy: 'pill',
  green:    'checkmark',
  purple:   'chemistry',
  orange:   'warning',
  teal:     'data-visibility',
  blue:     'document',
  pink:     'heart',
  yellow:   'lightbulb',
  cyan:     'flow',
  gray:     'settings',
};

export class CodexModule extends BaseLit {
  static properties = {
    title:        { type: String },
    description:  { type: String },
    icon:         { type: String },
    image:        { type: String },
    logo:         { type: String },
    variant:      { type: String },
    category:     { type: String },
    search:       { type: String },
    href:         { type: String },
    target:       { type: String },
    _imageFailed: { state: true },
    _logoFailed:  { state: true },
  };

  static styles = css`
    :host { display: block; }

    /* ============================================================
       Base — carte cliquable (icône, logo ou image)
       ============================================================ */
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
      transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
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

    /* ============================================================
       Titre, description, flèche — styles communs
       ============================================================ */
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

    /* ============================================================
       Variante "icône" (par défaut)
       ============================================================ */
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

    /* Fonds figés : les SVG chargés via <img> ne peuvent pas hériter
       de currentColor (leur fill est noir en dur). Sur fond sombre,
       ils deviendraient invisibles. On impose donc un fond clair
       quel que soit le thème actif. */
    .module-icon.pharmacy { background: #E8E8FD; }
    .module-icon.green    { background: #E8F5E9; }
    .module-icon.purple   { background: #F0E8FF; }
    .module-icon.orange   { background: #FFF1E8; }
    .module-icon.teal     { background: #E5F6F6; }
    .module-icon.blue     { background: #E8F1FF; }
    .module-icon.pink     { background: #FFEAF4; }
    .module-icon.yellow   { background: #FFF4D6; }
    .module-icon.cyan     { background: #E5F6FF; }
    .module-icon.gray     { background: #EEEEEE; }

    /* ============================================================
       Variante "logo" — image entière, centrée, texte en dessous
       ============================================================ */
    .module-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      height: 60px;
      padding: 6px 0;
    }

    .module-logo img {
      max-height: 100%;
      max-width: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
    }

    /* ============================================================
       Variante "image" — couverture + dégradé + texte blanc
       ============================================================ */
    .module.has-image {
      padding: 0;
      overflow: hidden;
    }

    .module-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform .25s ease;
      z-index: 0;
    }

    .module:hover .module-image {
      transform: scale(1.04);
    }

    .module-overlay {
      position: relative;
      z-index: 1;
      margin-top: auto;
      padding: 16px 18px 14px;
      background: linear-gradient(
        to top,
        rgba(0, 0, 0, 0.85) 0%,
        rgba(0, 0, 0, 0.55) 55%,
        transparent 100%
      );
      color: #fff;
      display: flex;
      flex-direction: column;
    }

    /* Overrides sur les styles communs — regroupés ici pour la lisibilité */
    .has-image .module-title {
      color: #fff;
      margin-bottom: 4px;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    }

    .has-image .module-description {
      max-width: 100%;
      color: rgba(255, 255, 255, 0.9);
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .has-image .module-arrow {
      color: #fff;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    }
  `;

  constructor() {
    super();
    this.title = '';
    this.description = '';
    // Aucune valeur par défaut pour icon : _renderIcon() gère la
    // chaîne icon → VARIANT_FALLBACK_ICON[variant] → 'inventory-management'.
    this.icon = '';
    this.image = '';
    this.logo = '';
    this.variant = 'pharmacy';
    this.category = '';
    this.search = '';
    this.href = '';
    this.target = '';

    // Flags internes — non exposés en attributs.
    this._imageFailed = false;
    this._logoFailed = false;
    this._iconWarned = false;
    this._ambiguousWarned = false;
  }

  willUpdate(changed) {
    // Reset du flag d'échec si une nouvelle image arrive, et warning
    // unique quand une image est utilisée sans icône de repli.
    if (changed.has('image') && this.image) {
      this._imageFailed = false;

      if (!this.hasAttribute('icon') && !this._iconWarned) {
        this._iconWarned = true;
        console.warn(
          `[codex-module] "${this.title}" utilise une image sans icon de repli. ` +
          `Ajoutez icon="…" pour un rendu dégradé cohérent si l'image est absente.`
        );
      }
    }

    // Reset symétrique pour un nouveau logo.
    if (changed.has('logo') && this.logo) {
      this._logoFailed = false;
    }

    // Ambiguïté : logo ET image fournis. On garde `logo` (plus contraint)
    // et on prévient le développeur une seule fois.
    if (this.logo && this.image && !this._ambiguousWarned) {
      this._ambiguousWarned = true;
      console.warn(
        `[codex-module] "${this.title}" définit à la fois "logo" et "image". ` +
        `"logo" est prioritaire (image intégrale) — retirez l'attribut inutilisé.`
      );
    }

    // Reset du flag d'ambiguïté dès que l'un des deux attributs est retiré,
    // pour qu'un nouveau conflit redéclenche le warning.
    if ((changed.has('logo') || changed.has('image')) && !(this.logo && this.image)) {
      this._ambiguousWarned = false;
    }
  }

  render() {
    // Cascade de priorité : logo → image → icône.
    // Chaque niveau peut basculer au suivant en cas d'échec de chargement.
    let mode = 'icon';
    if (this.logo && !this._logoFailed) mode = 'logo';
    else if (this.image && !this._imageFailed) mode = 'image';

    const content = {
      icon:  () => this._renderIcon(),
      logo:  () => this._renderLogo(),
      image: () => this._renderImage(),
    }[mode]();

    const classes = [
      'module',
      mode === 'image' ? 'has-image' : '',
      mode === 'logo'  ? 'has-logo'  : '',
    ].filter(Boolean).join(' ');

    if (this.href) {
      return html`
        <a class="${classes}"
          href="${this.href}"
          target="${this.target || '_self'}"
          data-category="${this.category || ''}"
          data-search="${this.search || ''}">
          ${content}
        </a>
      `;
    }

    return html`
      <article class="${classes}"
        tabindex="0"
        data-category="${this.category || ''}"
        data-search="${this.search || ''}">
        ${content}
      </article>
    `;
  }

  _renderImage() {
    return html`
      <img
        class="module-image"
        src="${this.image}"
        alt=""
        aria-hidden="true"
        @error=${() => { this._imageFailed = true; }}>
      <div class="module-overlay">
        <h2 class="module-title">${this.title}</h2>
        <p class="module-description">${this.description}</p>
        <span class="module-arrow" aria-hidden="true">→</span>
      </div>
    `;
  }

  _renderIcon() {
    const icon = this.icon
      || VARIANT_FALLBACK_ICON[this.variant]
      || 'inventory-management';
    const iconSrc = `${iconPath}${icon}.svg`;

    return html`
      <div class="module-icon ${this.variant}">
        <img src="${iconSrc}" alt="" aria-hidden="true">
      </div>
      <h2 class="module-title">${this.title}</h2>
      <p class="module-description">${this.description}</p>
      <span class="module-arrow" aria-hidden="true">→</span>
    `;
  }

  _renderLogo() {
    return html`
      <div class="module-logo">
        <img src="${this.logo}" alt="" aria-hidden="true"
          @error=${() => { this._logoFailed = true; }}>
      </div>
      <h2 class="module-title">${this.title}</h2>
      <p class="module-description">${this.description}</p>
      <span class="module-arrow" aria-hidden="true">→</span>
    `;
  }
}

if (!customElements.get('codex-module')) {
  customElements.define('codex-module', CodexModule);
}
window.CodexModule = CodexModule;