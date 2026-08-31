'use client'

/**
 * Armoire — dialogue de création/édition d'un membre du foyer (plan 3.3).
 *
 * Champs : identité (nom, relation, âge, poids, couleur d'avatar), drapeaux
 * cliniques (grossesse/allaitement → CRAT, fonction rénale → outil dédié),
 * allergies connues et visibilité restreinte (verrou PIN de l'armoire).
 *
 * Le formulaire vit DANS le DialogContent : Radix démonte le contenu à la
 * fermeture, donc chaque ouverture repart d'un état vierce pré-rempli depuis
 * `editing` (le parent définit `editing` AVANT d'ouvrir) — aucun reset par
 * effet n'est nécessaire.
 *
 * Aucune donnée clinique n'est inventée ici : les drapeaux sont de simples
 * déclarations utilisateur qui alimentent les outils existants (Analyse,
 * CRAT, fonction rénale) — jamais de posologie ni de contre-indication
 * fabriquées.
 */

import { useState } from 'react'
import { Activity, Baby, HeartPulse, Lock, Plus, Trash2, X } from 'lucide-react'
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
import type { ArmoireMember, ArmoireMemberInput, ArmoireRelation } from './types'
import { ALLERGY_PRESETS, MAX_ALLERGIES, MEMBER_COLORS, RELATION_META } from './constants'

export interface MemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ArmoireMember | null
  onSubmit: (input: ArmoireMemberInput) => void
  onDelete?: (m: ArmoireMember) => void
}

const RELATIONS: ArmoireRelation[] = ['adulte', 'enfant', 'bebe']

/** Poids saisi « 62,5 » → 62.5 (null si vide, NaN si invalide). */
function parseWeight(raw: string): number | null | typeof NaN {
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
  const [age, setAge] = useState(() => (editing ? String(editing.ageYears) : '30'))
  const [weight, setWeight] = useState(() =>
    editing?.weightKg != null ? String(editing.weightKg).replace('.', ',') : ''
  )
  const [color, setColor] = useState(() => editing?.color ?? MEMBER_COLORS[0].id)
  const [pregnant, setPregnant] = useState(() => editing?.pregnant ?? false)
  const [breastfeeding, setBreastfeeding] = useState(() => editing?.breastfeeding ?? false)
  const [renal, setRenal] = useState(() => editing?.renal ?? false)
  const [allergies, setAllergies] = useState<string[]>(() => editing?.allergies ?? [])
  const [allergyInput, setAllergyInput] = useState('')
  const [restricted, setRestricted] = useState(() => editing?.restricted ?? false)
  const [nameError, setNameError] = useState('')
  const [ageError, setAgeError] = useState('')
  const [weightError, setWeightError] = useState('')

  const isAdult = relation === 'adulte'

  function switchRelation(next: string) {
    const r = next as ArmoireRelation
    setRelation(r)
    if (r !== 'adulte') {
      setPregnant(false)
      setBreastfeeding(false)
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

  function submit() {
    const nameTrim = name.trim()
    setNameError('')
    setAgeError('')
    setWeightError('')

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

    if (!valid) return

    onSubmit({
      name: nameTrim.slice(0, 40),
      relation,
      ageYears: ageNum,
      weightKg,
      color,
      pregnant: isAdult && pregnant,
      breastfeeding: isAdult && breastfeeding,
      renal,
      allergies: allergies.slice(0, MAX_ALLERGIES),
      restricted,
    })
  }

  return (
    <>
      <div className="space-y-4">
        {/* Identité */}
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
                Sert aux calculs pédiatriques (outil Posologies enfant).
              </p>
            )}
          </div>
        </div>

        {/* Couleur d'avatar */}
        <div className="space-y-2">
          <Label>Couleur d&apos;avatar</Label>
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Couleur d’avatar">
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

        {/* Drapeaux cliniques */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Drapeaux cliniques
          </p>

          {isAdult ? (
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
                    Le contrôle grossesse/allaitement (CRAT) sera appliqué à ses médicaments
                    dans l&apos;Analyse.
                  </span>
                </span>
                <Switch
                  id="member-pregnant"
                  checked={pregnant}
                  onCheckedChange={setPregnant}
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
                    Le contrôle grossesse/allaitement (CRAT) sera appliqué à ses médicaments
                    dans l&apos;Analyse.
                  </span>
                </span>
                <Switch
                  id="member-breastfeeding"
                  checked={breastfeeding}
                  onCheckedChange={setBreastfeeding}
                  aria-label="Allaitement"
                />
              </label>
            </div>
          ) : null}

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
                L&apos;Analyse rappellera de vérifier l&apos;adaptation des posologies (outil
                Fonction rénale).
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

        {/* Allergies */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label>Allergies connues</Label>
            <p aria-live="polite" className="text-[11px] tabular-nums text-muted-foreground">
              {allergies.length}/{MAX_ALLERGIES} allergie{allergies.length > 1 ? 's' : ''}
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
                      : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
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
                    aria-label={`Retirer l’allergie ${a}`}
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
              aria-label="Ajouter l’allergie saisie"
              disabled={allergies.length >= MAX_ALLERGIES || !allergyInput.trim()}
              onClick={() => addAllergy(allergyInput)}
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          </div>
        </div>

        {/* Visibilité restreinte */}
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
              Entrées masquées par défaut — nécessitent le code PIN de l&apos;armoire pour
              être consultées.
            </span>
            <span className="mt-1 block text-[11px] leading-snug text-muted-foreground/80">
              Restriction effective uniquement si un code PIN est défini (Réglages de
              l&apos;armoire).
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

      {/* Zone destructive — la confirmation est gérée par le parent. */}
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
