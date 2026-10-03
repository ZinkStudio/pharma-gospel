import { lgpiParser } from './parsers/lgpi-parser.js';
import { grippeProfile } from './profiles/grippe-profile.js';

/**
 * SmartFillService — façade d'extraction de données patient depuis un texte OCR
 * ou copié depuis un logiciel de gestion pharmaceutique (LGPI, Winpharma…).
 *
 * Ajouter une intégration :
 *   1. Créer un parser dans ./parsers/ (contrat : id, label, detect, parse)
 *   2. Enregistrer le parser ici (registerParser)
 *   3. Créer un profile dans ./profiles/ qui mappe les champs extraits
 *      vers les noms du formulaire cible
 *   4. Enregistrer le profile ici (registerProfile)
 *
 * Le service est un singleton — les parsers et profils sont partagés par
 * toutes les vues qui l'utilisent.
 */
export class SmartFillService {
  #parsers = new Map();
  #profiles = new Map();

  // --- Enregistrement ---

  registerParser(parser) {
    if (!parser?.id || typeof parser.detect !== 'function' || typeof parser.parse !== 'function') {
      throw new Error('[SmartFill] Parser invalide : id, detect et parse sont requis.');
    }
    this.#parsers.set(parser.id, parser);
  }

  registerProfile(profile) {
    if (!profile?.id || typeof profile.mapToForm !== 'function') {
      throw new Error('[SmartFill] Profile invalide : id et mapToForm sont requis.');
    }
    this.#profiles.set(profile.id, profile);
  }

  // --- Accès ---

  getParser(id) { return this.#parsers.get(id) || null; }
  getProfile(id) { return this.#profiles.get(id) || null; }
  listParsers() { return [...this.#parsers.values()]; }
  listProfiles() { return [...this.#profiles.values()]; }

  // --- Analyse ---

  /**
   * Détecte le parser le plus probable pour un texte donné.
   * @returns {{ parser, score } | null}
   */
  pickBestParser(text) {
    let best = null;
    let bestScore = 0;
    for (const parser of this.#parsers.values()) {
      const score = parser.detect(text);
      if (score > bestScore) {
        bestScore = score;
        best = parser;
      }
    }
    return bestScore >= 0.5 ? { parser: best, score: bestScore } : null;
  }

  /**
   * Analyse un texte et retourne les champs extraits.
   * @param {string} text
   * @param {string} [parserId] — si absent, auto-détection
   * @returns {{ ok: true, parserId, parserLabel, fields } | { ok: false, error }}
   */
  analyze(text, parserId = null) {
    if (!text || !text.trim()) {
      return { ok: false, error: 'Aucun texte à analyser.' };
    }

    const parser = parserId
      ? this.#parsers.get(parserId)
      : this.pickBestParser(text)?.parser;

    if (!parser) {
      return {
        ok: false,
        error: 'Aucun format reconnu. Vérifiez que la capture est complète (nom, NIR, date…).'
      };
    }

    try {
      const fields = parser.parse(text);
      return {
        ok: true,
        parserId: parser.id,
        parserLabel: parser.label,
        fields
      };
    } catch (err) {
      console.error('[SmartFill] Erreur parser :', err);
      return { ok: false, error: 'Erreur lors de l\'analyse du texte.' };
    }
  }
}

// --- Singleton pré-configuré ---

export const smartFillService = new SmartFillService();
smartFillService.registerParser(lgpiParser);
smartFillService.registerProfile(grippeProfile);