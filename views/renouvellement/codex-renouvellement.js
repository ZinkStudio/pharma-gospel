import { BaseComponent } from '../../core/base-component.js';
import { formatFR, addDays, initTodayInputs } from '../../utils/date-utils.js';

const QRIOUS_URL = new URL('../../vendor/qrious@4.0.2/qrious.min.js', import.meta.url).href;

let qriousLoadPromise = null;

/**
 * Charge dynamiquement le script classique (UMD) QRious une seule fois.
 * QRious n'est pas un module ES (pas de `export`), il doit être chargé via
 * une balise <script> classique pour que `window.QRious` soit défini.
 */
function loadQRious() {
  if (window.QRious) return Promise.resolve();
  if (!qriousLoadPromise) {
    qriousLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = QRIOUS_URL;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Échec du chargement de QRious'));
      document.head.appendChild(script);
    });
  }
  return qriousLoadPromise;
}

export class CodexRenouvellement extends BaseComponent {
  constructor() {
    super();
    this.joursFeries = [];
    this.anneeEnCours = new Date().getFullYear();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>:host { display: block; }</style>
      <slot></slot>
    `;
  }

  async onReady() {
    this.addEventListener('codex-form-submit', (e) => {
      if (e.target.id === 'form-renouvellement') {
        this.#gererSoumission(e.detail?.values || {});
      }
    });

    initTodayInputs(this);
    this.#initDates();
    await this.#chargerJoursFeries();
  }

  /**
   * Charge les jours fériés depuis l'API gouv.fr
   */
  async #chargerJoursFeries() {
    const tbody = this.querySelector('#joursFeries');
    if (!tbody) return;

    try {
      const response = await fetch(
        `https://calendrier.api.gouv.fr/jours-feries/metropole/${this.anneeEnCours}.json`
      );
      if (!response.ok) throw new Error('API indisponible');

      const data = await response.json();

      this.joursFeries = Object.keys(data)
        .map(dateStr => {
          const [year, month, day] = dateStr.split('-');
          return {
            date: new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)),
            libelle: data[dateStr]
          };
        })
        .sort((a, b) => a.date - b.date);

      tbody.innerHTML = this.joursFeries.map(jour => {
        const jourSemaine = jour.date.toLocaleDateString('fr-FR', { weekday: 'long' });
        const jourCapitalized = jourSemaine.charAt(0).toUpperCase() + jourSemaine.slice(1);
        return `
          <tr>
            <td>${jour.date.toLocaleDateString('fr-FR')}</td>
            <td>${jour.libelle}</td>
            <td>${jourCapitalized}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('[CodexRenouvellement] Erreur chargement jours fériés :', err);
      tbody.innerHTML = '<tr><td colspan="3">Erreur de chargement des jours fériés (mode hors-ligne).</td></tr>';
    }
  }

  #estJourFerie(date) {
    return this.joursFeries.some(j => j.date.toDateString() === date.toDateString());
  }

  #ajusterSiJourFerieOuDimanche(date) {
    while (this.#estJourFerie(date) || date.getDay() === 0) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  }

  #calculerRenouvellements(dateInitiale, quantite, intervalle) {
    const dates = [];
    let dateCourante = new Date(dateInitiale);

    for (let i = 0; i < quantite; i++) {
      dateCourante.setDate(dateCourante.getDate() + intervalle);
      dateCourante = this.#ajusterSiJourFerieOuDimanche(dateCourante);
      dates.push(new Date(dateCourante));
    }

    return dates;
  }

  #initDates() {
    const dateEl = this.querySelector('#dateDerniereFacturation');
    if (dateEl) dateEl.textContent = formatFR(addDays(new Date(), -22));
  }

  #gererSoumission(values) {
    try {
      const dateInitiale = new Date(values.dateInitiale);
      const quantite = parseInt(values.nombreRenouvellements, 10);
      const intervalle = parseInt(values.intervalleRenouvellement, 10);

      if (isNaN(dateInitiale.getTime()) || quantite < 1 || intervalle < 7) {
        this.notify.error('Données invalides : date valide, quantité ≥ 1, intervalle ≥ 7.');
        return;
      }

      const dates = this.#calculerRenouvellements(dateInitiale, quantite, intervalle);
      this.#afficherRenouvellements(dates);
      this.notify.success(`${dates.length} renouvellement(s) généré(s)`);
    } catch (err) {
      console.error('[CodexRenouvellement] Erreur calcul renouvellements :', err);
      this.notify.error(err.message || 'Erreur lors du calcul des dates.');
    }
  }

  /**
   * Affiche les dates de renouvellement dans le tableau, avec bouton copier
   * et modale QR code pour chaque ligne.
   */
  async #afficherRenouvellements(dates) {
    const tableBody = this.querySelector('#renouvellementTable');
    const modalesContainer = this.querySelector('#modalesContainer');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    if (modalesContainer) modalesContainer.innerHTML = '';

    const rendersData = dates.map((date, index) => {
      const jourSemaine = date.toLocaleDateString('fr-FR', { weekday: 'long' });
      const jourCapitalized = jourSemaine.charAt(0).toUpperCase() + jourSemaine.slice(1);
      const dateStr = `${date.toLocaleDateString('fr-FR')} (${jourCapitalized})`;
      const modalId = `modal-qr-R${index + 1}`;
      const texteCopie = `R${index + 1} = ${date.toLocaleDateString('fr-FR')} - ${jourSemaine}`;
      return { numero: index + 1, dateStr, modalId, texteCopie };
    });

    tableBody.insertAdjacentHTML('beforeend', rendersData.map(d => `
      <tr>
        <td>R${d.numero}</td>
        <td>${d.dateStr}</td>
        <td>
          <span id="clipboard-${d.numero}" hidden>${d.texteCopie}</span>
          <cds-button kind="ghost" size="sm" type="button" data-copy="#clipboard-${d.numero}" data-copy-feedback="✅">
            📋 Copier
          </cds-button>
          <cds-button kind="ghost" size="sm" type="button" data-qr-open="${d.modalId}">
            ⛆ QR Code
          </cds-button>
        </td>
      </tr>
    `).join(''));

    if (modalesContainer) {
      modalesContainer.insertAdjacentHTML('beforeend', rendersData.map(d => `
        <cds-modal id="${d.modalId}">
          <cds-modal-header>
            <cds-modal-close-button></cds-modal-close-button>
            <cds-modal-heading>${d.texteCopie}</cds-modal-heading>
          </cds-modal-header>
          <cds-modal-body>
            <div style="display:flex; justify-content:center; padding: 1rem 0;">
              <canvas id="qrcode-${d.numero}"></canvas>
            </div>
          </cds-modal-body>
        </cds-modal>
      `).join(''));
    }

    this.querySelectorAll('[data-qr-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = this.querySelector(`#${btn.dataset.qrOpen}`);
        if (modal) modal.setAttribute('open', '');
      });
    });

    try {
      await loadQRious();
      rendersData.forEach(d => this.#genererQRCode(d.numero, d.texteCopie));
    } catch (err) {
      console.error('[CodexRenouvellement] Erreur chargement QRious :', err);
    }
  }

  #genererQRCode(index, texte) {
    const canvas = this.querySelector(`#qrcode-${index}`);
    if (!canvas || !window.QRious) return;
    new window.QRious({ element: canvas, value: texte, size: 200 });
  }
}

if (!customElements.get('codex-renouvellement')) {
  customElements.define('codex-renouvellement', CodexRenouvellement);
}