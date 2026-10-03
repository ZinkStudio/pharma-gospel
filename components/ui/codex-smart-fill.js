import { html, css, BaseLit } from '/lit';
import { smartFillService } from '../../services/smart-fill/smart-fill-service.js';

/**
 * Modal d'import intelligent — capture OCR ou copie texte d'un logiciel
 * de gestion pharmaceutique → extraction des champs patient → validation
 * utilisateur → émission des valeurs pour pré-remplissage.
 *
 * Attributs :
 *   profile-id   — id du profile (ex. "grippe")
 *   parser-id    — optionnel, force un parser précis
 *
 * Événements émis (bubbles + composed) :
 *   smart-fill-validated  detail: { fields: { nom, prenom, ... } }
 *   smart-fill-cancelled  detail: {}
 */
export class CodexSmartFill extends BaseLit {
  static properties = {
    profileId: { type: String, attribute: 'profile-id' },
    parserId: { type: String, attribute: 'parser-id' },

    _open: { state: true },
    _step: { state: true },        // 'paste' | 'review'
    _text: { state: true },
    _fields: { state: true },
    _confidence: { state: true },
    _error: { state: true },
    _parserLabel: { state: true },
    _captureCountdown: { state: true },
  };

  static styles = css`
    :host { display: contents; }

    dialog {
      padding: 0;
      border: none;
      border-radius: 4px;
      width: min(720px, 92vw);
      max-height: 90vh;
      font-family: 'IBM Plex Sans', system-ui, sans-serif;
      color: var(--cds-text-primary, #161616);
      background: var(--cds-layer, #fff);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
    }
    dialog::backdrop {
      background: rgba(22, 22, 22, 0.5);
    }

    .modal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--cds-border-subtle, #e0e0e0);
    }
    .modal-head h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }
    .modal-head button {
      background: transparent;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      color: var(--cds-icon-primary, #161616);
    }
    .modal-head button:hover { background: var(--cds-layer-hover, #e8e8e8); }

    .modal-body {
      padding: 1.25rem;
      overflow-y: auto;
      max-height: 60vh;
    }

    .modal-foot {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border-top: 1px solid var(--cds-border-subtle, #e0e0e0);
      background: var(--cds-layer-accent, #f4f4f4);
    }

    /* --- Étape paste --- */
    .instructions {
      font-size: 0.9rem;
      color: var(--cds-text-secondary, #525252);
      line-height: 1.5;
      margin: 0 0 1rem 0;
    }
    .instructions ol {
      margin: 0.5rem 0 0 0;
      padding-left: 1.25rem;
    }
    .instructions li + li { margin-top: 0.25rem; }

    textarea {
      width: 100%;
      min-height: 180px;
      padding: 0.75rem;
      border: 1px solid var(--cds-border-strong, #8d8d8d);
      border-radius: 0;
      background: var(--cds-field, #fff);
      color: var(--cds-text-primary, #161616);
      font-family: 'IBM Plex Mono', ui-monospace, monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      resize: vertical;
      box-sizing: border-box;
    }
    textarea:focus {
      outline: 2px solid var(--cds-focus, #0f62fe);
      outline-offset: -2px;
    }

    .paste-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }
    .link-btn {
      background: transparent;
      border: none;
      color: var(--cds-link-primary, #0f62fe);
      cursor: pointer;
      font-size: 0.85rem;
      padding: 0.25rem 0;
      text-decoration: underline;
    }
    .link-btn:hover { text-decoration: none; }

    /* --- Étape review --- */
    .detected {
      display: inline-block;
      margin-bottom: 1rem;
      padding: 0.25rem 0.6rem;
      font-size: 0.75rem;
      background: var(--cds-layer-accent, #f4f4f4);
      border: 1px solid var(--cds-border-subtle, #e0e0e0);
      color: var(--cds-text-secondary, #525252);
    }

    .fields-table {
      width: 100%;
      border-collapse: collapse;
    }
    .fields-table tr {
      border-bottom: 1px solid var(--cds-border-subtle, #e0e0e0);
    }
    .fields-table tr:last-child { border-bottom: none; }
    .fields-table td {
      padding: 0.5rem 0.25rem;
      vertical-align: middle;
    }
    .fields-table td:first-child {
      width: 30%;
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--cds-text-secondary, #525252);
    }
    .fields-table td:last-child {
      width: 40px;
      text-align: center;
      font-size: 1.1rem;
    }

    .fields-table input {
      width: 100%;
      padding: 0.5rem 0.6rem;
      border: none;
      border-bottom: 1px solid var(--cds-border-strong, #8d8d8d);
      background: var(--cds-field, #fff);
      color: var(--cds-text-primary, #161616);
      font-family: inherit;
      font-size: 0.95rem;
      box-sizing: border-box;
    }
    .fields-table input:focus {
      outline: 2px solid var(--cds-focus, #0f62fe);
      outline-offset: -2px;
    }

    .conf-ok   { color: var(--cds-support-success, #24a148); }
    .conf-warn { color: var(--cds-support-warning, #f1c21b); }
    .conf-bad  { color: var(--cds-support-error, #da1e28); }

    .error-msg {
      padding: 0.75rem 1rem;
      margin-top: 0.5rem;
      background: color-mix(in srgb, var(--cds-support-error, #da1e28) 10%, transparent);
      border-left: 3px solid var(--cds-support-error, #da1e28);
      color: var(--cds-text-primary, #161616);
      font-size: 0.85rem;
    }
  `;

  constructor() {
    super();
    this.profileId = '';
    this.parserId = '';
    this._open = false;
    this._step = 'paste';
    this._text = '';
    this._fields = {};
    this._confidence = {};
    this._error = '';
    this._parserLabel = '';
    this._captureCountdown = 0;
  }

  // =============================================================
  // API publique
  // =============================================================

  show() {
    this._reset();
    this._open = true;
    // Focus le textarea après le rendu
    this.updateComplete.then(() => {
      this.renderRoot.querySelector('textarea')?.focus();
    });
  }

  hide() {
    this._open = false;
  }

  // =============================================================
  // Cycle de vie
  // =============================================================

  updated(changed) {
    if (changed.has('_open')) {
      const dlg = this.renderRoot.querySelector('dialog');
      if (!dlg) return;
      if (this._open && !dlg.open) dlg.showModal();
      if (!this._open && dlg.open) dlg.close();
    }
  }

  // =============================================================
  // Rendu
  // =============================================================

  render() {
    return html`
      <dialog @close=${this._onDialogClose} @cancel=${this._onDialogClose}>
        <div class="modal-head">
          <h2>📋 Remplissage automatique</h2>
          <button type="button" @click=${this._close} aria-label="Fermer">✕</button>
        </div>

        <div class="modal-body">
          ${this._step === 'paste' ? this._renderPaste() : this._renderReview()}
        </div>

        <div class="modal-foot">
          ${this._step === 'paste' ? html`
            <cds-button kind="ghost" @click=${this._close}>Annuler</cds-button>
          ` : html`
            <cds-button kind="ghost" @click=${this._backToPaste}>← Retour</cds-button>
            <cds-button kind="primary" @click=${this._validate}>Remplir le formulaire</cds-button>
          `}
        </div>
      </dialog>
    `;
  }

  _renderPaste() {
    return html`
      <p class="instructions">
        Copiez les informations patient depuis votre logiciel, puis collez-les ci-dessous.
        <ol>
          <li>Dans LGPI, sélectionnez la zone patient <strong>ou</strong> utilisez l'outil capture
            (<kbd>Win</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>) puis « Copier tout le texte ».</li>
          <li>Revenez sur cette page et collez ici avec <kbd>Ctrl</kbd>+<kbd>V</kbd>.</li>
        </ol>
      </p>

      <textarea
        .value=${this._text}
        @input=${this._onTextInput}
        placeholder="Collez ici les données patient (Ctrl+V)…"
        spellcheck="false"></textarea>

      ${this._error ? html`<div class="error-msg">${this._error}</div>` : ''}

      <div class="paste-actions">
        <button
          type="button"
          class="link-btn"
          @click=${this._openCaptureTool}
          ?disabled=${this._captureCountdown > 0}>
          ${this._captureCountdown > 0
              ? html`📷 Basculez sur LGPI… ${this._captureCountdown}`
              : html`📷 Ouvrir l'outil capture`}
        </button>
      </div>
    `;
  }

  _renderReview() {
    if (!this._fields) return '';

    const labelFor = {
      nom: 'Nom',
      prenom: 'Prénom',
      dateNaissance: 'Date de naissance',
      immatriculation: 'N° d\'immatriculation (NIR)',
      codeOrganisme: 'Code organisme',
    };

    const visible = Object.keys(labelFor).filter((k) => k in this._fields);

    return html`
      <span class="detected">Source détectée : ${this._parserLabel}</span>

      <table class="fields-table">
        <tbody>
          ${visible.map((key) => html`
            <tr>
              <td>${labelFor[key]}</td>
              <td>
                <input
                  type="text"
                  data-field=${key}
                  .value=${this._fields[key] || ''}
                  @input=${(e) => this._onFieldInput(key, e.target.value)}>
              </td>
              <td>${this._renderConfidence(this._confidence[key])}</td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  _renderConfidence(score) {
    if (typeof score !== 'number') return '';
    if (score >= 0.9) return html`<span class="conf-ok" title="Extraction fiable">✓</span>`;
    if (score >= 0.6) return html`<span class="conf-warn" title="À vérifier">⚠</span>`;
    return html`<span class="conf-bad" title="Peu fiable">✗</span>`;
  }

  // =============================================================
  // Handlers
  // =============================================================

  _onTextInput = (e) => {
    this._text = e.target.value;
    this._analyze();
  };

  _analyze() {
    const text = this._text;
    if (!text.trim()) {
      this._error = '';
      this._fields = {};
      this._step = 'paste';
      return;
    }

    const result = smartFillService.analyze(text, this.parserId || null);

    if (!result.ok) {
      this._error = result.error;
      this._fields = {};
      this._step = 'paste';
      return;
    }

    // Filtre : on ne garde que les champs non-vides
    const fields = {};
    for (const [k, v] of Object.entries(result.fields)) {
      if (k.startsWith('_')) continue;
      if (v != null && v !== '') fields[k] = v;
    }

    if (!Object.keys(fields).length) {
      this._error = 'Aucun champ exploitable détecté. Vérifiez que la capture est complète.';
      this._fields = {};
      this._step = 'paste';
      return;
    }

    this._fields = fields;
    this._confidence = result.fields._confidence || {};
    this._parserLabel = result.parserLabel;
    this._error = '';
    this._step = 'review';
  }

  _onFieldInput(key, value) {
    this._fields = { ...this._fields, [key]: value };
  }

  _backToPaste = () => {
    this._step = 'paste';
    this._error = '';
    this.updateComplete.then(() => {
      this.renderRoot.querySelector('textarea')?.focus();
    });
  };

  _validate = () => {
    const profile = smartFillService.getProfile(this.profileId);
    const mapped = profile
      ? profile.mapToForm(this._fields)
      : this._fields;

    this.dispatchEvent(new CustomEvent('smart-fill-validated', {
      detail: { fields: mapped },
      bubbles: true,
      composed: true
    }));

    this._close();
  };

  _close = () => {
    this._open = false;
    this.dispatchEvent(new CustomEvent('smart-fill-cancelled', {
      bubbles: true,
      composed: true
    }));
  };

  _onDialogClose = () => {
    // Échap ou clic en dehors — on ferme proprement
    if (this._open) this._close();
  };

  _openCaptureTool = () => {
    if (this._captureCountdown > 0) return; // déjà en cours

    const DELAY = 3;
    this._captureCountdown = DELAY;

    const tick = () => {
      this._captureCountdown--;
      if (this._captureCountdown <= 0) {
        this._captureCountdown = 0;
        try {
          window.location.href = 'ms-screenclip:';
        } catch (err) {
          console.warn('[SmartFill] Impossible d\'ouvrir l\'outil capture :', err);
        }
        return;
      }
      setTimeout(tick, 1000);
    };

    setTimeout(tick, 1000);
  };

  _reset() {
    this._step = 'paste';
    this._text = '';
    this._fields = {};
    this._confidence = {};
    this._error = '';
    this._parserLabel = '';
  }
}

if (!customElements.get('codex-smart-fill')) {
  customElements.define('codex-smart-fill', CodexSmartFill);
}