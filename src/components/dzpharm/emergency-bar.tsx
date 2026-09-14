'use client'

import { Ambulance, PhoneCall, Siren } from 'lucide-react'

/**
 * Bandeau permanent des numéros d'urgence médicale en Algérie.
 * SAMU (14), Protection Civile (102), Police (17) et Centre Anti-Poison (021 71 30 42).
 * Design médical épuré avec balise pulsante et puces interactives.
 */
export function EmergencyBar() {
  return (
    <aside
      role="region"
      aria-label="Numéros d'urgence médicale en Algérie"
      className="sticky top-0 z-50 w-full border-b border-rose-900/30 bg-gradient-to-r from-red-900 via-rose-800 to-red-950 text-white shadow-sm shadow-red-950/20 backdrop-blur-md print:hidden"
    >
      <div className="mx-auto flex h-8.5 max-w-7xl items-center justify-center gap-1.5 overflow-x-auto px-3 text-[11px] font-medium tracking-wide sm:gap-2.5 sm:text-xs no-scrollbar">
        {/* Pulsing alert beacon */}
        <span className="flex shrink-0 items-center gap-1.5 font-semibold uppercase tracking-wider text-rose-200">
          <span className="relative flex size-2 shrink-0">
            <span className="beacon-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-rose-300" />
          </span>
          <Siren className="size-3.5 shrink-0 text-rose-200" aria-hidden />
          <span className="hidden sm:inline">Urgences 24/7</span>
        </span>

        <span aria-hidden className="text-white/25">|</span>

        {/* SAMU 14 */}
        <a
          href="tel:14"
          title="Appeler le SAMU (14)"
          className="group flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-white transition-all hover:bg-white/20 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <PhoneCall className="size-3 shrink-0 opacity-75 group-hover:opacity-100" aria-hidden />
          <span>SAMU <strong className="font-bold text-white">14</strong></span>
        </a>

        {/* Protection Civile 102 */}
        <a
          href="tel:102"
          title="Appeler la Protection Civile (102)"
          className="group flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-white transition-all hover:bg-white/20 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <span className="hidden md:inline text-rose-100/90">Prot. Civile</span>
          <strong className="font-bold text-white">102</strong>
        </a>

        {/* Police 17 */}
        <a
          href="tel:17"
          title="Appeler la Police (17)"
          className="group flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-white transition-all hover:bg-white/20 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <span className="hidden md:inline text-rose-100/90">Police</span>
          <strong className="font-bold text-white">17</strong>
        </a>

        <span aria-hidden className="text-white/25">·</span>

        {/* Centre Anti-Poison Alger */}
        <a
          href="tel:021713042"
          title="Appeler le Centre Anti-Poison CHU Alger (021 71 30 42)"
          className="group flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-white transition-all hover:bg-white/20 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <Ambulance className="size-3.5 shrink-0 text-rose-200" aria-hidden />
          <span className="hidden sm:inline text-rose-100/90">Anti-Poison Alger</span>
          <span className="sm:hidden text-rose-100/90">Anti-Poison</span>
          <strong className="font-bold text-white">021 71 30 42</strong>
        </a>
      </div>
    </aside>
  )
}
