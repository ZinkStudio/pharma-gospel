import { html, css, LitElement, BaseLit } from '/lit';

export const commonStyles = css`
  :host { 
    display: inline-flex; 
    gap: 6px; 
  }
`;

export const defaultStyles = css`
  input { display: none; }
  label {
    display: flex; 
    align-items: center; 
    justify-content: center;
    width: 36px; 
    height: 36px; 
    border-radius: 50%;
    background: var(--body-bg, #f0f0f4); 
    cursor: pointer;
    font-size: 1.2rem; 
    position: relative; 
    transition: all 0.3s ease;
  }
  label.selected::after {
    content: ""; 
    position: absolute; 
    bottom: -4px; 
    left: 25%;
    width: 50%; 
    height: 3px; 
    border-radius: 2px;
    background: var(--accent-color, #ccc);
  }
`;

export const ibmStyles = css`
  :host([design="ibm"]) {
    display: inline-flex;
    height: 100%;
    align-items: center;
  }
`;

export class CodexTheme extends LitElement {
  static properties = {
    design: { type: String, reflect: true },
    currentTheme: { state: true },
    isPanelOpen: { state: true }
  };

  static styles = [commonStyles, defaultStyles, ibmStyles];

  constructor() {
    super();
    this.design = '';
    this.currentTheme = localStorage.getItem("theme") || "auto";
    this.isPanelOpen = false;
    this._applyTheme(this.currentTheme);
  }

  _applyTheme(theme) {
    this.currentTheme = theme;
    localStorage.setItem("theme", theme);

    // 1. Gestion du mode logique global pour l'application
    document.documentElement.setAttribute("data-theme", theme);

    // 2. Résolution du thème effectif (si 'auto', on détecte via le système)
    let effectiveTheme = theme;
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = prefersDark ? 'dark' : 'light';
    }

    // 3. Application des classes Carbon sur le root (ex: g10 pour clair, g90/g100 pour sombre)
    document.documentElement.classList.remove('cds--white', 'cds--g10', 'cds--g90', 'cds--g100');
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('cds--g90'); // ou 'cds--g100' selon la nuance sombre souhaitée
      document.documentElement.setAttribute('color-scheme', 'dark');
    } else {
      document.documentElement.classList.add('cds--white'); // ou 'cds--g10'
      document.documentElement.setAttribute('color-scheme', 'light');
    }
  }

  _selectTheme(theme) {
    this._applyTheme(theme);
    this.isPanelOpen = false;
  }

  _togglePanel() {
    this.isPanelOpen = !this.isPanelOpen;
  }

  _handleThemeChange(e) {
    this._applyTheme(e.target.value);
  }

  render() {
    return this.design === 'ibm' ? this._renderDesignIBM() : this._renderDesignDefault();
  }

  _renderDesignIBM() {
    return html`
      <cds-header-global-action
        button-label-active="Fermer Theme-Alternateur"
        button-label-inactive="Ouvrir Theme-Alternateur"
        tooltip-text="${this.isPanelOpen ? '' : 'Changer de thème'}"
        panel-id="switcher-panel-theme"
        tooltip-alignment="end"
        tooltip-position="bottom"
        ?active="${this.isPanelOpen}"
        @click="${this._togglePanel}">
        <svg focusable="false" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" fill="currentColor" slot="icon" width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2zm0 26a12 12 0 1 1 0-24v24z"/>
        </svg>
      </cds-header-global-action>

      <cds-header-panel id="switcher-panel-theme" ?expanded="${this.isPanelOpen}">
        <cds-switcher aria-label="Choix du thème">
          <cds-switcher-item 
            ?selected="${this.currentTheme === 'light'}"
            @click="${() => this._selectTheme('light')}">
            Clair ${this.currentTheme === 'light' ? '✓' : ''}
          </cds-switcher-item>
          <cds-switcher-item 
            ?selected="${this.currentTheme === 'dark'}"
            @click="${() => this._selectTheme('dark')}">
            Sombre ${this.currentTheme === 'dark' ? '✓' : ''}
          </cds-switcher-item>
          <cds-switcher-item 
            ?selected="${this.currentTheme === 'auto'}"
            @click="${() => this._selectTheme('auto')}">
            Système ${this.currentTheme === 'auto' ? '✓' : ''}
          </cds-switcher-item>
        </cds-switcher>
      </cds-header-panel>
    `;
  }

  _renderDesignDefault() {
    return html`
      ${['light', 'auto', 'dark'].map(theme => html`
        <input type="radio" name="theme" id="${theme}" value="${theme}" 
               .checked="${this.currentTheme === theme}"
               @change="${this._handleThemeChange}">
        <label for="${theme}" class="${this.currentTheme === theme ? 'selected' : ''}">
          ${theme === 'light' ? '🌞' : theme === 'auto' ? '🖥️' : '🌛'}
        </label>
      `)}
    `;
  }
}

if (!customElements.get('codex-theme')) {
  customElements.define("codex-theme", CodexTheme);
}
window.CodexTheme = CodexTheme;