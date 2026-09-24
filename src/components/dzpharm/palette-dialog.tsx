'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import {
  Calendar,
  Check,
  Compass,
  FlaskConical,
  Layers,
  Leaf,
  Moon,
  Palette,
  Sparkles,
  Stethoscope,
  Sun,
  Wind,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDzPharm } from './store'
import { PALETTES } from './palettes'
import type { PaletteCategory, PaletteId } from './types'
import { cn } from '@/lib/utils'

export function PaletteDialog() {
  const paletteOpen  = useDzPharm((s) => s.paletteOpen)
  const setPaletteOpen = useDzPharm((s) => s.setPaletteOpen)
  const activePalette  = useDzPharm((s) => s.palette)
  const setPalette     = useDzPharm((s) => s.setPalette)
  const designMode     = useDzPharm((s) => s.designMode)
  const setDesignMode  = useDzPharm((s) => s.setDesignMode)
  const { resolvedTheme, setTheme } = useTheme()

  // Auto-open on the tab that owns the currently active palette
  const initialCategory: PaletteCategory =
    PALETTES.find((p) => p.id === activePalette)?.category ?? 'minimalist'
  const [activeCategory, setActiveCategory] =
    useState<PaletteCategory>(initialCategory)

  const handleSelect = (id: PaletteId) => {
    setPalette(id)
    if (designMode === 'botanique') {
      setDesignMode('standard')
    }
  }

  const filtered  = PALETTES.filter((p) => p.category === activeCategory)
  const minCount  = PALETTES.filter((p) => p.category === 'minimalist').length
  const sysCount  = PALETTES.filter((p) => p.category === 'system').length
  const cultCount = PALETTES.filter((p) => p.category === 'cultural').length
  const seasCount = PALETTES.filter((p) => p.category === 'seasonal').length
  const clinCount = PALETTES.filter((p) => p.category === 'clinical').length
  const expCount  = PALETTES.filter((p) => p.category === 'experimental').length

  const categories: { id: PaletteCategory; label: string; count: number; icon: typeof Wind; color: string }[] = [
    { id: 'minimalist', label: 'Minimalistes', count: minCount, icon: Wind, color: 'text-primary' },
    { id: 'system', label: 'Systèmes', count: sysCount, icon: Layers, color: 'text-violet-500' },
    { id: 'cultural', label: 'Culturel DZ', count: cultCount, icon: Compass, color: 'text-amber-500' },
    { id: 'seasonal', label: 'Saisonnier', count: seasCount, icon: Calendar, color: 'text-emerald-500' },
    { id: 'clinical', label: 'Clinique', count: clinCount, icon: Stethoscope, color: 'text-red-500' },
    { id: 'experimental', label: 'Expérimental', count: expCount, icon: FlaskConical, color: 'text-sky-500' },
  ]

  return (
    <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl border border-border/80 bg-card/98 shadow-2xl backdrop-blur-xl">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="p-5 sm:p-6 border-b border-border/60 bg-muted/30 shrink-0">
          <DialogHeader className="gap-2">

            {/* Title row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                  <Palette className="size-5" aria-hidden />
                </span>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                    Nuancier &amp; Styles de Design
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {PALETTES.length} palettes · 6 collections de design · changement instantané
                  </p>
                </div>
              </div>

              {/* Theme toggle */}
              <Button
                variant="outline" size="sm"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="h-8 gap-1.5 rounded-lg border-border/80 text-xs font-medium bg-card shrink-0"
              >
                {resolvedTheme === 'dark'
                  ? <><Sun  className="size-3.5 text-amber-500" /><span className="hidden sm:inline">Mode Clair</span></>
                  : <><Moon className="size-3.5 text-sky-500"   /><span className="hidden sm:inline">Mode Sombre</span></>}
              </Button>
            </div>

            {/* Botanical Mode Showcase Banner */}
            <div className="mt-2.5 flex items-center justify-between gap-2 p-2.5 rounded-xl border border-[#1b4332]/25 bg-[#1b4332]/8 dark:border-[#34d399]/30 dark:bg-[#34d399]/10">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex size-7 items-center justify-center rounded-lg bg-[#1b4332]/15 text-[#1b4332] dark:bg-[#34d399]/20 dark:text-[#34d399] shrink-0">
                  <Leaf className="size-4" />
                </span>
                <div className="truncate text-xs">
                  <p className="font-semibold text-foreground truncate">
                    Nouveau Design : Pharmacopée Royale &amp; Botanique
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Plantes médicinales, roses damascena, mortiers &amp; alambics
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant={designMode === 'botanique' ? 'default' : 'outline'}
                onClick={() => setDesignMode(designMode === 'botanique' ? 'standard' : 'botanique')}
                className={cn(
                  'h-7 px-2.5 text-xs font-semibold shrink-0 cursor-pointer rounded-lg',
                  designMode === 'botanique'
                    ? 'bg-[#1b4332] text-white hover:bg-[#1b4332]/90 dark:bg-[#34d399] dark:text-[#060c09]'
                    : 'border-[#1b4332]/30 text-[#1b4332] dark:border-[#34d399]/40 dark:text-[#34d399]'
                )}
              >
                {designMode === 'botanique' ? 'Actif 🌿' : 'Activer'}
              </Button>
            </div>

            {/* Category tabs (6 collections) */}
            <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 p-1 rounded-xl bg-muted/80 border border-border/70">
              {categories.map((cat) => {
                const Icon = cat.icon
                const isSelected = activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center',
                      isSelected
                        ? 'bg-card text-foreground shadow-sm border border-border/80'
                        : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                    )}
                  >
                    <Icon className={cn('size-3.5 shrink-0', cat.color)} />
                    <span className="truncate">{cat.label}</span>
                    <span className="rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-[9px] font-bold">
                      {cat.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </DialogHeader>
        </div>

        {/* ── Palette grid ──────────────────────────────────────── */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filtered.map((p) => {
            const isActive = activePalette === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p.id)}
                className={cn(
                  'group relative flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer select-none',
                  'hover:border-primary/50 hover:shadow-md',
                  isActive
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                    : 'border-border/70 bg-card/70 hover:bg-card'
                )}
              >
                {/* Name + status + badge */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-sm text-foreground truncate">{p.name}</span>
                    {isActive && (
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

                {/* Tagline */}
                <p className="text-xs font-semibold text-primary mb-1">{p.tagline}</p>

                {/* Description */}
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                  {p.description}
                </p>

                {/* Feature tags — only for system designs */}
                {p.features && p.features.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.features.map((f) => (
                      <span
                        key={f}
                        className={cn(
                          'rounded-md px-1.5 py-0.5 text-[10px] font-semibold border',
                          p.category === 'system'
                            ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800'
                            : 'bg-muted/60 text-muted-foreground border-border/50'
                        )}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                {/* Colour swatches */}
                <div className="mt-auto pt-2.5 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground">Couleurs :</span>
                  <div className="flex items-center gap-1.5">
                    {(['bg','card','primary','chifa','text'] as const).map((k) => (
                      <span
                        key={k}
                        className="size-4 rounded-full border border-black/15 shadow-2xs"
                        style={{ backgroundColor: p.colors[k] }}
                        title={`${k}: ${p.colors[k]}`}
                      />
                    ))}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground shrink-0">
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            Mémorisé automatiquement · appliqué sans rechargement
          </span>
          <Button
            size="sm" variant="default"
            onClick={() => setPaletteOpen(false)}
            className="rounded-lg h-8 px-4 text-xs font-semibold cursor-pointer"
          >
            Fermer
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}
