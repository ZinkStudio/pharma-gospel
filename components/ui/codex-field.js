import { BaseComponent } from '../../core/base-component.js';

/**
 * CodexField
 * Composant wrapper de champ de formulaire réactif et Form-Associated.
 * Supporte la projection d'inputs natifs ou de Web Components (ex: Carbon <cds-combo-box>).
 */
export class CodexField extends BaseComponent {
  // Déclare que ce Custom Element peut participer nativement aux formulaires HTML
  static formAssociated = true;

  #internals;

  constructor() {
    super();
    // API native pour se synchroniser avec le <form> parent s'il y en a un
    this.#internals = this.attachInternals();
  }

  static get observedAttributes() {
    return ['value', 'disabled', 'required', 'label', 'error'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'value') {
      this.#internals.setFormValue(newValue);
      this.#syncChildControlValue(newValue);
    }
    this.render();
  }

  get value() {
    const control = this.getControl();
    return control ? control.value : (this.getAttribute('value') || '');
  }

  set value(val) {
    this.setAttribute('value', val);
    this.#internals.setFormValue(val);
    const control = this.getControl();
    if (control) control.value = val;
  }

  get name() {
    return this.getAttribute('name');
  }

  /**
   * Récupère l'élément de contrôle enfant (Input natif, Carbon, ou Slotté)
   */
  getControl() {
    if (!this.shadowRoot) return null;
    const slot = this.shadowRoot.querySelector('slot:not([name])');
    if (!slot) return null;
    
    const assigned = slot.assignedElements({ flatten: true });
    // Recherche d'un composant Carbon, d'un input natif, ou de l'élément direct
    return assigned.find(el => 
      el.matches('input, select, textarea, cds-combo-box, cds-dropdown, cds-input, [name]')
    ) || assigned[0] || null;
  }

  render() {
    const label = this.getAttribute('label') || '';
    const error = this.getAttribute('error') || '';
    const required = this.hasAttribute('required') ? '*' : '';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-bottom: 1rem;
          font-family: inherit;
        }
        .label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--codex-label-color, #393939);
        }
        .required {
          color: var(--codex-error-color, #da1e28);
          margin-left: 2px;
        }
        .error-message {
          font-size: 0.75rem;
          color: var(--codex-error-color, #da1e28);
          display: ${error ? 'block' : 'none'};
        }
        ::slotted(input), ::slotted(select), ::slotted(textarea) {
          width: 100%;
          padding: 0.5rem 0.75rem;
          box-sizing: border-box;
          border: 1px solid var(--codex-border-color, #8d8d8d);
          border-radius: 4px;
          font-size: 1rem;
        }
        ::slotted(input:focus), ::slotted(select:focus) {
          outline: 2px solid var(--codex-focus-color, #0f62fe);
          border-color: transparent;
        }
      </style>

      ${label ? `<label class="label">${label}<span class="required">${required}</span></label>` : ''}
      <slot></slot>
      <div class="error-message">${error}</div>
    `;
  }

  onReady() {
    const slot = this.shadowRoot.querySelector('slot:not([name])');
    
    const bindControlEvents = () => {
      const control = this.getControl();
      if (!control) return;

      // Écoute des événements de modification (supporte native input & Carbon events)
      const handleInput = (e) => {
        const val = e.target.value !== undefined ? e.target.value : e.detail?.value;
        this.value = val;
        
        // Relai de l'événement pour la réactivité parent
        this.dispatchEvent(new CustomEvent('codex-field-change', {
          detail: { name: this.name, value: val },
          bubbles: true,
          composed: true
        }));
      };

      control.removeEventListener('input', handleInput);
      control.removeEventListener('change', handleInput);
      control.removeEventListener('cds-combo-box-selected', handleInput);

      control.addEventListener('input', handleInput);
      control.addEventListener('change', handleInput);
      control.addEventListener('cds-combo-box-selected', handleInput);
    };

    slot.addEventListener('slotchange', bindControlEvents);
    bindControlEvents();
  }

  #syncChildControlValue(val) {
    const control = this.getControl();
    if (control && control.value !== val) {
      control.value = val;
    }
  }
}

customElements.define('codex-field', CodexField);