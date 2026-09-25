'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Baby,
  Droplets,
  HeartPulse,
  Pin,
  PinOff,
  ShieldAlert,
  User,
} from 'lucide-react'
import { useDzPharm, PinnedPatient } from './store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface PinPatientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PinPatientDialog({ open, onOpenChange }: PinPatientDialogProps) {
  const pinnedPatient = useDzPharm((s) => s.pinnedPatient)
  const setPinnedPatient = useDzPharm((s) => s.setPinnedPatient)
  const clearPinnedPatient = useDzPharm((s) => s.clearPinnedPatient)

  const [name, setName] = useState(pinnedPatient?.name || '')
  const [age, setAge] = useState<string>(pinnedPatient?.ageYears?.toString() || '')
  const [weight, setWeight] = useState<string>(pinnedPatient?.weightKg?.toString() || '')
  const [gender, setGender] = useState<'M' | 'F'>(pinnedPatient?.gender || 'M')
  const [clcr, setClcr] = useState<string>(pinnedPatient?.clcr?.toString() || '')
  const [childPugh, setChildPugh] = useState<'A' | 'B' | 'C' | 'none'>(
    pinnedPatient?.childPughClass || 'none'
  )
  const [isPregnant, setIsPregnant] = useState(pinnedPatient?.isPregnant || false)
  const [trimester, setTrimester] = useState<1 | 2 | 3>(
    pinnedPatient?.pregnancyTrimester || 1
  )
  const [isBreastfeeding, setIsBreastfeeding] = useState(
    pinnedPatient?.isBreastfeeding || false
  )
  const [allergiesInput, setAllergiesInput] = useState(
    pinnedPatient?.allergies?.join(', ') || ''
  )

  const handleSave = () => {
    const parsedAge = age ? parseFloat(age) : undefined
    const parsedWeight = weight ? parseFloat(weight) : undefined
    const parsedClcr = clcr ? parseFloat(clcr) : undefined
    const parsedAllergies = allergiesInput
      ? allergiesInput
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean)
      : []

    const patient: PinnedPatient = {
      name: name.trim() || undefined,
      ageYears: parsedAge,
      weightKg: parsedWeight,
      gender,
      clcr: parsedClcr,
      childPughClass: childPugh === 'none' ? undefined : childPugh,
      isPregnant,
      pregnancyTrimester: isPregnant ? trimester : undefined,
      isBreastfeeding,
      allergies: parsedAllergies.length > 0 ? parsedAllergies : undefined,
      pinnedAt: new Date().toISOString(),
    }

    setPinnedPatient(patient)
    onOpenChange(false)
    toast.success('Patient épinglé avec succès au contexte de travail actif.')
  }

  const handleClear = () => {
    clearPinnedPatient()
    onOpenChange(false)
    toast.info('Patient détaché du contexte de travail.')
  }

  const applyPreset = (type: 'pediatric' | 'elderly' | 'renal') => {
    if (type === 'pediatric') {
      setName('Enfant 4 ans')
      setAge('4')
      setWeight('16')
      setGender('M')
      setClcr('100')
      setChildPugh('none')
      setIsPregnant(false)
    } else if (type === 'elderly') {
      setName('Patient 75 ans')
      setAge('75')
      setWeight('68')
      setGender('M')
      setClcr('38')
      setChildPugh('none')
      setIsPregnant(false)
    } else if (type === 'renal') {
      setName('IRC Stade G4')
      setAge('62')
      setWeight('74')
      setGender('F')
      setClcr('22')
      setChildPugh('B')
      setIsPregnant(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Pin className="size-4 text-primary" />
            Épingler un contexte patient (Shift-Context Pinning)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Les données prérempliront automatiquement tous les calculateurs cliniques (posologie pédiatrique, adaptation rénale, Child-Pugh hépatique, grossesse) et le Copilote IA.
          </DialogDescription>
        </DialogHeader>

        {/* Raccourcis rapides */}
        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-[11px] text-muted-foreground">Profils types :</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset('pediatric')}
            className="h-6 px-2 text-[11px]"
          >
            Pédiatrique (4 ans, 16 kg)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset('elderly')}
            className="h-6 px-2 text-[11px]"
          >
            Gériatrique (75 ans, ClCr 38)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset('renal')}
            className="h-6 px-2 text-[11px]"
          >
            IRC G4 + Foie B
          </Button>
        </div>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pin-name" className="text-xs">
                Nom / Identifiant anonymisé
              </Label>
              <Input
                id="pin-name"
                placeholder="Ex : M. Benali, Lit 4"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Sexe biologique</Label>
              <RadioGroup
                value={gender}
                onValueChange={(v) => setGender(v as 'M' | 'F')}
                className="flex items-center gap-3 pt-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="M" id="pin-m" />
                  <Label htmlFor="pin-m" className="text-xs cursor-pointer">
                    Homme (M)
                  </Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="F" id="pin-f" />
                  <Label htmlFor="pin-f" className="text-xs cursor-pointer">
                    Femme (F)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pin-age" className="text-xs">
                Âge (années)
              </Label>
              <Input
                id="pin-age"
                type="number"
                min="0"
                max="120"
                placeholder="Ex : 45"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="pin-weight" className="text-xs">
                Poids corporel (kg)
              </Label>
              <Input
                id="pin-weight"
                type="number"
                min="1"
                max="300"
                step="0.5"
                placeholder="Ex : 70"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pin-clcr" className="text-xs">
                Clairance créatinine ClCr (mL/min)
              </Label>
              <Input
                id="pin-clcr"
                type="number"
                min="1"
                max="200"
                placeholder="Cockcroft-Gault"
                value={clcr}
                onChange={(e) => setClcr(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Insuffisance hépatique (Child-Pugh)</Label>
              <select
                value={childPugh}
                onChange={(e) => setChildPugh(e.target.value as 'A' | 'B' | 'C' | 'none')}
                className="h-8 w-full rounded-md border bg-background px-2.5 text-xs font-medium"
              >
                <option value="none">Aucune / Foie normal</option>
                <option value="A">Classe A (Légère)</option>
                <option value="B">Classe B (Modérée)</option>
                <option value="C">Classe C (Sévère)</option>
              </select>
            </div>
          </div>

          {/* Grossesse & Allaitement */}
          {gender === 'F' && (
            <div className="rounded-lg border p-2.5 space-y-2 bg-pink-500/5 border-pink-500/20">
              <div className="flex items-center justify-between">
                <Label htmlFor="pin-pregnant" className="text-xs font-medium cursor-pointer">
                  Grossesse en cours
                </Label>
                <input
                  id="pin-pregnant"
                  type="checkbox"
                  checked={isPregnant}
                  onChange={(e) => setIsPregnant(e.target.checked)}
                  className="size-4 rounded border-pink-500 text-pink-600"
                />
              </div>

              {isPregnant && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[11px] text-muted-foreground">Trimestre :</span>
                  {[1, 2, 3].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTrimester(t as 1 | 2 | 3)}
                      className={cn(
                        'rounded px-2.5 py-0.5 text-xs font-medium transition-colors',
                        trimester === t
                          ? 'bg-pink-600 text-white shadow-sm'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      T{t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Allergies médicamenteuses */}
          <div className="space-y-1">
            <Label htmlFor="pin-allergies" className="text-xs">
              Allergies médicamenteuses connues (séparées par virgules)
            </Label>
            <Input
              id="pin-allergies"
              placeholder="Ex : Pénicilline, Aspirine, Sulfamides"
              value={allergiesInput}
              onChange={(e) => setAllergiesInput(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {pinnedPatient && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleClear}
              className="mr-auto text-xs"
            >
              Détacher
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Annuler
          </Button>
          <Button type="button" size="sm" onClick={handleSave} className="text-xs font-bold">
            Épingler au contexte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PinPatientTrigger() {
  const pinnedPatient = useDzPharm((s) => s.pinnedPatient)
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDialogOpen(true)}
            aria-label={
              pinnedPatient
                ? `Patient épinglé : ${pinnedPatient.name || 'Actif'}`
                : 'Épingler un contexte patient'
            }
            className={cn(
              'h-8 gap-1.5 rounded-lg px-2 text-xs font-semibold shrink-0 transition-all',
              pinnedPatient
                ? 'bg-primary/15 text-primary border border-primary/30 shadow-xs'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Pin
              className={cn(
                'size-3.5',
                pinnedPatient ? 'rotate-45 text-primary' : 'text-muted-foreground'
              )}
            />
            <span className="hidden xl:inline">
              {pinnedPatient
                ? pinnedPatient.name || `${pinnedPatient.ageYears ? `${pinnedPatient.ageYears}a` : 'Patient'}`
                : 'Épingler patient'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {pinnedPatient
            ? `Patient actif : ${pinnedPatient.name || 'Épinglé'} (${pinnedPatient.ageYears ? `${pinnedPatient.ageYears} ans` : ''} ${pinnedPatient.weightKg ? `${pinnedPatient.weightKg} kg` : ''})`
            : 'Épingler un patient (préremplir posologie, rein, foie)'}
        </TooltipContent>
      </Tooltip>

      {dialogOpen && <PinPatientDialog open={dialogOpen} onOpenChange={setDialogOpen} />}
    </>
  )
}

export function ShiftContextBar() {
  const pinnedPatient = useDzPharm((s) => s.pinnedPatient)
  const clearPinnedPatient = useDzPharm((s) => s.clearPinnedPatient)
  const openTool = useDzPharm((s) => s.openTool)
  const [dialogOpen, setDialogOpen] = useState(false)

  if (!pinnedPatient) return null

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-background px-4 py-2 text-xs"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 font-bold text-primary">
              <Pin className="size-3.5 rotate-45" />
              Contexte patient actif :
            </span>

            <span className="font-semibold text-foreground">
              {pinnedPatient.name || 'Patient'}
            </span>

            {pinnedPatient.ageYears !== undefined && (
              <Badge variant="secondary" className="text-[11px] font-mono">
                {pinnedPatient.ageYears} ans
              </Badge>
            )}

            {pinnedPatient.weightKg !== undefined && (
              <Badge variant="secondary" className="text-[11px] font-mono">
                {pinnedPatient.weightKg} kg
              </Badge>
            )}

            {pinnedPatient.clcr !== undefined && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[11px] font-mono gap-1',
                  pinnedPatient.clcr < 30
                    ? 'border-state-danger/50 text-state-danger bg-state-danger/10'
                    : pinnedPatient.clcr < 60
                    ? 'border-state-warning/50 text-state-warning bg-state-warning/10'
                    : 'border-state-safe/50 text-state-safe bg-state-safe/10'
                )}
              >
                <Droplets className="size-3" />
                ClCr {pinnedPatient.clcr} mL/min
              </Badge>
            )}

            {pinnedPatient.childPughClass && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[11px] font-mono gap-1',
                  pinnedPatient.childPughClass === 'C'
                    ? 'border-state-danger/50 text-state-danger bg-state-danger/10'
                    : pinnedPatient.childPughClass === 'B'
                    ? 'border-state-warning/50 text-state-warning bg-state-warning/10'
                    : 'border-state-safe/50 text-state-safe bg-state-safe/10'
                )}
              >
                <Activity className="size-3" />
                Child-Pugh {pinnedPatient.childPughClass}
              </Badge>
            )}

            {pinnedPatient.isPregnant && (
              <Badge
                variant="outline"
                className="border-pink-500/50 bg-pink-500/10 text-pink-600 dark:text-pink-400 gap-1 text-[11px]"
              >
                <HeartPulse className="size-3" />
                Grossesse T{pinnedPatient.pregnancyTrimester || 1}
              </Badge>
            )}

            {pinnedPatient.allergies && pinnedPatient.allergies.length > 0 && (
              <Badge
                variant="outline"
                className="border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400 gap-1 text-[11px]"
              >
                <ShieldAlert className="size-3" />
                Allergie : {pinnedPatient.allergies.join(', ')}
              </Badge>
            )}
          </div>

          {/* Raccourcis outils + gestion */}
          <div className="flex items-center gap-1.5 ml-auto">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openTool('pediatrie')}
              className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Baby className="size-3" />
              Poso
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => openTool('renal')}
              className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Droplets className="size-3" />
              Rein
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => openTool('hepatique')}
              className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Activity className="size-3" />
              Foie
            </Button>

            <Separator orientation="vertical" className="h-3.5 mx-1" />

            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialogOpen(true)}
              className="h-6 px-2 text-[11px]"
            >
              Modifier
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                clearPinnedPatient()
                toast.info('Patient détaché du contexte de travail.')
              }}
              className="h-6 px-1.5 text-muted-foreground hover:text-state-danger"
              title="Détacher le patient"
            >
              <PinOff className="size-3" />
            </Button>
          </div>
        </div>
      </motion.div>

      {dialogOpen && <PinPatientDialog open={dialogOpen} onOpenChange={setDialogOpen} />}
    </>
  )
}
