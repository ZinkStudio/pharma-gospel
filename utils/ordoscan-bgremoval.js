// /static/js/assistants/assistant-ordoscan-bgremoval.js

const IMGLY_VERSION = '1.5.8';
const IMGLY_MODULE_URL = new URL(`../vendor/imgly@1.5.8/background-removal.mjs`, import.meta.url).href;
const IMGLY_PUBLIC_PATH = new URL(`../vendor/imgly@1.5.8/dist/`, import.meta.url).href;

// ---- État persistant sur globalThis ----------------------------------------
// Le routeur recharge ce module à chaque navigation SPA (import dynamique
// par route). Les variables locales au module seraient donc vidées à chaque
// remontage de la vue, ce qui relancerait inutilement le warm-up (~5 s).
// On persiste donc l'état qui doit survivre au remontage dans globalThis.
//
// - preloadedConfigs : Set des configs (model|device|proxy) déjà préchargées.
//   Sert à éviter de relancer preload + warm-up au retour sur la vue.
// - epoch : compteur de version, pour cache-buster l'import du module imgly
//   et forcer une session ONNX fraîche à chaque inférence (contourne un bug
//   ORT Web + WebGPU : réutiliser une session après un run provoque des
//   erreurs de validation « Buffer with '' label is invalid »).
const _G = globalThis.__ordoscan_bgremoval ??= {
  preloadedConfigs: new Set(),
  epoch: 0,
};

// Promise locale au module : volontairement NON persistée, car on veut
// invalider la session imgly à chaque inférence (via resetImglySession).
let _imglyModulePromise = null;

function loadImgly() {
  if (!_imglyModulePromise) {
    const url = `${IMGLY_MODULE_URL}?epoch=${_G.epoch}`;
    _imglyModulePromise = import(/* webpackIgnore: true */ url);
  }
  return _imglyModulePromise;
}

/**
 * Force une nouvelle instance du module imgly (donc une nouvelle session
 * ONNX) à la prochaine utilisation. À appeler avant chaque inférence.
 * N'efface PAS le flag « déjà préchargé » : ça évite de relancer le warm-up
 * au prochain montage de vue.
 */
export function resetImglySession() {
  _imglyModulePromise = null;
  _G.epoch++;
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

function configKey(options = {}) {
  const { model = 'small', device = 'cpu', proxy = false } = options;
  return `${model}|${device}|${proxy}`;
}

export function isPreloaded(options = {}) {
  return _G.preloadedConfigs.has(configKey(options));
}

export async function preloadBackgroundRemoval(onProgress, options = {}) {
  const { device = 'cpu', proxy = false, model = 'small' } = options;

  const config = {
    publicPath: IMGLY_PUBLIC_PATH,
    model,
    device,
    proxyToWorker: proxy,
  };
  if (typeof onProgress === 'function') config.progress = onProgress;

  const key = configKey({ model, device, proxy });
  if (_G.preloadedConfigs.has(key)) return;

  try {
    const mod = await loadImgly();
    const preload = resolveFn(mod, 'preload');
    await preload(config);
    _G.preloadedConfigs.add(key);
  } catch (err) {
    console.warn('[assistant-ordoscan-bgremoval] Préchargement impossible (non bloquant)', err);
  }
}

// ---- Mutex + retry : ORT Web n'accepte pas 2 run() simultanés ------------
let _currentRun = null;

async function _runOnce(imageBlob, onProgress, model, options) {
  const mod = await loadImgly();
  const removeBackground = resolveFn(mod, 'removeBackground');

  const { device = 'cpu', proxy = false } = options;

  const config = {
    publicPath: IMGLY_PUBLIC_PATH,
    model,
    device,
    proxyToWorker: proxy,
  };
  if (typeof onProgress === 'function') config.progress = onProgress;

  return await removeBackground(imageBlob, config);
}

export async function removeImageBackground(imageBlob, onProgress, model = 'small', options = {}) {
  if (_currentRun) {
    try { await _currentRun; } catch { /* on ignore l'échec précédent */ }
  }

  const run = (async () => {
    try {
      return await _runOnce(imageBlob, onProgress, model, options);
    } catch (err) {
      console.warn('[ordoscan-bgremoval] Inférence échouée, retry avec session fraîche :', err);
      resetImglySession();
      return await _runOnce(imageBlob, onProgress, model, options);
    }
  })();

  _currentRun = run;
  try {
    return await run;
  } finally {
    if (_currentRun === run) _currentRun = null;
  }
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

export default class OrdoscanBgRemovalAssistant {
  constructor(host) {
    this.host = host;
  }

  async processImage(imageBlob, { alphaStrength = 50, onProgress = null } = {}) {
    const rawPng = await removeImageBackground(imageBlob, onProgress);
    const adjustedPng = alphaStrength !== 50 ? await applyAlphaStrength(rawPng, alphaStrength) : rawPng;
    const finalJpeg = await compositeOnWhite(adjustedPng);

    return { rawPng, adjustedPng, finalJpeg };
  }
}