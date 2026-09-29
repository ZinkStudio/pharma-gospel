/**
 * Utilitaires de dates pour Pharma-Codex / Pharma-Gospel.
 * Gestion robuste des formats FR/ISO, parsing tolérant et calculs de renouvellement.
 */

/**
 * Normalise l'entrée en objet Date valide.
 * Supporte Date, timestamps et chaînes FR/ISO/saisie rapide.
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
 * Parse une chaîne de date lâche (DD/MM/YYYY, YYYY-MM-DD, DDMMYYYY) en Date locale.
 */
export function parseLoose(str) {
  if (!str || typeof str !== 'string') return null;
  const clean = str.trim();

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('/').map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{8}$/.test(clean)) {
    const d = parseInt(clean.slice(0, 2), 10);
    const m = parseInt(clean.slice(2, 4), 10);
    const y = parseInt(clean.slice(4, 8), 10);
    return new Date(y, m - 1, d);
  }
  return null;
}

/** Formate en ISO YYYY-MM-DD (heure locale, pas de biais UTC). */
export function formatISO(date = new Date()) {
  try {
    const d = normalizeDate(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch { return ''; }
}

/** Formate en DD/MM/YYYY. */
export function formatFR(date = new Date()) {
  try {
    const d = normalizeDate(date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  } catch { return ''; }
}

/**
 * Ajoute ou retire des jours à une date.
 * @param {Date|string} date
 * @param {number} [days=-22] — règle de renouvellement par défaut
 */
export function addDays(date = new Date(), days = -22) {
  const d = normalizeDate(date);
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/** Différence en jours (valeur absolue). */
export function diffDays(dateA, dateB) {
  const a = normalizeDate(dateA);
  const b = normalizeDate(dateB);
  return Math.ceil(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Remplit les champs data-init="aujourdhui" dans une racine donnée.
 * Supporte <input type="date"> natif et <cds-text-input data-init="aujourdhui">.
 * @param {HTMLElement} root — obligatoire, pour éviter d'écrire dans
 *   plusieurs vues simultanément montées par le routeur.
 */
export function initTodayInputs(root) {
  if (!root) {
    console.warn('[date-utils] initTodayInputs : racine requise.');
    return;
  }
  const today = formatISO();

  root.querySelectorAll('input[type="date"][data-init="aujourdhui"]').forEach(input => {
    input.value = today;
  });

  root.querySelectorAll('cds-text-input[data-init="aujourdhui"]').forEach(el => {
    el.value = today;
    el.dispatchEvent(new CustomEvent('cds-text-input-changed', {
      detail: { value: today }, bubbles: true
    }));
  });
}

/**
 * Assistant de classe pour injection autonome dans un composant.
 * Compatible avec l'AssistantEngine (`assistants="date"`).
 */
export default class DateAssistant {
  constructor(host) {
    this.host = host;
    this.#init();
  }

  #init() {
    // Les champs data-init sont en light DOM (slot) — le shadow root du
    // host ne les voit pas. On cible le host lui-même.
    requestAnimationFrame(() => initTodayInputs(this.host));
  }
}