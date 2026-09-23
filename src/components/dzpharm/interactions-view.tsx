'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Ambulance,
  Ban,
  Check,
  Flame,
  FlaskConical,
  Grid3x3,
  Info,
  Lightbulb,
  Loader2,
  Minus,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  MAJEURE: 'bg-state-severe',
  MODEREE: 'bg-state-warning',
  MINEURE: 'bg-state-info',
}

const SEVERITY_LABELS: Record<InteractionSeverity, string> = {
  'CONTRE-INDIQUE': 'Contre-indication (N4)',
  MAJEURE: 'Déconseillée (N3)',
  MODEREE: 'Précaution (N2)',
  MINEURE: 'À prendre en compte (N1)',
}

/** Nombre max de médicaments affichés dans la matrice. */
const MAX_MATRIX = 6

export function SeverityLegendCard() {
  return (
    <Card className="border-border/70 bg-card/60">
      <CardHeader className="py-2.5 px-4 pb-2">
        <CardTitle className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          <span className="flex items-center gap-1.5 text-foreground/90">
            <Info className="size-3.5 text-primary" aria-hidden="true" />
            Légende des 4 niveaux (ANSM / MIPH)
          </span>
          <span className="text-[10px] text-muted-foreground font-normal">
            référentiel officiel
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
          <div className="flex items-center gap-2 rounded-lg border border-state-danger/30 bg-state-danger/10 px-2.5 py-1.5 text-state-danger">
            <span className="font-bold text-sm" aria-hidden="true">☠</span>
            <div className="min-w-0">
              <p className="font-bold leading-tight">Niveau 4 · Contre-indication</p>
              <p className="text-[10px] opacity-90 truncate">Association formellement interdite</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-state-severe/30 bg-state-severe/10 px-2.5 py-1.5 text-state-severe">
            <span className="font-bold text-sm" aria-hidden="true">⛔</span>
            <div className="min-w-0">
              <p className="font-bold leading-tight">Niveau 3 · Déconseillée</p>
              <p className="text-[10px] opacity-90 truncate">Éviter sauf absolue nécessité</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-state-warning/30 bg-state-warning/10 px-2.5 py-1.5 text-state-warning">
            <span className="font-bold text-sm" aria-hidden="true">⚠</span>
            <div className="min-w-0">
              <p className="font-bold leading-tight">Niveau 2 · Précaution</p>
              <p className="text-[10px] opacity-90 truncate">Surveillance clinique / biologique</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-state-info/30 bg-state-info/10 px-2.5 py-1.5 text-state-info">
            <span className="font-bold text-sm" aria-hidden="true">ℹ</span>
            <div className="min-w-0">
              <p className="font-bold leading-tight">Niveau 1 · À prendre en compte</p>
              <p className="text-[10px] opacity-90 truncate">Risque potentiel à évaluer</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Level4ContraindicationModal({
  open,
  onAcknowledge,
  pairs,
}: {
  open: boolean
  onAcknowledge: () => void
  pairs: InteractionPair[]
}) {
  const ciPairs = pairs.filter((p) => p.severity === 'CONTRE-INDIQUE')
  if (ciPairs.length === 0) return null

  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-xl border-l-4 border-l-state-danger border-t border-r border-b border-border bg-card p-6 shadow-2xl"
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-state-danger/15 text-state-danger ring-4 ring-state-danger/10">
              <Ban className="size-6 text-state-danger animate-pulse" aria-hidden="true" />
            </span>
            <div>
              <AlertDialogTitle className="text-base font-bold text-state-danger">
                CONTRE-INDICATION ABSOLUE DÉTECTÉE (NIVEAU 4)
              </AlertDialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Thésaurus ANSM &amp; Référentiel National MIPH
              </p>
            </div>
          </div>
          <AlertDialogDescription asChild>
            <div className="mt-4 space-y-3 text-sm text-foreground">
              <p className="font-semibold text-foreground/90">
                L&apos;analyse a identifié {ciPairs.length} association{ciPairs.length > 1 ? 's' : ''} formellement contre-indiquée{ciPairs.length > 1 ? 's' : ''} :
              </p>
              <div className="max-h-60 space-y-2.5 overflow-y-auto pr-1">
                {ciPairs.map((pair, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-state-danger/30 bg-state-danger/5 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2 font-bold text-state-danger">
                      <span>
                        {pair.drugs[0]} + {pair.drugs[1]}
                      </span>
                      <SeverityBadge severity="CONTRE-INDIQUE" />
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-foreground/80">
                      <p>
                        <strong className="text-foreground">Risque :</strong> {pair.mechanism}
                      </p>
                      <p>
                        <strong className="text-foreground">Conduite à tenir :</strong>{' '}
                        {pair.management}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Cette alerte clinique est bloquante. Veuillez vérifier l&apos;ordonnance et envisager une alternative thérapeutique avant toute dispensation.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogAction
            onClick={onAcknowledge}
            className="w-full sm:w-auto bg-state-danger hover:bg-state-danger/90 text-white font-semibold"
          >
            J&apos;ai pris connaissance de la contre-indication absolue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
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
  const [tab, setTab] = useState('verificateur')

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Contrôle d&apos;interactions médicamenteuses
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sélectionnez 2 à 10 médicaments — le contrôle identifie les interactions
          médicamenteuses et propose la conduite à tenir pour la dispensation.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList className="scroll-thin h-12 w-full justify-start gap-1 overflow-x-auto rounded-xl p-1.5 sm:w-auto">
          <TabsTrigger
            value="verificateur"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm"
          >
            <ShieldAlert className="size-4" aria-hidden />
            Vérificateur
          </TabsTrigger>
          <TabsTrigger
            value="matrice"
            className="h-9 gap-2 px-4 text-sm data-[state=active]:shadow-sm"
          >
            <Grid3x3 className="size-4" aria-hidden />
            Matrice
          </TabsTrigger>
        </TabsList>

        <TabsContent value="verificateur" className="mt-0">
          <VerifierPanel />
        </TabsContent>
        <TabsContent value="matrice" className="mt-0">
          <MatrixPanel onGoToVerifier={() => setTab('verificateur')} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

const HIGH_RISK_PRESETS = [
  {
    label: 'AINS + AVK',
    shortDesc: 'Hémorragie sévère',
    severity: 'CONTRE-INDIQUE' as const,
    drugs: [
      { id: 9953, brand: 'PROFENID', dci: 'KETOPROFENE', status: 'ACTIF' },
      { id: 12118, brand: 'SINTROM', dci: 'ACENOCOUMAROL', status: 'ACTIF' },
    ],
  },
  {
    label: 'Méthotrexate + AINS',
    shortDesc: 'Aplasie médullaire',
    severity: 'CONTRE-INDIQUE' as const,
    drugs: [
      { id: 10134, brand: 'IMETH', dci: 'METHOTREXATE', status: 'ACTIF' },
      { id: 9953, brand: 'PROFENID', dci: 'KETOPROFENE', status: 'ACTIF' },
    ],
  },
  {
    label: 'Doublon Paracétamol',
    shortDesc: 'Hépatotoxicité',
    severity: 'MAJEURE' as const,
    drugs: [
      { id: 9775, brand: 'DOLIPRANE', dci: 'PARACETAMOL', status: 'ACTIF' },
      { id: 9761, brand: 'EFFERALGAN', dci: 'PARACETAMOL', status: 'ACTIF' },
    ],
  },
  {
    label: 'Statine + Macrolide',
    shortDesc: 'Rhabdomyolyse',
    severity: 'MAJEURE' as const,
    drugs: [
      { id: 11194, brand: 'TAHOR', dci: 'ATORVASTATINE CALCIUM', status: 'ACTIF' },
      { id: 12547, brand: 'ORADRO', dci: 'CLARITHROMYCINE', status: 'ACTIF' },
    ],
  },
  {
    label: 'IEC + Spironolactone',
    shortDesc: 'Hyperkaliémie',
    severity: 'MAJEURE' as const,
    drugs: [
      { id: 10640, brand: 'TRIATEC', dci: 'RAMIPRIL', status: 'ACTIF' },
      { id: 11122, brand: 'ALDACTONE', dci: 'SPIRONOLACTONE MICRONISEE', status: 'ACTIF' },
    ],
  },
]

/* ------------------------------------------------------------------ */
/* Onglet 1 — Vérificateur (liste des paires détectées)                */
/* ------------------------------------------------------------------ */

function VerifierPanel() {
  const basket = useDzPharm((s) => s.basket)
  const setBasket = useDzPharm((s) => s.setBasket)
  const addToBasket = useDzPharm((s) => s.addToBasket)
  const removeFromBasket = useDzPharm((s) => s.removeFromBasket)
  const clearBasket = useDzPharm((s) => s.clearBasket)
  const openDrug = useDzPharm((s) => s.openDrug)
  const { toast } = useToast()

  const [patientContext, setPatientContext] = useState('')
  const [result, setResult] = useState<InteractionsResponse | null>(null)
  const [analyzedIds, setAnalyzedIds] = useState<string>('')
  const [pending, setPending] = useState(false)

  const items = useMemo(
    () => basket.map((b) => ({ name: b.brand, dci: b.dci })),
    [basket]
  )

  async function runAnalysisFor(targetItems: { name: string; dci: string }[], idsStr: string) {
    if (targetItems.length < 2) return
    setPending(true)
    try {
      // Vérification instantanée (moteur de règles, déterministe) puis
      // analyse approfondie — le verdict des paires couvertes par la base
      // de référence est identique dans les deux cas (arbitrage serveur).
      const local = await postLocalInteractions(targetItems)
      setResult(local)
      setAnalyzedIds(idsStr)

      const ai = await postInteractions(targetItems, patientContext)
      if (ai) setResult(ai)
    } catch {
      // le résultat local instantané reste affiché s'il est disponible
    } finally {
      setPending(false)
    }
  }

  function analyze() {
    return runAnalysisFor(items, basket.map((b) => b.id).join(','))
  }

  function handleApplyPreset(preset: (typeof HIGH_RISK_PRESETS)[number]) {
    setBasket(preset.drugs)
    toast({
      title: `Cas clinique : ${preset.label}`,
      description: `${preset.drugs.map((d) => d.brand).join(' + ')} (${preset.shortDesc}) chargé. Analyse lancée.`,
    })
    const targetItems = preset.drugs.map((b) => ({ name: b.brand, dci: b.dci }))
    const idsStr = preset.drugs.map((b) => b.id).join(',')
    void runAnalysisFor(targetItems, idsStr)
  }

  const stale =
    result !== null && analyzedIds !== basket.map((b) => b.id).join(',')

  const severityCounts = useMemo(() => {
    const counts = new Map<InteractionSeverity, number>()
    for (const p of result?.pairs ?? []) {
      counts.set(p.severity, (counts.get(p.severity) ?? 0) + 1)
    }
    return counts
  }, [result])

  const [acknowledgedCiHash, setAcknowledgedCiHash] = useState<string>('')
  const [ciModalOpen, setCiModalOpen] = useState(false)

  // Détection bloquante de contre-indication absolue (Niveau 4 ANSM)
  useEffect(() => {
    const ciPairs = (result?.pairs ?? []).filter((p) => p.severity === 'CONTRE-INDIQUE')
    if (ciPairs.length > 0) {
      const hash = ciPairs
        .map((p) => [...p.drugs].sort().join('-'))
        .sort()
        .join(';')
      if (hash && hash !== acknowledgedCiHash) {
        setCiModalOpen(true)
      }
    } else {
      setCiModalOpen(false)
    }
  }, [result, acknowledgedCiHash])

  function handleAcknowledgeCi() {
    const ciPairs = (result?.pairs ?? []).filter((p) => p.severity === 'CONTRE-INDIQUE')
    const hash = ciPairs
      .map((p) => [...p.drugs].sort().join('-'))
      .sort()
      .join(';')
    setAcknowledgedCiHash(hash)
    setCiModalOpen(false)
    toast({
      title: 'Prise de connaissance enregistrée',
      description: 'Vous avez accusé réception de la contre-indication absolue (Niveau 4).',
    })
  }

  function handleSelect(name: Parameters<typeof addToBasket>[0]) {
    // 1. Détection de doublon exact (même médicament)
    if (basket.some((b) => b.id === name.id)) {
      toast({ title: 'Déjà présent', description: `${name.brand} est déjà dans le panier.` })
      return
    }

    // 2. Détection de doublon de DCI (même principe actif -> risque de surdosage / redondance)
    const norm = (s?: string | null) =>
      (s || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const targetDci = norm(name.dci)
    const duplicateDciDrug = targetDci ? basket.find((b) => norm(b.dci) === targetDci) : null

    const res = addToBasket(name)
    if (res === 'added') {
      if (duplicateDciDrug) {
        toast({
          title: '⚠️ Attention : Doublon de DCI détecté !',
          description: `« ${name.brand} » partage la même molécule (${name.dci}) que « ${duplicateDciDrug.brand} » déjà présent dans le panier. Risque majeur de surdosage !`,
          variant: 'destructive',
          duration: 7000,
        })
      } else {
        toast({
          title: 'Médicament ajouté',
          description: `${name.brand} (${name.dci}) — ${basket.length + 1} produit(s) dans le panier.`,
        })
      }
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

            {/* Prescriptions à haut risque / 1-Clic Presets */}
            <div className="space-y-2 rounded-xl border border-border/70 bg-card/40 p-3">
              <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Flame className="size-3.5 text-state-danger" aria-hidden />
                  Cas cliniques fréquents (1-clic)
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Associations à risque
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {HIGH_RISK_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="group flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1 text-left text-xs transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
                    title={`${p.label} : ${p.shortDesc}`}
                  >
                    <span
                      className={cn(
                        'size-1.5 shrink-0 rounded-full',
                        p.severity === 'CONTRE-INDIQUE' ? 'bg-state-danger' : 'bg-state-warning'
                      )}
                      aria-hidden
                    />
                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {p.label}
                    </span>
                    <span className="hidden text-[10px] text-muted-foreground sm:inline">
                      · {p.shortDesc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

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
                    Analyse…
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
                Vérification des {basket.length} médicaments en cours…
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* Légende permanente des niveaux d'interaction ANSM & MIPH (Phase 1.5) */}
        <SeverityLegendCard />
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
              Vérification des {basket.length} médicaments du panier.
            </p>
          </div>
        ) : result ? (
          <div className="space-y-4">
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
                    {SEVERITY_LABELS[s]}
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

            {/* Urgences + rappel professionnel au point d'usage (audit 1.9) */}
            <Alert
              variant="default"
              className="border-state-danger/40 bg-state-danger/5 text-state-danger"
              role="note"
              aria-label="En cas d'urgence"
            >
              <Siren className="size-4 shrink-0" aria-hidden />
              <AlertTitle className="text-sm font-semibold">En cas d&apos;urgence</AlertTitle>
              <AlertDescription className="text-xs leading-relaxed text-foreground/90">
                <p>
                  Réaction grave (allergie, surdosage, malaise)&nbsp;: appelez immédiatement le{' '}
                  <a
                    href="tel:14"
                    className="font-semibold text-state-danger underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    SAMU&nbsp;<strong className="font-bold">14</strong>
                  </a>{' '}
                  ou le{' '}
                  <a
                    href="tel:021713042"
                    className="font-semibold text-state-danger underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      <Ambulance className="size-3.5 shrink-0" aria-hidden />
                      Centre Anti-Poison (Alger)
                    </span>{' '}
                    <strong className="font-bold">021&nbsp;71&nbsp;30&nbsp;42</strong>
                  </a>
                  .
                </p>
              </AlertDescription>
            </Alert>

            <p className="text-xs text-muted-foreground">
              Usage professionnel — vérifiez toujours les RCP officiels avant toute décision
              clinique.
            </p>

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Ne remplace pas la validation pharmaceutique ni l&apos;avis médical.
            </p>
          </div>
        ) : null}
      </div>

      {/* Modal bloquant pour Contre-indication Absolue Niveau 4 (Phase 1.6) */}
      <Level4ContraindicationModal
        open={ciModalOpen}
        onAcknowledge={handleAcknowledgeCi}
        pairs={result?.pairs ?? []}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Onglet 2 — Matrice des interactions (heatmap N×N triangulaire)      */
/* ------------------------------------------------------------------ */

type CellKind = InteractionSeverity | 'NONE'

const CELL_META: Record<CellKind, { icon: typeof Ban; short: string; label: string; className: string }> = {
  'CONTRE-INDIQUE': {
    icon: Ban,
    short: 'CI',
    label: 'Niveau 4 · Contre-indication absolue',
    className: 'bg-state-danger text-white hover:bg-state-danger/90 focus-visible:ring-2 focus-visible:ring-state-danger',
  },
  MAJEURE: {
    icon: AlertTriangle,
    short: 'DÉC',
    label: 'Niveau 3 · Association déconseillée',
    className: 'bg-state-severe text-white hover:bg-state-severe/90 focus-visible:ring-2 focus-visible:ring-state-severe',
  },
  MODEREE: {
    icon: AlertCircle,
    short: 'PRÉ',
    label: 'Niveau 2 · Précaution d\'emploi',
    className:
      'border border-state-warning/60 bg-state-warning/20 text-state-warning hover:bg-state-warning/30 focus-visible:ring-2 focus-visible:ring-state-warning',
  },
  MINEURE: {
    icon: Info,
    short: 'INFO',
    label: 'Niveau 1 · À prendre en compte',
    className:
      'border border-state-info/60 bg-state-info/20 text-state-info hover:bg-state-info/30 focus-visible:ring-2 focus-visible:ring-state-info',
  },
  NONE: {
    icon: Check,
    short: 'OK',
    label: "Pas d'interaction connue",
    className:
      'border border-state-none/40 bg-state-none/15 text-state-none hover:bg-state-none/25 focus-visible:ring-2 focus-visible:ring-state-none',
  },
}

/** Initiales lisibles d'une marque (3-4 premières lettres). */
function initials(brand: string): string {
  const clean = brand.trim().split(/[\s-]/)[0] ?? brand
  return clean.slice(0, 4).toUpperCase()
}

function MatrixPanel({ onGoToVerifier }: { onGoToVerifier: () => void }) {
  const basket = useDzPharm((s) => s.basket)
  const openDrug = useDzPharm((s) => s.openDrug)

  const truncated = basket.length > MAX_MATRIX
  const drugs = useMemo(() => basket.slice(0, MAX_MATRIX), [basket])
  const items = useMemo(() => drugs.map((d) => ({ name: d.brand, dci: d.dci })), [drugs])
  const idsKey = drugs.map((d) => d.id).join('|')

  const { data, isFetching } = useQuery({
    queryKey: ['interactions-matrix', idsKey],
    queryFn: () => postLocalInteractions(items),
    enabled: drugs.length >= 2,
    staleTime: 30 * 1000,
  })

  /** Paire d'interaction entre deux marques (null si aucune connue). */
  const pairFor = (a: string, b: string): InteractionPair | undefined =>
    (data?.pairs ?? []).find(
      (p) =>
        (p.drugs[0] === a && p.drugs[1] === b) || (p.drugs[0] === b && p.drugs[1] === a)
    )

  if (basket.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center">
        <Grid3x3 className="size-12 text-muted-foreground/40" aria-hidden />
        <p className="mt-4 text-base font-semibold text-foreground">
          La matrice nécessite au moins 2 médicaments
        </p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Ajoutez des médicaments au panier depuis l&apos;onglet «&nbsp;Vérificateur&nbsp;»
          (ou depuis une fiche médicament) — la matrice croise ensuite chaque paire et
          colore chaque association selon sa gravité.
        </p>
        <Button variant="outline" className="mt-5 gap-2" onClick={onGoToVerifier}>
          <Plus className="size-4" aria-hidden />
          Ajouter des médicaments
        </Button>
      </div>
    )
  }

  const risk = data ? RISK_META[data.globalRisk] : null
  const pairs = data?.pairs ?? []

  return (
    <div className="space-y-4">
      {/* Bandeau risque global */}
      <div
        className={cn(
          'flex flex-wrap items-start gap-4 rounded-xl border p-5',
          risk?.border,
          risk?.className
        )}
        role="status"
        aria-live="polite"
      >
        {data?.globalRisk === 'FAIBLE' ? (
          <ShieldCheck className={cn('size-8 shrink-0', risk?.icon)} aria-hidden />
        ) : (
          <ShieldAlert className={cn('size-8 shrink-0', risk?.icon)} aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-lg font-bold tracking-tight">
            {risk?.label ?? 'Analyse…'}
            <span className="rounded-full bg-card/60 px-2 py-0.5 text-xs font-semibold">
              Matrice {drugs.length}×{drugs.length} · {pairs.length} association
              {pairs.length > 1 ? 's' : ''} à risque
            </span>
            {isFetching ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground/90">
            {data?.summary ??
              "Croisez chaque paire de médicaments du panier — chaque cellule s'ouvre au clic pour le détail (mécanisme, conduite à tenir)."}
          </p>
        </div>
      </div>

      {truncated ? (
        <div
          className="flex items-center gap-2 rounded-lg border border-state-warning/40 bg-state-warning/10 px-4 py-2.5 text-sm text-state-warning"
          role="status"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          Panier de {basket.length} médicaments — max {MAX_MATRIX} pour la matrice :
          les {MAX_MATRIX} premiers produits du panier sont affichés.
        </div>
      ) : null}

      {/* ------------------- Matrice (desktop ≥ sm) ------------------- */}
      <Card className="hidden sm:block">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Grid3x3 className="size-4 text-primary" aria-hidden />
            Matrice des interactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="mx-auto grid w-full max-w-[560px] gap-1.5"
            style={{ gridTemplateColumns: `repeat(${drugs.length}, minmax(0, 1fr))` }}
            role="group"
            aria-label="Matrice des interactions médicamenteuses"
          >
            {drugs.map((row, i) =>
              drugs.map((col, j) => {
                if (i === j) {
                  return (
                    <div
                      key={`${i}-${j}`}
                      className="flex aspect-square min-h-11 items-center justify-center rounded-lg border border-border bg-muted/60 px-1"
                      title={`${row.brand} (${row.dci})`}
                    >
                      <span className="text-center text-[10px] leading-tight font-bold tracking-wide text-foreground/80 sm:text-xs">
                        {initials(row.brand)}
                      </span>
                    </div>
                  )
                }
                if (i > j) {
                  return <div key={`${i}-${j}`} className="aspect-square rounded-lg bg-transparent" aria-hidden />
                }
                return (
                  <MatrixCell
                    key={`${i}-${j}`}
                    a={row}
                    b={col}
                    pair={pairFor(row.brand, col.brand)}
                  />
                )
              })
            )}
          </motion.div>

          {/* Légende des couleurs */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-background/60 px-4 py-2.5">
            {(['CONTRE-INDIQUE', 'MAJEURE', 'MODEREE', 'MINEURE', 'NONE'] as CellKind[]).map((k) => {
              const meta = CELL_META[k]
              return (
                <span
                  key={k}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                >
                  <span
                    className={cn(
                      'flex size-4 items-center justify-center rounded',
                      meta.className.replace(/hover:[^\s]+/g, '')
                    )}
                    aria-hidden
                  >
                    <meta.icon className="size-2.5" />
                  </span>
                  {k === 'NONE' ? 'Pas d\u2019interaction connue' : meta.label}
                  <span className="rounded bg-muted px-1 font-mono text-[9px] font-bold text-foreground/70">
                    {meta.short}
                  </span>
                </span>
              )
            })}
          </div>

          {/* Correspondance initiales → médicaments */}
          <div className="mt-3 flex flex-wrap gap-2">
            {drugs.map((d, i) => (
              <button
                key={d.id}
                type="button"
                onClick={() => openDrug(d.id)}
                title="Ouvrir la fiche du médicament"
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="font-mono font-bold text-primary">{i + 1}</span>
                <span className="font-mono font-bold text-foreground/70">{initials(d.brand)}</span>
                <span className="max-w-[160px] truncate font-medium text-foreground">{d.brand}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ------------- Repli mobile : liste triée par gravité ------------- */}
      <div className="space-y-3 sm:hidden">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          <AlertTriangle className="size-4" aria-hidden />
          Paires par gravité décroissante
        </h2>
        {isFetching && pairs.length === 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Analyse des interactions…
          </div>
        ) : pairs.length === 0 ? (
          <Card className="border-state-safe/40 bg-state-safe/5">
            <CardContent className="flex items-center gap-3 p-4 text-sm text-foreground/90">
              <ShieldCheck className="size-5 shrink-0 text-state-safe" aria-hidden />
              Aucune interaction connue entre les {drugs.length} médicaments de la
              matrice ({MAX_MATRIX} max).
            </CardContent>
          </Card>
        ) : (
          pairs.map((pair, i) => <PairCard key={`${pair.drugs.join('-')}-${i}`} pair={pair} />)
        )}
      </div>

      {/* Légende permanente des niveaux d'interaction ANSM & MIPH (Phase 1.5) */}
      <SeverityLegendCard />

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Chaque cellule détaille l&apos;interaction au clic (mécanisme, conduite à tenir).
        L&apos;absence de coloration ne garantit pas l&apos;absence d&apos;interaction — le
        «&nbsp;Vérificateur&nbsp;» complète le contrôle.
      </p>
    </div>
  )
}

/** Cellule triangulaire supérieure : bouton + popover de détail de la paire. */
function MatrixCell({
  a,
  b,
  pair,
}: {
  a: { id: number; brand: string; dci: string }
  b: { id: number; brand: string; dci: string }
  pair?: InteractionPair
}) {
  const kind: CellKind = pair?.severity ?? 'NONE'
  const meta = CELL_META[kind]
  const Icon = meta.icon

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Interaction ${a.brand} et ${b.brand} : ${meta.label}`}
          className={cn(
            'flex aspect-square min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none',
            meta.className
          )}
        >
          <Icon className="size-4 shrink-0 sm:size-5" aria-hidden />
          <span className="text-[9px] font-bold tracking-wide sm:text-[10px]" aria-hidden>
            {meta.short}
          </span>
          <span className="sr-only">{meta.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-80 rounded-xl p-4">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-foreground">
          <span className="truncate">{a.brand}</span>
          <span className="text-muted-foreground" aria-hidden>
            +
          </span>
          <span className="truncate">{b.brand}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {a.dci} · {b.dci}
        </p>
        <div className="mt-2.5">
          {pair ? (
            <SeverityBadge severity={pair.severity} />
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-state-safe/40 bg-state-safe/10 px-2.5 py-0.5 text-xs font-medium text-state-safe">
              <ShieldCheck className="size-3" aria-hidden />
              Pas d&apos;interaction connue
            </span>
          )}
        </div>
        {pair ? (
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
        ) : (
          <p className="mt-3 text-sm text-foreground/90">
            Aucune interaction documentée entre ces deux molécules.
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
