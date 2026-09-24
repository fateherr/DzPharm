'use client'

import React, { useState, useMemo } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  BadgeAlert,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Coins,
  DollarSign,
  HelpCircle,
  Percent,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useQuery } from '@tanstack/react-query'
import { fetchDrugs, fetchDrugDetail } from './api'
import { formatNumber, formatPrice } from './status-badge'
import { useDzPharm } from './store'
import { cn } from '@/lib/utils'

/**
 * BS-04 — Vigie des Prix Réglementés & Détecteur de Dépassements (Official-Price Guardian).
 * Permet au patient et au professionnel de vérifier l'exactitude du tarif PPA officiel,
 * de détecter tout dépassement illicite en officine et de calculer le remboursement Chifa exact.
 */
export function PriceGuardian() {
  const openDrug = useDzPharm((s) => s.openDrug)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDrugId, setSelectedDrugId] = useState<number | null>(null)
  const [chargedPrice, setChargedPrice] = useState<string>('')
  const [isAld100, setIsAld100] = useState<boolean>(false)

  // Recherche de médicaments
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['drugs', 'search', searchTerm],
    queryFn: ({ signal }) => fetchDrugs({ q: searchTerm, pageSize: 6 }, signal),
    enabled: searchTerm.trim().length >= 2,
  })

  // Détail du médicament sélectionné
  const { data: drugDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['drug', selectedDrugId],
    queryFn: ({ signal }) => (selectedDrugId ? fetchDrugDetail(selectedDrugId, signal) : null),
    enabled: selectedDrugId !== null,
  })

  const drug = drugDetail?.drug
  const pharmacy = drug?.pharmacy?.[0]
  const officialPpa = pharmacy?.ppa ?? null
  const equivalents = drugDetail?.equivalents ?? []

  // Trouver l'équivalent générique le moins cher
  const cheapestEquivalent = useMemo(() => {
    const priced = equivalents.filter((e) => e.price != null && e.price > 0 && e.id !== drug?.id)
    if (priced.length === 0) return null
    return priced.reduce((min, curr) => ((curr.price ?? Infinity) < (min.price ?? Infinity) ? curr : min))
  }, [equivalents, drug?.id])

  // Analyse du dépassement de prix
  const priceAnalysis = useMemo(() => {
    if (!officialPpa || !chargedPrice) return null
    const charged = parseFloat(chargedPrice.replace(',', '.'))
    if (isNaN(charged) || charged <= 0) return null

    const diff = charged - officialPpa
    const percentDiff = (diff / officialPpa) * 100

    return {
      charged,
      officialPpa,
      diff,
      percentDiff,
      isOvercharged: diff > 0.05,
      isExact: Math.abs(diff) <= 0.05,
      isDiscounted: diff < -0.05,
    }
  }, [officialPpa, chargedPrice])

  // Calcul Chifa exact
  const chifaCalculation = useMemo(() => {
    if (!officialPpa) return null
    const rate = isAld100 ? 1.0 : 0.8
    const cnasPart = officialPpa * rate
    const patientPart = officialPpa - cnasPart

    return {
      rate: rate * 100,
      cnasPart,
      patientPart,
      refundable: Boolean(pharmacy?.refundable),
    }
  }, [officialPpa, isAld100, pharmacy?.refundable])

  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card/90 to-background p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4 mb-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold tracking-tight text-foreground">
            <span className="flex size-7 items-center justify-center rounded-lg bg-chifa text-white shadow-xs">
              <ShieldCheck className="size-4" />
            </span>
            Vigie des Prix Réglementés &amp; Tarifs Chifa (BS-04)
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Contrôlez le tarif PPA officiel fixé par arrêté ministériel et détectez les dépassements.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-chifa bg-chifa/10 border border-chifa/25 px-2.5 py-1 rounded-full">
          <BadgeCheck className="size-3.5" />
          <span>Arrêté Ministériel MSPRH · Tarifs 2026</span>
        </div>
      </div>

      {/* 1. Recherche du médicament */}
      <div className="space-y-4">
        <div>
          <Label className="text-xs font-semibold text-foreground mb-1.5 block">
            1. Recherchez le médicament pour vérifier son tarif officiel :
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                if (selectedDrugId) setSelectedDrugId(null)
              }}
              placeholder="Ex : Doliprane, Augmentin, Glucophage, Lovenox…"
              className="pl-9 h-10 border-border/80 bg-background/90"
            />
          </div>

          {/* Résultats de recherche rapide */}
          {searchTerm.trim().length >= 2 && !selectedDrugId && (
            <div className="mt-2 rounded-xl border border-border bg-card shadow-lg overflow-hidden divide-y divide-border/60 z-20">
              {isSearching ? (
                <div className="p-3 text-center text-xs text-muted-foreground">Recherche dans la nomenclature…</div>
              ) : searchResults?.drugs && searchResults.drugs.length > 0 ? (
                searchResults.drugs.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setSelectedDrugId(d.id)
                      setSearchTerm(d.brand)
                    }}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-primary/5 transition-colors cursor-pointer text-xs"
                  >
                    <div>
                      <span className="font-bold text-foreground text-sm">{d.brand}</span>
                      <span className="text-muted-foreground ml-2">({d.dci})</span>
                      <span className="text-muted-foreground/80 block text-[11px]">{d.dosage} · {d.form}</span>
                    </div>
                    <div className="text-right">
                      {d.price != null ? (
                        <span className="font-bold text-chifa text-sm tabular-nums">{formatPrice(d.price)}</span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">Prix non référencé</span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-muted-foreground">Aucun médicament trouvé</div>
              )}
            </div>
          )}
        </div>

        {/* 2. Détail du médicament et contrôle de prix */}
        {selectedDrugId && drug && (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Produit sélectionné
                  </span>
                  <h3 className="text-lg font-bold text-foreground">{drug.brand}</h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    {drug.dci} · {drug.dosage || ''} {drug.form || ''}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Labo : {drug.lab} · AMM : {drug.regNumber || '—'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    PPA Réglementé Officiel
                  </span>
                  {officialPpa != null ? (
                    <span className="text-2xl font-black text-chifa tabular-nums">
                      {formatPrice(officialPpa)}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-muted-foreground">
                      Tarif hospitalier ou non publié
                    </span>
                  )}
                </div>
              </div>

              {/* Formulaire de contrôle de dépassement */}
              {officialPpa != null && (
                <div className="mt-4 pt-4 border-t border-border/60">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div>
                      <Label htmlFor="charged-price-input" className="text-xs font-semibold text-foreground mb-1 block">
                        Prix facturé en officine (DA) :
                      </Label>
                      <Input
                        id="charged-price-input"
                        type="number"
                        step="0.01"
                        placeholder={`Ex: ${officialPpa}`}
                        value={chargedPrice}
                        onChange={(e) => setChargedPrice(e.target.value)}
                        className="h-9 border-border bg-background tabular-nums font-semibold"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setChargedPrice(String(officialPpa))}
                        className="h-9 text-xs cursor-pointer"
                      >
                        Tester le tarif officiel
                      </Button>
                    </div>
                  </div>

                  {/* Verdict d'analyse */}
                  {priceAnalysis && (
                    <div className="mt-3">
                      {priceAnalysis.isOvercharged ? (
                        <div
                          role="alert"
                          className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-rose-950 dark:text-rose-100 space-y-1"
                        >
                          <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400 text-sm">
                            <AlertTriangle className="size-4.5" />
                            <span>DÉPASSEMENT DE PRIX RÉGLEMENTÉ DÉTECTÉ (+{priceAnalysis.percentDiff.toFixed(1)}%)</span>
                          </div>
                          <p className="text-xs leading-relaxed font-medium">
                            Le prix facturé ({formatPrice(priceAnalysis.charged)}) dépasse le PPA officiel plafonné ({formatPrice(priceAnalysis.officialPpa)}) de <strong className="text-rose-600 dark:text-rose-400">+{formatPrice(priceAnalysis.diff)}</strong>.
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            En Algérie, les prix publics des médicaments sont fixés par arrêté ministériel et ne peuvent être majorés. Vous pouvez signaler ce tarif au conseil de l&apos;ordre ou au service de contrôle des prix.
                          </p>
                        </div>
                      ) : priceAnalysis.isExact ? (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-950 dark:text-emerald-100 flex items-center gap-2 text-xs font-semibold">
                          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Tarif 100% Conforme au PPA officiel ({formatPrice(officialPpa)}). Aucune majoration.</span>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sky-950 dark:text-sky-100 flex items-center gap-2 text-xs font-semibold">
                          <CheckCircle2 className="size-4 text-sky-600 dark:text-sky-400 shrink-0" />
                          <span>Tarif inférieur au plafond officiel ({formatPrice(priceAnalysis.charged)} vs {formatPrice(officialPpa)}).</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Simulateur Chifa & Économie Générique */}
            {chifaCalculation && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Boîte Chifa */}
                <Card className="border-border shadow-xs">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-bold text-chifa flex items-center gap-1.5">
                      <Coins className="size-4" />
                      Prise en charge Chifa (CNAS / CASNOS)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ald-switch" className="text-xs text-foreground font-medium cursor-pointer">
                        Régime Affection Longue Durée (ALD 100%) :
                      </Label>
                      <Switch id="ald-switch" checked={isAld100} onCheckedChange={setIsAld100} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center pt-1">
                      <div className="rounded-lg bg-chifa/10 border border-chifa/20 p-2">
                        <span className="text-[10px] uppercase font-bold text-chifa block">Part CNAS ({chifaCalculation.rate}%)</span>
                        <span className="text-base font-extrabold text-chifa tabular-nums">{formatPrice(chifaCalculation.cnasPart)}</span>
                      </div>
                      <div className="rounded-lg bg-muted/60 border border-border p-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Ticket Patient</span>
                        <span className="text-base font-extrabold text-foreground tabular-nums">
                          {chifaCalculation.patientPart === 0 ? '0,00 DA' : formatPrice(chifaCalculation.patientPart)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Boîte Alternative Générique */}
                <Card className="border-border shadow-xs">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-bold text-primary flex items-center gap-1.5">
                      <TrendingDown className="size-4" />
                      Optimisation Générique (Même DCI)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    {cheapestEquivalent && cheapestEquivalent.price && officialPpa && cheapestEquivalent.price < officialPpa ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Un générique équivalent de même DCI est disponible à moindre coût :
                        </p>
                        <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 p-2.5">
                          <div>
                            <span className="font-bold text-primary text-xs block">{cheapestEquivalent.brand}</span>
                            <span className="text-[11px] text-muted-foreground">{cheapestEquivalent.lab}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-extrabold text-primary tabular-nums block">
                              {formatPrice(cheapestEquivalent.price)}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              Économie : -{formatPrice(officialPpa - cheapestEquivalent.price)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDrug(cheapestEquivalent.id)}
                          className="w-full text-xs text-primary font-semibold gap-1 h-7 cursor-pointer"
                        >
                          <span>Consulter la fiche de {cheapestEquivalent.brand}</span>
                          <ChevronRight className="size-3" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground py-3 text-center">
                        Ce produit propose déjà le tarif le plus avantageux de sa classe ou n&apos;a pas d&apos;équivalent référencé.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
