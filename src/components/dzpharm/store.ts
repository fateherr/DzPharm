import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewId =
  | 'accueil'
  | 'repertoire'
  | 'bibliotheque'
  | 'catalogue'
  | 'interactions'
  | 'copilote'
  | 'outils'
  | 'stats'

export interface DirectoryFilters {
  q: string
  status: string
  domain: string
  form: string
  liste: string
  country: string
  lab: string
}

export const EMPTY_FILTERS: DirectoryFilters = {
  q: '',
  status: '',
  domain: '',
  form: '',
  liste: '',
  country: '',
  lab: '',
}

export interface BasketItem {
  id: number
  brand: string
  dci: string
  status: string
}

export interface FavoriteItem {
  id: number
  brand: string
  dci: string
  addedAt: number
}

export interface RecentItem {
  id: number
  brand: string
  dci: string
  status: string
  viewedAt: number
}

export type AddResult = 'added' | 'duplicate' | 'full'

export const MAX_BASKET = 10
export const MAX_FAVORITES = 30
export const MAX_RECENT = 8

interface DzPharmStore {
  view: ViewId
  setView: (view: ViewId) => void

  filters: DirectoryFilters
  setFilters: (patch: Partial<DirectoryFilters>) => void
  resetFilters: () => void
  /** Navigue vers le répertoire en appliquant des filtres (remplace les filtres fournis). */
  gotoDirectory: (patch?: Partial<DirectoryFilters>) => void

  sheetDrugId: number | null
  openDrug: (id: number) => void
  closeDrug: () => void

  /** Monographie ouverte dans la Bibliothèque (cross-link depuis une fiche). */
  libraryDciKey: string | null
  openLibraryMonograph: (dciKey: string) => void
  closeLibraryMonograph: () => void

  basket: BasketItem[]
  addToBasket: (item: BasketItem) => AddResult
  removeFromBasket: (id: number) => void
  clearBasket: () => void

  favorites: FavoriteItem[]
  toggleFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => 'added' | 'removed' | 'full'
  isFavorite: (id: number) => boolean
  removeFromFavorites: (id: number) => void
  clearFavorites: () => void

  recentlyViewed: RecentItem[]
  pushRecent: (item: Omit<RecentItem, 'viewedAt'>) => void
  clearRecent: () => void
}

export const useDzPharm = create<DzPharmStore>()(
  persist(
    (set, get) => ({
      view: 'accueil',
      setView: (view) => set({ view }),

      filters: { ...EMPTY_FILTERS },
      setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
      resetFilters: () => set({ filters: { ...EMPTY_FILTERS } }),
      gotoDirectory: (patch) =>
        set((s) => ({
          view: 'repertoire',
          filters: { ...EMPTY_FILTERS, ...s.filters, ...patch },
        })),

      sheetDrugId: null,
      openDrug: (id) => set({ sheetDrugId: id }),
      closeDrug: () => set({ sheetDrugId: null }),

      libraryDciKey: null,
      openLibraryMonograph: (dciKey) =>
        set({ view: 'bibliotheque', libraryDciKey: dciKey }),
      closeLibraryMonograph: () => set({ libraryDciKey: null }),

      basket: [],
      addToBasket: (item) => {
        const { basket } = get()
        if (basket.some((b) => b.id === item.id)) return 'duplicate'
        if (basket.length >= MAX_BASKET) return 'full'
        set({ basket: [...basket, item] })
        return 'added'
      },
      removeFromBasket: (id) =>
        set((s) => ({ basket: s.basket.filter((b) => b.id !== id) })),
      clearBasket: () => set({ basket: [] }),

      favorites: [],
      toggleFavorite: (item) => {
        const { favorites } = get()
        if (favorites.some((f) => f.id === item.id)) {
          set({ favorites: favorites.filter((f) => f.id !== item.id) })
          return 'removed'
        }
        if (favorites.length >= MAX_FAVORITES) return 'full'
        set({ favorites: [{ ...item, addedAt: Date.now() }, ...favorites] })
        return 'added'
      },
      isFavorite: (id) => get().favorites.some((f) => f.id === id),
      removeFromFavorites: (id) =>
        set((s) => ({ favorites: s.favorites.filter((f) => f.id !== id) })),
      clearFavorites: () => set({ favorites: [] }),

      recentlyViewed: [],
      pushRecent: (item) =>
        set((s) => ({
          recentlyViewed: [
            { ...item, viewedAt: Date.now() },
            ...s.recentlyViewed.filter((r) => r.id !== item.id),
          ].slice(0, MAX_RECENT),
        })),
      clearRecent: () => set({ recentlyViewed: [] }),
    }),
    {
      name: 'dzpharm-store',
      // Persiste favoris + historique récent — l'état de navigation reste éphémère
      partialize: (state) => ({
        favorites: state.favorites,
        recentlyViewed: state.recentlyViewed,
      }),
    }
  )
)
