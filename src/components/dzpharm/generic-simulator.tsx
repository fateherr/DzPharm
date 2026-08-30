'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Info,
  Loader2,
  PiggyBank,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, formatPrice } from './status-badge'
import { SafetyNote } from './safety-note'

/**
 * Simulateur d'économies par substitution générique (P1 — plan §).
 * Auto-contenu : types et fetchers locaux (aucune dépendance aux types/api/store partagés).
 * 1 à 4 médicaments de marque → équivalent ACTIF le moins cher du même DCI
 * (même dosage en priorité) → économie par ligne + total du panier.
 */

/* ------------------------------------------------------------------ */
/* Types & fetchers locaux                                             */
/* ------------------------------------------------------------------ */

interface SimDrug {
  id: number
  brand: string
  dci: string
  dosage: string | null
  form: string | null
  packaging?: string | null
  lab?: string | null
  status: string
  price: number | null
  refundable?: boolean
}

interface SimEquivalent {
  id: number
  brand: string
  lab?: string | null
  dosage: string | null
  form?: string | null
  status: string
  price?: number | null
  refundable?: boolean
}

interface SimPharmacy {
  id: number
  name: string
  ppa: number | null
  refundable: boolean
}

interface SimDetail {
  drug: SimDrug & { pharmacy?: SimPharmacy[] }
  equivalents: SimEquivalent[]
}

const MAX_LINES = 4

async function searchSimDrugs(q: string, signal?: AbortSignal): Promise<SimDrug[]> {
  const res = await fetch(
    `/api/drugs?q=${encodeURIComponent(q)}&pageSize=8&status=ACTIF&sort=relevance`,
    { signal }
  )
  if (!res.ok) throw new Error(`Requête échouée (${res.status})`)
  const data = (await res.json()) as { drugs: SimDrug[] }
  return data.drugs
}

async function fetchSimDetail(id: number, signal?: AbortSignal): Promise<SimDetail> {
  const res = await fetch(`/api/drugs/${id}`, { signal })
  if (!res.ok) throw new Error(`Requête échouée (${res.status})`)
  return (await res.json()) as SimDetail
}

/** Normalisation de dosage (« 850 MG » ≡ « 850MG » ≡ « 0,85G » non converti). */
function normDosage(d: string | null | undefined): string {
  return (d ?? '').toUpperCase().replace(/[\s.]/g, '')
}

/** Cnas badge compact. */
function CnasBadge({ on }: { on?: boolean }) {
  if (!on) return null
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-state-safe/40 bg-state-safe/10 px-2 py-0.5 text-[10px] font-bold text-state-safe">
      <BadgeCheck className="size-3" aria-hidden />
      CNAS
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Autocomplete local (marques actives + prix)                         */
/* ------------------------------------------------------------------ */

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

function SimAutocomplete({ onPick }: { onPick: (drug: SimDrug) => void }) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounced = useDebounced(value, 300)
  const trimmed = debounced.trim()

  const { data, isFetching } = useQuery({
    queryKey: ['gen-sim', 'search', trimmed],
    queryFn: ({ signal }) => searchSimDrugs(trimmed, signal),
    enabled: trimmed.length >= 2,
  })
  const results = useMemo(() => data ?? [], [data])

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

  function pick(d: SimDrug) {
    onPick(d)
    setValue('')
    setOpen(false)
    setActive(-1)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3.5 shadow-sm transition-colors focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/20">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="text"
          id="gen-sim-input"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="gen-sim-listbox"
          aria-label="Ajouter un médicament de marque au simulateur"
          aria-autocomplete="list"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && results.length > 0) {
              e.preventDefault()
              setActive((i) => (i + 1) % results.length)
            } else if (e.key === 'ArrowUp' && results.length > 0) {
              e.preventDefault()
              setActive((i) => (i <= 0 ? results.length - 1 : i - 1))
            } else if (e.key === 'Enter' && active >= 0 && results[active]) {
              e.preventDefault()
              pick(results[active])
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          placeholder="Ajouter un médicament de marque (ex. DOLIPRANE, GLUCOPHAGE…)"
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
        />
        {isFetching && isOpen ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        ) : (
          <Plus className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />
        )}
      </div>

      {isOpen ? (
        <div
          id="gen-sim-listbox"
          role="listbox"
          className="scroll-thin absolute inset-x-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl shadow-black/10"
        >
          {results.length === 0 && !isFetching ? (
            <p className="px-3 py-5 text-center text-sm text-muted-foreground">
              Aucun médicament actif trouvé pour «&nbsp;{trimmed}&nbsp;»
            </p>
          ) : (
            results.map((d, i) => (
              <button
                key={d.id}
                type="button"
                role="option"
                aria-selected={i === active}
                onClick={() => pick(d)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  i === active ? 'bg-primary/10' : 'hover:bg-accent'
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {d.brand}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {d.dci}
                    {d.dosage ? ` · ${d.dosage}` : ''}
                    {d.form ? ` · ${d.form}` : ''}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  {d.price != null ? (
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {formatPrice(d.price)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">prix n.d.</span>
                  )}
                  <CnasBadge on={d.refundable} />
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Ligne du panier : marque → équivalent le moins cher                 */
/* ------------------------------------------------------------------ */

interface LineResult {
  brandPrice: number | null
  cheapest: SimEquivalent | null
  sameDosage: boolean
  pricedCount: number
  brandHasPrice: boolean
}

function useLineResult(drug: SimDrug, detail: SimDetail | undefined): LineResult {
  return useMemo(() => {
    const brandPrice =
      drug.price ?? detail?.drug.pharmacy?.[0]?.ppa ?? null
    const priced = (detail?.equivalents ?? []).filter(
      (e) => e.status === 'ACTIF' && e.price != null
    )
    const key = normDosage(drug.dosage)
    const same = key ? priced.filter((e) => normDosage(e.dosage) === key) : []
    const pool = same.length > 0 ? same : priced
    const cheapest =
      pool.length > 0
        ? pool.reduce((a, b) => ((a.price ?? Infinity) <= (b.price ?? Infinity) ? a : b))
        : null
    return {
      brandPrice,
      cheapest,
      sameDosage: same.length > 0,
      pricedCount: priced.length,
      brandHasPrice: brandPrice != null,
    }
  }, [drug, detail])
}

function SimLineCard({
  drug,
  detail,
  isLoading,
  onRemove,
}: {
  drug: SimDrug
  detail: SimDetail | undefined
  isLoading: boolean
  onRemove: () => void
}) {
  const res = useLineResult(drug, detail)

  const savings =
    res.brandPrice != null && res.cheapest?.price != null
      ? res.brandPrice - res.cheapest.price
      : null
  const savingsPct =
    savings != null && res.brandPrice != null && res.brandPrice > 0
      ? Math.round((savings / res.brandPrice) * 100)
      : null

  const pharmacyPrices = (detail?.drug.pharmacy ?? [])
    .map((p) => p.ppa)
    .filter((p): p is number => p != null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card>
        <CardContent className="p-4">
          {/* En-tête de ligne */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                <span className="truncate">{drug.brand}</span>
                {drug.dosage ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {drug.dosage}
                  </span>
                ) : null}
                <StatusBadge status={drug.status} />
                <CnasBadge on={drug.refundable} />
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {drug.dci}
                {drug.lab ? ` · ${drug.lab}` : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-state-danger"
              onClick={onRemove}
              aria-label={`Retirer ${drug.brand} du simulateur`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          {/* Comparatif marque → générique */}
          {isLoading ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Recherche des équivalents même DCI…
            </p>
          ) : !detail ? (
            <p className="mt-3 text-sm text-state-danger">
              Impossible de charger les équivalents — réessayez plus tard.
            </p>
          ) : (
            <div className="mt-3 grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr]">
              {/* Marque sélectionnée */}
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Marque sélectionnée
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">
                  {res.brandPrice != null ? formatPrice(res.brandPrice) : 'Prix non disponible'}
                </p>
                {pharmacyPrices.length > 1 ? (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {pharmacyPrices.length} conditionnements prix :{' '}
                    {formatPrice(Math.min(...pharmacyPrices))} –{' '}
                    {formatPrice(Math.max(...pharmacyPrices))}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-center" aria-hidden>
                <ArrowRight className="size-4 rotate-90 text-muted-foreground sm:rotate-0" />
              </div>

              {/* Générique le moins cher */}
              <div
                className={cn(
                  'rounded-lg border p-3',
                  res.cheapest
                    ? 'border-state-safe/40 bg-state-safe/5'
                    : 'border-dashed border-border bg-transparent'
                )}
              >
                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Équivalent actif le moins cher
                </p>
                {res.cheapest ? (
                  <>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-foreground">
                      <span className="truncate">{res.cheapest.brand}</span>
                      {res.cheapest.dosage ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {res.cheapest.dosage}
                        </span>
                      ) : null}
                      <CnasBadge on={res.cheapest.refundable} />
                    </p>
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      {formatPrice(res.cheapest.price ?? null)}
                    </p>
                    {!res.sameDosage && normDosage(drug.dosage) ? (
                      <p className="mt-0.5 text-[11px] text-state-warning">
                        Dosage différent ({res.cheapest.dosage || 'n.d.'} vs{' '}
                        {drug.dosage}) — aucun équivalent même dosage avec prix
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {res.pricedCount === 0
                      ? "Aucun équivalent actif avec prix référencé"
                      : 'Prix non disponible'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Économie de la ligne */}
          {savings != null ? (
            <p
              className={cn(
                'mt-3 flex flex-wrap items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold',
                savings > 0
                  ? 'bg-state-safe/10 text-state-safe'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {savings > 0 ? (
                <>
                  <TrendingDown className="size-4" aria-hidden />
                  Économie de {formatPrice(savings)}
                  {savingsPct != null ? ` (−${savingsPct} %)` : ''}
                </>
              ) : (
                <>
                  <BadgeCheck className="size-4" aria-hidden />
                  La marque sélectionnée est déjà au meilleur prix du même DCI
                  {savings < 0 ? ` (+${formatPrice(Math.abs(savings))})` : ''}
                </>
              )}
            </p>
          ) : res.brandPrice == null && !isLoading ? (
            <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              Prix de la marque non disponible — ligne exclue du total.
            </p>
          ) : null}

          {/* Alternatives */}
          {detail?.equivalents ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {detail.equivalents.filter((e) => e.status === 'ACTIF').length} équivalent(s)
              actif(s) du même DCI référencé(s) au registre
              {res.pricedCount > 1 ? ` · ${res.pricedCount} avec prix PPA` : ''}.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Vue principale                                                      */
/* ------------------------------------------------------------------ */

export function GenericSimulator() {
  const [lines, setLines] = useState<SimDrug[]>([])
  const [demoLoading, setDemoLoading] = useState(false)

  const full = lines.length >= MAX_LINES

  function addLine(drug: SimDrug) {
    setLines((prev) => {
      if (prev.some((l) => l.id === drug.id) || prev.length >= MAX_LINES) return prev
      return [...prev, drug]
    })
  }

  /** Exemple vérifié : DOLIPRANE 1000MG + GLUCOPHAGE 850MG (résolution par recherche). */
  async function loadDemo() {
    setDemoLoading(true)
    try {
      const pick = async (q: string, dosage: string): Promise<SimDrug | null> => {
        const list = await searchSimDrugs(q)
        return list.find((d) => d.dosage && normDosage(d.dosage) === normDosage(dosage)) ?? list[0] ?? null
      }
      const [doliprane, glucophage] = await Promise.all([
        pick('DOLIPRANE', '1000MG'),
        pick('GLUCOPHAGE', '850MG'),
      ])
      const demo = [doliprane, glucophage].filter((d): d is SimDrug => d !== null)
      if (demo.length === 0) return
      setLines((prev) => {
        const merged = [...prev]
        for (const d of demo) {
          if (merged.length >= MAX_LINES) break
          if (!merged.some((l) => l.id === d.id)) merged.push(d)
        }
        return merged
      })
    } catch {
      /* silencieux : l'utilisateur peut ajouter manuellement */
    } finally {
      setDemoLoading(false)
    }
  }

  // Détails pour le total (une requête par ligne, en parallèle)
  const details = useQuery({
    queryKey: ['gen-sim', 'details', lines.map((l) => l.id).join('|')],
    queryFn: async () => {
      const entries = await Promise.all(
        lines.map(async (l) => {
          const d = await fetchSimDetail(l.id)
          return [l.id, d] as const
        })
      )
      return new Map(entries)
    },
    enabled: lines.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  const totals = useMemo(() => {
    let brandTotal = 0
    let genericTotal = 0
    let counted = 0
    let withoutPrice = 0
    for (const line of lines) {
      const detail = details.data?.get(line.id)
      const brandPrice = line.price ?? detail?.drug.pharmacy?.[0]?.ppa ?? null
      if (brandPrice == null) {
        withoutPrice++
        continue
      }
      const priced = (detail?.equivalents ?? []).filter(
        (e) => e.status === 'ACTIF' && e.price != null
      )
      const key = normDosage(line.dosage)
      const same = key ? priced.filter((e) => normDosage(e.dosage) === key) : []
      const pool = same.length > 0 ? same : priced
      const cheapest = pool.length > 0 ? Math.min(...pool.map((e) => e.price as number)) : null
      brandTotal += brandPrice
      genericTotal += cheapest ?? brandPrice
      counted++
    }
    const savings = brandTotal - genericTotal
    const pct = brandTotal > 0 ? Math.round((savings / brandTotal) * 100) : 0
    return { brandTotal, genericTotal, savings, pct, counted, withoutPrice }
  }, [lines, details.data])

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <PiggyBank className="size-5 text-primary" aria-hidden />
            Simulateur d&apos;économies génériques
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Sélectionnez 1 à {MAX_LINES} médicaments de marque — DzPharm trouve
            l&apos;équivalent <strong>actif</strong> le moins cher du même DCI (priorité au
            même dosage) et chiffre l&apos;économie sur les prix PPA officiels.
          </p>
        </div>
        {lines.length === 0 ? (
          <Button variant="outline" className="gap-2" onClick={loadDemo} disabled={demoLoading}>
            {demoLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            Charger un exemple
          </Button>
        ) : null}
      </div>

      {/* Ajout + panier de marques */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <ChevronDown className="size-4 text-primary" aria-hidden />
              Panier de marques
            </span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                full ? 'bg-state-warning/15 text-state-warning' : 'bg-primary/10 text-primary'
              )}
            >
              {lines.length}/{MAX_LINES}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!full ? <SimAutocomplete onPick={addLine} /> : null}
          {full ? (
            <p className="rounded-lg border border-state-warning/40 bg-state-warning/10 px-3 py-2 text-xs text-state-warning">
              Maximum de {MAX_LINES} médicaments — retirez une ligne pour en ajouter une autre.
            </p>
          ) : null}
          {lines.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Médicaments du simulateur">
              {lines.map((l) => (
                <li key={l.id}>
                  <span className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-secondary/60 py-1.5 pr-1.5 pl-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">
                        {l.brand}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {l.dci}
                        {l.dosage ? ` · ${l.dosage}` : ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setLines((p) => p.filter((x) => x.id !== l.id))}
                      aria-label={`Retirer ${l.brand}`}
                      className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-state-danger/10 hover:text-state-danger focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Aucun médicament dans le simulateur. Ajoutez une marque via la recherche
              ci-dessus, ou chargez l&apos;exemple (DOLIPRANE 1000MG + GLUCOPHAGE 850MG).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lignes détaillées */}
      {lines.map((l) => (
        <SimLineCard
          key={l.id}
          drug={l}
          detail={details.data?.get(l.id)}
          isLoading={details.isFetching && !details.data?.has(l.id)}
          onRemove={() => setLines((p) => p.filter((x) => x.id !== l.id))}
        />
      ))}

      {/* Total du panier */}
      {totals.counted > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PiggyBank className="size-4 text-primary" aria-hidden />
                Économies sur le panier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Total panier marque
                  </p>
                  <p className="mt-1 text-lg font-bold text-foreground tabular-nums">
                    {formatPrice(totals.brandTotal)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Total génériques
                  </p>
                  <p className="mt-1 text-lg font-bold text-foreground tabular-nums">
                    {formatPrice(totals.genericTotal)}
                  </p>
                </div>
                <div
                  className={cn(
                    'rounded-lg border p-3',
                    totals.savings > 0
                      ? 'border-state-safe/40 bg-state-safe/10'
                      : 'border-border bg-card'
                  )}
                >
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Économies
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-lg font-bold tabular-nums',
                      totals.savings > 0 ? 'text-state-safe' : 'text-muted-foreground'
                    )}
                  >
                    {totals.savings > 0
                      ? `${formatPrice(totals.savings)} (−${totals.pct} %)`
                      : 'Déjà au meilleur prix'}
                  </p>
                </div>
              </div>

              {/* Barre animée de gain */}
              <div>
                <div
                  className="h-3 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={Math.max(0, Math.min(100, totals.pct))}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Part du panier économisée avec les génériques"
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(0, Math.min(100, totals.pct))}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={cn(
                      'h-full rounded-full',
                      totals.savings > 0
                        ? 'bg-gradient-to-r from-state-safe/70 to-state-safe'
                        : 'bg-muted-foreground/40'
                    )}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {totals.savings > 0
                    ? `${totals.pct} % du montant du panier couvert par les génériques · ${totals.counted} ligne(s) comptabilisée(s)`
                    : 'Aucune économie possible sur ce panier'}
                  {totals.withoutPrice > 0
                    ? ` · ${totals.withoutPrice} ligne(s) sans prix exclu(s)`
                    : ''}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : lines.length > 0 && details.isFetching ? (
        <p className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Calcul des économies…
        </p>
      ) : null}

      {/* Note éducative + sécurité */}
      <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground/90">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p>
          La substitution par générique est encadrée — le pharmacien peut proposer un
          générique du même DCI (décret exécutif). Les prix affichés sont les PPA
          officiels.
        </p>
      </div>
      <SafetyNote>
        Outil d&apos;aide à la dispensation — les économies sont estimées sur les prix PPA
        officiels du même DCI et ne préjugent pas de l’interchangeabilité thérapeutique,
        décision qui relève du pharmacien et du prescripteur.
      </SafetyNote>
    </div>
  )
}
