'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import {
  Check,
  Flame,
  Feather,
  Moon,
  Palette,
  Sparkles,
  Sun,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDzPharm } from './store'
import { PALETTES } from './palettes'
import type { PaletteCategory, PaletteId } from './types'
import { cn } from '@/lib/utils'

export function PaletteDialog() {
  const paletteOpen = useDzPharm((s) => s.paletteOpen)
  const setPaletteOpen = useDzPharm((s) => s.setPaletteOpen)
  const activePalette = useDzPharm((s) => s.palette)
  const setPalette = useDzPharm((s) => s.setPalette)
  const { resolvedTheme, setTheme } = useTheme()

  // Détermine la catégorie initiale en fonction de la palette active
  const initialCategory: PaletteCategory = PALETTES.find((p) => p.id === activePalette)?.category || 'minimalist'
  const [activeCategory, setActiveCategory] = useState<PaletteCategory>(initialCategory)

  const handleSelect = (id: PaletteId) => {
    setPalette(id)
  }

  const filteredPalettes = PALETTES.filter((p) => p.category === activeCategory)
  const minimalistCount = PALETTES.filter((p) => p.category === 'minimalist').length
  const expressiveCount = PALETTES.filter((p) => p.category === 'expressive').length

  return (
    <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl border border-border/80 bg-card/98 shadow-2xl backdrop-blur-xl">
        {/* En-tête du nuancier */}
        <div className="p-5 sm:p-6 border-b border-border/60 bg-muted/30 shrink-0">
          <DialogHeader className="gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                  <Palette className="size-5" aria-hidden />
                </span>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                    Nuancier &amp; Palettes Thématiques
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    20 directions de design personnalisables en direct
                  </p>
                </div>
              </div>

              {/* Bascule Rapide Clair / Sombre */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="h-8 gap-1.5 rounded-lg border-border/80 text-xs font-medium bg-card shrink-0"
                title="Basculer entre mode clair et sombre"
              >
                {resolvedTheme === 'dark' ? (
                  <>
                    <Sun className="size-3.5 text-amber-500" />
                    <span className="hidden sm:inline">Mode Clair</span>
                  </>
                ) : (
                  <>
                    <Moon className="size-3.5 text-sky-500" />
                    <span className="hidden sm:inline">Mode Sombre</span>
                  </>
                )}
              </Button>
            </div>

            {/* Onglets des deux Grandes Catégories */}
            <div className="mt-2 flex items-center gap-1.5 p-1 rounded-xl bg-muted/80 border border-border/70">
              <button
                type="button"
                onClick={() => setActiveCategory('minimalist')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  activeCategory === 'minimalist'
                    ? 'bg-card text-foreground shadow-sm border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Feather className="size-3.5 text-primary" />
                <span>Minimaliste &amp; Anti-Fatigue</span>
                <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                  {minimalistCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('expressive')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  activeCategory === 'expressive'
                    ? 'bg-card text-foreground shadow-sm border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Flame className="size-3.5 text-amber-500" />
                <span>Audacieux &amp; Avant-Garde</span>
                <span className="ml-1 rounded-full bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  {expressiveCount}
                </span>
              </button>
            </div>
          </DialogHeader>
        </div>

        {/* Grille des Palettes Filtrées */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[58vh] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredPalettes.map((p) => {
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
                <div className="flex items-center justify-between gap-2 mb-1">
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
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md shrink-0 border border-border/50">
                    {p.badge}
                  </span>
                </div>

                {/* Slogan & description */}
                <p className="text-xs font-semibold text-primary mb-1">
                  {p.tagline}
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                  {p.description}
                </p>

                {/* Échantillons de couleurs en pilules visuelles */}
                <div className="mt-auto pt-2.5 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Harmonie :
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* Fond */}
                    <span
                      className="size-4 rounded-full border border-black/15 shadow-2xs"
                      style={{ backgroundColor: p.colors.bg }}
                      title={`Fond: ${p.colors.bg}`}
                    />
                    {/* Carte */}
                    <span
                      className="size-4 rounded-full border border-black/15 shadow-2xs"
                      style={{ backgroundColor: p.colors.card }}
                      title={`Carte: ${p.colors.card}`}
                    />
                    {/* Primaire */}
                    <span
                      className="size-4 rounded-full border border-black/15 shadow-2xs"
                      style={{ backgroundColor: p.colors.primary }}
                      title={`Primaire: ${p.colors.primary}`}
                    />
                    {/* Chifa */}
                    <span
                      className="size-4 rounded-full border border-black/15 shadow-2xs"
                      style={{ backgroundColor: p.colors.chifa }}
                      title={`Chifa: ${p.colors.chifa}`}
                    />
                    {/* Texte */}
                    <span
                      className="size-4 rounded-full border border-black/15 shadow-2xs"
                      style={{ backgroundColor: p.colors.text }}
                      title={`Texte: ${p.colors.text}`}
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Pied de dialogue */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground shrink-0">
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <span>Changement instantané sans rechargement · Mémorisé automatiquement</span>
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
