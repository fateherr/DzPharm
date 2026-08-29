/**
 * DzPharm — Service Worker (PWA offline).
 *
 * Stratégies :
 *  - App shell (HTML, JS, CSS, icônes) : cache-first + remplissage en arrière-plan.
 *  - API /api/* : network-first avec repli sur le cache (fiches & prix consultés
 *    restent consultables hors ligne).
 *  - Nettoyage des anciens caches à l'activation.
 */

const VERSION = 'dzpharm-v3';
const SHELL_CACHE = `${VERSION}-shell`;
const API_CACHE = `${VERSION}-api`;
const MAX_API_ENTRIES = 220;

const SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/logo.svg',
];

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

/** Limite LRU simple du cache API. */
async function trimCache(name) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > MAX_API_ENTRIES) {
    await cache.delete(keys[0]);
    await trimCache(name);
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // ---- API : network-first, repli cache ----
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
          caches
            .match(request)
            .then(
              (cached) =>
                cached ||
                new Response(
                  JSON.stringify({
                    error: 'Hors ligne — ressource non mise en cache',
                    offline: true,
                  }),
                  { status: 503, headers: { 'Content-Type': 'application/json' } }
                )
            )
        )
    );
    return;
  }

  // ---- App shell : cache-first ----
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(SHELL_CACHE)
              .then((cache) => cache.put(request, clone))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
