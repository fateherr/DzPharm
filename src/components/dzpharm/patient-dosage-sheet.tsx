'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  HeartHandshake,
  Pill,
  Printer,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatPrice } from './status-badge'
import type { DrugDetail } from './types'

interface PatientDosageSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  drug: DrugDetail
}

export function PatientDosageDialog({
  open,
  onOpenChange,
  drug,
}: PatientDosageSheetProps) {
  // Déterminer la dénomination unitaire selon la forme pharmaceutique
  const defaultUnit = (() => {
    const f = (drug.form || '').toUpperCase()
    if (f.includes('GELULE')) return 'gélule'
    if (f.includes('COMPRIME')) return 'comprimé'
    if (f.includes('SACHET')) return 'sachet'
    if (f.includes('GOUTTE')) return 'gouttes'
    if (f.includes('SIROP') || f.includes('SUSP')) return 'cuillère-mesure'
    if (f.includes('INJ')) return 'ampoule'
    if (f.includes('SUPPO')) return 'suppositoire'
    return 'prise'
  })()

  const ppa = drug.pharmacy?.[0]?.ppa ?? null
  const isRefundable = drug.pharmacy?.[0]?.refundable ?? false

  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState(defaultUnit)
  const [frequency, setFrequency] = useState('3')
  const [duration, setDuration] = useState('7 jours')
  const [timing, setTiming] = useState('Matin 8h00 ▸ Midi 13h00 ▸ Soir 20h00')
  const [mealRelation, setMealRelation] = useState('Au cours ou juste après le repas')
  const [precautions, setPrecautions] = useState<string[]>([
    'Prendre avec un grand verre d\'eau',
    'Respecter un intervalle régulier entre chaque prise',
    'Terminer impérativement la durée du traitement même en cas d\'amélioration',
  ])
  const [chifaRegime, setChifaRegime] = useState<'80' | '100' | '0'>(
    isRefundable ? '80' : '0'
  )
  const [pharmacyName, setPharmacyName] = useState('')

  // Calculs financiers
  const cnasRate = chifaRegime === '100' ? 1.0 : chifaRegime === '80' ? 0.8 : 0
  const cnasShare = ppa ? Math.round(ppa * cnasRate * 100) / 100 : 0
  const patientShare = ppa ? Math.max(0, Math.round((ppa - cnasShare) * 100) / 100) : 0

  function handlePrintNow() {
    window.print()
  }

  function togglePrecaution(p: string) {
    setPrecautions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  const currentDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <FileText className="size-5 text-primary" aria-hidden />
              Fiche Posologique Patient (Comptoir)
            </DialogTitle>
            <DialogDescription>
              Personnalisez la posologie et les consignes délivrées au patient avant impression A4 / ticket comptoir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {/* Résumé du médicament */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground text-base">{drug.brand}</h4>
                  <p className="text-xs text-muted-foreground">
                    {drug.dci} {drug.dosage ? `· ${drug.dosage}` : ''} {drug.form ? `· ${drug.form}` : ''}
                  </p>
                </div>
                {ppa != null && (
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">PPA officiel</span>
                    <p className="font-bold text-foreground tabular-nums">{formatPrice(ppa)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Posologie */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="poso-qty" className="text-xs font-semibold">Dose par prise</Label>
                <div className="mt-1 flex items-center gap-1.5">
                  <Input
                    id="poso-qty"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-16 tabular-nums"
                  />
                  <Input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="unité (gélule...)"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="poso-freq" className="text-xs font-semibold">Fréquence / jour</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger id="poso-freq" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 fois par jour</SelectItem>
                    <SelectItem value="2">2 fois par jour</SelectItem>
                    <SelectItem value="3">3 fois par jour</SelectItem>
                    <SelectItem value="4">4 fois par jour</SelectItem>
                    <SelectItem value="si_besoin">Si besoin (selon douleur)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="poso-dur" className="text-xs font-semibold">Durée du traitement</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger id="poso-dur" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3 jours">3 jours</SelectItem>
                    <SelectItem value="5 jours">5 jours</SelectItem>
                    <SelectItem value="7 jours">7 jours</SelectItem>
                    <SelectItem value="10 jours">10 jours</SelectItem>
                    <SelectItem value="15 jours">15 jours</SelectItem>
                    <SelectItem value="1 mois">1 mois</SelectItem>
                    <SelectItem value="3 mois (renouvelable)">3 mois (renouvelable)</SelectItem>
                    <SelectItem value="Traitement continu">Traitement continu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Horaires conseillés */}
            <div>
              <Label htmlFor="poso-times" className="text-xs font-semibold flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground" aria-hidden />
                Horaires recommandés
              </Label>
              <Input
                id="poso-times"
                value={timing}
                onChange={(e) => setTiming(e.target.value)}
                className="mt-1"
                placeholder="ex: Matin 8h00 ▸ Midi 13h00 ▸ Soir 20h00"
              />
            </div>

            {/* Relation aux repas */}
            <div>
              <Label htmlFor="poso-meal" className="text-xs font-semibold">Modalité de prise</Label>
              <Select value={mealRelation} onValueChange={setMealRelation}>
                <SelectTrigger id="poso-meal" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Au cours ou juste après le repas">Au cours ou juste après le repas</SelectItem>
                  <SelectItem value="À jeun (30 min avant le petit-déjeuner)">À jeun (30 min avant le petit-déjeuner)</SelectItem>
                  <SelectItem value="À distance des repas (2h après)">À distance des repas (2h après)</SelectItem>
                  <SelectItem value="Le soir au coucher">Le soir au coucher</SelectItem>
                  <SelectItem value="Indifférent (pendant ou hors repas)">Indifférent (pendant ou hors repas)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Précautions d'emploi */}
            <div>
              <Label className="text-xs font-semibold">Consignes et précautions au patient</Label>
              <div className="mt-1.5 space-y-1.5">
                {[
                  'Prendre avec un grand verre d\'eau',
                  'Respecter un intervalle régulier entre chaque prise',
                  'Terminer impérativement la durée du traitement même en cas d\'amélioration',
                  'Ne pas associer à de l\'alcool',
                  'Conserver à l\'abri de l\'humidité et de la lumière (< 25°C)',
                  'Ne pas dépasser la dose prescrite sans avis médical',
                ].map((item) => {
                  const checked = precautions.includes(item)
                  return (
                    <label
                      key={item}
                      className="flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs cursor-pointer hover:bg-accent/40"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePrecaution(item)}
                        className="rounded border-border size-3.5 text-primary focus:ring-primary"
                      />
                      <span>{item}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Tarification Chifa */}
            {ppa != null && (
              <div className="rounded-xl border border-chifa/30 bg-chifa/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Coins className="size-3.5 text-chifa" aria-hidden />
                    Prise en charge CHIFA
                  </span>
                  <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setChifaRegime('80')}
                      className={`px-2 py-0.5 rounded-md font-medium text-xs ${
                        chifaRegime === '80' ? 'bg-chifa text-white' : 'text-muted-foreground'
                      }`}
                    >
                      80% Droit commun
                    </button>
                    <button
                      type="button"
                      onClick={() => setChifaRegime('100')}
                      className={`px-2 py-0.5 rounded-md font-medium text-xs ${
                        chifaRegime === '100' ? 'bg-chifa text-white' : 'text-muted-foreground'
                      }`}
                    >
                      100% ALD
                    </button>
                    <button
                      type="button"
                      onClick={() => setChifaRegime('0')}
                      className={`px-2 py-0.5 rounded-md font-medium text-xs ${
                        chifaRegime === '0' ? 'bg-muted-foreground text-white' : 'text-muted-foreground'
                      }`}
                    >
                      Non remboursé
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-background/80 rounded-lg p-2 border border-border/70">
                    <p className="text-[10px] text-muted-foreground uppercase">PPA Total</p>
                    <p className="font-bold tabular-nums text-foreground">{formatPrice(ppa)}</p>
                  </div>
                  <div className="bg-chifa/10 rounded-lg p-2 border border-chifa/20">
                    <p className="text-[10px] text-chifa uppercase">Part Chifa ({cnasRate * 100}%)</p>
                    <p className="font-bold tabular-nums text-chifa">{formatPrice(cnasShare)}</p>
                  </div>
                  <div className="bg-background/80 rounded-lg p-2 border border-border/70">
                    <p className="text-[10px] text-muted-foreground uppercase">Reste patient</p>
                    <p className="font-bold tabular-nums text-foreground">
                      {patientShare === 0 ? '0,00 DA' : formatPrice(patientShare)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Entête Pharmacie (optionnel) */}
            <div>
              <Label htmlFor="pharm-name" className="text-xs font-semibold">Nom de l&apos;officine (optionnel)</Label>
              <Input
                id="pharm-name"
                value={pharmacyName}
                onChange={(e) => setPharmacyName(e.target.value)}
                placeholder="Pharmacie El-Chifa — Alger"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Button onClick={handlePrintNow} className="gap-2">
              <Printer className="size-4" aria-hidden />
              Imprimer la Fiche Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rendu imprimable injecté dans le body (§4.5 spec) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="print-counter fixed inset-0 z-[999] hidden bg-white text-black print:block print:overflow-visible font-sans">
            <div className="mx-auto max-w-[186mm] px-8 py-6 text-black border-2 border-black rounded-sm">
              {/* En-tête */}
              <div className="flex items-start justify-between border-b-2 border-black pb-3">
                <div>
                  <p className="text-[11px] font-extrabold tracking-wider uppercase text-black">
                    {pharmacyName || 'DzPharm ▪ Fiche Posologique Patient'}
                  </p>
                  <p className="text-[10px] text-black/70">
                    Référentiel Pharmaceutique Algérien · Nomenclature MIPH Juin 2026
                  </p>
                </div>
                <div className="text-right text-[11px] text-black">
                  <p className="font-bold">Date : {currentDate}</p>
                  {drug.regNumber ? <p className="text-[10px]">AMM : {drug.regNumber}</p> : null}
                </div>
              </div>

              {/* Identification médicament */}
              <div className="mt-4 border-b border-black/40 pb-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-black/75">
                  Médicament délivré
                </p>
                <h1 className="text-2xl font-black tracking-tight text-black mt-0.5">
                  {drug.brand}
                </h1>
                <p className="text-sm font-semibold text-black/90 mt-0.5">
                  DCI : {drug.dci} {drug.dosage ? `▪ ${drug.dosage}` : ''} {drug.form ? `(${drug.form})` : ''}
                </p>
                {drug.lab ? (
                  <p className="text-[11px] text-black/75 mt-0.5">
                    Laboratoire : {drug.lab} {drug.country ? `(${drug.country})` : ''}
                  </p>
                ) : null}
              </div>

              {/* Posologie prescrite */}
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-black/75 mb-1.5">
                  Posologie prescrite
                </p>
                <div className="border-2 border-black p-3.5 bg-neutral-50/50 rounded">
                  <p className="text-lg font-bold text-black">
                    {quantity} {unit}
                    {frequency !== 'si_besoin' ? ` × ${frequency} fois par jour` : ' en cas de besoin'}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-black/80">
                    Durée recommandée : <span className="font-bold text-black">{duration}</span>
                  </p>
                  {mealRelation && (
                    <p className="mt-1 text-xs text-black/80">
                      Modalité : <span>{mealRelation}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Horaires recommandés */}
              {timing && (
                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-black/75 mb-1">
                    Horaires recommandés
                  </p>
                  <div className="border border-black p-2.5 rounded font-mono text-sm font-bold tracking-wide">
                    {timing}
                  </div>
                </div>
              )}

              {/* Précautions d'emploi */}
              {precautions.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-black/75 mb-1">
                    Précautions et conseils du pharmacien
                  </p>
                  <ul className="list-disc pl-5 text-xs space-y-1 text-black/90">
                    {precautions.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tarification et Chifa */}
              {ppa != null && (
                <div className="mt-4 border-t border-black/30 pt-3 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Prix public (PPA) : {formatPrice(ppa)}</span>
                    {cnasRate > 0 ? (
                      <span className="text-black">
                        Remboursé CHIFA ({cnasRate * 100}%) : {formatPrice(cnasShare)}
                      </span>
                    ) : (
                      <span>Non remboursé CNAS</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-bold">
                    Reste à votre charge :{' '}
                    <span className="underline decoration-2">
                      {patientShare === 0 ? '0,00 DA (Prise en charge à 100%)' : formatPrice(patientShare)}
                    </span>
                  </p>
                </div>
              )}

              {/* Mentions légales & Pied de page (§4.5 spec) */}
              <div className="mt-6 border-t-2 border-black pt-3 text-[9px] text-black/70 flex justify-between items-center">
                <span>Généré par DzPharm ▪ Référentiel Officiel Algérien</span>
                <span className="font-bold uppercase tracking-wider">
                  Ce document ne remplace pas l&apos;ordonnance médicale
                </span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
