import { BaseComponent } from '../../core/base-component.js';
import { downloadBlob, canShareFiles, shareBlob } from '../../utils/export-utils.js';
import { tampons } from './tampons-data.js';

const FABRIC_URL = new URL('../../vendor/fabric@7.4.0/fabric.js', import.meta.url).href;
const PDFLIB_URL = new URL('../../vendor/pdf/pdf-lib@1.17.1.js', import.meta.url).href;
const PDFJS_URL = new URL('../../vendor/pdfjs@6.3.289/pdf.min.js', import.meta.url).href;
const PDFJS_WORKER_URL = new URL('../../vendor/pdfjs@6.3.289/pdf.worker.min.js', import.meta.url).href;

let fabricModulePromise = null;
function loadFabric() {
  if (!fabricModulePromise) fabricModulePromise = import(FABRIC_URL);
  return fabricModulePromise;
}

let pdfLibLoadPromise = null;
function loadPdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  if (!pdfLibLoadPromise) {
    pdfLibLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PDFLIB_URL;
      script.onload = () => resolve(window.PDFLib);
      script.onerror = () => reject(new Error("Échec du chargement de pdf-lib"));
      document.head.appendChild(script);
    });
  }
  return pdfLibLoadPromise;
}

let pdfjsModulePromise = null;
function loadPdfJs() {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import(PDFJS_URL).then(mod => {
      mod.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return mod;
    });
  }
  return pdfjsModulePromise;
}

const PREFS_KEY = 'endossaire-prefs';

export class CodexEndossaire extends BaseComponent {
  constructor() {
    super();
    this._fabric = null;
    this._fabricCanvas = null;
    this._isPdf = false;
    this._pdfDoc = null;          // document pdf.js, pour l'aperçu
    this._pdfBytesOriginal = null; // octets bruts, préservés pour l'export pdf-lib
    this._currentPage = 1;
    this._totalPages = 1;
    this._zoom = 1;
    this._pos = { v: 'bottom', h: 'right' };
    this._defaultSize = 100;
    this._fileNameBase = 'document';
    this._objectUrls = [];

    this.#chargerPrefs();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>:host { display: block; }</style>
      <slot></slot>
    `;
  }

  onReady() {
    this.#renderStampPicker();

    const dropzone = this.querySelector('#endossaire-dropzone');
    const fileInput = this.querySelector('#endossaire-fileinput');

    dropzone?.addEventListener('click', () => fileInput.click());
    dropzone?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.#handleFile(file);
    });
    this.addEventListener('files-captured', (e) => {
      const file = e.detail?.file;
      if (file) this.#handleFile(file);
    });

    this.querySelector('#endossaire-btn-prev')?.addEventListener('click', () => this.#changerPage(-1));
    this.querySelector('#endossaire-btn-next')?.addEventListener('click', () => this.#changerPage(1));
    this.querySelector('#endossaire-zoom')?.addEventListener('change', (e) => this.#appliquerZoom(parseFloat(e.target.value)));
    this.querySelector('#endossaire-btn-clear-page')?.addEventListener('click', () => this.#viderPageCourante());
    this.querySelector('#endossaire-btn-delete')?.addEventListener('click', () => this.#supprimerSelection());
    this.querySelector('#endossaire-btn-download')?.addEventListener('click', () => this.#exporter());
    this.querySelector('#endossaire-btn-share')?.addEventListener('click', () => this.#partager());
    this.querySelector('#endossaire-btn-restart')?.addEventListener('click', () => this.#resetAll());

    this.querySelector('#endossaire-pref-size')?.addEventListener('input', (e) => {
      this._defaultSize = parseInt(e.target.value, 10) || 100;
      this.#sauvegarderPrefs();
    });

    this.querySelectorAll('.endossaire-pos-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.querySelectorAll('.endossaire-pos-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this._pos = { v: btn.dataset.v, h: btn.dataset.h };
        this.#sauvegarderPrefs();
      });
    });

    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.#estActif() && this._fabricCanvas?.getActiveObject()) {
        if (document.activeElement?.tagName === 'INPUT') return;
        this.#supprimerSelection();
      }
    });
  }

  #estActif() {
    return !this.querySelector('#endossaire-phase-edit')?.hidden;
  }

  // =============================================================
  // Préférences (taille par défaut, position) — localStorage
  // =============================================================
  #chargerPrefs() {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      if (saved.size) this._defaultSize = saved.size;
      if (saved.pos) this._pos = saved.pos;
    } catch { /* préférences absentes ou corrompues — valeurs par défaut conservées */ }
  }

  #sauvegarderPrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ size: this._defaultSize, pos: this._pos }));
    } catch { /* stockage indisponible — non bloquant */ }
  }

  // =============================================================
  // Bibliothèque de tampons (rendue depuis tampons-data.js)
  // =============================================================
  #renderStampPicker() {
    const container = this.querySelector('#endossaire-stamp-picker');
    if (!container) return;

    container.innerHTML = tampons.map(t => {
      const attrs = Object.entries(t.props).map(([k, v]) => `${k}="${this.#escapeAttr(v)}"`).join(' ');
      return `
        <button type="button" class="endossaire-stamp-card" data-tampon-id="${t.id}">
          <${t.tag} ${attrs} size="80"></${t.tag}>
          <span>${t.label}</span>
        </button>
      `;
    }).join('');

    container.querySelectorAll('.endossaire-stamp-card').forEach(btn => {
      btn.addEventListener('click', () => this.#ajouterTampon(btn.dataset.tamponId));
    });

    const sizeInput = this.querySelector('#endossaire-pref-size');
    if (sizeInput) sizeInput.value = this._defaultSize;
  }

  #escapeAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  /**
   * Crée une instance de tampon totalement autonome (hors sidebar), montée
   * hors-écran le temps de récupérer son rendu, puis détachée. Évite toute
   * dépendance à l'état/au montage du sélecteur affiché — l'instance est
   * garantie connectée et rendue avant d'être renvoyée à l'appelant, qui
   * doit la retirer du DOM (`.remove()`) une fois son usage terminé.
   */
  async #creerTamponEphemere(id) {
    const data = tampons.find(t => t.id === id);
    if (!data) throw new Error(`Tampon "${id}" introuvable dans la collection.`);

    const el = document.createElement(data.tag);
    Object.entries(data.props).forEach(([k, v]) => el.setAttribute(k, v));
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.top = '0';
    document.body.appendChild(el);

    // Laisse le composant se connecter, construire son SVG puis ajuster
    // ses textPath (fait lui-même via requestAnimationFrame côté BaseTampon)
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    if (typeof el.toSvgString !== 'function') {
      el.remove();
      throw new Error(
        `Le composant <${data.tag}> ne s'est pas initialisé correctement ` +
        '(rechargez la page en vidant le cache : Ctrl+Maj+R).'
      );
    }

    return el;
  }

  // =============================================================
  // Import (image ou PDF)
  // =============================================================
  async #handleFile(file) {
    try {
      this._fileNameBase = (file.name || 'document').replace(/\.[^.]+$/, '');
      this._fabric = await loadFabric();

      const canvasEl = this.querySelector('#endossaire-canvas');
      this._fabricCanvas = new this._fabric.Canvas(canvasEl, { width: 600, height: 800 });
      this._fabricCanvas.on('selection:created', () => this.#updateDeletePos());
      this._fabricCanvas.on('selection:updated', () => this.#updateDeletePos());
      this._fabricCanvas.on('object:moving', () => this.#updateDeletePos());
      this._fabricCanvas.on('object:scaling', () => this.#updateDeletePos());
      this._fabricCanvas.on('selection:cleared', () => {
        const btn = this.querySelector('#endossaire-btn-delete');
        if (btn) btn.hidden = true;
      });

      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
      this._isPdf = isPdf;

      if (isPdf) {
        this._pdfBytesOriginal = await file.arrayBuffer();
        const pdfjs = await loadPdfJs();
        this._pdfDoc = await pdfjs.getDocument({ data: this._pdfBytesOriginal.slice(0) }).promise;
        this._totalPages = this._pdfDoc.numPages;
        this._currentPage = 1;
        await this.#renderPage(1);
      } else {
        this._totalPages = 1;
        this._currentPage = 1;
        const url = URL.createObjectURL(file);
        this._objectUrls.push(url);
        const img = await this._fabric.FabricImage.fromURL(url);
        this._fabricCanvas.backgroundImage = img;
        this.#appliquerZoom(1);
        this._fabricCanvas.renderAll();
      }

      this.#majNavigation();
      this.#updateStats();
      const shareBtn = this.querySelector('#endossaire-btn-share');
      if (shareBtn) shareBtn.hidden = false;
      this.#showPhase('edit');
    } catch (err) {
      console.error('[CodexEndossaire] Erreur import :', err);
      this.notify.error("Impossible de traiter ce fichier : " + (err.message || 'format non pris en charge.'));
      this.#showPhase('import');
    }
  }

  #showPhase(phase) {
    this.querySelector('#endossaire-phase-import')?.toggleAttribute('hidden', phase !== 'import');
    this.querySelector('#endossaire-phase-edit')?.toggleAttribute('hidden', phase !== 'edit');
  }

  // =============================================================
  // Navigation pages (PDF) + zoom
  // =============================================================
  async #renderPage(num) {
    this._currentPage = num;

    const page = await this._pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: 1.5 });
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = viewport.width;
    tempCanvas.height = viewport.height;
    await page.render({ canvasContext: tempCanvas.getContext('2d'), viewport }).promise;

    const img = await this._fabric.FabricImage.fromURL(tempCanvas.toDataURL());
    this._fabricCanvas.backgroundImage = img;
    this.#appliquerZoom(this._zoom);

    this._fabricCanvas.getObjects().forEach(o => {
      o.visible = o.evented = (o.pageRef === num);
    });
    this._fabricCanvas.discardActiveObject();
    this._fabricCanvas.renderAll();

    this.#majNavigation();
    this.#updateStats();
  }

  async #changerPage(delta) {
    if (!this._isPdf) return;
    const cible = this._currentPage + delta;
    if (cible < 1 || cible > this._totalPages) return;
    await this.#renderPage(cible);
  }

  #majNavigation() {
    const label = this.querySelector('#endossaire-page-label');
    if (label) label.textContent = `Page ${this._currentPage} / ${this._totalPages}`;

    const prev = this.querySelector('#endossaire-btn-prev');
    const next = this.querySelector('#endossaire-btn-next');
    if (prev) prev.disabled = !this._isPdf || this._currentPage <= 1;
    if (next) next.disabled = !this._isPdf || this._currentPage >= this._totalPages;
  }

  #appliquerZoom(zoom) {
    this._zoom = zoom;
    if (!this._fabricCanvas) return;
    this._fabricCanvas.setZoom(zoom);
    const bg = this._fabricCanvas.backgroundImage;
    if (bg) {
      this._fabricCanvas.setDimensions({ width: bg.width * zoom, height: bg.height * zoom });
    }
    this._fabricCanvas.renderAll();
    this.#updateDeletePos();
  }

  // =============================================================
  // Ajout / suppression de tampons sur le canvas
  // =============================================================
  async #ajouterTampon(id) {
    if (!this._fabricCanvas) return;

    let source;
    try {
      source = await this.#creerTamponEphemere(id);
    } catch (err) {
      console.error('[CodexEndossaire] Erreur création tampon :', err);
      this.notify.error(err.message);
      return;
    }

    const { loadSVGFromString, util } = this._fabric;
    const { objects, options } = await loadSVGFromString(source.toSvgString());
    source.remove();
    const group = util.groupSVGElements(objects.filter(Boolean), options);

    const bg = this._fabricCanvas.backgroundImage;
    const bgW = bg?.width || this._fabricCanvas.width;
    const bgH = bg?.height || this._fabricCanvas.height;
    const size = this._defaultSize;
    const pad = 20;

    let left;
    if (this._pos.h === 'left') left = pad;
    else if (this._pos.h === 'center') left = bgW / 2 - size / 2;
    else left = bgW - size - pad;

    let top;
    if (this._pos.v === 'top') top = pad;
    else if (this._pos.v === 'middle') top = bgH / 2 - size / 2;
    else top = bgH - size - pad;

    group.scaleToWidth(size);
    group.set({
      left,
      top,
      stampId: id,
      pageRef: this._currentPage,
      unzoomedPageWidth: bgW,
      unzoomedPageHeight: bgH,
      cornerColor: '#006d44',
      borderColor: '#006d44',
      transparentCorners: false
    });

    this._fabricCanvas.add(group);
    this._fabricCanvas.setActiveObject(group);
    this._fabricCanvas.renderAll();
    this.#updateStats();
  }

  #supprimerSelection() {
    const obj = this._fabricCanvas?.getActiveObject();
    if (!obj) return;
    this._fabricCanvas.remove(obj);
    this._fabricCanvas.discardActiveObject();
    this._fabricCanvas.renderAll();
    this.querySelector('#endossaire-btn-delete').hidden = true;
    this.#updateStats();
  }

  #viderPageCourante() {
    if (!this._fabricCanvas) return;
    const aSupprimer = this._fabricCanvas.getObjects().filter(o => o.pageRef === this._currentPage);
    if (!aSupprimer.length) return;
    aSupprimer.forEach(o => this._fabricCanvas.remove(o));
    this._fabricCanvas.discardActiveObject();
    this._fabricCanvas.renderAll();
    this.#updateStats();
    this.notify.info('Tampons de cette page supprimés.');
  }

  #updateDeletePos() {
    const obj = this._fabricCanvas?.getActiveObject();
    const btn = this.querySelector('#endossaire-btn-delete');
    if (!obj || !btn) { if (btn) btn.hidden = true; return; }

    const rect = obj.getBoundingRect();
    btn.hidden = false;
    btn.style.top = `${Math.max(0, rect.top - 10)}px`;
    btn.style.left = `${rect.left + rect.width - 15}px`;
  }

  #updateStats() {
    const el = this.querySelector('#endossaire-stats');
    if (!el || !this._fabricCanvas) return;
    const total = this._fabricCanvas.getObjects().length;
    const surCettePage = this._fabricCanvas.getObjects().filter(o => o.pageRef === this._currentPage).length;
    el.textContent = this._isPdf
      ? `${surCettePage} tampon(s) sur cette page — ${total} au total`
      : `${total} tampon(s) sur ce document`;
  }

  // =============================================================
  // Export
  // =============================================================
  async #exporter() {
    try {
      const { blob, filename } = this._isPdf ? await this.#construirePdfExport() : await this.#construireImageExport();
      downloadBlob(blob, filename);
      this.notify.success('Export réalisé avec succès.');
    } catch (err) {
      console.error('[CodexEndossaire] Erreur export :', err);
      this.notify.error("Erreur lors de l'export : " + err.message);
    }
  }

  async #partager() {
    try {
      const { blob, filename } = this._isPdf ? await this.#construirePdfExport() : await this.#construireImageExport();
      if (!canShareFiles(blob, filename)) {
        this.notify.info('Le partage direct n\'est pas disponible sur ce navigateur — utilisez Télécharger.');
        return;
      }
      await shareBlob(blob, filename, 'Document tamponné');
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[CodexEndossaire] Erreur de partage :', err);
        this.notify.error('Le partage a échoué.');
      }
    }
  }

  async #construirePdfExport() {
    const PDFLibNS = await loadPdfLib();
    const { PDFDocument, degrees } = PDFLibNS;

    const pdfDoc = await PDFDocument.load(this._pdfBytesOriginal.slice(0));
    const pages = pdfDoc.getPages();

    for (const o of this._fabricCanvas.getObjects()) {
      const data = tampons.find(t => t.id === o.stampId);
      if (!data) continue;

      const source = await this.#creerTamponEphemere(o.stampId);
      const pngBlob = await source.toPngBlob(600);
      source.remove();
      const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
      const embeddedImg = await pdfDoc.embedPng(pngBytes);

      const page = pages[o.pageRef - 1];
      if (!page) continue;

      const { width, height } = page.getSize();
      const rx = width / o.unzoomedPageWidth;
      const ry = height / o.unzoomedPageHeight;
      const drawW = o.getScaledWidth() * rx;
      const drawH = o.getScaledHeight() * ry;

      page.drawImage(embeddedImg, {
        x: o.left * rx,
        y: height - (o.top * ry) - drawH,
        width: drawW,
        height: drawH,
        rotate: degrees(-(o.angle || 0))
      });
    }

    const bytes = await pdfDoc.save();
    return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: `${this._fileNameBase}_tamponne.pdf` };
  }

  async #construireImageExport() {
    const dataUrl = this._fabricCanvas.toDataURL({ format: 'jpeg', quality: 0.95 });
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return { blob, filename: `${this._fileNameBase}_tamponne.jpg` };
  }

  #resetAll() {
    this._objectUrls.forEach(u => URL.revokeObjectURL(u));
    this._objectUrls = [];
    this._fabricCanvas?.dispose();
    this._fabricCanvas = null;
    this._pdfDoc = null;
    this._pdfBytesOriginal = null;
    this._isPdf = false;
    this._currentPage = 1;
    this._totalPages = 1;

    const fileInput = this.querySelector('#endossaire-fileinput');
    if (fileInput) fileInput.value = '';

    this.#showPhase('import');
  }
}

if (!customElements.get('codex-endossaire')) {
  customElements.define('codex-endossaire', CodexEndossaire);
}