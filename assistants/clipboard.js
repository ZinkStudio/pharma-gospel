/**
 * Assistant Clipboard
 * Attache la fonctionnalité de copie sur tous les éléments porteurs de `data-copy`
 * au sein du composant hôte (Supporte Shadow DOM et DOM standard).
 */
export default class ClipboardAssistant {
  constructor(host) {
    this.host = host;
    this.#init();
  }

  #init() {
    const root = this.host.shadowRoot || this.host;
    
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-copy]');
      if (!btn) return;

      e.preventDefault();
      const targetSelector = btn.dataset.copy;
      
      // Recherche prioritaire dans le Shadow DOM local, fallback sur le document global
      const target = root.querySelector(targetSelector) || document.querySelector(targetSelector);

      if (!target) {
        console.warn(`[ClipboardAssistant] Cible non trouvée : ${targetSelector}`);
        return;
      }

      // Fidélité ancien assistant : fallback sur innerText si value est vide ou absente[cite: 11]
      const textToCopy = target.value || target.innerText || '';

      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          const originalText = btn.textContent;
          // Lit data-copy-feedback avec fallback '✅' conforme à l'ancien assistant[cite: 11]
          const feedback = btn.dataset.copyFeedback || '✅';
          
          btn.textContent = feedback;
          setTimeout(() => { 
            btn.textContent = originalText; 
          }, 1500);
        })
        .catch(err => {
          console.error('[ClipboardAssistant] Erreur de copie :', err);
        });
    });
  }
}