/**
 * DzPharm — Client-side IndexedDB Cache (PWA Offline-first Strategy)
 * Spec: UI_UX_MASTER_PLAN.md Section 6.5 & Phase 3.7
 *
 * Stores:
 *  - drugs: Détails complets des fiches médicaments (TTL: 7 jours)
 *  - interactions: Données de sécurité (Network-first impératif)
 *  - searchIndex: Résultats des requêtes fréquentes (LRU, max 200 entrées, TTL 24h)
 */

const DB_NAME = 'dzpharm-cache'
const DB_VERSION = 1

export interface CachedDrugEntry {
  id: number
  dci: string
  nomCommercial: string
  laboratoire: string
  ppa: number | null
  tarifReference?: number | null
  forme: string | null
  voie?: string | null
  amm: string | null
  updatedAt: number
}

export interface CachedSearchEntry {
  query: string
  results: unknown[]
  cachedAt: number
}

function getIndexedDB(): IDBFactory | null {
  if (typeof window === 'undefined') return null
  return window.indexedDB || (window as unknown as { mozIndexedDB?: IDBFactory; webkitIndexedDB?: IDBFactory }).webkitIndexedDB || null
}

let dbInstance: Promise<IDBDatabase> | null = null

export function openDzPharmDb(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance

  dbInstance = new Promise((resolve, reject) => {
    const idb = getIndexedDB()
    if (!idb) {
      reject(new Error('IndexedDB non supporté par ce navigateur'))
      return
    }

    const request = idb.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Magasin drugs
      if (!db.objectStoreNames.contains('drugs')) {
        const drugStore = db.createObjectStore('drugs', { keyPath: 'id' })
        drugStore.createIndex('dci', 'dci', { unique: false })
        drugStore.createIndex('nomCommercial', 'nomCommercial', { unique: false })
      }

      // Magasin interactions (sécurité clinique)
      if (!db.objectStoreNames.contains('interactions')) {
        db.createObjectStore('interactions', { keyPath: 'id' })
      }

      // Magasin searchIndex (LRU)
      if (!db.objectStoreNames.contains('searchIndex')) {
        const searchStore = db.createObjectStore('searchIndex', { keyPath: 'query' })
        searchStore.createIndex('cachedAt', 'cachedAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbInstance
}

/** Enregistre ou met à jour une fiche médicament dans le cache local (TTL: 7 jours) */
export async function cacheDrug(drug: {
  id: number
  dci: string
  brand: string
  lab?: string | null
  pharmacy?: Array<{ ppa: number | null }>
  form?: string | null
  regNumber?: string | null
}): Promise<void> {
  try {
    const db = await openDzPharmDb()
    const tx = db.transaction('drugs', 'readwrite')
    const store = tx.objectStore('drugs')
    const entry: CachedDrugEntry = {
      id: drug.id,
      dci: drug.dci,
      nomCommercial: drug.brand,
      laboratoire: drug.lab ?? '',
      ppa: drug.pharmacy?.[0]?.ppa ?? null,
      forme: drug.form ?? null,
      amm: drug.regNumber ?? null,
      updatedAt: Date.now(),
    }
    store.put(entry)
  } catch {
    /* Échec silencieux si stockage plein ou mode navigation privée stricte */
  }
}

/** Récupère un médicament depuis le cache local s'il n'a pas expiré (< 7 jours) */
export async function getCachedDrug(id: number): Promise<CachedDrugEntry | null> {
  try {
    const db = await openDzPharmDb()
    const tx = db.transaction('drugs', 'readonly')
    const store = tx.objectStore('drugs')
    const request = store.get(id)

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const entry = request.result as CachedDrugEntry | undefined
        if (!entry) {
          resolve(null)
          return
        }
        // Expiration : 7 jours
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
        if (Date.now() - entry.updatedAt > SEVEN_DAYS) {
          resolve(null)
          return
        }
        resolve(entry)
      }
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

/** Met en cache les résultats d'une recherche textuelle (< 24h) */
export async function cacheSearchResults(query: string, results: unknown[]): Promise<void> {
  const q = query.trim().toLowerCase()
  if (!q) return
  try {
    const db = await openDzPharmDb()
    const tx = db.transaction('searchIndex', 'readwrite')
    const store = tx.objectStore('searchIndex')

    const entry: CachedSearchEntry = {
      query: q,
      results,
      cachedAt: Date.now(),
    }
    store.put(entry)
  } catch {
    /* Silencieux */
  }
}

export const setCachedSearchResults = cacheSearchResults

/** Récupère les résultats d'une recherche depuis le cache si < 24h */
export async function getCachedSearchResults<T = unknown[]>(query: string): Promise<T | null> {
  const q = query.trim().toLowerCase()
  if (!q) return null
  try {
    const db = await openDzPharmDb()
    const tx = db.transaction('searchIndex', 'readonly')
    const store = tx.objectStore('searchIndex')
    const request = store.get(q)

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const entry = request.result as CachedSearchEntry | undefined
        if (!entry) {
          resolve(null)
          return
        }
        // Expiration : 24 heures
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
        if (Date.now() - entry.cachedAt > TWENTY_FOUR_HOURS) {
          resolve(null)
          return
        }
        resolve(entry.results as T)
      }
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}
