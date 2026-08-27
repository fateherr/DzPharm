'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Baby,
  Ban,
  Bone,
  Brain,
  Bug,
  Building2,
  Droplet,
  Ear,
  Eye,
  Factory,
  FlaskConical,
  Heart,
  Layers,
  Leaf,
  Microscope,
  Plane,
  Pill,
  ShieldPlus,
  Soup,
  Stethoscope,
  TrendingUp,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchStats } from './api'
import { formatNumber } from './status-badge'
import { SearchAutocomplete } from './search-autocomplete'
import { useDzPharm } from './store'

/* ------------------------------------------------------------------ */
/* Compteur animé                                                      */
/* ------------------------------------------------------------------ */

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target <= 0) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

interface KpiAccent {
  text: string
  bg: string
  gradient: string
}

const KPI_ACCENTS: Record<string, KpiAccent> = {
  safe: { text: 'text-state-safe', bg: 'bg-state-safe/10', gradient: 'via-state-safe/60' },
  primary: { text: 'text-primary', bg: 'bg-primary/10', gradient: 'via-primary/60' },
  chifa: { text: 'text-chifa', bg: 'bg-chifa/10', gradient: 'via-chifa/60' },
  danger: { text: 'text-state-danger', bg: 'bg-state-danger/10', gradient: 'via-state-danger/60' },
}

function KpiCard({
  icon: Icon,
  label,
  value,
  suffix,
  hint,
  accentKey,
  delay,
}: {
  icon: LucideIcon
  label: string
  value: number
  suffix?: string
  hint?: string
  accentKey: keyof typeof KPI_ACCENTS
  delay: number
}) {
  const count = useCountUp(value)
  const accent = KPI_ACCENTS[accentKey]
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="group relative overflow-hidden transition-colors hover:border-primary/40">
        <div
          className={cn(
            'absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent',
            accent.gradient
          )}
          aria-hidden
        />
        <CardContent className="flex items-start justify-between gap-3 p-5">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {label}
            </p>
            <p className="mt-1.5 text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {formatNumber(count)}
              {suffix ? <span className={cn('ml-1 text-lg font-semibold', accent.text)}>{suffix}</span> : null}
            </p>
            {hint ? <p className="mt-1 text-xs leading-snug text-muted-foreground">{hint}</p> : null}
          </div>
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
              accent.bg
            )}
            aria-hidden
          >
            <Icon className={cn('size-5', accent.text)} />
          </span>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Icônes par domaine thérapeutique                                    */
/* ------------------------------------------------------------------ */

const DOMAIN_ICONS: Record<string, LucideIcon> = {
  Cardiologie: Heart,
  'Antalgiques & Anti-inflammatoires': Pill,
  Oncologie: FlaskConical,
  'Anti-infectieux': ShieldPlus,
  'Gastro-entérologie': Soup,
  'Vitamines & Minéraux': Leaf,
  'Psychiatrie & Psychotropes': Brain,
  'Diabétologie & Endocrinologie': Droplet,
  'Neurologie & Antiépileptiques': Zap,
  'Pneumologie & Antiasthmatiques': Wind,
  Antibiotiques: Bug,
  ORL: Ear,
  Urologie: Waves,
  Dermatologie: Layers,
  Ophtalmologie: Eye,
  'Antifongiques & Antiparasitaires': Microscope,
  'Gynécologie & Obstétrique': Baby,
  Rhumatologie: Bone,
}

function domainIcon(domain: string): LucideIcon {
  return DOMAIN_ICONS[domain] ?? Stethoscope
}

/* ------------------------------------------------------------------ */
/* Vue Accueil                                                         */
/* ------------------------------------------------------------------ */

const QUICK_CHIPS = [
  'Paracétamol',
  'Amoxicilline',
  'Metformine',
  'Amlodipine',
  'Cétirizine',
  'Oméprazole',
]

export function HomeView() {
  const gotoDirectory = useDzPharm((s) => s.gotoDirectory)
  const openDrug = useDzPharm((s) => s.openDrug)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: ({ signal }) => fetchStats(signal),
    staleTime: 30 * 60 * 1000,
  })

  // Cmd/Ctrl + K pour focus la recherche
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const localPct = stats && stats.actifs > 0 ? Math.round((stats.local / stats.actifs) * 100) : 0
  const domains = stats?.domains.slice(0, 12) ?? []
  const topDci = stats?.topDci.slice(0, 8) ?? []
  const topLabs = stats?.topLabs.slice(0, 8) ?? []
  const maxDci = topDci.length > 0 ? topDci[0].count : 1

  return (
    <div>
      {/* ------------------------------ Hero ------------------------------ */}
      <section className="hero-glow relative overflow-hidden border-b border-border/60">
        <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-4 pt-16 pb-14 text-center sm:px-6 sm:pt-24 sm:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Stethoscope className="size-3.5" aria-hidden />
              Nomenclature officielle — Juin 2026
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              L&apos;intelligence pharmaceutique{' '}
              <span className="bg-gradient-to-r from-primary to-chifa bg-clip-text text-transparent">
                algérienne
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Le référentiel national des médicaments enrichi par l&apos;IA : recherche
              sur 9&nbsp;555 AMM, contrôle d&apos;interactions et assistant clinique.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-8"
          >
            <SearchAutocomplete
              size="hero"
              autoFocus={false}
              inputRef={searchInputRef}
              id="hero-search"
              onSelect={(drug) => openDrug(drug.id)}
              onSubmitQuery={(q) => gotoDirectory({ q })}
              rightHint={
                <span className="hidden shrink-0 items-center gap-1.5 sm:flex" aria-hidden>
                  <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Cmd K
                  </kbd>
                  <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Entrée ⏎
                  </kbd>
                </span>
              }
            />
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => gotoDirectory({ q: chip })}
                  className="rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {chip}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------ KPI ------------------------------- */}
      <section aria-label="Indicateurs clés" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {isLoading || !stats ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={Heart}
              label="Médicaments actifs"
              value={stats.actifs}
              hint="AMM en cours de validité"
              accentKey="safe"
              delay={0}
            />
            <KpiCard
              icon={Factory}
              label="Production locale"
              value={stats.local}
              suffix={`${localPct}%`}
              hint="Part des actifs fabriqués en Algérie"
              accentKey="primary"
              delay={0.08}
            />
            <KpiCard
              icon={Plane}
              label="Importations"
              value={stats.imported}
              hint="Actifs importés"
              accentKey="chifa"
              delay={0.16}
            />
            <KpiCard
              icon={Ban}
              label="Retirés du marché"
              value={stats.retires}
              hint="Historique des retraits"
              accentKey="danger"
              delay={0.24}
            />
          </div>
        )}
      </section>

      {/* --------------------------- Domaines ----------------------------- */}
      <section
        aria-labelledby="domaines-title"
        className="mx-auto max-w-7xl px-4 pb-10 sm:px-6"
      >
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 id="domaines-title" className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Domaines thérapeutiques
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Explorez le répertoire par spécialité médicale
            </p>
          </div>
        </div>
        {isLoading || !stats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {domains.map((domain, i) => {
              const Icon = domainIcon(domain.key)
              return (
                <motion.button
                  key={domain.key}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
                  onClick={() => gotoDirectory({ domain: domain.key })}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15"
                    aria-hidden
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className="line-clamp-2 text-sm leading-snug font-semibold text-foreground"
                      title={domain.key}
                    >
                      {domain.key}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatNumber(domain.count)} références
                    </span>
                  </span>
                </motion.button>
              )
            })}
          </div>
        )}
      </section>

      {/* ------------------- DCI & Laboratoires --------------------------- */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* DCI */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Pill className="size-4 text-primary" aria-hidden />
                DCI les plus prescrites
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {isLoading || !stats
                ? Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))
                : topDci.map((dci, i) => (
                    <button
                      key={dci.key}
                      type="button"
                      onClick={() => gotoDirectory({ q: dci.key })}
                      className="group block w-full text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span className="mb-1 flex items-baseline justify-between gap-3">
                        <span
                          className="truncate text-sm font-medium text-foreground group-hover:text-primary"
                          title={dci.key}
                        >
                          {i + 1}. {dci.key}
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                          {formatNumber(dci.count)}
                        </span>
                      </span>
                      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all"
                          style={{ width: `${Math.max(4, (dci.count / maxDci) * 100)}%` }}
                        />
                      </span>
                    </button>
                  ))}
            </CardContent>
          </Card>

          {/* Laboratoires */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-4 text-chifa" aria-hidden />
                Laboratoires leaders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {isLoading || !stats
                ? Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))
                : topLabs.map((lab, i) => (
                    <button
                      key={lab.key}
                      type="button"
                      onClick={() => gotoDirectory({ lab: lab.key })}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      title={`Rechercher ${lab.key}`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-chifa/10 text-[10px] font-bold text-chifa tabular-nums">
                          {i + 1}
                        </span>
                        <span className="truncate text-sm font-medium text-foreground">
                          {lab.key}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground tabular-nums">
                        <TrendingUp className="size-3 text-state-safe" aria-hidden />
                        {formatNumber(lab.count)}
                      </span>
                    </button>
                  ))}
            </CardContent>
          </Card>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Source des données : Nomenclature nationale des produits pharmaceutiques —
          Ministère de l&apos;Industrie Pharmaceutique (Juin 2026).
        </p>
      </section>
    </div>
  )
}
