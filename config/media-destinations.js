/**
 * Registre des destinations possibles pour le transfert de fichiers.
 * 
 * - id      : Identifiant unique (doit correspondre à l'attribut 'current-view' de la vue)
 * - label   : Texte affiché dans le menu
 * - route   : Hash de navigation vers la vue
 * - accepts : Types de fichiers supportés ('image', 'pdf')
 */
export const MEDIA_DESTINATIONS = [
  {
    id: 'ordoscan',
    label: 'Ordoscan (Recadrage / Nettoyage)',
    route: '#views/ordoscan/ordoscan.html',
    accepts: ['image', 'pdf']
  },
  {
    id: 'endossaire',
    label: 'Endossaire (Apposer un tampon)',
    route: '#views/endossaire/endossaire.html',
    accepts: ['image', 'pdf']
  },
  {
    id: 'purificateur',
    label: 'Purificateur PDF',
    route: '#views/purificateur/purificateur.html',
    accepts: ['pdf'] // N'accepte que le PDF (fichier métier spécifique)
  }
];