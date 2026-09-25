'use client'

import { useEffect } from 'react'
import { useDzPharm } from './store'

export function AccessibilitySync() {
  const counterNightMode = useDzPharm((s) => s.counterNightMode)
  const accessibleFont = useDzPharm((s) => s.accessibleFont)
  const fontScale = useDzPharm((s) => s.fontScale)
  const language = useDzPharm((s) => s.language)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement

    // W8-02: Native RTL Arabic & Language
    if (language === 'ar') {
      root.setAttribute('dir', 'rtl')
      root.setAttribute('lang', 'ar')
      root.classList.add('rtl')
    } else {
      root.setAttribute('dir', 'ltr')
      root.setAttribute('lang', 'fr')
      root.classList.remove('rtl')
    }

    // W7-01: Counter-Night Mode
    if (counterNightMode) {
      root.classList.add('counter-night')
      root.setAttribute('data-counter-night', 'true')
    } else {
      root.classList.remove('counter-night')
      root.removeAttribute('data-counter-night')
    }

    // W7-03: Accessible Font Scale (90, 100, 115, 130)
    root.setAttribute('data-font-scale', String(fontScale || 100))

    // W7-03: Accessible Font Family
    root.setAttribute('data-accessible-font', accessibleFont || 'default')
  }, [counterNightMode, accessibleFont, fontScale, language])

  return null
}
