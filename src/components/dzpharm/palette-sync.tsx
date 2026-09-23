'use client'

import { useEffect } from 'react'
import { useDzPharm } from './store'
import type { DesignMode, PaletteId } from './types'

export function PaletteSync() {
  const palette = useDzPharm((s) => s.palette)
  const setPalette = useDzPharm((s) => s.setPalette)
  const designMode = useDzPharm((s) => s.designMode)
  const setDesignMode = useDzPharm((s) => s.setDesignMode)

  // Synchronise data-palette sur le DOM
  useEffect(() => {
    if (typeof document !== 'undefined' && palette) {
      document.documentElement.setAttribute('data-palette', palette)
      try {
        localStorage.setItem('dzpharm_palette', palette)
      } catch {
        // Ignorer si private browsing bloque localStorage
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

  return null
}
