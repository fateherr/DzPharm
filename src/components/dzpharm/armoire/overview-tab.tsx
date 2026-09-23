'use client'

/**
 * Armoire — Onglet « Vue d’ensemble » (plan 3.4.6/7/14 + dashboard).
 *
 * Tableau de bord local : KPI, score d'organisation INDICATIF (jamais
 * clinique), alertes prioritaires, membres, échéancier de péremption,
 * derniers contrôles, rappels saisonniers et nouveautés.
 *
 * Aucune donnée clinique n'est inventée : seuls les champs déclarés
 * (dates, quantités, drapeaux) sont restitués ; chaque alerte renvoie
 * vers l'inventaire et l'analyse pour la décision.
 */

import { useMemo } from 'react'
import {
  Activity,
  AlertTriangle,
  Baby,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Droplets,
  HeartPulse,
  Leaf,
  Lock,
  MessageSquare,
  Plus,
  ShieldAlert,
  Snowflake,
  Sparkles,
  Sprout,
  Sun,
  UserPlus,
  Users,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  ArmoireEntry,
  ArmoireJournalEntry,
  ArmoireMember,
  ArmoireTab,
  CabinetAlert,
} from './types'
import { MAX_MEMBERS, RELATION_META, getSeasonalTips, memberColor } from './constants'
import {
  ALERT_KIND_META,
  ageLabel,
  cabinetScore,
  daysUntil,
  expiryTimeline,
  initials,
} from './utils'
import { SeverityBadge } from '../status-badge'
import type { InteractionSeverity } from '../types'
import { useDzPharm } from '../store'

export interface OverviewTabProps {
  members: ArmoireMember[]
  entries: ArmoireEntry[]
  alerts: CabinetAlert[]
  journal: ArmoireJournalEntry[]
  hasPin: boolean
  onAddEntry: () => void
  onAddMember: () => void
  onGoTab: (tab: ArmoireTab) => void
}

/* ------------------------------------------------------------------ */
/* Méta locales                                                        */
/* ------------------------------------------------------------------ */

/** Gravités d'interaction connues (journal) — badge uniquement si reconnue. */
const KNOWN_SEVERITIES: string[] = ['CONTRE-INDIQUE', 'MAJEURE', 'MODEREE', 'MINEURE']

const SEASON_ICON: Record<string, LucideIcon> = {
  Été: Sun,
  Hiver: Snowflake,
  Rentrée: Leaf,
  Printemps: Sprout,
}

/** Couleurs de l'échéancier par bucket (texte + couleur, jamais la couleur seule). */
const BUCKET_COLOR: Record<string, { badge: string; bar: string }> = {
  Périmés: {
    badge: 'border-state-danger/40 bg-state-danger/10 text-state-danger',
    bar: 'bg-state-danger',
  },
  'Sous 7 jours': {
    badge: 'border-state-danger/40 bg-state-danger/10 text-state-danger',
    bar: 'bg-state-danger',
  },
  '8–30 jours': {
    badge: 'border-state-warning/40 bg-state-warning/10 text-state-warning',
    bar: 'bg-state-warning',
  },
  '31–90 jours': {
    badge: 'border-primary/30 bg-primary/5 text-primary',
    bar: 'bg-primary/70',
  },
  'Plus de 90 jours': {
    badge: 'border-border bg-muted/60 text-muted-foreground',
    bar: 'bg-muted-foreground/40',
  },
}

/** DCI « nettoyée » : retire les marqueurs d'association «** ». */
function cleanDci(dci: string): string {
  return dci.replace(/\*\*/g, '').trim()
}

/** « il y a X j » simple (0 j → aujourd'hui). */
function relativeDays(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 86_400_000)
  if (d <= 0) return 'aujourd’hui'
  if (d === 1) return 'il y a 1 j'
  return `il y a ${d} j`
}

/* ------------------------------------------------------------------ */
/* KPI cliquable                                                       */
/* ------------------------------------------------------------------ */

function KpiCard({
  icon: Icon,
  label,
  value,
  danger,
  onClick,
  ariaLabel,
}: {
  icon: LucideIcon
  label: string
  value: number
  danger?: boolean
  onClick: () => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="group flex min-h-11 flex-col gap-1.5 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium',
            danger ? 'text-state-danger' : 'text-muted-foreground'
          )}
        >
          <Icon className={cn('size-4', danger ? 'text-state-danger' : 'text-primary')} aria-hidden />
          {label}
        </span>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary"
          aria-hidden
        />
      </span>
      <span
        className={cn(
          'text-2xl font-bold tabular-nums',
          danger ? 'text-state-danger' : 'text-foreground'
        )}
      >
        {value}
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Onglet Vue d’ensemble                                               */
/* ------------------------------------------------------------------ */

export function OverviewTab({
  members,
  entries,
  alerts,
  journal,
  hasPin,
  onAddEntry,
  onAddMember,
  onGoTab,
}: OverviewTabProps) {
  /* ------------- Dérivés (mémos locaux — aucune donnée clinique) --- */
  const entryById = useMemo(() => new Map(entries.map((e) => [e.uid, e])), [entries])
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  const score = useMemo(() => cabinetScore(entries, alerts, hasPin), [entries, alerts, hasPin])
  const scoreColor =
    score.score >= 80
      ? 'text-emerald-600'
      : score.score >= 50
        ? 'text-state-warning'
        : 'text-state-danger'

  /** Péremptions dans les 30 prochains jours (0 inclus, passés exclus). */
  const expiring30 = useMemo(
    () =>
      entries.filter((e) => {
        const d = daysUntil(e.expiry)
        return d != null && d >= 0 && d <= 30
      }).length,
    [entries]
  )

  /** Alertes par membre (uid d'entrée → membre). */
  const alertsByMember = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of alerts) {
      const entry = entryById.get(a.uid)
      if (!entry) continue
      for (const id of entry.memberIds) map.set(id, (map.get(id) ?? 0) + 1)
    }
    return map
  }, [alerts, entryById])

  /** Médicaments par membre. */
  const entriesByMember = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries) for (const id of e.memberIds) map.set(id, (map.get(id) ?? 0) + 1)
    return map
  }, [entries])

  const timeline = useMemo(() => expiryTimeline(entries), [entries])
  const maxBucket = Math.max(1, ...timeline.map((b) => b.entries.length))

  const topAlerts = useMemo(() => alerts.slice(0, 5), [alerts])

  const latestJournal = useMemo(
    () => [...journal].sort((a, b) => b.at - a.at).slice(0, 5),
    [journal]
  )

  const recentEntries = useMemo(() => {
    const now = Date.now()
    return entries
      .filter((e) => now - e.addedAt <= 7 * 86_400_000)
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(0, 5)
  }, [entries])

  const seasonal = getSeasonalTips(new Date())
  const SeasonIcon = SEASON_ICON[seasonal.season] ?? Sun

  const openTool = useDzPharm((s) => s.openTool)
  const setView = useDzPharm((s) => s.setView)
  const addToBasket = useDzPharm((s) => s.addToBasket)
  const clearBasket = useDzPharm((s) => s.clearBasket)

  const isEmpty = members.length === 0
  const showStats = members.length > 0 || entries.length > 0

  /** Hub shortcuts contextuels selon les profils des membres. */
  const hasChildren = members.some((m) => m.relation === 'enfant' || m.relation === 'bebe')
  const hasRenal = members.some((m) => m.renal)
  const hasPregnant = members.some((m) => m.pregnant || m.breastfeeding)
  const hasEntries = entries.length > 0

  /** Navigue vers Interactions en pré-remplissant le panier avec tous les médicaments du foyer. */
  function handleOpenInteractions() {
    clearBasket()
    let added = 0
    for (const e of entries) {
      if (e.drugId != null && added < 8) {
        addToBasket({ id: e.drugId, brand: e.brand, dci: e.dci, status: e.status || 'ACTIF' })
        added++
      }
    }
    setView('interactions')
  }

  return (
    <div className="space-y-6">
      {/* ---------------- En-tête d'onglet ---------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          Vue d’ensemble
        </h2>
        <Button onClick={onAddEntry} className="hidden h-11 gap-1.5 sm:inline-flex">
          <Plus className="size-4" aria-hidden />
          Médicament
        </Button>
      </div>

      {/* ---------------- État vide (première visite) ---------------- */}
      {isEmpty ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-8 text-center sm:py-10">
            <span
              className="flex size-16 items-center justify-center rounded-full bg-primary/10"
              aria-hidden
            >
              <Users className="size-8 text-primary" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Votre armoire familiale
            </h3>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
              Suivez qui prend quel médicament à la maison : péremptions, interactions du foyer
              et fiche d’urgence, le tout sur cet appareil.
            </p>
            <ol className="mt-6 w-full max-w-md space-y-3 text-left">
              <li className="flex items-start gap-3">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
                  aria-hidden
                >
                  1
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Ajoutez les membres du foyer
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Drapeaux grossesse, allaitement, allergies et fonction rénale inclus.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
                  aria-hidden
                >
                  2
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Enregistrez les médicaments présents à la maison
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recherche dans le répertoire des 9 555 AMM, ou saisie manuelle pour
                    l’OTC et la parapharmacie.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
                  aria-hidden
                >
                  3
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">Lancez l’analyse</p>
                  <p className="text-xs text-muted-foreground">
                    Interactions du foyer, contrôle grossesse/allaitement, posologies enfant.
                  </p>
                </div>
              </li>
            </ol>
            <Button onClick={onAddMember} className="mt-6 h-11 gap-2">
              <UserPlus className="size-4" aria-hidden />
              Ajouter le premier membre
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              Données 100 % locales — enregistrées uniquement sur cet appareil.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* ---------------- KPI ---------------- */}
      {showStats ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            icon={Boxes}
            label="Médicaments"
            value={entries.length}
            onClick={() => onGoTab('inventaire')}
            ariaLabel={`${entries.length} médicaments — ouvrir l’inventaire`}
          />
          <KpiCard
            icon={Users}
            label="Membres"
            value={members.length}
            onClick={() => onGoTab('reglages')}
            ariaLabel={`${members.length} membres — ouvrir les réglages`}
          />
          <KpiCard
            icon={AlertTriangle}
            label="Alertes actives"
            value={alerts.length}
            danger={alerts.length > 0}
            onClick={() => onGoTab('inventaire')}
            ariaLabel={`${alerts.length} alertes actives — ouvrir l’inventaire`}
          />
          <KpiCard
            icon={CalendarClock}
            label="Péremptions ≤ 30 j"
            value={expiring30}
            danger={expiring30 > 0}
            onClick={() => onGoTab('inventaire')}
            ariaLabel={`${expiring30} péremptions sous 30 jours — ouvrir l’inventaire`}
          />
        </div>
      ) : null}

      {/* ---------------- Score d'organisation ---------------- */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <p className={cn('text-4xl leading-none font-bold tabular-nums', scoreColor)}>
                {score.score}
                <span className="text-lg font-semibold text-muted-foreground/70">/100</span>
              </p>
              <div>
                <p className="text-sm font-semibold text-foreground">Score d’organisation</p>
                <p className="text-xs text-muted-foreground">
                  Indicatif — pas un score clinique
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => onGoTab('reglages')}
              className="h-11 gap-1.5"
            >
              Voir les réglages
            </Button>
          </div>
          <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {score.details.map((d) => (
              <li key={d.label} className="flex min-h-6 items-center gap-2 text-sm" title={d.hint}>
                {d.ok ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <XCircle className="size-4 shrink-0 text-state-danger" aria-hidden />
                )}
                <span className="text-foreground/90">{d.label}</span>
                <span className="sr-only">{d.ok ? '— conforme' : `— ${d.hint}`}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ---------------- Alertes prioritaires ---------------- */}
      {alerts.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-state-danger" aria-hidden />
              À traiter en priorité
              <Badge variant="outline" className="tabular-nums">
                {alerts.length}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onGoTab('inventaire')}
                className="ml-auto h-9 gap-1 text-primary hover:text-primary"
              >
                Tout voir
                <ChevronRight className="size-3.5" aria-hidden />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topAlerts.map((a, i) => {
              const entry = entryById.get(a.uid)
              const names = entry
                ? entry.memberIds
                    .map((id) => memberById.get(id)?.name)
                    .filter((n): n is string => n != null)
                : []
              const meta = ALERT_KIND_META[a.kind]
              return (
                <button
                  key={`${a.kind}-${a.uid}-${i}`}
                  type="button"
                  onClick={() => onGoTab('inventaire')}
                  className="flex w-full items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Badge variant="outline" className={cn('shrink-0 gap-1', meta.className)}>
                    {meta.short}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-foreground/90">{a.message}</p>
                    {names.length > 0 ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Concerne : {names.join(', ')}
                      </p>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      {/* ---------------- Membres du foyer ---------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-primary" aria-hidden />
            Membres du foyer
            <Badge variant="outline" className="tabular-nums">
              {members.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {members.map((m) => {
              const c = memberColor(m.color)
              const medCount = entriesByMember.get(m.id) ?? 0
              const alertCount = alertsByMember.get(m.id) ?? 0
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onGoTab('inventaire')}
                  aria-label={`Voir les médicaments de ${m.name}`}
                  className="flex min-h-11 flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        c.chip
                      )}
                    >
                      {initials(m.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{m.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {RELATION_META[m.relation].label} · {ageLabel(m.ageYears)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
                    {m.pregnant ? (
                      <span
                        title="Grossesse suivie"
                        className="inline-flex items-center rounded-md border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-primary"
                      >
                        <HeartPulse className="size-3" aria-hidden />
                        <span className="sr-only">Grossesse</span>
                      </span>
                    ) : null}
                    {m.breastfeeding ? (
                      <span
                        title="Allaitement suivi"
                        className="inline-flex items-center rounded-md border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-primary"
                      >
                        <Baby className="size-3" aria-hidden />
                        <span className="sr-only">Allaitement</span>
                      </span>
                    ) : null}
                    {m.renal ? (
                      <span
                        title="Fonction rénale à surveiller"
                        className="inline-flex items-center rounded-md border border-state-warning/40 bg-state-warning/10 px-1.5 py-0.5 text-state-warning"
                      >
                        <Activity className="size-3" aria-hidden />
                        <span className="sr-only">Fonction rénale</span>
                      </span>
                    ) : null}
                    {m.allergies.length > 0 ? (
                      <span
                        title={m.allergies.join(', ')}
                        className="inline-flex items-center gap-1 rounded-md border border-state-danger/40 bg-state-danger/10 px-1.5 py-0.5 text-state-danger tabular-nums"
                      >
                        <ShieldAlert className="size-3" aria-hidden />
                        {m.allergies.length}
                        <span className="sr-only">
                          {m.allergies.length} allergie{m.allergies.length > 1 ? 's' : ''}{' '}
                          déclarée{m.allergies.length > 1 ? 's' : ''}
                        </span>
                      </span>
                    ) : null}
                    {m.restricted ? (
                      <span
                        title="Entrées masquées derrière le verrou PIN"
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-muted-foreground"
                      >
                        <Lock className="size-3" aria-hidden />
                        Restreint
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      {medCount} médicament{medCount > 1 ? 's' : ''}
                    </span>
                    {alertCount > 0 ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-state-danger/40 bg-state-danger/10 text-state-danger tabular-nums"
                        title="Alertes sur les médicaments de ce membre"
                      >
                        <AlertTriangle className="size-3" aria-hidden />
                        {alertCount}
                      </Badge>
                    ) : null}
                  </div>
                </button>
              )
            })}
            {members.length < MAX_MEMBERS ? (
              <button
                type="button"
                onClick={onAddMember}
                className="flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border p-3 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <UserPlus className="size-5" aria-hidden />
                <span className="text-xs font-medium">Ajouter</span>
                <span className="sr-only">un membre du foyer</span>
              </button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* ---------------- Échéancier de péremption ---------------- */}
      {entries.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-primary" aria-hidden />
              Péremptions à venir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune date de péremption renseignée — reportez les dates des boîtes pour
                activer le suivi.
              </p>
            ) : (
              timeline.map((b) => {
                const colors = BUCKET_COLOR[b.label] ?? BUCKET_COLOR['Plus de 90 jours']
                const width = Math.max(6, Math.round((b.entries.length / maxBucket) * 100))
                const brands = b.entries.map((e) => e.brand)
                const extra = brands.length - 2
                return (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() => onGoTab('inventaire')}
                    aria-label={`${b.label} : ${b.entries.length} médicaments — ouvrir l’inventaire`}
                    className="block w-full rounded-lg border border-border bg-muted/20 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground/90">{b.label}</span>
                      <Badge
                        variant="outline"
                        className={cn('tabular-nums', colors.badge)}
                      >
                        {b.entries.length}
                      </Badge>
                    </div>
                    <div
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`${b.entries.length} médicaments (échelle relative)`}
                    >
                      <div className={cn('h-full rounded-full', colors.bar)} style={{ width: `${width}%` }} />
                    </div>
                    <p className="mt-1.5 truncate text-xs text-muted-foreground">
                      {brands.slice(0, 2).join(' · ')}
                      {extra > 0 ? ` · +${extra}` : ''}
                    </p>
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* ---------------- Derniers contrôles ---------------- */}
      {journal.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-primary" aria-hidden />
              Derniers contrôles
              <Badge variant="outline" className="tabular-nums">
                {journal.length}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onGoTab('reglages')}
                className="ml-auto h-9 gap-1 text-primary hover:text-primary"
              >
                Réglages
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {latestJournal.map((j) => (
                <li
                  key={j.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border bg-muted/20 p-3 text-sm"
                >
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {new Date(j.at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="font-medium text-foreground/90">{j.scope}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {j.itemsCount} médicament{j.itemsCount > 1 ? 's' : ''}
                  </span>
                  {j.interactions > 0 ? (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {j.interactions} interaction{j.interactions > 1 ? 's' : ''}
                    </span>
                  ) : null}
                  {j.maxSeverity != null && KNOWN_SEVERITIES.includes(j.maxSeverity) ? (
                    <SeverityBadge severity={j.maxSeverity as InteractionSeverity} />
                  ) : null}
                  {j.pregnancyAlerts > 0 ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-state-warning/40 bg-state-warning/10 text-state-warning"
                    >
                      <Baby className="size-3" aria-hidden />
                      {j.pregnancyAlerts} grossesse{j.pregnancyAlerts > 1 ? 's' : ''}
                    </Badge>
                  ) : null}
                  {j.cabinetAlerts > 0 ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-border bg-muted/60 text-muted-foreground tabular-nums"
                    >
                      <AlertTriangle className="size-3" aria-hidden />
                      {j.cabinetAlerts} alerte{j.cabinetAlerts > 1 ? 's' : ''} armoire
                    </Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* ---------------- Conseils saisonniers ---------------- */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <span
              className="flex size-8 items-center justify-center rounded-full bg-primary/10"
              aria-hidden
            >
              <SeasonIcon className="size-4 text-primary" />
            </span>
            <p className="text-sm font-semibold text-foreground">
              Conseils saisonniers — {seasonal.season}
            </p>
          </div>
          <ul className="mt-3 space-y-1.5">
            {seasonal.tips.map((t) => (
              <li
                key={t}
                className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
              >
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/50" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground/80">
            Rappels d’organisation domestique — suivez toujours la notice et l’avis d’un
            professionnel de santé.
          </p>
        </CardContent>
      </Card>

      {/* ---------------- Nouveautés de l'armoire ---------------- */}
      {recentEntries.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="size-4 text-primary" aria-hidden />
              Nouveautés de l’armoire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recentEntries.map((e) => {
                const dots = e.memberIds
                  .map((id) => memberById.get(id))
                  .filter((m): m is ArmoireMember => m != null)
                  .slice(0, 4)
                return (
                  <li
                    key={e.uid}
                    className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground" title={e.brand}>
                        {e.brand}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[cleanDci(e.dci), relativeDays(e.addedAt)].filter(Boolean).join(' · ') ||
                          relativeDays(e.addedAt)}
                      </p>
                    </div>
                    {dots.length > 0 ? (
                      <span className="flex shrink-0 -space-x-1.5" aria-hidden>
                        {dots.map((m) => (
                          <span
                            key={m.id}
                            title={m.name}
                            className={cn(
                              'size-3.5 rounded-full ring-2 ring-card',
                              memberColor(m.color).dot
                            )}
                          />
                        ))}
                      </span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      {/* ---------------- Hub Raccourcis DzPharm ---------------- */}
      {(hasEntries || members.length > 0) ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="size-4 text-primary" aria-hidden />
              Raccourcis DzPharm
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {/* Interactions — always shown if there are entries with linked drugs */}
            {hasEntries ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={handleOpenInteractions}
                title="Pré-remplit le vérificateur avec les médicaments du foyer"
              >
                <ShieldAlert className="size-3.5" aria-hidden />
                Vérifier les interactions du foyer
              </Button>
            ) : null}

            {/* Pédiatrie — shown if there are children members */}
            {hasChildren ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={() => openTool('pediatrie')}
              >
                <Baby className="size-3.5" aria-hidden />
                Posologies pédiatriques
              </Button>
            ) : null}

            {/* Fonction rénale — shown if a member has renal flag */}
            {hasRenal ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={() => openTool('renal')}
              >
                <Droplets className="size-3.5" aria-hidden />
                Adapter la dose (insuffisance rénale)
              </Button>
            ) : null}

            {/* Grossesse/Allaitement — shown if a member is pregnant or breastfeeding */}
            {hasPregnant ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={() => openTool('grossesse')}
              >
                <HeartPulse className="size-3.5" aria-hidden />
                Contrôle grossesse & allaitement
              </Button>
            ) : null}

            {/* Copilote — always available */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs"
              onClick={() => setView('copilote')}
            >
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              Demander au Copilote
            </Button>

            {/* Interactions analyse full */}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-xs text-muted-foreground"
              onClick={() => onGoTab('analyse')}
            >
              <MessageSquare className="size-3.5" aria-hidden />
              Analyse complète du foyer
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
