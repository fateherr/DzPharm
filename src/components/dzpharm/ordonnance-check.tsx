'use client'

import { useMemo, useState } from 'react'
import {
  ClipboardCheck,
  FlaskConical,
  Info,
  Lightbulb,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  XCircle,
  Edit3,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { fetchDrugs, postLocalInteractions } from './api'
import type { Drug, InteractionPair, InteractionsResponse, InteractionSeverity } from './types'
import { RISK_META, SeverityBadge, StatusBadge } from './status-badge'
import { SafetyNote } from './safety-note'
import { useDzPharm } from './store'
import { SearchAutocomplete } from './search-autocomplete'

/* ------------------------------------------------------------------ */
/* Constantes & limites                                                */
/* ------------------------------------------------------------------ */

/** Limites d'entrée (audit 4.3) — une ordonnance complète mais bornée. */
const MAX_LINES = 40
const MAX_CHARS = 4000
/** Limite du moteur d'interactions existant (10 produits, cf. MAX_BASKET). */
const MAX_ENGINE_DRUGS = 10

const SEVERITY_ORDER: InteractionSeverity[] = ['CONTRE-INDIQUE', 'MAJEURE', 'MODEREE', 'MINEURE']

const SEVERITY_LEGEND: Record<InteractionSeverity, string> = {
  'CONTRE-INDIQUE': 'bg-state-danger',
  MAJEURE: 'bg-state-danger/60',
  MODEREE: 'bg-state-warning',
  MINEURE: 'bg-muted-foreground/40',
}

const SEVERITY_LABELS: Record<InteractionSeverity, string> = {
  'CONTRE-INDIQUE': 'Contre-indication',
  MAJEURE: 'Majeure',
  MODEREE: 'Modérée',
  MINEURE: 'Mineure',
}

/* ------------------------------------------------------------------ */
/* Analyse déterministe côté client : ligne → nom de médicament        */
/* ------------------------------------------------------------------ */

/** Mots d'arrêt : formes galéniques, conditionnements, posologie, fréquence. */
const STOP_WORDS = new Set([
  // formes & conditionnements
  'comprime', 'comprimes', 'comprimee', 'cp', 'cps', 'cpr', 'gelule', 'gelules',
  'caps', 'capsule', 'capsules', 'sachet', 'sachets', 'sach', 'suppo',
  'suppositoire', 'suppositoires', 'ampoule', 'ampoules', 'amp', 'sirop',
  'gouttes', 'gttes', 'gtt', 'flacon', 'flacons', 'tube', 'tubes', 'creme',
  'cremes', 'pommade', 'pommades', 'collyre', 'spray', 'solution', 'suspension',
  'susp', 'solute', 'ovule', 'ovules', 'patch', 'patchs', 'inhalateur',
  'cartouche', 'cartouches', 'seringue', 'seringues', 'stylo', 'stylos',
  'boite', 'boites', 'gel', 'dragee', 'dragees', 'pastille', 'pastilles',
  'unidose', 'pilulier',
  // posologie / fréquence / durée
  'matin', 'midi', 'soir', 'nuit', 'nocte', 'coucher', 'jours', 'jour', 'j',
  'h', 'sem', 'semaine', 'semaines', 'mois', 'x', 'xx', 'fois', 'prise',
  'prises', 'au', 'par', 'voie', 'orale', 'orales', 'buvable', 'sublinguale',
  'sc', 'im', 'iv', 'pr', 'le', 'la', 'les', 'un', 'une', 'de', 'du', 'des',
  'en', 'si', 'puis', 'qq', 'chaque', 'toutes', 'tous', 'apres', 'avant',
  'repas', 'heures', 'espacees',
  // en-têtes d'ordonnance (nom du prescripteur, métadonnées patient…)
  'dr', 'docteur', 'mme', 'mr', 'patient', 'poids', 'age', 'taille', 'nom',
])

/** Un jeton est-il un dosage / une posologie / une quantité ? */
function isStopToken(rawTok: string): boolean {
  const t = rawTok
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  if (!t) return true
  if (STOP_WORDS.has(t)) return true
  // nombre seul (quantité ou dosage) : « 1000 », « 2,5 »
  if (/^\d+([.,]\d+)?$/.test(t)) return true
  // dosage collé : « 100mg », « 5ml », « 20µg », « 1.5g »
  if (/^\d+([.,]\d+)?(mg|µg|mcg|ug|g|ml|ui|iu|%|gtt|gttes|mmol|da)\b/.test(t)) return true
  // unité seule (le nombre précédent a déjà stoppé la lecture)
  if (/^(mg|µg|mcg|ug|g|ml|ui|iu|%|gtt|gttes|mmol|da)$/.test(t)) return true
  // « x3 », « x/j », « 2x/j »
  if (/^[x×]\d/.test(t)) return true
  if (t.includes('/j') || /\/\s*j/.test(t)) return true
  // plage posologique « 500/125 », « 2/3 »
  if (/^\d+\/\d+/.test(t)) return true
  // tout jeton commençant par un chiffre (date, quantité, dosage…)
  if (/^\d/.test(t)) return true
  return false
}

/** Jeton compatible avec un nom de médicament (lettres, chiffres intégrés, traits d'union). */
const NAME_TOKEN = /^[A-Za-zÀ-ÿ0-9'’.\-]+$/

function extractPosology(raw: string): string | null {
  const patterns = [
    /\b(\d+(?:[.,]\d+)?\s*(?:cp|cpr|comprim[eé]|g[eé]lule|sachet|goutte|cuill[eè]re|ampoule|inj|bouff[eé]e)s?\s*(?:x|\*|par|\/)\s*\d+[\s\w\/]*)/i,
    /\b(\d+\s*(?:x|\/)\s*j(?:our)?[\s\w]*)/i,
    /\b(matin(?:\s*(?:et|,)\s*soir)?|soir|midi|au coucher)\b/i,
    /\b(pendant\s*\d+\s*(?:jours?|semaines?|mois))\b/i,
  ]
  for (const p of patterns) {
    const m = raw.match(p)
    if (m) return m[0].trim()
  }
  return null
}

interface ParsedLine {
  /** Ligne brute après suppression de la numérotation. */
  raw: string
  /** Nom candidat extrait (mots avant le dosage) — '' si la ligne n'est pas un médicament. */
  candidate: string
  /** Posologie heuristique extraite */
  posology?: string | null
}

/** Déterministe : extrait le nom de médicament en tête de ligne (avant dosage/posologie). */
export function parseOrdonnanceLine(raw: string): ParsedLine {
  let line = raw.trim()
  // numérotation d'ordonnance : « 1. », « 2) », « - », « • », « ℞ », « i. »…
  for (let i = 0; i < 3; i++) {
    const stripped = line.replace(
      /^\s*(?:(?:[ivx]{1,4}|\d{1,3})\s*[.)\-–:]|[-–—•*·»>℞]|rx)\s*/i,
      ''
    )
    if (stripped === line) break
    line = stripped.trim()
  }
  if (!line) return { raw: raw.trim(), candidate: '' }

  const tokens = line.split(/\s+/).slice(0, 12)
  const nameTokens: string[] = []
  for (const rawTok of tokens) {
    const tok = rawTok.replace(/[.,;:!?)\]»]+$/g, '')
    if (!tok) continue
    if (isStopToken(tok)) break
    if (!NAME_TOKEN.test(tok)) break
    nameTokens.push(tok)
    if (nameTokens.length >= 3) break
  }
  const candidate = nameTokens.join(' ').trim()
  const posology = extractPosology(line)
  // ≥ 3 caractères : écarte les fragments trop courts (faux positifs de la
  // correspondance « contient » sur des sous-chaînes aléatoires).
  return {
    raw: line,
    candidate: candidate.length >= 3 ? candidate : '',
    posology,
  }
}

/* ------------------------------------------------------------------ */
/* Résolution : candidat → médicament du registre                      */
/* ------------------------------------------------------------------ */

function toSearchKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

interface ResolvedDrug {
  id: number
  brand: string
  dci: string | null
  status: string
  fuzzy?: boolean
  suggestion?: string | null
}

/**
 * Résout un candidat vers le registre : actif en priorité, sinon n'importe
 * quel statut (pour signaler honnêtement une prescription non
 * renouvelée/retirée). La correspondance est vérifiée avec support
 * de tolérance phonétique et suggestions orthographiques de l'API.
 */
async function resolveCandidate(candidate: string): Promise<ResolvedDrug | null> {
  try {
    const key = toSearchKey(candidate)
    if (!key) return null

    const actifs = await fetchDrugs({ q: candidate, pageSize: 1, status: 'ACTIF', sort: 'relevance' })
    let drug: Drug | undefined = actifs.drugs[0]
    let fuzzy = actifs.fuzzy ?? false
    let suggestion = actifs.suggestion ?? null

    if (!drug) {
      const any = await fetchDrugs({ q: candidate, pageSize: 1, sort: 'relevance' })
      drug = any.drugs[0]
      fuzzy = any.fuzzy ?? false
      suggestion = any.suggestion ?? null
    }
    if (!drug) return null

    const brandKey = toSearchKey(drug.brand ?? '')
    const dciKey = toSearchKey(drug.dci ?? '')
    const exactMatch =
      (brandKey !== '' && (brandKey.includes(key) || key.includes(brandKey))) ||
      (dciKey !== '' && (dciKey.includes(key) || key.includes(dciKey)))

    if (exactMatch) {
      return { id: drug.id, brand: drug.brand, dci: drug.dci, status: drug.status, fuzzy: false }
    }

    // Tolérance phonétique / suggestion intelligente du moteur
    if (fuzzy || suggestion) {
      return {
        id: drug.id,
        brand: drug.brand,
        dci: drug.dci,
        status: drug.status,
        fuzzy: true,
        suggestion: suggestion || drug.brand,
      }
    }

    return null
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/* Types d'état                                                        */
/* ------------------------------------------------------------------ */

type LineStatus = 'found' | 'unresolved' | 'ignored'

interface LineResult extends ParsedLine {
  status: LineStatus
  drug?: ResolvedDrug
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                 */
/* ------------------------------------------------------------------ */

export function OrdonnanceCheck() {
  const openDrug = useDzPharm((s) => s.openDrug)
  const setBasket = useDzPharm((s) => s.setBasket)
  const setView = useDzPharm((s) => s.setView)
  const { toast } = useToast()

  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lines, setLines] = useState<LineResult[] | null>(null)
  const [result, setResult] = useState<InteractionsResponse | null>(null)
  const [engineLimited, setEngineLimited] = useState(false)
  const [linesTruncated, setLinesTruncated] = useState(false)
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null)

  const allLines = useMemo(() => value.split('\n'), [value])
  const nonEmptyLines = useMemo(
    () => allLines.filter((l) => l.trim().length > 0).length,
    [allLines]
  )

  const found = useMemo(
    () => (lines ?? []).filter((l): l is LineResult & { drug: ResolvedDrug } => l.status === 'found' && !!l.drug),
    [lines]
  )
  const unresolved = useMemo(() => (lines ?? []).filter((l) => l.status === 'unresolved'), [lines])
  const severityCounts = useMemo(() => {
    const counts = new Map<InteractionSeverity, number>()
    for (const p of result?.pairs ?? []) {
      counts.set(p.severity, (counts.get(p.severity) ?? 0) + 1)
    }
    return counts
  }, [result])

  async function recheckInteractions(identified: (LineResult & { drug: ResolvedDrug })[]) {
    if (identified.length >= 2) {
      const items = identified
        .slice(0, MAX_ENGINE_DRUGS)
        .map((r) => ({ name: r.drug.brand, dci: r.drug.dci ?? undefined }))
      const res = await postLocalInteractions(items)
      setResult(res)
      setEngineLimited(identified.length > MAX_ENGINE_DRUGS)
    } else {
      setResult(null)
      setEngineLimited(false)
    }
  }

  function handleManualPick(drug: Drug) {
    if (editingLineIndex === null || !lines) return
    const updated = [...lines]
    updated[editingLineIndex] = {
      ...updated[editingLineIndex],
      status: 'found',
      drug: {
        id: drug.id,
        brand: drug.brand,
        dci: drug.dci,
        status: drug.status,
      },
    }
    setLines(updated)
    setEditingLineIndex(null)
    const newlyIdentified = updated.filter(
      (r): r is LineResult & { drug: ResolvedDrug } => r.status === 'found' && !!r.drug
    )
    recheckInteractions(newlyIdentified)
    toast({
      title: 'Médicament sélectionné',
      description: `${drug.brand} a été assigné à la ligne.`,
    })
  }

  function transferToBasket() {
    if (found.length === 0) return
    const items = found.map((f) => ({
      id: f.drug.id,
      brand: f.drug.brand,
      dci: f.drug.dci ?? '',
      status: f.drug.status,
    }))
    setBasket(items)
    toast({
      title: 'Médicaments transférés',
      description: `${items.length} médicament(s) envoyés dans le panier d'interactions.`,
    })
    setView('interactions')
  }

  async function analyze() {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const nonEmpty = allLines.filter((l) => l.trim().length > 0)
      setLinesTruncated(nonEmpty.length > MAX_LINES)
      const parsed = nonEmpty.slice(0, MAX_LINES).map((l) => parseOrdonnanceLine(l))

      const results: LineResult[] = []
      for (const p of parsed) {
        if (!p.candidate) {
          results.push({ ...p, status: 'ignored' })
          continue
        }
        const drug = await resolveCandidate(p.candidate)
        results.push(
          drug ? { ...p, status: 'found', drug } : { ...p, status: 'unresolved' }
        )
      }
      setLines(results)

      const identified = results.filter(
        (r): r is LineResult & { drug: ResolvedDrug } => r.status === 'found' && !!r.drug
      )
      setResult(null)
      setEngineLimited(false)
      if (identified.length >= 2) {
        // Moteur d'interactions existant — mêmes données que le panier du
        // vérificateur : { name: marque, dci }.
        const items = identified
          .slice(0, MAX_ENGINE_DRUGS)
          .map((r) => ({ name: r.drug.brand, dci: r.drug.dci ?? undefined }))
        const res = await postLocalInteractions(items)
        setResult(res)
        setEngineLimited(identified.length > MAX_ENGINE_DRUGS)
      }
    } catch {
      setError(
        "L'analyse a échoué — vérifiez votre connexion puis réessayez. Aucun résultat n'a été conservé."
      )
    } finally {
      setPending(false)
    }
  }

  const risk = result ? RISK_META[result.globalRisk] : null

  return (
    <Card className="w-full" id="ordonnance-check">
      <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
        <CardTitle className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-foreground">
          <span
            className="flex size-9 items-center justify-center rounded-xl bg-primary/10"
            aria-hidden
          >
            <ClipboardCheck className="size-5 text-primary" />
          </span>
          Vérification d&apos;ordonnance
        </CardTitle>
        <CardDescription className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Collez une ordonnance complète — DzPharm identifie les médicaments et contrôle les
          interactions d&apos;un seul coup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Textarea
            id="ordonnance-input"
            aria-label="Ordonnance à vérifier — une ligne par médicament"
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, MAX_CHARS))}
            placeholder={'DOLIPRANE 1000 mg\nAMLODIPINE 5 mg\nMOPRAL 20 mg'}
            rows={7}
            className="min-h-32 resize-y font-mono text-sm leading-relaxed"
            spellCheck={false}
          />
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <p className="text-[11px] text-muted-foreground">
              Une ligne par médicament — le nom en premier, le dosage ensuite.
            </p>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {nonEmptyLines}/{MAX_LINES} lignes · {value.length}/{MAX_CHARS} caractères
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            onClick={analyze}
            disabled={pending || nonEmptyLines === 0}
            className="h-11 text-sm font-semibold sm:min-w-56"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Analyse de l&apos;ordonnance…
              </>
            ) : (
              <>
                <ShieldAlert className="size-4" aria-hidden />
                Analyser l&apos;ordonnance
              </>
            )}
          </Button>
          {lines !== null && !pending ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11 text-sm"
              onClick={() => {
                setLines(null)
                setResult(null)
                setError(null)
                setEngineLimited(false)
                setLinesTruncated(false)
              }}
            >
              Effacer les résultats
            </Button>
          ) : null}
        </div>

        {/* Avertissement au point d'usage — périmètre exact de l'outil */}
        <SafetyNote>
          Vérification d&apos;interactions uniquement — les posologies, durées et indications ne
          sont PAS vérifiées par cet outil. Validez toujours l&apos;ordonnance avec les RCP
          officiels.
        </SafetyNote>

        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-state-danger/40 bg-state-danger/10 px-4 py-2.5 text-sm text-state-danger"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        {linesTruncated ? (
          <p className="flex items-start gap-2 rounded-lg border border-state-warning/40 bg-state-warning/10 px-4 py-2.5 text-sm text-state-warning" role="status">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            Ordonnance longue : seules les {MAX_LINES} premières lignes sont analysées.
          </p>
        ) : null}

        {/* ---------------- Médicaments identifiés ---------------- */}
        {lines !== null ? (
          <section aria-label="Médicaments identifiés" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                Médicaments identifiés
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums normal-case">
                  {found.length} reconnu{found.length > 1 ? 's' : ''}
                  {unresolved.length > 0 ? ` · ${unresolved.length} non reconnu${unresolved.length > 1 ? 's' : ''}` : ''}
                </span>
              </h3>
              {found.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={transferToBasket}
                  className="h-8 gap-1.5 border-primary/40 bg-primary/5 text-xs font-semibold text-primary hover:bg-primary/15"
                >
                  <FlaskConical className="size-3.5" />
                  <span>Transférer vers le Panier ({found.length})</span>
                  <ArrowRight className="size-3" />
                </Button>
              )}
            </div>

            {lines.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Aucune ligne exploitable dans l&apos;ordonnance.
              </p>
            ) : (
              <ul className="space-y-2">
                {lines.map((l, i) => (
                  <li
                    key={`${i}-${l.raw}`}
                    className={cn(
                      'flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border p-3 text-sm',
                      l.status === 'ignored'
                        ? 'border-border/60 bg-muted/30'
                        : l.status === 'found'
                          ? 'border-border/70 bg-card'
                          : 'border-state-warning/40 bg-state-warning/5'
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5 font-medium text-foreground">
                        <span>{l.raw || '—'}</span>
                        {l.posology && (
                          <span className="rounded bg-muted/80 px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground">
                            Poso : {l.posology}
                          </span>
                        )}
                      </span>
                      {l.status === 'found' && l.drug ? (
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{l.drug.brand} · {l.drug.dci ?? 'DCI non renseignée'}</span>
                          {l.drug.fuzzy && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.2 text-[10px] font-semibold text-primary">
                              <Sparkles className="size-2.5" />
                              <span>≈ Tolérance phonétique ({l.drug.suggestion})</span>
                            </span>
                          )}
                        </span>
                      ) : null}
                    </span>
                    {l.status === 'ignored' ? (
                      <span className="shrink-0 text-xs text-muted-foreground/70">
                        Ligne non médicamenteuse ignorée
                      </span>
                    ) : l.status === 'found' && l.drug ? (
                      <span className="flex shrink-0 items-center gap-1.5">
                        <StatusBadge status={l.drug.status} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openDrug(l.drug!.id)}
                          aria-label={`Ouvrir la fiche de ${l.drug.brand}`}
                        >
                          Fiche
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1 border-border/80 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingLineIndex(i)}
                          aria-label={`Modifier le médicament pour la ligne ${l.raw}`}
                        >
                          <Edit3 className="size-3" />
                          <span className="hidden sm:inline">Modifier</span>
                        </Button>
                      </span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-state-warning/40 bg-state-warning/10 px-2.5 py-0.5 text-[11px] font-semibold text-state-warning"
                        >
                          <XCircle className="size-3.5" aria-hidden />
                          Non reconnu
                        </span>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="h-7 px-2.5 text-xs gap-1 font-semibold"
                          onClick={() => setEditingLineIndex(i)}
                          aria-label={`Choisir le médicament pour la ligne ${l.raw}`}
                        >
                          <Edit3 className="size-3" />
                          <span>Choisir</span>
                        </Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Identification automatique assistée par phonétique — vous pouvez modifier ou attribuer n&apos;importe quelle ligne avec le bouton « Choisir ».
            </p>

            {found.length < 2 ? (
              <p className="flex items-start gap-2 rounded-lg border border-state-warning/40 bg-state-warning/10 px-4 py-2.5 text-sm text-state-warning" role="status">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                Pas assez de médicaments reconnus pour lancer le contrôle d&apos;interactions.
              </p>
            ) : null}
          </section>
        ) : null}

        {/* Modal de sélection manuelle d'un médicament */}
        <Dialog open={editingLineIndex !== null} onOpenChange={(open) => !open && setEditingLineIndex(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Sélectionner le médicament correspondant</DialogTitle>
              <DialogDescription>
                {editingLineIndex !== null && lines && lines[editingLineIndex]
                  ? `Pour la ligne : « ${lines[editingLineIndex].raw} »`
                  : 'Recherchez un médicament dans le répertoire officiel'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <SearchAutocomplete
                autoFocus
                placeholder="Rechercher marque ou DCI..."
                onSelect={handleManualPick}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* ---------------- Résultats d'interactions ---------------- */}
        {result ? (
          <section aria-label="Contrôle d'interactions de l'ordonnance" className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              Contrôle d&apos;interactions
            </h3>

            {engineLimited ? (
              <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground" role="note">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Ordonnance de {found.length} médicaments reconnus : le contrôle porte sur les{' '}
                {MAX_ENGINE_DRUGS} premiers (limite du moteur d&apos;interactions).
              </p>
            ) : null}

            {/* Bandeau risque global */}
            <div
              className={cn(
                'flex items-start gap-4 rounded-xl border p-5',
                risk?.border,
                risk?.className
              )}
              role="status"
              aria-live="polite"
            >
              {result.globalRisk === 'FAIBLE' ? (
                <ShieldCheck className={cn('size-9 shrink-0', risk?.icon)} aria-hidden />
              ) : (
                <ShieldAlert className={cn('size-9 shrink-0', risk?.icon)} aria-hidden />
              )}
              <div className="min-w-0">
                <p className="text-lg font-bold tracking-tight">
                  {risk?.label}
                  {result.pairs.length > 0 ? (
                    <span className="ml-2 align-middle text-sm font-medium opacity-80">
                      · {result.pairs.length} association{result.pairs.length > 1 ? 's' : ''} analysée
                      {result.pairs.length > 1 ? 's' : ''}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-foreground/90">{result.summary}</p>
              </div>
            </div>

            {/* Répartition des gravités */}
            {result.pairs.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-card px-4 py-2.5">
                {SEVERITY_ORDER.filter((s) => severityCounts.has(s)).map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                  >
                    <span className={cn('size-2 rounded-full', SEVERITY_LEGEND[s])} aria-hidden />
                    {SEVERITY_LABELS[s]}
                    <span className="font-semibold text-foreground tabular-nums">
                      {severityCounts.get(s)}
                    </span>
                  </span>
                ))}
              </div>
            ) : null}

            {/* Paires détectées */}
            {result.pairs.length > 0 ? (
              <div className="space-y-3" aria-label="Interactions détectées">
                {result.pairs.map((pair, i) => (
                  <OrdonnancePairCard key={`${pair.drugs.join('-')}-${i}`} pair={pair} />
                ))}
              </div>
            ) : (
              <Card className="border-state-safe/40 bg-state-safe/5">
                <CardContent className="flex items-center gap-3 p-4 text-sm text-foreground/90">
                  <ShieldCheck className="size-5 shrink-0 text-state-safe" aria-hidden />
                  Aucune interaction significative identifiée entre les produits analysés.
                </CardContent>
              </Card>
            )}

            {/* Conseils */}
            {result.advice.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Lightbulb className="size-4 text-chifa" aria-hidden />
                    Conseils
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground/90">
                    {result.advice.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            {/* Surveillance */}
            {result.monitoring.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Activity className="size-4 text-state-warning" aria-hidden />
                    Surveillance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground/90">
                    {result.monitoring.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Ne remplace pas la validation pharmaceutique ni l&apos;avis médical.
            </p>
          </section>
        ) : null}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Paire d'interaction (même présentation que le vérificateur)         */
/* ------------------------------------------------------------------ */

function OrdonnancePairCard({ pair }: { pair: InteractionPair }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FlaskConical className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="truncate">{pair.drugs[0]}</span>
            <span className="text-muted-foreground" aria-hidden>
              +
            </span>
            <span className="truncate">{pair.drugs[1]}</span>
          </p>
          <SeverityBadge severity={pair.severity} />
        </div>
        <div className="mt-3 space-y-2.5 text-sm">
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
  )
}
