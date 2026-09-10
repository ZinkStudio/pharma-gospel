/**
 * Assistant Clipboard Paste & Drop (Générique)
 * Capture les fichiers collés ou glissés sur un composant hôte,
 * avec filtrage configurable par types MIME et extensions.
 */
export default class FileDropPasteAssistant {
  /**
   * @param {HTMLElement} host - Le composant Web hôte
   * @param {Object} options
   * @param {string[]} [options.acceptMime=['image/*', 'application/pdf']] - Types MIME autorisés
   * @param {string[]} [options.acceptExtensions=['.pdf', '.heic', '.png', '.jpg', '.jpeg']] - Extensions autorisées
   * @param {string} [options.dragClass='dragover'] - Classe CSS ajoutée sur la zone lors du drag
   * @param {boolean} [options.multiple=false] - Accepter plusieurs fichiers simultanément
   */
  constructor(host, options = {}) {
    this.host = host;
    this.options = {
      acceptMime: options.acceptMime || ['image/*', 'application/pdf'],
      acceptExtensions: options.acceptExtensions || ['.pdf', '.heic', '.png', '.jpg', '.jpeg', '.webp'],
      dragClass: options.dragClass || 'is-dragover',
      multiple: options.multiple || false,
      ...options
    };

    this.#init();
  }

  #init() {
    const target = this.host.shadowRoot || this.host;

    // Coller (Paste)
    this.host.addEventListener('paste', (e) => this.#handlePaste(e));

    // Drag & Drop UI & Data
    target.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.host.classList.add(this.options.dragClass);
    });

    target.addEventListener('dragleave', (e) => {
      e.preventDefault();
      // Retrait de la classe si on quitte réellement l'élément hôte
      if (!this.host.contains(e.relatedTarget)) {
        this.host.classList.remove(this.options.dragClass);
      }
    });

    target.addEventListener('drop', (e) => {
      e.preventDefault();
      this.host.classList.remove(this.options.dragClass);
      this.#handleDrop(e);
    });
  }

  #handlePaste(event) {
    const items = event.clipboardData?.items;
    if (!items) return;

    const extractedFiles = [];
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && this.#isAccepted(file)) {
          extractedFiles.push(file);
          if (!this.options.multiple) break;
        }
      }
    }

    if (extractedFiles.length > 0) {
      event.preventDefault();
      this.#emitCaptured(extractedFiles);
    }
  }

  #handleDrop(event) {
    const rawFiles = event.dataTransfer?.files;
    if (!rawFiles || rawFiles.length === 0) return;

    const acceptedFiles = Array.from(rawFiles).filter(file => this.#isAccepted(file));

    if (acceptedFiles.length > 0) {
      const result = this.options.multiple ? acceptedFiles : [acceptedFiles[0]];
      this.#emitCaptured(result);
    }
  }

  /**
   * Vérifie si le fichier correspond aux filtres MIME ou extension.
   */
  #isAccepted(file) {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();

    // 1. Verification par extension
    const hasValidExtension = this.options.acceptExtensions.some(ext => fileName.endsWith(ext.toLowerCase()));
    if (hasValidExtension) return true;

    // 2. Verification par Type MIME (support wildcard image/*)
    const hasValidMime = this.options.acceptMime.some(mime => {
      if (mime.endsWith('/*')) {
        const baseMime = mime.replace('/*', '');
        return fileType.startsWith(baseMime);
      }
      return fileType === mime;
    });

    return hasValidMime;
  }

  #emitCaptured(files) {
    this.host.dispatchEvent(new CustomEvent('files-captured', {
      detail: {
        files: files,
        file: files[0] // Rétrocompatibilité si un seul fichier attendu
      },
      bubbles: true,
      composed: true
    }));
  }
}