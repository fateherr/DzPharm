'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  FlaskConical,
  Info,
  Lightbulb,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { postInteractions, postLocalInteractions } from './api'
import type { InteractionPair, InteractionsResponse, InteractionSeverity } from './types'
import { RISK_META, SeverityBadge, StatusBadge } from './status-badge'
import { MAX_BASKET, useDzPharm } from './store'
import { SearchAutocomplete } from './search-autocomplete'

const SEVERITY_ORDER: InteractionSeverity[] = ['CONTRE-INDIQUE', 'MAJEURE', 'MODEREE', 'MINEURE']

const SEVERITY_LEGEND: Record<InteractionSeverity, string> = {
  'CONTRE-INDIQUE': 'bg-state-danger',
  MAJEURE: 'bg-state-danger/60',
  MODEREE: 'bg-state-warning',
  MINEURE: 'bg-muted-foreground/40',
}

function PairCard({ pair }: { pair: InteractionPair }) {
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

export function InteractionsView() {
  const basket = useDzPharm((s) => s.basket)
  const addToBasket = useDzPharm((s) => s.addToBasket)
  const removeFromBasket = useDzPharm((s) => s.removeFromBasket)
  const clearBasket = useDzPharm((s) => s.clearBasket)
  const openDrug = useDzPharm((s) => s.openDrug)
  const { toast } = useToast()

  const [patientContext, setPatientContext] = useState('')
  const [result, setResult] = useState<InteractionsResponse | null>(null)
  const [analyzedIds, setAnalyzedIds] = useState<string>('')
  const [localPending, setLocalPending] = useState(false)
  const [aiPending, setAiPending] = useState(false)
  const [aiFailed, setAiFailed] = useState(false)

  const names = useMemo(() => basket.map((b) => b.brand), [basket])

  async function analyze() {
    if (names.length < 2) return
    setAiFailed(false)

    // 1. Moteur local — instantané, toujours disponible
    setLocalPending(true)
    try {
      const local = await postLocalInteractions(names)
      setResult(local)
      setAnalyzedIds(basket.map((b) => b.id).join(','))
    } catch {
      // le moteur local échoue rarement ; on tente quand même l'IA
    } finally {
      setLocalPending(false)
    }

    // 2. Analyse IA approfondie — remplace le résultat local si disponible
    setAiPending(true)
    try {
      const ai = await postInteractions(names, patientContext)
      setResult({ ...ai, source: 'ai' })
      setAnalyzedIds(basket.map((b) => b.id).join(','))
    } catch {
      setAiFailed(true)
    } finally {
      setAiPending(false)
    }
  }

  const pending = localPending || aiPending
  const stale =
    result !== null && analyzedIds !== basket.map((b) => b.id).join(',')

  const severityCounts = useMemo(() => {
    const counts = new Map<InteractionSeverity, number>()
    for (const p of result?.pairs ?? []) {
      counts.set(p.severity, (counts.get(p.severity) ?? 0) + 1)
    }
    return counts
  }, [result])

  function handleSelect(name: Parameters<typeof addToBasket>[0]) {
    const res = addToBasket(name)
    if (res === 'added') {
      toast({
        title: 'Médicament ajouté',
        description: `${name.brand} (${name.dci}) — ${basket.length + 1} produit(s) dans le panier.`,
      })
    } else if (res === 'duplicate') {
      toast({ title: 'Déjà présent', description: `${name.brand} est déjà dans le panier.` })
    } else {
      toast({
        title: 'Panier complet',
        description: `Le contrôle est limité à ${MAX_BASKET} médicaments.`,
        variant: 'destructive',
      })
    }
  }

  const risk = result ? RISK_META[result.globalRisk] : null

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Contrôle d&apos;interactions médicamenteuses
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sélectionnez 2 à 10 médicaments — l&apos;IA identifie les interactions et propose
          une conduite à tenir.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]">
        {/* ------------------------- Panier ------------------------- */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Stethoscope className="size-4 text-primary" aria-hidden />
                  Panier d&apos;analyse
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
                  {basket.length}/{MAX_BASKET}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SearchAutocomplete
                placeholder="Ajouter un médicament…"
                ariaLabel="Ajouter un médicament au contrôle d'interactions"
                onSelect={handleSelect}
                rightHint={
                  <Plus className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />
                }
              />

              {basket.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Le panier est vide. Recherchez un médicament pour l&apos;ajouter —
                  depuis le répertoire, utilisez le bouton «&nbsp;Ajouter au contrôle
                  d&apos;interactions&nbsp;».
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2" aria-label="Médicaments sélectionnés">
                  {basket.map((item) => (
                    <li key={item.id}>
                      <span className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-secondary/60 py-1.5 pr-1.5 pl-3 text-sm">
                        <button
                          type="button"
                          onClick={() => openDrug(item.id)}
                          className="min-w-0 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          title="Ouvrir la fiche du médicament"
                        >
                          <span className="block truncate font-medium text-foreground">
                            {item.brand}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {item.dci}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromBasket(item.id)}
                          aria-label={`Retirer ${item.brand} du panier`}
                          className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-state-danger/10 hover:text-state-danger focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <X className="size-3.5" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div>
                <label
                  htmlFor="patient-context"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  Contexte patient — âge, pathologies, grossesse…
                </label>
                <Textarea
                  id="patient-context"
                  value={patientContext}
                  onChange={(e) => setPatientContext(e.target.value)}
                  placeholder="Ex : femme enceinte 2e trimestre, insuffisance rénale chronique, 72 ans…"
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={analyze}
                  disabled={basket.length < 2 || pending}
                  className="h-11 flex-1 text-sm font-semibold"
                >
                  {pending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      {localPending ? 'Règles locales…' : 'Analyse IA…'}
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="size-4" aria-hidden />
                      Analyser les interactions
                    </>
                  )}
                </Button>
                {basket.length > 0 ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 text-muted-foreground hover:text-state-danger"
                    onClick={() => {
                      clearBasket()
                      setResult(null)
                    }}
                    aria-label="Vider le panier"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
              {pending ? (
                <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                  {localPending
                    ? 'Vérification instantanée par le moteur local de règles…'
                    : 'L\u2019analyse IA approfondie peut prendre jusqu\u2019à une minute…'}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* ------------------------ Résultats ------------------------ */}
        <div className="min-w-0">
          {!result && !pending ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center">
              <ShieldCheck className="size-12 text-muted-foreground/40" aria-hidden />
              <p className="mt-4 text-base font-semibold text-foreground">
                Aucune analyse pour le moment
              </p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Ajoutez au moins 2 médicaments au panier puis lancez l&apos;analyse. Le
                rapport présente le niveau de risque global, les associations à
                surveiller et les conseils de dispensation.
              </p>
            </div>
          ) : pending && !result ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-border bg-card p-10 text-center">
              <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
              <p className="mt-4 text-base font-semibold text-foreground">
                Analyse en cours…
              </p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Le moteur local de règles vérifie instantanément les {basket.length}{' '}
                médicaments de votre panier, puis l&apos;IA approfondit l&apos;analyse.
              </p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Indicateur de source + état IA */}
              <div
                className={cn(
                  'flex flex-wrap items-center gap-2 rounded-lg border px-4 py-2.5 text-sm',
                  aiFailed
                    ? 'border-state-warning/40 bg-state-warning/10 text-state-warning'
                    : 'border-border bg-card text-muted-foreground'
                )}
                role="status"
              >
                {result.source === 'ai' ? (
                  <>
                    <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
                    <span>
                      Analyse IA approfondie — croisée avec la base de règles locale.
                    </span>
                  </>
                ) : aiFailed ? (
                  <>
                    <AlertTriangle className="size-4 shrink-0" aria-hidden />
                    <span>
                      Analyse IA approfondie indisponible — résultats du{' '}
                      <strong className="font-semibold">moteur local de règles</strong>{' '}
                      ({result.pairs.length} association(s) vérifiée(s)).
                    </span>
                  </>
                ) : aiPending ? (
                  <>
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                    <span>Règles locales appliquées — analyse IA en cours…</span>
                  </>
                ) : (
                  <>
                    <Zap className="size-4 shrink-0 text-primary" aria-hidden />
                    <span>
                      Moteur local de règles — réponse instantanée hors ligne.
                    </span>
                  </>
                )}
              </div>

              {stale ? (
                <div
                  className="flex items-center gap-2 rounded-lg border border-state-warning/40 bg-state-warning/10 px-4 py-2.5 text-sm text-state-warning"
                  role="status"
                >
                  <AlertTriangle className="size-4 shrink-0" aria-hidden />
                  Le panier a été modifié depuis cette analyse — relancez l&apos;analyse
                  pour actualiser les résultats.
                </div>
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
                      {s === 'CONTRE-INDIQUE' ? 'Contre-indication' : s.charAt(0) + s.slice(1).toLowerCase()}
                      <span className="font-semibold text-foreground tabular-nums">
                        {severityCounts.get(s)}
                      </span>
                    </span>
                  ))}
                </div>
              ) : null}

              {/* Médicaments enrichis */}
              {result.enriched.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Produits analysés</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {result.enriched.map((e) => (
                      <span
                        key={e.input}
                        className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-foreground">
                            {e.input}
                          </span>
                          {e.dci ? (
                            <span className="block truncate text-muted-foreground">{e.dci}</span>
                          ) : null}
                        </span>
                        {e.status ? (
                          e.status === 'RETRIE' ? (
                            <span className="shrink-0 rounded bg-state-danger/15 px-1.5 py-0.5 text-[10px] font-semibold text-state-danger">
                              Retiré
                            </span>
                          ) : (
                            <StatusBadge status={e.status} className="shrink-0" />
                          )
                        ) : null}
                      </span>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              {/* Paires */}
              {result.pairs.length > 0 ? (
                <section aria-label="Interactions détectées" className="space-y-3">
                  <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                    Interactions détectées
                  </h2>
                  {result.pairs.map((pair, i) => (
                    <PairCard key={`${pair.drugs.join('-')}-${i}`} pair={pair} />
                  ))}
                </section>
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
                {result.source === 'ai'
                  ? 'L\u2019analyse est générée par IA à partir des données du référentiel — elle ne remplace pas la validation pharmaceutique ni les référentiels officiels.'
                  : 'Analyse générée par le moteur local de règles DzPharm (base des interactions majeures courantes en Algérie) — elle ne remplace ni l\u2019analyse IA approfondie ni la validation pharmaceutique.'}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
