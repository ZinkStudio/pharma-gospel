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
    id: 'protocole-pai',
    label: 'Protocole PAI',
    tag: 'codex-tampon-rectangle',
    props: {
      top: 'Trousse de Secours',
      center: 'Protocole PAI',
      bottom: "Projet d'Accueil Individualisé"
    }
  }
];