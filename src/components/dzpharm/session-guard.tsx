'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Lock } from 'lucide-react'

export const SESSION_KEY = 'dzpharm_session'

/**
 * Invalide la session à la fois côté client (sessionStorage)
 * et côté serveur (cookie HTTP) puis redirige vers /login.
 */
export async function terminateSession() {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_KEY)
    }
    await fetch('/api/logout', { method: 'POST' })
  } catch {
    // Ignore network error during termination
  }
  if (typeof window !== 'undefined') {
    window.location.replace('/login')
  }
}

/**
 * Active la session dans sessionStorage après authentification réussie.
 */
export function activateSession() {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SESSION_KEY, 'active')
  }
}

/**
 * Garde de session client renforcée (P0-02 Phase 1) :
 *
 * 1. sessionStorage est utilisé comme indice rapide anti-FOUC (anti-flash of unauthenticated content).
 * 2. Sur chaque montage, une vérification serveur via /api/auth/verify confirme que
 *    le cookie httpOnly dzpharm_auth est valide. Si le cookie est absent ou invalide,
 *    la session est invalidée et l'utilisateur est redirigé vers /login.
 * 3. Cela empêche le contournement via DevTools (sessionStorage.setItem('dzpharm_session','active'))
 *    car le serveur ne trouvera pas de cookie valide.
 */
export function SessionGuard({ children }: { children?: ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname?.startsWith('/login')

  // Fast hint from sessionStorage (anti-FOUC) — NOT trusted for security
  const [authorized, setAuthorized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (isLoginPage) return true
      return sessionStorage.getItem(SESSION_KEY) === 'active'
    }
    return true
  })

  // Server-side verification on mount + pathname change
  useEffect(() => {
    if (isLoginPage) {
      setAuthorized(true)
      return
    }

    let cancelled = false

    async function verifyServerSession() {
      try {
        // Verify the httpOnly cookie is valid via server endpoint
        const res = await fetch('/api/auth/verify', { method: 'GET', credentials: 'same-origin' })
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json()
            if (data.authenticated) {
              sessionStorage.setItem(SESSION_KEY, 'active')
              setAuthorized(true)
            } else {
              // Cookie missing or invalid — session is fake
              sessionStorage.removeItem(SESSION_KEY)
              setAuthorized(false)
              redirectToLogin()
            }
          } else {
            // Server returned error — treat as unauthorized
            sessionStorage.removeItem(SESSION_KEY)
            setAuthorized(false)
            redirectToLogin()
          }
        }
      } catch {
        // Network error — if sessionStorage says active, allow offline use (PWA)
        if (!cancelled && sessionStorage.getItem(SESSION_KEY) !== 'active') {
          setAuthorized(false)
          redirectToLogin()
        }
      }
    }

    function redirectToLogin() {
      const target = window.location.pathname + window.location.search
      const targetUrl = target && target !== '/' ? `/login?redirectTo=${encodeURIComponent(target)}` : '/login'
      window.location.replace(targetUrl)
    }

    verifyServerSession()

    return () => {
      cancelled = true
    }
  }, [isLoginPage, pathname])

  // P2-15 — Idle timeout : 15 minutes d'inactivité entraînent le verrouillage automatique de la session
  useEffect(() => {
    if (isLoginPage || !authorized) return

    const IDLE_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes
    let timeoutId: number

    function resetTimer() {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        void terminateSession()
      }, IDLE_TIMEOUT_MS)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    for (const evt of events) {
      window.addEventListener(evt, resetTimer, { passive: true })
    }

    resetTimer()

    return () => {
      window.clearTimeout(timeoutId)
      for (const evt of events) {
        window.removeEventListener(evt, resetTimer)
      }
    }
  }, [isLoginPage, authorized])

  if (!authorized && !isLoginPage) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background text-foreground">
        <div className="relative flex items-center justify-center size-14 rounded-2xl bg-primary/10 text-primary mb-3.5 animate-pulse ring-8 ring-primary/5">
          <Lock className="size-6" />
        </div>
        <p className="text-sm font-bold tracking-tight text-foreground">
          Dz<span className="text-primary">Pharm</span> — Session Sécurisée
        </p>
        <p className="text-xs text-muted-foreground mt-1 animate-pulse">
          Authentification requise · Redirection vers la connexion…
        </p>
      </div>
    )
  }

  return <>{children}</>
}

