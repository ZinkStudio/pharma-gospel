import { BaseView } from '../../core/base-view.js';
import '../../components/ui/pdf/codex-pdf-preview.js';
import { parseGS1 } from '../../utils/gs1-parser.js';
import { PDFService } from '../../services/pdf/pdf-service.js';
import { GRIPPE_610D_LAYOUT } from '../../services/pdf/presets/grippe-610d.js';
import { VACCINS_LIST } from './data/vaccins.js';
import { TamponGenerator } from '../../utils/tampon-generator.js';
import { TAMPON_OFFICINE, SIGNATURE_URL } from '../../config/officine.js';

const TEMPLATES = {
  standard: './views/grippe/pdf/610d.pdf',
  ald: './views/grippe/pdf/610d-ALD.pdf'
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

      const firstEmpty = ['lot', 'specialite'].find((n) => !this.#form.getValue(n));
      if (firstEmpty) this.#form.focusField(firstEmpty);
    });

    modal.addEventListener('smart-fill-cancelled', () => { });
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
      nom, prenom, dateNaissance, immatriculation, codeOrganisme,
      specialite, lot, avecInjection, isAld
    } = values;

    try {
      this.notify.info('Génération du bon de prise en charge...');

      // 1. Choix du PDF de base UNIQUEMENT selon l'ALD
      const templateUrl = isAld ? TEMPLATES.ald : TEMPLATES.standard;

      // 2. Nom du fichier final
      let filename = isAld ? 'bon-grippe-ALD.pdf' : 'bon-grippe.pdf';
      if (avecInjection) {
        filename = filename.replace('.pdf', '-avec-injection.pdf');
      }

      const dateJour = new Date().toLocaleDateString('fr-FR');

      // 3. Données pour le Volet 1 (toujours rempli)
      const overlay = {
        specialite: specialite.trim(),
        dateDelivrance: dateJour,
        lot: lot.trim()
      };

      // 4. Données pour le Volet 2 (uniquement si injection)
      if (avecInjection === true) {
        overlay.dateExecution = dateJour;
      }

      const data = {
        acroForm: {
          'N° immat': immatriculation.replace(/\s/g, ''),
          'Bénéficiaire': `${nom.toUpperCase()} ${prenom}`,
          'Date': dateNaissance || '',
          'Code organisme': (codeOrganisme || '').replace(/\s/g, '')
        },
        overlay
      };

      // 5. Génération du PDF de base
      const { blob: baseBlob } = await PDFService.fillAndOverlay(
        templateUrl,
        data,
        GRIPPE_610D_LAYOUT,
        { action: 'none' }
      );

      // 6. Apposition des tampons
      const pdfBytes = await baseBlob.arrayBuffer();
      const finalBlob = await this.#apposerTampon(pdfBytes, avecInjection);

      // 7. Affichage
      this.#preview?.setPdfBlob(finalBlob, filename);
      this.querySelector('#previewContainer')?.classList.remove('hidden');
      this.querySelector('#previewContainer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      this.notify.success('Bon de prise en charge généré.');
    } catch (err) {
      console.error('[CodexDocGrippe] Erreur génération PDF :', err);
      this.notify.error('Erreur lors de la génération : ' + (err.message || 'inconnue'));
    }
  }

  // =============================================================
  // Gestion du Tampon (Canvas + Image + PDF-lib)
  // =============================================================

  async #apposerTampon(pdfBytes, avecInjection) {
    // 1. On génère l'image du tampon via notre service
    // Ici on veut tout inclure, on peut donc passer uniquement les données.
    const stampDataUrl = await TamponGenerator.generer(TAMPON_OFFICINE, {
      include: ['pharmacien','finess'],
      signatureUrl: SIGNATURE_URL
    });

    // 2. On l'appose sur le PDF
    const { blob } = await PDFService.modify(pdfBytes, async (pdfDoc) => {
      const pngImage = await pdfDoc.embedPng(stampDataUrl);
      const firstPage = pdfDoc.getPages()[0];

      const stampHaut = GRIPPE_610D_LAYOUT.stamps.pharmacien;
      const stampBas = GRIPPE_610D_LAYOUT.stamps.infirmier;

      firstPage.drawImage(pngImage, stampHaut);

      if (avecInjection) {
        firstPage.drawImage(pngImage, stampBas);
      }
    }, { action: 'none' });

    return blob;
  }

  // =============================================================
  // Actions barre d'outils preview
  // =============================================================

  #setupPreviewActions() {
    const preview = this.querySelector('#pdfPreview');
    if (!preview) return;
    // Hook prêt pour de futures interactions
  }
}

if (!customElements.get('codex-doc-grippe')) {
  customElements.define('codex-doc-grippe', CodexDocGrippe);
}