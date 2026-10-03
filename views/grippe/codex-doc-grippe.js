import { BaseView } from '../../core/base-view.js';
import '../../components/ui/pdf/codex-pdf-preview.js';
import { parseGS1 } from '../../utils/gs1-parser.js';
import { PDFService } from '../../services/pdf/pdf-service.js';
import { GRIPPE_610D_LAYOUT } from '../../services/pdf/presets/grippe-610d.js';
import { VACCINS_LIST } from './data/vaccins.js';

const TEMPLATES = {
  standard: './views/grippe/pdf/610d.pdf',
  injection: './views/grippe/pdf/610d-injection.pdf'
};

export class CodexDocGrippe extends BaseView {
  #form = null;
  #preview = null;

  onReady() {
    this.#form = this.querySelector('#formGrippe');
    this.#preview = this.querySelector('#pdfPreview');

    if (!this.#form) {
      console.warn('[CodexDocGrippe] <codex-form id="formGrippe"> introuvable.');
      return;
    }

    this.#form.addEventListener('codex-form-submit', (e) => this.#handleFormSubmit(e.detail));
    this.#form.addEventListener('codex-form-invalid', (e) => this.#handleFormInvalid(e.detail));

    this.#setupDataMatrixScanner();
    this.#setupSmartFill();
    this.#setupPreviewActions();
  }

  // =============================================================
  // Scan DataMatrix
  // =============================================================

  #setupDataMatrixScanner() {
    const scanInput = this.querySelector('[name="datamatrix"]');
    if (!scanInput) return;

    const triggerScan = () => this.#handleDatamatrixScan(this.#form.getValue('datamatrix'));

    scanInput.addEventListener('change', triggerScan);
    scanInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerScan();
      }
    });
  }

  #handleDatamatrixScan(gs1Code) {
    const rawCode = (gs1Code || '').trim();
    if (!rawCode) return;

    const feedbackEl = this.querySelector('#datamatrix-feedback');
    const result = parseGS1(rawCode);

    if (!result || (!result.cip && !result.lot)) {
      if (feedbackEl) {
        feedbackEl.className = 'scan-feedback error';
        feedbackEl.textContent = '❌ Format GS1 DataMatrix non reconnu';
      }
      this.notify.error('Format DataMatrix invalide');
      return;
    }

    if (result.lot) this.#form.setValue('lot', result.lot);

    const vaccin = result.cip
      ? VACCINS_LIST.find(v => v.code_cip === result.cip)
      : null;

    if (vaccin) {
      const optionSpecialite = this.#trouverOptionSpecialite(vaccin);
      if (optionSpecialite) this.#form.setValue('specialite', optionSpecialite);

      if (feedbackEl) {
        feedbackEl.className = 'scan-feedback success';
        feedbackEl.textContent = `✅ ${vaccin.denomination} — Lot : ${result.lot || 'Non renseigné'}`;
      }
      this.notify.success(`Vaccin identifié : ${vaccin.denomination}`);
    } else {
      if (feedbackEl) {
        feedbackEl.className = 'scan-feedback warning';
        feedbackEl.textContent = `⚠️ CIP ${result.cip || 'inconnu'} — Lot : ${result.lot || 'N/A'}`;
      }
      this.notify.warning(`CIP ${result.cip || '?'} non répertorié.`);
    }
  }

  #trouverOptionSpecialite(vaccin) {
    const select = this.querySelector('[name="specialite"]');
    if (!select) return null;

    const valeurs = [...select.querySelectorAll('cds-select-item')]
      .map(o => o.getAttribute('value'))
      .filter(Boolean);

    const cible = (vaccin.denomination || '').toLowerCase();

    const exact = valeurs.find(v => v.toLowerCase() === cible);
    if (exact) return exact;

    const parPrefixe = valeurs.find(v => cible.startsWith(v.toLowerCase()));
    if (parPrefixe) return parPrefixe;

    const parInclusion = valeurs.find(v => v.toLowerCase().includes(cible));
    if (parInclusion) return parInclusion;

    console.warn(
      `[CodexDocGrippe] Aucune option ne correspond à « ${vaccin.denomination} ». ` +
      `Options disponibles : ${valeurs.join(', ')}.`
    );
    return null;
  }
  
  #setupSmartFill() {
    const modal = this.querySelector('#grippe-smart-fill');
    const btn = this.querySelector('#grippe-btn-smart-fill');

    if (!modal || !btn) return;

    btn.addEventListener('click', () => modal.show());

    modal.addEventListener('smart-fill-validated', (e) => {
      const { fields } = e.detail;
      if (!fields || !this.#form) return;

      Object.entries(fields).forEach(([name, value]) => {
        if (value) this.#form.setValue(name, value);
      });

      const nb = Object.values(fields).filter((v) => v).length;
      this.notify.success(`${nb} champ${nb > 1 ? 's' : ''} pré-rempli${nb > 1 ? 's' : ''} depuis LGPI.`);

      // Focus le premier champ non rempli restant (lot, spécialité…)
      const firstEmpty = ['lot', 'specialite'].find((n) => !this.#form.getValue(n));
      if (firstEmpty) this.#form.focusField(firstEmpty);
    });

    modal.addEventListener('smart-fill-cancelled', () => {
      // Silencieux — l'utilisateur a juste fermé la modal
    });
  }
  // =============================================================
  // Soumission
  // =============================================================

  #handleFormInvalid({ invalidFields }) {
    this.notify.warning(`Champs manquants ou invalides : ${invalidFields.join(', ')}`);
    this.#form.focusField(invalidFields[0]);
  }

  async #handleFormSubmit({ values, isValid }) {
    if (!isValid) return;

    const {
      nom,
      prenom,
      dateNaissance,
      immatriculation,
      codeOrganisme,
      specialite,
      lot,
      avecInjection
    } = values;

    try {
      this.notify.info('Génération du bon de prise en charge...');

      const templateUrl = avecInjection === true
        ? TEMPLATES.injection
        : TEMPLATES.standard;

      const filename = avecInjection
        ? 'bon-grippe-injection.pdf'
        : 'bon-grippe.pdf';

      const dateJour = new Date().toLocaleDateString('fr-FR');

      // =========================================================
      // Répartition hybride
      //   1. acroForm : champs intégrés au PDF (remplissage natif)
      //   2. overlay  : champs dessinés (positions du preset)
      // =========================================================

      // Le Volet 2 reçoit TOUJOURS le lot (le vaccin délivré doit être
      // identifiable, même si l'injection est différée). En revanche la
      // date d'exécution n'est écrite que si la case "avec injection" est
      // cochée — sinon un autre praticien complètera le bon plus tard.
      const overlay = {
        specialite: specialite.trim(),
        dateDelivrance: dateJour,
        lot: lot.trim()
      };

      if (avecInjection === true) {
        overlay.dateExecution = dateJour;
      }

      const data = {
        acroForm: {
          'N° immat': immatriculation.replace(/\s/g, ''),
          'Bénéficiaire': `${nom.toUpperCase()} ${prenom}`,
          'Date': dateNaissance || '',
          'Code organisme': (codeOrganisme || '').replace(/\s/g, '')
          // 'Expéditeur Caisse' : laissé vide — la caisse traitante le remplit
        },
        overlay
      };

      const { blob } = await PDFService.fillAndOverlay(
        templateUrl,
        data,
        GRIPPE_610D_LAYOUT,
        { action: 'preview', filename }
      );

      this.#preview?.setPdfBlob(blob, filename);
      this.querySelector('#previewContainer')?.classList.remove('hidden');
      this.querySelector('#previewContainer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      this.notify.success('Bon de prise en charge généré.');
    } catch (err) {
      console.error('[CodexDocGrippe] Erreur génération PDF :', err);
      this.notify.error('Erreur lors de la génération : ' + (err.message || 'inconnue'));
    }
  }

  // =============================================================
  // Actions barre d'outils preview
  // =============================================================

  #setupPreviewActions() {
    const preview = this.querySelector('#pdfPreview');
    if (!preview) return;

    // Les boutons Télécharger / Imprimer sont internes à <codex-pdf-preview>.
    // On n'a rien à faire ici — l'élément gère ses propres actions.
    // Ce hook existe pour de futures interactions (par ex. log, analytics).
  }
}

if (!customElements.get('codex-doc-grippe')) {
  customElements.define('codex-doc-grippe', CodexDocGrippe);
}