'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Baby,
  CalendarClock,
  Check,
  Copy,
  FileSearch,
  HeartPulse,
  Info,
  Lightbulb,
  Loader2,
  Lock,
  Minus,
  PackageOpen,
  Pencil,
  PersonStanding,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserRoundPlus,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { checkPregnancy, postLocalInteractions } from './api'
import type {
  Drug,
  InteractionSeverity,
  InteractionsResponse,
  PregnancyCheckResponse,
  PregnancyRisk,
} from './types'
import { RISK_META, SeverityBadge, StatusBadge } from './status-badge'
import {
  MAX_ITEMS_PER_PROFILE,
  MAX_PROFILES,
  useDzPharm,
  type ArmoireItem,
  type ArmoireProfile,
  type ArmoireRelation,
} from './store'
import { SearchAutocomplete } from './search-autocomplete'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function cleanDciLabel(dci: string): string {
  return dci.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
}

function normKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Jours restants avant péremption (null si date absente/invalide). */
function daysUntil(iso: string): number | null {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86_400_000)
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function ageLabel(years: number): string {
  if (years <= 0) return 'moins d’un an'
  return `${years} ${years > 1 ? 'ans' : 'an'}`
}

const SEVERITY_ORDER: InteractionSeverity[] = ['CONTRE-INDIQUE', 'MAJEURE', 'MODEREE', 'MINEURE']

const RELATION_META: Record<ArmoireRelation, { label: string; icon: typeof Users }> = {
  adulte: { label: 'Adulte', icon: PersonStanding },
  enfant: { label: 'Enfant', icon: Baby },
  bebe: { label: 'Bébé', icon: Baby },
}

const PREG_RISK_META: Record<string, { label: string; className: string }> = {
  PRUDENCE: {
    label: 'Prudence pendant la grossesse',
    className: 'border-state-warning/40 bg-state-warning/10 text-state-warning',
  },
  DECONSEILLE: {
    label: 'Déconseillé pendant la grossesse',
    className: 'border-state-danger/40 bg-state-danger/10 text-state-danger',
  },
  CONTRE_INDIQUE: {
    label: 'Contre-indiqué pendant la grossesse',
    className: 'border-transparent bg-state-danger text-white',
  },
}

const PREG_RISK_META_ALLAITEMENT: Record<string, { label: string; className: string }> = {
  PRUDENCE: {
    label: 'Prudence pendant l’allaitement',
    className: 'border-state-warning/40 bg-state-warning/10 text-state-warning',
  },
  DECONSEILLE: {
    label: 'Déconseillé pendant l’allaitement',
    className: 'border-state-danger/40 bg-state-danger/10 text-state-danger',
  },
  CONTRE_INDIQUE: {
    label: 'Contre-indiqué pendant l’allaitement',
    className: 'border-transparent bg-state-danger text-white',
  },
}

/* ------------------------------------------------------------------ */
/* Alertes calculées de l'armoire                                      */
/* ------------------------------------------------------------------ */

type AlertKind = 'expired' | 'expiring' | 'withdrawn' | 'duplicate'

interface CabinetAlert {
  kind: AlertKind
  brand: string
  message: string
}

const ALERT_KIND_META: Record<AlertKind, { label: string; className: string }> = {
  expired: {
    label: 'Périmé',
    className: 'border-state-danger/40 bg-state-danger/10 text-state-danger',
  },
  expiring: {
    label: 'Péremption proche',
    className: 'border-state-warning/40 bg-state-warning/10 text-state-warning',
  },
  withdrawn: {
    label: 'Retiré du marché',
    className: 'border-state-danger/40 bg-state-danger/10 text-state-danger',
  },
  duplicate: {
    label: 'Doublon de DCI',
    className: 'border-state-warning/40 bg-state-warning/10 text-state-warning',
  },
}

/** Alertes calculées d’une liste de médicaments (péremption, retrait, doublons DCI). */
export function computeCabinetAlerts(items: ArmoireItem[]): CabinetAlert[] {
  const alerts: CabinetAlert[] = []
  const dciCounts = new Map<string, number>()
  for (const item of items) {
    const key = item.dciKey || normKey(item.dci)
    if (key) dciCounts.set(key, (dciCounts.get(key) ?? 0) + 1)
  }
  const reportedDuplicates = new Set<string>()
  for (const item of items) {
    const d = daysUntil(item.expiry)
    if (d !== null && d < 0) {
      alerts.push({
        kind: 'expired',
        brand: item.brand,
        message: `${item.brand} est périmé depuis ${Math.abs(d)} jour(s) — à rapporter à votre pharmacien pour destruction, ne pas jeter à la poubelle.`,
      })
    } else if (d !== null && d <= 30) {
      alerts.push({
        kind: 'expiring',
        brand: item.brand,
        message: `${item.brand} expire dans ${d} jour(s) — prévoyez le renouvellement.`,
      })
    }
    if (item.status === 'RETRIE') {
      alerts.push({
        kind: 'withdrawn',
        brand: item.brand,
        message: `${item.brand} a été retiré du marché algérien — rapportez-le à votre pharmacien et demandez une alternative.`,
      })
    } else if (item.status === 'NON_RENOUVELE') {
      alerts.push({
        kind: 'expiring',
        brand: item.brand,
        message: `${item.brand} n’est plus renouvelé (enregistrement non reconduit) — demandez une alternative active.`,
      })
    }
    const key = item.dciKey || normKey(item.dci)
    if (key && (dciCounts.get(key) ?? 0) > 1 && !reportedDuplicates.has(key)) {
      reportedDuplicates.add(key)
      alerts.push({
        kind: 'duplicate',
        brand: item.brand,
        message: `Deux médicaments de l’armoire contiennent la même DCI (${cleanDciLabel(item.dci)}) — risque de double dose.`,
      })
    }
  }
  const order: AlertKind[] = ['expired', 'withdrawn', 'duplicate', 'expiring']
  return alerts.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
}

/* ------------------------------------------------------------------ */
/* Formulaire profil                                                   */
/* ------------------------------------------------------------------ */

interface ProfileFormState {
  name: string
  relation: ArmoireRelation
  ageYears: string
  weightKg: string
  pregnant: boolean
  breastfeeding: boolean
}

const EMPTY_FORM: ProfileFormState = {
  name: '',
  relation: 'adulte',
  ageYears: '',
  weightKg: '',
  pregnant: false,
  breastfeeding: false,
}

function ProfileDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ArmoireProfile | null
  onSubmit: (form: ProfileFormState) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" aria-hidden />
            {editing ? 'Modifier le profil' : 'Nouveau profil familial'}
          </DialogTitle>
          <DialogDescription>
            Un profil par membre de la famille — les médicaments, péremptions et alertes sont
            suivis séparément.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <ProfileFormFields
            key={editing?.id ?? 'new'}
            editing={editing}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ProfileFormFields({
  editing,
  onCancel,
  onSubmit,
}: {
  editing: ArmoireProfile | null
  onCancel: () => void
  onSubmit: (form: ProfileFormState) => void
}) {
  const [form, setForm] = useState<ProfileFormState>(() =>
    editing
      ? {
          name: editing.name,
          relation: editing.relation,
          ageYears: String(editing.ageYears),
          weightKg: editing.weightKg != null ? String(editing.weightKg) : '',
          pregnant: editing.pregnant,
          breastfeeding: editing.breastfeeding,
        }
      : { ...EMPTY_FORM }
  )
  const [error, setError] = useState<string | null>(null)
  const fid = useId()

  function submit() {
    const name = form.name.trim()
    const age = Number.parseInt(form.ageYears, 10)
    if (!name) return setError('Le prénom est obligatoire.')
    if (Number.isNaN(age) || age < 0 || age > 120) return setError('Âge invalide (0 à 120 ans).')
    let weight: number | null = null
    if (form.weightKg.trim()) {
      weight = Number.parseFloat(form.weightKg.replace(',', '.'))
      if (Number.isNaN(weight) || weight <= 0 || weight > 300) return setError('Poids invalide.')
    }
    onSubmit({
      ...form,
      name,
      ageYears: String(age),
      weightKg: weight != null ? String(weight) : '',
    })
  }

  const isAdult = form.relation === 'adulte'

  return (
    <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor={`${fid}-name`}>Prénom</Label>
            <Input
              id={`${fid}-name`}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex. : Mama, Yacine, Lina…"
              maxLength={40}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor={`${fid}-relation`}>Profil</Label>
              <Select
                value={form.relation}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    relation: v as ArmoireRelation,
                    ...(v !== 'adulte' ? { pregnant: false, breastfeeding: false } : {}),
                  }))
                }
              >
                <SelectTrigger id={`${fid}-relation`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adulte">Adulte</SelectItem>
                  <SelectItem value="enfant">Enfant (2-12 ans)</SelectItem>
                  <SelectItem value="bebe">Bébé (&lt; 2 ans)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${fid}-age`}>Âge (années)</Label>
              <Input
                id={`${fid}-age`}
                type="number"
                min={0}
                max={120}
                value={form.ageYears}
                onChange={(e) => setForm((f) => ({ ...f, ageYears: e.target.value }))}
                placeholder="Ex. : 34"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${fid}-weight`}>
              Poids en kg <span className="text-muted-foreground">(optionnel)</span>
            </Label>
            <Input
              id={`${fid}-weight`}
              type="number"
              min={0}
              max={300}
              step="0.1"
              value={form.weightKg}
              onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))}
              placeholder="Ex. : 70"
            />
          </div>

          {isAdult ? (
            <div className="grid gap-3 rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`${fid}-pregnant`} className="cursor-pointer">
                  <span className="flex items-center gap-1.5">
                    <HeartPulse className="size-4 text-state-danger" aria-hidden />
                    Grossesse en cours
                  </span>
                </Label>
                <Switch
                  id={`${fid}-pregnant`}
                  checked={form.pregnant}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, pregnant: v, breastfeeding: v ? false : f.breastfeeding }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`${fid}-breastfeeding`} className="cursor-pointer">
                  <span className="flex items-center gap-1.5">
                    <Baby className="size-4 text-primary" aria-hidden />
                    Allaitement
                  </span>
                </Label>
                <Switch
                  id={`${fid}-breastfeeding`}
                  checked={form.breastfeeding}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, breastfeeding: v, pregnant: v ? false : f.pregnant }))
                  }
                />
              </div>
              {(form.pregnant || form.breastfeeding) ? (
                <p className="text-xs leading-relaxed text-state-warning">
                  L’analyse de l’armoire croisera chaque médicament avec la base grossesse /
                  allaitement (règles CRAT + livres techniques).
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm font-medium text-state-danger">
              {error}
            </p>
          ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={submit}>{editing ? 'Enregistrer' : 'Créer le profil'}</Button>
        </DialogFooter>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Résultat d'analyse grossesse / allaitement                          */
/* ------------------------------------------------------------------ */

interface PregnancyAlert {
  brand: string
  dci: string
  level: Exclude<PregnancyRisk, 'SURE' | 'NEUTRE'>
  note: string
  alternatives: string[]
  breastfeeding: boolean
}

function buildPregnancyAlerts(
  results: (PregnancyCheckResponse | null)[],
  profile: ArmoireProfile
): PregnancyAlert[] {
  const alerts: PregnancyAlert[] = []
  for (const res of results) {
    if (!res || !res.found) continue
    const { drug, rule } = res
    if (profile.pregnant && res.riskLevel && res.riskLevel !== 'SURE' && res.riskLevel !== 'NEUTRE') {
      alerts.push({
        brand: drug?.brand ?? '—',
        dci: drug?.dci ?? '',
        level: res.riskLevel,
        note: rule?.pregnancyNote ?? '',
        alternatives: rule?.alternatives ?? [],
        breastfeeding: false,
      })
    }
    if (
      profile.breastfeeding &&
      res.breastfeedingLevel &&
      res.breastfeedingLevel !== 'SURE' &&
      res.breastfeedingLevel !== 'NEUTRE'
    ) {
      alerts.push({
        brand: drug?.brand ?? '—',
        dci: drug?.dci ?? '',
        level: res.breastfeedingLevel,
        note: rule?.breastfeedingNote ?? '',
        alternatives: rule?.alternatives ?? [],
        breastfeeding: true,
      })
    }
  }
  return alerts
}

/* ------------------------------------------------------------------ */
/* Vue Armoire                                                         */
/* ------------------------------------------------------------------ */

export function ArmoireView() {
  const { toast } = useToast()
  const profiles = useDzPharm((s) => s.armoireProfiles)
  const itemsMap = useDzPharm((s) => s.armoireItems)
  const activeId = useDzPharm((s) => s.activeArmoireProfileId)
  const addProfile = useDzPharm((s) => s.addArmoireProfile)
  const updateProfile = useDzPharm((s) => s.updateArmoireProfile)
  const deleteProfile = useDzPharm((s) => s.deleteArmoireProfile)
  const setActiveProfile = useDzPharm((s) => s.setActiveArmoireProfile)
  const addItem = useDzPharm((s) => s.addArmoireItem)
  const updateItem = useDzPharm((s) => s.updateArmoireItem)
  const removeItem = useDzPharm((s) => s.removeArmoireItem)
  const clearProfile = useDzPharm((s) => s.clearArmoireProfile)
  const openDrug = useDzPharm((s) => s.openDrug)

  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ArmoireProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ArmoireProfile | null>(null)
  const [clearTarget, setClearTarget] = useState<ArmoireProfile | null>(null)

  const active = useMemo(
    () => profiles.find((p) => p.id === activeId) ?? profiles[0] ?? null,
    [profiles, activeId]
  )
  const items = useMemo(
    () => (active ? (itemsMap[active.id] ?? []) : []),
    [itemsMap, active]
  )
  const alerts = useMemo(() => computeCabinetAlerts(items), [items])

  /* --------------------------- Analyse ----------------------------- */

  /** Clé d'invalidation : l'analyse est réinitialisée dès que le profil ou les médicaments changent. */
  const itemsKey = items.map((i) => i.uid).join(',')
  const analysisKey = `${active?.id ?? ''}|${itemsKey}`
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisState, setAnalysisState] = useState<{
    key: string
    result: InteractionsResponse | null
    pregnancyAlerts: PregnancyAlert[]
    error: boolean
  } | null>(null)
  const analysis = analysisState?.key === analysisKey ? analysisState : null
  const interactionResult = analysis?.result ?? null
  const pregnancyAlerts = analysis?.pregnancyAlerts ?? []
  const analysisError = analysis?.error ?? false

  const canAnalyze =
    items.length >= 2 || (items.length >= 1 && (active?.pregnant || active?.breastfeeding))

  async function runAnalysis() {
    if (!active || !canAnalyze) return
    setAnalyzing(true)
    try {
      const drugs = items.map((i) => ({ name: i.brand, dci: i.dci }))
      const [inter, preg] = await Promise.all([
        items.length >= 2 ? postLocalInteractions(drugs) : Promise.resolve(null),
        active.pregnant || active.breastfeeding
          ? Promise.all(items.map((i) => checkPregnancy(i.brand).catch(() => null)))
          : Promise.resolve([] as (PregnancyCheckResponse | null)[]),
      ])
      setAnalysisState({
        key: analysisKey,
        result: inter,
        pregnancyAlerts: buildPregnancyAlerts(preg, active),
        error: false,
      })
    } catch {
      setAnalysisState({
        key: analysisKey,
        result: null,
        pregnancyAlerts: [],
        error: true,
      })
    } finally {
      setAnalyzing(false)
    }
  }

  /* --------------------------- Actions ----------------------------- */

  function handleSelectDrug(drug: Drug) {
    if (!active) return
    const result = addItem(active.id, {
      drugId: drug.id,
      brand: drug.brand,
      dci: drug.dci,
      dciKey: drug.dciKey ?? normKey(drug.dci),
      status: drug.status,
      form: drug.form,
      dosage: drug.dosage,
    })
    if (result === 'added') {
      toast({
        title: 'Ajouté à l’armoire',
        description: `${drug.brand} — armoire de ${active.name}.`,
      })
    } else if (result === 'duplicate') {
      toast({
        title: 'Déjà présent',
        description: `${drug.brand} figure déjà dans l’armoire de ${active.name}.`,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Armoire pleine',
        description: `Maximum ${MAX_ITEMS_PER_PROFILE} médicaments par profil.`,
        variant: 'destructive',
      })
    }
  }

  function submitProfileForm(form: ProfileFormState) {
    const payload = {
      name: form.name.trim(),
      relation: form.relation,
      ageYears: Number.parseInt(form.ageYears, 10),
      weightKg: form.weightKg ? Number.parseFloat(form.weightKg.replace(',', '.')) : null,
      pregnant: form.pregnant,
      breastfeeding: form.breastfeeding,
    }
    if (editingProfile) {
      updateProfile(editingProfile.id, payload)
      toast({ title: 'Profil mis à jour', description: payload.name })
    } else {
      const created = addProfile(payload)
      if (!created) {
        toast({
          title: 'Limite atteinte',
          description: `Maximum ${MAX_PROFILES} profils.`,
          variant: 'destructive',
        })
        return
      }
      toast({ title: 'Profil créé', description: `Armoire de ${payload.name} initialisée.` })
    }
    setProfileDialogOpen(false)
    setEditingProfile(null)
  }

  function confirmDeleteProfile() {
    if (!deleteTarget) return
    const name = deleteTarget.name
    deleteProfile(deleteTarget.id)
    setDeleteTarget(null)
    toast({ title: 'Profil supprimé', description: `L’armoire de ${name} a été vidée.` })
  }

  function confirmClearProfile() {
    if (!clearTarget) return
    const name = clearTarget.name
    clearProfile(clearTarget.id)
    setClearTarget(null)
    toast({ title: 'Armoire vidée', description: `Tous les médicaments de ${name} ont été retirés.` })
  }

  /* --------------------------- Rendu ------------------------------- */

  return (
    <div className="pb-10">
      {/* En-tête */}
      <section aria-labelledby="armoire-title" className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1
              id="armoire-title"
              className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              <span
                className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20"
                aria-hidden
              >
                <Users className="size-5.5 text-primary-foreground" />
              </span>
              Armoire familiale
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Gérez les médicaments de chaque membre de la famille : péremptions, produits retirés
              du marché, doublons de DCI et analyse d’interactions en un clic — avec vigilance
              grossesse et allaitement quand c’est pertinent.
            </p>
          </div>
          <Badge
            variant="outline"
            className="gap-1.5 border-primary/25 bg-primary/5 text-primary"
          >
            <Lock className="size-3" aria-hidden />
            Données stockées dans votre navigateur
          </Badge>
        </div>
      </section>

      {/* Barre des profils */}
      <section
        aria-label="Profils de la famille"
        className="mx-auto max-w-7xl px-4 pt-6 sm:px-6"
      >
        <div className="no-scrollbar flex items-stretch gap-3 overflow-x-auto pb-2">
          {profiles.map((p) => {
            const pItems = itemsMap[p.id] ?? []
            const pAlerts = computeCabinetAlerts(pItems)
            const isActive = active?.id === p.id
            const RelationIcon = RELATION_META[p.relation].icon
            return (
              <motion.button
                key={p.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setActiveProfile(p.id)}
                aria-pressed={isActive}
                className={cn(
                  'relative flex min-w-[168px] shrink-0 flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  isActive
                    ? 'border-primary/50 bg-primary/5 shadow-md shadow-primary/10'
                    : 'border-border bg-card hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm'
                )}
              >
                {pAlerts.length > 0 ? (
                  <span
                    className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-state-danger text-[10px] font-bold text-white"
                    aria-label={`${pAlerts.length} alerte(s)`}
                  >
                    {pAlerts.length}
                  </span>
                ) : null}
                <span className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'flex size-10 items-center justify-center rounded-full text-sm font-bold',
                      p.pregnant
                        ? 'bg-state-danger/15 text-state-danger'
                        : p.breastfeeding
                          ? 'bg-chifa/15 text-chifa'
                          : 'bg-primary/10 text-primary'
                    )}
                    aria-hidden
                  >
                    {initials(p.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {p.name}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <RelationIcon className="size-3" aria-hidden />
                      {RELATION_META[p.relation].label} · {ageLabel(p.ageYears)}
                    </span>
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="gap-1 border-border bg-muted/60 px-1.5 text-[10px] text-muted-foreground"
                  >
                    <PackageOpen className="size-3" aria-hidden />
                    {pItems.length} médicament{pItems.length > 1 ? 's' : ''}
                  </Badge>
                  {p.pregnant ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-state-danger/30 bg-state-danger/10 px-1.5 text-[10px] text-state-danger"
                    >
                      <HeartPulse className="size-3" aria-hidden />
                      Grossesse
                    </Badge>
                  ) : null}
                  {p.breastfeeding ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-chifa/30 bg-chifa/10 px-1.5 text-[10px] text-chifa"
                    >
                      <Baby className="size-3" aria-hidden />
                      Allaitement
                    </Badge>
                  ) : null}
                </span>
              </motion.button>
            )
          })}

          {profiles.length < MAX_PROFILES ? (
            <button
              type="button"
              onClick={() => {
                setEditingProfile(null)
                setProfileDialogOpen(true)
              }}
              className="flex min-w-[140px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-primary transition-all hover:-translate-y-0.5 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <UserRoundPlus className="size-6" aria-hidden />
              <span className="text-sm font-semibold">Ajouter un profil</span>
              <span className="text-[11px] text-muted-foreground">
                {profiles.length}/{MAX_PROFILES}
              </span>
            </button>
          ) : null}
        </div>
      </section>

      {/* Contenu principal */}
      <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <AnimatePresence mode="wait">
          {!active ? (
            /* -------- État vide : aucun profil -------- */
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-5 py-12 text-center">
                  <span
                    className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                    aria-hidden
                  >
                    <Users className="size-8" />
                  </span>
                  <div className="max-w-md">
                    <h2 className="text-lg font-semibold text-foreground">
                      Créez le premier profil familial
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Un profil par membre de la famille (adulte, enfant, bébé). Ajoutez ensuite
                      les médicaments de l’armoire à la maison depuis le registre des 9 555
                      produits algériens.
                    </p>
                  </div>
                  <ul className="grid w-full max-w-md gap-2 text-left text-sm text-muted-foreground">
                    {[
                      'Suivi des dates de péremption boîte par boîte',
                      'Alertes produits retirés du marché (ANPP)',
                      'Détection de doublons de DCI (double médication)',
                      'Analyse d’interactions du moteur local en un clic',
                      'Vigilance grossesse et allaitement par profil',
                    ].map((line) => (
                      <li key={line} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-state-safe" aria-hidden />
                        {line}
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="lg"
                    onClick={() => {
                      setEditingProfile(null)
                      setProfileDialogOpen(true)
                    }}
                  >
                    <UserRoundPlus className="size-4" aria-hidden />
                    Créer un profil
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]"
            >
              {/* -------- Colonne gauche : médicaments -------- */}
              <div className="min-w-0 space-y-5">
                <Card>
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex size-11 items-center justify-center rounded-full text-base font-bold',
                          active.pregnant
                            ? 'bg-state-danger/15 text-state-danger'
                            : active.breastfeeding
                              ? 'bg-chifa/15 text-chifa'
                              : 'bg-primary/10 text-primary'
                        )}
                        aria-hidden
                      >
                        {initials(active.name)}
                      </span>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">
                          Armoire de {active.name}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {RELATION_META[active.relation].label} · {ageLabel(active.ageYears)}
                          {active.weightKg != null ? ` · ${active.weightKg} kg` : ''}
                          {active.pregnant ? ' · grossesse' : ''}
                          {active.breastfeeding ? ' · allaitement' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Modifier le profil de ${active.name}`}
                        onClick={() => {
                          setEditingProfile(active)
                          setProfileDialogOpen(true)
                        }}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Vider l’armoire de ${active.name}`}
                        disabled={items.length === 0}
                        onClick={() => setClearTarget(active)}
                      >
                        <RefreshCw className="size-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Supprimer le profil de ${active.name}`}
                        onClick={() => setDeleteTarget(active)}
                      >
                        <Trash2 className="size-4 text-state-danger" aria-hidden />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Ajout de médicament */}
                    <SearchAutocomplete
                      onSelect={handleSelectDrug}
                      placeholder="Ajouter un médicament (marque ou DCI)…"
                      ariaLabel="Ajouter un médicament à l’armoire"
                    />

                    {/* Liste des médicaments */}
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-10 text-center">
                        <PackageOpen className="size-8 text-muted-foreground/60" aria-hidden />
                        <p className="max-w-sm text-sm text-muted-foreground">
                          Aucun médicament dans l’armoire de {active.name}. Utilisez la recherche
                          ci-dessus pour ajouter les médicaments conservés à la maison.
                        </p>
                      </div>
                    ) : (
                      <ul className="scroll-thin max-h-[28rem] space-y-2.5 overflow-y-auto pr-1">
                        {items.map((item) => (
                          <ItemRow
                            key={item.uid}
                            item={item}
                            onOpenSheet={() => openDrug(item.drugId)}
                            onUpdate={(patch) => updateItem(active.id, item.uid, patch)}
                            onRemove={() => removeItem(active.id, item.uid)}
                          />
                        ))}
                      </ul>
                    )}

                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {items.length}/{MAX_ITEMS_PER_PROFILE} médicaments · les boîtes périmées ou
                      retirées du marché doivent être rapportées à votre pharmacien pour
                      destruction sécurisée.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* -------- Colonne droite : alertes + analyse -------- */}
              <div className="min-w-0 space-y-5">
                {/* Alertes armoire */}
                {alerts.length > 0 ? (
                  <Card className="border-state-warning/40">
                    <CardHeader className="pb-3">
                      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                        <AlertTriangle className="size-5 text-state-warning" aria-hidden />
                        Alertes de l’armoire
                        <Badge
                          variant="outline"
                          className="ml-1 border-state-warning/40 bg-state-warning/10 text-state-warning"
                        >
                          {alerts.length}
                        </Badge>
                      </h2>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                      <ul className="scroll-thin max-h-72 space-y-2 overflow-y-auto pr-1">
                        {alerts.map((a, i) => (
                          <li
                            key={`${a.kind}-${a.brand}-${i}`}
                            className={cn(
                              'rounded-lg border p-3 text-xs leading-relaxed',
                              ALERT_KIND_META[a.kind].className
                            )}
                          >
                            <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide">
                              {ALERT_KIND_META[a.kind].label}
                            </span>
                            <span className="text-foreground/90">{a.message}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ) : items.length > 0 ? (
                  <Card className="border-state-safe/40 bg-state-safe/5">
                    <CardContent className="flex items-center gap-3 py-4">
                      <ShieldCheck className="size-6 shrink-0 text-state-safe" aria-hidden />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Armoire à jour
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Aucune péremption imminente, produit retiré ni doublon détecté.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Analyse */}
                <Card>
                  <CardHeader className="pb-3">
                    <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                      <Stethoscope className="size-5 text-primary" aria-hidden />
                      Analyse de sécurité
                    </h2>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Croise tous les médicaments de {active.name} : interactions du moteur local
                      (base de règles déterministe)
                      {active.pregnant || active.breastfeeding
                        ? ' + compatibilité grossesse/allaitement (CRAT & livres)'
                        : ''}
                      .
                    </p>

                    <Button
                      className="w-full"
                      onClick={runAnalysis}
                      disabled={!canAnalyze || analyzing}
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Analyse en cours…
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="size-4" aria-hidden />
                          Analyser l’armoire de {active.name}
                        </>
                      )}
                    </Button>
                    {!canAnalyze ? (
                      <p className="text-[11px] text-muted-foreground">
                        {items.length === 0
                          ? 'Ajoutez au moins un médicament.'
                          : active.pregnant || active.breastfeeding
                            ? 'Au moins un médicament requis pour la vérification grossesse.'
                            : 'Ajoutez au moins 2 médicaments pour détecter les interactions.'}
                      </p>
                    ) : null}

                    {analysisError ? (
                      <p role="alert" className="text-sm font-medium text-state-danger">
                        L’analyse a échoué — vérifiez votre connexion puis réessayez.
                      </p>
                    ) : null}

                    <AnalysisResult
                      result={interactionResult}
                      pregnancyAlerts={pregnancyAlerts}
                      profile={active}
                      itemsCount={items.length}
                    />
                  </CardContent>
                </Card>

                {/* Note enfant → calculateur pédiatrique */}
                {active.relation !== 'adulte' && items.length > 0 ? (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="flex items-start gap-3 py-4">
                      <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                      <p className="text-xs leading-relaxed text-foreground/90">
                        <strong className="text-foreground">Profil {active.relation === 'bebe' ? 'bébé' : 'enfant'} :</strong>{' '}
                        les doses doivent être adaptées au poids. Utilisez le calculateur de
                        posologies pédiatriques (Outils cliniques) pour convertir mg/kg → mL avec
                        les formes locales.
                      </p>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Pied de vue */}
      <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
        <p className="rounded-xl border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
          L’armoire familiale est une aide à l’organisation domestique : elle ne remplace ni
          l’avis d’un pharmacien, ni une ordonnance, ni la lecture de la notice. En cas de doute
          (interaction, grossesse, enfant), consultez toujours votre pharmacien. Les données de
          l’armoire ne quittent jamais votre navigateur ; seuls les noms de médicaments sont
          transmis lors d’une analyse.
        </p>
      </div>

      {/* Dialogues */}
      <ProfileDialog
        open={profileDialogOpen}
        onOpenChange={(open) => {
          setProfileDialogOpen(open)
          if (!open) setEditingProfile(null)
        }}
        editing={editingProfile}
        onSubmit={submitProfileForm}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer le profil de {deleteTarget?.name} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Son armoire et tous ses médicaments ({itemsMap[deleteTarget?.id ?? '']?.length ?? 0})
              seront définitivement supprimés de ce navigateur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-state-danger text-white hover:bg-state-danger/90"
              onClick={confirmDeleteProfile}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={clearTarget !== null}
        onOpenChange={(open) => !open && setClearTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vider l’armoire de {clearTarget?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les médicaments seront retirés. Le profil est conservé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearProfile}>Vider</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Ligne médicament                                                    */
/* ------------------------------------------------------------------ */

function ItemRow({
  item,
  onOpenSheet,
  onUpdate,
  onRemove,
}: {
  item: ArmoireItem
  onOpenSheet: () => void
  onUpdate: (patch: Partial<Pick<ArmoireItem, 'quantity' | 'expiry'>>) => void
  onRemove: () => void
}) {
  const d = daysUntil(item.expiry)
  const expired = d !== null && d < 0
  const expiringSoon = d !== null && d >= 0 && d <= 30
  const fid = useId()

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn(
        'rounded-xl border bg-card p-3.5 transition-colors',
        expired
          ? 'border-state-danger/50'
          : item.status === 'RETRIE'
            ? 'border-state-danger/40'
            : expiringSoon
              ? 'border-state-warning/40'
              : 'border-border'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenSheet}
              className="truncate text-sm font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {item.brand}
            </button>
            <StatusBadge status={item.status} className="shrink-0 px-1.5 text-[10px]" />
            {expired ? (
              <Badge
                variant="outline"
                className="shrink-0 border-transparent bg-state-danger px-1.5 text-[10px] text-white"
              >
                Périmé
              </Badge>
            ) : expiringSoon ? (
              <Badge
                variant="outline"
                className="shrink-0 border-state-warning/40 bg-state-warning/10 px-1.5 text-[10px] text-state-warning"
              >
                {d === 0 ? 'Expire aujourd’hui' : `Expire dans ${d} j`}
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {cleanDciLabel(item.dci)}
            {item.dosage ? ` · ${item.dosage}` : ''}
            {item.form ? ` · ${item.form}` : ''}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Retirer ${item.brand} de l’armoire`}
          onClick={onRemove}
          className="size-8 shrink-0 text-muted-foreground hover:text-state-danger"
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Quantité */}
        <div className="flex items-center gap-1.5" aria-label="Quantité restante">
          <span className="text-[11px] font-medium text-muted-foreground">Boîtes</span>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            aria-label="Diminuer"
            disabled={item.quantity <= 0}
            onClick={() => onUpdate({ quantity: Math.max(0, item.quantity - 1) })}
          >
            <Minus className="size-3" aria-hidden />
          </Button>
          <span
            className={cn(
              'w-6 text-center text-sm font-semibold tabular-nums',
              item.quantity === 0 ? 'text-state-warning' : 'text-foreground'
            )}
          >
            {item.quantity}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            aria-label="Augmenter"
            disabled={item.quantity >= 99}
            onClick={() => onUpdate({ quantity: Math.min(99, item.quantity + 1) })}
          >
            <Plus className="size-3" aria-hidden />
          </Button>
          {item.quantity === 0 ? (
            <span className="text-[10px] font-medium text-state-warning">à racheter</span>
          ) : null}
        </div>

        {/* Péremption */}
        <div className="flex items-center gap-1.5">
          <CalendarClock
            className="size-3.5 text-muted-foreground"
            aria-hidden
          />
          <Label htmlFor={`${fid}-expiry`} className="sr-only">
            Date de péremption de {item.brand}
          </Label>
          <Input
            id={`${fid}-expiry`}
            type="date"
            value={item.expiry}
            onChange={(e) => onUpdate({ expiry: e.target.value })}
            className={cn(
              'h-8 w-[9.5rem] px-2 text-xs',
              expired && 'border-state-danger/60 text-state-danger'
            )}
            aria-label="Date de péremption"
          />
          {item.expiry === '' ? (
            <span className="text-[10px] text-muted-foreground">à compléter</span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onOpenSheet}
          className="ml-auto flex items-center gap-1 text-[11px] font-medium text-primary underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <FileSearch className="size-3.5" aria-hidden />
          Voir la fiche
        </button>
      </div>
    </motion.li>
  )
}

/* ------------------------------------------------------------------ */
/* Résultat d'analyse                                                  */
/* ------------------------------------------------------------------ */

function AnalysisResult({
  result,
  pregnancyAlerts,
  profile,
  itemsCount,
}: {
  result: InteractionsResponse | null
  pregnancyAlerts: PregnancyAlert[]
  profile: ArmoireProfile
  itemsCount: number
}) {
  if (!result && pregnancyAlerts.length === 0) return null

  const risk = result?.globalRisk
  const riskMeta = risk ? RISK_META[risk] : null
  const pairs = [...(result?.pairs ?? [])].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  )
  const noInteraction =
    result && result.pairs.length === 0 && itemsCount >= 2 && pregnancyAlerts.length === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
      aria-live="polite"
    >
      {/* Bandeau risque global */}
      {riskMeta && risk ? (
        <div
          className={cn('flex items-start gap-3 rounded-xl border p-3.5', riskMeta.border, riskMeta.className)}
          role="status"
        >
          <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="text-sm font-bold">{riskMeta.label}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-foreground/85">{result?.summary}</p>
          </div>
        </div>
      ) : null}

      {noInteraction ? (
        <div className="flex items-start gap-3 rounded-xl border border-state-safe/40 bg-state-safe/10 p-3.5 text-state-safe" role="status">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p className="text-xs leading-relaxed">
            Aucune interaction documentée entre les médicaments de {profile.name} dans la base de
            règles locale.
          </p>
        </div>
      ) : null}

      {/* Paires d'interactions */}
      {pairs.length > 0 ? (
        <ul className="space-y-2.5">
          {pairs.map((pair, i) => (
            <li
              key={`${pair.drugs[0]}-${pair.drugs[1]}-${i}`}
              className="rounded-xl border border-border bg-muted/30 p-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Copy className="size-3.5 text-muted-foreground" aria-hidden />
                  {pair.drugs[0]}
                  <span className="text-muted-foreground">×</span>
                  {pair.drugs[1]}
                </p>
                <SeverityBadge severity={pair.severity} className="shrink-0 text-[10px]" />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-foreground/85">
                <span className="font-semibold text-foreground">Mécanisme : </span>
                {pair.mechanism}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/85">
                <span className="font-semibold text-foreground">Conduite : </span>
                {pair.management}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Alertes grossesse / allaitement */}
      {pregnancyAlerts.length > 0 ? (
        <div className="space-y-2.5">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-foreground">
            <HeartPulse className="size-4 text-state-danger" aria-hidden />
            Vigilance {profile.pregnant ? 'grossesse' : 'allaitement'}
          </h3>
          <ul className="space-y-2.5">
            {pregnancyAlerts.map((a, i) => {
              const meta = a.breastfeeding
                ? (PREG_RISK_META_ALLAITEMENT[a.level] ?? PREG_RISK_META[a.level])
                : PREG_RISK_META[a.level]
              return (
                <li
                  key={`${a.brand}-${a.level}-${i}`}
                  className={cn('rounded-xl border p-3', meta?.className ?? 'border-border bg-muted/40')}
                >
                  <p className="text-sm font-semibold">{meta?.label}</p>
                  <p className="mt-1 text-xs font-medium text-foreground">{a.brand}</p>
                  {a.dci ? (
                    <p className="text-[11px] text-foreground/70">{cleanDciLabel(a.dci)}</p>
                  ) : null}
                  {a.note ? (
                    <p className="mt-1.5 text-xs leading-relaxed text-foreground/85">{a.note}</p>
                  ) : null}
                  {a.alternatives.length > 0 ? (
                    <p className="mt-1.5 text-xs leading-relaxed text-foreground/85">
                      <span className="font-semibold">Alternatives à discuter : </span>
                      {a.alternatives.join(', ')}.
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {/* Conseils & surveillance */}
      {result && (result.advice.length > 0 || result.monitoring.length > 0) ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {result.advice.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-3">
              <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-foreground">
                <Lightbulb className="size-3.5 text-chifa" aria-hidden />
                Conseils
              </h3>
              <ul className="mt-2 space-y-1.5">
                {result.advice.slice(0, 6).map((a, i) => (
                  <li key={i} className="text-[11px] leading-relaxed text-muted-foreground">
                    • {a}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {result.monitoring.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-3">
              <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-foreground">
                <Stethoscope className="size-3.5 text-primary" aria-hidden />
                Surveillance
              </h3>
              <ul className="mt-2 space-y-1.5">
                {result.monitoring.slice(0, 6).map((m, i) => (
                  <li key={i} className="text-[11px] leading-relaxed text-muted-foreground">
                    • {m}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Analyse du moteur de règles local (déterministe) — ne remplace pas la validation
        pharmaceutique ni l’avis médical.
      </p>
    </motion.div>
  )
}
