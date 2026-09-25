'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  Barcode,
  BookOpen,
  Clock,
  Coins,
  CornerDownLeft,
  Flame,
  GitCompareArrows,
  Globe,
  History,
  Loader2,
  Pill,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchDrugs } from './api'
import type { Drug, DrugsResponse } from './types'
import { StatusBadge, formatPrice } from './status-badge'
import { useDzPharm } from './store'
import { useToast } from '@/hooks/use-toast'
import { getCachedSearchResults, setCachedSearchResults } from '@/lib/db/indexeddb'
import { offlineDB } from '@/lib/offline/indexed-db'

const RECENT_SEARCHES_KEY = 'dzpharm_recent_searches'
const POPULAR_SEARCHES = [
  'Doliprane 1000',
  'Amoxicilline 500',
  'Augmentin 1g',
  'Spasfon',
  'Flagyl 500',
  'Aspegic 100',
]

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/* ------------------------------------------------------------------ */
/* Composant de surlignage des termes correspondants (Highlighting)   */
/* ------------------------------------------------------------------ */

function HighlightMatch({ text, query }: { text: string | null | undefined; query: string }) {
  if (!text) return null
  const q = query.trim()
  if (!q || q.length < 2) return <span>{text}</span>

  // Nettoyer et séparer en mots significatifs
  const words = q
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  if (words.length === 0) return <span>{text}</span>

  const pattern = new RegExp(`(${words.join('|')})`, 'gi')
  const parts = text.split(pattern)

  return (
    <span>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <mark
            key={i}
            className="rounded bg-primary/20 px-0.5 font-bold text-primary dark:bg-primary/30 dark:text-sky-300"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Recherche en langage naturel — contrats locaux                      */
/* ------------------------------------------------------------------ */

interface NlInterpreted {
  q?: string
  domain?: string
  form?: string
  status?: string
  liste?: string
  refundableOnly?: boolean
  p1?: string
  pediatric?: boolean
  dosage?: string
}

interface NlSearchResponse {
  interpreted: NlInterpreted
  drugs: Drug[]
  total: number
}

async function fetchNlSearch(q: string, signal?: AbortSignal): Promise<NlSearchResponse> {
  const res = await fetch(`/api/search/nl?q=${encodeURIComponent(q)}`, { signal })
  if (!res.ok) throw new Error(`Requête échouée (${res.status})`)
  return (await res.json()) as NlSearchResponse
}

const NL_STARTERS = new Set([
  'pour', 'un', 'une', 'des', 'medicament', 'traitement', 'remede', 'produit',
  'je', 'cherche', 'comment', 'quel', 'quelle', 'quels', 'quelles', 'avez',
  'faut', 'besoin', 'voudrais', 'donner', 'donnez',
])

function normFr(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .toLowerCase()
    .trim()
}

function isNlCandidate(trimmed: string): boolean {
  if (trimmed.length < 3) return false
  if (/\s/.test(trimmed)) return true
  const first = normFr(trimmed).split(/\s+/)[0] ?? ''
  return NL_STARTERS.has(first)
}

function hasNlSignals(interp: NlInterpreted | undefined): boolean {
  if (!interp) return false
  return Boolean(
    interp.domain || interp.form || interp.status || interp.liste || interp.refundableOnly || interp.p1 || interp.pediatric || interp.dosage
  )
}

const FORM_LABELS: Record<string, string> = {
  SIROP: 'Sirop / Buvable',
  BUVABLE: 'Buvable',
  GOUTTE: 'Gouttes',
  COMP: 'Comprimé',
  GELULE: 'Gélule',
  INJ: 'Injectable',
  POMMADE: 'Pommade',
  CREME: 'Crème',
  COLLYRE: 'Collyre',
  SUPPO: 'Suppositoire',
  SACHET: 'Sachet',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIF: 'Actifs',
  NON_RENOUVELE: 'Non renouvelés',
  RETRIE: 'Retirés',
}

function interpretedChips(interp: NlInterpreted): string[] {
  const chips: string[] = []
  if (interp.domain) chips.push(interp.domain)
  if (interp.form) chips.push(FORM_LABELS[interp.form] ?? interp.form)
  if (interp.dosage) chips.push(`${interp.dosage}mg`)
  if (interp.status) chips.push(STATUS_LABELS[interp.status] ?? interp.status)
  if (interp.pediatric) chips.push('Pédiatrique')
  if (interp.refundableOnly) chips.push('Remboursable CNAS')
  if (interp.p1) chips.push('P1 hôpital')
  if (interp.q) chips.push(`« ${interp.q} »`)
  return chips
}

const PLACEHOLDER_SUGGESTIONS = [
  'Rechercher par DCI (ex: Paracétamol, Amoxicilline…)',
  'Rechercher par dosage & forme (ex: Amox 500mg sirop, Augmentin 1g sachet)…',
  'Rechercher en arabe ou darija (ex: باراسيتامول, دوا السكر, بومادا صفراء)…',
  'Rechercher par nom de marque, laboratoire, ou n° AMM…',
]

interface SearchAutocompleteProps {
  onSelect: (drug: Drug) => void
  onSubmitQuery?: (query: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  autoFocus?: boolean
  size?: 'default' | 'hero'
  inputRef?: React.RefObject<HTMLInputElement | null>
  id?: string
  ariaLabel?: string
  rightHint?: React.ReactNode
}

export function SearchAutocomplete({
  onSelect,
  onSubmitQuery,
  placeholder,
  className,
  inputClassName,
  autoFocus = false,
  size = 'default',
  inputRef,
  id,
  ariaLabel = 'Rechercher un médicament',
  rightHint,
}: SearchAutocompleteProps) {
  const gotoDirectory = useDzPharm((s) => s.gotoDirectory)
  const setScannerOpen = useDzPharm((s) => s.setScannerOpen)
  const addToBasket = useDzPharm((s) => s.addToBasket)
  const openTool = useDzPharm((s) => s.openTool)
  const { toast } = useToast()

  const [value, setValue] = useState('')
  const [scope, setScope] = useState<'all' | 'dci' | 'brand' | 'lab' | 'regNumber'>('all')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const internalRef = useRef<HTMLInputElement>(null)
  const debounced = useDebounce(value, 200)
  const trimmed = debounced.trim()

  function handleQuickAddToBasket(e: React.MouseEvent, drug: Drug) {
    e.preventDefault()
    e.stopPropagation()
    const res = addToBasket({
      id: drug.id,
      brand: drug.brand,
      dci: drug.dci ?? '',
      status: drug.status,
    })
    if (res === 'added') {
      toast({
        title: 'Ajouté au panier',
        description: `${drug.brand} ajouté aux interactions.`,
      })
    } else if (res === 'duplicate') {
      toast({
        title: 'Déjà présent',
        description: `${drug.brand} figure déjà dans le panier.`,
      })
    } else {
      toast({
        title: 'Panier plein',
        description: 'Maximum 10 médicaments dans le panier.',
        variant: 'destructive',
      })
    }
  }

  function handleQuickCompare(e: React.MouseEvent, drug: Drug) {
    e.preventDefault()
    e.stopPropagation()
    openTool('comparateur')
    toast({
      title: 'Comparateur ouvert',
      description: `Rendez-vous dans le comparateur pour analyser ${drug.brand}.`,
    })
  }

  // Recherches récentes en local storage
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) setRecentSearches(JSON.parse(stored))
    } catch {}
  }, [])

  function addRecentSearch(query: string) {
    const q = query.trim()
    if (!q) return
    setRecentSearches((prev) => {
      const next = [q, ...prev.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, 6)
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  function clearRecentSearches() {
    setRecentSearches([])
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY)
    } catch {}
  }

  // Détection en direct du dosage pour le badge UI
  const detectedDosage = useMemo(() => {
    const m = trimmed.match(/\b(\d{1,5}(?:[.,]\d{1,3})?)\s*(mg|g|mcg|µg|ui|iu|ml)\b/i)
    if (m) return m[0].toUpperCase()
    const words = trimmed.split(/\s+/)
    if (words.length >= 2) {
      for (const w of words) {
        if (/^\d{1,4}$/.test(w) && Number(w) >= 1 && Number(w) <= 5000) {
          return `${w} mg`
        }
      }
    }
    return null
  }, [trimmed])

  // Placeholders cycliques dynamiques
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const designMode = useDzPharm((s) => s.designMode)
  const isBotanique = designMode === 'botanique'

  const BOTANICAL_PLACEHOLDERS = [
    'Rechercher une DCI ou plante médicinale (ex: Sauge, Paracétamol…)',
    'Rechercher par forme d’officine (ex: Extrait végétal, sirop, sachet)…',
    'Rechercher par principe actif, rose de Damas, camomille, princeps…',
    'Rechercher par nom de marque, laboratoire ou n° AMM…',
  ]

  useEffect(() => {
    if (placeholder) return
    const suggestions = isBotanique ? BOTANICAL_PLACEHOLDERS : PLACEHOLDER_SUGGESTIONS
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % suggestions.length)
    }, 4500)
    return () => clearInterval(interval)
  }, [placeholder, isBotanique])

  const activePlaceholder = placeholder ?? (isBotanique ? BOTANICAL_PLACEHOLDERS[placeholderIndex % BOTANICAL_PLACEHOLDERS.length] : PLACEHOLDER_SUGGESTIONS[placeholderIndex % PLACEHOLDER_SUGGESTIONS.length])

  const { data, isFetching } = useQuery({
    queryKey: ['drugs', 'autocomplete', trimmed, scope],
    queryFn: async ({ signal }) => {
      try {
        const res = await fetchDrugs(
          {
            q: trimmed,
            pageSize: 8,
            sort: 'relevance',
            scope: scope === 'all' ? undefined : scope,
          },
          signal
        )
        if (res.drugs?.length) {
          setCachedSearchResults(`ac_${scope}_${trimmed}`, res.drugs).catch(() => {})
        }
        return res
      } catch (err) {
        // Mode hors-ligne : secours depuis IndexedDB
        const cached = await getCachedSearchResults<Drug[]>(`ac_${scope}_${trimmed}`).catch(() => null)
        if (cached && cached.length) {
          return {
            drugs: cached,
            total: cached.length,
            page: 1,
            pageSize: 8,
            totalPages: 1,
            fuzzy: false,
          } as DrugsResponse
        }

        // Mode True Offline : recherche directe dans la base locale IndexedDB
        const offlineResults = await offlineDB.searchDrugs(trimmed, 8).catch(() => [])
        if (offlineResults && offlineResults.length) {
          return {
            drugs: offlineResults,
            total: offlineResults.length,
            page: 1,
            pageSize: 8,
            totalPages: 1,
            fuzzy: false,
          } as DrugsResponse
        }
        throw err
      }
    },
    enabled: trimmed.length >= 2,
    placeholderData: keepPreviousData,
  })

  // Recherche intelligente en langage naturel
  const nlCandidate = useMemo(() => isNlCandidate(trimmed), [trimmed])
  const { data: nlData } = useQuery({
    queryKey: ['nl-search', trimmed],
    queryFn: ({ signal }) => fetchNlSearch(trimmed, signal),
    enabled: nlCandidate,
    staleTime: 60 * 1000,
  })
  const nlActive = nlCandidate && hasNlSignals(nlData?.interpreted)

  const results = useMemo(() => {
    if (nlActive) return nlData?.drugs ?? []
    return data?.drugs ?? []
  }, [nlActive, nlData, data])

  // Fermeture au clic extérieur
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const isOpen = open && trimmed.length >= 2
  const rowCount = results.length + (nlActive ? 1 : 0)

  function select(drug: Drug) {
    if (drug.brand) addRecentSearch(drug.brand)
    onSelect(drug)
    setValue('')
    setOpen(false)
    ;(inputRef?.current ?? internalRef.current)?.blur()
  }

  function handleClear() {
    setValue('')
    setOpen(false)
    ;(inputRef?.current ?? internalRef.current)?.focus()
  }

  function runSmartSearch() {
    const interp = nlData?.interpreted
    if (!interp) return
    if (trimmed) addRecentSearch(trimmed)
    gotoDirectory({
      q: interp.q ?? '',
      domain: interp.domain ?? '',
      form: interp.form ?? '',
      status: interp.status ?? '',
      liste: interp.liste ?? '',
      country: '',
      lab: '',
    })
    setValue('')
    setOpen(false)
    ;(inputRef?.current ?? internalRef.current)?.blur()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && rowCount > 0) {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((i) => (i + 1) % rowCount)
    } else if (e.key === 'ArrowUp' && rowCount > 0) {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? rowCount - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (isOpen && activeIndex >= 0) {
        if (nlActive && activeIndex === 0) {
          runSmartSearch()
        } else {
          const row = nlActive ? activeIndex - 1 : activeIndex
          if (results[row]) select(results[row])
        }
      } else if (nlActive) {
        runSmartSearch()
      } else if (onSubmitQuery && value.trim()) {
        onSubmitQuery(value.trim())
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const hero = size === 'hero'
  const chips = nlActive ? interpretedChips(nlData!.interpreted) : []

  const SCOPES: Array<{ id: 'all' | 'dci' | 'brand' | 'lab' | 'regNumber'; label: string }> = [
    { id: 'all', label: 'Tous' },
    { id: 'dci', label: 'DCI / Molécule' },
    { id: 'brand', label: 'Marque' },
    { id: 'lab', label: 'Laboratoire' },
    { id: 'regNumber', label: 'N° AMM' },
  ]

  return (
    <div ref={wrapperRef} className={cn('relative w-full z-40', className)}>
      {/* Périmètre scope bar — visible on all sizes, compact on non-hero */}
      <div className={cn(
        'flex items-center gap-1.5 overflow-x-auto scroll-thin no-scrollbar px-1',
        hero ? 'mb-2.5 text-xs' : 'mb-1.5 text-[11px]'
      )}>
        <span className={cn(
          'font-semibold uppercase tracking-wider text-muted-foreground shrink-0',
          hero ? 'text-[11px] mr-1' : 'text-[10px] mr-0.5'
        )}>
          Périmètre :
        </span>
        {SCOPES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScope(s.id)}
            className={cn(
              'shrink-0 rounded-full font-medium transition-all cursor-pointer whitespace-nowrap',
              hero ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[10px]',
              scope === s.id
                ? (isBotanique
                    ? 'bg-[#1b4332] text-white font-semibold shadow-xs ring-1 ring-[#1b4332]/40 dark:bg-[#34d399] dark:text-[#040906]'
                    : 'bg-primary text-primary-foreground font-semibold shadow-xs ring-1 ring-primary/30')
                : (isBotanique
                    ? 'bg-[#fcfbf8]/90 text-[#1b4332]/80 hover:bg-[#eae4d5] hover:text-[#1b4332] border border-[#dcd4c5]/80 dark:bg-[#0b1611]/90 dark:text-[#34d399]/80 dark:border-[#1a2f24]'
                    : 'bg-card/80 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/70')
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div
        className={cn(
          'group flex items-center gap-3 rounded-2xl border text-foreground transition-all',
          isBotanique
            ? 'border-[#dcd4c5] bg-[#fcfbf8]/98 shadow-xl shadow-[#1b4332]/8 focus-within:border-[#1b4332] focus-within:ring-4 focus-within:ring-[#1b4332]/15 dark:border-[#1a2f24] dark:bg-[#0b1611]/95 dark:shadow-black/40 dark:focus-within:border-[#34d399] dark:focus-within:ring-[#34d399]/15'
            : 'border-border/80 bg-card/95 shadow-lg shadow-black/5 focus-within:border-primary/80 focus-within:ring-4 focus-within:ring-primary/20',
          hero
            ? 'h-15 px-4.5 backdrop-blur-xl sm:h-16'
            : 'h-11 px-3.5'
        )}
      >
        <Search
          className={cn(
            'shrink-0 transition-colors',
            isBotanique
              ? 'text-[#1b4332]/60 group-focus-within:text-[#1b4332] dark:text-[#34d399]/60 dark:group-focus-within:text-[#34d399]'
              : 'text-muted-foreground group-focus-within:text-primary',
            hero ? 'size-5.5' : 'size-4'
          )}
          aria-hidden
        />
        <input
          id={id}
          ref={inputRef ?? internalRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={id ? `${id}-listbox` : undefined}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setActiveIndex(-1)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={activePlaceholder}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            'w-full bg-transparent outline-none placeholder:text-muted-foreground/60 placeholder:transition-opacity',
            hero ? 'min-h-14 text-base sm:text-lg' : 'min-h-10 text-sm',
            inputClassName
          )}
        />

        {/* Bouton Effacer */}
        {value.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label="Effacer la recherche"
          >
            <X className="size-3.5" />
          </button>
        )}

        {/* Bouton Scanner direct sur champ de recherche (Hero & Compact) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setScannerOpen(true)
          }}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/60 text-xs font-semibold text-muted-foreground transition-all hover:border-primary/40 hover:bg-card hover:text-foreground shrink-0 cursor-pointer',
            hero ? 'px-2.5 py-1' : 'p-1.5'
          )}
          title="Scanner le code-barres d'un médicament (CBM / AMM / EAN-13)"
        >
          <Barcode className="size-3.5 text-primary" aria-hidden />
          {hero && <span className="hidden sm:inline">Scanner</span>}
        </button>

        {isFetching && isOpen ? (
          <Loader2 className="size-4.5 shrink-0 animate-spin text-primary" aria-hidden />
        ) : (
          rightHint
        )}
      </div>

      {/* Popover pour Recherches récentes & Suggestions si input vide */}
      {open && value.trim().length === 0 && (
        <div
          role="region"
          aria-label="Recherches récentes et suggestions"
          className={cn(
            'scroll-thin absolute inset-x-0 top-full z-[100] mt-2 max-h-[min(32rem,calc(100vh-180px))] overflow-y-auto rounded-2xl border p-3.5 shadow-2xl backdrop-blur-2xl transition-all',
            isBotanique
              ? 'border-[#dcd4c5] bg-[#fcfbf8]/98 shadow-[#1b4332]/15 dark:border-[#1a2f24] dark:bg-[#0b1611]/98'
              : 'border-border/80 bg-popover/98 shadow-black/25'
          )}
        >
          {recentSearches.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between px-1 pb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3 text-primary" />
                  <span>Recherches Récentes</span>
                </span>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-[10px] text-muted-foreground hover:text-destructive transition-colors lowercase"
                >
                  effacer
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setValue(item)
                      setOpen(true)
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-card transition-all"
                  >
                    <History className="size-3 text-muted-foreground" />
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5 px-1 pb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <Flame className="size-3 text-amber-500" />
              <span>Médicaments Fréquents</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SEARCHES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setValue(item)
                    setOpen(true)
                  }}
                  className="rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-all"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className={cn(
            'scroll-thin absolute inset-x-0 top-full z-[100] mt-2 max-h-[min(32rem,calc(100vh-180px))] overflow-y-auto rounded-2xl border p-2 shadow-2xl backdrop-blur-2xl transition-all',
            isBotanique
              ? 'border-[#dcd4c5] bg-[#fcfbf8]/98 shadow-[#1b4332]/15 dark:border-[#1a2f24] dark:bg-[#0b1611]/98'
              : 'border-border/80 bg-popover/98 shadow-black/25'
          )}
        >
          {/* Header row in dropdown */}
          <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            <div className="flex items-center gap-1.5">
              <span aria-live="polite" role="status">
                Résultats ({results.length})
              </span>
              {detectedDosage && (
                <span className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold lowercase tracking-normal">
                  dosage : {detectedDosage}
                </span>
              )}
            </div>
            {data?.fuzzy && (
              <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Tolérance phonétique
              </span>
            )}
          </div>

          {/* Alerte Darija / Arabe */}
          {data?._meta?.arabicMapped && (
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300">
              <Globe className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                Terme en darija / arabe détecté{data._meta.arabicOriginal ? ` (« ${data._meta.arabicOriginal} »)` : ''} — recherche convertie vers{' '}
                <strong className="font-bold text-foreground">{data._meta.cleanKey}</strong>
              </span>
            </div>
          )}

          {/* Alerte Labo Algérien Détecté */}
          {data?._meta?.extractedLab && (
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Laboratoire identifié :</span>
              <strong className="font-bold text-foreground">{data._meta.extractedLab}</strong>
            </div>
          )}

          {/* Bandeau Suggestion orthographique "Vouliez-vous dire..." */}
          {data?.suggestion && data.suggestion.toUpperCase() !== trimmed.toUpperCase() && (
            <div className="mb-2 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
              <span className="flex items-center gap-1.5 truncate">
                <Sparkles className="size-3.5 shrink-0 text-primary animate-pulse" aria-hidden />
                <span className="truncate">
                  Résultats approchés pour « {trimmed} ». Vouliez-vous dire :{' '}
                  <strong className="font-bold text-foreground">{data.suggestion}</strong> ?
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setValue(data.suggestion!)
                  setOpen(true)
                }}
                className="ml-2 shrink-0 rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
              >
                Appliquer
              </button>
            </div>
          )}

          {nlActive && (
            <button
              type="button"
              role="option"
              aria-selected={activeIndex === 0}
              onClick={runSmartSearch}
              onMouseEnter={() => setActiveIndex(0)}
              className={cn(
                'mb-1 flex w-full items-start gap-3 rounded-xl border border-primary/30 bg-primary/8 p-3 text-left transition-colors',
                activeIndex === 0 ? 'bg-primary/15' : 'hover:bg-primary/12'
              )}
            >
              <Sparkles className="mt-0.5 size-4.5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  Recherche intelligente : « {trimmed} »
                </span>
                {chips.length > 0 && (
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {chips.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary"
                      >
                        {c}
                      </span>
                    ))}
                  </span>
                )}
                <span className="mt-1.5 block text-xs text-muted-foreground">
                  Explorer dans le Répertoire
                  {nlData?.total != null ? ` (${nlData.total.toLocaleString('fr-FR')} médicaments)` : ''}
                </span>
              </span>
            </button>
          )}

          {results.length === 0 && !isFetching && !nlActive ? (
            <div className="px-4 py-8 text-center">
              <Pill className="mx-auto size-8 text-muted-foreground/40" aria-hidden />
              <p className="mt-2 text-sm font-medium text-foreground">
                Aucun médicament trouvé pour « {trimmed} »
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Vérifiez l’orthographe ou essayez avec un nom de molécule (DCI) ou une indication clinique.
              </p>
            </div>
          ) : (
            results.map((drug, i) => {
              const row = nlActive ? i + 1 : i
              const isSelected = row === activeIndex
              return (
                <button
                  key={drug.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => select(drug)}
                  onMouseEnter={() => setActiveIndex(row)}
                  className={cn(
                    'group/row mt-1 flex w-full items-center justify-between gap-3 rounded-xl p-2.5 text-left transition-all',
                    isSelected
                      ? 'bg-primary/12 shadow-xs ring-1 ring-primary/30'
                      : 'hover:bg-accent/70'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-foreground">
                        <HighlightMatch text={drug.brand} query={trimmed} />
                      </span>
                      {drug.dosage && (
                        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground/80">
                          {drug.dosage}
                        </span>
                      )}
                      {drug.form && (
                        <span className="hidden shrink-0 rounded-md border border-border/80 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
                          {drug.form}
                        </span>
                      )}
                      {drug.hasBookRcp && (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-sky-700 dark:text-sky-300">
                          <BookOpen className="size-2.5" />
                          <span>RCP</span>
                        </span>
                      )}
                      {drug.barcode && (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                          <Barcode className="size-2.5" />
                          <span>{drug.barcode}</span>
                        </span>
                      )}
                      {drug.p1 && (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-amber-700 dark:text-amber-400">
                          <ShieldAlert className="size-2.5" />
                          <span>Hôpital</span>
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate">
                        <HighlightMatch text={drug.dci} query={trimmed} />
                      </span>
                      {drug.lab && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="truncate max-w-36 text-[11px] text-muted-foreground/80">{drug.lab}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {/* Actions rapides au survol */}
                    <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleQuickAddToBasket(e, drug)}
                        className="flex size-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title="Ajouter aux interactions"
                      >
                        <Plus className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleQuickCompare(e, drug)}
                        className="flex size-7 items-center justify-center rounded-lg border border-border/80 bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Comparer ce médicament"
                      >
                        <GitCompareArrows className="size-3.5" />
                      </button>
                    </div>

                    {drug.price != null && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-chifa tabular-nums">
                        <Coins className="size-3" aria-hidden />
                        {formatPrice(drug.price)}
                      </span>
                    )}
                    <StatusBadge status={drug.status} className="shrink-0" />
                  </div>
                </button>
              )
            })
          )}

          {/* Raccourcis clavier au pied de l'autocomplétion */}
          <div className="mt-2 flex items-center justify-between border-t border-border/60 px-3 pt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[9px] font-semibold">↑↓</kbd>
              <span>Naviguer</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-semibold">
                <CornerDownLeft className="inline size-2.5" />
              </kbd>
              <span>Fiche produit</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-semibold">Échap</kbd>
              <span>Fermer</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
