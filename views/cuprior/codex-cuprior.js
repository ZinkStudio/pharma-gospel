import { BaseView } from '../../core/base-view.js';
import '../../components/ui/pdf/codex-pdf-preview.js';
import { PDFService } from '../../services/pdf/pdf-service.js';
import { CUPRIOR_ORPHALAN_LAYOUT } from '../../services/pdf/presets/cuprior-orphalan.js';
import { initTodayInputs, formatFR } from '../../utils/date-utils.js';

const TEMPLATE_URL = './views/cuprior/pdf/bon-commande-orphalan.pdf';
const CONFIG_URL = './views/cuprior/data/pharmacie.json';
/**
 * URL de composition Outlook Web.
 * - Hotmail / Outlook.com personnel → outlook.live.com
 * - Microsoft 365 entreprise → outlook.office.com
 * Adapter si la pharmacie change de fournisseur mail.
 */
const OUTLOOK_COMPOSE_BASE = 'https://outlook.live.com/mail/0/deeplink/compose';
/**
 * Valeurs de repli si le JSON ne charge pas.
 * À garder synchronisé avec data/pharmacie.json.
 */
const FALLBACK_CONFIG = {
    etablissement: 'PHARMACIE SAINT BARTHELEMY II',
    pharmacien_nom: 'GIUDICELLI Philippe',
    pharmacien_rpps: '10002058799',
    numero_tva: 'FR 108 431 231 91',
    contact: 'GIUDICELLI Philippe',
    adresse: '19, Avenue Claude Monet',
    code_postale: '13014 Marseille',
    telephone: '04 91 94 02 41',
    fax: '09 86 26 06 16',
    mail: 'pharmaciesb@hotmail.com',
    commentaire: 'Fermeture le dimanche',
    quantite_defaut: 2
};

export class CodexCuprior extends BaseView {
    #form = null;
    #pdfPreview = null;
    #config = null;
    #lastGeneration = 0;

    async onReady() {
        initTodayInputs(this);

        this.#form = this.querySelector('#formCuprior');
        this.#pdfPreview = this.querySelector('#cuprior-pdf');
        this.querySelector('#cuprior-open-outlook')?.addEventListener('click', () => this.#openInOutlook());

        if (!this.#form) {
            console.warn('[CodexCuprior] <codex-form id="formCuprior"> introuvable.');
            return;
        }

        this.#form.addEventListener('codex-form-submit', (e) => this.#onSubmit(e.detail));
        this.#form.addEventListener('codex-form-invalid', (e) => this.#onInvalid(e.detail));

        // Charge la config pharmacie et pré-remplit le formulaire
        await this.#chargerConfig();
    }

    // =============================================================
    // Configuration pharmacie (JSON + fallback)
    // =============================================================

    async #chargerConfig() {
        try {
            const res = await fetch(CONFIG_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            this.#config = await res.json();
            console.info('[CodexCuprior] Config pharmacie chargée depuis JSON.');
        } catch (err) {
            console.warn('[CodexCuprior] Fallback config (JSON inaccessible) :', err.message);
            this.#config = { ...FALLBACK_CONFIG };
        }

        // Pré-remplit chaque champ configurable
        for (const [name, value] of Object.entries(this.#config)) {
            if (name === 'quantite_defaut') {
                if (!this.#form.getValue('quantite')) {
                    this.#form.setValue('quantite', String(value));
                }
                continue;
            }
            this.#form.setValue(name, value);
        }
    }

    // =============================================================
    // Soumission
    // =============================================================

    #onInvalid({ invalidFields }) {
        this.notify.warning(`Champs manquants : ${invalidFields.join(', ')}`);
        this.#form.focusField(invalidFields[0]);
    }

    async #onSubmit({ values, isValid }) {
        if (!isValid) return;

        // Rate limit : 1 génération par tranche de 30 secondes.
        // Décourage le spam accidentel ou volontaire depuis la même session.
        // Non contournable pour l'utilisateur légitime (qui n'a pas besoin
        // de générer 3 bons en 45 secondes).
        // TODO: extraire en assistant quand 3+ usages
        const now = Date.now();
        const attente = 15_000 - (now - this.#lastGeneration);
        if (attente > 0) {
            this.notify.warning(
                `Patientez ${Math.ceil(attente / 1000)} seconde${attente > 1000 ? 's' : ''} avant de régénérer.`
            );
            return;
        }
        this.#lastGeneration = now;

        try {
            this.notify.info('Génération du bon de commande...');

            // Le champ date est en ISO (YYYY-MM-DD), on convertit en FR
            const dateFR = formatFR(values.date);

            const fields = {
                date: dateFR,
                date_entete: dateFR,
                etablissement: values.etablissement || '',
                pharmacien_nom: values.pharmacien_nom || '',
                pharmacien_rpps: values.pharmacien_rpps || '',
                numero_tva: values.numero_tva || '',
                contact: values.contact || '',
                adresse: values.adresse || '',
                code_postale: values.code_postale || '',
                telephone: values.telephone || '',
                fax: values.fax || '',
                mail: values.mail || '',
                quantite: values.quantite || '1',
                commentaire: values.commentaire || ''
            };

            const filename = `bon_cuprior_${values.date}.pdf`;

            const { blob } = await PDFService.overlay(
                TEMPLATE_URL,
                fields,
                CUPRIOR_ORPHALAN_LAYOUT,
                { action: 'preview', filename }
            );

            // 1. Preview PDF
            this.#pdfPreview?.setPdfBlob(blob, filename);

            // 2. Composer le mail
            this.#composerMail(values, dateFR);

            // 3. Afficher et scroller
            const output = this.querySelector('#cuprior-output');
            output?.classList.remove('hidden');
            output?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            this.notify.success('Bon de commande prêt.');
        } catch (err) {
            console.error('[CodexCuprior] Erreur génération :', err);
            this.notify.error('Erreur lors de la génération : ' + (err.message || 'inconnue'));
        }
    }

    // =============================================================
    // Composition du mail
    // =============================================================

    #composerMail(values, dateFR) {
        const toEl = this.querySelector('#cuprior-mail-to');
        const subjectEl = this.querySelector('#cuprior-mail-subject');
        const bodyEl = this.querySelector('#cuprior-mail-body');

        if (!toEl || !subjectEl || !bodyEl) {
            console.warn('[CodexCuprior] Champs mail introuvables — composition ignorée.');
            return;
        }

        const contact = values.contact || values.pharmacien_nom || '';
        const etablissement = values.etablissement || '';
        const adresse = values.adresse || '';
        const codePostal = values.code_postale || '';

        const corps = [
            'Bonjour,',
            '',
            `Veuillez trouver ci-joint le bon de commande pour ${values.quantite} boîte(s) de Cuprior.`,
            '',
            'Cordialement,',
            contact,
            etablissement,
            adresse,
            codePostal,
            '',
            '---',
            'Message préparé via Pharma-Gospel (outil interne officine).'
        ].join('\n');

        toEl.value = 'orphalan@health-logistics.com';
        subjectEl.value = `Cuprior — Bon de Commande du ${dateFR}`;
        bodyEl.value = corps;
    }

    /**
     * Ouvre le mail pré-composé dans Outlook Web via deeplink.
     * Reprend les valeurs déjà présentes dans les 3 champs readonly.
     * L'utilisateur ajoute ensuite le PDF en pièce jointe manuellement
     * (raison de sécurité : les pièces jointes ne sont pas transmissibles
     * par mailto / deeplink).
     */
    #openInOutlook() {
        const toEl = this.querySelector('#cuprior-mail-to');
        const subjectEl = this.querySelector('#cuprior-mail-subject');
        const bodyEl = this.querySelector('#cuprior-mail-body');

        if (!toEl || !subjectEl || !bodyEl) {
            this.notify.warning('Générez d\'abord le bon de commande.');
            return;
        }

        // encodeURIComponent (et non URLSearchParams) : Outlook Web attend %20
        // pour les espaces, pas + (form encoding).
        const url = `${OUTLOOK_COMPOSE_BASE}`
            + `?to=${encodeURIComponent(toEl.value)}`
            + `&subject=${encodeURIComponent(subjectEl.value)}`
            + `&body=${encodeURIComponent(bodyEl.value)}`;

        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (!win) {
            this.notify.warning('Popup bloquée — autorisez les popups ou utilisez la copie manuelle.');
            return;
        }

        this.notify.info('Outlook Web ouvert — pensez à joindre le PDF.');
    }
}

if (!customElements.get('codex-cuprior')) {
    customElements.define('codex-cuprior', CodexCuprior);
}