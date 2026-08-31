'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Loader2, Search, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchDrugs } from './api'
import type { Drug } from './types'
import { StatusBadge } from './status-badge'
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

/** Mots d'amorce typiques du langage naturel (« médicament pour… », « je cherche… »). */
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

/** Candidate NL : ≥3 caractères ET (multi-mots OU mot d'amorce en tête). */
function isNlCandidate(trimmed: string): boolean {
  if (trimmed.length < 3) return false
  if (/\s/.test(trimmed)) return true
  const first = normFr(trimmed).split(/\s+/)[0] ?? ''
  return NL_STARTERS.has(first)
}

function hasNlSignals(interp: NlInterpreted | undefined): boolean {
  if (!interp) return false
  return Boolean(
    interp.domain || interp.form || interp.status || interp.liste || interp.refundableOnly || interp.p1 || interp.pediatric
  )
}

const FORM_LABELS: Record<string, string> = {
  SIROP: 'Sirop',
  BUVABLE: 'Buvable',
  GOUTTE: 'Gouttes',
  COMP: 'Comprimé',
  GELULE: 'Gélule',
  INJ: 'Injectable',
  POMMADE: 'Pommade',
  CREME: 'Crème',
  COLLYRE: 'Collyre',
  SUPPO: 'Suppositoire',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIF: 'Actifs',
  NON_RENOUVELE: 'Non renouvelés',
  RETRIE: 'Retirés',
}

/** Libellés courts des filtres interprétés (aperçu dans la ligne intelligente). */
function interpretedChips(interp: NlInterpreted): string[] {
  const chips: string[] = []
  if (interp.domain) chips.push(interp.domain)
  if (interp.form) chips.push(FORM_LABELS[interp.form] ?? interp.form)
  if (interp.status) chips.push(STATUS_LABELS[interp.status] ?? interp.status)
  if (interp.pediatric) chips.push('Pédiatrique')
  if (interp.refundableOnly) chips.push('Remboursable CNAS')
  if (interp.p1) chips.push('P1 hôpital')
  if (interp.q) chips.push(`« ${interp.q} »`)
  return chips
}

interface SearchAutocompleteProps {
  onSelect: (drug: Drug) => void
  /** Appelé sur Entrée sans suggestion active (ex : aller au répertoire). */
  onSubmitQuery?: (query: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  autoFocus?: boolean
  size?: 'default' | 'hero'
  inputRef?: React.RefObject<HTMLInputElement | null>
  id?: string
  ariaLabel?: string
  /** Contenu à droite de l'input (ex : hint clavier). */
  rightHint?: React.ReactNode
}

export function SearchAutocomplete({
  onSelect,
  onSubmitQuery,
  placeholder = 'Rechercher un médicament, une DCI, un laboratoire…',
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
  const debounced = useDebounce(value, 300)
  const trimmed = debounced.trim()

  const { data, isFetching } = useQuery({
    queryKey: ['drugs', 'autocomplete', trimmed],
    queryFn: ({ signal }) =>
      fetchDrugs({ q: trimmed, pageSize: 8, sort: 'relevance' }, signal),
    enabled: trimmed.length >= 2,
    placeholderData: keepPreviousData,
  })

  // Recherche intelligente (langage naturel) — seulement si la saisie y ressemble
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
  // Nombre de lignes navigables (la ligne intelligente compte pour une)
  const rowCount = results.length + (nlActive ? 1 : 0)

  function select(drug: Drug) {
    onSelect(drug)
    setValue('')
    setOpen(false)
    internalRef.current?.blur()
  }

  /** Applique les filtres interprétés et ouvre le Répertoire. */
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
    internalRef.current?.blur()
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
    <div ref={wrapperRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-card text-foreground shadow-sm transition-colors',
          'border-border focus-within:border-primary/60 focus-within:ring-primary/20 focus-within:ring-4',
          hero ? 'h-14 px-4' : 'h-11 px-3.5'
        )}
      >
        <Search
          className={cn('shrink-0 text-muted-foreground', hero ? 'size-5' : 'size-4')}
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
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            'w-full bg-transparent outline-none placeholder:text-muted-foreground/70',
            // Cible tactile ≥ 44 px : l'input remplit la hauteur du conteneur
            // (P6 — recherche immédiatement tapable sur mobile, sans découverte clavier)
            hero ? 'min-h-14 text-base md:text-lg' : 'min-h-11 text-sm'
          )}
        />
        {isFetching && isOpen ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        ) : (
          rightHint
        )}
      </div>

      {isOpen && (
        <div
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="scroll-thin absolute inset-x-0 top-full z-50 mt-2 max-h-[22rem] overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl shadow-black/10"
        >
          {nlActive ? (
            <button
              type="button"
              role="option"
              aria-selected={activeIndex === 0}
              onClick={runSmartSearch}
              onMouseEnter={() => setActiveIndex(0)}
              className={cn(
                'flex w-full items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-left transition-colors',
                activeIndex === 0 ? 'bg-primary/15' : 'hover:bg-primary/10'
              )}
            >
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  Recherche intelligente&nbsp;: «&nbsp;{trimmed}&nbsp;»
                </span>
                {chips.length > 0 ? (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {chips.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                      >
                        {c}
                      </span>
                    ))}
                  </span>
                ) : null}
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Ouvrir le Répertoire avec ces filtres
                  {nlData?.total != null ? ` · ${nlData.total.toLocaleString('fr-FR')} médicaments` : ''}
                </span>
              </span>
            </button>
          ) : null}

          {results.length === 0 && !isFetching && !nlActive ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Aucun médicament trouvé pour «&nbsp;{trimmed}&nbsp;»
            </p>
          ) : (
            results.map((drug, i) => {
              const row = nlActive ? i + 1 : i
              return (
                <button
                  key={drug.id}
                  type="button"
                  role="option"
                  aria-selected={row === activeIndex}
                  onClick={() => select(drug)}
                  onMouseEnter={() => setActiveIndex(row)}
                  className={cn(
                    'mt-0.5 flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    row === activeIndex ? 'bg-primary/10' : 'hover:bg-accent'
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {drug.brand}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {drug.dci}
                      {drug.dosage ? ` · ${drug.dosage}` : ''}
                    </span>
                  </span>
                  <StatusBadge status={drug.status} className="shrink-0" />
                </button>
              )
            })
          )}

          {nlActive && results.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              Aucun médicament ne correspond — ajustez les filtres dans le Répertoire.
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
