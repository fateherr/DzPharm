'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Barcode,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  Printer,
  Receipt,
  RotateCcw,
  Sparkles,
  Timer,
  Plus,
  Trash2,
  Search,
  User,
  HeartPulse,
  Info,
  ChevronRight,
  Eye,
  Camera,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useDzPharm } from './store'
import { SearchAutocomplete } from './search-autocomplete'
import { fetchDrugDetail, postLocalInteractions } from './api'
import type { Drug, ChifaCardType, InteractionPair } from './types'
import { formatPrice } from './status-badge'
import { checkLasaRisk, checkHighAlert, getTallManLettering } from '@/lib/lasa'
import { ThermalPosologySlip, type ThermalSlipLine } from './thermal-posology-slip'
import { PictographicPosologyGenerator } from './pictographic-posology'

export interface DispensingItem {
  id: string
  drugId?: number
  brand: string
  dci: string
  form: string
  dosage: string
  quantity: number
  price: number // PPA
  tariffRef?: number // Tarif de référence Chifa
  refundable: boolean
  posology: string
  timing: string
  withFood?: 'during' | 'before' | 'after' | 'any'
  durationDays: number
  precaution?: string
}

const PRESET_PRESCRIPTIONS: Record<string, { label: string; items: DispensingItem[] }> = {
  diabete_hta: {
    label: 'Diabète T2 + HTA (Chronique)',
    items: [
      {
        id: 'p1',
        brand: 'GLUCOPHAGE 1000 mg',
        dci: 'METFORAMINE CHLORHYDRATE',
        form: 'Comprimé',
        dosage: '1000 mg',
        quantity: 2,
        price: 450.0,
        tariffRef: 420.0,
        refundable: true,
        posology: '1 cp matin et soir',
        timing: 'Matin & Soir',
        withFood: 'during',
        durationDays: 30,
        precaution: 'Prendre impérativement au cours du repas (tolérance digestive)',
      },
      {
        id: 'p2',
        brand: 'AMLOR 5 mg',
        dci: 'AMLODIPINE BESILATE',
        form: 'Gélule',
        dosage: '5 mg',
        quantity: 1,
        price: 680.0,
        tariffRef: 600.0,
        refundable: true,
        posology: '1 gélule le matin',
        timing: 'Matin',
        withFood: 'any',
        durationDays: 30,
        precaution: 'Surveiller éventuels oedèmes des chevilles',
      },
      {
        id: 'p3',
        brand: 'TAHOR 20 mg',
        dci: 'ATORVASTATINE CALCIQUE',
        form: 'Comprimé pelliculé',
        dosage: '20 mg',
        quantity: 1,
        price: 1100.0,
        tariffRef: 950.0,
        refundable: true,
        posology: '1 cp le soir au coucher',
        timing: 'Coucher',
        withFood: 'any',
        durationDays: 30,
        precaution: 'Signaler immédiatement toute douleur musculaire inexpliquée',
      },
    ],
  },
  angine: {
    label: 'Infection Respiratoire Aiguë',
    items: [
      {
        id: 'p4',
        brand: 'CLAMOXYL 1 g',
        dci: 'AMOXICILLINE TRIHYDRATE',
        form: 'Comprimé dispersible',
        dosage: '1 g',
        quantity: 2,
        price: 520.0,
        tariffRef: 480.0,
        refundable: true,
        posology: '1 cp 2 fois par jour',
        timing: 'Matin & Soir',
        withFood: 'during',
        durationDays: 6,
        precaution: 'Ne pas arrêter le traitement avant 6 jours complets',
      },
      {
        id: 'p5',
        brand: 'DOLIPRANE 1000 mg',
        dci: 'PARACETAMOL',
        form: 'Comprimé',
        dosage: '1000 mg',
        quantity: 1,
        price: 180.0,
        tariffRef: 180.0,
        refundable: true,
        posology: '1 cp toutes les 6 heures si douleur',
        timing: 'Si besoin',
        withFood: 'any',
        durationDays: 5,
        precaution: 'Espacer les prises de 6 heures minimum (Max 3g/jour)',
      },
    ],
  },
}

export function CounterDispensingWorkflow() {
  const { toast } = useToast()
  const pinnedPatient = useDzPharm((s) => s.pinnedPatient)
  const setScannerOpen = useDzPharm((s) => s.setScannerOpen)

  // Étape courante du flux
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Chronomètre de délivrance (< 15 secondes)
  const [elapsedSec, setElapsedSec] = useState<number>(0)
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true)

  // Articles en cours de délivrance
  const [items, setItems] = useState<DispensingItem[]>(PRESET_PRESCRIPTIONS.diabete_hta.items)

  // Données Chifa
  const [cardType, setCardType] = useState<ChifaCardType>('ald')
  const [chifaNumber, setChifaNumber] = useState<string>('01 84 92 12345 67')

  // Vue d'impression sélectionnée à l'étape 4
  const [handoutView, setHandoutView] = useState<'thermal' | 'picto'>('thermal')

  // Chronomètre automatique
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSec((s) => +(s + 0.1).toFixed(1))
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

  function resetSession() {
    setItems([])
    setStep(1)
    setElapsedSec(0)
    setIsTimerRunning(true)
  }

  function loadPreset(key: keyof typeof PRESET_PRESCRIPTIONS) {
    setItems(PRESET_PRESCRIPTIONS[key].items)
    setElapsedSec(0)
    setIsTimerRunning(true)
    toast({
      title: 'Ordonnance type chargée',
      description: PRESET_PRESCRIPTIONS[key].label,
    })
  }

  async function handleAddDrugFromCatalog(drug: Drug) {
    try {
      const res = await fetchDrugDetail(drug.id)
      const detail = res.drug
      const ppa = detail.price || detail.pharmacy?.[0]?.ppa || 250.0
      const newItem: DispensingItem = {
        id: Math.random().toString(36).substring(2, 9),
        drugId: drug.id,
        brand: drug.brand,
        dci: drug.dci,
        form: drug.form || 'Comprimé',
        dosage: drug.dosage || '',
        quantity: 1,
        price: ppa,
        tariffRef: ppa * 0.9,
        refundable: drug.refundable ?? true,
        posology: '1 prise par jour',
        timing: 'Matin',
        withFood: 'during',
        durationDays: 30,
        precaution: 'Prendre régulièrement avec un verre d’eau',
      }
      setItems((prev) => [...prev, newItem])
      toast({
        title: 'Médicament ajouté au comptoir',
        description: `${drug.brand} (${formatPrice(ppa)})`,
      })
    } catch {
      toast({
        title: 'Erreur lors du chargement',
        variant: 'destructive',
      })
    }
  }

  function removeItem(id: string) {
    setItems(items.filter((i) => i.id !== id))
  }

  function updateItem(id: string, patch: Partial<DispensingItem>) {
    setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  // --- Calculs Financiers Chifa ---
  const financialTotals = useMemo(() => {
    const totalPPA = items.reduce((s, it) => s + it.price * it.quantity, 0)
    const cardRate = cardType === 'ald' ? 1.0 : cardType === 'standard' || cardType === 'casnos' ? 0.8 : 0.0

    let baseRemboursable = 0
    let partCaisse = 0
    let depassementTR = 0

    items.forEach((it) => {
      if (it.refundable && cardRate > 0) {
        const tr = (it.tariffRef || it.price) * it.quantity
        const ppaTotal = it.price * it.quantity
        baseRemboursable += tr
        partCaisse += tr * cardRate
        if (ppaTotal > tr) {
          depassementTR += ppaTotal - tr
        }
      }
    })

    const ticketModerateur = baseRemboursable - partCaisse
    const resteAPayer = totalPPA - partCaisse

    return {
      totalPPA,
      baseRemboursable,
      partCaisse,
      ticketModerateur,
      depassementTR,
      resteAPayer,
    }
  }, [items, cardType])

  // --- Contrôles de Sécurité Clinique ---
  const safetyChecks = useMemo(() => {
    const alerts: Array<{ type: 'danger' | 'warning' | 'info'; title: string; message: string }> = []

    // 1. Vérification doublons de DCI
    const dciMap = new Map<string, string[]>()
    items.forEach((it) => {
      const normDci = it.dci.trim().toUpperCase()
      const existing = dciMap.get(normDci) || []
      existing.push(it.brand)
      dciMap.set(normDci, existing)
    })

    dciMap.forEach((brands, dci) => {
      if (brands.length > 1) {
        alerts.push({
          type: 'danger',
          title: `Doublon de molécule détecté (${dci})`,
          message: `La molécule est prescrite plusieurs fois : ${brands.join(' + ')}. Risque de surdosage aigu.`,
        })
      }
    })

    // 2. Vérification LASA & Haute Vigilance
    items.forEach((it) => {
      const highAlert = checkHighAlert(it.brand, it.dci)
      if (highAlert) {
        alerts.push({
          type: 'danger',
          title: `Médicament à Haute Vigilance (${highAlert.category})`,
          message: `${it.brand} — ${highAlert.warning} (${highAlert.checkpoints.slice(0, 2).join(', ')})`,
        })
      }

      const lasa = checkLasaRisk(it.brand, it.dci)
      if (lasa) {
        alerts.push({
          type: 'warning',
          title: `Risque de confusion LASA : ${lasa.tallMan}`,
          message: `Ne pas confondre avec : ${lasa.confusedWith} (${lasa.clinicalDifference})`,
        })
      }
    })

    // 3. Vérification Contexte Patient Épinglé (Rein, Foie, Grossesse)
    if (pinnedPatient) {
      if (pinnedPatient.clcr && pinnedPatient.clcr < 30) {
        alerts.push({
          type: 'danger',
          title: `Insuffisance Rénale Sévère (ClCr: ${pinnedPatient.clcr} mL/min)`,
          message: 'Vérifier impérativement les posologies rénales des molécules prescrites.',
        })
      }
      if (pinnedPatient.childPughClass === 'C') {
        alerts.push({
          type: 'danger',
          title: `Insuffisance Hépatique Sévère (Child-Pugh C)`,
          message: 'Contre-indication ou adaptation drastique pour les métabolismes hépatiques.',
        })
      }
      if (pinnedPatient.isPregnant) {
        alerts.push({
          type: 'warning',
          title: `Patiente Enceinte (${pinnedPatient.pregnancyTrimester || '1er'} trimestre)`,
          message: 'Contrôler la compatibilité CRAT / tératogénicité de chaque ligne.',
        })
      }
      if (pinnedPatient.allergies && pinnedPatient.allergies.length > 0) {
        alerts.push({
          type: 'danger',
          title: `Allergies connues : ${pinnedPatient.allergies.join(', ')}`,
          message: 'Attention aux allergies croisées (pénicillines, sulfamides, AINS).',
        })
      }
    }

    return alerts
  }, [items, pinnedPatient])

  // Conversion en format pour ticket thermique
  const thermalLines: ThermalSlipLine[] = useMemo(() => {
    return items.map((it) => ({
      id: it.id,
      brand: it.brand,
      dci: it.dci,
      form: it.form,
      dosage: it.dosage,
      posology: it.posology,
      timing: it.timing,
      withFood: it.withFood,
      precaution: it.precaution,
      durationDays: it.durationDays,
      price: it.price * it.quantity,
      isHighAlert: !!checkHighAlert(it.brand, it.dci),
    }))
  }, [items])

  return (
    <div className="space-y-6">
      {/* En-tête Le Comptoir + Chronomètre */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">Le Comptoir d&apos;Officine</span>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
              Workflow Express 4 Étapes
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Délivrance sécurisée <span className="font-semibold text-foreground">&lt; 15 secondes</span> : Scan → Chifa → Contrôle Sécurité → Remise Patient
          </p>
        </div>

        {/* Indicateur Chrono & Reset */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold ${
            elapsedSec <= 15
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
          }`}>
            <Timer className="size-4 animate-pulse" />
            <span>{elapsedSec.toFixed(1)} s</span>
            <span className="text-[10px] uppercase font-sans font-normal opacity-80">
              {elapsedSec <= 15 ? 'Cadence optimale' : 'Revue approfondie'}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetSession}
            className="gap-1.5 text-xs"
          >
            <RotateCcw className="size-3.5" />
            Nouvelle ordonnance
          </Button>
        </div>
      </div>

      {/* Barre de navigation 4 Étapes */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { num: 1, label: '1. Scan & Médicaments', count: items.length },
          { num: 2, label: '2. Tiers-Payant Chifa', count: `${financialTotals.resteAPayer.toFixed(0)} DA` },
          { num: 3, label: '3. Verrou Sécurité', count: `${safetyChecks.length} alerte(s)` },
          { num: 4, label: '4. Remise & Impression', count: '80mm / Picto' },
        ].map((s) => {
          const isActive = step === s.num
          const isDone = step > s.num
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num as typeof step)}
              className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                isActive
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 font-bold'
                  : isDone
                  ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-900 dark:text-emerald-300'
                  : 'border-border/60 bg-muted/20 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex justify-between items-center text-xs">
                <span>{s.label}</span>
                {isDone && <CheckCircle2 className="size-3.5 text-emerald-600" />}
              </div>
              <span className="text-[11px] font-mono text-muted-foreground mt-1">
                {s.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ========================================================================= */}
      {/* ÉTAPE 1 : SCAN & SÉLECTION DES MÉDICAMENTS                                  */}
      {/* ========================================================================= */}
      {step === 1 && (
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Barcode className="size-5 text-primary" />
                  Étape 1 · Scan des Médicaments &amp; Détection EAN-13 / Datamatrix
                </CardTitle>
                <CardDescription>
                  Scannez les boîtes à la douchette USB ou caméra, ou utilisez la recherche instantanée
                </CardDescription>
              </div>

              {/* Boutons Presets & Caméra */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setScannerOpen(true)}
                  className="gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                >
                  <Camera className="size-3.5" />
                  Scanner Caméra
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => loadPreset('diabete_hta')}
                  className="text-xs"
                >
                  Preset Diabète+HTA
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => loadPreset('angine')}
                  className="text-xs"
                >
                  Preset Angine
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Barre d'ajout rapide */}
            <div className="p-3 bg-muted/20 rounded-lg border border-border/60">
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Rechercher un produit (DCI, Marque ou Code-barres) :
              </label>
              <SearchAutocomplete
                placeholder="Scanner ou taper le nom du médicament (ex: Doliprane, Metformine)..."
                onSelect={handleAddDrugFromCatalog}
              />
            </div>

            {/* Tableau des médicaments au comptoir */}
            <div className="border border-border/70 rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-4 py-2 border-b border-border/60 grid grid-cols-12 text-xs font-bold text-muted-foreground">
                <div className="col-span-4">MÉDICAMENT &amp; DCI</div>
                <div className="col-span-2">POSOLOGIE</div>
                <div className="col-span-2">MOMENT / REPAS</div>
                <div className="col-span-1 text-center">QTÉ</div>
                <div className="col-span-2 text-right">PRIX PPA</div>
                <div className="col-span-1 text-center">ACTION</div>
              </div>

              <div className="divide-y divide-border/40">
                {items.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-xs italic">
                    Aucun médicament scanné. Utilisez la recherche ci-dessus ou un preset.
                  </div>
                ) : (
                  items.map((it) => (
                    <div key={it.id} className="p-3 grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-4">
                        <div className="font-bold text-foreground">{it.brand}</div>
                        <div className="text-[11px] text-muted-foreground">{it.dci}</div>
                        <div className="text-[10px] text-zinc-500">
                          {it.form} {it.dosage ? `· ${it.dosage}` : ''}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <Input
                          value={it.posology}
                          onChange={(e) => updateItem(it.id, { posology: e.target.value })}
                          className="h-7 text-xs"
                        />
                      </div>

                      <div className="col-span-2 space-y-1">
                        <Input
                          value={it.timing}
                          onChange={(e) => updateItem(it.id, { timing: e.target.value })}
                          className="h-7 text-xs"
                          placeholder="Matin/Midi/Soir"
                        />
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {it.withFood === 'during' ? '🍽️ Pendant repas' : '🕒 Indifférent'}
                        </span>
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(it.id, { quantity: parseInt(e.target.value, 10) || 1 })
                          }
                          className="h-7 w-12 text-center text-xs"
                        />
                      </div>

                      <div className="col-span-2 text-right">
                        <div className="font-bold font-mono">
                          {(it.price * it.quantity).toFixed(2)} DA
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          {it.refundable ? '✓ Remboursable Chifa' : '✗ Hors Chifa'}
                        </div>
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(it.id)}
                          className="size-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pied d'étape 1 */}
            <div className="flex justify-between items-center pt-2">
              <div className="text-xs text-muted-foreground">
                Total articles : <span className="font-bold text-foreground">{items.length}</span> (
                {items.reduce((s, it) => s + it.quantity, 0)} boîtes)
              </div>
              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={items.length === 0}
                className="gap-2"
              >
                Passer au Tiers-Payant Chifa
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ÉTAPE 2 : TIERS-PAYANT CHIFA & SIMULATION FINANCIÈRE                        */}
      {/* ========================================================================= */}
      {step === 2 && (
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="size-5 text-emerald-600" />
              Étape 2 · Couverture Sociale &amp; Décompte Tiers-Payant Chifa
            </CardTitle>
            <CardDescription>
              Sélectionnez le régime de prise en charge et vérifiez le ticket modérateur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sélection de la carte Chifa */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {[
                { id: 'ald', label: 'CNAS — 100% ALD', rate: '100%', desc: 'Affections longue durée' },
                { id: 'standard', label: 'CNAS — Assuré (80%)', rate: '80%', desc: 'Taux standard' },
                { id: 'casnos', label: 'CASNOS (80%)', rate: '80%', desc: 'Non-salariés' },
                { id: 'aucune', label: 'Sans Carte / Direct', rate: '0%', desc: 'Plein tarif patient' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCardType(c.id as ChifaCardType)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    cardType === c.id
                      ? 'border-emerald-600 bg-emerald-500/10 font-bold ring-2 ring-emerald-500/20'
                      : 'border-border/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span>{c.label}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {c.rate}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">{c.desc}</div>
                </button>
              ))}
            </div>

            {/* Synthèse Financière Officine */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/20 rounded-xl border border-border/60">
              <div className="space-y-0.5">
                <span className="text-xs text-muted-foreground">Total PPA Ordonnance :</span>
                <div className="text-lg font-black font-mono">
                  {financialTotals.totalPPA.toFixed(2)} DA
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-xs text-emerald-700 dark:text-emerald-400">Prise en charge Caisse :</span>
                <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                  - {financialTotals.partCaisse.toFixed(2)} DA
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-xs text-amber-700 dark:text-amber-400">Dépassement Tarif Réf :</span>
                <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                  + {financialTotals.depassementTR.toFixed(2)} DA
                </div>
              </div>
              <div className="space-y-0.5 bg-primary/10 p-2 rounded-lg border border-primary/20">
                <span className="text-xs font-bold text-primary">NET À PAYER PATIENT :</span>
                <div className="text-xl font-black font-mono text-primary">
                  {financialTotals.resteAPayer.toFixed(2)} DA
                </div>
              </div>
            </div>

            {/* Navigation étape 2 */}
            <div className="flex justify-between items-center pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Précédent
              </Button>
              <Button type="button" onClick={() => setStep(3)} className="gap-2">
                Passer au Verrou Sécurité Clinique
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ÉTAPE 3 : VERROU DE SÉCURITÉ CLINIQUE (ZÉRO DÉFAUT)                         */}
      {/* ========================================================================= */}
      {step === 3 && (
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="size-5 text-state-danger" />
              Étape 3 · Verrou de Sécurité Clinique &amp; Validation Zéro Erreur
            </CardTitle>
            <CardDescription>
              Contrôles croisés automatiques : Doublons, Haute Vigilance, LASA, et terrain patient épinglé
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* État du patient épinglé */}
            {pinnedPatient ? (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-primary" />
                  <span className="font-bold">
                    Patient épinglé : {pinnedPatient.name || 'Profil actif'}
                  </span>
                  <span>· Âge : {pinnedPatient.ageYears || '—'} ans</span>
                  <span>· Poids : {pinnedPatient.weightKg || '—'} kg</span>
                  <span>· ClCr : {pinnedPatient.clcr || '—'} mL/min</span>
                  <span>· Foie : {pinnedPatient.childPughClass || 'Non renseigné'}</span>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Profil vérifié
                </Badge>
              </div>
            ) : (
              <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground flex justify-between items-center">
                <span>Aucun patient épinglé sur la session.</span>
                <span className="text-[11px] italic">Astuce : Utilisez le bouton &quot;Épingler un patient&quot; dans l&apos;en-tête.</span>
              </div>
            )}

            {/* Liste des alertes de sécurité */}
            <div className="space-y-2.5">
              {safetyChecks.length === 0 ? (
                <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center space-y-2">
                  <ShieldCheck className="size-10 text-emerald-600 mx-auto" />
                  <div className="font-bold text-emerald-900 dark:text-emerald-300 text-sm">
                    Aucune contre-indication ni alerte critique détectée
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 max-w-md mx-auto">
                    Tous les contrôles croisés (doublons, posologies, LASA, interactions) sont conformes au référentiel officiel.
                  </p>
                </div>
              ) : (
                safetyChecks.map((al, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-lg border flex items-start gap-3 text-xs ${
                      al.type === 'danger'
                        ? 'bg-rose-500/10 border-rose-500/40 text-rose-950 dark:text-rose-200'
                        : 'bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200'
                    }`}
                  >
                    <AlertTriangle
                      className={`size-4 shrink-0 mt-0.5 ${
                        al.type === 'danger' ? 'text-rose-600' : 'text-amber-600'
                      }`}
                    />
                    <div className="space-y-0.5">
                      <div className="font-bold text-sm">{al.title}</div>
                      <div className="opacity-90">{al.message}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Navigation étape 3 */}
            <div className="flex justify-between items-center pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Précédent
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setStep(4)
                  setIsTimerRunning(false)
                }}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Valider &amp; Passer à l&apos;Impression
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ÉTAPE 4 : REMISE PATIENT & ÉDITION (THERMIQUE 80MM / PICTO)                 */}
      {/* ========================================================================= */}
      {step === 4 && (
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Printer className="size-5 text-primary" />
                  Étape 4 · Édition des Documents Patient &amp; Clôture
                </CardTitle>
                <CardDescription>
                  Temps total de délivrance : <span className="font-bold font-mono text-foreground">{elapsedSec.toFixed(1)} secondes</span>
                </CardDescription>
              </div>

              {/* Bascule Vue Ticket 80mm vs Fiche Pictographique */}
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                <Button
                  type="button"
                  size="sm"
                  variant={handoutView === 'thermal' ? 'default' : 'ghost'}
                  onClick={() => setHandoutView('thermal')}
                  className="gap-1.5 text-xs h-7"
                >
                  <Receipt className="size-3.5" />
                  Ticket Thermique (80mm)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={handoutView === 'picto' ? 'default' : 'ghost'}
                  onClick={() => setHandoutView('picto')}
                  className="gap-1.5 text-xs h-7"
                >
                  <Sparkles className="size-3.5" />
                  Guide Pictographique
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {handoutView === 'thermal' ? (
              <ThermalPosologySlip
                pharmacyName="Pharmacie El-Chifa Centrale"
                pharmacistName="Dr. Pharmacien Diplômé"
                patientName={pinnedPatient?.name || 'Patient'}
                patientAge={pinnedPatient?.ageYears}
                chifaCardType={cardType.toUpperCase()}
                chifaNumber={chifaNumber}
                lines={thermalLines}
                totalPPA={financialTotals.totalPPA}
                partChifa={financialTotals.partCaisse}
                resteAPayer={financialTotals.resteAPayer}
              />
            ) : (
              <PictographicPosologyGenerator />
            )}

            {/* Navigation finale */}
            <div className="flex justify-between items-center pt-4 border-t border-border/60">
              <Button type="button" variant="outline" onClick={() => setStep(3)}>
                Précédent (Sécurité)
              </Button>
              <Button
                type="button"
                onClick={resetSession}
                className="gap-2 bg-primary font-semibold"
              >
                <RotateCcw className="size-4" />
                Clôturer &amp; Prochaine Ordonnance
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
