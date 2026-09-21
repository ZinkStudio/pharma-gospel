/**
 * Redimensionne une image source si elle dépasse `maxLongSide`, pour accélérer
 * la détection de coins, l'extraction et la suppression de fond — tout en
 * restant largement au-dessus du plus grand format d'export proposé (1754px).
 * Ne touche pas aux images déjà raisonnables (pas d'agrandissement).
 *
 * @param {HTMLImageElement} imageEl
 * @param {number} maxLongSide
 * @returns {Promise<HTMLImageElement>} une nouvelle image (même si inchangée)
 */
export async function redimensionnerPourTraitement(imageEl, maxLongSide = 2600) {
  const { naturalWidth: w, naturalHeight: h } = imageEl;
  const longSide = Math.max(w, h);

  if (longSide <= maxLongSide) {
    return imageEl;
  }

  const scale = maxLongSide / longSide;
  const outW = Math.round(w * scale);
  const outH = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imageEl, 0, 0, outW, outH);

  return canvasVersImage(canvas);
}

/**
 * Ajuste un canvas à des dimensions cibles exactes, en conservant le ratio
 * (letterbox blanc, jamais de déformation) — pour les formats d'export
 * "scanner"/"écran" prédéfinis.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} targetW
 * @param {number} targetH
 * @returns {HTMLCanvasElement}
 */
export function ajusterAuFormat(canvas, targetW, targetH) {
  const out = document.createElement('canvas');
  out.width = targetW;
  out.height = targetH;
  const ctx = out.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);

  const scale = Math.min(targetW / canvas.width, targetH / canvas.height);
  const drawW = Math.round(canvas.width * scale);
  const drawH = Math.round(canvas.height * scale);
  const offsetX = Math.round((targetW - drawW) / 2);
  const offsetY = Math.round((targetH - drawH) / 2);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, offsetX, offsetY, drawW, drawH);

  return out;
}

function canvasVersImage(canvas) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = canvas.toDataURL('image/jpeg', 0.95);
  });
}
