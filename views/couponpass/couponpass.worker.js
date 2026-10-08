/**
 * CouponPass Worker — extraction de codes promo HighCo
 *
 * Rôle : proxy CORS + extraction du JWT HighCo depuis une URL de campagne,
 * puis décodage du payload pour récupérer le code HCN.
 *
 * Déploiement : dash.cloudflare.com → Workers → copier ce fichier dans l'éditeur
 * Configuration : aucune variable d'environnement requise
 */

// =============================================================
// Configuration
// =============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',        // À restreindre si besoin :
                                             //   'https://zinkstudio.github.io'
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

/**
 * Domaines de destination autorisés (après suivi des redirections).
 * Empêche l'usage du worker comme proxy open (scraping d'autres sites).
 * Tester avec endsWith pour couvrir les sous-domaines.
 */
const ALLOWED_DESTINATION_HOSTS = [
  'highcodata.walletpass.fr',
  'walletpass.fr',
  'opn.to',                    // au cas où la redirection ne serait pas suivie
];

/**
 * Domaines autorisés à utiliser le worker côté navigateur.
 * Laisser vide = aucun contrôle d'origine (permissif, actuel).
 * Alternative : ['https://zinkstudio.github.io', 'http://localhost:5000']
 */
const ALLOWED_ORIGINS = null;

// =============================================================
// Handlers
// =============================================================

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Preflight CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Contrôle d'origine optionnel
  if (ALLOWED_ORIGINS) {
    const origin = request.headers.get('Origin');
    if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
      return jsonResponse({ error: 'Origine non autorisée' }, 403);
    }
  }

  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');

  if (!target) {
    return jsonResponse({ error: 'Paramètre ?url= manquant' }, 400);
  }

  // Validation de l'URL cible
  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    return jsonResponse({ error: 'URL cible invalide' }, 400);
  }

  // Vérification du domaine de destination
  if (!ALLOWED_DESTINATION_HOSTS.some((host) => targetUrl.hostname.endsWith(host))) {
    return jsonResponse({
      error: 'URL non autorisée — ce service ne traite que les campagnes HighCo.',
      host: targetUrl.hostname,
    }, 403);
  }

  // =============================================================
  // Fetch de la cible avec User-Agent Android (HighCo sert des
  // contenus différents selon le device détecté)
  // =============================================================

  const fetchHeaders = new Headers({
    'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
    'Sec-CH-UA': '"Google Chrome";v="130", "Chromium";v="130", "Not?A_Brand";v="99"',
    'Sec-CH-UA-Mobile': '?1',
    'Sec-CH-UA-Platform': '"Android"',
  });

  let response;
  try {
    response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: fetchHeaders,
      redirect: 'follow',
    });
  } catch (err) {
    return jsonResponse({ error: 'Fetch HighCo échoué', details: err.message }, 502);
  }

  if (!response.ok) {
    return jsonResponse({
      error: 'HighCo a répondu avec erreur',
      status: response.status,
    }, 502);
  }

  // Vérification a posteriori du domaine final (après redirections)
  const finalUrl = new URL(response.url);
  if (!ALLOWED_DESTINATION_HOSTS.some((host) => finalUrl.hostname.endsWith(host))) {
    return jsonResponse({
      error: 'Redirection vers un domaine non autorisé',
      host: finalUrl.hostname,
    }, 403);
  }

  // Lecture du HTML
  let html;
  try {
    html = await response.text();
  } catch (err) {
    return jsonResponse({ error: 'Lecture HTML échouée', details: err.message }, 500);
  }

  // =============================================================
  // Extraction du JWT
  // =============================================================

  const jwtMatch = html.match(/<g:savetowallet[^>]*jwt="([^"]+)"/i);
  if (!jwtMatch || !jwtMatch[1]) {
    return jsonResponse({
      status: 'no_jwt_found',
      html_preview: html.substring(0, 600) + '…',
    }, 200);
  }

  const jwt = jwtMatch[1];
  const parts = jwt.split('.');
  if (parts.length !== 3) {
    return jsonResponse({ error: 'JWT mal formé' }, 400);
  }

  // Décodage du payload base64url
  let payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  while (payloadB64.length % 4) payloadB64 += '=';

  let decoded;
  try {
    decoded = atob(payloadB64);
  } catch {
    return jsonResponse({ error: 'Décodage base64 échoué' }, 500);
  }

  let json;
  try {
    json = JSON.parse(decoded);
  } catch {
    return jsonResponse({
      error: 'JSON invalide',
      raw_preview: decoded.substring(0, 500),
    }, 500);
  }

  // =============================================================
  // Extraction du code HCN (plusieurs stratégies en cascade)
  // =============================================================

  let code = null;

  // Stratégie 1 : structure standard offerObjects
  if (json.payload?.offerObjects?.[0]?.barcode?.value) {
    code = json.payload.offerObjects[0].barcode.value;
  }

  // Stratégie 2 : recherche générique dans le payload décodé
  if (!code) {
    const match = decoded.match(/"value":"(HCN[A-Z0-9]+)"/i);
    if (match) code = match[1];
  }

  // Stratégie 3 : alternateText
  if (!code) {
    const alt = decoded.match(/"alternateText":"(HCN[A-Z0-9]+)"/i);
    if (alt) code = alt[1];
  }

  if (code) {
    return jsonResponse({
      status: 'success',
      code,
      jwt_length: jwt.length,
    }, 200);
  }

  return jsonResponse({
    status: 'code_not_found',
    payload_preview: decoded.substring(0, 600) + '…',
  }, 200);
}

// =============================================================
// Utilitaire
// =============================================================

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}