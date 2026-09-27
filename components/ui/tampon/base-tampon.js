import { downloadBlob } from '../../../utils/export-utils.js';

/**
 * BaseTampon
 * Classe abstraite commune à toute la collection de tampons. Chaque forme
 * (rond, rectangle, à venir : ovale…) est un Custom Element séparé qui
 * étend cette classe et implémente `buildSvg()` — la géométrie propre à sa
 * forme. Tout le reste (attributs, ajustement du texte courbé, export) est
 * partagé, pour ne jamais dupliquer de balisage d'un tampon à l'autre.
 */
export class BaseTampon extends HTMLElement {
  static get observedAttributes() {
    return ['top', 'bottom', 'center', 'center-sub', 'color', 'size'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.#render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.#render();
  }

  get top() { return this.getAttribute('top') || ''; }
  get bottom() { return this.getAttribute('bottom') || ''; }
  get center() { return this.getAttribute('center') || ''; }
  /** Deuxième ligne centrée optionnelle (ex: nom de la personne sous la fonction) */
  get centerSub() { return this.getAttribute('center-sub') || ''; }
  get color() { return this.getAttribute('color') || '#006d44'; }
  get size() { return parseInt(this.getAttribute('size'), 10) || 250; }

  /**
   * À implémenter par chaque sous-classe : renvoie le balisage SVG complet
   * (chaîne), géométrie propre à la forme.
   */
  buildSvg() {
    throw new Error('buildSvg() doit être implémenté par la sous-classe');
  }

  /**
   * Ajuste dynamiquement `textLength` sur chaque <text> porteur d'un
   * <textPath>, d'après la longueur réelle rendue du texte — remplace les
   * valeurs calculées à la main dans stamp.html, qui ne fonctionnaient que
   * pour un texte précis.
   */
  #ajusterTextPaths() {
    this.shadowRoot.querySelectorAll('textPath').forEach(tp => {
      const parentText = tp.closest('text');
      if (!parentText) return;
      try {
        const longueur = parentText.getComputedTextLength();
        if (longueur > 0) parentText.setAttribute('textLength', longueur);
      } catch {
        // SVG pas encore mesurable (hors DOM) — ignoré, sans conséquence visuelle
      }
    });
  }

  #render() {
    this.shadowRoot.innerHTML = `
      <style>:host { display: inline-block; line-height: 0; }</style>
      ${this.buildSvg()}
    `;
    requestAnimationFrame(() => this.#ajusterTextPaths());
  }

  get svgElement() {
    return this.shadowRoot.querySelector('svg');
  }

  // ===========================================================
  // API commune d'export — réutilisée par la vue d'apposition
  // ===========================================================

  /** Sérialise le tampon en SVG autonome (espace de noms explicite). */
  toSvgString() {
    const clone = this.svgElement.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return new XMLSerializer().serializeToString(clone);
  }

  /** Rasterise le tampon en PNG carré (pour incrustation dans un document). */
  toPngBlob(pixelSize = 600) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = pixelSize;
      const img = new Image();
      img.onload = () => {
        canvas.getContext('2d').drawImage(img, 0, 0, pixelSize, pixelSize);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Rasterisation échouée')), 'image/png');
      };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(this.toSvgString())));
    });
  }

  downloadSvg(filename) {
    const blob = new Blob([this.toSvgString()], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, filename || `${this.tagName.toLowerCase()}.svg`);
  }
}