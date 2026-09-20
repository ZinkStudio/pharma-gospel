import { BaseComponent } from '../../core/base-component.js';
import { Validators } from '../../utils/validators.js';

/**
 * Parse tolérant : accepte la virgule décimale française, retombe sur
 * `fallback` si la valeur est vide ou non numérique.
 */
function parseNombre(str, fallback = 0) {
  const val = parseFloat(String(str ?? '').replace(',', '.'));
  return Number.isNaN(val) ? fallback : val;
}

export class CodexCalculazen extends BaseComponent {
  render() {
    this.shadowRoot.innerHTML = `
      <style>:host { display: block; }</style>
      <slot></slot>
    `;
  }

  onReady() {
    this.addEventListener('codex-form-submit', (e) => {
      const values = e.detail?.values || {};
      if (e.target.id === 'form-remise') this.#calculerRemise(values);
      if (e.target.id === 'form-boite') this.#calculerBoites(values);
    });
  }

  #calculerRemise(values) {
    try {
      const unitesPayantes = parseNombre(values.unitesPayantes);
      const prixUnitaire = parseNombre(values.prixUnitaire);
      const remisePourcent = parseNombre(values.remisePourcent);
      const unitesGratuites = parseNombre(values.unitesGratuites);

      const valeurs = [unitesPayantes, prixUnitaire, remisePourcent, unitesGratuites];
      if (valeurs.some(v => !Validators.isPositiveNumber(v))) {
        this.notify.error('Les valeurs doivent être positives.');
        return;
      }

      const montantPayantes = unitesPayantes * prixUnitaire;
      const remiseValeur = montantPayantes * (remisePourcent / 100);
      const montantApresRemise = montantPayantes - remiseValeur;

      const quantiteTotale = unitesPayantes + unitesGratuites;
      if (quantiteTotale === 0) {
        this.notify.error('Les valeurs doivent être positives.');
        return;
      }

      const prixTotalSansRemise = quantiteTotale * prixUnitaire;
      const remiseEffective = prixTotalSansRemise - montantApresRemise;
      const pourcentageEffectif = (remiseEffective / prixTotalSansRemise) * 100;

      this.notify.success(`Nouveau pourcentage de remise effectif : ${pourcentageEffectif.toFixed(2)} %`);
    } catch (err) {
      console.error('[CodexCalculazen] Erreur calcul remise :', err);
      this.notify.error('Erreur lors du calcul de la remise.');
    }
  }

  #calculerBoites(values) {
    try {
      const unitePrise = parseNombre(values.unitePrise);
      const nombrePrise = parseNombre(values.nombrePrise);
      const dureePrise = parseNombre(values.dureePrise);
      const unitesBoite = parseNombre(values.unitesBoite, 1);

      const valeursPositives = [unitePrise, nombrePrise, dureePrise];
      const boitesValides = Validators.isGreaterThanZero(unitesBoite);
      if (valeursPositives.some(v => !Validators.isPositiveNumber(v)) || !boitesValides) {
        this.notify.error('Les valeurs doivent être positives et unités par boîte > 0.');
        return;
      }

      const totalUnites = unitePrise * nombrePrise * dureePrise;
      const nombreBoites = Math.ceil(totalUnites / unitesBoite);

      this.notify.success(`Nombre de boîtes nécessaires : ${nombreBoites}`);
    } catch (err) {
      console.error('[CodexCalculazen] Erreur calcul boîtes :', err);
      this.notify.error('Erreur lors du calcul du nombre de boîtes.');
    }
  }
}

if (!customElements.get('codex-calculazen')) {
  customElements.define('codex-calculazen', CodexCalculazen);
}