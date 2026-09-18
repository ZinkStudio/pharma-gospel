import { BaseComponent } from '../../core/base-component.js';
import { parseGS1 } from '../../utils/gs1-parser.js';
import { PDFService } from '../../services/pdf/pdf-service.js';
import { VACCINS_LIST } from './data/vaccins.js';

export class CodexDocGrippe extends BaseComponent {
  #currentBlobUrl = null;

  onReady() {
    this.#setupForm();
    this.#setupDataMatrixScanner();
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    // Nettoyage de l'URL Blob pour éviter les fuites mémoire
    if (this.#currentBlobUrl) {
      URL.revokeObjectURL(this.#currentBlobUrl);
    }
  }

  #setupForm() {
    const form = this.$('#formGrippe');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const values = Object.fromEntries(formData.entries());

      const checkbox = this.$('[name="avecInjection"]');
      if (checkbox) {
        values.avecInjection = checkbox.hasAttribute('checked') || checkbox.checked;
      }

      await this.#handleFormSubmit(values);
    });
  }

  #setupDataMatrixScanner() {
    const scanInput = this.$('[name="datamatrix"]');
    if (!scanInput) return;

    const triggerScan = () => this.#handleDatamatrixScan(scanInput.value);

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

    const feedbackEl = this.$('#datamatrix-feedback');
    const lotInput = this.$('[name="lot"]');
    const specialiteSelect = this.$('[name="specialite"]');

    const result = parseGS1(rawCode);

    if (result && (result.cip || result.lot)) {
      if (lotInput && result.lot) lotInput.value = result.lot;

      const cip13 = result.cip;
      const vaccin = VACCINS_LIST.find(v => v.code_cip === cip13);

      if (vaccin) {
        if (specialiteSelect) specialiteSelect.value = vaccin.denomination;
        if (feedbackEl) {
          feedbackEl.className = 'scan-feedback success';
          feedbackEl.innerHTML = `✅ <strong>${vaccin.denomination}</strong> — Lot: ${result.lot || 'Non renseigné'}`;
        }
        this.notify.success(`Vaccin identifié : ${vaccin.denomination}`);
      } else {
        if (feedbackEl) {
          feedbackEl.className = 'scan-feedback warning';
          feedbackEl.innerHTML = `⚠️ CIP ${cip13 || 'Inconnu'} — Lot: ${result.lot || 'N/A'}`;
        }
        this.notify.warning(`CIP ${cip13} non répertorié.`);
      }
    } else {
      if (feedbackEl) {
        feedbackEl.className = 'scan-feedback error';
        feedbackEl.innerHTML = '❌ Format GS1 DataMatrix non reconnu';
      }
      this.notify.error('Format DataMatrix invalide');
    }
  }

  async #handleFormSubmit(values) {
    const nom = (values.nom || '').trim();
    const prenom = (values.prenom || '').trim();
    const immatriculation = (values.immatriculation || '').replace(/\s/g, '');
    const codeOrganisme = (values.codeOrganisme || '').replace(/\s/g, '');
    const specialite = (values.specialite || '').trim();
    const lot = (values.lot || '').trim();

    if (!nom || !prenom || !immatriculation || !specialite || !lot) {
      this.notify.warning('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      this.notify.info('Génération du bon de prise en charge...');

      const docDefinition = this.#buildPdfDefinition({
        nom,
        prenom,
        dateNaissance: values.dateNaissance || '',
        immatriculation,
        codeOrganisme,
        specialite,
        lot,
        avecInjection: values.avecInjection === true || values.avecInjection === 'on',
        dateJour: new Date().toLocaleDateString('fr-FR')
      });

      // Génération centralisée via PDFService
      const { blobUrl } = await PDFService.generateDocument(docDefinition, { action: 'preview' });

      // Révocation de l'ancienne URL Blob le cas échéant
      if (this.#currentBlobUrl) {
        URL.revokeObjectURL(this.#currentBlobUrl);
      }
      this.#currentBlobUrl = blobUrl;

      const previewContainer = this.$('#previewContainer');
      const previewIframe = this.$('#pdfPreview');

      if (previewContainer && previewIframe) {
        previewIframe.src = blobUrl;
        previewContainer.classList.remove('hidden');
        previewContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      this.notify.success('Bon de prise en charge généré !');

    } catch (err) {
      console.error('[CodexDocGrippe] Erreur génération PDF :', err);
      this.notify.error('Erreur lors de la génération du document PDF.');
    }
  }

  #buildPdfDefinition(data) {
    return {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      content: [
        { text: 'BON DE PRISE EN CHARGE - VACCINATION ANTI-GRIPPALE', style: 'header' },
        { text: `Date d'émission : ${data.dateJour}`, style: 'subheader' },
        
        { text: 'Volet 1 - Délivrance en pharmacie', style: 'sectionTitle' },
        {
          table: {
            widths: ['35%', '65%'],
            body: [
              ['Bénéficiaire', `${data.nom.toUpperCase()} ${data.prenom}`],
              ['Date de naissance', data.dateNaissance || '-'],
              ['N° Immatriculation', data.immatriculation],
              ['Code Organisme', data.codeOrganisme || '-'],
              ['Spécialité délivrée', data.specialite],
              ['N° de Lot', data.lot]
            ]
          },
          layout: 'lightHorizontalLines'
        },

        ...(data.avecInjection ? [
          { text: 'Volet 2 - Prise en charge de l\'injection', style: 'sectionTitle', margin: [0, 20, 0, 10] },
          {
            table: {
              widths: ['35%', '65%'],
              body: [
                ['Date d\'exécution', data.dateJour],
                ['Vaccin & Lot', `${data.specialite} (Lot: ${data.lot})`],
                ['Statut Injection', 'Réalisée en officine sans prescription préalable']
              ]
            },
            layout: 'lightHorizontalLines'
          }
        ] : [])
      ],
      styles: {
        header: { fontSize: 13, bold: true, color: '#006D44', alignment: 'center', margin: [0, 0, 0, 4] },
        subheader: { fontSize: 9, italics: true, alignment: 'center', margin: [0, 0, 0, 15] },
        sectionTitle: { fontSize: 11, bold: true, color: '#006D44', margin: [0, 10, 0, 5] }
      }
    };
  }
}

if (!customElements.get('codex-doc-grippe')) {
  customElements.define('codex-doc-grippe', CodexDocGrippe);
}