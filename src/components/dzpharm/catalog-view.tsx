'use client'

import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Coins,
  Download,
  FileX2,
  Loader2,
  PackageSearch,
  Pill,
  RotateCcw,
  Search,
  ShieldCheck,
  Store,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { fetchCatalog, fetchCatalogFacets } from './api'
import type { CatalogCategory, CatalogProduct, CatalogQueryParams, CatalogSort } from './types'
import { StatusBadge, formatNumber, formatPrice } from './status-badge'
import { useDzPharm } from './store'

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

const CATEGORY_OPTIONS: { value: CatalogCategory; label: string }[] = [
  { value: 'all', label: 'Tout le catalogue' },
  { value: 'drug', label: 'Médicaments (registre)' },
  { value: 'parapharma', label: 'Parapharmacie' },
]

export function CatalogView() {
  const openDrug = useDzPharm((s) => s.openDrug)
  const { toast } = useToast()

  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)
  const [klass, setKlass] = useState('')
  const [category, setCategory] = useState<CatalogCategory>('all')
  const [refundableOnly, setRefundableOnly] = useState(false)
  const [sort, setSort] = useState<CatalogSort>('name')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, klass, category, refundableOnly, sort, pageSize])

  const queryParams: CatalogQueryParams = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      class: klass || undefined,
      category,
      refundable: refundableOnly || undefined,
      sort,
      page,
      pageSize,
    }),
    [debouncedSearch, klass, category, refundableOnly, sort, page, pageSize]
  )

  const { data: facets } = useQuery({
    queryKey: ['catalog-facets'],
    queryFn: ({ signal }) => fetchCatalogFacets(signal),
    staleTime: 30 * 60 * 1000,
  })

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['catalog', queryParams],
    queryFn: ({ signal }) => fetchCatalog(queryParams, signal),
    placeholderData: keepPreviousData,
  })

  const products = data?.products ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 0
  const priceStats = data?.priceStats

  const hasActiveFilters =
    debouncedSearch || klass || category !== 'all' || refundableOnly || sort !== 'name'

  async function handleExportCsv() {
    setExporting(true)
    try {
      const res = await fetchCatalog({ ...queryParams, page: 1, pageSize: 100 })
      const headers = [
        'Produit',
        'Laboratoire',
        'PPA (DA)',
        'ID CNAS',
        'Remboursable',
        'Classe thérapeutique',
        'DCI (registre)',
        'Statut AMM',
      ]
      const rows = res.products.map((p: CatalogProduct) => [
        p.name,
        p.lab,
        p.ppa,
        p.cnasId,
        p.refundable ? 'Oui' : 'Non',
        p.class,
        p.drug?.dci ?? '',
        p.drug?.status ?? '',
      ])
      const csv = '\uFEFF' + [headers, ...rows].map((r) => r.map(csvEscape).join(';')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dzpharm-prix-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({
        title: 'Export CSV généré',
        description: `${Math.min(res.total, 100)} produits exportés (limité aux 100 premiers résultats).`,
      })
    } catch {
      toast({
        title: 'Échec de l\u2019export',
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
      {/* En-tête */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
            <span
              className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-chifa to-chifa/60 shadow-lg shadow-chifa/20"
              aria-hidden
            >
              <Store className="size-5 text-white" />
            </span>
            Catalogue &amp; Prix
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isLoading ? (
              'Chargement du catalogue…'
            ) : isError ? (
              'Erreur de chargement'
            ) : (
              <>
                <span className="font-semibold text-foreground">{formatNumber(total)}</span>{' '}
                produit{total !== 1 ? 's' : ''}
                {facets ? (
                  <>
                    {' '}
                    · <span className="font-semibold text-foreground">
                      {formatNumber(facets.linked)}
                    </span>{' '}
                    médicaments ·{' '}
                    <span className="font-semibold text-foreground">
                      {formatNumber(facets.parapharma)}
                    </span>{' '}
                    parapharmacie
                  </>
                ) : (
                  ''
                )}
                {isFetching ? ' · actualisation…' : ''}
              </>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={exporting || total === 0}
          className="gap-1.5"
        >
          {exporting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Download className="size-4" aria-hidden />
          )}
          Exporter CSV
        </Button>
      </div>

      {/* Bandeau stats prix */}
      {priceStats?.avg ? (
        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-xl border border-chifa/25 bg-chifa/5 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              <Coins className="size-3 text-chifa" aria-hidden />
              Prix moyen
            </p>
            <p className="mt-1 text-base font-bold text-foreground tabular-nums sm:text-lg">
              {formatPrice(priceStats.avg)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Prix le plus bas
            </p>
            <p className="mt-1 text-base font-bold text-state-safe tabular-nums sm:text-lg">
              {formatPrice(priceStats.min)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Prix le plus élevé
            </p>
            <p className="mt-1 text-base font-bold text-foreground tabular-nums sm:text-lg">
              {formatPrice(priceStats.max)}
            </p>
          </div>
          <div className="col-span-2 rounded-xl border border-state-safe/25 bg-state-safe/5 p-3 sm:col-span-1">
            <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              <BadgeCheck className="size-3 text-state-safe" aria-hidden />
              Remboursables CNAS
            </p>
            <p className="mt-1 text-base font-bold text-state-safe tabular-nums sm:text-lg">
              {facets
                ? `${formatNumber(facets.refundable)} / ${formatNumber(facets.total)}`
                : '—'}
            </p>
          </div>
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="mb-4 rounded-xl border border-border bg-card p-3 shadow-sm">
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
              placeholder="Rechercher un produit, un laboratoire… (ex. sirop, crème, Doliprane)"
              aria-label="Rechercher dans le catalogue"
              className="h-10 border-border bg-background pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center">
            <Select value={category} onValueChange={(v) => setCategory(v as CatalogCategory)}>
              <SelectTrigger className="h-10 w-full lg:w-[190px]" aria-label="Filtrer par catégorie">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={klass || 'all'} onValueChange={(v) => setKlass(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-10 w-full lg:w-[230px]" aria-label="Filtrer par classe">
                <SelectValue placeholder="Classe" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Toutes les classes</SelectItem>
                {(facets?.classes ?? []).map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.key} ({c.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v) => setSort(v as CatalogSort)}>
              <SelectTrigger className="h-10 w-full lg:w-[170px]" aria-label="Trier">
                <SelectValue placeholder="Tri" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Ordre alphabétique</SelectItem>
                <SelectItem value="priceAsc">Prix croissant</SelectItem>
                <SelectItem value="priceDesc">Prix décroissant</SelectItem>
              </SelectContent>
            </Select>

            <div className="col-span-2 flex h-10 items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 sm:col-span-1 lg:w-[210px]">
              <Label
                htmlFor="refundable-switch"
                className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-foreground"
              >
                <ShieldCheck className="size-4 text-state-safe" aria-hidden />
                Remboursables
              </Label>
              <Switch
                id="refundable-switch"
                checked={refundableOnly}
                onCheckedChange={setRefundableOnly}
                aria-label="Afficher uniquement les produits remboursables CNAS"
              />
            </div>

            {hasActiveFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput('')
                  setKlass('')
                  setCategory('all')
                  setRefundableOnly(false)
                  setSort('name')
                }}
                className="h-10 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-4" aria-hidden />
                Réinitialiser
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-state-danger/40 bg-state-danger/5 p-10 text-center">
          <p className="font-semibold text-state-danger">Impossible de charger le catalogue</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vérifiez votre connexion puis réessayez.
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-14 text-center">
          <PackageSearch className="size-10 text-muted-foreground/60" aria-hidden />
          <p className="mt-4 text-base font-semibold text-foreground">Aucun produit trouvé</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Essayez d&apos;élargir votre recherche ou de retirer certains filtres.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-5 gap-1.5"
            onClick={() => {
              setSearchInput('')
              setKlass('')
              setCategory('all')
              setRefundableOnly(false)
            }}
          >
            <RotateCcw className="size-4" aria-hidden />
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <>
          <div className="scroll-thin max-h-[64vh] overflow-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 min-w-[240px] bg-card px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase shadow-[0_1px_0_0_var(--border)]"
                  >
                    Produit
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 hidden min-w-[160px] bg-card px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase shadow-[0_1px_0_0_var(--border)] sm:table-cell"
                  >
                    Laboratoire
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 min-w-[110px] bg-card px-3 py-2.5 text-right text-xs font-semibold tracking-wide text-muted-foreground uppercase shadow-[0_1px_0_0_var(--border)]"
                  >
                    PPA
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 hidden min-w-[120px] bg-card px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase shadow-[0_1px_0_0_var(--border)] md:table-cell"
                  >
                    Classe
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 min-w-[100px] bg-card px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase shadow-[0_1px_0_0_var(--border)]"
                  >
                    Registre
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => p.drug && openDrug(p.drug.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && p.drug) openDrug(p.drug.id)
                    }}
                    tabIndex={p.drug ? 0 : -1}
                    aria-label={
                      p.drug
                        ? `Ouvrir la fiche de ${p.name}`
                        : `${p.name} — produit de parapharmacie`
                    }
                    className={cn(
                      'border-b border-border/50 transition-colors last:border-0',
                      p.drug
                        ? 'cursor-pointer hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none'
                        : 'opacity-90'
                    )}
                  >
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className="block font-semibold break-words text-foreground">
                          {p.name}
                        </span>
                        {p.refundable ? (
                          <span
                            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-state-safe/25 bg-state-safe/10 px-1.5 py-0.5 text-[9px] font-bold text-state-safe"
                            title={`Remboursable CNAS (ID ${p.cnasId})`}
                          >
                            <BadgeCheck className="size-2.5" aria-hidden />
                            CNAS
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {p.drug?.dci
                          ? `DCI : ${p.drug.dci}`
                          : p.drug
                            ? 'Rattaché au registre national'
                            : 'Parapharmacie / accessoire'}
                      </span>
                    </td>
                    <td className="hidden max-w-[200px] px-3 py-3 align-top sm:table-cell">
                      <span className="block truncate text-foreground/90" title={p.lab ?? undefined}>
                        {p.lab || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right align-top">
                      {p.ppa !== null ? (
                        <span className="font-bold text-foreground tabular-nums">
                          {formatPrice(p.ppa)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="hidden px-3 py-3 align-top md:table-cell">
                      {p.class ? (
                        <span className="inline-flex max-w-[180px] items-center truncate rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                          {p.class}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {p.drug ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Pill className="size-3.5 shrink-0 text-primary" aria-hidden />
                          <StatusBadge status={p.drug.status as never} />
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Hors registre</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-muted-foreground tabular-nums">
              Page {formatNumber(page)} sur {formatNumber(Math.max(totalPages, 1))} ·{' '}
              {formatNumber(total)} produits
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
                  aria-label="Nombre de produits par page"
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
                    <span
                      key={`ellipsis-${i}`}
                      className="px-1.5 text-sm text-muted-foreground"
                      aria-hidden
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'ghost'}
                      size="icon"
                      className={cn('size-9 text-sm tabular-nums', p === page && 'font-semibold')}
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
        </>
      )}

      <p className="mt-6 rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
        Prix Public Algérien (PPA) issus de la liste officine fournie — dernière mise à jour du
        tarif :{' '}
        <span className="font-semibold text-foreground">27 août 2026</span>. Les prix peuvent
        varier selon les points de vente ; la mention CNAS indique un identifiant de remboursement
        (taux selon la carte Chifa : 80 % standard, 100 % ALD). Les produits « hors registre »
        (parapharmacie, dispositifs, accessoires) ne possèdent pas d&apos;AMM dans la
        nomenclature nationale.
      </p>
    </div>
  )
}
