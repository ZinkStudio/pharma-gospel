/**
 * Collection de tampons proposés dans l'Endossaire. Chaque entrée ne porte
 * que des données — la géométrie vit une seule fois dans les composants
 * /components/tampon/. Ajouter un tampon = ajouter une entrée ici, jamais
 * du balisage SVG dupliqué (cf. le problème diagnostiqué dans stamp.html).
 */
export const tampons = [
  {
    id: 'delivrance-securisee',
    label: 'Délivrance Sécurisée',
    tag: 'codex-tampon-rond',
    props: {
      top: 'Pharmacie Saint Barthélémy',
      bottom: '19 av. claude monet 13014 Marseille',
      center: 'Délivrance',
      'center-sub': 'Sécurisée'
    }
  },
  {
    id: 'principal',
    label: 'Le Principal',
    tag: 'codex-tampon-rond',
    props: {
      top: 'Collège Katherine Johnson',
      bottom: 'Bd du Bhosphore 13015 Marseille',
      center: 'LE PRINCIPAL',
      'center-sub': 'C. CALIPPE'
    }
  },
  {
    id: 'secretariat',
    label: 'Secrétariat',
    tag: 'codex-tampon-rond',
    props: {
      top: 'Collège Katherine Johnson',
      bottom: 'Bd du Bhosphore 13015 Marseille',
      center: 'SECRÉTARIAT',
      'center-sub': 'L. ZERRAD'
    }
  },
  {
    id: 'gestion',
    label: 'Service Gestion',
    tag: 'codex-tampon-rond',
    props: {
      top: 'Collège Katherine Johnson',
      bottom: 'Bd du Bhosphore 13015 Marseille',
      center: 'SERVICE',
      'center-sub': 'GESTION'
    }
  }
];