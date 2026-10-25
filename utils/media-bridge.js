/**
 * Passerelle en mémoire pour transférer des fichiers entre les vues.
 * Puisque l'on est en SPA, la mémoire JS persiste lors de la navigation.
 */
class MediaBridge {
    constructor() {
        this.pendingFile = null;
        this.sourceView = null;
    }

    /**
     * Dépose un fichier dans la passerelle
     * @param {File|Blob} file 
     * @param {string} source - Nom de la vue d'origine (ex: 'ordoscan')
     */
    send(file, source = '') {
        this.pendingFile = file;
        this.sourceView = source;
    }

    /**
     * Récupère et consomme le fichier (le vide après lecture)
     * @returns {File|Blob|null}
     */
    consume() {
        const file = this.pendingFile;
        const source = this.sourceView;
        this.pendingFile = null;
        this.sourceView = null;
        return { file, source };
    }

    /**
     * Vérifie s'il y a un fichier en attente sans le consommer
     */
    hasPending() {
        return !!this.pendingFile;
    }
    // =============================================================
    // Helpers d'intégration (Wrappers)
    // =============================================================

    /**
     * Vérifie s'il y a un fichier en attente et l'injecte dans la vue via un callback.
     * Gère le délai d'attente pour que le DOM s'initialise et la notification.
     * 
     * @param {Object} host - L'instance de la vue (pour accéder à this.notify)
     * @param {Function} callback - La fonction à exécuter avec le fichier (ex: (f) => this.#handleFile(f))
     * @param {number} delay - Délai en ms pour laisser le DOM se charger (défaut: 150)
     */
    receiveInto(host, callback, delay = 150) {
        if (!this.hasPending()) return;

        const { file, source } = this.consume();

        setTimeout(() => {
            if (source && host.notify) {
                host.notify.info(`Fichier importé depuis ${source}.`);
            }
            callback(file);
        }, delay);
    }

    /**
     * Met à jour le composant <codex-aqueduc> avec le fichier de référence 
     * et une éventuelle fonction pour générer le fichier final.
     */
    updateAqueduc(host, file, fileProvider = null) {
        const aqueduc = host.querySelector('codex-aqueduc');
        if (aqueduc) {
            aqueduc.file = file;
            if (fileProvider) {
                aqueduc.fileProvider = fileProvider;
            }
        }
    }
}

export const mediaBridge = new MediaBridge();