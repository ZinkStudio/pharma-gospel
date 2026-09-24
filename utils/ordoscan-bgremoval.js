// /static/js/assistants/assistant-ordoscan-bgremoval.js

const IMGLY_VERSION = '1.5.8';
// const IMGLY_MODULE_URL = `https://esm.sh/@imgly/background-removal@${IMGLY_VERSION}?bundle`;
// const IMGLY_PUBLIC_PATH = `https://staticimgly.com/@imgly/background-removal-data/${IMGLY_VERSION}/dist/`;
const IMGLY_MODULE_URL = new URL(`../vendor/imgly@1.5.8/background-removal.mjs`, import.meta.url).href; // Chargement local pour éviter les problèmes de CORS et de CDN
const IMGLY_PUBLIC_PATH = new URL(`../vendor/imgly@1.5.8/dist/`, import.meta.url).href;

let _imglyModulePromise = null;
function loadImgly() {
  if (!_imglyModulePromise) {
    _imglyModulePromise = import(/* webpackIgnore: true */ IMGLY_MODULE_URL);
  }
  return _imglyModulePromise;
}

function resolveFn(mod, ...names) {
  const candidates = [mod, mod?.default, mod?.default?.default, ...names.map(n => mod?.[n])];
  const fn = candidates.find(c => typeof c === 'function');
  if (!fn) {
    console.error('[assistant-ordoscan-bgremoval] Module chargé :', mod);
    throw new Error('Impossible de localiser removeBackground dans le module @imgly/background-removal chargé');
  }
  return fn;
}

export async function preloadBackgroundRemoval(onProgress) {
  try {
    const mod = await loadImgly();
    const preload = resolveFn(mod, 'preload');
    await preload({ publicPath: IMGLY_PUBLIC_PATH, progress: onProgress });
  } catch (err) {
    console.warn('[assistant-ordoscan-bgremoval] Préchargement impossible (non bloquant)', err);
  }
}

export async function removeImageBackground(imageBlob, onProgress) {
  const mod = await loadImgly();
  const removeBackground = resolveFn(mod, 'removeBackground');

  return await removeBackground(imageBlob, {
    publicPath: IMGLY_PUBLIC_PATH,
    progress: onProgress
  });
}

export async function compositeOnWhite(transparentPngBlob) {
  const bitmap = await createImageBitmap(transparentPngBlob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
}

export async function applyAlphaStrength(transparentPngBlob, strengthPercent = 50) {
  const bitmap = await createImageBitmap(transparentPngBlob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const multiplier = strengthPercent >= 50
    ? 1 + ((strengthPercent - 50) / 50) * 5
    : 0.15 + (strengthPercent / 50) * 0.85;

  for (let i = 3; i < data.length; i += 4) {
    const a = data[i] / 255;
    let stretched = (a - 0.5) * multiplier + 0.5;
    stretched = Math.min(1, Math.max(0, stretched));
    data[i] = Math.round(stretched * 255);
  }

  ctx.putImageData(imageData, 0, 0);
  return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

/**
 * Assistant Ordoscan Background Removal
 * Class Wrapper pour intégration aisée dans les Web Components / Lit Elements.
 */
export default class OrdoscanBgRemovalAssistant {
  constructor(host) {
    this.host = host;
  }

  async processImage(imageBlob, { alphaStrength = 50, onProgress = null } = {}) {
    const rawPng = await removeImageBackground(imageBlob, onProgress);
    const adjustedPng = alphaStrength !== 50 ? await applyAlphaStrength(rawPng, alphaStrength) : rawPng;
    const finalJpeg = await compositeOnWhite(adjustedPng);

    return {
      rawPng,
      adjustedPng,
      finalJpeg
    };
  }
}