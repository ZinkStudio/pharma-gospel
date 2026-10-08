import { BaseView } from '../../core/base-view.js';

const PROXY_URL = 'https://crimson-lake-17be.pharmaciesaintbarthelemy.workers.dev/?url=';
const MAX_LOGS = 50;

export class CodexCouponpass extends BaseView {
    #form = null;
    #logsDiv = null;
    #resultBox = null;
    #codeInput = null;

    onReady() {
        this.#form = this.querySelector('#formCouponPass');
        this.#logsDiv = this.querySelector('#couponpass-logs');
        this.#resultBox = this.querySelector('#couponpass-result');
        this.#codeInput = this.querySelector('#couponpass-code-input');

        if (!this.#form) {
            console.warn('[CodexCouponpass] <codex-form id="formCouponPass"> introuvable.');
            return;
        }

        this.#form.addEventListener('codex-form-submit', (e) => this.#onSubmit(e.detail));
        this.#form.addEventListener('codex-form-invalid', (e) => this.#onInvalid(e.detail));

        this.#log('Module CouponPass prêt', 'info');
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

        const url = (values.url || '').trim();

        const validation = this.#validateUrl(url);
        if (!validation.valid) {
            this.#log(validation.error, 'error');
            this.notify.error(validation.error);
            return;
        }

        this.#setLoading(true);
        this.#log(`🔍 Extraction : ${this.#truncate(url, 60)}`, 'info');

        try {
            const code = await this.#extractCode(url);
            await this.#handleSuccess(code);
        } catch (err) {
            this.#handleError(err);
        } finally {
            this.#setLoading(false);
        }
    }

    // =============================================================
    // Validation
    // =============================================================

    #validateUrl(url) {
        if (!url) {
            return { valid: false, error: 'Veuillez entrer une URL.' };
        }
        try {
            new URL(url);
            return { valid: true };
        } catch {
            return { valid: false, error: 'URL malformée.' };
        }
    }

    // =============================================================
    // Extraction
    // =============================================================

    async #extractCode(url) {
        const proxyUrl = PROXY_URL + encodeURIComponent(url);
        this.#log('📡 Appel au proxy…', 'info');

        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`Service indisponible (HTTP ${response.status})`);
        }

        const data = await response.json();

        if (data.status === 'success' && data.code) {
            return data.code;
        }

        // Messages d'erreur ciblés selon la réponse du worker
        if (data.status === 'no_jwt_found') {
            throw new Error('Cette URL ne contient pas de coupon HighCo valide (campagne expirée ou lien incorrect).');
        }
        if (data.status === 'code_not_found') {
            throw new Error('Coupon détecté, mais le code est introuvable. Contactez HighCo.');
        }

        throw new Error(data.error || data.status || 'Réponse inattendue du service.');
    }

    // =============================================================
    // Succès / erreur
    // =============================================================

    async #handleSuccess(code) {
        this.#log(`✅ Code extrait → ${code}`, 'success');

        // Affiche la zone résultat
        if (this.#codeInput) {
            this.#codeInput.value = code;
        }
        if (this.#resultBox) {
            this.#resultBox.hidden = false;
            this.#resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Copie automatique dans le presse-papiers
        try {
            await navigator.clipboard.writeText(code);
            this.#log('📋 Code copié dans le presse-papiers', 'success');
            this.notify.success(`Code extrait et copié : ${code}`);
        } catch (err) {
            this.#log('⚠️ Copie automatique impossible — utilisez le bouton 📋', 'warn');
            this.notify.warning(`Code extrait : ${code}`);
        }

        // Reset du champ URL
        this.#form.setValue('url', '');
        this.#form.focusField('url');
    }

    #handleError(err) {
        const msg = err.message || 'Erreur inconnue';
        this.#log(`❌ ${msg}`, 'error');
        this.notify.error(`Extraction échouée : ${msg}`);
        console.error('[CodexCouponpass] Erreur extraction :', err);
    }

    // =============================================================
    // Journal
    // =============================================================

    #log(message, type = 'info') {
        if (!this.#logsDiv) return;

        const icons = {
            info: 'ℹ️',
            success: '✅',
            error: '❌',
            warn: '⚠️'
        };

        const timestamp = new Date().toLocaleTimeString('fr-FR');
        const entry = document.createElement('div');
        entry.className = `couponpass-log-entry couponpass-log-entry--${type}`;
        entry.innerHTML = `<span class="timestamp">${timestamp}</span> ${icons[type] || icons.info} ${this.#escape(message)}`;

        this.#logsDiv.appendChild(entry);
        this.#logsDiv.scrollTop = this.#logsDiv.scrollHeight;

        // Limite la taille du journal
        while (this.#logsDiv.children.length > MAX_LOGS) {
            this.#logsDiv.removeChild(this.#logsDiv.firstChild);
        }
    }

    // =============================================================
    // Utilitaires
    // =============================================================

    #truncate(str, max) {
        return str.length <= max ? str : str.substring(0, max) + '…';
    }

    #escape(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    #setLoading(loading) {
        const btn = this.querySelector('#couponpass-extract-btn');
        if (btn) btn.disabled = loading;

        const input = this.querySelector('[name="url"]');
        if (input) input.disabled = loading;
    }
}

if (!customElements.get('codex-couponpass')) {
    customElements.define('codex-couponpass', CodexCouponpass);
}