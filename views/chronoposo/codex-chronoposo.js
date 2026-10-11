import { BaseView } from '../../core/base-view.js';
import { PDFService } from '../../services/pdf/pdf-service.js';
import { ChronoposoAssistant } from '../../assistants/chronoposo.js';

// =============================================================
// Composant
// =============================================================

export class CodexChronoposo extends BaseView {
  #dropzone = null;
  #stepper = null;
  #formDates = null;
  #preview = null;

  /** État : fichier source + dateProduit pour la régénération. */
  #sourceBytes = null;
  #sourceFilename = null;

  onReady() {
    this.#dropzone = this.querySelector('#chronoposo-dropzone');
    this.#stepper = this.querySelector('#chronoposo-stepper');
    this.#formDates = this.querySelector('#formDates');
    this.#preview = this.querySelector('#chronoposo-preview');

    // Import
    this.addEventListener('files-captured', (e) => {
      const file = e.detail?.file;
      if (file) this.#onFileSelected(file);
    });

    this.#dropzone?.addEventListener('preview-cleared', () => this.#resetAll());

    // Navigation
    this.querySelector('#chronoposo-btn-to-step2')?.addEventListener('click', () => this.#goToStep(2));
    this.querySelector('#chronoposo-btn-back-to-1')?.addEventListener('click', () => this.#goToStep(1));
    this.querySelector('#chronoposo-btn-restart')?.addEventListener('click', () => this.#resetAll());

    // Formulaire
    this.#formDates?.addEventListener('codex-form-submit', (e) => this.#onDatesSubmit(e.detail));
    this.#formDates?.addEventListener('codex-form-invalid', (e) => this.#onInvalid(e.detail));

    this.#goToStep(1);
  }

  // =============================================================
  // Import
  // =============================================================

  async #onFileSelected(file) {
    // Contrôle du type (défense en profondeur — la dropzone filtre déjà)
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
    if (!isPdf) {
      this.notify.error('Seuls les fichiers PDF sont acceptés.');
      return;
    }

    try {
      this.#sourceBytes = new Uint8Array(await file.arrayBuffer());
      this.#sourceFilename = file.name.replace(/\.pdf$/i, '');

      // Passe la dropzone en preview (miniature + nom)
      this.#dropzone.previewSrc = this.#svgPdfIcon();
      this.#dropzone.previewName = file.name;
      this.#dropzone.previewDetails = `${Math.round(file.size / 1024)} Ko`;
      this.#dropzone.state = 'preview';

      // Active le bouton Continuer
      const btn = this.querySelector('#chronoposo-btn-to-step2');
      if (btn) btn.disabled = false;

      this.notify.success('Fichier chargé.');
    } catch (err) {
      console.error('[CodexChronoposo] Erreur lecture fichier :', err);
      this.notify.error('Impossible de lire le fichier.');
    }
  }

  /**
   * Petite icône PDF inline — évite un asset à déployer.
   * Réutilise le dataURI du dropzone d'endossaire.
   */
  #svgPdfIcon() {
    return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>" +
      "<path fill='%23d32f2f' d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z'/></svg>";
  }

  // =============================================================
  // Navigation entre étapes
  // =============================================================

  #goToStep(n) {
    [1, 2, 3].forEach((i) => {
      const panel = this.querySelector(`#chronoposo-panel-${i}`);
      if (panel) panel.hidden = (i !== n);
    });

    this.#stepper?.setAttribute('data-step', String(n));
    this.#stepper?.querySelectorAll('.step').forEach((li) => {
      const step = parseInt(li.dataset.step, 10);
      li.classList.toggle('is-done',   step < n);
      li.classList.toggle('is-active', step === n);
    });
  }

  // =============================================================
  // Soumission du formulaire des dates
  // =============================================================

  #onInvalid({ invalidFields }) {
    this.notify.warning(`Champs manquants : ${invalidFields.join(', ')}`);
    this.#formDates.focusField(invalidFields[0]);
  }

  async #onDatesSubmit({ values, isValid }) {
    if (!isValid) return;
    if (!this.#sourceBytes) {
      this.notify.error('Aucun fichier source en mémoire.');
      return;
    }

    const dateProductionIso = values.dateProduction || null;
    const dateDebutIso = values.dateDebut;
    const dateFinIso = values.dateFin;

    // Contrôle logique : fin >= début
    if (new Date(dateFinIso) < new Date(dateDebutIso)) {
      this.notify.error('La date de fin doit être après la date de début.');
      return;
    }

    // Conversion ISO (input type=date) → FR (attendu par l'assistant)
    const dateProduction = dateProductionIso ? this.#isoToFr(dateProductionIso) : null;
    const dateDebut = this.#isoToFr(dateDebutIso);
    const dateFin = this.#isoToFr(dateFinIso);

    try {
      this.notify.info('Modification du PDF...');

      const filename = `${this.#sourceFilename}-modifie.pdf`;

      const { blob } = await PDFService.modify(
        this.#sourceBytes,
        async (pdfDoc) => {
          await ChronoposoAssistant.modifyDates(pdfDoc, null, dateProduction, dateDebut, dateFin);
          // L'assistant mute pdfDoc, pas besoin de retourner
        },
        { action: 'none', filename }
      );

      // Résumé
      this.querySelector('#chronoposo-preview-production').textContent = dateProduction || '(non modifiée)';
      this.querySelector('#chronoposo-preview-debut').textContent = dateDebut;
      this.querySelector('#chronoposo-preview-fin').textContent = dateFin;

      // Preview PDF (avec boutons Télécharger/Imprimer intégrés)
      this.#preview?.setPdfBlob(blob, filename);

      this.#goToStep(3);
      this.notify.success('Dates modifiées.');
    } catch (err) {
      console.error('[CodexChronoposo] Erreur :', err);
      this.notify.error('Erreur : ' + (err.message || 'inconnue'));
    }
  }

  // =============================================================
  // Reset
  // =============================================================

  #resetAll() {
    this.#sourceBytes = null;
    this.#sourceFilename = null;

    this.#dropzone?.clearPreview({ silent: true });
    this.#formDates?.reset();

    const btn = this.querySelector('#chronoposo-btn-to-step2');
    if (btn) btn.disabled = true;

    this.#goToStep(1);
  }

  // =============================================================
  // Utilitaires
  // =============================================================

  /** ISO (AAAA-MM-JJ) → FR (JJ/MM/AAAA). */
  #isoToFr(iso) {
    if (!iso || typeof iso !== 'string') return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return '';
    return `${d}/${m}/${y}`;
  }
}

if (!customElements.get('codex-chronoposo')) {
  customElements.define('codex-chronoposo', CodexChronoposo);
}