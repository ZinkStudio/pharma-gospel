import { BaseComponent } from '../../core/base-component.js';
import { downloadBlob, canShareFiles, shareBlob } from '../../utils/export-utils.js';
import { removeImageBackground } from '../../utils/ordoscan-bgremoval.js';
import { detectDocumentCorners, mountCornerEditor, extractFlattenedImage } from './scanic-adapter.js';
import { garantirFichierImage } from './format-convert.js';
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
    this.querySelector('#ordoscan-btn-restart')?.addEventListener('click', () => this.#resetAll());
  }

  #showPhase(phase) {
    this.querySelector('#ordoscan-phase-import')?.toggleAttribute('hidden', phase !== 'import');
    this.querySelector('#ordoscan-phase-crop')?.toggleAttribute('hidden', phase !== 'crop');
    this.querySelector('#ordoscan-phase-result')?.toggleAttribute('hidden', phase !== 'result');
  }

  // =============================================================
  // Import (fichier, PDF, HEIC — conversion transparente)
  // =============================================================
  async #handleFile(file) {
    try {
      const status = this.querySelector('#ordoscan-crop-status');
      this.#showPhase('crop');
      if (status) { status.textContent = '📄 Préparation du fichier…'; status.hidden = false; }

      const imageFile = await garantirFichierImage(file);
      const url = URL.createObjectURL(imageFile);
      this._objectUrls.push(url);

      const img = await this.#chargerImage(url);
      this._sourceImageEl = await redimensionnerPourTraitement(img, MAX_LONG_SIDE);

      await this.#initCrop();
    } catch (err) {
      console.error('[CodexOrdoscan] Erreur import :', err);
      this.notify.error("Impossible de traiter ce fichier : " + (err.message || 'format non pris en charge.'));
      this.#showPhase('import');
    }
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
    const status = this.querySelector('#ordoscan-crop-status');
    const container = this.querySelector('#ordoscan-scanic-container');
    if (!container) return;

    status.textContent = '🔍 Détection du document en cours…';
    status.hidden = false;

    const corners = await detectDocumentCorners(this._sourceImageEl);
    status.hidden = true;

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
      this.#showPhase('result');
    } catch (err) {
      console.error('[CodexOrdoscan] Erreur extraction :', err);
      this.notify.error('Erreur lors du recadrage : ' + err.message);
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

    cases.forEach((input, i) => {
      const preset = FORMATS[input.value];
      if (!preset) return;

      setTimeout(() => {
        const canvas = ajusterAuFormat(sourceCanvas, preset.width, preset.height);
        canvas.toBlob(blob => {
          downloadBlob(blob, `ordonnance-${preset.label}.jpg`);
        }, 'image/jpeg', 0.95);
      }, i * 300); // léger décalage pour éviter le blocage navigateur des téléchargements multiples
    });

    this.notify.success(`${cases.length} fichier(s) en cours de téléchargement`);
  }

  async #shareCurrent() {
    if (!this._currentBlob) return;
    try {
      await shareBlob(this._currentBlob, 'ordonnance.png', 'Ordonnance nettoyée');
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
    this._sourceImageEl = null;
    this._cornerEditor?.destroy();
    this._cornerEditor = null;
    this._croppedCanvas = null;
    this._currentBlob = null;

    const fileInput = this.querySelector('#ordoscan-fileinput');
    if (fileInput) fileInput.value = '';

    const removeBgBtn = this.querySelector('#ordoscan-btn-remove-bg');
    if (removeBgBtn) { removeBgBtn.hidden = false; removeBgBtn.disabled = false; }

    this.#showPhase('import');
  }
}

if (!customElements.get('codex-ordoscan')) {
  customElements.define('codex-ordoscan', CodexOrdoscan);
}