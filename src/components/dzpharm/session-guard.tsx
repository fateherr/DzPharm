'use client'

import type { ReactNode } from 'react'

export const SESSION_KEY = 'dzpharm_session'

export async function terminateSession() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_KEY)
    window.location.replace('/')
  }
}

export function activateSession() {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SESSION_KEY, 'active')
  }
}

/**
 * Garde de session — accès direct libre sans mot de passe requis.
 */
export function SessionGuard({ children }: { children?: ReactNode }) {
  return <>{children}</>
}
