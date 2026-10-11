/**
 * Assistant DateShortcuts
 *
 * Raccourcis clavier sur les champs de date :
 *   *   → date du jour
 *   +   → +1 jour (depuis la valeur courante, ou aujourd'hui si vide)
 *   -   → -1 jour (idem)
 *
 * Gère deux familles de champs :
 *   1. Champs "natif ISO" — <input type="date"> et <cds-text-input type="date">
 *      Le widget attend une valeur AAAA-MM-JJ.
 *
 *   2. Champs "masque FR" — <input data-mask="date"> et
 *      <cds-text-input data-mask="date">
 *      Le widget attend une valeur JJ/MM/AAAA (cohérent avec formatDate
 *      du masks-assistant, qui est idempotent).
 *
 * Les autres champs (texte, nombre, etc.) sont ignorés : l'assistant ne
 * touche qu'aux champs identifiables comme porteurs d'une date.
 *
 * Note : `<cds-text-input type="date" data-mask="date">` est un cas
 * interdit — le widget date natif refuse la réécriture par le masque.
 * L'assistant privilégie `type="date"` (ISO) sur ce conflit.
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Date → "AAAA-MM-JJ" */
function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Date → "JJ/MM/AAAA" */
function toFRDate(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

/** Parse "AAAA-MM-JJ" → Date | null */
function fromISODate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Parse "JJ/MM/AAAA" → Date | null */
function fromFRDate(fr) {
  if (!fr) return null;
  const [d, m, y] = fr.split('/').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export default class DateShortcutsAssistant {
  constructor(host) {
    this.host = host;
    this.#init();
  }

  #init() {
    // Écoute sur le host : depuis l'<input> interne d'un composant Carbon,
    // le keydown serait sinon coincé dans le shadow root.
    this.host.addEventListener('keydown', (e) => this.#onKeydown(e));
  }

  #onKeydown(e) {
    if (!['*', '+', '-'].includes(e.key)) return;

    const target = this.#findDateInput(e);
    if (!target) return;

    const { el, format } = target;
    const inner = this.#getInnerInput(el);
    if (!inner) return;

    e.preventDefault();

    // Lire la valeur courante dans le bon format
    const current = format === 'iso'
      ? fromISODate(inner.value)
      : fromFRDate(inner.value);
    const base = current ?? new Date();

    // Calculer la cible
    let targetDate;
    if (e.key === '*') {
      targetDate = new Date();
    } else if (e.key === '+') {
      targetDate = new Date(base.getTime() + ONE_DAY_MS);
    } else {
      targetDate = new Date(base.getTime() - ONE_DAY_MS);
    }

    // Formater selon la famille
    const formatted = format === 'iso'
      ? toISODate(targetDate)
      : toFRDate(targetDate);

    // Écrire sur le porteur ET l'input interne, puis propager les events
    // pour synchroniser codex-form / codex-field / masks-assistant / Carbon.
    inner.value = formatted;
    if (el !== inner && 'value' in el) el.value = formatted;

    inner.dispatchEvent(new Event('input',  { bubbles: true, composed: true }));
    inner.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /**
   * Identifie le champ date dans la chaîne de composition de l'événement.
   * Retourne { el, format } où :
   *   - el     = l'élément porteur à mettre à jour (input natif ou host Carbon)
   *   - format = 'iso' (AAAA-MM-JJ) ou 'fr' (JJ/MM/AAAA)
   *
   * Priorité : type="date" > data-mask="date" — le widget natif n'accepte
   * pas les réécritures d'un masque, on ne mélange jamais les deux.
   */
  #findDateInput(e) {
    const path = e.composedPath?.() ?? [];

    for (const node of path) {
      if (!(node instanceof Element)) continue;

      // Cas 1 — input date natif
      if (node.matches?.('input[type="date"]')) {
        return { el: node, format: 'iso' };
      }

      // Cas 2 — cds-text-input avec type="date"
      if (node.tagName === 'CDS-TEXT-INPUT' && node.getAttribute('type') === 'date') {
        return { el: node, format: 'iso' };
      }

      // Cas 3 — champ masqué data-mask="date" (input natif OU Carbon)
      const mask = node.getAttribute?.('data-mask');
      if (mask && mask.toLowerCase() === 'date') {
        return { el: node, format: 'fr' };
      }
    }

    return null;
  }

  /** Récupère l'<input> interne d'un composant Carbon, ou l'élément lui-même. */
  #getInnerInput(el) {
    if (el instanceof HTMLInputElement) return el;
    return el.shadowRoot?.querySelector('input') ?? null;
  }
}