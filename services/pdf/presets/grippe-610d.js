/**
 * Mapping des noms d'AcroForm présents dans les PDF 610d officiels
 * vers les clés du formulaire applicatif.
 *
 * Les noms AcroForm sont EXACTS (case-sensitive, accents et symboles
 * inclus) — cf. le diagnostic `PDFService.listFields()`.
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
 * (spécialité, lot, dates d'exécution/délivrance).
 *
 * Coordonnées en fraction de la page :
 *   left = distance bord gauche / largeur
 *   top  = distance bord HAUT / hauteur (inversé pour PDF)
 */
export const GRIPPE_610D_LAYOUT = {
  pageSize: { width: 595.28, height: 841.89 },
  positions: {
    specialite:     { left: 0.1000, top: 0.5300, fontSize: 10, letterSpacing: 5 },
    dateDelivrance: { left: 0.4000, top: 0.5300, fontSize: 10, letterSpacing: 3 },
    lot:            { left: 0.2500, top: 0.8350, fontSize: 10, letterSpacing: 5 },
    dateExecution:  { left: 0.1750, top: 0.8080, fontSize: 10, letterSpacing: 3 }
  }
};