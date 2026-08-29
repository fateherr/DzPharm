'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  BadgeCheck,
  Ban,
  BarChart3,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Coins,
  Factory,
  History,
  PackageCheck,
  PieChart as PieChartIcon,
  Pill,
  Search,
  Sparkles,
  Store,
  Tags,
  Trophy,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchStats } from './api'
import { formatNumber, formatPrice, formatDate } from './status-badge'
import { useDzPharm } from './store'

/* ------------------------------------------------------------------ */
/* Tooltip personnalisé                                                */
/* ------------------------------------------------------------------ */

interface TipPayloadItem {
  name?: string | number
  value?: string | number
  payload?: { name?: string; count?: number }
}

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TipPayloadItem[]
  label?: string | number
}) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0]
  const name = item.payload?.name ?? (typeof item.name === 'string' ? item.name : undefined)
  const value = item.value
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-xl">
      <p className="max-w-64 truncate text-xs font-semibold text-foreground">
        {name ?? label}
      </p>
      <p className="text-sm font-bold text-primary tabular-nums">
        {formatNumber(Number(value))} référence{Number(value) !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

const axisTick = { fill: 'var(--muted-foreground)', fontSize: 11 }

function truncate(value: unknown, max = 30): string {
  const s = String(value ?? '')
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

/** Tooltip dédié aux prix (DA). */
function PriceTip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TipPayloadItem[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0]
  const p = item.payload as { name?: string; count?: number; avg?: number | null } | undefined
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-xl">
      <p className="max-w-64 truncate text-xs font-semibold text-foreground">
        {p?.name ?? String(item.name ?? '')}
      </p>
      {typeof p?.avg === 'number' && p.avg !== null ? (
        <p className="text-sm font-bold text-chifa tabular-nums">
          PPA moyen : {formatPrice(p.avg)}
          {p.count ? (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ({formatNumber(p.count)} produits)
            </span>
          ) : null}
        </p>
      ) : (
        <p className="text-sm font-bold text-primary tabular-nums">
          {formatNumber(Number(item.value))} produit{Number(item.value) !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Légende personnalisée pour les donuts                               */
/* ------------------------------------------------------------------ */

interface LegendItem {
  name: string
  value: number
  colorClass: string
}

function DonutLegend({ items }: { items: LegendItem[] }) {
  const total = items.reduce((sum, i) => sum + i.value, 0) || 1
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
      {items.map((item) => (
        <li key={item.name} className="flex items-center gap-2 text-sm">
          <span
            className={`size-2.5 shrink-0 rounded-full ${item.colorClass}`}
            aria-hidden
          />
          <span className="text-muted-foreground">{item.name}</span>
          <span className="font-semibold text-foreground tabular-nums">
            {formatNumber(item.value)}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            ({Math.round((item.value / total) * 100)}%)
          </span>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* Chronologie & insights — types locaux + fetchers                    */
/* ------------------------------------------------------------------ */

interface TimelineYear {
  year: number
  actifs: number
  nonRenouveles: number
  retires: number
  total: number
}

interface InsightItem {
  icon: string
  value: string
  label: string
  text: string
  tone: 'positive' | 'neutral' | 'warning'
}

interface TimelineResponse {
  years: TimelineYear[]
  firstYear: number
  lastYear: number
  dated: number
  totalDrugs: number
  insights: InsightItem[]
}

async function fetchTimeline(signal?: AbortSignal): Promise<TimelineResponse> {
  const res = await fetch('/api/timeline', { signal })
  if (!res.ok) throw new Error(`Requête échouée (${res.status})`)
  return (await res.json()) as TimelineResponse
}

/* ------------------------------------------------------------------ */
/* Annuaire des laboratoires — types locaux + fetchers                 */
/* ------------------------------------------------------------------ */

interface LabEntry {
  lab: string
  totalProducts: number
  actifs: number
  retraites: number
  nonRenouveles: number
  localShare: number
  countries: string[]
  topDomain: string | null
}

interface LabsResponse {
  labs: LabEntry[]
  total: number
  page: number
  totalPages: number
  topLabsQuick: Array<{ lab: string; totalProducts: number }>
  topFiltered: { lab: string; totalProducts: number } | null
}

async function fetchLabs(
  params: { q?: string; page?: number; pageSize?: number },
  signal?: AbortSignal
): Promise<LabsResponse> {
  const sp = new URLSearchParams()
  if (params.q?.trim()) sp.set('q', params.q.trim())
  if (params.page) sp.set('page', String(params.page))
  if (params.pageSize) sp.set('pageSize', String(params.pageSize))
  const qs = sp.toString()
  const res = await fetch(`/api/labs${qs ? `?${qs}` : ''}`, { signal })
  if (!res.ok) throw new Error(`Requête échouée (${res.status})`)
  return (await res.json()) as LabsResponse
}

/* ------------------------------------------------------------------ */
/* Vue Statistiques                                                    */
/* ------------------------------------------------------------------ */

export function StatsView() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: ({ signal }) => fetchStats(signal),
    staleTime: 30 * 60 * 1000,
  })

  if (isLoading || !stats) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const labsData = stats.topLabs.slice(0, 10).map((l) => ({ name: l.key, count: l.count }))
  const domainsData = stats.domains.slice(0, 12).map((d) => ({ name: d.key, count: d.count }))
  const formsData = stats.topForms.slice(0, 8).map((f) => ({ name: f.key, count: f.count }))
  const priceRangesData = (stats.prices?.ranges ?? []).map((r) => ({ name: r.label, count: r.count }))
  const priceByClassData = (stats.prices?.byClass ?? []).map((c) => ({
    name: c.key,
    count: c.count,
    avg: c.avg ?? 0,
  }))
  const originData = [
    { name: 'Production locale', value: stats.local },
    { name: 'Importations', value: stats.imported },
  ]
  const statusData = [
    { name: 'Actifs', value: stats.actifs },
    { name: 'Non renouvelés', value: stats.nonRenew },
    { name: 'Retirés', value: stats.retires },
  ]

  const localPct = stats.actifs > 0 ? Math.round((stats.local / stats.actifs) * 100) : 0

  const summaryCards = [
    {
      icon: Pill,
      label: 'Références totales',
      value: formatNumber(stats.total),
      hint: 'Toutes nomenclatures confondues',
      text: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: PackageCheck,
      label: 'Médicaments actifs',
      value: formatNumber(stats.actifs),
      hint: `${Math.round((stats.actifs / stats.total) * 100)}% du référentiel`,
      text: 'text-state-safe',
      bg: 'bg-state-safe/10',
    },
    {
      icon: Factory,
      label: 'Part de production locale',
      value: `${localPct}%`,
      hint: `${formatNumber(stats.local)} produits fabriqués en Algérie`,
      text: 'text-chifa',
      bg: 'bg-chifa/10',
    },
    {
      icon: BookOpen,
      label: 'Monographies RCP',
      value: stats.monographs ? formatNumber(stats.monographs) : '—',
      hint: 'Fiches DCI issues des 24 livres techniques',
      text: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: Ban,
      label: 'Retirés du marché',
      value: formatNumber(stats.retires),
      hint: `${formatNumber(stats.nonRenew)} enregistrements non renouvelés`,
      text: 'text-state-danger',
      bg: 'bg-state-danger/10',
    },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Statistiques</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Panorama du marché pharmaceutique algérien — nomenclature Juin 2026.
        </p>
      </div>

      {/* Cartes résumées */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {summaryCards.map((card) => (
          <Card key={card.label} className="transition-colors hover:border-primary/40">
            <CardContent className="flex items-center gap-3.5 p-4">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${card.bg}`}
                aria-hidden
              >
                <card.icon className={`size-5 ${card.text}`} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {card.label}
                </p>
                <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {card.value}
                </p>
                <p className="text-[11px] leading-snug text-muted-foreground">{card.hint}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ------------------------ Insights automatiques ------------------------ */}
      <InsightsSection />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1 — Top laboratoires */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-primary" aria-hidden />
              Top 10 laboratoires
            </CardTitle>
            <CardDescription>Nombre de références par laboratoire (tous statuts)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={labsData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 8 }}>
                <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" />
                <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={185}
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => truncate(v, 28)}
                />
                <Tooltip
                  cursor={{ fill: 'var(--muted)', fillOpacity: 0.5 }}
                  content={({ active, payload }) => (
                    <ChartTip
                      active={active}
                      payload={payload as TipPayloadItem[] | undefined}
                    />
                  )}
                />
                <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 2 — Locale vs importations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDollarSign className="size-4 text-state-safe" aria-hidden />
              Production locale vs importations
            </CardTitle>
            <CardDescription>Répartition des médicaments actifs</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={originData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  <Cell fill="var(--chart-2)" />
                  <Cell fill="var(--chart-3)" />
                </Pie>
                <Tooltip
                  content={({ active, payload }) => (
                    <ChartTip
                      active={active}
                      payload={payload as TipPayloadItem[] | undefined}
                    />
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-1">
              <DonutLegend
                items={[
                  { name: 'Production locale', value: stats.local, colorClass: 'bg-state-safe' },
                  { name: 'Importations', value: stats.imported, colorClass: 'bg-chifa' },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        {/* 3 — Domaines thérapeutiques */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-primary" aria-hidden />
              Médicaments par domaine thérapeutique
            </CardTitle>
            <CardDescription>Les 12 spécialités les mieux représentées</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={domainsData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 8 }}>
                <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" />
                <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={200}
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => truncate(v, 30)}
                />
                <Tooltip
                  cursor={{ fill: 'var(--muted)', fillOpacity: 0.5 }}
                  content={({ active, payload }) => (
                    <ChartTip
                      active={active}
                      payload={payload as TipPayloadItem[] | undefined}
                    />
                  )}
                />
                <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 4 — Statut global */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="size-4 text-state-warning" aria-hidden />
              Statut global des enregistrements
            </CardTitle>
            <CardDescription>Actifs, non renouvelés et retirés du marché</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  <Cell fill="var(--state-safe)" />
                  <Cell fill="var(--state-warning)" />
                  <Cell fill="var(--state-danger)" />
                </Pie>
                <Tooltip
                  content={({ active, payload }) => (
                    <ChartTip
                      active={active}
                      payload={payload as TipPayloadItem[] | undefined}
                    />
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-1">
              <DonutLegend
                items={[
                  { name: 'Actifs', value: stats.actifs, colorClass: 'bg-state-safe' },
                  { name: 'Non renouvelés', value: stats.nonRenew, colorClass: 'bg-state-warning' },
                  { name: 'Retirés', value: stats.retires, colorClass: 'bg-state-danger' },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        {/* 5 — Formes pharmaceutiques */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-chifa" aria-hidden />
              Top formes pharmaceutiques
            </CardTitle>
            <CardDescription>Les 8 formes galéniques les plus fréquentes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={formsData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 8 }}>
                <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" />
                <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={190}
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => truncate(v, 28)}
                />
                <Tooltip
                  cursor={{ fill: 'var(--muted)', fillOpacity: 0.5 }}
                  content={({ active, payload }) => (
                    <ChartTip
                      active={active}
                      payload={payload as TipPayloadItem[] | undefined}
                    />
                  )}
                />
                <Bar dataKey="count" fill="var(--chart-4)" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------ Catalogue & prix officine ------------------------ */}
      {stats.prices ? (
        <section aria-label="Statistiques des prix" className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground">
                <span
                  className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-chifa to-chifa/60 shadow-lg shadow-chifa/20"
                  aria-hidden
                >
                  <Store className="size-4.5 text-white" />
                </span>
                Catalogue &amp; prix officine
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Analyse des {formatNumber(stats.prices.productsTotal)} produits de la liste de prix
                (PPA — dernière mise à jour Août 2026).
              </p>
            </div>
          </div>

          {/* Bandeau indicateurs */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {[
              {
                icon: Store,
                label: 'Produits référencés',
                value: formatNumber(stats.prices.productsTotal),
                hint: 'Médicaments + parapharmacie',
                text: 'text-chifa',
                bg: 'bg-chifa/10',
              },
              {
                icon: Pill,
                label: 'Liés au registre',
                value: formatNumber(stats.prices.linked),
                hint: 'Rattachés à une AMM',
                text: 'text-primary',
                bg: 'bg-primary/10',
              },
              {
                icon: PackageCheck,
                label: 'Parapharmacie',
                value: formatNumber(stats.prices.parapharma),
                hint: 'Hors nomenclature',
                text: 'text-state-warning',
                bg: 'bg-state-warning/10',
              },
              {
                icon: BadgeCheck,
                label: 'Remboursables CNAS',
                value: formatNumber(stats.prices.refundable),
                hint: `${Math.round((stats.prices.refundable / Math.max(stats.prices.productsTotal, 1)) * 100)}% du catalogue`,
                text: 'text-state-safe',
                bg: 'bg-state-safe/10',
              },
              {
                icon: Coins,
                label: 'PPA moyen',
                value: formatPrice(stats.prices.avgPpa),
                hint: `De ${formatPrice(stats.prices.minPpa)} à ${formatPrice(stats.prices.maxPpa)}`,
                text: 'text-chifa',
                bg: 'bg-chifa/10',
              },
            ].map((card) => (
              <Card key={card.label} className="transition-colors hover:border-chifa/40">
                <CardContent className="flex items-center gap-3.5 p-4">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${card.bg}`}
                    aria-hidden
                  >
                    <card.icon className={`size-5 ${card.text}`} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {card.label}
                    </p>
                    <p className="text-xl font-bold tracking-tight text-foreground tabular-nums">
                      {card.value}
                    </p>
                    <p className="truncate text-[11px] leading-snug text-muted-foreground">
                      {card.hint}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 6 — Répartition par tranche de prix */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Coins className="size-4 text-chifa" aria-hidden />
                  Répartition des prix (PPA)
                </CardTitle>
                <CardDescription>Produits par tranche de prix public</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={priceRangesData} margin={{ left: 8, right: 16, top: 12, bottom: 8 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="name"
                      tick={axisTick}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={48} />
                    <Tooltip
                      cursor={{ fill: 'var(--muted)', fillOpacity: 0.5 }}
                      content={({ active, payload }) => (
                        <PriceTip
                          active={active}
                          payload={payload as TipPayloadItem[] | undefined}
                        />
                      )}
                    />
                    <Bar dataKey="count" fill="var(--chifa)" radius={[4, 4, 0, 0]} barSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 7 — Prix moyen par classe */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="size-4 text-primary" aria-hidden />
                  Prix moyen par classe thérapeutique
                </CardTitle>
                <CardDescription>PPA moyen — 8 classes les plus fournies</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart
                    data={priceByClassData}
                    layout="vertical"
                    margin={{ left: 8, right: 24, top: 4, bottom: 8 }}
                  >
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" />
                    <XAxis
                      type="number"
                      tick={axisTick}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${formatNumber(v)} DA`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={195}
                      tick={axisTick}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: string) => truncate(v, 28)}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--muted)', fillOpacity: 0.5 }}
                      content={({ active, payload }) => (
                        <PriceTip
                          active={active}
                          payload={payload as TipPayloadItem[] | undefined}
                        />
                      )}
                    />
                    <Bar dataKey="avg" fill="var(--chart-5)" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}

      {/* ------------------------ Retraits de marché ------------------------ */}
      <WithdrawalsSection
        actifs={stats.actifs}
        nonRenew={stats.nonRenew}
        retires={stats.retires}
        total={stats.total}
      />

      {/* ------------------------ Chronologie des enregistrements ------------------------ */}
      <TimelineSection />

      {/* ------------------------ Annuaire des laboratoires ------------------------ */}
      <LabsDirectorySection />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Analyses générées à partir de la nomenclature du Juin 2026 — les décomptes
        couvrent l&apos;ensemble des 9&nbsp;555 enregistrements.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section Retraits de marché & états d'enregistrement                 */
/* ------------------------------------------------------------------ */

interface WithdrawalRow {
  id: number
  brand: string
  dci: string | null
  lab: string | null
  withdrawDate: string | null
  withdrawReason: string | null
}

interface WithdrawalsResponse {
  total: number
  withReason: number
  recent: WithdrawalRow[]
  byReason: Array<{ reason: string; count: number }>
  byYear: Array<{ year: string; count: number }>
}

async function fetchWithdrawals(signal?: AbortSignal): Promise<WithdrawalsResponse> {
  const res = await fetch('/api/withdrawals', { signal })
  if (!res.ok) throw new Error(`Requête échouée (${res.status})`)
  return (await res.json()) as WithdrawalsResponse
}

/** Libellés courts lisibles pour les motifs de retrait (nomenclature brute en majuscules). */
const REASON_LABELS: Record<string, string> = {
  "RETRAIT PAR LE MSPRH POUR INTERDICTION D'IMPORTATION": "Interdiction d'importation (MSPRH)",
  'RETRAIT PAR LE DETENTEUR POUR MOTIF COMMERCIAL': 'Motif commercial (détenteur)',
  'PRODUIT NON COMMERCIALISE ET DECISION NON RENOUVELEE': 'Non commercialisé / non renouvelé',
  'RETRAIT PAR LE MSPRH POUR INTERDICTION DU LABORATOIRE': 'Interdiction du laboratoire (MSPRH)',
  "RETRAIT PAR LE DETENTEUR DANS LE PAYS D'ORIGINE": 'Retrait dans le pays d\u2019origine',
  'RETRAIT APRES TRANSFERT DE DETENTEUR': 'Transfert de détenteur',
  'RETRAIT PAR LE DETENTEUR POUR ARRET DE LA COOPERATION': 'Arrêt de coopération',
  'ARRET DE COMMERCIALISATION': 'Arrêt de commercialisation',
  'retrait par le laboratoire pour raisons commerciales': 'Motif commercial (laboratoire)',
  'RETRAIT PAR LE DETENTEUR POUR MOTIF DE PHARMACO-VIGILANCE (NOTE N°110 DU 17/02/2010)':
    'Pharmacovigilance (MSPRH, note 110)',
}

function reasonLabel(reason: string | null | undefined): string {
  if (!reason) return 'Motif non communiqué'
  const mapped = REASON_LABELS[reason]
  if (mapped) return mapped
  return truncate(reason.charAt(0) + reason.slice(1).toLowerCase(), 42)
}

function reasonBadgeClass(reason: string | null | undefined): string {
  if (!reason) return 'border-border bg-muted/60 text-muted-foreground'
  const r = reason.toUpperCase()
  if (r.includes('MSPRH') || r.includes('PHARMACO')) {
    return 'border-state-danger/30 bg-state-danger/10 text-state-danger'
  }
  if (r.includes('DETENTEUR') || r.includes('LABORATOIRE') || r.includes('COMMERCIAL')) {
    return 'border-state-warning/30 bg-state-warning/10 text-state-warning'
  }
  return 'border-border bg-secondary text-secondary-foreground'
}

function WithdrawalsSection({
  actifs,
  nonRenew,
  retires,
  total,
}: {
  actifs: number
  nonRenew: number
  retires: number
  total: number
}) {
  const openDrug = useDzPharm((s) => s.openDrug)
  const { data, isLoading } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: ({ signal }) => fetchWithdrawals(signal),
    staleTime: 30 * 60 * 1000,
  })

  const reasonsData = (data?.byReason ?? []).slice(0, 8).map((r) => ({
    name: reasonLabel(r.reason),
    count: r.count,
  }))
  const yearsData = (data?.byYear ?? []).map((y) => ({ name: y.year, count: y.count }))
  const reasonPct =
    data && data.total > 0 ? Math.round((data.withReason / data.total) * 1000) / 10 : 0

  // Stacked taxonomy bar (div-based, always proportional)
  const safePct = total > 0 ? (actifs / total) * 100 : 0
  const warnPct = total > 0 ? (nonRenew / total) * 100 : 0
  const dangerPct = total > 0 ? (retires / total) * 100 : 0

  return (
    <section aria-label="Retraits de marché et états d'enregistrement" className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground">
            <span
              className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-state-danger to-state-danger/60 shadow-lg shadow-state-danger/20"
              aria-hidden
            >
              <Ban className="size-4.5 text-white" />
            </span>
            Retraits de marché &amp; états d&apos;enregistrement
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Réconciliation des trois états de la nomenclature et analyse des motifs de retrait.
          </p>
        </div>
      </div>

      {/* Carte de réconciliation taxonomique */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageCheck className="size-4 text-state-safe" aria-hidden />
            Réconciliation des états d&apos;enregistrement
          </CardTitle>
          <CardDescription>
            {formatNumber(actifs)} actifs + {formatNumber(nonRenew)} non renouvelés +{' '}
            {formatNumber(retires)} retirés = {formatNumber(total)} — total nomenclature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex h-5 w-full overflow-hidden rounded-full border border-border"
            role="img"
            aria-label={`Répartition des ${formatNumber(total)} enregistrements : ${formatNumber(actifs)} actifs, ${formatNumber(nonRenew)} non renouvelés, ${formatNumber(retires)} retirés`}
          >
            <div
              className="bg-state-safe transition-all"
              style={{ width: `${safePct}%` }}
              title={`Actifs : ${formatNumber(actifs)}`}
            />
            <div
              className="bg-state-warning transition-all"
              style={{ width: `${warnPct}%` }}
              title={`Non renouvelés : ${formatNumber(nonRenew)}`}
            />
            <div
              className="bg-state-danger transition-all"
              style={{ width: `${dangerPct}%` }}
              title={`Retirés : ${formatNumber(retires)}`}
            />
          </div>
          <ul className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full bg-state-safe" aria-hidden />
              <span className="text-muted-foreground">Actifs</span>
              <span className="font-semibold text-foreground tabular-nums">
                {formatNumber(actifs)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                ({Math.round(safePct)}%)
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full bg-state-warning" aria-hidden />
              <span className="text-muted-foreground">Non renouvelés</span>
              <span className="font-semibold text-foreground tabular-nums">
                {formatNumber(nonRenew)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                ({Math.round(warnPct)}%)
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full bg-state-danger" aria-hidden />
              <span className="text-muted-foreground">Retirés</span>
              <span className="font-semibold text-foreground tabular-nums">
                {formatNumber(retires)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                ({Math.round(dangerPct)}%)
              </span>
            </li>
          </ul>
          {data ? (
            <p className="mt-4 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              Motif de retrait précisé pour{' '}
              <span className="font-semibold text-foreground tabular-nums">
                {formatNumber(data.withReason)} / {formatNumber(data.total)}
              </span>{' '}
              retraits ({reasonPct.toLocaleString('fr-FR')} %) — les autres entrées portent la
              mention « motif non communiqué ».
            </p>
          ) : null}
        </CardContent>
      </Card>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Motifs de retrait */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Tags className="size-4 text-state-danger" aria-hidden />
                Motifs de retrait
              </CardTitle>
              <CardDescription>Les 8 motifs les plus fréquents (libellés officiels synthétisés)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={reasonsData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 8 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" />
                  <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={200}
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: string) => truncate(v, 30)}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)', fillOpacity: 0.5 }}
                    content={({ active, payload }) => (
                      <ChartTip active={active} payload={payload as TipPayloadItem[] | undefined} />
                    )}
                  />
                  <Bar dataKey="count" fill="var(--state-danger)" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Retraits par année */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarX2 className="size-4 text-state-warning" aria-hidden />
                Retraits par année
              </CardTitle>
              <CardDescription>
                Années de retrait documentées (les retraits sans date précise n&apos;apparaissent pas)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={yearsData} margin={{ left: 0, right: 16, top: 12, bottom: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                  <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)', fillOpacity: 0.5 }}
                    content={({ active, payload }) => (
                      <ChartTip active={active} payload={payload as TipPayloadItem[] | undefined} />
                    )}
                  />
                  <Bar dataKey="count" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Derniers retraits */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4 text-primary" aria-hidden />
                Derniers retraits de marché
              </CardTitle>
              <CardDescription>
                Les 30 retraits les plus récents datés — cliquez sur une ligne pour ouvrir la fiche
                du médicament
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.recent.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucun retrait daté dans la nomenclature.
                </p>
              ) : (
                <div className="scroll-thin max-h-72 overflow-y-auto rounded-lg border border-border/70">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                      <tr className="border-b border-border text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        <th scope="col" className="px-3 py-2">Médicament</th>
                        <th scope="col" className="px-3 py-2">Laboratoire</th>
                        <th scope="col" className="px-3 py-2">Date</th>
                        <th scope="col" className="px-3 py-2">Motif</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((row) => (
                        <tr
                          key={row.id}
                          className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-accent"
                          onClick={() => openDrug(row.id)}
                        >
                          <td className="px-3 py-2.5">
                            <span className="block font-semibold text-foreground">{row.brand}</span>
                            {row.dci ? (
                              <span className="block truncate text-xs text-muted-foreground">
                                {row.dci}
                              </span>
                            ) : null}
                          </td>
                          <td className="max-w-40 px-3 py-2.5">
                            <span className="block truncate text-xs text-muted-foreground">
                              {row.lab || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs whitespace-nowrap text-foreground/90 tabular-nums">
                            {formatDate(row.withdrawDate)}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex max-w-52 items-center rounded-full border px-2 py-0.5 text-[10px] leading-tight font-medium whitespace-nowrap ${reasonBadgeClass(row.withdrawReason)}`}
                              title={row.withdrawReason ?? 'Motif non communiqué'}
                            >
                              {reasonLabel(row.withdrawReason)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section Insights automatiques                                       */
/* ------------------------------------------------------------------ */

const INSIGHT_ICONS: Record<string, LucideIcon> = {
  factory: Factory,
  building: Building2,
  activity: Activity,
  check: BadgeCheck,
  chart: BarChart3,
  pill: Pill,
  trophy: Trophy,
  calendar: CalendarClock,
  sparkles: Sparkles,
  trending: TrendingUp,
}

const INSIGHT_TONES: Record<InsightItem['tone'], { icon: string; value: string }> = {
  positive: { icon: 'text-state-safe bg-state-safe/10', value: 'text-state-safe' },
  neutral: { icon: 'text-primary bg-primary/10', value: 'text-foreground' },
  warning: { icon: 'text-state-warning bg-state-warning/10', value: 'text-state-warning' },
}

function InsightsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['timeline'],
    queryFn: ({ signal }) => fetchTimeline(signal),
    staleTime: 30 * 60 * 1000,
  })

  return (
    <section aria-label="Insights automatiques" className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground">
            <span
              className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20"
              aria-hidden
            >
              <Sparkles className="size-4.5 text-primary-foreground" />
            </span>
            Insights automatiques
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Chiffres clés dérivés en direct de la nomenclature — calculs automatiques, sans
            estimation.
          </p>
        </div>
      </div>

      {isLoading || !data || data.insights.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {data.insights.map((insight) => {
            const Icon = INSIGHT_ICONS[insight.icon] ?? Sparkles
            const tone = INSIGHT_TONES[insight.tone]
            const body = (
              <CardContent className="flex h-full items-start gap-3 p-4">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}
                  aria-hidden
                >
                  <Icon className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {insight.label}
                  </p>
                  <p className={`text-xl font-bold tracking-tight tabular-nums sm:text-2xl ${tone.value}`}>
                    {insight.value}
                  </p>
                  <p className="mt-0.5 line-clamp-3 text-[11px] leading-snug text-muted-foreground">
                    {insight.text}
                  </p>
                </div>
              </CardContent>
            )
            return insight.tone === 'positive' ? (
              <div
                key={insight.label}
                className="h-full rounded-xl bg-gradient-to-br from-state-safe/50 via-chifa/30 to-primary/20 p-px transition-transform hover:-translate-y-0.5"
              >
                <Card className="h-full rounded-[11px] border-0 shadow-none">{body}</Card>
              </div>
            ) : (
              <Card key={insight.label} className="h-full transition-colors hover:border-primary/40">
                {body}
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section Chronologie des enregistrements (30 ans)                    */
/* ------------------------------------------------------------------ */

type TimelineMode = 'annee' | 'cumule' | 'statut'

const TIMELINE_MODES: Array<{ id: TimelineMode; label: string }> = [
  { id: 'annee', label: 'Par année' },
  { id: 'cumule', label: 'Cumulé' },
  { id: 'statut', label: 'Par statut' },
]

const TIMELINE_STATUS_COLORS = {
  actifs: 'var(--state-safe)',
  nonRenouveles: 'var(--state-warning)',
  retires: 'var(--state-danger)',
} as const

interface TimelineTipItem {
  dataKey?: string | number
  name?: string
  value?: string | number
  color?: string
}

/** Tooltip chronologie : année + ventilation par statut + total. */
function TimelineTip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TimelineTipItem[]
  label?: string | number
}) {
  if (!active || !payload || payload.length === 0) return null
  const total = payload.reduce((sum, p) => sum + (Number(p.value) || 0), 0)
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-foreground tabular-nums">{label}</p>
      <ul className="mt-1 space-y-0.5">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center gap-2 text-xs">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: p.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ml-auto font-semibold text-foreground tabular-nums">
              {formatNumber(Number(p.value))}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1 border-t border-border pt-1 text-xs text-muted-foreground">
        Total :{' '}
        <span className="font-semibold text-foreground tabular-nums">{formatNumber(total)}</span>
      </p>
    </div>
  )
}

function TimelineSection() {
  const [mode, setMode] = useState<TimelineMode>('annee')
  const { data, isLoading } = useQuery({
    queryKey: ['timeline'],
    queryFn: ({ signal }) => fetchTimeline(signal),
    staleTime: 30 * 60 * 1000,
  })

  const chartData = useMemo(() => data?.years.map((y) => ({ ...y, name: String(y.year) })) ?? [], [data])
  const cumulativeData = useMemo(() => {
    let actifs = 0
    let nonRenouveles = 0
    let retires = 0
    return (
      data?.years.map((y) => {
        actifs += y.actifs
        nonRenouveles += y.nonRenouveles
        retires += y.retires
        return { year: y.year, name: String(y.year), actifs, nonRenouveles, retires }
      }) ?? []
    )
  }, [data])

  // Honest caption figures derived from the payload itself
  const caption = useMemo(() => {
    if (!data || data.years.length === 0) return null
    const sumTotal = data.years.reduce((s, y) => s + y.total, 0)
    const peak = data.years.reduce((best, y) => (y.total > best.total ? y : best), data.years[0])
    const before2010 = data.years
      .filter((y) => y.year < 2010)
      .reduce((s, y) => s + y.total, 0)
    const before2010Pct = sumTotal > 0 ? Math.round((before2010 / sumTotal) * 100) : 0
    const lastDecade = data.years.filter((y) => y.year > data.lastYear - 10)
    const prevDecade = data.years.filter(
      (y) => y.year > data.lastYear - 20 && y.year <= data.lastYear - 10
    )
    const lastSum = lastDecade.reduce((s, y) => s + y.total, 0)
    const prevSum = prevDecade.reduce((s, y) => s + y.total, 0)
    const growth = prevSum > 0 ? Math.round(((lastSum - prevSum) / prevSum) * 100) : null
    return {
      peak,
      before2010Pct,
      growth,
      prevDecadeRange:
        prevDecade.length > 0 ? `${prevDecade[0].year}–${prevDecade[prevDecade.length - 1].year}` : null,
      lastDecadeRange:
        lastDecade.length > 0
          ? `${lastDecade[0].year}–${lastDecade[lastDecade.length - 1].year}`
          : null,
    }
  }, [data])

  return (
    <section aria-label="Chronologie des enregistrements" className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground">
            <span
              className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-chifa to-chifa/60 shadow-lg shadow-chifa/20"
              aria-hidden
            >
              <History className="size-4.5 text-white" />
            </span>
            Chronologie des enregistrements (30 ans)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data
              ? `Enregistrements par année initiale ${data.firstYear}–${data.lastYear} — date disponible pour ${formatNumber(data.dated)} des ${formatNumber(data.totalDrugs)} produits.`
              : 'Enregistrements par année initiale (date d&apos;enregistrement)'}
          </p>
        </div>
        <div
          className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/40 p-1"
          role="group"
          aria-label="Mode d'affichage de la chronologie"
        >
          {TIMELINE_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                mode === m.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data || chartData.length === 0 ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarX2 className="size-4 text-chifa" aria-hidden />
              {mode === 'annee'
                ? 'Enregistrements par année et par statut'
                : mode === 'cumule'
                  ? 'Croissance cumulée du registre'
                  : 'Évolution annuelle par statut'}
            </CardTitle>
            <CardDescription>
              {mode === 'annee'
                ? 'Chaque barre empile les enregistrements attribués cette année-là, par statut actuel'
                : mode === 'cumule'
                  ? 'Total cumulé des enregistrements depuis la première année'
                  : 'Une ligne par statut — lecture des dynamiques annuelles'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80 lg:h-96">
              <ResponsiveContainer width="100%" height="100%">
                {mode === 'annee' ? (
                  <BarChart data={chartData} margin={{ left: 0, right: 12, top: 12, bottom: 4 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="name"
                      tick={axisTick}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={20}
                    />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
                    <Tooltip
                      cursor={{ fill: 'var(--muted)', fillOpacity: 0.5 }}
                      content={({ active, payload, label }) => (
                        <TimelineTip
                          active={active}
                          payload={payload as TimelineTipItem[] | undefined}
                          label={label}
                        />
                      )}
                    />
                    <Bar
                      dataKey="actifs"
                      stackId="t"
                      name="Actifs"
                      fill={TIMELINE_STATUS_COLORS.actifs}
                    />
                    <Bar
                      dataKey="nonRenouveles"
                      stackId="t"
                      name="Non renouvelés"
                      fill={TIMELINE_STATUS_COLORS.nonRenouveles}
                    />
                    <Bar
                      dataKey="retires"
                      stackId="t"
                      name="Retirés"
                      fill={TIMELINE_STATUS_COLORS.retires}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                ) : mode === 'cumule' ? (
                  <AreaChart data={cumulativeData} margin={{ left: 0, right: 12, top: 12, bottom: 4 }}>
                    <defs>
                      <linearGradient id="cumActifs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={TIMELINE_STATUS_COLORS.actifs} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={TIMELINE_STATUS_COLORS.actifs} stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="cumNr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={TIMELINE_STATUS_COLORS.nonRenouveles} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={TIMELINE_STATUS_COLORS.nonRenouveles} stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="cumRet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={TIMELINE_STATUS_COLORS.retires} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={TIMELINE_STATUS_COLORS.retires} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="name"
                      tick={axisTick}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={20}
                    />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={52} />
                    <Tooltip
                      content={({ active, payload, label }) => (
                        <TimelineTip
                          active={active}
                          payload={payload as TimelineTipItem[] | undefined}
                          label={label}
                        />
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="actifs"
                      stackId="1"
                      name="Actifs"
                      stroke={TIMELINE_STATUS_COLORS.actifs}
                      strokeWidth={2}
                      fill="url(#cumActifs)"
                    />
                    <Area
                      type="monotone"
                      dataKey="nonRenouveles"
                      stackId="1"
                      name="Non renouvelés"
                      stroke={TIMELINE_STATUS_COLORS.nonRenouveles}
                      strokeWidth={2}
                      fill="url(#cumNr)"
                    />
                    <Area
                      type="monotone"
                      dataKey="retires"
                      stackId="1"
                      name="Retirés"
                      stroke={TIMELINE_STATUS_COLORS.retires}
                      strokeWidth={2}
                      fill="url(#cumRet)"
                    />
                  </AreaChart>
                ) : (
                  <LineChart data={chartData} margin={{ left: 0, right: 12, top: 12, bottom: 4 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="name"
                      tick={axisTick}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={20}
                    />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
                    <Tooltip
                      cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '4 4' }}
                      content={({ active, payload, label }) => (
                        <TimelineTip
                          active={active}
                          payload={payload as TimelineTipItem[] | undefined}
                          label={label}
                        />
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey="actifs"
                      name="Actifs"
                      stroke={TIMELINE_STATUS_COLORS.actifs}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="nonRenouveles"
                      name="Non renouvelés"
                      stroke={TIMELINE_STATUS_COLORS.nonRenouveles}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="retires"
                      name="Retirés"
                      stroke={TIMELINE_STATUS_COLORS.retires}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Légende (wraps on mobile) */}
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {(
                [
                  { name: 'Actifs', color: 'bg-state-safe' },
                  { name: 'Non renouvelés', color: 'bg-state-warning' },
                  { name: 'Retirés', color: 'bg-state-danger' },
                ] as const
              ).map((item) => (
                <li key={item.name} className="flex items-center gap-2 text-sm">
                  <span className={`size-2.5 shrink-0 rounded-full ${item.color}`} aria-hidden />
                  <span className="text-muted-foreground">{item.name}</span>
                </li>
              ))}
            </ul>

            {/* Légende de lecture — chiffres honnêtes issus des données */}
            {caption ? (
              <p className="mt-4 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Lecture :</span> pic d&apos;activité
                en{' '}
                <span className="font-semibold text-foreground tabular-nums">
                  {caption.peak.year}
                </span>{' '}
                avec{' '}
                <span className="font-semibold text-foreground tabular-nums">
                  {formatNumber(caption.peak.total)}
                </span>{' '}
                enregistrements ·{' '}
                <span className="font-semibold text-foreground tabular-nums">
                  {caption.before2010Pct}&nbsp;%
                </span>{' '}
                des enregistrements datés sont antérieurs à 2010{caption.growth !== null && caption.prevDecadeRange && caption.lastDecadeRange ? (
                  <>
                    {' '}
                    · dernière décennie ({caption.lastDecadeRange}) :{' '}
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        caption.growth >= 0 ? 'text-state-safe' : 'text-state-danger'
                      )}
                    >
                      {caption.growth >= 0 ? '+' : '−'}
                      {Math.abs(caption.growth)}&nbsp;%
                    </span>{' '}
                    par rapport à {caption.prevDecadeRange}
                  </>
                ) : null}
                .
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section Annuaire des laboratoires                                   */
/* ------------------------------------------------------------------ */

function labPageList(page: number, totalPages: number): (number | '…')[] {
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

/** "FRANCE" → "France", "PAYS BAS" → "Pays Bas", "ALGERIE" → "Algérie". */
function countryLabel(country: string): string {
  if (country === 'ALGERIE') return 'Algérie'
  return country
    .toLowerCase()
    .replace(/(^|\s)\S/g, (m) => m.toUpperCase())
}

function LabsDirectorySection() {
  const gotoDirectory = useDzPharm((s) => s.gotoDirectory)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  // Recherche débouncée — repart à la page 1 quand la requête change
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['labs', debouncedSearch, page],
    queryFn: ({ signal }) =>
      fetchLabs({ q: debouncedSearch, page, pageSize: 20 }, signal),
    placeholderData: (prev) => prev,
    staleTime: 10 * 60 * 1000,
  })

  const labs = data?.labs ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const maxProducts = data?.topLabsQuick[0]?.totalProducts ?? 1
  const pagination = labPageList(page, Math.max(totalPages, 1))

  return (
    <section aria-label="Annuaire des laboratoires" className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground">
            <span
              className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-chifa to-chifa/60 shadow-lg shadow-chifa/20"
              aria-hidden
            >
              <Building2 className="size-4.5 text-white" />
            </span>
            Annuaire des laboratoires
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Détenteurs de l&apos;ensemble de la nomenclature — cliquez sur une ligne pour filtrer le
            répertoire.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          {/* Recherche + stats row */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher un laboratoire (ex. SAIDAL, BIOPHARM…) — insensible aux accents"
                aria-label="Rechercher un laboratoire"
                className="h-10 border-border bg-background pl-9"
              />
            </div>
            <p
              className="text-xs leading-snug text-muted-foreground sm:min-w-64 sm:text-right"
              aria-live="polite"
            >
              {isLoading ? (
                'Chargement de l&apos;annuaire…'
              ) : isError ? (
                'Erreur de chargement'
              ) : (
                <>
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatNumber(total)}
                  </span>{' '}
                  laboratoire{total !== 1 ? 's' : ''}
                  {data?.topFiltered ? (
                    <>
                      {' '}·{' '}
                      <span className="font-semibold text-foreground">
                        {data.topFiltered.lab}
                      </span>{' '}
                      en tête avec{' '}
                      <span className="font-semibold text-foreground tabular-nums">
                        {formatNumber(data.topFiltered.totalProducts)}
                      </span>{' '}
                      produits
                    </>
                  ) : null}
                </>
              )}
            </p>
          </div>

          {/* Table */}
          {isLoading && !data ? (
            <Skeleton className="h-96 w-full rounded-lg" />
          ) : isError ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Impossible de charger l&apos;annuaire — réessayez dans un instant.
            </p>
          ) : labs.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucun laboratoire ne correspond à «&nbsp;{debouncedSearch}&nbsp;».
            </p>
          ) : (
            <div className="scroll-thin max-h-96 overflow-y-auto rounded-lg border border-border/70">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr className="border-b border-border text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    <th scope="col" className="px-3 py-2">
                      Laboratoire
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Produits
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Actifs / Retirés
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Origine
                    </th>
                    <th scope="col" className="hidden px-3 py-2 md:table-cell">
                      Domaine principal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {labs.map((row) => (
                    <tr
                      key={row.lab}
                      className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-accent"
                      onClick={() => gotoDirectory({ lab: row.lab })}
                      title={`Voir les produits de ${row.lab} dans le répertoire — ${formatNumber(row.actifs)} actifs, ${formatNumber(row.nonRenouveles)} non renouvelés, ${formatNumber(row.retraites)} retirés`}
                    >
                      <td className="max-w-44 px-3 py-2.5">
                        <span className="block truncate font-semibold text-foreground">
                          {row.lab}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2">
                          <span className="w-10 shrink-0 text-right font-semibold text-foreground tabular-nums">
                            {formatNumber(row.totalProducts)}
                          </span>
                          <span className="hidden h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted sm:block">
                            <span
                              className="block h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
                              style={{
                                width: `${Math.max(3, (row.totalProducts / Math.max(maxProducts, 1)) * 100)}%`,
                              }}
                            />
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="font-semibold text-state-safe tabular-nums">
                          {formatNumber(row.actifs)}
                        </span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="font-semibold text-state-danger tabular-nums">
                          {formatNumber(row.retraites)}
                        </span>
                      </td>
                      <td className="max-w-40 px-3 py-2.5">
                        <span className="flex flex-wrap gap-1">
                          {row.countries.map((c) => (
                            <span
                              key={c}
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] leading-tight font-medium whitespace-nowrap ${
                                c === 'ALGERIE'
                                  ? 'border-state-safe/30 bg-state-safe/10 text-state-safe'
                                  : 'border-border bg-muted/60 text-muted-foreground'
                              }`}
                              title={
                                c === 'ALGERIE'
                                  ? `${formatNumber(row.localShare)} produits fabriqués en Algérie`
                                  : c
                              }
                            >
                              {countryLabel(c)}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="hidden max-w-40 px-3 py-2.5 md:table-cell">
                        <span className="block truncate text-xs text-muted-foreground">
                          {row.topDomain ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination compacte */}
          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
                Page {page} sur {formatNumber(totalPages)}
                {debouncedSearch ? ` — recherche « ${debouncedSearch} »` : ''}
              </p>
              <nav aria-label="Pagination annuaire des laboratoires" className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
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
                      className="px-1 text-sm text-muted-foreground"
                      aria-hidden
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'ghost'}
                      size="icon"
                      className={cn('size-8 text-sm tabular-nums', p === page && 'font-semibold')}
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
                  className="size-8"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Page suivante"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </nav>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}
