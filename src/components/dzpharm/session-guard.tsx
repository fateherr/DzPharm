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
 * Garde de session client Anti-FOUC :
 * Le standard W3C sessionStorage est détruit dès qu'un onglet ou le navigateur est fermé.
 * Si l'utilisateur quitte le site et le rouvre dans un nouvel onglet,
 * sessionStorage est vide -> déconnexion immédiate et invite automatique du mot de passe.
 * Les rechargements de page (F5) et la navigation normale au sein de l'onglet sont préservés.
 *
 * En cas de session manquante hors /login, aucun composant privé n'est affiché (anti-FOUC total).
 */
export function SessionGuard({ children }: { children?: ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname?.startsWith('/login')

  const [authorized, setAuthorized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (isLoginPage) return true
      return sessionStorage.getItem(SESSION_KEY) === 'active'
    }
    return true
  })

  useEffect(() => {
    if (isLoginPage) return

    const active = sessionStorage.getItem(SESSION_KEY) === 'active'
    if (!active) {
      setAuthorized(false)
      void fetch('/api/logout', { method: 'POST' }).finally(() => {
        window.location.replace('/login')
      })
    } else {
      setAuthorized(true)
    }
  }, [isLoginPage, pathname])

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
