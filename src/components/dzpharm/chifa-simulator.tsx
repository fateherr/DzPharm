'use client'

import { useMemo } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  BadgeDollarSign,
  Calculator,
  CircleDollarSign,
  Copy,
  CreditCard,
  HeartPulse,
  Info,
  Landmark,
  Plus,
  Receipt,
  Trash2,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { ChifaCardType, ChifaLine } from './types'
import { SearchAutocomplete } from './search-autocomplete'
import { fetchDrugDetail } from './api'
import { formatPrice } from './status-badge'
import { useToast } from '@/hooks/use-toast'
import { SafetyNote } from './safety-note'
import { MAX_CHIFA_LINES, useDzPharm } from './store'

const CARD_TYPES: Record<
  ChifaCardType,
  { label: string; description: string; icon: typeof CreditCard; badge: string }
> = {
  standard: {
    label: 'CNAS — assuré social',
    description: 'Taux standard : 80 % du tarif de référence pour les produits remboursables.',
    icon: CreditCard,
    badge: '80 %',
  },
  ald: {
    label: 'CNAS — ALD (maladie chronique)',
    description:
      'Affection de longue durée (diabète, HTA, cancer, asthme…) : 100 % du tarif de référence.',
    icon: HeartPulse,
    badge: '100 %',
  },
  casnos: {
    label: 'CASNOS — non-salariés',
    description: 'Caisse des non-salariés : 80 % pour les produits remboursables.',
    icon: Landmark,
    badge: '80 %',
  },
  aucune: {
    label: 'Sans couverture — tarif direct',
    description: 'Patient non assuré : intégralité du prix public à sa charge.',
    icon: Wallet,
    badge: '0 %',
  },
}

const RATE_OPTIONS = [
  { value: 100, label: '100 % — remboursable (tarif de référence)' },
  { value: 80, label: '80 % — remboursable' },
  { value: 40, label: '40 % — taux partiel' },
  { value: 0, label: '0 % — non remboursable' },
]

function fmtDA(n: number): string {
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} DA`
}

export function ChifaSimulator() {
  const { toast } = useToast()
  const cardType = useDzPharm((s) => s.chifaCardType)
  const setCardType = useDzPharm((s) => s.setChifaCardType)
  const lines = useDzPharm((s) => s.chifaLines)
  const addLineStore = useDzPharm((s) => s.addChifaLine)
  const updateLineStore = useDzPharm((s) => s.updateChifaLine)
  const removeLineStore = useDzPharm((s) => s.removeChifaLine)
  const clearLines = useDzPharm((s) => s.clearChifaLines)

  /** Taux de la carte plafonne le taux du produit : min(taux produit, taux carte). */
  const cardRate = cardType === 'ald' ? 100 : cardType === 'aucune' ? 0 : cardType === 'standard' || cardType === 'casnos' ? 80 : 0

  const totals = useMemo(() => {
    const total = lines.reduce((s, l) => s + l.price, 0)
    const effective = lines.reduce((s, l) => {
      const applied = Math.min(l.rate, cardRate)
      return s + (l.price * applied) / 100
    }, 0)
    return {
      total,
      reimbursed: effective,
      patientPays: total - effective,
      effectiveRate: total > 0 ? Math.round((effective / total) * 100) : 0,
    }
  }, [lines, cardRate])

  /** Détection de doublons de DCI (risque de surdosage par redondance). */
  const duplicateGroups = useMemo(() => {
    const keyOf = (l: ChifaLine) =>
      (l.dciKey ?? l.dci)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/\*+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    const groups = new Map<string, ChifaLine[]>()
    for (const l of lines) {
      const k = keyOf(l)
      if (!k || k === 'ASSOCIATION') continue
      groups.set(k, [...(groups.get(k) ?? []), l])
    }
    return [...groups.entries()]
      .filter(([, ls]) => ls.length >= 2)
      .map(([dci, ls]) => ({ dci, lines: ls }))
  }, [lines])

  async function addLine(drug: { id: number; brand: string; dci: string; dciKey?: string }) {
    const uid = `${drug.id}-${Date.now()}`
    const result = addLineStore({
      uid,
      brand: drug.brand,
      dci: drug.dci,
      dciKey: drug.dciKey,
      price: 100,
      rate: 80,
    })
    if (result === 'duplicate') {
      toast({ title: 'Déjà présent', description: `${drug.brand} figure déjà dans l'ordonnance.` })
      return
    }
    if (result === 'full') {
      toast({
        title: 'Ordonnance complète',
        description: `Maximum ${MAX_CHIFA_LINES} lignes par simulation.`,
        variant: 'destructive',
      })
      return
    }
    // Récupère le prix public réel (liste officine) pour ce médicament
    try {
      const res = await fetchDrugDetail(drug.id)
      const ph = res.drug.pharmacy?.[0]
      if (ph && ph.ppa != null) {
        const realPrice = Math.round(ph.ppa * 100) / 100
        const rate = ph.refundable ? 80 : 0
        updateLineStore(uid, { price: realPrice, rate })
        toast({
          title: 'Prix réel appliqué',
          description: `${drug.brand} : ${formatPrice(realPrice)}${
            ph.refundable ? ' — remboursable CNAS (80 %)' : ' — non remboursé (0 %)'
          }`,
        })
      }
    } catch {
      /* prix indicatif par défaut */
    }
  }

  function updateLine(uid: string, patch: Partial<Omit<ChifaLine, 'uid'>>) {
    updateLineStore(uid, patch)
  }

  function removeLine(uid: string) {
    removeLineStore(uid)
  }

  /** Export : copie le récapitulatif texte (presse-papiers). */
  async function copySummary() {
    const linesText = lines
      .map(
        (l, i) =>
          `${i + 1}. ${l.brand} (${l.dci}) — ${fmtDA(l.price)} · taux produit ${l.rate} % → remboursé ${fmtDA(
            (l.price * Math.min(l.rate, cardRate)) / 100
          )}`
      )
      .join('\n')
    const text =
      `DzPharm — Ordonnance Chifa (simulation)\n` +
      `Carte : ${CARD_TYPES[cardType].label}\n\n` +
      `${linesText}\n\n` +
      `Total : ${fmtDA(totals.total)}\nRemboursé : ${fmtDA(totals.reimbursed)}\nReste à charge : ${fmtDA(totals.patientPays)} (taux effectif ${totals.effectiveRate} %)\n\n` +
      `Simulation indicative — tarifs de référence CNAS ; prix PPA à ajuster selon la pharmacie.`
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Récapitulatif copié',
        description: `${lines.length} ligne(s) collables dans un message ou un document.`,
      })
    } catch {
      toast({
        title: 'Copie impossible',
        description: "Votre navigateur a refusé l'accès au presse-papiers.",
        variant: 'destructive',
      })
    }
  }

  const CardIcon = CARD_TYPES[cardType].icon

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
      {/* ------------------------- Ordonnance ------------------------- */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4 text-chifa" aria-hidden />
              Statut de la carte Chifa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Select value={cardType} onValueChange={(v) => setCardType(v as ChifaCardType)}>
              <SelectTrigger className="h-11 w-full text-sm" aria-label="Type de carte">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CARD_TYPES) as ChifaCardType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium">{CARD_TYPES[k].label}</span>
                      <span className="text-xs font-semibold text-chifa">
                        {CARD_TYPES[k].badge}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <CardIcon className="mt-0.5 size-3.5 shrink-0 text-chifa" aria-hidden />
              {CARD_TYPES[cardType].description}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Receipt className="size-4 text-primary" aria-hidden />
                Ordonnance simulée
              </span>
              {lines.length > 0 ? (
                <span className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-xs text-primary"
                    onClick={() => void copySummary()}
                  >
                    <Copy className="size-3.5" aria-hidden />
                    Copier
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-state-danger"
                    onClick={() => clearLines()}
                    aria-label="Vider l'ordonnance"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SearchAutocomplete
              placeholder="Ajouter un médicament du référentiel…"
              ariaLabel="Ajouter un médicament à l'ordonnance Chifa"
              onSelect={(drug) =>
                void addLine({ id: drug.id, brand: drug.brand, dci: drug.dci })
              }
              rightHint={<Plus className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />}
            />

            {lines.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Ajoutez des médicaments pour estimer le reste à charge. Ajustez ensuite le
                prix public (PPA) et le taux de remboursement de chaque produit.
              </p>
            ) : (
              <ul className="space-y-2.5" aria-label="Médicaments de l'ordonnance">
                {lines.map((l) => {
                  const applied = Math.min(l.rate, cardRate)
                  const remb = (l.price * applied) / 100
                  const isDuplicate = duplicateGroups.some((g) =>
                    g.lines.some((gl) => gl.uid === l.uid)
                  )
                  return (
                    <li
                      key={l.uid}
                      className={cn(
                        'rounded-lg border bg-card p-3',
                        isDuplicate ? 'border-state-warning/50 bg-state-warning/5' : 'border-border'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {l.brand}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{l.dci}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(l.uid)}
                          aria-label={`Retirer ${l.brand}`}
                          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-state-danger/10 hover:text-state-danger focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <div className="mt-2.5 grid grid-cols-2 gap-2">
                        <div>
                          <Label
                            htmlFor={`price-${l.uid}`}
                            className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
                          >
                            Prix public (DA)
                          </Label>
                          <Input
                            id={`price-${l.uid}`}
                            type="number"
                            min={0}
                            step={5}
                            value={l.price}
                            onChange={(e) =>
                              updateLine(l.uid, {
                                price: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="mt-1 h-9 text-sm tabular-nums"
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor={`rate-${l.uid}`}
                            className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
                          >
                            Taux produit
                          </Label>
                          <Select
                            value={String(l.rate)}
                            onValueChange={(v) => updateLine(l.uid, { rate: Number(v) })}
                          >
                            <SelectTrigger
                              id={`rate-${l.uid}`}
                              className="mt-1 h-9 w-full text-sm"
                              aria-label={`Taux de remboursement de ${l.brand}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {RATE_OPTIONS.map((r) => (
                                <SelectItem key={r.value} value={String(r.value)}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Remboursement appliqué :{' '}
                        <span
                          className={cn(
                            'font-semibold',
                            applied > 0 ? 'text-state-safe' : 'text-state-danger'
                          )}
                        >
                          {applied} % → {fmtDA(remb)}
                        </span>
                        {applied < l.rate ? (
                          <span className="text-state-warning">
                            {' '}
                            (plafonné par la carte à {cardRate} %)
                          </span>
                        ) : null}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Doublons de DCI dans l'ordonnance */}
            {duplicateGroups.length > 0 ? (
              <div
                role="alert"
                className="space-y-1.5 rounded-lg border border-state-warning/40 bg-state-warning/10 p-3"
              >
                <p className="flex items-center gap-1.5 text-xs font-bold text-state-warning">
                  <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                  Doublon de DCI dans l’ordonnance
                </p>
                {duplicateGroups.map((g) => (
                  <p key={g.dci} className="text-[11px] leading-relaxed text-foreground/85">
                    <span className="font-semibold">{g.dci.toLowerCase()}</span> est présent(e)
                    dans {g.lines.length} produits ({g.lines.map((l) => l.brand).join(' + ')}) —
                    risque de dépassement de la dose maximale ; à valider avec le prescripteur.
                  </p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------- Résultat ------------------------- */}
      <div className="space-y-4">
        <Card className="overflow-hidden border-chifa/30">
          <div className="bg-gradient-to-br from-chifa/10 via-chifa/5 to-transparent p-6">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-chifa uppercase">
              <Wallet className="size-4" aria-hidden />
              Reste à charge estimé — patient
            </p>
            <p className="mt-2 text-5xl font-bold tracking-tight text-foreground tabular-nums">
              {totals.patientPays.toLocaleString('fr-FR', {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              })}
              <span className="ml-2 text-lg font-semibold text-muted-foreground">DA</span>
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              sur une ordonnance totale de {fmtDA(totals.total)} · taux effectif de
              remboursement {totals.effectiveRate} %
            </p>

            {/* Barre de répartition */}
            {totals.total > 0 ? (
              <div className="mt-4">
                <div
                  className="flex h-3.5 w-full overflow-hidden rounded-full bg-state-danger/25"
                  role="img"
                  aria-label={`Reste à charge ${totals.patientPays.toFixed(2)} dinars sur ${totals.total.toFixed(2)} dinars`}
                >
                  <div
                    className="h-full bg-gradient-to-r from-state-safe to-state-safe/70 transition-all duration-500"
                    style={{ width: `${totals.effectiveRate}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-state-safe">
                    <BadgeDollarSign className="size-3.5" aria-hidden />
                    Remboursé : {fmtDA(totals.reimbursed)}
                  </span>
                  <span className="flex items-center gap-1.5 text-state-danger">
                    <Wallet className="size-3.5" aria-hidden />
                    À payer : {fmtDA(totals.patientPays)}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <CardContent className="p-6 pt-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted/40 p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <Receipt className="size-3" aria-hidden />
                  Total ordonnance
                </p>
                <p className="mt-1 text-lg font-bold text-foreground tabular-nums">
                  {fmtDA(totals.total)}
                </p>
              </div>
              <div className="rounded-lg border border-state-safe/30 bg-state-safe/10 p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-state-safe uppercase">
                  <BadgeCheck className="size-3" aria-hidden />
                  Part CNAS / Chifa
                </p>
                <p className="mt-1 text-lg font-bold text-state-safe tabular-nums">
                  {fmtDA(totals.reimbursed)}
                </p>
              </div>
              <div className="rounded-lg border border-chifa/30 bg-chifa/10 p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-chifa uppercase">
                  <CircleDollarSign className="size-3" aria-hidden />
                  Ticket modérateur
                </p>
                <p className="mt-1 text-lg font-bold text-chifa tabular-nums">
                  {fmtDA(totals.patientPays)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comment fonctionne Chifa */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="size-4 text-primary" aria-hidden />
              Comment fonctionne le remboursement Chifa ?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
            <p>
              La carte Chifa (<i>carte à puce</i>) permet à l&apos;assuré social CNAS/CASNOS
              d&apos;être remboursé directement en pharmacie sur la base du{' '}
              <strong>tarif de référence</strong> du médicament, sans avance de fonds.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-state-safe" aria-hidden />
                <span>
                  <strong className="text-state-safe">ALD (100 %)</strong> — maladies
                  chroniques listées (diabète, hypertension, asthme, cancers,
                  insuffisance rénale…) : prise en charge intégrale du tarif de référence.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <span>
                  <strong className="text-primary">Standard (80 %)</strong> — produits
                  remboursables de la nomenclature : 80 % du tarif de référence, le
                  patient règle le ticket modérateur (20 %).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-state-warning" aria-hidden />
                <span>
                  <strong className="text-state-warning">Taux partiel (40 %)</strong> —
                  certains produits à taux réduit selon l&apos;arrêté de remboursement.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-state-danger" aria-hidden />
                <span>
                  <strong className="text-state-danger">Non remboursable (0 %)</strong> —
                  hors liste : prix public intégralement à la charge du patient.
                </span>
              </li>
            </ul>
            <Separator className="my-1" />
            <p className="text-xs text-muted-foreground">
              Simulation indicative : les montants réels dépendent du tarif de référence
              officiel de chaque spécialité (fixé par arrêté) et du taux appliqué à la
              vignette. Renseignez le prix public constaté en pharmacie pour estimer le
              reste à charge.
            </p>
          </CardContent>
        </Card>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Calculator className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Le simulateur applique le taux de la carte comme plafond : un produit à 80 %
          n&apos;est remboursé qu&apos;à 80 % avec une carte standard, et reste à 0 % sans
          couverture. Les prix par défaut sont indicatifs — ajustez-les selon le PPA réel.
        </p>
        <SafetyNote className="mt-4" />
      </div>
    </div>
  )
}
