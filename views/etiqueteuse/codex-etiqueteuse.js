import { BaseView } from '../../core/base-view.js';
import { PDFService } from '../../services/pdf/pdf-service.js';
import { PDF_PRESETS } from '../../services/pdf/engines/html2pdf-engine.js';
import { toTitleCase } from '../../utils/string-utils.js';
import pageStyles from './etiqueteuse-page.css' with { type: 'css' };

// =============================================================
// Constantes
// =============================================================

const DATAMATRIX_LIB_URL = new URL(
  '../../vendor/datamatrix@1.0/datamatrix.min.js',
  import.meta.url
).href;

const XLSX_LIB_URL = new URL('../../vendor/xlsx@0.20.3/xlsx.full.min.js', import.meta.url).href;

let xlsxPromise = null;
function loadXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (xlsxPromise) return xlsxPromise;
  xlsxPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = XLSX_LIB_URL;
    s.onload = () => resolve(window.XLSX);
    s.onerror = () => { xlsxPromise = null; reject(new Error('Échec du chargement de XLSX')); };
    document.head.appendChild(s);
  });
  return xlsxPromise;
}

// Dimensions physiques (mm)
const PAGE_WIDTH_MM = 200;
const PAGE_HEIGHT_MM = 287;
const PAGE_PADDING_MM = 5;
const LABEL_WIDTH_MM = 23;
const LABEL_HEIGHT_MM = 48;
const LABEL_GAP_MM = 2;
const DATAMATRIX_SIZE_MM = 8;

// Conversion mm → px @96dpi
const MM_TO_PX = 3.7795;
const PAGE_WIDTH_PX = Math.round(PAGE_WIDTH_MM * MM_TO_PX);   // ~756
const PAGE_HEIGHT_PX = Math.round(PAGE_HEIGHT_MM * MM_TO_PX);   // ~1085
const PAGE_PADDING_PX = Math.round(PAGE_PADDING_MM * MM_TO_PX);   // ~19
const LABEL_WIDTH_PX = Math.round(LABEL_WIDTH_MM * MM_TO_PX);   // ~87
const LABEL_HEIGHT_PX = Math.round(LABEL_HEIGHT_MM * MM_TO_PX);   // ~181
const LABEL_GAP_PX = Math.round(LABEL_GAP_MM * MM_TO_PX);   // ~8
const DM_SIZE_PX = Math.round(DATAMATRIX_SIZE_MM * MM_TO_PX); // ~30

// Grille par défaut
const DEFAULT_COLUMNS = 7;
const DEFAULT_ROWS = 5;
// La largeur des étiquettes est fixe (23mm) — c'est l'imprimante qui
// dicte ce format, ce n'est PAS ajustable. Le nombre de colonnes par
// ligne est donc calculé une fois pour toutes à partir de la largeur
// utile de la page et de l'espacement.
const PAGE_CONTENT_WIDTH_PX = PAGE_WIDTH_PX - 2 * PAGE_PADDING_PX;  // ~718
const EFFECTIVE_COLUMNS = Math.floor(
  (PAGE_CONTENT_WIDTH_PX + LABEL_GAP_PX) / (LABEL_WIDTH_PX + LABEL_GAP_PX)
);

const PREFS_KEY = 'etiqueteuse-layout';

// Dosages homéopathiques (datalist)
const DOSAGES = [
  '1 DH', '1 CH', '2 CH', '3 CH', '4 CH', '5 CH', '7 CH',
  '9 CH', '12 CH', '15 CH', '30 CH', '40 CH', '200 CH'
];

// =============================================================
// Lazy-load de la lib DataMatrix
// =============================================================

let datamatrixLibPromise = null;

function loadDatamatrix() {
  if (window.DATAMatrix) return Promise.resolve(window.DATAMatrix);
  if (datamatrixLibPromise) return datamatrixLibPromise;

  datamatrixLibPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = DATAMATRIX_LIB_URL;
    s.onload = () => resolve(window.DATAMatrix);
    s.onerror = () => { datamatrixLibPromise = null; reject(new Error('Échec DataMatrix')); };
    document.head.appendChild(s);
  });
  return datamatrixLibPromise;
}

// Texte CSS extrait du module (pour le sandbox html2pdf et l'impression)
let PAGE_STYLES_TEXT = '';
try {
  PAGE_STYLES_TEXT = Array.from(pageStyles.cssRules).map((r) => r.cssText).join('\n');
} catch (err) {
  console.warn('[CodexEtiqueteuse] CSS module inaccessible :', err);
}

// =============================================================
// Composant
// =============================================================

export class CodexEtiqueteuse extends BaseView {
  #form = null;
  #listWrap = null;
  #output = null;
  #pagesEl = null;
  #toolbar = null;
  #countEl = null;

  #items = [];   // [{ denomination, dosage, codeBarre, dataMatrixHtml }]

  #perPageRows = DEFAULT_ROWS;

  onReady() {
    this.#form = this.querySelector('#formEtiquette');
    this.#listWrap = this.querySelector('#etq-list-wrap');
    this.#output = this.querySelector('#etq-output');
    this.#pagesEl = this.querySelector('#etq-pages');
    this.#toolbar = this.querySelector('#etq-toolbar');
    this.#countEl = this.querySelector('#etq-count');
    const formImport = this.querySelector('#formImport');
    formImport?.addEventListener('codex-form-submit', (e) => this.#onImportSubmit(e.detail));
    formImport?.addEventListener('codex-form-invalid', (e) => this.#onInvalid(e.detail));

    if (!this.#form) {
      console.warn('[CodexEtiqueteuse] <codex-form id="formEtiquette"> introuvable.');
      return;
    }

    // Datalist des dosages
    const datalist = this.querySelector('#dosages-list');
    if (datalist) {
      datalist.innerHTML = DOSAGES.map((d) => `<option value="${d}">`).join('');
    }

    // Préférences de layout
    this.#loadPrefs();
    this.#syncToolbar();

    // Événements
    this.#form.addEventListener('codex-form-submit', (e) => this.#onSubmit(e.detail));
    this.#form.addEventListener('codex-form-invalid', (e) => this.#onInvalid(e.detail));

    this.querySelector('#etq-clear')?.addEventListener('click', () => this.#clear());

    this.#toolbar?.addEventListener('pdf-download', () => this.#downloadPDF());
    this.#toolbar?.addEventListener('pdf-print', () => this.#printPDF());
    this.#toolbar?.addEventListener('pdf-layout-change', (e) => this.#onLayoutChange(e.detail));

    this.#renderList();
  }

  // =============================================================
  // Préférences layout
  // =============================================================

  #loadPrefs() {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      if (Number.isInteger(saved.rows) && saved.rows > 0) this.#perPageRows = saved.rows;
    } catch { /* défauts */ }
  }

  #savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        rows: this.#perPageRows
      }));
    } catch { /* non bloquant */ }
  }

  #syncToolbar() {
    if (!this.#toolbar) return;
    this.#toolbar.setAttribute('rows', String(this.#perPageRows));
  }

  #onLayoutChange({ rows }) {
    if (Number.isInteger(rows) && rows > 0) this.#perPageRows = rows;
    this.#savePrefs();
    if (this.#items.length) this.#renderPages();
  }

  // =============================================================
  // Formulaire
  // =============================================================

  #onInvalid({ invalidFields }) {
    this.notify.warning(`Champs manquants ou invalides : ${invalidFields.join(', ')}`);
    this.#form.focusField(invalidFields[0]);
  }

  async #onSubmit({ values, isValid }) {
    if (!isValid) return;

    const denomination = String(values.denomination || '').trim();
    const dosage = String(values.dosage || '').trim();
    const codeBarre = String(values.codeBarre || '').trim();

    // EAN13 = 13 chiffres ou vide
    if (codeBarre && !/^\d{13}$/.test(codeBarre)) {
      this.notify.error('Le code-barre doit contenir exactement 13 chiffres.');
      return;
    }

    try {
      const DATAMatrix = codeBarre ? await loadDatamatrix() : null;
      const dataMatrixHtml = DATAMatrix
        ? DATAMatrix({ msg: codeBarre, dim: 38 }).outerHTML
        : '';

      this.#items.push({
        denomination: toTitleCase(denomination),
        dosage,
        codeBarre,
        dataMatrixHtml
      });

      this.#form.reset();
      this.#form.focusField('denomination');

      this.notify.success('Souche ajoutée.');
      await this.#refreshAll();
    } catch (err) {
      console.error('[CodexEtiqueteuse] Erreur ajout :', err);
      this.notify.error('Erreur lors de l\'ajout.');
    }
  }

  async #removeAt(idx) {
    this.#items.splice(idx, 1);
    await this.#refreshAll();
  }

  async #clear() {
    if (!this.#items.length) return;
    if (!confirm('Vider toute la liste ?')) return;
    this.#items = [];
    await this.#refreshAll();
    this.notify.info('Liste vidée.');
  }

  // =============================================================
  // Rendu liste
  // =============================================================

  #renderList() {
    if (this.#countEl) this.#countEl.textContent = String(this.#items.length);

    if (!this.#items.length) {
      this.#listWrap.innerHTML = '<p class="etq-empty">Aucune souche pour le moment.</p>';
      return;
    }

    this.#listWrap.innerHTML = `
      <table class="etq-list-table">
        <thead>
          <tr>
            <th scope="col">Dénomination</th>
            <th scope="col" style="width: 80px;">Dosage</th>
            <th scope="col" style="width: 140px;">Code-barre</th>
            <th scope="col" style="width: 100px;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${this.#items.map((it, i) => `
            <tr>
              <td>${this.#escape(it.denomination)}</td>
              <td>${this.#escape(it.dosage)}</td>
              <td>${this.#escape(it.codeBarre || '—')}</td>
              <td>
                <button class="etq-delete" type="button" data-idx="${i}"
                  aria-label="Supprimer ${this.#escape(it.denomination)}">🗑 Supprimer</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    this.#listWrap.querySelectorAll('.etq-delete').forEach((btn) => {
      btn.addEventListener('click', () => this.#removeAt(parseInt(btn.dataset.idx, 10)));
    });
  }

  // =============================================================
  // Rendu paginé
  // =============================================================

  async #refreshAll() {
    this.#renderList();

    if (!this.#items.length) {
      this.#output.hidden = true;
      this.#pagesEl.innerHTML = '';
      return;
    }

    this.#output.hidden = false;
    this.#renderPages();
  }

  #renderPages() {
    this.#pagesEl.innerHTML = '';
    this.#renderPagesInto(this.#pagesEl);
  }

  #renderPagesInto(container) {
    const cols = EFFECTIVE_COLUMNS;             // ← figé, plus de this.#perPageColumns
    const perPage = cols * this.#perPageRows;
    const items = this.#items;
    const totalPages = Math.ceil(items.length / perPage);

    for (let p = 0; p < totalPages; p++) {
      const slice = items.slice(p * perPage, (p + 1) * perPage);

      const page = document.createElement('div');
      page.className = 'pdf-page' + (p > 0 ? ' breaker' : '');
      page.style.width = `${PAGE_WIDTH_PX}px`;
      page.style.minHeight = `${PAGE_HEIGHT_PX}px`;
      page.style.padding = `${PAGE_PADDING_PX}px`;

      page.innerHTML = `
        <div class="page-grid" style="gap: ${LABEL_GAP_PX}px;">
          ${slice.map((it) => this.#renderItemHtml(it)).join('')}
        </div>
      `;

      container.appendChild(page);
    }
  }

  #renderItemHtml(item) {
    return `
      <div class="etiquette-item"
           style="width: ${LABEL_WIDTH_PX}px; height: ${LABEL_HEIGHT_PX}px; flex: 0 0 ${LABEL_WIDTH_PX}px;">
        <div class="etiquette-visible-header">
          <span class="souche">${this.#escape(item.denomination)}</span>
          <span class="dilution">${this.#escape(item.dosage)}</span>
        </div>
        <div class="etiquette-hidden-body">
          ${item.dataMatrixHtml
        ? `<div class="datamatrix-container" style="width: ${DM_SIZE_PX}px; height: ${DM_SIZE_PX}px; margin: 0 auto;">
                ${item.dataMatrixHtml}
              </div>`
        : ''}
          <div class="control-text">${this.#escape(item.codeBarre || 'N/A')}</div>
        </div>
      </div>
    `;
  }

  // =============================================================
  // Export PDF / impression
  // =============================================================

  async #downloadPDF() {
    if (!this.#items.length) return;

    const filename = `Etiquettes_${new Date().toISOString().slice(0, 10)}.pdf`;

    try {
      this.notify.info('Génération du PDF...');

      const root = document.createElement('div');
      root.className = 'etiqueteuse-export-root';
      this.#renderPagesInto(root);

      await PDFService.capture(root, {
        ...PDF_PRESETS.DOCUMENT,
        margin: 0,
        filename,
        action: 'download',
        styles: PAGE_STYLES_TEXT,
        pagebreak: { mode: ['css', 'legacy'], before: '.breaker' }
      });

      this.notify.success(`PDF "${filename}" généré.`);
    } catch (err) {
      console.error('[CodexEtiqueteuse] Erreur PDF :', err);
      this.notify.error('Erreur lors de la génération du PDF.');
    }
  }

  async #printPDF() {
    if (!this.#items.length) return;

    const root = document.createElement('div');
    root.className = 'etiqueteuse-export-root';
    this.#renderPagesInto(root);

    PDFService.print(root, {
      title: 'Étiquettes homéopathiques',
      styles: PAGE_STYLES_TEXT
    });
  }

  // =============================================================
  // Utilitaires
  // =============================================================

  #escape(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  // =============================================================
  // Import Excel / JSON
  // =============================================================

  async #onImportSubmit({ isValid }) {
    if (!isValid) return;

    const fileInput = this.querySelector('#etq-file');
    const file = fileInput?.files?.[0];

    if (!file) {
      this.notify.warning('Sélectionnez un fichier.');
      return;
    }

    const ext = file.name.toLowerCase().split('.').pop();
    try {
      if (ext === 'json') {
        await this.#importJSON(file);
      } else if (['xlsx', 'xls', 'xlsm'].includes(ext)) {
        await this.#importExcel(file);
      } else {
        throw new Error('Format non supporté.');
      }
      fileInput.value = '';
    } catch (err) {
      console.error('[CodexEtiqueteuse] Erreur import :', err);
      this.notify.error(err.message || 'Erreur lors de l\'import.');
    }
  }

  async #importJSON(file) {
    const text = await file.text();
    let data;
    try { data = JSON.parse(text); }
    catch { throw new Error('JSON invalide.'); }

    if (!Array.isArray(data)) throw new Error('Le JSON doit être un tableau.');
    await this.#fusionner(data);
  }

  async #importExcel(file) {
    const XLSX = await loadXlsx();
    if (!XLSX) throw new Error('Librairie XLSX indisponible.');

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });

    // On prend la première feuille contenant les colonnes requises
    let rows = null;
    let idxDen = -1, idxDos = -1, idxCode = -1;

    for (const name of wb.SheetNames) {
      const sheet = wb.Sheets[name];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (!data.length) continue;

      const headers = data[0].map((h) => String(h).trim().toLowerCase());
      const iDen = headers.findIndex((h) => h.includes('denomination') || h.includes('dénomination'));
      const iDos = headers.findIndex((h) => h.includes('dosage'));
      const iCode = headers.findIndex((h) => h.includes('code'));

      if (iDen !== -1 && iDos !== -1) {
        rows = data; idxDen = iDen; idxDos = iDos; idxCode = iCode;
        break;
      }
    }

    if (!rows) throw new Error('Aucune feuille avec les colonnes "denomination" et "dosage" trouvée.');

    const extracted = rows.slice(1)
      .map((r) => ({
        denomination: r[idxDen],
        dosage: r[idxDos],
        codeBarre: idxCode !== -1 ? r[idxCode] : ''
      }))
      .filter((x) => x.denomination && x.dosage);

    if (!extracted.length) throw new Error('Aucune ligne valide dans le fichier.');

    await this.#fusionner(extracted);
  }

  async #fusionner(list) {
    const DATAMatrix = await loadDatamatrix();

    let added = 0;
    let skipped = 0;

    for (const x of list) {
      const codeBarre = String(x.codeBarre || '').trim();
      // Ignorer les codes non EAN13 (le fichier peut contenir n'importe quoi)
      const validCode = /^\d{13}$/.test(codeBarre) ? codeBarre : '';

      if (codeBarre && !validCode) skipped++;

      this.#items.push({
        denomination: toTitleCase(String(x.denomination).trim()),
        dosage: String(x.dosage).trim(),
        codeBarre: validCode,
        dataMatrixHtml: validCode
          ? DATAMatrix({ msg: validCode, dim: 38 }).outerHTML
          : ''
      });
      added++;
    }

    this.notify.success(
      `${added} souche${added > 1 ? 's' : ''} importée${added > 1 ? 's' : ''}` +
      (skipped ? ` — ${skipped} code(s) invalide(s) ignoré(s).` : '.')
    );

    await this.#refreshAll();
  }
}

if (!customElements.get('codex-etiqueteuse')) {
  customElements.define('codex-etiqueteuse', CodexEtiqueteuse);
}