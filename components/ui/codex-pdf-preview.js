// /static/js/components/pdf-preview-element.js
import { LitElement, html, css } from '/lit';

export class PdfPreviewElement extends LitElement {
    static properties = {
        src: { type: String },
        filename: { type: String },
        loading: { type: Boolean, state: true }
    };

    static styles = css`
        :host { display: block; width: 100%; }
        .toolbar { display: flex; justify: space-between; align-items: center; padding: 0.5rem; background: #f6f6f6; border: 1px solid #e5e5e5; }
        iframe { width: 100%; height: 600px; border: 1px solid #ccc; margin-top: 0.5rem; }
    `;

    constructor() {
        super();
        this.src = null;
        this.filename = 'document.pdf';
        this.loading = false;
    }

    render() {
        return html`
            <div class="toolbar">
                <span>Prévisualisation PDF</span>
                <div>
                    <button @click=${this._download} ?disabled=${!this.src}>Télécharger</button>
                    <button @click=${this._print} ?disabled=${!this.src}>Imprimer</button>
                </div>
            </div>
            ${this.loading ? html`<div>Génération du document...</div>` : ''}
            ${this.src ? html`<iframe src="${this.src}"></iframe>` : ''}
        `;
    }

    setPdfBlob(blob, filename) {
        if (this.src) URL.revokeObjectURL(this.src);
        this.src = URL.createObjectURL(blob);
        this.filename = filename || this.filename;
    }

    _download() {
        if (this.src) {
            const a = document.createElement('a');
            a.href = this.src;
            a.download = this.filename;
            a.click();
        }
    }

    _print() {
        if (this.src) {
            const iframe = this.shadowRoot.querySelector('iframe');
            iframe?.contentWindow?.print();
        }
    }
}

customElements.define('pdf-preview-element', PdfPreviewElement);