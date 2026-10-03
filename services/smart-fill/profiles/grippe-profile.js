/**
 * Profile grippe — mappe les champs extraits par le parser LGPI vers les
 * noms des champs du formulaire <codex-form id="formGrippe">.
 *
 * Si un jour le formulaire change (renommage d'un champ), c'est ici qu'on
 * ajuste — pas dans le parser, pas dans la vue.
 */
export const grippeProfile = {
  id: 'grippe',
  label: 'Bon de prise en charge — Vaccination grippale',

  /**
   * @param {Object} parsed — sortie de lgpiParser.parse()
   * @returns {Object} — dictionnaire { nomChampFormulaire: valeur }
   */
  mapToForm(parsed) {
    return {
      nom:             parsed.nom || '',
      prenom:          parsed.prenom || '',
      dateNaissance:   parsed.dateNaissance || '',
      immatriculation: parsed.immatriculation || '',
      codeOrganisme:   parsed.codeOrganisme || ''
      // specialite, lot, avecInjection : jamais pré-remplis par cette source,
      // ils viennent du scan DataMatrix ou de la saisie manuelle.
    };
  }
};