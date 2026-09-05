import { html, css, LitElement, BaseLit } from '/lit';
import appStyles from './codex-application.css' with { type: 'css' };

export class CodexApplication extends BaseLit {
  static styles = [appStyles];

  render() {
    return html`
      <div id="app">
        <header>
          <cds-header aria-label="Pharma Codex">
            <cds-header-menu-button button-label-active="Close menu"
              button-label-inactive="Open menu"></cds-header-menu-button>
            <cds-header-name href="/" prefix="Pharma">[Codex]</cds-header-name>
            <cds-header-nav menu-bar-label="Pharma [Codex]">
              <cds-header-nav-item href="#views/officine/officine.html">Officine</cds-header-nav-item>
              <cds-header-nav-item href="#views/infirmerie/infirmerie.html">Infirmerie</cds-header-nav-item>
              <cds-header-nav-item href="#views/atelier/atelier.html">Atelier</cds-header-nav-item>
            </cds-header-nav>
            <codex-recherche design="ibm"></codex-recherche>
            <div class="cds--header__global">
              <codex-missives design="ibm"></codex-missives>
              <codex-theme design="ibm"></codex-theme>
              <cds-header-global-action aria-label="App Switcher" tooltip-text="App Switcher" tooltip-alignment="right">
                <svg focusable="false" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor" slot="icon" width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
                  <path d="M14 4H18V8H14z"></path>
                  <path d="M4 4H8V8H4z"></path>
                  <path d="M24 4H28V8H24z"></path>
                  <path d="M14 14H18V18H14z"></path>
                  <path d="M4 14H8V18H4z"></path>
                  <path d="M24 14H28V18H24z"></path>
                  <path d="M14 24H18V28H14z"></path>
                  <path d="M4 24H8V28H4z"></path>
                  <path d="M24 24H28V28H24z"></path>
                </svg>
              </cds-header-global-action>
            </div>
            <cds-side-nav is-not-persistent="" aria-label="Side navigation" collapse-mode="responsive">
              <cds-side-nav-items>
                <cds-side-nav-link href="#views/officine/officine.html">Officine</cds-side-nav-link>
                <cds-side-nav-link href="#views/infirmerie/infirmerie.html">Infirmerie</cds-side-nav-link>
                <cds-side-nav-link href="#views/atelier/atelier.html">Atelier</cds-side-nav-link>
              </cds-side-nav-items>
            </cds-side-nav>
          </cds-header>
        </header>
        <main>
        <slot></slot>
        </main>
      </div>
    `;
  }
}

if (!customElements.get('codex-application')) {
  customElements.define('codex-application', CodexApplication);
}
window.CodexApplication = CodexApplication;