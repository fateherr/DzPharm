'use client'

import { useState } from 'react'
import { Ambulance, ChevronDown, PhoneCall, Siren, X } from 'lucide-react'
import { useDzPharm } from './store'
import { cn } from '@/lib/utils'

/**
 * Bandeau permanent des numéros d'urgence médicale en Algérie.
 * SAMU (14), Protection Civile (102), Police (17) et Centre Anti-Poison (021 71 30 42).
 * Design médical épuré avec balise pulsante, puces interactives et hauteur optimisée (28px).
 */
export function EmergencyBar() {
  const [minimized, setMinimized] = useState(false)
  const designMode = useDzPharm((s) => s.designMode)
  const isBotanique = designMode === 'botanique'

  if (minimized) {
    return (
      <aside
        role="region"
        aria-label="Numéros d'urgence médicale en Algérie (réduit)"
        className="relative z-10 w-full border-b border-rose-500/20 bg-slate-950/95 text-slate-100 backdrop-blur-md print:hidden transition-all"
      >
        <div className="mx-auto flex h-6 max-w-7xl items-center justify-between px-3 text-[11px]">
          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="flex items-center gap-1.5 text-rose-300 hover:text-rose-200 transition-colors font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400 rounded"
            title="Développer les numéros d'urgence médicale"
          >
            <span className="relative flex size-2 shrink-0">
              <span className="beacon-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-rose-400" />
            </span>
            <Siren className="size-3" />
            <span>Urgences Médicales 24/7 (SAMU 14 · Prot. Civile 102 · Anti-Poison 021 71 30 42)</span>
            <ChevronDown className="size-3 opacity-70" />
          </button>
          <a
            href="tel:14"
            className="flex items-center gap-1 rounded bg-rose-600/80 px-2 py-0.5 font-bold text-white hover:bg-rose-500 transition-colors"
          >
            <PhoneCall className="size-2.5" />
            <span>SAMU 14</span>
          </a>
        </div>
      </aside>
    )
  }

  return (
    <aside
      role="region"
      aria-label="Numéros d'urgence médicale en Algérie"
      className={cn(
        'relative z-10 w-full border-b backdrop-blur-lg print:hidden transition-all',
        isBotanique
          ? 'border-[#2d6a4f]/30 bg-gradient-to-r from-[#060c09] via-[#1b4332]/90 to-[#060c09] text-emerald-100 shadow-xs shadow-[#1b4332]/40'
          : 'border-rose-500/20 bg-gradient-to-r from-slate-950 via-rose-950/80 to-slate-950 text-slate-100 shadow-xs shadow-rose-950/30'
      )}
    >
      <div className="mx-auto flex h-7 max-w-7xl items-center justify-between gap-1 px-3 text-[11px] font-medium tracking-wide sm:text-xs">
        {/* Left: Emergency Status Beacon & Numbers */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
          <span className="flex shrink-0 items-center gap-1.5 font-semibold uppercase tracking-wider text-rose-300">
            <span className="relative flex size-2 shrink-0">
              <span className="beacon-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-rose-400" />
            </span>
            <Siren className="size-3.5 shrink-0 text-rose-300" aria-hidden />
            <span className="hidden sm:inline">Urgences 24/7</span>
          </span>

          <span aria-hidden className="text-white/20 hidden sm:inline">|</span>

          {/* SAMU 14 */}
          <a
            href="tel:14"
            title="Appeler le SAMU (14) — Urgences Vitales"
            className="group flex shrink-0 items-center gap-1 rounded-md bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/30 px-2 py-0.5 text-white transition-all focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
          >
            <PhoneCall className="size-3 shrink-0 text-rose-300 group-hover:scale-110 transition-transform" aria-hidden />
            <span>SAMU <strong className="font-bold text-rose-100">14</strong></span>
          </a>

          {/* Protection Civile 102 */}
          <a
            href="tel:102"
            title="Appeler la Protection Civile (102) — Secours"
            className="group flex shrink-0 items-center gap-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-0.5 text-slate-200 transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            <span className="hidden md:inline text-slate-300">Prot. Civile</span>
            <strong className="font-bold text-white">102</strong>
          </a>

          {/* Police Secours 17 */}
          <a
            href="tel:17"
            title="Appeler la Police Secours (17)"
            className="group flex shrink-0 items-center gap-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-0.5 text-slate-200 transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            <span className="hidden md:inline text-slate-300">Police</span>
            <strong className="font-bold text-white">17</strong>
          </a>

          <span aria-hidden className="text-white/20 hidden sm:inline">·</span>

          {/* Centre Anti-Poison Alger */}
          <a
            href="tel:021713042"
            title="Appeler le Centre National Anti-Poison CHU Bab El Oued (021 71 30 42)"
            className="group flex shrink-0 items-center gap-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-0.5 text-slate-200 transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            <Ambulance className="size-3.5 shrink-0 text-rose-300 group-hover:scale-110 transition-transform" aria-hidden />
            <span className="hidden sm:inline text-slate-300">Anti-Poison Alger</span>
            <span className="sm:hidden text-slate-300">Anti-Poison</span>
            <strong className="font-bold text-white">021 71 30 42</strong>
          </a>
        </div>

        {/* Right: Minimize toggle */}
        <button
          type="button"
          onClick={() => setMinimized(true)}
          className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          title="Réduire le bandeau d'urgence"
          aria-label="Réduire le bandeau d'urgence"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </aside>
  )
}
