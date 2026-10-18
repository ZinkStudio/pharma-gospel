import { BaseView } from '../../core/base-view.js';
import { PDFService } from '../../services/pdf/pdf-service.js';
import { PDF_PRESETS } from '../../services/pdf/engines/html2pdf-engine.js';
import { prestataires, infosPratiques } from './tirelait-data.js';

// Styles spécifiques pour l'export PDF (A4)
const PDF_STYLE = `
  .pdf-container {
    width: 200mm;
    min-height: 287mm;
    padding: 10mm;
    background: #ffffff;
    box-sizing: border-box;
    font-family: Arial, Helvetica, sans-serif;
    color: #1e1e1e;
    font-size: 11pt;
  }
  .pdf-title { font-size: 18pt; font-weight: bold; color: #006d44; margin-bottom: 5mm; text-align: center; }
  .pdf-section-title { font-size: 14pt; font-weight: bold; border-bottom: 2px solid #006d44; padding-bottom: 2mm; margin: 6mm 0 3mm 0; color: #161616; }
  .pdf-subtitle { font-size: 10pt; font-style: italic; color: #666; margin-bottom: 3mm; }
  .pdf-item { margin-bottom: 4mm; page-break-inside: avoid; }
  .pdf-item-name { font-weight: bold; font-size: 12pt; }
  .pdf-item-tel { font-weight: bold; color: #0f62fe; font-size: 11pt; margin-left: 2mm; }
  .pdf-item-desc { font-size: 10pt; color: #333; margin-top: 1mm; }
  .pdf-list { margin: 0; padding-left: 5mm; font-size: 10pt; color: #333; }
  .pdf-list li { margin-bottom: 2mm; }
`;

export class CodexTirelait extends BaseView {
  onReady() {
    this._content = this.querySelector('#tirelait-content');
    this._renderContent();

    this.querySelector('#tirelait-btn-pdf')?.addEventListener('click', () => {
      this._telechargerPdf();
    });
  }

  _renderContent() {
    if (!this._content) return;

    const tiersPayant = prestataires.filter(p => p.categorie === 'tiers-payant');
    const enLigne = prestataires.filter(p => p.categorie === 'en-ligne');

    const renderList = (list) => list.map(p => `
      <div class="tirelait-card">
        <div class="tirelait-card-header">
          <strong>${p.nom}</strong>
          <span class="tirelait-phone">📞 ${p.telephone}</span>
        </div>
        <div class="tirelait-desc">${p.description}</div>
      </div>
    `).join('');

    this._content.innerHTML = `
      <div class="tirelait-section">
        <h2 class="tirelait-title">Avec prise en charge du tiers-payant</h2>
        <p class="tirelait-subtitle">Pas d'avance de frais de location</p>
        <div class="tirelait-grid">${renderList(tiersPayant)}</div>
      </div>

      <div class="tirelait-section">
        <h2 class="tirelait-title">Pharmacies & Location en ligne</h2>
        <p class="tirelait-subtitle">Possibilité de location en ligne - Avance de frais en fin de location</p>
        <div class="tirelait-grid">${renderList(enLigne)}</div>
      </div>

      <div class="tirelait-info-box">
        <h2 class="tirelait-title">Quelle prise en charge du tiers-payant ?</h2>
        <ul class="tirelait-list">
          ${infosPratiques.priseEnCharge.map(i => `<li>${i}</li>`).join('')}
        </ul>

        <h2 class="tirelait-title" style="margin-top: 1.5rem;">Pièces à fournir</h2>
        <ul class="tirelait-list">
          ${infosPratiques.piecesAFournir.map(i => `<li>${i}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  async _telechargerPdf() {
    try {
      this.notify.info('Génération de la fiche PDF...');
      
      // Construction du DOM pour le PDF
      const container = document.createElement('div');
      container.className = 'pdf-container';
      
      const tiersPayant = prestataires.filter(p => p.categorie === 'tiers-payant');
      const enLigne = prestataires.filter(p => p.categorie === 'en-ligne');

      const renderPdfItems = (list) => list.map(p => `
        <div class="pdf-item">
          <span class="pdf-item-name">${p.nom}</span>
          <span class="pdf-item-tel">- ${p.telephone}</span>
          <div class="pdf-item-desc">${p.description}</div>
        </div>
      `).join('');

      container.innerHTML = `
        <div class="pdf-title">Location de Tire-Lait</div>
        
        <div class="pdf-section-title">Avec tiers-payant (Sans avance de frais)</div>
        ${renderPdfItems(tiersPayant)}

        <div class="pdf-section-title">Pharmacies & Location en ligne (Avance de frais)</div>
        ${renderPdfItems(enLigne)}

        <div class="pdf-section-title" style="margin-top: 8mm;">Prise en charge & Pièces à fournir</div>
        <ul class="pdf-list">
          ${infosPratiques.priseEnCharge.map(i => `<li>${i}</li>`).join('')}
        </ul>
        <div style="font-weight: bold; margin-top: 4mm; margin-bottom: 2mm;">Pièces à fournir :</div>
        <ul class="pdf-list">
          ${infosPratiques.piecesAFournir.map(i => `<li>${i}</li>`).join('')}
        </ul>
      `;

      await PDFService.capture(container, {
        ...PDF_PRESETS.DOCUMENT,
        margin: 0,
        filename: 'infos-tire-lait.pdf',
        action: 'download',
        styles: PDF_STYLE
      });

      this.notify.success('Fiche PDF générée avec succès.');
    } catch (err) {
      console.error('[CodexTirelait] Erreur génération PDF :', err);
      this.notify.error('Erreur lors de la génération du PDF.');
    }
  }
}

if (!customElements.get('codex-tirelait')) {
  customElements.define('codex-tirelait', CodexTirelait);
}