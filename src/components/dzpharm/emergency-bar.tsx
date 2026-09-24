'use client'

import { useState } from 'react'
import { Ambulance, Building2, ChevronDown, MapPin, PhoneCall, Siren, X } from 'lucide-react'
import { useDzPharm } from './store'
import { cn } from '@/lib/utils'
import { WILAYAS } from '@/lib/wilayas'
import { getWilayaEmergency } from '@/lib/constants/emergencies'

/**
 * Bandeau permanent des numéros d'urgence médicale en Algérie.
 * SAMU (14), Protection Civile (102), Police (17) et Centre Anti-Poison (021 71 30 42).
 * 100% pleine largeur, zéro dépassement horizontal (overflow-x-hidden), adaptation fluide.
 */
export function EmergencyBar() {
  const [minimized, setMinimized] = useState(false)
  const designMode = useDzPharm((s) => s.designMode)
  const isBotanique = designMode === 'botanique'
  const emergencyWilaya = useDzPharm((s) => s.emergencyWilaya) || 'Alger'
  const setEmergencyWilaya = useDzPharm((s) => s.setEmergencyWilaya)
  const currentWilayaEmergency = getWilayaEmergency(emergencyWilaya)

  if (minimized) {
    return (
      <aside
        role="region"
        aria-label="Numéros d'urgence médicale en Algérie (réduit)"
        className={cn(
          'relative z-30 w-full max-w-full overflow-hidden border-b backdrop-blur-md print:hidden transition-all duration-200',
          isBotanique
            ? 'border-[#2d6a4f]/30 bg-[#0d281e]/95 text-emerald-100'
            : 'border-rose-500/20 bg-slate-950/95 text-slate-100'
        )}
      >
        <div className="mx-auto flex h-6 max-w-[1720px] w-full items-center justify-between px-3 sm:px-6 lg:px-8 text-[11px] min-w-0">
          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="flex items-center gap-1.5 text-rose-300 hover:text-rose-200 transition-colors font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400 rounded min-w-0 truncate"
            title="Développer les numéros d'urgence médicale"
          >
            <span className="relative flex size-2 shrink-0">
              <span className="beacon-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-rose-400" />
            </span>
            <Siren className="size-3 shrink-0" />
            <span className="truncate">Urgences Médicales 24/7 (SAMU 14 · Prot. Civile 102 · {currentWilayaEmergency.hospital} {currentWilayaEmergency.displayPhone})</span>
            <ChevronDown className="size-3 opacity-70 shrink-0" />
          </button>
          <a
            href="tel:14"
            className="flex shrink-0 items-center gap-1 rounded bg-rose-600/90 px-2 py-0.5 font-bold text-white hover:bg-rose-500 transition-colors ml-2"
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
        'relative z-30 w-full max-w-full overflow-hidden border-b backdrop-blur-md print:hidden transition-all duration-200',
        isBotanique
          ? 'border-[#2d6a4f]/30 bg-[#0a1f17]/95 text-emerald-100 shadow-xs shadow-[#0a1f17]/40'
          : 'border-rose-500/20 bg-gradient-to-r from-slate-950 via-rose-950/80 to-slate-950 text-slate-100 shadow-xs shadow-rose-950/30'
      )}
    >
      <div className="mx-auto flex h-7 max-w-[1720px] w-full items-center justify-between gap-2 px-3 sm:px-6 lg:px-8 text-[11px] font-medium tracking-wide sm:text-xs min-w-0">
        {/* Left: Emergency Status Beacon & Numbers */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 shrink">
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

          {/* Urgences CHU / EPH locales par Wilaya (P3-01) */}
          <span aria-hidden className="text-white/20 hidden lg:inline">·</span>

          <div className="hidden lg:flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
              <MapPin className="size-2.5 text-rose-400" />
              Wilaya :
            </span>
            <select
              value={emergencyWilaya}
              onChange={(e) => setEmergencyWilaya(e.target.value)}
              className="h-5 rounded bg-white/10 text-white text-[11px] px-1.5 py-0 border border-white/20 cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-400"
              aria-label="Sélectionner la wilaya pour les urgences locales"
            >
              {WILAYAS.map((w, idx) => (
                <option key={w} value={w} className="bg-slate-900 text-white">
                  {String(idx + 1).padStart(2, '0')} - {w}
                </option>
              ))}
            </select>

            <a
              href={`tel:${currentWilayaEmergency.phone}`}
              title={`Appeler les urgences ${currentWilayaEmergency.hospital} (${currentWilayaEmergency.name}) : ${currentWilayaEmergency.displayPhone}`}
              className="group flex shrink-0 items-center gap-1.5 rounded-md bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 px-2 py-0.5 text-rose-200 transition-all focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
            >
              <Building2 className="size-3 text-rose-400 group-hover:scale-110 transition-transform" aria-hidden />
              <span className="text-[11px] text-slate-300 font-normal">{currentWilayaEmergency.hospital} :</span>
              <strong className="font-bold text-white">{currentWilayaEmergency.displayPhone}</strong>
            </a>
          </div>
        </div>

        {/* Right: Minimize toggle */}
        <button
          type="button"
          onClick={() => setMinimized(true)}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          title="Réduire le bandeau d'urgence"
          aria-label="Réduire le bandeau d'urgence"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </aside>
  )
}
