// Bibliothèque vendorisée localement (voir /vendor/scanic@1.6.0/), pas de CDN.
// On n'utilise que le détecteur "classical" par défaut : le détecteur "ml"
// (ONNX Runtime + modèle .wasm, ~50 Ko) n'est chargé que si explicitement
// demandé par Scanic lui-même, donc jamais dans notre usage.
import { scanDocument, extractDocument, createCornerEditor } from '../../vendor/scanic@1.6.0/scanic.js';

// Seuils de rejet d'une détection automatique "médiocre" (cf. cas capture
// d'écran : zone détectée ne couvrant qu'une fraction de la page).
const MIN_CONFIDENCE = 0.5;   // score interne de Scanic (angles droits, netteté du contour, etc.)
const MIN_COVERAGE_RATIO = 0.4; // aire du quadrilatère détecté / aire totale de l'image

/**
 * Aire d'un quadrilatère {topLeft, topRight, bottomRight, bottomLeft} (formule du lacet).
 */
function quadArea(corners) {
  const pts = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  let aire = 0;
  for (let i = 0; i < 4; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % 4];
    aire += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(aire) / 2;
}

/**
 * Rectangle de repli inséré à 8% des bords : assez grand pour être crédible,
 * poignées bien espacées pour rester facilement saisissables.
 */
function rectangleDeRepli(width, height, insetRatio = 0.08) {
  const insetX = width * insetRatio;
  const insetY = height * insetRatio;
  return {
    topLeft: { x: insetX, y: insetY },
    topRight: { x: width - insetX, y: insetY },
    bottomRight: { x: width - insetX, y: height - insetY },
    bottomLeft: { x: insetX, y: height - insetY }
  };
}

/**
 * Détecte automatiquement les 4 coins du document. Rejette silencieusement
 * les détections "réussies" mais peu plausibles (couverture ou confiance
 * trop faibles) au lieu de faire confiance aveuglément à `success: true`.
 * Ne lève jamais d'exception : retourne toujours un quadrilatère exploitable.
 */
export async function detectDocumentCorners(imageEl) {
  const width = imageEl.naturalWidth;
  const height = imageEl.naturalHeight;

  try {
    const result = await scanDocument(imageEl, { mode: 'detect' });

    if (result.success && result.corners) {
      const coverage = quadArea(result.corners) / (width * height);
      const confidence = result.confidence ?? 0;

      if (coverage >= MIN_COVERAGE_RATIO && confidence >= MIN_CONFIDENCE) {
        return result.corners;
      }

      console.warn(
        `[scanic-adapter] Détection rejetée (couverture=${coverage.toFixed(2)}, confiance=${confidence.toFixed(2)}) → repli`
      );
    }
  } catch (err) {
    console.warn('[scanic-adapter] Détection automatique indisponible, repli', err);
  }

  return rectangleDeRepli(width, height);
}

/**
 * Monte l'éditeur de coins interactif natif de Scanic (poignées 44px,
 * clavier, barre d'outils avec bouton "Appliquer" intégré) — thème
 * raccordé à la couleur de marque de l'app.
 *
 * @returns L'instance CornerEditor de Scanic (getCorners/reset/destroy/…)
 */
export function mountCornerEditor(container, imageEl, corners, { onConfirm } = {}) {
  return createCornerEditor({
    container,
    image: imageEl,
    corners,
    theme: { accent: '#006d44' },
    nudges: { enabled: true },
    toolbar: {
      enabled: true,
      reset: true,
      cancel: false,
      apply: true,
      labels: { apply: 'Valider le recadrage', reset: 'Réinitialiser' }
    },
    onConfirm
  });
}

/**
 * Extrait l'image recadrée + perspective corrigée via les 4 coins validés,
 * à la résolution native du quadrilatère. L'ajustement aux formats d'export
 * prédéfinis (scanner/écran) se fait séparément, à la demande, via
 * `ajusterAuFormat()` dans smart-resize.js.
 */
export async function extractFlattenedImage(imageEl, corners) {
  const result = await extractDocument(imageEl, corners, { output: 'canvas' });
  if (!result.success || !result.output) {
    throw new Error(result.message || "Échec de l'extraction du document");
  }
  return result.output;
}
