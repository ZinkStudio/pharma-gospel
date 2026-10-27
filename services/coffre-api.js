const WORKER_URL = 'https://pharma-worker.zink13013.workers.dev';
const TOKEN_KEY = 'pharma_jwt_token';

let loginPromise = null; // Évite les popups multiples

// Déclenche l'événement pour demander le mot de passe à l'UI
function demanderMotDePasse() {
  return new Promise((resolve) => {
    const event = new CustomEvent('coffre:auth-required', {
      detail: { resolve },
      bubbles: true,
      composed: true
    });
    document.dispatchEvent(event);
  });
}

async function login() {
  if (loginPromise) return loginPromise;

  loginPromise = new Promise(async (resolve, reject) => {
    try {
      const password = await demanderMotDePasse();
      if (!password) throw new Error("Authentification annulée");

      const res = await fetch(`${WORKER_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!res.ok) throw new Error("Mot de passe incorrect");

      const data = await res.json();
      localStorage.setItem(TOKEN_KEY, data.token);
      resolve(data.token);
    } catch (err) {
      reject(err);
    } finally {
      loginPromise = null;
    }
  });

  return loginPromise;
}

async function fetchWithAuth(endpoint) {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) token = await login();

  const options = {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  };

  let response = await fetch(`${WORKER_URL}${endpoint}`, options);

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    token = await login();
    options.headers['Authorization'] = `Bearer ${token}`;
    response = await fetch(`${WORKER_URL}${endpoint}`, options);
  }

  if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
  return response;
}

export async function getCartesData() {
  try {
    const response = await fetchWithAuth('/cartes-data');
    return await response.json();
  } catch (error) {
    console.error("Impossible de charger les cartes :", error);
    return [];
  }
}

export async function getOfficineData() {
  try {
    const response = await fetchWithAuth('/officine');
    return await response.json();
  } catch (error) {
    console.error("Impossible de charger l'officine :", error);
    return {};
  }
}

export async function getImageBlobUrl(endpoint) {
  try {
    const response = await fetchWithAuth(endpoint);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error(`Impossible de charger l'image ${endpoint}`, error);
    return '';
  }
}