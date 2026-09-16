'use client'

import { useTheme } from 'next-themes'
import {
  Check,
  Moon,
  Palette,
  Sparkles,
  Sun,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDzPharm } from './store'
import { PALETTES } from './palettes'
import type { PaletteId } from './types'
import { cn } from '@/lib/utils'

export function PaletteDialog() {
  const paletteOpen = useDzPharm((s) => s.paletteOpen)
  const setPaletteOpen = useDzPharm((s) => s.setPaletteOpen)
  const activePalette = useDzPharm((s) => s.palette)
  const setPalette = useDzPharm((s) => s.setPalette)
  const { resolvedTheme, setTheme } = useTheme()

  const handleSelect = (id: PaletteId) => {
    setPalette(id)
  }

  return (
    <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-border/80 bg-card/98 shadow-2xl backdrop-blur-xl">
        {/* En-tête du nuancier */}
        <div className="p-6 border-b border-border/60 bg-muted/30">
          <DialogHeader className="gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <Palette className="size-4.5" aria-hidden />
                </span>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  Nuancier & Palettes de Design
                </DialogTitle>
              </div>

              {/* Bascule Rapide Clair / Sombre pour tester */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  className="h-8 gap-1.5 rounded-lg border-border/80 text-xs font-medium bg-card"
                  title="Basculer entre mode clair et sombre"
                >
                  {resolvedTheme === 'dark' ? (
                    <>
                      <Sun className="size-3.5 text-amber-500" />
                      <span>Mode Clair</span>
                    </>
                  ) : (
                    <>
                      <Moon className="size-3.5 text-sky-500" />
                      <span>Mode Sombre</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Explorez 10 ambiances visuelles minimalistes conçues pour supprimer la fatigue oculaire, éliminer l&apos;éblouissement et sublimer la lecture médicale.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Grille des 10 Palettes */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {PALETTES.map((p) => {
            const isCurrent = activePalette === p.id

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p.id)}
                className={cn(
                  'group relative flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer select-none',
                  'hover:border-primary/50 hover:shadow-md',
                  isCurrent
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                    : 'border-border/70 bg-card/70 hover:bg-card'
                )}
              >
                {/* Ligne haute : Nom, Catégorie et Statut actif */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-sm text-foreground truncate">
                      {p.name}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-2xs shrink-0">
                        <Check className="size-2.5" />
                        Actif
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">
                    {p.category}
                  </span>
                </div>

                {/* Slogan & description */}
                <p className="text-xs font-medium text-primary mb-1">
                  {p.tagline}
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                  {p.description}
                </p>

                {/* Échantillons de couleurs en pilules visuelles */}
                <div className="mt-auto pt-2 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Harmonie :
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* Fond */}
                    <span
                      className="size-4.5 rounded-full border border-black/15 shadow-2xs"
                      style={{ backgroundColor: p.colors.bg }}
                      title={`Fond: ${p.colors.bg}`}
                    />
                    {/* Carte */}
                    <span
                      className="size-4.5 rounded-full border border-black/15 shadow-2xs"
                      style={{ backgroundColor: p.colors.card }}
                      title={`Carte: ${p.colors.card}`}
                    />
                    {/* Primaire */}
                    <span
                      className="size-4.5 rounded-full border border-black/15 shadow-2xs"
                      style={{ backgroundColor: p.colors.primary }}
                      title={`Primaire: ${p.colors.primary}`}
                    />
                    {/* Chifa */}
                    <span
                      className="size-4.5 rounded-full border border-black/15 shadow-2xs"
                      style={{ backgroundColor: p.colors.chifa }}
                      title={`Chifa: ${p.colors.chifa}`}
                    />
                    {/* Texte */}
                    <span
                      className="size-4.5 rounded-full border border-black/15 shadow-2xs"
                      style={{ backgroundColor: p.colors.text }}
                      title={`Texte: ${p.colors.text}`}
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Pied de dialogue avec rappel */}
        <div className="px-6 py-3.5 border-t border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <span>Votre choix est automatiquement mémorisé pour vos prochaines visites.</span>
          </span>
          <Button
            size="sm"
            variant="default"
            onClick={() => setPaletteOpen(false)}
            className="rounded-lg h-8 px-4 text-xs font-semibold cursor-pointer"
          >
            Fermer le nuancier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
