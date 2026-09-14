import { importer } from './dynamic-importer.js';
import { assistantEngine } from './assistant-engine.js';
import { missiveBus } from '../services/missive-bus.js';

/**
 * BaseComponent
 * Classe de base abstraite pour l'ensemble des Custom Elements applicatifs.
 */
export class BaseComponent extends HTMLElement {
  #isReady = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  /**
   * Helper d'émission de missives et notifications universel
   */
  notify = {
    success: (text) => missiveBus.success(text),
    warning: (text) => missiveBus.warning(text),
    error: (text) => missiveBus.error(text),
    info: (text) => missiveBus.info(text)
  };

  /**
   * Hook natif du cycle de vie des Web Components
   */
  async connectedCallback() {
    if (this.#isReady) return;

    try {
      // 1. Résolution & chargement asynchrone des imports déclarés sur l'attribut HTML
      if (this.hasAttribute('imports')) {
        const modules = this.getAttribute('imports')
          .split(',')
          .map(m => m.trim())
          .filter(Boolean);
        
        await importer.loadAll(modules);
      }

      // 2. Rendu de la structure du composant
      this.render();

      // 3. Attachement automatique des assistants déclarés
      if (this.hasAttribute('assistants')) {
        await assistantEngine.attach(this.getAttribute('assistants'), this);
      }

      this.#isReady = true;

      // 4. Invocation du hook d'initialisation post-chargement
      this.onReady();
    } catch (error) {
      console.error(`[Kernel BaseComponent] Échec d'initialisation du composant <${this.tagName.toLowerCase()}>`, error);
    }
  }

  /**
   * Méthode de rendu du Shadow DOM.
   * Doit être surchargée par le composant enfant.
   */
  render() {
    // Implémentation par défaut vide
  }

  /**
   * Hook exécuté lorsque les imports, le rendu et les assistants sont prêts.
   * Peut être surchargé par le composant enfant.
   */
  onReady() {
    // Hook optionnel
  }

  /**
   * Utilitaire de sélection d'élément dans le Shadow DOM local
   * @param {string} query 
   * @returns {Element | null}
   */
  $(query) {
    return this.shadowRoot ? this.shadowRoot.querySelector(query) : null;
  }

  /**
   * Utilitaire de sélection multiple d'éléments dans le Shadow DOM local
   * @param {string} query 
   * @returns {NodeListOf<Element>}
   */
  $$(query) {
    return this.shadowRoot ? this.shadowRoot.querySelectorAll(query) : [];
  }
}