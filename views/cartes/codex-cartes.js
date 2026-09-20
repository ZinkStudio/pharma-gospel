import { BaseComponent } from '../../core/base-component.js';
import { exportToPdf, printElement, PDF_PRESETS } from '../../utils/pdf-utils.js';
import { infirmiers } from './cartes-data.js';

function slug(str) {
  return (str || 'infirmier')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Styles autonomes des cartes imprimables. Volontairement en couleurs fixes
 * (pas de var(--pc-*)) : un export PDF doit rester identique quel que soit
 * le thème actif au moment de la génération.
 */
const CARD_STYLE = `
  .pdf-page {
    width: 200mm;
    min-height: 287mm;
    padding: 5mm;
    background: #ffffff;
    box-sizing: border-box;
    font-family: Arial, Helvetica, sans-serif;
    color: #1e1e1e;
  }
  .page-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 3mm;
  }
  .carte-infirmier {
    display: flex;
    border: 1px solid #e0e0e0;
    border-radius: 3mm;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
    background: #ffffff;
  }
  .carte-accent {
    width: 3mm;
    flex-shrink: 0;
    background: #006d44;
  }
  .carte-body {
    flex: 1;
    min-width: 0;
    padding: 4mm 5mm;
    box-sizing: border-box;
  }
  .carte-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 2mm;
    margin-bottom: 1.5mm;
  }
  .carte-nom {
    font-weight: 700;
    font-size: 12pt;
    color: #161616;
  }
  .carte-badge {
    flex-shrink: 0;
    font-size: 8pt;
    font-weight: 600;
    border-radius: 999px;
    padding: 0.5mm 2mm;
    color: #ffffff;
    white-space: nowrap;
  }
  .carte-badge--F { background: #d02670; }
  .carte-badge--H { background: #0f62fe; }
  .carte-secteur {
    display: inline-block;
    font-size: 8.5pt;
    font-weight: 600;
    color: #006d44;
    background: #e6f4ee;
    border-radius: 999px;
    padding: 0.5mm 2.5mm;
    margin-bottom: 2mm;
  }
  .carte-contact {
    margin-bottom: 1.5mm;
  }
  .carte-ligne {
    font-size: 9.5pt;
    color: #333333;
    margin-bottom: 0.8mm;
  }
  .carte-adresse {
    font-size: 8.5pt;
    color: #666666;
    font-style: italic;
  }
  @media print {
    body * { visibility: hidden; }
    .pdf-page, .pdf-page * { visibility: visible; }
    .pdf-page { position: absolute; left: 0; top: 0; margin: 0; }
  }
`;

export class CodexCartes extends BaseComponent {
  constructor() {
    super();
    this.data = infirmiers;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>:host { display: block; }</style>
      <slot></slot>
    `;
  }

  onReady() {
    this._tbody = this.querySelector('#cartes-liste');
    this._selectGenre = this.querySelector('#cartes-filtre-genre');
    this._preview = this.querySelector('#cartes-preview');

    this._renderTable(this.data);

    this._selectGenre?.addEventListener('change', () => {
      this._renderTable(this._getFiltered());
    });

    this.querySelector('#cartes-btn-apercu')?.addEventListener('click', () => {
      this._apercu(this._getFiltered());
    });

    this.querySelector('#cartes-btn-pdf-tout')?.addEventListener('click', () => {
      this._telechargerPdf(this.data, 'annuaire-infirmiers.pdf');
    });

    this.querySelector('#cartes-btn-pdf-filtre')?.addEventListener('click', () => {
      const genre = this._selectGenre?.value;
      if (!genre) {
        this.notify.info('Sélectionnez un genre pour télécharger la version filtrée.');
        return;
      }
      const label = genre === 'F' ? 'femmes' : 'hommes';
      this._telechargerPdf(this._getFiltered(), `annuaire-infirmiers-${label}.pdf`);
    });

    this._tbody?.addEventListener('click', (e) => this._handleRowClick(e));
  }

  _getFiltered() {
    const genre = this._selectGenre?.value;
    return genre ? this.data.filter(d => d.genre === genre) : this.data;
  }

  _renderTable(list) {
    if (!this._tbody) return;

    if (!list.length) {
      this._tbody.innerHTML = `<tr><td colspan="6">Aucun infirmier trouvé.</td></tr>`;
      return;
    }

    this._tbody.innerHTML = list.map((item) => {
      const idx = this.data.indexOf(item);
      const genreLabel = item.genre === 'F' ? 'Femme' : 'Homme';
      const mail = item.mail ? `<a href="mailto:${item.mail}">${item.mail}</a>` : '';

      return `
        <tr>
          <td>${item.nom || ''}</td>
          <td>${genreLabel}</td>
          <td>${item.telephone || ''}</td>
          <td>${mail}</td>
          <td>${item.secteur || ''}</td>
          <td>
            <cds-button kind="ghost" size="sm" type="button" data-action="preview" data-idx="${idx}" title="Aperçu de la carte de ${item.nom}">👁</cds-button>
            <cds-button kind="ghost" size="sm" type="button" data-action="download" data-idx="${idx}" title="Télécharger la carte de ${item.nom}">⬇</cds-button>
          </td>
        </tr>`;
    }).join('');
  }

  _handleRowClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const idx = parseInt(btn.dataset.idx, 10);
    const item = this.data[idx];
    if (!item) return;

    if (btn.dataset.action === 'download') {
      this._telechargerPdf([item], `carte-${slug(item.nom)}.pdf`);
    } else if (btn.dataset.action === 'preview') {
      this._apercu([item]);
    }
  }

  /**
   * Construit la grille de cartes imprimable (détachée du DOM).
   * Retourne { wrapper, page } : wrapper = conteneur autonome (style inclus,
   * à passer à exportToPdf) ; page = seul l'élément .pdf-page (à passer à
   * printElement, qui gère déjà son propre <style>).
   */
  _construireGrille(items) {
    const wrapper = document.createElement('div');
    const styleEl = document.createElement('style');
    styleEl.textContent = CARD_STYLE;
    wrapper.appendChild(styleEl);

    const page = document.createElement('div');
    page.className = 'pdf-page';

    const grid = document.createElement('div');
    grid.className = 'page-grid';
    grid.innerHTML = items.map(item => `
      <div class="carte-infirmier">
        <div class="carte-accent"></div>
        <div class="carte-body">
          <div class="carte-header">
            <span class="carte-nom">${item.nom || ''}</span>
            <span class="carte-badge carte-badge--${item.genre === 'F' ? 'F' : 'H'}">
              ${item.genre === 'F' ? '♀ Femme' : '♂ Homme'}
            </span>
          </div>
          ${item.secteur ? `<span class="carte-secteur">${item.secteur}</span>` : ''}
          <div class="carte-contact">
            <div class="carte-ligne">📞 ${item.telephone || 'Non renseigné'}</div>
            <div class="carte-ligne">✉️ ${item.mail || 'Non renseigné'}</div>
          </div>
          ${item.adresse ? `<div class="carte-adresse">${item.adresse}</div>` : ''}
        </div>
      </div>
    `).join('');

    page.appendChild(grid);
    wrapper.appendChild(page);
    return { wrapper, page };
  }

  async _telechargerPdf(items, filename) {
    if (!items?.length) {
      this.notify.info('Aucune donnée à exporter.');
      return;
    }
    try {
      const { wrapper } = this._construireGrille(items);
      await exportToPdf(wrapper, filename, { ...PDF_PRESETS.DOCUMENT, margin: 0 });
      this.notify.success('PDF généré avec succès.');
    } catch (err) {
      console.error('[CodexCartes] Erreur génération PDF :', err);
      this.notify.error('Erreur lors de la génération du PDF.');
    }
  }

  _apercu(items) {
    if (!items?.length) {
      this.notify.info('Aucune donnée à afficher.');
      return;
    }
    if (!this._preview) return;

    this._preview.innerHTML = '';

    const toolbar = document.createElement('div');
    toolbar.className = 'view-actions';
    toolbar.innerHTML = `
      <cds-button kind="secondary" size="sm" type="button" id="cartes-preview-telecharger">⬇ Télécharger ce PDF</cds-button>
      <cds-button kind="tertiary" size="sm" type="button" id="cartes-preview-imprimer">🖨 Imprimer</cds-button>
    `;

    const { wrapper, page } = this._construireGrille(items);

    this._preview.appendChild(toolbar);
    this._preview.appendChild(wrapper);

    toolbar.querySelector('#cartes-preview-telecharger')?.addEventListener('click', () => {
      exportToPdf(wrapper, 'annuaire-infirmiers.pdf', { ...PDF_PRESETS.DOCUMENT, margin: 0 })
        .then(() => this.notify.success('PDF généré avec succès.'))
        .catch(err => {
          console.error('[CodexCartes] Erreur génération PDF :', err);
          this.notify.error('Erreur lors de la génération du PDF.');
        });
    });

    toolbar.querySelector('#cartes-preview-imprimer')?.addEventListener('click', () => {
      printElement(page, { title: 'Cartes infirmiers', styles: CARD_STYLE });
    });
  }
}

if (!customElements.get('codex-cartes')) {
  customElements.define('codex-cartes', CodexCartes);
}