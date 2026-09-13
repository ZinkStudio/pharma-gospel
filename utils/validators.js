/**
 * Utilitaires de validation pure pour pharma-gospel
 */
export const Validators = {
  /**
   * Vérifie si la valeur est un nombre positif ou nul (>= 0)
   * Nettoie automatiquement les virgules françaises ("12,5" -> 12.5)
   */
  isPositiveNumber(value) {
    if (value === null || value === undefined || value === '') return true;
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
    return !isNaN(num) && num >= 0;
  },

  /**
   * Vérifie si la valeur est strictement supérieure à 0
   */
  isGreaterThanZero(value) {
    if (value === null || value === undefined || value === '') return false;
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
    return !isNaN(num) && num > 0;
  },

  /**
   * Valide un format d'adresse email basique
   */
  isEmail(value) {
    if (!value) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(String(value).trim());
  },

  /**
   * Valide un ensemble de données selon un schéma de règles
   * @param {Object} data - Données à valider { champ: valeur }
   * @param {Array<{field: string, rule: string|Function, message: string}>} rules
   * @returns {{ valid: boolean, errors: Array<{ field: string, message: string }> }}
   */
  validate(data, rules = []) {
    const errors = [];

    for (const { field, rule, message } of rules) {
      const value = data[field];
      const isValid = typeof rule === 'function' ? rule(value) : Validators[rule]?.(value);

      if (!isValid) {
        errors.push({ 
          field, 
          message: message || `Erreur de validation sur le champ ${field}` 
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};