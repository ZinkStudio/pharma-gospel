import { BaseComponent } from '../../core/base-component.js';

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

    // Capture des clics sur les boutons submit (natifs ou Carbon)
    this.addEventListener('click', (e) => {
      const target = e.composedPath()[0] || e.target;
      const btn = target.closest('cds-button, button, [type="submit"]');
      if (btn && (btn.type === 'submit' || btn.getAttribute('type') === 'submit' || !btn.hasAttribute('type'))) {
        e.preventDefault();
        this.submit();
      }
    });
  }

  getData() {
    const data = {};
    const controls = this.querySelectorAll('[name]');

    controls.forEach(control => {
      const name = control.getAttribute('name');
      if (!name || control.disabled) return;

      // Lecture de la valeur Carbon / Natif
      let value = control.value;
      if (value === undefined) {
        value = control.getAttribute('value') || '';
      }

      data[name] = value;
    });

    return data;
  }

  checkValidity() {
    return true;
  }

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

  reset() {
    const controls = this.querySelectorAll('[name]');
    controls.forEach(control => {
      control.value = '';
    });
  }
}

if (!customElements.get('codex-form')) {
  customElements.define('codex-form', CodexForm);
}