/**
 * Assistant Masks
 *
 * Formatage dynamique de champs natifs ou Carbon (cds-text-input, cds-textarea…)
 * via l'attribut data-mask="<nom>".
 *
 * Architecture découplée :
 *   - registerMask() enregistre un formatter depuis n'importe où.
 *   - Un formatter reçoit la valeur BRUTE et retourne la valeur FORMATÉE.
 *     Il ignore tout du DOM, du curseur, du type de champ.
 *   - L'assistant gère le cycle de vie : écoute, curseur, propagation Carbon.
 *
 * Ajouter un masque : une ligne registerMask(...) ici ou dans un module à part.
 */

// =============================================================
// Registre
// =============================================================

const MASKS = new Map();

function normalizeKey(str) {
  return str ? str.toLowerCase().replace(/[-_\s]+/g, '') : '';
}

/**
 * Enregistre un masque.
 * @param {string} name
 * @param {(raw: string) => string} formatter - valeur brute → valeur formatée
 * @param {string[]} [aliases]
 */
export function registerMask(name, formatter, aliases = []) {
  [name, ...aliases].map(normalizeKey).forEach(k => MASKS.set(k, formatter));
}

// =============================================================
// Formatters
//
// Contrat : reçoit la valeur brute (peut contenir n'importe quoi),
// retourne la valeur formatée. Ne touche JAMAIS au DOM.
// =============================================================

/** Code organisme CPAM : 9 chiffres → "01 131 0421" */
export const formatCodeOrganisme = (raw) => {
  const v = (raw || '').replace(/\D/g, '').substring(0, 9);
  const parts = [];
  if (v.length > 0) parts.push(v.substring(0, 2));
  if (v.length > 2) parts.push(v.substring(2, 5));
  if (v.length > 5) parts.push(v.substring(5, 9));
  return parts.join(' ');
};

/** NIR : 15 chiffres → "1 85 05 75 123 456 78" (progressif) */
export const formatNIR = (raw) => {
  const v = (raw || '').replace(/\D/g, '').substring(0, 15);
  const groups = [1, 2, 2, 2, 3, 3, 2];
  const parts = [];
  let i = 0;
  for (const len of groups) {
    if (i >= v.length) break;
    parts.push(v.slice(i, i + len));
    i += len;
  }
  return parts.join(' ');
};

/** Date : 8 chiffres → "JJ/MM/AAAA" (progressif) */
export const formatDate = (raw) => {
  const v = (raw || '').replace(/\D/g, '').substring(0, 8);
  const parts = [];
  if (v.length > 0) parts.push(v.substring(0, 2));
  if (v.length > 2) parts.push(v.substring(2, 4));
  if (v.length > 4) parts.push(v.substring(4, 8));
  return parts.join('/');
};

/** DLU (Date Limite d'Utilisation) : 6 chiffres → "MM/AAAA" avec mois clampé 1-12 */
export const formatDLU = (raw) => {
  const v = (raw || '').replace(/\D/g, '').substring(0, 6);
  if (!v.length) return '';

  let mois = v.substring(0, 2);
  if (mois.length === 2) {
    const n = Math.min(Math.max(parseInt(mois, 10) || 1, 1), 12);
    mois = String(n).padStart(2, '0');
  }
  if (v.length <= 2) return mois;

  const annee = v.substring(2, 6);
  return `${mois}/${annee}`;
};

/** Téléphone FR : 10 chiffres → "01 23 45 67 89" (progressif) */
export const formatTelephone = (raw) => {
  const v = (raw || '').replace(/\D/g, '').substring(0, 10);
  return v.replace(/(\d{2})(?=\d)/g, '$1 ');
};

// --- Enregistrements ---

registerMask('codeOrganisme', formatCodeOrganisme, ['code-organisme', 'code_organisme']);
registerMask('nir', formatNIR, ['secu', 'numero-secu', 'numero_secu']);
registerMask('date', formatDate, ['date-naissance', 'dateNaissance']);
registerMask('dlu', formatDLU, ['date-limite', 'peremption']);
registerMask('telephone', formatTelephone, ['tel', 'phone', 'mobile']);

// =============================================================
// Assistant
// =============================================================

export default class MasksAssistant {
  constructor(host) {
    this.host = host;
    this.#init();
  }

  #init() {
    // Le light DOM remonte ses événements jusqu'au host (Carbon compose
    // son `input` — confirmé par test). Le shadow root, lui, est aveugle.
    this.host.addEventListener('input', (e) => this.#onInput(e));

    // Formate les champs déjà pré-remplis au montage.
    requestAnimationFrame(() => {
      this.host.querySelectorAll('[data-mask]').forEach(el => this.#applyMask(el));
    });
  }

  #onInput(e) {
    const porteur = (e.composedPath?.() || []).find(
      n => n instanceof Element && n.hasAttribute?.('data-mask')
    );
    if (porteur) this.#applyMask(porteur);
  }

  #getInnerInput(el) {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el;
    return el.shadowRoot?.querySelector('input, textarea') ?? null;
  }

  #applyMask(el) {
    const maskType = el.getAttribute('data-mask');
    if (!maskType) return;

    const formatter = MASKS.get(normalizeKey(maskType));
    if (!formatter) {
      console.warn(`[MasksAssistant] Aucun masque enregistré pour "${maskType}"`);
      return;
    }

    const inner = this.#getInnerInput(el);
    if (!inner) return;

    const oldValue = inner.value;
    const formattedValue = formatter(oldValue);

    // Garde anti-boucle : on réécrit ci-dessous, ce qui redéclenche un
    // `input` qu'on recevra à nouveau. On ne réécrit que si ça change.
    if (oldValue === formattedValue) return;

    // Curseur : on compte les chiffres avant la position actuelle, puis on
    // retrouve la position équivalente dans la chaîne formatée.
    const oldCursor = inner.selectionStart ?? oldValue.length;
    const chiffresAvant = oldValue.slice(0, oldCursor).replace(/\D/g, '').length;

    inner.value = formattedValue;

    let newCursor = 0;
    let compteur = 0;
    while (newCursor < formattedValue.length && compteur < chiffresAvant) {
      if (/\d/.test(formattedValue[newCursor])) compteur++;
      newCursor++;
    }

    try {
      inner.setSelectionRange(newCursor, newCursor);
    } catch { /* certains types d'input refusent setSelectionRange */ }

    // Réémet un input pour que Carbon synchronise sa propriété `.value`
    // publique — sinon el.value du composant reste périmée.
    inner.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }
}