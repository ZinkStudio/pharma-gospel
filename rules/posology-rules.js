/**
 * PosologyRules
 * Moteur de calcul et de vérification des règles posologiques
 */
export const PosologyRules = {
  /**
   * Calcule la dose totale quotidienne et la dose par prise
   * @param {Object} params 
   * @param {number} params.weight - Poids du patient en kg
   * @param {number} params.targetDosePerKg - Dose cible par kg (ex: mg/kg/jour)
   * @param {number} params.frequency - Nombre de prises par jour
   * @returns {{ dailyTotal: number, singleDose: number }}
   */
  calculateDose({ weight, targetDosePerKg, frequency = 1 }) {
    const w = parseFloat(weight) || 0;
    const dosePerKg = parseFloat(targetDosePerKg) || 0;
    const freq = Math.max(1, parseInt(frequency, 10) || 1);

    const dailyTotal = Math.round((w * dosePerKg) * 100) / 100;
    const singleDose = Math.round((dailyTotal / freq) * 100) / 100;

    return { dailyTotal, singleDose };
  },

  /**
   * Convertit une dose en volume (ml) selon la concentration (mg/ml)
   * @param {number} doseInMg 
   * @param {number} concentrationMgMl 
   * @returns {number} Volume en ml (arrondi à 2 décimales)
   */
  convertToVolume(doseInMg, concentrationMgMl) {
    const dose = parseFloat(doseInMg) || 0;
    const conc = parseFloat(concentrationMgMl) || 0;

    if (conc <= 0) return 0;
    return Math.round((dose / conc) * 100) / 100;
  },

  /**
   * Vérifie le dépassement de la dose maximale théorique
   * @param {number} calculatedDose 
   * @param {number} maxAllowedDose 
   * @returns {{ isSafe: boolean, ratio: number, warning: string|null }}
   */
  checkSafetyLimits(calculatedDose, maxAllowedDose) {
    const dose = parseFloat(calculatedDose) || 0;
    const max = parseFloat(maxAllowedDose) || 0;

    if (max <= 0) return { isSafe: true, ratio: 1, warning: null };

    const ratio = Math.round((dose / max) * 100) / 100;
    const isSafe = dose <= max;

    return {
      isSafe,
      ratio,
      warning: !isSafe ? `Dépassement de la dose maximale recommandée (${dose} / ${max})` : null
    };
  }
};