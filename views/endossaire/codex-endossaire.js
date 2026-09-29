import { BaseView } from '../../core/base-view.js';
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
const REF_PAGE_WIDTH = 900; // largeur de référence d'une page PDF rendue à 1,5×
// Petite icône PDF en SVG inline — évite une requête réseau pour la miniature
// d'aperçu, et fonctionne même si aucun asset n'est déployé à côté.
const PDF_THUMB_DATAURI =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>" +
  "<path fill='%23d32f2f' d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z'/></svg>";

export class CodexEndossaire extends BaseView {
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

  onReady() {
    this.#renderStampPicker();
    this.#synchroniserBoutonPosition();

    // Import : clic, drag&drop et paste sont centralisés par <codex-drop-zone>
    // (assistés par file-paste pour le Ctrl+V). Un seul point d'entrée.
    this.addEventListener('files-captured', (e) => {
      const file = e.detail?.file;
      if (file) this.#handleFile(file);
    });

    // ✕ sur la preview → on remet tout à zéro
    this.querySelector('#endossaire-dropzone')?.addEventListener('preview-cleared', () => {
      this.#resetAll();
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

  /** Reflète l'état mémorisé (localStorage) sur la grille de position affichée. */
  #synchroniserBoutonPosition() {
    this.querySelectorAll('.endossaire-pos-btn').forEach(b => {
      b.classList.toggle('is-active', b.dataset.v === this._pos.v && b.dataset.h === this._pos.h);
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
  /**
 * Détruit l'instance Fabric courante et nettoie le DOM résiduel
 * (wrapper .canvas-container, upper-canvas, marqueur __fabric).
 * À appeler avant toute nouvelle initialisation de canvas.
 */
  async #detruireCanvas() {
    if (this._fabricCanvas) {
      try {
        await this._fabricCanvas.dispose();
      } catch (e) {
        console.warn('[CodexEndossaire] dispose() a échoué :', e);
      }
      this._fabricCanvas = null;
    }
    // Fabric v7 laisse parfois le wrapper et le marqueur __fabric après dispose().
    // On retire tout ce qui traîne pour garantir un DOM propre.
    const wrap = this.querySelector('#endossaire-canvas-wrap');
    wrap?.querySelectorAll('canvas, .canvas-container').forEach(n => n.remove());
  }

  async #handleFile(file) {
  try {
    this._fileNameBase = (file.name || 'document').replace(/\.[^.]+$/, '');
    this._fabric = await loadFabric();

    // 1. Nettoyage complet de l'import précédent (instance + DOM résiduel)
    await this.#detruireCanvas();

    // 2. Création d'un <canvas> neuf à chaque import — contourne le
    //    marqueur __fabric que Fabric v7 laisse parfois après dispose().
    const wrap = this.querySelector('#endossaire-canvas-wrap');
    const canvasEl = document.createElement('canvas');
    canvasEl.id = 'endossaire-canvas';
    const deleteBtn = wrap.querySelector('#endossaire-btn-delete');
    if (deleteBtn) wrap.insertBefore(canvasEl, deleteBtn.nextSibling);
    else wrap.appendChild(canvasEl);

    // 3. Initialisation Fabric sur cet élément fraîchement créé
    this._fabricCanvas = new this._fabric.Canvas(canvasEl, {
      width: 600, height: 800,
      enableRetinaScaling: false,
      backgroundColor: '#ffffff'
    });

    // 4. Listeners Fabric (sélection, déplacement, mise à l'échelle)
    this._fabricCanvas.on('selection:created', () => this.#updateDeletePos());
    this._fabricCanvas.on('selection:updated', () => this.#updateDeletePos());
    this._fabricCanvas.on('object:moving',   () => this.#updateDeletePos());
    this._fabricCanvas.on('object:scaling', (e) => {
      if (e.target) e.target.scaleY = e.target.scaleX; // ratio toujours conservé
      this.#updateDeletePos();
    });
    this._fabricCanvas.on('selection:cleared', () => {
      const btn = this.querySelector('#endossaire-btn-delete');
      if (btn) btn.hidden = true;
    });

    // 5. Détection PDF / image
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
    this._isPdf = isPdf;

    let previewSrc = null;

    if (isPdf) {
      this._pdfBytesOriginal = await file.arrayBuffer();
      const pdfjs = await loadPdfJs();
      this._pdfDoc = await pdfjs.getDocument({ data: this._pdfBytesOriginal.slice(0) }).promise;
      this._totalPages = this._pdfDoc.numPages;
      this._currentPage = 1;
      await this.#renderPage(1);
      previewSrc = PDF_THUMB_DATAURI;
    } else {
      this._totalPages = 1;
      this._currentPage = 1;
      const url = URL.createObjectURL(file);
      this._objectUrls.push(url);
      previewSrc = url;                  // réutilise l'URL déjà créée pour le fond
      const img = await this._fabric.FabricImage.fromURL(url);
      this.#definirFond(img);
      this.#appliquerZoom(1);
      this._fabricCanvas.renderAll();
    }

    // 6. Mise à jour de l'UI et bascule de phase
    this.#majNavigation();
    this.#updateStats();
    const shareBtn = this.querySelector('#endossaire-btn-share');
    if (shareBtn) shareBtn.hidden = false;
    this.#showPhase('edit');
    this.#ajusterZoomALaLargeur();
    this.#afficherPreview(file, previewSrc);

  } catch (err) {
    console.error('[CodexEndossaire] Erreur import :', err);
    this.notify.error("Impossible de traiter ce fichier : " + (err.message || 'format non pris en charge.'));
    // Échec : on nettoie tout résidu et on retire une éventuelle preview fantôme
    await this.#detruireCanvas();
    this.querySelector('#endossaire-dropzone')?.clearPreview({ silent: true });
    this.#showPhase('import');
  }
}

  #showPhase(phase) {
    this.querySelector('#endossaire-phase-edit')?.toggleAttribute('hidden', phase !== 'edit');
  }
  /** Bascule la dropzone en preview une fois le fichier effectivement traité. */
  #afficherPreview(file, src) {
    const dz = this.querySelector('#endossaire-dropzone');
    if (!dz) return;
    dz.previewSrc = src || '';
    dz.previewName = file.name || 'Document';
    dz.previewDetails = this.#decrireFichier(file);
    dz.state = 'preview';
  }

  /** "PDF · 1,4 Mo" ou "PNG · 320 Ko" — descripteur court pour la preview. */
  #decrireFichier(file) {
    const parts = [];
    const ext = file.type ? file.type.split('/').pop()?.toUpperCase() : '';
    if (ext) parts.push(ext);
    if (file.size) {
      const mo = file.size / 1024 / 1024;
      parts.push(mo >= 1 ? `${mo.toFixed(1)} Mo` : `${Math.round(file.size / 1024)} Ko`);
    }
    return parts.join(' · ');
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
    this.#definirFond(img);
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

  /**
   * Installe l'image de fond. Depuis Fabric v7, l'origine par défaut des
   * objets est leur CENTRE : sans forcer left/top, le fond serait dessiné
   * décalé de (-largeur/2, -hauteur/2), donc « excentré » et rogné.
   * La résolution interne du canvas est calée sur la taille naturelle.
   */
  #definirFond(img) {
    img.set({ originX: 'left', originY: 'top', left: 0, top: 0, selectable: false, evented: false });
    this._fabricCanvas.backgroundImage = img;
    this._fabricCanvas.setDimensions({ width: img.width, height: img.height });
  }

  /**
   * Le zoom ne touche QUE la taille affichée (CSS), jamais la résolution
   * interne du canvas (backing store) — qui reste en permanence à la taille
   * naturelle de la page/image. `setDimensions(..., { cssOnly: true })` est
   * exactement fait pour ça. Séparer les deux évite deux bugs à la fois :
   * un décalage du fond (zone non peinte -> noire à l'export JPEG) et un
   * déplacement des tampons déjà posés si le zoom change ensuite.
   */
  /**
   * Zoom initial : ajuste la page à la largeur disponible (sans jamais
   * agrandir). Indispensable pour les photos, dont la taille naturelle
   * (plusieurs milliers de px) dépasse largement l'écran.
   */
  #ajusterZoomALaLargeur() {
    const wrap = this.querySelector('#endossaire-canvas-wrap');
    const bg = this._fabricCanvas?.backgroundImage;
    if (!wrap || !bg || !wrap.clientWidth) return;

    const zoom = Math.min(1, Math.floor(((wrap.clientWidth - 4) / bg.width) * 100) / 100);
    const select = this.querySelector('#endossaire-zoom');
    if (select) {
      let opt = select.querySelector('option[data-fit]');
      if (!opt) {
        opt = document.createElement('option');
        opt.dataset.fit = '1';
        select.prepend(opt);
      }
      opt.value = String(zoom);
      opt.textContent = `Ajusté (${Math.round(zoom * 100)}%)`;
      select.value = String(zoom);
    }
    this.#appliquerZoom(zoom);
  }

  #appliquerZoom(zoom) {
    this._zoom = zoom;
    if (!this._fabricCanvas) return;
    const bg = this._fabricCanvas.backgroundImage;
    const w = bg ? bg.width : this._fabricCanvas.width;
    const h = bg ? bg.height : this._fabricCanvas.height;
    this._fabricCanvas.setDimensions({ width: w * zoom, height: h * zoom }, { cssOnly: true });
    this._fabricCanvas.requestRenderAll();
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

    // Réglages lus sur le formulaire (source de vérité affichée), pas sur
    // l'état mémorisé : les deux peuvent diverger au premier ajout.
    const { size: sizeReglee, pos } = this.#lireReglages();

    const bg = this._fabricCanvas.backgroundImage;
    const bgW = bg?.width || this._fabricCanvas.width;
    const bgH = bg?.height || this._fabricCanvas.height;

    // La taille saisie est exprimée pour une page de référence de ~900 px de
    // large (un PDF rendu à 1,5×). Une photo de 3000 px de large reçoit donc
    // un tampon proportionnellement plus grand, au lieu d'un timbre minuscule
    // relégué dans un coin hors du cadre visible.
    const facteur = bgW / REF_PAGE_WIDTH;
    const size = sizeReglee * facteur;
    const pad = 20 * facteur;

    // Fabric ne gère pas <textPath> : on rasterise le tampon via le rendu
    // natif du navigateur puis on l'insère comme image (2× la taille affichée,
    // bornée 300–1600 px, pour garder de la marge à l'agrandissement).
    const px = Math.min(1600, Math.max(300, Math.round(size * 2)));
    const pngBlob = await source.toPngBlob(px);
    source.remove();
    const stampUrl = URL.createObjectURL(pngBlob);
    this._objectUrls.push(stampUrl);
    const group = await this._fabric.FabricImage.fromURL(stampUrl);

    group.scaleToWidth(size);
    const w = group.getScaledWidth();
    const h = group.getScaledHeight();

    let left;
    if (pos.h === 'left') left = pad;
    else if (pos.h === 'center') left = bgW / 2 - w / 2;
    else left = bgW - w - pad;

    let top;
    if (pos.v === 'top') top = pad;
    else if (pos.v === 'middle') top = bgH / 2 - h / 2;
    else top = bgH - h - pad;

    group.set({
      originX: 'left',
      originY: 'top',
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
    // Ratio verrouillé : pas de poignées latérales (étirement non uniforme)
    group.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false });

    this._fabricCanvas.add(group);
    this._fabricCanvas.setActiveObject(group);
    this._fabricCanvas.renderAll();
    this.#updateStats();
  }

  /**
   * Réglages effectifs : lus dans le DOM (bouton de position actif, champ de
   * taille), avec repli sur l'état interne.
   */
  #lireReglages() {
    const actif = this.querySelector('.endossaire-pos-btn.is-active');
    const pos = actif ? { v: actif.dataset.v, h: actif.dataset.h } : this._pos;
    const saisie = parseInt(this.querySelector('#endossaire-pref-size')?.value, 10);
    const size = Number.isFinite(saisie) && saisie > 0 ? saisie : this._defaultSize;
    return { size, pos };
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

    // rect est en coordonnées internes (taille naturelle) ; le canvas est
    // affiché à `zoom` en CSS -> on convertit en coordonnées écran.
    const rect = obj.getBoundingRect();
    const zoom = this._zoom;
    btn.hidden = false;
    btn.style.top = `${Math.max(0, rect.top * zoom - 10)}px`;
    btn.style.left = `${(rect.left + rect.width) * zoom - 15}px`;
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

    // pdf.js a rendu les pages à scale 1.5 (cf. #renderPage)
    const SCALE_RENDER = 1.5;

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

      // --- Zone réellement rendue par pdf.js : CropBox (fallback MediaBox) ---
      let box;
      try { box = page.getCropBox(); } catch { box = page.getMediaBox(); }
      const { x: bx, y: by, width: bw, height: bh } = box;

      // --- Rotation de page (souvent /Rotate 90 ou 270 sur un scan) ---
      const R = (((page.getRotation()?.angle ?? 0) % 360) + 360) % 360;

      // --- Centre du tampon en coordonnées canvas, ramené à l'échelle 1 ---
      const center = o.getCenterPoint();
      const cx = center.x / SCALE_RENDER;
      const cy = center.y / SCALE_RENDER;

      // --- Centre du tampon en coordonnées PDF (origine bas-gauche, y vers le haut) ---
      let px, py;
      if (R === 0) { px = bx + cx; py = by + bh - cy; }
      else if (R === 90) { px = bx + cy; py = by + cx; }
      else if (R === 180) { px = bx + bw - cx; py = by + cy; }
      else /* R=270 */ { px = bx + bw - cy; py = by + bh - cx; }

      // --- Taille du tampon en unités PDF ---
      const drawW = o.getScaledWidth() / SCALE_RENDER;
      const drawH = o.getScaledHeight() / SCALE_RENDER;

      // --- Rotation PDF (CCW positif) = rotation page − rotation canvas (CW) ---
      const alphaDeg = R - (o.angle || 0);
      const alpha = alphaDeg * Math.PI / 180;
      const cosA = Math.cos(alpha), sinA = Math.sin(alpha);

      // pdf-lib dessine à partir du coin bas-gauche de l'image NON tournée,
      // puis effectue la rotation autour de ce coin. On veut que le CENTRE
      // soit à (px, py) : il faut donc reculer du demi-vecteur tourné.
      const x = px - (drawW / 2) * cosA + (drawH / 2) * sinA;
      const y = py - (drawW / 2) * sinA - (drawH / 2) * cosA;

      page.drawImage(embeddedImg, {
        x, y,
        width: drawW,
        height: drawH,
        rotate: degrees(alphaDeg)
      });
    }

    const bytes = await pdfDoc.save();
    return {
      blob: new Blob([bytes], { type: 'application/pdf' }),
      filename: `${this._fileNameBase}_tamponne.pdf`
    };
  }

  async #construireImageExport() {
    const dataUrl = this._fabricCanvas.toDataURL({ format: 'jpeg', quality: 0.95 });
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return { blob, filename: `${this._fileNameBase}_tamponne.jpg` };
  }

  async #resetAll() {
    await this.#detruireCanvas();

    this._objectUrls.forEach(u => URL.revokeObjectURL(u));
    this._objectUrls = [];
    this._pdfDoc = null;
    this._pdfBytesOriginal = null;
    this._isPdf = false;
    this._currentPage = 1;
    this._totalPages = 1;

    this.querySelector('#endossaire-dropzone')?.clearPreview({ silent: true });
    this.#showPhase('import');
  }
}

if (!customElements.get('codex-endossaire')) {
  customElements.define('codex-endossaire', CodexEndossaire);
}