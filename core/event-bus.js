/**
 * EventBus
 * Bus d'événements centralisé Pub/Sub typé pour la communication inter-composants.
 */
class EventBus extends EventTarget {
  /**
   * Publie un événement sur le bus global
   * @param {string} eventName - Intitulé de l'événement (ex: 'nir:calculated')
   * @param {any} detail - Payload associé
   */
  publish(eventName, detail = {}) {
    this.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  /**
   * S'abonne à un événement
   * @param {string} eventName 
   * @param {Function} callback - Traitement exécuté lors de l'émission
   * @returns {Function} Fonction de désabonnement
   */
  subscribe(eventName, callback) {
    const handler = (e) => callback(e.detail);
    this.addEventListener(eventName, handler);
    return () => this.removeEventListener(eventName, handler);
  }

  /**
   * S'abonne à un événement pour une unique exécution
   * @param {string} eventName 
   * @param {Function} callback 
   */
  once(eventName, callback) {
    const unsubscribe = this.subscribe(eventName, (detail) => {
      unsubscribe();
      callback(detail);
    });
  }
}

export const eventBus = new EventBus();