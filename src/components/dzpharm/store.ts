import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChifaCardType, ChifaLine } from './types'

export const MAX_CHIFA_LINES = 15

export type ViewId =
  | 'accueil'
  | 'repertoire'
  | 'bibliotheque'
  | 'catalogue'
  | 'interactions'
  | 'armoire'
  | 'copilote'
  | 'outils'
  | 'stats'
  | 'apropos'

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

/* ------------------------------------------------------------------ */
/* Armoire familiale — profils & médicaments                           */
/* ------------------------------------------------------------------ */

export type ArmoireRelation = 'adulte' | 'enfant' | 'bebe'

export interface ArmoireProfile {
  id: string
  name: string
  relation: ArmoireRelation
  ageYears: number
  weightKg: number | null
  pregnant: boolean
  breastfeeding: boolean
  createdAt: number
}

export interface ArmoireItem {
  uid: string
  drugId: number
  brand: string
  dci: string
  dciKey: string
  status: string
  form: string
  dosage: string
  /** Nombre de boîtes/unités restantes (optionnel). */
  quantity: number
  /** Date d'expiration (YYYY-MM-DD) — vide si inconnue. */
  expiry: string
  addedAt: number
}

export type ArmoireItemInput = Omit<ArmoireItem, 'uid' | 'addedAt' | 'quantity' | 'expiry'> &
  Partial<Pick<ArmoireItem, 'quantity' | 'expiry'>>

/**
 * Journal des contrôles de l'armoire — historique local des analyses
 * effectuées (interactions, grossesse/allaitement, alertes armoire).
 * Aucune donnée clinique nominative ne quitte le navigateur.
 */
export interface ArmoireJournalEntry {
  id: string
  at: number
  profileId: string
  profileName: string
  itemsCount: number
  interactions: number
  maxSeverity: string | null
  pregnancyAlerts: number
  cabinetAlerts: number
}

export const MAX_JOURNAL_ENTRIES = 20

export const MAX_PROFILES = 8
export const MAX_ITEMS_PER_PROFILE = 30

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

  /** Armoire familiale multi-profils. */
  armoireProfiles: ArmoireProfile[]
  /** Médicaments par profil, indexés par id de profil. */
  armoireItems: Record<string, ArmoireItem[]>
  activeArmoireProfileId: string | null
  addArmoireProfile: (p: Omit<ArmoireProfile, 'id' | 'createdAt'>) => ArmoireProfile | null
  updateArmoireProfile: (id: string, patch: Partial<Omit<ArmoireProfile, 'id' | 'createdAt'>>) => void
  deleteArmoireProfile: (id: string) => void
  setActiveArmoireProfile: (id: string) => void
  addArmoireItem: (profileId: string, item: ArmoireItemInput) => AddResult
  updateArmoireItem: (
    profileId: string,
    uid: string,
    patch: Partial<Pick<ArmoireItem, 'quantity' | 'expiry'>>
  ) => void
  removeArmoireItem: (profileId: string, uid: string) => void
  clearArmoireProfile: (profileId: string) => void

  /** Journal des contrôles (20 dernières analyses, persisté). */
  armoireJournal: ArmoireJournalEntry[]
  addArmoireJournalEntry: (entry: Omit<ArmoireJournalEntry, 'id' | 'at'>) => void
  clearArmoireJournal: () => void

  /** Panier d'ordonnance Chifa persistant (Q4 — budget patient). */
  chifaCardType: ChifaCardType
  chifaLines: ChifaLine[]
  setChifaCardType: (t: ChifaCardType) => void
  addChifaLine: (line: ChifaLine) => AddResult
  updateChifaLine: (uid: string, patch: Partial<Omit<ChifaLine, 'uid'>>) => void
  removeChifaLine: (uid: string) => void
  clearChifaLines: () => void
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

      armoireProfiles: [],
      armoireItems: {},
      activeArmoireProfileId: null,
      addArmoireProfile: (p) => {
        const { armoireProfiles } = get()
        if (armoireProfiles.length >= MAX_PROFILES) return null
        const profile: ArmoireProfile = {
          ...p,
          id: `ap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: Date.now(),
        }
        set((s) => ({
          armoireProfiles: [...s.armoireProfiles, profile],
          activeArmoireProfileId: profile.id,
        }))
        return profile
      },
      updateArmoireProfile: (id, patch) =>
        set((s) => ({
          armoireProfiles: s.armoireProfiles.map((p) =>
            p.id === id ? { ...p, ...patch } : p
          ),
        })),
      deleteArmoireProfile: (id) =>
        set((s) => {
          const items = { ...s.armoireItems }
          delete items[id]
          const profiles = s.armoireProfiles.filter((p) => p.id !== id)
          return {
            armoireProfiles: profiles,
            armoireItems: items,
            activeArmoireProfileId:
              s.activeArmoireProfileId === id
                ? (profiles[0]?.id ?? null)
                : s.activeArmoireProfileId,
          }
        }),
      setActiveArmoireProfile: (id) => set({ activeArmoireProfileId: id }),
      addArmoireItem: (profileId, item) => {
        const list = get().armoireItems[profileId] ?? []
        if (list.some((i) => i.drugId === item.drugId)) return 'duplicate'
        if (list.length >= MAX_ITEMS_PER_PROFILE) return 'full'
        const full: ArmoireItem = {
          quantity: 1,
          expiry: '',
          ...item,
          uid: `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          addedAt: Date.now(),
        }
        set((s) => ({
          armoireItems: {
            ...s.armoireItems,
            [profileId]: [...(s.armoireItems[profileId] ?? []), full],
          },
        }))
        return 'added'
      },
      updateArmoireItem: (profileId, uid, patch) =>
        set((s) => ({
          armoireItems: {
            ...s.armoireItems,
            [profileId]: (s.armoireItems[profileId] ?? []).map((i) =>
              i.uid === uid ? { ...i, ...patch } : i
            ),
          },
        })),
      removeArmoireItem: (profileId, uid) =>
        set((s) => ({
          armoireItems: {
            ...s.armoireItems,
            [profileId]: (s.armoireItems[profileId] ?? []).filter(
              (i) => i.uid !== uid
            ),
          },
        })),
      clearArmoireProfile: (profileId) =>
        set((s) => ({
          armoireItems: { ...s.armoireItems, [profileId]: [] },
        })),

      armoireJournal: [],
      addArmoireJournalEntry: (entry) =>
        set((s) => ({
          armoireJournal: [
            {
              ...entry,
              id: `aj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
              at: Date.now(),
            },
            ...s.armoireJournal,
          ].slice(0, MAX_JOURNAL_ENTRIES),
        })),
      clearArmoireJournal: () => set({ armoireJournal: [] }),

      chifaCardType: 'standard',
      chifaLines: [],
      setChifaCardType: (t) => set({ chifaCardType: t }),
      addChifaLine: (line) => {
        const { chifaLines } = get()
        if (chifaLines.some((l) => l.brand === line.brand)) return 'duplicate'
        if (chifaLines.length >= MAX_CHIFA_LINES) return 'full'
        set({ chifaLines: [...chifaLines, line] })
        return 'added'
      },
      updateChifaLine: (uid, patch) =>
        set((s) => ({
          chifaLines: s.chifaLines.map((l) => (l.uid === uid ? { ...l, ...patch } : l)),
        })),
      removeChifaLine: (uid) =>
        set((s) => ({ chifaLines: s.chifaLines.filter((l) => l.uid !== uid) })),
      clearChifaLines: () => set({ chifaLines: [] }),
    }),
    {
      name: 'dzpharm-store',
      // Persiste favoris + historique récent + armoire + journal + panier Chifa
      // — l'état de navigation reste éphémère
      partialize: (state) => ({
        favorites: state.favorites,
        recentlyViewed: state.recentlyViewed,
        armoireProfiles: state.armoireProfiles,
        armoireItems: state.armoireItems,
        activeArmoireProfileId: state.activeArmoireProfileId,
        armoireJournal: state.armoireJournal,
        chifaCardType: state.chifaCardType,
        chifaLines: state.chifaLines,
      }),
    }
  )
)
