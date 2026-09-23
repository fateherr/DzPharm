/**
 * DzPharm — Service Worker (PWA offline).
 *
 * Stratégies (v5 — fraîcheur prioritaire) :
 *  - HTML (navigations) : NETWORK-FIRST. L'utilisateur voit toujours la
 *    version courante du site quand le serveur répond ; le cache n'est
 *    utilisé qu'en repli hors ligne. (v4 et antérieur : cache-first →
 *    l'UI pouvait rester figée sur une ancienne version.)
 *  - Assets immuables (icônes, manifest, logo) : cache-first (fichiers stables).
 *  - Chunks JS/CSS & autres assets same-origin : network-first + mise à jour
 *    du cache (repli hors ligne sur la dernière version connue).
 *  - API /api/* : network-first avec repli sur le cache (fiches & prix
 *    consultés restent consultables hors ligne).
 *  - Nettoyage des anciens caches à l'activation + message SKIP_WAITING.
 */

const VERSION = 'dzpharm-v8';
const SHELL_CACHE = `${VERSION}-shell`;
const API_CACHE = `${VERSION}-api`;
const MAX_API_ENTRIES = 220;

/** Assets stables, jamais modifiés : servis depuis le cache. */
const IMMUTABLE_ASSETS = [
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/logo.svg',
];

/** Pré-cache du shell (page + assets immuables) pour le mode hors ligne. */
const SHELL_ASSETS = ['/', ...IMMUTABLE_ASSETS];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        // Installation tolérante : on ne bloque pas si un asset manque
        Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Bouton « Mettre à jour » de l'UI : active immédiatement le nouveau SW. */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

/** Limite LRU simple du cache API. */
async function trimCache(name) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > MAX_API_ENTRIES) {
    await cache.delete(keys[0]);
    await trimCache(name);
  }
}

/** Network-first avec repli cache : renvoie la réponse réseau et met à jour le cache. */
async function networkFirst(request, cacheName, { offlineFallback } = {}) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const clone = response.clone();
      const cache = await caches.open(cacheName);
      await cache.put(request, clone).catch(() => {});
      if (cacheName === API_CACHE) await trimCache(cacheName).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (offlineFallback) {
      const shell = await caches.match('/');
      if (shell) return shell;
    }
    return new Response(
      request.mode === 'navigate'
        ? '<!doctype html><meta charset="utf-8"><title>Hors ligne</title><p style="font-family:sans-serif;padding:2rem">Hors ligne — DzPharm sera disponible dès le retour de la connexion.</p>'
        : JSON.stringify({ error: 'Hors ligne — ressource non mise en cache', offline: true }),
      {
        status: 503,
        headers: {
          'Content-Type': request.mode === 'navigate' ? 'text/html' : 'application/json',
        },
      }
    );
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // ---- Assets immuables : cache-first (fichiers stables par nature) ----
  if (IMMUTABLE_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches
                .open(SHELL_CACHE)
                .then((cache) => cache.put(request, clone))
                .catch(() => {});
            }
            return response;
          })
      )
    );
    return;
  }

  // ---- API : network-first, repli cache (données servies du cache marquées) ----
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(API_CACHE)
              .then((cache) => {
                cache.put(request, clone);
                trimCache(API_CACHE);
              })
              .catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) {
              // Marqueur de fraîcheur : l'UI peut signaler « données en cache »
              const headers = new Headers(cached.headers)
              headers.set('X-DzPharm-Cache', 'hit')
              return new Response(cached.body, {
                status: cached.status,
                statusText: cached.statusText,
                headers,
              })
            }
            return new Response(
              JSON.stringify({
                error: 'Hors ligne — ressource non mise en cache',
                offline: true,
              }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            )
          })
        )
    );
    return;
  }

  // ---- HTML (navigations) : network-first, repli shell en cache ----
  // L'utilisateur en ligne voit TOUJOURS la version courante du site.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE, { offlineFallback: true }));
    return;
  }

  // ---- Chunks JS/CSS & autres assets : network-first + mise à jour du cache ----
  event.respondWith(networkFirst(request, SHELL_CACHE));
});
