/**
 * Assistant Masks
 * Formatage dynamique d'inputs via l'attribut data-oninput.
 * Supporte le Shadow DOM, le registre dynamique de masques et l'initialisation à la volée.
 */

// Normalisation des clés pour éviter les erreurs de casse/tirez/espaces
function normalizeKey(str) {
  return str ? str.toLowerCase().replace(/[-_\s]+/g, '') : '';
}

// Registre des masqueurs
const MASKS = new Map();

/**
 * Enregistre un nouveau masqueur de formatage.
 * @param {string} name - Nom du masque (ex: 'nir')
 * @param {Function} formatterFn - Fonction de formatage (valeur: string) => string
 * @param {string[]} [aliases=[]] - Alias éventuels
 */
export function registerMask(name, formatterFn, aliases = []) {
  const keys = [name, ...aliases].map(normalizeKey);
  keys.forEach(key => MASKS.set(key, formatterFn));
}

// --- Formatters intégrés ---

const formatCodeOrganisme = (val) => {
  const v = val.replace(/\D/g, '').substring(0, 9);
  const parts = [];
  if (v.length > 0) parts.push(v.substring(0, 2));
  if (v.length > 2) parts.push(v.substring(2, 5));
  if (v.length > 5) parts.push(v.substring(5, 9));
  return parts.join(' ');
};

const formatNIR = (val) => {
  const v = val.replace(/\D/g, '').substring(0, 15);
  return v.replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{3})(\d{3})(\d{2})?/, '$1 $2 $3 $4 $5 $6 $7').trim();
};

// Enregistrement des masques par défaut et leurs alias
registerMask('codeOrganisme', formatCodeOrganisme, ['code-organisme', 'code_organisme']);
registerMask('nir', formatNIR, ['secu', 'numero-secu', 'numero_secu']);

// --- Assistant Principal ---

export default class MasksAssistant {
  constructor(host) {
    this.host = host;
    this.#init();
  }

  #init() {
    const root = this.host.shadowRoot || this.host;

    // Listeners pour l'événement input (délégation d'événement)
    root.addEventListener('input', (e) => this.#applyMask(e.target));

    // Formatage immédiat des champs déjà pré-remplis au montage du composant
    requestAnimationFrame(() => {
      const inputs = root.querySelectorAll('input[data-oninput]');
      inputs.forEach(input => this.#applyMask(input));
    });
  }

  #applyMask(input) {
    if (!input || !(input instanceof HTMLInputElement)) return;
    
    const maskType = input.dataset?.oninput;
    if (!maskType) return;

    const formatter = MASKS.get(normalizeKey(maskType));
    if (!formatter) {
      console.warn(`[MasksAssistant] Aucun masque enregistré pour "${maskType}"`);
      return;
    }

    const oldValue = input.value;
    const oldCursor = input.selectionStart;

    // Calcul du nouveau texte formaté
    const formattedValue = formatter(oldValue);

    if (oldValue !== formattedValue) {
      input.value = formattedValue;

      // Calcul intelligent de l'ajustement du curseur
      // Ajuste la position si un espace de séparation a été injecté
      const diff = formattedValue.length - oldValue.length;
      const newCursor = Math.max(0, (oldCursor || 0) + diff);
      
      try {
        input.setSelectionRange(newCursor, newCursor);
      } catch (err) {
        // Fallback sur certains types d'input (ex: type="tel" sur certains navigateurs)
      }
    }
  }
}