import { html, css, LitElement, BaseLit } from '/lit';

export class CodexRouteur extends BaseLit {
  static properties = {
    defaultRoute: { type: String, attribute: 'default-route' }
  };

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }
  `;

  constructor() {
    super();
    this.defaultRoute = '';
    // On lie la méthode une seule fois pour pouvoir l'ajouter et la retirer proprement
    this._boundHashChange = this._onHashChange.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('hashchange', this._boundHashChange);

    // Intercepte les clics sur les liens de navigation internes (data-route ou href="#...")
    this.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (link) {
        e.preventDefault();
        const targetHash = link.getAttribute('href');
        if (targetHash && targetHash !== window.location.hash) {
          window.location.hash = targetHash;
        }
      }
    });

    // Utilisation de requestAnimationFrame pour s'assurer que le DOM est prêt 
    // et que <codex-vue> est bien enregistré/rendu avant de charger la route.
    requestAnimationFrame(() => {
      if (!window.location.hash && this.defaultRoute) {
        window.location.hash = this.defaultRoute;
      } else {
        this._onHashChange();
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('hashchange', this._boundHashChange);
  }

  _onHashChange() {
    const hash = window.location.hash.replace(/^#/, '') || this.defaultRoute;
    const vueEl = this.querySelector('codex-vue');
    if (vueEl && typeof vueEl.loadRoute === 'function') {
      vueEl.loadRoute(hash);
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}

if (!customElements.get('codex-routeur')) {
  customElements.define('codex-routeur', CodexRouteur);
}