// Les libs PDF.js et heic-to sont vendorisées (/vendor/), mais importées
// dynamiquement ici : leur coût (1,7 Mo / 2,9 Mo) n'est payé que si un PDF
// ou un HEIC est effectivement déposé — jamais pour le cas courant (JPEG/PNG).

const PDFJS_URL = new URL('../../vendor/pdfjs@6.3.289/pdf.min.js', import.meta.url).href;
const PDFJS_WORKER_URL = new URL('../../vendor/pdfjs@6.3.289/pdf.worker.min.js', import.meta.url).href;
const HEIC_TO_URL = new URL('../../vendor/heic-to@1.5.2/heic-to.js', import.meta.url).href;

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

let heicToModulePromise = null;
function loadHeicTo() {
  if (!heicToModulePromise) {
    heicToModulePromise = import(HEIC_TO_URL);
  }
  return heicToModulePromise;
}

/**
 * Détecte le type réel d'un fichier par signature binaire (pas seulement
 * l'extension, plus fiable pour des fichiers renommés/copiés-collés).
 * @returns {Promise<'pdf'|'heic'|'image'>}
 */
export async function detecterTypeFichier(file) {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')) {
    return 'pdf';
  }

  // Signature HEIC/HEIF : conteneur ISO-BMFF avec 'ftyp' + marque heic/mif1/msf1…
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const brand = String.fromCharCode(...header.slice(8, 12));
  if (String.fromCharCode(...header.slice(4, 8)) === 'ftyp' &&
    /^(heic|heix|hevc|hevx|mif1|msf1)$/i.test(brand)) {
    return 'heic';
  }
  if (/\.heic$|\.heif$/i.test(file.name || '')) {
    return 'heic';
  }

  return 'image';
}

/**
 * Rend la première page d'un PDF en image JPEG (échelle choisie pour rester
 * confortablement au-dessus des formats d'export proposés).
 */
async function convertirPdfEnImage(file, scale = 2) {
  const pdfjs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      blob ? resolve(new File([blob], 'page.jpg', { type: 'image/jpeg' })) : reject(new Error('Conversion PDF → image échouée'));
    }, 'image/jpeg', 0.95);
  });
}

/**
 * Convertit un fichier HEIC/HEIF en JPEG.
 */
async function convertirHeicEnImage(file) {
  const { heicTo } = await loadHeicTo();
  const blob = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 });
  return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
}

/**
 * Point d'entrée unique : garantit en sortie un fichier image (JPEG/PNG/WEBP)
 * exploitable directement par <img>, quel que soit le format d'entrée.
 */
export async function garantirFichierImage(file) {
  const type = await detecterTypeFichier(file);

  if (type === 'pdf') return convertirPdfEnImage(file);
  if (type === 'heic') return convertirHeicEnImage(file);
  return file;
}
