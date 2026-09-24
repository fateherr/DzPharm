'use client'

import React, { useState } from 'react'
import {
  Baby,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
  Droplets,
  FileText,
  HeartPulse,
  Info,
  Pill,
  Printer,
  Scale,
  ShieldAlert,
  Sparkles,
  Table,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface WeightBandRow {
  band: string
  ageRange: string
  paracetamolMg: string
  paracetamolVol: string
  ibuprofenMg: string
  ibuprofenVol: string
  amoxMg: string
  amoxVol: string
  sroMl: string
}

export const WEIGHT_BANDS_DATA: WeightBandRow[] = [
  {
    band: '3 à 5 kg',
    ageRange: '0 à 2 mois',
    paracetamolMg: '60 mg',
    paracetamolVol: '2,5 mL (sirop 120mg/5ml)',
    ibuprofenMg: 'CONTRE-INDIQUÉ (< 3 mois)',
    ibuprofenVol: '—',
    amoxMg: '100 mg / prise (3x/j)',
    amoxVol: '2 mL (sirop 250mg/5ml)',
    sroMl: '50 à 100 mL après chaque selle liquide',
  },
  {
    band: '6 à 9 kg',
    ageRange: '3 à 11 mois',
    paracetamolMg: '100 à 120 mg',
    paracetamolVol: '4 à 5 mL ou suppo 100 mg',
    ibuprofenMg: '60 à 90 mg',
    ibuprofenVol: '3 à 4,5 mL (sirop 100mg/5ml)',
    amoxMg: '150 à 200 mg / prise (3x/j)',
    amoxVol: '3 à 4 mL (sirop 250mg/5ml)',
    sroMl: '100 à 150 mL après chaque selle liquide',
  },
  {
    band: '10 à 14 kg',
    ageRange: '1 à 2 ans',
    paracetamolMg: '150 à 200 mg',
    paracetamolVol: '6 à 8 mL ou sachet 150 mg',
    ibuprofenMg: '100 à 140 mg',
    ibuprofenVol: '5 à 7 mL (sirop 100mg/5ml)',
    amoxMg: '250 à 350 mg / prise (3x/j)',
    amoxVol: '5 à 7 mL (sirop 250mg/5ml)',
    sroMl: '150 à 200 mL après chaque selle liquide',
  },
  {
    band: '15 à 19 kg',
    ageRange: '3 à 5 ans',
    paracetamolMg: '250 mg',
    paracetamolVol: '10 mL ou sachet 250 mg',
    ibuprofenMg: '150 à 190 mg',
    ibuprofenVol: '7,5 à 9,5 mL',
    amoxMg: '400 à 500 mg / prise (3x/j)',
    amoxVol: '4 à 5 mL (sirop 500mg/5ml)',
    sroMl: '200 à 250 mL après chaque selle',
  },
  {
    band: '20 à 29 kg',
    ageRange: '6 à 9 ans',
    paracetamolMg: '350 à 400 mg',
    paracetamolVol: 'Sachet 300 mg ou 1 comp 500 mg',
    ibuprofenMg: '200 à 290 mg',
    ibuprofenVol: '10 à 14 mL ou 1 comp 200 mg',
    amoxMg: '500 à 750 mg / prise (3x/j)',
    amoxVol: '1 sachet ou gélule 500 mg',
    sroMl: 'Boire à volonté selon la soif',
  },
  {
    band: '30 à 45 kg',
    ageRange: '10 à 12 ans',
    paracetamolMg: '500 mg',
    paracetamolVol: '1 comprimé / sachet 500 mg',
    ibuprofenMg: '300 à 400 mg',
    ibuprofenVol: '1 à 2 comp 200 mg (pendant repas)',
    amoxMg: '1 000 mg / prise (2 à 3x/j)',
    amoxVol: '1 sachet / comprimé 1 g',
    sroMl: 'Boire à volonté selon la soif',
  },
]

/**
 * F-11 — Tableaux Posologiques Pédiatriques par Tranches de Poids (Format A5 Imprimable).
 * Synthèse clinique ultra-rapide pour les consultations d'urgence et le comptoir d'officine.
 */
export function PediatricWeightBands() {
  const [selectedMolecule, setSelectedMolecule] = useState<'all' | 'paracetamol' | 'ibuprofen' | 'amox'>('all')

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  return (
    <div className="space-y-4">
      {/* Barre d'outils écran (masquée à l'impression) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 print:hidden">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Table className="size-4 text-primary" />
            Tableaux Posologiques par Tranches de Poids (A5)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Doses usuelles et volumes sirops par tranche pondérale selon les référentiels pédiatriques nationaux.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 font-semibold shadow-xs cursor-pointer"
          >
            <Printer className="size-4" />
            <span>Imprimer Fiche A5</span>
          </Button>
        </div>
      </div>

      {/* ----------------- Fiche Clinique A5 (Visible et imprimable) ----------------- */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm printable-area">
        {/* En-tête officiel de la fiche A5 */}
        <div className="border-b border-border/80 pb-3 mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-black text-primary-foreground">
                DZPHARM
              </span>
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Référentiel Clinique Pédiatrique Algérien
              </span>
            </div>
            <h1 className="text-lg font-black text-foreground mt-1">
              Grille Posologique Pédiatrique Rapide par Tranches de Poids
            </h1>
          </div>
          <div className="text-right text-[10px] text-muted-foreground">
            <span className="block font-semibold">Format A5 · Officine &amp; Urgences</span>
            <span>Édition de Référence 2026</span>
          </div>
        </div>

        {/* Tableau comparatif par tranches */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-primary/40 bg-muted/50 text-[11px] font-bold text-foreground uppercase">
                <th className="p-2.5">Tranche de Poids</th>
                <th className="p-2.5">Âge indicatif</th>
                <th className="p-2.5">Paracétamol (15 mg/kg)</th>
                <th className="p-2.5">Ibuprofène (10 mg/kg)</th>
                <th className="p-2.5">Amoxicilline (25 mg/kg)</th>
                <th className="p-2.5">SRO (Réhydratation)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {WEIGHT_BANDS_DATA.map((row, idx) => (
                <tr key={idx} className={cn('hover:bg-muted/30 transition-colors', idx % 2 === 0 ? 'bg-background' : 'bg-muted/15')}>
                  <td className="p-2.5 font-bold text-primary whitespace-nowrap">
                    {row.band}
                  </td>
                  <td className="p-2.5 text-muted-foreground whitespace-nowrap">
                    {row.ageRange}
                  </td>
                  <td className="p-2.5">
                    <span className="font-bold text-foreground block">{row.paracetamolMg}</span>
                    <span className="text-[10px] text-muted-foreground">{row.paracetamolVol}</span>
                  </td>
                  <td className="p-2.5">
                    <span className={cn('font-bold block', row.ibuprofenMg.includes('CONTRE') ? 'text-destructive text-[10px]' : 'text-foreground')}>
                      {row.ibuprofenMg}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{row.ibuprofenVol}</span>
                  </td>
                  <td className="p-2.5">
                    <span className="font-bold text-foreground block">{row.amoxMg}</span>
                    <span className="text-[10px] text-muted-foreground">{row.amoxVol}</span>
                  </td>
                  <td className="p-2.5 text-[11px] text-foreground/90 font-medium">
                    {row.sroMl}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Règles cliniques et avertissements de sécurité */}
        <div className="mt-4 pt-3 border-t border-border/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-muted-foreground page-break-inside-avoid">
          <div className="rounded-lg bg-muted/40 p-2.5 border border-border/50">
            <span className="font-bold text-foreground block mb-0.5">⏱ Rythme &amp; Intervalles :</span>
            <p>
              • Paracétamol : max 4 prises/24h espacées d&apos;au moins 6 h (4 h minimum).
              <br />
              • Ibuprofène : 3 prises/24h espacées de 8 h (pendant les repas).
            </p>
          </div>
          <div className="rounded-lg bg-rose-500/10 p-2.5 border border-rose-500/20 text-rose-950 dark:text-rose-200">
            <span className="font-bold text-rose-700 dark:text-rose-400 block mb-0.5">⚠ Contre-indications :</span>
            <p>
              • Ibuprofène proscrit en cas de varicelle, déshydratation aiguë et chez le nourrisson &lt; 3 mois.
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-2.5 border border-border/50">
            <span className="font-bold text-foreground block mb-0.5">⚖ Pesée obligatoire :</span>
            <p>
              Toujours privilégier le poids réel mesuré sur une balance pédiatrique plutôt que l&apos;âge indicatif.
            </p>
          </div>
        </div>

        {/* Pied de page */}
        <div className="mt-3 pt-2 text-[9px] text-muted-foreground/80 flex items-center justify-between border-t border-border/40">
          <span>Source : Société Algérienne de Pédiatrie &amp; Nomenclature MSPRH 2026</span>
          <span>DzPharm · Intelligence Pharmaceutique Algérienne</span>
        </div>
      </div>
    </div>
  )
}
