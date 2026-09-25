'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useDzPharm } from './store'
import { syncToolQueryParams, readQueryParams } from '@/lib/clinical/url-sync'
import {
  Activity,
  Droplets,
  Info,
  ShieldAlert,
  UserRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { SafetyNote } from './safety-note'

/* ------------------------------------------------------------------ */
/* Calculs                                                             */
/* ------------------------------------------------------------------ */

/** Cockcroft-Gault (mL/min) — référence pour l'adaptation des posologies. */
export function cockcroft(
  age: number,
  weightKg: number,
  creatUmol: number,
  female: boolean
): number {
  if (age <= 0 || weightKg <= 0 || creatUmol <= 0) return 0
  // ClCr = (140 - âge) × poids / (SCr mg/dL × 72) ; SCr mg/dL = µmol/L ÷ 88.4
  const clcr = ((140 - age) * weightKg * 88.4) / (72 * creatUmol)
  return female ? clcr * 0.85 : clcr
}

/** MDRD simplifié (mL/min/1,73 m²) — stadification CKD. */
export function mdrd(
  age: number,
  creatUmol: number,
  female: boolean
): number {
  if (age <= 0 || creatUmol <= 0) return 0
  const scrMg = creatUmol / 88.4
  const g = 175 * Math.pow(scrMg, -1.154) * Math.pow(age, -0.203)
  return female ? g * 0.742 : g
}

type CkdStage = {
  stage: string
  label: string
  color: string
  bg: string
  border: string
}

function classify(eGfr: number): CkdStage {
  if (eGfr >= 90)
    return { stage: 'G1', label: 'Fonction rénale normale ou élevée', color: 'text-state-safe', bg: 'bg-state-safe/10', border: 'border-state-safe/30' }
  if (eGfr >= 60)
    return { stage: 'G2', label: 'Discrète diminution (G2)', color: 'text-state-safe', bg: 'bg-state-safe/10', border: 'border-state-safe/30' }
  if (eGfr >= 45)
    return { stage: 'G3a', label: 'Diminution légère à modérée (G3a)', color: 'text-state-warning', bg: 'bg-state-warning/10', border: 'border-state-warning/30' }
  if (eGfr >= 30)
    return { stage: 'G3b', label: 'Diminution modérée à sévère (G3b)', color: 'text-state-warning', bg: 'bg-state-warning/10', border: 'border-state-warning/30' }
  if (eGfr >= 15)
    return { stage: 'G4', label: 'Insuffisance rénale sévère (G4)', color: 'text-state-danger', bg: 'bg-state-danger/10', border: 'border-state-danger/30' }
  return { stage: 'G5', label: 'Insuffisance rénale terminale (G5)', color: 'text-state-danger', bg: 'bg-state-danger/10', border: 'border-state-danger/30' }
}

/* ------------------------------------------------------------------ */
/* Médicaments à adapter selon le ClCr                                 */
/* ------------------------------------------------------------------ */

type RenalStatus = 'ok' | 'caution' | 'adjust' | 'contra'

const STATUS_STYLE: Record<RenalStatus, { label: string; cls: string }> = {
  ok: { label: 'Dose standard', cls: 'border-state-safe/30 bg-state-safe/10 text-state-safe' },
  caution: { label: 'Prudence', cls: 'border-state-warning/30 bg-state-warning/10 text-state-warning' },
  adjust: { label: 'À adapter', cls: 'border-chifa/40 bg-chifa/10 text-chifa' },
  contra: { label: 'Contre-indiqué', cls: 'border-state-danger/40 bg-state-danger/10 text-state-danger' },
}

interface RenalDrugRule {
  dci: string
  class: string
  advice: string
  /** Statut en fonction du ClCr (mL/min). */
  at: (clcr: number) => RenalStatus
}

const RENAL_RULES: RenalDrugRule[] = [
  {
    dci: 'Metformine',
    class: 'Antidiabétique biguanide',
    advice: 'Max 500 mg × 2/j si ClCr 30-45 ; arrêt si < 30 (acidose lactique). Suspendre avant produit de contraste si ClCr < 60.',
    at: (c) => (c < 30 ? 'contra' : c < 45 ? 'adjust' : c < 60 ? 'caution' : 'ok'),
  },
  {
    dci: 'AINS (ibuprofène, diclofénac, kétoprofène…)',
    class: 'Anti-inflammatoires non stéroïdiens',
    advice: 'Risque d\'IRA (triple whammy avec IEC/ARA2 + diurétique). Éviter si ClCr < 60 ; CI absolue si < 30.',
    at: (c) => (c < 30 ? 'contra' : c < 60 ? 'adjust' : 'caution'),
  },
  {
    dci: 'Gentamicine, amikacine',
    class: 'Aminosides',
    advice: 'Adapter l\'intervalle (intervalles prolongés si ClCr < 60) et surveiller les taux résiduels + ototoxicité.',
    at: (c) => (c < 60 ? 'adjust' : 'caution'),
  },
  {
    dci: 'Allopurinol',
    class: 'Uricosurique',
    advice: 'Réduire la dose (ex. 100 mg/j) et titrer si ClCr < 30 ; risque de syndrome d\'hypersensibilité.',
    at: (c) => (c < 30 ? 'adjust' : c < 60 ? 'caution' : 'ok'),
  },
  {
    dci: 'Rivaroxaban, apixaban, dabigatran',
    class: 'Anticoagulants oraux directs',
    advice: 'Réduction de dose ou CI selon le ClCr (dabigatran CI si < 30) ; dabigatran éliminé à ~80 % par le rein.',
    at: (c) => (c < 30 ? 'contra' : c < 50 ? 'adjust' : 'ok'),
  },
  {
    dci: 'Vancomycine',
    class: 'Glycopeptide',
    advice: 'Suivi thérapeutique (taux résiduel 15-20 mg/L) ; espacer les administrations si ClCr < 60.',
    at: (c) => (c < 60 ? 'adjust' : 'caution'),
  },
  {
    dci: 'Digoxine',
    class: 'Digitalique',
    advice: 'Dose de charge à réduire, dose d\'entretien 0,125 mg un jour sur deux si ClCr < 50 ; surveiller digoxinémie.',
    at: (c) => (c < 50 ? 'adjust' : 'caution'),
  },
  {
    dci: 'Énoxaparine (HBPM)',
    class: 'Anticoagulant parentéral',
    advice: 'Adaptation posologique (1 mg/kg × 1/j) si ClCr < 30 ; risque hémorragique cumulatif.',
    at: (c) => (c < 30 ? 'adjust' : c < 60 ? 'caution' : 'ok'),
  },
  {
    dci: 'IEC (captopril, énalapril…) & ARA2',
    class: 'Antihypertenseurs',
    advice: 'Débuter prudemment, contrôler créatinine et kaliémie à 1-2 semaines ; risque d\'IRA fonctionnelle si sténose.',
    at: (c) => (c < 30 ? 'adjust' : 'caution'),
  },
  {
    dci: 'Spironolactone',
    class: 'Diurétique épargneur de K+',
    advice: 'CI si ClCr < 30 ou kaliémie > 5 mmol/L (hyperkaliémie menaçante).',
    at: (c) => (c < 30 ? 'contra' : c < 50 ? 'adjust' : 'caution'),
  },
]

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

export function RenalCalculator() {
  const pinnedPatient = useDzPharm((s) => s.pinnedPatient)
  const [age, setAge] = useState(65)
  const [weight, setWeight] = useState(70)
  const [creat, setCreat] = useState('90')
  const [female, setFemale] = useState(false)

  // Initialisation via paramètres URL ou patient épinglé
  useEffect(() => {
    const params = readQueryParams()
    if (!params) return
    const pAge = params.get('age')
    const pWeight = params.get('poids') || params.get('weight')
    const pCreat = params.get('creat') || params.get('creatinine')
    const pSexe = params.get('sexe') || params.get('gender')

    if (pAge && !isNaN(Number(pAge))) {
      setAge(Number(pAge))
    } else if (pinnedPatient?.ageYears) {
      setAge(pinnedPatient.ageYears)
    }

    if (pWeight && !isNaN(Number(pWeight))) {
      setWeight(Number(pWeight))
    } else if (pinnedPatient?.weightKg) {
      setWeight(pinnedPatient.weightKg)
    }

    if (pCreat) {
      setCreat(pCreat)
    }

    if (pSexe) {
      setFemale(pSexe === 'f' || pSexe === 'female' || pSexe === 'femme')
    } else if (pinnedPatient?.gender) {
      setFemale(pinnedPatient.gender === 'F')
    }
  }, [pinnedPatient])

  // Synchronisation continue vers l'URL
  useEffect(() => {
    syncToolQueryParams('renal', {
      age,
      poids: weight,
      creat,
      sexe: female ? 'f' : 'h',
    })
  }, [age, weight, creat, female])

  const creatVal = parseFloat(creat.replace(',', '.'))

  const { clcr, egfr, stage, valid } = useMemo(() => {
    const c = cockcroft(age, weight, Number.isFinite(creatVal) ? creatVal : 0, female)
    const e = mdrd(age, Number.isFinite(creatVal) ? creatVal : 0, female)
    return {
      clcr: c,
      egfr: e,
      stage: classify(e),
      valid: Number.isFinite(creatVal) && creatVal > 0 && age > 0 && weight > 0,
    }
  }, [age, weight, creatVal, female])

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* ------------------------------ Paramètres ------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Droplets className="size-5 text-primary" aria-hidden />
            Calculateur de fonction rénale
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Cockcroft-Gault (adaptation posologique) et MDRD (stadification CKD).
            Créatininémie en µmol/L.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sexe */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm">
              <UserRound className="size-3.5 text-muted-foreground" aria-hidden />
              Sexe
            </Label>
            <RadioGroup
              value={female ? 'f' : 'm'}
              onValueChange={(v) => setFemale(v === 'f')}
              className="grid grid-cols-2 gap-2"
            >
              <Label
                htmlFor="renal-m"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-sm font-medium transition-colors hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10 has-[[data-state=checked]]:text-primary"
              >
                <RadioGroupItem value="m" id="renal-m" className="sr-only" />
                Homme
              </Label>
              <Label
                htmlFor="renal-f"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-sm font-medium transition-colors hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10 has-[[data-state=checked]]:text-primary"
              >
                <RadioGroupItem value="f" id="renal-f" className="sr-only" />
                Femme
              </Label>
            </RadioGroup>
          </div>

          {/* Âge */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="renal-age" className="text-sm">Âge</Label>
              <span className="rounded-md bg-muted px-2 py-0.5 text-sm font-semibold tabular-nums">
                {age} ans
              </span>
            </div>
            <Slider
              id="renal-age"
              value={[age]}
              onValueChange={([v]) => setAge(v)}
              min={18}
              max={100}
              step={1}
              aria-label="Âge en années"
            />
          </div>

          {/* Poids */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="renal-weight" className="text-sm">Poids</Label>
              <span className="rounded-md bg-muted px-2 py-0.5 text-sm font-semibold tabular-nums">
                {weight} kg
              </span>
            </div>
            <Slider
              id="renal-weight"
              value={[weight]}
              onValueChange={([v]) => setWeight(v)}
              min={30}
              max={150}
              step={1}
              aria-label="Poids en kilogrammes"
            />
          </div>

          {/* Créatinine */}
          <div className="space-y-2">
            <Label htmlFor="renal-creat" className="text-sm">
              Créatininémie (µmol/L)
            </Label>
            <Input
              id="renal-creat"
              inputMode="decimal"
              value={creat}
              onChange={(e) => setCreat(e.target.value)}
              placeholder="ex. 90"
              className="h-11 text-lg font-semibold tabular-nums"
              aria-describedby="renal-creat-hint"
            />
            <p id="renal-creat-hint" className="text-xs text-muted-foreground">
              Norme usuelle : 62-106 µmol/L (homme), 44-80 (femme).{' '}
              {Number.isFinite(creatVal) && creatVal > 0 ? (
                <span className="text-muted-foreground/70">
                  ≈ {(creatVal / 88.4).toFixed(2)} mg/dL
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Formules valides chez l&apos;adulte (&gt; 18 ans) à fonction rénale
            stable. Ne s&apos;applique pas à la grossesse, l&apos;amaigrissement
            extrême ou la dialyse.
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------ Résultats ------------------------------ */}
      <div className="space-y-6">
        {valid ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-4 sm:grid-cols-2"
            >
              {/* ClCr Cockcroft */}
              <Card className={cn('border-2', stage.border)}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Droplets className="size-4 text-primary" aria-hidden />
                    ClCr Cockcroft-Gault
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold tracking-tight text-foreground tabular-nums">
                    {clcr.toFixed(0)}
                    <span className="ml-1 text-base font-medium text-muted-foreground">
                      mL/min
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Référence pour l&apos;adaptation des posologies
                  </p>
                </CardContent>
              </Card>

              {/* MDRD + stade */}
              <Card className={cn('border-2', stage.border)}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Activity className="size-4 text-primary" aria-hidden />
                    DFG MDRD
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold tracking-tight text-foreground tabular-nums">
                    {egfr.toFixed(0)}
                    <span className="ml-1 text-base font-medium text-muted-foreground">
                      mL/min/1,73 m²
                    </span>
                  </p>
                  <p className={cn('mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold', stage.bg, stage.border, stage.color)}>
                    Stade {stage.stage} — {stage.label}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Adaptations posologiques */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldAlert className="size-5 text-chifa" aria-hidden />
                  Médicaments à surveiller à ce niveau rénal
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Statut des principales molécules à élimination rénale pour un
                  ClCr de <strong className="text-foreground">{clcr.toFixed(0)} mL/min</strong> —
                  vérifiez toujours le RCP (onglet RCP de chaque fiche produit).
                </p>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="flex flex-wrap gap-2">
                  {(['ok', 'caution', 'adjust', 'contra'] as const).map((s) => (
                    <span
                      key={s}
                      className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', STATUS_STYLE[s].cls)}
                    >
                      {STATUS_STYLE[s].label}
                    </span>
                  ))}
                </div>
                <Separator className="my-1" />
                <div className="scroll-thin max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {RENAL_RULES.map((rule) => {
                    const st = rule.at(clcr)
                    return (
                      <div
                        key={rule.dci}
                        className="rounded-lg border border-border/70 bg-card/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                              {rule.dci}
                            </p>
                            <p className="text-xs text-muted-foreground">{rule.class}</p>
                          </div>
                          <span
                            className={cn(
                              'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                              STATUS_STYLE[st].cls
                            )}
                          >
                            {STATUS_STYLE[st].label}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">
                          {rule.advice}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Droplets className="size-10 text-muted-foreground/40" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Saisissez une créatininémie valide pour calculer la clairance.
              </p>
            </CardContent>
          </Card>
        )}
        <SafetyNote className="mt-4" />
      </div>
    </div>
  )
}
