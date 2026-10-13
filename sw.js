const CACHE = 'ml-assets-v1';

// Construire les préfixes à partir du scope réel
const SCOPE = self.registration.scope;
const PREFIXES = [
    new URL('vendor/imgly@', SCOPE).pathname,
    new URL('vendor/onnxruntime-web@', SCOPE).pathname,
];

self.addEventListener('install', (e) => {
    e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (e) => {
    e.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(
            names.filter(n => n.startsWith('ml-assets-') && n !== CACHE)
                .map(n => caches.delete(n))
        );
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;

    const url = new URL(e.request.url);
    if (!PREFIXES.some(p => url.pathname.startsWith(p))) return;
    console.log('[SW] Intercepté:', url.pathname);
    // Ne pas cacher les requêtes Range
    if (e.request.headers.has('range')) {
        e.respondWith(fetch(e.request));
        return;
    }

    e.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(e.request);
        if (hit) return hit;

        const res = await fetch(e.request);
        if (res.ok && res.status === 200) {
            // Best-effort : ne pas casser la réponse si le cache échoue
            cache.put(e.request, res.clone()).catch(() => { });
        }
        return res;
    })());
});