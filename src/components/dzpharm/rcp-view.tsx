'use client'

import { createPortal } from 'react-dom'
import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  Baby,
  Ban,
  BookOpen,
  Bot,
  Car,
  Check,
  CheckCircle2,
  Copy,
  Database,
  FileText,
  HeartPulse,
  Loader2,
  PhoneCall,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
  ZapOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchRcp } from './api'
import type { Rcp, RcpSafety, RcpSection } from './types'
import { StatusBadge } from './status-badge'

/* ------------------------------------------------------------------ */
/* Métadonnées de source                                               */
/* ------------------------------------------------------------------ */

const SOURCE_META = {
  BOOK: {
    icon: BookOpen,
    label: 'Livre technique officiel',
    className: 'border-primary/30 bg-primary/10 text-primary',
  },
  AI: {
    icon: Bot,
    label: 'Généré par IA clinique',
    className: 'border-chifa/40 bg-chifa/10 text-chifa',
  },
  REGISTRY: {
    icon: Database,
    label: 'Registre seul',
    className: 'border-border bg-muted text-muted-foreground',
  },
} as const

/** Sections affichées en gras "critique" (RCP ANSM). */
const CRITICAL_SECTIONS = new Set(['4.3', '4.4', '4.5', '4.6', '4.9'])

/* ------------------------------------------------------------------ */
/* Keyword Highlighter                                                 */
/* ------------------------------------------------------------------ */

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <>{text}</>
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="rounded bg-primary/25 px-1 py-0.5 font-bold text-primary underline decoration-primary/50"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Safety Badges Bar                                                   */
/* ------------------------------------------------------------------ */

function RcpSafetyBar({
  safety,
  drugId,
}: {
  safety?: RcpSafety
  drugId: number
}) {
  if (!safety) return null

  // 1. Grossesse (CRAT)
  const preg = safety.pregnancy ?? 'PRECAUTION'
  let pregConfig = {
    label: 'Grossesse : Données prudentes',
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    icon: AlertCircle,
  }
  if (preg === 'AUTORISE') {
    pregConfig = {
      label: 'Grossesse : Utilisable (CRAT)',
      badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      icon: CheckCircle2,
    }
  } else if (preg === 'PRECAUTION') {
    pregConfig = {
      label: 'Grossesse : Précautions d’emploi',
      badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      icon: AlertTriangle,
    }
  } else if (preg === 'DECONSEILLE') {
    pregConfig = {
      label: 'Grossesse : Déconseillé',
      badgeClass: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
      icon: AlertTriangle,
    }
  } else if (preg === 'CONTRE-INDIQUE') {
    pregConfig = {
      label: 'Grossesse : Contre-indiqué',
      badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold',
      icon: ShieldAlert,
    }
  }

  // 2. Allaitement
  const bf = safety.breastfeeding
  let bfConfig = {
    label: 'Allaitement : À évaluer',
    badgeClass: 'border-border bg-muted text-muted-foreground',
    icon: Baby,
  }
  if (bf === 'COMPATIBLE') {
    bfConfig = {
      label: 'Allaitement : Compatible',
      badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      icon: Baby,
    }
  } else if (bf === 'SURVEILLANCE') {
    bfConfig = {
      label: 'Allaitement : Surveillance requise',
      badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      icon: Baby,
    }
  } else if (bf === 'A_EVITER') {
    bfConfig = {
      label: 'Allaitement : À éviter / suspendre',
      badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
      icon: ShieldAlert,
    }
  }

  // 3. Conduite
  const driving = safety.driving ?? 0
  let driveConfig = {
    label: 'Conduite : Sans risque particulier (Niveau 0)',
    badgeClass: 'border-border bg-muted/60 text-muted-foreground',
    icon: Car,
  }
  if (driving === 1) {
    driveConfig = {
      label: 'Conduite : Niveau 1 (Prudence)',
      badgeClass: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
      icon: Car,
    }
  } else if (driving === 2) {
    driveConfig = {
      label: 'Conduite : Niveau 2 (Vigilance accrue)',
      badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      icon: Car,
    }
  } else if (driving >= 3) {
    driveConfig = {
      label: 'Conduite : Niveau 3 (Danger — Ne pas conduire)',
      badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold',
      icon: ShieldAlert,
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-0.5">
        Profil de Sécurité :
      </span>

      {/* Grossesse */}
      <a
        href={`#rcp-sec-${drugId}-4.6`}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-85 shadow-2xs',
          pregConfig.badgeClass
        )}
        title="Voir section 4.6 (Grossesse et allaitement)"
      >
        <pregConfig.icon className="size-3.5 shrink-0" aria-hidden />
        {pregConfig.label}
      </a>

      {/* Allaitement */}
      <a
        href={`#rcp-sec-${drugId}-4.6`}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-85 shadow-2xs',
          bfConfig.badgeClass
        )}
        title="Voir section 4.6 (Grossesse et allaitement)"
      >
        <bfConfig.icon className="size-3.5 shrink-0" aria-hidden />
        {bfConfig.label}
      </a>

      {/* Conduite */}
      <a
        href={`#rcp-sec-${drugId}-4.7`}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-85 shadow-2xs',
          driveConfig.badgeClass
        )}
        title="Voir section 4.7 (Conduite de véhicules)"
      >
        <driveConfig.icon className="size-3.5 shrink-0" aria-hidden />
        {driveConfig.label}
      </a>

      {/* Sport / Dopage */}
      {safety.doping ? (
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 shadow-2xs"
          title="Substance réglementée ou interdite en compétition selon l'Agence Mondiale Antidopage (AMA)"
        >
          <ZapOff className="size-3.5 shrink-0" aria-hidden />
          Sport : Surveillance / Dopant (AMA)
        </span>
      ) : (
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 shadow-2xs"
          title="Non répertorié sur la liste des interdictions AMA"
        >
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
          Sport : Non dopant
        </span>
      )}

      {/* Ajustement Rénal */}
      {safety.renalAlert && (
        <a
          href={`#rcp-sec-${drugId}-4.2`}
          className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 transition hover:opacity-85 shadow-2xs"
          title="Adaptation posologique requise selon le débit de filtration glomérulaire (DFG)"
        >
          <Activity className="size-3.5 shrink-0" aria-hidden />
          Adaptation DFG requise
        </a>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Executive Summary Flash Card                                        */
/* ------------------------------------------------------------------ */

function RcpExecutiveFlash({
  rcp,
}: {
  rcp: Rcp
}) {
  const [copied, setCopied] = useState(false)

  const summary = rcp.summary || null
  if (!summary) return null

  const handleCopy = () => {
    const textToCopy = `[SYNTHÈSE CLINIQUE DZPHARM - ${rcp.header.denomination} (${rcp.header.dci})]\n\n${summary}\n\n• AMM : ${rcp.header.amm}\n• Forme : ${rcp.header.forme}\n• Liste : ${rcp.header.liste}`
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary">
            ⚡
          </span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
            Synthèse Clinique Rapide (30s)
          </h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs text-primary hover:bg-primary/15"
          onClick={handleCopy}
          aria-label="Copier la synthèse clinique"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Copié !</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copier la synthèse</span>
            </>
          )}
        </Button>
      </div>
      <p className="mt-2.5 text-xs leading-relaxed font-medium text-foreground/90">
        {summary}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Viewer Principal                                                    */
/* ------------------------------------------------------------------ */

export function RcpViewer({ drugId, brand }: { drugId: number; brand: string }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedAll, setCopiedAll] = useState(false)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['rcp', drugId],
    queryFn: ({ signal }) => fetchRcp(drugId, signal),
    enabled: drugId > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const navSections = useMemo(
    () => (data ? data.sections.filter((s) => s.items.length > 0) : []),
    [data]
  )

  // Filtrage selon la recherche
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return navSections
    const q = searchQuery.toLowerCase().trim()
    return navSections.filter(
      (sec) =>
        sec.title.toLowerCase().includes(q) ||
        sec.num.toLowerCase().includes(q) ||
        sec.items.some(
          (it) =>
            it.text.toLowerCase().includes(q) ||
            (it.label && it.label.toLowerCase().includes(q))
        )
    )
  }, [navSections, searchQuery])

  const copyFullRcp = useCallback(() => {
    if (!data) return
    let text = `RÉSUMÉ DES CARACTÉRISTIQUES DU PRODUIT (RCP)\n`
    text += `Dénomination : ${data.header.denomination}\n`
    text += `DCI : ${data.header.dci}\n`
    text += `Forme & Dosage : ${data.header.forme} - ${data.header.dosage}\n`
    text += `AMM : ${data.header.amm} | Titulaire : ${data.header.titulaire}\n\n`
    if (data.summary) {
      text += `SYNTHÈSE CLINIQUE :\n${data.summary}\n\n`
    }
    for (const s of data.sections) {
      text += `[${s.num}] ${s.title}\n`
      for (const it of s.items) {
        text += `• ${it.label ? it.label + ' : ' : ''}${it.text}\n`
      }
      text += `\n`
    }
    text += `Avertissement : ${data.disclaimer}\n`

    navigator.clipboard.writeText(text).then(() => {
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    })
  }, [data])

  if (isLoading) {
    return (
      <div className="space-y-4 p-5" aria-busy="true" aria-live="polite">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {brand ? `Génération du RCP clinique de ${brand}…` : 'Génération du RCP…'}
          <span className="text-xs">(livres techniques ANSM ou IA clinique, puis mise en cache)</span>
        </p>
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="space-y-3 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="space-y-3 p-6 text-center">
        <AlertTriangle className="mx-auto size-9 text-state-warning" aria-hidden />
        <p className="text-sm font-semibold text-foreground">
          RCP temporairement indisponible
        </p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Le moteur de génération clinique n&apos;a pas répondu immédiatement. Vous pouvez relancer la génération — le résultat sera automatiquement pérennisé en base de données.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
          <RefreshCw className="size-4 mr-1.5" aria-hidden />
          Relancer la génération
        </Button>
      </div>
    )
  }

  const meta = SOURCE_META[data.source] ?? SOURCE_META.REGISTRY

  return (
    <div className="pb-8">
      {/* -------- Bandeau d'en-tête ANSM -------- */}
      <div className="border-b border-border bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] text-primary uppercase">
              <FileText className="size-3.5" aria-hidden />
              Résumé des Caractéristiques du Produit (ANSM / DCI)
            </p>
            <h2 className="mt-1.5 text-xl leading-tight font-bold tracking-tight text-foreground">
              {data.header.denomination}
            </h2>
            <p className="mt-0.5 truncate text-sm font-semibold text-muted-foreground">
              {data.header.dci}
            </p>
          </div>
          <StatusBadge status={data.header.status as 'ACTIF'} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
          <HeaderKv label="AMM" value={data.header.amm} />
          <HeaderKv label="Forme" value={data.header.forme} />
          <HeaderKv label="Titulaire" value={data.header.titulaire} />
          <HeaderKv label="Liste" value={data.header.liste} />
        </div>

        {/* Profil de Sécurité (CRAT, Conduite, Allaitement, Dopage, Rein) */}
        <RcpSafetyBar safety={data.safety} drugId={drugId} />

        <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
              meta.className
            )}
            title={data.sourceLabel}
          >
            <meta.icon className="size-3.5" aria-hidden />
            {meta.label}
          </span>
          <span className="text-[11px] text-muted-foreground truncate max-w-[280px]">
            {data.sourceLabel}
          </span>

          <span className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={copyFullRcp}
              aria-label="Copier le RCP complet"
            >
              {copiedAll ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copier RCP</span>
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Régénérer le RCP"
            >
              <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} aria-hidden />
              Régénérer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => window.print()}
              aria-label="Imprimer le RCP"
            >
              <Printer className="size-3.5" aria-hidden />
              Imprimer
            </Button>
          </span>
        </div>

        {data.source === 'AI' && (
          <p className="mt-3 flex items-start gap-1.5 rounded-md border border-chifa/30 bg-chifa/5 p-2 text-[11px] leading-relaxed text-foreground/85">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-chifa" aria-hidden />
            Synthèse enrichie par IA clinique à partir des référentiels officiels. Vérifiez toujours les points critiques (4.3, 4.5, 4.6) avant décision thérapeutique.
          </p>
        )}
      </div>

      {/* -------- Synthèse Clinique Rapide (Flash Card 30s) -------- */}
      <div className="p-5 pb-2">
        <RcpExecutiveFlash rcp={data} />
      </div>

      {/* -------- Barre de recherche in-document & navigation -------- */}
      <div className="sticky top-0 z-10 space-y-2 border-b border-border bg-background/95 p-3 backdrop-blur shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans ce RCP (ex : posologie, rénal, rash, allergie, QT, enfant...)"
              className="h-8 pl-8 pr-8 text-xs bg-muted/30 focus-visible:bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                aria-label="Effacer la recherche"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
              {filteredSections.length} section(s)
            </span>
          )}
        </div>

        {/* Pilules de navigation rapide */}
        {navSections.length > 2 && (
          <nav
            aria-label="Sections du RCP"
            className="scroll-thin flex gap-1 overflow-x-auto pt-1"
          >
            {navSections.map((s) => (
              <a
                key={s.num}
                href={`#rcp-sec-${drugId}-${s.num}`}
                className={cn(
                  'shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-colors',
                  CRITICAL_SECTIONS.has(s.num)
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20'
                    : 'border-border bg-muted/40 text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {s.num} {s.title.slice(0, 15)}...
              </a>
            ))}
          </nav>
        )}
      </div>

      {/* -------- Corps du document -------- */}
      <div className="space-y-4 p-5">
        {filteredSections.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">Aucune mention trouvée pour &quot;{searchQuery}&quot;.</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs text-primary"
            >
              Afficher toutes les sections
            </Button>
          </div>
        ) : (
          filteredSections.map((section) => (
            <RcpSectionBlock
              key={section.num}
              section={section}
              drugId={drugId}
              searchQuery={searchQuery}
            />
          ))
        )}

        {/* Mentions & Avertissement ANSM / DzPharm */}
        <div className="mt-8 rounded-xl border border-border/80 bg-muted/30 p-4">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <strong className="text-foreground/90">Avertissement légal :</strong>{' '}
            {data.disclaimer} Document généré par le moteur clinique DzPharm le{' '}
            {new Date(data.generatedAt).toLocaleString('fr-FR', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
            . Réservé aux professionnels de santé dans le cadre de leur exercice.
          </p>
        </div>
      </div>

      {typeof document !== 'undefined' ? <PrintRcp rcp={data} /> : null}
    </div>
  )
}

function HeaderKv({ label, value }: { label: string; value: string }) {
  return (
    <p className="min-w-0">
      <span className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
      <span className="block truncate font-semibold text-foreground" title={value}>
        {value || '—'}
      </span>
    </p>
  )
}

/* ------------------------------------------------------------------ */
/* Bloc de section individuel avec styles cliniques                    */
/* ------------------------------------------------------------------ */

const SECTION_STYLES: Record<
  string,
  {
    borderClass: string
    titleClass: string
    badgeClass: string
    bgClass: string
    icon?: React.ComponentType<{ className?: string }>
  }
> = {
  '4.1': {
    borderClass: 'border-l-4 border-l-sky-500',
    titleClass: 'text-sky-950 dark:text-sky-200',
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    bgClass: 'bg-sky-500/[0.02]',
  },
  '4.2': {
    borderClass: 'border-l-4 border-l-emerald-500',
    titleClass: 'text-emerald-950 dark:text-emerald-200',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    bgClass: 'bg-emerald-500/[0.02]',
  },
  '4.3': {
    borderClass: 'border-l-4 border-l-rose-500',
    titleClass: 'text-rose-950 dark:text-rose-200 font-bold',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    bgClass: 'bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 rounded-xl p-3.5',
    icon: Ban,
  },
  '4.4': {
    borderClass: 'border-l-4 border-l-amber-500',
    titleClass: 'text-amber-950 dark:text-amber-200 font-bold',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    bgClass: 'bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 rounded-xl p-3.5',
    icon: AlertTriangle,
  },
  '4.5': {
    borderClass: 'border-l-4 border-l-purple-500',
    titleClass: 'text-purple-950 dark:text-purple-200 font-bold',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
    bgClass: 'bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/20 rounded-xl p-3.5',
    icon: ArrowLeftRight,
  },
  '4.6': {
    borderClass: 'border-l-4 border-l-pink-500',
    titleClass: 'text-pink-950 dark:text-pink-200 font-bold',
    badgeClass: 'bg-pink-500/15 text-pink-700 dark:text-pink-300',
    bgClass: 'bg-pink-500/5 dark:bg-pink-950/20 border border-pink-500/20 rounded-xl p-3.5',
    icon: HeartPulse,
  },
  '4.7': {
    borderClass: 'border-l-4 border-l-slate-500',
    titleClass: 'text-foreground',
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
    bgClass: 'bg-slate-500/[0.02]',
    icon: Car,
  },
  '4.9': {
    borderClass: 'border-l-4 border-l-rose-600',
    titleClass: 'text-rose-950 dark:text-rose-200 font-bold',
    badgeClass: 'bg-rose-600/15 text-rose-700 dark:text-rose-300',
    bgClass: 'bg-rose-600/10 dark:bg-rose-950/25 border border-rose-600/30 rounded-xl p-3.5',
    icon: PhoneCall,
  },
}

function RcpSectionBlock({
  section,
  drugId,
  searchQuery,
}: {
  section: RcpSection
  drugId: number
  searchQuery: string
}) {
  const isAnnexe = /^[ABC]$/.test(section.num)
  const critical = CRITICAL_SECTIONS.has(section.num)
  const style = SECTION_STYLES[section.num]
  const Icon = style?.icon

  return (
    <section
      id={`rcp-sec-${drugId}-${section.num}`}
      className={cn(
        'scroll-mt-24 transition-all',
        style?.bgClass ? style.bgClass : 'border-b border-border/50 py-3.5 last:border-0'
      )}
      aria-labelledby={`rcp-title-${drugId}-${section.num}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3
          id={`rcp-title-${drugId}-${section.num}`}
          className={cn(
            'flex items-center gap-2 text-sm font-bold tracking-tight',
            style?.titleClass || (critical ? 'text-rose-600 dark:text-rose-400' : 'text-foreground')
          )}
        >
          {Icon && <Icon className="size-4 shrink-0 text-current" />}
          <span
            className={cn(
              'rounded-md px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums',
              style?.badgeClass || (critical ? 'bg-rose-500/15 text-rose-600' : 'bg-primary/10 text-primary'),
              isAnnexe && 'bg-chifa/15 text-chifa'
            )}
          >
            {section.num}
          </span>
          <HighlightText text={section.title} query={searchQuery} />
        </h3>
      </div>

      {/* Alerte Urgence en cas de surdosage (Section 4.9) */}
      {section.num === '4.9' && (
        <div className="mt-2.5 flex flex-wrap items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-900 dark:text-rose-200">
          <PhoneCall className="size-4 shrink-0 text-rose-600 animate-pulse" />
          <span className="font-semibold">Urgences Intoxications Algérie :</span>
          <span className="font-bold text-rose-700 dark:text-rose-300">SAMU : 14</span>
          <span>•</span>
          <span className="font-bold text-rose-700 dark:text-rose-300">
            Centre Anti-Poison Alger : 021 71 30 42 / 021 97 98 98
          </span>
        </div>
      )}

      <ul className="mt-2.5 space-y-1.5">
        {section.items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-foreground/90"
          >
            <span
              className={cn(
                'mt-[7px] size-1.5 shrink-0 rounded-full',
                critical ? 'bg-rose-500' : isAnnexe ? 'bg-chifa' : 'bg-primary/60'
              )}
              aria-hidden
            />
            <span className="min-w-0 break-words">
              {item.label ? (
                <strong className="font-semibold text-foreground">
                  <HighlightText text={item.label} query={searchQuery} /> :{' '}
                </strong>
              ) : null}
              <HighlightText text={item.text} query={searchQuery} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* RCP imprimable A4 (uniquement à l'impression papier ou PDF)          */
/* ------------------------------------------------------------------ */

function PrintRcp({ rcp }: { rcp: Rcp }) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="print-rcp fixed inset-0 z-[999] hidden bg-white text-black print:block print:overflow-visible">
      <div className="mx-auto max-w-[190mm] px-6 py-8">
        <div className="flex items-start justify-between border-b-2 border-black pb-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase">
              Résumé des Caractéristiques du Produit — DzPharm
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              {rcp.header.denomination}
            </h1>
            <p className="mt-0.5 text-sm font-semibold">{rcp.header.dci}</p>
          </div>
          <div className="text-right text-[11px]">
            <p className="font-bold">AMM : {rcp.header.amm}</p>
            <p>{rcp.sourceLabel}</p>
            <p>Édité le {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        {rcp.summary && (
          <div className="my-3 border-l-2 border-black pl-3 text-[10px] italic">
            <strong>Synthèse clinique : </strong>
            {rcp.summary}
          </div>
        )}

        <div className="mt-3 space-y-4">
          {rcp.sections.map((section) => (
            <section key={section.num} className="break-inside-avoid">
              <h2 className="border-b border-black/30 pb-0.5 text-[11px] font-bold tracking-wide uppercase">
                {section.num}. {section.title}
              </h2>
              <ul className="mt-1.5 space-y-1">
                {section.items.map((item, i) => (
                  <li key={i} className="text-[10px] leading-relaxed">
                    {item.label ? <strong>{item.label} : </strong> : null}
                    {item.text}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-6 border-t border-black/40 pt-2 text-[9px] leading-relaxed text-black/70">
          {rcp.disclaimer} Document synthétisé par DzPharm — ne remplace pas la notice officielle du laboratoire titulaire de l&apos;AMM.
        </p>
      </div>
    </div>,
    document.body
  )
}

