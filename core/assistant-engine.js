/**
 * AssistantEngine
 * Moteur d'attachement dynamique de décorateurs/assistants fonctionnels sur les Web Components.
 */
export class AssistantEngine {
  #registry = new Map();
  #basePath = '../assistants/';

  /**
   * Enregistre manuellement une classe d'assistant
   * @param {string} name 
   * @param {Function} assistantClass 
   */
  register(name, assistantClass) {
    this.#registry.set(name, assistantClass);
  }

  /**
   * Attache un ou plusieurs assistants à un composant cible
   * @param {string | string[]} assistants - Noms séparés par des virgules ou tableau
   * @param {HTMLElement} hostElement - Composant hôte cible
   * @returns {Promise<void>}
   */
  async attach(assistants, hostElement) {
    if (!assistants || !hostElement) return;

    const list = Array.isArray(assistants)
      ? assistants
      : assistants.split(',').map(s => s.trim()).filter(Boolean);

    for (const name of list) {
      try {
        if (!this.#registry.has(name)) {
          const path = new URL(`${this.#basePath}${name}.js`, import.meta.url).href;
          const module = await import(path);
          const AssistantClass = module.default || module[name];
          
          if (!AssistantClass) {
            throw new Error(`Aucune classe exportée trouvée dans le module assistant "${name}"`);
          }
          this.register(name, AssistantClass);
        }

        const AssistantClass = this.#registry.get(name);
        // Instanciation de l'assistant couplé à l'élément hôte
        new AssistantClass(hostElement);
      } catch (error) {
        console.error(`[Kernel AssistantEngine] Impossible d'attacher l'assistant "${name}"`, error);
      }
    }
  }
}

export const assistantEngine = new AssistantEngine();