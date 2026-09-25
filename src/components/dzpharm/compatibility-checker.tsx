'use client'

import React, { useState } from 'react'
import {
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Pill,
  BookOpen,
  Search,
  Scale,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchAutocomplete } from './search-autocomplete'
import type { Drug } from './types'
import { analyzeDrugCompatibility, type CompatibilityReport } from '@/lib/compatibility'

const PRESET_CHECKS = [
  { name: 'Créon 10 000 (Pancréatine)', brand: 'CREON 10 000 UI', dci: 'PANCREATINE', form: 'Gélule gastro-résistante' },
  { name: 'Lovenox 4000 (Énoxaparine)', brand: 'LOVENOX 40 mg', dci: 'ENOXAPARINE SODIQUE', form: 'Solution injectable en seringue' },
  { name: 'Doliprane 1000 Gélules', brand: 'DOLIPRANE 1000 mg', dci: 'PARACETAMOL', form: 'Gélule' },
  { name: 'Doliprane 1000 Comprimés', brand: 'DOLIPRANE 1000 mg', dci: 'PARACETAMOL', form: 'Comprimé' },
  { name: 'Toplexil Sirop', brand: 'TOPLEXIL', dci: 'OXOMEMAZINE', form: 'Sirop hydro-alcoolique' },
]

export function CompatibilityChecker() {
  const [selectedDrug, setSelectedDrug] = useState<{
    brand: string
    dci: string
    form: string
  }>({
    brand: 'CREON 10 000 UI',
    dci: 'PANCREATINE',
    form: 'Gélule gastro-résistante',
  })

  const report = analyzeDrugCompatibility(
    selectedDrug.brand,
    selectedDrug.dci,
    selectedDrug.form
  )

  function handleSelectDrug(drug: Drug) {
    setSelectedDrug({
      brand: drug.brand,
      dci: drug.dci,
      form: drug.form || 'Comprimé',
    })
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="size-5 text-emerald-600 dark:text-emerald-400" />
                Moteur de Compatibilité Éthique &amp; Halal (W3-01)
              </CardTitle>
              <CardDescription>
                Détection automatique : Gélatine porcine, Excipients alcooliques, et Rokhsa médicale (Darura)
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESET_CHECKS.map((p, i) => (
                <Button
                  key={i}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDrug(p)}
                  className="text-xs h-7"
                >
                  {p.name}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recherche */}
          <div className="p-3 bg-muted/20 rounded-lg border border-border/60">
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Analyser un médicament de la nomenclature officielle :
            </label>
            <SearchAutocomplete
              placeholder="Rechercher un médicament (ex: Créon, Lovenox, Spasfon)..."
              onSelect={handleSelectDrug}
            />
          </div>

          {/* Fiche Résultat de Compatibilité */}
          <div className="rounded-xl border border-border/70 p-5 bg-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h3 className="font-bold text-lg text-foreground">{selectedDrug.brand}</h3>
                <p className="text-xs text-muted-foreground">
                  DCI : <strong className="text-foreground">{selectedDrug.dci}</strong> · Forme : {selectedDrug.form}
                </p>
              </div>

              {/* Badge d'état principal */}
              <Badge
                variant="outline"
                className={`text-xs px-3 py-1 font-bold ${
                  report.badgeVariant === 'success'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                    : report.badgeVariant === 'warning'
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                    : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
                }`}
              >
                {report.badgeLabel}
              </Badge>
            </div>

            {/* Titre & Résumé */}
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                {report.status === 'HALAL_CERTIFIE' ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="size-4 text-amber-600" />
                )}
                {report.headline}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {report.summary}
              </p>
            </div>

            {/* Risques et Détails Juridiques */}
            {report.risks.length > 0 && (
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Points de vigilance identifiés :
                </h5>
                <div className="space-y-2">
                  {report.risks.map((risk, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2 text-xs"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <AlertTriangle className="size-3.5 text-amber-600" />
                          {risk.name}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {risk.type}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{risk.detail}</p>

                      {/* Avis Fiqh / Fatwa */}
                      <div className="bg-background/80 p-2.5 rounded border border-border/40 text-[11px] space-y-1">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <BookOpen className="size-3.5" />
                          <span>Référentiel Jurisprudentiel :</span>
                        </div>
                        <p className="italic text-zinc-600 dark:text-zinc-300">
                          {risk.fatwaReference}
                        </p>
                      </div>

                      {/* Conseil d'alternative */}
                      <div className="text-[11px] text-zinc-600 dark:text-zinc-400 pl-2 border-l-2 border-primary">
                        <strong>Conseil officinal : </strong>
                        {risk.alternativeAdvice}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Décision Fiqh globale */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs space-y-1">
              <span className="font-bold text-primary flex items-center gap-1.5">
                <Scale className="size-3.5" />
                Principe de Droit Médical Islamique Applicable
              </span>
              <p className="text-muted-foreground">{report.fiqhRuling}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
