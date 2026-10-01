import { BaseView } from '../../core/base-view.js';

/**
 * CodexField
 * Composant wrapper de champ de formulaire réactif et Form-Associated.
 * Supporte la projection d'inputs natifs ou de Web Components (ex: Carbon <cds-combo-box>).
 */
export class CodexField extends BaseView {
  static formAssociated = true;

  #internals;
  #controlBound = false;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  static get observedAttributes() {
    // value volontairement exclu → plus de re-render à la frappe
    return ['disabled', 'required', 'label', 'error'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    // Mise à jour ciblée uniquement (le slot n’est jamais détruit après le 1er render)
    this.#updateChrome();
  }

  get value() {
    const control = this.getControl();
    return control ? control.value : '';
  }

  set value(val) {
    const v = val ?? '';
    this.#internals.setFormValue(v);
    const control = this.getControl();
    if (control && control.value !== v) {
      control.value = v;
    }
    // PAS de setAttribute('value', …) → pas d’attributeChanged → pas de rebuild
  }

  get name() {
    return this.getAttribute('name');
  }

  getControl() {
    if (!this.shadowRoot) return null;
    const slot = this.shadowRoot.querySelector('slot:not([name])');
    if (!slot) return null;
    const assigned = slot.assignedElements({ flatten: true });
    return assigned.find(el =>
      el.matches('input, select, textarea, cds-combo-box, cds-dropdown, cds-input, [name]')
    ) || assigned[0] || null;
  }

  /**
   * Appelé une seule fois par BaseView.connectedCallback.
   * On construit le chrome une fois pour toutes.
   */
  render() {
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
      color: var(--pc-text);
    }
    .required {
      color: var(--cds-support-error, #da1e28);
      margin-left: 2px;
    }
    .error-message {
      font-size: 0.75rem;
      color: var(--cds-support-error, #da1e28);
      display: none;
    }
    ::slotted(input),
    ::slotted(select),
    ::slotted(textarea) {
      width: 100%;
      padding: 0.5rem 0.75rem;
      box-sizing: border-box;
      border: 1px solid var(--pc-border-strong);
      border-radius: 4px;
      font-size: 1rem;
      font-family: inherit;
      background: var(--pc-surface);
      color: var(--pc-text);
    }
    ::slotted(input:focus),
    ::slotted(select:focus),
    ::slotted(textarea:focus) {
      outline: 2px solid var(--pc-primary);
      outline-offset: -2px;
      border-color: transparent;
    }
    ::slotted(input:disabled),
    ::slotted(select:disabled),
    ::slotted(textarea:disabled) {
      background: var(--pc-surface-hover);
      color: var(--pc-text-muted);
      cursor: not-allowed;
    }
  </style>
  <label class="label" hidden></label>
  <slot></slot>
  <div class="error-message"></div>
`;
    this.#updateChrome();
  }

  /** Mise à jour non-destructive du label / required / error */
  #updateChrome() {
    if (!this.shadowRoot) return;

    const labelEl = this.shadowRoot.querySelector('.label');
    const errorEl = this.shadowRoot.querySelector('.error-message');
    if (!labelEl || !errorEl) return;

    const label = this.getAttribute('label') || '';
    const error = this.getAttribute('error') || '';
    const required = this.hasAttribute('required');

    if (label) {
      labelEl.hidden = false;
      labelEl.innerHTML = `${label}${required ? '<span class="required">*</span>' : ''}`;
    } else {
      labelEl.hidden = true;
      labelEl.innerHTML = '';
    }

    errorEl.textContent = error;
    errorEl.style.display = error ? 'block' : 'none';
  }

  onReady() {
    const slot = this.shadowRoot.querySelector('slot:not([name])');
    if (!slot) return;

    const bind = () => {
      const control = this.getControl();
      if (!control || this.#controlBound) return;

      const handleInput = (e) => {
        const val = e.target?.value !== undefined
          ? e.target.value
          : e.detail?.value;

        // Sync form-associated uniquement — zéro touch au DOM / attributs
        this.#internals.setFormValue(val ?? '');

        this.dispatchEvent(new CustomEvent('codex-field-change', {
          detail: { name: this.name, value: val },
          bubbles: true,
          composed: true
        }));
      };

      control.addEventListener('input', handleInput);
      control.addEventListener('change', handleInput);
      control.addEventListener('cds-combo-box-selected', handleInput);

      this.#controlBound = true;
    };

    // Si un assistant ou le parent remplace le contenu du slot, on re-bind
    slot.addEventListener('slotchange', () => {
      this.#controlBound = false;
      bind();
    });
    bind();
  }
}

customElements.define('codex-field', CodexField);