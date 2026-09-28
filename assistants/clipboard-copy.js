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
    // Copie texte brut (API existante conservée)
    this.host.copyToClipboard = async (text, successMsg) => {
      try {
        await navigator.clipboard.writeText(text);
        this.host.notify?.success(successMsg || 'Copié dans le presse-papier !');
        return true;
      } catch (err) {
        console.error('[ClipboardCopyAssistant] Échec copie texte :', err);
        this.host.notify?.error('Échec de la copie automatique.');
        return false;
      }
    };

    // Nouvelle API : copie enrichie (HTML + fallback texte)
    this.host.copyRichToClipboard = async (html, text, successMsg) => {
      if (!text || !text.trim()) text = html.replace(/<[^>]+>/g, '');

      // Tentative ClipboardItem si supporté
      if (window.ClipboardItem && navigator.clipboard.write) {
        try {
          const item = new ClipboardItem({
            'text/html':  new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' }),
          });
          await navigator.clipboard.write([item]);
          this.host.notify?.success(successMsg || 'Copié dans le presse-papier !');
          return true;
        } catch (err) {
          console.warn('[ClipboardCopyAssistant] ClipboardItem indisponible, fallback texte.', err);
        }
      }

      // Fallback : texte brut uniquement
      try {
        await navigator.clipboard.writeText(text);
        this.host.notify?.success(successMsg || 'Copié (texte brut)');
        return true;
      } catch (err) {
        console.error('[ClipboardCopyAssistant] Échec copie :', err);
        this.host.notify?.error('Échec de la copie automatique.');
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
      const target =
        root.querySelector(targetSelector) ||
        this.host.querySelector(targetSelector) ||
        document.querySelector(targetSelector);

      if (!target) {
        console.warn(`[ClipboardCopyAssistant] Cible non trouvée : ${targetSelector}`);
        return;
      }

      // ⚠️ textContent (et pas innerText) : fonctionne sur éléments [hidden]
      const textContent =
        target.value ??
        target.getAttribute?.('value') ??
        target.textContent ??
        '';
      const htmlContent = target.innerHTML ?? '';

      if (!String(textContent).trim() && !htmlContent.trim()) {
        this.host.notify?.warning('Rien à copier.');
        return;
      }

      // "auto" | "html" | "text" — peut venir du bouton OU de la cible
      const format = btn.dataset.copyFormat || target.dataset.copyFormat || 'auto';
      const hasHtml = /<[a-z][\s\S]*>/i.test(htmlContent);
      const useRich = format === 'html' || (format === 'auto' && hasHtml);

      const msg = btn.dataset.copySuccess || 'Copié dans le presse-papier !';
      const success = useRich
        ? await this.host.copyRichToClipboard(htmlContent.trim(), String(textContent).trim(), msg)
        : await this.host.copyToClipboard(String(textContent).trim(), msg);

      if (success) {
        const originalText = btn.textContent;
        const feedback = btn.dataset.copyFeedback || '✅';
        btn.textContent = feedback;
        setTimeout(() => { btn.textContent = originalText; }, 1500);
      }
    });
  }
}