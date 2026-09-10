/**
 * Utilitaires de dates pour Pharma-Codex.
 * Gestion robuste des formats FR/ISO, parsing tolérant et calculs de renouvellement.
 */

/**
 * Normalise l'entrée en objet Date valide.
 * Supporte les instances Date, les timestamps et les chaînes FR/ISO/Saisie rapide.
 * @param {Date|string|number} input
 * @returns {Date}
 */
export function normalizeDate(input) {
  if (!input) return new Date();
  if (input instanceof Date && !isNaN(input)) return input;

  if (typeof input === 'string') {
    const parsed = parseLoose(input);
    if (parsed) return parsed;
  }

  const d = new Date(input);
  if (isNaN(d)) {
    console.error('[date-utils] Date invalide fournie :', input);
    throw new Error(`Date invalide : ${input}`);
  }
  return d;
}

/**
 * Parse une chaîne de date lâche (DD/MM/YYYY, YYYY-MM-DD, DDMMYYYY) en objet Date local.
 * @param {string} str - Chaîne de date
 * @returns {Date|null}
 */
export function parseLoose(str) {
  if (!str || typeof str !== 'string') return null;
  const clean = str.trim();

  // Format DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('/').map(Number);
    return new Date(y, m - 1, d);
  }

  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // Format Saisie Rapide : DDMMYYYY (8 chiffres)
  if (/^\d{8}$/.test(clean)) {
    const d = parseInt(clean.slice(0, 2), 10);
    const m = parseInt(clean.slice(2, 4), 10);
    const y = parseInt(clean.slice(4, 8), 10);
    return new Date(y, m - 1, d);
  }

  return null;
}

/**
 * Formate une date en ISO YYYY-MM-DD en heure locale (sans biais UTC).
 * @param {Date|string} date
 * @returns {string}
 */
export function formatISO(date = new Date()) {
  try {
    const d = normalizeDate(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return '';
  }
}

/**
 * Formate une date au format français DD/MM/YYYY.
 * @param {Date|string} date
 * @returns {string}
 */
export function formatFR(date = new Date()) {
  try {
    const d = normalizeDate(date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return '';
  }
}

/**
 * Ajoute ou retire des jours à une date.
 * @param {Date|string} date - Date de départ
 * @param {number} [days=-22] - Nombre de jours à ajouter/retirer (ex: -22 pour la règle de renouvellement)
 * @returns {Date}
 */
export function addDays(date = new Date(), days = -22) {
  const d = normalizeDate(date);
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calcule la différence en jours entre deux dates (valeur absolue).
 * @param {Date|string} dateA
 * @param {Date|string} dateB
 * @returns {number}
 */
export function diffDays(dateA, dateB) {
  const a = normalizeDate(dateA);
  const b = normalizeDate(dateB);
  const diffTime = Math.abs(b - a);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Initialise tous les inputs date porteurs de data-init="aujourdhui".
 * Supporte le Shadow DOM ou un nœud spécifique.
 * @param {HTMLElement|Document} [root=document]
 */
export function initTodayInputs(root = document) {
  try {
    const today = formatISO();
    const inputs = root.querySelectorAll('input[type="date"][data-init="aujourdhui"]');
    inputs.forEach(input => {
      input.value = today;
    });
  } catch (error) {
    console.error('[date-utils] Échec de initTodayInputs :', error);
  }
}

/**
 * Assistant de classe pour injection autonome dans un composant Lit / Web Component.
 */
export default class DateAssistant {
  constructor(host) {
    this.host = host;
    this.#init();
  }

  #init() {
    const root = this.host.shadowRoot || this.host;
    requestAnimationFrame(() => initTodayInputs(root));
  }
}