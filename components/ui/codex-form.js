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
   * Extrait la totalité des données du formulaire (Natif, CodexField, Carbon)
   * @returns {Object}
   */
  getData() {
    const data = {};
    const controls = this.querySelectorAll('[name]');

    controls.forEach(control => {
      const name = control.getAttribute('name');
      if (!name || control.disabled) return;

      const tagName = control.tagName.toLowerCase();
      let value = undefined;

      // 1. Composants Carbon (cds-*)
      if (tagName.startsWith('cds-')) {
        if (tagName.endsWith('-checkbox') || tagName.endsWith('-toggle')) {
          value = control.checked ?? control.hasAttribute('checked');
        } else {
          value = control.value ?? control.getAttribute('value');
        }
      } 
      // 2. CodexField
      else if (tagName === 'codex-field') {
        value = control.value;
      } 
      // 3. Inputs natifs spéciaux (checkbox / radio)
      else if (control.type === 'checkbox') {
        if (!data[name]) data[name] = [];
        if (control.checked) {
          data[name].push(control.value || true);
        }
        return;
      } else if (control.type === 'radio') {
        if (control.checked) {
          value = control.value;
        } else {
          return;
        }
      } 
      // 4. Custom Elements génériques ou Natifs
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
   * Effectue un contrôle rapide de validité sur tous les contrôles enfants
   * @returns {boolean}
   */
  checkValidity() {
    const controls = this.querySelectorAll('[name]');
    let isValid = true;

    controls.forEach(control => {
      if (typeof control.checkValidity === 'function') {
        if (!control.checkValidity()) isValid = false;
      }
    });

    return isValid;
  }

  /**
   * Déclenche la soumission du formulaire et émet 'codex-form-submit'
   */
  submit() {
    const data = this.getData();

    this.dispatchEvent(new CustomEvent('codex-form-submit', {
      detail: {
        values: data,
        isValid: this.checkValidity()
      },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Réinitialise tous les champs du formulaire
   */
  reset() {
    const form = this.$('#internal-form');
    if (form) form.reset();

    const controls = this.querySelectorAll('[name]');
    controls.forEach(control => {
      const tagName = control.tagName.toLowerCase();
      if (tagName.startsWith('cds-') || tagName === 'codex-field') {
        if ('value' in control) control.value = '';
        if ('checked' in control) control.checked = false;
      }
    });
  }

  /**
   * Renseigne les valeurs du formulaire dynamiquement
   * @param {Object} valuesData 
   */
  setValues(valuesData = {}) {
    Object.entries(valuesData).forEach(([name, value]) => {
      const control = this.querySelector(`[name="${name}"]`);
      if (!control) return;

      const tagName = control.tagName.toLowerCase();

      if (tagName.startsWith('cds-') && (tagName.endsWith('-checkbox') || tagName.endsWith('-toggle'))) {
        control.checked = Boolean(value);
      } else if ('value' in control) {
        control.value = value;
      } else {
        control.setAttribute('value', value);
      }
    });
  }
}

customElements.define('codex-form', CodexForm);