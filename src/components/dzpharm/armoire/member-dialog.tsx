'use client'

/**
 * Armoire — dialogue de création/édition d'un membre du foyer.
 *
 * Phase 1 du plan d'amélioration :
 * - Sexe (Homme/Femme, optionnel) — masque Grossesse/Allaitement pour les
 *   membres masculins IMMÉDIATEMENT sans rechargement, sans détruire les
 *   données déjà saisies.
 * - Taille (cm, optionnel 30-250)
 * - Maladies / antécédents (multi-select domaines DzPharm + texte libre)
 *   visually distinct de Allergies (warning-colored)
 * - Notes par membre (max 1000 chars)
 *
 * Comportement héritage : membres existants sans `sexe` → affichent les
 * champs Grossesse/Allaitement par défaut (safe direction).
 */

import { useState } from 'react'
import { Activity, Baby, HeartPulse, Lock, Plus, Ruler, Stethoscope, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { ArmoireMember, ArmoireMemberInput, ArmoireRelation, ArmoireSexe } from './types'
import {
  ALLERGY_PRESETS,
  MALADIES_PRESETS,
  MAX_ALLERGIES,
  MAX_MALADIES,
  MAX_MEMBER_NOTES_CHARS,
  MEMBER_COLORS,
  RELATION_META,
  SEXE_META,
} from './constants'

export interface MemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ArmoireMember | null
  onSubmit: (input: ArmoireMemberInput) => void
  onDelete?: (m: ArmoireMember) => void
}

const RELATIONS: ArmoireRelation[] = ['adulte', 'enfant', 'bebe']
const SEXES: ArmoireSexe[] = ['homme', 'femme']

/** Poids saisi « 62,5 » → 62.5 (null si vide, NaN si invalide). */
function parseWeight(raw: string): number | null | typeof NaN {
  const t = raw.trim()
  if (!t) return null
  return Number(t.replace(',', '.'))
}

/** Taille saisie → number | null | NaN */
function parseTaille(raw: string): number | null | typeof NaN {
  const t = raw.trim()
  if (!t) return null
  return Number(t.replace(',', '.'))
}

/* ------------------------------------------------------------------ */
/* Formulaire (remonté à chaque ouverture du dialogue)                 */
/* ------------------------------------------------------------------ */

interface MemberFormProps {
  editing: ArmoireMember | null
  onOpenChange: (open: boolean) => void
  onSubmit: (input: ArmoireMemberInput) => void
  onDelete?: (m: ArmoireMember) => void
}

function MemberDialogForm({ editing, onOpenChange, onSubmit, onDelete }: MemberFormProps) {
  const [name, setName] = useState(() => editing?.name ?? '')
  const [relation, setRelation] = useState<ArmoireRelation>(() => editing?.relation ?? 'adulte')
  // sexe is optional; undefined = unset (legacy members default to showing pregnancy fields)
  const [sexe, setSexe] = useState<ArmoireSexe | undefined>(() => editing?.sexe)
  const [age, setAge] = useState(() => (editing ? String(editing.ageYears) : '30'))
  const [weight, setWeight] = useState(() =>
    editing?.weightKg != null ? String(editing.weightKg).replace('.', ',') : ''
  )
  const [taille, setTaille] = useState(() =>
    editing?.taille_cm != null ? String(editing.taille_cm) : ''
  )
  const [color, setColor] = useState(() => editing?.color ?? MEMBER_COLORS[0].id)
  // Keep pregnancy/breastfeeding data even when sexe=homme (hide-don't-delete rule)
  const [pregnant, setPregnant] = useState(() => editing?.pregnant ?? false)
  const [breastfeeding, setBreastfeeding] = useState(() => editing?.breastfeeding ?? false)
  const [renal, setRenal] = useState(() => editing?.renal ?? false)
  const [allergies, setAllergies] = useState<string[]>(() => editing?.allergies ?? [])
  const [allergyInput, setAllergyInput] = useState('')
  const [maladies, setMaladies] = useState<string[]>(() => editing?.maladies ?? [])
  const [maladieInput, setMaladieInput] = useState('')
  const [memberNotes, setMemberNotes] = useState(() => editing?.memberNotes ?? '')
  const [restricted, setRestricted] = useState(() => editing?.restricted ?? false)

  // Validation errors
  const [nameError, setNameError] = useState('')
  const [ageError, setAgeError] = useState('')
  const [weightError, setWeightError] = useState('')
  const [tailleError, setTailleError] = useState('')

  const isAdult = relation === 'adulte'
  // Show Grossesse/Allaitement when:
  //   - sexe is unset (legacy default = show)
  //   - sexe is 'femme'
  //   - relation is 'adulte' (non-adults never needed them)
  const showPregnancyFields = isAdult && sexe !== 'homme'

  function switchRelation(next: string) {
    const r = next as ArmoireRelation
    setRelation(r)
    if (r !== 'adulte') {
      // Don't destroy data; the submit() will clear the flags for non-adults
    }
  }

  function addAllergy(value: string) {
    const t = value.trim()
    if (!t) return
    setAllergyInput('')
    if (allergies.length >= MAX_ALLERGIES) return
    if (allergies.some((a) => a.toLowerCase() === t.toLowerCase())) return
    setAllergies((prev) => [...prev, t.slice(0, 40)])
  }

  function toggleAllergy(preset: string) {
    if (allergies.includes(preset)) {
      setAllergies((prev) => prev.filter((a) => a !== preset))
    } else if (allergies.length < MAX_ALLERGIES) {
      setAllergies((prev) => [...prev, preset])
    }
  }

  function addMaladie(value: string) {
    const t = value.trim()
    if (!t) return
    setMaladieInput('')
    if (maladies.length >= MAX_MALADIES) return
    if (maladies.some((m) => m.toLowerCase() === t.toLowerCase())) return
    setMaladies((prev) => [...prev, t.slice(0, 60)])
  }

  function toggleMaladie(preset: string) {
    if (maladies.includes(preset)) {
      setMaladies((prev) => prev.filter((m) => m !== preset))
    } else if (maladies.length < MAX_MALADIES) {
      setMaladies((prev) => [...prev, preset])
    }
  }

  function submit() {
    const nameTrim = name.trim()
    setNameError('')
    setAgeError('')
    setWeightError('')
    setTailleError('')

    let valid = true
    if (!nameTrim) {
      setNameError('Le nom est requis.')
      valid = false
    }

    const ageNum = Number(age.trim())
    if (!Number.isFinite(ageNum) || !Number.isInteger(ageNum) || ageNum < 0 || ageNum > 120) {
      setAgeError('Âge invalide — entier entre 0 et 120 ans.')
      valid = false
    }

    const weightNum = parseWeight(weight)
    let weightKg: number | null = null
    if (weightNum != null) {
      if (Number.isNaN(weightNum) || weightNum < 0.5 || weightNum > 200) {
        setWeightError('Poids invalide — entre 0,5 et 200 kg (ou laissez vide).')
        valid = false
      } else {
        weightKg = Math.round(weightNum * 10) / 10
      }
    }

    const tailleNum = parseTaille(taille)
    let taille_cm: number | null = null
    if (tailleNum != null) {
      if (Number.isNaN(tailleNum) || tailleNum < 30 || tailleNum > 250) {
        setTailleError('Taille invalide — entre 30 et 250 cm (ou laissez vide).')
        valid = false
      } else {
        taille_cm = Math.round(tailleNum)
      }
    }

    if (!valid) return

    // Hide-but-preserve rule: Grossesse/Allaitement data kept for homme members
    const effectivePregnant = isAdult && showPregnancyFields ? pregnant : (editing?.pregnant ?? false)
    const effectiveBreastfeeding = isAdult && showPregnancyFields ? breastfeeding : (editing?.breastfeeding ?? false)

    onSubmit({
      name: nameTrim.slice(0, 40),
      relation,
      sexe,
      ageYears: ageNum,
      weightKg,
      taille_cm,
      color,
      pregnant: effectivePregnant,
      breastfeeding: effectiveBreastfeeding,
      renal,
      allergies: allergies.slice(0, MAX_ALLERGIES),
      maladies: maladies.slice(0, MAX_MALADIES),
      memberNotes: memberNotes.slice(0, MAX_MEMBER_NOTES_CHARS),
      restricted,
    })
  }

  return (
    <>
      <div className="space-y-4">
        {/* ── Identité ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="member-name">
              Nom ou surnom <span className="text-state-danger">*</span>
            </Label>
            <Input
              id="member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoFocus
              aria-required="true"
              aria-invalid={nameError ? true : undefined}
              placeholder="Ex. : Amine, Mama Khadidja…"
              className="h-11"
            />
            {nameError ? (
              <p role="alert" className="text-xs text-state-danger">
                {nameError}
              </p>
            ) : null}
          </div>

          {/* Relation */}
          <div className="space-y-2 sm:col-span-2">
            <Label>Relation au foyer</Label>
            <RadioGroup
              value={relation}
              onValueChange={switchRelation}
              className="grid grid-cols-3 gap-2"
            >
              {RELATIONS.map((r) => {
                const meta = RELATION_META[r]
                const Icon = meta.icon
                return (
                  <Label
                    key={r}
                    htmlFor={`relation-${r}`}
                    className="flex min-h-11 cursor-pointer flex-col items-center gap-1 rounded-lg border border-border bg-muted/30 px-2 py-2.5 text-center transition-colors has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/10"
                  >
                    <RadioGroupItem value={r} id={`relation-${r}`} className="sr-only" />
                    <Icon className="size-4 text-primary" aria-hidden />
                    <span className="text-xs font-medium text-foreground">{meta.label}</span>
                    <span className="text-[10px] leading-tight text-muted-foreground">
                      {meta.hint}
                    </span>
                  </Label>
                )
              })}
            </RadioGroup>
          </div>

          {/* Sexe (plan 2.1) */}
          <div className="space-y-2 sm:col-span-2">
            <Label>Sexe <span className="text-xs font-normal text-muted-foreground">(optionnel)</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {SEXES.map((s) => {
                const meta = SEXE_META[s]
                const Icon = meta.icon
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={sexe === s}
                    onClick={() => setSexe(sexe === s ? undefined : s)}
                    className={cn(
                      'flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                      sexe === s
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span>{meta.label}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Conditionne l&apos;affichage des champs Grossesse/Allaitement. Non obligatoire.
            </p>
          </div>

          {/* Âge */}
          <div className="space-y-2">
            <Label htmlFor="member-age">
              Âge (années) <span className="text-state-danger">*</span>
            </Label>
            <Input
              id="member-age"
              type="number"
              inputMode="numeric"
              min={0}
              max={120}
              step={1}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              aria-required="true"
              aria-invalid={ageError ? true : undefined}
              className="h-11"
            />
            {ageError ? (
              <p role="alert" className="text-xs text-state-danger">
                {ageError}
              </p>
            ) : null}
          </div>

          {/* Poids */}
          <div className="space-y-2">
            <Label htmlFor="member-weight">Poids (kg, optionnel)</Label>
            <Input
              id="member-weight"
              inputMode="decimal"
              placeholder="Ex. : 62,5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              aria-invalid={weightError ? true : undefined}
              className="h-11"
            />
            {weightError ? (
              <p role="alert" className="text-xs text-state-danger">
                {weightError}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Pour les calculs pédiatriques et rénaux.
              </p>
            )}
          </div>

          {/* Taille (plan 2.2) */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="member-taille">
              <span className="flex items-center gap-1.5">
                <Ruler className="size-3.5 text-muted-foreground" aria-hidden />
                Taille (cm, optionnel)
              </span>
            </Label>
            <Input
              id="member-taille"
              type="number"
              inputMode="numeric"
              min={30}
              max={250}
              step={1}
              placeholder="Ex. : 170"
              value={taille}
              onChange={(e) => setTaille(e.target.value)}
              aria-invalid={tailleError ? true : undefined}
              className="h-11"
            />
            {tailleError ? (
              <p role="alert" className="text-xs text-state-danger">
                {tailleError}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Utilisée avec le poids pour les calculateurs (posologie / fonction rénale).
              </p>
            )}
          </div>
        </div>

        {/* ── Couleur d'avatar ── */}
        <div className="space-y-2">
          <Label>Couleur d&apos;avatar</Label>
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Couleur d'avatar">
            {MEMBER_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={color === c.id}
                title={`Couleur ${c.id}`}
                onClick={() => setColor(c.id)}
                className={cn(
                  'size-8 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                  c.dot,
                  color === c.id
                    ? 'scale-110 ring-2 ring-ring ring-offset-2 ring-offset-background'
                    : 'opacity-70 hover:scale-105 hover:opacity-100'
                )}
              >
                <span className="sr-only">Couleur {c.id}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Drapeaux cliniques ── */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Drapeaux cliniques
          </p>

          {/* Grossesse / Allaitement — visibles seulement si sexe ≠ homme (plan 2.1) */}
          {showPregnancyFields ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <label
                htmlFor="member-pregnant"
                className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <HeartPulse className="size-4 shrink-0 text-primary" aria-hidden />
                    Grossesse
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                    Contrôle CRAT sur les médicaments de ce membre.
                  </span>
                </span>
                <Switch
                  id="member-pregnant"
                  checked={pregnant}
                  onCheckedChange={(v) => {
                    setPregnant(v)
                    if (v) setBreastfeeding(false)
                  }}
                  aria-label="Grossesse"
                />
              </label>
              <label
                htmlFor="member-breastfeeding"
                className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Baby className="size-4 shrink-0 text-primary" aria-hidden />
                    Allaitement
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                    Contrôle CRAT (volet allaitement) sur ses médicaments.
                  </span>
                </span>
                <Switch
                  id="member-breastfeeding"
                  checked={breastfeeding}
                  onCheckedChange={(v) => {
                    setBreastfeeding(v)
                    if (v) setPregnant(false)
                  }}
                  aria-label="Allaitement"
                />
              </label>
            </div>
          ) : sexe === 'homme' ? (
            <p className="text-[11px] text-muted-foreground rounded-lg border border-border bg-muted/20 px-3 py-2">
              Grossesse / Allaitement masqués pour ce membre (sexe : Homme).
              Les données précédemment enregistrées sont préservées.
            </p>
          ) : null}

          {/* Fonction rénale */}
          <label
            htmlFor="member-renal"
            className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
          >
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Activity className="size-4 shrink-0 text-primary" aria-hidden />
                Fonction rénale à surveiller
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                L&apos;Analyse rappellera de vérifier l&apos;adaptation des posologies.
              </span>
            </span>
            <Switch
              id="member-renal"
              checked={renal}
              onCheckedChange={setRenal}
              aria-label="Fonction rénale à surveiller"
            />
          </label>
        </div>

        {/* ── Allergies (warning-colored) ── */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label className="text-state-danger">
              ⚠ Allergies connues
            </Label>
            <p aria-live="polite" className="text-[11px] tabular-nums text-muted-foreground">
              {allergies.length}/{MAX_ALLERGIES}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGY_PRESETS.map((preset) => {
              const active = allergies.includes(preset)
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleAllergy(preset)}
                  className={cn(
                    'inline-flex min-h-9 items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'border-state-danger/40 bg-state-danger/10 text-state-danger'
                      : 'border-border bg-muted/40 text-muted-foreground hover:border-state-danger/40 hover:text-foreground'
                  )}
                >
                  {preset}
                </button>
              )
            })}
          </div>
          {allergies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {allergies.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1 rounded-full border border-state-danger/30 bg-state-danger/10 py-0.5 pr-1 pl-2.5 text-xs text-state-danger"
                >
                  {a}
                  <button
                    type="button"
                    aria-label={`Retirer l'allergie ${a}`}
                    onClick={() => setAllergies((prev) => prev.filter((x) => x !== a))}
                    className="flex size-6 items-center justify-center rounded-full transition-colors hover:bg-state-danger/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex gap-2">
            <Input
              value={allergyInput}
              onChange={(e) => setAllergyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addAllergy(allergyInput)
                }
              }}
              placeholder="Autre allergie… (Entrée pour ajouter)"
              aria-label="Ajouter une autre allergie"
              className="h-11"
              maxLength={40}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 shrink-0"
              aria-label="Ajouter l'allergie saisie"
              disabled={allergies.length >= MAX_ALLERGIES || !allergyInput.trim()}
              onClick={() => addAllergy(allergyInput)}
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          </div>
        </div>

        {/* ── Maladies / antécédents (plan 2.3) — distinct des allergies ── */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label className="flex items-center gap-1.5">
              <Stethoscope className="size-3.5 text-primary" aria-hidden />
              Maladies / antécédents
            </Label>
            <p aria-live="polite" className="text-[11px] tabular-nums text-muted-foreground">
              {maladies.length}/{MAX_MALADIES}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MALADIES_PRESETS.map((preset) => {
              const active = maladies.includes(preset)
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleMaladie(preset)}
                  className={cn(
                    'inline-flex min-h-9 items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  )}
                >
                  {preset}
                </button>
              )
            })}
          </div>
          {maladies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {maladies.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-0.5 pr-1 pl-2.5 text-xs text-primary"
                >
                  {m}
                  <button
                    type="button"
                    aria-label={`Retirer ${m}`}
                    onClick={() => setMaladies((prev) => prev.filter((x) => x !== m))}
                    className="flex size-6 items-center justify-center rounded-full transition-colors hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex gap-2">
            <Input
              value={maladieInput}
              onChange={(e) => setMaladieInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addMaladie(maladieInput)
                }
              }}
              placeholder="Autre maladie… (Entrée pour ajouter)"
              aria-label="Ajouter une autre maladie"
              className="h-11"
              maxLength={60}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 shrink-0"
              aria-label="Ajouter la maladie saisie"
              disabled={maladies.length >= MAX_MALADIES || !maladieInput.trim()}
              onClick={() => addMaladie(maladieInput)}
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          </div>
        </div>

        {/* ── Notes par membre (plan 2.4) ── */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="member-notes">Notes / remarques</Label>
            <p aria-live="polite" className="text-[11px] tabular-nums text-muted-foreground">
              {memberNotes.length}/{MAX_MEMBER_NOTES_CHARS}
            </p>
          </div>
          <Textarea
            id="member-notes"
            value={memberNotes}
            onChange={(e) => setMemberNotes(e.target.value.slice(0, MAX_MEMBER_NOTES_CHARS))}
            placeholder="Notes générales sur ce membre (traitements en cours, remarques…)"
            className="min-h-20 resize-none"
            rows={3}
          />
        </div>

        {/* ── Visibilité restreinte ── */}
        <label
          htmlFor="member-restricted"
          className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Lock className="size-4 shrink-0 text-primary" aria-hidden />
              Visibilité restreinte
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
              Entrées masquées par défaut — nécessitent le code PIN de l&apos;armoire.
            </span>
            <span className="mt-1 block text-[11px] leading-snug text-muted-foreground/80">
              Effective uniquement si un PIN est défini (Réglages de l&apos;armoire).
            </span>
          </span>
          <Switch
            id="member-restricted"
            checked={restricted}
            onCheckedChange={setRestricted}
            aria-label="Visibilité restreinte"
          />
        </label>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Annuler
        </Button>
        <Button onClick={submit}>{editing ? 'Enregistrer' : 'Ajouter le membre'}</Button>
      </DialogFooter>

      {/* Zone destructive */}
      {editing && onDelete ? (
        <>
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-state-danger/30 bg-state-danger/5 p-3">
            <p className="max-w-[26ch] text-xs leading-snug text-muted-foreground sm:max-w-none">
              Zone sensible — les entrées resteront dans l&apos;inventaire (non assignées).
            </p>
            <Button
              type="button"
              variant="outline"
              className="border-state-danger/40 text-state-danger hover:bg-state-danger/10 hover:text-state-danger"
              onClick={() => onDelete(editing)}
            >
              <Trash2 className="size-4" aria-hidden />
              Supprimer ce membre
            </Button>
          </div>
        </>
      ) : null}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Dialogue (contenu démonté à la fermeture → état vierge à l'ouverture)*/
/* ------------------------------------------------------------------ */

export function MemberDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  onDelete,
}: MemberDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scroll-thin max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Modifier ${editing.name}` : 'Nouveau membre du foyer'}
          </DialogTitle>
          <DialogDescription>
            Les drapeaux cliniques alimentent automatiquement l&apos;Analyse et les outils
            dédiés (CRAT, fonction rénale). Aucune donnée ne quitte cet appareil.
          </DialogDescription>
        </DialogHeader>
        <MemberDialogForm
          editing={editing}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
          onDelete={onDelete}
        />
      </DialogContent>
    </Dialog>
  )
}
