'use client'

/**
 * Armoire — Onglet « Analyse du foyer » (plan 3.4.8).
 *
 * Contrôle automatique de l'armoire ENTIÈRE, tous membres confondus :
 * - interactions médicamenteuses (moteur de règles local, /api/interactions) ;
 * - grossesse/allaitement : chaque entrée des membres concernés
 *   (/api/pregnancy, règles CRAT + livres) ;
 * - posologies pédiatriques pondérées (computeDose, base locale) ;
 * - renvoi honnête vers l'outil Fonction rénale pour les membres concernés.
 *
 * AUCUNE donnée clinique n'est inventée ici : seules les sorties des moteurs
 * et les registres sont affichées. Les doses pédiatriques viennent
 * exclusivement de computeDose.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  Baby,
  ChevronDown,
  Eye,
  FlaskConical,
  Info,
  Lightbulb,
  Loader2,
  Pill,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Users,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { checkPregnancy, postLocalInteractions } from '../api'
import type {
  InteractionsResponse,
  InteractionSeverity,
  PediatricDosing,
  PregnancyCheckResponse,
} from '../types'
import { RISK_META, SeverityBadge } from '../status-badge'
import { PEDIATRIC_DRUGS, computeDose } from '@/lib/pediatric-dosing'
import { memberColor } from './constants'
import { computeCabinetAlerts, initials, normKey } from './utils'
import type { ArmoireEntry, ArmoireJournalEntry, ArmoireMember } from './types'

export interface AnalysisTabProps {
  members: ArmoireMember[]
  entries: ArmoireEntry[]
  onJournal: (entry: Omit<ArmoireJournalEntry, 'id' | 'at'>) => void
  onOpenSheet: (drugId: number) => void
}

/* ------------------------------------------------------------------ */
/* Constantes locales                                                  */
/* ------------------------------------------------------------------ */

const SEV_ORDER: InteractionSeverity[] = ['CONTRE-INDIQUE', 'MAJEURE', 'MODEREE', 'MINEURE']

/** Plafond d'appels grossesse par run (garde-fou réseau). */
const MAX_PREG_CALLS = 15

/** Niveaux grossesse/allaitement considérés comme alertes (journal). */
const PREG_ALERT_LEVELS: ReadonlySet<string> = new Set(['PRUDENCE', 'DECONSEILLE', 'CONTRE_INDIQUE'])

const PREG_RISK_META: Record<string, { label: string; className: string }> = {
  SURE: { label: 'Compatible', className: 'border-state-safe/40 bg-state-safe/10 text-state-safe' },
  PRUDENCE: {
    label: 'Prudence',
    className: 'border-state-warning/40 bg-state-warning/10 text-state-warning',
  },
  DECONSEILLE: { label: 'Déconseillé', className: 'border-chifa/40 bg-chifa/10 text-chifa' },
  CONTRE_INDIQUE: {
    label: 'Contre-indiqué',
    className: 'border-transparent bg-state-danger text-white',
  },
  NEUTRE: { label: 'Neutre', className: 'border-border bg-muted/60 text-muted-foreground' },
}

const PREG_RISK_MISSING = {
  label: 'Non documenté',
  className: 'border-border bg-muted/60 text-muted-foreground',
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Empreinte des données cliniques pertinentes (relance l'analyse si modifiée). */
function buildAnalysisKey(members: ArmoireMember[], entries: ArmoireEntry[]): string {
  const m = members
    .map(
      (x) =>
        `${x.id}:${x.relation}:${x.ageYears}:${x.weightKg ?? ''}:${x.pregnant ? 1 : 0}:${
          x.breastfeeding ? 1 : 0
        }:${x.renal ? 1 : 0}`
    )
    .join('|')
  const e = entries
    .map(
      (x) =>
        `${x.uid}:${x.brand}:${x.dci}:${x.dciKey}:${x.status}:${x.memberIds
          .slice()
          .sort()
          .join(',')}`
    )
    .join('|')
  return `${members.length}[${m}]__${entries.length}[${e}]`
}

/** Clé de rapprochement DCI (normKey + retrait du « ET » des associations). */
function pedKey(s: string): string {
  return normKey(s)
    .replace(/\s+ET\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchPediatricDrug(entry: ArmoireEntry): PediatricDosing | null {
  const k = pedKey(entry.dciKey || entry.dci)
  if (!k) return null
  return PEDIATRIC_DRUGS.find((d) => pedKey(d.dciKey) === k) ?? null
}

/** Forme dont le libellé couvre le plus de jetons du dosage de l'entrée. */
function bestFormIndex(drug: PediatricDosing, entry: ArmoireEntry): number {
  const tokens = normKey(entry.dosage).split(' ').filter((t) => t.length > 0)
  if (tokens.length === 0) return 0
  let best = 0
  let bestScore = 0
  drug.forms.forEach((f, i) => {
    const label = normKey(f.label)
    const score = tokens.reduce((acc, t) => acc + (label.includes(t) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  })
  return best
}

/* ------------------------------------------------------------------ */
/* Petits composants partagés                                          */
/* ------------------------------------------------------------------ */

function MemberAvatar({
  member,
  className,
}: {
  member: ArmoireMember
  className?: string
}) {
  const c = memberColor(member.color)
  return (
    <span
      role="img"
      aria-label={member.name}
      title={member.name}
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
        c.chip,
        className
      )}
    >
      {initials(member.name)}
    </span>
  )
}

function PairDrugSide({
  name,
  entries,
  members,
  onOpenSheet,
}: {
  name: string
  entries: ArmoireEntry[]
  members: ArmoireMember[]
  onOpenSheet: (drugId: number) => void
}) {
  const matches = entries.filter((e) => normKey(e.brand) === normKey(name))
  const memberIds = [...new Set(matches.flatMap((e) => e.memberIds))]
  const avatars = memberIds
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is ArmoireMember => m != null)
  const linked = matches.find((e) => e.drugId != null)

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {linked && linked.drugId != null ? (
        <button
          type="button"
          onClick={() => onOpenSheet(linked.drugId as number)}
          className="truncate text-left text-sm font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {name}
        </button>
      ) : (
        <span className="truncate text-sm font-semibold text-foreground">{name}</span>
      )}
      <div className="flex items-center gap-1">
        {avatars.length > 0 ? (
          avatars.map((m) => <MemberAvatar key={m.id} member={m} />)
        ) : (
          <span className="text-[10px] text-muted-foreground">non assigné</span>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Onglet Analyse                                                      */
/* ------------------------------------------------------------------ */

interface AnalysisState {
  key: string
  at: number
  result: InteractionsResponse | null
  /** Résultats grossesse par marque (null = appel échoué ou introuvable). */
  pregByBrand: Record<string, PregnancyCheckResponse | null>
}

export function AnalysisTab({ members, entries, onJournal, onOpenSheet }: AnalysisTabProps) {
  const analysisKey = useMemo(() => buildAnalysisKey(members, entries), [members, entries])

  const [state, setState] = useState<AnalysisState | null>(null)
  const [running, setRunning] = useState(false)
  const [failed, setFailed] = useState(false)

  /** Dernières données (évite les clôtures obsolètes dans l'effet). */
  const dataRef = useRef({ members, entries })
  dataRef.current = { members, entries }

  /** Jeton d'invalidation des runs concurrents. */
  const tokenRef = useRef(0)
  /** Runs déjà journalisés (par empreinte) — pas de doublon. */
  const journaledKeysRef = useRef<Set<string>>(new Set())
  /** Forme galénique choisie manuellement, par membre+entrée. */
  const [formOverrides, setFormOverrides] = useState<Record<string, number>>({})

  const run = useCallback(
    async (controller: AbortController, token: number) => {
      if (token !== tokenRef.current) return
      const { members: ms, entries: es } = dataRef.current
      setRunning(true)
      setFailed(false)
      try {
        // Cibles grossesse/allaitement : marques des entrées des membres
        // concernés, dédupliquées par marque, plafonnées à 15 appels.
        const pregMembers = ms.filter((m) => m.pregnant || m.breastfeeding)
        const brands: string[] = []
        for (const m of pregMembers) {
          for (const e of es) {
            if (!e.memberIds.includes(m.id)) continue
            if (!brands.includes(e.brand)) brands.push(e.brand)
          }
        }
        const cappedBrands = brands.slice(0, MAX_PREG_CALLS)

        const [interRes, pregMap] = await Promise.all([
          es.length >= 2
            ? postLocalInteractions(es.map((e) => ({ name: e.brand, dci: e.dci })))
            : Promise.resolve(null),
          (async () => {
            if (cappedBrands.length === 0) return {} as Record<string, PregnancyCheckResponse | null>
            const settled = await Promise.allSettled(
              cappedBrands.map((b) => checkPregnancy(b, controller.signal))
            )
            const map: Record<string, PregnancyCheckResponse | null> = {}
            settled.forEach((s, i) => {
              map[cappedBrands[i]] = s.status === 'fulfilled' ? s.value : null
            })
            return map
          })(),
        ])

        // Invalidation : données modifiées ou run relancé pendant l'attente.
        if (controller.signal.aborted || token !== tokenRef.current) return

        const key = buildAnalysisKey(ms, es)
        setState({ key, at: Date.now(), result: interRes, pregByBrand: pregMap })

        // Journal (une seule fois par empreinte de données).
        const pairs = interRes?.pairs ?? []
        if ((interRes != null || cappedBrands.length > 0) && !journaledKeysRef.current.has(key)) {
          journaledKeysRef.current.add(key)
          const maxSeverity =
            pairs.length > 0
              ? [...pairs]
                  .map((p) => p.severity)
                  .sort((a, b) => SEV_ORDER.indexOf(a) - SEV_ORDER.indexOf(b))[0]
              : null
          let pregnancyAlerts = 0
          for (const m of pregMembers) {
            for (const e of es) {
              if (!e.memberIds.includes(m.id)) continue
              const r = pregMap[e.brand]
              if (!r || !r.found) continue
              if (
                (r.riskLevel != null && PREG_ALERT_LEVELS.has(r.riskLevel)) ||
                (r.breastfeedingLevel != null && PREG_ALERT_LEVELS.has(r.breastfeedingLevel))
              ) {
                pregnancyAlerts += 1
              }
            }
          }
          onJournal({
            scope: `Foyer (${ms.length} membres)`,
            itemsCount: es.length,
            interactions: pairs.length,
            maxSeverity,
            pregnancyAlerts,
            cabinetAlerts: computeCabinetAlerts(es).length,
          })
        }
      } catch {
        if (!controller.signal.aborted && token === tokenRef.current) setFailed(true)
      } finally {
        if (!controller.signal.aborted && token === tokenRef.current) setRunning(false)
      }
    },
    [onJournal]
  )

  /* Analyse automatique : debounce 900 ms sur l'empreinte des données. */
  useEffect(() => {
    const { members: ms, entries: es } = dataRef.current
    const hasPregTargets = ms.some(
      (m) =>
        (m.pregnant || m.breastfeeding) && es.some((e) => e.memberIds.includes(m.id))
    )
    if (es.length < 2 && !hasPregTargets) return
    const controller = new AbortController()
    const token = ++tokenRef.current
    const timer = setTimeout(() => {
      void run(controller, token)
    }, 900)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [analysisKey, run])

  const relaunch = useCallback(() => {
    const controller = new AbortController()
    const token = ++tokenRef.current
    void run(controller, token)
  }, [run])

  /* ---------------- Données dérivées ------------------------------- */

  const stale = state != null && state.key !== analysisKey

  const pregCards = useMemo(() => {
    return members
      .filter((m) => m.pregnant || m.breastfeeding)
      .map((m) => ({
        member: m,
        rows: entries
          .filter((e) => e.memberIds.includes(m.id))
          .map((e) => ({ entry: e, res: state?.pregByBrand[e.brand] ?? null })),
      }))
      .filter((c) => c.rows.length > 0)
  }, [members, entries, state])

  const pediCards = useMemo(() => {
    return members
      .filter(
        (m) => (m.relation === 'enfant' || m.relation === 'bebe') && m.weightKg != null
      )
      .map((m) => {
        const rows = entries
          .filter((e) => e.memberIds.includes(m.id))
          .map((e) => ({ entry: e, drug: matchPediatricDrug(e) }))
          .filter((r): r is { entry: ArmoireEntry; drug: PediatricDosing } => r.drug != null)
        return { member: m, rows }
      })
      .filter((c) => c.rows.length > 0)
  }, [members, entries])

  const renalCards = useMemo(() => {
    return members
      .filter((m) => m.renal)
      .map((m) => ({
        member: m,
        brands: entries.filter((e) => e.memberIds.includes(m.id)).map((e) => e.brand),
      }))
      .filter((c) => c.brands.length > 0)
  }, [members, entries])

  const groupedPairs = useMemo(() => {
    const pairs = state?.result?.pairs ?? []
    return SEV_ORDER.map((sev) => ({
      severity: sev,
      pairs: pairs.filter((p) => p.severity === sev),
    })).filter((g) => g.pairs.length > 0)
  }, [state])

  const risk = state?.result ? RISK_META[state.result.globalRisk] : null
  const hasPregMembers = members.some((m) => m.pregnant || m.breastfeeding)

  /* ---------------- Rendu ------------------------------------------- */

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <Activity className="size-5 text-primary" aria-hidden />
            Analyse du foyer
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Contrôle automatique de tous les médicaments de l&apos;armoire, tous membres
            confondus — interactions, grossesse/allaitement, posologies enfant.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={relaunch}
          disabled={running || (entries.length < 2 && !hasPregMembers)}
          className="h-11 gap-2"
        >
          <RefreshCw className={cn('size-4', running && 'animate-spin')} aria-hidden />
          Relancer l&apos;analyse
        </Button>
      </div>

      {/* Bannière d'analyse en cours */}
      {running ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground"
        >
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
          Analyse automatique lancée — contrôle des interactions du foyer…
        </div>
      ) : null}

      {/* Échec réseau */}
      {failed ? (
        <Alert variant="destructive">
          <WifiOff className="size-4" aria-hidden />
          <AlertTitle>Analyse impossible (réseau)</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>Les moteurs n&apos;ont pas répondu. Vos données locales sont intactes.</span>
            <Button size="sm" variant="outline" onClick={relaunch} className="h-11 gap-2">
              <RefreshCw className="size-4" aria-hidden />
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Données modifiées depuis la dernière analyse */}
      {stale && !running ? (
        <p className="flex items-center gap-2 text-xs text-state-warning">
          <Info className="size-3.5 shrink-0" aria-hidden />
          Données modifiées depuis la dernière analyse — relance en cours.
        </p>
      ) : null}

      {/* États vides */}
      {members.length === 0 ? (
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"
              aria-hidden
            >
              <Users className="size-5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Ajoutez d&apos;abord des membres
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                L&apos;attribution des médicaments aux personnes du foyer nourrit
                l&apos;analyse : contrôle grossesse/allaitement, posologies enfant au poids,
                suivi de la fonction rénale. Ajoutez des membres depuis l&apos;onglet
                Réglages.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {entries.length < 2 ? (
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"
              aria-hidden
            >
              <Pill className="size-5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Ajoutez au moins 2 médicaments pour lancer le contrôle d&apos;interactions
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Dès 2 médicaments, l&apos;analyse du foyer se lance automatiquement :
                interactions entre tous les médicaments de l&apos;armoire (tous membres
                confondus), contrôle grossesse/allaitement pour les membres concernés, et
                posologies pédiatriques pondérées pour les enfants dont le poids est
                renseigné.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ---------------- Interactions ---------------- */}
      {state?.result ? (
        <section aria-labelledby="analyse-inter-title" className="space-y-3">
          <h3
            id="analyse-inter-title"
            className="flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            <FlaskConical className="size-4 text-primary" aria-hidden />
            Interactions médicamenteuses du foyer
            <Badge variant="outline" className="ml-1 tabular-nums">
              {entries.length} médicaments
            </Badge>
          </h3>

          <Card className={cn('border', risk?.border)}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {state.result.globalRisk === 'FAIBLE' ? (
                  <ShieldCheck className={cn('size-9 shrink-0', risk?.icon)} aria-hidden />
                ) : (
                  <ShieldAlert className={cn('size-9 shrink-0', risk?.icon)} aria-hidden />
                )}
                <div className="min-w-0">
                  <p className="text-lg font-bold tracking-tight">
                    {risk?.label}
                    {state.result.pairs.length > 0 ? (
                      <span className="ml-2 align-middle text-sm font-medium opacity-80">
                        · {state.result.pairs.length} association
                        {state.result.pairs.length > 1 ? 's' : ''} détectée
                        {state.result.pairs.length > 1 ? 's' : ''}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                    {state.result.summary}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {groupedPairs.map((g) => (
            <div key={g.severity} className="space-y-3">
              {groupedPairs.length > 1 ? (
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {g.pairs.length} association{g.pairs.length > 1 ? 's' : ''} · {g.severity}
                </p>
              ) : null}
              {g.pairs.map((pair, i) => (
                <Card key={`${pair.drugs[0]}-${pair.drugs[1]}-${i}`} className="overflow-hidden">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <PairDrugSide
                          name={pair.drugs[0]}
                          entries={entries}
                          members={members}
                          onOpenSheet={onOpenSheet}
                        />
                        <span className="text-lg text-muted-foreground" aria-hidden>
                          +
                        </span>
                        <PairDrugSide
                          name={pair.drugs[1]}
                          entries={entries}
                          members={members}
                          onOpenSheet={onOpenSheet}
                        />
                      </div>
                      <SeverityBadge severity={pair.severity} />
                    </div>
                    <div className="space-y-2.5 text-sm">
                      <div>
                        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                          Mécanisme
                        </p>
                        <p className="mt-0.5 text-foreground/90">{pair.mechanism}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                          Conduite à tenir
                        </p>
                        <p className="mt-0.5 text-foreground/90">{pair.management}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}

          {state.result.pairs.length === 0 ? (
            <Card className="border-state-safe/40 bg-state-safe/5">
              <CardContent className="flex items-start gap-3 p-4">
                <ShieldCheck className="size-5 shrink-0 text-state-safe" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-state-safe">
                    Aucune interaction documentée entre les {entries.length} médicaments du foyer
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Absence d&apos;interaction documentée ≠ absence de risque — les données du
                    moteur sont limitées aux règles validées.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {state.result.advice.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Lightbulb className="size-4 text-chifa" aria-hidden />
                  Conseils pratiques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1.5 pl-4 text-sm text-foreground/90">
                  {state.result.advice.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {state.result.monitoring.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Eye className="size-4 text-primary" aria-hidden />
                  Surveillance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1.5 pl-4 text-sm text-foreground/90">
                  {state.result.monitoring.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </section>
      ) : null}

      {/* ---------------- Grossesse / allaitement ---------------- */}
      {pregCards.map(({ member, rows }) => (
        <section
          key={`preg-${member.id}`}
          aria-labelledby={`preg-${member.id}-title`}
          className="space-y-3"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle id={`preg-${member.id}-title`} className="flex flex-wrap items-center gap-2 text-base">
                <Baby className="size-4 text-primary" aria-hidden />
                {member.name} — grossesse/allaitement
                {member.pregnant ? (
                  <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                    Grossesse
                  </Badge>
                ) : null}
                {member.breastfeeding ? (
                  <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                    Allaitement
                  </Badge>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rows.map(({ entry, res }) => {
                const r = res && res.found ? res : null
                const pregMeta = r?.riskLevel
                  ? (PREG_RISK_META[r.riskLevel] ?? PREG_RISK_MISSING)
                  : PREG_RISK_MISSING
                const bfMeta = r?.breastfeedingLevel
                  ? (PREG_RISK_META[r.breastfeedingLevel] ?? PREG_RISK_MISSING)
                  : PREG_RISK_MISSING
                return (
                  <div
                    key={entry.uid}
                    className="rounded-lg border border-border bg-muted/30 p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {entry.drugId != null ? (
                        <button
                          type="button"
                          onClick={() => onOpenSheet(entry.drugId as number)}
                          className="text-left text-sm font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {entry.brand}
                        </button>
                      ) : (
                        <span className="text-sm font-semibold text-foreground">
                          {entry.brand}
                        </span>
                      )}
                      <Badge variant="outline" className={pregMeta.className}>
                        Grossesse : {pregMeta.label}
                      </Badge>
                    </div>
                    {r?.rule ? (
                      <div className="space-y-1.5 text-xs">
                        <p className="leading-relaxed text-muted-foreground">
                          {r.rule.pregnancyNote}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={bfMeta.className}>
                            Allaitement : {bfMeta.label}
                          </Badge>
                        </div>
                        {r.rule.breastfeedingNote ? (
                          <p className="leading-relaxed text-muted-foreground">
                            {r.rule.breastfeedingNote}
                          </p>
                        ) : null}
                        {r.rule.alternatives.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-muted-foreground">Alternatives :</span>
                            {r.rule.alternatives.map((a) => (
                              <Badge
                                key={a}
                                variant="outline"
                                className="border-state-safe/40 bg-state-safe/10 text-state-safe"
                              >
                                {a}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {r
                          ? 'Aucune règle grossesse/allaitement détaillée pour cette spécialité dans la base.'
                          : 'Entrée introuvable dans la base grossesse — statut non documenté.'}
                      </p>
                    )}
                  </div>
                )
              })}
              <p className="text-xs leading-relaxed text-muted-foreground">
                Données issues de la base grossesse/allaitement (règles CRAT + livres
                techniques) — à confronter au RCP et à l&apos;avis médical.
              </p>
            </CardContent>
          </Card>
        </section>
      ))}

      {/* ---------------- Posologies pédiatriques ---------------- */}
      {pediCards.map(({ member, rows }) => {
        const ageMonths = member.ageYears * 12
        return (
          <Card key={`pedi-${member.id}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                <Scale className="size-4 text-primary" aria-hidden />
                Posologies adaptées — {member.name} ({member.weightKg} kg)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {member.ageYears < 2 ? (
                <p className="flex items-start gap-2 rounded-lg border border-state-warning/40 bg-state-warning/10 p-2.5 text-xs text-state-warning">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  Âge en mois à confirmer — les contre-indications s&apos;apprécient en mois.
                </p>
              ) : null}
              {rows.map(({ entry, drug }) => {
                const stateKey = `${member.id}:${entry.uid}`
                const formIndex =
                  formOverrides[stateKey] !== undefined
                    ? formOverrides[stateKey]
                    : bestFormIndex(drug, entry)
                const form = drug.forms[formIndex] ?? drug.forms[0]
                const dose = computeDose(drug, member.weightKg as number, ageMonths, formIndex)
                const blocked = dose.blockers.length > 0
                return (
                  <div
                    key={entry.uid}
                    className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        {entry.drugId != null ? (
                          <button
                            type="button"
                            onClick={() => onOpenSheet(entry.drugId as number)}
                            className="text-left text-sm font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {entry.brand}
                          </button>
                        ) : (
                          <span className="text-sm font-semibold text-foreground">
                            {entry.brand}
                          </span>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {drug.dci} · {drug.category}
                        </p>
                      </div>
                      {drug.forms.length > 1 ? (
                        <Select
                          value={String(formIndex)}
                          onValueChange={(v) =>
                            setFormOverrides((prev) => ({ ...prev, [stateKey]: Number(v) }))
                          }
                        >
                          <SelectTrigger
                            aria-label={`Forme galénique pour ${entry.brand}`}
                            className="h-9 w-[240px] max-w-full text-xs"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {drug.forms.map((f, i) => (
                              <SelectItem key={i} value={String(i)} className="text-xs">
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">{form.label}</span>
                      )}
                    </div>

                    <div
                      className={cn('space-y-1', blocked && 'opacity-60')}
                      aria-disabled={blocked || undefined}
                    >
                      {dose.doseMg != null && dose.doseMg > 0 ? (
                        <p className="text-xl font-bold tabular-nums text-foreground">
                          {dose.doseMg} mg
                          {dose.volumeMl != null ? (
                            <span className="ml-1.5 text-sm font-semibold text-muted-foreground">
                              soit {dose.volumeMl} mL
                            </span>
                          ) : null}
                          <span className="ml-1 text-sm font-medium text-muted-foreground">
                            par prise
                          </span>
                        </p>
                      ) : null}
                      {dose.bandLabel ? (
                        <p className="text-sm font-semibold text-foreground">
                          {dose.bandLabel}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        Max. {dose.maxDailyMg} mg / 24 h
                        {drug.intervalH && drug.intervalH > 0
                          ? ` · toutes les ${drug.intervalH} h`
                          : ''}
                        {dose.capped ? ' · dose adulte atteinte (plafonnée)' : ''}
                      </p>
                      {dose.capped ? (
                        <Badge
                          variant="outline"
                          className="border-chifa/40 bg-chifa/10 text-chifa"
                        >
                          Dose plafonnée (adulte)
                        </Badge>
                      ) : null}
                    </div>

                    {blocked ? (
                      <ul className="space-y-1 text-xs text-state-danger">
                        {dose.blockers.map((b, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                            {b}
                          </li>
                        ))}
                        <li className="text-muted-foreground">
                          Dose indicative — voir bloqueurs ci-dessus.
                        </li>
                      </ul>
                    ) : null}

                    {drug.warnings.length > 0 ? (
                      <Collapsible>
                        <p className="text-xs text-muted-foreground">
                          {drug.warnings[0]}
                        </p>
                        {drug.warnings.length > 1 ? (
                          <>
                            <CollapsibleTrigger className="mt-1 inline-flex h-11 items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              Voir toutes les mises en garde
                              <ChevronDown className="size-3.5" aria-hidden />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <ul className="list-disc space-y-1 pl-4 pt-1 text-xs text-muted-foreground">
                                {drug.warnings.slice(1).map((w, i) => (
                                  <li key={i}>{w}</li>
                                ))}
                              </ul>
                            </CollapsibleContent>
                          </>
                        ) : null}
                      </Collapsible>
                    ) : null}
                  </div>
                )
              })}
              <p className="text-xs leading-relaxed text-muted-foreground">
                Posologies pondérées calculées localement (référentiels usuels adaptés aux
                spécialités algériennes) — indicatives, à valider par un professionnel de
                santé. Calculateur pédiatrique complet dans l&apos;onglet Outils.
              </p>
            </CardContent>
          </Card>
        )
      })}

      {/* ---------------- Fonction rénale ---------------- */}
      {renalCards.map(({ member, brands }) => (
        <Card key={`renal-${member.id}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-state-warning" aria-hidden />
              {member.name} — fonction rénale à surveiller
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="list-disc space-y-1 pl-4 text-sm text-foreground/90">
              {brands.map((b, i) => (
                <li key={`${b}-${i}`}>{b}</li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Vérifiez l&apos;adaptation des posologies au niveau de fonction rénale (voir
              l&apos;outil Fonction rénale dans l&apos;onglet Outils). Aucun ajustement
              automatique n&apos;est appliqué.
            </p>
          </CardContent>
        </Card>
      ))}

      {/* ---------------- Avertissement global ---------------- */}
      <Alert
        variant="default"
        className="border-state-danger/40 bg-state-danger/5 text-state-danger"
        role="note"
        aria-label="Cadre d’utilisation professionnel"
      >
        <Siren className="size-4 shrink-0" aria-hidden />
        <AlertDescription className="text-xs leading-relaxed text-foreground/90">
          Usage professionnel — l&apos;analyse couvre les interactions documentées dans le
          moteur de règles local ; vérifiez toujours les RCP officiels. En urgence :{' '}
          <a
            href="tel:14"
            className="font-semibold text-state-danger underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            SAMU&nbsp;<strong className="font-bold">14</strong>
          </a>
          .
        </AlertDescription>
      </Alert>
    </div>
  )
}
