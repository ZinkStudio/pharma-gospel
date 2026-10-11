import { BaseView } from '../../core/base-view.js';
import { PDFService } from '../../services/pdf/pdf-service.js';
import { catalogue } from './data/catalogue.js';

// =============================================================
// Composant
// =============================================================

export class CodexOrthopedie extends BaseView {
  #tabsEl = null;
  #contentEl = null;
  #importInput = null;
  #viewer = null;

  #activeCategory = null;

  onReady() {
    this.#tabsEl = this.querySelector('#ortho-tabs');
    this.#contentEl = this.querySelector('#ortho-content');
    this.#importInput = this.querySelector('#ortho-import-file');
    this.#viewer = this.querySelector('#ortho-viewer');

    // Actions
    this.querySelector('#ortho-btn-pdf')?.addEventListener('click', () => this.#generateOrderPDF());
    this.querySelector('#ortho-btn-export')?.addEventListener('click', () => this.#exportJSON());
    this.querySelector('#ortho-btn-import')?.addEventListener('click', () => this.#importInput?.click());
    this.querySelector('#ortho-btn-reset-v')?.addEventListener('click', () => this.#resetSales());
    this.querySelector('#ortho-btn-clear')?.addEventListener('click', () => this.#clearAll());

    this.#importInput?.addEventListener('change', (e) => this.#importJSON(e));

    // Visionneuse
    this.#viewer?.addEventListener('click', () => { this.#viewer.hidden = true; });

    // Génération initiale des onglets
    this.#buildTabs();

    // Sauvegarde auto sur input (délégation)
    this.#contentEl?.addEventListener('change', (e) => this.#onInputChange(e));

    // Clic sur loupe (délégation)
    this.#contentEl?.addEventListener('click', (e) => this.#onContentClick(e));
  }

  // =============================================================
  // Onglets
  // =============================================================

  #buildTabs() {
    if (!this.#tabsEl) return;

    const categories = [...new Set(catalogue.map((o) => o.categorie))].sort();

    this.#tabsEl.innerHTML = categories.map((cat) => `
      <button type="button" class="ortho-tab" role="tab" data-category="${this.#escape(cat)}">
        ${this.#escape(cat)}
      </button>
    `).join('');

    this.#tabsEl.querySelectorAll('.ortho-tab').forEach((btn) => {
      btn.addEventListener('click', () => this.#showCategory(btn.dataset.category));
    });

    // Active la première par défaut
    if (categories.length) this.#showCategory(categories[0]);
  }

  #showCategory(category) {
    this.#activeCategory = category;

    this.#tabsEl?.querySelectorAll('.ortho-tab').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.category === category);
    });

    const items = catalogue
      .filter((o) => o.categorie === category)
      .sort((a, b) => a.denomination.localeCompare(b.denomination));

    this.#contentEl.innerHTML = items.map((o) => this.#renderOrthese(o)).join('');
  }

  #renderOrthese(o) {
    const cols = o.declinaisons.length;

    const head = `
      <thead>
        <tr>
          <th colspan="${cols + 1}" class="ortho-header-denom">
            ${this.#escape(o.denomination)}
            <span class="ortho-coeff">(coeff ${o.coeff.toFixed(2)})</span>
            ${o.image ? `
              <span class="ortho-img-trigger" data-img="${this.#escape(o.image)}"
                data-caption="${this.#escape(o.denomination)}"
                title="Voir l'image">🔍</span>
            ` : ''}
          </th>
        </tr>
        <tr>
          <th>Tailles</th>
          ${o.declinaisons.map((d) => `<th>${this.#escape(d)}</th>`).join('')}
        </tr>
      </thead>
    `;

    const rows = o.tailles.map((taille) => {
      const cells = o.declinaisons.map((decl) => {
        const exclue = o.exclusions[taille]?.includes(decl);
        if (exclue) return `<td class="ortho-cell-excluded">N/A</td>`;

        const keyV = o.getStorageKey(taille, decl, 'vendu');
        const keyS = o.getStorageKey(taille, decl, 'stock');
        const keyC = o.getStorageKey(taille, decl, 'cmd');

        const valV = localStorage.getItem(keyV) || 0;
        const valS = localStorage.getItem(keyS) || 0;
        const valC = localStorage.getItem(keyC) || 0;

        return `
          <td>
            <div class="ortho-inputs">
              <div class="ortho-inputs__row">
                <input type="number" data-role="vendu" data-key="${this.#escape(keyV)}" value="${valV}" title="Vendu">
                <input type="number" data-role="stock" data-key="${this.#escape(keyS)}" value="${valS}" title="Stock">
                <input type="number" data-role="cmd"   data-key="${this.#escape(keyC)}" value="${valC}" title="À commander">
              </div>
              <div class="ortho-inputs__labels">
                <span>V</span><span>S</span><span>C</span>
              </div>
            </div>
          </td>
        `;
      }).join('');

      return `<tr><td class="ortho-row-taille">${this.#escape(taille)}</td>${cells}</tr>`;
    }).join('');

    return `
      <div class="ortho-table-wrapper">
        <table class="ortho-table">${head}<tbody>${rows}</tbody></table>
      </div>
    `;
  }

  // =============================================================
  // Interactions tableau
  // =============================================================

  #onInputChange(e) {
    const input = e.target.closest('input[data-key]');
    if (!input) return;
    localStorage.setItem(input.dataset.key, input.value);
  }

  #onContentClick(e) {
    const trigger = e.target.closest('.ortho-img-trigger');
    if (!trigger) return;
    this.#openViewer(trigger.dataset.img, trigger.dataset.caption);
  }

  #openViewer(url, caption) {
    if (!this.#viewer) return;
    this.#viewer.querySelector('#ortho-viewer__img').src = url;
    this.#viewer.querySelector('#ortho-viewer__caption').textContent = caption;
    this.#viewer.hidden = false;
  }

  // =============================================================
  // Export / Import / Reset
  // =============================================================

  #exportJSON() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('orth_')) data[key] = localStorage.getItem(key);
    }

    if (!Object.keys(data).length) {
      this.notify.info('Aucune donnée à exporter.');
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventaire_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.notify.success('Sauvegarde exportée.');
  }

  #importJSON(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!confirm('Écraser les données actuelles ?')) return;

        Object.keys(data).forEach((key) => {
          if (key.startsWith('orth_')) localStorage.setItem(key, data[key]);
        });
        location.reload();
      } catch {
        this.notify.error('Fichier JSON invalide.');
      }
    };
    reader.readAsText(file);

    // Reset l'input pour permettre le re-upload du même fichier
    event.target.value = '';
  }

  #resetSales() {
    if (!confirm('Réinitialiser toutes les quantités VENDUES (V) ?')) return;

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('orth_') && key.endsWith('_vendu')) {
        localStorage.removeItem(key);
      }
    }
    location.reload();
  }

  #clearAll() {
    if (!confirm("Effacer tout l'inventaire ?")) return;

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('orth_')) localStorage.removeItem(key);
    }
    location.reload();
  }

  // =============================================================
  // PDF — Bon de commande
  // =============================================================

  async #generateOrderPDF() {
    // 1. Collecte les lignes où C > 0, groupées par catégorie
    const categories = [...new Set(catalogue.map((o) => o.categorie))].sort();
    const sections = [];

    for (const cat of categories) {
      const rows = [];
      const itemsInCat = catalogue.filter((o) => o.categorie === cat);

      for (const orth of itemsInCat) {
        for (const taille of orth.tailles) {
          for (const decl of orth.declinaisons) {
            const exclue = orth.exclusions[taille]?.includes(decl);
            if (exclue) continue;

            const keyC = orth.getStorageKey(taille, decl, 'cmd');
            const qte = parseInt(localStorage.getItem(keyC) || '0', 10);
            if (qte > 0) {
              rows.push([
                orth.denomination,
                taille,
                decl === 'Standard' ? '—' : decl,
                String(qte)
              ]);
            }
          }
        }
      }

      if (rows.length) {
        sections.push({
          title: cat,
          head: ['Modèle', 'Taille', 'Déclinaison', 'Qté'],
          body: rows
        });
      }
    }

    if (!sections.length) {
      this.notify.info("Aucune commande saisie (colonne C).");
      return;
    }

    // 2. Génère le PDF
    try {
      this.notify.info('Génération du bon de commande...');

      const filename = `commandes_${new Date().toISOString().slice(0, 10)}.pdf`;
      const dateStr = new Date().toLocaleDateString('fr-FR');

      await PDFService.composeTable(sections, {
        title: 'Bon de Commande',
        subtitle: `Édité le ${dateStr}`,
        filename,
        action: 'download'
      });

      this.notify.success('Bon de commande généré.');
    } catch (err) {
      console.error('[CodexOrthopedie] Erreur PDF :', err);
      this.notify.error('Erreur lors de la génération du PDF.');
    }
  }

  // =============================================================
  // Utilitaires
  // =============================================================

  #escape(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

if (!customElements.get('codex-orthopedie')) {
  customElements.define('codex-orthopedie', CodexOrthopedie);
}