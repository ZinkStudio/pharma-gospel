/**
 * Représente une orthèse et gère la génération de son tableau d'inventaire.
 */
class Orthese {
    // Correction : Ajout de "image" dans les arguments du constructeur
    constructor(categorie, denomination, tailles, declinaisons = [], exclusions = {}, coeff = 1.00, image = "") {
        this.categorie = categorie;
        this.denomination = denomination;
        this.tailles = tailles;
        this.declinaisons = declinaisons.length > 0 ? declinaisons : ["Standard"];
        this.exclusions = exclusions;
        this.coeff = coeff;
        this.image = image;
    }

    /**
     * Identifiant unique pour le LocalStorage
     */
    getStorageKey(taille, declinaison, type) {
        return `orth_${this.denomination}_${taille}_${declinaison}_${type}`.replace(/\s+/g, '_');
    }

    render() {
        const wrapper = document.createElement('div');
        wrapper.className = "table-wrapper";
        const table = document.createElement('table');

        // Création de la zone header avec loupe si image présente
        const imageIcon = this.image ? `<span class="img-preview-trigger" onclick="showPreview('${this.image}', '${this.denomination}')" style="cursor:pointer; margin-left:10px;">🔍</span>` : '';

        const headRow = `<tr><th colspan="${this.declinaisons.length + 1}" class="header-denom">
            ${this.denomination} 
            <span class="coeff-display" style="font-weight:normal; font-size:0.9rem; opacity:0.7;">(${this.coeff.toFixed(2)})</span>
            ${imageIcon}
        </th></tr>`;

        // Header Déclinaisons
        let subHeadRow = `<tr><th>Tailles</th>`;
        this.declinaisons.forEach(d => subHeadRow += `<th>${d}</th>`);
        subHeadRow += `</tr>`;
        table.innerHTML = headRow + subHeadRow;

        // Corps du tableau
        this.tailles.forEach(taille => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td class="row-taille"><strong>${taille}</strong></td>`;

            this.declinaisons.forEach(decl => {
                const td = document.createElement('td');
                const isExclue = this.exclusions[taille] && this.exclusions[taille].includes(decl);

                if (isExclue) {
                    td.className = "cell-excluded";
                    td.innerText = "N/A";
                } else {
                    const keyV = this.getStorageKey(taille, decl, 'vendu');
                    const keyS = this.getStorageKey(taille, decl, 'stock');
                    const keyC = this.getStorageKey(taille, decl, 'cmd');

                    const valV = localStorage.getItem(keyV) || 0;
                    const valS = localStorage.getItem(keyS) || 0;
                    const valC = localStorage.getItem(keyC) || 0;

                    td.innerHTML = `
                        <div class="input-group">
                            <div class="input-pair">
                                <input type="number" class="sold" value="${valV}" onchange="saveStock('${keyV}', this.value)" title="Vendu (V)">
                                <input type="number" class="in-stock" value="${valS}" onchange="saveStock('${keyS}', this.value)" title="Stock actuel (S)">
                                <input type="number" class="to-order" value="${valC}" onchange="saveStock('${keyC}', this.value)" title="À commander (C)">
                            </div>
                            <div class="input-pair label-container">
                                <span class="label-s">V</span>
                                <span class="label-s">S</span>
                                <span class="label-s">C</span>
                            </div>
                        </div>`;
                }
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });

        wrapper.appendChild(table);
        return wrapper;
    }
}
export { Orthese };