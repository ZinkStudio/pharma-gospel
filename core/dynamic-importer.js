/**
 * DynamicImporter
 * Gestionnaire autonome d'imports dynamiques ES modules locaux avec mise en cache.
 */
class DynamicImporter {
  #cache = new Map();
  #basePath = '../modules/';

  /**
   * Configure le chemin de base des modules (par défaut: '../modules/')
   * @param {string} path 
   */
  setBasePath(path) {
    this.#basePath = path.endsWith('/') ? path : `${path}/`;
  }

  /**
   * Charge dynamiquement un module ES local
   * @param {string} moduleName - Nom du fichier ou sous-chemin (ex: 'nir-validator' ou 'crypto/luhn')
   * @returns {Promise<any>}
   */
  async load(moduleName) {
    const cleanName = moduleName.endsWith('.js') ? moduleName : `${moduleName}.js`;
    
    if (this.#cache.has(cleanName)) {
      return this.#cache.get(cleanName);
    }

    const loadPromise = (async () => {
      try {
        const modulePath = new URL(`${this.#basePath}${cleanName}`, import.meta.url).href;
        const module = await import(modulePath);
        return module;
      } catch (error) {
        this.#cache.delete(cleanName);
        console.error(`[Kernel DynamicImporter] Échec du chargement du module: "${cleanName}"`, error);
        throw error;
      }
    })();

    this.#cache.set(cleanName, loadPromise);
    return loadPromise;
  }

  /**
   * Pre-charge une liste de modules en parallèle
   * @param {string[]} moduleNames 
   * @returns {Promise<any[]>}
   */
  async loadAll(moduleNames = []) {
    return Promise.all(moduleNames.map(name => this.load(name)));
  }
}

export const importer = new DynamicImporter();