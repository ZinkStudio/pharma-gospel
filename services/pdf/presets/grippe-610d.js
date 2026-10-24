/**
 * Mapping des noms d'AcroForm présents dans les PDF 610d officiels
 * vers les clés du formulaire applicatif.
 */
export const GRIPPE_610D_ACROFORM_MAPPING = {
  'N° immat':       'immatriculation',
  'Bénéficiaire':   'beneficiaire',      // concaténation calculée
  'Date':           'dateNaissance',
  'Code organisme': 'codeOrganisme',
  'Expéditeur Caisse': 'expediteurCaisse' // souvent vide
};

/**
 * Positions d'overlay pour les champs NON couverts par les AcroForm
 * et coordonnées des tampons/signatures (images).
 * 
 * A4 standard : 595.28 x 841.89 points.
 * Note : l'axe Y en PDF part du BAS de la page (0 = bas).
 */
export const GRIPPE_610D_LAYOUT = {
  pageSize: { width: 595.28, height: 841.89 },
  positions: {
    specialite:     { left: 0.1000, top: 0.5300, fontSize: 10, letterSpacing: 5 },
    dateDelivrance: { left: 0.4050, top: 0.5300, fontSize: 10, letterSpacing: 3 },
    lot:            { left: 0.2500, top: 0.8450, fontSize: 10, letterSpacing: 5 },
    dateExecution:  { left: 0.2000, top: 0.8200, fontSize: 10, letterSpacing: 3 }
  },
  // Coordonnées (x, y) en points depuis le coin bas-gauche
  stamps: {
    // Volet 1 (Haut à droite)
    pharmacien: { x: 350, y: 330, width: 160, height: 80 },
    // Volet 2 (Bas à droite)
    infirmier:  { x: 300, y: 80, width: 160, height: 80 }
  }
};