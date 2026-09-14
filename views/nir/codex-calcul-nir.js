import { BaseComponent } from '../../core/base-component.js';

export class CodexCalculNir extends BaseComponent {
  render() {
    this.shadowRoot.innerHTML = `
      <style>:host { display: block; }</style>
      <slot></slot>
    `;
  }

  onReady() {
    this.addEventListener('codex-form-submit', (e) => {
      this.#traiterCalcul(e.detail?.values || {});
    });
  }

  validerNIR(nir) {
    const raw = String(nir).replace(/\s/g, '').toUpperCase();
    return /^[12]\d{2}(0[1-9]|1[0-2])(2[ABab]|\d{2})\d{6}$/.test(raw);
  }

  calculerCle(nir) {
    const raw = String(nir).replace(/\s/g, '').toUpperCase();
    if (!this.validerNIR(raw)) return null;

    let baseNum = raw.substring(0, 13);
    let offset = 0n;

    if (baseNum.includes('2A')) {
      baseNum = baseNum.replace('2A', '00');
      offset = 1000000n;
    } else if (baseNum.includes('2B')) {
      baseNum = baseNum.replace('2B', '00');
      offset = 2000000n;
    }

    const num = BigInt(baseNum) - offset;
    const reste = Number(num % 97n);
    return String(97 - reste).padStart(2, '0');
  }

  async #traiterCalcul(values) {
    const rawNir = values.nir;
    if (!rawNir) {
      this.notify.warning('Veuillez saisir un numéro de sécurité sociale.');
      return;
    }

    const raw = String(rawNir).replace(/\s/g, '').toUpperCase();
    const cle = this.calculerCle(raw);

    if (!cle) {
      this.notify.error('Numéro NIR invalide.');
      return;
    }

    const cleInput = this.querySelector('[name="cle"]');
    if (cleInput) cleInput.value = cle;

    const nirComplet = `${raw}${cle}`;
    let copieReussie = false;

    try {
      await navigator.clipboard.writeText(nirComplet);
      copieReussie = true;
    } catch {
      copieReussie = false;
    }

    const message = copieReussie
      ? `Clé calculée : ${cle} (copié dans le presse-papier)`
      : `Clé calculée : ${cle}`;

    this.notify.success(message);
  }
}

if (!customElements.get('codex-calcul-nir')) {
  customElements.define('codex-calcul-nir', CodexCalculNir);
}