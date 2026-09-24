import { BaseComponent } from '../../core/base-component.js';
import { downloadBlob, canShareFiles, shareBlob } from '../../utils/export-utils.js';
import { removeImageBackground } from '../../utils/ordoscan-bgremoval.js';
import { detectDocumentCorners, mountCornerEditor, extractFlattenedImage } from './scanic-adapter.js';
import { analyserFichier, tenterConversionHeicDeSecours } from './format-convert.js';
import { redimensionnerPourTraitement, ajusterAuFormat } from './smart-resize.js';

const MAX_LONG_SIDE = 2600;

const FORMATS = {
  'scanner-portrait': { width: 1240, height: 1754, label: 'portrait-scanner' },
  'scanner-paysage': { width: 1754, height: 1240, label: 'paysage-scanner' },
  'ecran-portrait': { width: 794, height: 1123, label: 'portrait-ecran' },
  'ecran-paysage': { width: 1123, height: 794, label: 'paysage-ecran' }
};

export class CodexOrdoscan extends BaseComponent {
  constructor() {
    super();
    this._fichierOriginal = null;
    this._queue = null;        // { type, count, getImage(index) } — pages PDF ou images HEIC
    this._queueIndex = 0;
    this._sourceImageEl = null;
    this._cornerEditor = null;
    this._croppedCanvas = null;
    this._currentBlob = null;
    this._objectUrls = [];
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>:host { display: block; }</style>
      <slot></slot>
    `;
  }

  onReady() {
    const dropzone = this.querySelector('#ordoscan-dropzone');
    const fileInput = this.querySelector('#ordoscan-fileinput');

    dropzone?.addEventListener('click', () => fileInput.click());
    dropzone?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.#handleFile(file);
    });

    // Assistant clipboard-paste (glisser-déposer + coller) attaché via
    // l'attribut `assistants="clipboard-paste"` sur l'hôte.
    this.addEventListener('files-captured', (e) => {
      const file = e.detail?.file;
      if (file) this.#handleFile(file);
    });

    this.querySelector('#ordoscan-btn-remove-bg')?.addEventListener('click', () => this.#runBackgroundRemoval());
    this.querySelector('#ordoscan-btn-download')?.addEventListener('click', () => this.#downloadSelectedFormats());
    this.querySelector('#ordoscan-btn-share')?.addEventListener('click', () => this.#shareCurrent());
    this.querySelector('#ordoscan-btn-cancel')?.addEventListener('click', () => this.#resetAll());
    this.querySelector('#ordoscan-btn-restart')?.addEventListener('click', () => this.#handleRestartOuSuivant());
  }

  #showPhase(phase) {
    this.querySelector('#ordoscan-phase-import')?.toggleAttribute('hidden', phase !== 'import');
    this.querySelector('#ordoscan-phase-crop')?.toggleAttribute('hidden', phase !== 'crop');
    this.querySelector('#ordoscan-phase-result')?.toggleAttribute('hidden', phase !== 'result');
  }

  #setStatus(text) {
    const status = this.querySelector('#ordoscan-crop-status');
    if (status) { status.textContent = text; status.hidden = false; }
  }

  #hideStatus() {
    const status = this.querySelector('#ordoscan-crop-status');
    if (status) status.hidden = true;
  }

  // =============================================================
  // Import (fichier, PDF, HEIC — conversion transparente + multi-pages)
  // =============================================================
  async #handleFile(file) {
    try {
      this.#showPhase('crop');
      this.#setStatus('📄 Analyse du fichier…');

      this._fichierOriginal = file;
      this._queue = await analyserFichier(file);
      this._queueIndex = 0;

      if (this._queue.count > 1) {
        const nom = this._queue.type === 'pdf' ? 'pages' : 'images';
        this.notify.info(`Ce fichier contient ${this._queue.count} ${nom} — elles seront traitées une par une.`);
      }

      await this.#traiterItemCourant();
    } catch (err) {
      console.error('[CodexOrdoscan] Erreur import :', err);
      this.notify.error(this.#messageErreurImport(err));
      this.#showPhase('import');
    }
  }

  /**
   * Charge, redimensionne et lance le recadrage pour l'item courant de la
   * file (page PDF ou image HEIC à l'index `this._queueIndex`).
   */
  async #traiterItemCourant() {
    this.#setStatus('📄 Préparation…');
    const imageFile = await this._queue.getImage(this._queueIndex);

    const img = this._queue.type === 'image'
      ? await this.#chargerImageAvecSecoursHeic(imageFile, this._fichierOriginal)
      : await this.#chargerImageDepuisFichier(imageFile);

    this._sourceImageEl = await redimensionnerPourTraitement(img, MAX_LONG_SIDE);
    await this.#initCrop();
  }

  /**
   * Message d'erreur adapté au type d'échec (plutôt que le générique
   * "format non pris en charge" quel que soit le problème réel).
   */
  #messageErreurImport(err) {
    if (err.code === 'PDF_BLANK_RENDER' || err.code === 'HEIC_CONVERSION_FAILED') {
      return err.message;
    }
    return "Impossible de traiter ce fichier : format non reconnu ou fichier corrompu.";
  }

  /**
   * Charge le fichier comme image. Si ça échoue ET que le fichier a toutes
   * les apparences d'un HEIC (extension/mime) malgré une signature non
   * reconnue par `detecterTypeFichier` (cas d'un convertisseur en ligne qui
   * produit une marque ftyp non standard), retente une conversion HEIC
   * explicite avant d'abandonner. Ne s'applique qu'au cas "image simple"
   * (une page PDF ou une image HEIC déjà extraite est toujours un JPEG net).
   */
  async #chargerImageAvecSecoursHeic(imageFile, fichierOriginal) {
    const url = URL.createObjectURL(imageFile);
    this._objectUrls.push(url);

    try {
      return await this.#chargerImage(url);
    } catch {
      const converti = await tenterConversionHeicDeSecours(fichierOriginal);
      if (!converti) throw new Error('Format non reconnu par le navigateur.');

      const urlSecours = URL.createObjectURL(converti);
      this._objectUrls.push(urlSecours);
      return this.#chargerImage(urlSecours);
    }
  }

  #chargerImageDepuisFichier(imageFile) {
    const url = URL.createObjectURL(imageFile);
    this._objectUrls.push(url);
    return this.#chargerImage(url);
  }

  #chargerImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // =============================================================
  // Recadrage + perspective (Scanic)
  // =============================================================
  async #initCrop() {
    const container = this.querySelector('#ordoscan-scanic-container');
    if (!container) return;

    this.#setStatus('🔍 Détection du document en cours…');

    const corners = await detectDocumentCorners(this._sourceImageEl);
    this.#hideStatus();

    this._cornerEditor?.destroy();
    this._cornerEditor = mountCornerEditor(container, this._sourceImageEl, corners, {
      onConfirm: (finalCorners) => this.#validateCrop(finalCorners)
    });
  }

  async #validateCrop(corners) {
    try {
      const canvas = await extractFlattenedImage(this._sourceImageEl, corners);
      this._croppedCanvas = canvas;

      const blob = await this.#canvasToBlob(canvas, 'image/jpeg', 0.95);
      this._currentBlob = blob;

      this._cornerEditor?.destroy();
      this._cornerEditor = null;

      this.#afficherResultat();
      this.#mettreAJourNavigationPages();
      this.#showPhase('result');
    } catch (err) {
      console.error('[CodexOrdoscan] Erreur extraction :', err);
      this.notify.error('Erreur lors du recadrage : ' + err.message);
    }
  }

  // =============================================================
  // Navigation multi-pages (file de pages PDF / images HEIC)
  // =============================================================
  #mettreAJourNavigationPages() {
    const indicator = this.querySelector('#ordoscan-page-indicator');
    const restartBtn = this.querySelector('#ordoscan-btn-restart');
    const multiPage = this._queue && this._queue.count > 1;
    const aEncorePages = multiPage && (this._queueIndex + 1) < this._queue.count;

    if (indicator) {
      indicator.hidden = !multiPage;
      if (multiPage) indicator.textContent = `Page ${this._queueIndex + 1} / ${this._queue.count}`;
    }
    if (restartBtn) {
      restartBtn.textContent = aEncorePages ? '➡ Page suivante' : '🔄 Traiter un autre fichier';
    }
  }

  #handleRestartOuSuivant() {
    const aEncorePages = this._queue && (this._queueIndex + 1) < this._queue.count;
    aEncorePages ? this.#pageSuivante() : this.#resetAll();
  }

  async #pageSuivante() {
    this._queueIndex++;
    this._croppedCanvas = null;
    this._currentBlob = null;

    const removeBgBtn = this.querySelector('#ordoscan-btn-remove-bg');
    if (removeBgBtn) { removeBgBtn.hidden = false; removeBgBtn.disabled = false; }

    this.#showPhase('crop');
    try {
      await this.#traiterItemCourant();
    } catch (err) {
      console.error('[CodexOrdoscan] Erreur page suivante :', err);
      this.notify.error(this.#messageErreurImport(err));
      this.#showPhase('import');
    }
  }

  // =============================================================
  // Résultat : suppression de fond, export
  // =============================================================
  #afficherResultat() {
    const img = this.querySelector('#ordoscan-result-img');
    if (!img || !this._currentBlob) return;

    const url = URL.createObjectURL(this._currentBlob);
    this._objectUrls.push(url);
    img.src = url;

    const shareBtn = this.querySelector('#ordoscan-btn-share');
    shareBtn?.toggleAttribute('hidden', !canShareFiles(this._currentBlob, 'ordonnance.png'));
  }
async #runBackgroundRemoval() {
    const btn = this.querySelector('#ordoscan-btn-remove-bg');
    const progress = this.querySelector('#ordoscan-bg-progress');
    if (!this._croppedCanvas) return;

    btn.disabled = true;
    progress.hidden = false;

    // ⏱️ Démarrage du chronomètre
    const startTime = performance.now();

    try {
        const croppedBlob = await this.#canvasToBlob(this._croppedCanvas, 'image/jpeg', 0.95);
        const transparentPng = await removeImageBackground(croppedBlob, (key, current, total) => {
            const percent = total ? Math.round((current / total) * 100) : 0;
            progress.textContent = `⏳ Traitement en cours (${key})… (${percent}%)`;
        });

        // ⏱️ Fin du chronomètre
        const endTime = performance.now();
        const durationMs = endTime - startTime;
        const durationSeconds = (durationMs / 1000).toFixed(2);

        console.log(`⏱️ [OrdoscanBgRemoval] Temps de traitement total : ${durationSeconds} s (${durationMs.toFixed(0)} ms)`);

        this._currentBlob = transparentPng;
        this.#afficherResultat();
        
        // Vous pouvez même l'inclure dans la notification si vous le souhaitez !
        this.notify.success(`Arrière-plan supprimé en ${durationSeconds}s`);
        btn.hidden = true;
    } catch (err) {
        console.error('[CodexOrdoscan] Erreur suppression du fond :', err);
        this.notify.error('Erreur lors de la suppression du fond : ' + err.message);
        btn.disabled = false;
    } finally {
        progress.hidden = true;
    }
}
  async #runBackgroundRemovalOld() {
    const btn = this.querySelector('#ordoscan-btn-remove-bg');
    const progress = this.querySelector('#ordoscan-bg-progress');
    if (!this._croppedCanvas) return;

    btn.disabled = true;
    progress.hidden = false;

    try {
      const croppedBlob = await this.#canvasToBlob(this._croppedCanvas, 'image/jpeg', 0.95);
      const transparentPng = await removeImageBackground(croppedBlob, (key, current, total) => {
        progress.textContent = `⏳ Traitement en cours… (${Math.round((current / total) * 100)}%)`;
      });

      this._currentBlob = transparentPng;
      this.#afficherResultat();
      this.notify.success("Arrière-plan supprimé");
      btn.hidden = true;
    } catch (err) {
      console.error('[CodexOrdoscan] Erreur suppression du fond :', err);
      this.notify.error('Erreur lors de la suppression du fond : ' + err.message);
      btn.disabled = false;
    } finally {
      progress.hidden = true;
    }
  }

  /**
   * Suffixe de nom de fichier pour la page/image courante, uniquement si le
   * fichier source en contient plusieurs (évite d'écraser les précédentes).
   */
  #suffixePage() {
    return (this._queue && this._queue.count > 1) ? `-page-${this._queueIndex + 1}` : '';
  }

  /**
   * Télécharge le résultat actuel dans chacun des formats cochés
   * (téléchargements successifs, volontairement pas de zip).
   */
  async #downloadSelectedFormats() {
    const cases = [...this.querySelectorAll('input[name="format"]:checked')];
    if (!cases.length) {
      this.notify.info('Sélectionnez au moins un format à télécharger.');
      return;
    }
    if (!this._currentBlob) return;

    const sourceCanvas = await this.#blobToCanvas(this._currentBlob);
    const suffixe = this.#suffixePage();

    cases.forEach((input, i) => {
      const preset = FORMATS[input.value];
      if (!preset) return;

      setTimeout(() => {
        const canvas = ajusterAuFormat(sourceCanvas, preset.width, preset.height);
        canvas.toBlob(blob => {
          downloadBlob(blob, `ordonnance${suffixe}-${preset.label}.jpg`);
        }, 'image/jpeg', 0.95);
      }, i * 300); // léger décalage pour éviter le blocage navigateur des téléchargements multiples
    });

    this.notify.success(`${cases.length} fichier(s) en cours de téléchargement`);
  }

  async #shareCurrent() {
    if (!this._currentBlob) return;
    try {
      await shareBlob(this._currentBlob, `ordonnance${this.#suffixePage()}.png`, 'Ordonnance nettoyée');
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[CodexOrdoscan] Erreur de partage :', err);
        this.notify.error('Le partage a échoué.');
      }
    }
  }

  // =============================================================
  // Utilitaires
  // =============================================================
  #canvasToBlob(canvas, type, quality) {
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
  }

  #blobToCanvas(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  #resetAll() {
    this._objectUrls.forEach(u => URL.revokeObjectURL(u));
    this._objectUrls = [];
    this._fichierOriginal = null;
    this._queue = null;
    this._queueIndex = 0;
    this._sourceImageEl = null;
    this._cornerEditor?.destroy();
    this._cornerEditor = null;
    this._croppedCanvas = null;
    this._currentBlob = null;

    const fileInput = this.querySelector('#ordoscan-fileinput');
    if (fileInput) fileInput.value = '';

    const removeBgBtn = this.querySelector('#ordoscan-btn-remove-bg');
    if (removeBgBtn) { removeBgBtn.hidden = false; removeBgBtn.disabled = false; }

    const indicator = this.querySelector('#ordoscan-page-indicator');
    if (indicator) indicator.hidden = true;

    this.#showPhase('import');
  }
}

if (!customElements.get('codex-ordoscan')) {
  customElements.define('codex-ordoscan', CodexOrdoscan);
}