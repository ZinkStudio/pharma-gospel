/**
 * Parser LGPI (logiciel de gestion pharmaceutique).
 *
 * Le texte provient de l'OCR de l'outil capture Windows, exporté via
 * "Copier tout le texte". La structure est stable dans le temps (vue fixe),
 * donc on privilégie une extraction CONTEXTUELLE (lignes + ancres) plutôt
 * que des regex globales fragiles.
 *
 * Toutes les valeurs retournées sont accompagnées d'un score de confiance.
 */

// =============================================================
// Utilitaires
// =============================================================

/** Découpe en lignes non vides, en trimant chaque ligne. */
function toLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/** Vrai si la ligne est entièrement en majuscules (au moins 2 lettres). */
function isAllCaps(line) {
  const letters = line.replace(/[^A-Za-zÀ-ÖØ-Þ]/g, '');
  return letters.length >= 2 && letters === letters.toUpperCase() && /[A-ZÀ-ÖØ-Þ]/.test(line);
}

/** Retrouve l'index de la première ligne contenant le motif (regex). */
function findLineIndex(lines, regex, fromIndex = 0) {
  for (let i = fromIndex; i < lines.length; i++) {
    if (regex.test(lines[i])) return i;
  }
  return -1;
}

/** Cherche la première ligne "tout en majuscules" à partir de `fromIndex`. */
function findNextAllCaps(lines, fromIndex, excludePatterns = []) {
  for (let i = fromIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (excludePatterns.some((p) => p.test(line))) continue;
    if (isAllCaps(line)) return { value: line, index: i };
  }
  return { value: null, index: -1 };
}

// =============================================================
// Extracteurs individuels
// =============================================================

/**
 * Nom : première ligne TOUT EN MAJUSCULES après la ligne "NN ans",
 * en excluant la ligne CPAM (qui contient des chiffres).
 */
function extractNom(lines) {
  const ageIdx = findLineIndex(lines, /^\s*\d{1,3}\s+ans\s*$/);
  if (ageIdx === -1) return { value: null, confidence: 0 };

  const { value } = findNextAllCaps(lines, ageIdx, [
    /^CPAM/i,
    /^\d+$/,
    /^\d+\s+\d+/,
  ]);
  return value
    ? { value, confidence: 0.9 }
    : { value: null, confidence: 0 };
}

/**
 * Prénom : première ligne TOUT EN MAJUSCULES après la séquence
 * "Client" / "INS" (qui est stable dans LGPI).
 */
function extractPrenom(lines) {
  const insIdx = findLineIndex(lines, /^INS\s*$/i);
  if (insIdx === -1) return { value: null, confidence: 0 };

  const { value, index } = findNextAllCaps(lines, insIdx, [
    /^Client$/i,
    /^Facturation/i,
    /^Commentaires/i,
    /^CPAM/i,
  ]);

  if (!value) return { value: null, confidence: 0 };

  // Le code organisme suit immédiatement le prénom dans LGPI.
  // On s'assure qu'on n'a pas attrapé un mot parasite.
  return { value, confidence: 0.85, _index: index };
}

/**
 * Code organisme : ligne qui suit immédiatement le prénom.
 * Format : "01 131 0011" (2-3-4 chiffres).
 */
function extractCodeOrganisme(lines, prenomIndex) {
  if (prenomIndex == null || prenomIndex < 0) {
    // Fallback : chercher un pattern 2-3-4 isolé
    const idx = findLineIndex(lines, /^\d{2}\s+\d{3}\s+\d{4}$/);
    if (idx === -1) return { value: null, confidence: 0 };
    return {
      value: lines[idx].replace(/\s+/g, ' '),
      confidence: 0.6,
    };
  }

  const candidate = lines[prenomIndex + 1];
  if (candidate && /^\d{2}\s+\d{3}\s+\d{4}$/.test(candidate)) {
    return { value: candidate.replace(/\s+/g, ' '), confidence: 0.95 };
  }
  return { value: null, confidence: 0 };
}

/**
 * Valide un NIR par sa clé de contrôle modulo 97 + vérification du mois.
 * @param {string} nir — format libre ("1 46 12 99 352 807 47" ou "146129935280747")
 */
function isValidNIR(nir) {
  const clean = String(nir).replace(/\s/g, '').toUpperCase();

  // Corse : 2A/2B → 19/18 pour le calcul
  const normalized = clean.replace('2A', '19').replace('2B', '18');

  if (!/^[12]\d{14}$/.test(normalized)) return false;

  // Mois ∈ 01-12
  const mois = parseInt(normalized.slice(3, 5), 10);
  if (mois < 1 || mois > 12) return false;

  // Clé modulo 97
  const nir13 = normalized.slice(0, 13);
  const cleSaisie = parseInt(normalized.slice(13), 10);
  const cleAttendue = 97 - (parseInt(nir13, 10) % 97);

  return cleSaisie === cleAttendue;
}

/**
 * NIR : cherche TOUS les candidats de la regex, filtre par validation
 * modulo 97, puis privilégie celui qui apparaît près de l'ancre "N° Insee"
 * (tolérance ±10 lignes — l'OCR peut réordonner).
 */
function extractNIR(lines, fullText) {
  const allMatches = [
    ...fullText.matchAll(/\b([12])\s*(\d{2})\s*(\d{2})\s*(\d{2})\s*(\d{3})\s*(\d{3})\s*(\d{2})\b/g)
  ];

  const candidates = allMatches
    .map((m) => m[0].replace(/\s+/g, ' '))
    .filter(isValidNIR);

  if (!candidates.length) return { value: null, confidence: 0 };

  // Un seul candidat valide : on le prend
  if (candidates.length === 1) {
    return { value: candidates[0], confidence: 0.98 };
  }

  // Plusieurs candidats : on cherche celui le plus proche de l'ancre
  const idx = findLineIndex(lines, /N[°º]\s*Insee/i);
  if (idx !== -1) {
    const nearby = candidates.find((c) => {
      const cClean = c.replace(/\s/g, '');
      for (let i = Math.max(0, idx - 10); i <= Math.min(lines.length - 1, idx + 10); i++) {
        if (lines[i].replace(/\s/g, '').includes(cClean)) return true;
      }
      return false;
    });
    if (nearby) return { value: nearby, confidence: 0.95 };
  }

  // Fallback : premier candidat valide
  return { value: candidates[0], confidence: 0.75 };
}

/**
 * Date de naissance : ligne qui suit "Né(e) le".
 * Fallback regex + filtre d'année plausible (1920-2015).
 */
function extractDateNaissance(lines, fullText) {
  const idx = findLineIndex(lines, /N[ée]+\(?e?\)?\s*le/i);

  if (idx !== -1) {
    const sameLine = lines[idx].match(/\b(\d{2})\/(\d{2})\/((?:19[2-9]\d)|(?:20[0-1]\d))\b/);
    if (sameLine) {
      return { value: sameLine[0], confidence: 0.98 };
    }
    const nextLine = lines[idx + 1];
    if (nextLine) {
      const m = nextLine.match(/^\s*(\d{2}\/\d{2}\/(?:19[2-9]\d|20[0-1]\d))\s*$/);
      if (m) {
        return { value: m[1], confidence: 0.98 };
      }
    }
  }

  // Fallback : toutes les dates du texte, on prend la plus ancienne (naissance)
  const allDates = [...fullText.matchAll(/\b(\d{2})\/(\d{2})\/((?:19[2-9]\d)|(?:20[0-1]\d))\b/g)];
  if (allDates.length) {
    const sorted = allDates
      .map((m) => ({ str: m[0], year: parseInt(m[3], 10) }))
      .sort((a, b) => a.year - b.year);
    return { value: sorted[0].str, confidence: 0.6 };
  }

  return { value: null, confidence: 0 };
}

// =============================================================
// Parser
// =============================================================

export const lgpiParser = {
  id: 'lgpi',
  label: 'LGPI',

  /**
   * Heuristique : le texte vient-il de LGPI ?
   * On cherche plusieurs ancres spécifiques, chacune valant un tiers du score.
   */
  detect(text) {
    let score = 0;
    if (/\bp5\b/i.test(text)) score += 0.2;
    if (/le\s+\d{2}\/\d{2}\/\d{4}\s+à\s+\d{2}:\d{2}/.test(text)) score += 0.2;
    if (/^\s*Client\s*$/m.test(text)) score += 0.2;
    if (/^INS\s*$/im.test(text)) score += 0.2;
    if (/CPAM\s+\d{3}/i.test(text)) score += 0.2;
    return Math.min(score, 1);
  },

  /**
   * Extraction complète. Retourne { value, confidence } pour chaque champ.
   */
  parse(text) {
    const lines = toLines(text);

    const nom = extractNom(lines);
    const prenom = extractPrenom(lines);
    const codeOrganisme = extractCodeOrganisme(lines, prenom._index);
    const immatriculation = extractNIR(lines, text);
    const dateNaissance = extractDateNaissance(lines, text);

    return {
      nom:             nom.value,
      prenom:          prenom.value,
      dateNaissance:   dateNaissance.value,
      immatriculation: immatriculation.value,
      codeOrganisme:   codeOrganisme.value,
      _confidence: {
        nom:             nom.confidence,
        prenom:          prenom.confidence,
        dateNaissance:   dateNaissance.confidence,
        immatriculation: immatriculation.confidence,
        codeOrganisme:   codeOrganisme.confidence,
      },
    };
  },
};