'use client'

import { useState } from 'react'
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Printer,
  ShieldAlert,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { HighAlertInfo, getTallManLettering } from '@/lib/lasa'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface HighAlertModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  drugName: string
  dci: string
  dosage?: string
  highAlertInfo: HighAlertInfo
  onConfirmed?: () => void
}

/**
 * Convertit un nombre numérique ou dosage en toutes lettres (FR et Arabe)
 */
export function formatDoseInWords(dosageStr?: string): { fr: string; ar: string } {
  if (!dosageStr) {
    return {
      fr: 'Posologie prescrite selon protocole strict',
      ar: 'الجرعة المحددة وفق الوصفة الطبية الدقيقة',
    }
  }

  const clean = dosageStr.toLowerCase().trim()

  if (clean.includes('20') && clean.includes('ui')) {
    return {
      fr: 'Vingt Unités Internationales (20 UI)',
      ar: 'عشرون وحدة دولية (20 UI)',
    }
  }
  if (clean.includes('10') && clean.includes('ui')) {
    return {
      fr: 'Dix Unités Internationales (10 UI)',
      ar: 'عشر وحدات دولية (10 UI)',
    }
  }
  if (clean.includes('2.5') || clean.includes('2,5')) {
    return {
      fr: 'Deux virgule cinq milligrammes (2,5 mg)',
      ar: 'اثنان فاصل خمسة مليغرام (2.5 mg)',
    }
  }
  if (clean.includes('5') && clean.includes('mg')) {
    return {
      fr: 'Cinq milligrammes (5 mg)',
      ar: 'خمسة مليغرام (5 mg)',
    }
  }
  if (clean.includes('10') && clean.includes('mg')) {
    return {
      fr: 'Dix milligrammes (10 mg)',
      ar: 'عشرة مليغرام (10 mg)',
    }
  }
  if (clean.includes('semaine') || clean.includes('hebdo')) {
    return {
      fr: 'Prise strictement unique par semaine (HEBDOMADAIRE)',
      ar: 'تناول أسبوعي صارم (مرة واحدة في الأسبوع فقط)',
    }
  }

  return {
    fr: `Dose prescrite : ${dosageStr} (à vérifier en toutes lettres)`,
    ar: `الجرعة الموصوفة: ${dosageStr} (التأكد بالكامل)`,
  }
}

export function HighAlertModal({
  open,
  onOpenChange,
  drugName,
  dci,
  dosage,
  highAlertInfo,
  onConfirmed,
}: HighAlertModalProps) {
  const [checkedCheckpoints, setCheckedCheckpoints] = useState<Record<number, boolean>>({})

  const allCheckpoints = [
    'J’ai vérifié l’identité du patient, la posologie prescrite et l’indication médicale exacte.',
    ...highAlertInfo.checkpoints,
    'J’ai dispensé les explications verbales des signes d’alerte et des modalités strictes de prise.',
  ]

  const isAllChecked = allCheckpoints.every((_, idx) => !!checkedCheckpoints[idx])

  const toggleCheck = (idx: number) => {
    setCheckedCheckpoints((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }))
  }

  const handleConfirm = () => {
    toast.success(`Double contrôle validé avec succès pour ${drugName}.`)
    onOpenChange(false)
    if (onConfirmed) onConfirmed()
  }

  const doseInWords = formatDoseInWords(dosage)
  const tallManName = getTallManLettering(drugName)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg border-2 border-state-danger/50 shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-red-600 text-white shadow">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-red-600 dark:text-red-400 uppercase tracking-tight">
                Double Contrôle de Sécurité Obligatoire
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Médicament à Haut Risque Vital (Catégorie OMS / ISMP)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Détails du médicament */}
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-base font-black text-foreground">
              {tallManName || drugName}
            </span>
            <Badge className="bg-red-600 text-white text-[10px] font-bold">
              {highAlertInfo.category}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">DCI : {dci}</p>

          <div className="rounded-lg bg-background/80 p-2.5 space-y-1 border text-xs">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Posologie vérifiée en toutes lettres :
            </span>
            <p className="font-bold text-foreground">{doseInWords.fr}</p>
            <p className="font-bold text-primary font-mono text-[11px]" dir="rtl">
              {doseInWords.ar}
            </p>
          </div>

          <p className="text-xs font-medium text-red-700 dark:text-red-400 leading-relaxed pt-1">
            ⚠️ {highAlertInfo.warning}
          </p>
        </div>

        {/* Checkpoints interactifs */}
        <div className="space-y-2.5 pt-1">
          <Label className="text-xs font-bold text-foreground">
            Points d’arrêt obligatoires avant validation :
          </Label>
          <div className="space-y-2">
            {allCheckpoints.map((cp, idx) => (
              <div
                key={idx}
                onClick={() => toggleCheck(idx)}
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors',
                  checkedCheckpoints[idx]
                    ? 'border-emerald-500/40 bg-emerald-500/5 text-foreground'
                    : 'border-muted hover:bg-muted/40 text-muted-foreground'
                )}
              >
                <Checkbox
                  id={`cp-${idx}`}
                  checked={!!checkedCheckpoints[idx]}
                  onCheckedChange={() => toggleCheck(idx)}
                  className="mt-0.5 size-4"
                />
                <label
                  htmlFor={`cp-${idx}`}
                  className="cursor-pointer leading-relaxed text-xs font-medium"
                >
                  {cp}
                </label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Annuler la délivrance
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!isAllChecked}
            onClick={handleConfirm}
            className={cn(
              'text-xs font-bold gap-1.5 transition-all',
              isAllChecked
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                : 'opacity-50 cursor-not-allowed'
            )}
          >
            <FileCheck className="size-3.5" />
            Confirmer la délivrance sécurisée
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
