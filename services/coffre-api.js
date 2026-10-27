const WORKER_URL = 'https://pharma-worker.zink13013.workers.dev';
const TOKEN_KEY = 'pharma_jwt_token';

// Fonction pour demander le mot de passe (une seule fois tous les 30 jours)
async function login() {
  const password = prompt("Entrez le mot de passe pour accéder aux données sécurisées :");
  if (!password) throw new Error("Mot de passe requis");

  const res = await fetch(`${WORKER_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });

  if (!res.ok) {
    alert("Mot de passe incorrect !");
    throw new Error("Login échoué");
  }

  const data = await res.json();
  localStorage.setItem(TOKEN_KEY, data.token); // On garde le token en mémoire pour 30 jours
  return data.token;
}

// Fonction générique pour faire des requêtes protégées
async function fetchWithAuth(endpoint) {
  let token = localStorage.getItem(TOKEN_KEY);
  
  // Si pas de token, on demande le mot de passe
  if (!token) token = await login();

  const options = {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  };

  let response = await fetch(`${WORKER_URL}${endpoint}`, options);

  // Si le token a expiré (401), on redemande le mot de passe et on réessaie
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

// Les images (signature/tampon) nécessitent aussi le token.
// On les télécharge en blob pour les afficher avec l'en-tête d'authentification.
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