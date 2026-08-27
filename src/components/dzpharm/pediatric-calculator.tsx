'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Baby,
  Ban,
  Beaker,
  CheckCircle2,
  Clock,
  Droplets,
  FlaskConical,
  Info,
  Pill,
  Scale,
  Sigma,
  Syringe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PEDIATRIC_DRUGS, computeDose } from '@/lib/pediatric-dosing'
import { fetchDrugs } from './api'
import { formatNumber } from './status-badge'
import { useDzPharm } from './store'

function fmt(n: number | null, unit = ''): string {
  if (n == null) return '—'
  const rounded = Math.round(n * 100) / 100
  const str = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/\.?0+$/, '')
  return `${str}${unit ? '\u202f' + unit : ''}`
}

export function PediatricCalculator() {
  const gotoDirectory = useDzPharm((s) => s.gotoDirectory)
  const [weight, setWeight] = useState(12)
  const [ageMonths, setAgeMonths] = useState(24)
  const [drugIndex, setDrugIndex] = useState(0)
  const [formIndex, setFormIndex] = useState(0)

  const drug = PEDIATRIC_DRUGS[drugIndex]
  const result = useMemo(
    () => computeDose(drug, weight, ageMonths, formIndex),
    [drug, weight, ageMonths, formIndex]
  )

  // Recherche des marques locales pour la DCI sélectionnée
  const { data: localBrands, isLoading: brandsLoading } = useQuery({
    queryKey: ['ped-brands', drug.dciKey],
    queryFn: ({ signal }) =>
      fetchDrugs(
        { q: drug.dciKey.split(' ')[0], status: 'ACTIF', pageSize: 100, sort: 'brand' },
        signal
      ),
    staleTime: 10 * 60 * 1000,
  })

  const form = drug.forms[Math.min(formIndex, drug.forms.length - 1)]
  const blocked = result.blockers.length > 0
  const ageLabel =
    ageMonths < 24
      ? `${ageMonths} mois`
      : `${Math.floor(ageMonths / 12)} ans${ageMonths % 12 ? ` et ${ageMonths % 12} mois` : ''}`

  const dosesPerDay = drug.intervalH ? Math.floor(24 / drug.intervalH) : null
  const isFixedUi = drug.bands != null

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[400px_1fr]">
      {/* ------------------------- Paramètres ------------------------- */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Baby className="size-4 text-primary" aria-hidden />
              Paramètres de l&apos;enfant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Poids */}
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <Label htmlFor="poids" className="flex items-center gap-1.5 text-sm font-medium">
                  <Scale className="size-3.5 text-muted-foreground" aria-hidden />
                  Poids
                </Label>
                <span className="text-sm font-semibold text-primary tabular-nums">
                  {fmt(weight, 'kg')}
                </span>
              </div>
              <Slider
                id="poids"
                min={2}
                max={80}
                step={0.5}
                value={[weight]}
                onValueChange={([v]) => setWeight(v)}
                aria-label="Poids en kilogrammes"
              />
              <Input
                type="number"
                min={0.5}
                max={150}
                step={0.5}
                value={weight}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (!Number.isNaN(v) && v > 0) setWeight(Math.min(v, 150))
                }}
                className="mt-2 h-9 text-sm tabular-nums"
                aria-label="Poids exact en kilogrammes"
              />
            </div>

            {/* Âge */}
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <Label htmlFor="age" className="flex items-center gap-1.5 text-sm font-medium">
                  <Clock className="size-3.5 text-muted-foreground" aria-hidden />
                  Âge
                </Label>
                <span className="text-sm font-semibold text-primary">{ageLabel}</span>
              </div>
              <Slider
                id="age"
                min={0}
                max={144}
                step={1}
                value={[ageMonths]}
                onValueChange={([v]) => setAgeMonths(v)}
                aria-label="Âge en mois"
              />
              <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                <span>naissance</span>
                <span>2 ans</span>
                <span>6 ans</span>
                <span>12 ans</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="size-4 text-primary" aria-hidden />
              Molécule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={String(drugIndex)}
              onValueChange={(v) => {
                setDrugIndex(Number(v))
                setFormIndex(0)
              }}
            >
              <SelectTrigger className="h-11 w-full text-sm" aria-label="Choisir la molécule">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {PEDIATRIC_DRUGS.map((d, i) => (
                  <SelectItem key={d.dci} value={String(i)}>
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium">{d.dci}</span>
                      <span className="text-xs text-muted-foreground">{d.category}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Forme / spécialité (conditionnement algérien)
              </Label>
              <Select value={String(formIndex)} onValueChange={(v) => setFormIndex(Number(v))}>
                <SelectTrigger className="h-10 w-full text-sm" aria-label="Choisir la forme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {drug.forms.map((f, i) => (
                    <SelectItem key={f.label} value={String(i)}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.brands ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Marques locales : <span className="font-medium text-foreground/80">{form.brands}</span>
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------- Résultat ------------------------- */}
      <div className="space-y-4">
        {blocked ? (
          <div
            className="rounded-xl border border-state-danger/40 bg-state-danger/10 p-5"
            role="alert"
          >
            <p className="flex items-center gap-2 text-base font-bold text-state-danger">
              <Ban className="size-5 shrink-0" aria-hidden />
              Administration non recommandée
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-foreground/90">
              {result.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Dose principale */}
        <Card className={cn('overflow-hidden', !blocked && 'border-primary/30')}>
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                  Dose par prise
                </p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums">
                    {isFixedUi || result.doseMg === 0
                      ? result.bandLabel
                        ? 'Posologie fixe'
                        : '—'
                      : fmt(result.doseMg)}
                  </span>
                  {!isFixedUi && result.doseMg !== 0 ? (
                    <span className="text-base font-semibold text-muted-foreground">
                      mg{drug.mgPerKgPerDose ? ` (${fmt(drug.mgPerKgPerDose)} mg/kg)` : ''}
                    </span>
                  ) : null}
                </p>
                {result.bandLabel ? (
                  <p className="mt-1.5 text-sm font-medium text-foreground/90">
                    {result.bandLabel}
                  </p>
                ) : null}
              </div>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/15">
                <FlaskConical className="size-6 text-primary" aria-hidden />
              </span>
            </div>
          </div>

          <CardContent className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            {/* Volume */}
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-primary uppercase">
                <Droplets className="size-3.5" aria-hidden />
                Volume par prise
              </p>
              {result.volumeMl != null && result.volumeMl > 0 ? (
                <>
                  <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">
                    {fmt(result.volumeMl)}
                    <span className="ml-1 text-sm font-semibold text-muted-foreground">mL</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    avec la forme sélectionnée ({form.label.toLowerCase()})
                  </p>
                </>
              ) : (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Forme sèche (sachet/suppositoire) — compte directement en unités
                  de dose.
                </p>
              )}
            </div>

            {/* Rythme */}
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <Clock className="size-3.5" aria-hidden />
                Rythme d&apos;administration
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {drug.intervalH === 24
                  ? '1 prise par jour'
                  : dosesPerDay
                    ? `${dosesPerDay} prises par jour`
                    : drug.bands
                      ? 'posologie fixe'
                      : '—'}
                {drug.intervalH && drug.intervalH !== 24 && drug.intervalH !== 0 ? (
                  <span className="ml-1 font-normal text-muted-foreground">
                    (toutes les {drug.intervalH} h)
                  </span>
                ) : null}
              </p>
              {result.maxDailyMg > 0 ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Maximum sur 24 h :{' '}
                  <span className="font-semibold text-foreground">
                    {fmt(result.maxDailyMg)} mg
                  </span>
                  {drug.maxDailyMgPerKg
                    ? ` (${drug.maxDailyMgPerKg} mg/kg/j)`
                    : ''}
                </p>
              ) : null}
            </div>
          </CardContent>

          {result.capped ? (
            <div className="flex items-start gap-2 border-t border-state-warning/30 bg-state-warning/10 px-5 py-3 text-sm text-foreground/90">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-state-warning" aria-hidden />
              Dose plafonnée à {fmt(drug.maxSingleMg ?? 0)} mg : la dose adulte maximale est
              atteinte pour ce poids — ne pas dépasser.
            </div>
          ) : null}
        </Card>

        {/* Détail de calcul */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sigma className="size-4 text-primary" aria-hidden />
              Détail du calcul
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground/90">
            {drug.mgPerKgPerDose != null ? (
              <p className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs">
                <Beaker className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                {fmt(drug.mgPerKgPerDose)} mg/kg × {fmt(weight)} kg ={' '}
                <span className="font-semibold text-primary">
                  {fmt((drug.mgPerKgPerDose ?? 0) * weight)} mg
                </span>
                {form.perVolumeMl > 0 ? (
                  <>
                    {' '}(→ {fmt(result.volumeMl)} mL à {form.mg} mg/{form.perVolumeMl} mL)
                  </>
                ) : null}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Calcul pour {fmt(weight)} kg et {ageLabel}. Source : référentiels
              pédiatriques usuels adaptés aux spécialités commercialisées en Algérie.
            </p>
          </CardContent>
        </Card>

        {/* Mises en garde */}
        {drug.warnings.length > 0 ? (
          <Card className="border-state-warning/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-state-warning">
                <AlertTriangle className="size-4" aria-hidden />
                Points de vigilance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-foreground/90">
                {drug.warnings.map((w) => (
                  <li key={w} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-state-warning" aria-hidden />
                    {w}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {/* Marques locales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Syringe className="size-4 text-chifa" aria-hidden />
                Marques locales ({drug.dci})
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-primary hover:text-primary"
                onClick={() => gotoDirectory({ q: drug.dciKey.split(' ')[0] })}
              >
                Voir dans le répertoire
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {brandsLoading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-28 rounded-full" />
                ))}
              </div>
            ) : localBrands && localBrands.total > 0 ? (
              <>
                <p className="mb-2.5 text-xs text-muted-foreground">
                  {formatNumber(localBrands.total)} produit(s) actif(s) dans le référentiel
                  national — cliquez pour ouvrir la fiche.
                </p>
                <div className="scroll-thin max-h-44 overflow-y-auto">
                  <div className="flex flex-wrap gap-1.5">
                    {localBrands.drugs.slice(0, 40).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => useDzPharm.getState().openDrug(d.id)}
                        title={`${d.brand} — ${d.dosage ?? ''} ${d.form ?? ''}`}
                        className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {d.brand}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune marque active trouvée pour cette DCI dans le référentiel.
              </p>
            )}
          </CardContent>
        </Card>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Outil d&apos;aide à la dispensation destiné aux professionnels de santé.
          Vérifiez toujours la prescription médicale : la posologie retenue peut
          différer selon l&apos;indication. En cas de doute, contactez le prescripteur.
        </p>
      </div>
    </div>
  )
}
