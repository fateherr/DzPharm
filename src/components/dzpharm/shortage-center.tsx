'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  Activity,
  ArrowRightLeft,
  Bell,
  BellOff,
  Check,
  Clock3,
  Loader2,
  MapPin,
  MessageSquarePlus,
  Send,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react'
import { ShortageHeatmap } from './shortage-heatmap'
import { StockExchangeBulletin } from './stock-exchange-bulletin'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { WILAYAS } from '@/lib/wilayas'
import { SafetyNote } from './safety-note'
import { useDzPharm } from './store'

/* ------------------------------------------------------------------ */
/* Types & fetchers locaux (auto-contenu)                              */
/* ------------------------------------------------------------------ */

interface ShortageReportDto {
  id: number
  drugId: number | null
  brand: string
  dci: string | null
  wilaya: string | null
  note: string | null
  status: string
  createdAt: string
  drug: { id: number; brand: string; dci: string | null; status: string } | null
}

interface ShortageStats {
  total: number
  active: number
  resolved: number
  last48h: number
  topDrugs: Array<{ brand: string; dci: string | null; count: number }>
}

interface ShortagesResponse {
  reports: ShortageReportDto[]
  stats: ShortageStats
}

interface DrugSuggestion {
  id: number
  brand: string
  dci: string | null
  dosage: string | null
  status: string
}

async function fetchShortages(signal?: AbortSignal): Promise<ShortagesResponse> {
  const res = await fetch('/api/shortages', { signal })
  if (!res.ok) throw new Error(`Requête échouée (${res.status})`)
  return (await res.json()) as ShortagesResponse
}

async function fetchDrugSuggestions(q: string, signal?: AbortSignal): Promise<DrugSuggestion[]> {
  const res = await fetch(`/api/drugs?q=${encodeURIComponent(q)}&pageSize=8`, { signal })
  if (!res.ok) throw new Error(`Requête échouée (${res.status})`)
  const data = (await res.json()) as { drugs: DrugSuggestion[] }
  return data.drugs
}

async function postShortage(payload: {
  drugId?: number
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

/** Temps relatif en français (« il y a 2 h »). */
function relativeTimeFr(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const j = Math.floor(h / 24)
  if (j < 31) return `il y a ${j} j`
  const mois = Math.floor(j / 30)
  return `il y a ${mois} mois`
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const STATUS_DOT: Record<string, string> = {
  ACTIF: 'bg-state-safe',
  NON_RENOUVELE: 'bg-state-warning',
  RETRIE: 'bg-state-danger',
}

/* ------------------------------------------------------------------ */
/* Surveillances locales (audit 4.4) — localStorage uniquement         */
/* ------------------------------------------------------------------ */

/** Clé de persistance : liste des signalements surveillés + snapshot. */
const WATCH_KEY = 'shortage.watch.v1'

interface WatchEntry {
  /** Identifiant du signalement ("report-123"). */
  key: string
  reportId: number
  drugId: number | null
  brand: string
  dci: string | null
  /** Snapshot du statut lors de la dernière comparaison (VISITE). */
  status: string
  /** Date de création de la surveillance (ISO). */
  watchedAt: string
}

function loadWatch(): WatchEntry[] {
  try {
    const raw = localStorage.getItem(WATCH_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is WatchEntry =>
        !!e &&
        typeof (e as WatchEntry).key === 'string' &&
        typeof (e as WatchEntry).reportId === 'number' &&
        typeof (e as WatchEntry).status === 'string' &&
        typeof (e as WatchEntry).watchedAt === 'string'
    )
  } catch {
    return []
  }
}

function persistWatch(entries: WatchEntry[]): void {
  try {
    localStorage.setItem(WATCH_KEY, JSON.stringify(entries))
  } catch {
    /* quota / navigation privée — la surveillance reste en mémoire */
  }
}

function toWatchEntry(r: ShortageReportDto): WatchEntry {
  return {
    key: `report-${r.id}`,
    reportId: r.id,
    drugId: r.drugId,
    brand: r.brand,
    dci: r.dci,
    status: r.status,
    watchedAt: new Date().toISOString(),
  }
}

/* ------------------------------------------------------------------ */
/* Autocomplétation médicament (locale)                                */
/* ------------------------------------------------------------------ */

function DrugAutocomplete({
  selected,
  onSelect,
  onChange,
}: {
  selected: DrugSuggestion | null
  onSelect: (drug: DrugSuggestion | null) => void
  onChange: (value: string) => void
}) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounced = useDebounce(value, 300)
  const trimmed = debounced.trim()

  const { data: results, isFetching } = useQuery({
    queryKey: ['shortage-drug-search', trimmed],
    queryFn: ({ signal }) => fetchDrugSuggestions(trimmed, signal),
    enabled: trimmed.length >= 2,
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const isOpen = open && trimmed.length >= 2 && !selected

  function handleSelect(drug: DrugSuggestion) {
    onSelect(drug)
    setValue('')
    setOpen(false)
    onChange(drug.brand)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-card transition-colors',
          'border-border focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/20'
        )}
      >
        {selected ? (
          <div className="flex h-11 w-full items-center justify-between gap-2 rounded-xl bg-primary/10 px-3">
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">
                {selected.brand}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {selected.dci}
                {selected.dosage ? ` · ${selected.dosage}` : ''}
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => {
                onSelect(null)
                onChange('')
              }}
              aria-label="Effacer le médicament sélectionné"
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        ) : (
          <Input
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-label="Nom du médicament en pénurie"
            placeholder="Ex : DOLIPRANE, AUGMENTIN…"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              onChange(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            autoComplete="off"
            spellCheck={false}
            className="h-11 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        )}
        {isFetching && isOpen ? (
          <Loader2 className="mr-3 size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        ) : null}
      </div>

      {isOpen ? (
        <div
          role="listbox"
          aria-label="Suggestions de médicaments"
          className="scroll-thin absolute inset-x-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl shadow-black/10"
        >
          {!results || results.length === 0 ? (
            <p className="px-3 py-5 text-center text-sm text-muted-foreground">
              {isFetching ? 'Recherche…' : `Aucun médicament trouvé pour « ${trimmed} »`}
            </p>
          ) : (
            results.map((drug) => (
              <button
                key={drug.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => handleSelect(drug)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {drug.brand}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {drug.dci}
                    {drug.dosage ? ` · ${drug.dosage}` : ''}
                  </span>
                </span>
                <span
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground',
                  )}
                >
                  <span
                    className={cn('size-1.5 rounded-full', STATUS_DOT[drug.status] ?? 'bg-muted-foreground')}
                    aria-hidden
                  />
                  {drug.status === 'ACTIF'
                    ? 'Actif'
                    : drug.status === 'RETRIE'
                      ? 'Retiré'
                      : drug.status === 'NON_RENOUVELE'
                        ? 'Non renouvelé'
                        : drug.status}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Centre pénuries                                                     */
/* ------------------------------------------------------------------ */

export function ShortageCenter() {
  const openDrug = useDzPharm((s) => s.openDrug)
  const queryClient = useQueryClient()

  const [mainTab, setMainTab] = useState<'carte' | 'bourse'>('carte')
  const [selectedWilayaFilter, setSelectedWilayaFilter] = useState<string | null>(null)
  const [confirmations, setConfirmations] = useState<Record<number, number>>({ 1: 5, 2: 8, 3: 3 })
  const [myConfirmed, setMyConfirmed] = useState<Set<number>>(new Set())

  const [selectedDrug, setSelectedDrug] = useState<DrugSuggestion | null>(null)
  const [brandInput, setBrandInput] = useState('')
  const [wilaya, setWilaya] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Surveillances locales — état composant + localStorage uniquement.
  const [watch, setWatch] = useState<WatchEntry[]>([])
  const [changed, setChanged] = useState<string[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['shortages'],
    queryFn: ({ signal }) => fetchShortages(signal),
  })

  const stats = data?.stats
  const reports = data?.reports ?? []

  const displayedReports = useMemo(() => {
    if (!selectedWilayaFilter) return reports
    return reports.filter((r) => r.wilaya === selectedWilayaFilter)
  }, [reports, selectedWilayaFilter])

  const handleToggleConfirm = (id: number) => {
    const nextSet = new Set(myConfirmed)
    const nextCounts = { ...confirmations }
    if (nextSet.has(id)) {
      nextSet.delete(id)
      nextCounts[id] = Math.max(0, (nextCounts[id] || 1) - 1)
      toast({
        title: 'Confirmation retirée',
        description: 'Votre confirmation confraternelle a été retirée.',
      })
    } else {
      nextSet.add(id)
      nextCounts[id] = (nextCounts[id] || 0) + 1
      toast({
        title: 'Rupture confirmée par votre officine',
        description: 'Merci confrère ! Votre confirmation renforce la fiabilité du signalement.',
      })
    }
    setMyConfirmed(nextSet)
    setConfirmations(nextCounts)
  }

  // Chargement initial des surveillances persistées.
  useEffect(() => {
    setWatch(loadWatch())
  }, [])

  // Détection de changement : à chaque chargement du flux, on compare le
  // statut actuel de chaque signalement surveillé au snapshot précédent.
  // Aucune notification push — la comparaison a lieu à la visite de la page.
  useEffect(() => {
    if (!data || watch.length === 0) return
    const byId = new Map(data.reports.map((r) => [r.id, r]))
    const changedKeys: string[] = []
    let mutated = false
    const next = watch.map((w) => {
      const current = byId.get(w.reportId)
      if (current && current.status !== w.status) {
        mutated = true
        changedKeys.push(w.key)
        return { ...w, status: current.status }
      }
      return w
    })
    if (mutated) {
      persistWatch(next)
      setWatch(next)
      setChanged((prev) => [...new Set([...prev, ...changedKeys])])
    }
  }, [data, watch])

  const watchedIds = useMemo(() => new Set(watch.map((w) => w.reportId)), [watch])

  /** Surveillances dont le signalement n'apparaît plus dans le flux récent. */
  const missingWatches = useMemo(() => {
    if (!data) return []
    const byId = new Set(data.reports.map((r) => r.id))
    return watch.filter((w) => !byId.has(w.reportId))
  }, [data, watch])

  function toggleWatch(r: ShortageReportDto) {
    const key = `report-${r.id}`
    setChanged((prev) => prev.filter((k) => k !== key))
    setWatch((prev) => {
      const exists = prev.some((w) => w.key === key)
      const next = exists ? prev.filter((w) => w.key !== key) : [...prev, toWatchEntry(r)]
      persistWatch(next)
      return next
    })
  }

  const noteCount = useMemo(() => note.length, [note])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const brand = (selectedDrug?.brand ?? brandInput).trim()
    if (brand.length < 2) {
      toast({
        title: 'Médicament requis',
        description: 'Indiquez le nom du médicament en tension (au moins 2 caractères).',
        variant: 'destructive',
      })
      return
    }
    setSubmitting(true)
    try {
      await postShortage({
        drugId: selectedDrug?.id,
        brand,
        dci: selectedDrug?.dci ?? null,
        wilaya: wilaya || null,
        note: note.trim() || null,
      })
      toast({
        title: 'Signalement enregistré',
        description: `Merci ! Le signalement pour ${brand} a bien été ajouté à la liste communautaire.`,
      })
      setSelectedDrug(null)
      setBrandInput('')
      setWilaya('')
      setNote('')
      await queryClient.invalidateQueries({ queryKey: ['shortages'] })
    } catch (err) {
      toast({
        title: 'Signalement impossible',
        description: err instanceof Error ? err.message : 'Une erreur est survenue. Réessayez.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card className="border-state-warning/30 bg-gradient-to-br from-state-warning/10 via-state-warning/5 to-transparent">
        <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg font-bold tracking-tight text-foreground">
            <span className="flex items-center gap-2.5">
              <span
                className="flex size-9 items-center justify-center rounded-xl bg-state-warning/15"
                aria-hidden
              >
                <TriangleAlert className="size-5 text-state-warning" />
              </span>
              Centre de signalement des pénuries
            </span>
            {watch.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary tabular-nums">
                <Bell className="size-3.5" aria-hidden />
                {watch.length} surveillance{watch.length > 1 ? 's' : ''} active
                {watch.length > 1 ? 's' : ''}
              </span>
            ) : null}
          </CardTitle>
          <CardDescription className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Les tensions d&apos;approvisionnement sont une réalité nationale. Signalez un médicament
            introuvable en officine et consultez les signalements de la communauté DzPharm pour
            anticiper vos recherches. Chaque signalement aide les patients et les professionnels à
            trouver des alternatives (équivalents génériques, même DCI).
            {watch.length > 0 ? (
              <span className="mt-2 block text-xs text-muted-foreground/90">
                Surveillance locale : la comparaison se fait à chaque visite de cette page (aucune
                notification push).
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Sélecteur de mode W6-02 / W6-03 */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-border bg-card shadow-2xs">
        <button
          type="button"
          onClick={() => setMainTab('carte')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
            mainTab === 'carte'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <TriangleAlert className="size-4" />
          Observatoire des Ruptures &amp; Heatmap 58 Wilayas (W6-02)
        </button>

        <button
          type="button"
          onClick={() => setMainTab('bourse')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
            mainTab === 'bourse'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <ArrowRightLeft className="size-4" />
          Bourse de Dépannage &amp; Périmables &lt; 90j (W6-03)
        </button>
      </div>

      {mainTab === 'bourse' ? (
        <StockExchangeBulletin />
      ) : (
        <>
          {/* Cartographie thermique 58 Wilayas (W6-02) */}
          <ShortageHeatmap
            reports={reports}
            selectedWilaya={selectedWilayaFilter}
            onSelectWilaya={setSelectedWilayaFilter}
          />

          {/* Mini-cartes statistiques */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-center gap-3 p-4">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"
                  aria-hidden
                >
                  <MessageSquarePlus className="size-5 text-primary" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Total signalements
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                    {stats?.total ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="transition-colors hover:border-state-warning/40">
              <CardContent className="flex items-center gap-3 p-4">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-state-warning/10"
                  aria-hidden
                >
                  <TriangleAlert className="size-5 text-state-warning" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Actifs
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                    {stats?.active ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="transition-colors hover:border-chifa/40">
              <CardContent className="flex items-center gap-3 p-4">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-chifa/10"
                  aria-hidden
                >
                  <Clock3 className="size-5 text-chifa" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    48 dernières heures
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                    {stats?.last48h ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="transition-colors hover:border-state-safe/40">
              <CardContent className="flex items-center gap-3 p-4">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-state-safe/10"
                  aria-hidden
                >
                  <Activity className="size-5 text-state-safe" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Résolus
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                    {stats?.resolved ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Formulaire de signalement */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
            <CardTitle className="text-base font-semibold text-foreground">
              Signaler une pénurie
            </CardTitle>
            <CardDescription>
              Médicament introuvable ? Indiquez-le en quelques secondes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" aria-label="Formulaire de signalement de pénurie">
              <div>
                <Label htmlFor="shortage-drug" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Médicament <span className="text-state-danger">*</span>
                </Label>
                <DrugAutocomplete
                  selected={selectedDrug}
                  onSelect={setSelectedDrug}
                  onChange={setBrandInput}
                />
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  Sélectionnez une spécialité du registre (recommandé — relie le signalement à sa
                  fiche) ou saisissez un nom libre.
                </p>
              </div>

              <div>
                <Label htmlFor="shortage-wilaya" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Wilaya
                </Label>
                <Select value={wilaya} onValueChange={setWilaya}>
                  <SelectTrigger
                    id="shortage-wilaya"
                    className="h-11 w-full text-sm"
                    aria-label="Sélectionner votre wilaya"
                  >
                    <SelectValue placeholder="Sélectionner une wilaya (optionnel)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {WILAYAS.map((w) => (
                      <SelectItem key={w} value={w}>
                        {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="shortage-note" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Note (optionnel)
                </Label>
                <Textarea
                  id="shortage-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 280))}
                  placeholder="Ex : aucune boîte trouvée depuis 2 semaines dans les officines du centre-ville…"
                  rows={3}
                  className="resize-none text-sm"
                  aria-describedby="shortage-note-count"
                />
                <p id="shortage-note-count" className="mt-1 text-right text-[11px] text-muted-foreground tabular-nums">
                  {noteCount}/280
                </p>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="h-11 w-full text-sm font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Envoi…
                  </>
                ) : (
                  <>
                    <Send className="size-4" aria-hidden />
                    Signaler la pénurie
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Derniers signalements + plus signalés */}
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
              <CardTitle className="flex items-center justify-between text-base font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  <Clock3 className="size-4 text-primary" aria-hidden />
                  Derniers signalements
                </span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
                  {reports.length}
                </span>
              </CardTitle>
              <CardDescription>
                Signalements communautaires non vérifiés — indicatifs, ils ne remplacent pas les
                communications officielles du ministère.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
              {isLoading ? (
                <div className="space-y-2.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : reports.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <TriangleAlert className="mx-auto size-8 text-muted-foreground/50" aria-hidden />
                  <p className="mt-3 text-sm font-medium text-foreground">
                    Aucun signalement pour le moment
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Soyez le premier à signaler une tension d&apos;approvisionnement — votre
                    signalement sera visible par toute la communauté.
                  </p>
                </div>
              ) : (
                <ul className="scroll-thin max-h-96 space-y-2.5 overflow-y-auto pr-1" aria-label="Liste des derniers signalements de pénurie">
                  {displayedReports.map((r) => {
                    const isWatched = watchedIds.has(r.id)
                    const hasChanged = changed.includes(`report-${r.id}`)
                    const isConfirmed = myConfirmed.has(r.id)
                    const confirmCount = (confirmations[r.id] || 0) + (isConfirmed ? 1 : 0)
                    return (
                    <li
                      key={r.id}
                      className={cn(
                        'rounded-xl border border-border/70 bg-card p-3 transition-colors hover:border-primary/30',
                        isWatched && 'border-primary/30'
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        {r.drugId ? (
                          <button
                            type="button"
                            onClick={() => openDrug(r.drugId as number)}
                            className="text-left text-sm font-semibold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                            aria-label={`Ouvrir la fiche de ${r.brand}`}
                          >
                            {r.brand}
                          </button>
                        ) : (
                          <span className="text-sm font-semibold text-foreground">{r.brand}</span>
                        )}
                        <span className="flex shrink-0 items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                              r.status === 'RESOLUE'
                                ? 'border-state-safe/30 bg-state-safe/10 text-state-safe'
                                : 'border-state-warning/30 bg-state-warning/10 text-state-warning'
                            )}
                          >
                            {r.status === 'RESOLUE' ? 'Résolue' : 'Signalée'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleConfirm(r.id)}
                            aria-pressed={isConfirmed}
                            title="Confirmer la rupture dans mon officine (validation confraternelle W6-02)"
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer',
                              isConfirmed
                                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                                : 'border-border bg-muted/60 text-muted-foreground hover:border-emerald-500/30 hover:text-foreground'
                            )}
                          >
                            <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden />
                            {isConfirmed ? 'Confirmé' : 'Confirmer'} ({confirmCount})
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleWatch(r)}
                            aria-pressed={isWatched}
                            aria-label={
                              isWatched
                                ? `Ne plus surveiller le signalement ${r.brand}`
                                : `Surveiller le signalement ${r.brand}`
                            }
                            title={
                              isWatched
                                ? 'Surveillance active — retirer'
                                : 'Surveiller ce signalement (comparaison à chaque visite)'
                            }
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                              isWatched
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-border bg-muted/60 text-muted-foreground hover:border-primary/40 hover:text-primary'
                            )}
                          >
                            {isWatched ? (
                              <BellOff className="size-3.5" aria-hidden />
                            ) : (
                              <Bell className="size-3.5" aria-hidden />
                            )}
                            {isWatched ? 'Surveillé' : 'Surveiller'}
                          </button>
                        </span>
                      </div>
                      {hasChanged ? (
                        <p
                          role="status"
                          className="mt-2 flex items-center gap-1.5 rounded-lg border border-state-safe/40 bg-state-safe/10 px-2.5 py-1.5 text-[11px] font-medium text-state-safe"
                        >
                          <Activity className="size-3.5 shrink-0" aria-hidden />
                          Changement détecté depuis votre dernière visite
                          {r.status === 'RESOLUE'
                            ? ' — signalement marqué résolu'
                            : ' — signalement de nouveau actif'}
                          .
                        </p>
                      ) : null}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {r.dci ? <span className="truncate">{r.dci}</span> : null}
                        {r.wilaya ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" aria-hidden />
                            {r.wilaya}
                          </span>
                        ) : null}
                        <span className="tabular-nums">{relativeTimeFr(r.createdAt)}</span>
                      </div>
                      {r.note ? (
                        <p className="mt-2 border-t border-border/50 pt-2 text-xs leading-relaxed text-foreground/80 italic">
                          « {r.note} »
                        </p>
                      ) : null}
                    </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Surveillances locales (audit 4.4) */}
          {watch.length > 0 ? (
            <Card>
              <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
                <CardTitle className="flex items-center justify-between text-base font-semibold text-foreground">
                  <span className="flex items-center gap-2">
                    <Bell className="size-4 text-primary" aria-hidden />
                    Surveillances
                  </span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
                    {watch.length}
                  </span>
                </CardTitle>
                <CardDescription>
                  Surveillance locale : la comparaison se fait à chaque visite de cette page (aucune
                  notification push).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
                {missingWatches.length === 0 ? (
                  <p className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                    Toutes vos surveillances sont présentes dans le flux récent des signalements —
                    aucun changement de statut détecté depuis votre dernière visite.
                  </p>
                ) : (
                  <ul className="space-y-2" aria-label="Surveillances hors du flux récent">
                    {missingWatches.map((w) => (
                      <li
                        key={w.key}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {w.brand}
                            <span className="ml-2 text-[11px] font-medium text-muted-foreground">
                              plus listé dans le flux — vérifiez la disponibilité
                            </span>
                          </span>
                          {w.dci ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {w.dci}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Dernier statut :{' '}
                            {w.status === 'RESOLUE' ? 'résolue' : 'signalée'}
                          </span>
                          {w.drugId ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => openDrug(w.drugId as number)}
                              aria-label={`Ouvrir la fiche de ${w.brand}`}
                            >
                              Fiche
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-state-danger"
                            onClick={() =>
                              setWatch((prev) => {
                                const next = prev.filter((x) => x.key !== w.key)
                                persistWatch(next)
                                return next
                              })
                            }
                            aria-label={`Retirer la surveillance de ${w.brand}`}
                          >
                            <X className="size-3.5" aria-hidden />
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  La comparaison couvre les 60 signalements les plus récents du flux communautaire.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Les plus signalés */}
          <Card>
            <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Activity className="size-4 text-chifa" aria-hidden />
                Les plus signalés
              </CardTitle>
              <CardDescription>Top 5 des médicaments signalés par la communauté</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
              {isLoading ? (
                <Skeleton className="h-28 rounded-lg" />
              ) : !stats || stats.topDrugs.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aucune donnée — les médicaments les plus signalés apparaîtront ici.
                </p>
              ) : (
                <ol className="space-y-2" aria-label="Médicaments les plus signalés">
                  {stats.topDrugs.map((d, i) => (
                    <li
                      key={d.brand}
                      className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                    >
                      <span
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-chifa/15 text-[11px] font-bold text-chifa tabular-nums"
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {d.brand}
                        </span>
                        {d.dci ? (
                          <span className="block truncate text-xs text-muted-foreground">{d.dci}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 rounded-full bg-state-warning/10 px-2.5 py-0.5 text-xs font-bold text-state-warning tabular-nums">
                        {d.count} signal.
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </>
    )}

      <SafetyNote>
        Signalements communautaires non vérifiés — à but indicatif uniquement. Une pénurie
        signalée ne signifie pas une rupture nationale : vérifiez auprès d&apos;autres officines et
        demandez conseil à votre pharmacien. En cas d&apos;urgence : SAMU 14.
      </SafetyNote>
    </div>
  )
}
