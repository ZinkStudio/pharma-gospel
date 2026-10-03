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
    id: 'delivrance-urgence',
    label: 'Délivrance Urgence',
    tag: 'codex-tampon-rond',
    props: {
      top: "Administration possible par tout médecin intervenant en situation d'urgence",
      center: 'CARACTÈRE',
      'center-sub': 'URGENT'
    }
  },
  {
    id: 'facture-aquitee',
    label: 'Facture Acquitée',
    tag: 'codex-tampon-rectangle',
    props: {
      top: 'Pharmacie Saint Barthélémy',
      center: 'Facture Acquitée',
      bottom: ""
    }
  }
  ,
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