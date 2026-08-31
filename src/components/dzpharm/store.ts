import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChifaCardType, ChifaLine } from './types'
import type {
  ArmoireEntry,
  ArmoireEntryInput,
  ArmoireMember,
  ArmoireMemberInput,
  ArmoireJournalEntry,
} from './armoire/types'
import { MAX_ENTRIES, MAX_JOURNAL, MAX_MEMBERS, MEMBER_COLORS } from './armoire/constants'
import { uid } from './armoire/utils'

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

/**
 * Mode d'usage de l'application (audit 1.3 / P14) :
 * 'pro' = professionnel de santé, 'famille' = grand public.
 */
export type Audience = 'pro' | 'famille'

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

  /** Mode d'usage (professionnel vs famille) — persisté. */
  audience: Audience
  setAudience: (audience: Audience) => void

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

  /* ------------------ Armoire v2 (plan « Armoire à Pharmacie
     Familiale » — membres + entrées assignables/partagées) ----------- */

  armoireMembers: ArmoireMember[]
  armoireEntries: ArmoireEntry[]
  addArmoireMember: (m: ArmoireMemberInput) => ArmoireMember | null
  updateArmoireMember: (id: string, patch: Partial<Omit<ArmoireMember, 'id' | 'createdAt'>>) => void
  deleteArmoireMember: (id: string) => void
  addArmoireEntry: (e: ArmoireEntryInput) => AddResult
  updateArmoireEntry: (
    uid: string,
    patch: Partial<Omit<ArmoireEntry, 'uid' | 'addedAt' | 'updatedAt'>>
  ) => void
  removeArmoireEntry: (uid: string) => void
  /** Efface tout l'armoire (membres, entrées, journal) — droit d'effacement. */
  wipeArmoireData: () => void

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

/** Membres identiques (ordre insensible) ? */
function sameMembers(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x))
}

export const useDzPharm = create<DzPharmStore>()(
  persist(
    (set, get) => ({
      view: 'accueil',
      setView: (view) => set({ view }),

      audience: 'pro',
      setAudience: (audience) => set({ audience }),

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

      armoireMembers: [],
      armoireEntries: [],
      addArmoireMember: (m) => {
        const { armoireMembers } = get()
        if (armoireMembers.length >= MAX_MEMBERS) return null
        const member: ArmoireMember = {
          ...m,
          color: m.color || MEMBER_COLORS[armoireMembers.length % MEMBER_COLORS.length].id,
          id: uid('am'),
          createdAt: Date.now(),
        }
        set((s) => ({ armoireMembers: [...s.armoireMembers, member] }))
        return member
      },
      updateArmoireMember: (id, patch) =>
        set((s) => ({
          armoireMembers: s.armoireMembers.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      deleteArmoireMember: (id) =>
        set((s) => ({
          armoireMembers: s.armoireMembers.filter((m) => m.id !== id),
          // Les entrées restent mais ne sont plus assignées à ce membre.
          armoireEntries: s.armoireEntries.map((e) => ({
            ...e,
            memberIds: e.memberIds.filter((m) => m !== id),
            updatedAt: Date.now(),
          })),
        })),
      addArmoireEntry: (e) => {
        const { armoireEntries } = get()
        // Doublon strict : même médicament du répertoire ET même ensemble de membres.
        if (
          e.drugId != null &&
          armoireEntries.some(
            (x) => x.drugId === e.drugId && sameMembers(x.memberIds, e.memberIds ?? [])
          )
        ) {
          return 'duplicate'
        }
        if (armoireEntries.length >= MAX_ENTRIES) return 'full'
        const now = Date.now()
        const defaults: Omit<ArmoireEntry, 'uid' | 'addedAt' | 'updatedAt'> = {
          drugId: null,
          brand: '',
          dci: '',
          dciKey: '',
          status: 'MANUEL',
          form: '',
          dosage: '',
          category: 'besoin',
          quantity: 1,
          expiry: '',
          openedAt: '',
          purchasedAt: '',
          kits: [],
          memberIds: [],
          batch: '',
          prescription: '',
          daysLeft: null,
          notes: '',
        }
        const entry: ArmoireEntry = {
          ...defaults,
          ...e,
          uid: uid('ae'),
          addedAt: now,
          updatedAt: now,
        }
        set((s) => ({ armoireEntries: [...s.armoireEntries, entry] }))
        return 'added'
      },
      updateArmoireEntry: (id, patch) =>
        set((s) => ({
          armoireEntries: s.armoireEntries.map((e) =>
            e.uid === id ? { ...e, ...patch, updatedAt: Date.now() } : e
          ),
        })),
      removeArmoireEntry: (id) =>
        set((s) => ({ armoireEntries: s.armoireEntries.filter((e) => e.uid !== id) })),
      wipeArmoireData: () =>
        set({ armoireMembers: [], armoireEntries: [], armoireJournal: [] }),

      armoireJournal: [],
      addArmoireJournalEntry: (entry) =>
        set((s) => ({
          armoireJournal: [
            { ...entry, id: uid('aj'), at: Date.now() },
            ...s.armoireJournal,
          ].slice(0, MAX_JOURNAL),
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
      version: 1,
      /**
       * Migration v0 → v1 : ancien modèle (profils × items imbriqués) vers
       * le modèle du plan (membres + entrées assignables/partagées).
       * Les données existantes sont conservées au maximum.
       */
      migrate: (persisted, _version) => {
        const state = persisted as Record<string, unknown> & {
          armoireProfiles?: {
            id: string
            name: string
            relation: 'adulte' | 'enfant' | 'bebe'
            ageYears: number
            weightKg: number | null
            pregnant: boolean
            breastfeeding: boolean
            createdAt: number
          }[]
          armoireItems?: Record<
            string,
            {
              uid: string
              drugId: number
              brand: string
              dci: string
              dciKey: string
              status: string
              form: string
              dosage: string
              quantity: number
              expiry: string
              addedAt: number
            }[]
          >
          armoireJournal?: {
            id: string
            at: number
            profileName: string
            itemsCount: number
            interactions: number
            maxSeverity: string | null
            pregnancyAlerts: number
            cabinetAlerts: number
          }[]
        }
        const next: Record<string, unknown> = { ...state }
        if (Array.isArray(state.armoireProfiles)) {
          next.armoireMembers = state.armoireProfiles.map((p, i) => ({
            id: p.id,
            name: p.name,
            relation: p.relation,
            ageYears: p.ageYears,
            weightKg: p.weightKg,
            color: MEMBER_COLORS[i % MEMBER_COLORS.length].id,
            pregnant: p.pregnant,
            breastfeeding: p.breastfeeding,
            renal: false,
            allergies: [],
            restricted: false,
            createdAt: p.createdAt,
          }))
          const entries: ArmoireEntry[] = []
          for (const [profileId, items] of Object.entries(state.armoireItems ?? {})) {
            for (const it of items) {
              entries.push({
                uid: it.uid,
                drugId: it.drugId,
                brand: it.brand,
                dci: it.dci,
                dciKey: it.dciKey,
                status: it.status,
                form: it.form,
                dosage: it.dosage,
                category: 'besoin',
                quantity: it.quantity,
                expiry: it.expiry,
                openedAt: '',
                purchasedAt: '',
                kits: [],
                memberIds: [profileId],
                batch: '',
                prescription: '',
                daysLeft: null,
                notes: '',
                addedAt: it.addedAt,
                updatedAt: it.addedAt,
              })
            }
          }
          next.armoireEntries = entries
          // Journal v0 → v1 (scope textuel).
          if (Array.isArray(state.armoireJournal)) {
            next.armoireJournal = state.armoireJournal.map((j) => ({
              id: j.id,
              at: j.at,
              scope: j.profileName,
              itemsCount: j.itemsCount,
              interactions: j.interactions,
              maxSeverity: j.maxSeverity,
              pregnancyAlerts: j.pregnancyAlerts,
              cabinetAlerts: j.cabinetAlerts,
            }))
          }
        }
        delete next.armoireProfiles
        delete next.armoireItems
        delete next.activeArmoireProfileId
        return next as unknown as DzPharmStore
      },
      // Persiste mode d'usage + favoris + historique récent + armoire v2
      // + journal + panier Chifa — l'état de navigation reste éphémère
      partialize: (state) => ({
        audience: state.audience,
        favorites: state.favorites,
        recentlyViewed: state.recentlyViewed,
        armoireMembers: state.armoireMembers,
        armoireEntries: state.armoireEntries,
        armoireJournal: state.armoireJournal,
        chifaCardType: state.chifaCardType,
        chifaLines: state.chifaLines,
      }),
    }
  )
)
