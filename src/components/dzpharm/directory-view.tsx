'use client'

import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  ArrowUp,
  ArrowUpDown,
  BadgeCheck,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Coins,
  Download,
  FileX2,
  LayoutGrid,
  List,
  Loader2,
  Pill,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { fetchDrugs, fetchStats } from './api'
import type { Drug, DrugQueryParams } from './types'
import { StatusBadge, countryCode, formatNumber, formatPrice, isLocal } from './status-badge'
import { FreshnessBadge } from './freshness-badge'
import { useDzPharm } from './store'

type SortField = NonNullable<DrugQueryParams['sort']>

const STATUS_OPTIONS = [
  { value: 'ACTIF', label: 'Actifs' },
  { value: 'NON_RENOUVELE', label: 'Non renouvelés' },
  { value: 'RETRIE', label: 'Retirés' },
]

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function pageList(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const items: (number | '…')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)
  if (start > 2) items.push('…')
  for (let i = start; i <= end; i++) items.push(i)
  if (end < totalPages - 1) items.push('…')
  items.push(totalPages)
  return items
}

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value)
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function SortHeader({
  label,
  field,
  sort,
  onSort,
  className,
}: {
  label: string
  field: SortField
  sort: SortField
  onSort: (f: SortField) => void
  className?: string
}) {
  const active = sort === field
  return (
    <th
      scope="col"
      className={cn(
        'sticky top-0 z-10 bg-card/95 backdrop-blur-sm px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase shadow-[0_1px_0_0_var(--border)] transition-colors',
        active && 'bg-primary/8 text-primary font-bold',
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-colors',
          active ? 'text-primary' : 'hover:text-foreground'
        )}
        aria-label={`Trier par ${label}`}
      >
        {label}
        {active ? (
          <ArrowUp className="size-3.5 text-primary" aria-hidden />
        ) : (
          <ArrowUpDown className="size-3.5 opacity-40 hover:opacity-80" aria-hidden />
        )}
      </button>
    </th>
  )
}

function StaticHeader({ label, className }: { label: string; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        'sticky top-0 z-10 bg-card/95 backdrop-blur-sm px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase shadow-[0_1px_0_0_var(--border)]',
        className
      )}
    >
      {label}
    </th>
  )
}

export function DirectoryView() {
  const filters = useDzPharm((s) => s.filters)
  const setFilters = useDzPharm((s) => s.setFilters)
  const resetFilters = useDzPharm((s) => s.resetFilters)
  const openDrug = useDzPharm((s) => s.openDrug)
  const { toast } = useToast()

  const [searchInput, setSearchInput] = useState(filters.q)
  const debouncedSearch = useDebouncedValue(searchInput, 250)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sort, setSort] = useState<SortField>('relevance')
  const [exporting, setExporting] = useState(false)
  const [layoutMode, setLayoutMode] = useState<'table' | 'cards'>('table')
  const [dirScope, setDirScope] = useState<'all' | 'dci' | 'brand' | 'lab' | 'regNumber'>('all')

  // Synchronise la recherche débouncée avec le store
  useEffect(() => {
    if (debouncedSearch !== filters.q) setFilters({ q: debouncedSearch })
  }, [debouncedSearch])

  // Synchronise l'input si le store change de l'extérieur (ex: suggestion cliquée)
  useEffect(() => {
    if (filters.q !== searchInput) {
      setSearchInput(filters.q)
    }
  }, [filters.q])

  // Phase 2.3: Restauration de l'état de recherche depuis l'URL au montage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const patch: Partial<typeof filters> = {}
    const qParam = params.get('q')
    const statusParam = params.get('status')
    const domainParam = params.get('domain')
    const formParam = params.get('form')
    const listeParam = params.get('liste')
    const countryParam = params.get('country')
    const labParam = params.get('lab')
    const pageParam = params.get('page')

    if (qParam) patch.q = qParam
    if (statusParam) patch.status = statusParam
    if (domainParam) patch.domain = domainParam
    if (formParam) patch.form = formParam
    if (listeParam) patch.liste = listeParam
    if (countryParam) patch.country = countryParam
    if (labParam) patch.lab = labParam

    if (pageParam) {
      const p = parseInt(pageParam, 10)
      if (p > 1) setPage(p)
    }

    // P2-05: Restore scope from URL
    const scopeParam = params.get('scope')
    if (scopeParam && (['dci', 'brand', 'lab', 'regNumber'] as const).includes(scopeParam as any)) {
      setDirScope(scopeParam as typeof dirScope)
    }

    if (Object.keys(patch).length > 0) {
      setFilters(patch)
      if (patch.q) setSearchInput(patch.q)
    }
  }, [])

  // Phase 2.3: Synchronisation de l'état de recherche vers l'URL (sans rechargement)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (filters.q) params.set('q', filters.q)
    else params.delete('q')

    if (filters.status) params.set('status', filters.status)
    else params.delete('status')

    if (filters.domain) params.set('domain', filters.domain)
    else params.delete('domain')

    if (filters.form) params.set('form', filters.form)
    else params.delete('form')

    if (filters.liste) params.set('liste', filters.liste)
    else params.delete('liste')

    if (filters.country) params.set('country', filters.country)
    else params.delete('country')

    if (filters.lab) params.set('lab', filters.lab)
    else params.delete('lab')

    if (page > 1) params.set('page', String(page))
    else params.delete('page')

    // P2-05: Sync scope to URL
    if (dirScope && dirScope !== 'all') params.set('scope', dirScope)
    else params.delete('scope')

    const qStr = params.toString()
    const targetUrl = qStr ? `${window.location.pathname}?${qStr}` : window.location.pathname
    window.history.replaceState(null, '', targetUrl)
  }, [filters, page, dirScope])

  // Réinitialise la page quand les filtres changent
  useEffect(() => {
    setPage(1)
  }, [filters])

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: ({ signal }) => fetchStats(signal),
    staleTime: 30 * 60 * 1000,
  })

  const queryParams: DrugQueryParams = useMemo(
    () => ({
      q: filters.q || undefined,
      status: filters.status || undefined,
      domain: filters.domain || undefined,
      form: filters.form || undefined,
      liste: filters.liste || undefined,
      country: filters.country || undefined,
      lab: filters.lab || undefined,
      scope: dirScope === 'all' ? undefined : dirScope,
      page,
      pageSize,
      sort,
    }),
    [filters, dirScope, page, pageSize, sort]
  )

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['drugs', queryParams],
    queryFn: ({ signal }) => fetchDrugs(queryParams, signal),
    placeholderData: keepPreviousData,
  })

  const drugs = data?.drugs ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 0
  const fuzzy = data?.fuzzy === true
  const suggestion = (data as any)?.suggestion as string | undefined

  const hasActiveFilters = Boolean(
    filters.q || filters.status || filters.domain || filters.form || filters.liste || filters.country || filters.lab
  )

  // Options de filtres normalisées issues des statistiques
  const listeOptions = useMemo(() => {
    if (!stats) return []
    const map = new Map<string, number>()
    for (const l of stats.listes) {
      const key = l.key.toUpperCase().replace(/\s+/g, ' ').trim()
      map.set(key, (map.get(key) ?? 0) + l.count)
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [stats])

  function handleSort(field: SortField) {
    setSort((prev) => (prev === field ? 'relevance' : field))
    setPage(1)
  }

  async function handleExportCsv() {
    setExporting(true)
    try {
      const res = await fetchDrugs({ ...queryParams, page: 1, pageSize: 100, sort: 'brand' })
      const headers = [
        'Marque',
        'DCI',
        'Forme',
        'Dosage',
        'Conditionnement',
        'PPA (DA)',
        'Remboursable CNAS',
        'Laboratoire',
        'Pays',
        'Liste',
        'Domaine',
        'Statut',
        'N° AMM',
        'Enregistré le',
        'Expire le',
      ]
      const rows = res.drugs.map((d: Drug) => [
        d.brand,
        d.dci,
        d.form,
        d.dosage,
        d.packaging,
        d.price ?? '',
        d.refundable ? 'Oui' : 'Non',
        d.lab,
        d.country,
        d.liste,
        d.domain,
        d.status,
        d.regNumber,
        d.regDateInitial,
        d.regDateFinal,
      ])
      const csv =
        '\uFEFF' +
        [headers, ...rows].map((r) => r.map(csvEscape).join(';')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dzpharm-export-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({
        title: 'Export CSV généré',
        description: `${Math.min(res.total, 100)} médicaments exportés (limité aux 100 premiers résultats).`,
      })
    } catch {
      toast({
        title: 'Échec de l’export',
        description: 'Une erreur est survenue lors de la génération du fichier CSV.',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  const pagination = pageList(page, Math.max(totalPages, 1))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* --------------------------- Titre & Actions --------------------------- */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Répertoire Officiel</h1>
            <FreshnessBadge variant="compact" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? (
              'Recherche en cours…'
            ) : isError ? (
              'Erreur de chargement'
            ) : (
              <>
                <span className="font-semibold text-foreground">{formatNumber(total)}</span>{' '}
                médicament{total !== 1 ? 's' : ''} trouvé{total !== 1 ? 's' : ''}
                {fuzzy ? (
                  <span className="ml-1.5 rounded-full border border-primary/35 bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary shadow-xs">
                    tolérance phonétique active
                  </span>
                ) : null}
                {isFetching ? ' · actualisation…' : ''}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Bascule Mode Table / Mode Cartes */}
          <div className="flex items-center rounded-lg border border-border/80 bg-card p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setLayoutMode('table')}
              className={cn(
                'flex size-8 items-center justify-center rounded-md text-xs transition-all',
                layoutMode === 'table' ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Affichage en tableau"
              aria-label="Affichage en tableau"
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('cards')}
              className={cn(
                'flex size-8 items-center justify-center rounded-md text-xs transition-all',
                layoutMode === 'cards' ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Affichage en cartes"
              aria-label="Affichage en cartes"
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting || total === 0}
            className="gap-1.5 shadow-2xs hover:shadow-xs"
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            <span className="hidden sm:inline">Exporter</span> CSV
          </Button>
        </div>
      </div>

      {/* --------------------------- Toolbar Filtres --------------------------- */}
      <div className="mb-4 rounded-xl border border-border/80 bg-card/85 p-4 shadow-sm backdrop-blur-md">
        {/* Périmètre filter bar */}
        <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar px-0.5">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-0.5">
            Périmètre :
          </span>
          {([
            { id: 'all', label: 'Tous' },
            { id: 'dci', label: 'DCI / Molécule' },
            { id: 'brand', label: 'Marque' },
            { id: 'lab', label: 'Laboratoire' },
            { id: 'regNumber', label: 'N° AMM' },
          ] as const).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setDirScope(s.id)}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap',
                dirScope === s.id
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs ring-1 ring-primary/30'
                  : 'bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/70'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher marque, DCI, labo, dosage (ex: Augmentin 1g, Amox 500 sirop)…"
              aria-label="Rechercher dans le répertoire"
              className="h-10 border-border/80 bg-background/90 pl-9 transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/60"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('')
                  setFilters({ q: '' })
                }}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Effacer le texte"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center">
            <Select
              value={filters.status || 'all'}
              onValueChange={(v) => setFilters({ status: v === 'all' ? '' : v })}
            >
              <SelectTrigger className="h-10 w-full lg:w-[170px]" aria-label="Filtrer par statut">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts{stats ? ` (${stats.total.toLocaleString('fr-DZ')})` : ''}</SelectItem>
                <SelectItem value="ACTIF">
                  Actifs{stats ? ` (${stats.actifs.toLocaleString('fr-DZ')})` : ''}
                </SelectItem>
                <SelectItem value="NON_RENOUVELE">
                  Non renouvelés{stats ? ` (${stats.nonRenew.toLocaleString('fr-DZ')})` : ''}
                </SelectItem>
                <SelectItem value="RETRIE">
                  Retirés{stats ? ` (${stats.retires.toLocaleString('fr-DZ')})` : ''}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.domain || 'all'}
              onValueChange={(v) => setFilters({ domain: v === 'all' ? '' : v })}
            >
              <SelectTrigger className="h-10 w-full lg:w-[170px]" aria-label="Filtrer par domaine">
                <SelectValue placeholder="Domaine" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Tous domaines</SelectItem>
                {(stats?.domains ?? []).map((d) => (
                  <SelectItem key={d.key} value={d.key}>
                    {d.key} ({d.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.form || 'all'}
              onValueChange={(v) => setFilters({ form: v === 'all' ? '' : v })}
            >
              <SelectTrigger className="h-10 w-full lg:w-[150px]" aria-label="Filtrer par forme">
                <SelectValue placeholder="Forme" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Toutes formes</SelectItem>
                {(stats?.topForms ?? []).slice(0, 20).map((f) => (
                  <SelectItem key={f.key} value={f.key}>
                    {f.key} ({f.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.liste || 'all'}
              onValueChange={(v) => setFilters({ liste: v === 'all' ? '' : v })}
            >
              <SelectTrigger className="h-10 w-full lg:w-[130px]" aria-label="Filtrer par liste">
                <SelectValue placeholder="Liste" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes listes</SelectItem>
                {listeOptions.map((l) => (
                  <SelectItem key={l.name} value={l.name}>
                    {l.name} ({l.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.country || 'all'}
              onValueChange={(v) => setFilters({ country: v === 'all' ? '' : v })}
            >
              <SelectTrigger className="h-10 w-full lg:w-[130px]" aria-label="Filtrer par pays">
                <SelectValue placeholder="Pays" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Tous pays</SelectItem>
                {(stats?.countries ?? []).map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.key} ({c.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  resetFilters()
                  setSearchInput('')
                }}
                className="h-10 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-4" aria-hidden />
                <span>Effacer</span>
              </Button>
            ) : null}
          </div>
        </div>

        {/* -------------------- Jetons de Filtres Actifs (Smart Chips) -------------------- */}
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2.5 text-xs">
            <span className="font-semibold text-muted-foreground mr-1 text-[11px] uppercase tracking-wider">
              Filtres actifs :
            </span>

            {filters.q && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
                <span>« {filters.q} »</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('')
                    setFilters({ q: '' })
                  }}
                  className="rounded-full hover:bg-primary/20 p-0.5"
                  aria-label="Retirer la recherche texte"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {filters.status && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 font-medium text-foreground">
                <span>Statut : {STATUS_OPTIONS.find((s) => s.value === filters.status)?.label ?? filters.status}</span>
                <button
                  type="button"
                  onClick={() => setFilters({ status: '' })}
                  className="rounded-full hover:bg-muted p-0.5"
                  aria-label="Retirer le filtre statut"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {filters.domain && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 font-medium text-foreground">
                <span>Domaine : {filters.domain}</span>
                <button
                  type="button"
                  onClick={() => setFilters({ domain: '' })}
                  className="rounded-full hover:bg-muted p-0.5"
                  aria-label="Retirer le filtre domaine"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {filters.form && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 font-medium text-foreground">
                <span>Forme : {filters.form}</span>
                <button
                  type="button"
                  onClick={() => setFilters({ form: '' })}
                  className="rounded-full hover:bg-muted p-0.5"
                  aria-label="Retirer le filtre forme"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {filters.liste && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 font-medium text-foreground">
                <span>Liste : {filters.liste}</span>
                <button
                  type="button"
                  onClick={() => setFilters({ liste: '' })}
                  className="rounded-full hover:bg-muted p-0.5"
                  aria-label="Retirer le filtre liste"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {filters.country && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 font-medium text-foreground">
                <span>Pays : {filters.country}</span>
                <button
                  type="button"
                  onClick={() => setFilters({ country: '' })}
                  className="rounded-full hover:bg-muted p-0.5"
                  aria-label="Retirer le filtre pays"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {filters.lab && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 font-medium text-foreground">
                <span>Labo : {filters.lab}</span>
                <button
                  type="button"
                  onClick={() => setFilters({ lab: '' })}
                  className="rounded-full hover:bg-muted p-0.5"
                  aria-label="Retirer le filtre laboratoire"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* -------------------- Bandeau Suggestion Phonétique "Vouliez-vous dire..." -------------------- */}
      {suggestion && suggestion.toUpperCase() !== (filters.q || '').trim().toUpperCase() && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-primary animate-pulse" />
            <span>
              Résultats approchés pour « {filters.q} ». Vouliez-vous dire :{' '}
              <strong className="font-bold text-foreground">{suggestion}</strong> ?
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-primary/30 bg-card hover:bg-primary/20"
            onClick={() => {
              setSearchInput(suggestion)
              setFilters({ q: suggestion })
            }}
          >
            Rechercher « {suggestion} »
          </Button>
        </div>
      )}

      {/* ---------------------------- Contenu (Table ou Cartes) ----------------------------- */}
      {isLoading ? (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-state-danger/40 bg-state-danger/5 p-10 text-center">
          <p className="font-semibold text-state-danger">Impossible de charger le répertoire</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vérifiez votre connexion puis réessayez.
          </p>
        </div>
      ) : drugs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-14 text-center">
          <FileX2 className="size-10 text-muted-foreground/60" aria-hidden />
          <p className="mt-4 text-base font-semibold text-foreground">Aucun médicament trouvé</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Essayez d&apos;élargir votre recherche, de vérifier l&apos;orthographe de la molécule ou de retirer certains filtres.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-5 gap-1.5"
            onClick={() => {
              resetFilters()
              setSearchInput('')
            }}
          >
            <RotateCcw className="size-4" aria-hidden />
            Réinitialiser les filtres
          </Button>
        </div>
      ) : layoutMode === 'cards' ? (
        /* Mode Cartes Cliniques (Idéal tactile et mobile) */
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {drugs.map((drug) => (
            <button
              key={drug.id}
              type="button"
              onClick={() => openDrug(drug.id)}
              className={cn(
                'group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
                drug.status === 'ACTIF'
                  ? 'border-t-2 border-t-state-safe/60'
                  : drug.status === 'RETRIE'
                    ? 'border-t-2 border-t-state-danger/60'
                    : 'border-t-2 border-t-state-warning/60'
              )}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                    {drug.brand}
                  </span>
                  <StatusBadge status={drug.status} className="shrink-0" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{drug.dci}</p>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {drug.dosage && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground/80">
                      {drug.dosage}
                    </span>
                  )}
                  {drug.form && (
                    <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {drug.form}
                    </span>
                  )}
                  {drug.hasBookRcp && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
                      <BookOpen className="size-2.5" />
                      RCP
                    </span>
                  )}
                  {drug.p1 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                      <ShieldAlert className="size-2.5" />
                      P1 Hôpital
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                <span className="truncate max-w-[160px] flex items-center gap-1 font-medium">
                  {isLocal(drug.country) && <span title="Fabrication algérienne" aria-hidden>🇩🇿</span>}
                  <span className="truncate">{drug.lab}</span>
                </span>
                {drug.price != null ? (
                  <span className="flex items-center gap-1">
                    <span className="font-bold text-foreground tabular-nums">{formatPrice(drug.price)}</span>
                    {drug.refundable && (
                      <span className="rounded-sm bg-chifa/15 px-1 py-0.5 text-[9px] font-bold text-chifa" title="Remboursable Chifa">
                        Chifa
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="font-mono text-[11px]">AMM: {drug.regNumber}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Mode Tableau Structuré */
        <div className="scroll-thin max-h-[64vh] overflow-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <SortHeader label="Marque" field="brand" sort={sort} onSort={handleSort} className="min-w-[130px] sm:min-w-[160px]" />
                <SortHeader label="DCI" field="dci" sort={sort} onSort={handleSort} className="hidden min-w-[180px] sm:table-cell" />
                <StaticHeader label="Forme &amp; dosage" className="min-w-0 sm:min-w-[150px]" />
                <StaticHeader label="PPA" className="min-w-[92px] text-right" />
                <SortHeader label="Laboratoire" field="lab" sort={sort} onSort={handleSort} className="hidden min-w-[180px] lg:table-cell" />
                <StaticHeader label="Domaine" className="hidden md:table-cell" />
                <StaticHeader label="Statut" className="min-w-0 sm:min-w-[120px]" />
              </tr>
            </thead>
            <tbody>
              {drugs.map((drug) => (
                <tr
                  key={drug.id}
                  onClick={() => openDrug(drug.id)}
                  className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-accent/60"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') openDrug(drug.id)
                  }}
                  aria-label={`Ouvrir la fiche de ${drug.brand}`}
                >
                  <td className="px-3 py-3">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="block font-semibold text-foreground">{drug.brand}</span>
                      {drug.hasBookRcp ? (
                        <span
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary"
                          title="RCP disponible — livre technique DzPharm"
                        >
                          <BookOpen className="size-2.5" aria-hidden />
                          RCP
                        </span>
                      ) : null}
                      {drug.price != null ? (
                        <span
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-chifa/30 bg-chifa/10 px-1.5 py-0.5 text-[9px] font-bold text-chifa"
                          title="Prix public PPA référencé en officine (DA)"
                        >
                          <Coins className="size-2.5" aria-hidden />
                          Prix PPA
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {drug.regNumber}
                      {drug.type ? ` · ${drug.type}` : ''}
                    </span>
                  </td>
                  <td className="hidden max-w-[260px] px-3 py-3 align-top sm:table-cell">
                    <span className="block truncate text-foreground/90" title={drug.dci}>
                      {drug.dci}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className="block text-foreground/90">{drug.form || '—'}</span>
                    <span className="block text-xs text-muted-foreground">
                      {drug.dosage || ''}
                      {drug.packaging ? ` · ${drug.packaging}` : ''}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right align-top">
                    {drug.price != null ? (
                      <span className="flex flex-col items-end">
                        <span className="font-semibold text-foreground tabular-nums">
                          {formatPrice(drug.price)}
                        </span>
                        {drug.refundable ? (
                          <span className="text-[10px] font-medium text-state-safe">
                            CNAS
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="hidden max-w-[220px] px-3 py-3 align-top lg:table-cell">
                    <span className="block truncate text-foreground/90" title={drug.lab}>
                      {drug.lab}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {countryCode(drug.country) ? (
                        <span className="rounded border border-border bg-muted px-1 font-mono text-[10px] font-semibold">
                          {countryCode(drug.country)}
                        </span>
                      ) : null}
                      {drug.country}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 align-top md:table-cell">
                    {drug.domain ? (
                      <span className="inline-flex max-w-[170px] items-center truncate rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {drug.domain}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <StatusBadge status={drug.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* -------------------------- Pagination -------------------------- */}
      {drugs.length > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground tabular-nums">
            Page {formatNumber(page)} sur {formatNumber(Math.max(totalPages, 1))} ·{' '}
            {formatNumber(total)} résultats
          </p>
          <div className="flex items-center gap-3">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v))
                setPage(1)
              }}
            >
              <SelectTrigger
                size="sm"
                className="h-9 w-[110px]"
                aria-label="Nombre de résultats par page"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[20, 50, 100].map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <nav aria-label="Pagination" className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-9"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Page précédente"
              >
                <ChevronLeft className="size-4" />
              </Button>
              {pagination.map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-1.5 text-sm text-muted-foreground" aria-hidden>
                    …
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === page ? 'default' : 'ghost'}
                    size="icon"
                    className={cn(
                      'size-9 text-sm tabular-nums transition-all',
                      p === page ? 'font-bold shadow-xs ring-1 ring-primary/40' : 'hover:bg-accent'
                    )}
                    onClick={() => setPage(p)}
                    aria-label={`Page ${p}`}
                    aria-current={p === page ? 'page' : undefined}
                  >
                    {p}
                  </Button>
                )
              )}
              <Button
                variant="outline"
                size="icon"
                className="size-9"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Page suivante"
              >
                <ChevronRight className="size-4" />
              </Button>
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}
