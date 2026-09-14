'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

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
 * Garde de session client :
 * Le standard W3C sessionStorage est détruit dès qu'un onglet ou le navigateur est fermé.
 * Si l'utilisateur quitte le site et le rouvre dans un nouvel onglet,
 * sessionStorage est vide -> déconnexion immédiate et invite automatique du mot de passe.
 * Les rechargements de page (F5) et la navigation normale au sein de l'onglet sont préservés.
 */
export function SessionGuard() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Ne rien faire sur la page de connexion
    if (pathname.startsWith('/login')) return

    const active = sessionStorage.getItem(SESSION_KEY)
    if (active !== 'active') {
      // Pas de session active dans cet onglet -> invalider le cookie et rediriger
      void fetch('/api/logout', { method: 'POST' }).finally(() => {
        router.replace('/login')
      })
    }
  }, [pathname, router])

  return null
}
