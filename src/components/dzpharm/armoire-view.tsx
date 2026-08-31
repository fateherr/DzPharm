'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Baby,
  BriefcaseMedical,
  CalendarClock,
  Check,
  ChevronDown,
  Coins,
  Copy,
  Download,
  FileSearch,
  HeartPulse,
  History,
  Info,
  KeyRound,
  Lightbulb,
  Loader2,
  Lock,
  Minus,
  PackageOpen,
  Pencil,
  PersonStanding,
  Plus,
  Printer,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Sun,
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
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import { checkPregnancy, postLocalInteractions } from './api'
import type {
  Drug,
  InteractionSeverity,
  InteractionsResponse,
  PregnancyCheckResponse,
  PregnancyRisk,
  PediatricDosing,
} from './types'
import { PEDIATRIC_DRUGS, computeDose, type DoseResult } from '@/lib/pediatric-dosing'
import { RISK_META, SeverityBadge, StatusBadge } from './status-badge'
import {
  MAX_ITEMS_PER_PROFILE,
  MAX_PROFILES,
  useDzPharm,
  type ArmoireItem,
  type ArmoireJournalEntry,
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

/* ------------------------------------------------------------------ */
/* Confidentialité, PIN & trousse de secours (audit 3.6 / 4.1)         */
/* ------------------------------------------------------------------ */

/** Consentement première utilisation — valeur = date ISO d'acceptation. */
const CONSENT_KEY = 'armoire.consent.v1'
/** Code PIN (verrou de confort local, 4 chiffres, non chiffré). */
const PIN_KEY = 'armoire.pin.v1'
/** Trousse de secours — liste d'identifiants d'articles cochés. */
const FIRST_AID_KEY = 'armoire.firstAid.v1'
/** Clé du store persisté (zustand) — seul le bloc « armoire » est exporté/effacé. */
const STORE_KEY = 'dzpharm-store'

const STORE_ARMOIRE_FIELDS = [
  'armoireProfiles',
  'armoireItems',
  'activeArmoireProfileId',
  'armoireJournal',
] as const

/** Trousse de secours — objets domestiques hors médicaments (aucune donnée clinique). */
const FIRST_AID_ITEMS: { id: string; label: string }[] = [
  { id: 'pansements', label: 'Pansements adhésifs (tailles variées)' },
  { id: 'compresses', label: 'Compresses stériles' },
  { id: 'antiseptique-cutane', label: 'Antiseptique cutané' },
  { id: 'serum-physiologique', label: 'Sérum physiologique' },
  { id: 'thermometre', label: 'Thermomètre' },
  { id: 'ciseaux', label: 'Ciseaux à bouts ronds' },
  { id: 'pince-echardes', label: 'Pince à épiler / échardes' },
  { id: 'gants', label: 'Gants jetables' },
  { id: 'bande-contention', label: 'Bande de contention' },
  { id: 'couverture-survie', label: 'Couverture de survie' },
  { id: 'antiseptique-plaies', label: 'Solution antiseptique pour plaies' },
  { id: 'sac-hermetique', label: 'Sac plastique hermétique' },
]

function readFirstAidChecked(): string[] {
  try {
    const raw = localStorage.getItem(FIRST_AID_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    return []
  }
}

/** Bloc « armoire » du store persisté (les autres vues ne sont pas exportées). */
function readStoredArmoire(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return out
    const state = (JSON.parse(raw) as { state?: Record<string, unknown> })?.state
    if (!state) return out
    for (const key of STORE_ARMOIRE_FIELDS) {
      if (key in state) out[key] = state[key]
    }
  } catch {
    /* stockage illisible — export du bloc vide */
  }
  return out
}

function formatConsentDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
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

type AlertKind = 'expired' | 'expiring7' | 'expiring' | 'withdrawn' | 'duplicate'

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
  expiring7: {
    label: 'Péremption ≤ 7 j',
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
    } else if (d !== null && d <= 7) {
      alerts.push({
        kind: 'expiring7',
        brand: item.brand,
        message: `${item.brand} expire dans ${d} jour(s) — renouvelez-le dès cette semaine.`,
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
  const order: AlertKind[] = ['expired', 'withdrawn', 'expiring7', 'duplicate', 'expiring']
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
/* Rappels saisonniers (conseils d'organisation — éducation seule)     */
/* ------------------------------------------------------------------ */

function getSeasonalTips(date: Date): { season: string; tips: string[] } {
  const m = date.getMonth() // 0-11
  const tips: string[] = []
  let season = ''
  if (m >= 5 && m <= 7) {
    season = 'Été'
    tips.push(
      'Chaleur : conservez les médicaments à l’abri de la chaleur (souvent < 25 °C, voir notice) — jamais dans une voiture.',
      'Suspensions reconstituées : respectez la durée de conservation de la notice (souvent 7-14 jours au réfrigérateur) puis jetez-les.'
    )
  } else if (m >= 8 && m <= 9) {
    season = 'Rentrée scolaire'
    tips.push(
      'Pédiculose : si l’école signale des poux, vérifiez les cheveux des enfants avant de traiter (shampooing/peigne fin selon avis pharmacien).',
      'Mettez à jour le carnet de vaccination avant la rentrée.'
    )
  } else if (m >= 2 && m <= 4) {
    season = 'Printemps'
    tips.push(
      'Allergies pollinaires : vérifiez que vos antihistaminiques ne sont pas périmés (cétirizine, loratadine…).'
    )
  } else {
    season = 'Automne / Hiver'
    tips.push(
      'Saison grippale : vérifiez paracétamol et thermomètre dans l’armoire.',
      'Sirops « ouverts » depuis plus d’un mois : à jeter (la durée après ouverture figure sur la notice).'
    )
  }
  // Fenêtre Ramadan (février–mars) : rappel chronopharmacologie
  if (m >= 1 && m <= 2) {
    tips.push(
      'Ramadan : les horaires des traitements chroniques (diabète, tension) doivent être adaptés avec votre médecin ou pharmacien avant le début du jeûne.'
    )
  }
  return { season, tips }
}

/* ------------------------------------------------------------------ */
/* Posologies pédiatriques adaptées au profil (armoire → poids)        */
/* ------------------------------------------------------------------ */

interface PediMatch {
  item: ArmoireItem
  drug: PediatricDosing
  formIndex: number
  formLabel: string
  result: DoseResult
}

/** Choisit la forme du référentiel correspondant au dosage de la boîte. */
function pickPediatricForm(drug: PediatricDosing, item: ArmoireItem): number {
  const dosageKey = normKey(item.dosage).replace(/ /g, '')
  if (dosageKey.length >= 4) {
    const idx = drug.forms.findIndex((f) =>
      normKey(f.label).replace(/ /g, '').includes(dosageKey)
    )
    if (idx >= 0) return idx
  }
  const liquid = drug.forms.findIndex((f) => f.perVolumeMl > 0)
  return liquid >= 0 ? liquid : 0
}

function matchPediatricItems(
  items: ArmoireItem[],
  weightKg: number,
  ageYears: number
): PediMatch[] {
  const matches: PediMatch[] = []
  for (const item of items) {
    const key = item.dciKey || normKey(item.dci)
    const drug = PEDIATRIC_DRUGS.find((d) => d.dciKey === key)
    if (!drug) continue
    const formIndex = pickPediatricForm(drug, item)
    const result = computeDose(drug, weightKg, Math.max(0, Math.round(ageYears * 12)), formIndex)
    matches.push({ item, drug, formIndex, formLabel: drug.forms[formIndex].label, result })
  }
  return matches
}

function PediatricDoseCard({
  matches,
  profile,
  onOpenTools,
}: {
  matches: PediMatch[]
  profile: ArmoireProfile
  onOpenTools: () => void
}) {
  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Scale className="size-5 text-primary" aria-hidden />
          Posologies adaptées au poids
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Calcul déterministe (référentiel pédiatrique DzPharm) pour les médicaments de
          l’armoire de {profile.name} — profil {profile.relation === 'bebe' ? 'bébé' : 'enfant'} de{' '}
          {profile.weightKg} kg. Le volume en mL dépend de la forme choisie.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {profile.relation === 'bebe' && profile.ageYears < 2 ? (
          <p className="rounded-lg border border-state-warning/40 bg-state-warning/10 p-2.5 text-[11px] leading-relaxed text-state-warning">
            Âge saisi en années : pour un bébé, confirmez l’âge exact en mois — certaines
            contre-indications (ex. ibuprofène &lt; 3 mois) s’apprécient en mois révolus.
          </p>
        ) : null}
        <ul className="scroll-thin max-h-80 space-y-2.5 overflow-y-auto pr-1">
          {matches.map((m) => (
            <li key={m.item.uid} className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{m.item.brand}</p>
                <Badge variant="outline" className="border-primary/25 bg-primary/5 text-[10px] text-primary">
                  {m.drug.category}
                </Badge>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {cleanDciLabel(m.item.dci)} · {m.formLabel}
              </p>

              {m.result.blockers.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {m.result.blockers.map((b, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-state-danger/40 bg-state-danger/10 p-2 text-[11px] leading-relaxed text-state-danger"
                      role="alert"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 grid gap-1.5 text-xs leading-relaxed text-foreground/90">
                  <p>
                    <span className="font-semibold">Par prise : </span>
                    {m.result.doseMg != null ? `${m.result.doseMg} mg` : '—'}
                    {m.result.capped ? ' (plafond adulte atteint)' : ''}
                    {m.result.volumeMl != null && m.result.doseMg != null
                      ? ` ≈ ${m.result.volumeMl} mL`
                      : ''}
                  </p>
                  {m.drug.intervalH ? (
                    <p>
                      <span className="font-semibold">Espacement : </span>toutes les{' '}
                      {m.drug.intervalH} h
                    </p>
                  ) : null}
                  <p>
                    <span className="font-semibold">Maximum / 24 h : </span>
                    {m.result.maxDailyMg > 0 ? `${m.result.maxDailyMg} mg` : '—'}
                  </p>
                  {m.result.bandLabel ? (
                    <p className="text-muted-foreground">{m.result.bandLabel}</p>
                  ) : null}
                </div>
              )}

              {m.drug.warnings.length > 0 ? (
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  ⚠️ {m.drug.warnings[0]}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={onOpenTools}>
            <Scale className="size-3.5" aria-hidden />
            Calculateur pédiatrique
          </Button>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Aide au calcul — ne remplace pas l’ordonnance ni l’avis du pédiatre/pharmacien.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Journal des contrôles                                               */
/* ------------------------------------------------------------------ */

function ArmoireJournalCard({
  journal,
  onClear,
}: {
  journal: ArmoireJournalEntry[]
  onClear: () => void
}) {
  if (journal.length === 0) return null
  const fmt = (at: number) =>
    new Date(at).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <History className="size-5 text-primary" aria-hidden />
          Journal des contrôles
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground"
          onClick={onClear}
        >
          Vider
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="scroll-thin max-h-64 space-y-2 overflow-y-auto pr-1">
          {journal.slice(0, 5).map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 p-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">
                  {e.profileName} · {e.itemsCount} médicament{e.itemsCount > 1 ? 's' : ''}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {e.interactions} interaction{e.interactions > 1 ? 's' : ''}
                  {e.maxSeverity ? ` (${e.maxSeverity})` : ''}
                  {e.pregnancyAlerts > 0
                    ? ` · ${e.pregnancyAlerts} alerte(s) grossesse/allaitement`
                    : ''}
                  {e.cabinetAlerts > 0 ? ` · ${e.cabinetAlerts} alerte(s) armoire` : ''}
                </p>
              </div>
              <time className="shrink-0 text-[10px] text-muted-foreground" dateTime={new Date(e.at).toISOString()}>
                {fmt(e.at)}
              </time>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Résumé imprimable (export PDF via window.print)                     */
/* ------------------------------------------------------------------ */

function ArmoirePrintSummary({
  profiles,
  itemsMap,
  journal,
}: {
  profiles: ArmoireProfile[]
  itemsMap: Record<string, ArmoireItem[]>
  journal: ArmoireJournalEntry[]
}) {
  const now = new Date().toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  })
  return (
    <div className="hidden print:block print:text-black">
      <h1 className="text-xl font-bold">DzPharm — Armoire familiale</h1>
      <p className="mt-1 text-xs">Édition du {now} · données 100 % locales (navigateur)</p>

      {profiles.map((p) => {
        const items = itemsMap[p.id] ?? []
        const alerts = computeCabinetAlerts(items)
        return (
          <section key={p.id} className="mt-5 break-inside-avoid">
            <h2 className="text-base font-bold">
              {p.name} — {RELATION_META[p.relation].label} · {ageLabel(p.ageYears)}
              {p.weightKg != null ? ` · ${p.weightKg} kg` : ''}
              {p.pregnant ? ' · grossesse' : ''}
              {p.breastfeeding ? ' · allaitement' : ''}
            </h2>
            {items.length === 0 ? (
              <p className="mt-1 text-xs italic">Aucun médicament enregistré.</p>
            ) : (
              <table className="mt-2 w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-black/40 text-left">
                    <th className="py-1 pr-2 font-semibold">Médicament</th>
                    <th className="py-1 pr-2 font-semibold">DCI · dosage</th>
                    <th className="py-1 pr-2 font-semibold">Péremption</th>
                    <th className="py-1 pr-2 font-semibold">Boîtes</th>
                    <th className="py-1 font-semibold">Statut registre</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => {
                    const d = daysUntil(i.expiry)
                    return (
                      <tr key={i.uid} className="border-b border-black/15 align-top">
                        <td className="py-1 pr-2 font-medium">{i.brand}</td>
                        <td className="py-1 pr-2">
                          {cleanDciLabel(i.dci)}
                          {i.dosage ? ` · ${i.dosage}` : ''}
                        </td>
                        <td className="py-1 pr-2">
                          {i.expiry
                            ? `${i.expiry}${d !== null ? (d < 0 ? ' (PÉRIMÉ)' : d <= 30 ? ` (J-${d})` : '') : ''}`
                            : '—'}
                        </td>
                        <td className="py-1 pr-2">{i.quantity}</td>
                        <td className="py-1">{i.status}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            {alerts.length > 0 ? (
              <ul className="mt-2 space-y-1 text-[11px]">
                {alerts.map((a, idx) => (
                  <li key={`${a.kind}-${idx}`}>
                    <span className="font-bold">[{ALERT_KIND_META[a.kind].label}]</span>{' '}
                    {a.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        )
      })}

      {journal.length > 0 ? (
        <section className="mt-5 break-inside-avoid">
          <h2 className="text-base font-bold">Derniers contrôles</h2>
          <ul className="mt-2 space-y-1 text-[11px]">
            {journal.slice(0, 5).map((e) => (
              <li key={e.id}>
                {new Date(e.at).toLocaleString('fr-FR')} — {e.profileName} :{' '}
                {e.interactions} interaction(s)
                {e.maxSeverity ? ` (${e.maxSeverity})` : ''}
                {e.pregnancyAlerts > 0 ? `, ${e.pregnancyAlerts} alerte(s) grossesse` : ''}
                {e.cabinetAlerts > 0 ? `, ${e.cabinetAlerts} alerte(s) armoire` : ''}.
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mt-6 border-t border-black/30 pt-2 text-[10px] leading-relaxed">
        Aide à l’organisation domestique — ne remplace ni l’avis du pharmacien, ni l’ordonnance,
        ni la notice. Sources : nomenclature algérienne (Juin 2026) · liste des prix PPA (Août
        2026). Document généré localement — aucune donnée de santé transmise.
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Écran de verrouillage PIN (verrou de confort — audit 3.6)           */
/* ------------------------------------------------------------------ */

function PinLockScreen({
  onUnlock,
  onRequestWipe,
}: {
  onUnlock: () => void
  onRequestWipe: () => void
}) {
  const [pin, setPin] = useState('')
  const [attempts, setAttempts] = useState(0)
  const fid = useId()

  function tryUnlock() {
    if (pin.length !== 4) return
    let stored: string | null = null
    try {
      stored = localStorage.getItem(PIN_KEY)
    } catch {
      /* stockage indisponible */
    }
    if (stored !== null && pin === stored) {
      onUnlock()
      return
    }
    setAttempts((a) => a + 1)
    setPin('')
  }

  const exhausted = attempts >= 3

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-10 print:hidden">
      <Card className="w-full">
        <CardHeader className="pb-3 text-center">
          <span
            className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"
            aria-hidden
          >
            <Lock className="size-6" />
          </span>
          <h1 className="mt-2 text-lg font-semibold text-foreground">Armoire verrouillée</h1>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Saisissez le code à 4 chiffres pour accéder à l’armoire familiale de cet appareil.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor={`${fid}-pin`}>Code à 4 chiffres</Label>
            <Input
              id={`${fid}-pin`}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') tryUnlock()
              }}
              className="h-11 text-center text-lg tracking-[0.4em]"
              autoFocus
              aria-invalid={attempts > 0}
            />
          </div>
          {attempts > 0 ? (
            <p role="alert" className="text-center text-xs font-medium text-state-danger">
              Code incorrect — tentative {Math.min(attempts, 3)}/3.
            </p>
          ) : null}
          <Button onClick={tryUnlock} disabled={pin.length !== 4} className="w-full">
            Déverrouiller
          </Button>
          {exhausted ? (
            <button
              type="button"
              onClick={onRequestWipe}
              className="w-full rounded-lg border border-state-danger/40 bg-state-danger/5 px-3 py-2.5 text-xs font-medium text-state-danger transition-colors hover:bg-state-danger/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Réinitialiser l’armoire (efface tout)
            </button>
          ) : null}
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            Verrou de confort local — ne remplace pas une sécurité forte.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Trousse de secours — checklist domestique hors médicaments (4.1)    */
/* ------------------------------------------------------------------ */

function FirstAidCard({
  checked,
  onToggle,
}: {
  checked: string[]
  onToggle: (id: string) => void
}) {
  const fid = useId()
  const total = FIRST_AID_ITEMS.length
  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="flex flex-wrap items-center justify-between gap-2 text-base font-semibold text-foreground">
          <span className="flex items-center gap-2">
            <BriefcaseMedical className="size-5 text-primary" aria-hidden />
            Trousse de secours
          </span>
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">
            {checked.length}/{total}
          </span>
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Liste de contrôle des premiers secours pour la maison — objets domestiques, hors
          médicaments.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress
          value={Math.round((checked.length / total) * 100)}
          aria-label={`${checked.length} article(s) sur ${total} présents dans la trousse de secours`}
        />
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {FIRST_AID_ITEMS.map((item) => (
            <li key={item.id}>
              <div
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors',
                  checked.includes(item.id)
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border bg-muted/30 hover:bg-muted/60'
                )}
              >
                <Checkbox
                  id={`${fid}-fa-${item.id}`}
                  checked={checked.includes(item.id)}
                  onCheckedChange={() => onToggle(item.id)}
                  aria-label={item.label}
                />
                <Label
                  htmlFor={`${fid}-fa-${item.id}`}
                  className="cursor-pointer text-xs leading-snug font-medium text-foreground"
                >
                  {item.label}
                </Label>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Liste indicative à adapter — suivez les recommandations officielles (Ministère de la
          Santé). DzPharm ne vend ni ne recommande de marques.
        </p>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Carte « Confidentialité & données » (audit 3.6)                     */
/* ------------------------------------------------------------------ */

function ConfidentialityCard({
  pinEnabled,
  onEnablePin,
  onDisablePin,
  onExport,
  onWipe,
}: {
  pinEnabled: boolean
  onEnablePin: (pin: string) => void
  onDisablePin: () => void
  onExport: () => void
  onWipe: () => void
}) {
  const [pinMode, setPinMode] = useState<'none' | 'edit'>('none')
  const [pinDraft, setPinDraft] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const fid = useId()

  function savePin() {
    if (!/^\d{4}$/.test(pinDraft)) {
      setPinError('Le code doit contenir exactement 4 chiffres.')
      return
    }
    setPinError(null)
    onEnablePin(pinDraft)
    setPinMode('none')
    setPinDraft('')
  }

  function startEdit() {
    setPinMode('edit')
    setPinDraft('')
    setPinError(null)
  }

  function cancelEdit() {
    setPinMode('none')
    setPinDraft('')
    setPinError(null)
  }

  return (
    <Collapsible>
      <Card className="overflow-hidden">
        <CollapsibleTrigger
          className="group flex w-full items-center justify-between gap-3 p-4 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label="Réglages de confidentialité de l’armoire"
        >
          <span className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Lock className="size-5 text-primary" aria-hidden />
            Confidentialité &amp; données
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 border-t border-border p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Les profils, médicaments et péremptions de l’armoire sont enregistrés uniquement
              dans le stockage local de ce navigateur (localStorage) — jamais sur un serveur. Les
              données de santé sont des données sensibles (esprit de la loi algérienne n° 18-07
              relative à la protection des données à caractère personnel) : DzPharm les garde sur
              votre appareil, avec export et effacement complets à tout moment.
            </p>

            {/* Code PIN */}
            <div className="space-y-2.5 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <Label
                  htmlFor={`${fid}-pin-switch`}
                  className="flex cursor-pointer items-center gap-1.5 text-sm font-medium"
                >
                  <KeyRound className="size-4 text-primary" aria-hidden />
                  Verrouiller l’armoire par code (PIN)
                </Label>
                <Switch
                  id={`${fid}-pin-switch`}
                  checked={pinEnabled}
                  onCheckedChange={(v) => {
                    if (v) {
                      startEdit()
                    } else {
                      cancelEdit()
                      onDisablePin()
                    }
                  }}
                  aria-label="Activer le verrouillage par code PIN"
                />
              </div>

              {pinMode === 'edit' ? (
                <div className="grid gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="password"
                      inputMode="numeric"
                      autoComplete="new-password"
                      maxLength={4}
                      value={pinDraft}
                      onChange={(e) => {
                        setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 4))
                        setPinError(null)
                      }}
                      placeholder={pinEnabled ? 'Nouveau code à 4 chiffres' : 'Code à 4 chiffres'}
                      aria-label="Code PIN à 4 chiffres"
                      className="h-9 w-36 tracking-[0.3em]"
                    />
                    <Button size="sm" onClick={savePin} disabled={pinDraft.length !== 4}>
                      {pinEnabled ? 'Mettre à jour' : 'Enregistrer le code'}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={cancelEdit}>
                      Annuler
                    </Button>
                  </div>
                  {pinError ? (
                    <p role="alert" className="text-xs font-medium text-state-danger">
                      {pinError}
                    </p>
                  ) : null}
                </div>
              ) : pinEnabled ? (
                <button
                  type="button"
                  onClick={startEdit}
                  className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  Modifier le code
                </button>
              ) : null}

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Verrou de confort local — ne remplace pas une sécurité forte (code stocké en clair
                sur cet appareil).
              </p>
            </div>

            {/* Export & effacement */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
                <Download className="size-3.5" aria-hidden />
                Exporter les données (JSON)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onWipe}
                className="gap-1.5 border-state-danger/40 text-state-danger hover:bg-state-danger/10 hover:text-state-danger"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Tout effacer
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
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
  const journal = useDzPharm((s) => s.armoireJournal)
  const addJournalEntry = useDzPharm((s) => s.addArmoireJournalEntry)
  const clearJournal = useDzPharm((s) => s.clearArmoireJournal)
  const setView = useDzPharm((s) => s.setView)

  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ArmoireProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ArmoireProfile | null>(null)
  const [clearTarget, setClearTarget] = useState<ArmoireProfile | null>(null)

  /* ------------- Confidentialité (audit 3.6 / 4.1) --------------- */

  /** Verrou PIN : « checking » pendant l'hydratation, « locked » si un code est défini. */
  const [gate, setGate] = useState<'checking' | 'locked' | 'open'>('checking')
  const [consentOpen, setConsentOpen] = useState(false)
  const [consentAt, setConsentAt] = useState<string | null>(null)
  const [pinEnabled, setPinEnabled] = useState(false)
  const [firstAidChecked, setFirstAidChecked] = useState<string[]>([])
  const [wipeConfirmOpen, setWipeConfirmOpen] = useState(false)

  // Hydratation locale (uniquement côté client — aucune lecture pendant le SSR) :
  // consentement première utilisation, code PIN éventuel, trousse de secours.
  useEffect(() => {
    try {
      const consent = localStorage.getItem(CONSENT_KEY)
      setConsentAt(consent)
      if (!consent) setConsentOpen(true)
      const hasPin = localStorage.getItem(PIN_KEY) !== null
      setPinEnabled(hasPin)
      setFirstAidChecked(readFirstAidChecked())
      setGate(hasPin ? 'locked' : 'open')
    } catch {
      setGate('open')
    }
  }, [])

  const seasonal = useMemo(() => getSeasonalTips(new Date()), [])

  const active = useMemo(
    () => profiles.find((p) => p.id === activeId) ?? profiles[0] ?? null,
    [profiles, activeId]
  )
  const items = useMemo(
    () => (active ? (itemsMap[active.id] ?? []) : []),
    [itemsMap, active]
  )
  const alerts = useMemo(() => computeCabinetAlerts(items), [items])
  const pediMatches = useMemo(
    () =>
      active && active.relation !== 'adulte' && active.weightKg != null && items.length > 0
        ? matchPediatricItems(items, active.weightKg, active.ageYears)
        : [],
    [active, items]
  )

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
      const pregAlerts = buildPregnancyAlerts(preg, active)
      setAnalysisState({
        key: analysisKey,
        result: inter,
        pregnancyAlerts: pregAlerts,
        error: false,
      })
      // Journal des contrôles (local, 20 dernières entrées)
      const pairs = inter?.pairs ?? []
      const maxSeverity =
        pairs.length > 0
          ? SEVERITY_ORDER.slice().reverse().find((sev) => pairs.some((p) => p.severity === sev)) ?? null
          : null
      addJournalEntry({
        profileId: active.id,
        profileName: active.name,
        itemsCount: items.length,
        interactions: pairs.length,
        maxSeverity,
        pregnancyAlerts: pregAlerts.length,
        cabinetAlerts: alerts.length,
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

  /* ------------- Confidentialité : actions (audit 3.6) ------------- */

  function acceptConsent() {
    const iso = new Date().toISOString()
    try {
      localStorage.setItem(CONSENT_KEY, iso)
    } catch {
      /* stockage indisponible — le consentement sera redemandé */
    }
    setConsentAt(iso)
    setConsentOpen(false)
  }

  function toggleFirstAid(id: string) {
    const next = firstAidChecked.includes(id)
      ? firstAidChecked.filter((x) => x !== id)
      : [...firstAidChecked, id]
    try {
      localStorage.setItem(FIRST_AID_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
    setFirstAidChecked(next)
  }

  function enablePin(pin: string) {
    try {
      localStorage.setItem(PIN_KEY, pin)
    } catch {
      /* ignore */
    }
    setPinEnabled(true)
    toast({
      title: 'Code PIN activé',
      description: 'Il sera demandé à chaque ouverture de l’armoire sur cet appareil.',
    })
  }

  function disablePin() {
    try {
      localStorage.removeItem(PIN_KEY)
    } catch {
      /* ignore */
    }
    setPinEnabled(false)
    toast({ title: 'Code PIN désactivé', description: 'L’armoire s’ouvre désormais sans code.' })
  }

  /** Export JSON complet des données locales de l'armoire (droit d'accès). */
  function exportArmoireData() {
    try {
      const payload = {
        format: 'dzpharm-armoire-export-v1',
        app: 'DzPharm',
        exportedAt: new Date().toISOString(),
        armoire: readStoredArmoire(),
        trousseSecours: { key: FIRST_AID_KEY, checked: firstAidChecked },
        confidentialite: {
          consentementAccepteLe: consentAt,
          pinActif: pinEnabled,
          note: 'Le code PIN n’est volontairement pas inclus dans l’export.',
        },
        note: 'Données enregistrées uniquement sur cet appareil (localStorage) — aucun envoi en ligne.',
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dzpharm-armoire-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({
        title: 'Export JSON généré',
        description: 'Toutes les données locales de l’armoire ont été téléchargées.',
      })
    } catch {
      toast({
        title: 'Échec de l’export',
        description: 'Une erreur est survenue lors de la génération du fichier JSON.',
        variant: 'destructive',
      })
    }
  }

  /** Effacement définitif de toutes les données locales de l'armoire (droit d'effacement). */
  function wipeArmoire() {
    setWipeConfirmOpen(false)
    try {
      // 1. Bloc armoire du store persisté via ses actions publiques —
      //    favoris, historique et panier Chifa des autres vues sont préservés.
      for (const p of profiles) deleteProfile(p.id)
      clearJournal()
      // 2. Clés locales propres à l'armoire (PIN, trousse, consentement).
      localStorage.removeItem(PIN_KEY)
      localStorage.removeItem(FIRST_AID_KEY)
      localStorage.removeItem(CONSENT_KEY)
    } catch {
      /* ignore */
    }
    window.location.reload()
  }

  /* --------------------------- Rendu ------------------------------- */

  if (gate === 'checking') return null

  return (
    <div className="pb-10">
      {gate === 'locked' ? (
        <PinLockScreen
          onUnlock={() => setGate('open')}
          onRequestWipe={() => setWipeConfirmOpen(true)}
        />
      ) : (
        <>
      {/* En-tête */}
      <section aria-labelledby="armoire-title" className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 print:hidden">
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              disabled={profiles.length === 0}
              className="gap-1.5"
            >
              <Printer className="size-3.5" aria-hidden />
              Exporter (PDF)
            </Button>
            <Badge
              variant="outline"
              className="gap-1.5 border-primary/25 bg-primary/5 text-primary"
            >
              <Lock className="size-3" aria-hidden />
              Données stockées dans votre navigateur
            </Badge>
          </div>
        </div>
      </section>

      {/* Barre des profils */}
      <section
        aria-label="Profils de la famille"
        className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 print:hidden"
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
      <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 print:hidden">
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
                            onSeePrice={() => {
                              // Restock (plan 3.4.14) : ouvre le Catalogue & prix,
                              // avec la fiche du produit (PPA + équivalents génériques)
                              // affichée par-dessus — recherche inutile.
                              setView('catalogue')
                              openDrug(item.drugId)
                            }}
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

                {/* Note enfant → calculateur pédiatrique (si poids non saisi) */}
                {active.relation !== 'adulte' && items.length > 0 && pediMatches.length === 0 ? (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="flex items-start gap-3 py-4">
                      <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                      <p className="text-xs leading-relaxed text-foreground/90">
                        <strong className="text-foreground">Profil {active.relation === 'bebe' ? 'bébé' : 'enfant'} :</strong>{' '}
                        {active.weightKg == null
                          ? 'saisissez le poids dans le profil pour calculer automatiquement les posologies mg/kg des médicaments de cette armoire.'
                          : 'aucun médicament de cette armoire ne figure au référentiel pédiatrique (15 molécules).'}{' '}
                        Le calculateur de posologies pédiatriques (Outils cliniques) reste
                        disponible pour toutes les molécules.
                      </p>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Posologies pédiatriques adaptées au poids du profil */}
                {pediMatches.length > 0 ? (
                  <PediatricDoseCard
                    matches={pediMatches}
                    profile={active}
                    onOpenTools={() => setView('outils')}
                  />
                ) : null}

                {/* Rappels saisonniers */}
                {seasonal.tips.length > 0 ? (
                  <Card className="border-chifa/30 bg-chifa/5">
                    <CardHeader className="pb-3">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Sun className="size-4 text-chifa" aria-hidden />
                        Rappels saisonniers — {seasonal.season}
                      </h2>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1.5">
                        {seasonal.tips.map((t, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-chifa" aria-hidden />
                            {t}
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-8 gap-1.5 px-2 text-xs text-chifa"
                        onClick={() => setView('outils')}
                      >
                        Adaptateur Ramadan & outils
                      </Button>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Journal des contrôles */}
                <ArmoireJournalCard journal={journal} onClear={clearJournal} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trousse de secours & confidentialité (audit 3.6 / 4.1) — niveau foyer */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <FirstAidCard checked={firstAidChecked} onToggle={toggleFirstAid} />
          <ConfidentialityCard
            pinEnabled={pinEnabled}
            onEnablePin={enablePin}
            onDisablePin={disablePin}
            onExport={exportArmoireData}
            onWipe={() => setWipeConfirmOpen(true)}
          />
        </div>
      </section>

      {/* Résumé imprimable (visible uniquement à l'impression) */}
      <ArmoirePrintSummary profiles={profiles} itemsMap={itemsMap} journal={journal} />

      {/* Pied de vue */}
      <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 print:hidden">
        <p className="rounded-xl border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
          L’armoire familiale est une aide à l’organisation domestique : elle ne remplace ni
          l’avis d’un pharmacien, ni une ordonnance, ni la lecture de la notice. En cas de doute
          (interaction, grossesse, enfant), consultez toujours votre pharmacien. Les données de
          l’armoire ne quittent jamais votre navigateur ; seuls les noms de médicaments sont
          transmis lors d’une analyse.
        </p>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[11px] leading-relaxed text-muted-foreground">
          {consentAt ? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 shrink-0 text-state-safe" aria-hidden />
              Consentement enregistré le {formatConsentDate(consentAt)}
            </span>
          ) : null}
          <span>Aucune donnée de santé n’est utilisée à des fins d’analyse ou de publicité.</span>
        </p>
      </div>
        </>
      )}

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

      {/* Effacement complet des données locales (audit 3.6 — droit d'effacement) */}
      <AlertDialog open={wipeConfirmOpen} onOpenChange={setWipeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser l’armoire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les profils, médicaments, péremptions, le journal des contrôles, la trousse de
              secours et le code PIN seront définitivement effacés de cet appareil. Cette action est
              irréversible — pensez à exporter vos données avant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-state-danger text-white hover:bg-state-danger/90"
              onClick={wipeArmoire}
            >
              Tout effacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Consentement première utilisation (audit 3.6) */}
      <Dialog open={consentOpen && gate !== 'locked'} onOpenChange={setConsentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="size-5 text-primary" aria-hidden />
              Confidentialité de l’armoire familiale
            </DialogTitle>
            <DialogDescription>
              Avant d’utiliser l’armoire, prenez connaissance du traitement de vos données.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2.5 text-sm leading-relaxed text-foreground/90">
            {[
              'Les données de l’armoire (profils, médicaments, péremptions) sont enregistrées uniquement sur cet appareil, dans le stockage local de votre navigateur (localStorage).',
              'Aucune donnée nominative n’est envoyée en ligne : seuls les noms de médicaments sont transmis au moteur lors d’une analyse d’interactions.',
              'Aucune analyse d’audience ni publicité liée à vos médicaments.',
              'Les données de santé sont des données sensibles (esprit de la loi algérienne n° 18-07 relative à la protection des données à caractère personnel) : c’est pourquoi tout reste sur votre appareil, avec export et effacement possibles à tout moment.',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-state-safe" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button onClick={acceptConsent}>J’ai compris et j’accepte</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Ligne médicament                                                    */
/* ------------------------------------------------------------------ */

function ItemRow({
  item,
  onOpenSheet,
  onSeePrice,
  onUpdate,
  onRemove,
}: {
  item: ArmoireItem
  onOpenSheet: () => void
  /** Ouvre le Catalogue & prix avec la fiche produit (restock — plan 3.4.14). */
  onSeePrice: () => void
  onUpdate: (patch: Partial<Pick<ArmoireItem, 'quantity' | 'expiry'>>) => void
  onRemove: () => void
}) {
  const d = daysUntil(item.expiry)
  const expired = d !== null && d < 0
  const urgent = d !== null && d >= 0 && d <= 7
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
        expired || urgent
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
            ) : urgent ? (
              <Badge
                variant="outline"
                className="shrink-0 border-state-danger/40 bg-state-danger/10 px-1.5 text-[10px] text-state-danger"
              >
                {d === 0 ? 'Expire aujourd’hui' : `Expire dans ${d} j`}
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
        {/* Restock (plan 3.4.14) : visible sur les lignes expirées / péremption proche */}
        {expired || urgent || expiringSoon ? (
          <button
            type="button"
            onClick={onSeePrice}
            aria-label={`Voir les prix et génériques de ${item.brand} dans le catalogue`}
            className="flex items-center gap-1 text-[11px] font-medium text-chifa underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Coins className="size-3.5" aria-hidden />
            Voir prix &amp; génériques
          </button>
        ) : null}
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
