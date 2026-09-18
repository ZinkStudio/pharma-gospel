/**
 * Assistant ClipboardCopy
 * Permet de copier du texte ou la valeur d'un champ vers le presse-papier.
 * - Mode déclaratif : clic sur [data-copy="#target"]
 * - Mode programmatique : host.copyToClipboard(text, feedbackMsg)
 */
export default class ClipboardCopyAssistant {
  constructor(host) {
    this.host = host;
    this.#exposeProgrammaticApi();
    this.#initDeclarative();
  }

  #exposeProgrammaticApi() {
    this.host.copyToClipboard = async (text, successMsg) => {
      try {
        await navigator.clipboard.writeText(text);
        if (this.host.notify) {
          this.host.notify.success(successMsg || 'Copié dans le presse-papier !');
        }
        return true;
      } catch (err) {
        console.error('[ClipboardCopyAssistant] Échec de la copie :', err);
        if (this.host.notify) {
          this.host.notify.error('Échec de la copie automatique.');
        }
        return false;
      }
    };
  }

  #initDeclarative() {
    const root = this.host.shadowRoot || this.host;

    root.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-copy]');
      if (!btn) return;

      e.preventDefault();
      const targetSelector = btn.dataset.copy;
      const target = root.querySelector(targetSelector) 
        || this.host.querySelector(targetSelector) 
        || document.querySelector(targetSelector);

      if (!target) {
        console.warn(`[ClipboardCopyAssistant] Cible non trouvée : ${targetSelector}`);
        return;
      }

      // Gestion native + Carbon Web Components
      const textToCopy = target.value || target.getAttribute?.('value') || target.innerText || '';

      if (!textToCopy) {
        if (this.host.notify) this.host.notify.warning('Rien à copier.');
        return;
      }

      const success = await this.host.copyToClipboard(
        textToCopy, 
        btn.dataset.copySuccess || 'Copié dans le presse-papier !'
      );

      if (success) {
        const originalText = btn.textContent;
        const feedback = btn.dataset.copyFeedback || '✅';
        
        btn.textContent = feedback;
        setTimeout(() => { 
          btn.textContent = originalText; 
        }, 1500);
      }
    });
  }
}