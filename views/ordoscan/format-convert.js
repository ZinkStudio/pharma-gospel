// pdf.js et libheif-js sont vendorisés localement (/vendor/), mais importés
// dynamiquement ici : leur coût (1,7 Mo / 1,9 Mo) n'est payé que si un PDF
// ou un HEIC est effectivement déposé — jamais pour le cas courant (JPEG/PNG).
//
// HEIC : on utilise libheif-js (binding bas niveau de libheif) et non
// heic-to, qui ne décode jamais que l'image primaire d'un conteneur — or un
// HEIC peut contenir plusieurs images (rafale, séquence), exactement comme
// un PDF peut avoir plusieurs pages. libheif-js expose le tableau complet.

const PDFJS_URL = new URL('../../vendor/pdfjs@6.3.289/pdf.min.js', import.meta.url).href;
const PDFJS_WORKER_URL = new URL('../../vendor/pdfjs@6.3.289/pdf.worker.min.js', import.meta.url).href;
const LIBHEIF_URL = new URL('../../vendor/libheif-js@1.23.2/libheif-bundle.mjs', import.meta.url).href;

let pdfjsModulePromise = null;
function loadPdfJs() {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import(PDFJS_URL).then(mod => {
      mod.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return mod;
    });
  }
  return pdfjsModulePromise;
}

let libheifInstancePromise = null;
export function loadLibheif() {
  if (!libheifInstancePromise) {
    libheifInstancePromise = import(LIBHEIF_URL).then(async (mod) => {
      const libheifFactory = mod.default;
      if (typeof libheifFactory !== 'function') {
        throw new Error("Le module libheif n'expose pas de fonction factory valide.");
      }
      // On exécute la factory Emscripten pour obtenir l'instance initialisée du module Wasm
      return await libheifFactory();
    });
  }
  return libheifInstancePromise;
}

/**
 * Détecte le type réel d'un fichier par signature binaire (pas seulement
 * l'extension). Liste de marques HEIF volontairement large : un convertisseur
 * en ligne peut produire des marques moins courantes (heim, hevm, avif…).
 * @returns {Promise<'pdf'|'heic'|'image'>}
 */
export async function detecterTypeFichier(file) {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')) {
    return 'pdf';
  }

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const boxType = String.fromCharCode(...header.slice(4, 8));
  const brand = String.fromCharCode(...header.slice(8, 12));
  if (boxType === 'ftyp' &&
    /^(heic|heix|heim|heis|hevc|hevx|hevm|hevs|mif1|msf1|avif|avis)$/i.test(brand)) {
    return 'heic';
  }
  if (/\.heic$|\.heif$/i.test(file.name || '')) {
    return 'heic';
  }

  return 'image';
}

/**
 * Échantillonne un canvas pour estimer s'il contient réellement du contenu
 * (par opposition à une page blanche). Ne lit pas tous les pixels — juste
 * un échantillon réduit — pour rester rapide même sur de grandes pages.
 */
function contientDuContenu(canvas, seuil = 0.002) {
  const sampleW = Math.min(canvas.width, 300);
  const sampleH = Math.max(1, Math.round(sampleW * (canvas.height / canvas.width)));

  const tmp = document.createElement('canvas');
  tmp.width = sampleW;
  tmp.height = sampleH;
  const tctx = tmp.getContext('2d');
  tctx.drawImage(canvas, 0, 0, sampleW, sampleH);

  const { data } = tctx.getImageData(0, 0, sampleW, sampleH);
  let nonBlanc = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) nonBlanc++;
  }
  return (nonBlanc / (sampleW * sampleH)) > seuil;
}

function canvasVersFichier(canvas, nomFichier) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      blob ? resolve(new File([blob], nomFichier, { type: 'image/jpeg' })) : reject(new Error('Conversion en image échouée'));
    }, 'image/jpeg', 0.95);
  });
}

// =============================================================
// PDF — une "page" = un item de la file
// =============================================================

export async function compterPagesPdf(file) {
  const pdfjs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  return pdf.numPages;
}

/**
 * Rend la page `index` (0-based) d'un PDF en image JPEG. Vérifie que le
 * rendu n'est pas suspicieusement blanc avant de le retourner — certains PDF
 * issus de scanners/imprimantes multifonctions (encodage JBIG2 non standard)
 * sont mal décodés silencieusement par pdf.js.
 */
async function convertirPagePdf(file, index, scale = 2) {
  const pdfjs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(index + 1); // pdf.js est indexé à partir de 1

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

  if (!contientDuContenu(canvas)) {
    const err = new Error(
      "Cette page du PDF s'affiche vide après conversion. C'est un problème connu avec certains PDF " +
      "issus de scanners/imprimantes multifonctions (encodage d'image non standard). Essayez de " +
      "réexporter le document en JPG/PNG depuis l'outil source, ou reprenez-le en photo."
    );
    err.code = 'PDF_BLANK_RENDER';
    throw err;
  }

  return canvasVersFichier(canvas, `page-${index + 1}.jpg`);
}

// =============================================================
// HEIC — une "image" du conteneur = un item de la file
// =============================================================

export async function compterImagesHeic(file) {
  const libheif = await loadLibheif();
  const buffer = await file.arrayBuffer();
  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(new Uint8Array(buffer));
  return images.length;
}

/**
 * Décode l'image `index` (0-based) d'un conteneur HEIC/HEIF en JPEG.
 */
async function convertirImageHeic(file, index) {
  try {
    const libheif = await loadLibheif();
    const buffer = await file.arrayBuffer();
    const decoder = new libheif.HeifDecoder();
    const images = decoder.decode(new Uint8Array(buffer));
    const image = images[index];
    if (!image) throw new Error(`Image ${index + 1} introuvable dans le fichier HEIC`);

    const width = image.get_width();
    const height = image.get_height();

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);

    await new Promise((resolve, reject) => {
      image.display(imageData, (displayData) => {
        displayData ? resolve() : reject(new Error('Échec du décodage HEIF'));
      });
    });

    ctx.putImageData(imageData, 0, 0);
    return canvasVersFichier(canvas, `image-${index + 1}.jpg`);
  } catch (cause) {
    const err = new Error(
      "Ce fichier HEIC n'a pas pu être décodé. Il est probablement corrompu ou mal exporté par l'outil " +
      "qui l'a créé (ex. convertisseur en ligne). Essayez de le réexporter en JPG."
    );
    err.code = 'HEIC_CONVERSION_FAILED';
    err.cause = cause;
    throw err;
  }
}

// =============================================================
// Point d'entrée unifié
// =============================================================

/**
 * Analyse un fichier et retourne une interface uniforme pour le traiter
 * comme une file d'items (pages PDF, images HEIC, ou image simple) — le
 * composant n'a pas besoin de savoir quel format contient plusieurs items.
 *
 * @returns {Promise<{type: 'pdf'|'heic'|'image', count: number, getImage: (index: number) => Promise<File>}>}
 */
export async function analyserFichier(file) {
  const type = await detecterTypeFichier(file);

  if (type === 'pdf') {
    const count = await compterPagesPdf(file);
    return { type, count, getImage: (index) => convertirPagePdf(file, index) };
  }

  if (type === 'heic') {
    const count = await compterImagesHeic(file);
    return { type, count, getImage: (index) => convertirImageHeic(file, index) };
  }

  return { type: 'image', count: 1, getImage: () => Promise.resolve(file) };
}

/**
 * Filet de sécurité pour le cas HEIC "non reconnu à la signature mais
 * probablement quand même du HEIC" (extension .heic/.heif malgré une marque
 * ftyp non standard produite par un convertisseur douteux).
 */
export async function tenterConversionHeicDeSecours(file) {
  if (!/\.heic$|\.heif$/i.test(file.name || '') && !/heic|heif/i.test(file.type || '')) {
    return null;
  }
  return convertirImageHeic(file, 0);
}