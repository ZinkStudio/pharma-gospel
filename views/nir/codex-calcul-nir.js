// components/calcul-nir/codex-calcul-nir.js
import { BaseComponent } from '../../core/base-component.js';

export class CodexCalculNir extends BaseComponent {
  #forms = [];

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; padding: 1rem; }
        .container { border: 1px solid var(--border-color, #ccc); padding: 1.5rem; border-radius: 8px; }
      </style>
      <div class="container">
        <header><slot name="header"><h2>Calculateur NIR</h2></slot></header>
        <main>
          <slot></slot> <!-- Les <codex-form> sont projetés ici -->
        </main>
      </div>
    `;
  }

  onReady() {
    // Auto-découverte des formulaires enfants sans déclaration impérative
    const slot = this.shadowRoot.querySelector('slot:not([name])');
    
    const updateForms = () => {
      this.#forms = slot.assignedElements().filter(el => el.tagName.toLowerCase() === 'codex-form');
      this.#bindForms();
    };

    slot.addEventListener('slotchange', updateForms);
    updateForms();
  }

  #bindForms() {
    this.#forms.forEach(form => {
      form.addEventListener('codex-form-submit', (e) => this.#handleCalcul(e.detail));
    });
  }

  #handleCalcul(formData) {
    // Logique métier du calcul NIR
    const { nirWithoutKey } = formData;
    const key = (97n - (BigInt(nirWithoutKey) % 97n)).toString().padStart(2, '0');
    
    this.dispatchEvent(new CustomEvent('nir-calculated', {
      detail: { key, fullNir: `${nirWithoutKey}${key}` },
      bubbles: true,
      composed: true
    }));
  }
}

customElements.define('codex-calcul-nir', CodexCalculNir);