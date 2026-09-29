/**
 * Service d'impression native.
 * Pas de PDF : ouvre la fenêtre d'impression du navigateur avec
 * le contenu HTML fourni, isolé dans une popup.
 */

export function printElement(element, printOptions = {}) {
  if (!element) {
    throw new Error('[print-service] Aucun élément fourni pour l\'impression');
  }

  const { title = document.title, styles = '' } = printOptions;
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    throw new Error('[print-service] Fenêtre d\'impression bloquée par le navigateur');
  }

  const doc = printWindow.document;
  const html = doc.createElement('html');
  const head = doc.createElement('head');
  const body = doc.createElement('body');

  const titleEl = doc.createElement('title');
  titleEl.textContent = title;
  head.appendChild(titleEl);

  const styleEl = doc.createElement('style');
  styleEl.textContent = `
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none !important; }
    }
    ${styles}
  `;
  head.appendChild(styleEl);

  body.innerHTML = element.innerHTML;
  html.appendChild(head);
  html.appendChild(body);
  doc.documentElement.replaceWith(html);

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
    setTimeout(() => printWindow.close(), 500);
  }, 250);
}