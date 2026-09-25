'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { syncToolQueryParams, readQueryParams } from '@/lib/clinical/url-sync'
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Info,
  PhoneCall,
  Printer,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Types & Cibles INR                                                  */
/* ------------------------------------------------------------------ */

export type AvkMolecule = 'sintrom' | 'minisintrom' | 'coumadine'

export interface InrTarget {
  id: string
  label: string
  range: [number, number]
  targetMid: number
  description: string
}

export const INR_TARGETS: InrTarget[] = [
  {
    id: 'standard',
    label: 'Standard (FA, MTEV, Prothèse aortique)',
    range: [2.0, 3.0],
    targetMid: 2.5,
    description: 'Fibrillation Atriale, Thrombose Veineuse Profonde, Embolie Pulmonaire, Valve biologique.',
  },
  {
    id: 'mitral_valve',
    label: 'Haut risque (Prothèse mécanique mitrale)',
    range: [2.5, 3.5],
    targetMid: 3.0,
    description: 'Valve cardiaque mécanique en position mitrale ou tricuspide, ou embolie récidivante.',
  },
  {
    id: 'high_risk_custom',
    label: 'Prothèse mécanique de génération ancienne',
    range: [3.0, 4.0],
    targetMid: 3.5,
    description: 'Valves à bille (Starr-Edwards) ou à disque basculant à fort pouvoir thrombogène.',
  },
]

export interface TitrationResult {
  status: 'severe_under' | 'mild_under' | 'in_target' | 'mild_over' | 'moderate_over' | 'severe_over' | 'critical'
  badgeLabel: string
  badgeColor: string
  badgeBg: string
  badgeBorder: string
  advice: string
  suggestedWeeklyAdjustmentPercent: number
  recontrolDays: string
  reversalProtocol?: string
  emergency: boolean
}

export function evaluateInr(inr: number, target: InrTarget, currentWeeklyDoseMg: number): TitrationResult {
  const [minTarget, maxTarget] = target.range

  // Dans la cible
  if (inr >= minTarget && inr <= maxTarget) {
    return {
      status: 'in_target',
      badgeLabel: 'INR équilibré dans la cible',
      badgeColor: 'text-state-safe',
      badgeBg: 'bg-state-safe/10',
      badgeBorder: 'border-state-safe/30',
      advice: 'Poursuivre la même posologie hebdomadaire sans modification. Traitement équilibré.',
      suggestedWeeklyAdjustmentPercent: 0,
      recontrolDays: 'Contrôle INR dans 3 à 4 semaines (ou 15 jours si équilibre récent).',
      emergency: false,
    }
  }

  // Sous-dosage léger
  if (inr >= minTarget - 0.5 && inr < minTarget) {
    return {
      status: 'mild_under',
      badgeLabel: 'Sous-dosage modéré',
      badgeColor: 'text-state-warning',
      badgeBg: 'bg-state-warning/10',
      badgeBorder: 'border-state-warning/30',
      advice: 'Augmenter la posologie hebdomadaire d’environ 10 % (soit +1/4 à +1/2 cp par semaine). Ne pas administrer de dose de charge excessive.',
      suggestedWeeklyAdjustmentPercent: 10,
      recontrolDays: 'Contrôle INR dans 7 à 10 jours.',
      emergency: false,
    }
  }

  // Sous-dosage sévère
  if (inr < minTarget - 0.5) {
    return {
      status: 'severe_under',
      badgeLabel: 'Sous-dosage sévère (Risque thrombotique)',
      badgeColor: 'text-state-danger',
      badgeBg: 'bg-state-danger/10',
      badgeBorder: 'border-state-danger/30',
      advice: 'Augmenter la posologie hebdomadaire de 15 à 20 %. Rechercher un oubli de prise ou une interaction inductrice (millepertuis, rifampicine, carbamazépine). Si valve mécanique à haut risque, envisager un relais héparine transitoire.',
      suggestedWeeklyAdjustmentPercent: 20,
      recontrolDays: 'Contrôle impératif à J+3 ou J+4.',
      emergency: false,
    }
  }

  // Surdosage modéré (au-dessus de la cible mais < 4.0)
  if (inr > maxTarget && inr <= 4.0) {
    return {
      status: 'mild_over',
      badgeLabel: 'Surdosage léger à modéré',
      badgeColor: 'text-state-warning',
      badgeBg: 'bg-state-warning/10',
      badgeBorder: 'border-state-warning/30',
      advice: 'Sauter 1/2 prise ou réduire la posologie hebdomadaire de 10 %. Rechercher une interaction inhibitrice (antibiotique, AINS, paracétamol à forte dose).',
      suggestedWeeklyAdjustmentPercent: -10,
      recontrolDays: 'Contrôle INR dans 3 à 5 jours.',
      emergency: false,
    }
  }

  // Surdosage net (4.0 à 6.0)
  if (inr > 4.0 && inr <= 6.0) {
    return {
      status: 'moderate_over',
      badgeLabel: 'Surdosage net (Risque hémorragique)',
      badgeColor: 'text-state-danger',
      badgeBg: 'bg-state-danger/10',
      badgeBorder: 'border-state-danger/30',
      advice: 'Sauter 1 prise complète. Reprendre ensuite à une posologie hebdomadaire réduite de 15 à 20 %. Pas de vitamine K systématique en l’absence de saignement.',
      suggestedWeeklyAdjustmentPercent: -15,
      recontrolDays: 'Contrôle INR à 24h ou 48h.',
      emergency: false,
    }
  }

  // Surdosage très élevé (6.0 à 10.0 sans saignement)
  if (inr > 6.0 && inr <= 10.0) {
    return {
      status: 'severe_over',
      badgeLabel: 'Surdosage sévère (INR 6 - 10)',
      badgeColor: 'text-state-danger',
      badgeBg: 'bg-state-danger/10',
      badgeBorder: 'border-state-danger/30',
      advice: 'Arrêt de l’AVK pendant 1 à 2 prises. Administrer de la Vitamine K par voie orale (1 à 2 mg, soit quelques gouttes d’ampoule buvable). Surveillance clinique stricte.',
      suggestedWeeklyAdjustmentPercent: -25,
      recontrolDays: 'Contrôle INR impératif le lendemain à 24h.',
      reversalProtocol: 'Protocole HAS : Vitamine K1 per os (1 à 2 mg). Si saignement : hospitalisation d’urgence.',
      emergency: true,
    }
  }

  // INR > 10 ou critique
  return {
    status: 'critical',
    badgeLabel: 'URGENCE : Surdosage critique (INR > 10)',
    badgeColor: 'text-state-danger font-black animate-pulse',
    badgeBg: 'bg-state-danger/20',
    badgeBorder: 'border-state-danger',
    advice: 'URGENCE MÉDICALE : Arrêt immédiat de l’AVK. Administrer 5 mg de Vitamine K1 par voie orale. En cas de saignement ou traumatisme : transfert médicalisé d’urgence (SAMU 14) pour perfusion de concentré de complexe prothrombinique (CCP / Facteurs de coagulation) + Vitamine K1 10 mg IV lente.',
    suggestedWeeklyAdjustmentPercent: -50,
    recontrolDays: 'Contrôle immédiat et surveillance hospitalière continue.',
    reversalProtocol: 'CCP (Kaskadil/Octaplex) 25 UI/kg + Vitamine K1 5-10 mg. Contacter le Centre Anti-Poison ou le SAMU.',
    emergency: true,
  }
}

/* ------------------------------------------------------------------ */
/* Composant WarfarinInrCalculator                                     */
/* ------------------------------------------------------------------ */

export function WarfarinInrCalculator() {
  const [molecule, setMolecule] = useState<AvkMolecule>('sintrom')
  const [targetId, setTargetId] = useState<string>('standard')
  const [inrInput, setInrInput] = useState<string>('2.4')
  const [dailyDoseTablets, setDailyDoseTablets] = useState<string>('0.5') // 1/2 cp par jour = standard Sintrom 4mg

  // Initialisation via paramètres URL
  useEffect(() => {
    const params = readQueryParams()
    if (!params) return
    const pMol = params.get('molecule') as AvkMolecule | null
    const pTarget = params.get('cible') || params.get('target')
    const pInr = params.get('inr')
    const pDose = params.get('dose')

    if (pMol && ['sintrom', 'minisintrom', 'coumadine'].includes(pMol)) {
      setMolecule(pMol)
    }
    if (pTarget && INR_TARGETS.some((t) => t.id === pTarget)) {
      setTargetId(pTarget)
    }
    if (pInr) {
      setInrInput(pInr)
    }
    if (pDose) {
      setDailyDoseTablets(pDose)
    }
  }, [])

  // Synchronisation continue vers l'URL
  useEffect(() => {
    syncToolQueryParams('avk-inr', {
      molecule: molecule !== 'sintrom' ? molecule : undefined,
      cible: targetId !== 'standard' ? targetId : undefined,
      inr: inrInput,
      dose: dailyDoseTablets,
    })
  }, [molecule, targetId, inrInput, dailyDoseTablets])

  const selectedTarget = useMemo(() => {
    return INR_TARGETS.find((t) => t.id === targetId) || INR_TARGETS[0]
  }, [targetId])

  const parsedInr = useMemo(() => {
    return parseFloat(inrInput) || 2.0
  }, [inrInput])

  const parsedDailyTablets = useMemo(() => {
    return parseFloat(dailyDoseTablets) || 0.5
  }, [dailyDoseTablets])

  const tabletStrengthMg = molecule === 'sintrom' ? 4 : molecule === 'minisintrom' ? 1 : 5
  const currentWeeklyDoseMg = parsedDailyTablets * tabletStrengthMg * 7

  const result = useMemo(() => {
    return evaluateInr(parsedInr, selectedTarget, currentWeeklyDoseMg)
  }, [parsedInr, selectedTarget, currentWeeklyDoseMg])

  // Génération du calendrier hebdomadaire ajusté
  const scheduleDays = useMemo(() => {
    const adjustmentFactor = 1 + result.suggestedWeeklyAdjustmentPercent / 100
    const newWeeklyTablets = parsedDailyTablets * 7 * adjustmentFactor
    const avgDailyTablets = newWeeklyTablets / 7

    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
    return days.map((day, idx) => {
      // Alternance intelligente si demi ou quart de comprimé
      let dose = avgDailyTablets
      if (Math.abs(avgDailyTablets - 0.5) < 0.1) {
        dose = 0.5
      } else if (Math.abs(avgDailyTablets - 0.75) < 0.1) {
        dose = idx % 2 === 0 ? 0.75 : 0.5
      }
      return {
        day,
        tablets: parseFloat(dose.toFixed(2)),
        label:
          dose === 0.25
            ? '1/4 cp'
            : dose === 0.5
            ? '1/2 cp'
            : dose === 0.75
            ? '3/4 cp'
            : dose === 1
            ? '1 cp'
            : `${dose.toFixed(2)} cp`,
      }
    })
  }, [parsedDailyTablets, result.suggestedWeeklyAdjustmentPercent])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <Activity className="size-5 text-primary" aria-hidden />
            Nomogramme INR &amp; Titration des AVK (Sintrom / Warfarine)
          </h2>
          <p className="text-sm text-muted-foreground">
            Aide à l’équilibrage posologique, calendrier de prises hebdomadaires et conduite à tenir en cas de surdosage.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handlePrint}
          className="gap-1.5 text-xs font-semibold"
        >
          <Printer className="size-3.5" />
          Imprimer le calendrier
        </Button>
      </div>

      {/* Configuration clinique */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Paramètres du traitement AVK</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Choix molécule */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Médicament anticoagulant prescrit</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={molecule === 'sintrom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMolecule('sintrom')}
                  className="h-9 text-xs flex flex-col items-center justify-center p-1"
                >
                  <span className="font-bold">Sintrom 4 mg</span>
                  <span className="text-[10px] opacity-80">Acénocoumarol</span>
                </Button>

                <Button
                  type="button"
                  variant={molecule === 'minisintrom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMolecule('minisintrom')}
                  className="h-9 text-xs flex flex-col items-center justify-center p-1"
                >
                  <span className="font-bold">Minisintrom 1 mg</span>
                  <span className="text-[10px] opacity-80">Acénocoumarol</span>
                </Button>

                <Button
                  type="button"
                  variant={molecule === 'coumadine' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMolecule('coumadine')}
                  className="h-9 text-xs flex flex-col items-center justify-center p-1"
                >
                  <span className="font-bold">Coumadine 2/5 mg</span>
                  <span className="text-[10px] opacity-80">Warfarine</span>
                </Button>
              </div>
            </div>

            <Separator />

            {/* Indication & Cible */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Indication clinique &amp; Zone cible d’INR</Label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-xs font-medium"
              >
                {INR_TARGETS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} (Cible : {t.range[0]} - {t.range[1]})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground italic">
                {selectedTarget.description}
              </p>
            </div>

            <Separator />

            {/* Valeur mesurée d'INR & Posologie actuelle */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inr-val" className="text-xs font-bold text-foreground">
                  Dernier INR mesuré
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="inr-val"
                    type="number"
                    min="0.5"
                    max="15"
                    step="0.05"
                    value={inrInput}
                    onChange={(e) => setInrInput(e.target.value)}
                    className="font-mono text-lg font-bold"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Zone cible visée : {selectedTarget.range[0]} - {selectedTarget.range[1]}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="daily-dose" className="text-xs font-bold text-foreground">
                  Prise journalière moyenne
                </Label>
                <Input
                  id="daily-dose"
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.25"
                  value={dailyDoseTablets}
                  onChange={(e) => setDailyDoseTablets(e.target.value)}
                  className="font-mono text-lg font-bold"
                />
                <span className="text-[10px] text-muted-foreground">
                  En nombre de comprimés / jour
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diagnostic & Conduite à tenir */}
        <div className="space-y-4 lg:col-span-6">
          <Card className={cn('border-2 transition-all', result.badgeBorder, result.badgeBg)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Évaluation Biologique
                </span>
                <Badge className={cn('text-xs font-bold', result.badgeColor, result.badgeBg)}>
                  INR {parsedInr}
                </Badge>
              </div>
              <CardTitle className={cn('text-xl font-black', result.badgeColor)}>
                {result.badgeLabel}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 pt-1">
              <div className="rounded-lg bg-background/80 p-3.5 shadow-sm space-y-2 text-xs">
                <p className="font-bold text-foreground">Conduite à tenir recommandée :</p>
                <p className="leading-relaxed text-foreground/90">{result.advice}</p>

                {result.reversalProtocol && (
                  <div className="mt-2 rounded border border-state-danger/40 bg-state-danger/10 p-2.5 text-xs text-state-danger font-medium space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertOctagon className="size-3.5" />
                      Protocole d’antagonisation urgente :
                    </p>
                    <p>{result.reversalProtocol}</p>
                  </div>
                )}

                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground font-medium">
                  <Clock className="size-3 text-primary" />
                  {result.recontrolDays}
                </div>
              </div>

              {result.emergency && (
                <div className="rounded-lg bg-red-600 p-3 text-white flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs uppercase tracking-wider">Urgence Vitale Hémorragique</p>
                    <p className="text-[11px] opacity-90">Contacter immédiatement les secours médicalisés.</p>
                  </div>
                  <a
                    href="tel:14"
                    className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-bold text-red-600 shadow transition-transform active:scale-95"
                  >
                    <PhoneCall className="size-3.5" />
                    SAMU 14
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Calendrier Hebdomadaire Imprimable */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Calendar className="size-4 text-primary" />
              Calendrier d’Observance Hebdomadaire Proposé
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Ajustement calculé : {result.suggestedWeeklyAdjustmentPercent > 0 ? '+' : ''}
              {result.suggestedWeeklyAdjustmentPercent} %
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
            {scheduleDays.map((d) => (
              <div
                key={d.day}
                className="flex flex-col items-center justify-center rounded-lg border bg-muted/20 p-3 text-center transition-colors hover:bg-muted/40"
              >
                <span className="text-xs font-semibold text-muted-foreground mb-1">{d.day}</span>
                <span className="font-mono text-base font-black text-foreground">{d.label}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {(d.tablets * tabletStrengthMg).toFixed(1)} mg
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Info className="size-3.5 text-primary" />
              Consignes essentielles délivrées au comptoir :
            </p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Prendre le traitement à heure fixe le soir (18h-20h) avec un verre d’eau.</li>
              <li>Ne jamais doubler la prise le lendemain en cas d’oubli. Noter tout oubli sur le carnet d’INR.</li>
              <li>Éviter formellement l’automédication par AINS (Ibuprofène, Kétoprofène) ou Aspirine.</li>
              <li>Conserver un apport régulier en aliments riches en vitamine K (choux, épinards, brocolis) sans variation brusque.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
