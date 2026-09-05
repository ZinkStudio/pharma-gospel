import { html, css, LitElement, BaseLit } from '/lit';

export class CodexVue extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
    }
    .loading-container {
      padding: 24px;
      display: flex;
      justify-content: center;
    }
  `;

  constructor() {
    super();
    this._cache = new Map();
  }

  async loadRoute(routePath) {
    if (!routePath) return;

    try {
      // 1. Afficher un squelette de chargement Carbon pendant la récupération
      this.innerHTML = `
        <div class="loading-container">
          <cds-skeleton-placeholder></cds-skeleton-placeholder>
        </div>
      `;

      let htmlContent;

      // 2. Vérifier si le contenu est déjà présent dans le cache
      if (this._cache.has(routePath)) {
        htmlContent = this._cache.get(routePath);
      } else {
        const response = await fetch(routePath);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        htmlContent = await response.text();
        this._cache.set(routePath, htmlContent);
      }
      
      // 3. Injection du contenu dans le Light DOM
      this.innerHTML = htmlContent;

      // 4. Mise à jour de l'accessibilité de la navigation
      this._updateActiveNav(routePath);

      // 5. Notification de fin de chargement de la route
      this.dispatchEvent(new CustomEvent('route-loaded', { 
        detail: { route: routePath }, 
        bubbles: true, 
        composed: true 
      }));

    } catch (error) {
      console.error(`[CodexVue] Erreur lors du chargement de la route : ${routePath}`, error);
      this.innerHTML = `<p style="color: var(--cds-support-error, #da1e28); padding: 20px;">Erreur : impossible de charger la vue (${routePath}).</p>`;
    }
  }

  _updateActiveNav(route) {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
      const href = link.getAttribute('href').replace(/^#/, '');
      if (href === route) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  render() {
    return html`<slot></slot>`;
  }
}

if (!customElements.get('codex-vue')) {
  customElements.define('codex-vue', CodexVue);
}