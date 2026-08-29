'use client'

import { Badge } from '@/components/ui/badge'
import { BookOpen, Coins, Database, Info, RefreshCw, ShieldCheck, Wifi } from 'lucide-react'
import { useDzPharm } from './store'

export function Footer() {
  const setView = useDzPharm((s) => s.setView)
  return (
    <footer className="mt-auto w-full border-t border-border/70 bg-card/40">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs text-muted-foreground sm:flex-row sm:px-6">
        <p className="flex items-center gap-1.5 text-center sm:text-left">
          <Database className="size-3.5 shrink-0" aria-hidden />
          <span>
            DzPharm — Données : Nomenclature Nationale (Ministère de
            l&apos;Industrie Pharmaceutique, DZ)
          </span>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setView('apropos')}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-primary transition-colors hover:text-primary/80 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Ouvrir la page À propos et sources"
          >
            <Info className="size-3.5 shrink-0" aria-hidden />
            À propos &amp; sources
          </button>
          <p className="hidden items-center gap-1.5 lg:flex">
            <BookOpen className="size-3.5 shrink-0 text-primary" aria-hidden />
            24 livres · 911 monographies DCI
          </p>
          <p className="hidden items-center gap-1.5 md:flex">
            <Coins className="size-3.5 shrink-0 text-chifa" aria-hidden />
            Prix PPA : liste officine (Août 2026)
          </p>
          <p className="hidden items-center gap-1.5 xl:flex">
            <Wifi className="size-3.5 shrink-0" aria-hidden />
            Mode hors ligne (PWA)
          </p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
            Usage professionnel — Vérifiez toujours les RCP officiels
          </p>
          <span className="hidden items-center gap-1.5 sm:flex">
            <RefreshCw className="size-3 shrink-0 text-state-safe" aria-hidden />
            <span className="text-state-safe font-medium">Référentiel en ligne</span>
          </span>
          <Badge
            variant="outline"
            className="border-primary/25 bg-primary/5 text-primary"
          >
            MAJ Juin 2026
          </Badge>
        </div>
      </div>
    </footer>
  )
}
