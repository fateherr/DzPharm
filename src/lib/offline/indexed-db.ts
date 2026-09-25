/**
 * Moteur IndexedDB pour le mode True Offline de DzPharm (W8-01).
 * Stocke les spécialités pharmaceutiques localement dans le navigateur
 * pour permettre la recherche instantanée même sans connexion internet.
 */

import type { Drug } from '@/components/dzpharm/types'

const DB_NAME = 'DzPharmOfflineDB'
const DB_VERSION = 1
const STORE_DRUGS = 'drugs'
const STORE_META = 'metadata'

class OfflineDatabase {
  private db: IDBDatabase | null = null
  private initPromise: Promise<IDBDatabase> | null = null

  private async getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('IndexedDB is only available in browser.'))
    }
    if (this.db) return this.db
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains(STORE_DRUGS)) {
          const store = db.createObjectStore(STORE_DRUGS, { keyPath: 'id' })
          store.createIndex('brand', 'brand', { unique: false })
          store.createIndex('dci', 'dci', { unique: false })
          store.createIndex('dciKey', 'dciKey', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' })
        }
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })

    return this.initPromise
  }

  /**
   * Sauvegarde un lot de médicaments dans IndexedDB
   */
  public async saveDrugsBatch(drugs: Drug[]): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_DRUGS, STORE_META], 'readwrite')
      const drugStore = tx.objectStore(STORE_DRUGS)
      const metaStore = tx.objectStore(STORE_META)

      for (const drug of drugs) {
        drugStore.put(drug)
      }

      metaStore.put({
        key: 'last_sync',
        timestamp: new Date().toISOString(),
        count: drugs.length,
      })

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Recherche hors-ligne par nom de marque ou DCI
   */
  public async searchDrugs(query: string, limit = 20): Promise<Drug[]> {
    const db = await this.getDB()
    const q = query.toLowerCase().trim()
    if (!q) return []

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRUGS, 'readonly')
      const store = tx.objectStore(STORE_DRUGS)
      const results: Drug[] = []

      const cursorRequest = store.openCursor()

      cursorRequest.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result
        if (cursor) {
          const drug = cursor.value as Drug
          const brandMatch = drug.brand.toLowerCase().includes(q)
          const dciMatch = drug.dci.toLowerCase().includes(q)

          if (brandMatch || dciMatch) {
            results.push(drug)
            if (results.length >= limit) {
              resolve(results)
              return
            }
          }
          cursor.continue()
        } else {
          resolve(results)
        }
      }

      cursorRequest.onerror = () => reject(cursorRequest.error)
    })
  }

  /**
   * Récupère le nombre de médicaments en cache hors-ligne
   */
  public async getStats(): Promise<{ count: number; lastSync: string | null }> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_DRUGS, STORE_META], 'readonly')
        const drugStore = tx.objectStore(STORE_DRUGS)
        const metaStore = tx.objectStore(STORE_META)

        const countReq = drugStore.count()
        const metaReq = metaStore.get('last_sync')

        tx.oncomplete = () => {
          resolve({
            count: countReq.result,
            lastSync: metaReq.result ? (metaReq.result.timestamp as string) : null,
          })
        }

        tx.onerror = () => reject(tx.error)
      })
    } catch {
      return { count: 0, lastSync: null }
    }
  }

  /**
   * Vide la base locale
   */
  public async clearOfflineData(): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_DRUGS, STORE_META], 'readwrite')
      tx.objectStore(STORE_DRUGS).clear()
      tx.objectStore(STORE_META).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Synchronise le catalogue complet depuis l'API /api/offline/sync
   */
  public async syncFromNetwork(
    onProgress?: (loaded: number, total: number) => void
  ): Promise<{ success: boolean; count: number }> {
    try {
      let offset = 0
      const limit = 1000
      let total = 0
      let loaded = 0
      let hasMore = true

      while (hasMore) {
        const res = await fetch(`/api/offline/sync?limit=${limit}&offset=${offset}&status=ACTIF`)
        if (!res.ok) throw new Error(`Erreur HTTP sync: ${res.status}`)
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Erreur sync')

        total = data.total
        const drugs: Drug[] = data.drugs
        if (drugs.length > 0) {
          await this.saveDrugsBatch(drugs)
          loaded += drugs.length
          if (onProgress) onProgress(loaded, total)
        }

        hasMore = data.hasMore && drugs.length > 0
        offset += limit
      }

      return { success: true, count: loaded }
    } catch (err) {
      console.error('[IndexedDB Sync Error]', err)
      return { success: false, count: 0 }
    }
  }
}

export const offlineDB = new OfflineDatabase()
