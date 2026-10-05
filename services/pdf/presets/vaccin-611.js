/**
 * Layout overlay pour le bon 611 (CNAM - 09/2023).
 * Champs à remplir manuellement : le PDF n'a pas d'AcroForm.
 *
 * Coordonnées en fraction de page (0-1) :
 *   left = distance bord gauche / largeur
 *   top  = distance bord HAUT / hauteur (inversé pour PDF côté moteur)
 *
 * Les valeurs proviennent du legacy pharma-codex (view-vaccin.js) —
 * à ajuster visuellement après premier test si le PDF a changé depuis.
 */
export const VACCIN_611_LAYOUT = {
  pageSize: { width: 595.28, height: 841.89 },   // A4
  positions: {
    // Cases à remplir caractère par caractère (letterSpacing élevé)
    immatriculation:        { left: 0.3400, top: 0.3000, fontSize: 15, letterSpacing: 7 },
    dateNaissanceCompact:   { left: 0.4620, top: 0.3400, fontSize: 15, letterSpacing: 7 },
    datePrescriptionCompact:{ left: 0.1650, top: 0.7550, fontSize: 15, letterSpacing: 7 },

    // Lignes continues (letterSpacing normal)
    beneficiaire:           { left: 0.4000, top: 0.3200, fontSize: 10, letterSpacing: 0 },
    codeOrganisme:          { left: 0.2600, top: 0.3550, fontSize: 10, letterSpacing: 0 },
    specialite:             { left: 0.2200, top: 0.5400, fontSize: 10, letterSpacing: 0 }
  }
};