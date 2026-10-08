import { BaseView } from '../../core/base-view.js';
import { PDFService } from '../../services/pdf/pdf-service.js';
import { PDF_PRESETS } from '../../services/pdf/engines/html2pdf-engine.js';
import pageStyles from './datamatrix-page.css' with { type: 'css' };

// =============================================================
// Constantes
// =============================================================

const DATAMATRIX_LIB_URL = new URL(
  '../../vendor/datamatrix@1.0/datamatrix.min.js',
  import.meta.url
).href;

const PREFS_KEY = 'datamatrix-layout';
const DEFAULT_COLUMNS = 4;
const DEFAULT_ROWS = 6;
const DEFAULT_SIZE_MM = 26;
const MIN_SIZE_MM = 15;
const MAX_SIZE_MM = 50;

// Conversion mm → px à 96 dpi (standard html2canvas).
const MM_TO_PX = 3.7795;
const PAGE_WIDTH_PX   = 794;      // ≈ 210mm
const PAGE_HEIGHT_PX  = 1085;     // ≈ 287mm
const PAGE_PADDING_PX = 20;
const PAGE_HEADER_MB  = 20;       // marge basse du header
const PAGE_HEADER_PB  = 8;        // padding bas du header (au-dessus de la border)
const ITEM_GAP_PX     = 12;
const ITEM_PADDING_PX = 5;

// Texte CSS extrait du module — utilisé pour injecter les styles dans
// le sandbox html2pdf et la popup d'impression. Évite la duplication
// entre ce que voit la preview et ce que voit le PDF.
let PAGE_STYLES_TEXT = '';
try {
  PAGE_STYLES_TEXT = Array.from(pageStyles.cssRules)
    .map((rule) => rule.cssText)
    .join('\n');
} catch (err) {
  console.warn(
    '[CodexDatamatrix] Impossible d\'extraire le texte du CSS module. ' +
    'Les styles seront pris du document global — devrait fonctionner quand même.',
    err
  );
}

// =============================================================
// Lazy-load de la lib DataMatrix
// =============================================================

let datamatrixLibPromise = null;

function loadDatamatrix() {
  if (window.DATAMatrix) return Promise.resolve(window.DATAMatrix);
  if (datamatrixLibPromise) return datamatrixLibPromise;

  datamatrixLibPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = DATAMATRIX_LIB_URL;
    script.onload = () => resolve(window.DATAMatrix);
    script.onerror = () => {
      datamatrixLibPromise = null;
      reject(new Error('Échec du chargement de la lib DataMatrix'));
    };
    document.head.appendChild(script);
  });
  return datamatrixLibPromise;
}

// =============================================================
// Validation EAN13 (clé de contrôle modulo 10)
// =============================================================

function isValidEAN13(ean) {
  if (!/^\d{13}$/.test(ean)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(ean[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(ean[12], 10);
}

// =============================================================
// Composant
// =============================================================

export class CodexDatamatrix extends BaseView {
  #form = null;
  #output = null;
  #pagesContainer = null;
  #emptyState = null;
  #dluAutoCheckbox = null;
  #dluJourInput = null;
  #toolbar = null;
  #currentItems = [];

  #perPageColumns = DEFAULT_COLUMNS;
  #perPageRows = DEFAULT_ROWS;
  #barcodeSizeMm = DEFAULT_SIZE_MM;

  onReady() {
    this.#form = this.querySelector('#formDatamatrix');
    this.#output = this.querySelector('#datamatrix-output');
    this.#pagesContainer = this.querySelector('#datamatrix-pages');
    this.#emptyState = this.querySelector('#datamatrix-empty');
    this.#dluAutoCheckbox = this.querySelector('[name="dluAuto"]');
    this.#dluJourInput = this.querySelector('#dluJour');
    this.#toolbar = this.querySelector('#datamatrix-toolbar');

    if (!this.#form) {
      console.warn('[CodexDatamatrix] <codex-form id="formDatamatrix"> introuvable.');
      return;
    }

    // Préférences persistées
    this.#loadPrefs();
    this.#syncFormFromPrefs();
    this.#syncToolbar();

    // Formulaire
    this.#form.addEventListener('codex-form-submit', (e) => this.#onSubmit(e.detail));
    this.#form.addEventListener('codex-form-invalid', (e) => this.#onInvalid(e.detail));
    this.#form.addEventListener('codex-form-change', (e) => this.#onChange(e.detail));

    // Toolbar
    this.#toolbar?.addEventListener('pdf-download', () => this.#downloadPDF());
    this.#toolbar?.addEventListener('pdf-print', () => this.#printPDF());
    this.#toolbar?.addEventListener('pdf-layout-change', (e) => this.#onLayoutChange(e.detail));

    // Effacer
    this.querySelector('#datamatrix-clear')?.addEventListener('click', () => this.#clear());

    this.#updateDluJourVisibility();
  }

  // =============================================================
  // Préférences
  // =============================================================

  #loadPrefs() {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      if (Number.isInteger(saved.columns) && saved.columns > 0) this.#perPageColumns = saved.columns;
      if (Number.isInteger(saved.rows) && saved.rows > 0)       this.#perPageRows = saved.rows;
      if (Number.isInteger(saved.sizeMm) && saved.sizeMm >= MIN_SIZE_MM && saved.sizeMm <= MAX_SIZE_MM) {
        this.#barcodeSizeMm = saved.sizeMm;
      }
    } catch { /* défauts conservés */ }
  }

  #savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        columns: this.#perPageColumns,
        rows: this.#perPageRows,
        sizeMm: this.#barcodeSizeMm
      }));
    } catch { /* non bloquant */ }
  }

  #syncFormFromPrefs() {
    const sizeInput = this.#form.querySelector('[name="tailleMm"]');
    if (sizeInput && this.#barcodeSizeMm !== DEFAULT_SIZE_MM) {
      this.#form.setValue('tailleMm', String(this.#barcodeSizeMm));
    }
  }

  #syncToolbar() {
    if (!this.#toolbar) return;
    this.#toolbar.setAttribute('columns', String(this.#perPageColumns));
    this.#toolbar.setAttribute('rows', String(this.#perPageRows));
  }

  #onLayoutChange({ columns, rows }) {
    if (Number.isInteger(columns) && columns > 0) this.#perPageColumns = columns;
    if (Number.isInteger(rows) && rows > 0)       this.#perPageRows = rows;

    this.#savePrefs();

    if (this.#currentItems.length) {
      this.#renderPages(this.#currentItems);
    }
  }

  // =============================================================
  // Réactions aux changements
  // =============================================================

  #onChange({ name, value }) {
    if (name === 'ean') this.#feedbackEAN(value);
    if (name === 'dluAuto') this.#updateDluJourVisibility();
    if (name === 'tailleMm') {
      this.#barcodeSizeMm = Math.min(Math.max(parseInt(value, 10) || DEFAULT_SIZE_MM, MIN_SIZE_MM), MAX_SIZE_MM);
      this.#savePrefs();
      if (this.#currentItems.length) this.#renderPages(this.#currentItems);
    }
  }

  #feedbackEAN(value) {
    const el = this.querySelector('#ean-feedback');
    if (!el) return;

    const v = String(value || '').trim();
    if (!v) {
      el.textContent = '';
      el.className = 'field-feedback';
      return;
    }
    if (!/^\d{13}$/.test(v)) {
      el.textContent = `${v.length}/13 chiffres`;
      el.className = 'field-feedback field-feedback--warn';
      return;
    }
    if (isValidEAN13(v)) {
      el.textContent = '✓ EAN13 valide';
      el.className = 'field-feedback field-feedback--ok';
    } else {
      el.textContent = '✗ Clé de contrôle invalide';
      el.className = 'field-feedback field-feedback--err';
    }
  }

  #updateDluJourVisibility() {
    const auto = this.#dluAutoCheckbox?.checked !== false;
    if (this.#dluJourInput) this.#dluJourInput.hidden = auto;
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

    const ean = String(values.ean || '').trim();
    const lot = String(values.lot || '').trim().toUpperCase();
    const dlu = String(values.dlu || '').trim();
    const quantite = parseInt(values.quantite, 10) || 0;
    const dluAuto = values.dluAuto === true;
    const dluJour = parseInt(values.dluJour, 10) || 1;
    const tailleMm = parseInt(values.tailleMm, 10) || DEFAULT_SIZE_MM;

    if (!isValidEAN13(ean)) {
      this.notify.error('L\'EAN13 saisi est invalide (clé de contrôle incorrecte).');
      return;
    }
    const [mm, yyyy] = dlu.split('/');
    if (!mm || !yyyy || yyyy.length !== 4) {
      this.notify.error('DLU invalide. Format attendu : MM/AAAA');
      return;
    }
    if (quantite < 1 || quantite > 48) {
      this.notify.error('La quantité doit être entre 1 et 48.');
      return;
    }

    const moisNum = parseInt(mm, 10);
    const anneeNum = parseInt(yyyy, 10);
    const dernierJour = new Date(anneeNum, moisNum, 0).getDate();
    const jour = dluAuto
      ? dernierJour
      : Math.min(Math.max(dluJour, 1), dernierJour);

    const expiryDate = yyyy.slice(-2)
      + String(moisNum).padStart(2, '0')
      + String(jour).padStart(2, '0');

    const gs1Data = `01${ean.padStart(14, '0')}17${expiryDate}10${lot}`;

    try {
      this.notify.info('Génération des DataMatrix...');

      const DATAMatrix = await loadDatamatrix();
      if (!DATAMatrix) throw new Error('Librairie DataMatrix indisponible.');

      const svgHtml = DATAMatrix({ msg: gs1Data, dim: 36 }).outerHTML;
      const items = Array.from({ length: quantite }, () => ({ svgHtml, ean, lot, dlu }));

      this.#barcodeSizeMm = Math.min(Math.max(tailleMm, MIN_SIZE_MM), MAX_SIZE_MM);
      this.#currentItems = items;
      this.#renderPages(items);
      this.#showOutput(quantite, ean, lot, dlu, jour);
      this.notify.success(`${quantite} DataMatrix généré${quantite > 1 ? 's' : ''}.`);
    } catch (err) {
      console.error('[CodexDatamatrix] Erreur génération :', err);
      this.notify.error('Erreur lors de la génération : ' + (err.message || 'inconnue'));
    }
  }

  // =============================================================
  // Rendu des pages
  // =============================================================

  #renderPages(items) {
    this.#pagesContainer.innerHTML = '';
    this.#renderPagesInto(this.#pagesContainer, items);
  }

  /**
   * Rend les pages dans un conteneur donné. Utilisé à la fois pour la
   * preview et pour le conteneur d'export (qui doit être détaché des
   * styles preview : overflow, background, max-height).
   */
  #renderPagesInto(container, items) {
    const cols = this.#perPageColumns;
    const perPage = cols * this.#perPageRows;
    const totalPages = Math.ceil(items.length / perPage);

    // Dimensions calculées en JS — posées en inline pour html2canvas.
    const usableWidth = PAGE_WIDTH_PX - PAGE_PADDING_PX * 2;
    const itemWidth = Math.floor((usableWidth - (cols - 1) * ITEM_GAP_PX) / cols);
    const barcodePx = Math.round(this.#barcodeSizeMm * MM_TO_PX);

    for (let p = 0; p < totalPages; p++) {
      const slice = items.slice(p * perPage, (p + 1) * perPage);

      const page = document.createElement('div');
      page.className = 'pdf-page' + (p > 0 ? ' breaker' : '');
      page.style.width = `${PAGE_WIDTH_PX}px`;
      page.style.minHeight = `${PAGE_HEIGHT_PX}px`;
      page.style.padding = `${PAGE_PADDING_PX}px`;

      page.innerHTML = `
        <div class="page-header" style="margin-bottom: ${PAGE_HEADER_MB}px; padding-bottom: ${PAGE_HEADER_PB}px;">
          <h4>DATAMATRIX — ${items[0].lot} — ${items[0].dlu}</h4>
          <p>À découper et coller sur les boîtes.</p>
        </div>
        <div class="page-grid" style="gap: ${ITEM_GAP_PX}px;">
          ${slice.map((it) => this.#renderItemHtml(it, itemWidth, barcodePx)).join('')}
        </div>
      `;

      container.appendChild(page);
    }
  }

  /**
   * Un item — largeurs posées en inline, SVG isolé dans un wrapper
   * aux dimensions explicites (width + height) pour html2canvas.
   */
  #renderItemHtml(item, itemWidth, barcodePx) {
    return `
      <div class="datamatrix-item"
           style="width: ${itemWidth}px; flex: 0 0 ${itemWidth}px; padding: ${ITEM_PADDING_PX}px;">
        <div class="barcode-svg" style="width: ${barcodePx}px; height: ${barcodePx}px;">
          ${item.svgHtml}
        </div>
        <p>${item.ean}<br>LOT: ${item.lot}<br>DLU: ${item.dlu}</p>
      </div>
    `;
  }

  #showOutput(quantite, ean, lot, dlu, jour) {
    this.#emptyState.hidden = true;
    this.#output.hidden = false;

    const info = this.querySelector('#datamatrix-info');
    if (info) {
      info.textContent =
        `${quantite} étiquette${quantite > 1 ? 's' : ''} • EAN ${ean} • Lot ${lot} • DLU ${dlu} (jour ${jour})`;
    }
  }

  // =============================================================
  // Export PDF / Impression
  // =============================================================

  async #downloadPDF() {
    if (!this.#currentItems.length) return;

    const lot = this.#currentItems[0].lot;
    const filename = `datamatrix_${lot}.pdf`;

    try {
      this.notify.info('Génération du PDF...');

      // Conteneur dédié — détaché des styles de preview (overflow,
      // background, max-height) qui faussent html2canvas.
      const exportRoot = document.createElement('div');
      exportRoot.className = 'datamatrix-export-root';
      this.#renderPagesInto(exportRoot, this.#currentItems);

      await PDFService.capture(exportRoot, {
        ...PDF_PRESETS.DOCUMENT,
        margin: 0,
        filename,
        action: 'download',
        styles: PAGE_STYLES_TEXT,
        pagebreak: { mode: ['css', 'legacy'], before: '.breaker' }
      });

      this.notify.success(`PDF "${filename}" généré.`);
    } catch (err) {
      console.error('[CodexDatamatrix] Erreur PDF :', err);
      this.notify.error('Erreur lors de la génération du PDF.');
    }
  }

  async #printPDF() {
    if (!this.#currentItems.length) return;

    const exportRoot = document.createElement('div');
    exportRoot.className = 'datamatrix-export-root';
    this.#renderPagesInto(exportRoot, this.#currentItems);

    PDFService.print(exportRoot, {
      title: 'Datamatrix',
      styles: PAGE_STYLES_TEXT
    });
  }

  // =============================================================
  // Reset
  // =============================================================

  #clear() {
    this.#currentItems = [];
    this.#pagesContainer.innerHTML = '';
    this.#output.hidden = true;
    this.#emptyState.hidden = false;
    this.#form.reset();
    this.#updateDluJourVisibility();

    const el = this.querySelector('#ean-feedback');
    if (el) {
      el.textContent = '';
      el.className = 'field-feedback';
    }
  }
}

if (!customElements.get('codex-datamatrix')) {
  customElements.define('codex-datamatrix', CodexDatamatrix);
}