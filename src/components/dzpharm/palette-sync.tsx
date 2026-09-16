'use client'

import { useEffect } from 'react'
import { useDzPharm } from './store'
import type { PaletteId } from './types'

export function PaletteSync() {
  const palette = useDzPharm((s) => s.palette)
  const setPalette = useDzPharm((s) => s.setPalette)

  // Synchronise sur le DOM
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

  // Initialisation au montage depuis localStorage si disponible
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dzpharm_palette') as PaletteId | null
      if (stored && stored !== palette) {
        setPalette(stored)
      }
    } catch {
      // Ignorer
    }
  }, [])

  return null
}
