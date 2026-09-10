import { BaseComponent } from '../../core/base-component.js';

/**
 * CodexForm
 * Conteneur déclaratif de formulaire avec auto-découverte polymorphe des champs.
 */
export class CodexForm extends BaseComponent {
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        form { display: flex; flex-direction: column; width: 100%; }
      </style>
      <form id="internal-form" novalidate>
        <slot></slot>
      </form>
    `;
  }

  onReady() {
    const form = this.$('#internal-form');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit();
    });
  }

  /**
   * Extrait la totalité des données du formulaire (Polymorphe : Natif, CodexField, Carbon)
   * @returns {Object}
   */
  getData() {
    const data = {};

    // 1. Extraction via FormData standard pour les formulaires / inputs natifs et Form-Associated
    const form = this.$('#internal-form');
    if (form) {
      const nativeData = new FormData(form);
      for (let [key, val] of nativeData.entries()) {
        data[key] = val;
      }
    }

    // 2. Découverte et surcouche polymorphe pour les Web Components personnalisés et Carbon
    const controls = this.querySelectorAll('[name]');
    controls.forEach(control => {
      const name = control.getAttribute('name');
      if (!name) return;

      let value = undefined;

      // Cas A: CodexField
      if (control.tagName.toLowerCase() === 'codex-field') {
        value = control.value;
      } 
      // Cas B: Composants Carbon (cds-combo-box, cds-dropdown, cds-input...)
      else if (control.tagName.toLowerCase().startsWith('cds-')) {
        value = control.value || control.getAttribute('value');
      } 
      // Cas C: Éléments natifs ou Custom Elements génériques
      else if ('value' in control) {
        value = control.value;
      } else {
        value = control.getAttribute('value');
      }

      if (value !== undefined) {
        data[name] = value;
      }
    });

    return data;
  }

  /**
   * Déclenche la soumission du formulaire et émet l'événement 'codex-form-submit'
   */
  submit() {
    const data = this.getData();

    this.dispatchEvent(new CustomEvent('codex-form-submit', {
      detail: data,
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Renseigne les valeurs du formulaire dynamiquement
   * @param {Object} valuesData 
   */
  setValues(valuesData = {}) {
    Object.entries(valuesData).forEach(([name, value]) => {
      const control = this.querySelector(`[name="${name}"]`);
      if (control) {
        if ('value' in control) {
          control.value = value;
        } else {
          control.setAttribute('value', value);
        }
      }
    });
  }
}

customElements.define('codex-form', CodexForm);