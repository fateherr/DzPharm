/**
 * Service Worker DzPharm v5.0 — True Offline PWA Engine
 * Fournit la mise en cache applicative, l'accès hors-ligne au référentiel et la résilience réseau.
 */

const CACHE_NAME = 'dzpharm-cache-v5'
const OFFLINE_URL = '/'

const PRECACHE_ASSETS = [
  '/',
  '/repertoire',
  '/outils',
  '/interactions',
  '/manifest.webmanifest',
]

// Installation : mise en cache des routes d'entrée critiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key)
            }
          })
        )
      )
      .then(() => self.clients.claim())
  )
})

// Stratégie de récupération réseau / cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Ne pas intercepter les requêtes API streaming ou les webhooks POST
  if (event.request.method !== 'GET') return
  if (url.pathname.startsWith('/api/ai/chat-stream')) return

  // Pour les requêtes de navigation HTML : Network-First avec repli sur le cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(event.request)
          if (cached) return cached
          const fallback = await caches.match(OFFLINE_URL)
          return fallback || new Response('Mode hors-ligne DzPharm disponible.', { headers: { 'Content-Type': 'text/plain' } })
        })
    )
    return
  }

  // Pour les requêtes API (GET /api/drugs, /api/stats...) : Stale-While-Revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request)
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone())
            }
            return networkResponse
          })
          .catch(() => cachedResponse)

        return cachedResponse || fetchPromise
      })
    )
    return
  }

  // Pour les assets statiques (JS, CSS, Polices, Images) : Cache-First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
    })
  )
})
