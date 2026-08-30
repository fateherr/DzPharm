'use client'

import { Ambulance, Siren } from 'lucide-react'

/**
 * Bandeau permanent des numéros d'urgence (P0 — plan d'amélioration).
 * Toujours visible en haut de chaque vue : SAMU, Protection Civile,
 * Police et Centre Anti-Poison (CHU Alger).
 */
export function EmergencyBar() {
  return (
    <div
      role="note"
      aria-label="Numéros d'urgence médicale en Algérie"
      className="sticky top-0 z-50 w-full border-b border-red-950/40 bg-gradient-to-r from-red-700 via-red-600 to-rose-600 text-white shadow-md shadow-red-950/20 dark:from-red-900 dark:via-red-800 dark:to-red-900"
    >
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center gap-2 overflow-x-auto px-3 text-[11px] font-semibold tracking-wide sm:gap-3 sm:text-xs no-scrollbar">
        <span className="flex shrink-0 items-center gap-1.5">
          <Siren className="size-3.5 shrink-0" aria-hidden />
          <span className="hidden uppercase sm:inline">Urgences</span>
        </span>
        <span aria-hidden className="text-white/40">
          |
        </span>
        <a
          href="tel:14"
          className="shrink-0 rounded px-1 py-0.5 underline-offset-2 transition-colors hover:bg-white/15 hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          SAMU <strong className="font-bold">14</strong>
        </a>
        <span aria-hidden className="text-white/40">
          ·
        </span>
        <a
          href="tel:102"
          className="shrink-0 rounded px-1 py-0.5 underline-offset-2 transition-colors hover:bg-white/15 hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <span className="hidden sm:inline">Protection Civile </span>
          <span className="sm:hidden">Prot. Civile </span>
          <strong className="font-bold">102</strong>
        </a>
        <span aria-hidden className="text-white/40">
          ·
        </span>
        <a
          href="tel:17"
          className="shrink-0 rounded px-1 py-0.5 underline-offset-2 transition-colors hover:bg-white/15 hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          Police <strong className="font-bold">17</strong>
        </a>
        <span aria-hidden className="text-white/40">
          ·
        </span>
        <a
          href="tel:021713042"
          className="flex shrink-0 items-center gap-1 rounded px-1 py-0.5 underline-offset-2 transition-colors hover:bg-white/15 hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <Ambulance className="size-3.5 shrink-0" aria-hidden />
          <span className="hidden md:inline">Centre Anti-Poison (Alger)</span>
          <span className="md:hidden">Anti-Poison</span>{' '}
          <strong className="font-bold">021 71 30 42</strong>
        </a>
      </div>
    </div>
  )
}
