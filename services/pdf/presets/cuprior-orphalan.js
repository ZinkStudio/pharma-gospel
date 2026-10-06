/**
 * Layout overlay pour le bon de commande Orphalan (Cuprior).
 * Le PDF n'a pas d'AcroForm — overlay pur.
 *
 * Les coordonnées du legacy ({ x, y } en points PDF depuis le bas-gauche)
 * ont été converties en fractions de page (0-1) :
 *   left = x / 595.28
 *   top  = (841.89 - y) / 841.89
 *
 * À ajuster visuellement après premier test si le PDF a changé depuis.
 */
export const CUPRIOR_ORPHALAN_LAYOUT = {
  pageSize: { width: 595.28, height: 841.89 },
  positions: {
    // ---- En-tête (à droite) ----
    date:              { left: 0.2690, top: 0.2161, fontSize: 10 },
    date_entete:       { left: 0.4199, top: 0.9703, fontSize: 10 }, // 2ᵉ occurrence en haut à droite

    // ---- Bloc établissement (colonne gauche) ----
    etablissement:     { left: 0.2690, top: 0.3250, fontSize: 10 },
    numero_tva:        { left: 0.2690, top: 0.3620, fontSize: 10 },
    pharmacien_nom:    { left: 0.2690, top: 0.3880, fontSize: 10 },
    pharmacien_rpps:   { left: 0.2690, top: 0.4100, fontSize: 10 },

    // ---- Bloc adresse de livraison ----
    contact:           { left: 0.2690, top: 0.5060, fontSize: 10 },
    adresse:           { left: 0.2690, top: 0.5330, fontSize: 10 },
    code_postale:      { left: 0.2690, top: 0.5600, fontSize: 10 },
    telephone:         { left: 0.2690, top: 0.5900, fontSize: 10 },
    fax:               { left: 0.2690, top: 0.6180, fontSize: 10 },
    mail:              { left: 0.2690, top: 0.6450, fontSize: 10 },

    // ---- Bas : quantité + commentaire ----
    quantite:          { left: 0.1260, top: 0.7970, fontSize: 10 },
    commentaire:       { left: 0.1260, top: 0.8575, fontSize: 10 }
  }
};