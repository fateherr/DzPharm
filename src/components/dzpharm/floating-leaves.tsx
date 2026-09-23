'use client'

import { useMemo } from 'react'

interface LeafParticle {
  id: number
  type: 'sage' | 'rose' | 'olive' | 'pollen'
  left: number // 0-100%
  size: number // px
  duration: number // seconds
  delay: number // seconds
  opacity: number
  blur: number
  drift: number // horizontal drift amplitude px
}

export function FloatingLeaves() {
  const particles = useMemo<LeafParticle[]>(() => {
    return [
      { id: 1, type: 'sage', left: 6, size: 26, duration: 16, delay: 0, opacity: 0.45, blur: 0, drift: 20 },
      { id: 2, type: 'rose', left: 16, size: 22, duration: 19, delay: 4, opacity: 0.5, blur: 0.5, drift: -25 },
      { id: 3, type: 'olive', left: 24, size: 24, duration: 22, delay: 8, opacity: 0.4, blur: 1, drift: 20 },
      { id: 4, type: 'rose', left: 34, size: 18, duration: 17, delay: 2, opacity: 0.55, blur: 0, drift: -20 },
      { id: 5, type: 'sage', left: 44, size: 28, duration: 21, delay: 6, opacity: 0.35, blur: 1.5, drift: 25 },
      { id: 6, type: 'pollen', left: 52, size: 10, duration: 14, delay: 1, opacity: 0.6, blur: 0, drift: 15 },
      { id: 7, type: 'rose', left: 58, size: 24, duration: 18, delay: 5, opacity: 0.48, blur: 0.5, drift: -25 },
      { id: 8, type: 'sage', left: 66, size: 24, duration: 20, delay: 9, opacity: 0.42, blur: 0, drift: 20 },
      { id: 9, type: 'olive', left: 74, size: 20, duration: 23, delay: 3, opacity: 0.38, blur: 1, drift: -20 },
      { id: 10, type: 'rose', left: 82, size: 21, duration: 16, delay: 7, opacity: 0.5, blur: 0, drift: -20 },
      { id: 11, type: 'pollen', left: 20, size: 12, duration: 15, delay: 10, opacity: 0.55, blur: 0, drift: -15 },
      { id: 12, type: 'sage', left: 80, size: 26, duration: 24, delay: 12, opacity: 0.36, blur: 1.2, drift: -20 },
      { id: 13, type: 'rose', left: 40, size: 22, duration: 18, delay: 11, opacity: 0.45, blur: 0.8, drift: 20 },
      { id: 14, type: 'olive', left: 56, size: 22, duration: 21, delay: 13, opacity: 0.4, blur: 0, drift: 20 },
    ]
  }, [])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] w-full max-w-full overflow-hidden select-none"
      aria-hidden="true"
    >
      {particles.map((p) => {
        return (
          <div
            key={p.id}
            className="floating-leaf-track absolute"
            style={{
              left: `${p.left}%`,
              top: '-60px',
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              filter: p.blur > 0 ? `blur(${p.blur}px)` : undefined,
              opacity: p.opacity,
            }}
          >
            <div
              className="floating-leaf-body"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDuration: `${p.duration * 0.4}s`,
              }}
            >
              {p.type === 'rose' && (
                /* Pétale de Rose Damascena */
                <svg viewBox="0 0 32 32" fill="none" className="w-full h-full drop-shadow-sm">
                  <path
                    d="M16 3C10 3 5 9 6 16C7 22 12 28 16 29C20 28 25 22 26 16C27 9 22 3 16 3Z"
                    fill="url(#rose-grad)"
                  />
                  <path
                    d="M16 7C14 11 14 20 16 26"
                    stroke="#fda4af"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                  <defs>
                    <linearGradient id="rose-grad" x1="6" y1="3" x2="26" y2="29" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#f43f5e" />
                      <stop offset="0.55" stopColor="#be185d" />
                      <stop offset="1" stopColor="#881337" />
                    </linearGradient>
                  </defs>
                </svg>
              )}

              {p.type === 'sage' && (
                /* Feuille de Sauge Officinale */
                <svg viewBox="0 0 32 32" fill="none" className="w-full h-full drop-shadow-sm">
                  <path
                    d="M16 2C9 7 6 15 8 22C10 27 14 30 16 30C18 30 22 27 24 22C26 15 23 7 16 2Z"
                    fill="url(#sage-grad)"
                  />
                  <path
                    d="M16 6V26M16 11L12 14M16 16L20 19M16 21L13 23"
                    stroke="#a7f3d0"
                    strokeWidth="0.9"
                    strokeLinecap="round"
                    opacity="0.7"
                  />
                  <defs>
                    <linearGradient id="sage-grad" x1="8" y1="2" x2="24" y2="30" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#2d6a4f" />
                      <stop offset="0.6" stopColor="#1b4332" />
                      <stop offset="1" stopColor="#081c15" />
                    </linearGradient>
                  </defs>
                </svg>
              )}

              {p.type === 'olive' && (
                /* Feuille d'Olivier Méditerranéen */
                <svg viewBox="0 0 32 32" fill="none" className="w-full h-full drop-shadow-sm">
                  <path
                    d="M16 3C11 9 10 19 14 26C15 28 16 29 16 29C16 29 17 28 18 26C22 19 21 9 16 3Z"
                    fill="url(#olive-grad)"
                  />
                  <path
                    d="M16 5V27"
                    stroke="#bbf7d0"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                  <defs>
                    <linearGradient id="olive-grad" x1="10" y1="3" x2="22" y2="29" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#40916c" />
                      <stop offset="0.7" stopColor="#1b4332" />
                      <stop offset="1" stopColor="#0f291e" />
                    </linearGradient>
                  </defs>
                </svg>
              )}

              {p.type === 'pollen' && (
                /* Grain d'Élixir d'Or Apothicaire */
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-500 via-amber-300 to-yellow-100 shadow-sm shadow-amber-500/50" />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
