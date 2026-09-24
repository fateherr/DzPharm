'use client'

import { useEffect } from 'react'
import { useDzPharm } from './store'
import type { DesignMode, PaletteId } from './types'

import { PALETTES } from './palettes'

export function PaletteSync() {
  const palette = useDzPharm((s) => s.palette)
  const setPalette = useDzPharm((s) => s.setPalette)
  const designMode = useDzPharm((s) => s.designMode)
  const setDesignMode = useDzPharm((s) => s.setDesignMode)
  const density = useDzPharm((s) => s.density)

  // Synchronise data-palette sur le DOM
  useEffect(() => {
    if (typeof document !== 'undefined' && palette) {
      document.documentElement.setAttribute('data-palette', palette)
      try {
        localStorage.setItem('dzpharm_palette', palette)
      } catch {
        // Ignorer si private browsing bloque localStorage
      }

      // Appliquer dynamiquement les couleurs pour les collections étendues (culturelles, saisonnières, cliniques, expérimentales)
      const p = PALETTES.find((item) => item.id === palette)
      if (p && ['cultural', 'seasonal', 'clinical', 'experimental'].includes(p.category)) {
        document.documentElement.style.setProperty('--primary', p.colors.primary)
        document.documentElement.style.setProperty('--chifa', p.colors.chifa)
        document.documentElement.style.setProperty('--border', p.colors.border)
        document.documentElement.style.setProperty('--card', p.colors.card)
        document.documentElement.style.setProperty('--background', p.colors.bg)
        document.documentElement.style.setProperty('--foreground', p.colors.text)
        document.documentElement.style.setProperty('--ring', p.colors.primary)
      } else {
        document.documentElement.style.removeProperty('--primary')
        document.documentElement.style.removeProperty('--chifa')
        document.documentElement.style.removeProperty('--border')
        document.documentElement.style.removeProperty('--card')
        document.documentElement.style.removeProperty('--background')
        document.documentElement.style.removeProperty('--foreground')
        document.documentElement.style.removeProperty('--ring')
      }
    }
  }, [palette])

  // Synchronise data-design-mode sur le DOM
  useEffect(() => {
    if (typeof document !== 'undefined' && designMode) {
      document.documentElement.setAttribute('data-design-mode', designMode)
      try {
        localStorage.setItem('dzpharm_design_mode', designMode)
      } catch {
        // Ignorer
      }
    }
  }, [designMode])

  // P2-39 — Synchronise data-density sur le DOM (compact / standard / spacious)
  useEffect(() => {
    if (typeof document !== 'undefined' && density) {
      document.documentElement.setAttribute('data-density', density)
    }
  }, [density])

  // Initialisation au montage depuis localStorage si disponible
  useEffect(() => {
    try {
      const storedPalette = localStorage.getItem('dzpharm_palette') as PaletteId | null
      if (storedPalette && storedPalette !== palette) {
        setPalette(storedPalette)
      }
      const storedDesignMode = localStorage.getItem('dzpharm_design_mode') as DesignMode | null
      if (storedDesignMode && storedDesignMode !== designMode) {
        setDesignMode(storedDesignMode)
      }
    } catch {
      // Ignorer
    }
  }, [])

  // P2-10 — Synchronisation inter-onglets via l'événement 'storage'
  // Met à jour en temps réel la palette, le mode et les favoris/panier entre plusieurs onglets ouverts.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'dzpharm_palette' && e.newValue) {
        setPalette(e.newValue as PaletteId)
      } else if (e.key === 'dzpharm_design_mode' && e.newValue) {
        setDesignMode(e.newValue as DesignMode)
      } else if (e.key === 'dzpharm-store') {
        void useDzPharm.persist?.rehydrate()
      } else if (e.key === 'dzpharm_session' && !e.newValue) {
        window.location.replace('/login')
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [setPalette, setDesignMode])

  return null
}
