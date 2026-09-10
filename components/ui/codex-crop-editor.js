import { BaseComponent } from '../../core/base-component.js';

export class CodexCropEditor extends BaseComponent {
  static get observedAttributes() { return ['src']; }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; position: relative; overflow: hidden; background: #000; }
        canvas { display: block; max-width: 100%; height: auto; margin: 0 auto; }
        .controls { position: absolute; bottom: 10px; right: 10px; display: flex; gap: 8px; }
        button { background: rgba(255,255,255,0.9); border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
      </style>
      <canvas id="crop-canvas"></canvas>
      <div class="controls">
        <button id="reset">Réinitialiser</button>
        <button id="validate">Valider le recadrage</button>
      </div>
    `;
  }

  onReady() {
    const canvas = this.$('#crop-canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };

    if (this.getAttribute('src')) {
      img.src = this.getAttribute('src');
    }

    this.$('#validate').addEventListener('click', () => {
      const croppedDataUrl = canvas.toDataURL('image/png');
      this.dispatchEvent(new CustomEvent('crop-complete', { detail: { image: croppedDataUrl }, bubbles: true }));
    });
  }
}
customElements.define('codex-crop-editor', CodexCropEditor);