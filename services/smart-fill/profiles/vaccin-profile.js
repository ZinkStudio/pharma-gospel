/**
 * Profile vaccin — mapping champs LGPI → formulaire vaccin.
 * Le parser LGPI extrait 5 champs, on les mappe tels quels.
 * Date de prescription et spécialité ne viennent jamais du parser :
 * elles sont saisies manuellement ou par scan DataMatrix.
 */
export const vaccinProfile = {
  id: 'vaccin',
  label: 'Bon de prise en charge — Vaccination (611)',

  mapToForm(parsed) {
    return {
      nom:             parsed.nom || '',
      prenom:          parsed.prenom || '',
      dateNaissance:   parsed.dateNaissance || '',
      immatriculation: parsed.immatriculation || '',
      codeOrganisme:   parsed.codeOrganisme || ''
    };
  }
};