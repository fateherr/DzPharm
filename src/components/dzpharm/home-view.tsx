'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Baby,
  Ban,
  BookOpen,
  Bone,
  Brain,
  Bug,
  Building2,
  Calculator,
  Clock,
  CreditCard,
  Droplet,
  Droplets,
  Ear,
  Eye,
  Factory,
  FileCheck,
  FileText,
  FlaskConical,
  Flame,
  GitCompareArrows,
  Heart,
  HeartHandshake,
  HeartPulse,
  History,
  Layers,
  Leaf,
  Library,
  Microscope,
  Moon,
  Plane,
  Pill,
  ShieldAlert,
  ShieldPlus,
  Siren,
  Soup,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  TrendingUp,
  TriangleAlert,
  Users,
  Waves,
  Wind,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchStats } from './api'
import { computeCabinetAlerts, daysUntil } from './armoire/utils'
import type { TopViewedDrug } from './types'
import { formatNumber } from './status-badge'
import { SearchAutocomplete } from './search-autocomplete'
import { useDzPharm, type ViewId } from './store'

/* ------------------------------------------------------------------ */
/* Tendances DCI — types locaux + fetcher (réponse /top-views étendue)  */
/* ------------------------------------------------------------------ */

interface TopDciEntry {
  dci: string
  dciKey: string
  totalViews: number
  brands: string[]
}

interface TopViewedResponse {
  top: TopViewedDrug[]
  topDci?: TopDciEntry[]
}

async function fetchTopViewedFull(
  limit: number,
  signal?: AbortSignal
): Promise<TopViewedResponse> {
  const res = await fetch(`/api/drugs/top-views?limit=${limit}`, { signal })
  if (!res.ok) throw new Error(`Requête échouée (${res.status})`)
  return (await res.json()) as TopViewedResponse
}

/** Nettoie l'affichage d'une DCI brute du registre (supprime les «**»). */
function cleanDciLabel(dci: string): string {
  return dci.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
}

/* ------------------------------------------------------------------ */
/* Cartes outils                                                       */
/* ------------------------------------------------------------------ */

const TOOL_CARDS: Array<{
  icon: LucideIcon
  title: string
  desc: string
  view: ViewId
  accent: 'primary' | 'chifa' | 'danger'
}> = [
  {
    icon: Baby,
    title: 'Posologies pédiatriques',
    desc: 'Calculateur pondéral (mg/kg → mL) avec les formes locales : sirops, sachets, suppositoires.',
    view: 'outils',
    accent: 'primary',
  },
  {
    icon: CreditCard,
    title: 'Simulateur Chifa',
    desc: 'Reste à charge CNAS / ALD 100 % : tarif de référence, ticket modérateur, taux par produit.',
    view: 'outils',
    accent: 'chifa',
  },
  {
    icon: Moon,
    title: 'Adaptateur Ramadan',
    desc: 'Décalez les prises autour de l’Iftar et du Suhoor — chronopharmacologie par wilaya.',
    view: 'outils',
    accent: 'chifa',
  },
  {
    icon: GitCompareArrows,
    title: 'Comparateur',
    desc: 'Comparez 2-3 médicaments côte à côte : dosage, laboratoire, statut, équivalences.',
    view: 'outils',
    accent: 'primary',
  },
  {
    icon: Store,
    title: 'Catalogue & prix',
    desc: '1 791 produits d’officine avec PPA en DA, remboursement CNAS et parapharmacie.',
    view: 'catalogue',
    accent: 'chifa',
  },
  {
    icon: ShieldAlert,
    title: 'Contrôle d’interactions',
    desc: 'Moteur local instantané + analyse IA approfondie sur votre panier de médicaments.',
    view: 'interactions',
    accent: 'danger',
  },
  {
    icon: Users,
    title: 'Armoire familiale',
    desc: 'Un profil par membre de la famille : péremptions, produits retirés, doublons et analyse en un clic.',
    view: 'armoire',
    accent: 'primary',
  },
  {
    icon: Sparkles,
    title: 'Copilote IA',
    desc: 'Assistant clinique FR / arabe / darija, modes professionnel et patient.',
    view: 'copilote',
    accent: 'primary',
  },
  {
    icon: Droplets,
    title: 'Fonction rénale',
    desc: 'Cockcroft-Gault & MDRD : clairance, stade CKD et adaptation posologique de 10 classes critiques.',
    view: 'outils',
    accent: 'danger',
  },
  {
    icon: FileText,
    title: 'Bibliothèque RCP',
    desc: 'Résumés Caractéristiques du Produit au format ANSM : 911 fiches issues des livres + génération IA.',
    view: 'repertoire',
    accent: 'primary',
  },
  {
    icon: Library,
    title: 'Bibliothèque clinique',
    desc: '911 monographies DCI des 24 livres : mécanismes, posologies, CI, grossesse, conseils comptoir.',
    view: 'bibliotheque',
    accent: 'primary',
  },
  {
    icon: HeartPulse,
    title: 'Grossesse & allaitement',
    desc: 'Compatibilité CRAT par trimestre et allaitement — base locale croisée avec les livres techniques.',
    view: 'outils',
    accent: 'danger',
  },
]

/* ------------------------------------------------------------------ */
/* Accès rapide — cartes par mode d'usage (audit 1.3 / P10 / P14)       */
/* ------------------------------------------------------------------ */

interface QuickAccessCard {
  icon: LucideIcon
  title: string
  desc: string
  view: ViewId
  /** Lien externe direct (ex : tel:14 pour le SAMU) — sinon navigation interne. */
  href?: string
  accent: 'primary' | 'chifa' | 'danger'
}

const PRO_QUICK_ACCESS: QuickAccessCard[] = [
  {
    icon: BookOpen,
    title: 'Répertoire',
    desc: 'Rechercher un médicament par marque, DCI, laboratoire ou n° AMM.',
    view: 'repertoire',
    accent: 'primary',
  },
  {
    icon: ShieldAlert,
    title: 'Contrôle d’interactions',
    desc: 'Vérifier les associations médicamenteuses avant dispensation.',
    view: 'interactions',
    accent: 'danger',
  },
  {
    icon: Library,
    title: 'RCP & monographies',
    desc: '911 monographies DCI issues des livres techniques de pharmacologie.',
    view: 'bibliotheque',
    accent: 'primary',
  },
  {
    icon: Calculator,
    title: 'Calculs cliniques',
    desc: 'Posologies pédiatriques, fonction rénale, grossesse, Chifa, Ramadan.',
    view: 'outils',
    accent: 'chifa',
  },
  {
    icon: Sparkles,
    title: 'Copilote IA',
    desc: 'Assistant clinique en français, arabe et darija.',
    view: 'copilote',
    accent: 'primary',
  },
]

const FAMILLE_QUICK_ACCESS: QuickAccessCard[] = [
  {
    icon: Users,
    title: 'Armoire familiale',
    desc: 'Les médicaments de la maison : péremptions, alertes, contrôles.',
    view: 'armoire',
    accent: 'primary',
  },
  {
    icon: TriangleAlert,
    title: 'Pénuries & disponibilité',
    desc: 'Signalements communautaires de rupture de stock (Outils → Pénuries).',
    view: 'outils',
    accent: 'chifa',
  },
  {
    icon: Baby,
    title: 'Posologies enfant',
    desc: 'Dose en mg/kg convertie en mL selon le poids de l’enfant.',
    view: 'outils',
    accent: 'primary',
  },
  {
    icon: Siren,
    title: 'Urgences — SAMU 14',
    desc: 'Appeler immédiatement le SAMU (14) en cas d’urgence médicale.',
    view: 'accueil',
    href: 'tel:14',
    accent: 'danger',
  },
  {
    icon: Sparkles,
    title: 'Copilote IA',
    desc: 'Poser vos questions santé en français, arabe ou darija (mode patient).',
    view: 'copilote',
    accent: 'primary',
  },
]

function QuickAccessGrid({ cards }: { cards: QuickAccessCard[] }) {
  const setView = useDzPharm((s) => s.setView)
  return (
    <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 md:grid md:grid-cols-3 md:overflow-visible md:pb-0 lg:grid-cols-5">
      {cards.map((card) => {
        const accentHover =
          card.accent === 'chifa'
            ? 'hover:border-l-chifa hover:border-chifa/40 hover:shadow-chifa/10'
            : card.accent === 'danger'
              ? 'hover:border-l-state-danger hover:border-state-danger/40 hover:shadow-state-danger/10'
              : 'hover:border-l-primary hover:border-primary/40 hover:shadow-primary/10'

        const cardClass = cn(
          'group relative w-56 shrink-0 overflow-hidden rounded-xl border border-l-2 border-border/80 border-l-transparent bg-card p-4 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:w-auto',
          accentHover
        )
        const accentClass =
          card.accent === 'chifa'
            ? 'bg-chifa/10 text-chifa'
            : card.accent === 'danger'
              ? 'bg-state-danger/10 text-state-danger'
              : 'bg-primary/10 text-primary'
        const content = (
          <>
            <span
              className={cn('flex size-10 items-center justify-center rounded-xl shadow-2xs transition-transform group-hover:scale-105', accentClass)}
              aria-hidden
            >
              <card.icon className="size-5" />
            </span>
            <span className="mt-2.5 block text-sm leading-snug font-semibold text-foreground group-hover:text-primary transition-colors">
              {card.title}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              {card.desc}
            </span>
          </>
        )
        return card.href ? (
          <a key={card.title} href={card.href} className={cardClass}>
            {content}
          </a>
        ) : (
          <button key={card.title} type="button" onClick={() => setView(card.view)} className={cardClass}>
            {content}
          </button>
        )
      })}
    </div>
  )
}

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
  const pct = suffix?.includes('%') ? parseInt(suffix, 10) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="card-lift glass-card group relative overflow-hidden rounded-2xl border border-border/80 shadow-sm">
        <div
          className={cn(
            'absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-transparent to-transparent',
            accent.gradient
          )}
          aria-hidden
        />
        <CardContent className="flex flex-col justify-between p-5.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                {label}
              </p>
              <p className="mt-1.5 text-3xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-4xl">
                {formatNumber(count)}
                {suffix ? (
                  <span className={cn('ml-1.5 text-lg font-bold', accent.text)}>
                    {suffix}
                  </span>
                ) : null}
              </p>
            </div>
            <span
              className={cn(
                'flex size-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 shadow-sm',
                accent.bg
              )}
              aria-hidden
            >
              <Icon className={cn('size-5.5', accent.text)} />
            </span>
          </div>

          {/* Micro-progress bar for percentages */}
          {pct !== null && (
            <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: delay + 0.2 }}
                className={cn('h-full rounded-full', accent.text.replace('text-', 'bg-'))}
              />
            </div>
          )}

          {hint ? (
            <p className="mt-2.5 text-xs font-medium text-muted-foreground">
              {hint}
            </p>
          ) : null}
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

const DOMAIN_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Cardiologie: { bg: 'bg-rose-500/10 dark:bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400', border: 'hover:border-rose-500/40 hover:shadow-rose-500/5' },
  'Antalgiques & Anti-inflammatoires': { bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', border: 'hover:border-amber-500/40 hover:shadow-amber-500/5' },
  Oncologie: { bg: 'bg-purple-500/10 dark:bg-purple-500/15', text: 'text-purple-600 dark:text-purple-400', border: 'hover:border-purple-500/40 hover:shadow-purple-500/5' },
  'Anti-infectieux': { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', border: 'hover:border-emerald-500/40 hover:shadow-emerald-500/5' },
  'Gastro-entérologie': { bg: 'bg-orange-500/10 dark:bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400', border: 'hover:border-orange-500/40 hover:shadow-orange-500/5' },
  'Vitamines & Minéraux': { bg: 'bg-lime-500/10 dark:bg-lime-500/15', text: 'text-lime-600 dark:text-lime-400', border: 'hover:border-lime-500/40 hover:shadow-lime-500/5' },
  'Psychiatrie & Psychotropes': { bg: 'bg-indigo-500/10 dark:bg-indigo-500/15', text: 'text-indigo-600 dark:text-indigo-400', border: 'hover:border-indigo-500/40 hover:shadow-indigo-500/5' },
  'Diabétologie & Endocrinologie': { bg: 'bg-sky-500/10 dark:bg-sky-500/15', text: 'text-sky-600 dark:text-sky-400', border: 'hover:border-sky-500/40 hover:shadow-sky-500/5' },
  'Neurologie & Antiépileptiques': { bg: 'bg-violet-500/10 dark:bg-violet-500/15', text: 'text-violet-600 dark:text-violet-400', border: 'hover:border-violet-500/40 hover:shadow-violet-500/5' },
  'Pneumologie & Antiasthmatiques': { bg: 'bg-teal-500/10 dark:bg-teal-500/15', text: 'text-teal-600 dark:text-teal-400', border: 'hover:border-teal-500/40 hover:shadow-teal-500/5' },
  Antibiotiques: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', border: 'hover:border-emerald-500/40 hover:shadow-emerald-500/5' },
  ORL: { bg: 'bg-cyan-500/10 dark:bg-cyan-500/15', text: 'text-cyan-600 dark:text-cyan-400', border: 'hover:border-cyan-500/40 hover:shadow-cyan-500/5' },
  Urologie: { bg: 'bg-blue-500/10 dark:bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400', border: 'hover:border-blue-500/40 hover:shadow-blue-500/5' },
  Dermatologie: { bg: 'bg-pink-500/10 dark:bg-pink-500/15', text: 'text-pink-600 dark:text-pink-400', border: 'hover:border-pink-500/40 hover:shadow-pink-500/5' },
  Ophtalmologie: { bg: 'bg-teal-500/10 dark:bg-teal-500/15', text: 'text-teal-600 dark:text-teal-400', border: 'hover:border-teal-500/40 hover:shadow-teal-500/5' },
}

function domainStyle(domain: string) {
  return DOMAIN_STYLES[domain] ?? {
    bg: 'bg-primary/10 text-primary',
    text: 'text-primary',
    border: 'hover:border-primary/40 hover:shadow-primary/5',
  }
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
  const setView = useDzPharm((s) => s.setView)
  const audience = useDzPharm((s) => s.audience)
  const setAudience = useDzPharm((s) => s.setAudience)
  const favorites = useDzPharm((s) => s.favorites)
  const toggleFavorite = useDzPharm((s) => s.toggleFavorite)
  const recentlyViewed = useDzPharm((s) => s.recentlyViewed)
  const armoireMembers = useDzPharm((s) => s.armoireMembers)
  const armoireEntries = useDzPharm((s) => s.armoireEntries)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: ({ signal }) => fetchStats(signal),
    staleTime: 30 * 60 * 1000,
  })

  const { data: topViewed } = useQuery({
    queryKey: ['top-viewed'],
    queryFn: ({ signal }) => fetchTopViewedFull(8, signal),
    staleTime: 60 * 1000,
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
      {/* ------------- Bandeau Mode famille (audit 1.3 / P14) ------------- */}
      {audience === 'famille' ? (
        <div
          role="note"
          aria-label="Mode famille — contenus grand public"
          className="border-b border-primary/15 bg-gradient-to-r from-primary/8 via-chifa/5 to-transparent print:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-xs sm:px-6">
            <span className="flex min-w-0 items-center gap-1.5 leading-snug text-foreground">
              <HeartHandshake className="size-3.5 shrink-0 text-chifa" aria-hidden />
              <span>
                <strong className="font-semibold">Mode famille</strong> — contenus grand public.
                Pour un usage professionnel, basculez en Mode professionnel.
              </span>
            </span>
            <button
              type="button"
              onClick={() => setAudience('pro')}
              className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-background px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Stethoscope className="size-3.5" aria-hidden />
              Mode professionnel
            </button>
          </div>
        </div>
      ) : null}

      {/* ------------------------------ Hero ------------------------------ */}
      <section className="hero-glow relative overflow-hidden border-b border-border/60">
        <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-4 pt-16 pb-14 text-center sm:px-6 sm:pt-24 sm:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm">
              <Stethoscope className="size-3.5" aria-hidden />
              Nomenclature officielle — Juin 2026
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              L&apos;intelligence pharmaceutique{' '}
              <span className="bg-gradient-to-r from-sky-400 via-primary to-chifa bg-clip-text text-transparent">
                algérienne
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Le référentiel national des médicaments enrichi par l&apos;IA : recherche
              sur 9&nbsp;555 AMM, contrôle d&apos;interactions et assistant clinique.
            </p>
            <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3.5 py-1.5 shadow-sm backdrop-blur-lg">
                <BookOpen className="size-3.5 text-primary" aria-hidden />
                <span className="font-semibold text-foreground">24 livres</span> pharmacologie
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3.5 py-1.5 shadow-sm backdrop-blur-lg">
                <FileText className="size-3.5 text-primary" aria-hidden />
                <span className="font-semibold text-foreground">{stats?.monographs ? formatNumber(stats.monographs) : '911'}</span> monographies
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-chifa/30 bg-chifa/8 px-3.5 py-1.5 text-chifa shadow-sm backdrop-blur-lg">
                <Store className="size-3.5" aria-hidden />
                <span className="font-semibold">{stats?.prices?.productsTotal ? formatNumber(stats.prices.productsTotal) : '1 791'}</span> prix PPA
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3.5 py-1.5 shadow-sm backdrop-blur-lg">
                <FileCheck className="size-3.5 text-primary" aria-hidden />
                RCP ANSM officiel
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-300/40 bg-pink-500/10 px-3.5 py-1.5 text-pink-700 shadow-sm backdrop-blur-lg dark:text-pink-300">
                <HeartPulse className="size-3.5" aria-hidden />
                Grossesse CRAT
              </span>
            </div>
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
                  <kbd className="rounded-md border border-border/80 bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-2xs">
                    ⌘K
                  </kbd>
                  <kbd className="rounded-md border border-border/80 bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-2xs">
                    Entrée ⏎
                  </kbd>
                </span>
              }
            />
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-medium text-muted-foreground/80 mr-1 hidden sm:inline">Suggestions fréquentes :</span>
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => gotoDirectory({ q: chip })}
                  className="group flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-xs transition-all hover:border-primary/50 hover:bg-card hover:text-primary hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <span className="size-1.5 rounded-full bg-primary/60 group-hover:bg-primary group-hover:scale-125 transition-all" />
                  {chip}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------------- Accès rapide (P10/P14) -------------------- */}
      <section
        aria-labelledby="quick-access-title"
        className="mx-auto max-w-7xl px-4 pt-10 pb-6 sm:px-6"
      >
        <div className="mb-3.5 flex items-center justify-between gap-4">
          <h2
            id="quick-access-title"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground"
          >
            {audience === 'famille' ? (
              <HeartHandshake className="size-4.5 text-primary" aria-hidden />
            ) : (
              <Stethoscope className="size-4.5 text-primary" aria-hidden />
            )}
            Accès rapide
          </h2>
          <span className="hidden text-xs text-muted-foreground sm:block">
            {audience === 'famille'
              ? 'Sélection adaptée au mode famille'
              : 'Sélection adaptée au mode professionnel'}
          </span>
        </div>
        <QuickAccessGrid cards={audience === 'famille' ? FAMILLE_QUICK_ACCESS : PRO_QUICK_ACCESS} />
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

      {/* ------------------------ Récemment consultés -------------------- */}
      {recentlyViewed.length > 0 ? (
        <section
          aria-labelledby="recent-title"
          className="mx-auto max-w-7xl px-4 pb-8 sm:px-6"
        >
          <div className="mb-3.5 flex items-center justify-between gap-4">
            <h2 id="recent-title" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
              <History className="size-4.5 text-primary" aria-hidden />
              Consultés récemment
            </h2>
          </div>
          <div className="scroll-thin -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {recentlyViewed.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openDrug(item.id)}
                title={`Ouvrir la fiche ${item.brand}`}
                className="group flex shrink-0 items-center gap-2.5 rounded-xl border border-l-2 border-border/80 border-l-primary/35 bg-card py-2 pr-3 pl-3 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Clock className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary" aria-hidden />
                <span className="min-w-0 text-left">
                  <span className="block max-w-44 truncate text-sm font-semibold text-foreground">
                    {item.brand}
                  </span>
                  <span className="block max-w-44 truncate text-[11px] text-muted-foreground">
                    {cleanDciLabel(item.dci)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* --------------------------- Armoire familiale ------------------- */}
      {armoireMembers.length > 0 ? (
        <section
          aria-labelledby="armoire-home-title"
          className="mx-auto max-w-7xl px-4 pb-8 pt-2 sm:px-6"
        >
          <div className="mb-3.5 flex items-center justify-between gap-4">
            <h2
              id="armoire-home-title"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground"
            >
              <Users className="size-4.5 text-primary" aria-hidden />
              Votre armoire
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
                {armoireMembers.length}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => setView('armoire')}
              className="text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Gérer l’armoire
            </button>
          </div>
          {/* Plan 3.4.16 — widget « X expirent ce mois-ci » */}
          <div className="scroll-thin -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {armoireMembers.map((p) => {
              const memberEntries = armoireEntries.filter((e) => e.memberIds.includes(p.id))
              const alerts = computeCabinetAlerts(memberEntries)
              const expiringThisMonth = memberEntries.filter((e) => {
                const d = daysUntil(e.expiry)
                return d != null && d >= 0 && d <= 31
              }).length
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setView('armoire')}
                  className="group flex shrink-0 items-center gap-2.5 rounded-xl border border-primary/25 bg-primary/5 py-2 pr-4 pl-3 transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="flex relative size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {p.name.trim().slice(0, 2).toUpperCase()}
                    {alerts.length > 0 ? (
                      <span
                        className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-state-danger text-[9px] font-bold text-white"
                        aria-label={`${alerts.length} alerte(s)`}
                      >
                        {alerts.length}
                      </span>
                    ) : null}
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block max-w-36 truncate text-sm font-semibold text-foreground">
                      {p.name}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {memberEntries.length} médicament{memberEntries.length > 1 ? 's' : ''}
                      {expiringThisMonth > 0
                        ? ` · ${expiringThisMonth} expire${expiringThisMonth > 1 ? 'nt' : ''} ce mois`
                        : alerts.length > 0
                          ? ` · ${alerts.length} alerte${alerts.length > 1 ? 's' : ''}`
                          : ''}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* --------------------------- Favoris ----------------------------- */}
      {favorites.length > 0 ? (
        <section
          aria-labelledby="favoris-title"
          className="mx-auto max-w-7xl px-4 pb-8 pt-2 sm:px-6"
        >
          <div className="mb-3.5 flex items-center justify-between gap-4">
            <h2 id="favoris-title" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
              <Star className="size-4.5 fill-chifa text-chifa" aria-hidden />
              Mes favoris
              <span className="rounded-full bg-chifa/10 px-2 py-0.5 text-xs font-semibold text-chifa tabular-nums">
                {favorites.length}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => toggleFavorite(favorites[favorites.length - 1])}
              className="text-xs text-muted-foreground transition-colors hover:text-state-danger focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Retirer le dernier
            </button>
          </div>
          <div className="scroll-thin -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="group relative flex shrink-0 items-center gap-2.5 rounded-xl border border-chifa/40 bg-chifa/8 py-2 pr-8 pl-3 shadow-2xs transition-all hover:border-chifa/60 hover:shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => openDrug(fav.id)}
                  className="min-w-0 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  title={`Ouvrir la fiche ${fav.brand}`}
                >
                  <span className="block max-w-44 truncate text-sm font-semibold text-foreground">
                    {fav.brand}
                  </span>
                  <span className="block max-w-44 truncate text-[11px] text-muted-foreground">
                    {cleanDciLabel(fav.dci)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleFavorite(fav)}
                  aria-label={`Retirer ${fav.brand} des favoris`}
                  className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-state-danger/10 hover:text-state-danger focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ------------------------ Les plus consultés --------------------- */}
      {topViewed && topViewed.top.length > 0 ? (
        <section
          aria-labelledby="top-title"
          className="mx-auto max-w-7xl px-4 pb-8 sm:px-6"
        >
          <div className="mb-3.5 flex items-center justify-between gap-4">
            <h2 id="top-title" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
              <Flame className="size-4.5 text-chifa" aria-hidden />
              Les plus consultés
            </h2>
            <span className="text-xs text-muted-foreground">
              Classement DzPharm — consultations cumulées
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {topViewed.top.slice(0, 8).map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openDrug(item.id)}
                title={`Ouvrir la fiche ${item.brand} — ${formatNumber(item.views)} consultations`}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span
                  className="absolute -top-1 -left-1 flex size-7 items-center justify-center rounded-br-xl bg-gradient-to-br from-primary/30 to-chifa/30 text-xs font-bold text-primary tabular-nums shadow-2xs"
                  aria-hidden
                >
                  {i + 1}
                </span>
                {item.hasBookRcp ? (
                  <BookOpen
                    className="absolute top-2 right-2 size-3.5 text-primary/50 transition-colors group-hover:text-primary"
                    aria-label="RCP livre disponible"
                  />
                ) : null}
                <p className="mt-2 truncate pr-5 text-sm font-semibold text-foreground">
                  {item.brand}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">{cleanDciLabel(item.dci)}</p>
                <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-chifa tabular-nums">
                  <Eye className="size-3" aria-hidden />
                  {formatNumber(item.views)} consultations
                </p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* ------------------- DCI les plus recherchées -------------------- */}
      {topViewed?.topDci && topViewed.topDci.length > 0 ? (
        <section
          aria-labelledby="top-dci-title"
          className="mx-auto max-w-7xl px-4 pb-8 sm:px-6"
        >
          <div className="mb-3.5 flex items-center justify-between gap-4">
            <h2
              id="top-dci-title"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground"
            >
              <TrendingUp className="size-4.5 text-primary" aria-hidden />
              DCI les plus recherchées
            </h2>
            <span className="hidden text-xs text-muted-foreground sm:block">
              Classement par principe actif — consultations cumulées
            </span>
          </div>
          {/* Défilement horizontal sur mobile, grille sur desktop */}
          <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
            {topViewed.topDci.map((entry, i) => (
              <button
                key={entry.dciKey}
                type="button"
                onClick={() => gotoDirectory({ q: entry.dci })}
                title={`Rechercher ${cleanDciLabel(entry.dci)} dans le répertoire`}
                className="group flex shrink-0 items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:w-auto"
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-chifa/30 text-xs font-bold text-primary tabular-nums shadow-2xs"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block max-w-56 truncate text-sm font-semibold text-foreground">
                    {cleanDciLabel(entry.dci)}
                  </span>
                  {entry.brands.length > 0 ? (
                    <span className="block max-w-56 truncate text-[11px] text-muted-foreground">
                      {entry.brands.join(' · ')}
                    </span>
                  ) : null}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="flex items-center gap-1 text-[11px] font-medium text-chifa tabular-nums">
                    <Eye className="size-3" aria-hidden />
                    {formatNumber(entry.totalViews)}
                  </span>
                  <TrendingUp
                    className="size-3.5 text-state-safe transition-transform group-hover:scale-110"
                    aria-hidden
                  />
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* --------------------------- Outils ------------------------------ */}
      <section
        aria-labelledby="outils-title"
        className="mx-auto max-w-7xl px-4 pb-10 sm:px-6"
      >
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="outils-title" className="section-heading-accent text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Tous les outils
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Aides à la dispensation adaptées aux spécificités algériennes
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOL_CARDS.map((tool, i) => (
            <motion.button
              key={tool.title}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              onClick={() => setView(tool.view)}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/8 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span
                className={cn(
                  'absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent',
                  tool.accent === 'chifa'
                    ? 'via-chifa/70'
                    : tool.accent === 'danger'
                      ? 'via-state-danger/70'
                      : 'via-primary/70'
                )}
                aria-hidden
              />
              <span
                className={cn(
                  'flex size-10 items-center justify-center rounded-xl shadow-xs transition-transform group-hover:scale-110',
                  tool.accent === 'chifa'
                    ? 'bg-chifa/10 text-chifa'
                    : tool.accent === 'danger'
                      ? 'bg-state-danger/10 text-state-danger'
                      : 'bg-primary/10 text-primary'
                )}
                aria-hidden
              >
                <tool.icon className="size-5" />
              </span>
              <span className="mt-3 block text-sm font-semibold text-foreground">
                {tool.title}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {tool.desc}
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* --------------------------- Domaines ----------------------------- */}
      <section
        aria-labelledby="domaines-title"
        className="mx-auto max-w-7xl px-4 pb-10 sm:px-6"
      >
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 id="domaines-title" className="section-heading-accent text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
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
              const style = domainStyle(domain.key)
              return (
                <motion.button
                  key={domain.key}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
                  onClick={() => gotoDirectory({ domain: domain.key })}
                  className={cn(
                    'card-lift glass-card group flex items-center gap-3.5 rounded-2xl border border-border/80 p-4 text-left shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                    style.border
                  )}
                >
                  <span
                    className={cn(
                      'flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-2xs',
                      style.bg
                    )}
                    aria-hidden
                  >
                    <Icon className={cn('size-5.5', style.text)} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="line-clamp-2 text-sm leading-snug font-bold text-foreground group-hover:text-primary transition-colors"
                      title={domain.key}
                    >
                      {domain.key}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-muted-foreground tabular-nums">
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
          <Card className="card-lift glass-card border border-border/80 shadow-xs">
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
                      <span className="block h-full rounded-full bg-gradient-to-r from-primary/70 via-primary to-chifa/70 transition-all"
                          style={{ width: `${Math.max(4, (dci.count / maxDci) * 100)}%` }}
                        />
                      </span>
                    </button>
                  ))}
            </CardContent>
          </Card>

          {/* Laboratoires */}
          <Card className="card-lift glass-card border border-border/80 shadow-xs">
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
