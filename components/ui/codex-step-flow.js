import { BaseComponent } from '../../core/base-component.js';

/**
 * CodexStepFlow
 * Orchestrateur déclaratif de parcours à étapes (Wizard / Workflow).
 */
export class CodexStepFlow extends BaseComponent {
  static get observedAttributes() {
    return ['current-step'];
  }

  constructor() {
    super();
    this.currentStep = 0;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }
        ::slotted(*:not([active])) {
          display: none !important;
        }
      </style>
      <div class="step-container">
        <slot></slot>
      </div>
    `;
  }

  onReady() {
    this._updateStepVisibility();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'current-step' && oldValue !== newValue) {
      this.currentStep = parseInt(newValue, 10) || 0;
      this._updateStepVisibility();
    }
  }

  /**
   * Mettre à jour la visibilité des éléments enfants selon l'étape courante
   */
  _updateStepVisibility() {
    const steps = Array.from(this.children);

    steps.forEach((step, index) => {
      if (index === this.currentStep) {
        step.setAttribute('active', '');
      } else {
        step.removeAttribute('active');
      }
    });

    this.dispatchEvent(new CustomEvent('step-changed', {
      detail: { step: this.currentStep, totalSteps: steps.length },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Passe à l'étape suivante
   */
  next() {
    if (this.currentStep < this.children.length - 1) {
      this.currentStep++;
      this.setAttribute('current-step', this.currentStep);
    }
  }

  /**
   * Revient à l'étape précédente
   */
  previous() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.setAttribute('current-step', this.currentStep);
    }
  }

  /**
   * Saute à une étape spécifique
   * @param {number} index 
   */
  goTo(index) {
    if (index >= 0 && index < this.children.length) {
      this.currentStep = index;
      this.setAttribute('current-step', this.currentStep);
    }
  }
}

customElements.define('codex-step-flow', CodexStepFlow);