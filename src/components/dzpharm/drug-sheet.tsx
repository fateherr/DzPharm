'use client'

import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Baby,
  BadgeCheck,
  Ban,
  Barcode,
  BookOpen,
  Building2,
  Calculator,
  CalendarClock,
  CalendarX2,
  Coins,
  Eye,
  FileText,
  FlaskConical,
  Info,
  Library,
  Loader2,
  Package,
  Pill,
  Printer,
  Share2,
  ShieldPlus,
  Star,
  Syringe,
  Timer,
  TrendingDown,
  TriangleAlert,
  Type,
  ArrowUpDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { fetchDrugDetail, postDrugView } from './api'
import type { DrugDetail } from './types'
import { RcpViewer } from './rcp-view'
import { PatientDosageDialog } from './patient-dosage-sheet'
import { cacheDrug } from '@/lib/db/indexeddb'
import {
  ChifaBadge,
  ListeBadge,
  OriginBadge,
  StatusBadge,
  countryCode,
  formatDate,
  formatNumber,
  formatPrice,
  isLocal,
} from './status-badge'
import { MAX_FAVORITES, useDzPharm } from './store'
import { SafetyNote } from './safety-note'
import { FreshnessBadge } from './freshness-badge'
import { LasaAlertBadge } from './lasa-alert-badge'
import { WILAYAS } from '@/lib/wilayas'

/* ------------------------------------------------------------------ */
/* Signalements de pénurie — types & fetchers locaux                   */
/* ------------------------------------------------------------------ */

interface DrugShortagesResponse {
  reports: Array<{
    id: number
    brand: string
    wilaya: string | null
    createdAt: string
    status: string
  }>
  stats: { total: number; active: number; resolved: number; last48h: number }
}

async function fetchDrugShortages(
  drugId: number,
  signal?: AbortSignal
): Promise<DrugShortagesResponse> {
  const res = await fetch(`/api/shortages?drugId=${drugId}`, { signal })
  if (!res.ok) throw new Error(`Requête échouée (${res.status})`)
  return (await res.json()) as DrugShortagesResponse
}

async function postShortageReport(payload: {
  drugId: number
  brand: string
  dci?: string | null
  wilaya?: string | null
  note?: string | null
}): Promise<void> {
  const res = await fetch('/api/shortages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? 'Échec du signalement')
  }
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon?: typeof Pill
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card/60 p-3 shadow-2xs transition-all hover:border-primary/30">
      <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {Icon ? <Icon className="size-3 text-primary/70" aria-hidden /> : null}
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold break-words text-foreground">{value || '—'}</p>
    </div>
  )
}

function isPediatricCandidate(form?: string | null, dci?: string | null, brand?: string | null): boolean {
  const text = `${form ?? ''} ${dci ?? ''} ${brand ?? ''}`.toUpperCase()
  const terms = [
    'SIROP', 'SUSP', 'SUSPENSION', 'GOUTTE', 'BUVABLE', 'SACHET', 'POUDRE',
    'ENFANT', 'NOURRISSON', 'PED', 'PEDIATRIQUE', 'SUPPO', 'PARACETAMOL',
    'AMOXICILLINE', 'IBUPROFENE', 'AZITHROMYCINE', 'CEFIXIME'
  ]
  return terms.some((t) => text.includes(t))
}

function ChifaCopayCalculator({ ppa }: { ppa: number }) {
  const [regime, setRegime] = useState<'80' | '100'>('80')

  const cnasRate = regime === '100' ? 1.0 : 0.8
  const cnasCovered = Math.round(ppa * cnasRate)
  const patientShare = Math.max(0, ppa - cnasCovered)

  return (
    <div className="mt-3.5 rounded-xl border border-chifa/30 bg-card/70 p-3.5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <BadgeCheck className="size-4 text-chifa" aria-hidden />
          Décomposition Tiers-Payant CHIFA
        </p>
        <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setRegime('80')}
            className={cn(
              'rounded-md px-2.5 py-0.5 font-semibold transition-all',
              regime === '80'
                ? 'bg-chifa text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            80% Général
          </button>
          <button
            type="button"
            onClick={() => setRegime('100')}
            className={cn(
              'rounded-md px-2.5 py-0.5 font-semibold transition-all',
              regime === '100'
                ? 'bg-chifa text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            100% ALD / Chronique
          </button>
        </div>
      </div>

      {/* Barre visuelle de répartition CNAS vs Ticket Modérateur */}
      <div className="mt-3 overflow-hidden rounded-full bg-muted/80 h-2 flex">
        <div
          style={{ width: `${cnasRate * 100}%` }}
          className="bg-chifa transition-all duration-500 ease-out"
          title={`CNAS: ${cnasRate * 100}%`}
        />
        <div
          style={{ width: `${(1 - cnasRate) * 100}%` }}
          className="bg-state-warning transition-all duration-500 ease-out"
          title={`Ticket modérateur: ${Math.round((1 - cnasRate) * 100)}%`}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg border border-chifa/30 bg-chifa/10 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-chifa">
            Prise en charge CNAS ({regime}%)
          </p>
          <p className="mt-0.5 text-base font-bold text-chifa tabular-nums">
            {formatPrice(cnasCovered)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/50 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ticket modérateur (Patient)
          </p>
          <p className="mt-0.5 text-base font-bold text-foreground tabular-nums">
            {patientShare === 0 ? '0,00 DA (100% CNAS)' : formatPrice(patientShare)}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground text-center">
        Tarif PPA officiel · Droit commun CNAS / CASNOS · Tiers-payant officine
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Quatuor Clinique Express (Matrice 2x2 — Vue 30 secondes)           */
/* ------------------------------------------------------------------ */

function ClinicalMatrix({
  drug,
  activeShortages,
  onOpenShortages,
}: {
  drug: DrugDetail
  activeShortages: number
  onOpenShortages: () => void
}) {
  const pharmacy = drug.pharmacy?.[0]
  const isPediatric = isPediatricCandidate(drug.form, drug.dci, drug.brand)
  const isStup = (drug.liste || '').toUpperCase().includes('STUPE')

  return (
    <section aria-label="Quatuor clinique express" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {/* Quadrant 1 : Prix & Chifa */}
      <div className="clinical-quadrant">
        <div className="flex items-center justify-between gap-1 text-[11px] font-semibold tracking-wider text-chifa uppercase">
          <span className="flex items-center gap-1.5">
            <Coins className="size-3.5" aria-hidden />
            Prix & Chifa
          </span>
          {pharmacy?.refundable ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-chifa/10 px-2 py-0.5 text-[10px] font-bold text-chifa">
              <BadgeCheck className="size-3" />
              Chifa
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-foreground tabular-nums text-price">
          {pharmacy?.ppa != null ? formatPrice(pharmacy.ppa) : 'Non référencé'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
          {pharmacy?.refundable
            ? `Prise en charge CNAS ${pharmacy.cnasId ? `(${pharmacy.cnasId})` : '80% / 100%'}`
            : 'Produit hospitalier ou non remboursable'}
        </p>
      </div>

      {/* Quadrant 2 : Forme & Posologie */}
      <div className="clinical-quadrant">
        <div className="flex items-center justify-between gap-1 text-[11px] font-semibold tracking-wider text-primary uppercase">
          <span className="flex items-center gap-1.5">
            <Pill className="size-3.5" aria-hidden />
            Forme & Dosage
          </span>
          {isPediatric && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              <Baby className="size-3" />
              Pédiatrique
            </span>
          )}
        </div>
        <p className="mt-2 text-base sm:text-lg font-bold tracking-tight text-foreground line-clamp-1">
          {drug.dosage || drug.form || 'Non spécifié'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
          {drug.form ? drug.form : ''}
          {drug.packaging ? ` · ${drug.packaging}` : ''}
        </p>
      </div>

      {/* Quadrant 3 : Sécurité & Prescription */}
      <div className="clinical-quadrant">
        <div className="flex items-center justify-between gap-1 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldPlus className="size-3.5" aria-hidden />
            Sécurité & Délivrance
          </span>
          {isStup ? (
            <span className="rounded-full bg-state-danger/15 px-2 py-0.5 text-[10px] font-bold text-state-danger">
              Stupéfiant
            </span>
          ) : drug.p1 ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              P1 Hôpital
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-base sm:text-lg font-bold tracking-tight text-foreground">
          {drug.liste || 'Prescription libre'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
          {drug.domains?.slice(0, 2).join(', ') || 'Pharmacopée nationale'}
        </p>
      </div>

      {/* Quadrant 4 : Disponibilité & AMM */}
      <div className="clinical-quadrant">
        <div className="flex items-center justify-between gap-1 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <TriangleAlert className="size-3.5" aria-hidden />
            Disponibilité Officine
          </span>
          {activeShortages > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-state-warning/15 px-2 py-0.5 text-[10px] font-bold text-state-warning animate-pulse">
              En tension
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-state-safe/10 px-2 py-0.5 text-[10px] font-semibold text-state-safe">
              Disponible
            </span>
          )}
        </div>
        <p className="mt-2 text-base sm:text-lg font-bold tracking-tight text-foreground">
          {activeShortages > 0 ? `${activeShortages} tension(s) signalée(s)` : 'En approvisionnement normal'}
        </p>
        <button
          type="button"
          onClick={onOpenShortages}
          className="mt-1 text-xs text-primary hover:underline font-medium flex items-center gap-1"
        >
          {activeShortages > 0 ? 'Consulter les signalements' : 'Signaler une rupture locale'}
        </button>
      </div>
    </section>
  )
}

function PediatricPosologyWidget({
  form,
  dci,
  brand,
  onOpenAdvanced,
}: {
  form?: string | null
  dci?: string | null
  brand?: string | null
  onOpenAdvanced: () => void
}) {
  const [weight, setWeight] = useState(14)

  const isPediatric = isPediatricCandidate(form, dci, brand)
  if (!isPediatric) return null

  const dciUpper = (dci || '').toUpperCase()
  let dosePerKgPerDose = 15
  let frequency = '4 prises par 24h (toutes les 6 heures)'
  let totalPerKgPerDay = 60
  let maxDay = 'Dose max : 80 mg/kg/j (max 3 000 mg/j)'

  if (dciUpper.includes('PARACETAMOL')) {
    dosePerKgPerDose = 15
    totalPerKgPerDay = 60
    frequency = '4 prises par jour (espacées de 4 à 6 heures)'
    maxDay = 'Dose max : 80 mg/kg/jour sans dépasser 3 000 mg/j'
  } else if (dciUpper.includes('IBUPROFENE')) {
    dosePerKgPerDose = 10
    totalPerKgPerDay = 30
    frequency = '3 prises par jour (toutes les 8 heures aux repas)'
    maxDay = 'Dose max : 30 mg/kg/jour'
  } else if (dciUpper.includes('AMOXICILLINE')) {
    dosePerKgPerDose = 25
    totalPerKgPerDay = 75
    frequency = '3 prises par jour (toutes les 8 heures)'
    maxDay = 'Dose max : 100 mg/kg/jour'
  } else if (dciUpper.includes('AZITHROMYCINE')) {
    dosePerKgPerDose = 10
    totalPerKgPerDay = 10
    frequency = '1 prise unique par jour pendant 3 jours'
    maxDay = 'Dose max : 500 mg/jour'
  }

  const dosePerDose = Math.round(weight * dosePerKgPerDose)
  const doseTotalDay = Math.round(weight * totalPerKgPerDay)

  return (
    <section
      aria-label="Calculateur posologique pédiatrique"
      className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
          <Baby className="size-4" aria-hidden />
          Calculateur Posologique Pédiatrique Rapide
        </p>
        <button
          type="button"
          onClick={onOpenAdvanced}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          <Calculator className="size-3" aria-hidden />
          Calculateur complet →
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center text-xs text-foreground mb-1.5 font-medium">
            <span>Poids de l&apos;enfant :</span>
            <span className="font-bold text-primary tabular-nums">{weight} kg</span>
          </div>
          <input
            type="range"
            min="3"
            max="45"
            step="1"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            aria-label="Poids de l'enfant en kg"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Nourrisson (3 kg)</span>
            <span>Enfant ({weight} kg)</span>
            <span>Grand enfant (45 kg)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center pt-1">
          <div className="rounded-lg border border-primary/20 bg-background/80 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Dose unitaire (par prise)
            </p>
            <p className="mt-0.5 text-lg font-bold text-primary tabular-nums">
              {dosePerDose} mg
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              ~ {dosePerKgPerDose} mg/kg
            </p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-background/80 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Dose journalière totale
            </p>
            <p className="mt-0.5 text-lg font-bold text-foreground tabular-nums">
              {doseTotalDay} mg/24h
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              ~ {totalPerKgPerDay} mg/kg/j
            </p>
          </div>
        </div>

        <div className="rounded-md bg-secondary/60 p-2 text-xs text-foreground/90 space-y-0.5">
          <p className="font-medium flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" />
            Rythme : {frequency}
          </p>
          <p className="text-[11px] text-muted-foreground pl-3">
            {maxDay}
          </p>
        </div>
      </div>
    </section>
  )
}

export function DrugSheet() {
  const sheetDrugId = useDzPharm((s) => s.sheetDrugId)
  const closeDrug = useDzPharm((s) => s.closeDrug)
  const openDrug = useDzPharm((s) => s.openDrug)
  const addToBasket = useDzPharm((s) => s.addToBasket)
  const basket = useDzPharm((s) => s.basket)
  const setView = useDzPharm((s) => s.setView)
  const openTool = useDzPharm((s) => s.openTool)
  const openLibraryMonograph = useDzPharm((s) => s.openLibraryMonograph)
  const openAdminBarcodeForDrug = useDzPharm((s) => s.openAdminBarcodeForDrug)
  const favorites = useDzPharm((s) => s.favorites)
  const toggleFavorite = useDzPharm((s) => s.toggleFavorite)
  const pushRecent = useDzPharm((s) => s.pushRecent)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [sheetTab, setSheetTab] = useState<'fiche' | 'rcp'>('fiche')

  // Signalement pénurie (popover) — wilaya + note
  const [shortageOpen, setShortageOpen] = useState(false)
  const [shortageWilaya, setShortageWilaya] = useState('')
  const [shortageNote, setShortageNote] = useState('')
  const [shortageSubmitting, setShortageSubmitting] = useState(false)

  // Repart sur l'onglet Fiche à chaque changement de médicament (ajustement au rendu)
  const [prevDrugId, setPrevDrugId] = useState(sheetDrugId)
  if (sheetDrugId !== prevDrugId) {
    setPrevDrugId(sheetDrugId)
    setSheetTab('fiche')
  }

  // Rafraîchit la fiche (compteur de consultations) à chaque ouverture
  useEffect(() => {
    if (sheetDrugId !== null) {
      queryClient.invalidateQueries({ queryKey: ['drug', sheetDrugId] })
    }
  }, [sheetDrugId, queryClient])

  const { data, isLoading } = useQuery({
    queryKey: ['drug', sheetDrugId],
    queryFn: ({ signal }) => fetchDrugDetail(sheetDrugId as number, signal),
    enabled: sheetDrugId !== null,
  })

  // Signalements de pénurie communautaires pour ce médicament
  const { data: shortageData } = useQuery({
    queryKey: ['shortages', 'drug', sheetDrugId],
    queryFn: ({ signal }) => fetchDrugShortages(sheetDrugId as number, signal),
    enabled: sheetDrugId !== null,
  })
  const activeShortageCount = shortageData?.stats.active ?? 0

  const drug = data?.drug
  const equivalents = data?.equivalents ?? []
  const isFav = drug ? favorites.some((f) => f.id === drug.id) : false
  const isInBasket = drug ? basket.some((b) => b.id === drug.id) : false

  // Complétude des données (audit 1.2 / P9) — réutilise strictement les
  // conditions des sections existantes : monographie livre (lien RCP/DCI)
  // et section « Prix public — officine ».
  const sheetHasMonograph = drug?.rcpSource === 'BOOK' && Boolean(drug?.dciKey)
  const sheetHasPrice = (drug?.pharmacy?.length ?? 0) > 0

  // Comparateur de prix sur les équivalents référencés en officine
  const pricedEquivalents = equivalents.filter((e) => e.price != null)
  const minEquivalentPrice =
    pricedEquivalents.length > 0
      ? Math.min(...pricedEquivalents.map((e) => e.price as number))
      : null
  const cheapestEquivalent =
    pricedEquivalents.length > 0
      ? pricedEquivalents.reduce((a, b) => ((a.price ?? Infinity) <= (b.price ?? Infinity) ? a : b))
      : null

  const [patientSheetOpen, setPatientSheetOpen] = useState(false)
  const [equivSort, setEquivSort] = useState<'price_asc' | 'copay_asc' | 'brand_asc'>('price_asc')

  const sortedEquivalents = useMemo(() => {
    const list = [...equivalents]
    if (equivSort === 'price_asc') {
      return list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
    }
    if (equivSort === 'copay_asc') {
      const getCopay = (e: (typeof equivalents)[number]) => {
        if (e.price == null) return Infinity
        return e.refundable ? e.price * 0.2 : e.price
      }
      return list.sort((a, b) => getCopay(a) - getCopay(b))
    }
    return list.sort((a, b) => a.brand.localeCompare(b.brand, 'fr'))
  }, [equivalents, equivSort])

  // Historique récent + compteur de consultations (une fois par ouverture)
  const countedRef = useRef<number | null>(null)
  useEffect(() => {
    if (!drug) return
    pushRecent({ id: drug.id, brand: drug.brand, dci: drug.dci, status: drug.status })
    cacheDrug(drug).catch(() => {})
    if (countedRef.current !== drug.id) {
      countedRef.current = drug.id
      postDrugView(drug.id)
    }
  }, [drug, pushRecent])

  function handleToggleFavorite() {
    if (!drug) return
    const res = toggleFavorite({ id: drug.id, brand: drug.brand, dci: drug.dci })
    if (res === 'added') {
      toast({
        title: 'Ajouté aux favoris',
        description: `${drug.brand} est accessible depuis l'accueil —Mes favoris.`,
      })
    } else if (res === 'removed') {
      // P1-05 — UNDO action on favorites removal. Re-adds the drug on click.
      toast({
        title: 'Retiré des favoris',
        description: `${drug.brand} n'est plus dans vos favoris.`,
        action: (
          <ToastAction
            altText="Annuler le retrait"
            onClick={() => {
              toggleFavorite({ id: drug.id, brand: drug.brand, dci: drug.dci })
            }}
          >
            Annuler
          </ToastAction>
        ),
      })
    } else {
      toast({
        title: 'Favoris complets',
        description: `Limite de ${MAX_FAVORITES} favoris atteinte.`,
        variant: 'destructive',
      })
    }
  }

  function handlePrint() {
    window.print()
  }

  async function handleShare() {
    if (!drug) return
    const pharmacy = drug.pharmacy?.[0]
    const drugUrl = `${window.location.origin}/medicament/${drug.id}`
    const text = [
      `${drug.brand} — ${drug.dci}`,
      `Statut : ${drug.status === 'ACTIF' ? 'Actif' : drug.status === 'RETRIE' ? 'Retiré du marché' : 'Non renouvelé'}`,
      drug.form ? `Forme : ${drug.form}` : '',
      drug.dosage ? `Dosage : ${drug.dosage}` : '',
      drug.lab ? `Laboratoire : ${drug.lab}` : '',
      drug.regNumber ? `AMM : ${drug.regNumber}` : '',
      pharmacy?.ppa != null ? `Prix public : ${formatPrice(pharmacy.ppa)}` : '',
      `Fiche complète → ${drugUrl}`,
    ]
      .filter(Boolean)
      .join('\n')

    let shared = false
    try {
      if (navigator.share) {
        await navigator.share({ title: `${drug.brand} — DzPharm`, text, url: drugUrl })
        shared = true
      }
    } catch {
      /* partage natif annulé — repli presse-papier */
    }
    if (!shared) {
      let copied = false
      try {
        await navigator.clipboard.writeText(text)
        copied = true
      } catch {
        // Repli execCommand (contextes sans permission Clipboard API)
        try {
          const ta = document.createElement('textarea')
          ta.value = text
          ta.style.position = 'fixed'
          ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.select()
          copied = document.execCommand('copy')
          document.body.removeChild(ta)
        } catch {
          copied = false
        }
      }
      if (copied) {
        toast({
          title: 'Fiche copiée',
          description: 'Le résumé du médicament est dans le presse-papier.',
        })
      } else {
        toast({
          title: 'Copie impossible',
          description: 'Votre navigateur bloque le presse-papier.',
          variant: 'destructive',
        })
      }
    }
  }

  function handleAddToBasket() {
    if (!drug) return
    const result = addToBasket({
      id: drug.id,
      brand: drug.brand,
      dci: drug.dci,
      status: drug.status,
    })
    if (result === 'added') {
      toast({
        title: 'Ajouté au contrôle d\u2019interactions',
        description: `${drug.brand} (${drug.dci}) — retrouvez-le dans l\u2019onglet Interactions.`,
      })
      closeDrug()
      setView('interactions')
    } else if (result === 'duplicate') {
      toast({ title: 'Déjà présent', description: 'Ce médicament est déjà dans le panier d\u2019interactions.' })
    } else {
      toast({ title: 'Panier complet', description: 'Le contrôle d\u2019interactions est limité à 10 médicaments.' })
    }
  }

  async function handleSubmitShortage() {
    if (!drug) return
    setShortageSubmitting(true)
    try {
      await postShortageReport({
        drugId: drug.id,
        brand: drug.brand,
        dci: drug.dci,
        wilaya: shortageWilaya || null,
        note: shortageNote.trim() || null,
      })
      toast({
        title: 'Signalement enregistré',
        description: `Merci ! ${drug.brand} a été signalé en tension d'approvisionnement.`,
      })
      setShortageOpen(false)
      setShortageWilaya('')
      setShortageNote('')
      await queryClient.invalidateQueries({ queryKey: ['shortages'] })
    } catch (err) {
      toast({
        title: 'Signalement impossible',
        description: err instanceof Error ? err.message : 'Une erreur est survenue. Réessayez.',
        variant: 'destructive',
      })
    } finally {
      setShortageSubmitting(false)
    }
  }

  return (
    <Sheet open={sheetDrugId !== null} onOpenChange={(o) => !o && closeDrug()}>
      <SheetContent
        side="right"
        className="flex flex-col h-full w-full gap-0 overflow-hidden border-l border-border/80 bg-background p-0 shadow-2xl sm:max-w-xl md:max-w-2xl lg:max-w-[740px]"
      >
        {/* Mobile touch pull handle */}
        <div className="sm:hidden shrink-0 pt-2 pb-1 bg-card/40" aria-hidden>
          <div className="touch-sheet-handle" />
        </div>

        {isLoading || !drug ? (
          <div className="space-y-4 p-6">
            <SheetTitle className="sr-only">Chargement de la fiche médicament</SheetTitle>
            <SheetDescription className="sr-only">
              Les données du médicament sont en cours de chargement.
            </SheetDescription>
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <div className="grid grid-cols-2 gap-3 pt-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <SheetHeader className="shrink-0 space-y-3 border-b border-border/70 bg-gradient-to-b from-card to-background/60 backdrop-blur-md p-5 sm:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <SheetTitle className="text-2xl sm:text-3xl leading-tight font-extrabold tracking-tight text-foreground">
                    {drug.brand}
                  </SheetTitle>
                  <SheetDescription className="mt-1 text-sm sm:text-base font-semibold text-muted-foreground flex flex-wrap items-center gap-2">
                    <span>{drug.dci}</span>
                    {drug.dosage && (
                      <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {drug.dosage}
                      </span>
                    )}
                  </SheetDescription>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleShare}
                    aria-label={`Partager la fiche de ${drug.brand}`}
                    className="size-9 rounded-lg text-muted-foreground hover:text-primary"
                  >
                    <Share2 className="size-5" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleFavorite}
                    aria-label={isFav ? `Retirer ${drug.brand} des favoris` : `Ajouter ${drug.brand} aux favoris`}
                    aria-pressed={isFav}
                    className={cn(
                      'size-9 rounded-lg transition-colors',
                      isFav
                        ? 'text-amber-500 hover:bg-amber-500/10'
                        : 'text-muted-foreground hover:text-amber-500'
                    )}
                  >
                    <Star
                      className={cn('size-5', isFav && 'fill-amber-500 text-amber-500')}
                      aria-hidden
                    />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Options d'impression"
                        className="size-9 rounded-lg text-muted-foreground hover:text-primary"
                        title="Imprimer..."
                      >
                        <Printer className="size-5" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 text-xs">
                      <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer">
                        <FileText className="size-4 text-muted-foreground" />
                        <span>Monographie officielle A4</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setPatientSheetOpen(true)}
                        className="gap-2 cursor-pointer font-semibold text-primary"
                      >
                        <Printer className="size-4 text-primary" />
                        <span>Fiche Posologique Patient</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={drug.status} />
                <OriginBadge country={drug.country} />
                <ListeBadge liste={drug.liste} />
                {drug.pharmacy?.[0]?.refundable && (
                  <ChifaBadge refundable={true} cnasId={drug.pharmacy[0].cnasId} />
                )}
                <FreshnessBadge variant="compact" />
                {drug.barcode && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-800 dark:text-emerald-300">
                    <Barcode className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{drug.barcode}</span>
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAdminBarcodeForDrug(drug.id)}
                  className="h-6 text-[11px] gap-1 px-2 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                  title="Gérer les codes-barres originaux de ce produit (Admin)"
                >
                  <Barcode className="size-3" />
                  <span>{drug.barcode ? 'Éditer Code-Barres' : '+ Code-Barres (Admin)'}</span>
                </Button>
                {drug.domains.slice(0, 2).map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                  >
                    {d}
                  </span>
                ))}
                {drug.regNumber && (
                  <span className="inline-flex items-center rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-xs font-mono text-muted-foreground">
                    AMM: {drug.regNumber}
                  </span>
                )}
                {typeof drug.views === 'number' && drug.views > 0 ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums"
                    title="Consultations de cette fiche sur DzPharm"
                  >
                    <Eye className="size-3" aria-hidden />
                    {formatNumber(drug.views)}
                  </span>
                ) : null}
              </div>

              {/* Complétude des données — audit 1.2 / P9 */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Complétude
                </span>
                {sheetHasMonograph ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-md border border-state-safe/30 bg-state-safe/10 px-2 py-0.5 text-xs font-medium text-state-safe"
                    title="Monographie DCI complète issue des livres techniques DzPharm"
                  >
                    <BadgeCheck className="size-3" aria-hidden />
                    Fiche complète
                  </span>
                ) : null}
                {sheetHasPrice ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-md border border-chifa/30 bg-chifa/10 px-2 py-0.5 text-xs font-medium text-chifa"
                    title="Prix public PPA référencé en officine (DA)"
                  >
                    <Coins className="size-3" aria-hidden />
                    Prix PPA public
                  </span>
                ) : null}
                {!sheetHasMonograph && !sheetHasPrice ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    title="Inscription à la nomenclature sans monographie ni prix référencé"
                  >
                    <FileText className="size-3" aria-hidden />
                    Inscription simple
                  </span>
                ) : null}
              </div>
            </SheetHeader>

            <Tabs
              value={sheetTab}
              onValueChange={(v) => setSheetTab(v as 'fiche' | 'rcp')}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <TabsList className="mx-5 my-2.5 grid h-10 shrink-0 grid-cols-2">
                <TabsTrigger value="fiche" className="text-sm font-semibold">
                  Fiche produit
                </TabsTrigger>
                <TabsTrigger value="rcp" className="gap-1.5 text-sm font-semibold">
                  <BookOpen className="size-3.5" aria-hidden />
                  RCP & Monographie
                  {drug.rcpSource === 'BOOK' && (
                    <span
                      className="rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary"
                      title="RCP issu des livres techniques DzPharm"
                    >
                      Livre
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="fiche" className="mt-0 flex-1 overflow-y-auto scroll-thin">
                <div className="space-y-6 p-5 sm:p-6">
                  {/* Filet de sécurité LASA & High-Alert (BS-05) */}
                  <LasaAlertBadge brand={drug.brand} dci={drug.dci} liste={drug.liste} />

                  {/* Quatuor Clinique Express (30-second glance) */}
                  <ClinicalMatrix
                    drug={drug}
                    activeShortages={activeShortageCount}
                    onOpenShortages={() => setShortageOpen(true)}
                  />
              {/* Prix officine (PPA) */}
              {drug.pharmacy && drug.pharmacy.length > 0 ? (
                <section
                  aria-label="Prix public en officine"
                  className="rounded-xl border border-chifa/30 bg-gradient-to-br from-chifa/10 via-chifa/5 to-transparent p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-chifa uppercase">
                        <Coins className="size-3.5" aria-hidden />
                        Prix public — officine
                      </p>
                      <p className="mt-1.5 text-3xl font-bold tracking-tight text-foreground tabular-nums">
                        {formatPrice(drug.pharmacy[0].ppa)}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed text-muted-foreground">
                        <span>
                          {drug.pharmacy[0].name}
                          {drug.pharmacy[0].lab ? ` · ${drug.pharmacy[0].lab}` : ''}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                          title="Date de la liste des prix utilisée comme source"
                        >
                          <CalendarClock className="size-3" aria-hidden />
                          Dernière vérification : Août 2026
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {drug.pharmacy[0].refundable ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-state-safe/30 bg-state-safe/10 px-2.5 py-1 text-xs font-semibold text-state-safe"
                          title={`ID CNAS : ${drug.pharmacy[0].cnasId}`}
                        >
                          <BadgeCheck className="size-3.5" aria-hidden />
                          Remboursable CNAS
                        </span>
                      ) : (
                        <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          Non remboursé
                        </span>
                      )}
                      {drug.pharmacy[0].class ? (
                        <span className="max-w-[200px] truncate rounded-md border border-border bg-card/70 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                          {drug.pharmacy[0].class}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {drug.pharmacy.length > 1 ? (
                    <p className="mt-2.5 border-t border-chifa/15 pt-2 text-xs text-muted-foreground">
                      {drug.pharmacy.length - 1} autre{drug.pharmacy.length > 2 ? 's' : ''} conditionnement
                      {drug.pharmacy.length > 2 ? 's' : ''} référencé
                      {drug.pharmacy.length > 2 ? 's' : ''} — de{' '}
                      <span className="font-semibold text-foreground tabular-nums">
                        {formatPrice(drug.pharmacy[drug.pharmacy.length - 1].ppa)}
                      </span>{' '}
                      à{' '}
                      <span className="font-semibold text-foreground tabular-nums">
                        {formatPrice(drug.pharmacy[0].ppa)}
                      </span>
                    </p>
                  ) : null}
                  {drug.pharmacy[0].refundable && drug.pharmacy[0].ppa ? (
                    <ChifaCopayCalculator ppa={drug.pharmacy[0].ppa} />
                  ) : null}
                </section>
              ) : null}

              {/* Tension d'approvisionnement (signalements communautaires) */}
              <section
                aria-label="Tension d'approvisionnement"
                className="rounded-xl border border-state-warning/30 bg-state-warning/5 p-4"
              >
                {activeShortageCount > 0 ? (
                  <p
                    className="flex items-start gap-2 text-sm leading-relaxed text-state-warning"
                    role="status"
                  >
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      <span className="font-semibold">
                        Signalé en tension d&apos;approvisionnement par la communauté
                      </span>{' '}
                      ({activeShortageCount} signalement{activeShortageCount > 1 ? 's' : ''} récent
                      {activeShortageCount > 1 ? 's' : ''}) — signalements indicatifs non vérifiés.
                    </span>
                  </p>
                ) : null}
                <Popover open={shortageOpen} onOpenChange={setShortageOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-9 gap-1.5 border-state-warning/40 text-xs font-semibold text-state-warning hover:bg-state-warning/10 hover:text-state-warning',
                        activeShortageCount > 0 && 'mt-2.5'
                      )}
                      aria-label={`Signaler une pénurie de ${drug.brand}`}
                    >
                      <TriangleAlert className="size-3.5" aria-hidden />
                      Signaler une pénurie
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80" aria-label="Formulaire de signalement de pénurie">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Signaler une pénurie</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {drug.brand}
                          {drug.dci ? ` — ${drug.dci}` : ''}
                        </p>
                      </div>
                      <div>
                        <Label
                          htmlFor="sheet-shortage-wilaya"
                          className="mb-1.5 block text-xs font-medium text-muted-foreground"
                        >
                          Wilaya
                        </Label>
                        <Select value={shortageWilaya} onValueChange={setShortageWilaya}>
                          <SelectTrigger
                            id="sheet-shortage-wilaya"
                            className="h-10 w-full text-sm"
                            aria-label="Sélectionner la wilaya de la pénurie"
                          >
                            <SelectValue placeholder="Sélectionner une wilaya" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {WILAYAS.map((w) => (
                              <SelectItem key={w} value={w}>
                                {w}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor="sheet-shortage-note"
                          className="mb-1.5 block text-xs font-medium text-muted-foreground"
                        >
                          Note (optionnel, 280 caractères max)
                        </Label>
                        <Textarea
                          id="sheet-shortage-note"
                          value={shortageNote}
                          onChange={(e) => setShortageNote(e.target.value.slice(0, 280))}
                          placeholder="Ex : introuvable depuis 2 semaines à Alger…"
                          rows={2}
                          className="resize-none text-sm"
                        />
                      </div>
                      <Button
                        onClick={handleSubmitShortage}
                        disabled={shortageSubmitting}
                        className="h-10 w-full text-sm font-semibold"
                      >
                        {shortageSubmitting ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <TriangleAlert className="size-4" aria-hidden />
                        )}
                        {shortageSubmitting ? 'Envoi…' : 'Envoyer le signalement'}
                      </Button>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Signalement communautaire indicatif — il sera visible dans l&apos;onglet
                        Outils → Pénuries après rechargement de la liste.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </section>

              {/* Alertes statut */}
              {drug.status === 'RETRIE' && (
                <div className="rounded-lg border border-state-danger/40 bg-state-danger/10 p-4" role="alert">
                  <p className="flex items-center gap-2 text-sm font-semibold text-state-danger">
                    <Ban className="size-4" aria-hidden />
                    Médicament retiré du marché
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-foreground/90">
                    {drug.withdrawDate ? (
                      <p>
                        <span className="text-muted-foreground">Date de retrait : </span>
                        {formatDate(drug.withdrawDate)}
                      </p>
                    ) : null}
                    {drug.withdrawReason ? (
                      <p>
                        <span className="text-muted-foreground">Motif : </span>
                        {drug.withdrawReason}
                      </p>
                    ) : null}
                    {!drug.withdrawDate && !drug.withdrawReason ? (
                      <p className="text-muted-foreground">
                        Ce produit figure sur la liste des retraits de la nomenclature.
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
              {drug.status === 'NON_RENOUVELE' && (
                <div className="rounded-lg border border-state-warning/40 bg-state-warning/10 p-4" role="alert">
                  <p className="flex items-center gap-2 text-sm font-semibold text-state-warning">
                    <AlertTriangle className="size-4" aria-hidden />
                    Enregistrement non renouvelé
                  </p>
                  <p className="mt-1.5 text-sm text-foreground/90">
                    L&apos;AMM de ce produit n&apos;a pas été renouvelée
                    {drug.regDateFinal ? ` (expiration : ${formatDate(drug.regDateFinal)})` : ''}.
                    Vérifiez son statut commercial avant toute dispensation.
                  </p>
                </div>
              )}

              {/* Métriques */}
              <section aria-label="Caractéristiques du médicament">
                <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Caractéristiques
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <Metric label="N° AMM" value={drug.regNumber} icon={ShieldPlus} />
                  <Metric label="Forme" value={drug.form} icon={Pill} />
                  <Metric label="Dosage" value={drug.dosage} icon={FlaskConical} />
                  <Metric label="Conditionnement" value={drug.packaging} icon={Package} />
                  <Metric label="Laboratoire" value={drug.lab} icon={Building2} />
                  <Metric
                    label="Pays"
                    value={
                      drug.country ? (
                        <span className="flex items-center gap-1.5">
                          {countryCode(drug.country) ? (
                            <span
                              className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground"
                              aria-hidden
                            >
                              {countryCode(drug.country)}
                            </span>
                          ) : null}
                          {drug.country}
                        </span>
                      ) : null
                    }
                  />
                  <Metric label="Type" value={drug.type} icon={Type} />
                  <Metric label="Stabilité" value={drug.stability} icon={Timer} />
                  <Metric
                    label="Tarification P1/P2"
                    value={[drug.p1, drug.p2].filter(Boolean).join(' / ')}
                    icon={Syringe}
                  />
                  <Metric label="Enregistré le" value={formatDate(drug.regDateInitial)} icon={CalendarClock} />
                  <Metric label="Expire le" value={formatDate(drug.regDateFinal)} icon={CalendarX2} />
                </div>
                <p
                  className="mt-2.5 flex items-center gap-1.5 text-[10px] text-muted-foreground"
                  title="Édition de la nomenclature officielle utilisée comme source"
                >
                  <CalendarClock className="size-3" aria-hidden />
                  Données d'enregistrement : nomenclature officielle — dernière vérification Juin
                  2026
                </p>
                {drug.obs ? (
                  <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground/90">
                    <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <p>{drug.obs}</p>
                  </div>
                ) : null}
              </section>

              {/* Calculateur Posologique Pédiatrique Rapide */}
              <PediatricPosologyWidget
                form={drug.form}
                dci={drug.dci}
                brand={drug.brand}
                onOpenAdvanced={() => {
                  closeDrug()
                  openTool('pediatrie')
                  setView('outils')
                }}
              />

              {/* Équivalents */}
              {equivalents.length > 0 && (
                <section aria-label="Équivalents même DCI">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      <span>Équivalents même DCI</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
                        {formatNumber(equivalents.length)}
                      </span>
                    </h3>

                    {/* Contrôle de tri — Phase 3.1 & 3.2 */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <ArrowUpDown className="size-3 text-muted-foreground" aria-hidden />
                      <span className="text-[11px] text-muted-foreground hidden sm:inline">Trier :</span>
                      <select
                        value={equivSort}
                        onChange={(e) =>
                          setEquivSort(e.target.value as 'price_asc' | 'copay_asc' | 'brand_asc')
                        }
                        aria-label="Trier les équivalents"
                        className="rounded-md border border-border/80 bg-background px-2 py-0.5 text-xs text-foreground shadow-2xs transition-colors hover:border-primary/40 focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                      >
                        <option value="price_asc">PPA croissant</option>
                        <option value="copay_asc">Reste à charge</option>
                        <option value="brand_asc">Nom de marque (A-Z)</option>
                      </select>
                    </div>
                  </div>

                  {cheapestEquivalent ? (
                    <div className="mb-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-state-safe/25 bg-state-safe/5 px-3 py-2 text-xs text-foreground">
                      <TrendingDown className="size-4 shrink-0 text-state-safe" aria-hidden />
                      <span>
                        Équivalent le moins cher :{' '}
                        <span className="font-semibold text-state-safe">
                          {cheapestEquivalent.brand}
                        </span>{' '}
                        à{' '}
                        <span className="font-bold text-state-safe tabular-nums">
                          {formatPrice(cheapestEquivalent.price ?? null)}
                        </span>
                        {drug.pharmacy?.[0]?.ppa != null &&
                        (cheapestEquivalent.price ?? Infinity) < drug.pharmacy[0].ppa ? (
                          <span className="text-muted-foreground">
                            {' '}
                            (économisez{' '}
                            <span className="font-semibold tabular-nums">
                              {formatPrice(
                                Math.round(
                                  (drug.pharmacy[0].ppa - (cheapestEquivalent.price ?? 0)) * 100
                                ) / 100
                              )}
                            </span>{' '}
                            vs {drug.brand})
                          </span>
                        ) : null}
                      </span>
                    </div>
                  ) : null}
                  <div className="scroll-thin max-h-72 overflow-y-auto rounded-lg border border-border/70">
                    <table className="w-full text-sm">
                      <tbody>
                        {sortedEquivalents.map((eq) => {
                          const eqPrice = eq.price ?? null
                          const copayShare =
                            eqPrice != null
                              ? eq.refundable
                                ? Math.round(eqPrice * 0.2 * 100) / 100
                                : eqPrice
                              : null

                          return (
                            <tr
                              key={eq.id}
                              className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-accent"
                              onClick={() => openDrug(eq.id)}
                            >
                              <td className="px-3 py-2.5">
                                <span className="flex items-center gap-1.5">
                                  <span className="block font-semibold text-foreground">{eq.brand}</span>
                                  {eq.price != null && eq.price === minEquivalentPrice ? (
                                    <span
                                      className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-state-safe/30 bg-state-safe/10 px-1.5 py-0.5 text-[9px] font-bold text-state-safe"
                                      title="Prix le plus bas parmi les équivalents"
                                    >
                                      <TrendingDown className="size-2.5" aria-hidden />
                                      Éco
                                    </span>
                                  ) : null}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {eq.lab}
                                  {eq.dosage ? ` · ${eq.dosage}` : ''}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right align-top">
                                {eqPrice != null ? (
                                  <span
                                    className={cn(
                                      'block font-semibold tabular-nums',
                                      eq.price === minEquivalentPrice ? 'text-state-safe' : 'text-foreground'
                                    )}
                                  >
                                    {formatPrice(eqPrice)}
                                  </span>
                                ) : null}
                                {eq.refundable ? (
                                  <span className="block text-[10px] font-medium text-state-safe tabular-nums">
                                    CNAS {copayShare != null ? `· Reste ${formatPrice(copayShare)}` : ''}
                                  </span>
                                ) : eqPrice != null ? (
                                  <span className="block text-[10px] text-muted-foreground">
                                    Hors Chifa
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <StatusBadge status={eq.status} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <Separator />

              <SafetyNote />
            </div>
          </TabsContent>
          <TabsContent value="rcp" className="mt-0 flex-1 overflow-y-auto scroll-thin">
            {drug.rcpSource === 'BOOK' && drug.dciKey ? (
              <div className="px-5 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    closeDrug()
                    openLibraryMonograph(drug.dciKey!)
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="flex items-center gap-2.5">
                    <Library className="size-4 shrink-0 text-primary" aria-hidden />
                    <span>
                      <span className="block text-sm font-semibold text-foreground">
                        Monographie complète de {drug.dci}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Ouvrir dans la Bibliothèque clinique (24 livres)
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-primary">
                    Ouvrir →
                  </span>
                </button>
              </div>
            ) : null}
            <RcpViewer drugId={drug.id} brand={drug.brand} />
          </TabsContent>
        </Tabs>

        {/* Permanent Bottom Action Dock */}
        <div className="shrink-0 bottom-action-dock p-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-2.5">
          <Button
            onClick={handleAddToBasket}
            className={cn(
              'flex-1 h-11 font-semibold text-sm shadow-sm gap-2 transition-all',
              isInBasket ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20' : ''
            )}
            variant={isInBasket ? 'outline' : 'default'}
          >
            <ShieldPlus className="size-4 shrink-0" />
            <span className="truncate">
              {isInBasket ? 'Déjà dans les interactions' : 'Ajouter aux interactions'}
            </span>
            {basket.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {basket.length}
              </span>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className="h-11 shrink-0 gap-1.5 px-3.5 border-border hover:bg-muted font-medium text-xs sm:text-sm"
                title="Options d'impression"
              >
                <Printer className="size-4 shrink-0" />
                <span className="hidden sm:inline">Imprimer</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer">
                <FileText className="size-4 text-muted-foreground" />
                <span>Monographie officielle A4</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setPatientSheetOpen(true)}
                className="gap-2 cursor-pointer font-semibold text-primary"
              >
                <Printer className="size-4 text-primary" />
                <span>Fiche Posologique Patient</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="default"
            onClick={() => setShortageOpen(true)}
            className="h-11 shrink-0 gap-1.5 px-3 border-state-warning/40 text-state-warning hover:bg-state-warning/10 font-medium text-xs sm:text-sm"
            title="Signaler une rupture d'approvisionnement"
          >
            <TriangleAlert className="size-4 shrink-0" />
            <span className="hidden sm:inline">Rupture</span>
          </Button>
        </div>
      </>
    )}
  </SheetContent>
      {drug && sheetTab === 'fiche' ? (
        <PrintMonograph drug={drug} equivalents={equivalents.slice(0, 30)} />
      ) : null}
      {drug && (
        <PatientDosageDialog
          open={patientSheetOpen}
          onOpenChange={setPatientSheetOpen}
          drug={drug}
        />
      )}
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/* Fiche imprimable — monographie A4 (uniquement à l'impression)        */
/* ------------------------------------------------------------------ */

function PrintMonograph({
  drug,
  equivalents,
}: {
  drug: DrugDetail
  equivalents: Array<{ id: number; brand: string; lab: string; dosage: string | null; status: string }>
}) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="print-monograph fixed inset-0 z-[999] hidden bg-white text-black print:block print:overflow-visible">
      <div className="mx-auto max-w-[190mm] px-6 py-8">
        {/* En-tête */}
        <div className="flex items-start justify-between border-b-2 border-black pb-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase">
              Référentiel Pharmaceutique Algérien — DzPharm
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{drug.brand}</h1>
            <p className="mt-0.5 text-sm font-semibold">{drug.dci}</p>
          </div>
          <div className="text-right text-[11px]">
            <p className="font-bold">Monographie</p>
            <p>Édité le {new Date().toLocaleDateString('fr-FR')}</p>
            <p>AMM : {drug.regNumber || '—'}</p>
          </div>
        </div>

        {/* Statut */}
        <p className="mt-3 text-[11px]">
          <strong>Statut :</strong> {drug.status === 'ACTIF' ? 'Actif (AMM en cours de validité)' : drug.status === 'RETRIE' ? 'RETIRÉ du marché' : 'Enregistrement non renouvelé'}
          {drug.liste ? (
            <>
              {' '}· <strong>Liste :</strong> {drug.liste}
            </>
          ) : null}
          {drug.domains?.length ? (
            <>
              {' '}· <strong>Domaine :</strong> {drug.domains.join(', ')}
            </>
          ) : null}
        </p>

        {/* Caractéristiques */}
        <h2 className="mt-5 border-b border-black/30 pb-1 text-[12px] font-bold tracking-widest uppercase">
          Caractéristiques du produit
        </h2>
        <table className="mt-2 w-full text-[11px]">
          <tbody>
            {[
              ['Forme', drug.form],
              ['Dosage', drug.dosage],
              ['Conditionnement', drug.packaging],
              ['Prix public (PPA)', drug.pharmacy?.[0]?.ppa != null ? formatPrice(drug.pharmacy[0].ppa) : ''],
              ['Remboursement CNAS', drug.pharmacy?.[0]?.refundable ? 'Remboursable' : ''],
              ['Laboratoire titulaire', drug.lab],
              ['Pays', drug.country],
              ['Type d\'enregistrement', drug.type],
              ['Tarification P1 / P2', [drug.p1, drug.p2].filter(Boolean).join(' / ')],
              ['Date d\'enregistrement initial', formatDate(drug.regDateInitial)],
              ['Validité (date finale)', formatDate(drug.regDateFinal)],
              ['Stabilité', drug.stability],
            ]
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <tr key={label} className="align-top">
                  <td className="w-56 py-1 pr-3 font-semibold">{label}</td>
                  <td className="py-1">{value}</td>
                </tr>
              ))}
          </tbody>
        </table>

        {drug.obs ? (
          <p className="mt-3 text-[11px]">
            <strong>Observations : </strong>
            {drug.obs}
          </p>
        ) : null}

        {(drug.status === 'RETRIE' || drug.status === 'NON_RENOUVELE') && (
          <p className="mt-3 border-2 border-black p-2 text-[11px] font-bold">
            ⚠ {drug.status === 'RETRIE' ? 'PRODUIT RETIRÉ DU MARCHÉ' : 'ENREGISTREMENT NON RENOUVELÉ'}
            {drug.withdrawDate ? ` — retrait le ${formatDate(drug.withdrawDate)}` : ''}
            {drug.withdrawReason ? ` (${drug.withdrawReason})` : ''}
          </p>
        )}

        {/* Équivalents */}
        {equivalents.length > 0 ? (
          <>
            <h2 className="mt-5 border-b border-black/30 pb-1 text-[12px] font-bold tracking-widest uppercase">
              Équivalents — même DCI ({formatNumber(equivalents.length)}
              {equivalents.length === 30 ? '+' : ''})
            </h2>
            <table className="mt-2 w-full text-[10px]">
              <thead>
                <tr className="border-b border-black/40 text-left">
                  <th className="py-1 pr-2">Marque</th>
                  <th className="py-1 pr-2">Laboratoire</th>
                  <th className="py-1 pr-2">Dosage</th>
                  <th className="py-1">Statut</th>
                </tr>
              </thead>
              <tbody>
                {equivalents.map((eq) => (
                  <tr key={eq.id} className="border-b border-black/10">
                    <td className="py-1 pr-2 font-semibold">{eq.brand}</td>
                    <td className="py-1 pr-2">{eq.lab}</td>
                    <td className="py-1 pr-2">{eq.dosage || '—'}</td>
                    <td className="py-1">
                      {eq.status === 'ACTIF' ? 'Actif' : eq.status === 'RETRIE' ? 'Retiré' : 'Non renouvelé'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}

        <p className="mt-6 border-t border-black/40 pt-2 text-[9px] text-black/70">
          Source : Nomenclature nationale des produits pharmaceutiques (Ministère de l&apos;Industrie
          Pharmaceutique, Algérie — Juin 2026). Document généré par DzPharm à titre informatif — ne
          remplace pas l&apos;AMM officielle ni les référentiels en vigueur.
        </p>
      </div>
    </div>,
    document.body
  )
}
