import { BaseView } from '../../core/base-view.js';

// Événements custom émis par les composants Carbon. On les écoute en plus
// des événements natifs (`input`, `change`) car certains composants
// n'émettent pas ces derniers de manière composed (ils restent bloqués
// dans leur shadow root).
const CARBON_CHANGE_EVENTS = [
  'cds-text-input-changed',
  'cds-textarea-changed',
  'cds-select-selected-item-changed',
  'cds-select-changed',
  'cds-dropdown-selected-item-changed',
  'cds-checkbox-changed',
  'cds-toggle-changed',
  'cds-number-input-changed',
  'cds-date-picker-changed',
  'cds-time-picker-changed',
];

export class CodexForm extends BaseView {
  #initialValues = new Map();
  #listening = false;

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
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit();
    });

    // Capture des clics sur les boutons submit (natifs ou Carbon).
    // Nécessaire car les enfants projetés via <slot> ne sont pas dans le
    // <form> interne au sens HTML : le submit natif ne les voit pas.
    this.addEventListener('click', (e) => {
      const target = e.composedPath()[0] || e.target;
      const btn = target.closest?.('cds-button, button, [type="submit"]');
      if (btn && (btn.type === 'submit' || btn.getAttribute('type') === 'submit' || !btn.hasAttribute('type'))) {
        e.preventDefault();
        this.submit();
      }
    });

    this.#snapshotInitialValues();
    this.#installChangeListeners();
  }

  // =============================================================
  // API publique
  // =============================================================

  /** Valeurs courantes du formulaire (objet plat { name: value }). */
  getData() {
    return this.#collecter().values;
  }

  /** Noms des champs invalides (échouent à required / pattern / longueur). */
  getInvalidFields() {
    return this.#collecter().invalidFields.map(f => f.name);
  }

  /** Valide le formulaire. Retourne true si tous les champs obligatoires sont remplis. */
  checkValidity() {
    return this.#collecter().invalidFields.length === 0;
  }

  /** Restaure les valeurs initiales (capturées au montage). */
  reset() {
    this.querySelectorAll('[name]').forEach(control => {
      const name = control.getAttribute('name');
      const initial = this.#initialValues.get(name);
      const fallback = this.#estCaseACocher(control) ? false : '';
      this.#ecrireValeur(control, initial ?? fallback);
    });
    this.dispatchEvent(new CustomEvent('codex-form-reset', {
      bubbles: true,
      composed: true
    }));
  }

  /** Déclenche la soumission et émet les événements associés. */
  submit() {
    const { values, invalidFields } = this.#collecter();
    const isValid = invalidFields.length === 0;

    this.dispatchEvent(new CustomEvent('codex-form-submit', {
      detail: { values, isValid, invalidFields: invalidFields.map(f => f.name) },
      bubbles: true,
      composed: true
    }));

    if (!isValid) {
      this.dispatchEvent(new CustomEvent('codex-form-invalid', {
        detail: { invalidFields: invalidFields.map(f => f.name) },
        bubbles: true,
        composed: true
      }));
    }
  }

  /** Récupère la valeur d'un champ par son name. */
  getValue(name) {
    const control = this.querySelector(`[name="${CSS.escape(name)}"]`);
    return control ? this.#lireValeur(control) : undefined;
  }

  /** Écrit la valeur d'un champ par son name et émet codex-form-change. */
  setValue(name, value) {
    const control = this.querySelector(`[name="${CSS.escape(name)}"]`);
    if (!control) return;
    this.#ecrireValeur(control, value);
    this.#emitChange(control);
  }

  /** Donne le focus au premier champ invalide (ou à un champ nommé). */
  focusField(name) {
    const selector = name
      ? `[name="${CSS.escape(name)}"]`
      : '[name]';
    const control = this.querySelector(selector);
    control?.focus?.();
  }

  // =============================================================
  // Collecte / lecture / écriture
  // =============================================================

  #collecter() {
    const values = {};
    const invalidFields = [];

    this.querySelectorAll('[name]').forEach(control => {
      const name = control.getAttribute('name');
      if (!name || control.disabled) return;

      const valeur = this.#lireValeur(control);
      values[name] = valeur;

      if (!this.#champEstValide(control, valeur)) {
        invalidFields.push({ name, control, value: valeur });
      }
    });

    return { values, invalidFields };
  }

  #lireValeur(control) {
    const tag = control.tagName.toLowerCase();

    if (tag === 'cds-checkbox' || tag === 'cds-toggle') {
      return control.checked === true;
    }

    if (tag === 'cds-select' || tag === 'cds-dropdown') {
      // Carbon expose .value une fois un item sélectionné. Fallback :
      // chercher l'item portant [selected] ou [value] en dur.
      if (typeof control.value === 'string' && control.value) return control.value;
      const item = control.querySelector('cds-select-item[selected], cds-dropdown-item[selected]');
      return item?.getAttribute('value') ?? '';
    }

    // cds-text-input, cds-textarea, cds-number-input, cds-date-picker…
    // exposent tous .value comme les <input> natifs.
    if (typeof control.value === 'string') return control.value;
    return control.getAttribute('value') || '';
  }

  #ecrireValeur(control, value) {
    const tag = control.tagName.toLowerCase();

    if (tag === 'cds-checkbox' || tag === 'cds-toggle') {
      control.checked = Boolean(value);
      return;
    }

    control.value = value ?? '';
  }

  #estCaseACocher(control) {
    const tag = control.tagName.toLowerCase();
    return tag === 'cds-checkbox' || tag === 'cds-toggle';
  }

  // =============================================================
  // Validation
  // =============================================================

#champEstValide(control, valeur) {
  const required = control.hasAttribute('required') || control.required === true;

  if (this.#estCaseACocher(control)) {
    return !required || valeur === true;
  }

  if (required && (valeur === '' || valeur === null || valeur === undefined)) {
    return false;
  }

  const chaine = valeur == null ? '' : String(valeur);

  // Le pattern porte sur la valeur MÉTIER (chiffres), pas sur la valeur
  // AFFICHÉE (avec espaces de masque). On normalise avant de tester.
  const pattern = control.getAttribute('pattern');
  if (pattern && chaine) {
    const chainePourPattern = chaine.replace(/\s/g, '');
    try {
      if (!new RegExp(`^(?:${pattern})$`).test(chainePourPattern)) return false;
    } catch {
      // Pattern invalide — on l'ignore plutôt que de bloquer le formulaire
    }
  }

  // Longueurs min / max : idem, on mesure la valeur métier
  const minLength = parseInt(control.getAttribute('minlength'), 10);
  const maxLength = parseInt(control.getAttribute('maxlength'), 10);
  const longueurUtile = chaine.replace(/\s/g, '').length;
  if (Number.isFinite(minLength) && longueurUtile < minLength) return false;
  if (Number.isFinite(maxLength) && longueurUtile > maxLength) return false;

  return true;
}

  // =============================================================
  // Écoute des changements (émet codex-form-change)
  // =============================================================

  #installChangeListeners() {
    if (this.#listening) return;
    this.#listening = true;

    const handler = (e) => {
      const control = this.#controlDepuisEvent(e);
      if (!control) return;
      this.#emitChange(control);
    };

    ['input', 'change', ...CARBON_CHANGE_EVENTS].forEach(type => {
      this.addEventListener(type, handler);
    });
  }

  /**
   * Remonte depuis l'événement jusqu'à l'élément Carbon (ou natif) portant
   * l'attribut `name`. Utilise `e.target` d'abord (déjà retargeté par le
   * shadow DOM des composants Carbon), puis `composedPath()` en repli.
   * Le filtre `this.contains(node)` garantit qu'on ne remonte pas au-delà
   * du formulaire (par exemple vers un <cds-text-input> extérieur).
   */
  #controlDepuisEvent(e) {
    const cible = e.target;
    if (cible instanceof Element && cible.hasAttribute?.('name') && this.contains(cible)) {
      return cible;
    }

    const path = e.composedPath?.() || [];
    for (const node of path) {
      if (node instanceof Element && node.hasAttribute?.('name') && this.contains(node)) {
        return node;
      }
    }
    return null;
  }

  #emitChange(control) {
    const name = control.getAttribute('name');
    if (!name) return;
    this.dispatchEvent(new CustomEvent('codex-form-change', {
      detail: {
        name,
        value: this.#lireValeur(control),
        control
      },
      bubbles: true,
      composed: true
    }));
  }

  // =============================================================
  // Snapshot des valeurs initiales
  // =============================================================

  #snapshotInitialValues() {
    this.#initialValues.clear();
    this.querySelectorAll('[name]').forEach(control => {
      const name = control.getAttribute('name');
      if (!name) return;
      this.#initialValues.set(name, this.#lireValeur(control));
    });
  }
}

if (!customElements.get('codex-form')) {
  customElements.define('codex-form', CodexForm);
}