import { BaseView } from '../../core/base-view.js';
import '../../components/ui/pdf/codex-pdf-preview.js';
import { PDFService } from '../../services/pdf/pdf-service.js';
import { loadPdfJs } from '../../utils/pdfjs-loader.js';

// =============================================================
// Config
// =============================================================

const FILENAME_PATTERN = /^BL(\d{16})\.pdf$/i;
const COL_WIDTHS = [30, 110, '*', 70, 70];

// =============================================================
// Composant
// =============================================================

export class CodexPurificateur extends BaseView {
  #form = null;
  #addForm = null;
  #result = null;
  #preview = null;
  #manualList = null;

  /**
   * État persistant entre extractions et ajouts manuels.
   *   autoEntries    : productions extraites du BL source (ne changent pas)
   *   manualEntries  : productions ajoutées à la main (vides au départ)
   *   expectedCount  : valeur de contrôle lue dans le BL source
   *   bonNumber      : n° de BL issu du nom de fichier
   */
  #state = {
    bonNumber: null,
    expectedCount: null,
    autoEntries: [],
    manualEntries: [],
  };

  onReady() {
    this.#form = this.querySelector('#formPurificateur');
    this.#addForm = this.querySelector('#formAddProd');
    this.#result = this.querySelector('#purif-result');
    this.#preview = this.querySelector('#purif-preview');
    this.#manualList = this.querySelector('#purif-manual-list');

    if (!this.#form) {
      console.warn('[CodexPurificateur] <codex-form id="formPurificateur"> introuvable.');
      return;
    }

    this.#form.addEventListener('codex-form-submit', (e) => this.#onSubmit(e.detail));
    this.#form.addEventListener('codex-form-invalid', (e) => this.#onInvalid(e.detail));

    this.#addForm?.addEventListener('codex-form-submit', (e) => this.#onAddSubmit(e.detail));
    this.#addForm?.addEventListener('codex-form-invalid', (e) => this.#onInvalid(e.detail));
  }

  #onInvalid({ invalidFields }) {
    this.notify.warning(`Champs manquants ou invalides : ${invalidFields.join(', ')}`);
    this.#form.focusField(invalidFields[0]);
  }

  // =============================================================
  // Extraction initiale
  // =============================================================

  async #onSubmit({ isValid }) {
    if (!isValid) return;

    const fileInput = this.querySelector('#purif-file');
    const file = fileInput?.files?.[0];

    if (!file) {
      this.notify.warning('Sélectionnez un fichier PDF.');
      return;
    }

    const match = file.name.match(FILENAME_PATTERN);
    if (!match) {
      this.notify.error('Nom de fichier invalide. Format attendu : BLxxxxxxxxxxxxxxxx.pdf');
      return;
    }
    const bonNumber = match[1];

    try {
      this.notify.info('Extraction du contenu PDF...');

      const arrayBuffer = await file.arrayBuffer();
      const fullText = await this.#extraireTextePDF(arrayBuffer);

      const expectedCount = this.#extraireNombreProductions(fullText);
      const entries = this.#parserEntrees(fullText);

      if (!entries.length) {
        this.notify.error('Aucune production valide trouvée. Vérifiez le format du BL.');
        return;
      }

      this.notify.info(`${entries.length} production(s) extraite(s), génération du PDF...`);

      // Reset état + stockage initial
      this.#state = {
        bonNumber,
        expectedCount,
        autoEntries: entries,
        manualEntries: [],
      };

      await this.#regenerate();

      // Prépare le formulaire d'ajout (reset complet)
      this.#addForm?.reset();
      this.#renderManualList();

      fileInput.value = '';
      this.notify.success(`PDF épuré n°${bonNumber} généré.`);
    } catch (err) {
      console.error('[CodexPurificateur] Erreur :', err);
      this.notify.error(err.message || 'Erreur lors du traitement.');
    }
  }

  // =============================================================
  // Ajout manuel
  // =============================================================

  async #onAddSubmit({ values, isValid }) {
    if (!isValid) return;

    const id = String(values.id || '').trim();
    const name = String(values.patient || '').trim();
    const start = this.#isoToFr(values.start);
    const end = this.#isoToFr(values.end);

    // Double check des dates (le required natif peut passer à travers si value="")
    if (!start || !end) {
      this.notify.warning('Les dates de début et de fin sont obligatoires.');
      return;
    }

    this.#state.manualEntries.push({ id, name, start, end });
    this.#addForm.reset();

    try {
      await this.#regenerate();
      this.notify.success('Production ajoutée.');
    } catch (err) {
      console.error('[CodexPurificateur] Erreur régénération :', err);
      this.notify.error('Erreur lors de la régénération du PDF.');
    }
  }

  async #removeManual(idx) {
    this.#state.manualEntries.splice(idx, 1);
    try {
      await this.#regenerate();
    } catch (err) {
      console.error('[CodexPurificateur] Erreur régénération :', err);
      this.notify.error('Erreur lors de la régénération du PDF.');
    }
  }

  // =============================================================
  // Régénération (recalcul + PDF + UI)
  // =============================================================

  async #regenerate() {
    const { bonNumber, expectedCount, autoEntries, manualEntries } = this.#state;

    // Fusion avec réattribution des numéros séquentiels
    const allEntries = [...autoEntries, ...manualEntries]
      .map((e, i) => ({ ...e, count: i + 1 }));

    const docDefinition = this.#buildDocDefinition(allEntries, bonNumber, expectedCount);
    const filename = `BL_purifie_${bonNumber}.pdf`;

    const { blob } = await PDFService.compose(docDefinition, {
      filename,
      action: 'none'   // pas de téléchargement auto — preview uniquement
    });

    // Preview
    this.#preview?.setPdfBlob(blob, filename);

    // Résumé + liste manuelle
    this.#updateSummary();
    this.#renderManualList();

    // Affiche le bloc résultat (au premier appel)
    if (this.#result.hidden) {
      this.#result.hidden = false;
    }
    this.#result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  #updateSummary() {
    const { bonNumber, expectedCount, autoEntries, manualEntries } = this.#state;
    const autoCount = autoEntries.length;
    const manualCount = manualEntries.length;
    const total = autoCount + manualCount;

    const elBl = this.querySelector('#purif-bl');
    const elCount = this.querySelector('#purif-count');
    const elValid = this.querySelector('#purif-validation');

    if (elBl) elBl.textContent = bonNumber ?? '—';

    if (elCount) {
      if (manualCount > 0) {
        const parts = `${autoCount} auto + ${manualCount} manuelle${manualCount > 1 ? 's' : ''}`;
        elCount.textContent = expectedCount !== null
          ? `${total} (${parts}) / ${expectedCount}`
          : `${total} (${parts})`;
      } else {
        elCount.textContent = expectedCount !== null
          ? `${autoCount} / ${expectedCount}`
          : String(autoCount);
      }
    }

    // Validation : basée UNIQUEMENT sur les entrées extraites du BL
    if (elValid) {
      if (expectedCount === null) {
        elValid.textContent = 'ℹ️ Le nombre de productions attendu n\'a pas été trouvé dans le PDF source.';
        elValid.className = 'purif-validation purif-validation--info';
      } else if (autoCount === expectedCount) {
        elValid.textContent = `✓ Validation OK — ${autoCount}/${expectedCount} productions extraites du BL source.`;
        elValid.className = 'purif-validation purif-validation--ok';
      } else {
        elValid.textContent = `⚠ Attention — ${autoCount}/${expectedCount} productions extraites du BL source.`;
        elValid.className = 'purif-validation purif-validation--warn';
      }
    }
  }

  #renderManualList() {
    if (!this.#manualList) return;

    const items = this.#state.manualEntries;

    if (!items.length) {
      this.#manualList.hidden = true;
      this.#manualList.innerHTML = '';
      return;
    }

    this.#manualList.hidden = false;
    this.#manualList.innerHTML = items.map((e, i) => `
      <li class="purif-manual-item">
        <span class="purif-manual-info">
          <strong>${this.#escape(e.name || '(sans nom)')}</strong>
          <span class="purif-manual-dates">${this.#escape(e.start)} → ${this.#escape(e.end)}</span>
        </span>
        <button type="button" class="purif-manual-remove" data-idx="${i}"
          aria-label="Retirer ${this.#escape(e.name || 'cette entrée')}">✕</button>
      </li>
    `).join('');

    this.#manualList.querySelectorAll('.purif-manual-remove').forEach((btn) => {
      btn.addEventListener('click', () => this.#removeManual(parseInt(btn.dataset.idx, 10)));
    });
  }

  // =============================================================
  // Extraction du texte PDF
  // =============================================================

  async #extraireTextePDF(arrayBuffer) {
    const pdfjs = await loadPdfJs();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer.slice(0) }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((item) => item.str).join(' ') + '\n';
    }
    return fullText;
  }

  // =============================================================
  // Parsing
  // =============================================================

  #extraireNombreProductions(fullText) {
    const m = fullText.match(/Nombre de productions\s*:\s*(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  #parserEntrees(fullText) {
    const re = /(20\d{14})\s+([A-ZÀ-ÿ][A-ZÀ-ÿ\s\-'.]+?)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/gi;
    const entries = [];
    let match;
    let count = 0;

    while ((match = re.exec(fullText)) !== null) {
      count++;
      entries.push({
        count,
        id: match[1].trim(),
        name: match[2].trim().replace(/\s+/g, ' '),
        start: match[3].trim(),
        end: match[4].trim()
      });
    }
    return entries;
  }

  // =============================================================
  // Génération pdfmake
  // =============================================================

  #buildDocDefinition(entries, bonNumber, expectedCount) {
    const isValid = expectedCount !== null && entries.length === expectedCount;

    const validationText = expectedCount !== null
      ? `Nombre de productions : ${entries.length}/${expectedCount}`
      : `Nombre de productions : ${entries.length}`;

    const validationColor = expectedCount === null
      ? '#525252'
      : (isValid ? '#006D44' : '#BA4E00');

    return {
      pageSize: 'A4',
      pageMargins: [13, 13, 13, 13],
      defaultStyle: { fontSize: 9.5, font: 'Roboto', lineHeight: 1.1 },
      content: [
        {
          columns: [
            {
              text: `Bon de Livraison Épuré n° ${bonNumber}`,
              style: 'header',
              width: '*',                    // prend tout l'espace restant
            },
            {
              text: validationText,
              style: 'subheader',
              color: validationColor,
              alignment: 'right',
              width: 'auto',                 // taille du contenu uniquement
            }
          ],
          columnGap: 12
        },
        {
          table: {
            headerRows: 1,
            widths: COL_WIDTHS,
            body: [
              [
                { text: 'N°', bold: true },
                { text: 'ID Production', bold: true },
                { text: 'Nom Patient', bold: true },
                { text: 'Début', bold: true },
                { text: 'Fin', bold: true }
              ],
              ...entries.map((e) => [
                String(e.count),
                e.id || '—',
                e.name || '—',
                e.start || '—',
                e.end || '—'
              ])
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 6, 0, 0]              // espace avant le tableau
        }
      ],
      styles: {
        header: {
          fontSize: 11,
          bold: true,
          margin: [0, 0, 0, 0]               // plus de marge basse, la colonne gère l'espace
        },
        subheader: {
          fontSize: 10,
          bold: true,
          margin: [0, 0, 0, 0],
          relativePosition: { x: 0, y: 2 }
        }
      }
    };
  }

  // =============================================================
  // Utilitaires
  // =============================================================

  /** Convertit `YYYY-MM-DD` (input date natif) → `DD/MM/YYYY`. */
  #isoToFr(iso) {
    if (!iso || typeof iso !== 'string') return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return '';
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }

  #escape(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

if (!customElements.get('codex-purificateur')) {
  customElements.define('codex-purificateur', CodexPurificateur);
}