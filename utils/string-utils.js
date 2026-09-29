/** Retire les accents et met en minuscules. */
export function removeAccents(str) {
  if (typeof str !== 'string') return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Title Case : première lettre de chaque mot en majuscule. */
export function toTitleCase(str) {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(w =>
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
}