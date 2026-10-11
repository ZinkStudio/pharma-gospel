import { BaseView } from '../../core/base-view.js';
import { PDFService } from '../../services/pdf/pdf-service.js';
import { PDF_PRESETS } from '../../services/pdf/engines/html2pdf-engine.js';
import { removeAccents } from '../../utils/string-utils.js';
import pageStyles from './trombinoscope-page.css' with { type: 'css' };

// =============================================================
// Constantes
// =============================================================

const XLSX_LIB_URL = new URL('../../vendor/xlsx@0.20.3/xlsx.full.min.js', import.meta.url).href;
const QRious_LIB_URL = new URL('../../vendor/qrious@4.0.2/qrious.min.js', import.meta.url).href;

const PREFS_KEY = 'trombinoscope-layout';
const DEFAULT_COLUMNS = 3;
const DEFAULT_ROWS = 3;
const DEFAULT_ITEM_PX = 230;   // taille du SVG dans la cellule (≤ 243 pour 3 colonnes)

const MM_TO_PX = 3.7795;
const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1085;
const PAGE_PADDING_PX = 20;
const ITEM_GAP_PX = 12;

// Extraction du texte CSS (comme Datamatrix)
let PAGE_STYLES_TEXT = '';
try {
  PAGE_STYLES_TEXT = Array.from(pageStyles.cssRules).map((r) => r.cssText).join('\n');
} catch (err) {
  console.warn('[CodexTrombinoscope] CSS module inaccessible :', err);
}

// =============================================================
// Lazy-load des libs
// =============================================================

let xlsxPromise = null;
let qriousPromise = null;

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

function loadQRious() {
  if (window.QRious) return Promise.resolve(window.QRious);
  if (qriousPromise) return qriousPromise;
  qriousPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = QRious_LIB_URL;
    s.onload = () => resolve(window.QRious);
    s.onerror = () => { qriousPromise = null; reject(new Error('Échec du chargement de QRious')); };
    document.head.appendChild(s);
  });
  return qriousPromise;
}

// =============================================================
// Composant
// =============================================================

export class CodexTrombinoscope extends BaseView {
  #items = [];           // [{ NOM, PRENOM, qrCodeDataUrl }]

  #formImport = null;
  #formManuel = null;
  #listWrap = null;
  #output = null;
  #pagesEl = null;
  #toolbar = null;
  #countEl = null;

  #perPageColumns = DEFAULT_COLUMNS;
  #perPageRows = DEFAULT_ROWS;
  #itemSizePx = DEFAULT_ITEM_PX;

  onReady() {
    this.#formImport = this.querySelector('#formImport');
    this.#formManuel = this.querySelector('#formManuel');
    this.#listWrap = this.querySelector('#trombi-list-wrap');
    this.#output = this.querySelector('#trombi-output');
    this.#pagesEl = this.querySelector('#trombi-pages');
    this.#toolbar = this.querySelector('#trombi-toolbar');
    this.#countEl = this.querySelector('#trombi-count');

    // Préférences persistées
    this.#loadPrefs();
    this.#syncToolbar();

    // Formulaires
    this.#formImport?.addEventListener('codex-form-submit', (e) => this.#onImportSubmit(e.detail));
    this.#formImport?.addEventListener('codex-form-invalid', (e) => this.#onInvalid(e.detail));
    this.#formManuel?.addEventListener('codex-form-submit', (e) => this.#onManualSubmit(e.detail));
    this.#formManuel?.addEventListener('codex-form-invalid', (e) => this.#onInvalid(e.detail));

    // Actions
    this.querySelector('#trombi-clear')?.addEventListener('click', () => this.#clear());

    // Toolbar
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
      if (Number.isInteger(saved.columns) && saved.columns > 0) this.#perPageColumns = saved.columns;
      if (Number.isInteger(saved.rows) && saved.rows > 0) this.#perPageRows = saved.rows;
    } catch { /* défauts */ }
  }

  #savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        columns: this.#perPageColumns,
        rows: this.#perPageRows
      }));
    } catch { /* non bloquant */ }
  }

  #syncToolbar() {
    if (!this.#toolbar) return;
    this.#toolbar.setAttribute('columns', String(this.#perPageColumns));
    this.#toolbar.setAttribute('rows', String(this.#perPageRows));
  }

  #onLayoutChange({ columns, rows }) {
    if (Number.isInteger(columns) && columns > 0) this.#perPageColumns = columns;
    if (Number.isInteger(rows) && rows > 0) this.#perPageRows = rows;
    this.#savePrefs();
    if (this.#items.length) this.#renderPages();
  }

  // =============================================================
  // Import / ajout / suppression
  // =============================================================

  #onInvalid({ invalidFields }) {
    this.notify.warning(`Champs manquants : ${invalidFields.join(', ')}`);
  }

  async #onImportSubmit({ values, isValid }) {
    if (!isValid) return;

    // Le fichier est dans l'<input type=file> ; codex-form ne le lit pas
    // automatiquement, on le récupère directement.
    const fileInput = this.querySelector('#trombi-file');
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
      fileInput.value = '';   // reset l'input
    } catch (err) {
      console.error('[CodexTrombinoscope] Erreur import :', err);
      this.notify.error(err.message || 'Erreur lors de l\'import.');
    }
  }

  async #importJSON(file) {
    const text = await file.text();
    let data;
    try { data = JSON.parse(text); }
    catch { throw new Error('JSON invalide.'); }

    if (!Array.isArray(data)) throw new Error('Le JSON doit être un tableau.');
    this.#fusionner(data.map((x) => ({ NOM: x.NOM, PRENOM: x.PRENOM })));
  }

  async #importExcel(file) {
    const XLSX = await loadXlsx();
    if (!XLSX) throw new Error('Librairie XLSX indisponible.');

    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buf), { type: 'array' });

    let validSheet = null;
    let idxNom = -1, idxPrenom = -1;

    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (!rows.length) continue;

      const headers = rows[0].map((h) => removeAccents(String(h)).toLowerCase());
      const iNom = headers.findIndex((h) => h.includes('nom'));
      const iPrenom = headers.findIndex((h) => h.includes('prenom'));

      if (iNom !== -1 && iPrenom !== -1) {
        validSheet = sheet; idxNom = iNom; idxPrenom = iPrenom;
        break;
      }
    }

    if (!validSheet) throw new Error('Aucune feuille avec colonnes NOM/PRENOM trouvée.');

    const rows = XLSX.utils.sheet_to_json(validSheet, { header: 1 });
    const extracted = rows.slice(1)
      .map((r) => ({ NOM: r[idxNom], PRENOM: r[idxPrenom] }))
      .filter((x) => x.NOM && x.PRENOM);

    if (!extracted.length) throw new Error('Aucune donnée valide dans le fichier.');

    this.#fusionner(extracted);
  }

  async #onManualSubmit({ values, isValid }) {
    if (!isValid) return;

    const nom = String(values.nom || '').trim().toUpperCase();
    const prenom = String(values.prenom || '').trim();

    if (!nom || !prenom) return;

    this.#items.push({ NOM: nom, PRENOM: prenom, qrCodeDataUrl: null });
    this.#formManuel.reset();
    this.notify.success('Entrée ajoutée.');
    await this.#refreshAll();
  }

  async #fusionner(list) {
    const count = list.length;
    for (const x of list) {
      this.#items.push({
        NOM: String(x.NOM || '').trim().toUpperCase(),
        PRENOM: String(x.PRENOM || '').trim(),
        qrCodeDataUrl: null
      });
    }
    this.notify.success(`${count} entrée${count > 1 ? 's' : ''} ajoutée${count > 1 ? 's' : ''}.`);
    await this.#refreshAll();
  }

  async #removeAt(index) {
    this.#items.splice(index, 1);
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
      this.#listWrap.innerHTML = '<p class="trombi-empty">Aucune entrée pour le moment.</p>';
      return;
    }

    this.#listWrap.innerHTML = `
      <table class="trombi-list-table">
        <thead>
          <tr>
            <th scope="col">Nom</th>
            <th scope="col">Prénom</th>
            <th scope="col" style="width: 100px;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${this.#items.map((it, i) => `
            <tr>
              <td>${this.#escape(it.NOM)}</td>
              <td>${this.#escape(it.PRENOM)}</td>
              <td>
                <button class="trombi-delete" type="button" data-idx="${i}"
                  aria-label="Supprimer ${this.#escape(it.NOM)} ${this.#escape(it.PRENOM)}">
                  🗑 Supprimer
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    this.#listWrap.querySelectorAll('.trombi-delete').forEach((btn) => {
      btn.addEventListener('click', () => this.#removeAt(parseInt(btn.dataset.idx, 10)));
    });
  }

  #escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // =============================================================
  // Génération QR codes + rendu paginé
  // =============================================================

  async #refreshAll() {
    this.#renderList();

    if (!this.#items.length) {
      this.#output.hidden = true;
      this.#pagesEl.innerHTML = '';
      return;
    }

    try {
      await this.#prepareQRCodes();
      this.#output.hidden = false;
      this.#renderPages();
    } catch (err) {
      console.error('[CodexTrombinoscope] Erreur préparation :', err);
      this.notify.error('Erreur lors de la génération des QR codes.');
    }
  }

  async #prepareQRCodes() {
    const QRious = await loadQRious();
    if (!QRious) throw new Error('Librairie QRious indisponible.');

    for (const item of this.#items) {
      if (item.qrCodeDataUrl) continue;   // cache
      const qr = new QRious({
        value: removeAccents(`${item.NOM}+${item.PRENOM}`),
        size: 126,                        // double de la taille affichée (63)
        level: 'H'                        // haute résistance à l'impression
      });
      item.qrCodeDataUrl = qr.canvas.toDataURL();
    }
  }

  #renderPages() {
    this.#pagesEl.innerHTML = '';
    this.#renderPagesInto(this.#pagesEl);
  }

  #renderPagesInto(container) {
    const cols = this.#perPageColumns;
    const perPage = cols * this.#perPageRows;
    const items = this.#items;
    const totalPages = Math.ceil(items.length / perPage);

    const usable = PAGE_WIDTH_PX - PAGE_PADDING_PX * 2;
    const itemWidth = Math.floor((usable - (cols - 1) * ITEM_GAP_PX) / cols);
    // La taille effective du SVG : min de la largeur cellule et du paramètre.
    const svgSize = Math.min(this.#itemSizePx, itemWidth - 10);

    for (let p = 0; p < totalPages; p++) {
      const slice = items.slice(p * perPage, (p + 1) * perPage);

      const page = document.createElement('div');
      page.className = 'pdf-page' + (p > 0 ? ' breaker' : '');
      page.style.width = `${PAGE_WIDTH_PX}px`;
      page.style.minHeight = `${PAGE_HEIGHT_PX}px`;
      page.style.padding = `${PAGE_PADDING_PX}px`;

      page.innerHTML = `
        <div class="page-grid" style="gap: ${ITEM_GAP_PX}px;">
          ${slice.map((it) => this.#renderItemHtml(it, itemWidth, svgSize)).join('')}
        </div>
      `;

      container.appendChild(page);
    }
  }

  #renderItemHtml(item, itemWidth, svgSize) {
    // Le viewBox="0 0 270 270" fait office de repère interne : toutes les
    // coordonnées doivent rester dans cette échelle 0-270. Le navigateur
    // gère le rendu final à svgSize. Aucune multiplication par un facteur
    // n'est nécessaire — c'était le bug (QR décalé à gauche et en haut).
    return `
    <div class="trombi-item" style="width: ${itemWidth}px; flex: 0 0 ${itemWidth}px;">
      <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 270 270">
        <circle cx="135" cy="135" r="110" stroke="black" stroke-width="4" fill="white"/>
        <text x="135" y="90" text-anchor="middle" font-size="16" font-weight="bold">${this.#escape(item.NOM)}</text>
        <text x="135" y="115" text-anchor="middle" font-size="14">${this.#escape(item.PRENOM)}</text>
        <image width="63" height="63" x="103.5" y="150" href="${item.qrCodeDataUrl}"/>
      </svg>
    </div>
  `;
  }

  // =============================================================
  // Export PDF / impression
  // =============================================================

  async #downloadPDF() {
    if (!this.#items.length) return;

    const filename = `Trombinoscope_${new Date().toISOString().slice(0, 10)}.pdf`;

    try {
      this.notify.info('Génération du PDF...');

      const root = document.createElement('div');
      root.className = 'trombinoscope-export-root';
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
      console.error('[CodexTrombinoscope] Erreur PDF :', err);
      this.notify.error('Erreur lors de la génération du PDF.');
    }
  }

  async #printPDF() {
    if (!this.#items.length) return;

    const root = document.createElement('div');
    root.className = 'trombinoscope-export-root';
    this.#renderPagesInto(root);

    PDFService.print(root, {
      title: 'Trombinoscope',
      styles: PAGE_STYLES_TEXT
    });
  }
}

if (!customElements.get('codex-trombinoscope')) {
  customElements.define('codex-trombinoscope', CodexTrombinoscope);
}