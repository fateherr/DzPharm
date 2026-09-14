'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Coins, CornerDownLeft, Loader2, Pill, Search, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchDrugs } from './api'
import type { Drug } from './types'
import { StatusBadge, formatPrice } from './status-badge'
import { useDzPharm } from './store'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
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
  'Rechercher en arabe ou darija (ex: باراسيتامول, دوا السكر)…',
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
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const internalRef = useRef<HTMLInputElement>(null)
  const debounced = useDebounce(value, 260)
  const trimmed = debounced.trim()

  // Dynamic cycling placeholder for hero
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  useEffect(() => {
    if (placeholder) return
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_SUGGESTIONS.length)
    }, 4500)
    return () => clearInterval(interval)
  }, [placeholder])

  const activePlaceholder = placeholder ?? PLACEHOLDER_SUGGESTIONS[placeholderIndex]

  const { data, isFetching } = useQuery({
    queryKey: ['drugs', 'autocomplete', trimmed],
    queryFn: ({ signal }) =>
      fetchDrugs({ q: trimmed, pageSize: 8, sort: 'relevance' }, signal),
    enabled: trimmed.length >= 2,
    placeholderData: keepPreviousData,
  })

  // Recherche intelligente NL
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

  return (
    <div ref={wrapperRef} className={cn('relative w-full', className)}>
      <div
        className={cn(
          'group flex items-center gap-3 rounded-2xl border bg-card/95 text-foreground shadow-lg shadow-black/5 transition-all',
          'border-border/80 focus-within:border-primary/80 focus-within:ring-4 focus-within:ring-primary/20',
          hero
            ? 'h-15 px-4.5 backdrop-blur-xl sm:h-16'
            : 'h-11 px-3.5'
        )}
      >
        <Search
          className={cn(
            'shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary',
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

        {/* Clear Button */}
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

        {isFetching && isOpen ? (
          <Loader2 className="size-4.5 shrink-0 animate-spin text-primary" aria-hidden />
        ) : (
          rightHint
        )}
      </div>

      {isOpen && (
        <div
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="scroll-thin absolute inset-x-0 top-full z-50 mt-2 max-h-[26rem] overflow-y-auto rounded-2xl border border-border/80 bg-popover/95 p-2 shadow-2xl shadow-black/20 backdrop-blur-xl"
        >
          {/* Header row in dropdown */}
          <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            <span>Résultats ({results.length})</span>
            {data?.fuzzy && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Recherche tolérante
              </span>
            )}
          </div>

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
                Vérifiez l’orthographe ou essayez avec un nom de molécule (DCI).
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
                    'mt-1 flex w-full items-center justify-between gap-3 rounded-xl p-2.5 text-left transition-all',
                    isSelected
                      ? 'bg-primary/12 shadow-xs ring-1 ring-primary/30'
                      : 'hover:bg-accent/70'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-foreground">
                        {drug.brand}
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
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate">{drug.dci}</span>
                      {drug.lab && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="truncate max-w-36 text-[11px] text-muted-foreground/80">{drug.lab}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
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

          {/* Footer Shortcuts bar */}
          <div className="mt-2 flex items-center justify-between border-t border-border/60 px-3 pt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[9px] font-semibold">↑↓</kbd>
              <span>Naviguer</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-semibold">
                <CornerDownLeft className="inline size-2.5" />
              </kbd>
              <span>Consulter</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[9px] font-semibold">Échap</kbd>
              <span>Fermer</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
