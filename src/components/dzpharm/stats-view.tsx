'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  Ban,
  BarChart3,
  BookOpen,
  Building2,
  CircleDollarSign,
  Factory,
  PackageCheck,
  PieChart as PieChartIcon,
  Pill,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchStats } from './api'
import { formatNumber } from './status-badge'

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
      hint: 'Fiches DCI issues des 17 livres techniques',
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

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Analyses générées à partir de la nomenclature du Juin 2026 — les décomptes
        couvrent l&apos;ensemble des 9&nbsp;555 enregistrements.
      </p>
    </div>
  )
}
