// views/orthopedie/data/catalogue.js
// ⚠️ Nécessite la classe Orthese — importée depuis ./orthese-model.js

import { Orthese } from './orthese-model.js';

const catalogueCou = [
    new Orthese("Cou", "Collier Cervical C1", ["T0", "T1", "T2", "T3"], ["H6cm", "H7.5cm", "H9cm", "H11cm"], { "T3": ["H6cm"] }, 3.08, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695eszneu9wyjxm4ch/thumbnailReal.webp"),
];

const catalogueEpaule = [
    new Orthese("Epaule", "LeGilet*", ["T1", "T2", "T3"], [], {}, 1.72, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695ezrttd67br37sue/thumbnailReal.webp"),
];

const catalogueTronc = [
    new Orthese("Tronc", "Lombamum", ["T1"], ["H21cm"], {}, 1.14, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695ezqoiqs39cg6dke/thumbnailReal.webp"),
    new Orthese("Tronc", "LombaFirst", ["T1", "T2", "T3", "T4", "T5"], ["H21cm", "H26cm"], {}, 2.40, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695esh9iuropgzrnwa/thumbnailReal.webp"),
    new Orthese("Tronc", "LombaStart", ["T1", "T2", "T3", "T4", "T5"], ["H21cm", "H26cm"], {}, 2.58, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695ezpjeuyf8deik6y/thumbnailReal.webp"),
    new Orthese("Tronc", "LombaCross", ["T1", "T2", "T3", "T4", "T5"], ["H21cm", "H26cm"], {}, 1.86, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695ezxjkdn8qju7w9w/thumbnailReal.webp"),
    new Orthese("Tronc", "LombaTech", ["T1", "T2", "T3", "T4", "T5", "T6"], ["H21cm", "H26cm"], {}, 1.47, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695ezurqhfaups489c/thumbnailReal.webp"),
];

const cataloguePoignet = [
    new Orthese("Poignet", "ManuImmo Open", ["T1", "T2"], [], {}, 2.50, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695ezc8wjjsyztkjsy/thumbnailReal.webp"),
    new Orthese("Poignet", "ManuImmo", ["T0","T1","T2","T3","T4"], ["Gauche", "Droite"], {}, 2.11, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695eznuu3tucue41th/thumbnailReal.webp"),
    new Orthese("Poignet", "ManuImmo Pro", ["T1", "T2", "T3", "T4"], [], {}, 1.78, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695esd3d4krik665mh/thumbnailReal.webp"),
    new Orthese("Poignet", "LePoignet", ["T1", "T2", "T3"], [], {}, 2.44, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695ez7uw5mpioqsuac/thumbnailReal.webp"),
    new Orthese("Poignet", "ManuAction", ["T1", "T2", "T3", "T4", "T5", "T6"], ["Gauche", "Droite"], {}, 1.80, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695es6yutx4u74bx9o/thumbnailReal.webp"),
];

const cataloguePoignetPouce = [
    new Orthese("Poignet-Pouce", "Manurhizo", ["T0", "T1", "T2", "T3", "T4"], ["Gauche", "Droite"], {}, 2.40, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695ezrsuiecnjts7yc/thumbnailReal.webp"),
    new Orthese("Poignet-Pouce", "Manurhizo Pro", ["T1", "T2", "T3", "T4"], ["Gauche", "Droite"], {}, 1.70, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695esufdui5fchhdfc/thumbnailReal.webp"),
];

const cataloguePouce = [
    new Orthese("Pouce", "Rhizo-pro", ["T1", "T2"], [], {}, 1.50, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695esocnyb6i8iormc/thumbnailReal.webp"),
    new Orthese("Pouce", "Rhizoimmo", ["T1", "T2"], ["Gauche", "Droite"], {}, 1.50, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695esi5b31mq7wm59e/thumbnailReal.webp"),
];

const catalogueDoigt = [
    new Orthese("Doigt", "Digi Immo", ["T1", "T2", "T3", "T4"], [], {}, 2.18, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695ezyctxrezubuyar/thumbnailReal.webp"),
];

const catalogueGenou = [
    new Orthese("Genou", "GenuAction", ["T0", "T1", "T2", "T3", "T4", "T5", "T6"], [], {}, 1.80, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695eshdh6e5hhyin6y/thumbnailReal.webp"),
    new Orthese("Genou", "Ligaflex Immo*", ["T1", "T2", "T3", "T4"], [], {}, 2.19, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695esxqjj6der13qdy/thumbnailReal.webp"),
    new Orthese("Genou", "Genu Immo", ["L", "XL"], ["Court", "Long"], { "L": ["Court"] }, 1.69, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695ezg9f454jho8zhh/thumbnailReal.webp"),
    new Orthese("Genou", "GenuStart Ice", ["Unique"], [], {}, 2.36, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695ezunpwx5ca7enso/thumbnailReal.webp"),
    new Orthese("Genou", "Genu Dynastab", ["T1", "T2", "T3", "T4", "T5", "T6"], [], {}, 2.80, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695esjmgxknb8jpyiw/thumbnailReal.webp"),
    new Orthese("Genou", "Ligastrap Genu", ["T1", "T2", "T3", "T4", "T5", "T6"], [], {}, 1.00, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695esq11ktcf93tycr/thumbnailReal.webp"),
];

const catalogueCheville = [
    new Orthese("Cheville", "MalleoAction", ["T0", "T1", "T2", "T3", "T4", "T5"], [], {}, 1.53, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695ez4bsap9dfun87r/thumbnailReal.webp"),
    new Orthese("Cheville", "LigaCast", ["T0", "T1"], ["Impact*", "Ice", "Air+"], {}, 2.45, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695ezeu9zm8itn5qhr/thumbnailReal.webp"),
];

const cataloguePied = [
    new Orthese("Pied", "LigaStep Fix", ["XS", "S", "M", "L", "XL"], ["Courte*", "Longue"], {}, 2.12, "https://dxm.mediacenter.thuasne.com/api/wedia/dam/variation/drd3ezyz695ezk1i81ankrij8a/thumbnailReal.webp"),
];
const catalogueContention = [
    new Orthese("Contention", "Chaussette", ["T1", "T2", "T3", "T4", "T5"], ["Beige Naturel Normal", "Beige Naturel Long", "Beige Doré Normal", "Beige Doré Long", "Noir Normal", "Noir Long"], { 
            "T5": ["Beige Naturel Normal", "Beige Naturel Long"]
        }, 1.00, ""),
    new Orthese("Contention", "Chaussette Pied Ouvert", ["T1", "T2", "T3", "T4"], ["Beige Doré Normal", "Beige Doré Long", "Noir Normal", "Noir Long"], {}, 1.00, ""),
    new Orthese("Contention", "Bas-Cuisse", ["T1", "T2", "T3", "T4", "T5"], ["Beige Naturel Normal", "Beige Naturel Long", "Beige Doré Normal", "Beige Doré Long", "Noir Normal", "Noir Long"], { 
            "T5": ["Beige Naturel Normal", "Beige Naturel Long"]
        }, 1.00, ""),
    new Orthese("Contention", "Bas-Cuisse Pied Ouvert", ["T1", "T2", "T3", "T4"], ["Beige Doré Normal", "Beige Doré Long", "Noir Normal", "Noir Long"], {}, 1.00, ""),
    new Orthese("Contention", "Collant", ["T1", "T2", "T3", "T4", "T5"], ["Beige Doré Normal", "Beige Doré Long", "Noir Normal", "Noir Long"], {}, 1.00, ""),
    
    new Orthese("Contention", "Chaussette Homme", ["T1", "T2", "T3", "T4"], ["Gris Normal", "Gris Long", "Noir Normal", "Noir Long"], {}, 1.00, ""),
    new Orthese("Contention", "Bas-Cuisse Homme", ["T1", "T2", "T3", "T4"], ["Beige Normal", "Beige Long", "Noir Normal", "Noir Long"], {}, 1.00, ""),
    
    new Orthese("Contention", "Collant Maternité", ["T1", "T2", "T3", "T4", "T5"], ["Beige Doré Normal", "Beige Doré Long", "Noir Normal", "Noir Long"], {}, 1.00, ""),
    new Orthese("Contention", "Chaussette Clinique", ["T1", "T2", "T3", "T4", "T5"], ["Blanc Normal", "Blanc Long"], {}, 1.00, ""),
    new Orthese("Contention", "Bas-Cuisse Clinique", ["T1", "T2", "T3", "T4", "T5"], ["Blanc Normal", "Blanc Long"], {}, 1.00, ""),
];
// --- CATALOGUE ---
export const catalogue = [
    ...catalogueCou,
    ...catalogueEpaule,
    ...catalogueTronc,
    ...cataloguePoignet,
    ...cataloguePoignetPouce,
    ...cataloguePouce,
    ...catalogueDoigt,
    ...catalogueGenou,
    ...catalogueCheville,
    ...cataloguePied,
    ...catalogueContention,
];
/*
"Catégorie"
new Orthese("Catégorie", "Nom", ["Taille1", "Taille2"], [] (Déclinaisons), {} (Exclusions), 1.50 (Coefficient), "url_image.jpg" (Image)),
*/
