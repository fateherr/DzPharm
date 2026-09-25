'use client'

import { useState } from 'react'
import {
  Accessibility,
  Check,
  Eye,
  Flashlight,
  Moon,
  Sparkles,
  Sun,
  Type,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useDzPharm } from './store'
import { clinicalAudio } from '@/lib/clinical/audio-alerts'
import { cn } from '@/lib/utils'

export function AccessibilityModal({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  const counterNightMode = useDzPharm((s) => s.counterNightMode)
  const toggleCounterNightMode = useDzPharm((s) => s.toggleCounterNightMode)

  const accessibleFont = useDzPharm((s) => s.accessibleFont)
  const setAccessibleFont = useDzPharm((s) => s.setAccessibleFont)

  const fontScale = useDzPharm((s) => s.fontScale)
  const setFontScale = useDzPharm((s) => s.setFontScale)

  const soundAlertsEnabled = useDzPharm((s) => s.soundAlertsEnabled)
  const toggleSoundAlerts = useDzPharm((s) => s.toggleSoundAlerts)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg text-muted-foreground hover:text-foreground"
            aria-label="Options d'accessibilité et mode garde de nuit"
          >
            <Accessibility className="size-4" aria-hidden />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Accessibility className="size-5 text-primary" aria-hidden />
            Accessibilité &amp; Ergonomie Clinique (W7)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Personnalisez l&apos;affichage pour la pratique nocturne, la basse vision ou la dyslexie.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Section 1: Counter-Night Mode (W7-01) */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Moon className="size-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    Mode Garde de Nuit (2h du matin)
                    {counterNightMode && (
                      <Badge className="text-[10px] bg-amber-600 text-white border-none h-4 px-1.5">
                        Actif
                      </Badge>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Zéro lumière bleue, fond noir OLED profond &amp; luminescence ambrée anti-éblouissement.
                  </p>
                </div>
              </div>

              <Switch
                checked={counterNightMode}
                onCheckedChange={toggleCounterNightMode}
                aria-label="Activer le mode Garde de Nuit"
              />
            </div>

            {counterNightMode && (
              <div className="rounded-lg bg-black/60 border border-amber-500/40 p-2.5 text-xs text-amber-400 flex items-center gap-2">
                <Flashlight className="size-3.5 shrink-0" />
                <span>Préservation rétinienne activée — idéal lors d&apos;appels de nuit au guichet.</span>
              </div>
            )}
          </div>

          {/* Section 2: Accessible Fonts (W7-03) */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Type className="size-4 text-primary" />
              Police de caractères
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'default',
                  label: 'Standard',
                  desc: 'Inter & Noto Arabic',
                  fontClass: 'font-sans',
                },
                {
                  id: 'atkinson',
                  label: 'Atkinson',
                  desc: 'Basse vision (Braille Inst.)',
                  fontClass: 'font-sans font-bold',
                },
                {
                  id: 'opendyslexic',
                  label: 'OpenDyslexic',
                  desc: 'Anti-inversion dyslexie',
                  fontClass: 'tracking-wider',
                },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAccessibleFont(f.id as typeof accessibleFont)}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between',
                    accessibleFont === f.id
                      ? 'border-primary bg-primary/10 shadow-xs'
                      : 'border-border bg-card hover:border-primary/40'
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={cn('text-xs font-bold text-foreground', f.fontClass)}>
                      {f.label}
                    </span>
                    {accessibleFont === f.id && <Check className="size-3.5 text-primary" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {f.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Font Scale (W7-03) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Eye className="size-4 text-primary" />
                Taille du texte (Échelle de lecture)
              </Label>
              <span className="text-xs font-mono font-bold text-primary">{fontScale}%</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { scale: 90, label: '90 %', sub: 'Compact' },
                { scale: 100, label: '100 %', sub: 'Normal' },
                { scale: 115, label: '115 %', sub: 'Confort' },
                { scale: 130, label: '130 %', sub: 'Large' },
              ].map((s) => (
                <button
                  key={s.scale}
                  type="button"
                  onClick={() => setFontScale(s.scale as typeof fontScale)}
                  className={cn(
                    'p-2 rounded-lg border text-center transition-all cursor-pointer',
                    fontScale === s.scale
                      ? 'border-primary bg-primary/15 text-primary font-bold shadow-xs'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  <p className="text-xs">{s.label}</p>
                  <p className="text-[10px] opacity-75">{s.sub}</p>
                </button>
              ))}
            </div>

            {/* Phrase test */}
            <div className="p-3 rounded-lg border border-border/60 bg-muted/30 text-xs text-foreground/90 italic">
              Aperçu : « 1 comprimé matin et soir au milieu du repas pendant 7 jours. »
            </div>
          </div>

          <Separator />

          {/* Section 4: Auditory Safety Cues (W7-04) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {soundAlertsEnabled ? (
                  <Volume2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <VolumeX className="size-4 text-muted-foreground" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Carillons &amp; Signaux Sonores Cliniques
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Tonalités harmoniques pures (Web Audio API) pour le scan et les alertes.
                  </p>
                </div>
              </div>

              <Switch
                checked={soundAlertsEnabled}
                onCheckedChange={toggleSoundAlerts}
                aria-label="Activer ou couper les sons cliniques"
              />
            </div>

            {soundAlertsEnabled && (
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => clinicalAudio.playScanSuccess()}
                  className="h-7 text-xs"
                >
                  Bip Scan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => clinicalAudio.playWarningAlert()}
                  className="h-7 text-xs text-amber-700 dark:text-amber-400 border-amber-500/30"
                >
                  Alerte Allergie
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => clinicalAudio.playCriticalAlert()}
                  className="h-7 text-xs text-rose-700 dark:text-rose-400 border-rose-500/30"
                >
                  Alerte Critique
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => clinicalAudio.playValidationSuccess()}
                  className="h-7 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                >
                  Validation
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
