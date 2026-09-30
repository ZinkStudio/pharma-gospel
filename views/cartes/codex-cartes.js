import { BaseView } from '../../core/base-view.js';
import { PDFService } from '../../services/pdf/pdf-service.js';
import { PDF_PRESETS } from '../../services/pdf/engines/html2pdf-engine.js';
import { infirmiers } from './cartes-data.js';

const CARDS_PER_PAGE = 10; // 5 rangées × 2 colonnes

function slug(str) {
  return (str || 'infirmier')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Styles visuels des cartes (aucune règle @media print ici).
 * Volontairement en couleurs fixes : un export PDF doit rester identique
 * quel que soit le thème actif.
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
    align-content: start;
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
  .carte-contact { margin-bottom: 1.5mm; }
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
`;

/**
 * Règles d'impression, injectées uniquement dans la fenêtre popup du
 * navigateur (via PDFService.print) — jamais dans le document principal,
 * pour éviter que Ctrl+P sur l'app cache tout sauf les cartes.
 */
const CARD_PRINT_STYLE = `
  @media print {
    body { margin: 0; padding: 0; background: #ffffff; }
    body * { visibility: hidden; }
    .pdf-page, .pdf-page * { visibility: visible; }
    .pdf-page {
      position: absolute;
      left: 0; top: 0;
      margin: 0;
      box-shadow: none;
    }
  }
`;

/** Style d'affichage à l'écran pour la preview — ajoute un cadre aux pages. */
const CARD_PREVIEW_STYLE = `
  ${CARD_STYLE}
  #cartes-preview .pdf-page {
    margin: 1rem auto;
    box-shadow: 0 0 0 1px #e0e0e0, 0 4px 12px rgba(0, 0, 0, 0.08);
    border-radius: 2px;
  }
`;

export class CodexCartes extends BaseView {
  constructor() {
    super();
    this.data = infirmiers;
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

  disconnectedCallback() {
    super.disconnectedCallback?.();
    this._retirerStylePreview();
  }

  // =============================================================
  // Filtrage et rendu du tableau
  // =============================================================

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
    const btn = e.target.closest?.('[data-action]');
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

  // =============================================================
  // Construction de la grille paginée
  // =============================================================

  /**
   * Construit un conteneur de pages (une .pdf-page par tranche de
   * CARDS_PER_PAGE cartes), sans style inline — les styles sont passés
   * via l'option `styles` de PDFService.
   *
   * @returns {HTMLElement} container contenant une ou plusieurs .pdf-page
   */
  _construirePages(items) {
    const container = document.createElement('div');

    for (let i = 0; i < items.length; i += CARDS_PER_PAGE) {
      const chunk = items.slice(i, i + CARDS_PER_PAGE);

      const page = document.createElement('div');
      page.className = 'pdf-page';

      if (i > 0) page.classList.add('breaker');

      const grid = document.createElement('div');
      grid.className = 'page-grid';
      grid.innerHTML = chunk.map((item) => `
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
      container.appendChild(page);
    }

    return container;
  }

  // =============================================================
  // Export PDF
  // =============================================================

  async _telechargerPdf(items, filename) {
    if (!items?.length) {
      this.notify.info('Aucune donnée à exporter.');
      return;
    }
    try {
      this.notify.info('Génération du PDF...');
      const container = this._construirePages(items);

      await PDFService.capture(container, {
        ...PDF_PRESETS.DOCUMENT,
        margin: 0,
        filename,
        action: 'download',
        styles: CARD_STYLE,
        pagebreak: { mode: ['css', 'legacy'], before: '.breaker' }
      });

      this.notify.success('PDF généré avec succès.');
    } catch (err) {
      console.error('[CodexCartes] Erreur génération PDF :', err);
      this.notify.error('Erreur lors de la génération du PDF.');
    }
  }

  // =============================================================
  // Aperçu — avec style isolé, pas de fuite dans le document principal
  // =============================================================

  _apercu(items) {
    if (!items?.length) {
      this.notify.info('Aucune donnée à afficher.');
      return;
    }
    if (!this._preview) return;

    // Vide la preview ET retire le style précédent (si un aperçu était ouvert).
    this._retirerStylePreview();
    this._preview.innerHTML = '';

    // Style injecté UNIQUEMENT dans le conteneur de preview.
    // Comme il cible `#cartes-preview .pdf-page`, il ne touche pas le reste
    // de l'app et n'interfère pas avec un Ctrl+P ultérieur.
    const styleEl = document.createElement('style');
    styleEl.id = 'cartes-preview-style';
    styleEl.textContent = CARD_PREVIEW_STYLE;
    this._preview.appendChild(styleEl);

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'view-actions';
    toolbar.innerHTML = `
      <cds-button kind="secondary" size="sm" type="button" id="cartes-preview-telecharger">⬇ Télécharger ce PDF</cds-button>
      <cds-button kind="tertiary" size="sm" type="button" id="cartes-preview-imprimer">🖨 Imprimer</cds-button>
    `;
    this._preview.appendChild(toolbar);

    // Pages
    const container = this._construirePages(items);
    this._preview.appendChild(container);

    toolbar.querySelector('#cartes-preview-telecharger')?.addEventListener('click', () => {
      PDFService.capture(container, {
        ...PDF_PRESETS.DOCUMENT,
        margin: 0,
        filename: 'annuaire-infirmiers.pdf',
        action: 'download',
        styles: CARD_STYLE,
        pagebreak: { mode: ['css', 'legacy'], before: '.breaker' }
      })
        .then(() => this.notify.success('PDF généré avec succès.'))
        .catch((err) => {
          console.error('[CodexCartes] Erreur génération PDF :', err);
          this.notify.error('Erreur lors de la génération du PDF.');
        });
    });

    toolbar.querySelector('#cartes-preview-imprimer')?.addEventListener('click', () => {
      PDFService.print(container, {
        title: 'Cartes infirmiers',
        styles: CARD_STYLE + CARD_PRINT_STYLE
      });
    });
  }

  _retirerStylePreview() {
    this._preview?.querySelector('#cartes-preview-style')?.remove();
  }
}

if (!customElements.get('codex-cartes')) {
  customElements.define('codex-cartes', CodexCartes);
}