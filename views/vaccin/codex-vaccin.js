import { BaseView } from '../../core/base-view.js';
import { initTodayInputs } from '../../utils/date-utils.js';
import { PDFService } from '../../services/pdf/pdf-service.js';
import { VACCIN_611_LAYOUT } from '../../services/pdf/presets/vaccin-611.js';
import { VACCINS_NOMS } from './data/vaccins.js';

const TEMPLATE = './views/vaccin/pdf/611.pdf';

export class CodexVaccin extends BaseView {
  #form = null;
  #preview = null;

  onReady() {
    initTodayInputs(this);
    this.#form = this.querySelector('#formVaccin');
    this.#preview = this.querySelector('#pdfPreview');

    if (!this.#form) {
      console.warn('[CodexVaccin] <codex-form id="formVaccin"> introuvable.');
      return;
    }

    this.#form.addEventListener('codex-form-submit', (e) => this.#onSubmit(e.detail));
    this.#form.addEventListener('codex-form-invalid', (e) => this.#onInvalid(e.detail));

    this.#setupVaccinDatalist();
    this.#setupSmartFill();
  }

  // =============================================================
  // Datalist : on branche la liste sur l'<input> interne de cds-text-input
  // =============================================================

  #setupVaccinDatalist() {
    const datalist = this.querySelector('#vaccins-list');
    if (!datalist) return;
    datalist.innerHTML = VACCINS_NOMS.map((n) => `<option value="${n}">`).join('');
  }

  // =============================================================
  // Smart-fill (profil "vaccin")
  // =============================================================

  #setupSmartFill() {
    const modal = this.querySelector('#vaccin-smart-fill');
    const btn = this.querySelector('#vaccin-btn-smart-fill');
    if (!modal || !btn) return;

    btn.addEventListener('click', () => modal.show());

    modal.addEventListener('smart-fill-validated', (e) => {
      const { fields } = e.detail;
      if (!fields) return;

      Object.entries(fields).forEach(([name, value]) => {
        if (!value) return;

        // Conversion FR → ISO pour les champs <input type="date">
        // (LGPI fournit "JJ/MM/AAAA", l'input date attend "AAAA-MM-JJ").
        if (name === 'dateNaissance') {
          const iso = this.#frToIso(value);
          if (iso) this.#form.setValue(name, iso);
          return;
        }

        this.#form.setValue(name, value);
      });

      const nb = Object.values(fields).filter(Boolean).length;
      this.notify.success(`${nb} champ${nb > 1 ? 's' : ''} pré-rempli${nb > 1 ? 's' : ''}.`);
    });
  }

  /**
   * Convertit une date "JJ/MM/AAAA" en "AAAA-MM-JJ".
   * Retourne null si le format est inattendu.
   */
  #frToIso(frDate) {
    const m = String(frDate).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  }

  // =============================================================
  // Soumission
  // =============================================================

  #onInvalid({ invalidFields }) {
    this.notify.warning(`Champs manquants ou invalides : ${invalidFields.join(', ')}`);
    this.#form.focusField(invalidFields[0]);
  }

  async #onSubmit({ values, isValid }) {
    if (!isValid) return;

    const {
      nom,
      prenom,
      dateNaissance,
      immatriculation,
      codeOrganisme,
      datePrescription,
      specialite
    } = values;

    try {
      this.notify.info('Génération du bon de prise en charge...');

      // Le 611 remplit des cases : format JJMMAAAA pour la date de naissance
      // et la date de prescription. Voir VACCIN_611_LAYOUT pour le détail.
      const toCompact = (isoDate) => {
        if (!isoDate) return '';
        // L'input type=date fournit toujours YYYY-MM-DD
        return isoDate.split('-').reverse().join('');
      };

      const fields = {
        immatriculation: immatriculation.replace(/\s/g, ''),
        beneficiaire: `${nom.toUpperCase()} ${prenom}`,
        dateNaissanceCompact: toCompact(dateNaissance),
        codeOrganisme: (codeOrganisme || '').replace(/\s/g, ''),
        specialite: specialite.trim(),
        datePrescriptionCompact: toCompact(datePrescription)
      };

      const filename = `bon_vaccin_${nom}_${prenom}.pdf`.replace(/\s+/g, '_');

      const { blob } = await PDFService.smartFill(
        TEMPLATE,
        fields,
        VACCIN_611_LAYOUT,
        { action: 'preview', filename }
      );

      this.#preview?.setPdfBlob(blob, filename);
      this.querySelector('#previewContainer')?.classList.remove('hidden');
      this.querySelector('#previewContainer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      this.notify.success('Bon de prise en charge généré.');
    } catch (err) {
      console.error('[CodexVaccin] Erreur génération :', err);
      this.notify.error('Erreur lors de la génération : ' + (err.message || 'inconnue'));
    }
  }
}

if (!customElements.get('codex-vaccin')) {
  customElements.define('codex-vaccin', CodexVaccin);
}